import { describe, expect, it } from "vitest";
import { renderHtml } from "../src/reporters/html.js";
import { renderMarkdown } from "../src/reporters/markdown.js";
import { renderPrComment } from "../src/reporters/pr-comment.js";
import { renderTerminal } from "../src/reporters/terminal.js";
import { makeArtifact } from "./fixtures/test-helpers.js";

describe("report safety summary", () => {
  it("renders a blocking safety verdict across report surfaces", () => {
    const artifact = makeArtifact([
      {
        id: "tools-invoke",
        capability: "tools-invoke",
        status: "fail",
        durationMs: 25,
        message: "tool invocation failed",
        evidence: [],
      },
    ]);
    artifact.gate = "fail";
    artifact.summary.gate = "fail";
    artifact.summary.fail = 1;

    expect(renderTerminal(artifact)).toContain("Safety Verdict: Blocked");
    expect(renderMarkdown(artifact)).toContain("Safety verdict: **Blocked**");
    expect(renderHtml(artifact)).toContain("Safety:");
    expect(renderHtml(artifact)).toContain("Blocked");
    expect(renderPrComment(artifact)).toContain("**Blocked**");
    expect(renderPrComment(artifact)).toContain("tool invocation failed");
  });
});
