import type { RunArtifact } from "../types.js";
import { TOOL_VERSION } from "../version.js";

interface SarifResult {
  ruleId: string;
  level: "error" | "warning" | "note";
  message: { text: string };
}

interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  defaultConfiguration: { level: "error" | "warning" | "note" };
}

function levelFromStatus(status: string): "error" | "warning" | "note" {
  switch (status) {
    case "fail": return "error";
    case "partial":
    case "flaky": return "warning";
    default: return "note";
  }
}

export function renderSarif(artifact: RunArtifact): string {
  const rules: SarifRule[] = [];
  const results: SarifResult[] = [];
  const seenRules = new Set<string>();

  for (const check of artifact.checks) {
    const ruleId = `mcp-observatory/${check.id}`;

    if (!seenRules.has(ruleId)) {
      seenRules.add(ruleId);
      rules.push({
        id: ruleId,
        name: check.id,
        shortDescription: { text: `MCP ${check.id} check` },
        defaultConfiguration: { level: levelFromStatus(check.status) },
      });
    }

    // For security checks, create individual results per finding
    if (check.id === "security" && check.evidence[0]?.diagnostics) {
      for (const diagnostic of check.evidence[0].diagnostics) {
        const severityMatch = diagnostic.match(/^\[(high|medium|low)\]/);
        const level = severityMatch?.[1] === "high" ? "error" as const
          : severityMatch?.[1] === "medium" ? "warning" as const
          : "note" as const;
        results.push({
          ruleId,
          level,
          message: { text: diagnostic.replace(/^\[(high|medium|low)\]\s*/, "") },
        });
      }
    } else if (check.status !== "pass" && check.status !== "skipped" && check.status !== "unsupported") {
      results.push({
        ruleId,
        level: levelFromStatus(check.status),
        message: { text: check.message },
      });
    }
  }

  const sarif = {
    $schema: "https://docs.oasis-open.org/sarif/sarif/v2.1.0/errata01/os/schemas/sarif-schema-2.1.0.json",
    version: "2.1.0" as const,
    runs: [
      {
        tool: {
          driver: {
            name: "mcp-observatory",
            version: TOOL_VERSION,
            informationUri: "https://github.com/KryptosAI/mcp-observatory",
            rules,
          },
        },
        results,
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}
