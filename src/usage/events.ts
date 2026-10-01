import { z } from "zod";

const id = z.string().uuid();
const text = z.string().min(1).max(12000);
const consent = z.object({
  optedIn: z.literal(true), userReviewed: z.literal(true),
  reviewedAt: z.iso.datetime(), policyVersion: z.string().min(1).max(100),
}).strict();
export const callEventSchema = z.object({
  version: z.literal(1), kind: z.literal("call"), id, at: z.iso.datetime(),
  server: z.string().min(1).max(200), tool: z.string().min(1).max(200),
  correlationId: id, latencyMs: z.number().finite().nonnegative(),
  status: z.enum(["ok", "tool_error", "exception"]),
  args: z.record(z.string(), z.unknown()), result: z.unknown().optional(),
  error: z.object({ category: z.enum(["tool_error", "exception"]), message: text }).optional(),
  capture: z.object({ argumentKeys: z.array(z.string()), resultIncluded: z.boolean(), transport: z.enum(["http", "stdio"]).optional() }),
}).strict();
export const reportInputSchema = z.object({
  callIds: z.array(id).max(100), asked: text, expected: text, got: text,
  outcome: z.enum(["success", "failure", "unclear"]),
  provenance: z.enum(["user_written", "model_summary"]), consent,
  excerpt: z.array(z.object({
    role: z.enum(["user", "assistant", "tool"]), text,
    provenance: z.enum(["user_text", "assistant_text", "tool_output", "model_summary"]),
  }).strict().superRefine((turn, ctx) => {
    const expected = { user: "user_text", assistant: "assistant_text", tool: "tool_output" }[turn.role];
    if (turn.provenance !== "model_summary" && turn.provenance !== expected) {
      ctx.addIssue({ code: "custom", message: "Turn role and provenance disagree" });
    }
  })).max(50).default([]),
}).strict();
export const reportEventSchema = reportInputSchema.extend({
  version: z.literal(1), kind: z.literal("report"), id, at: z.iso.datetime(),
}).strict();
export const usageEventSchema = z.discriminatedUnion("kind", [callEventSchema, reportEventSchema]);
export type CallEvent = z.infer<typeof callEventSchema>;
export type ReportInput = z.input<typeof reportInputSchema>;
export type ReportEvent = z.infer<typeof reportEventSchema>;
export type UsageEvent = z.infer<typeof usageEventSchema>;

const sensitiveKey = /password|secret|token|authorization|cookie|api[-_]?key|email|phone|address/i;
/** Defense in depth. Domain-specific private text must also be supplied in redactions. */
export function redactText(value: string, redactions: readonly string[] = []): string {
  let output = value
    .replace(/\bBearer\s+[^\s"']+/gi, "Bearer [REDACTED]")
    .replace(/\b(?:sk-|ghp_|gho_)[A-Za-z0-9_-]+/g, "[REDACTED]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED]")
    .replace(/\b(password|secret|token|api[-_]?key)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]");
  for (const term of redactions) {
    if (term.length) output = output.split(term).join("[REDACTED]");
  }
  return output.slice(0, 12000);
}
export function sanitizeValue(value: unknown, redactions: readonly string[] = [], depth = 0): unknown {
  if (depth > 8) return "[DEPTH_LIMIT]";
  if (typeof value === "string") return redactText(value, redactions);
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.slice(0, 100).map(v => sanitizeValue(v, redactions, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).slice(0, 100).map(([key, item]) => [
      redactText(key, redactions), sensitiveKey.test(key) ? "[REDACTED]" : sanitizeValue(item, redactions, depth + 1),
    ]));
  }
  return "[OMITTED]";
}
export function sanitizeArgs(args: Record<string, unknown>, keys: readonly string[], redactions: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(keys.filter(key => Object.hasOwn(args, key)).map(key => [
    key, sensitiveKey.test(key) ? "[REDACTED]" : sanitizeValue(args[key], redactions),
  ]));
}
