import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { sanitizeArgs, sanitizeValue, requestContextSchema, type RequestContext, type CallEvent } from "./events.js";
import type { UsageStore } from "./store.js";

export interface UsageCaptureOptions {
  store: UsageStore; server: string; tool: string;
  /** Capture nothing by default; explicitly allow safe argument keys. */
  argumentKeys?: string[];
  /** Explicit opt-in accessor for original text or a labeled proxy; never inferred from hidden conversation state. */
  requestContext?: (args: Record<string, unknown>, extra: readonly unknown[]) => RequestContext | undefined;
  /** Share a request UUID across related calls. Default: one request per invocation. */
  correlationId?: (args: Record<string, unknown>, extra: readonly unknown[]) => string | undefined;
  captureResult?: boolean;
  transport?: "http" | "stdio";
  captureErrorMessage?: boolean;
  redactions?: string[];
  /** Logging failures do not change tool behavior. Callback receives no private exception. */
  onCaptureError?: () => void;
}
export interface InvocationContext { callId: string; correlationId: string }
/** Register the returned handler with McpServer.registerTool, or wrap another async tool handler. */
export function observeTool<A extends Record<string, unknown>, R, E extends unknown[] = []>(
  options: UsageCaptureOptions,
  handler: (args: A, context: InvocationContext, ...extra: E) => Promise<R>,
): (args: A, ...extra: E) => Promise<R> {
  return async (args, ...extra) => {
    const context: InvocationContext = { callId: randomUUID(), correlationId: randomUUID() };
    try {
      const correlationId = options.correlationId?.(args, extra);
      if (correlationId) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(correlationId)) throw new Error("Invalid request UUID");
        context.correlationId = correlationId;
      }
    } catch { try { options.onCaptureError?.(); } catch { /* Capture stays fail open. */ } }
    const at = new Date().toISOString();
    let request: RequestContext | undefined;
    try {
      const supplied = options.requestContext?.(args, extra);
      if (supplied) request = requestContextSchema.parse(sanitizeValue(supplied, options.redactions));
    } catch { try { options.onCaptureError?.(); } catch { /* Capture stays fail open. */ } }
    let status: CallEvent["status"] = "ok";
    let result: R | undefined;
    let thrown: unknown;
    let argumentSnapshot: Record<string, unknown> = {};
    try { argumentSnapshot = sanitizeArgs(args, options.argumentKeys ?? [], options.redactions ?? []); }
    catch { try { options.onCaptureError?.(); } catch { /* Capture stays fail open. */ } }
    const started = performance.now();
    try {
      result = await handler(args, context, ...extra);
      if (result && typeof result === "object" && "isError" in result && result.isError === true) status = "tool_error";
      return result;
    } catch (error) { status = "exception"; thrown = error; throw error; }
    finally {
      const latencyMs = performance.now() - started;
      try {
        const event: CallEvent = {
          version: 1, kind: "call", id: context.callId, correlationId: context.correlationId,
          at, server: options.server, tool: options.tool, latencyMs, status,
          args: argumentSnapshot, request,
          capture: { argumentKeys: options.argumentKeys ?? [], resultIncluded: Boolean(options.captureResult && status !== "exception"), transport: options.transport },
        };
        if (options.captureResult && status !== "exception") event.result = sanitizeValue(result, options.redactions);
        if (status !== "ok") event.error = {
          category: status,
          message: options.captureErrorMessage && thrown instanceof Error
            ? String(sanitizeValue(thrown.message, options.redactions))
            : options.captureErrorMessage && status === "tool_error" && result && typeof result === "object" && "content" in result && Array.isArray(result.content)
              ? String(sanitizeValue(result.content.flatMap((block: unknown) => block && typeof block === "object" && "text" in block && typeof block.text === "string" ? [block.text] : []).join("\n") || "Tool returned isError", options.redactions))
              : status === "tool_error" ? "Tool returned isError" : "Handler threw (message omitted)",
        };
        await options.store.appendCall(event);
      } catch {
        try { options.onCaptureError?.(); } catch { /* Instrumentation cannot mask the tool's outcome. */ }
      }
    }
  };
}
