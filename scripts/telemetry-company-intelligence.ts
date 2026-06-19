import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export interface TelemetryRow {
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
  github_repository?: string | null;
  githubRepository?: string | null;
  github_workflow?: string | null;
  githubWorkflow?: string | null;
  github_run_id?: string | null;
  githubRunId?: string | null;
  github_run_number?: string | null;
  githubRunNumber?: string | null;
  github_event_name?: string | null;
  githubEventName?: string | null;
  github_ref?: string | null;
  githubRef?: string | null;
  github_actor?: string | null;
  githubActor?: string | null;
  is_first_party?: number | boolean | null;
  isFirstParty?: boolean | null;
  telemetry_source?: UsageCategory | null;
  telemetrySource?: UsageCategory | null;
  transport?: string | null;
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

export interface AccountOutput {
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

export type UsageCategory = "first_party_ci" | "external_ci" | "local" | "mcp" | "unknown";

export interface UsageSummary {
  generated_at: string;
  total_events: number;
  total_sessions: number;
  external_events: number;
  external_sessions: number;
  first_party_ci_events: number;
  first_party_ci_sessions: number;
  external_ci_events: number;
  external_ci_sessions: number;
  attributed_company_events: number;
  attributed_company_sessions: number;
  unattributed_local_events: number;
  unattributed_local_sessions: number;
  internal_personal_events: number;
  internal_personal_sessions: number;
  attributed_domains_count: number;
  latest_external_seen: string;
  top_external_commands: Array<{ command: string; events: number; sessions: number }>;
  top_attributed_accounts: Array<{ company_domain: string; event_count: number; unique_sessions: number }>;
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

const FIRST_PARTY_GITHUB_REPOSITORY = "kryptosai/mcp-observatory";

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

function sanitizeTarget(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\/(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|localhost|127\.)/i.test(trimmed)) {
    return "[private-network-target]";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return `${url.protocol}//${url.hostname}/...`;
    } catch {
      return "[url-target]";
    }
  }
  return trimmed;
}

function normalizeDomain(raw: string): string | undefined {
  const domain = raw.trim().toLowerCase().replace(/^www\./, "");
  if (!domain.includes(".")) return undefined;
  if (domain.split(".").every((part) => /^\d+$/.test(part))) return undefined;
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

function sessionId(row: TelemetryRow): string | undefined {
  return row.session_id ?? row.sessionId;
}

function seenAt(row: TelemetryRow): string {
  return row.created_at ?? row.timestamp ?? "";
}

function githubRepository(row: TelemetryRow): string | undefined {
  return (row.github_repository ?? row.githubRepository ?? undefined)?.trim().toLowerCase();
}

function rowIsFirstParty(row: TelemetryRow): boolean {
  if (row.is_first_party === 1 || row.is_first_party === true || row.isFirstParty === true) return true;
  if ((row.telemetry_source ?? row.telemetrySource) === "first_party_ci") return true;
  return githubRepository(row) === FIRST_PARTY_GITHUB_REPOSITORY;
}

function rowIsCi(row: TelemetryRow): boolean {
  const ciProvider = row.ci_provider ?? row.ciProvider;
  return row.is_ci === 1 || row.is_ci === true || row.isCI === true || Boolean(ciProvider);
}

export function classifyUsageRow(row: TelemetryRow): UsageCategory {
  const explicit = row.telemetry_source ?? row.telemetrySource;
  if (explicit && ["first_party_ci", "external_ci", "local", "mcp", "unknown"].includes(explicit)) {
    return explicit;
  }
  if (rowIsFirstParty(row)) return "first_party_ci";
  if (rowIsCi(row)) return "external_ci";
  if (row.transport === "mcp") return "mcp";
  if (row.transport === "cli" || !row.transport) return "local";
  return "unknown";
}

function rowDomains(row: TelemetryRow): Array<{ domain: string; evidence: string }> {
  return [
    { domain: emailDomain(row.git_email ?? row.gitEmail), evidence: "git_email_domain" },
    { domain: orgDomain(row.org), evidence: "declared_org" },
    { domain: emailDomain(row.contact), evidence: "declared_contact_domain" },
    { domain: remoteOrgOrDomain(row.git_remote_url ?? row.gitRemoteUrl), evidence: "git_remote_url" },
    { domain: hostnameDomain(row.hostname), evidence: "hostname_domain" },
  ].filter((signal): signal is { domain: string; evidence: string } => Boolean(signal.domain));
}

function hasExternalAttribution(row: TelemetryRow): boolean {
  return rowDomains(row).some((signal) => !INTERNAL_DOMAINS.has(signal.domain));
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
  for (const target of splitList(row.target_ids ?? row.targetIds)) account.targets.add(sanitizeTarget(target));
  for (const server of splitList(row.installed_servers ?? row.installedServers)) account.targets.add(sanitizeTarget(server));
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

function addSession(set: Set<string>, row: TelemetryRow): void {
  const session = sessionId(row);
  if (session) set.add(session);
}

function incrementCommand(
  map: Map<string, { events: number; sessions: Set<string> }>,
  row: TelemetryRow,
): void {
  const command = row.command ?? "unknown";
  const bucket = map.get(command) ?? { events: 0, sessions: new Set<string>() };
  bucket.events += 1;
  addSession(bucket.sessions, row);
  map.set(command, bucket);
}

export function buildUsageSummary(rows: TelemetryRow[], accounts: AccountOutput[]): UsageSummary {
  const totalSessions = new Set<string>();
  const externalSessions = new Set<string>();
  const firstPartyCiSessions = new Set<string>();
  const externalCiSessions = new Set<string>();
  const attributedCompanySessions = new Set<string>();
  const unattributedLocalSessions = new Set<string>();
  const internalPersonalSessions = new Set<string>();
  const topExternalCommands = new Map<string, { events: number; sessions: Set<string> }>();

  let externalEvents = 0;
  let firstPartyCiEvents = 0;
  let externalCiEvents = 0;
  let attributedCompanyEvents = 0;
  let unattributedLocalEvents = 0;
  let internalPersonalEvents = 0;
  let latestExternalSeen = "";

  for (const row of rows) {
    addSession(totalSessions, row);
    const category = classifyUsageRow(row);
    const isFirstParty = rowIsFirstParty(row);
    const isInternal = rowDomains(row).some((signal) => INTERNAL_DOMAINS.has(signal.domain));
    const isAttributedCompany = hasExternalAttribution(row);
    const isExternal = !isFirstParty && category !== "first_party_ci" && !isInternal;

    if (category === "first_party_ci") {
      firstPartyCiEvents += 1;
      addSession(firstPartyCiSessions, row);
    }

    if (category === "external_ci") {
      externalCiEvents += 1;
      addSession(externalCiSessions, row);
    }

    if (isAttributedCompany && isExternal) {
      attributedCompanyEvents += 1;
      addSession(attributedCompanySessions, row);
    }

    if ((category === "local" || category === "mcp" || category === "unknown") && !isAttributedCompany && !isInternal) {
      unattributedLocalEvents += 1;
      addSession(unattributedLocalSessions, row);
    }

    if (isInternal) {
      internalPersonalEvents += 1;
      addSession(internalPersonalSessions, row);
    }

    if (isExternal) {
      externalEvents += 1;
      addSession(externalSessions, row);
      incrementCommand(topExternalCommands, row);
      const seen = seenAt(row);
      if (seen && seen > latestExternalSeen) latestExternalSeen = seen;
    }
  }

  return {
    generated_at: new Date().toISOString(),
    total_events: rows.length,
    total_sessions: totalSessions.size,
    external_events: externalEvents,
    external_sessions: externalSessions.size,
    first_party_ci_events: firstPartyCiEvents,
    first_party_ci_sessions: firstPartyCiSessions.size,
    external_ci_events: externalCiEvents,
    external_ci_sessions: externalCiSessions.size,
    attributed_company_events: attributedCompanyEvents,
    attributed_company_sessions: attributedCompanySessions.size,
    unattributed_local_events: unattributedLocalEvents,
    unattributed_local_sessions: unattributedLocalSessions.size,
    internal_personal_events: internalPersonalEvents,
    internal_personal_sessions: internalPersonalSessions.size,
    attributed_domains_count: accounts.length,
    latest_external_seen: latestExternalSeen,
    top_external_commands: [...topExternalCommands.entries()]
      .map(([command, stats]) => ({ command, events: stats.events, sessions: stats.sessions.size }))
      .sort((a, b) => b.events - a.events || a.command.localeCompare(b.command))
      .slice(0, 20),
    top_attributed_accounts: accounts
      .slice(0, 20)
      .map((account) => ({
        company_domain: account.company_domain,
        event_count: account.event_count,
        unique_sessions: account.unique_sessions,
      })),
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

function htmlEscape(value: string | number): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function renderUsageSummaryHtml(summary: UsageSummary): string {
  const generatedAt = summary.generated_at;
  const metric = (label: string, value: string | number): string =>
    `<div class="metric"><strong>${htmlEscape(value)}</strong><span>${htmlEscape(label)}</span></div>`;
  const commandRows = summary.top_external_commands
    .map((row) => `<tr><td>${htmlEscape(row.command)}</td><td>${row.events}</td><td>${row.sessions}</td></tr>`)
    .join("\n          ");
  const accountRows = summary.top_attributed_accounts
    .map((row) => `<tr><td>${htmlEscape(row.company_domain)}</td><td>${row.event_count}</td><td>${row.unique_sessions}</td></tr>`)
    .join("\n          ");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MCP Observatory Usage Summary</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; color: #17202a; background: #f7f8fb; }
    main { max-width: 1180px; margin: 0 auto; padding: 32px 20px 48px; }
    h1 { margin: 0 0 8px; font-size: 28px; letter-spacing: 0; }
    h2 { margin: 28px 0 12px; font-size: 18px; letter-spacing: 0; }
    .meta { color: #5a6675; margin-bottom: 24px; }
    .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px; }
    .metric { background: #fff; border: 1px solid #dfe5ee; border-radius: 8px; padding: 14px 16px; }
    .metric strong { display: block; font-size: 24px; }
    .metric span { color: #5a6675; font-size: 13px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .table-wrap { overflow-x: auto; background: #fff; border: 1px solid #dfe5ee; border-radius: 8px; }
    table { border-collapse: collapse; width: 100%; font-size: 13px; }
    th, td { border-bottom: 1px solid #edf1f6; padding: 10px 12px; text-align: left; }
    th { background: #eef3f8; font-size: 12px; text-transform: uppercase; color: #425166; }
    tr:last-child td { border-bottom: 0; }
    @media (max-width: 760px) { .summary, .grid { grid-template-columns: 1fr; } main { padding: 20px 12px 36px; } }
  </style>
</head>
<body>
  <main>
    <h1>MCP Observatory Usage Summary</h1>
    <div class="meta">Generated ${htmlEscape(generatedAt)}. First-party CI is separated from external usage.</div>
    <section class="summary" aria-label="Summary">
      ${metric("total events", summary.total_events)}
      ${metric("total sessions", summary.total_sessions)}
      ${metric("external events", summary.external_events)}
      ${metric("external sessions", summary.external_sessions)}
      ${metric("first-party CI events", summary.first_party_ci_events)}
      ${metric("first-party CI sessions", summary.first_party_ci_sessions)}
      ${metric("external CI events", summary.external_ci_events)}
      ${metric("external CI sessions", summary.external_ci_sessions)}
      ${metric("attributed company events", summary.attributed_company_events)}
      ${metric("attributed company sessions", summary.attributed_company_sessions)}
      ${metric("unattributed local events", summary.unattributed_local_events)}
      ${metric("latest external seen", summary.latest_external_seen || "n/a")}
    </section>
    <section class="grid">
      <div>
        <h2>Top External Commands</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Command</th><th>Events</th><th>Sessions</th></tr></thead>
            <tbody>${commandRows || "<tr><td colspan=\"3\">No external commands found.</td></tr>"}</tbody>
          </table>
        </div>
      </div>
      <div>
        <h2>Top Attributed Accounts</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Account</th><th>Events</th><th>Sessions</th></tr></thead>
            <tbody>${accountRows || "<tr><td colspan=\"3\">No attributed accounts found.</td></tr>"}</tbody>
          </table>
        </div>
      </div>
    </section>
  </main>
</body>
</html>
`;
}

function renderHtml(rows: AccountOutput[], summary: UsageSummary): string {
  const strategic = rows.filter((row) => row.tier_recommendation === "Strategic").length;
  const enterprise = rows.filter((row) => row.tier_recommendation === "Enterprise").length;
  const highConfidence = rows.filter((row) => row.confidence === "high").length;
  const generatedAt = summary.generated_at;
  const cells = (row: AccountOutput): string => [
    row.company_domain,
    row.tier_recommendation,
    row.confidence,
    row.event_count,
    row.unique_sessions,
    row.ci_events,
    row.production_signals,
    row.commands_used,
    row.targets_seen,
    row.evidence,
    row.first_seen,
    row.last_seen,
  ].map((value) => `<td>${htmlEscape(value)}</td>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MCP Observatory Telemetry Intelligence</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; color: #17202a; background: #f7f8fb; }
    main { max-width: 1320px; margin: 0 auto; padding: 32px 20px 48px; }
    h1 { margin: 0 0 8px; font-size: 28px; letter-spacing: 0; }
    .meta { color: #5a6675; margin-bottom: 24px; }
    .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px; }
    .metric { background: #fff; border: 1px solid #dfe5ee; border-radius: 8px; padding: 14px 16px; }
    .metric strong { display: block; font-size: 24px; }
    .metric span { color: #5a6675; font-size: 13px; }
    .table-wrap { overflow-x: auto; background: #fff; border: 1px solid #dfe5ee; border-radius: 8px; }
    table { border-collapse: collapse; width: 100%; min-width: 1180px; font-size: 13px; }
    th, td { border-bottom: 1px solid #edf1f6; padding: 10px 12px; text-align: left; vertical-align: top; }
    th { position: sticky; top: 0; background: #eef3f8; font-size: 12px; text-transform: uppercase; color: #425166; }
    td:nth-child(1), td:nth-child(2), td:nth-child(3) { white-space: nowrap; }
    tr:last-child td { border-bottom: 0; }
    @media (max-width: 760px) { .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); } main { padding: 20px 12px 36px; } }
  </style>
</head>
<body>
  <main>
    <h1>MCP Observatory Telemetry Intelligence</h1>
    <div class="meta">Generated ${htmlEscape(generatedAt)}. Raw emails are excluded from this report. First-party CI is excluded from external account rankings.</div>
    <section class="summary" aria-label="Summary">
      <div class="metric"><strong>${rows.length}</strong><span>company/org candidates</span></div>
      <div class="metric"><strong>${strategic}</strong><span>strategic accounts</span></div>
      <div class="metric"><strong>${enterprise}</strong><span>enterprise accounts</span></div>
      <div class="metric"><strong>${highConfidence}</strong><span>high-confidence accounts</span></div>
      <div class="metric"><strong>${summary.external_events}</strong><span>external events</span></div>
      <div class="metric"><strong>${summary.external_sessions}</strong><span>external sessions</span></div>
      <div class="metric"><strong>${summary.first_party_ci_events}</strong><span>first-party CI events</span></div>
      <div class="metric"><strong>${summary.unattributed_local_sessions}</strong><span>unattributed local sessions</span></div>
    </section>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Company/Org</th>
            <th>Tier</th>
            <th>Confidence</th>
            <th>Events</th>
            <th>Sessions</th>
            <th>CI</th>
            <th>Production Signals</th>
            <th>Commands</th>
            <th>Targets</th>
            <th>Evidence</th>
            <th>First Seen</th>
            <th>Last Seen</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `<tr>${cells(row)}</tr>`).join("\n          ")}
        </tbody>
      </table>
    </div>
  </main>
</body>
</html>
`;
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
    if (!includeInternal && classifyUsageRow(row) === "first_party_ci") continue;
    const signals = rowDomains(row);

    const rowAccounts = new Map<string, string[]>();
    for (const signal of signals) {
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

  const summary = buildUsageSummary(rows, outputs);

  await mkdir(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "telemetry-company-intelligence.json");
  const csvPath = path.join(outDir, "telemetry-company-intelligence.csv");
  const htmlPath = path.join(outDir, "telemetry-company-intelligence.html");
  const summaryJsonPath = path.join(outDir, "telemetry-usage-summary.json");
  const summaryHtmlPath = path.join(outDir, "telemetry-usage-summary.html");
  await writeFile(jsonPath, JSON.stringify(outputs, null, 2) + "\n", "utf8");
  await writeFile(csvPath, renderCsv(outputs), "utf8");
  await writeFile(htmlPath, renderHtml(outputs, summary), "utf8");
  await writeFile(summaryJsonPath, JSON.stringify(summary, null, 2) + "\n", "utf8");
  await writeFile(summaryHtmlPath, renderUsageSummaryHtml(summary), "utf8");

  process.stdout.write(`Analyzed ${rows.length} telemetry rows.\n`);
  process.stdout.write(`Identified ${outputs.length} company/org candidates.\n`);
  process.stdout.write(`External sessions: ${summary.external_sessions}; first-party CI sessions: ${summary.first_party_ci_sessions}.\n`);
  process.stdout.write(`Wrote ${jsonPath}\n`);
  process.stdout.write(`Wrote ${csvPath}\n`);
  process.stdout.write(`Wrote ${htmlPath}\n`);
  process.stdout.write(`Wrote ${summaryJsonPath}\n`);
  process.stdout.write(`Wrote ${summaryHtmlPath}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
