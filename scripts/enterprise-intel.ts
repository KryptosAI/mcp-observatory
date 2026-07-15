import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DEFAULT_DB = path.resolve(process.cwd(), ".mcp-observatory-metrics", "observatory.sqlite");
const DB_PATH = process.env["MCP_OBS_METRICS_DB"] ?? DEFAULT_DB;
const OUT_DIR = process.env["MCP_OBS_OUT_DIR"] ?? path.resolve(process.cwd(), ".mcp-observatory-metrics", "dashboard", "analytics");
const OUT_FILE = path.join(OUT_DIR, "business-intel.json");

interface LeadRow {
  session_id: string;
  events: number;
  lead_score: number;
  has_audit: number;
  has_setup_ci: number;
  has_enterprise_report: number;
  target_count: number;
  all_target_count: number;
  has_ci_provider: number;
  ci_provider: string | null;
  latest_timestamp: string;
}

interface TierGroup {
  count: number;
  sessions: string[];
}

interface CompetitiveRow {
  target: string;
  avg_score: string;
  scans: number;
}

interface RetentionRow {
  active_7d: number;
  active_30d: number;
  total: number;
}

interface BusinessIntel {
  generated_at: string;
  lead_pipeline: {
    tier1_enterprise: { count: number; mrr_per: number; total: number };
    tier2_team: { count: number; mrr_per: number; total: number };
    tier3_conversion: { count: number };
    tier4_free: { count: number };
  };
  mrr_potential: number;
  retention: { active_7d: number; active_30d: number; total: number };
  competitive_opportunities: Array<{ server: string; avg_score: number; scans: number }>;
  top_leads: Array<{
    session_id: string;
    lead_score: number;
    events: number;
    signals: string[];
  }>;
  tier_groups: {
    tier1_enterprise: TierGroup;
    tier2_team: TierGroup;
    tier3_conversion: TierGroup;
    tier4_free: TierGroup;
  };
}

function openDb(dbPath: string): DatabaseSync {
  if (!existsSync(dbPath)) {
    throw new Error(`Database not found: ${dbPath}`);
  }
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  return db;
}

function extractSignals(row: LeadRow): string[] {
  const signals: string[] = [];
  if (row.has_audit) signals.push("audit");
  if (row.has_setup_ci) signals.push("setup-ci");
  if (row.has_enterprise_report) signals.push("enterprise-report");
  if (row.has_ci_provider) signals.push(`ci:${row.ci_provider}`);
  if (row.events > 50) signals.push("power-user");
  if (row.target_count >= 3) signals.push("3+ score targets");
  if (row.all_target_count >= 5) signals.push("5+ scanned servers");
  return signals;
}

function classifyTier(score: number): 1 | 2 | 3 | 4 {
  if (score >= 60) return 1;
  if (score >= 30) return 2;
  if (score >= 11) return 3;
  return 4;
}

function runLeadScoring(db: DatabaseSync): LeadRow[] {
  const sql = `
    SELECT
      e.session_id,
      COUNT(*) AS events,
      MAX(CASE WHEN e.command = 'audit' THEN 1 ELSE 0 END) * 20 +
      MAX(CASE WHEN e.command = 'setup-ci' THEN 1 ELSE 0 END) * 25 +
      MAX(CASE WHEN e.command = 'enterprise-report' THEN 1 ELSE 0 END) * 15 +
      CASE WHEN COUNT(DISTINCT CASE WHEN e.command = 'score' THEN json_extract(e.raw_json, '$.target_ids') END) >= 3 THEN 10 ELSE 0 END +
      CASE WHEN COUNT(*) > 50 THEN 10 ELSE 0 END +
      CASE WHEN MAX(e.ci_provider) IS NOT NULL AND MAX(e.ci_provider) != '' THEN 10 ELSE 0 END +
      CASE WHEN COUNT(DISTINCT json_extract(e.raw_json, '$.target_ids')) >= 5 THEN 10 ELSE 0 END
      AS lead_score,
      MAX(CASE WHEN e.command = 'audit' THEN 1 ELSE 0 END) AS has_audit,
      MAX(CASE WHEN e.command = 'setup-ci' THEN 1 ELSE 0 END) AS has_setup_ci,
      MAX(CASE WHEN e.command = 'enterprise-report' THEN 1 ELSE 0 END) AS has_enterprise_report,
      COUNT(DISTINCT CASE WHEN e.command = 'score' THEN json_extract(e.raw_json, '$.target_ids') END) AS target_count,
      COUNT(DISTINCT json_extract(e.raw_json, '$.target_ids')) AS all_target_count,
      CASE WHEN MAX(e.ci_provider) IS NOT NULL AND MAX(e.ci_provider) != '' THEN 1 ELSE 0 END AS has_ci_provider,
      MAX(e.ci_provider) AS ci_provider,
      MAX(e.timestamp) AS latest_timestamp
    FROM telemetry_events e
    WHERE e.is_first_party = 0
    GROUP BY e.session_id
    HAVING lead_score > 0
    ORDER BY lead_score DESC
    LIMIT 50
  `;

  const stmt = db.prepare(sql);
  const rows = stmt.all() as unknown as LeadRow[];
  return rows;
}

function runRetention(db: DatabaseSync): RetentionRow {
  const sql = `
    SELECT
      COUNT(DISTINCT CASE WHEN last_seen >= date('now', '-7 days') THEN session_id END) AS active_7d,
      COUNT(DISTINCT CASE WHEN last_seen >= date('now', '-30 days') THEN session_id END) AS active_30d,
      COUNT(DISTINCT session_id) AS total
    FROM (
      SELECT session_id, MAX(DATE(timestamp)) AS last_seen
      FROM telemetry_events
      WHERE is_first_party = 0
      GROUP BY session_id
    )
  `;

  const stmt = db.prepare(sql);
  const rows = stmt.all() as unknown as RetentionRow[];
  const row = rows[0];
  if (!row) return { active_7d: 0, active_30d: 0, total: 0 };

  return {
    active_7d: row.active_7d,
    active_30d: row.active_30d,
    total: row.total,
  };
}

function runCompetitiveIntel(db: DatabaseSync): CompetitiveRow[] {
  const sql = `
    SELECT
      json_extract(raw_json, '$.target_ids') AS target,
      AVG(health_score) AS avg_score,
      COUNT(*) AS scans
    FROM telemetry_events
    WHERE is_first_party = 0
      AND health_score IS NOT NULL
      AND json_extract(raw_json, '$.target_ids') IS NOT NULL
      AND json_extract(raw_json, '$.target_ids') != ''
    GROUP BY json_extract(raw_json, '$.target_ids')
    HAVING avg_score < 70 AND scans > 5
    ORDER BY avg_score ASC
    LIMIT 10
  `;

  const stmt = db.prepare(sql);
  const rows = stmt.all() as unknown as CompetitiveRow[];
  return rows;
}

function runTotalExternalSessions(db: DatabaseSync): number {
  const stmt = db.prepare(
    "SELECT COUNT(DISTINCT session_id) AS total FROM telemetry_events WHERE is_first_party = 0"
  );
  const rows = stmt.all() as unknown as Array<{ total: number }>;
  return rows[0]?.total ?? 0;
}

function buildIntel(): BusinessIntel {
  console.log(`Connecting to database: ${DB_PATH}`);
  const db = openDb(DB_PATH);

  console.log("Phase 1: Lead Scoring...");
  const leads = runLeadScoring(db);
  console.log(`  Found ${leads.length} qualified leads`);

  console.log("Phase 2: Pricing Simulation...");
  const tier1Sessions: string[] = [];
  const tier2Sessions: string[] = [];
  const tier3Sessions: string[] = [];
  const tier4Sessions: string[] = [];

  let tier1Count = 0;
  let tier2Count = 0;
  let tier3Count = 0;

  for (const lead of leads) {
    const tier = classifyTier(lead.lead_score);
    if (tier === 1) { tier1Count++; tier1Sessions.push(lead.session_id); }
    else if (tier === 2) { tier2Count++; tier2Sessions.push(lead.session_id); }
    else if (tier === 3) { tier3Count++; tier3Sessions.push(lead.session_id); }
    else { tier4Sessions.push(lead.session_id); }
  }

  const totalExternal = runTotalExternalSessions(db);
  const allocatedToTiers = tier1Count + tier2Count + tier3Count + tier4Sessions.length;
  const tier4Count = Math.max(0, totalExternal - tier1Count - tier2Count - tier3Count - (tier4Sessions.length));

  const tier1MRR = tier1Count * 999;
  const tier2MRR = tier2Count * 299;
  const mrrPotential = tier1MRR + tier2MRR;

  console.log(`  Tier 1 (Enterprise): ${tier1Count} @ $999/mo = $${tier1MRR}`);
  console.log(`  Tier 2 (Team):       ${tier2Count} @ $299/mo = $${tier2MRR}`);
  console.log(`  Tier 3 (Conversion): ${tier3Count}`);
  console.log(`  Tier 4 (Free):       ${tier4Count}`);
  console.log(`  MRR Potential: $${mrrPotential}`);

  console.log("Phase 3: Retention Analysis...");
  const retention = runRetention(db);
  console.log(`  Active 7d: ${retention.active_7d}`);
  console.log(`  Active 30d: ${retention.active_30d}`);
  console.log(`  Total: ${retention.total}`);

  console.log("Phase 4: Competitive Intel...");
  const competitive = runCompetitiveIntel(db);
  console.log(`  Found ${competitive.length} competitive opportunities`);

  db.close();

  const topLeads = leads.slice(0, 20).map((lead) => ({
    session_id: lead.session_id,
    lead_score: lead.lead_score,
    events: lead.events,
    signals: extractSignals(lead),
  }));

  const competitiveOpportunities = competitive.map((c) => ({
    server: c.target,
    avg_score: Math.round(Number.parseFloat(c.avg_score)),
    scans: c.scans,
  }));

  return {
    generated_at: new Date().toISOString(),
    lead_pipeline: {
      tier1_enterprise: { count: tier1Count, mrr_per: 999, total: tier1MRR },
      tier2_team: { count: tier2Count, mrr_per: 299, total: tier2MRR },
      tier3_conversion: { count: tier3Count },
      tier4_free: { count: tier4Count },
    },
    mrr_potential: mrrPotential,
    retention: {
      active_7d: retention.active_7d,
      active_30d: retention.active_30d,
      total: retention.total,
    },
    competitive_opportunities: competitiveOpportunities,
    top_leads: topLeads,
    tier_groups: {
      tier1_enterprise: { count: tier1Count, sessions: tier1Sessions },
      tier2_team: { count: tier2Count, sessions: tier2Sessions },
      tier3_conversion: { count: tier3Count, sessions: tier3Sessions },
      tier4_free: { count: tier4Count, sessions: tier4Sessions },
    },
  };
}

if (process.argv[1] && (process.argv[1].endsWith("enterprise-intel.ts") || process.argv[1].endsWith("enterprise-intel.js"))) {
  (async () => {
    try {
      const intel = buildIntel();

      await mkdir(OUT_DIR, { recursive: true });
      await writeFile(OUT_FILE, JSON.stringify(intel, null, 2), "utf-8");

      console.log(`\nPhase 5: Output written to ${OUT_FILE}`);
      console.log("\n=== Business Intelligence Summary ===");
      console.log(`MRR Potential: $${intel.mrr_potential}`);
      console.log(`Enterprise Leads: ${intel.lead_pipeline.tier1_enterprise.count}`);
      console.log(`Team Leads: ${intel.lead_pipeline.tier2_team.count}`);
      console.log(`Active 7d: ${intel.retention.active_7d}`);
      console.log(`Active 30d: ${intel.retention.active_30d}`);
      console.log(`Total External Sessions: ${intel.retention.total}`);

      if (intel.top_leads.length > 0) {
        console.log("\nTop 5 Enterprise Leads:");
        for (const lead of intel.top_leads.slice(0, 5)) {
          console.log(`  ${lead.session_id.slice(0, 12)}... score=${lead.lead_score} events=${lead.events} signals=[${lead.signals.join(", ")}]`);
        }
      }

      if (intel.competitive_opportunities.length > 0) {
        console.log("\nTop Competitive Opportunities:");
        for (const opp of intel.competitive_opportunities.slice(0, 5)) {
          console.log(`  ${opp.server.padEnd(45)} avg=${opp.avg_score} scans=${opp.scans}`);
        }
      }
    } catch (err) {
      console.error("Fatal error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  })();
}

export { buildIntel, runLeadScoring, runRetention, runCompetitiveIntel, classifyTier, extractSignals };
export type { BusinessIntel, LeadRow, RetentionRow, CompetitiveRow, TierGroup };
