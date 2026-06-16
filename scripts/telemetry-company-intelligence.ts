import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

interface TelemetryRow {
  session_id?: string;
  sessionId?: string;
  git_email?: string | null;
  gitEmail?: string | null;
  git_remote_url?: string | null;
  gitRemoteUrl?: string | null;
  hostname?: string | null;
  ci_provider?: string | null;
  ciProvider?: string | null;
  command?: string | null;
  target_ids?: string | null;
  targetIds?: string[] | string | null;
  installed_servers?: string | null;
  installedServers?: string[] | string | null;
  server_commands?: string | null;
  serverCommands?: string[] | string | null;
  created_at?: string | null;
  timestamp?: string | null;
}

interface Account {
  domain: string;
  evidence: Set<string>;
  events: number;
  sessions: Set<string>;
  commands: Set<string>;
  targets: Set<string>;
  firstSeen?: string;
  lastSeen?: string;
}

interface AccountOutput {
  company_domain: string;
  evidence: string;
  event_count: number;
  unique_sessions: number;
  commands_used: string;
  targets_seen: string;
  confidence: "high" | "medium" | "low";
  tier_recommendation: "Strategic" | "Enterprise" | "Business" | "Team" | "Unknown";
  outreach_status: "not_contacted";
  first_seen: string;
  last_seen: string;
}

const FREE_EMAIL_DOMAINS = new Set([
  "aol.com",
  "duck.com",
  "fastmail.com",
  "gmail.com",
  "googlemail.com",
  "hey.com",
  "hotmail.com",
  "icloud.com",
  "live.com",
  "mail.com",
  "me.com",
  "msn.com",
  "outlook.com",
  "pm.me",
  "proton.me",
  "protonmail.com",
  "yahoo.com",
]);

const STRATEGIC_DOMAINS = new Set([
  "adobe.com",
  "amazon.com",
  "anthropic.com",
  "apple.com",
  "atlassian.com",
  "google.com",
  "ibm.com",
  "meta.com",
  "microsoft.com",
  "netflix.com",
  "nvidia.com",
  "openai.com",
  "oracle.com",
  "salesforce.com",
  "stripe.com",
  "tesla.com",
]);

function argValue(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function splitList(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    // Fall through to comma-separated parsing.
  }
  return trimmed.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function normalizeDomain(raw: string): string | undefined {
  const domain = raw.trim().toLowerCase().replace(/^www\./, "");
  if (!domain.includes(".")) return undefined;
  if (FREE_EMAIL_DOMAINS.has(domain)) return undefined;
  if (domain.endsWith(".local") || domain.endsWith(".localhost")) return undefined;
  return domain;
}

function emailDomain(email: string | null | undefined): string | undefined {
  if (!email) return undefined;
  const at = email.lastIndexOf("@");
  if (at === -1) return undefined;
  return normalizeDomain(email.slice(at + 1));
}

function remoteOrgOrDomain(remote: string | null | undefined): string | undefined {
  if (!remote) return undefined;
  const raw = remote.trim();
  try {
    const url = new URL(raw.replace(/^git@([^:]+):/, "ssh://git@$1/"));
    const host = normalizeDomain(url.hostname);
    const parts = url.pathname.split("/").filter(Boolean);
    if (host === "github.com" && parts[0]) return `github:${parts[0].toLowerCase()}`;
    return host;
  } catch {
    const match = raw.match(/git@([^:]+):([^/]+)\//);
    if (match?.[1] === "github.com" && match[2]) return `github:${match[2].toLowerCase()}`;
  }
  return undefined;
}

function hostnameDomain(hostname: string | null | undefined): string | undefined {
  if (!hostname) return undefined;
  const parts = hostname.toLowerCase().split(".").filter(Boolean);
  if (parts.length < 2) return undefined;
  return normalizeDomain(parts.slice(-2).join("."));
}

function parseRows(raw: string): TelemetryRow[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) return JSON.parse(trimmed) as TelemetryRow[];
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { results?: TelemetryRow[]; rows?: TelemetryRow[]; events?: TelemetryRow[] };
      return parsed.results ?? parsed.rows ?? parsed.events ?? [parsed as TelemetryRow];
    } catch {
      // Fall through to JSONL parsing.
    }
  }
  return trimmed.split(/\r?\n/).map((line) => JSON.parse(line) as TelemetryRow);
}

function touch(account: Account, row: TelemetryRow, evidence: string[]): void {
  account.events += 1;
  for (const item of evidence) account.evidence.add(item);
  const session = row.session_id ?? row.sessionId;
  if (session) account.sessions.add(session);
  if (row.command) account.commands.add(row.command);
  for (const target of splitList(row.target_ids ?? row.targetIds)) account.targets.add(target);
  for (const server of splitList(row.installed_servers ?? row.installedServers)) account.targets.add(server);
  const seen = row.created_at ?? row.timestamp ?? "";
  if (seen) {
    if (!account.firstSeen || seen < account.firstSeen) account.firstSeen = seen;
    if (!account.lastSeen || seen > account.lastSeen) account.lastSeen = seen;
  }
}

function confidence(account: Account): "high" | "medium" | "low" {
  if (account.sessions.size >= 3 || account.events >= 25) return "high";
  if (account.sessions.size >= 2 || account.events >= 8) return "medium";
  return "low";
}

function tier(account: Account): AccountOutput["tier_recommendation"] {
  if (STRATEGIC_DOMAINS.has(account.domain)) return "Strategic";
  if (account.domain.startsWith("github:")) {
    if (account.events >= 25 || account.sessions.size >= 3) return "Enterprise";
    if (account.events >= 8) return "Business";
    return "Team";
  }
  if (account.events >= 50 || account.sessions.size >= 5) return "Enterprise";
  if (account.events >= 15 || account.sessions.size >= 2) return "Business";
  return "Team";
}

function toOutput(account: Account): AccountOutput {
  return {
    company_domain: account.domain,
    evidence: [...account.evidence].sort().join(";"),
    event_count: account.events,
    unique_sessions: account.sessions.size,
    commands_used: [...account.commands].sort().slice(0, 20).join(";"),
    targets_seen: [...account.targets].sort().slice(0, 30).join(";"),
    confidence: confidence(account),
    tier_recommendation: tier(account),
    outreach_status: "not_contacted",
    first_seen: account.firstSeen ?? "",
    last_seen: account.lastSeen ?? "",
  };
}

function csvEscape(value: string | number): string {
  const s = String(value);
  if (!/[",\n]/.test(s)) return s;
  return `"${s.replaceAll("\"", "\"\"")}"`;
}

function renderCsv(rows: AccountOutput[]): string {
  const headers = [
    "company_domain",
    "evidence",
    "event_count",
    "unique_sessions",
    "commands_used",
    "targets_seen",
    "confidence",
    "tier_recommendation",
    "outreach_status",
    "first_seen",
    "last_seen",
  ] as const;
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n") + "\n";
}

async function main(): Promise<void> {
  const input = argValue("--input");
  const outDir = argValue("--out-dir") ?? "reports";
  if (!input) {
    process.stderr.write("Usage: tsx scripts/telemetry-company-intelligence.ts --input <events.json|events.jsonl> [--out-dir reports]\n");
    process.exitCode = 1;
    return;
  }

  const rows = parseRows(await readFile(input, "utf8"));
  const accounts = new Map<string, Account>();

  function accountFor(domain: string): Account {
    let account = accounts.get(domain);
    if (!account) {
      account = { domain, evidence: new Set(), events: 0, sessions: new Set(), commands: new Set(), targets: new Set() };
      accounts.set(domain, account);
    }
    return account;
  }

  for (const row of rows) {
    const signals = [
      { domain: emailDomain(row.git_email ?? row.gitEmail), evidence: "git_email_domain" },
      { domain: remoteOrgOrDomain(row.git_remote_url ?? row.gitRemoteUrl), evidence: "git_remote_url" },
      { domain: hostnameDomain(row.hostname), evidence: "hostname_domain" },
    ];

    const rowAccounts = new Map<string, string[]>();
    for (const signal of signals) {
      if (!signal.domain) continue;
      const evidence = rowAccounts.get(signal.domain) ?? [];
      evidence.push(signal.evidence);
      rowAccounts.set(signal.domain, evidence);
    }

    for (const [domain, evidence] of rowAccounts) {
      touch(accountFor(domain), row, evidence);
    }
  }

  const outputs = [...accounts.values()]
    .map(toOutput)
    .sort((a, b) => b.event_count - a.event_count || b.unique_sessions - a.unique_sessions || a.company_domain.localeCompare(b.company_domain));

  await mkdir(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "telemetry-company-intelligence.json");
  const csvPath = path.join(outDir, "telemetry-company-intelligence.csv");
  await writeFile(jsonPath, JSON.stringify(outputs, null, 2) + "\n", "utf8");
  await writeFile(csvPath, renderCsv(outputs), "utf8");

  process.stdout.write(`Analyzed ${rows.length} telemetry rows.\n`);
  process.stdout.write(`Identified ${outputs.length} company/org candidates.\n`);
  process.stdout.write(`Wrote ${jsonPath}\n`);
  process.stdout.write(`Wrote ${csvPath}\n`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
