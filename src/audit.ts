import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { extractObservatoryFindings, type ObservatoryFinding } from "./findings.js";
import { taxonomyForFinding, taxonomyForRule, taxonomyTags, type RiskTaxonomy } from "./risk-taxonomy.js";
import { runTarget } from "./runner.js";
import { loadSecurityProfile, type SecurityControlArea, type SecurityProfile } from "./security-profiles.js";
import type { RunArtifact, TargetConfig } from "./types.js";
import { validateTargetConfig } from "./validate.js";

export type AuditSeverity = "info" | "low" | "medium" | "high" | "critical";
export type TrustStatus = "enterprise_ready" | "scanned" | "needs_review" | "high_risk" | "critical_risk";

export interface NormalizedSecurityFinding {
  id: string;
  check_id: string;
  rule_id: string;
  title: string;
  description: string;
  severity: AuditSeverity;
  category: string;
  target: {
    target_id: string;
    subject_type: string;
    subject_name?: string;
  };
  evidence: Record<string, unknown>;
  recommendation: string;
  confidence: "low" | "medium" | "high";
  fingerprint: string;
  control_mappings: SecurityControlArea[];
  risk_taxonomy?: RiskTaxonomy;
  generated_at: string;
}

export interface AuditSummary {
  profile: string;
  generated_at: string;
  target_id: string;
  score: number;
  trust_status: TrustStatus;
  finding_count: number;
  pass_count: number;
  warning_count: number;
  fail_count: number;
  severity_counts: Record<AuditSeverity, number>;
  control_counts: Record<SecurityControlArea, number>;
}

export interface AuditReport {
  report_type: "mcp-observatory-audit";
  schema_version: "1.0.0";
  profile: Pick<SecurityProfile, "id" | "title" | "description" | "disclaimer" | "controlAreas">;
  artifact: RunArtifact;
  summary: AuditSummary;
  findings: NormalizedSecurityFinding[];
}

export interface AuditScore {
  target_id: string;
  profile: string;
  score: number;
  status: TrustStatus;
  finding_count: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  generated_at: string;
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24);
}

function severityFromObservatory(finding: ObservatoryFinding): AuditSeverity {
  if (finding.category === "security" && finding.ruleId.includes("credential-pattern")) return "critical";
  if (finding.category === "attack-sim" && finding.ruleId.includes("credential-like-output")) return "critical";
  if (finding.category === "attack-sim" && finding.ruleId.includes("canary-exposed")) return "critical";
  return finding.severity;
}

function controlsForFinding(profile: SecurityProfile, finding: ObservatoryFinding): SecurityControlArea[] {
  const direct = profile.ruleControls[finding.ruleId];
  if (direct) return direct;
  const fromCategory = profile.categoryControls[finding.category] ?? profile.categoryControls[finding.checkId];
  return fromCategory ?? ["trust_boundaries"];
}

function normalizeFinding(
  profile: SecurityProfile,
  artifact: RunArtifact,
  finding: ObservatoryFinding,
  generatedAt: string,
): NormalizedSecurityFinding {
  const severity = severityFromObservatory(finding);
  const controlMappings = controlsForFinding(profile, finding);
  const riskTaxonomy = taxonomyForFinding(finding);
  const fingerprint = stableHash({
    target: artifact.target.targetId,
    rule: finding.ruleId,
    subject: finding.subject,
    description: finding.message,
  });
  return {
    id: finding.id,
    check_id: finding.checkId,
    rule_id: finding.ruleId,
    title: finding.title,
    description: finding.message,
    severity,
    category: finding.category,
    target: {
      target_id: artifact.target.targetId,
      subject_type: finding.subject.type,
      subject_name: finding.subject.name,
    },
    evidence: finding.evidence ?? {},
    recommendation: finding.recommendation ?? "Review this MCP release-gate finding before production deployment.",
    confidence: severity === "info" ? "medium" : "high",
    fingerprint,
    control_mappings: controlMappings,
    risk_taxonomy: riskTaxonomy,
    generated_at: generatedAt,
  };
}

function envSecretFindings(profile: SecurityProfile, target: TargetConfig, generatedAt: string): NormalizedSecurityFinding[] {
  if (target.adapter !== "local-process" || !target.env) return [];
  const secretLikeNames = Object.keys(target.env).filter((name) => /(?:secret|token|password|passwd|api[_-]?key|credential)/i.test(name));
  return secretLikeNames.map((name) => {
    const fingerprint = stableHash({ target: target.targetId, env: name, rule: "env-secret" });
    return {
      id: `mcp-observatory/audit/env-secret/${fingerprint}`,
      check_id: "security",
      rule_id: "mcp-observatory/audit/env-secret",
      title: "Secret-like environment variable configured",
      description: `Target environment contains secret-like variable "${name}".`,
      severity: "critical",
      category: "secrets_exposure",
      target: { target_id: target.targetId, subject_type: "target", subject_name: target.targetId },
      evidence: { env_var: name, value_redacted: true },
      recommendation: "Use a secret manager or CI secret store and verify the MCP server never returns this value in tool responses or logs.",
      confidence: "high",
      fingerprint,
      control_mappings: profile.ruleControls["mcp-observatory/security/credential-pattern"] ?? ["secrets_exposure", "auditability"],
      risk_taxonomy: taxonomyForRule("mcp-observatory/audit/env-secret", "secrets_exposure"),
      generated_at: generatedAt,
    };
  });
}

function auditabilityFindings(profile: SecurityProfile, artifact: RunArtifact, generatedAt: string): NormalizedSecurityFinding[] {
  const hasAuditHint = Object.values(artifact.target.metadata ?? {}).some((value) => /audit|log|event|trace/i.test(value));
  if (hasAuditHint) return [];
  const fingerprint = stableHash({ target: artifact.target.targetId, rule: "auditability-not-declared" });
  return [{
    id: `mcp-observatory/audit/auditability/${fingerprint}`,
    check_id: "conformance",
    rule_id: "mcp-observatory/audit/auditability-not-declared",
    title: "Audit logging not declared",
    description: "The target did not declare structured audit logging, event output, or traceability metadata for tool calls.",
    severity: "medium",
    category: "auditability",
    target: { target_id: artifact.target.targetId, subject_type: "target", subject_name: artifact.target.targetId },
    evidence: { metadata_keys: Object.keys(artifact.target.metadata ?? {}) },
    recommendation: "Document how tool calls, permission decisions, failures, and sensitive data handling are logged for security review.",
    confidence: "medium",
    fingerprint,
    control_mappings: profile.categoryControls["tools-invoke"] ?? ["auditability"],
    generated_at: generatedAt,
  }];
}

function computeTrustStatus(findings: NormalizedSecurityFinding[]): TrustStatus {
  if (findings.some((finding) => finding.severity === "critical")) return "critical_risk";
  if (findings.some((finding) => finding.severity === "high")) return "high_risk";
  if (findings.some((finding) => finding.severity === "medium")) return "needs_review";
  if (findings.length === 0 || findings.every((finding) => finding.severity === "info")) return "enterprise_ready";
  return "scanned";
}

function computeScore(findings: NormalizedSecurityFinding[]): number {
  const penalty = findings.reduce((sum, finding) => {
    if (finding.severity === "critical") return sum + 35;
    if (finding.severity === "high") return sum + 22;
    if (finding.severity === "medium") return sum + 10;
    if (finding.severity === "low") return sum + 3;
    return sum + 0;
  }, 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

function countSeverities(findings: NormalizedSecurityFinding[]): Record<AuditSeverity, number> {
  return {
    critical: findings.filter((finding) => finding.severity === "critical").length,
    high: findings.filter((finding) => finding.severity === "high").length,
    medium: findings.filter((finding) => finding.severity === "medium").length,
    low: findings.filter((finding) => finding.severity === "low").length,
    info: findings.filter((finding) => finding.severity === "info").length,
  };
}

function countControls(profile: SecurityProfile, findings: NormalizedSecurityFinding[]): Record<SecurityControlArea, number> {
  const counts = Object.fromEntries(profile.controlAreas.map((control) => [control, 0])) as Record<SecurityControlArea, number>;
  for (const finding of findings) {
    for (const control of finding.control_mappings) counts[control] += 1;
  }
  return counts;
}

export function buildAuditReport(artifact: RunArtifact, target: TargetConfig, profileId = "nsa-mcp"): AuditReport {
  const profile = loadSecurityProfile(profileId);
  const generatedAt = new Date().toISOString();
  const normalized = extractObservatoryFindings(artifact)
    .map((finding) => normalizeFinding(profile, artifact, finding, generatedAt));
  const rawFindings = [
    ...normalized,
    ...envSecretFindings(profile, target, generatedAt),
    ...auditabilityFindings(profile, artifact, generatedAt),
  ];
  const findings = [...new Map(rawFindings.map((finding) => [finding.fingerprint, finding])).values()];
  const severityCounts = countSeverities(findings);
  const score = computeScore(findings);
  const trustStatus = computeTrustStatus(findings);
  const summary: AuditSummary = {
    profile: profile.id,
    generated_at: generatedAt,
    target_id: artifact.target.targetId,
    score,
    trust_status: trustStatus,
    finding_count: findings.length,
    pass_count: artifact.checks.filter((check) => check.status === "pass").length,
    warning_count: severityCounts.medium + severityCounts.low,
    fail_count: severityCounts.critical + severityCounts.high,
    severity_counts: severityCounts,
    control_counts: countControls(profile, findings),
  };
  return {
    report_type: "mcp-observatory-audit",
    schema_version: "1.0.0",
    profile: {
      id: profile.id,
      title: profile.title,
      description: profile.description,
      disclaimer: profile.disclaimer,
      controlAreas: profile.controlAreas,
    },
    artifact,
    summary,
    findings,
  };
}

export async function runAudit(target: TargetConfig, profileId = "nsa-mcp"): Promise<AuditReport> {
  const artifact = await runTarget(target, { invokeTools: true, securityCheck: true, attackSimulation: {} });
  return buildAuditReport(artifact, target, profileId);
}

export function auditScore(report: AuditReport): AuditScore {
  return {
    target_id: report.summary.target_id,
    profile: report.summary.profile,
    score: report.summary.score,
    status: report.summary.trust_status,
    finding_count: report.summary.finding_count,
    critical: report.summary.severity_counts.critical,
    high: report.summary.severity_counts.high,
    medium: report.summary.severity_counts.medium,
    low: report.summary.severity_counts.low,
    info: report.summary.severity_counts.info,
    generated_at: report.summary.generated_at,
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

function escapeCell(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return text.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function formatTaxonomy(taxonomy: RiskTaxonomy): string {
  return [
    ...taxonomy.cwe,
    ...taxonomy.owasp,
    ...taxonomy.mitreAttack,
    taxonomy.cvssVector,
  ].filter((entry) => entry.length > 0).join("; ");
}

export function renderAuditMarkdown(report: AuditReport): string {
  const grouped = new Map<SecurityControlArea, NormalizedSecurityFinding[]>();
  for (const control of report.profile.controlAreas) grouped.set(control, []);
  for (const finding of report.findings) {
    for (const control of finding.control_mappings) {
      grouped.get(control)?.push(finding);
    }
  }

  const lines = [
    "# MCP Observatory Security Audit",
    "",
    `**Target:** \`${report.summary.target_id}\``,
    `**Profile:** \`${report.profile.id}\` - ${report.profile.title}`,
    `**Generated:** ${report.summary.generated_at}`,
    "",
    "## Executive Summary",
    "",
    `MCP Observatory evaluated this server as a security release gate before deployment into sensitive, regulated, or mission-critical agentic AI environments.`,
    "",
    `**Overall risk score:** ${report.summary.score}/100`,
    `**Trust status:** \`${report.summary.trust_status}\``,
    `**Findings:** ${report.summary.finding_count} total (${report.summary.severity_counts.critical} critical, ${report.summary.severity_counts.high} high, ${report.summary.severity_counts.medium} medium, ${report.summary.severity_counts.low} low, ${report.summary.severity_counts.info} info)`,
    `**Checks:** ${report.summary.pass_count} pass, ${report.summary.warning_count} warning, ${report.summary.fail_count} fail`,
    "",
    `> ${report.profile.disclaimer}`,
    "",
    "## Control Summary",
    "",
    markdownTable([
      ["Control Area", "Findings"],
      ...report.profile.controlAreas.map((control) => [control, String(report.summary.control_counts[control] ?? 0)]),
    ]),
    "",
    "## Findings By Control Area",
  ];

  for (const [control, findings] of grouped) {
    if (findings.length === 0) continue;
    lines.push("", `### ${control}`, "");
    for (const finding of findings) {
      lines.push(
        `#### [${finding.severity}] ${finding.title}`,
        "",
        finding.description,
        "",
        `- Rule: \`${finding.rule_id}\``,
        `- Check: \`${finding.check_id}\``,
        `- Target: \`${finding.target.subject_name ?? finding.target.target_id}\``,
        `- Confidence: \`${finding.confidence}\``,
        `- Fingerprint: \`${finding.fingerprint}\``,
        ...(finding.risk_taxonomy ? [`- Taxonomy: ${formatTaxonomy(finding.risk_taxonomy)}`] : []),
        `- Evidence: \`${escapeCell(JSON.stringify(finding.evidence))}\``,
        `- Recommendation: ${finding.recommendation}`,
        "",
      );
    }
  }

  lines.push(
    "## GitHub Code Scanning",
    "",
    "Run the same audit with `--format sarif` and upload the result with GitHub Code Scanning. Each normalized finding is emitted as one SARIF result with control mapping tags.",
  );
  return lines.join("\n");
}

function sarifLevel(severity: AuditSeverity): "error" | "warning" | "note" {
  if (severity === "critical" || severity === "high") return "error";
  if (severity === "medium") return "warning";
  return "note";
}

export function renderAuditSarif(report: AuditReport, artifactUri = "mcp-observatory-audit.json"): string {
  const seenRules = new Set<string>();
  const rules = [];
  const results = [];
  for (const finding of report.findings) {
    const tags = ["mcp", "mcp-observatory", report.profile.id, ...finding.control_mappings, ...taxonomyTags(finding.risk_taxonomy)];
    if (!seenRules.has(finding.rule_id)) {
      seenRules.add(finding.rule_id);
      rules.push({
        id: finding.rule_id,
        name: finding.title,
        shortDescription: { text: finding.title },
        fullDescription: { text: finding.description },
        defaultConfiguration: { level: sarifLevel(finding.severity) },
        help: { text: `${finding.recommendation}\n\nTrust status: ${report.summary.trust_status}. Controls: ${finding.control_mappings.join(", ")}.` },
        properties: {
          tags,
          control_mappings: finding.control_mappings,
          risk_taxonomy: finding.risk_taxonomy,
          confidence: finding.confidence,
        },
      });
    }
    results.push({
      ruleId: finding.rule_id,
      level: sarifLevel(finding.severity),
      message: { text: finding.description },
      locations: [{
        physicalLocation: {
          artifactLocation: { uri: artifactUri },
          region: { startLine: 1 },
        },
      }],
      partialFingerprints: {
        "mcp-observatory/fingerprint": finding.fingerprint,
      },
      properties: {
        id: finding.id,
        check_id: finding.check_id,
        severity: finding.severity,
        category: finding.category,
        target: finding.target,
        control_mappings: finding.control_mappings,
        risk_taxonomy: finding.risk_taxonomy,
        confidence: finding.confidence,
        tags,
      },
    });
  }
  return JSON.stringify({
    $schema: "https://docs.oasis-open.org/sarif/sarif/v2.1.0/errata01/os/schemas/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [{
      tool: {
        driver: {
          name: "mcp-observatory",
          informationUri: "https://github.com/KryptosAI/mcp-observatory",
          rules,
        },
      },
      automationDetails: { id: `mcp-observatory/audit/${report.summary.target_id}` },
      results,
    }],
  }, null, 2);
}

export async function resolveAuditTarget(input: string[]): Promise<TargetConfig> {
  if (input.length === 0) throw new Error("Provide a target path or command.");
  const first = input[0]!;
  const resolved = path.resolve(first);
  if (input.length === 1 && existsSync(resolved)) {
    const statPath = resolved;
    const targetPath = path.join(statPath, "mcp-observatory.target.json");
    const filePath = statPath.endsWith(".json") ? statPath : targetPath;
    const target = validateTargetConfig(JSON.parse(await readFile(filePath, "utf8")));
    if (target.adapter === "local-process" && !target.cwd && !statPath.endsWith(".json")) {
      return { ...target, cwd: statPath };
    }
    return target;
  }
  return {
    targetId: input[0]!,
    adapter: "local-process",
    command: input[0]!,
    args: input.slice(1),
    timeoutMs: 15_000,
  };
}
