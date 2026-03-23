import type { RunArtifact } from "./types.js";

function getToolCount(artifact: RunArtifact): number {
  return artifact.checks.find(c => c.id === "tools")?.evidence[0]?.itemCount ?? 0;
}

function getPromptCount(artifact: RunArtifact): number {
  return artifact.checks.find(c => c.id === "prompts")?.evidence[0]?.itemCount ?? 0;
}

function countSecurityFindings(artifact: RunArtifact): number {
  let count = 0;
  for (const check of artifact.checks) {
    if (check.id !== "security" && check.id !== "security-lite") continue;
    for (const ev of check.evidence) {
      if (!ev.diagnostics) continue;
      for (const d of ev.diagnostics) {
        if (/\[(high|medium)\]/i.test(d)) count++;
      }
    }
  }
  return count;
}

function countFailingChecks(artifact: RunArtifact): number {
  let count = 0;
  for (const check of artifact.checks) {
    if (check.id === "security" || check.id === "security-lite") continue;
    if (check.status === "fail") count++;
  }
  return count;
}

function countTotalIssues(artifact: RunArtifact): number {
  return countSecurityFindings(artifact) + countFailingChecks(artifact);
}

export function buildStatusDescription(
  artifacts: RunArtifact[],
): { state: "success" | "failure"; description: string } {
  const allPass = artifacts.every(a => a.gate === "pass");

  if (allPass) {
    if (artifacts.length === 1) {
      const a = artifacts[0]!;
      const tools = getToolCount(a);
      const prompts = getPromptCount(a);
      return {
        state: "success",
        description: `All clear (${tools} tools, ${prompts} prompts)`,
      };
    }
    const totalTools = artifacts.reduce((sum, a) => sum + getToolCount(a), 0);
    return {
      state: "success",
      description: `All clear (${artifacts.length} servers, ${totalTools} tools)`,
    };
  }

  // At least one failure
  if (artifacts.length === 1) {
    const a = artifacts[0]!;
    const securityIssues = countSecurityFindings(a);
    const failingChecks = countFailingChecks(a);
    if (securityIssues > 0) {
      return { state: "failure", description: `${securityIssues} security issues` };
    }
    if (failingChecks > 0) {
      return { state: "failure", description: `${failingChecks} failing checks` };
    }
    return { state: "failure", description: "Issues detected" };
  }

  // Multiple artifacts, at least one failing
  const failingServers = artifacts.filter(a => a.gate === "fail");
  const totalIssues = failingServers.reduce((sum, a) => sum + countTotalIssues(a), 0);
  const issueCount = totalIssues > 0 ? totalIssues : failingServers.length;
  return {
    state: "failure",
    description: `${issueCount} issues across ${failingServers.length} servers`,
  };
}

export function buildCommitStatusContext(): string {
  return "MCP Observatory";
}
