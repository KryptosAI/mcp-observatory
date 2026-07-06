import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildAuditReport } from "../src/audit.js";
import { buildMcpReceipt } from "../src/receipt.js";
import { buildRiskGraph, classifyCapabilityBoundary, loadRiskGraphInputs, renderRiskGraphHtml, renderRiskGraphJson, renderRiskGraphMarkdown } from "../src/risk-graph.js";
import { makeArtifact } from "./fixtures/test-helpers.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "mcp-risk-graph-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("MCP risk graph", () => {
  it("builds graph nodes from run artifacts and classifies capability boundaries", async () => {
    const artifact = makeArtifact([
      {
        id: "tools",
        capability: "tools",
        status: "pass",
        durationMs: 2,
        message: "3 tools",
        evidence: [{
          endpoint: "tools/list",
          advertised: true,
          responded: true,
          minimalShapePresent: true,
          identifiers: ["kubectl_apply", "exec_in_pod", "kubectl_delete"],
        }],
      },
      {
        id: "attack-sim",
        capability: "attack-sim",
        status: "fail",
        durationMs: 3,
        message: "permission boundary risk",
        evidence: [{
          endpoint: "attack-sim/safe",
          advertised: true,
          responded: true,
          minimalShapePresent: true,
          findings: [{
            ruleId: "attack-sim/permission-boundary/broad-destructive-tool",
            attackClass: "permission-boundary",
            severity: "high",
            itemType: "tool",
            itemName: "kubectl_delete",
            message: "Tool combines broad Kubernetes access with destructive hints.",
            recommendation: "Constrain the tool before agents depend on it.",
          }],
        }],
      },
    ]);
    artifact.target.targetId = "kubernetes";
    artifact.target.serverName = "kubernetes";
    artifact.target.metadata = { package: "mcp-server-kubernetes" };

    const graph = await buildRiskGraph([{ path: "kubernetes.json", data: artifact }]);
    const server = graph.nodes.find((node) => node.name === "kubernetes");

    expect(graph.summary.totalServers).toBe(1);
    expect(server).toMatchObject({
      capabilityBoundary: "infra-cloud",
      recommendedAction: "quarantine",
      riskLevel: "high",
      serverPackageOrRepo: "mcp-server-kubernetes",
    });
    expect(graph.edges.some((edge) => edge.type === "has-capability-boundary" && edge.to === "boundary:infra-cloud")).toBe(true);
    expect(renderRiskGraphMarkdown(graph)).toContain("MCP Risk Graph");
    expect(renderRiskGraphHtml(graph)).toContain("<title>MCP Risk Graph</title>");
    expect(JSON.parse(renderRiskGraphJson(graph))).toMatchObject({ schemaVersion: "1.0.0" });
  });

  it("builds graph nodes from receipt artifacts and preserves CI commands", async () => {
    const target = {
      targetId: "browsermcp",
      adapter: "local-process" as const,
      command: "npx",
      args: ["-y", "@browsermcp/mcp"],
      metadata: { repo: "github:BrowserMCP/mcp" },
    };
    const artifact = makeArtifact([]);
    artifact.target.targetId = "browsermcp";
    artifact.target.serverName = "BrowserMCP";
    const receipt = await buildMcpReceipt(buildAuditReport(artifact, target), target);

    const graph = await buildRiskGraph([{ path: "receipt.json", data: receipt }]);
    const server = graph.nodes.find((node) => node.name === "BrowserMCP");

    expect(server).toMatchObject({
      source: "receipt",
      receiptState: "needs_review",
      recommendedAction: "gate",
      capabilityBoundary: "browser",
    });
    expect(server?.ciCommand).toContain("setup-ci --all");
  });

  it("dedupes duplicate server entries by target identity", async () => {
    const first = makeArtifact([]);
    first.target.targetId = "fixture";
    first.target.serverName = "fixture";
    first.target.metadata = { package: "@example/fixture-mcp" };
    const second = makeArtifact([]);
    second.target.targetId = "fixture-copy";
    second.target.serverName = "fixture";
    second.target.metadata = { package: "@example/fixture-mcp" };

    const graph = await buildRiskGraph([
      { path: "first.json", data: first },
      { path: "second.json", data: second },
    ]);

    expect(graph.summary.totalServers).toBe(1);
    expect(graph.nodes.find((node) => node.source !== "capability-boundary")?.evidenceRefs).toHaveLength(2);
  });

  it("loads directories, skips invalid artifacts, and reports warnings", async () => {
    const dir = await makeTempDir();
    const artifact = makeArtifact([]);
    await writeFile(path.join(dir, "run.json"), JSON.stringify(artifact), "utf8");
    await writeFile(path.join(dir, "bad.json"), "{not-json", "utf8");

    const loaded = await loadRiskGraphInputs([dir, path.join(dir, "missing.json")]);
    const graph = await buildRiskGraph(loaded.inputs);
    graph.warnings.push(...loaded.warnings);

    expect(loaded.inputs).toHaveLength(1);
    expect(graph.summary.totalServers).toBe(1);
    expect(graph.warnings.some((warning) => warning.includes("Skipped invalid artifact"))).toBe(true);
    expect(graph.warnings.some((warning) => warning.includes("Skipped missing or unreadable input"))).toBe(true);
  });

  it("classifies common agent toolchain boundaries", () => {
    expect(classifyCapabilityBoundary({ names: ["read_file", "write_file"] })).toBe("filesystem");
    expect(classifyCapabilityBoundary({ names: ["page_navigate", "screenshot"] })).toBe("browser");
    expect(classifyCapabilityBoundary({ names: ["run_shell_command"] })).toBe("command-execution");
    expect(classifyCapabilityBoundary({ names: ["memory_store"] })).toBe("memory");
    expect(classifyCapabilityBoundary({ names: ["fetch_customer_api"] })).toBe("data-api");
    expect(classifyCapabilityBoundary({ names: ["oauth_token_exchange"] })).toBe("identity-auth");
  });
});
