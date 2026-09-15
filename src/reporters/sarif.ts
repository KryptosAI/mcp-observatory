import { extractObservatoryFindings, type ObservatoryFinding } from "../findings.js";
import { taxonomyForFinding, taxonomyTags } from "../risk-taxonomy.js";
import type { RunArtifact } from "../types.js";
import { TOOL_VERSION } from "../version.js";

interface SarifResult {
  ruleId: string;
  level: "error" | "warning" | "note";
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region: { startLine: number };
    };
  }>;
  partialFingerprints: Record<string, string>;
  properties: Record<string, unknown>;
}

interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  defaultConfiguration: { level: "error" | "warning" | "note" };
  help?: { text: string };
  helpUri?: string;
  properties: Record<string, unknown>;
}

export interface RenderSarifOptions {
  artifactUri?: string;
}

function levelFromSeverity(severity: ObservatoryFinding["severity"]): "error" | "warning" | "note" {
  if (severity === "high") return "error";
  if (severity === "medium") return "warning";
  return "note";
}

function defaultArtifactUri(artifact: RunArtifact): string {
  return `.mcp-observatory/runs/${artifact.runId}.json`;
}

function ruleTitle(finding: ObservatoryFinding): string {
  return finding.title.length > 0 ? finding.title : finding.ruleId;
}

function helpText(finding: ObservatoryFinding): string | undefined {
  const parts = [
    finding.recommendation,
    finding.recommendedAction ? `Recommended action: ${finding.recommendedAction}.` : undefined,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join("\n\n") : undefined;
}

export function renderSarif(artifact: RunArtifact, options: RenderSarifOptions = {}): string {
  const rules: SarifRule[] = [];
  const results: SarifResult[] = [];
  const seenRules = new Set<string>();
  const findings = extractObservatoryFindings(artifact);
  const artifactUri = options.artifactUri ?? defaultArtifactUri(artifact);

  for (const finding of findings) {
    const taxonomy = taxonomyForFinding(finding);
    const tags = ["mcp", "mcp-observatory", finding.category, ...finding.controlRefs, ...taxonomyTags(taxonomy)];
    if (!seenRules.has(finding.ruleId)) {
      seenRules.add(finding.ruleId);
      const ruleHelp = helpText(finding);
      rules.push({
        id: finding.ruleId,
        name: ruleTitle(finding),
        shortDescription: { text: ruleTitle(finding) },
        defaultConfiguration: { level: levelFromSeverity(finding.severity) },
        help: ruleHelp ? { text: ruleHelp } : undefined,
        helpUri: `https://github.com/KryptosAI/mcp-observatory/tree/main/docs`,
        properties: {
          category: finding.category,
          checkId: finding.checkId,
          recommendedAction: finding.recommendedAction,
          controlRefs: finding.controlRefs,
          riskTaxonomy: taxonomy,
          tags,
        },
      });
    }

    results.push({
      ruleId: finding.ruleId,
      level: levelFromSeverity(finding.severity),
      message: { text: finding.message },
      locations: [{
        physicalLocation: {
          artifactLocation: { uri: artifactUri },
          region: { startLine: 1 },
        },
      }],
      partialFingerprints: {
        "mcp-observatory/finding-id": finding.id,
      },
      properties: {
        id: finding.id,
        category: finding.category,
        checkId: finding.checkId,
        targetId: artifact.target.targetId,
        subject: finding.subject,
        severity: finding.severity,
        recommendedAction: finding.recommendedAction,
        controlRefs: finding.controlRefs,
        riskTaxonomy: taxonomy,
        tags,
      },
    });
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
        automationDetails: {
          id: `mcp-observatory/${artifact.target.targetId}`,
        },
        results,
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}
