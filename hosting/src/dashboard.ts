import { designPage } from "./ui/shell.js";
import type { AuthClaims } from "./auth.js";
import type { EntitlementSnapshot } from "./entitlements.js";
export interface RiskSnapshot {
  account: { id: number; label: string; plan: string; stripeCustomerId?: string } | null;
  entitlement: EntitlementSnapshot | null;
  billingStatus?: string;
  fleetScore: number;
  scannedServers: number;
  passing: number;
  failing: number;
  scansThisWeek: number;
  historyCount: number;
  lockedHistoryCount: number;
  servers: Array<{
    targetId: string;
    name: string;
    score: number;
    grade: string;
    gate: string;
    scannedAt: string;
    regression?: boolean;
    resultUrl?: string;
  }>;
  history: Array<{
    runId: string;
    targetId: string;
    score: number;
    grade: string;
    gate: string;
    scannedAt: string;
    source: string;
    isCi: boolean;
    regression: boolean;
    resultUrl: string;
  }>;
}

export interface ReportSnapshot {
  runId: string;
  targetId: string;
  gate: string;
  score: number;
  grade: string;
  scannedAt: string;
  checks: Array<{ id: string; status: string; message: string }>;
  downloadUrl?: string;
}


function esc(value: unknown): string {
  return (typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function shell(title: string, body: string, signedIn = false): string {
  const navigation = `<a class="cf-button" data-variant="quiet" href="/dashboard">History</a>${signedIn ? '<a class="cf-button" data-variant="quiet" href="/auth/logout">Sign out</a>' : ""}`;
  return designPage(esc(title), `<div class="obs-heading"><div><p class="cf-overline-s obs-muted">Hosted evidence</p><h1 class="cf-heading-2xl">${esc(title)}</h1><p class="obs-muted">Free and MIT licensed. Hosted source is included in the public project.</p></div><a class="cf-button" data-variant="primary" href="https://clearframecode.com/download/?utm_source=mcp-observatory&amp;utm_medium=selfhost&amp;utm_campaign=opensource">Get ClearFrame CLI or Mac</a></div>${body}<footer class="obs-footer"><p>ClearFrame has its own account and usage terms; Observatory works independently.</p><nav class="cf-row" aria-label="Deployment information"><a href="/terms">Use</a><a href="/privacy">Data</a><a href="https://github.com/KryptosAI/mcp-observatory">Source</a></nav></footer>`, navigation);
}
export function loginPage(_baseUrl: string): string {
  void _baseUrl;
  return shell("Your hosted evidence", '<p>This deployment stores private scan receipts for signed-in GitHub users. All features are free. <a href="/auth/login">Sign in with GitHub</a>, or run <code>mcp-observatory dashboard</code> for account-free local review.</p>');
}
export type DevicePageState = "missing" | "not-found" | "expired" | "approved" | "ready" | "connected";
export function deviceAuthPage(state: DevicePageState, code = ""): string {
  const body = state === "ready" ? `<p>Confirm this code matches your terminal: <strong>${esc(code)}</strong></p><a href="/auth/device/login?user_code=${encodeURIComponent(code)}">Connect this CLI with GitHub</a>` : state === "connected" || state === "approved" ? '<p>Connected. Return to the CLI. No receipt is uploaded until you run the upload command.</p>' : '<p>The code is missing, invalid, or expired. Start login again from the CLI.</p>';
  return shell("Connect MCP Observatory", body);
}
export function dashboardPage(claims: AuthClaims, risk: RiskSnapshot, _checkoutState?: string): string {
  void _checkoutState;
  const rows = risk.history.map(run => `<tr><td>${esc(run.targetId)}</td><td>${esc(run.scannedAt)}</td><td>${esc(run.gate)}</td><td>${esc(run.score)} (${esc(run.grade)})</td><td><a href="${esc(run.resultUrl)}">Report</a></td></tr>`).join("");
  return shell(risk.account?.label ?? claims.githubLogin ?? "Scan history", `<p>All retained history and downloads are free. New results are retained for ${esc(risk.entitlement?.limits.retentionDays ?? 90)} days. This deployment has resource limits; your local receipts have no service quota.</p><p>Upload from the CLI using this deployment's URL and your signed-in account. Keep the deployment URL configured for every cloud command.</p><div class="obs-scroll"><table><caption>Your retained scans</caption><thead><tr><th>Target</th><th>Scanned</th><th>Gate</th><th>Score</th><th>Evidence</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No retained receipts yet.</td></tr>'}</tbody></table></div>`, true);
}
export function reportPage(report: ReportSnapshot): string {
  const rows = report.checks.map(check => `<tr><td>${esc(check.id)}</td><td>${esc(check.status)}</td><td>${esc(check.message)}</td></tr>`).join("");
  return shell(report.targetId, `<p>${esc(report.gate)} · ${esc(report.score)} (${esc(report.grade)}) · ${esc(report.scannedAt)}</p><div class="obs-scroll"><table><caption>Observed checks</caption><thead><tr><th>Check</th><th>Status</th><th>Evidence</th></tr></thead><tbody>${rows}</tbody></table></div>${report.downloadUrl ? `<p><a href="${esc(report.downloadUrl)}">Download original JSON</a></p>` : ''}`, true);
}
export function termsPage(): string { return shell("Use", '<p>The software is MIT licensed and provided without warranty. Test only systems you are authorized to inspect. Findings are evidence, not a safety guarantee. Hosting operators set resource and retention policies and are responsible for their deployment.</p>'); }
export function privacyPage(): string { return shell("Your deployment, your data", '<p>This deployment stores GitHub identity, receipt contents, target metadata and service usage needed to authenticate users, isolate records and enforce capacity. No model calls or external analytics are included. The hosting operator controls storage and retention. New records default to 90 days; keep local backups and review evidence before upload.</p>'); }
