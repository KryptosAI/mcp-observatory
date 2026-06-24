import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ingestTelemetryRows, openDatabase, renderDashboardHtml } from "../scripts/metrics-dashboard.js";
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
        dailyEvents: [{ day: "2026-06-21", events: 2, sessions: 2 }],
        topCommands: [{ command: "scan", events: 1, sessions: 1 }],
        topDomains: [{ domain: "acme.example", events: 1, sessions: 1 }],
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
        daily: [{ day: "2026-06-21", clones: 10, uniqueCloners: 7, views: 20, uniqueViewers: 11 }],
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
        daily: [{ day: "2026-06-20", downloads: 10 }],
      },
      sourceRuns: [],
      recentFailures: [],
    });

    expect(html).toContain("MCP Observatory Local Metrics");
    expect(html).toContain("Acquisition");
    expect(html).toContain("Downloads");
    expect(html).toContain("Usage");
    expect(html).toContain("acme.example");
    expect(html).toContain("npm downloads");
    expect(html).not.toContain("analyst@");
    expect(html).not.toContain("git_email");
    expect(html).not.toContain("serverCommands");
  });
});
