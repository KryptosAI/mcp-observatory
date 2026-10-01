import { createHash } from "node:crypto";
import { usageEventSchema, type UsageEvent, type ReportEvent, type CallEvent } from "./events.js";
import { usageRequests } from "./requests.js";
import type { Cassette } from "../cassette.js";

export interface IntentAnalysisOptions {
  /** Pass a locally configured embedding model to enable semantic clustering. No default remote provider. */
  embed?: (texts: string[]) => Promise<number[][]>;
  threshold?: number;
}
const stopWords = new Set("a an the i we you it to for of on in and or with my me please asked want need would could can get got".split(" "));
function terms(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(t => t.length > 1 && !stopWords.has(t) && t !== "redacted");
}
function lexicalVectors(texts: string[]): number[][] {
  const vocabulary = [...new Set(texts.flatMap(terms))].sort();
  return texts.map(text => {
    const tokens = terms(text);
    return vocabulary.map(term => tokens.includes(term) ? 1 : 0);
  });
}
function cosine(a: number[], b: number[]): number {
  const normA = Math.hypot(...a), normB = Math.hypot(...b);
  return normA && normB ? a.reduce((sum, v, i) => sum + v * (b[i] ?? 0), 0) / normA / normB : 0;
}
export async function analyzeUsage(events: UsageEvent[], options: IntentAnalysisOptions = {}) {
  events = events.map(event => usageEventSchema.parse(event));
  const calls = events.filter((e): e is CallEvent => e.kind === "call");
  const reports = events.filter((e): e is ReportEvent => e.kind === "report");
  const requests = usageRequests(events);
  const classified = requests.filter(r => r.provenance !== "unavailable");
  const threshold = options.threshold ?? (options.embed ? 0.8 : 0.45);
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) throw new Error("threshold must be in (0, 1]");
  const vectors = classified.length ? (options.embed ? await options.embed(classified.map(r => r.asked)) : lexicalVectors(classified.map(r => r.asked))) : [];
  const dimensions = vectors[0]?.length ?? 0;
  if (vectors.length !== classified.length || vectors.some(v => v.length !== dimensions || v.some(n => !Number.isFinite(n))) || (options.embed && classified.length && (!dimensions || vectors.some(v => Math.hypot(...v) === 0)))) {
    throw new Error("Embedding provider must return one finite, nonzero, equally sized vector per request");
  }
  const groups: number[][] = [];
  for (let i = 0; i < classified.length; i++) {
    const group = groups.find(g => g.every(j => {
      const a = classified[i]!, b = classified[j]!;
      if (a.intent || b.intent) return Boolean(a.intent && a.intent === b.intent);
      return cosine(vectors[i] ?? [], vectors[j] ?? []) >= threshold;
    }));
    if (group) group.push(i); else groups.push([i]);
  }
  const clusters = groups.map(indices => {
    const members = indices.map(i => classified[i]!);
    const linked = members.flatMap(r => r.calls);
    const memberReports = members.flatMap(r => r.reports);
    const frequencies = new Map<string, number>();
    for (const member of members) for (const term of new Set(terms(member.asked))) frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
    const label = members[0]?.intent ?? ([...frequencies].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([t]) => t).join(" / ") || "Insufficient retained text");
    const failureRequests = members.filter(m => m.outcome === "failure").length;
    const knownOutcomes = members.filter(m => m.outcome !== "unknown").length;
    return {
      id: createHash("sha256").update(members.map(m => m.id).join("|")).digest("hex").slice(0, 16),
      label, labelProvenance: members[0]?.intent ? "supplied_intent" : "inferred_keywords", count: members.length,
      requestIds: members.map(m => m.id), reportIds: memberReports.map(m => m.id), callIds: linked.map(c => c.id),
      missingCallIds: members.flatMap(m => m.missingCallIds),
      failureRequests, knownOutcomes, unknownOutcomes: members.length - knownOutcomes,
      failureRate: knownOutcomes ? failureRequests / knownOutcomes : null,
      reportedFailures: memberReports.filter(m => m.outcome === "failure").length,
      observedCallErrors: linked.filter(c => c.status !== "ok").length,
      examples: members.slice(0, 3).map(m => ({ requestId: m.id, reportId: m.reports[0]?.id, asked: m.asked, expected: m.reports[0]?.expected, got: m.reports[0]?.got, provenance: m.provenance, outcome: m.outcome })),
      breakdowns: [
        ...linked.filter(c => c.status !== "ok").map(c => ({ evidence: "runtime_error", status: "observed", callId: c.id, category: c.status, message: c.error?.message })),
        ...memberReports.flatMap(m => [
          ...(m.outcome === "failure" ? [{ evidence: "reported_outcome_mismatch", status: "user_reported", reportId: m.id, provenance: m.provenance }] : []),
          ...m.excerpt.flatMap((turn, index) => turn.role === "user" && turn.provenance === "user_text" && /\b(no|wrong|instead|meant|not what|try again)\b/i.test(turn.text)
            ? [{ evidence: "possible_user_correction", status: "inferred", turnIndex: index, reportId: m.id, text: turn.text }] : []),
        ]),
      ],
    };
  }).sort((a, b) => b.failureRequests - a.failureRequests || b.count - a.count || a.id.localeCompare(b.id));
  return {
    version: 1, method: options.embed ? "semantic_embeddings" : "lexical_cosine", threshold,
    scope: "Retained instrumented requests and opted-in reports. A successful tool call is an unknown user outcome until feedback is supplied; rates use known outcomes only.",
    totalCalls: calls.length, totalReports: reports.length, totalRequests: requests.length, clusters,
    unclassified: requests.filter(r => r.provenance === "unavailable").map(r => ({ requestId: r.id, outcome: r.outcome, callIds: r.calls.map(c => c.id) })),
    tools: [...new Set(calls.map(c => `${c.server}/${c.tool}`))].sort().map(tool => {
      const rows = calls.filter(c => `${c.server}/${c.tool}` === tool);
      const latencies = rows.map(c => c.latencyMs).sort((a, b) => a - b);
      return { tool, calls: rows.length, errors: rows.filter(c => c.status !== "ok").length,
        p95LatencyMs: latencies[Math.ceil(latencies.length * 0.95) - 1] };
    }),
  };
}

export function exportUsageRegression(events: UsageEvent[], reportId: string) {
  events = events.map(event => usageEventSchema.parse(event));
  const report = events.find((event): event is ReportEvent => event.kind === "report" && event.id === reportId);
  if (!report) throw new Error("Unknown or expired report");
  const calls = events.filter((event): event is CallEvent => event.kind === "call" && report.callIds.includes(event.id));
  const missingCallIds = report.callIds.filter(id => !calls.some(c => c.id === id));
  const cases = calls.map(call => {
    const redacted = /\[REDACTED\]|\[OMITTED\]|\[DEPTH_LIMIT\]/.test(JSON.stringify({ args: call.args, result: call.result }));
    const cassette: Cassette | undefined = Object.hasOwn(call, "result") && call.capture.transport ? {
      version: 1, targetId: call.server, recordedAt: call.at, transport: call.capture.transport,
      entries: [
        { direction: "request", method: "tools/call", params: { name: call.tool, arguments: call.args }, timestampMs: 0 },
        { direction: "response", method: "tools/call", result: call.result, timestampMs: call.latencyMs },
      ],
    } : undefined;
    return { callId: call.id, server: call.server, tool: call.tool, args: call.args, status: call.status,
      capturedArgumentKeys: call.capture.argumentKeys, result: call.result, error: call.error,
      requiresArgumentReview: true, containsRedactions: redacted,
      ...(cassette ? { cassetteFragment: cassette } : {}),
    };
  });
  return {
    version: 1, kind: "usage_regression", reportId,
    asked: report.asked, expected: report.expected, got: report.got, provenance: report.provenance,
    consent: report.consent, reportedAt: report.at,
    excerpt: report.excerpt, missingCallIds, cases,
    reproduction: "Use the SDK verifyUsageRegression helper with reviewed fixture arguments and a domain assertion for expected behavior. Cassette fragments preserve observed behavior, not desired behavior, and omit initialization/discovery traffic. Never run production tools automatically.",
  };
}
/** Explicit harness: caller supplies safe fixture arguments and turns prose into a domain assertion. */
export async function verifyUsageRegression<A, R>(options: {
  args: A; invoke: (args: A) => Promise<R>; assertOutcome: (result: R) => void | Promise<void>;
}): Promise<R> {
  const result = await options.invoke(options.args);
  await options.assertOutcome(result);
  return result;
}
