import type { Command } from "commander";

import { scanForTargets } from "../discovery.js";
import { detectEnvironment } from "../environment.js";
import { buildEvent, recordEvent } from "../command-events.js";
import { ANSI, c } from "./helpers.js";

// Curated popular servers shown when no stack-specific matches exist
const POPULAR_SERVERS: { name: string; desc: string }[] = [
  { name: "filesystem",        desc: "Read, write, and manage local files" },
  { name: "github",            desc: "Repos, issues, PRs, and code search" },
  { name: "fetch",             desc: "Fetch and parse any URL or web page" },
  { name: "memory",            desc: "Persistent knowledge graph for context" },
  { name: "postgres",          desc: "Query and manage PostgreSQL databases" },
  { name: "slack",             desc: "Read and send Slack messages" },
  { name: "google-maps",       desc: "Geocoding, directions, and place search" },
  { name: "puppeteer",         desc: "Browser automation and screenshots" },
  { name: "sequential-thinking", desc: "Step-by-step reasoning for complex tasks" },
  { name: "sentry",            desc: "Error tracking and performance monitoring" },
];

export function registerSuggestCommands(program: Command): void {
  program
    .command("suggest")
    .description("Detect your stack and recommend MCP servers.")
    .option("--cwd <path>", "Directory to scan for project signals.", process.cwd())
    .option("--no-color", "Disable colored output.")
    .action(async (options: { cwd: string }) => {
      process.stdout.write(`${c(ANSI.dim, "⟳")} Scanning environment...\n\n`);

      // 1. Current MCP servers
      const targets = await scanForTargets();
      if (targets.length > 0) {
        process.stdout.write(c(ANSI.bold, "  Configured MCP Servers\n"));
        for (const t of targets) {
          const detail = t.config.adapter === "http"
            ? (t.config as { url: string }).url
            : `${(t.config as { command: string }).command} ${t.config.args.join(" ")}`;
          process.stdout.write(`  ${c(ANSI.cyan, "●")} ${c(ANSI.bold, t.config.targetId)} ${c(ANSI.dim, detail)} ${c(ANSI.dim, `← ${t.source}`)}\n`);
        }
      } else {
        process.stdout.write(`  ${c(ANSI.yellow, "No MCP servers configured.")}\n`);
      }
      process.stdout.write("\n");

      // 2. Environment detection
      const env = await detectEnvironment(options.cwd);
      const hasSignals = env.languages.length > 0 || env.frameworks.length > 0 || env.databases.length > 0;
      if (hasSignals) {
        process.stdout.write(c(ANSI.bold, "  Detected Stack\n"));
        if (env.languages.length > 0)  process.stdout.write(`  ${c(ANSI.dim, "Languages:")}  ${env.languages.join(", ")}\n`);
        if (env.frameworks.length > 0) process.stdout.write(`  ${c(ANSI.dim, "Frameworks:")} ${env.frameworks.join(", ")}\n`);
        if (env.databases.length > 0)  process.stdout.write(`  ${c(ANSI.dim, "Databases:")}  ${env.databases.join(", ")}\n`);
        if (env.cloud.length > 0)      process.stdout.write(`  ${c(ANSI.dim, "Cloud:")}      ${env.cloud.join(", ")}\n`);
        if (env.cicd.length > 0)       process.stdout.write(`  ${c(ANSI.dim, "CI/CD:")}      ${env.cicd.join(", ")}\n`);
        if (env.services.length > 0)   process.stdout.write(`  ${c(ANSI.dim, "Services:")}   ${env.services.join(", ")}\n`);
      } else {
        process.stdout.write(`  ${c(ANSI.dim, "No recognizable project signals in")} ${options.cwd}\n`);
      }
      process.stdout.write("\n");

      // 3. MCP Registry — filtered by detected stack
      try {
        const response = await fetch("https://registry.modelcontextprotocol.io/v0/servers", {
          signal: AbortSignal.timeout(10_000),
          headers: { "Accept": "application/json" },
        });
        if (response.ok) {
          const data: unknown = await response.json();
          const raw = Array.isArray(data) ? data : (typeof data === "object" && data !== null
            ? ((data as Record<string, unknown>)["servers"] ?? (data as Record<string, unknown>)["results"] ?? (data as Record<string, unknown>)["items"])
            : null);
          if (Array.isArray(raw)) {
            const allEntries = (raw as Array<Record<string, unknown>>);

            // Build keyword set from detected environment
            const keywords = new Set<string>([
              ...env.languages, ...env.frameworks, ...env.databases,
              ...env.services, ...env.cloud, ...env.cicd,
            ].map(s => s.toLowerCase()));

            // Also add common aliases
            const aliases: Record<string, string[]> = {
              typescript: ["ts"], javascript: ["js", "node"], python: ["py"],
              postgresql: ["postgres"], mongodb: ["mongo"], github: ["gh"],
            };
            for (const kw of [...keywords]) {
              for (const [full, abbrs] of Object.entries(aliases)) {
                if (kw === full) for (const a of abbrs) keywords.add(a);
                if (abbrs.includes(kw)) keywords.add(full);
              }
            }

            // Score each entry against detected stack
            const scored = allEntries.map(entry => {
              const srv = (typeof entry["server"] === "object" && entry["server"] !== null ? entry["server"] : entry) as Record<string, unknown>;
              const name = typeof srv["name"] === "string" ? srv["name"] : (typeof entry["name"] === "string" ? entry["name"] : "unknown");
              const desc = typeof srv["description"] === "string" ? srv["description"] : (typeof entry["description"] === "string" ? entry["description"] : "");
              const text = `${name} ${desc}`.toLowerCase();
              const matches = [...keywords].filter(k => text.includes(k)).length;
              return { name, desc, matches };
            });

            // Deduplicate by name (registry can return duplicates)
            const seenNames = new Set<string>();
            const deduped = scored.filter(s => {
              if (seenNames.has(s.name)) return false;
              seenNames.add(s.name);
              return true;
            });

            const recommended = deduped.filter(s => s.matches > 0).sort((a, b) => b.matches - a.matches);
            const others = deduped.filter(s => s.matches === 0);

            if (recommended.length > 0) {
              process.stdout.write(c(ANSI.bold, "  Recommended for Your Stack\n"));
              for (const r of recommended.slice(0, 10)) {
                process.stdout.write(`  ${c(ANSI.green, "★")} ${c(ANSI.bold, r.name)}${r.desc ? ` ${c(ANSI.dim, "—")} ${r.desc}` : ""}\n`);
              }
              if (recommended.length > 10) {
                process.stdout.write(`  ${c(ANSI.dim, `... and ${recommended.length - 10} more matches`)}\n`);
              }
            } else {
              process.stdout.write(c(ANSI.bold, "  Popular MCP Servers\n"));
              for (const s of POPULAR_SERVERS) {
                process.stdout.write(`  ${c(ANSI.green, "★")} ${c(ANSI.bold, s.name)} ${c(ANSI.dim, "—")} ${s.desc}\n`);
              }
            }

            if (others.length > 0) {
              process.stdout.write(`\n  ${c(ANSI.dim, `${others.length} more servers at registry.modelcontextprotocol.io`)}\n`);
            }
          } else {
            process.stdout.write(`  ${c(ANSI.dim, "Registry returned unexpected format.")}\n`);
          }
        } else {
          process.stdout.write(`  ${c(ANSI.dim, `Registry returned HTTP ${response.status}`)}\n`);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        process.stdout.write(`  ${c(ANSI.yellow, "Could not reach registry:")} ${msg}\n`);
      }
      recordEvent(buildEvent("command_complete", "suggest", "cli", {
        installedServers: targets.map(t => t.config.targetId),
        detectedLanguages: env.languages,
        detectedFrameworks: env.frameworks,
      }));

      process.stdout.write("\n");
    });
}
