import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const targetsPath = path.join(root, "docs", "safety-index", "targets.json");
const artifactsDir = path.join(root, "docs", "safety-index", "artifacts");
const outDir = path.join(root, "dashboard", "safety-index");
const outFile = path.join(outDir, "api-data.json");

// ── Types ────────────────────────────────────────────────────────────────────

interface SafetyIndexTarget {
  id: string;
  name: string;
  repo?: string;
  packageName: string;
  category: string;
  riskClass: string;
  failureClass: string;
  whyItMatters: string;
  reproductionNotes: string;
}

interface SafetyIndexEntry {
  id: string;
  name: string;
  packageName: string;
  category: string;
  riskClass: string;
  failureClass: string;
  healthScore?: number;
  grade?: string;
  gate?: string;
  toolCount: number;
  promptCount: number;
  resourceCount: number;
  lastScanned?: string;
  repo?: string;
  fatalError?: string;
}

interface SafetyIndexServer extends SafetyIndexEntry {
  whyItMatters: string;
  reproductionNotes: string;
  healthScoreDetail?: {
    overall: number;
    grade: string;
    dimensions: Array<{ name: string; weight: number; score: number }>;
  };
  checks: Array<{ id: string; status: string; message: string }>;
  summary: { total: number; pass: number; fail: number; partial: number; unsupported: number; skipped: number };
  findings?: Array<{ severity: string; rule?: string; message: string; cwe?: string }>;
  performanceMetrics?: { connectMs?: number };
}

interface RiskGraphNode {
  id: string;
  name: string;
  source: string;
  capabilityBoundary: string;
  receiptState: string;
  recommendedAction: string;
  riskLevel: string;
  evidenceRefs: string[];
  ciCommand: string;
}

interface RiskGraphEdge {
  from: string;
  to: string;
  type: string;
  reason: string;
}

interface SafetyIndexData {
  generatedAt: string;
  totalServers: number;
  categories: Array<{ name: string; count: number }>;
  servers: SafetyIndexEntry[];
  details: Record<string, SafetyIndexServer>;
  riskGraph?: {
    nodes: RiskGraphNode[];
    edges: RiskGraphEdge[];
    summary: Record<string, unknown>;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractFindings(checks: Array<Record<string, unknown>>): Array<{ severity: string; rule?: string; message: string; cwe?: string }> {
  const findings: Array<{ severity: string; rule?: string; message: string; cwe?: string }> = [];
  for (const ch of checks) {
    if (ch["id"] !== "security" && ch["id"] !== "security-lite" && ch["id"] !== "attack-sim") continue;
    const evidence = ch["evidence"] as Array<Record<string, unknown>> | undefined;
    if (!evidence) continue;
    for (const ev of evidence) {
      const fList = ev["findings"] as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(fList)) {
        for (const f of fList) {
          findings.push({
            severity: String(f["severity"] ?? f["level"] ?? "low"),
            rule: f["rule"] ? String(f["rule"]) : undefined,
            message: String(f["message"] ?? f["description"] ?? ch["message"] ?? ""),
            cwe: f["cwe"] ? String(f["cwe"]) : undefined,
          });
        }
      }
    }
  }
  return findings;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const raw = await readFile(targetsPath, "utf8");
  const targets = JSON.parse(raw) as SafetyIndexTarget[];

  const servers: SafetyIndexEntry[] = [];
  const details: Record<string, SafetyIndexServer> = {};
  const categoryCounts: Record<string, number> = {};
  let generated = 0;

  for (const t of targets) {
    if (!categoryCounts[t.category]) categoryCounts[t.category] = 0;
    categoryCounts[t.category]! += 1;

    const artifactPath = path.join(artifactsDir, `${t.id}.json`);
    let artifact: Record<string, unknown> | null = null;
    try {
      artifact = JSON.parse(await readFile(artifactPath, "utf8")) as Record<string, unknown>;
    } catch {
      // no artifact
    }

    const checks = (artifact?.["checks"] ?? []) as Array<Record<string, unknown>>;
    const summary = (artifact?.["summary"] ?? {}) as Record<string, number>;
    const healthScore = artifact?.["healthScore"] as Record<string, unknown> | undefined;
    const perfMetrics = artifact?.["performanceMetrics"] as Record<string, number> | undefined;

    const toolsEvidence = checks.find(ch => ch["id"] === "tools")?.["evidence"] as Array<Record<string, number>> | undefined;
    const promptsEvidence = checks.find(ch => ch["id"] === "prompts")?.["evidence"] as Array<Record<string, number>> | undefined;
    const resourcesEvidence = checks.find(ch => ch["id"] === "resources")?.["evidence"] as Array<Record<string, number>> | undefined;

    const entry: SafetyIndexEntry = {
      id: t.id,
      name: t.name,
      packageName: t.packageName,
      category: t.category,
      riskClass: t.riskClass,
      failureClass: t.failureClass,
      healthScore: healthScore?.["overall"] as number | undefined,
      grade: healthScore?.["grade"] as string | undefined,
      gate: artifact?.["gate"] as string | undefined,
      toolCount: toolsEvidence?.[0]?.["itemCount"] ?? 0,
      promptCount: promptsEvidence?.[0]?.["itemCount"] ?? 0,
      resourceCount: resourcesEvidence?.[0]?.["itemCount"] ?? 0,
      lastScanned: artifact?.["createdAt"] as string | undefined,
      repo: t.repo,
      fatalError: artifact?.["fatalError"] ? (artifact["fatalError"] as string).split("\n")[0] : undefined,
    };

    servers.push(entry);

    const detail: SafetyIndexServer = {
      ...entry,
      whyItMatters: t.whyItMatters,
      reproductionNotes: t.reproductionNotes,
      healthScoreDetail: healthScore ? {
        overall: healthScore["overall"] as number,
        grade: healthScore["grade"] as string,
        dimensions: (healthScore["dimensions"] ?? []) as Array<{ name: string; weight: number; score: number }>,
      } : undefined,
      checks: checks.map(ch => ({
        id: ch["id"] as string,
        status: ch["status"] as string,
        message: ch["message"] as string,
      })),
      summary: {
        total: summary["total"] ?? 0,
        pass: summary["pass"] ?? 0,
        fail: summary["fail"] ?? 0,
        partial: (summary["partial"] ?? 0) + (summary["flaky"] ?? 0),
        unsupported: summary["unsupported"] ?? 0,
        skipped: summary["skipped"] ?? 0,
      },
      findings: extractFindings(checks),
      performanceMetrics: perfMetrics ? { connectMs: perfMetrics["connectMs"] } : undefined,
    };

    details[t.id] = detail;
    generated += 1;

    if (generated % 20 === 0) {
      process.stdout.write(`  ${generated}/${targets.length} servers processed...\n`);
    }
  }

  const categories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({ name, count }));

  let riskGraph: SafetyIndexData["riskGraph"] | undefined;
  try {
    const rgPath = path.join(root, "docs", "safety-index", "mcp-risk-graph.json");
    const rgRaw = JSON.parse(await readFile(rgPath, "utf8")) as Record<string, unknown>;
    riskGraph = {
      nodes: (rgRaw["nodes"] ?? []) as RiskGraphNode[],
      edges: (rgRaw["edges"] ?? []) as RiskGraphEdge[],
      summary: (rgRaw["summary"] ?? {}) as Record<string, unknown>,
    };
  } catch {
    // risk graph not available
  }

  const data: SafetyIndexData = {
    generatedAt: new Date().toISOString(),
    totalServers: targets.length,
    categories,
    servers,
    details,
    riskGraph,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(outFile, JSON.stringify(data, null, 2), "utf8");

  const sizeKB = Math.round(Buffer.byteLength(JSON.stringify(data)) / 1024);
  process.stdout.write(`\nWrote ${targets.length} servers (${sizeKB}KB) to ${outFile}\n`);
  process.stdout.write(`Deploy with: npx wrangler pages deploy dashboard --project-name mcp-observatory\n`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
