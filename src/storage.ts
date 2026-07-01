import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { DiffArtifact, RunArtifact } from "./types.js";
import { slugify } from "./utils/ids.js";
import { validateDiffArtifact, validateRunArtifact } from "./validate.js";

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

export async function findLatestArtifact(outDir: string, targetId: string, excludePath?: string): Promise<string | null> {
  const slug = slugify(targetId);
  const suffix = `--${slug}.json`;
  try {
    const entries = await readdir(outDir);
    const matching = entries
      .filter(f => f.endsWith(suffix))
      .sort()
      .reverse()
      .map(f => path.join(outDir, f))
      .filter(f => f !== excludePath);
    if (matching.length === 0) return null;
    return matching[0]!;
  } catch {
    return null;
  }
}

export async function findLatestSuccessfulRunArtifact(outDir: string): Promise<string | null> {
  try {
    const entries = await readdir(outDir);
    const candidates = entries
      .filter((entry) => entry.endsWith(".json"))
      .sort()
      .reverse()
      .map((entry) => path.join(outDir, entry));

    for (const candidate of candidates) {
      try {
        const artifact = await readArtifact(candidate);
        if (artifact.artifactType === "run" && artifact.gate === "pass" && !artifact.fatalError) {
          return candidate;
        }
      } catch {
        // Ignore malformed or stale files while looking for a usable last run.
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function readArtifact(filePath: string): Promise<Artifact> {
  const content = await readFile(filePath, "utf8");
  const data: unknown = JSON.parse(content);
  if (typeof data === "object" && data !== null && !Array.isArray(data) && (data as Record<string, unknown>)["artifactType"] === "diff") {
    return validateDiffArtifact(data);
  }
  // For run artifacts and target configs (which lack artifactType), return as-is
  // Target configs are validated separately via validateTargetConfig
  if (typeof data === "object" && data !== null && !Array.isArray(data) && (data as Record<string, unknown>)["artifactType"] === "run") {
    return validateRunArtifact(data);
  }
  // Unrecognized shape — return as-is for backwards compat (e.g., target configs read via readArtifact)
  return data as Artifact;
}
