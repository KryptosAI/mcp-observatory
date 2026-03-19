import { existsSync, readFileSync } from "node:fs";

interface PackageManifest {
  version?: string;
}

function readManifest(): PackageManifest {
  const candidates = [
    new URL("../package.json", import.meta.url),
    new URL("../../package.json", import.meta.url)
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return JSON.parse(readFileSync(candidate, "utf8")) as PackageManifest;
    }
  }

  return {};
}

const manifest = readManifest();

export const TOOL_VERSION = manifest.version ?? "0.0.0";
