import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { SourceAuditResult } from "../src/checks/source-audit.js";

const roots: string[] = [];
const cli = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const tsx = import.meta.resolve("tsx");
function setup(source = "function tool(input) { fetch(input.url); }") {
  const dir = mkdtempSync(path.join(tmpdir(), "source-audit-cli-")); roots.push(dir);
  const selected = path.join(dir, "source"); mkdirSync(selected);
  writeFileSync(path.join(selected, "server.ts"), source);
  const config = path.join(dir, "empty.json"); writeFileSync(config, '{"mcpServers":{}}');
  const run = (...args: string[]) => spawnSync(process.execPath, ["--import", tsx, cli, ...args], {
    cwd: dir, encoding: "utf8", timeout: 20000,
    // Explicit temporary home/cwd and config keep discovery away from real accounts.
    env: { PATH: process.env["PATH"], HOME: dir, USERPROFILE: dir, XDG_CONFIG_HOME: dir,
      APPDATA: dir, CI: "1", DO_NOT_TRACK: "1", NO_COLOR: "1", NO_UPDATE_NOTIFIER: "1" },
  });
  return { dir, selected, config, run };
}
afterEach(() => { for (const dir of roots.splice(0)) rmSync(dir, {recursive:true,force:true}); });

describe("source-audit CLI", () => {
  it("emits clean JSON and keeps findings advisory unless explicitly gated", () => {
    const {selected, run} = setup();
    const advisory = run("source-audit", selected, "--format", "json");
    expect(advisory.status, advisory.stderr).toBe(0);
    const result = JSON.parse(advisory.stdout) as SourceAuditResult;
    expect(result.status).toBe("complete");
    expect(result.findings.map(f => f.checkId)).toContain("SA-SSRF-SINK");
    expect(run("source-audit", selected, "--format", "json", "--fail-on-findings").status).toBe(1);
  }, 30000);
  it("exits 2 for unavailable or invalid source without reporting a successful scan", () => {
    const {dir, selected, run} = setup("const = not valid");
    for (const location of [path.join(dir,"missing"), selected]) {
      const child = run("source-audit", location, "--format", "json");
      expect(child.status, child.stderr).toBe(2);
      expect((JSON.parse(child.stdout) as SourceAuditResult).status).toBe("incomplete");
      expect(child.stdout).not.toContain("not valid");
    }
  }, 30000);
  it("includes source review in scan even when the explicit MCP config has no targets", () => {
    const {selected,config,run} = setup();
    const child = run("scan", "--config", config, "--source-audit", selected, "--quiet", "--no-setup-ci");
    expect(child.status, child.stderr).toBe(0);
    expect(child.stdout).toContain("SA-SSRF-SINK");
    expect(child.stdout).toContain("No MCP servers found");
  });
  it("preserves incomplete source coverage in scan and scan deep", () => {
    const {dir,config,run} = setup();
    for (const command of [["scan"], ["scan", "deep"]]) {
      const child = run(...command,"--config",config,"--source-audit",path.join(dir,"missing"),"--quiet","--no-setup-ci");
      expect(child.status, child.stderr).toBe(2);
      expect(child.stdout).toContain("coverage incomplete");
    }
  }, 30000);
  it("rejects unsupported formats", () => {
    const {selected,run} = setup();
    const child = run("source-audit",selected,"--format","made-up");
    expect(child.status).toBe(1); expect(child.stderr).toContain("Allowed choices");
  });
});
