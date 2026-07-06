import { describe, expect, it } from "vitest";

import { buildAuditReport } from "../src/audit.js";
import { buildMcpReceipt, mapStatusToReceiptVerdict, renderReceiptMarkdown } from "../src/receipt.js";
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
});
