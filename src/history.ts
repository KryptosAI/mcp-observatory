import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { writeTextFileAtomic } from "./utils/files.js";
import type { Gate, HealthGrade, RunArtifact } from "./types.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface HistoryEntry {
  date: string;
  targetId: string;
  healthScore: number;
  grade: HealthGrade;
  toolCount: number;
  promptCount: number;
  resourceCount: number;
  gate: Gate;
}

export interface HistoryFile {
  version: 1;
  entries: HistoryEntry[];
}

export interface TrendInfo {
  current: HistoryEntry;
  previous?: HistoryEntry;
  direction: "up" | "down" | "stable" | "new";
  delta: number;
}

// ── Path helpers ─────────────────────────────────────────────────────────────

export function defaultHistoryPath(cwd?: string): string {
  return path.join(cwd ?? process.cwd(), ".mcp-observatory", "history.json");
}

// ── Read / Write ─────────────────────────────────────────────────────────────

export async function readHistory(historyPath?: string): Promise<HistoryFile> {
  const filePath = historyPath ?? defaultHistoryPath();
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as HistoryFile;
  } catch {
    return { version: 1, entries: [] };
  }
}

export async function appendHistory(
  entry: HistoryEntry,
  historyPath?: string,
): Promise<void> {
  const filePath = historyPath ?? defaultHistoryPath();
  const history = await readHistory(filePath);
  history.entries.push(entry);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeTextFileAtomic(filePath, JSON.stringify(history, null, 2) + "\n");
}

// ── Build entry from artifact ────────────────────────────────────────────────

function itemCountFromCheck(
  checks: RunArtifact["checks"],
  checkId: string,
): number {
  const check = checks.find((c) => c.id === checkId);
  if (!check || check.evidence.length === 0) return 0;
  return check.evidence[0]!.itemCount ?? 0;
}

export function buildHistoryEntry(artifact: RunArtifact): HistoryEntry {
  return {
    date: artifact.createdAt,
    targetId: artifact.target.targetId,
    healthScore: artifact.healthScore?.overall ?? 0,
    grade: artifact.healthScore?.grade ?? "F",
    toolCount: itemCountFromCheck(artifact.checks, "tools"),
    promptCount: itemCountFromCheck(artifact.checks, "prompts"),
    resourceCount: itemCountFromCheck(artifact.checks, "resources"),
    gate: artifact.gate,
  };
}

/** The history restricted to one target (same shape, so JSON output stays parseable
 *  the same way whether or not a filter was applied). No target = the input unchanged. */
export function filterHistory(history: HistoryFile, targetId?: string): HistoryFile {
  if (!targetId) return history;
  return { ...history, entries: history.entries.filter((e) => e.targetId === targetId) };
}

// ── Trend computation ────────────────────────────────────────────────────────

export function getTrend(
  targetId: string,
  history: HistoryFile,
): TrendInfo | null {
  const matching = history.entries.filter((e) => e.targetId === targetId);
  if (matching.length === 0) return null;

  const current = matching[matching.length - 1]!;
  const previous =
    matching.length >= 2 ? matching[matching.length - 2] : undefined;

  let direction: TrendInfo["direction"];
  if (!previous) {
    direction = "new";
  } else if (current.healthScore > previous.healthScore) {
    direction = "up";
  } else if (current.healthScore < previous.healthScore) {
    direction = "down";
  } else {
    direction = "stable";
  }

  const delta = current.healthScore - (previous?.healthScore ?? 0);

  return { current, previous, direction, delta };
}

// ── Rendering ────────────────────────────────────────────────────────────────

export function renderTrendLabel(trend: TrendInfo): string {
  switch (trend.direction) {
    case "new":
      return "● first run";
    case "up":
      return `↗ was ${trend.previous!.grade} (${trend.previous!.healthScore})`;
    case "down":
      return `↘ was ${trend.previous!.grade} (${trend.previous!.healthScore})`;
    case "stable":
      return "→ stable";
  }
}
