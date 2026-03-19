import type { DiffArtifact, RunArtifact } from "../types.js";

export function renderJson(artifact: RunArtifact | DiffArtifact): string {
  return JSON.stringify(artifact, null, 2);
}
