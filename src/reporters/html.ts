import type { CheckResult, DiffArtifact, DiffEntry, PermissionDeltaEntry, RunArtifact, SchemaDriftEntry } from "../types.js";
import { summarizeDiffSafety, summarizeRunSafety } from "./common.js";

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusBadge(status: string): string {
  const colors: Record<string, string> = {
    pass: "#22c55e",
    fail: "#ef4444",
    partial: "#eab308",
    flaky: "#eab308",
    unsupported: "#6b7280",
    skipped: "#6b7280",
  };
  const bg = colors[status] ?? "#6b7280";
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:${bg};color:#fff;font-size:12px;font-weight:600">${esc(status)}</span>`;
}

function gateBadge(gate: string): string {
  const bg = gate === "pass" ? "#22c55e" : "#ef4444";
  return `<span style="display:inline-block;padding:4px 12px;border-radius:6px;background:${bg};color:#fff;font-size:14px;font-weight:700">${esc(gate).toUpperCase()}</span>`;
}

function verdictBadge(verdict: string): string {
  const bg = verdict === "Ready" ? "#22c55e" : verdict === "Needs review" ? "#eab308" : "#ef4444";
  return `<span style="display:inline-block;padding:4px 12px;border-radius:6px;background:${bg};color:#fff;font-size:14px;font-weight:700">${esc(verdict)}</span>`;
}

function checksTable(checks: CheckResult[]): string {
  const rows = checks.map((c) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${esc(c.id)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${statusBadge(c.status)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${c.durationMs.toFixed(0)}ms</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">${esc(c.message)}</td>
    </tr>`).join("");

  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead>
        <tr style="background:#f9fafb;text-align:left">
          <th style="padding:8px 12px;border-bottom:2px solid #e5e7eb">Check</th>
          <th style="padding:8px 12px;border-bottom:2px solid #e5e7eb">Status</th>
          <th style="padding:8px 12px;border-bottom:2px solid #e5e7eb">Duration</th>
          <th style="padding:8px 12px;border-bottom:2px solid #e5e7eb">Message</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function evidenceSection(checks: CheckResult[]): string {
  return checks.map((c) => {
    const items = c.evidence.flatMap((ev) => {
      const parts: string[] = [];
      if (ev.identifiers && ev.identifiers.length > 0) {
        parts.push(`<strong>Items:</strong> ${esc(ev.identifiers.join(", "))}`);
      }
      if (ev.diagnostics && ev.diagnostics.length > 0) {
        parts.push(`<strong>Diagnostics:</strong> ${esc(ev.diagnostics.join("; "))}`);
      }
      if (ev.schemas) {
        const count = Object.keys(ev.schemas).length;
        parts.push(`<strong>Schemas captured:</strong> ${count}`);
      }
      return parts;
    });
    if (items.length === 0) return "";
    return `
      <details style="margin:8px 0">
        <summary style="cursor:pointer;font-weight:600">${esc(c.id)} — ${esc(c.status)}</summary>
        <div style="padding:8px 16px;font-size:13px">${items.map((i) => `<p style="margin:4px 0">${i}</p>`).join("")}</div>
      </details>`;
  }).join("");
}

function diffTable(label: string, color: string, entries: DiffEntry[]): string {
  if (entries.length === 0) return "";
  const rows = entries.map((e) => `
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${esc(e.id)}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${esc(e.fromStatus ?? "n/a")}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${esc(e.toStatus ?? "n/a")}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">${esc(e.message)}</td>
    </tr>`).join("");

  return `
    <h3 style="color:${color};margin-top:24px">${esc(label)} (${entries.length})</h3>
    <table style="width:100%;border-collapse:collapse;margin:8px 0">
      <thead>
        <tr style="background:#f9fafb;text-align:left">
          <th style="padding:6px 12px;border-bottom:2px solid #e5e7eb">Check</th>
          <th style="padding:6px 12px;border-bottom:2px solid #e5e7eb">From</th>
          <th style="padding:6px 12px;border-bottom:2px solid #e5e7eb">To</th>
          <th style="padding:6px 12px;border-bottom:2px solid #e5e7eb">Message</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function schemaDriftSection(drift: SchemaDriftEntry[] | undefined): string {
  if (!drift || drift.length === 0) return "";
  const rows = drift.map((d) => `
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${esc(d.name)}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${esc(d.capability)}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">${esc(d.changes.join(", "))}</td>
    </tr>`).join("");

  return `
    <h3 style="color:#eab308;margin-top:24px">Schema Drift (${drift.length})</h3>
    <table style="width:100%;border-collapse:collapse;margin:8px 0">
      <thead>
        <tr style="background:#f9fafb;text-align:left">
          <th style="padding:6px 12px;border-bottom:2px solid #e5e7eb">Name</th>
          <th style="padding:6px 12px;border-bottom:2px solid #e5e7eb">Capability</th>
          <th style="padding:6px 12px;border-bottom:2px solid #e5e7eb">Changes</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function permissionDeltaSection(deltas: PermissionDeltaEntry[] | undefined): string {
  if (!deltas || deltas.length === 0) return "";
  const rows = deltas.map((d) => `
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${esc(d.risk)}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${esc(d.name)}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${esc(d.field ?? "n/a")}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">${esc(d.change)}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">${esc(d.reason)}</td>
    </tr>`).join("");

  return `
    <h3 style="color:#eab308;margin-top:24px">Permission Deltas (${deltas.length})</h3>
    <table style="width:100%;border-collapse:collapse;margin:8px 0">
      <thead>
        <tr style="background:#f9fafb;text-align:left">
          <th style="padding:6px 12px;border-bottom:2px solid #e5e7eb">Risk</th>
          <th style="padding:6px 12px;border-bottom:2px solid #e5e7eb">Name</th>
          <th style="padding:6px 12px;border-bottom:2px solid #e5e7eb">Field</th>
          <th style="padding:6px 12px;border-bottom:2px solid #e5e7eb">Change</th>
          <th style="padding:6px 12px;border-bottom:2px solid #e5e7eb">Reason</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderRunHtml(artifact: RunArtifact): string {
  const serverLabel = [artifact.target.serverName, artifact.target.serverVersion].filter(Boolean).join(" ") || "unknown";
  const safety = summarizeRunSafety(artifact);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>MCP Observatory — ${esc(artifact.target.targetId)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.5; color: #1f2937; max-width: 900px; margin: 0 auto; padding: 32px 16px; background: #fafafa; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    h2 { font-size: 18px; margin-top: 32px; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    .meta { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
    .meta span { margin-right: 16px; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 16px 0; }
    .fatal { background: #fef2f2; border-color: #fecaca; }
    pre { background: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 13px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>MCP Observatory Run Report</h1>
  <div class="meta">
    <span>${esc(artifact.createdAt)}</span>
    <span>Run: ${esc(artifact.runId)}</span>
  </div>

  <div class="card">
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">
      <div style="font-size:16px;font-weight:600">Gate: ${gateBadge(artifact.gate)}</div>
      <div style="font-size:16px;font-weight:600">Safety: ${verdictBadge(safety.verdict)}</div>
    </div>
    <p style="margin:0 0 12px;color:#374151">${esc(safety.reason)}</p>
    <div style="font-size:13px;margin-bottom:12px">
      <strong>Top risks:</strong> ${esc(safety.topRisks.join("; "))}<br>
      <strong>Next action:</strong> ${esc(safety.nextActions[0] ?? "")}<br>
      <strong>CI:</strong> <code>${esc(safety.ciCta)}</code>
    </div>
    <div style="font-size:13px;color:#6b7280">
      <div><strong>Target:</strong> ${esc(artifact.target.targetId)} (${esc(artifact.target.adapter)})</div>
      <div><strong>Server:</strong> ${esc(serverLabel)}</div>
      <div><strong>Command:</strong> <code>${esc(artifact.target.command)} ${esc(artifact.target.args.join(" "))}</code></div>
      <div><strong>Platform:</strong> ${esc(artifact.environment.platform)} · Node ${esc(artifact.environment.nodeVersion)}</div>
    </div>
  </div>

  ${artifact.fatalError ? `<div class="card fatal"><h3 style="color:#ef4444;margin-bottom:8px">Failure Diagnosis</h3><pre>${esc(artifact.fatalError)}</pre></div>` : ""}

  <h2>Capability Checks</h2>
  ${checksTable(artifact.checks)}

  <h2>Evidence</h2>
  ${evidenceSection(artifact.checks) || '<p style="color:#6b7280">No evidence captured.</p>'}

  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af">
    Generated by MCP Observatory v${esc(artifact.toolVersion)} · Schema ${esc(artifact.schemaVersion)}
  </div>
</body>
</html>`;
}

function renderDiffHtml(artifact: DiffArtifact): string {
  const safety = summarizeDiffSafety(artifact);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>MCP Observatory — Diff</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.5; color: #1f2937; max-width: 900px; margin: 0 auto; padding: 32px 16px; background: #fafafa; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    h2 { font-size: 18px; margin-top: 32px; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    .meta { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
    .meta span { margin-right: 16px; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 16px 0; }
    .stat { display: inline-block; text-align: center; margin-right: 24px; }
    .stat-num { font-size: 28px; font-weight: 700; }
    .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
  </style>
</head>
<body>
  <h1>MCP Observatory Diff Report</h1>
  <div class="meta">
    <span>${esc(artifact.createdAt)}</span>
    <span>Base: ${esc(artifact.baseRunId)}</span>
    <span>Head: ${esc(artifact.headRunId)}</span>
  </div>

  <div class="card">
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
      <div style="font-size:16px;font-weight:600">Gate: ${gateBadge(artifact.gate)}</div>
      <div style="font-size:16px;font-weight:600">Safety: ${verdictBadge(safety.verdict)}</div>
    </div>
    <p style="margin:0 0 12px;color:#374151">${esc(safety.reason)}</p>
    <div style="font-size:13px;margin-bottom:16px">
      <strong>Top risks:</strong> ${esc(safety.topRisks.join("; "))}<br>
      <strong>Next action:</strong> ${esc(safety.nextActions[0] ?? "")}
    </div>
    <div>
      <div class="stat"><div class="stat-num" style="color:#ef4444">${artifact.summary.regressions}</div><div class="stat-label">Regressions</div></div>
      <div class="stat"><div class="stat-num" style="color:#22c55e">${artifact.summary.recoveries}</div><div class="stat-label">Recoveries</div></div>
      <div class="stat"><div class="stat-num" style="color:#6b7280">${artifact.summary.unchanged}</div><div class="stat-label">Unchanged</div></div>
      <div class="stat"><div class="stat-num" style="color:#3b82f6">${artifact.summary.added}</div><div class="stat-label">Added</div></div>
      <div class="stat"><div class="stat-num" style="color:#f97316">${artifact.summary.removed}</div><div class="stat-label">Removed</div></div>
    </div>
  </div>

  ${diffTable("Regressions", "#ef4444", artifact.regressions)}
  ${diffTable("Recoveries", "#22c55e", artifact.recoveries)}
  ${diffTable("Unchanged", "#6b7280", artifact.unchanged)}
  ${schemaDriftSection(artifact.schemaDrift)}
  ${permissionDeltaSection(artifact.permissionDeltas)}

  ${artifact.regressions.length === 0 && artifact.recoveries.length === 0 && (!artifact.schemaDrift || artifact.schemaDrift.length === 0) && (!artifact.permissionDeltas || artifact.permissionDeltas.length === 0) && (!artifact.responseChanges || artifact.responseChanges.length === 0) ? '<p style="color:#6b7280;margin-top:24px">No regressions, recoveries, schema drift, permission deltas, or response changes detected.</p>' : ""}

  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af">
    Generated by MCP Observatory · Schema ${esc(artifact.schemaVersion)}
  </div>
</body>
</html>`;
}

export function renderHtml(artifact: RunArtifact | DiffArtifact): string {
  return artifact.artifactType === "run"
    ? renderRunHtml(artifact)
    : renderDiffHtml(artifact);
}
