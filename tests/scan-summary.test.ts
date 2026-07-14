import { describe, expect, it } from "vitest";

import { categorizeServerResult, formatScanSummaryLine } from "../src/commands/scan.js";
import { makeArtifact } from "./fixtures/test-helpers.js";

describe("categorizeServerResult", () => {
  it("categorizes a fully passing server as passed", () => {
    const artifact = { ...makeArtifact([]), gate: "pass" as const };
    expect(categorizeServerResult(artifact)).toBe("passed");
  });

  it("categorizes a server with a failing gate as failed, even with partial checks", () => {
    const artifact = {
      ...makeArtifact([]),
      gate: "fail" as const,
      summary: { ...makeArtifact([]).summary, partial: 1 },
    };
    expect(categorizeServerResult(artifact)).toBe("failed");
  });

  it("categorizes a passing gate with a partial check as warning", () => {
    const artifact = {
      ...makeArtifact([]),
      gate: "pass" as const,
      summary: { ...makeArtifact([]).summary, partial: 1 },
    };
    expect(categorizeServerResult(artifact)).toBe("warning");
  });

  it("categorizes a passing gate with a flaky check as warning", () => {
    const artifact = {
      ...makeArtifact([]),
      gate: "pass" as const,
      summary: { ...makeArtifact([]).summary, flaky: 1 },
    };
    expect(categorizeServerResult(artifact)).toBe("warning");
  });
});

describe("formatScanSummaryLine", () => {
  it("matches the exact format from the issue", () => {
    expect(formatScanSummaryLine({ passed: 1, failed: 1, warning: 1 })).toBe(
      "3 servers scanned: 1 passed, 1 failed, 1 warnings",
    );
  });

  it("uses singular 'server' for a single-server scan", () => {
    expect(formatScanSummaryLine({ passed: 1, failed: 0, warning: 0 })).toBe(
      "1 server scanned: 1 passed, 0 failed, 0 warnings",
    );
  });

  it("handles zero servers", () => {
    expect(formatScanSummaryLine({ passed: 0, failed: 0, warning: 0 })).toBe(
      "0 servers scanned: 0 passed, 0 failed, 0 warnings",
    );
  });
});
