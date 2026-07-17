import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildActionReceipt, recommendedActionForFinding, renderActionReceipt } from "../src/action-receipt.js";
import { buildAuditReport } from "../src/audit.js";
import { buildMcpReceipt, detectNotObserved, generateReceiptKeyPair, mapStatusToReceiptVerdict, receiptFormatFromPath, renderReceipt, renderReceiptMarkdown, signReceipt, verifyReceipt } from "../src/receipt.js";
import type { McpReceipt } from "../src/receipt.js";
import { makeArtifact } from "./fixtures/test-helpers.js";

const target = {
  targetId: "fixture",
  adapter: "local-process" as const,
  command: "npx",
  args: ["-y", "@example/mcp-server"],
  cwd: "/tmp/mcp-observatory-fixture",
  metadata: { repo: "github:example/mcp-server", version: "1.2.3", commit_sha: "abc123" },
};

describe("MCP receipts", () => {
  const tempDirs: string[] = [];

  async function makeTempDir(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), "mcp-observatory-receipt-"));
    tempDirs.push(dir);
    return dir;
  }

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("maps audit trust status into deterministic receipt verdict actions", () => {
    const cleanArtifact = makeArtifact([]);
    cleanArtifact.target.metadata = { audit: "structured events" };
    const clean = buildAuditReport(cleanArtifact, { ...target, metadata: { audit: "structured events" } });
    expect(mapStatusToReceiptVerdict(clean)).toMatchObject({
      state: "ready_for_ci",
      action: "allow",
      status: "enterprise_ready",
    });

    const medium = buildAuditReport(makeArtifact([]), target);
    expect(mapStatusToReceiptVerdict(medium)).toMatchObject({
      state: "needs_review",
      action: "gate",
      status: "needs_review",
    });

    const high = buildAuditReport(makeArtifact([
      {
        id: "security",
        capability: "security",
        status: "fail",
        durationMs: 5,
        message: "1 finding",
        evidence: [{
          endpoint: "security/scan",
          advertised: true,
          responded: true,
          minimalShapePresent: true,
          findings: [{ ruleId: "shell-injection", severity: "high", toolName: "run_shell", message: "Tool allows command execution." }],
        }],
      },
    ]), { ...target, metadata: { audit: "structured events" } });
    expect(mapStatusToReceiptVerdict(high)).toMatchObject({
      state: "blocked",
      action: "gate",
      status: "high_risk",
    });

    const critical = buildAuditReport(makeArtifact([]), { ...target, env: { DEMO_API_TOKEN: "redacted" } });
    expect(mapStatusToReceiptVerdict(critical)).toMatchObject({
      state: "blocked",
      action: "escalate",
      status: "critical_risk",
    });

    const fatal = buildAuditReport(makeArtifact([], "startup failed\ntransport closed"), target);
    expect(mapStatusToReceiptVerdict(fatal)).toMatchObject({
      state: "could_not_evaluate",
      action: "rerun",
      reason: "startup failed",
    });
  });

  it("builds normalized receipt sections and limits top findings", async () => {
    const report = buildAuditReport(makeArtifact([
      {
        id: "attack-sim",
        capability: "attack-sim",
        status: "fail",
        durationMs: 5,
        message: "1 finding",
        evidence: [{
          endpoint: "attack-sim/safe",
          advertised: true,
          responded: true,
          minimalShapePresent: true,
          findings: [{
            ruleId: "attack-sim/tool-poisoning/hidden-instruction",
            attackClass: "tool-poisoning",
            severity: "high",
            itemType: "tool",
            itemName: "run_shell",
            message: "Tool description contains hidden instruction override text.",
            recommendation: "Remove hidden instructions.",
          }],
        }],
      },
    ]), target);

    const receipt = await buildMcpReceipt(report, target, {
      jsonReportPath: "report.json",
      sarifPath: "results.sarif",
      commandInvoked: "mcp-observatory receipt npx -y @example/mcp-server --profile nsa-mcp",
      environmentClass: "public_safety_index",
      topFindingsLimit: 1,
    });

    expect(receipt.receipt_type).toBe("mcp-observatory-receipt");
    expect(receipt.subject).toMatchObject({
      mcp_server_name: "fixture",
      package_or_repo: "github:example/mcp-server",
      startup_command: "npx -y @example/mcp-server",
      version: "1.2.3",
      commit_sha: "abc123",
      package_manager: "npm",
    });
    expect(receipt.run_context.environment_class).toBe("public_safety_index");
    expect(receipt.run_context.safe_mode_statement).toContain("Safe-mode only");
    expect(receipt.evidence.json_report_path).toBe("report.json");
    expect(receipt.evidence.json_report_sha256).toBeNull();
    expect(receipt.evidence.markdown_report_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(receipt.evidence.attack_simulation_summary).toContain("attack-sim finding");
    expect(receipt.findings).toHaveLength(1);
    expect(receipt.findings[0]!.blocks_ci).toBe(true);
    expect(receipt.reproduction.rerun_command).toContain("mcp-observatory audit npx -y @example/mcp-server");
    expect(receipt.maintainer_cta.map((cta) => cta.id)).toContain("add_ci");
    expect(receipt.buyer_cta.map((cta) => cta.id)).toContain("request_private_fleet_receipt_pack");
  });

  it("renders markdown as a citable trust record", async () => {
    const report = buildAuditReport(makeArtifact([]), { ...target, metadata: { audit: "structured events" } });
    const receipt = await buildMcpReceipt(report, target);
    const markdown = renderReceiptMarkdown(receipt);

    expect(markdown).toContain("# MCP Observatory Receipt");
    expect(markdown).toContain("## Verdict");
    expect(markdown).toContain("## Reproduction");
    expect(markdown).toContain("Claim this receipt");
    expect(markdown).toContain("Request private fleet receipt pack");
  });

  it("builds HTTP receipts with artifact hashes and safe path handling", async () => {
    const dir = await makeTempDir();
    const jsonReportPath = path.join(dir, "report.json");
    const markdownReportPath = path.join(dir, "report.md");
    const htmlReportPath = path.join(dir, "report.html");
    const sarifPath = path.join(dir, "results.sarif");
    await Promise.all([
      writeFile(jsonReportPath, "{\"ok\":true}\n", "utf8"),
      writeFile(markdownReportPath, "# Report\n", "utf8"),
      writeFile(htmlReportPath, "<main>Report</main>\n", "utf8"),
      writeFile(sarifPath, "{\"version\":\"2.1.0\"}\n", "utf8"),
    ]);

    const httpTarget = {
      targetId: "http-fixture",
      adapter: "http" as const,
      url: "https://example.test/mcp",
      metadata: { source: "https://example.test/repo", version: "9.9.9", commit: "def456" },
    };
    const artifact = makeArtifact([
      {
        id: "tools",
        capability: "tools",
        status: "pass",
        durationMs: 5,
        message: "2 tools",
        evidence: [{
          endpoint: "tools/list",
          advertised: true,
          responded: true,
          minimalShapePresent: true,
          identifiers: ["search", "read_resource", "write_file", "delete_file", "run_command", "open_url"],
        }],
      },
      {
        id: "schema-quality",
        capability: "schema-quality",
        status: "partial",
        durationMs: 4,
        message: "1 schema warning",
        evidence: [{
          endpoint: "schema-quality",
          advertised: true,
          responded: true,
          minimalShapePresent: true,
          findings: [{ itemType: "tool", itemName: "search", issue: "Missing description", severity: "warning" }],
        }],
      },
    ]);
    artifact.target = {
      targetId: "http-fixture",
      adapter: "http",
      command: "",
      args: [],
      url: "https://example.test/mcp",
      serverName: "example-http-server",
    };
    const report = buildAuditReport(artifact, httpTarget);

    const receipt = await buildMcpReceipt(report, httpTarget, {
      jsonReportPath,
      markdownReportPath,
      htmlReportPath,
      sarifPath,
      configFileUsed: path.join(tmpdir(), "receipt-target.json"),
    });

    expect(receipt.subject).toMatchObject({
      mcp_server_name: "example-http-server",
      source: "http",
      startup_command: null,
      target_path_or_url: "https://example.test/mcp",
      package_or_repo: "https://example.test/repo",
      version: "9.9.9",
      commit_sha: "def456",
      package_manager: null,
    });
    expect(receipt.run_context.config_file_used).toContain("receipt-target.json");
    expect(receipt.evidence.json_report_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(receipt.evidence.html_report_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(receipt.evidence.tool_surface_summary).toContain("search, read_resource, write_file, delete_file, run_command, ...");
    expect(receipt.evidence.schema_summary).toContain("1 schema finding");
    expect(receipt.reproduction.ci_command).toContain("setup-ci --all --command https://example.test/mcp --sarif --schedule weekly");
    expect(JSON.parse(renderReceipt(receipt, "json"))).toMatchObject({ receipt_type: "mcp-observatory-receipt" });
    expect(renderReceipt(receipt, "markdown")).toContain("## Evidence");
    expect(receiptFormatFromPath("receipt.json", "markdown")).toBe("json");
    expect(receiptFormatFromPath("receipt.md", "json")).toBe("markdown");
    expect(receiptFormatFromPath(undefined, "json")).toBe("json");
  });

  it("classifies and renders action receipts for release decisions", () => {
    expect(recommendedActionForFinding({ severity: "high", attackClass: "exfiltration-canary" })).toBe("escalate");
    expect(recommendedActionForFinding({ severity: "high", ruleId: "credential-pattern" })).toBe("escalate");
    expect(recommendedActionForFinding({ severity: "high", category: "runtime" })).toBe("rerun");
    expect(recommendedActionForFinding({ severity: "high", category: "attack-sim" })).toBe("quarantine");
    expect(recommendedActionForFinding({ severity: "high", ruleId: "generic-high" })).toBe("gate");
    expect(recommendedActionForFinding({ severity: "medium", attackClass: "contract-drift" })).toBe("rerun");
    expect(recommendedActionForFinding({ severity: "medium" })).toBe("gate");
    expect(recommendedActionForFinding({ severity: "low" })).toBe("allow");
    expect(recommendedActionForFinding({ severity: "warning" })).toBe("gate");
    expect(recommendedActionForFinding({ severity: "error" })).toBe("gate");

    const fatal = makeArtifact([], "server failed to start\nstack trace");
    expect(buildActionReceipt(fatal)).toMatchObject({
      action: "rerun",
      reason: "The MCP server did not complete startup/readiness checks.",
      topFindings: [{ ruleId: "mcp-observatory/run/fatal-error", message: "server failed to start" }],
    });
    expect(renderActionReceipt(fatal)).toContain("Action Receipt: rerun");

    const artifact = makeArtifact([
      {
        id: "attack-sim",
        capability: "attack-sim",
        status: "fail",
        durationMs: 3,
        message: "attack readiness finding",
        evidence: [{
          endpoint: "attack-sim/safe",
          advertised: true,
          responded: true,
          minimalShapePresent: true,
          findings: [{
            ruleId: "attack-sim/contract-drift/destructive-tool-added",
            attackClass: "contract-drift",
            severity: "medium",
            itemType: "tool",
            itemName: "delete_everything",
            message: "New destructive tool appeared after the baseline.",
            recommendedAction: "quarantine",
          }],
        }],
      },
    ]);
    const receipt = buildActionReceipt(artifact);
    expect(receipt.action).toBe("quarantine");
    expect(receipt.topFindings[0]).toMatchObject({
      severity: "medium",
      ruleId: "mcp-observatory/attack-sim/contract-drift/destructive-tool-added",
    });
    expect(renderActionReceipt(artifact)).toContain("Top evidence:");
  });

  it("detectNotObserved returns network_egress warning when no network tools found", () => {
    const artifact = makeArtifact([
      {
        id: "tools",
        capability: "tools",
        status: "pass",
        durationMs: 5,
        message: "1 tool",
        evidence: [{
          endpoint: "tools/list",
          advertised: true,
          responded: true,
          minimalShapePresent: true,
          identifiers: ["echo"],
        }],
      },
    ]);

    const result = detectNotObserved(artifact);
    const networkEntry = result.find((e) => e.category === "network_egress");
    expect(networkEntry).toBeDefined();
    expect(networkEntry!.severity).toBe("warning");
    expect(networkEntry!.detail).toContain("outbound network");
  });

  it("detectNotObserved returns filesystem_mutation warning when no fs tools found", () => {
    const artifact = makeArtifact([
      {
        id: "tools",
        capability: "tools",
        status: "pass",
        durationMs: 5,
        message: "1 tool",
        evidence: [{
          endpoint: "tools/list",
          advertised: true,
          responded: true,
          minimalShapePresent: true,
          identifiers: ["echo"],
        }],
      },
    ]);

    const result = detectNotObserved(artifact);
    const fsEntry = result.find((e) => e.category === "filesystem_mutation");
    expect(fsEntry).toBeDefined();
    expect(fsEntry!.severity).toBe("warning");
    expect(fsEntry!.detail).toContain("Filesystem write");
  });

  it("detectNotObserved returns credential_access info when security check exists", () => {
    const artifact = makeArtifact([
      {
        id: "security-lite",
        capability: "security-lite",
        status: "pass",
        durationMs: 5,
        message: "No issues found",
        evidence: [{
          endpoint: "security-lite/scan",
          advertised: true,
          responded: true,
          minimalShapePresent: true,
        }],
      },
    ]);

    const result = detectNotObserved(artifact);
    const credEntry = result.find((e) => e.category === "credential_access");
    expect(credEntry).toBeDefined();
    expect(credEntry!.severity).toBe("info");
    expect(credEntry!.detail).toContain("performed");
  });

  it("detectNotObserved returns credential_access warning when no security check", () => {
    const artifact = makeArtifact([]);

    const result = detectNotObserved(artifact);
    const credEntry = result.find((e) => e.category === "credential_access");
    expect(credEntry).toBeDefined();
    expect(credEntry!.severity).toBe("warning");
    expect(credEntry!.detail).toContain("not performed");
  });

  it("detectNotObserved always includes destructive_payloads info", () => {
    const artifact = makeArtifact([]);

    const result = detectNotObserved(artifact);
    const destructiveEntry = result.find((e) => e.category === "destructive_payloads");
    expect(destructiveEntry).toBeDefined();
    expect(destructiveEntry!.severity).toBe("info");
    expect(destructiveEntry!.detail).toContain("safe-mode");
  });

  it("detectNotObserved skips network_egress when network tools are present", () => {
    const artifact = makeArtifact([
      {
        id: "tools",
        capability: "tools",
        status: "pass",
        durationMs: 5,
        message: "2 tools",
        evidence: [{
          endpoint: "tools/list",
          advertised: true,
          responded: true,
          minimalShapePresent: true,
          identifiers: ["fetch_url", "echo"],
        }],
      },
    ]);

    const result = detectNotObserved(artifact);
    const networkEntry = result.find((e) => e.category === "network_egress");
    expect(networkEntry).toBeUndefined();
  });

  it("detectNotObserved skips filesystem_mutation when fs tools are present", () => {
    const artifact = makeArtifact([
      {
        id: "tools",
        capability: "tools",
        status: "pass",
        durationMs: 5,
        message: "2 tools",
        evidence: [{
          endpoint: "tools/list",
          advertised: true,
          responded: true,
          minimalShapePresent: true,
          identifiers: ["write_file", "echo"],
        }],
      },
    ]);

    const result = detectNotObserved(artifact);
    const fsEntry = result.find((e) => e.category === "filesystem_mutation");
    expect(fsEntry).toBeUndefined();
  });

  it("receipt markdown includes the What Was Not Tested section", async () => {
    const report = buildAuditReport(makeArtifact([
      {
        id: "tools",
        capability: "tools",
        status: "pass",
        durationMs: 5,
        message: "1 tool",
        evidence: [{
          endpoint: "tools/list",
          advertised: true,
          responded: true,
          minimalShapePresent: true,
          identifiers: ["echo"],
        }],
      },
      {
        id: "security-lite",
        capability: "security-lite",
        status: "pass",
        durationMs: 5,
        message: "Clean",
        evidence: [{
          endpoint: "security-lite/scan",
          advertised: true,
          responded: true,
          minimalShapePresent: true,
        }],
      },
    ]), { ...target, metadata: { audit: "structured events" } });
    const receipt = await buildMcpReceipt(report, target);
    const markdown = renderReceiptMarkdown(receipt);

    expect(markdown).toContain("## What Was Not Tested");
    expect(markdown).toContain("network_egress");
    expect(markdown).toContain("filesystem_mutation");
    expect(markdown).toContain("credential_access");
    expect(markdown).toContain("destructive_payloads");
    expect(receipt.notObserved.length).toBeGreaterThanOrEqual(3);
  });
});

describe("Ed25519 receipt signing", () => {
  it("round-trips sign and verify", () => {
    const { publicKey, privateKey } = generateReceiptKeyPair();
    const receipt = { receipt_type: "mcp-observatory-receipt" as const } as unknown as McpReceipt;
    const signed = signReceipt(receipt, privateKey, "test@example.com");
    expect(signed.signer).toBe("test@example.com");
    expect(signed.signature).toBeTruthy();
    expect(verifyReceipt(signed, publicKey)).toBe(true);
  });

  it("detects tampering", () => {
    const { publicKey, privateKey } = generateReceiptKeyPair();
    const receipt = { receipt_type: "mcp-observatory-receipt" as const } as unknown as McpReceipt;
    const signed = signReceipt(receipt, privateKey, "test@example.com");
    const tampered = { ...signed, receipt_type: "tampered" as const } as unknown as McpReceipt;
    expect(verifyReceipt(tampered, publicKey)).toBe(false);
  });

  it("rejects unsigned receipt", () => {
    const { publicKey } = generateReceiptKeyPair();
    const receipt = { receipt_type: "mcp-observatory-receipt" as const } as unknown as McpReceipt;
    expect(verifyReceipt(receipt, publicKey)).toBe(false);
  });
});
