import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classifyBaselineOutput, permissionAction } from "../scripts/run-mcp-diff-baseline.js";
import { detectPermissionDeltas } from "../src/permission-delta.js";

const read = (file: string): string => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const hash = (text: string): string => createHash("sha256").update(text).digest("hex");
const directory = "docs/permission-delta-corpus/";
type Input = { base: Record<string, Record<string, unknown>>; head: Record<string, Record<string, unknown>> };

describe("permission study evidence", () => {
  it("rejects malformed or unknown baseline verdicts instead of declaring compatibility", () => {
    const change = { detail: "change", kind: "changed", param: null, tool: "tool" };
    expect(() => classifyBaselineOutput([{ ...change, severity: "new-unknown-severity" }])).toThrow();
    expect(() => classifyBaselineOutput({ changes: [] })).toThrow();
    expect(classifyBaselineOutput([{ ...change, severity: "info" }]).verdict).toBe("compatible");
    expect(classifyBaselineOutput([{ ...change, severity: "warning" }]).verdict).toBe("warning");
    expect(classifyBaselineOutput([{ ...change, severity: "breaking" }]).verdict).toBe("breaking");
  });

  it("ties all 18 baseline decisions to the current classifier and frozen input bytes", () => {
    const corpusText = read(directory + "corpus.json");
    const releaseText = read(directory + "real-release-case.json");
    const corpus = JSON.parse(corpusText) as { pairs: Array<{ id: string; input: Input }> };
    const releases = JSON.parse(releaseText) as { cases: Array<{ id: string; normalizedInput: Input }> };
    const inputs = new Map([...corpus.pairs.map((p) => [p.id, p.input] as const),
      ...releases.cases.map((p) => [p.id, p.normalizedInput] as const)]);
    const baselineText = read(directory + "mcp-diff-baseline.json");
    const baseline = JSON.parse(baselineText) as {
      evaluator: { classifierSha256: string; runnerSha256: string; corpusSha256: string; realCorpusSha256: string };
      entries: Array<{ pairId: string; inputSha256: string; permissionDeltaAction: string }>;
    };
    expect(baseline.evaluator.classifierSha256).toBe(hash(read("src/permission-delta.ts")));
    expect(baseline.evaluator.runnerSha256).toBe(hash(read("scripts/run-mcp-diff-baseline.ts")));
    expect(baseline.evaluator.corpusSha256).toBe(hash(corpusText));
    expect(baseline.evaluator.realCorpusSha256).toBe(hash(releaseText));
    expect(new Set(baseline.entries.map((e) => e.pairId))).toEqual(new Set(inputs.keys()));
    expect(baseline.entries).toHaveLength(18);
    for (const entry of baseline.entries) {
      const input = inputs.get(entry.pairId)!;
      expect(entry.inputSha256).toBe(hash(JSON.stringify(input, null, 2) + "\n"));
      expect(entry.permissionDeltaAction).toBe(permissionAction(input));
    }
    expect(read(directory + "compat-baseline.json")).toBe(baselineText);
  });

  it("preserves the released Notion names, converter fallbacks, and GitHub default", () => {
    const extracted = JSON.parse(read(directory + "release-inputs.json")) as {
      extractorSha256: string; notion: Input; github: Input;
    };
    expect(extracted.extractorSha256).toBe(hash(read("scripts/extract-permission-release-cases.mjs")));
    expect(Object.keys(extracted.notion.head)).toEqual(["API-retrieve-page-markdown", "API-update-page-markdown"]);
    const retrieve = extracted.notion.head["API-retrieve-page-markdown"]!;
    const props = retrieve["properties"] as Record<string, unknown>;
    expect(props["page_id"]).toEqual({ type: "string", format: "uuid" });
    expect(props["include_transcript"]).toEqual({ type: "boolean", default: false });
    expect(props).not.toHaveProperty("Notion-Version");
    const update = extracted.notion.head["API-update-page-markdown"]!["properties"] as Record<string, { anyOf: unknown[] }>;
    expect(update["replace_content"]!.anyOf[1]).toEqual({ type: "string" });
    expect(detectPermissionDeltas("tools", extracted.notion.base, extracted.notion.head).map((d) => d.risk))
      .toEqual(["review", "review"]);
    expect(extracted.github.base["get_file_contents"]!["required"]).toContain("path");
    expect(extracted.github.head["get_file_contents"]!["required"]).not.toContain("path");
    expect(permissionAction(extracted.github)).toBe("WOULD BLOCK");
  });
});
