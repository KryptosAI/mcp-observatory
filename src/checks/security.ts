import { performance } from "node:perf_hooks";

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { isCapabilityAdvertised, makeCheckResult, type CheckContext, type ObservedCheck } from "./base.js";
import { CREDENTIAL_PATTERNS, SECURITY_RULES, type SecurityFinding, type ToolInfo } from "./security-rules.js";
import type { CheckId, CheckResult, EvidenceSummary, TargetConfig } from "../types.js";

function toolToInfo(tool: Tool): ToolInfo {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: tool.annotations,
  };
}

function checkNoAuthHttp(target: TargetConfig): SecurityFinding | null {
  if (target.adapter !== "http") return null;
  const hasAuth = target.authToken || (target.headers && Object.keys(target.headers).some(
    h => h.toLowerCase() === "authorization" || h.toLowerCase() === "x-api-key",
  ));
  if (!hasAuth) {
    return {
      ruleId: "no-auth-http",
      severity: "medium",
      toolName: "(target)",
      message: `HTTP target "${target.targetId}" has no authentication configured.`,
    };
  }
  return null;
}

function scanResponsesForCredentials(
  checks: CheckResult[],
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const invokeCheck = checks.find(c => c.id === "tools-invoke");
  if (!invokeCheck) return findings;

  for (const evidence of invokeCheck.evidence) {
    if (!evidence.responseSnapshots) continue;
    for (const [toolName, snapshot] of Object.entries(evidence.responseSnapshots)) {
      const text = JSON.stringify(snapshot);
      for (const { name, pattern } of CREDENTIAL_PATTERNS) {
        if (pattern.test(text)) {
          findings.push({
            ruleId: "credential-pattern",
            severity: "high",
            toolName,
            message: `Tool "${toolName}" response may contain ${name}.`,
          });
          break; // one finding per tool is enough
        }
      }
    }
  }
  return findings;
}

function filterSuppressedFindings(findings: SecurityFinding[], target: TargetConfig): SecurityFinding[] {
  const suppressions = new Set(target.securitySuppressions ?? []);
  if (suppressions.size === 0) return findings;
  return findings.filter((finding) => {
    return !(
      suppressions.has(finding.ruleId) ||
      suppressions.has(finding.toolName) ||
      suppressions.has(`${finding.toolName}:${finding.ruleId}`)
    );
  });
}

function structuredFindings(findings: SecurityFinding[]): Array<Record<string, unknown>> | undefined {
  if (findings.length === 0) return undefined;
  return findings.map((finding) => ({ ...finding }));
}

function buildSecurityCheckResult(
  findings: SecurityFinding[],
  checkId: CheckId,
  startedAt: number,
): CheckResult {
  const hasHigh = findings.some(f => f.severity === "high");
  const hasMedium = findings.some(f => f.severity === "medium");
  let status: "pass" | "partial" | "fail";
  if (hasHigh) {
    status = "fail";
  } else if (hasMedium) {
    status = "partial";
  } else {
    status = "pass";
  }

  const diagnostics = findings.map(f => `[${f.severity}] ${f.message}`);
  const toolNames = [...new Set(findings.map(f => f.toolName))];

  const endpoint = checkId === "security-lite" ? "security/scan-lite" : "security/scan";
  const message = findings.length === 0
    ? (checkId === "security-lite"
        ? "No security issues detected (lightweight scan)."
        : "No security issues detected.")
    : `Found ${findings.length} security finding(s): ${findings.filter(f => f.severity === "high").length} high, ${findings.filter(f => f.severity === "medium").length} medium, ${findings.filter(f => f.severity === "low").length} low.`;

  const evidence: EvidenceSummary = {
    endpoint,
    advertised: true,
    responded: true,
    minimalShapePresent: true,
    itemCount: findings.length,
    identifiers: toolNames.length > 0 ? toolNames : undefined,
    diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    findings: structuredFindings(findings),
  };

  return makeCheckResult(
    checkId,
    status,
    performance.now() - startedAt,
    message,
    [evidence],
  );
}

export function runLightweightSecurityCheck(
  tools: Tool[],
  target: TargetConfig,
): ObservedCheck {
  const startedAt = performance.now();
  const findings: SecurityFinding[] = [];

  const authFinding = checkNoAuthHttp(target);
  if (authFinding) findings.push(authFinding);

  const toolInfos = tools.map(toolToInfo);
  for (const tool of toolInfos) {
    for (const rule of SECURITY_RULES) {
      const finding = rule.match(tool);
      if (finding) findings.push(finding);
    }
  }

  const activeFindings = filterSuppressedFindings(findings, target);
  return { result: buildSecurityCheckResult(activeFindings, "security-lite", startedAt) };
}

export async function runSecurityCheck(
  context: CheckContext,
  previousChecks: CheckResult[],
): Promise<ObservedCheck> {
  const startedAt = performance.now();
  const findings: SecurityFinding[] = [];

  const authFinding = checkNoAuthHttp(context.target);
  if (authFinding) findings.push(authFinding);

  const advertised = isCapabilityAdvertised(context.serverCapabilities, "tools");
  if (advertised) {
    try {
      const resp = await context.client.listTools(undefined, { timeout: context.timeoutMs });
      const tools = resp.tools.map(toolToInfo);

      for (const tool of tools) {
        for (const rule of SECURITY_RULES) {
          const finding = rule.match(tool);
          if (finding) findings.push(finding);
        }
      }
    } catch {
      // If we can't list tools, skip tool-level rules (other checks already report this)
    }
  }

  const credentialFindings = scanResponsesForCredentials(previousChecks);
  findings.push(...credentialFindings);

  const activeFindings = filterSuppressedFindings(findings, context.target);
  return { result: buildSecurityCheckResult(activeFindings, "security", startedAt) };
}
