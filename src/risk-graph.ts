import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { buildActionReceipt, type ReceiptAction } from "./action-receipt.js";
import { extractObservatoryFindings, type ObservatoryFinding } from "./findings.js";
import type { McpReceipt, ReceiptState } from "./receipt.js";
import type { RunArtifact } from "./types.js";
import { TOOL_VERSION } from "./version.js";

export type CapabilityBoundary =
  | "filesystem"
  | "browser"
  | "command-execution"
  | "infra-cloud"
  | "memory"
  | "data-api"
  | "identity-auth"
  | "unknown";

export type RiskLevel = "critical" | "high" | "medium" | "low" | "unknown";

export interface RiskGraphEvidenceRef {
  type: "run-artifact" | "receipt" | "attack-sim" | "sarif" | "markdown";
  path: string;
  sha256?: string;
}

export interface RiskGraphNode {
  id: string;
  name: string;
  source: "run-artifact" | "receipt" | "capability-boundary";
  serverPackageOrRepo: string | null;
  capabilityBoundary: CapabilityBoundary;
  receiptState: ReceiptState | "not_generated";
  recommendedAction: ReceiptAction;
  riskLevel: RiskLevel;
  evidenceRefs: RiskGraphEvidenceRef[];
  ciCommand: string | null;
}

export interface RiskGraphEdge {
  from: string;
  to: string;
  type: "has-capability-boundary" | "has-evidence" | "requires-action";
  reason: string;
}

export interface RiskGraphSummary {
  totalServers: number;
  totalBoundaries: number;
  highestRiskLevel: RiskLevel;
  actionCounts: Record<ReceiptAction, number>;
  boundaryCounts: Record<CapabilityBoundary, number>;
}

export interface RiskGraph {
  schemaVersion: "1.0.0";
  generatedAt: string;
  toolVersion: string;
  nodes: RiskGraphNode[];
  edges: RiskGraphEdge[];
  summary: RiskGraphSummary;
  recommendedActions: string[];
  warnings: string[];
}

export interface RiskGraphInput {
  path: string;
  data: unknown;
}

export interface LoadRiskGraphInputsResult {
  inputs: RiskGraphInput[];
  warnings: string[];
}

type KnownInput =
  | { kind: "run"; artifact: RunArtifact; path: string }
  | { kind: "receipt"; receipt: McpReceipt; path: string };

const ALL_ACTIONS: ReceiptAction[] = ["allow", "gate", "rerun", "quarantine", "escalate"];
const ALL_BOUNDARIES: CapabilityBoundary[] = ["filesystem", "browser", "command-execution", "infra-cloud", "memory", "data-api", "identity-auth", "unknown"];

function stableId(prefix: string, value: string): string {
  return `${prefix}:${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function sha256File(filePath: string): Promise<string | undefined> {
  if (!existsSync(filePath)) return undefined;
  return sha256Text(await readFile(filePath, "utf8"));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRunArtifact(value: unknown): RunArtifact | undefined {
  if (!isObject(value)) return undefined;
  if (value["artifactType"] === "run" && isObject(value["target"]) && Array.isArray(value["checks"])) return value as unknown as RunArtifact;
  if (isObject(value["artifact"]) && value["artifact"]["artifactType"] === "run") return value["artifact"] as unknown as RunArtifact;
  return undefined;
}

function asMcpReceipt(value: unknown): McpReceipt | undefined {
  if (!isObject(value)) return undefined;
  return value["receipt_type"] === "mcp-observatory-receipt" && isObject(value["subject"]) && isObject(value["verdict"])
    ? value as unknown as McpReceipt
    : undefined;
}

async function collectJsonFiles(inputPath: string): Promise<string[]> {
  const info = await stat(inputPath);
  if (info.isFile()) return [inputPath];
  if (!info.isDirectory()) return [];
  const entries = await readdir(inputPath, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(inputPath, entry.name);
    if (entry.isDirectory()) return collectJsonFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".json") ? [fullPath] : [];
  }));
  return nested.flat();
}

export async function loadRiskGraphInputs(inputPaths: string[]): Promise<LoadRiskGraphInputsResult> {
  const warnings: string[] = [];
  const inputs: RiskGraphInput[] = [];
  for (const inputPath of inputPaths) {
    try {
      const files = await collectJsonFiles(inputPath);
      if (files.length === 0) warnings.push(`No JSON artifacts found at ${inputPath}.`);
      for (const filePath of files) {
        try {
          inputs.push({ path: filePath, data: JSON.parse(await readFile(filePath, "utf8")) });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          warnings.push(`Skipped invalid artifact ${filePath}: ${message}`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`Skipped missing or unreadable input ${inputPath}: ${message}`);
    }
  }
  return { inputs, warnings };
}

function inputKind(input: RiskGraphInput): KnownInput | undefined {
  const receipt = asMcpReceipt(input.data);
  if (receipt) return { kind: "receipt", receipt, path: input.path };
  const artifact = asRunArtifact(input.data);
  if (artifact) return { kind: "run", artifact, path: input.path };
  return undefined;
}

function receiptIdentity(receipt: McpReceipt): string {
  return [
    receipt.subject.package_or_repo,
    receipt.subject.resolved_identity,
    receipt.subject.mcp_server_name,
    receipt.subject.startup_command,
    receipt.subject.target_path_or_url,
  ].filter(Boolean).join("|");
}

function runIdentity(artifact: RunArtifact): string {
  const metadata = artifact.target.metadata ?? {};
  const strongIdentity = metadata["package"] ?? metadata["repo"] ?? metadata["repository"] ?? metadata["source"];
  if (strongIdentity) return strongIdentity;
  const packageArg = packageFromCommandArgs(artifact.target.command, artifact.target.args);
  if (packageArg) return packageArg;
  return [
    artifact.target.serverName,
    artifact.target.targetId,
    artifact.target.command ? [artifact.target.command, ...artifact.target.args].join(" ") : artifact.target.url,
  ].filter(Boolean).join("|");
}

function packageFromCommandArgs(command: string | undefined, args: string[]): string | undefined {
  if (command !== "npx") return undefined;
  return args.find((arg) => !arg.startsWith("-") && arg !== "latest");
}

function packageOrRepoFromRun(artifact: RunArtifact): string | null {
  const metadata = artifact.target.metadata ?? {};
  return metadata["package"] ?? metadata["repo"] ?? metadata["repository"] ?? metadata["source"] ?? packageFromCommandArgs(artifact.target.command, artifact.target.args) ?? null;
}

function ciCommandFromRun(artifact: RunArtifact): string | null {
  if (artifact.target.adapter === "local-process" && artifact.target.command) {
    return `mcp-observatory setup-ci --all --command ${JSON.stringify([artifact.target.command, ...artifact.target.args].join(" "))} --sarif --schedule weekly`;
  }
  if (artifact.target.adapter === "http" && artifact.target.url) {
    return `mcp-observatory setup-ci --all --command ${artifact.target.url} --sarif --schedule weekly`;
  }
  return null;
}

function riskLevelForAction(action: ReceiptAction): RiskLevel {
  if (action === "escalate") return "critical";
  if (action === "quarantine") return "high";
  if (action === "gate") return "medium";
  if (action === "rerun") return "medium";
  return "low";
}

function strongerRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  const rank: Record<RiskLevel, number> = { unknown: 0, low: 1, medium: 2, high: 3, critical: 4 };
  return rank[a] >= rank[b] ? a : b;
}

function strongestAction(a: ReceiptAction, b: ReceiptAction): ReceiptAction {
  const rank: Record<ReceiptAction, number> = { allow: 0, rerun: 1, gate: 2, quarantine: 3, escalate: 4 };
  return rank[a] >= rank[b] ? a : b;
}

function textForClassification(parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function classifyCapabilityBoundary(input: {
  names?: string[];
  findings?: ObservatoryFinding[];
  metadata?: Record<string, string>;
  fallbackText?: string;
}): CapabilityBoundary {
  const findingText = input.findings?.map((finding) => textForClassification([
    finding.ruleId,
    finding.title,
    finding.message,
    finding.category,
    finding.subject.name,
    finding.recommendation,
  ])).join(" ") ?? "";
  const metadataText = Object.values(input.metadata ?? {}).join(" ");
  const text = textForClassification([...(input.names ?? []), findingText, metadataText, input.fallbackText]);
  if (/\b(browser|browsermcp|playwright|puppeteer|chrome|page|dom|screenshot|navigate)\b/.test(text)) return "browser";
  if (/\b(kube|kubernetes|kubectl|helm|terraform|opentofu|aws|gcp|azure|cloud|cluster|pod|namespace|deploy|manifest|infra)\b/.test(text)) return "infra-cloud";
  if (/\b(command|shell|exec|spawn|process|terminal|bash|script|subprocess)\b/.test(text) || text.includes("run_shell")) return "command-execution";
  if (/\b(file|filesystem|directory|path|delete|mkdir|cwd|workspace)\b/.test(text) || text.includes("read_file") || text.includes("write_file")) return "filesystem";
  if (/\b(memory|vector|embedding|store|recall|remember|knowledge)\b/.test(text) || text.includes("memory_")) return "memory";
  if (/\b(api|database|sql|http|graphql|request|fetch|webhook|email|slack|notion|jira|linear|crm)\b/.test(text) || text.includes("_api")) return "data-api";
  if (/\b(auth|oauth|token|credential|secret|identity|permission|role|scope|session)\b/.test(text) || text.includes("oauth_")) return "identity-auth";
  return "unknown";
}

function evidenceRefsForRun(artifact: RunArtifact, inputPath: string): RiskGraphEvidenceRef[] {
  const refs: RiskGraphEvidenceRef[] = [{ type: "run-artifact", path: inputPath }];
  if (artifact.checks.some((check) => check.id === "attack-sim")) refs.push({ type: "attack-sim", path: inputPath });
  return refs;
}

function receiptEvidenceRefs(receipt: McpReceipt, inputPath: string): RiskGraphEvidenceRef[] {
  const refs: RiskGraphEvidenceRef[] = [{ type: "receipt", path: inputPath }];
  if (receipt.evidence.json_report_path) refs.push({ type: "run-artifact", path: receipt.evidence.json_report_path, sha256: receipt.evidence.json_report_sha256 ?? undefined });
  if (receipt.evidence.markdown_report_path) refs.push({ type: "markdown", path: receipt.evidence.markdown_report_path, sha256: receipt.evidence.markdown_report_sha256 ?? undefined });
  if (receipt.evidence.sarif_path) refs.push({ type: "sarif", path: receipt.evidence.sarif_path, sha256: receipt.evidence.sarif_sha256 ?? undefined });
  return refs;
}

function mergeNode(existing: RiskGraphNode, next: RiskGraphNode): RiskGraphNode {
  const refs = new Map<string, RiskGraphEvidenceRef>();
  for (const ref of [...existing.evidenceRefs, ...next.evidenceRefs]) refs.set(`${ref.type}:${ref.path}`, ref);
  return {
    ...existing,
    name: existing.name || next.name,
    serverPackageOrRepo: existing.serverPackageOrRepo ?? next.serverPackageOrRepo,
    capabilityBoundary: existing.capabilityBoundary === "unknown" ? next.capabilityBoundary : existing.capabilityBoundary,
    receiptState: existing.receiptState === "not_generated" ? next.receiptState : existing.receiptState,
    recommendedAction: strongestAction(existing.recommendedAction, next.recommendedAction),
    riskLevel: strongerRisk(existing.riskLevel, next.riskLevel),
    evidenceRefs: [...refs.values()],
    ciCommand: existing.ciCommand ?? next.ciCommand,
  };
}

function actionText(action: ReceiptAction): string {
  if (action === "allow") return "Allow with routine monitoring.";
  if (action === "rerun") return "Rerun with a corrected startup command or fresh baseline.";
  if (action === "gate") return "Gate adoption until maintainers review the finding.";
  if (action === "quarantine") return "Quarantine from production agents until the boundary is reduced or accepted.";
  return "Escalate to security before agents depend on this toolchain.";
}

function boundaryNode(boundary: CapabilityBoundary): RiskGraphNode {
  return {
    id: `boundary:${boundary}`,
    name: boundary,
    source: "capability-boundary",
    serverPackageOrRepo: null,
    capabilityBoundary: boundary,
    receiptState: "not_generated",
    recommendedAction: boundary === "unknown" ? "allow" : "gate",
    riskLevel: boundary === "unknown" ? "unknown" : "medium",
    evidenceRefs: [],
    ciCommand: null,
  };
}

export async function buildRiskGraph(inputs: RiskGraphInput[]): Promise<RiskGraph> {
  const warnings: string[] = [];
  const serverNodes = new Map<string, RiskGraphNode>();
  const edges = new Map<string, RiskGraphEdge>();
  const boundaries = new Set<CapabilityBoundary>();

  for (const input of inputs) {
    const known = inputKind(input);
    if (!known) {
      warnings.push(`Skipped unsupported artifact ${input.path}.`);
      continue;
    }

    if (known.kind === "receipt") {
      const boundary = classifyCapabilityBoundary({
        fallbackText: `${known.receipt.subject.mcp_server_name} ${known.receipt.subject.package_or_repo ?? ""} ${known.receipt.evidence.tool_surface_summary} ${known.receipt.evidence.attack_simulation_summary}`,
      });
      const node: RiskGraphNode = {
        id: stableId("server", receiptIdentity(known.receipt)),
        name: known.receipt.subject.mcp_server_name,
        source: "receipt",
        serverPackageOrRepo: known.receipt.subject.package_or_repo,
        capabilityBoundary: boundary,
        receiptState: known.receipt.verdict.state,
        recommendedAction: known.receipt.verdict.action,
        riskLevel: riskLevelForAction(known.receipt.verdict.action),
        evidenceRefs: receiptEvidenceRefs(known.receipt, known.path),
        ciCommand: known.receipt.reproduction.ci_command,
      };
      const hash = await sha256File(known.path);
      node.evidenceRefs[0] = { ...node.evidenceRefs[0]!, sha256: hash };
      serverNodes.set(node.id, serverNodes.has(node.id) ? mergeNode(serverNodes.get(node.id)!, node) : node);
      boundaries.add(boundary);
      edges.set(`${node.id}->boundary:${boundary}`, { from: node.id, to: `boundary:${boundary}`, type: "has-capability-boundary", reason: `Receipt classifies this server as ${boundary}.` });
      if (node.recommendedAction !== "allow") edges.set(`${node.id}->action:${node.recommendedAction}`, { from: node.id, to: `boundary:${boundary}`, type: "requires-action", reason: actionText(node.recommendedAction) });
      continue;
    }

    const findings = extractObservatoryFindings(known.artifact);
    const toolNames = known.artifact.checks.flatMap((check) => check.evidence.flatMap((evidence) => evidence.identifiers ?? []));
    const actionReceipt = buildActionReceipt(known.artifact);
    const boundary = classifyCapabilityBoundary({
      names: toolNames,
      findings,
      metadata: known.artifact.target.metadata,
      fallbackText: known.artifact.target.targetId,
    });
    const node: RiskGraphNode = {
      id: stableId("server", runIdentity(known.artifact)),
      name: known.artifact.target.serverName ?? known.artifact.target.targetId,
      source: "run-artifact",
      serverPackageOrRepo: packageOrRepoFromRun(known.artifact),
      capabilityBoundary: boundary,
      receiptState: "not_generated",
      recommendedAction: actionReceipt.action,
      riskLevel: riskLevelForAction(actionReceipt.action),
      evidenceRefs: evidenceRefsForRun(known.artifact, known.path),
      ciCommand: ciCommandFromRun(known.artifact),
    };
    const hash = await sha256File(known.path);
    node.evidenceRefs[0] = { ...node.evidenceRefs[0]!, sha256: hash };
    serverNodes.set(node.id, serverNodes.has(node.id) ? mergeNode(serverNodes.get(node.id)!, node) : node);
    boundaries.add(boundary);
    edges.set(`${node.id}->boundary:${boundary}`, { from: node.id, to: `boundary:${boundary}`, type: "has-capability-boundary", reason: `Observed tools/findings classify this server as ${boundary}.` });
    if (node.evidenceRefs.some((ref) => ref.type === "attack-sim")) edges.set(`${node.id}->attack-sim`, { from: node.id, to: `boundary:${boundary}`, type: "has-evidence", reason: "Safe attack-sim evidence is present." });
    if (node.recommendedAction !== "allow") edges.set(`${node.id}->action:${node.recommendedAction}`, { from: node.id, to: `boundary:${boundary}`, type: "requires-action", reason: actionText(node.recommendedAction) });
  }

  const boundaryNodes = [...boundaries].sort().map(boundaryNode);
  const nodes = [...boundaryNodes, ...serverNodes.values()].sort((a, b) => a.source.localeCompare(b.source) || a.name.localeCompare(b.name));
  const serverOnlyNodes = nodes.filter((node) => node.source !== "capability-boundary");
  const actionCounts = Object.fromEntries(ALL_ACTIONS.map((action) => [action, 0])) as Record<ReceiptAction, number>;
  const boundaryCounts = Object.fromEntries(ALL_BOUNDARIES.map((boundary) => [boundary, 0])) as Record<CapabilityBoundary, number>;
  let highestRiskLevel: RiskLevel = "unknown";
  for (const node of serverOnlyNodes) {
    actionCounts[node.recommendedAction] += 1;
    boundaryCounts[node.capabilityBoundary] += 1;
    highestRiskLevel = strongerRisk(highestRiskLevel, node.riskLevel);
  }
  const recommendedActions = serverOnlyNodes
    .filter((node) => node.recommendedAction !== "allow")
    .sort((a, b) => b.riskLevel.localeCompare(a.riskLevel) || a.name.localeCompare(b.name))
    .slice(0, 10)
    .map((node) => `${node.name}: ${actionText(node.recommendedAction)}`);

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    toolVersion: TOOL_VERSION,
    nodes,
    edges: [...edges.values()].sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to)),
    summary: {
      totalServers: serverOnlyNodes.length,
      totalBoundaries: boundaries.size,
      highestRiskLevel,
      actionCounts,
      boundaryCounts,
    },
    recommendedActions,
    warnings,
  };
}

function cell(value: unknown): string {
  const text = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  return text.replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function renderRiskGraphMarkdown(graph: RiskGraph): string {
  const serverNodes = graph.nodes.filter((node) => node.source !== "capability-boundary");
  const lines = [
    "# MCP Risk Graph",
    "",
    "MCP Observatory maps the risk graph of agent toolchains before agents depend on them.",
    "",
    "This graph is evidence-based and safe-mode only. It links MCP servers to receipts, attack-sim output, capability boundaries, recommended actions, and CI/SARIF next steps.",
    "",
    "## Summary",
    "",
    `- Servers: ${graph.summary.totalServers}`,
    `- Capability boundaries: ${graph.summary.totalBoundaries}`,
    `- Highest risk: ${graph.summary.highestRiskLevel}`,
    `- Generated at: ${graph.generatedAt}`,
    "",
    "## Servers",
    "",
    "| Server | Boundary | Risk | Action | Receipt | CI command | Evidence |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...serverNodes.map((node) => [
      `| ${cell(node.name)}`,
      cell(node.capabilityBoundary),
      cell(node.riskLevel),
      cell(node.recommendedAction),
      cell(node.receiptState),
      cell(node.ciCommand),
      `${node.evidenceRefs.map((ref) => `${ref.type}:${ref.path}`).join("<br>")} |`,
    ].join(" | ")),
    "",
    "## Recommended Actions",
    "",
    ...(graph.recommendedActions.length > 0 ? graph.recommendedActions.map((action) => `- ${action}`) : ["- No blocking MCP risk-graph actions were detected."]),
    "",
    "## Maintainer Note Template",
    "",
    "We generated a safe MCP Observatory receipt for your MCP server. It includes the exact evidence artifact, recommended action, and CI/SARIF command. If this startup command is not the safest public mode, reply with the preferred no-secret command and we will update the receipt.",
  ];
  if (graph.warnings.length > 0) {
    lines.push("", "## Warnings", "", ...graph.warnings.map((warning) => `- ${warning}`));
  }
  return lines.join("\n");
}

function escapeHtml(value: unknown): string {
  const text = typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : "";
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

export function renderRiskGraphHtml(graph: RiskGraph): string {
  const serverNodes = graph.nodes.filter((node) => node.source !== "capability-boundary");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MCP Risk Graph</title>
  <style>
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #f7f9fc; }
    header { padding: 28px 32px 18px; background: #ffffff; border-bottom: 1px solid #d8e0ea; }
    h1 { margin: 0 0 8px; font-size: 32px; letter-spacing: 0; }
    main { padding: 24px 32px 40px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .card, table { background: #ffffff; border: 1px solid #d8e0ea; border-radius: 8px; }
    .card { padding: 16px; }
    .card span { display: block; color: #667085; font-size: 13px; }
    .card strong { display: block; margin-top: 6px; font-size: 24px; }
    table { width: 100%; border-collapse: collapse; overflow: hidden; }
    th, td { padding: 11px 12px; border-bottom: 1px solid #e5ebf2; text-align: left; vertical-align: top; font-size: 14px; }
    th { color: #475467; background: #f0f4f8; font-size: 12px; text-transform: uppercase; }
    code { font-size: 12px; white-space: normal; }
    .pill { display: inline-block; padding: 3px 8px; border-radius: 999px; background: #e8eef6; font-size: 12px; }
    .critical, .high { background: #fee2e2; color: #991b1b; }
    .medium { background: #fef3c7; color: #92400e; }
    .low { background: #dcfce7; color: #166534; }
  </style>
</head>
<body>
  <header>
    <h1>MCP Risk Graph</h1>
    <p>MCP Observatory maps the risk graph of agent toolchains before agents depend on them.</p>
  </header>
  <main>
    <section class="summary">
      <article class="card"><span>Servers</span><strong>${graph.summary.totalServers}</strong></article>
      <article class="card"><span>Capability boundaries</span><strong>${graph.summary.totalBoundaries}</strong></article>
      <article class="card"><span>Highest risk</span><strong>${escapeHtml(graph.summary.highestRiskLevel)}</strong></article>
      <article class="card"><span>Generated</span><strong>${escapeHtml(graph.generatedAt.slice(0, 10))}</strong></article>
    </section>
    <table>
      <thead><tr><th>Server</th><th>Boundary</th><th>Risk</th><th>Action</th><th>Receipt</th><th>CI command</th><th>Evidence</th></tr></thead>
      <tbody>
        ${serverNodes.map((node) => `<tr>
          <td><strong>${escapeHtml(node.name)}</strong><br><small>${escapeHtml(node.serverPackageOrRepo ?? "")}</small></td>
          <td><span class="pill">${escapeHtml(node.capabilityBoundary)}</span></td>
          <td><span class="pill ${escapeHtml(node.riskLevel)}">${escapeHtml(node.riskLevel)}</span></td>
          <td>${escapeHtml(node.recommendedAction)}</td>
          <td>${escapeHtml(node.receiptState)}</td>
          <td><code>${escapeHtml(node.ciCommand ?? "")}</code></td>
          <td>${node.evidenceRefs.map((ref) => `<code>${escapeHtml(`${ref.type}:${ref.path}`)}</code>`).join("<br>")}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </main>
</body>
</html>`;
}

export function renderRiskGraphJson(graph: RiskGraph): string {
  return JSON.stringify(graph, null, 2);
}
