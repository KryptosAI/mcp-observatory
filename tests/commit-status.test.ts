import { describe, it, expect } from "vitest";
import { buildStatusDescription } from "../src/commit-status.js";
import { makeArtifact } from "./fixtures/test-helpers.js";
import type { CheckResult } from "../src/types.js";

function makeCheck(overrides: Partial<CheckResult> = {}): CheckResult {
  return {
    id: "tools",
    capability: "tools",
    status: "pass",
    durationMs: 10,
    message: "OK",
    evidence: [{ endpoint: "tools/list", advertised: true, responded: true, minimalShapePresent: true, itemCount: 3 }],
    ...overrides,
  };
}

describe("buildStatusDescription", () => {
  it("single passing artifact returns success with All clear", () => {
    const artifact = makeArtifact([
      makeCheck({ id: "tools", capability: "tools", evidence: [{ endpoint: "tools/list", advertised: true, responded: true, minimalShapePresent: true, itemCount: 5 }] }),
      makeCheck({ id: "prompts", capability: "prompts", evidence: [{ endpoint: "prompts/list", advertised: true, responded: true, minimalShapePresent: true, itemCount: 2 }] }),
    ]);
    const result = buildStatusDescription([artifact]);
    expect(result.state).toBe("success");
    expect(result.description).toContain("All clear");
  });

  it("single failing artifact with non-security failure returns failing checks", () => {
    const artifact = makeArtifact([
      makeCheck({ id: "tools", capability: "tools", status: "fail", message: "no tools" }),
      makeCheck({ id: "prompts", capability: "prompts", status: "pass" }),
    ]);
    const result = buildStatusDescription([artifact]);
    expect(result.state).toBe("failure");
    expect(result.description).toContain("failing");
  });

  it("single artifact with security findings returns security issues", () => {
    const artifact = makeArtifact([
      makeCheck({ id: "security", capability: "security", status: "fail", evidence: [{ endpoint: "security", advertised: true, responded: true, minimalShapePresent: true, diagnostics: ["[high] Bad stuff", "[medium] Sketchy thing"] }] }),
    ]);
    const result = buildStatusDescription([artifact]);
    expect(result.state).toBe("failure");
    expect(result.description).toContain("security");
  });

  it("multiple passing artifacts returns success with servers count", () => {
    const a1 = makeArtifact([makeCheck()]);
    const a2 = makeArtifact([makeCheck()]);
    const result = buildStatusDescription([a1, a2]);
    expect(result.state).toBe("success");
    expect(result.description).toContain("servers");
  });

  it("multiple artifacts with one failing returns failure with across", () => {
    const a1 = makeArtifact([makeCheck()]);
    const a2 = makeArtifact([makeCheck({ id: "conformance", capability: "conformance", status: "fail" })]);
    const result = buildStatusDescription([a1, a2]);
    expect(result.state).toBe("failure");
    expect(result.description).toContain("across");
  });

  it("tool count appears in single-server success description", () => {
    const artifact = makeArtifact([
      makeCheck({ id: "tools", capability: "tools", evidence: [{ endpoint: "tools/list", advertised: true, responded: true, minimalShapePresent: true, itemCount: 7 }] }),
      makeCheck({ id: "prompts", capability: "prompts", evidence: [{ endpoint: "prompts/list", advertised: true, responded: true, minimalShapePresent: true, itemCount: 4 }] }),
    ]);
    const result = buildStatusDescription([artifact]);
    expect(result.description).toContain("7 tools");
    expect(result.description).toContain("4 prompts");
  });
});
