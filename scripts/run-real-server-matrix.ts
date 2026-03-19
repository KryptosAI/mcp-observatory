import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { renderMarkdown, runTarget, type TargetConfig } from "../src/index.js";

const root = process.cwd();
const targetsDir = path.join(root, "examples", "targets");
const artifactsDir = path.join(root, "examples", "artifacts");

async function main(): Promise<void> {
  await mkdir(artifactsDir, { recursive: true });
  const targetFiles = (await readdir(targetsDir))
    .filter((file) => file.endsWith(".json"))
    .sort();

  let sawFailure = false;

  for (const fileName of targetFiles) {
    const targetPath = path.join(targetsDir, fileName);
    const target = JSON.parse(
      await readFile(targetPath, "utf8"),
    ) as TargetConfig;
    const artifact = await runTarget(target);
    const artifactPath = path.join(
      artifactsDir,
      `${artifact.target.targetId}.json`,
    );
    const markdownPath = path.join(
      artifactsDir,
      `${artifact.target.targetId}-report.md`,
    );

    await writeFile(artifactPath, JSON.stringify(artifact, null, 2) + "\n", "utf8");
    await writeFile(markdownPath, renderMarkdown(artifact) + "\n", "utf8");
    process.stdout.write(
      `${artifact.target.targetId}: ${artifact.gate} -> ${artifactPath}\n`,
    );

    if (artifact.gate === "fail") {
      sawFailure = true;
    }
  }

  if (sawFailure) {
    process.exitCode = 1;
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
