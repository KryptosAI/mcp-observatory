#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB="$ROOT/.mcp-observatory-metrics/observatory.sqlite"
DATA_FILE="$ROOT/docs/fleet-monitor-data.json"
HTML_FILE="$ROOT/docs/fleet-monitor.html"
SAFETY_TARGETS="$ROOT/docs/safety-index/targets.json"

echo "=== Building fleet monitor data ==="

if [ ! -f "$DB" ]; then
  echo "ERROR: SQLite database not found at $DB. Run 'npm run metrics:refresh' first."
  exit 1
fi

# Generate the fleet monitor data JSON
python3 - "$DB" "$SAFETY_TARGETS" "$DATA_FILE" <<'PYEOF'
import json, sqlite3, sys, os, datetime

db_path = sys.argv[1]
targets_path = sys.argv[2]
out_path = sys.argv[3]

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row

# Overview stats
overview = {}
cur = conn.execute("""
  SELECT
    (SELECT COUNT(*) FROM telemetry_events WHERE telemetry_source IN ('external_ci','local','mcp')) as total_events,
    (SELECT COUNT(DISTINCT session_id) FROM telemetry_events WHERE telemetry_source IN ('external_ci','local','mcp') AND created_at >= date('now')) as active_today,
    (SELECT COUNT(*) FROM npm_downloads WHERE day >= date('now', '-7 days')) as downloads_7d,
    (SELECT COUNT(*) FROM github_daily_metrics WHERE day >= date('now', '-7 days')) as clones_7d,
    (SELECT COUNT(DISTINCT session_id) FROM telemetry_events) as total_sessions,
    (SELECT ROUND(100.0 * COUNT(DISTINCT CASE WHEN is_ci = 1 THEN session_id END) / NULLIF(COUNT(DISTINCT session_id), 0), 1) FROM telemetry_events) as ci_adoption_pct,
    (SELECT COUNT(*) FROM telemetry_events WHERE command = 'risk-graph') as risk_graph_runs,
    (SELECT COUNT(*) FROM telemetry_events WHERE command = 'attack-sim') as attack_sim_runs
""")
row = cur.fetchone()
overview = dict(row)
servers_scanned_total = conn.execute(
    "SELECT COALESCE(SUM(CAST(json_extract(raw_json, '$.servers_scanned') AS INTEGER)), 0) FROM telemetry_events"
).fetchone()[0]
overview["total_servers_scanned"] = servers_scanned_total

# Top commands
top_commands = []
for row in conn.execute("""
  SELECT command, COUNT(*) as count
  FROM telemetry_events
  WHERE command IS NOT NULL AND command != ''
  GROUP BY command
  ORDER BY count DESC
  LIMIT 10
"""):
  top_commands.append({"command": row["command"], "count": row["count"]})

# Adoption trend (daily sessions)
adoption_trend = []
for row in conn.execute("""
  SELECT substr(created_at, 1, 10) as day, COUNT(DISTINCT session_id) as sessions
  FROM telemetry_events
  WHERE telemetry_source IN ('external_ci','local','mcp')
  GROUP BY day
  ORDER BY day ASC
"""):
  if row["day"]:
    adoption_trend.append({"day": row["day"], "sessions": row["sessions"]})

# Top servers by scan count
top_servers = []
for row in conn.execute("""
  SELECT github_repository, COUNT(*) as count
  FROM telemetry_events
  WHERE github_repository IS NOT NULL AND github_repository != ''
  GROUP BY github_repository
  ORDER BY count DESC
  LIMIT 10
"""):
  name = row["github_repository"].split("/")[-1] if "/" in row["github_repository"] else row["github_repository"]
  top_servers.append({"name": name, "repo": row["github_repository"], "count": row["count"]})

conn.close()

# Safety Index breakdown
safety_index = {"total_evaluated": 0, "ready": 0, "needs_review": 0, "unsafe": 0}
if os.path.exists(targets_path):
    with open(targets_path) as f:
        targets = json.load(f)
    safety_index["total_evaluated"] = len(targets)

    unsafe_keywords = [
        "command execution", "remote execution", "credential", "injection",
        "exfiltration", "obfuscation", "emotet", "ransomware", "backdoor",
        "remote shell", "arbitrary", "unauthorized", "privilege", "escape",
        "sandbox", "code execution", "shell access", "hijack", "spoof",
        "impersonation", "token theft"
    ]
    ready_keywords = [
        "reference compatibility", "compatibility", "documentation",
        "example", "sample", "tutorial", "hello world", "demo"
    ]

    for t in targets:
        risk = (t.get("riskClass", "") + " " + t.get("failureClass", "")).lower()
        is_unsafe = any(k in risk for k in unsafe_keywords)
        is_ready = any(k in risk for k in ready_keywords) and not is_unsafe
        if is_unsafe:
            safety_index["unsafe"] += 1
        elif is_ready:
            safety_index["ready"] += 1
        else:
            safety_index["needs_review"] += 1

data = {
    "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "overview": overview,
    "safety_index": safety_index,
    "adoption_trend": adoption_trend,
    "top_commands": top_commands,
    "top_servers": top_servers,
}

os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, "w") as f:
    json.dump(data, f, indent=2)

print(f"Data written to {out_path}")
print(f"  Total events: {overview['total_events']}")
print(f"  Active today: {overview['active_today']}")
print(f"  CI adoption: {overview['ci_adoption_pct']}%")
print(f"  Safety Index: {safety_index['total_evaluated']} servers (Ready: {safety_index['ready']}, Needs Review: {safety_index['needs_review']}, Unsafe: {safety_index['unsafe']})")
PYEOF

echo ""
echo "=== Copying HTML to docs/ ==="
echo "HTML is already at: $HTML_FILE"

echo ""
echo "=== Done ==="
echo "Data file: $DATA_FILE"
echo "HTML file: $HTML_FILE"
echo ""
echo "To deploy to gh-pages, run:"
echo "  git checkout gh-pages && cp docs/fleet-monitor.html docs/fleet-monitor-data.json . && git add fleet-monitor.html fleet-monitor-data.json && git commit -m \"deploy: fleet monitor update\" && git push origin gh-pages && git checkout main"
