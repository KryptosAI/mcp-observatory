import { EventEmitter } from "node:events";

import { runTarget } from "../runner.js";
import { computeHealthScore } from "../score.js";
import type { ScoreWeights } from "../score.js";
import type { HealthGrade, HealthScore, TargetConfig } from "../types.js";

/** Options for configuring the ObservatoryMonitor. */
export interface MonitorOptions {
  /** How often to check health (ms). Default: 60000 (1 min) */
  intervalMs?: number;
  /** Minimum score before triggering onDegraded. Default: 70 */
  degradedThreshold?: number;
  /** Minimum score before triggering onUnhealthy. Default: 40 */
  unhealthyThreshold?: number;
  /** Callback when score drops below degradedThreshold */
  onDegraded?: (score: HealthScore, server: string) => void;
  /** Callback when score drops below unhealthyThreshold */
  onUnhealthy?: (score: HealthScore, server: string) => void;
  /** Callback when score recovers above degradedThreshold */
  onRecovered?: (score: HealthScore, server: string) => void;
  /** Optional: report scores to a remote endpoint */
  reportTo?: string;
  /** Custom score weights */
  weights?: Partial<ScoreWeights>;
}

export type ServerStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

/** Represents a server being monitored with its current state and history. */
export interface MonitoredServer {
  targetId: string;
  lastScore?: HealthScore;
  lastCheck?: Date;
  status: ServerStatus;
  history: Array<{ timestamp: Date; score: number; grade: HealthGrade }>;
}

const MAX_HISTORY = 100;
const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_DEGRADED_THRESHOLD = 70;
const DEFAULT_UNHEALTHY_THRESHOLD = 40;

interface ServerEntry {
  target: TargetConfig;
  state: MonitoredServer;
}

/**
 * Real-time monitor for MCP server health.
 *
 * Uses `runTarget()` and `computeHealthScore()` under the hood to periodically
 * check servers and fire callbacks when health changes.
 */
export class ObservatoryMonitor extends EventEmitter {
  private readonly servers = new Map<string, ServerEntry>();
  private readonly options: Required<
    Pick<MonitorOptions, "intervalMs" | "degradedThreshold" | "unhealthyThreshold">
  > & MonitorOptions;
  private timer: ReturnType<typeof setInterval> | null = null;
  private disposed = false;

  constructor(options?: MonitorOptions) {
    super();
    this.options = {
      intervalMs: options?.intervalMs ?? DEFAULT_INTERVAL_MS,
      degradedThreshold: options?.degradedThreshold ?? DEFAULT_DEGRADED_THRESHOLD,
      unhealthyThreshold: options?.unhealthyThreshold ?? DEFAULT_UNHEALTHY_THRESHOLD,
      ...options,
    };
  }

  /** Add a server to monitor. */
  addServer(target: TargetConfig): void {
    if (this.disposed) return;
    if (this.servers.has(target.targetId)) return;

    const state: MonitoredServer = {
      targetId: target.targetId,
      status: "unknown",
      history: [],
    };
    this.servers.set(target.targetId, { target, state });
    this.emit("serverAdded", target.targetId);
  }

  /** Remove a server from monitoring. */
  removeServer(targetId: string): void {
    this.servers.delete(targetId);
    this.emit("serverRemoved", targetId);
  }

  /** Get current status of all monitored servers. */
  getStatus(): MonitoredServer[] {
    return [...this.servers.values()].map((e) => ({ ...e.state }));
  }

  /** Get status of a specific server. */
  getServerStatus(targetId: string): MonitoredServer | undefined {
    const entry = this.servers.get(targetId);
    return entry ? { ...entry.state } : undefined;
  }

  /** Run an immediate health check on all servers. */
  async checkNow(): Promise<Map<string, HealthScore>> {
    const results = new Map<string, HealthScore>();
    const entries = [...this.servers.values()];

    await Promise.all(
      entries.map(async (entry) => {
        const score = await this.checkServer(entry);
        if (score) {
          results.set(entry.target.targetId, score);
        }
      }),
    );

    return results;
  }

  /** Start periodic monitoring. */
  start(): void {
    if (this.disposed || this.timer !== null) return;
    this.timer = setInterval(() => {
      void this.checkNow();
    }, this.options.intervalMs);
    this.emit("started");
  }

  /** Stop periodic monitoring. */
  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
      this.emit("stopped");
    }
  }

  /** Dispose and clean up. */
  dispose(): void {
    this.stop();
    this.disposed = true;
    this.servers.clear();
    this.removeAllListeners();
  }

  // ---- internal ----

  private async checkServer(entry: ServerEntry): Promise<HealthScore | undefined> {
    const { target, state } = entry;
    const previousStatus = state.status;

    try {
      const artifact = await runTarget(target);
      const score =
        artifact.healthScore ??
        computeHealthScore(artifact.checks, artifact.performanceMetrics, this.options.weights);

      state.lastScore = score;
      state.lastCheck = new Date();

      // Append to history (capped at MAX_HISTORY)
      state.history.push({
        timestamp: state.lastCheck,
        score: score.overall,
        grade: score.grade,
      });
      if (state.history.length > MAX_HISTORY) {
        state.history.splice(0, state.history.length - MAX_HISTORY);
      }

      // Determine new status
      const newStatus = this.classifyScore(score.overall);
      state.status = newStatus;

      // Fire callbacks
      this.fireCallbacks(previousStatus, newStatus, score, target.targetId);

      // Report if configured
      if (this.options.reportTo) {
        void this.reportScore(score, target.targetId).catch(() => {
          /* best-effort */
        });
      }

      this.emit("check", target.targetId, score);
      return score;
    } catch {
      state.status = "unhealthy";
      state.lastCheck = new Date();
      this.emit("checkError", target.targetId);
      return undefined;
    }
  }

  private classifyScore(overall: number): ServerStatus {
    if (overall >= this.options.degradedThreshold) return "healthy";
    if (overall >= this.options.unhealthyThreshold) return "degraded";
    return "unhealthy";
  }

  private fireCallbacks(
    previousStatus: ServerStatus,
    newStatus: ServerStatus,
    score: HealthScore,
    targetId: string,
  ): void {
    if (newStatus === "degraded" && previousStatus !== "degraded") {
      this.options.onDegraded?.(score, targetId);
    }
    if (newStatus === "unhealthy" && previousStatus !== "unhealthy") {
      this.options.onUnhealthy?.(score, targetId);
    }
    if (
      newStatus === "healthy" &&
      (previousStatus === "degraded" || previousStatus === "unhealthy")
    ) {
      this.options.onRecovered?.(score, targetId);
    }
  }

  private async reportScore(score: HealthScore, targetId: string): Promise<void> {
    const url = this.options.reportTo;
    if (!url) return;

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId, score, timestamp: new Date().toISOString() }),
    });
  }
}
