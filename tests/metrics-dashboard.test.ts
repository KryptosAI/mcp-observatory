import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { browserSecurityHeaders, ingestTelemetryRows, openDatabase, renderDashboardHtml } from "../scripts/metrics-dashboard.js";
import type { TelemetryRow } from "../scripts/telemetry-company-intelligence.js";

const tempDirs: string[] = [];

async function tempDb() {
  const dir = await mkdtemp(path.join(tmpdir(), "mcp-observatory-metrics-test-"));
  tempDirs.push(dir);
  const db = openDatabase(path.join(dir, "observatory.sqlite"));
  return { dir, db };
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("local metrics dashboard", () => {
  it("upserts telemetry rows instead of duplicating them", async () => {
    const { db } = await tempDb();
    const rows: TelemetryRow[] = [
      {
        session_id: "s1",
        command: "scan",
        git_email: "analyst@acme.example",
        created_at: "2026-06-21T10:00:00.000Z",
        transport: "cli",
      },
    ];

    expect(ingestTelemetryRows(db, rows)).toEqual({ rowsSeen: 1, rowsInserted: 1 });
    expect(ingestTelemetryRows(db, rows)).toEqual({ rowsSeen: 1, rowsInserted: 0 });
    expect(db.prepare("SELECT COUNT(*) AS count FROM telemetry_events").get()).toMatchObject({ count: 1 });
    db.close();
  });

  it("renders sanitized dashboard HTML without raw telemetry identifiers", () => {
    const html = renderDashboardHtml({
      generatedAt: "2026-06-21T12:00:00.000Z",
      dbPath: "/tmp/observatory.sqlite",
      telemetry: {
        totalEvents: 2,
        totalSessions: 2,
        externalSessions: 1,
        firstPartyCiSessions: 1,
        latestExternalSeen: "2026-06-21T10:00:00.000Z",
        events7: 2,
        eventsPrevious7: 1,
        sessions7: 2,
        sessionsPrevious7: 1,
        sourceCounts: [{ source: "external_ci", events: 1, sessions: 1 }],
        marketEvents: 1,
        marketSessions: 1,
        dailyEvents: [
          { day: "2026-05-21", events: 2, sessions: 2 },
          { day: "2026-06-21", events: 5, sessions: 5 },
        ],
        dailyMarketEvents: [
          { day: "2026-05-21", events: 1, sessions: 1 },
          { day: "2026-06-21", events: 4, sessions: 4 },
        ],
        dailySourceMix: [
          { day: "2026-05-21", events: 2, localSessions: 0, externalCiSessions: 1, firstPartyCiSessions: 1, mcpSessions: 0 },
          { day: "2026-06-21", events: 5, localSessions: 0, externalCiSessions: 4, firstPartyCiSessions: 1, mcpSessions: 0 },
        ],
        dailyMarketSourceMix: [
          { day: "2026-05-21", events: 1, localSessions: 0, externalCiSessions: 1, mcpSessions: 0 },
          { day: "2026-06-21", events: 4, localSessions: 0, externalCiSessions: 4, mcpSessions: 0 },
        ],
        topCommands: [{ command: "scan", events: 1, sessions: 1 }],
        topDomains: [{ domain: "acme.example", events: 1, sessions: 1 }],
        topDomainDetails: [{ domain: "acme.example", events: 1, sessions: 1, topCommand: "scan", latestSeen: "2026-06-21T10:00:00.000Z" }],
        versionAdoption: [
          { version: "0.24.0", events: 1, sessions: 1, sessionShare: 50, isLatest: true },
          { version: "0.23.0", events: 1, sessions: 1, sessionShare: 50, isLatest: false },
        ],
        versionHealth: {
          latestVersion: "0.24.0",
          latestSessions: 1,
          staleSessions: 1,
          staleSessionShare: 50,
          staleVersions: [{ version: "0.23.0", events: 1, sessions: 1 }],
        },
        dailyMarketVersionAdoption: [
          { day: "2026-05-21", totalSessions: 1, latestSessions: 0, latestEvents: 0, latestSessionShare: 0, dominantVersion: "0.23.0" },
          { day: "2026-06-21", totalSessions: 4, latestSessions: 2, latestEvents: 2, latestSessionShare: 50, dominantVersion: "0.24.0" },
        ],
        commandFunnel: [
          { stage: "Agent install", commands: "serve", events: 1, sessions: 1, recommendation: "Scale agent setup docs." },
          { stage: "CI setup", commands: "init-ci, setup-ci", events: 0, sessions: 0, recommendation: "Make setup-ci louder." },
          { stage: "Attack simulation", commands: "attack-sim", events: 1, sessions: 1, recommendation: "Push receipts." },
          { stage: "Receipts", commands: "receipt, audit --receipt", events: 1, sessions: 1, recommendation: "Turn scans into portable proof." },
          { stage: "Paid intent", commands: "cloud, cloud-upload, enterprise-report", events: 0, sessions: 0, recommendation: "Follow up." },
        ],
        dailyMarketCommandFunnel: [
          { day: "2026-05-21", agentInstallSessions: 1, attackSimSessions: 0, ciSarifSessions: 0, receiptSessions: 0, riskGraphSessions: 0, validationSessions: 1, regressionSessions: 0, ciSetupSessions: 0, paidIntentSessions: 0 },
          { day: "2026-06-21", agentInstallSessions: 2, attackSimSessions: 1, ciSarifSessions: 1, receiptSessions: 1, riskGraphSessions: 1, validationSessions: 3, regressionSessions: 0, ciSetupSessions: 1, paidIntentSessions: 0 },
        ],
        dailyDirectionSignals: [
          { metric: "Market sessions", current: 4, previous: 1, deltaLabel: "+300%", direction: "up", context: "2026-06-21", nextAction: "Amplify the source that changed." },
          { metric: "Receipt sessions", current: 1, previous: 0, deltaLabel: "new", direction: "up", context: "2026-06-21", nextAction: "Use receipts in maintainer conversations." },
        ],
        funnelConversions: [
          { name: "Attack-sim to receipt", numerator: 1, denominator: 1, rate: 100, context: "Are findings turning into portable proof?" },
        ],
        dataQualitySignals: [
          { label: "Telemetry freshness", status: "ok", detail: "Latest external event 1h ago." },
          { label: "Version adoption", status: "warn", detail: "One stale session remains." },
        ],
      },
      github: {
        stars: 5,
        forks: 1,
        watchers: 2,
        openIssues: 3,
        openPullRequests: 4,
        latestRelease: "v0.23.0",
        latestReleasePublishedAt: "2026-06-21T00:00:00.000Z",
        clones14: 10,
        uniqueCloners14: 7,
        views14: 20,
        uniqueViewers14: 11,
        clones7: 10,
        clonesPrevious7: 5,
        views7: 20,
        viewsPrevious7: 10,
        daily: [
          { day: "2026-05-21", clones: 10, uniqueCloners: 7, views: 20, uniqueViewers: 11 },
          { day: "2026-06-21", clones: 4, uniqueCloners: 3, views: 22, uniqueViewers: 12 },
        ],
        referrers: [{ referrer: "github.com", count: 5, uniques: 3 }],
        paths: [{ path: "/KryptosAI/mcp-observatory", title: "Repo", count: 8, uniques: 6 }],
        workflowRuns: [{ name: "CI", status: "completed", conclusion: "success", updatedAt: "2026-06-21T00:00:00.000Z" }],
      },
      npm: {
        downloads7: 70,
        downloads14: 140,
        downloads30: 300,
        downloadsPrevious7: 35,
        downloadsPrevious30: 150,
        latestDay: "2026-06-20",
        daily: [
          { day: "2026-05-20", downloads: 5 },
          { day: "2026-06-20", downloads: 10 },
        ],
      },
      sourceRuns: [],
      recentFailures: [],
    });

    expect(html).toContain("MCP Observatory Local Metrics");
    expect(html).toContain("MCP Observatory ASCII art logo");
    expect(html).toContain("███╗   ███╗");
    expect(html).toContain("O B S E R V A T O R Y");
    expect(html).toContain("Adoption Pulse");
    expect(html).toContain("Evidence search");
    expect(html).toContain("Search evidence");
    expect(html).toContain("External Sessions");
    expect(html).toContain("Weekly Sessions");
    expect(html).toContain("KPI Momentum");
    expect(html).toContain("Growth Command Center");
    expect(html).toContain("What Changed Today");
    expect(html).toContain("Conversion Readiness");
    expect(html).toContain("Data Quality");
    expect(html).toContain("Attack-sim sessions");
    expect(html).toContain("Receipt sessions");
    expect(html).toContain("Risk-graph sessions");
    expect(html).toContain("SARIF setup");
    expect(html).toContain("month over month · all time");
    expect(html).toContain("Latest Version Adoption");
    expect(html).toContain("KPI momentum");
    expect(html).toContain("Usage Over Time");
    expect(html).toContain("Monthly change");
    expect(html).toContain("Setup conversion");
    expect(html).toContain("data-search-row");
    expect(html).not.toContain("Market Sessions By Source");
    expect(html).not.toContain("Market Funnel By Day");
    expect(html).not.toContain("Market Usage Trend");
    expect(html).not.toContain("Market Daily Trend");
    expect(html).not.toContain("Market Timeline Details");
    expect(html).not.toContain("Source Mix By Day");
    expect(html).not.toContain('<span class="logo">⌁</span>');
    expect(html).not.toContain("logo-art");
    expect(html).toContain("Command funnel");
    expect(html).toContain("Latest adoption");
    expect(html).toContain("Clone/download to CI");
    expect(html.indexOf("Latest Version Adoption", html.indexOf("KPI Momentum"))).toBeLessThan(html.indexOf("GitHub Clones", html.indexOf("KPI Momentum")));
    expect(html).toContain("acme.example");
    expect(html).toContain("npm daily");
    expect(html).not.toContain("analyst@");
    expect(html).not.toContain("git_email");
    expect(html).not.toContain("serverCommands");
  });

  it("serves the local dashboard with defensive browser headers", () => {
    expect(browserSecurityHeaders("text/html; charset=utf-8")).toMatchObject({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    });
    expect(browserSecurityHeaders("text/html; charset=utf-8")["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(browserSecurityHeaders("text/html; charset=utf-8")["Content-Security-Policy"]).toContain("connect-src 'self'");
    expect(browserSecurityHeaders("application/json; charset=utf-8")["Content-Security-Policy"]).toBeUndefined();
  });
});
