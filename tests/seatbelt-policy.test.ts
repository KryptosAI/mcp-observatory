import { describe, expect, it, vi } from "vitest";

import { seatbeltProxyCommand, startSeatbeltProxy } from "../src/commands/enforce.js";
import { buildSeatbeltPolicy, renderSeatbeltPolicy } from "../src/seatbelt-policy.js";
import { makeArtifact } from "./fixtures/test-helpers.js";

function artifactWithFindings() {
  return makeArtifact([
    {
      id: "tools",
      capability: "tools",
      status: "pass",
      durationMs: 1,
      message: "2 tools",
      evidence: [{
        endpoint: "tools/list",
        advertised: true,
        responded: true,
        minimalShapePresent: true,
        itemCount: 2,
        identifiers: ["echo", "run_cmd"],
      }],
    },
    {
      id: "security",
      capability: "security",
      status: "fail",
      durationMs: 10,
      message: "1 finding",
      evidence: [{
        endpoint: "security/scan",
        advertised: true,
        responded: true,
        minimalShapePresent: true,
        findings: [{
          ruleId: "shell-injection",
          severity: "high",
          toolName: "run_cmd",
          message: "Tool may execute arbitrary commands.",
        }],
      }],
    },
  ]);
}

describe("seatbelt policy", () => {
  it("emits a deny-default policy Seatbelt will load", () => {
    const policy = buildSeatbeltPolicy(artifactWithFindings());
    expect(policy.version).toBe("1");
    expect(policy.mode).toBe("enforce");
    expect(policy.defaultAction).toBe("deny");
    expect(policy.allowlist.tools).toEqual(["echo"]);
    expect(policy.allowlist.paths).toEqual([]);
    expect(policy.rules.some((rule) => rule.id === "block-shell-execution" && rule.action === "deny")).toBe(true);
    const derived = policy.rules.find((rule) => rule.values.includes("run_cmd"));
    expect(derived).toMatchObject({ target: "command", match: "exact", action: "deny" });
    expect(policy.rules.every((rule) => ["allow", "deny", "warn", "redact"].includes(rule.action))).toBe(true);

    const yaml = renderSeatbeltPolicy(policy);
    expect(yaml).toContain('version: "1"');
    expect(yaml).toContain("mode: enforce");
    expect(yaml).toContain("defaultAction: deny");
    expect(yaml).toContain("action: deny");
    expect(yaml).not.toContain("action: DENY");
    expect(yaml).toContain("  tools:\n    - echo");
    expect(yaml).toContain("  paths: []");
  });

  it("keeps baseline deny rules when the scan is clean", () => {
    const policy = buildSeatbeltPolicy(makeArtifact());
    expect(policy.defaultAction).toBe("deny");
    expect(policy.rules.length).toBeGreaterThan(0);
    expect(policy.rules.every((rule) => rule.target && rule.match && rule.values.length > 0)).toBe(true);
    expect(renderSeatbeltPolicy(policy)).toContain("  tools: []");
  });

  it("starts the proxy with --config, not --policy", async () => {
    expect(seatbeltProxyCommand("/tmp/policy.yml", 9420)).toEqual([
      "npx", "-y", "@kryptosai/mcp-seatbelt", "proxy", "--config", "/tmp/policy.yml", "--port", "9420",
    ]);
    const handlers: Record<string, (...args: unknown[]) => void> = {};
    const child = {
      on(event: string, cb: (...args: unknown[]) => void) {
        handlers[event] = cb;
        return child;
      },
    };
    const spawnImpl = vi.fn().mockReturnValue(child);
    const pending = startSeatbeltProxy("/tmp/policy.yml", 9420, spawnImpl as never);
    expect(spawnImpl).toHaveBeenCalledWith(
      "npx",
      ["-y", "@kryptosai/mcp-seatbelt", "proxy", "--config", "/tmp/policy.yml", "--port", "9420"],
      { stdio: "inherit" },
    );
    handlers.exit?.(0);
    await expect(pending).resolves.toBe(0);
  });
});
