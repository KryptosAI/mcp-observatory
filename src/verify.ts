import type { Cassette, CassetteEntry } from "./cassette.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface VerifyEntryResult {
  method: string;
  status: "pass" | "fail" | "missing";
  expected?: unknown;
  actual?: unknown;
  diff?: string;
}

export interface VerifyResult {
  targetId: string;
  totalEntries: number;
  passed: number;
  failed: number;
  missing: number;
  entries: VerifyEntryResult[];
}

// ── Comparison ───────────────────────────────────────────────────────────────

/**
 * Compare cassette response entries against live response entries.
 * Only compares response entries (request/notification entries are skipped).
 */
export function compareResponses(
  cassette: Cassette,
  liveEntries: CassetteEntry[],
): VerifyResult {
  const cassetteResponses = cassette.entries.filter((e) => e.direction === "response");
  const liveResponses = liveEntries.filter((e) => e.direction === "response");

  const entries: VerifyEntryResult[] = [];

  for (let i = 0; i < cassetteResponses.length; i++) {
    const expected = cassetteResponses[i]!;
    const actual = liveResponses[i];

    if (!actual) {
      entries.push({
        method: expected.method,
        status: "missing",
        expected: expected.result ?? expected.error,
      });
      continue;
    }

    if (expected.method !== actual.method) {
      entries.push({
        method: expected.method,
        status: "fail",
        expected: expected.result ?? expected.error,
        actual: actual.result ?? actual.error,
        diff: `Method mismatch: expected "${expected.method}", got "${actual.method}"`,
      });
      continue;
    }

    // Compare results structurally
    const expectedPayload = expected.error ? { error: expected.error } : { result: expected.result };
    const actualPayload = actual.error ? { error: actual.error } : { result: actual.result };

    if (deepEqual(expectedPayload, actualPayload)) {
      entries.push({ method: expected.method, status: "pass" });
    } else {
      entries.push({
        method: expected.method,
        status: "fail",
        expected: expectedPayload,
        actual: actualPayload,
        diff: summarizeDiff(expectedPayload, actualPayload),
      });
    }
  }

  // Check for extra live responses not in cassette
  for (let i = cassetteResponses.length; i < liveResponses.length; i++) {
    const actual = liveResponses[i]!;
    entries.push({
      method: actual.method,
      status: "fail",
      actual: actual.result ?? actual.error,
      diff: "Extra response not in cassette",
    });
  }

  return {
    targetId: cassette.targetId,
    totalEntries: entries.length,
    passed: entries.filter((e) => e.status === "pass").length,
    failed: entries.filter((e) => e.status === "fail").length,
    missing: entries.filter((e) => e.status === "missing").length,
    entries,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((val, i) => deepEqual(val, b[i]));
  }

  if (typeof a === "object") {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj).sort();
    const bKeys = Object.keys(bObj).sort();
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key, i) => key === bKeys[i] && deepEqual(aObj[key], bObj[key]));
  }

  return false;
}

function summarizeDiff(expected: unknown, actual: unknown): string {
  const expStr = JSON.stringify(expected, null, 2);
  const actStr = JSON.stringify(actual, null, 2);

  if (expStr.length > 200 || actStr.length > 200) {
    return "Response content differs (too large to display inline)";
  }
  return `Expected: ${expStr}\nActual: ${actStr}`;
}
