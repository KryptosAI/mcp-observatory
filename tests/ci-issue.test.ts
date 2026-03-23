import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock fs/promises to avoid real file writes
vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn(async () => {}),
  unlink: vi.fn(async () => {}),
}));

import type { CommandExecutor } from "../src/ci-issue.js";
import { findExistingIssue, createOrUpdateIssue } from "../src/ci-issue.js";

function createMockExec(): CommandExecutor & {
  calls: Array<{ cmd: string; args: string[] }>;
  mockResolvedValueOnce(value: { stdout: string; stderr: string }): void;
  mockRejectedValueOnce(error: Error): void;
} {
  const queue: Array<
    | { type: "resolve"; value: { stdout: string; stderr: string } }
    | { type: "reject"; error: Error }
  > = [];
  const calls: Array<{ cmd: string; args: string[] }> = [];

  const fn = async (cmd: string, args: string[]) => {
    calls.push({ cmd, args });
    const next = queue.shift();
    if (!next) throw new Error("No more mock values queued");
    if (next.type === "reject") throw next.error;
    return next.value;
  };

  fn.calls = calls;
  fn.mockResolvedValueOnce = (value: { stdout: string; stderr: string }) => {
    queue.push({ type: "resolve", value });
  };
  fn.mockRejectedValueOnce = (error: Error) => {
    queue.push({ type: "reject", error });
  };

  return fn;
}

describe("findExistingIssue", () => {
  it("returns issue number when found", async () => {
    const exec = createMockExec();
    exec.mockResolvedValueOnce({
      stdout: JSON.stringify([{ number: 42 }]),
      stderr: "",
    });
    const result = await findExistingIssue("owner/repo", "mcp-observatory", exec);
    expect(result).toBe(42);
  });

  it("returns null when no issues exist", async () => {
    const exec = createMockExec();
    exec.mockResolvedValueOnce({
      stdout: JSON.stringify([]),
      stderr: "",
    });
    const result = await findExistingIssue("owner/repo", "mcp-observatory", exec);
    expect(result).toBeNull();
  });

  it("returns null on error", async () => {
    const exec = createMockExec();
    exec.mockRejectedValueOnce(new Error("gh not found"));
    const result = await findExistingIssue("owner/repo", "mcp-observatory", exec);
    expect(result).toBeNull();
  });
});

describe("createOrUpdateIssue", () => {
  it("creates a new issue when none exists", async () => {
    const exec = createMockExec();
    // findExistingIssue: no open issues
    exec.mockResolvedValueOnce({ stdout: JSON.stringify([]), stderr: "" });
    // gh issue create: returns URL
    exec.mockResolvedValueOnce({
      stdout: "https://github.com/owner/repo/issues/99\n",
      stderr: "",
    });

    const result = await createOrUpdateIssue({
      repo: "owner/repo",
      title: "Test issue",
      body: "Test body",
      labels: ["mcp-observatory"],
      exec,
    });

    expect(result).toBe(99);
    expect(exec.calls).toHaveLength(2);
    // Second call should be gh issue create
    expect(exec.calls[1]!.args).toContain("create");
  });

  it("comments on existing issue when one is found", async () => {
    const exec = createMockExec();
    // findExistingIssue: returns issue 7
    exec.mockResolvedValueOnce({
      stdout: JSON.stringify([{ number: 7 }]),
      stderr: "",
    });
    // gh issue comment: succeeds
    exec.mockResolvedValueOnce({ stdout: "", stderr: "" });

    const result = await createOrUpdateIssue({
      repo: "owner/repo",
      title: "Test issue",
      body: "Updated body",
      labels: ["mcp-observatory"],
      exec,
    });

    expect(result).toBe(7);
    expect(exec.calls).toHaveLength(2);
    // Second call should be gh issue comment
    expect(exec.calls[1]!.args).toContain("comment");
    expect(exec.calls[1]!.args).toContain("7");
  });
});
