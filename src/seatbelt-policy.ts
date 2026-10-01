import { extractObservatoryFindings, type ObservatoryFinding } from "./findings.js";
import type { RunArtifact } from "./types.js";

interface SeatbeltRule {
  id: string;
  description: string;
  target: "command" | "file" | "network" | "env" | "process";
  match: "exact" | "pattern" | "contains";
  values: string[];
  action: "allow" | "deny" | "warn" | "redact";
}

export interface SeatbeltPolicyFile {
  version: string;
  mode: "enforce" | "audit";
  defaultAction: "allow" | "deny";
  allowSampling: boolean;
  allowlist: { tools: string[]; paths: string[]; hosts: string[]; envVars: string[] };
  rules: SeatbeltRule[];
}

const BASELINE_RULES: SeatbeltRule[] = [
  {
    id: "block-shell-execution",
    description: "Block tools that invoke shell interpreters directly",
    target: "command",
    match: "pattern",
    values: ["^bash$", "^sh$", "^zsh$", "^cmd$", "^powershell$", "^pwsh$"],
    action: "deny",
  },
  {
    id: "block-sensitive-paths",
    description: "Block filesystem writes to sensitive paths",
    target: "file",
    match: "pattern",
    values: ["^/etc(/|$)", "^/root(/|$)", "^~/.ssh(/|$)", "^~/.aws(/|$)"],
    action: "deny",
  },
];

function yamlScalar(value: string): string {
  if (/^[A-Za-z0-9_./@:=+-]+$/.test(value)) return value;
  return JSON.stringify(value);
}

function findingAction(finding: ObservatoryFinding): "deny" | "warn" | "redact" | null {
  if (finding.severity === "high" || finding.severity === "medium") return "deny";
  if (finding.severity === "low") return "warn";
  return null;
}

function findingToRule(finding: ObservatoryFinding): SeatbeltRule | null {
  const action = findingAction(finding);
  if (!action) return null;
  const tool = finding.subject.type === "tool" ? finding.subject.name : undefined;
  const id = finding.ruleId.replace(/^mcp-observatory\//, "").replaceAll("/", "-").replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "observatory-finding";
  const description = finding.recommendation || finding.message || finding.title || finding.ruleId;
  if (tool) {
    return {
      id,
      description,
      target: "command",
      match: "exact",
      values: [tool],
      action,
    };
  }
  return {
    id,
    description,
    target: "command",
    match: "contains",
    values: [finding.title || finding.ruleId],
    action,
  };
}

export function buildSeatbeltPolicy(artifact: RunArtifact): SeatbeltPolicyFile {
  const tools = artifact.checks.find((check) => check.id === "tools")?.evidence.flatMap((entry) => entry.identifiers ?? []) ?? [];
  const deniedTools = new Set(
    extractObservatoryFindings(artifact)
      .filter((finding) => finding.subject.type === "tool" && finding.subject.name && (finding.severity === "high" || finding.severity === "medium"))
      .map((finding) => finding.subject.name as string),
  );
  const allowTools = tools.filter((name) => !deniedTools.has(name));
  const derived = extractObservatoryFindings(artifact).map(findingToRule).filter((rule): rule is SeatbeltRule => rule !== null);
  const seen = new Set<string>();
  const rules: SeatbeltRule[] = [];
  for (const rule of [...BASELINE_RULES, ...derived]) {
    if (seen.has(rule.id)) continue;
    seen.add(rule.id);
    rules.push(rule);
  }
  return {
    version: "1",
    mode: "enforce",
    defaultAction: "deny",
    allowSampling: true,
    allowlist: { tools: allowTools, paths: [], hosts: [], envVars: [] },
    rules,
  };
}

export function renderSeatbeltPolicy(policy: SeatbeltPolicyFile): string {
  const lines = [
    `version: ${JSON.stringify(policy.version)}`,
    `mode: ${policy.mode}`,
    `defaultAction: ${policy.defaultAction}`,
    `allowSampling: ${policy.allowSampling}`,
    "allowlist:",
    ...(policy.allowlist.tools.length
      ? ["  tools:", ...policy.allowlist.tools.map((tool) => `    - ${yamlScalar(tool)}`)]
      : ["  tools: []"]),
    "  paths: []",
    "  hosts: []",
    "  envVars: []",
    "rules:",
  ];
  for (const rule of policy.rules) {
    lines.push(`  - id: ${yamlScalar(rule.id)}`);
    lines.push(`    description: ${yamlScalar(rule.description)}`);
    lines.push(`    target: ${rule.target}`);
    lines.push(`    match: ${rule.match}`);
    lines.push("    values:");
    for (const value of rule.values) lines.push(`      - ${yamlScalar(value)}`);
    lines.push(`    action: ${rule.action}`);
  }
  return `${lines.join("\n")}\n`;
}
