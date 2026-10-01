import { createHash, createPublicKey, sign, verify, generateKeyPairSync, type KeyObject } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { type AuditReport, type AuditSeverity, type NormalizedSecurityFinding, type TrustStatus, auditScore, renderAuditMarkdown, renderAuditSarif } from "./audit.js";
import type { NotObserved, RunArtifact, TargetConfig } from "./types.js";

export type ReceiptEnvironmentClass = "local" | "ci" | "public_safety_index" | "private_fleet";
export type ReceiptState = "ready_for_ci" | "needs_review" | "blocked" | "could_not_evaluate";
export type ReceiptAction = "allow" | "gate" | "rerun" | "quarantine" | "escalate";
export type ReceiptFormat = "json" | "markdown";

export interface ReceiptSubject {
  mcp_server_name: string;
  package_or_repo: string | null;
  source: "local-process" | "http" | "target-config" | "unknown";
  startup_command: string | null;
  version: string | null;
  resolved_identity: string | null;
  target_path_or_url: string | null;
  commit_sha: string | null;
  package_manager: string | null;
}

export interface ReceiptRunContext {
  generated_at: string;
  mcp_observatory_version: string;
  profile: string;
  safe_mode_statement: string;
  environment_class: ReceiptEnvironmentClass;
  command_invoked: string;
  config_file_used: string | null;
  runner_os: string | null;
  working_directory: string | null;
}

export interface ReceiptEvidence {
  json_report_path: string | null;
  json_report_sha256: string | null;
  markdown_report_path: string | null;
  markdown_report_sha256: string | null;
  html_report_path: string | null;
  html_report_sha256: string | null;
  sarif_path: string | null;
  sarif_sha256: string | null;
  schema_summary: string;
  tool_surface_summary: string;
  attack_simulation_summary: string;
  baseline_or_drift_summary: string;
  runtime_profile_summary: string;
}

export interface ReceiptVerdict {
  score: number;
  status: TrustStatus;
  state: ReceiptState;
  action: ReceiptAction;
  reason: string;
}

export interface ReceiptFinding {
  id: string;
  title: string;
  severity: AuditSeverity;
  control_area: string;
  evidence_summary: string;
  recommended_fix: string;
  blocks_ci: boolean;
  fingerprint: string;
}

export interface ReceiptReproduction {
  rerun_command: string;
  ci_command: string;
  sarif_upload_hint: string;
  expected_artifacts: string[];
}

export interface ReceiptCta {
  id: string;
  label: string;
  description: string;
}

export interface McpReceipt {
  receipt_type: "mcp-observatory-receipt";
  schema_version: "1.0.0";
  subject: ReceiptSubject;
  run_context: ReceiptRunContext;
  evidence: ReceiptEvidence;
  verdict: ReceiptVerdict;
  findings: ReceiptFinding[];
  notObserved: NotObserved[];
  reproduction: ReceiptReproduction;
  maintainer_cta: ReceiptCta[];
  buyer_cta: ReceiptCta[];
  signer?: string;
  signature?: string;
}

export interface ReceiptEvidenceOptions {
  jsonReportPath?: string;
  markdownReportPath?: string;
  htmlReportPath?: string;
  sarifPath?: string;
}

export interface BuildReceiptOptions extends ReceiptEvidenceOptions {
  commandInvoked?: string;
  configFileUsed?: string;
  environmentClass?: ReceiptEnvironmentClass;
  outputPath?: string;
  topFindingsLimit?: number;
}

const SAFE_MODE_STATEMENT = "Safe-mode only: MCP Observatory inspects metadata, schemas, startup behavior, and inert attack-readiness evidence. It does not execute destructive payloads, exfiltrate secrets, or contact attacker-controlled callbacks.";

function quoteArg(value: string): string {
  if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(value)) return value;
  return JSON.stringify(value);
}

function targetCommand(target: TargetConfig): string {
  if (target.adapter === "http") return target.url;
  return [target.command, ...target.args].map(quoteArg).join(" ");
}

function targetPackageOrRepo(target: TargetConfig): string | null {
  const metadata = target.metadata ?? {};
  return metadata["package"] ?? metadata["repo"] ?? metadata["repository"] ?? metadata["source"] ?? null;
}

function packageManager(target: TargetConfig): string | null {
  if (target.adapter !== "local-process") return null;
  if (target.command === "npx" || target.command === "npm" || target.args.some((arg) => arg.includes("npm"))) return "npm";
  if (target.command === "pnpm" || target.args.some((arg) => arg.includes("pnpm"))) return "pnpm";
  if (target.command === "yarn" || target.args.some((arg) => arg.includes("yarn"))) return "yarn";
  if (target.command === "uvx" || target.command === "uv") return "uv";
  if (target.command === "pipx" || target.command === "python" || target.command === "python3") return "python";
  return null;
}

function resolvedIdentity(report: AuditReport, target: TargetConfig): string | null {
  const serverName = report.artifact.target.serverName;
  const serverVersion = report.artifact.target.serverVersion;
  if (serverName && serverVersion) return `${serverName}@${serverVersion}`;
  if (serverName) return serverName;
  if (target.adapter === "local-process" && target.command === "npx") {
    const pkg = target.args.find((arg) => !arg.startsWith("-"));
    return pkg ?? null;
  }
  return null;
}

function safeWorkingDirectory(target: TargetConfig): string | null {
  if (target.adapter !== "local-process" || !target.cwd) return null;
  const resolved = path.resolve(target.cwd);
  const home = os.homedir();
  if (resolved === home || resolved.startsWith(`${home}${path.sep}`)) return null;
  return resolved;
}

function safePath(value: string | undefined): string | null {
  if (!value) return null;
  const resolved = path.resolve(value);
  const home = os.homedir();
  if (resolved === home || resolved.startsWith(`${home}${path.sep}`)) return path.basename(value);
  return value;
}

function inferEnvironmentClass(): ReceiptEnvironmentClass {
  if (process.env["MCP_OBSERVATORY_PUBLIC_SAFETY_INDEX"] === "1") return "public_safety_index";
  if (process.env["MCP_OBSERVATORY_PRIVATE_FLEET"] === "1") return "private_fleet";
  if (process.env["CI"] === "true" || process.env["GITHUB_ACTIONS"] === "true") return "ci";
  return "local";
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function sha256File(filePath: string | undefined): Promise<string | null> {
  if (!filePath || !existsSync(filePath)) return null;
  return sha256Text(await readFile(filePath, "utf8"));
}

function schemaSummary(report: AuditReport): string {
  const schemaCheck = report.artifact.checks.find((check) => check.id === "schema-quality");
  if (!schemaCheck) return "No dedicated schema-quality check was present.";
  const findingCount = schemaCheck.evidence.reduce((sum, evidence) => sum + (evidence.findings?.length ?? 0), 0);
  return `${schemaCheck.status}: ${schemaCheck.message}${findingCount > 0 ? ` (${findingCount} schema finding(s))` : ""}`;
}

function toolSurfaceSummary(report: AuditReport): string {
  const toolsCheck = report.artifact.checks.find((check) => check.id === "tools");
  if (!toolsCheck) return "Tool surface was not listed.";
  const identifiers = toolsCheck.evidence.flatMap((evidence) => evidence.identifiers ?? []);
  const count = identifiers.length > 0 ? identifiers.length : toolsCheck.evidence.reduce((sum, evidence) => sum + (evidence.itemCount ?? 0), 0);
  const sample = identifiers.slice(0, 5).join(", ");
  return `${toolsCheck.status}: ${count} tool(s) observed${sample ? ` (${sample}${identifiers.length > 5 ? ", ..." : ""})` : ""}.`;
}

function attackSimulationSummary(report: AuditReport): string {
  const attackCheck = report.artifact.checks.find((check) => check.id === "attack-sim");
  if (!attackCheck) return "Attack simulation evidence was not generated for this run.";
  const findingCount = attackCheck.evidence.reduce((sum, evidence) => sum + (evidence.findings?.length ?? 0), 0);
  return `${attackCheck.status}: ${attackCheck.message}${findingCount > 0 ? ` (${findingCount} attack-sim finding(s))` : ""}`;
}

function driftSummary(report: AuditReport): string {
  const driftFindings = report.findings.filter((finding) => finding.rule_id.includes("drift") || finding.category.includes("drift"));
  if (driftFindings.length === 0) return "No baseline or drift finding was included in this receipt.";
  return `${driftFindings.length} baseline/drift finding(s) summarized.`;
}

function runtimeProfileSummary(report: AuditReport): string {
  const profile = report.artifact.runtimeProfile;
  if (!profile) return "Runtime profile was not generated for this run.";
  const egressCount = profile.egress?.length ?? 0;
  const mutationCount = profile.stateMutations?.length ?? 0;
  if (egressCount === 0 && mutationCount === 0) {
    return `No egress or state mutation indicators detected (confidence: ${profile.confidence}).`;
  }
  const parts: string[] = [];
  if (egressCount > 0) parts.push(`${egressCount} egress target(s) detected`);
  if (mutationCount > 0) parts.push(`${mutationCount} state mutation(s) detected`);
  return `${parts.join(", ")} (confidence: ${profile.confidence}).`;
}

export function detectNotObserved(artifact: RunArtifact): NotObserved[] {
  const notObserved: NotObserved[] = [];
  const allToolIds = new Set<string>();
  const networkPattern = /url|http|https|fetch|request|api|web|curl|wget|net|socket|connect|download|upload/i;
  const fsPattern = /read|write|delete|remove|create|mkdir|rmdir|file[_-]|fs[_-]|^cp$|^mv$|^ln$|touch|chmod|chown|move|copy|rename|dir/i;

  for (const check of artifact.checks) {
    for (const ev of check.evidence) {
      for (const id of ev.identifiers ?? []) {
        allToolIds.add(id);
      }
      if (ev.endpoint === "tools/list" && typeof ev.responseSnapshots?.tools === "object") {
        const tools = (ev.responseSnapshots).tools as Array<{ name: string }> | undefined;
        if (tools) {
          for (const tool of tools) {
            if (typeof tool.name === "string") allToolIds.add(tool.name);
          }
        }
      }
    }
  }

  const hasNetworkTool = [...allToolIds].some((t) => networkPattern.test(t));
  if (!hasNetworkTool) {
    notObserved.push({
      category: "network_egress",
      detail: "No outbound network calls were attempted during scan",
      severity: "warning",
    });
  }

  const hasFsTool = [...allToolIds].some((t) => fsPattern.test(t));
  if (!hasFsTool) {
    notObserved.push({
      category: "filesystem_mutation",
      detail: "Filesystem write operations were not exercised",
      severity: "warning",
    });
  }

  const securityCheck = artifact.checks.find((c) => c.id === "security" || c.id === "security-lite");
  if (!securityCheck) {
    notObserved.push({
      category: "credential_access",
      detail: "Credential scanning was not performed",
      severity: "warning",
    });
  } else {
    notObserved.push({
      category: "credential_access",
      detail: "Credential scanning was performed (see security findings)",
      severity: "info",
    });
  }

  notObserved.push({
    category: "destructive_payloads",
    detail: "Destructive payloads were not attempted (safe-mode only)",
    severity: "info",
  });

  return notObserved;
}

export function mapStatusToReceiptVerdict(report: AuditReport): ReceiptVerdict {
  if (report.artifact.fatalError) {
    return {
      score: report.summary.score,
      status: report.summary.trust_status,
      state: "could_not_evaluate",
      action: "rerun",
      reason: report.artifact.fatalError.split("\n")[0] ?? "Evaluation did not complete.",
    };
  }

  const counts = report.summary.severity_counts;
  const status = auditScore(report).status;
  if (counts.critical > 0 || status === "critical_risk") {
    return { score: report.summary.score, status, state: "blocked", action: "escalate", reason: "Critical MCP release-gate findings require escalation before agent dependency." };
  }
  if (counts.high > 0 || status === "high_risk") {
    return { score: report.summary.score, status, state: "blocked", action: "gate", reason: "High-risk MCP findings should block CI until reviewed or fixed." };
  }
  if (counts.medium > 0 || status === "needs_review") {
    return { score: report.summary.score, status, state: "needs_review", action: "gate", reason: "Medium-risk MCP findings need maintainer review before broad agent dependency." };
  }
  return { score: report.summary.score, status, state: "ready_for_ci", action: "allow", reason: "No blocking MCP readiness findings were detected." };
}

function findingRank(severity: AuditSeverity): number {
  return severity === "critical" ? 5
    : severity === "high" ? 4
      : severity === "medium" ? 3
        : severity === "low" ? 2
          : 1;
}

function summarizeEvidence(finding: NormalizedSecurityFinding): string {
  const evidence = JSON.stringify(finding.evidence ?? {});
  if (evidence.length <= 240) return evidence;
  return `${evidence.slice(0, 237)}...`;
}

function blocksCi(severity: AuditSeverity): boolean {
  return severity === "critical" || severity === "high" || severity === "medium";
}

function receiptFindings(report: AuditReport, limit: number): ReceiptFinding[] {
  return [...report.findings]
    .sort((a, b) => findingRank(b.severity) - findingRank(a.severity) || a.title.localeCompare(b.title))
    .slice(0, limit)
    .map((finding) => ({
      id: finding.id,
      title: finding.title,
      severity: finding.severity,
      control_area: finding.control_mappings[0] ?? "trust_boundaries",
      evidence_summary: summarizeEvidence(finding),
      recommended_fix: finding.recommendation,
      blocks_ci: blocksCi(finding.severity),
      fingerprint: finding.fingerprint,
    }));
}

function ciCommand(target: TargetConfig): string {
  return `mcp-observatory setup-ci --all --command ${quoteArg(targetCommand(target))} --sarif --schedule weekly`;
}

function rerunCommand(target: TargetConfig, profile: string): string {
  return `mcp-observatory audit ${targetCommand(target)} --profile ${quoteArg(profile)} --format json --output report.json`;
}

export async function buildMcpReceipt(report: AuditReport, target: TargetConfig, options: BuildReceiptOptions = {}): Promise<McpReceipt> {
  const jsonReportText = JSON.stringify(report, null, 2);
  const markdownReportText = renderAuditMarkdown(report);
  const sarifText = renderAuditSarif(report);
  const expectedArtifacts = [
    options.jsonReportPath ?? "report.json",
    options.markdownReportPath ?? "report.md",
    options.sarifPath ?? "results.sarif",
  ];
  const metadata = target.metadata ?? {};
  return {
    receipt_type: "mcp-observatory-receipt",
    schema_version: "1.0.0",
    subject: {
      mcp_server_name: report.artifact.target.serverName ?? target.targetId,
      package_or_repo: targetPackageOrRepo(target),
      source: target.adapter === "http" ? "http" : "local-process",
      startup_command: target.adapter === "local-process" ? targetCommand(target) : null,
      version: report.artifact.target.serverVersion ?? metadata["version"] ?? null,
      resolved_identity: resolvedIdentity(report, target),
      target_path_or_url: target.adapter === "http" ? target.url : safePath(target.cwd),
      commit_sha: metadata["commit_sha"] ?? metadata["commit"] ?? process.env["GITHUB_SHA"] ?? null,
      package_manager: packageManager(target),
    },
    run_context: {
      generated_at: report.summary.generated_at,
      mcp_observatory_version: report.artifact.toolVersion,
      profile: report.summary.profile,
      safe_mode_statement: SAFE_MODE_STATEMENT,
      environment_class: options.environmentClass ?? inferEnvironmentClass(),
      command_invoked: options.commandInvoked ?? rerunCommand(target, report.summary.profile),
      config_file_used: safePath(options.configFileUsed),
      runner_os: report.artifact.environment.platform,
      working_directory: safeWorkingDirectory(target),
    },
    evidence: {
      json_report_path: options.jsonReportPath ?? null,
      json_report_sha256: options.jsonReportPath ? await sha256File(options.jsonReportPath) : sha256Text(jsonReportText),
      markdown_report_path: options.markdownReportPath ?? null,
      markdown_report_sha256: options.markdownReportPath ? await sha256File(options.markdownReportPath) : sha256Text(markdownReportText),
      html_report_path: options.htmlReportPath ?? null,
      html_report_sha256: await sha256File(options.htmlReportPath),
      sarif_path: options.sarifPath ?? null,
      sarif_sha256: options.sarifPath ? await sha256File(options.sarifPath) : sha256Text(sarifText),
      schema_summary: schemaSummary(report),
      tool_surface_summary: toolSurfaceSummary(report),
      attack_simulation_summary: attackSimulationSummary(report),
      baseline_or_drift_summary: driftSummary(report),
      runtime_profile_summary: runtimeProfileSummary(report),
    },
    verdict: mapStatusToReceiptVerdict(report),
    findings: receiptFindings(report, options.topFindingsLimit ?? 5),
    notObserved: detectNotObserved(report.artifact),
    reproduction: {
      rerun_command: rerunCommand(target, report.summary.profile),
      ci_command: ciCommand(target),
      sarif_upload_hint: "Generate SARIF with `mcp-observatory audit <target> --format sarif --output results.sarif`, then upload it with GitHub Code Scanning.",
      expected_artifacts: expectedArtifacts,
    },
    maintainer_cta: [
      { id: "claim_or_update_receipt", label: "Claim this receipt", description: "Confirm the target command and update the receipt with maintainer-approved startup details." },
      { id: "add_ci", label: "Add CI gate", description: "Run the CI command so every release keeps this MCP receipt current." },
      { id: "fix_findings", label: "Fix blocking findings", description: "Address findings that block CI or require review." },
      { id: "request_rerun", label: "Request rerun", description: "Ask MCP Observatory to regenerate this receipt after fixes or target changes." },
      { id: "provide_safe_startup_mode", label: "Provide safe startup mode", description: "Share a no-secret, non-destructive startup command for public receipt generation." },
    ],
    buyer_cta: [
      { id: "request_release_gate_pilot", label: "Request Release Gate Pilot", description: "Get an owner-ready release decision for 1–3 critical MCP servers over ten business days for a fixed $15,000." },
    ],
  };
}

function markdownTable(rows: string[][]): string {
  if (rows.length === 0) return "";
  return [
    `| ${rows[0]!.join(" | ")} |`,
    `| ${rows[0]!.map(() => "---").join(" | ")} |`,
    ...rows.slice(1).map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

function cell(value: unknown): string {
  const text = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  return text.replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function renderReceiptMarkdown(receipt: McpReceipt): string {
  const lines = [
    "# MCP Observatory Receipt",
    "",
    "A scan finds facts. A report explains facts. A receipt makes facts portable, reproducible, citable, and actionable.",
    "",
    "## Verdict",
    "",
    `**State:** \`${receipt.verdict.state}\``,
    `**Action:** \`${receipt.verdict.action}\``,
    `**Trust status:** \`${receipt.verdict.status}\``,
    `**Score:** ${receipt.verdict.score}/100`,
    `**Reason:** ${receipt.verdict.reason}`,
    "",
    "## Subject",
    "",
    markdownTable([
      ["Field", "Value"],
      ["MCP server", cell(receipt.subject.mcp_server_name)],
      ["Package or repo", cell(receipt.subject.package_or_repo)],
      ["Source", receipt.subject.source],
      ["Startup command", cell(receipt.subject.startup_command)],
      ["Version", cell(receipt.subject.version)],
      ["Resolved identity", cell(receipt.subject.resolved_identity)],
      ["Target path or URL", cell(receipt.subject.target_path_or_url)],
      ["Commit SHA", cell(receipt.subject.commit_sha)],
      ["Package manager", cell(receipt.subject.package_manager)],
    ]),
    "",
    "## Run Context",
    "",
    markdownTable([
      ["Field", "Value"],
      ["Generated at", receipt.run_context.generated_at],
      ["MCP Observatory version", receipt.run_context.mcp_observatory_version],
      ["Profile", receipt.run_context.profile],
      ["Environment", receipt.run_context.environment_class],
      ["Command invoked", cell(receipt.run_context.command_invoked)],
      ["Config file", cell(receipt.run_context.config_file_used)],
      ["Runner OS", cell(receipt.run_context.runner_os)],
      ["Working directory", cell(receipt.run_context.working_directory)],
    ]),
    "",
    `> ${receipt.run_context.safe_mode_statement}`,
    "",
    "## Evidence",
    "",
    markdownTable([
      ["Artifact", "Path", "SHA-256"],
      ["JSON report", cell(receipt.evidence.json_report_path), cell(receipt.evidence.json_report_sha256)],
      ["Markdown report", cell(receipt.evidence.markdown_report_path), cell(receipt.evidence.markdown_report_sha256)],
      ["HTML report", cell(receipt.evidence.html_report_path), cell(receipt.evidence.html_report_sha256)],
      ["SARIF", cell(receipt.evidence.sarif_path), cell(receipt.evidence.sarif_sha256)],
    ]),
    "",
    `- Schema summary: ${receipt.evidence.schema_summary}`,
    `- Tool surface summary: ${receipt.evidence.tool_surface_summary}`,
    `- Attack simulation summary: ${receipt.evidence.attack_simulation_summary}`,
    `- Baseline/drift summary: ${receipt.evidence.baseline_or_drift_summary}`,
    `- Runtime profile summary: ${receipt.evidence.runtime_profile_summary}`,
    "",
    "## What Was Not Tested",
    "",
    ...receipt.notObserved.map((entry) => {
      const icon = entry.severity === "warning" ? "🔒" : "ℹ️";
      return `- ${icon} ${entry.category}: ${entry.detail}`;
    }),
    "",
    "## Top Findings",
    "",
    receipt.findings.length === 0
      ? "No top findings were included in this receipt."
      : markdownTable([
        ["Severity", "Title", "Control", "Blocks CI", "Fingerprint", "Fix"],
        ...receipt.findings.map((finding) => [
          finding.severity,
          cell(finding.title),
          cell(finding.control_area),
          finding.blocks_ci ? "yes" : "no",
          finding.fingerprint,
          cell(finding.recommended_fix),
        ]),
      ]),
    "",
    "## Reproduction",
    "",
    "Rerun this evaluation:",
    "",
    "```bash",
    receipt.reproduction.rerun_command,
    "```",
    "",
    "Add CI:",
    "",
    "```bash",
    receipt.reproduction.ci_command,
    "```",
    "",
    receipt.reproduction.sarif_upload_hint,
    "",
    "Expected artifacts:",
    "",
    ...receipt.reproduction.expected_artifacts.map((artifact) => `- \`${artifact}\``),
    "",
    "## Maintainer Actions",
    "",
    ...receipt.maintainer_cta.map((cta) => `- **${cta.label}:** ${cta.description}`),
    "",
    "## Buyer Actions",
    "",
    ...receipt.buyer_cta.map((cta) => `- **${cta.label}:** ${cta.description}`),
  ];
  return lines.join("\n");
}

export function renderReceipt(receipt: McpReceipt, format: ReceiptFormat): string {
  if (format === "json") return JSON.stringify(receipt, null, 2);
  return renderReceiptMarkdown(receipt);
}

export function receiptFormatFromPath(outputPath: string | undefined, fallback: ReceiptFormat): ReceiptFormat {
  if (!outputPath) return fallback;
  return /\.json$/i.test(outputPath) ? "json" : "markdown";
}

function canonicalReceiptBytes(receipt: McpReceipt): Buffer {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { signature, ...rest } = receipt as McpReceipt & { signature?: string };
  return Buffer.from(JSON.stringify(rest), "utf8");
}

export function signReceipt(receipt: McpReceipt, privateKey: string | Buffer | KeyObject, signer: string): McpReceipt {
  // The signer label is part of the signed bytes, so it must be attached
  // before canonicalization. Only the signature itself is excluded.
  const unsigned = { ...receipt, signer };
  const data = canonicalReceiptBytes(unsigned);
  const sig = sign(null, data, privateKey);
  return { ...unsigned, signature: sig.toString("base64") };
}

export function verifyReceipt(receipt: McpReceipt, publicKey: string | Buffer | KeyObject): boolean {
  if (!receipt.signature) return false;
  const data = canonicalReceiptBytes(receipt);
  return verify(null, data, publicKey, Buffer.from(receipt.signature, "base64"));
}

export function publicKeyFingerprint(publicKey: string | Buffer | KeyObject): string {
  const keyObject = typeof publicKey === "string" || Buffer.isBuffer(publicKey)
    ? createPublicKey(publicKey)
    : publicKey;
  const der = keyObject.export({ type: "spki", format: "der" });
  return createHash("sha256").update(der).digest("hex").slice(0, 32);
}

export function generateReceiptKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    publicKey: publicKey.export({ type: "spki", format: "pem" }),
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }),
  };
}
