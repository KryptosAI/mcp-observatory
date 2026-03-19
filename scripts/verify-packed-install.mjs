#!/usr/bin/env node

import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();

function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NO_COLOR: "1" }
  });
}

const packDir = mkdtempSync(path.join(os.tmpdir(), "mcp-observatory-pack-"));
const tarballName = execSync(`npm pack --pack-destination "${packDir}"`, {
  cwd: root,
  encoding: "utf8"
}).trim().split(/\r?\n/).pop();

if (!tarballName) {
  throw new Error("npm pack did not produce a tarball name.");
}

const tarballPath = path.join(packDir, tarballName);
const execDir = mkdtempSync(path.join(os.tmpdir(), "mcp-observatory-install-"));

writeFileSync(path.join(execDir, "hello.txt"), "hello from packed install\n", "utf8");
writeFileSync(
  path.join(execDir, "filesystem-target.json"),
  JSON.stringify(
    {
      targetId: "filesystem-cli-proof",
      adapter: "local-process",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "."],
      timeoutMs: 15000,
      metadata: {
        purpose: "packed-install-proof",
        package: "@modelcontextprotocol/server-filesystem"
      }
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

run("npx", ["--yes", `--package=${tarballPath}`, "mcp-observatory", "--help"], execDir);
const versionOutput = run(
  "npx",
  ["--yes", `--package=${tarballPath}`, "mcp-observatory", "--version"],
  execDir,
).trim();

if (versionOutput.length === 0) {
  throw new Error("Packed install version output was empty.");
}

const runOutput = run(
  "npx",
  [
    "--yes",
    `--package=${tarballPath}`,
    "mcp-observatory",
    "run",
    "--target",
    "filesystem-target.json",
    "--out-dir",
    "proof-runs"
  ],
  execDir,
);

const artifactLine = runOutput
  .split(/\r?\n/)
  .find((line) => line.startsWith("Artifact: "));

if (!runOutput.includes("Gate: pass")) {
  throw new Error(`Packed install proof run did not pass.\n${runOutput}`);
}

if (artifactLine === undefined) {
  throw new Error(`Packed install proof run did not print an artifact path.\n${runOutput}`);
}

const artifactPathRaw = artifactLine.replace("Artifact: ", "").trim();
const artifactPath = path.isAbsolute(artifactPathRaw)
  ? artifactPathRaw
  : path.join(execDir, artifactPathRaw);
if (!existsSync(artifactPath)) {
  throw new Error(`Packed install artifact was not created at ${artifactPath}`);
}

const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
if (artifact.artifactType !== "run" || artifact.gate !== "pass") {
  throw new Error("Packed install artifact did not contain a passing run.");
}

process.stdout.write(
  `Packed install verified from ${tarballName} with CLI version ${versionOutput}.\n`,
);
