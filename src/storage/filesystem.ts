import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { DiffArtifact, RunArtifact } from "../types.js";
import { slugify } from "../utils/ids.js";

export type Artifact = RunArtifact | DiffArtifact;

export function defaultRunsDirectory(cwd = process.cwd()): string {
  return path.join(cwd, ".mcp-observatory", "runs");
}

export async function ensureDirectory(directoryPath: string): Promise<void> {
  await mkdir(directoryPath, { recursive: true });
}

export async function writeRunArtifact(
  artifact: RunArtifact,
  outDir: string,
): Promise<string> {
  await ensureDirectory(outDir);
  const fileName = `${artifact.createdAt.replaceAll(":", "-")}--${slugify(
    artifact.target.targetId,
  )}.json`;
  const filePath = path.join(outDir, fileName);
  await writeFile(filePath, JSON.stringify(artifact, null, 2) + "\n", "utf8");
  return filePath;
}

export async function readArtifact(filePath: string): Promise<Artifact> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as Artifact;
}
