import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { expect, it } from "vitest";

const execute = promisify(execFile);

it("recreates the ClearFrame redirects on a clean dashboard build without replacing public evidence or docs", async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "mcp-brand-redirects-"));
  try {
    for (const relative of [
      "examples/matrix-summary.json",
      "docs/safety-index/targets.json",
      "docs/demo.gif",
      "docs/assets/mcp-observatory-logo.svg",
      "docs/assets/mcp-observatory-logo.png",
      "docs/assets/mcp-observatory-favicon.svg",
      "docs/assets/mcp-observatory-favicon-v2.png",
      "scripts/dashboard-redirects.txt",
    ]) {
      const destination = path.join(fixture, relative);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(path.resolve(relative), destination);
    }

    const protectedFiles = [
      "safety-index/api-data.json",
      "safety-index/servers/existing-server.html",
      "badges/existing-server.svg",
      "release-gate-evidence-pack/index.html",
      "privacy/index.html",
    ];
    for (const relative of protectedFiles) {
      const destination = path.join(fixture, "dashboard", relative);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, `existing published bytes: ${relative}\n`);
    }

    await execute(process.execPath, [
      path.resolve("node_modules/tsx/dist/cli.mjs"),
      path.resolve("scripts/build-dashboard.ts"),
    ], { cwd: fixture });

    const redirects = await readFile(path.join(fixture, "dashboard/_redirects"), "utf8");
    expect(redirects).toBe(await readFile("scripts/dashboard-redirects.txt", "utf8"));
    const rules = redirects.split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("#"))
      .map(line => line.split(/\s+/));
    expect(rules).toContainEqual(["/", "https://clearframecode.com/observatory/", "301"]);
    expect(rules).toContainEqual(["/start/", "https://clearframecode.com/observatory/#setup", "301"]);
    expect(rules).toContainEqual(["/dashboard", "https://clearframecode.com/observatory/#scans", "301"]);
    expect(rules).toContainEqual(["/pricing", "https://clearframecode.com/pricing/", "301"]);
    expect(rules).toContainEqual(["/terms/", "https://app.mcp-observatory.com/terms", "302"]);
    expect(rules.every(([source]) => source?.startsWith("/") && !/[*:]|\/auth(?:\/|$)|\/webhooks?(?:\/|$)/.test(source))).toBe(true);

    for (const relative of protectedFiles) {
      expect(await readFile(path.join(fixture, "dashboard", relative), "utf8"))
        .toBe(`existing published bytes: ${relative}\n`);
      expect(rules.some(([source]) => source === `/${relative}`)).toBe(false);
    }
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}, 20_000);
