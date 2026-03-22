import type { TargetConfig } from "../types.js";
import { ObservatoryMonitor } from "./monitor.js";
import type { MonitorOptions } from "./monitor.js";

/** Options for the Observatory wrapper, extending monitor options with fallback support. */
export interface WrapperOptions extends MonitorOptions {
  /** Automatically switch to fallback server if primary degrades */
  fallbackTargets?: TargetConfig[];
}

/**
 * Wrap a target with observatory monitoring.
 *
 * Returns an `ObservatoryMonitor` instance pre-configured with the target and
 * optional fallback targets. The monitor is NOT started automatically; call
 * `.monitor.start()` when ready.
 *
 * @example
 * ```ts
 * const { monitor, target } = withObservatory(
 *   { targetId: "my-server", adapter: "http", url: "http://localhost:3000" },
 *   { intervalMs: 30_000, onDegraded: (score) => console.warn("degraded", score) }
 * );
 * monitor.start();
 * ```
 */
export function withObservatory(
  target: TargetConfig,
  options?: WrapperOptions,
): { monitor: ObservatoryMonitor; target: TargetConfig } {
  const monitor = new ObservatoryMonitor(options);

  // Add the primary target
  monitor.addServer(target);

  // Add any fallback targets
  if (options?.fallbackTargets) {
    for (const fallback of options.fallbackTargets) {
      monitor.addServer(fallback);
    }
  }

  return { monitor, target };
}
