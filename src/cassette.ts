import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { ensureDirectory } from "./storage.js";
import { slugify } from "./utils/ids.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CassetteEntry {
  direction: "request" | "response" | "notification";
  method: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
  timestampMs: number;
}

export interface Cassette {
  version: 1;
  targetId: string;
  recordedAt: string;
  transport: "stdio" | "http";
  entries: CassetteEntry[];
}

// ── I/O ──────────────────────────────────────────────────────────────────────

export function defaultCassettesDirectory(cwd = process.cwd()): string {
  return path.join(cwd, ".mcp-observatory", "cassettes");
}

export async function saveCassette(
  cassette: Cassette,
  outDir: string,
): Promise<string> {
  await ensureDirectory(outDir);
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const fileName = `${timestamp}--${slugify(cassette.targetId)}.cassette.json`;
  const filePath = path.join(outDir, fileName);
  await writeFile(filePath, JSON.stringify(cassette, null, 2) + "\n", "utf8");
  return filePath;
}

export async function loadCassette(filePath: string): Promise<Cassette> {
  const content = await readFile(filePath, "utf8");
  const data: unknown = JSON.parse(content);

  if (
    typeof data !== "object" ||
    data === null ||
    (data as Record<string, unknown>)["version"] !== 1 ||
    !Array.isArray((data as Record<string, unknown>)["entries"])
  ) {
    throw new Error(
      `Invalid cassette file: ${filePath}. Expected { version: 1, entries: [...] }.`,
    );
  }

  return data as Cassette;
}
