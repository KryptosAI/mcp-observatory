import type { UsageEvent, CallEvent, ReportEvent } from "./events.js";

export interface UsageRequest {
  id: string; asked: string; provenance: ReportEvent["provenance"]; intent?: string;
  calls: CallEvent[]; reports: ReportEvent[]; missingCallIds: string[];
  outcome: "failure" | "success" | "unknown";
}
/** Group only explicit correlation and report links; never guess from timestamps or client IPs. */
export function usageRequests(events: UsageEvent[]): UsageRequest[] {
  const calls = events.filter((e): e is CallEvent => e.kind === "call");
  const reports = events.filter((e): e is ReportEvent => e.kind === "report");
  const parent = new Map(calls.map(c => [c.correlationId, c.correlationId]));
  const byId = new Map(calls.map(c => [c.id, c]));
  function root(id: string): string {
    const next = parent.get(id);
    if (!next || next === id) return id;
    const value = root(next); parent.set(id, value); return value;
  }
  for (const report of reports) {
    const ids = report.callIds.flatMap(id => byId.has(id) ? [byId.get(id)!.correlationId] : []);
    for (const id of ids.slice(1)) parent.set(root(id), root(ids[0]!));
  }
  const groups = new Map<string, { calls: CallEvent[]; reports: ReportEvent[] }>();
  for (const call of calls) {
    const id = root(call.correlationId);
    if (!groups.has(id)) groups.set(id, { calls: [], reports: [] });
    groups.get(id)!.calls.push(call);
  }
  for (const report of reports) {
    const call = report.callIds.flatMap(id => byId.has(id) ? [byId.get(id)!] : [])[0];
    const id = call ? root(call.correlationId) : report.id;
    if (!groups.has(id)) groups.set(id, { calls: [], reports: [] });
    groups.get(id)!.reports.push(report);
  }
  return [...groups].map(([id, group]): UsageRequest => {
    const latest = [...group.reports].sort((a, b) => b.at.localeCompare(a.at));
    const original = latest.find(r => r.provenance === "user_written");
    const reportedProxy = latest.find(r => r.provenance !== "unavailable");
    const captured = group.calls.find(c => c.request?.provenance === "user_written")?.request ?? group.calls.find(c => c.request)?.request;
    const proxyCall = group.calls.find(c => Object.keys(c.args).length);
    return { id, calls: group.calls, reports: group.reports,
      asked: original?.asked ?? (captured?.provenance === "user_written" ? captured.text : undefined) ?? reportedProxy?.asked ?? captured?.text ?? (proxyCall ? JSON.stringify(proxyCall.args).slice(0, 12000) : "Original request and proxy were not captured"),
      provenance: original?.provenance ?? (captured?.provenance === "user_written" ? captured.provenance : undefined) ?? reportedProxy?.provenance ?? captured?.provenance ?? (proxyCall ? "tool_args" : "unavailable"),
      intent: captured?.intent,
      missingCallIds: [...new Set(group.reports.flatMap(r => r.callIds))].filter(id => !byId.has(id)),
      outcome: latest.some(r => r.outcome === "failure") || group.calls.some(c => c.status !== "ok") ? "failure"
        : latest.some(r => r.outcome === "success") ? "success" : "unknown",
    };
  }).sort((a, b) => a.id.localeCompare(b.id));
}
