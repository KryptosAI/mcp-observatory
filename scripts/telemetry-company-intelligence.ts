import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

interface TelemetryRow {
  session_id?: string;
  sessionId?: string;
  org?: string | null;
  contact?: string | null;
  git_email?: string | null;
  gitEmail?: string | null;
  git_remote_url?: string | null;
  gitRemoteUrl?: string | null;
  hostname?: string | null;
  ci_provider?: string | null;
  ciProvider?: string | null;
  is_ci?: number | boolean | null;
  isCI?: boolean | null;
  command?: string | null;
  target_ids?: string | null;
  targetIds?: string[] | string | null;
  installed_servers?: string | null;
  installedServers?: string[] | string | null;
  server_commands?: string | null;
  serverCommands?: string[] | string | null;
  security_finding_count?: number | null;
  securityFindingCount?: number | null;
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
  ciEvents: number;
  securityEvents: number;
  privateSignals: Set<string>;
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
  ci_events: number;
  production_signals: string;
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

const INTERNAL_DOMAINS = new Set([
  "banksey.com",
  "example.com",
  "github:kryptosai",
  "kryptosai.com",
]);

function argValue(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
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

function orgDomain(org: string | null | undefined): string | undefined {
  if (!org) return undefined;
  const normalized = org.trim().toLowerCase();
  if (!normalized) return undefined;
  const domain = normalizeDomain(normalized);
  if (domain) return domain;
  const slug = normalized.replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return slug ? `org:${slug}` : undefined;
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
  const ciProvider = row.ci_provider ?? row.ciProvider;
  const isCi = row.is_ci === 1 || row.is_ci === true || row.isCI === true || Boolean(ciProvider);
  if (isCi) {
    account.ciEvents += 1;
    account.privateSignals.add(ciProvider ? `ci:${ciProvider}` : "ci");
  }
  const command = row.command ?? "";
  if (command === "ci-report" || command === "watch") account.privateSignals.add(`command:${command}`);
  const targetText = [
    ...splitList(row.target_ids ?? row.targetIds),
    ...splitList(row.server_commands ?? row.serverCommands),
  ].join(" ");
  if (/https?:\/\/(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|localhost|127\.)/i.test(targetText)) {
    account.privateSignals.add("private-network-target");
  }
  if (command.includes("security") || row.security_finding_count || row.securityFindingCount) {
    account.securityEvents += 1;
    account.privateSignals.add("security-scan");
  }
  const seen = row.created_at ?? row.timestamp ?? "";
  if (seen) {
    if (!account.firstSeen || seen < account.firstSeen) account.firstSeen = seen;
    if (!account.lastSeen || seen > account.lastSeen) account.lastSeen = seen;
  }
}

function confidence(account: Account): "high" | "medium" | "low" {
  if (account.privateSignals.size >= 2 && account.sessions.size >= 2) return "high";
  if (account.sessions.size >= 3 || account.events >= 25) return "high";
  if (account.sessions.size >= 2 || account.events >= 8) return "medium";
  return "low";
}

function tier(account: Account): AccountOutput["tier_recommendation"] {
  if (STRATEGIC_DOMAINS.has(account.domain)) return "Strategic";
  if (account.privateSignals.has("private-network-target") && account.events >= 25) return "Enterprise";
  if (account.ciEvents >= 10 && account.sessions.size >= 2) return "Enterprise";
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
    ci_events: account.ciEvents,
    production_signals: [...account.privateSignals].sort().join(";"),
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
    "ci_events",
    "production_signals",
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

function rank(row: AccountOutput): number {
  const confidenceScore = row.confidence === "high" ? 1000 : row.confidence === "medium" ? 500 : 0;
  const tierScore = row.tier_recommendation === "Strategic"
    ? 2000
    : row.tier_recommendation === "Enterprise"
      ? 1500
      : row.tier_recommendation === "Business"
        ? 700
        : row.tier_recommendation === "Team"
          ? 200
          : 0;
  const productionScore = row.production_signals ? 400 : 0;
  return tierScore + confidenceScore + productionScore + row.event_count + row.unique_sessions * 5 + row.ci_events * 2;
}

async function main(): Promise<void> {
  const input = argValue("--input");
  const outDir = argValue("--out-dir") ?? "reports";
  const includeInternal = hasFlag("--include-internal");
  if (!input) {
    process.stderr.write("Usage: tsx scripts/telemetry-company-intelligence.ts --input <events.json|events.jsonl> [--out-dir reports] [--include-internal]\n");
    process.exitCode = 1;
    return;
  }

  const rows = parseRows(await readFile(input, "utf8"));
  const accounts = new Map<string, Account>();

  function accountFor(domain: string): Account {
    let account = accounts.get(domain);
    if (!account) {
      account = {
        domain,
        evidence: new Set(),
        events: 0,
        sessions: new Set(),
        commands: new Set(),
        targets: new Set(),
        ciEvents: 0,
        securityEvents: 0,
        privateSignals: new Set(),
      };
      accounts.set(domain, account);
    }
    return account;
  }

  for (const row of rows) {
    const signals = [
      { domain: emailDomain(row.git_email ?? row.gitEmail), evidence: "git_email_domain" },
      { domain: orgDomain(row.org), evidence: "declared_org" },
      { domain: emailDomain(row.contact), evidence: "declared_contact_domain" },
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

  const accountValues = includeInternal
    ? [...accounts.values()]
    : [...accounts.values()].filter((account) => !INTERNAL_DOMAINS.has(account.domain));

  const outputs = accountValues
    .map(toOutput)
    .sort((a, b) =>
      rank(b) - rank(a) ||
      a.company_domain.localeCompare(b.company_domain),
    );

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
