#!/usr/bin/env npx tsx

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface SafetyIndexTarget {
  id: string;
  name: string;
  repo?: string;
  packageName?: string;
  riskClass?: string;
  failureClass?: string;
  whyItMatters?: string;
}

export interface PublicSignalLead {
  id: string;
  name: string;
  packageName: string | null;
  repo: string;
  handle: string;
  riskClass: string;
  why: string;
  offer: "enforce" | "individual";
  score: number;
  draft?: string;
}

const WEIGHTS: Array<[RegExp, number]> = [
  [/shell|command execution|command and cluster/i, 100],
  [/kubernetes|container orchestration|infrastructure control|infrastructure-as-code/i, 95],
  [/filesystem/i, 90],
  [/browser|code execution/i, 85],
  [/cloud platform|cloud resource|cloud file/i, 80],
  [/database mutation|repository mutation|ci pipeline|ci control/i, 75],
  [/payment|trading|health information|electronic health/i, 70],
];

export function scoreRisk(target: SafetyIndexTarget): number {
  const text = [target.riskClass, target.failureClass, target.whyItMatters].filter(Boolean).join(" ");
  let score = 0;
  for (const [pattern, weight] of WEIGHTS) {
    if (pattern.test(text)) score = Math.max(score, weight);
  }
  return score;
}

export function handleFromRepo(repo: string | undefined): { owner: string; repo: string } | null {
  const match = typeof repo === "string" ? repo.match(/github\.com\/([^/]+)\/([^/#?]+)/i) : null;
  if (!match?.[1] || !match[2]) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

export function rankTargets(targets: SafetyIndexTarget[]): PublicSignalLead[] {
  const byRepo = new Map<string, PublicSignalLead>();
  for (const target of targets) {
    const parsed = handleFromRepo(target.repo);
    const score = scoreRisk(target);
    if (!parsed || score === 0) continue;
    const key = `${parsed.owner}/${parsed.repo}`.toLowerCase();
    const current = byRepo.get(key);
    if (!current || score > current.score) {
      byRepo.set(key, {
        id: target.id,
        name: target.name,
        packageName: target.packageName ?? null,
        repo: `https://github.com/${parsed.owner}/${parsed.repo}`,
        handle: parsed.owner,
        riskClass: target.riskClass ?? "unknown",
        why: target.whyItMatters ?? target.failureClass ?? target.riskClass ?? target.name,
        offer: score >= 90 ? "enforce" : "individual",
        score,
      });
    }
  }
  return [...byRepo.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export function draftNote(lead: PublicSignalLead): string {
  return [
    `Saw Observatory list ${lead.name} under ${lead.riskClass}.`,
    "",
    "npx -y @kryptosai/mcp-observatory@latest enforce --start-proxy",
    "",
    "writes a deny-default Seatbelt policy from the scan and starts the proxy. Local scan stays free.",
    "",
    "Happy to walk the finding if useful.",
  ].join("\n");
}

export async function buildLeads(targetsPath: string): Promise<PublicSignalLead[]> {
  const targets = JSON.parse(await readFile(targetsPath, "utf8")) as SafetyIndexTarget[];
  return rankTargets(targets).map((lead) => ({ ...lead, draft: draftNote(lead) }));
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const outDir = "/tmp/ws2026";
  const outFile = path.join(outDir, "observatory-leads.json");
  const leads = await buildLeads(path.join(root, "docs/safety-index/targets.json"));
  await mkdir(outDir, { recursive: true });
  await writeFile(outFile, `${JSON.stringify({ generatedAt: new Date().toISOString(), source: "docs/safety-index/targets.json", leads }, null, 2)}\n`);
  process.stdout.write(`Wrote ${leads.length} public-signal leads to ${outFile}\n\n`);
  for (const [index, lead] of leads.slice(0, 5).entries()) {
    process.stdout.write(`${index + 1}. ${lead.handle} — ${lead.name} (${lead.riskClass}, ${lead.score})\n${lead.repo}\n\n${lead.draft}\n\n---\n\n`);
  }
}
