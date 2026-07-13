import { execFile } from "node:child_process";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface WranglerPage<T> {
  results?: T[];
  success?: boolean;
}

interface TelemetryRow {
  id: number;
  event: string;
  version: string;
  command: string;
  os: string;
  arch: string;
  node_version: string;
  is_ci: number;
  ci_name: string | null;
  transport: string;
  session_id: string;
  timestamp: string;
  created_at: string;
  ci_provider: string | null;
  servers_scanned: number | null;
  tools_found: number | null;
  gate_result: string | null;
  execution_ms: number | null;
  security_flag: number;
  target_ids: string | null;
  installed_servers: string | null;
  git_email: string | null;
  git_remote_url: string | null;
  hostname: string | null;
  health_score: number | null;
  health_grade: string | null;
  prompts_found: number | null;
  resources_found: number | null;
  security_finding_count: number | null;
  connect_ms: number | null;
  fatal_error: string | null;
  server_commands: string | null;
  check_statuses: string | null;
  suggested_servers: string | null;
  detected_languages: string | null;
  detected_frameworks: string | null;
  org: string | null;
  contact: string | null;
  github_repository: string | null;
  github_workflow: string | null;
  github_run_id: string | null;
  github_run_number: string | null;
  github_event_name: string | null;
  github_ref: string | null;
  github_actor: string | null;
  is_first_party: number | null;
  telemetry_source: string | null;
  machineFingerprint: string | null;
  featureChain: string | null;
  commandSequence: string | null;
  stage: string | null;
  referrer: string | null;
  optedInEmail: string | null;
  firstContactChannel: string | null;
}

interface ExecFailure extends Error {
  stdout?: string;
  stderr?: string;
}

function argValue(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function parseWranglerJson<T>(stdout: string): T[] {
  const parsed = JSON.parse(stdout) as WranglerPage<T>[];
  const rows: T[] = [];
  for (const page of parsed) {
    if (page.success === false) {
      throw new Error("Wrangler D1 query failed.");
    }
    rows.push(...(page.results ?? []));
  }
  return rows;
}

async function firstExistingPath(candidates: string[]): Promise<string | undefined> {
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return undefined;
}

async function resolveWranglerConfig(): Promise<string> {
  const explicit = argValue("--wrangler-config") ?? process.env["MCP_OBSERVATORY_TELEMETRY_WRANGLER_CONFIG"];
  if (explicit) return explicit;

  const candidates = [
    path.resolve(process.cwd(), "../mcp-observatory-telemetry/wrangler.toml"),
  ];
  const home = process.env["HOME"];
  if (home) {
    candidates.push(path.join(home, "Documents/GitHub/mcp-observatory-telemetry/wrangler.toml"));
  }

  const found = await firstExistingPath(candidates);
  if (found) return found;

  throw new Error(
    "Could not find telemetry wrangler.toml. Pass --wrangler-config or set MCP_OBSERVATORY_TELEMETRY_WRANGLER_CONFIG.",
  );
}

async function d1Query<T>(
  wranglerConfig: string,
  databaseName: string,
  sql: string,
): Promise<T[]> {
  const args = [
    "wrangler",
    "d1",
    "execute",
    databaseName,
    "--remote",
    "--config",
    wranglerConfig,
    "--json",
    "--command",
    sql,
  ];
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const { stdout } = await execFileAsync("npx", args, {
        maxBuffer: 1024 * 1024 * 64,
      });
      return parseWranglerJson<T>(stdout);
    } catch (error) {
      if (attempt < maxAttempts) {
        await sleep(1000 * attempt);
        continue;
      }

      const failure = error as ExecFailure;
      const details = [
        failure.message,
        failure.stderr ? `stderr:\n${failure.stderr.trim()}` : undefined,
        failure.stdout ? `stdout:\n${failure.stdout.trim()}` : undefined,
      ].filter(Boolean);
      throw new Error(details.join("\n\n"), { cause: error });
    }
  }

  throw new Error("Wrangler D1 query failed without returning a result.");
}

async function main(): Promise<void> {
  const outDir = argValue("--out-dir") ?? "telemetry-exports";
  const output = argValue("--output") ?? path.join(outDir, "events-flat-full.json");
  const wranglerConfig = await resolveWranglerConfig();
  const databaseName =
    argValue("--database") ??
    process.env["MCP_OBSERVATORY_TELEMETRY_D1_DATABASE"] ??
    "mcp-observatory-telemetry";
  const since = argValue("--since");
  const where = since ? `WHERE created_at >= ${sqlString(since)}` : "";
  const sql = `
SELECT
  id, event, version, command, os, arch, node_version, is_ci, ci_name, transport,
  session_id, timestamp, created_at, ci_provider, servers_scanned, tools_found,
  gate_result, execution_ms, security_flag, target_ids, installed_servers,
  git_email, git_remote_url, hostname, health_score, health_grade, prompts_found,
  resources_found, security_finding_count, connect_ms, fatal_error,
  server_commands, check_statuses, suggested_servers, detected_languages,
  detected_frameworks, org, contact,
  github_repository, github_workflow, github_run_id, github_run_number,
  github_event_name, github_ref, github_actor, is_first_party, telemetry_source,
  machineFingerprint, featureChain, commandSequence, stage, referrer,
  optedInEmail, firstContactChannel
FROM events
${where}
ORDER BY id ASC`;

  const rows = await d1Query<TelemetryRow>(wranglerConfig, databaseName, sql);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(rows, null, 2) + "\n", "utf8");

  const firstSeen = rows[0]?.created_at ?? "n/a";
  const lastSeen = rows.at(-1)?.created_at ?? "n/a";
  process.stdout.write(`Exported ${rows.length} telemetry rows to ${output}\n`);
  process.stdout.write(`First seen: ${firstSeen}\n`);
  process.stdout.write(`Last seen: ${lastSeen}\n`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
