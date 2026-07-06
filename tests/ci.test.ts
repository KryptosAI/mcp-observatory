import { afterEach, describe, expect, it } from "vitest";

import { getGitHubContext } from "../src/ci.js";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("CI helpers", () => {
  it("returns GitHub context when both required variables are present", () => {
    process.env["GITHUB_SHA"] = "abc123";
    process.env["GITHUB_REPOSITORY"] = "KryptosAI/mcp-observatory";

    expect(getGitHubContext()).toEqual({
      sha: "abc123",
      repo: "KryptosAI/mcp-observatory",
    });
  });

  it("returns null when GitHub context is incomplete", () => {
    delete process.env["GITHUB_SHA"];
    process.env["GITHUB_REPOSITORY"] = "KryptosAI/mcp-observatory";
    expect(getGitHubContext()).toBeNull();

    process.env["GITHUB_SHA"] = "abc123";
    delete process.env["GITHUB_REPOSITORY"];
    expect(getGitHubContext()).toBeNull();
  });
});
