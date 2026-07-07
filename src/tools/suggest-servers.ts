import path from "node:path";

import { z } from "zod";

import { scanForTargets } from "../discovery.js";
import { detectEnvironment } from "../environment.js";
import { errorMessage } from "../utils/errors.js";
import { logRequest } from "./helpers.js";

export const name = "suggest_servers";
export const description = "Use this when setting up a project or wondering what MCP servers to add. Scans the working directory for languages, frameworks, databases, and cloud providers, lists currently configured servers, and cross-references the MCP registry to recommend servers you're missing.";
export const schema = {
  cwd: z.string().optional().describe("Working directory to scan for environment signals. Defaults to process.cwd()."),
};

export async function handler({ cwd }: { cwd?: string }) {
  const startMs = Date.now();
  const workDir = cwd ?? process.cwd();
  const resolvedDir = path.resolve(workDir);
  const cwdRoot = path.resolve(process.cwd());
  if (!resolvedDir.startsWith(cwdRoot + path.sep) && resolvedDir !== cwdRoot) {
    logRequest("suggest_servers", startMs, true);
    return { content: [{ type: "text" as const, text: `Path "${cwd}" resolves outside the working directory.` }], isError: true };
  }
  const sections: string[] = [];

  try {
    const targets = await scanForTargets();
    if (targets.length > 0) {
      const serverLines = targets.map((t) => {
        const id = t.config.targetId;
        const detail = t.config.adapter === "http"
          ? `(HTTP: ${t.config.url})`
          : `(command: ${t.config.command} ${t.config.args.join(" ")})`;
        return `  - ${id} ${detail} [source: ${t.source}]`;
      });
      sections.push(`## Currently Configured MCP Servers\n${serverLines.join("\n")}`);
    } else {
      sections.push("## Currently Configured MCP Servers\nNone found.");
    }
  } catch (error) {
    const msg = errorMessage(error);
    sections.push(`## Currently Configured MCP Servers\nError scanning: ${msg}`);
  }

  try {
    const env = await detectEnvironment(workDir);
    const envLines: string[] = [];
    if (env.languages.length > 0) envLines.push(`  Languages: ${env.languages.join(", ")}`);
    if (env.frameworks.length > 0) envLines.push(`  Frameworks: ${env.frameworks.join(", ")}`);
    if (env.databases.length > 0) envLines.push(`  Databases: ${env.databases.join(", ")}`);
    if (env.cloud.length > 0) envLines.push(`  Cloud: ${env.cloud.join(", ")}`);
    if (env.cicd.length > 0) envLines.push(`  CI/CD: ${env.cicd.join(", ")}`);
    if (env.services.length > 0) envLines.push(`  Services (detected from .env keys): ${env.services.join(", ")}`);
    if (envLines.length > 0) {
      sections.push(`## Detected Environment (${workDir})\n${envLines.join("\n")}`);
    } else {
      sections.push(`## Detected Environment (${workDir})\nNo recognizable project signals found.`);
    }
  } catch (error) {
    const msg = errorMessage(error);
    sections.push(`## Detected Environment\nError: ${msg}`);
  }

  try {
    const registryUrl = "https://registry.modelcontextprotocol.io/v0/servers";
    const response = await fetch(registryUrl, {
      signal: AbortSignal.timeout(10_000),
      headers: { "Accept": "application/json" },
    });
    if (response.ok) {
      const data: unknown = await response.json();

      function formatRegistryEntry(entry: Record<string, unknown>): string {
        const srv = (typeof entry["server"] === "object" && entry["server"] !== null
          ? entry["server"] : entry) as Record<string, unknown>;
        const rawName = srv["name"] ?? entry["name"] ?? entry["id"];
        const name = typeof rawName === "string" ? rawName : "unknown";
        const rawDesc = srv["description"] ?? entry["description"];
        const desc = typeof rawDesc === "string" ? ` — ${rawDesc}` : "";
        return `  - ${name}${desc}`;
      }

      if (Array.isArray(data)) {
        const entries = data.slice(0, 50) as Array<Record<string, unknown>>;
        const registryLines = entries.map(formatRegistryEntry);
        sections.push(`## MCP Registry (${String(entries.length)} of ${String(data.length)} servers shown)\n${registryLines.join("\n")}`);
      } else if (typeof data === "object" && data !== null) {
        const obj = data as Record<string, unknown>;
        const servers = obj["servers"] ?? obj["results"] ?? obj["items"];
        if (Array.isArray(servers)) {
          const entries = (servers as Array<Record<string, unknown>>).slice(0, 50);
          const registryLines = entries.map(formatRegistryEntry);
          sections.push(`## MCP Registry (${String(entries.length)} of ${String(servers.length)} servers shown)\n${registryLines.join("\n")}`);
        } else {
          sections.push(`## MCP Registry\nRegistry returned data but in an unexpected format. Keys: ${Object.keys(obj).join(", ")}`);
        }
      }
    } else {
      sections.push(`## MCP Registry\nRegistry returned HTTP ${String(response.status)}. The listing endpoint may not be publicly available.`);
    }
  } catch (error) {
    const msg = errorMessage(error);
    sections.push(`## MCP Registry\nCould not reach registry: ${msg}`);
  }

  logRequest("suggest_servers", startMs);
  return { content: [{ type: "text" as const, text: sections.join("\n\n") }] };
}
