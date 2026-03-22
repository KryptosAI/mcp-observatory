/**
 * Core webhook handler for MCP Observatory GitHub App.
 *
 * On PR opened/synchronize:
 *   1. Find MCP config files in the diff
 *   2. Parse and run checks against them
 *   3. Post or update a PR comment with the health report
 */

import { Octokit } from "@octokit/rest";
import {
  generateComment,
  COMMENT_MARKER,
  type RunArtifact,
  type CheckResult,
  type HealthScore,
  type HealthScoreDimension,
} from "./comment.js";

// --- MCP config detection ---

/** File patterns that indicate an MCP server configuration. */
const MCP_CONFIG_PATTERNS = [
  /\.mcp\.json$/,
  /mcp-config\.json$/,
  /mcp-config\.ya?ml$/,
  /\.mcp\.ya?ml$/,
  /mcp-server\.json$/,
  /claude_desktop_config\.json$/,
];

function isMcpConfigFile(filename: string): boolean {
  return MCP_CONFIG_PATTERNS.some((p) => p.test(filename));
}

// --- Health scoring ---

function computeHealthScore(checks: CheckResult[]): HealthScore {
  const dimensions = buildDimensions(checks);
  const totalWeight = dimensions.reduce((s, d) => s + d.weight, 0);
  const overall =
    totalWeight > 0
      ? Math.round(
          dimensions.reduce((s, d) => s + d.score * d.weight, 0) / totalWeight
        )
      : 0;

  return {
    overall,
    grade: scoreToGrade(overall),
    dimensions,
  };
}

function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function buildDimensions(checks: CheckResult[]): HealthScoreDimension[] {
  const groups: Record<string, CheckResult[]> = {};
  for (const c of checks) {
    const dim = c.id.split("/")[0] ?? "general";
    (groups[dim] ??= []).push(c);
  }

  return Object.entries(groups).map(([name, groupChecks]) => {
    const passCount = groupChecks.filter((c) => c.status === "pass").length;
    const total = groupChecks.filter((c) => c.status !== "skip").length;
    const score = total > 0 ? Math.round((passCount / total) * 100) : 100;
    const details = groupChecks
      .filter((c) => c.status === "fail" || c.status === "warn")
      .map((c) => `${c.id}: ${c.message}`);

    return {
      name,
      weight: 1,
      score,
      details,
    };
  });
}

// --- MCP config checks ---

interface McpServerEntry {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  [key: string]: unknown;
}

interface McpConfig {
  mcpServers?: Record<string, McpServerEntry>;
  [key: string]: unknown;
}

function runChecksOnConfig(
  filename: string,
  content: string
): { targetId: string; checks: CheckResult[] } {
  const checks: CheckResult[] = [];
  let config: McpConfig;

  try {
    config = JSON.parse(content) as McpConfig;
    checks.push({
      id: "syntax/valid-json",
      status: "pass",
      message: "Valid JSON",
      evidence: [],
    });
  } catch (e) {
    checks.push({
      id: "syntax/valid-json",
      status: "fail",
      message: `Invalid JSON: ${(e as Error).message}`,
      evidence: [],
    });
    return { targetId: filename, checks };
  }

  // Check mcpServers key exists
  if (!config.mcpServers || typeof config.mcpServers !== "object") {
    checks.push({
      id: "schema/mcp-servers",
      status: "fail",
      message: "Missing or invalid mcpServers key",
      evidence: [],
    });
    return { targetId: filename, checks };
  }

  checks.push({
    id: "schema/mcp-servers",
    status: "pass",
    message: "mcpServers key present",
    evidence: [],
  });

  const servers = config.mcpServers;
  for (const [name, entry] of Object.entries(servers)) {
    // Transport check
    if (!entry.command && !entry.url) {
      checks.push({
        id: `transport/${name}`,
        status: "fail",
        message: `Server "${name}" has no command or url`,
        evidence: [],
      });
    } else {
      checks.push({
        id: `transport/${name}`,
        status: "pass",
        message: `Server "${name}" has ${entry.command ? "stdio" : "http"} transport`,
        evidence: [],
      });
    }

    // Environment variable leak check
    if (entry.env) {
      const leaked = Object.entries(entry.env).filter(
        ([, v]) =>
          typeof v === "string" &&
          v.length > 8 &&
          !v.startsWith("$") &&
          !v.startsWith("${") &&
          /^[A-Za-z0-9+/=_-]{16,}$/.test(v)
      );
      if (leaked.length > 0) {
        checks.push({
          id: `security/${name}/env-secrets`,
          status: "warn",
          message: `Possible hardcoded secrets in env vars: ${leaked.map(([k]) => k).join(", ")}`,
          evidence: leaked.map(([k]) => `${k} looks like a hardcoded credential`),
        });
      } else {
        checks.push({
          id: `security/${name}/env-secrets`,
          status: "pass",
          message: "No hardcoded secrets detected",
          evidence: [],
        });
      }
    }

    // Args validation
    if (entry.command && (!entry.args || !Array.isArray(entry.args))) {
      checks.push({
        id: `schema/${name}/args`,
        status: "warn",
        message: `Server "${name}" uses stdio but has no args array`,
        evidence: [],
      });
    }
  }

  return { targetId: filename, checks };
}

// --- GitHub API helpers ---

async function findExistingComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number
): Promise<number | null> {
  const iterator = octokit.paginate.iterator(
    octokit.rest.issues.listComments,
    { owner, repo, issue_number: prNumber, per_page: 100 }
  );

  for await (const { data: comments } of iterator) {
    for (const comment of comments) {
      if (comment.body?.includes(COMMENT_MARKER)) {
        return comment.id;
      }
    }
  }

  return null;
}

async function upsertComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  body: string
): Promise<void> {
  const existingId = await findExistingComment(octokit, owner, repo, prNumber);

  if (existingId) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingId,
      body,
    });
  } else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body,
    });
  }
}

// --- Main handler ---

export interface PullRequestEvent {
  action: string;
  number: number;
  pull_request: {
    number: number;
    head: { sha: string; ref: string };
    base: { sha: string; ref: string };
  };
  repository: {
    owner: { login: string };
    name: string;
    full_name: string;
  };
  installation?: { id: number };
}

export async function handlePullRequest(
  event: PullRequestEvent,
  octokit: Octokit
): Promise<void> {
  const { repository, pull_request: pr } = event;
  const owner = repository.owner.login;
  const repo = repository.name;
  const prNumber = pr.number;

  console.log(
    `Processing PR #${prNumber} (${event.action}) on ${repository.full_name}`
  );

  // 1. Get files changed in the PR
  const { data: files } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  const mcpFiles = files.filter(
    (f) => isMcpConfigFile(f.filename) && f.status !== "removed"
  );

  if (mcpFiles.length === 0) {
    console.log(`No MCP config files found in PR #${prNumber}, skipping`);
    return;
  }

  console.log(
    `Found ${mcpFiles.length} MCP config file(s): ${mcpFiles.map((f) => f.filename).join(", ")}`
  );

  // 2. Fetch file contents and run checks
  const artifacts: RunArtifact[] = [];

  for (const file of mcpFiles) {
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: file.filename,
        ref: pr.head.sha,
      });

      if ("content" in data && data.content) {
        const content = Buffer.from(data.content, "base64").toString("utf-8");
        const { targetId, checks } = runChecksOnConfig(file.filename, content);
        const healthScore = computeHealthScore(checks);
        const gate = checks.some((c) => c.status === "fail")
          ? "fail"
          : checks.some((c) => c.status === "warn")
            ? "warn"
            : "pass";

        artifacts.push({
          target: { targetId },
          checks,
          healthScore,
          gate: gate as RunArtifact["gate"],
        });
      }
    } catch (err) {
      console.error(`Failed to fetch ${file.filename}:`, err);
      artifacts.push({
        target: { targetId: file.filename },
        checks: [
          {
            id: "fetch/error",
            status: "fail",
            message: `Could not read file: ${(err as Error).message}`,
            evidence: [],
          },
        ],
        gate: "fail",
      });
    }
  }

  // 3. Generate and post/update comment
  const body = generateComment(artifacts);
  await upsertComment(octokit, owner, repo, prNumber, body);

  console.log(
    `Posted Observatory report on PR #${prNumber} (${artifacts.length} server(s) analyzed)`
  );
}
