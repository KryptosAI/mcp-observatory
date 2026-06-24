import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

interface ArtifactFile {
  path: string;
  content: { artifactType?: string };
}

async function readJson(filePath: string): Promise<JsonValue> {
  return JSON.parse(await readFile(filePath, "utf8")) as JsonValue;
}

async function collectArtifactFiles(root: string): Promise<ArtifactFile[]> {
  const files = [
    path.join(root, "tests", "fixtures", "sample-run-a.json"),
    path.join(root, "tests", "fixtures", "sample-run-b.json")
  ];

  const examplesDir = path.join(root, "examples", "artifacts");
  for (const fileName of await readdir(examplesDir)) {
    if (fileName.endsWith(".json")) {
      files.push(path.join(examplesDir, fileName));
    }
  }

  const safetyIndexDir = path.join(root, "docs", "safety-index", "artifacts");
  for (const fileName of await readdir(safetyIndexDir)) {
    if (fileName.endsWith(".json")) {
      files.push(path.join(safetyIndexDir, fileName));
    }
  }

  const results: ArtifactFile[] = [];
  for (const filePath of files) {
    const content = await readJson(filePath);
    if (typeof content !== "object" || content === null || Array.isArray(content)) {
      throw new Error(`Artifact at ${filePath} is not a JSON object.`);
    }
    results.push({
      path: filePath,
      content: content
    });
  }
  return results;
}

async function main(): Promise<void> {
  const root = process.cwd();
  const ajv = new Ajv({
    allErrors: true,
    strict: false
  });

  const runSchema = await readJson(path.join(root, "schemas", "run-artifact.schema.json"));
  const diffSchema = await readJson(path.join(root, "schemas", "diff-artifact.schema.json"));

  if (typeof runSchema !== "object" || runSchema === null || Array.isArray(runSchema)) {
    throw new Error("Run artifact schema must be a JSON object.");
  }
  if (typeof diffSchema !== "object" || diffSchema === null || Array.isArray(diffSchema)) {
    throw new Error("Diff artifact schema must be a JSON object.");
  }

  const validateRun = ajv.compile(runSchema) as ValidateFunction<ArtifactFile["content"]>;
  const validateDiff = ajv.compile(diffSchema) as ValidateFunction<ArtifactFile["content"]>;

  const artifactFiles = await collectArtifactFiles(root);
  let hasErrors = false;

  for (const artifact of artifactFiles) {
    const validate =
      artifact.content.artifactType === "diff" ? validateDiff : validateRun;
    const valid = validate(artifact.content);
    if (!valid) {
      hasErrors = true;
      process.stderr.write(`Schema validation failed for ${artifact.path}\n`);
      const errors: ErrorObject[] = validate.errors ?? [];
      for (const error of errors) {
        process.stderr.write(`- ${error.instancePath || "/"} ${error.message ?? "invalid"}\n`);
      }
    } else {
      process.stdout.write(`validated ${artifact.path}\n`);
    }
  }

  if (hasErrors) {
    process.exitCode = 1;
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
