import { describe, expect, it, vi } from "vitest";

// Mock child_process for execCommand tests
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

import { execFile } from "node:child_process";

const mockedExecFile = vi.mocked(execFile);

// Mock fs/promises to avoid real file writes
vi.mock("node:fs/promises", () => ({
  mkdtemp: vi.fn(() => Promise.resolve("/tmp/mcp-observatory-issue-test")),
  rm: vi.fn(() => Promise.resolve()),
  writeFile: vi.fn(() => Promise.resolve()),
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

  const fn = (cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> => {
    calls.push({ cmd, args });
    const next = queue.shift();
    if (!next) return Promise.reject(new Error("No more mock values queued"));
    if (next.type === "reject") return Promise.reject(next.error);
    return Promise.resolve(next.value);
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

  it("returns null when output is not an array", async () => {
    const exec = createMockExec();
    exec.mockResolvedValueOnce({
      stdout: JSON.stringify({ number: 42 }),
      stderr: "",
    });
    const result = await findExistingIssue("owner/repo", "mcp-observatory", exec);
    expect(result).toBeNull();
  });

  it("returns null when first item has no number property", async () => {
    const exec = createMockExec();
    exec.mockResolvedValueOnce({
      stdout: JSON.stringify([{ title: "no number" }]),
      stderr: "",
    });
    const result = await findExistingIssue("owner/repo", "mcp-observatory", exec);
    expect(result).toBeNull();
  });

  it("returns null when stdout is not valid JSON", async () => {
    const exec = createMockExec();
    exec.mockResolvedValueOnce({
      stdout: "not json at all",
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

  it("throws when gh output has no issue URL", async () => {
    const exec = createMockExec();
    exec.mockResolvedValueOnce({ stdout: JSON.stringify([]), stderr: "" });
    exec.mockResolvedValueOnce({ stdout: "unexpected output\n", stderr: "" });

    await expect(
      createOrUpdateIssue({
        repo: "owner/repo",
        title: "Test issue",
        body: "Test body",
        labels: ["mcp-observatory"],
        exec,
      }),
    ).rejects.toThrow("Failed to parse issue number");
  });

  it("uses default label when labels array is empty", async () => {
    const exec = createMockExec();
    exec.mockResolvedValueOnce({ stdout: JSON.stringify([]), stderr: "" });
    exec.mockResolvedValueOnce({
      stdout: "https://github.com/owner/repo/issues/1\n",
      stderr: "",
    });

    const result = await createOrUpdateIssue({
      repo: "owner/repo",
      title: "Test",
      body: "Body",
      labels: [],
      exec,
    });
    expect(result).toBe(1);
    expect(exec.calls[0]!.args).toContain("mcp-observatory");
  });
});

describe("execCommand", () => {
  it("resolves with stdout and stderr on success", async () => {
    mockedExecFile.mockImplementation(
      (_cmd, _args, callback) => {
        callback(null, "output", "");
        return {} as never;
      },
    );
    const { execCommand } = await import("../src/ci-issue.js");
    const result = await execCommand("echo", ["hello"]);
    expect(result).toEqual({ stdout: "output", stderr: "" });
  });

  it("rejects with error on failure", async () => {
    mockedExecFile.mockImplementation(
      (_cmd, _args, callback) => {
        callback(new Error("command not found"), "", "");
        return {} as never;
      },
    );
    const { execCommand } = await import("../src/ci-issue.js");
    await expect(execCommand("bad", [])).rejects.toThrow("command not found");
  });

  it("handles null stdout/stderr from execFile", async () => {
    mockedExecFile.mockImplementation(
      (_cmd, _args, callback) => {
        callback(null, null as never, null as never);
        return {} as never;
      },
    );
    const { execCommand } = await import("../src/ci-issue.js");
    const result = await execCommand("cmd", []);
    expect(result).toEqual({ stdout: "", stderr: "" });
  });
});
