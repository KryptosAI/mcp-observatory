import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  renderMarkdown,
  runTarget,
  type RunArtifact,
  type TargetConfig
} from "../src/index.js";

const root = process.cwd();

async function writeRunProof(targetPath: string, artifactOutputPath: string): Promise<void> {
  const target = JSON.parse(await readFile(targetPath, "utf8")) as TargetConfig;
  const artifact = await runTarget(target);
  const reportPath = artifactOutputPath.replace(/\.json$/, "-report.md");

  await mkdir(path.dirname(artifactOutputPath), { recursive: true });
  await writeFile(artifactOutputPath, JSON.stringify(artifact, null, 2) + "\n", "utf8");
  await writeFile(reportPath, renderMarkdown(artifact) + "\n", "utf8");
}

async function main(): Promise<void> {
  execFileSync("npx", ["tsx", "scripts/run-real-server-matrix.ts"], {
    cwd: root,
    stdio: "inherit"
  });
  await writeRunProof(
    path.join(root, "examples", "probes", "server-pdf-startup-fail.json"),
    path.join(root, "examples", "artifacts", "server-pdf-startup-fail.json"),
  );
  await writeFile(
    path.join(root, "examples", "results", "sample-report.md"),
    renderMarkdown(
      JSON.parse(
        await readFile(path.join(root, "tests", "fixtures", "sample-run-b.json"), "utf8"),
      ) as RunArtifact,
    ) + "\n",
    "utf8",
  );
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
