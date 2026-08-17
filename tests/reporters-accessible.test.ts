import { afterEach, describe, expect, it } from "vitest";

import {
  isAccessibleMode,
  renderTerminal,
  renderWatchChanges,
  renderWatchFirstRun,
  renderWatchNoChanges,
  setAccessibleMode,
} from "../src/reporters/terminal.js";
import type { DiffArtifact, RunArtifact } from "../src/types.js";
import { makeArtifact } from "./fixtures/test-helpers.js";

/** The status glyphs accessible mode is responsible for replacing.
 *
 * The `→` in a status transition ("pass → fail") is deliberately not here: it
 * is prose inside a message, not a status symbol, and reads correctly. Only
 * the leading bullet arrow is swapped — asserted separately below.
 */
const GLYPHS = ["✓", "✗", "⚠", "–", "ℹ"] as const;

function check(
  id: RunArtifact["checks"][number]["id"],
  status: RunArtifact["checks"][number]["status"],
): RunArtifact["checks"][number] {
  return {
    id,
    capability: id,
    status,
    durationMs: 1,
    message: `${status} message`,
    evidence: [
      {
        endpoint: `${id}/endpoint`,
        advertised: true,
        responded: true,
        minimalShapePresent: true,
        itemCount: 1,
        identifiers: ["alpha"],
        diagnostics: ["a diagnostic"],
        schemas: {},
      },
    ],
  };
}

function artifact(): RunArtifact {
  const a = makeArtifact([
    check("tools", "pass"),
    check("security-lite", "fail"),
    check("prompts", "partial"),
    check("resources", "skipped"),
  ]);
  a.gate = "fail";
  return a;
}

function diff(): DiffArtifact {
  return {
    artifactType: "diff",
    schemaVersion: "1.0.0",
    gate: "fail",
    baseRunId: "base-run",
    headRunId: "head-run",
    createdAt: "2026-07-02T00:00:00Z",
    summary: {
      regressions: 1,
      recoveries: 1,
      unchanged: 0,
      added: 0,
      removed: 0,
      schemaDriftCount: 1,
      responseChangeCount: 1,
      gate: "fail",
    },
    regressions: [
      { id: "tools", capability: "tools", fromStatus: "pass", toStatus: "fail", message: "Tool broke" },
    ],
    recoveries: [
      { id: "prompts", capability: "prompts", fromStatus: "fail", toStatus: "pass", message: "Prompt recovered" },
    ],
    unchanged: [],
    added: [],
    removed: [],
    schemaDrift: [
      { capability: "tools", name: "create_issue", severity: "high", changes: ["added required property type"] },
    ],
    responseChanges: [{ capability: "tools", name: "create_issue", change: "response shape changed" }],
  };
}

/** Every terminal surface that renders status symbols. */
function renderAll(): string {
  return [
    renderTerminal(artifact()),
    renderWatchFirstRun(artifact()),
    renderWatchNoChanges(artifact()),
    renderWatchChanges(artifact(), diff()),
  ].join("\n");
}

afterEach(() => {
  setAccessibleMode(false);
});

describe("accessible mode", () => {
  it("defaults to off", () => {
    expect(isAccessibleMode()).toBe(false);
  });

  it("keeps the Unicode glyphs when off", () => {
    const output = renderAll();

    expect(output).toContain("✓");
    expect(output).toContain("✗");
    expect(output).toContain("⚠");
    expect(output).not.toContain("[PASS]");
    expect(output).not.toContain("[FAIL]");
  });

  it("replaces every status glyph with a text label when on", () => {
    setAccessibleMode(true);

    const output = renderAll();

    for (const glyph of GLYPHS) {
      expect(output, `expected no "${glyph}" in accessible output`).not.toContain(glyph);
    }
    expect(output).toContain("[PASS]");
    expect(output).toContain("[FAIL]");
    expect(output).toContain("[WARN]");
  });

  it("labels skipped and unsupported checks as [SKIP]", () => {
    setAccessibleMode(true);

    expect(renderWatchFirstRun(artifact())).toContain("[SKIP]");
  });

  it("swaps the leading bullet arrow but keeps status-transition arrows", () => {
    setAccessibleMode(true);

    // Bullet marker on the Next Actions list becomes ASCII.
    expect(renderTerminal(artifact())).toContain("> Auto-enforce:");
    // The "from → to" arrow is prose in a message and is left alone.
    expect(renderWatchChanges(artifact(), diff())).toContain("pass → fail");
  });

  it("is reversible — turning it back off restores the glyphs", () => {
    setAccessibleMode(true);
    expect(renderWatchNoChanges(artifact())).toContain("[PASS]");

    setAccessibleMode(false);

    expect(renderWatchNoChanges(artifact())).toContain("✓");
  });

  it("leaves colour formatting untouched", () => {
    const plain = renderWatchNoChanges(artifact());
    setAccessibleMode(true);
    const accessible = renderWatchNoChanges(artifact());

    // Same ANSI codes on both, only the glyph between them differs.
    const codes = (s: string) => s.match(new RegExp(`${String.fromCharCode(0x1b)}\\[\\d+m`, "g")) ?? [];
    expect(codes(accessible)).toEqual(codes(plain));
  });
});
