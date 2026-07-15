import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_PATH =
  "/Users/williamweishuhn/Documents/New project/mcp-observatory/.mcp-observatory-metrics/observatory.sqlite";
const OUTPUT_DIR = join(__dirname, '..', '.mcp-observatory-metrics', 'dashboard', 'analytics');

function query(sql: string): any[] {
  const out = execFileSync('sqlite3', ['-json', DB_PATH, sql], {
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024,
  });
  return JSON.parse(out);
}

function writeJson(filename: string, data: unknown) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = join(OUTPUT_DIR, filename);
  writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`  wrote ${outPath}`);
}

// ---------------------------------------------------------------------------
// 1. Conversion Funnel — sessions per event type (command_run, command_complete, tool_call)
// ---------------------------------------------------------------------------
function conversionFunnel() {
  const rows = query(`
    SELECT event AS stage, COUNT(DISTINCT session_id) AS sessions
    FROM telemetry_events
    GROUP BY event
    ORDER BY sessions DESC
  `);

  const result: Record<string, number> = {};
  for (const r of rows) result[r.stage] = r.sessions;
  writeJson('conversion-funnel.json', result);
}

// ---------------------------------------------------------------------------
// 2. Most Scanned Servers — top 20 target_ids extracted from raw_json
// ---------------------------------------------------------------------------
function topServers() {
  const rows = query(`
    SELECT
      json_extract(raw_json, '$.target_ids') AS target_server,
      COUNT(*) AS scans,
      AVG(json_extract(raw_json, '$.health_score')) AS avg_score
    FROM telemetry_events
    WHERE json_extract(raw_json, '$.target_ids') IS NOT NULL
    GROUP BY target_server
    ORDER BY scans DESC
    LIMIT 20
  `);
  writeJson('top-servers.json', rows);
}

// ---------------------------------------------------------------------------
// 3. Power Users — sessions with >50 events (excludes first-party)
// ---------------------------------------------------------------------------
function powerUsers() {
  const rows = query(`
    SELECT session_id, COUNT(*) AS events, MIN(timestamp) AS first, MAX(timestamp) AS last
    FROM telemetry_events
    WHERE is_first_party = 0
    GROUP BY session_id
    HAVING events > 50
    ORDER BY events DESC
    LIMIT 20
  `);
  writeJson('power-users.json', rows);
}

// ---------------------------------------------------------------------------
// 4. Enterprise Signals — sessions that ran audit, setup-ci, or enforce
// ---------------------------------------------------------------------------
function enterpriseSignals() {
  const rows = query(`
    SELECT
      session_id,
      COUNT(*) AS events,
      MAX(CASE WHEN command = 'audit' THEN 1 ELSE 0 END) AS ran_audit,
      MAX(CASE WHEN command = 'setup-ci' THEN 1 ELSE 0 END) AS ran_ci_setup,
      MAX(CASE WHEN command = 'enforce' THEN 1 ELSE 0 END) AS ran_enforce
    FROM telemetry_events
    WHERE is_first_party = 0
    GROUP BY session_id
    HAVING ran_audit = 1 OR ran_ci_setup = 1 OR ran_enforce = 1
    ORDER BY events DESC
    LIMIT 30
  `);
  writeJson('enterprise-signals.json', rows);
}

// ---------------------------------------------------------------------------
// 5. Daily Active Users — DAU trend (last 30 days)
// ---------------------------------------------------------------------------
function dailyActivity() {
  const rows = query(`
    SELECT DATE(timestamp) AS day, COUNT(DISTINCT session_id) AS daus
    FROM telemetry_events
    WHERE is_first_party = 0
    GROUP BY day
    ORDER BY day DESC
    LIMIT 30
  `);
  writeJson('daily-activity.json', rows);
}

// ---------------------------------------------------------------------------
// 6. Weekly Growth Rate — sessions per ISO week
// ---------------------------------------------------------------------------
function weeklyGrowth() {
  const rows = query(`
    SELECT strftime('%Y-W%W', timestamp) AS week, COUNT(DISTINCT session_id) AS sessions
    FROM telemetry_events
    WHERE is_first_party = 0
    GROUP BY week
    ORDER BY week DESC
    LIMIT 12
  `);
  writeJson('weekly-growth.json', rows);
}

// ---------------------------------------------------------------------------
// 7. Enforce Adoption — daily enforce usage trend (last 14 days)
// ---------------------------------------------------------------------------
function enforceAdoption() {
  const rows = query(`
    SELECT DATE(timestamp) AS day, COUNT(DISTINCT session_id) AS sessions, COUNT(*) AS enforce_calls
    FROM telemetry_events
    WHERE command = 'enforce' AND is_first_party = 0
    GROUP BY day
    ORDER BY day DESC
    LIMIT 14
  `);
  writeJson('enforce-adoption.json', rows);
}

// ---------------------------------------------------------------------------
// 8. Finding Distribution — severity / health by target server
// ---------------------------------------------------------------------------
function findingDistribution() {
  const rows = query(`
    SELECT
      json_extract(raw_json, '$.target_ids') AS target_server,
      json_extract(raw_json, '$.security_finding_count') AS findings,
      AVG(json_extract(raw_json, '$.health_score')) AS avg_health,
      COUNT(*) AS scans
    FROM telemetry_events
    WHERE json_extract(raw_json, '$.target_ids') IS NOT NULL
    GROUP BY target_server, findings
    ORDER BY scans DESC
    LIMIT 20
  `);
  writeJson('finding-distribution.json', rows);
}

// ---------------------------------------------------------------------------
// Run all
// ---------------------------------------------------------------------------
console.log('Telemetry Analytics — generating reports...\n');

conversionFunnel();
topServers();
powerUsers();
enterpriseSignals();
dailyActivity();
weeklyGrowth();
enforceAdoption();
findingDistribution();

const counts = query(`SELECT COUNT(*) AS total FROM telemetry_events`);
console.log(`\nDone. ${counts[0].total.toLocaleString()} events analysed.`);
