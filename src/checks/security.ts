import { performance } from "node:perf_hooks";

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { isCapabilityAdvertised, makeCheckResult, type CheckContext, type ObservedCheck } from "./base.js";
import { CREDENTIAL_PATTERNS, SECURITY_RULES, type SecurityFinding, type ToolInfo } from "./security-rules.js";
import type { CheckResult, EvidenceSummary, TargetConfig } from "../types.js";

function toolToInfo(tool: Tool): ToolInfo {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema as Record<string, unknown> | undefined,
    annotations: tool.annotations as Record<string, unknown> | undefined,
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

export function runLightweightSecurityCheck(
  tools: Tool[],
  target: TargetConfig,
): ObservedCheck {
  const startedAt = performance.now();
  const findings: SecurityFinding[] = [];

  // Rule: no-auth-http (target-level)
  const authFinding = checkNoAuthHttp(target);
  if (authFinding) findings.push(authFinding);

  // Tool-level rules against already-fetched tools
  const toolInfos = tools.map(toolToInfo);
  for (const tool of toolInfos) {
    for (const rule of SECURITY_RULES) {
      const finding = rule.match(tool);
      if (finding) findings.push(finding);
    }
  }

  const activeFindings = filterSuppressedFindings(findings, target);

  // Determine status based on highest severity
  const hasHigh = activeFindings.some(f => f.severity === "high");
  const hasMedium = activeFindings.some(f => f.severity === "medium");
  let status: "pass" | "partial" | "fail";
  if (hasHigh) {
    status = "fail";
  } else if (hasMedium) {
    status = "partial";
  } else {
    status = "pass";
  }

  const diagnostics = activeFindings.map(f => `[${f.severity}] ${f.message}`);
  const toolNames = [...new Set(activeFindings.map(f => f.toolName))];

  const message = activeFindings.length === 0
    ? "No security issues detected (lightweight scan)."
    : `Found ${activeFindings.length} security finding(s): ${activeFindings.filter(f => f.severity === "high").length} high, ${activeFindings.filter(f => f.severity === "medium").length} medium, ${activeFindings.filter(f => f.severity === "low").length} low.`;

  const evidence: EvidenceSummary = {
    endpoint: "security/scan-lite",
    advertised: true,
    responded: true,
    minimalShapePresent: true,
    itemCount: activeFindings.length,
    identifiers: toolNames.length > 0 ? toolNames : undefined,
    diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    findings: structuredFindings(activeFindings),
  };

  return {
    result: makeCheckResult(
      "security-lite",
      status,
      performance.now() - startedAt,
      message,
      [evidence],
    ),
  };
}

export async function runSecurityCheck(
  context: CheckContext,
  previousChecks: CheckResult[],
): Promise<ObservedCheck> {
  const startedAt = performance.now();
  const findings: SecurityFinding[] = [];

  // Rule: no-auth-http (target-level, doesn't need tools)
  const authFinding = checkNoAuthHttp(context.target);
  if (authFinding) findings.push(authFinding);

  // Tool-level rules
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

  // Credential scanning in response snapshots (from tools-invoke check)
  const credentialFindings = scanResponsesForCredentials(previousChecks);
  findings.push(...credentialFindings);

  const activeFindings = filterSuppressedFindings(findings, context.target);

  // Determine status based on highest severity
  const hasHigh = activeFindings.some(f => f.severity === "high");
  const hasMedium = activeFindings.some(f => f.severity === "medium");
  let status: "pass" | "partial" | "fail";
  if (hasHigh) {
    status = "fail";
  } else if (hasMedium) {
    status = "partial";
  } else {
    status = "pass";
  }

  const diagnostics = activeFindings.map(f => `[${f.severity}] ${f.message}`);
  const toolNames = [...new Set(activeFindings.map(f => f.toolName))];

  const message = activeFindings.length === 0
    ? "No security issues detected."
    : `Found ${activeFindings.length} security finding(s): ${activeFindings.filter(f => f.severity === "high").length} high, ${activeFindings.filter(f => f.severity === "medium").length} medium, ${activeFindings.filter(f => f.severity === "low").length} low.`;

  const evidence: EvidenceSummary = {
    endpoint: "security/scan",
    advertised: true,
    responded: true,
    minimalShapePresent: true,
    itemCount: activeFindings.length,
    identifiers: toolNames.length > 0 ? toolNames : undefined,
    diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    findings: structuredFindings(activeFindings),
  };

  return {
    result: makeCheckResult(
      "security",
      status,
      performance.now() - startedAt,
      message,
      [evidence],
    ),
  };
}
