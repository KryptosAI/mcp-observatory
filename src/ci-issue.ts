import { execFile } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Run a command via execFile and return { stdout, stderr }.
 */
function execCommand(
  cmd: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (error, stdout, stderr) => {
      if (error) {
        reject(
          error instanceof Error
            ? error
            : new Error(typeof error === "string" ? error : "Command failed."),
        );
      } else {
        resolve({ stdout: stdout ?? "", stderr: stderr ?? "" });
      }
    });
  });
}

/** Executor type for dependency injection (testability). */
export type CommandExecutor = (
  cmd: string,
  args: string[],
) => Promise<{ stdout: string; stderr: string }>;

/**
 * Find an existing open issue with the given label.
 * Returns the issue number or null if none found / gh unavailable.
 */
export async function findExistingIssue(
  repo: string,
  label: string,
  exec: CommandExecutor = execCommand,
): Promise<number | null> {
  try {
    const { stdout } = await exec("gh", [
      "issue",
      "list",
      "--repo",
      repo,
      "--label",
      label,
      "--state",
      "open",
      "--json",
      "number",
      "--limit",
      "1",
    ]);
    const parsed: unknown = JSON.parse(stdout);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0] as Record<string, unknown>;
      if (typeof first["number"] === "number") {
        return first["number"];
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Create a new issue or comment on an existing one.
 * Uses --body-file to avoid shell injection.
 * Returns the issue number.
 */
export async function createOrUpdateIssue(options: {
  repo: string;
  title: string;
  body: string;
  labels: string[];
  exec?: CommandExecutor;
}): Promise<number> {
  const exec = options.exec ?? execCommand;
  const bodyFile = path.join(
    tmpdir(),
    `mcp-observatory-issue-${Date.now()}.md`,
  );

  try {
    await writeFile(bodyFile, options.body, "utf8");

    const existingNumber = await findExistingIssue(
      options.repo,
      options.labels[0] ?? "mcp-observatory",
      exec,
    );

    if (existingNumber !== null) {
      await exec("gh", [
        "issue",
        "comment",
        String(existingNumber),
        "--repo",
        options.repo,
        "--body-file",
        bodyFile,
      ]);
      return existingNumber;
    }

    // Create new issue
    const args = [
      "issue",
      "create",
      "--repo",
      options.repo,
      "--title",
      options.title,
      "--body-file",
      bodyFile,
    ];
    for (const label of options.labels) {
      args.push("--label", label);
    }

    const { stdout } = await exec("gh", args);
    // gh issue create prints the URL, e.g. https://github.com/owner/repo/issues/42
    const match = /\/issues\/(\d+)/.exec(stdout.trim());
    if (match?.[1]) {
      return parseInt(match[1], 10);
    }

    throw new Error(
      `Failed to parse issue number from gh output: ${stdout.trim()}`,
    );
  } finally {
    await unlink(bodyFile).catch(() => {});
  }
}
