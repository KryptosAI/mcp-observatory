import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  generateSubmission,
  renderSubmissionMarkdown,
  resolveSmitheryTarget,
  listSmitheryServers,
  batchScanServers,
  SmitheryApiError,
  SmitheryRateLimitError,
  type SmitheryServerEntry,
  type SmitherySubmission,
} from "../src/integrations/smithery.js";
import type { CheckResult, HealthScore, RunArtifact } from "../src/types.js";
import { SCHEMA_VERSION } from "../src/types.js";

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeCheckResult(overrides: Partial<CheckResult> = {}): CheckResult {
  return {
    id: "tools",
    capability: "tools",
    status: "pass",
    durationMs: 42,
    message: "Found 3 tools.",
    evidence: [],
    ...overrides,
  };
}

function makeArtifact(overrides: Partial<RunArtifact> = {}): RunArtifact {
  return {
    artifactType: "run",
    schemaVersion: SCHEMA_VERSION,
    gate: "pass",
    runId: "run-test-001",
    createdAt: "2026-03-21T12:00:00.000Z",
    toolVersion: "0.1.0",
    target: {
      targetId: "@test/mcp-server",
      adapter: "local-process",
      command: "npx",
      args: ["-y", "@test/mcp-server"],
      metadata: { smitheryName: "@test/mcp-server" },
    },
    environment: {
      platform: "darwin 25.0.0",
      nodeVersion: "v20.0.0",
    },
    summary: {
      gate: "pass",
      total: 3,
      pass: 3,
      fail: 0,
      partial: 0,
      unsupported: 0,
      flaky: 0,
      skipped: 0,
    },
    checks: [
      makeCheckResult({ id: "tools", capability: "tools" }),
      makeCheckResult({ id: "prompts", capability: "prompts", message: "Found 1 prompt." }),
      makeCheckResult({ id: "resources", capability: "resources", message: "Found 2 resources." }),
    ],
    healthScore: {
      overall: 85,
      grade: "B",
      dimensions: [
        { name: "Protocol Compliance", weight: 0.3, score: 90, details: ["conformance: pass (100/100)"] },
        { name: "Schema Quality", weight: 0.2, score: 80, details: ["schema-quality: partial (60/100)"] },
        { name: "Security", weight: 0.2, score: 85, details: ["security: pass (100/100)"] },
        { name: "Reliability", weight: 0.2, score: 90, details: ["tools: pass (100/100)"] },
        { name: "Performance", weight: 0.1, score: 70, details: ["Connect: 250ms"] },
      ],
    },
    performanceMetrics: {
      connectMs: 250,
      toolsListMs: 120,
      promptsListMs: 80,
      resourcesListMs: 95,
    },
    ...overrides,
  };
}

// ── Mock fetch ──────────────────────────────────────────────────────────────

const originalFetch = globalThis.fetch;

function mockFetch(handler: (url: string, init?: RequestInit) => Promise<Response>): void {
  globalThis.fetch = handler as typeof fetch;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("generateSubmission", () => {
  it("creates a valid submission object", () => {
    const artifact = makeArtifact();
    const sub = generateSubmission("@test/mcp-server", artifact);

    expect(sub.qualifiedName).toBe("@test/mcp-server");
    expect(sub.artifact).toBe(artifact);
    expect(sub.score.overall).toBe(85);
    expect(sub.score.grade).toBe("B");
    expect(sub.badgeSvg).toContain("<svg");
    expect(sub.badgeSvg).toContain("85/100");
    expect(sub.submittedAt).toBeTruthy();
    expect(new Date(sub.submittedAt).getTime()).not.toBeNaN();
  });

  it("computes health score when artifact has none", () => {
    const artifact = makeArtifact({ healthScore: undefined });
    const sub = generateSubmission("@test/server", artifact);

    expect(sub.score.overall).toBeGreaterThanOrEqual(0);
    expect(sub.score.overall).toBeLessThanOrEqual(100);
    expect(sub.score.grade).toMatch(/^[A-DF]$/);
  });

  it("includes the badge SVG with correct score", () => {
    const artifact = makeArtifact();
    const sub = generateSubmission("@test/server", artifact);

    expect(sub.badgeSvg).toContain("MCP Health");
    expect(sub.badgeSvg).toContain("</svg>");
  });
});

describe("renderSubmissionMarkdown", () => {
  let submission: SmitherySubmission;

  beforeEach(() => {
    submission = generateSubmission("@anthropic/mcp-server-fetch", makeArtifact());
  });

  it("produces readable markdown with title", () => {
    const md = renderSubmissionMarkdown(submission);
    expect(md).toContain("# MCP Observatory Report: @anthropic/mcp-server-fetch");
  });

  it("includes the health score table", () => {
    const md = renderSubmissionMarkdown(submission);
    expect(md).toContain("85/100");
    expect(md).toContain("**Grade**");
    expect(md).toContain("B");
  });

  it("includes score dimensions breakdown", () => {
    const md = renderSubmissionMarkdown(submission);
    expect(md).toContain("## Score Breakdown");
    expect(md).toContain("Protocol Compliance");
    expect(md).toContain("Schema Quality");
    expect(md).toContain("Security");
    expect(md).toContain("Reliability");
    expect(md).toContain("Performance");
  });

  it("includes check results", () => {
    const md = renderSubmissionMarkdown(submission);
    expect(md).toContain("## Check Results");
    expect(md).toContain("tools");
    expect(md).toContain("prompts");
    expect(md).toContain("resources");
  });

  it("includes performance metrics", () => {
    const md = renderSubmissionMarkdown(submission);
    expect(md).toContain("## Performance");
    expect(md).toContain("250ms");
    expect(md).toContain("tools/list");
  });

  it("includes badge as base64 data URI", () => {
    const md = renderSubmissionMarkdown(submission);
    expect(md).toContain("data:image/svg+xml;base64,");
  });

  it("shows fatal error when present", () => {
    const artifact = makeArtifact({ fatalError: "Connection refused" });
    const sub = generateSubmission("@test/server", artifact);
    const md = renderSubmissionMarkdown(sub);

    expect(md).toContain("## Fatal Error");
    expect(md).toContain("Connection refused");
  });
});

describe("resolveSmitheryTarget", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("resolves an HTTP server from Smithery API", async () => {
    const serverEntry: SmitheryServerEntry = {
      qualifiedName: "@example/sse-server",
      displayName: "Example SSE Server",
      connections: [
        { type: "sse", url: "https://example.com/mcp" },
      ],
    };

    mockFetch(async () =>
      new Response(JSON.stringify(serverEntry), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const target = await resolveSmitheryTarget("@example/sse-server");

    expect(target.adapter).toBe("http");
    expect(target.targetId).toBe("@example/sse-server");
    if (target.adapter === "http") {
      expect(target.url).toBe("https://example.com/mcp");
    }
    expect(target.metadata?.smitheryName).toBe("@example/sse-server");
  });

  it("falls back to npx local-process when no HTTP connection", async () => {
    const serverEntry: SmitheryServerEntry = {
      qualifiedName: "@example/stdio-server",
      connections: [],
    };

    mockFetch(async () =>
      new Response(JSON.stringify(serverEntry), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const target = await resolveSmitheryTarget("@example/stdio-server");

    expect(target.adapter).toBe("local-process");
    expect(target.targetId).toBe("@example/stdio-server");
    if (target.adapter === "local-process") {
      expect(target.command).toBe("npx");
      expect(target.args).toContain("@example/stdio-server");
    }
  });

  it("uses custom base URL", async () => {
    let capturedUrl = "";

    mockFetch(async (url: string) => {
      capturedUrl = url;
      return new Response(
        JSON.stringify({ qualifiedName: "@test/srv", connections: [] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    await resolveSmitheryTarget("@test/srv", {
      baseUrl: "https://custom.smithery.example",
    });

    expect(capturedUrl).toContain("https://custom.smithery.example/api/servers/");
  });

  it("sends Authorization header when apiKey is provided", async () => {
    let capturedHeaders: Record<string, string> = {};

    mockFetch(async (_url: string, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string> | undefined;
      if (headers) capturedHeaders = headers;
      return new Response(
        JSON.stringify({ qualifiedName: "@test/srv", connections: [] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    await resolveSmitheryTarget("@test/srv", { apiKey: "test-key-123" });

    expect(capturedHeaders["Authorization"]).toBe("Bearer test-key-123");
  });

  it("throws SmitheryApiError on non-OK response", async () => {
    mockFetch(async () =>
      new Response("Not Found", { status: 404, statusText: "Not Found" }),
    );

    await expect(resolveSmitheryTarget("@nonexistent/server")).rejects.toThrow(
      SmitheryApiError,
    );
  });

  it("throws SmitheryRateLimitError on 429", async () => {
    mockFetch(async () =>
      new Response("Too Many Requests", { status: 429, statusText: "Too Many Requests" }),
    );

    await expect(resolveSmitheryTarget("@test/server")).rejects.toThrow(
      SmitheryRateLimitError,
    );
  });

  it("throws on network failure", async () => {
    mockFetch(async () => {
      throw new TypeError("fetch failed");
    });

    await expect(resolveSmitheryTarget("@test/server")).rejects.toThrow();
  });
});

describe("listSmitheryServers", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("fetches server list from registry", async () => {
    const response = {
      servers: [
        { qualifiedName: "@a/server-1", connections: [] },
        { qualifiedName: "@b/server-2", connections: [] },
      ],
    };

    mockFetch(async () =>
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await listSmitheryServers();
    expect(result.servers).toHaveLength(2);
    expect(result.servers[0]?.qualifiedName).toBe("@a/server-1");
  });

  it("passes pagination params", async () => {
    let capturedUrl = "";

    mockFetch(async (url: string) => {
      capturedUrl = url;
      return new Response(
        JSON.stringify({ servers: [] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    await listSmitheryServers(undefined, { page: 2, pageSize: 5 });

    expect(capturedUrl).toContain("page=2");
    expect(capturedUrl).toContain("pageSize=5");
  });
});

describe("batchScanServers", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("scans multiple servers and returns results", async () => {
    mockFetch(async () =>
      new Response(
        JSON.stringify({
          servers: [
            { qualifiedName: "@a/server-1", connections: [] },
            { qualifiedName: "@b/server-2", connections: [] },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const mockRunTarget = vi.fn().mockResolvedValue(makeArtifact());

    const results = await batchScanServers(mockRunTarget, undefined, { top: 2 });

    expect(results).toHaveLength(2);
    expect(results[0]?.submission).toBeDefined();
    expect(results[0]?.qualifiedName).toBe("@a/server-1");
    expect(results[1]?.submission).toBeDefined();
    expect(mockRunTarget).toHaveBeenCalledTimes(2);
  });

  it("captures errors for individual servers without aborting", async () => {
    mockFetch(async () =>
      new Response(
        JSON.stringify({
          servers: [
            { qualifiedName: "@a/server-ok", connections: [] },
            { qualifiedName: "@b/server-fail", connections: [] },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const mockRunTarget = vi.fn()
      .mockResolvedValueOnce(makeArtifact())
      .mockRejectedValueOnce(new Error("Server crashed"));

    const results = await batchScanServers(mockRunTarget, undefined, { top: 2 });

    expect(results).toHaveLength(2);
    expect(results[0]?.submission).toBeDefined();
    expect(results[0]?.error).toBeUndefined();
    expect(results[1]?.submission).toBeUndefined();
    expect(results[1]?.error).toBe("Server crashed");
  });
});
