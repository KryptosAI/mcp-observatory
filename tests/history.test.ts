import { describe, it, expect } from "vitest";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import path from "node:path";

import {
  readHistory,
  appendHistory,
  buildHistoryEntry,
  filterHistory,
  getTrend,
  renderTrendLabel,
  type HistoryEntry,
  type HistoryFile,
  type TrendInfo,
} from "../src/history.js";
import { makeArtifact } from "./fixtures/test-helpers.js";

function makeTempHistoryPath(): string {
  return path.join(tmpdir(), `mcp-obs-test-${randomUUID()}`, "history.json");
}

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    date: "2026-03-21T00:00:00Z",
    targetId: "test",
    healthScore: 80,
    grade: "B",
    toolCount: 5,
    promptCount: 2,
    resourceCount: 1,
    gate: "pass",
    ...overrides,
  };
}

describe("readHistory", () => {
  it("returns empty history when file does not exist", async () => {
    const result = await readHistory(makeTempHistoryPath());
    expect(result).toEqual({ version: 1, entries: [] });
  });
});

describe("appendHistory", () => {
  it("creates file and appends entry", async () => {
    const histPath = makeTempHistoryPath();
    const entry = makeEntry();
    await appendHistory(entry, histPath);
    const history = await readHistory(histPath);
    expect(history.entries).toHaveLength(1);
    expect(history.entries[0]).toEqual(entry);
  });

  it("appends to existing history", async () => {
    const histPath = makeTempHistoryPath();
    await appendHistory(makeEntry({ healthScore: 70 }), histPath);
    await appendHistory(makeEntry({ healthScore: 90 }), histPath);
    const history = await readHistory(histPath);
    expect(history.entries).toHaveLength(2);
    expect(history.entries[0]!.healthScore).toBe(70);
    expect(history.entries[1]!.healthScore).toBe(90);
  });
});

describe("buildHistoryEntry", () => {
  it("extracts correct values from a RunArtifact", () => {
    const artifact = makeArtifact([
      {
        id: "tools",
        capability: "tools",
        status: "pass",
        durationMs: 100,
        message: "OK",
        evidence: [
          {
            endpoint: "tools/list",
            advertised: true,
            responded: true,
            minimalShapePresent: true,
            itemCount: 24,
          },
        ],
      },
      {
        id: "prompts",
        capability: "prompts",
        status: "pass",
        durationMs: 50,
        message: "OK",
        evidence: [
          {
            endpoint: "prompts/list",
            advertised: true,
            responded: true,
            minimalShapePresent: true,
            itemCount: 3,
          },
        ],
      },
      {
        id: "resources",
        capability: "resources",
        status: "pass",
        durationMs: 50,
        message: "OK",
        evidence: [
          {
            endpoint: "resources/list",
            advertised: true,
            responded: true,
            minimalShapePresent: true,
            itemCount: 5,
          },
        ],
      },
    ]);
    artifact.healthScore = { overall: 95, grade: "A", dimensions: [] };

    const entry = buildHistoryEntry(artifact);
    expect(entry.date).toBe("2026-03-21T00:00:00Z");
    expect(entry.targetId).toBe("test");
    expect(entry.healthScore).toBe(95);
    expect(entry.grade).toBe("A");
    expect(entry.toolCount).toBe(24);
    expect(entry.promptCount).toBe(3);
    expect(entry.resourceCount).toBe(5);
    expect(entry.gate).toBe("pass");
  });
});

describe("filterHistory", () => {
  const history: HistoryFile = {
    version: 1,
    entries: [
      makeEntry({ targetId: "a", healthScore: 90 }),
      makeEntry({ targetId: "b", healthScore: 70 }),
      makeEntry({ targetId: "a", healthScore: 95 }),
    ],
  };

  it("keeps only the requested target, preserving order and shape", () => {
    const filtered = filterHistory(history, "a");
    expect(filtered.version).toBe(1);
    expect(filtered.entries.map((e) => e.healthScore)).toEqual([90, 95]);
    expect(filtered.entries.every((e) => e.targetId === "a")).toBe(true);
  });

  it("returns the input unchanged when no target is given", () => {
    expect(filterHistory(history)).toBe(history);
  });

  it("yields an empty entries list for an unknown target", () => {
    expect(filterHistory(history, "nope").entries).toEqual([]);
  });

  it("does not mutate the original history", () => {
    filterHistory(history, "a");
    expect(history.entries).toHaveLength(3);
  });
});

describe("getTrend", () => {
  it("returns null for empty history", () => {
    const history: HistoryFile = { version: 1, entries: [] };
    expect(getTrend("test", history)).toBeNull();
  });

  it('returns direction "new" for single entry', () => {
    const history: HistoryFile = {
      version: 1,
      entries: [makeEntry({ healthScore: 80 })],
    };
    const trend = getTrend("test", history)!;
    expect(trend.direction).toBe("new");
    expect(trend.previous).toBeUndefined();
    expect(trend.delta).toBe(80);
  });

  it('returns direction "up" when score improved', () => {
    const history: HistoryFile = {
      version: 1,
      entries: [
        makeEntry({ healthScore: 60 }),
        makeEntry({ healthScore: 85 }),
      ],
    };
    const trend = getTrend("test", history)!;
    expect(trend.direction).toBe("up");
    expect(trend.delta).toBe(25);
  });

  it('returns direction "down" when score decreased', () => {
    const history: HistoryFile = {
      version: 1,
      entries: [
        makeEntry({ healthScore: 90 }),
        makeEntry({ healthScore: 70 }),
      ],
    };
    const trend = getTrend("test", history)!;
    expect(trend.direction).toBe("down");
    expect(trend.delta).toBe(-20);
  });

  it('returns direction "stable" when score unchanged', () => {
    const history: HistoryFile = {
      version: 1,
      entries: [
        makeEntry({ healthScore: 80 }),
        makeEntry({ healthScore: 80 }),
      ],
    };
    const trend = getTrend("test", history)!;
    expect(trend.direction).toBe("stable");
    expect(trend.delta).toBe(0);
  });
});

describe("renderTrendLabel", () => {
  it("formats new direction", () => {
    const trend: TrendInfo = {
      current: makeEntry(),
      direction: "new",
      delta: 80,
    };
    expect(renderTrendLabel(trend)).toBe("● first run");
  });

  it("formats up direction", () => {
    const trend: TrendInfo = {
      current: makeEntry({ healthScore: 90, grade: "A" }),
      previous: makeEntry({ healthScore: 70, grade: "C" }),
      direction: "up",
      delta: 20,
    };
    expect(renderTrendLabel(trend)).toBe("↗ was C (70)");
  });

  it("formats down direction", () => {
    const trend: TrendInfo = {
      current: makeEntry({ healthScore: 60, grade: "D" }),
      previous: makeEntry({ healthScore: 90, grade: "A" }),
      direction: "down",
      delta: -30,
    };
    expect(renderTrendLabel(trend)).toBe("↘ was A (90)");
  });

  it("formats stable direction", () => {
    const trend: TrendInfo = {
      current: makeEntry(),
      previous: makeEntry(),
      direction: "stable",
      delta: 0,
    };
    expect(renderTrendLabel(trend)).toBe("→ stable");
  });
});
