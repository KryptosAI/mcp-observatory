import { describe, expect, it } from "vitest";
import { buildUsageSummary, classifyUsageRow, type AccountOutput, type TelemetryRow } from "../scripts/telemetry-company-intelligence.js";

function account(domain: string, events: number, sessions: number): AccountOutput {
  return {
    company_domain: domain,
    evidence: "git_email_domain",
    event_count: events,
    unique_sessions: sessions,
    commands_used: "run",
    targets_seen: "internal-mcp",
    ci_events: 0,
    production_signals: "",
    confidence: "medium",
    tier_recommendation: "Business",
    outreach_status: "not_contacted",
    first_seen: "2026-06-18T00:00:00.000Z",
    last_seen: "2026-06-18T00:00:00.000Z",
  };
}

describe("telemetry intelligence usage classification", () => {
  it("classifies explicit and legacy telemetry rows", () => {
    expect(classifyUsageRow({
      telemetry_source: "first_party_ci",
      session_id: "s1",
    })).toBe("first_party_ci");
    expect(classifyUsageRow({
      github_repository: "KryptosAI/mcp-observatory",
      ci_provider: "github-actions",
      session_id: "s2",
    })).toBe("first_party_ci");
    expect(classifyUsageRow({
      githubRepository: "Acme/private-mcp",
      ciProvider: "github-actions",
      sessionId: "s3",
    })).toBe("external_ci");
    expect(classifyUsageRow({
      transport: "mcp",
      session_id: "s4",
    })).toBe("mcp");
    expect(classifyUsageRow({
      transport: "cli",
      session_id: "s5",
    })).toBe("local");
  });

  it("separates first-party CI from external usage totals", () => {
    const rows: TelemetryRow[] = [
      {
        session_id: "first-party-1",
        command: "run",
        ci_provider: "github-actions",
        github_repository: "KryptosAI/mcp-observatory",
        is_first_party: 1,
        telemetry_source: "first_party_ci",
        created_at: "2026-06-18T00:00:00.000Z",
      },
      {
        session_id: "external-ci-1",
        command: "ci-report",
        ci_provider: "github-actions",
        github_repository: "Acme/private-mcp",
        git_email: "owner@acme.com",
        telemetry_source: "external_ci",
        created_at: "2026-06-18T01:00:00.000Z",
      },
      {
        session_id: "company-local-1",
        command: "scan",
        git_email: "dev@examplecorp.com",
        transport: "cli",
        created_at: "2026-06-18T02:00:00.000Z",
      },
      {
        session_id: "unattributed-1",
        command: "serve",
        transport: "cli",
        created_at: "2026-06-18T03:00:00.000Z",
      },
      {
        session_id: "internal-1",
        command: "run",
        git_email: "william@banksey.com",
        transport: "cli",
        created_at: "2026-06-18T04:00:00.000Z",
      },
    ];

    const summary = buildUsageSummary(rows, [account("acme.com", 1, 1), account("examplecorp.com", 1, 1)]);
    expect(summary.total_events).toBe(5);
    expect(summary.total_sessions).toBe(5);
    expect(summary.first_party_ci_events).toBe(1);
    expect(summary.first_party_ci_sessions).toBe(1);
    expect(summary.external_ci_events).toBe(1);
    expect(summary.external_ci_sessions).toBe(1);
    expect(summary.external_events).toBe(3);
    expect(summary.external_sessions).toBe(3);
    expect(summary.attributed_company_events).toBe(2);
    expect(summary.attributed_company_sessions).toBe(2);
    expect(summary.unattributed_local_events).toBe(1);
    expect(summary.unattributed_local_sessions).toBe(1);
    expect(summary.internal_personal_events).toBe(1);
    expect(summary.latest_external_seen).toBe("2026-06-18T03:00:00.000Z");
    expect(summary.top_external_commands.map((row) => row.command).sort()).toEqual(["ci-report", "scan", "serve"]);
    expect(JSON.stringify(summary)).not.toContain("@");
  });
});
