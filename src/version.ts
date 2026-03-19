import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

function resolveVersion(): string {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  // Walk up looking for package.json (works in both src/ dev and dist/src/ packed)
  for (const relative of ["../package.json", "../../package.json"]) {
    try {
      const content = readFileSync(path.resolve(dir, relative), "utf8");
      const pkg = JSON.parse(content) as { version?: string };
      if (pkg.version) return pkg.version;
    } catch {
      // continue searching
    }
  }
  return "0.0.0";
}

export const TOOL_VERSION = resolveVersion();
