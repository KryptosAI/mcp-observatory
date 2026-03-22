import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { HealthScore, RunArtifact, TargetConfig } from "../src/types.js";
import { ObservatoryMonitor } from "../src/runtime/monitor.js";
import { withObservatory } from "../src/runtime/wrapper.js";

// ---- mocks ----

vi.mock("../src/runner.js", () => ({
  runTarget: vi.fn(),
}));

// We import after mock so we get the mocked version
const { runTarget } = await import("../src/runner.js");
const mockedRunTarget = vi.mocked(runTarget);

// ---- helpers ----

function makeTarget(id: string): TargetConfig {
  return {
    targetId: id,
    adapter: "http" as const,
    url: `http://localhost:3000/${id}`,
  };
}

function makeHealthScore(overall: number): HealthScore {
  const grade =
    overall >= 90 ? "A" : overall >= 80 ? "B" : overall >= 70 ? "C" : overall >= 60 ? "D" : "F";
  return {
    overall,
    grade,
    dimensions: [],
  };
}

function makeArtifact(overall: number): RunArtifact {
  return {
    artifactType: "run",
    schemaVersion: "1.0.0",
    gate: overall >= 70 ? "pass" : "fail",
    runId: "test-run",
    createdAt: new Date().toISOString(),
    toolVersion: "0.0.0",
    target: {
      targetId: "test",
      adapter: "http",
      command: "http://localhost",
      args: [],
    },
    environment: { platform: "test", nodeVersion: "v20" },
    summary: { total: 1, pass: 1, fail: 0, partial: 0, unsupported: 0, flaky: 0, skipped: 0, gate: "pass" },
    checks: [],
    healthScore: makeHealthScore(overall),
  };
}

// ---- tests ----

describe("ObservatoryMonitor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts and stops without errors", () => {
    const monitor = new ObservatoryMonitor({ intervalMs: 1000 });
    monitor.addServer(makeTarget("srv1"));
    monitor.start();
    monitor.stop();
    monitor.dispose();
  });

  it("adds and removes servers", () => {
    const monitor = new ObservatoryMonitor();
    const target = makeTarget("srv1");

    monitor.addServer(target);
    expect(monitor.getStatus()).toHaveLength(1);
    expect(monitor.getServerStatus("srv1")).toBeDefined();
    expect(monitor.getServerStatus("srv1")?.status).toBe("unknown");

    monitor.removeServer("srv1");
    expect(monitor.getStatus()).toHaveLength(0);
    expect(monitor.getServerStatus("srv1")).toBeUndefined();

    monitor.dispose();
  });

  it("does not add duplicate servers", () => {
    const monitor = new ObservatoryMonitor();
    const target = makeTarget("srv1");

    monitor.addServer(target);
    monitor.addServer(target);
    expect(monitor.getStatus()).toHaveLength(1);

    monitor.dispose();
  });

  it("checkNow() returns scores for all servers", async () => {
    mockedRunTarget.mockResolvedValue(makeArtifact(85));

    const monitor = new ObservatoryMonitor();
    monitor.addServer(makeTarget("a"));
    monitor.addServer(makeTarget("b"));

    const results = await monitor.checkNow();

    expect(results.size).toBe(2);
    expect(results.get("a")?.overall).toBe(85);
    expect(results.get("b")?.overall).toBe(85);
    expect(mockedRunTarget).toHaveBeenCalledTimes(2);

    monitor.dispose();
  });

  it("fires onDegraded when score drops below threshold", async () => {
    const onDegraded = vi.fn();
    mockedRunTarget.mockResolvedValue(makeArtifact(55));

    const monitor = new ObservatoryMonitor({
      degradedThreshold: 70,
      unhealthyThreshold: 40,
      onDegraded,
    });
    monitor.addServer(makeTarget("srv1"));

    await monitor.checkNow();

    expect(onDegraded).toHaveBeenCalledTimes(1);
    expect(onDegraded).toHaveBeenCalledWith(
      expect.objectContaining({ overall: 55 }),
      "srv1",
    );

    monitor.dispose();
  });

  it("fires onUnhealthy when score drops below unhealthyThreshold", async () => {
    const onUnhealthy = vi.fn();
    mockedRunTarget.mockResolvedValue(makeArtifact(30));

    const monitor = new ObservatoryMonitor({
      degradedThreshold: 70,
      unhealthyThreshold: 40,
      onUnhealthy,
    });
    monitor.addServer(makeTarget("srv1"));

    await monitor.checkNow();

    expect(onUnhealthy).toHaveBeenCalledTimes(1);
    expect(onUnhealthy).toHaveBeenCalledWith(
      expect.objectContaining({ overall: 30 }),
      "srv1",
    );

    monitor.dispose();
  });

  it("fires onRecovered when score goes from degraded to healthy", async () => {
    const onRecovered = vi.fn();
    const onDegraded = vi.fn();

    const monitor = new ObservatoryMonitor({
      degradedThreshold: 70,
      unhealthyThreshold: 40,
      onDegraded,
      onRecovered,
    });
    monitor.addServer(makeTarget("srv1"));

    // First check: degraded
    mockedRunTarget.mockResolvedValue(makeArtifact(55));
    await monitor.checkNow();
    expect(onDegraded).toHaveBeenCalledTimes(1);

    // Second check: recovered
    mockedRunTarget.mockResolvedValue(makeArtifact(85));
    await monitor.checkNow();
    expect(onRecovered).toHaveBeenCalledTimes(1);
    expect(onRecovered).toHaveBeenCalledWith(
      expect.objectContaining({ overall: 85 }),
      "srv1",
    );

    monitor.dispose();
  });

  it("fires onRecovered when score goes from unhealthy to healthy", async () => {
    const onRecovered = vi.fn();

    const monitor = new ObservatoryMonitor({
      degradedThreshold: 70,
      unhealthyThreshold: 40,
      onRecovered,
    });
    monitor.addServer(makeTarget("srv1"));

    // First check: unhealthy
    mockedRunTarget.mockResolvedValue(makeArtifact(20));
    await monitor.checkNow();

    // Second check: recovered
    mockedRunTarget.mockResolvedValue(makeArtifact(90));
    await monitor.checkNow();
    expect(onRecovered).toHaveBeenCalledTimes(1);

    monitor.dispose();
  });

  it("maintains history capped at 100 entries", async () => {
    mockedRunTarget.mockResolvedValue(makeArtifact(85));

    const monitor = new ObservatoryMonitor();
    monitor.addServer(makeTarget("srv1"));

    for (let i = 0; i < 110; i++) {
      await monitor.checkNow();
    }

    const status = monitor.getServerStatus("srv1");
    expect(status?.history).toHaveLength(100);

    monitor.dispose();
  });

  it("periodic monitoring fires at the configured interval", async () => {
    mockedRunTarget.mockResolvedValue(makeArtifact(90));

    const monitor = new ObservatoryMonitor({ intervalMs: 5000 });
    monitor.addServer(makeTarget("srv1"));
    monitor.start();

    // No checks yet (interval hasn't fired)
    expect(mockedRunTarget).not.toHaveBeenCalled();

    // Advance past first interval
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockedRunTarget).toHaveBeenCalledTimes(1);

    // Advance past second interval
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockedRunTarget).toHaveBeenCalledTimes(2);

    monitor.stop();
    monitor.dispose();
  });

  it("stop() prevents further periodic checks", async () => {
    mockedRunTarget.mockResolvedValue(makeArtifact(90));

    const monitor = new ObservatoryMonitor({ intervalMs: 5000 });
    monitor.addServer(makeTarget("srv1"));
    monitor.start();

    await vi.advanceTimersByTimeAsync(5000);
    expect(mockedRunTarget).toHaveBeenCalledTimes(1);

    monitor.stop();

    await vi.advanceTimersByTimeAsync(15000);
    // Should still be 1 since we stopped
    expect(mockedRunTarget).toHaveBeenCalledTimes(1);

    monitor.dispose();
  });

  it("handles runTarget errors gracefully", async () => {
    mockedRunTarget.mockRejectedValue(new Error("connection refused"));

    const monitor = new ObservatoryMonitor();
    monitor.addServer(makeTarget("srv1"));

    const results = await monitor.checkNow();

    expect(results.size).toBe(0);
    const status = monitor.getServerStatus("srv1");
    expect(status?.status).toBe("unhealthy");

    monitor.dispose();
  });

  it("monitors multiple servers independently", async () => {
    const onDegraded = vi.fn();
    const onRecovered = vi.fn();

    const monitor = new ObservatoryMonitor({
      degradedThreshold: 70,
      unhealthyThreshold: 40,
      onDegraded,
      onRecovered,
    });
    monitor.addServer(makeTarget("healthy-server"));
    monitor.addServer(makeTarget("sick-server"));

    // healthy-server is fine, sick-server is degraded
    mockedRunTarget.mockImplementation(async (target) => {
      if (target.targetId === "healthy-server") return makeArtifact(95);
      return makeArtifact(55);
    });

    await monitor.checkNow();

    expect(monitor.getServerStatus("healthy-server")?.status).toBe("healthy");
    expect(monitor.getServerStatus("sick-server")?.status).toBe("degraded");
    expect(onDegraded).toHaveBeenCalledTimes(1);
    expect(onDegraded).toHaveBeenCalledWith(expect.anything(), "sick-server");

    monitor.dispose();
  });

  it("reports scores when reportTo is configured", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok"));
    mockedRunTarget.mockResolvedValue(makeArtifact(85));

    const monitor = new ObservatoryMonitor({
      reportTo: "https://example.com/report",
    });
    monitor.addServer(makeTarget("srv1"));

    await monitor.checkNow();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://example.com/report",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );

    fetchSpy.mockRestore();
    monitor.dispose();
  });

  it("dispose() cleans everything up", () => {
    const monitor = new ObservatoryMonitor({ intervalMs: 1000 });
    monitor.addServer(makeTarget("srv1"));
    monitor.start();
    monitor.dispose();

    expect(monitor.getStatus()).toHaveLength(0);
    // Adding after dispose should be a no-op
    monitor.addServer(makeTarget("srv2"));
    expect(monitor.getStatus()).toHaveLength(0);
  });
});

describe("withObservatory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a monitor with the primary target added", () => {
    const target = makeTarget("primary");
    const { monitor, target: returnedTarget } = withObservatory(target);

    expect(returnedTarget).toBe(target);
    expect(monitor.getStatus()).toHaveLength(1);
    expect(monitor.getServerStatus("primary")).toBeDefined();

    monitor.dispose();
  });

  it("adds fallback targets to the monitor", () => {
    const primary = makeTarget("primary");
    const fallback1 = makeTarget("fallback1");
    const fallback2 = makeTarget("fallback2");

    const { monitor } = withObservatory(primary, {
      fallbackTargets: [fallback1, fallback2],
    });

    expect(monitor.getStatus()).toHaveLength(3);
    expect(monitor.getServerStatus("primary")).toBeDefined();
    expect(monitor.getServerStatus("fallback1")).toBeDefined();
    expect(monitor.getServerStatus("fallback2")).toBeDefined();

    monitor.dispose();
  });

  it("passes monitor options through", () => {
    const onDegraded = vi.fn();
    const { monitor } = withObservatory(makeTarget("srv"), {
      intervalMs: 5000,
      degradedThreshold: 80,
      onDegraded,
    });

    // Verify the monitor was created (options are internal, but we can
    // verify behavior indirectly)
    expect(monitor).toBeInstanceOf(ObservatoryMonitor);

    monitor.dispose();
  });
});
