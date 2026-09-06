import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { PackageNameReview } from "../src/utils/typosquat.js";

const roots: string[] = [];
const typo = "@modelcontextprotocol/server-filesytem";
function setup() {
  const dir = mkdtempSync(path.join(tmpdir(), "package-check-cli-")); roots.push(dir);
  const run = (...args: string[]) => spawnSync(process.execPath, ["--import", import.meta.resolve("tsx"),
    fileURLToPath(new URL("../src/cli.ts", import.meta.url)), ...args], {
    cwd: dir, encoding: "utf8", timeout: 20000,
    env: { PATH: process.env["PATH"], HOME: dir, USERPROFILE: dir, XDG_CONFIG_HOME: dir,
      APPDATA: dir, CI: "1", DO_NOT_TRACK: "1", NO_COLOR: "1", NO_UPDATE_NOTIFIER: "1" },
  });
  // A local fixture named npx can serve MCP but never installs a package. The
  // marker proves that package-check doesn't start it, while scan intentionally does.
  const wrapper = path.join(dir, "npx"), marker = path.join(dir, "executed");
  writeFileSync(wrapper, `#!${process.execPath}\n` +
    `const fs = require('node:fs'); fs.writeFileSync(${JSON.stringify(marker)}, 'started');\n` +
    `import(${JSON.stringify(new URL("../examples/demo-mcp-server.mjs", import.meta.url).href)});\n`);
  chmodSync(wrapper, 0o700);
  return { dir, run, wrapper, marker };
}
afterEach(() => { for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe("package-check CLI", () => {
  it("reviews structured launch arguments and returns clean advisory JSON without executing them", () => {
    const { run, wrapper, marker } = setup();
    const child = run("package-check", "--format", "json", "--", wrapper, "-y", typo + "@latest", "--format", "server-format");
    expect(child.status, child.stderr).toBe(0);
    const result = JSON.parse(child.stdout) as PackageNameReview;
    expect(result.status).toBe("parsed");
    expect(result.packages).toEqual([{ ecosystem: "npm", name: typo }]);
    expect(result.findings[0]?.closestKnown).toBe("@modelcontextprotocol/server-filesystem");
    expect(existsSync(marker)).toBe(false);
  });
  it("keeps npm exec options before its own separator distinct from server arguments", () => {
    const { run } = setup();
    const child = run("package-check", "--format", "json", "--", "npm", "exec", "cmd", "--package=" + typo, "--", "--package=@playwright/mcp");
    expect(child.status, child.stderr).toBe(0);
    expect((JSON.parse(child.stdout) as PackageNameReview).packages).toEqual([{ ecosystem: "npm", name: typo }]);
  });
  it("also preserves the wrapper separator when no outer reviewer separator is supplied", () => {
    const { run } = setup();
    const child = run("package-check", "--format", "json", "npm", "exec", "--", typo, "--package=@playwright/mcp");
    expect(child.status, child.stderr).toBe(0);
    expect((JSON.parse(child.stdout) as PackageNameReview).packages).toEqual([{ ecosystem: "npm", name: typo }]);
  });
  it("reviews uv requirements without treating the executable name as the package", () => {
    const { run } = setup();
    const child = run("package-check", "--format", "json", "--", "uv", "tool", "run", "--from", "mcp-server-fetc[extra]>=1,<2", "renamed-command");
    expect(child.status, child.stderr).toBe(0);
    const result = JSON.parse(child.stdout) as PackageNameReview;
    expect(result.findings[0]?.ecosystem).toBe("pypi");
    expect(result.findings[0]?.closestKnown).toBe("mcp-server-fetch");
  });
  it("exits 2 for unsupported sources and redacts URL credentials", () => {
    const { run } = setup();
    const child = run("package-check", "--format", "json", "--", "npx", "https://user:PRIVATE_FIXTURE_VALUE@example.test/pkg.tgz");
    expect(child.status, child.stderr).toBe(2);
    expect((JSON.parse(child.stdout) as PackageNameReview).status).toBe("unsupported");
    expect(child.stdout + child.stderr).not.toContain("PRIVATE_FIXTURE_VALUE");
  });
  it("does not evaluate a shell command", () => {
    const { run, marker } = setup();
    const child = run("package-check", "--format", "json", "--", "sh", "-c", "touch " + marker);
    expect(child.status, child.stderr).toBe(2);
    expect(existsSync(marker)).toBe(false);
  });
  it("describes direct executables as not applicable, without executing their arguments", () => {
    const { run, marker } = setup();
    const child = run("package-check", "--format", "json", "--", process.execPath, "-e", `require('fs').writeFileSync(${JSON.stringify(marker)}, 'started')`);
    expect(child.status, child.stderr).toBe(0);
    const result = JSON.parse(child.stdout) as PackageNameReview;
    expect(result.status).toBe("not-applicable"); expect(result.packages).toEqual([]);
    expect(existsSync(marker)).toBe(false);
  });
  it("renders terminal advice without suggesting an unverified replacement command", () => {
    const { run } = setup(); const child = run("package-check", "--", "npx", typo);
    expect(child.status, child.stderr).toBe(0);
    expect(child.stdout).toContain("REVIEW package name (npm)");
    expect(child.stdout).toContain("no replacement is verified");
    expect(child.stdout).not.toMatch(/npm (?:uninstall|install)/);
  });
  it("rejects invalid reviewer options and missing launch arguments", () => {
    const { run } = setup();
    expect(run("package-check", "--format", "xml", "--", "npx", typo).status).toBe(1);
    expect(run("package-check").status).toBe(1);
  });
  it("includes advisory name review in scan without blocking a passing MCP fixture", () => {
    const { dir, run, wrapper, marker } = setup(); const config = path.join(dir, "mcp.json");
    writeFileSync(config, JSON.stringify({ mcpServers: { fixture: { command: wrapper, args: ["-y", typo] } } }));
    const child = run("scan", "--config", config, "--no-attack-sim", "--no-setup-ci", "--quiet");
    expect(child.status, child.stderr + child.stdout).toBe(0);
    expect(child.stdout).toContain("REVIEW package name (npm)");
    expect(child.stdout).toContain(typo);
    expect(existsSync(marker)).toBe(true);
  }, 30000);
});
