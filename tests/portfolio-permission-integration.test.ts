import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Ajv } from "ajv";
import { detectPermissionDeltas } from "../src/permission-delta.js";
import { diffArtifacts } from "../src/diff.js";
import { validateDiffArtifact } from "../src/validate.js";
import { makeArtifact } from "./fixtures/test-helpers.js";
import type { RunArtifact } from "../src/types.js";

function artifact(schemas: Record<string, object>): RunArtifact {
  return makeArtifact([{ id: "tools", capability: "tools", status: "pass", durationMs: 1, message: "fixture", evidence: [{ endpoint: "tools/list", advertised: true, responded: true, minimalShapePresent: true, schemas }] }]);
}
describe("permission gate integration", () => {
  it("enforces review/widening thresholds through the actual JSON CLI", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "observatory-permission-cli-"));
    try {
      const base = artifact({ tool: { type: "object", properties: { mode: { type: "string", enum: ["read"] } } } });
      const head = artifact({ tool: { type: "object", properties: { mode: { type: "string", enum: ["read", "write"] } } } });
      const b = path.join(dir, "base.json"), h = path.join(dir, "head.json");
      writeFileSync(b, JSON.stringify(base)); writeFileSync(h, JSON.stringify(head));
      const child = spawnSync(process.execPath, ["--import", "tsx", "src/cli.ts", "diff", b, h, "--format", "json", "--fail-on-permission-delta", "review"], { encoding: "utf8", timeout: 20000, env: { ...process.env, DO_NOT_TRACK: "1", CI: "1" } });
      expect(child.status, child.stderr).toBe(1);
      const result = JSON.parse(child.stdout) as { gate: string; permissionDeltas: Array<{ risk: string }> };
      expect(result.gate).toBe("fail");
      expect(result.permissionDeltas.some(d => d.risk === "widening")).toBe(true);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("does not skip added capability schema sets", () => {
    const diff = diffArtifacts(makeArtifact(), artifact({ execute: { type: "object" } }), { failOnPermissionDelta: "review" });
    expect(diff.gate).toBe("fail");
    expect(diff.permissionDeltas?.[0]?.risk).toBe("review");
  });
  it("retains witnesses and narrowing counts through artifact serialization", () => {
    const base = artifact({ tool: { type: "object", properties: { mode: { type: "string", enum: ["read", "list"] } }, required: ["mode"] } });
    const head = artifact({ tool: { type: "object", properties: { mode: { type: "string", enum: ["read", "write"] } }, required: ["mode"] } });
    const diff = diffArtifacts(base, head, { failOnPermissionDelta: "review" });
    const restored = validateDiffArtifact(JSON.parse(JSON.stringify(diff)));
    expect(restored.permissionDeltas).toEqual(diff.permissionDeltas);
    expect(restored.summary.permissionDeltaRiskCounts?.narrowing).toBe(1);
    expect(restored.gate).toBe("fail");
  });
  it("routes malformed advertised contracts to review", () => {
    const bad = JSON.parse('{"tool":null}') as Record<string, object>;
    expect(detectPermissionDeltas("tools", {}, bad)[0]?.risk).toBe("review");
  });
  it("reviews prototype-named fields and checks supported witnesses with independent Ajv", () => {
    const base = JSON.parse('{"type":"object","properties":{"__proto__":{"type":"string"},"mode":{"type":"string","enum":["read"]}},"required":["__proto__","mode"],"additionalProperties":false}') as object;
    const head = JSON.parse('{"type":"object","properties":{"__proto__":{"type":"string"},"mode":{"type":"string","enum":["read","write"]}},"required":["__proto__","mode"],"additionalProperties":false}') as object;
    expect(detectPermissionDeltas("tools", { tool: base }, { tool: head })[0]?.risk).toBe("review");
    const supportedBase = JSON.parse(JSON.stringify(base).replaceAll("__proto__", "scope")) as object;
    const supportedHead = JSON.parse(JSON.stringify(head).replaceAll("__proto__", "scope")) as object;
    const ajv = new Ajv({ strict: false });
    const acceptsBase = ajv.compile(supportedBase), acceptsHead = ajv.compile(supportedHead);
    const deltas = detectPermissionDeltas("tools", { tool: supportedBase }, { tool: supportedHead });
    const widening = deltas.filter(d => d.risk === "widening");
    expect(widening.length).toBeGreaterThan(0);
    for (const delta of widening) {
      expect(acceptsHead(delta.witness)).toBe(true);
      expect(acceptsBase(delta.witness)).toBe(false);
    }
  });
});
