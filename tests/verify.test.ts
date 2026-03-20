import { describe, expect, it } from "vitest";

import type { Cassette, CassetteEntry } from "../src/cassette.js";
import { compareResponses } from "../src/verify.js";

function makeCassette(entries: CassetteEntry[]): Cassette {
  return {
    version: 1,
    targetId: "test-server",
    recordedAt: "2026-03-20T00:00:00.000Z",
    transport: "stdio",
    entries,
  };
}

describe("compareResponses", () => {
  it("all pass when live matches cassette", () => {
    const entries: CassetteEntry[] = [
      { direction: "response", method: "tools/list", result: { tools: [] }, timestampMs: 0 },
      { direction: "response", method: "prompts/list", result: { prompts: [] }, timestampMs: 5 },
    ];

    const result = compareResponses(makeCassette(entries), entries);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.missing).toBe(0);
  });

  it("detects changed responses", () => {
    const cassetteEntries: CassetteEntry[] = [
      { direction: "response", method: "tools/list", result: { tools: [{ name: "old" }] }, timestampMs: 0 },
    ];
    const liveEntries: CassetteEntry[] = [
      { direction: "response", method: "tools/list", result: { tools: [{ name: "new" }] }, timestampMs: 0 },
    ];

    const result = compareResponses(makeCassette(cassetteEntries), liveEntries);
    expect(result.failed).toBe(1);
    expect(result.entries[0]!.status).toBe("fail");
  });

  it("detects missing responses", () => {
    const cassetteEntries: CassetteEntry[] = [
      { direction: "response", method: "tools/list", result: { tools: [] }, timestampMs: 0 },
      { direction: "response", method: "prompts/list", result: { prompts: [] }, timestampMs: 5 },
    ];
    const liveEntries: CassetteEntry[] = [
      { direction: "response", method: "tools/list", result: { tools: [] }, timestampMs: 0 },
    ];

    const result = compareResponses(makeCassette(cassetteEntries), liveEntries);
    expect(result.passed).toBe(1);
    expect(result.missing).toBe(1);
  });

  it("detects extra live responses not in cassette", () => {
    const cassetteEntries: CassetteEntry[] = [];
    const liveEntries: CassetteEntry[] = [
      { direction: "response", method: "tools/list", result: { tools: [] }, timestampMs: 0 },
    ];

    const result = compareResponses(makeCassette(cassetteEntries), liveEntries);
    expect(result.failed).toBe(1);
    expect(result.entries[0]!.diff).toContain("Extra response");
  });

  it("ignores non-response entries", () => {
    const entries: CassetteEntry[] = [
      { direction: "request", method: "tools/list", params: {}, timestampMs: 0 },
      { direction: "notification", method: "initialized", timestampMs: 2 },
      { direction: "response", method: "tools/list", result: { tools: [] }, timestampMs: 5 },
    ];

    const result = compareResponses(makeCassette(entries), entries);
    expect(result.totalEntries).toBe(1); // only the response
    expect(result.passed).toBe(1);
  });
});
