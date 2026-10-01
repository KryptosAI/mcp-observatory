import { ANSI, c, getBinName, isQuiet } from "./commands/helpers.js";
import { hasValidToken } from "./auth.js";
import { getAccessToken, whoami } from "./auth.js";

const CONTACT = "william@banksey.com";
export const DEFAULT_CLOUD_UPLOAD_ENDPOINT = "https://app.mcp-observatory.com/api/v1/artifacts";
export const DEFAULT_CLOUD_BASE_URL = "https://app.mcp-observatory.com";
export const SELF_SERVE_PRICING_URL = `${DEFAULT_CLOUD_BASE_URL}/pricing`;

export function getCloudBaseUrl(): string {
  return process.env["MCP_OBSERVATORY_CLOUD_URL"]?.trim() || DEFAULT_CLOUD_BASE_URL;
}

export function getCloudUploadEndpoint(): string {
  return process.env["MCP_OBSERVATORY_CLOUD_ENDPOINT"]?.trim() || DEFAULT_CLOUD_UPLOAD_ENDPOINT;
}

export function hasCloudToken(): boolean {
  return Boolean(process.env["MCP_OBSERVATORY_CLOUD_TOKEN"]) || hasValidToken();
}

export async function getCloudAccessToken(): Promise<string | null> {
  const envToken = process.env["MCP_OBSERVATORY_CLOUD_TOKEN"];
  if (envToken) return envToken;
  return getAccessToken();
}

export async function cloudWhoami(): ReturnType<typeof whoami> {
  return whoami();
}

export function cloudUpgradeLine(context: "ci" | "security" | "fleet" | "general" = "general"): string {
  const bin = getBinName();
  const value =
    context === "ci"
      ? "hosted CI ingestion, 90-day history, and regression markers"
      : context === "security"
        ? "hosted evidence, score history, and artifact downloads"
        : context === "fleet"
          ? "hosted evidence history for one developer"
          : "hosted evidence, scan history, and CI ingestion";

  return [
    c(ANSI.dim, `  Hosted option for one developer: ${value}.`),
    c(ANSI.dim, `  Upload one hosted snapshot free: ${c(ANSI.cyan, `${bin} cloud upload`)}`),
    c(ANSI.dim, `  Add Individual Pro · $29/month only when you need history: ${c(ANSI.cyan, `${SELF_SERVE_PRICING_URL}?plan=individual`)}`),
  ].join("\n");
}

export function cloudPassLine(context: "ci" | "security" | "fleet" | "general" = "general"): string {
  const value =
    context === "ci"
      ? "hosted CI ingestion and 90-day history"
      : context === "security"
        ? "hosted evidence and score history"
        : context === "fleet"
          ? "hosted evidence for one developer"
          : "hosted evidence and scan history";
  return c(ANSI.dim, `  Hosted option for one developer: ${value}. Upload one snapshot free with ${c(ANSI.cyan, `${getBinName()} cloud upload`)}.`);
}

export function maybePrintCloudCta(
  context: "ci" | "security" | "fleet" | "general" = "general",
  gate?: string,
): void {
  if (isQuiet() || hasCloudToken()) return;
  if (gate !== "fail" && gate !== "critical_risk") {
    process.stdout.write(`${cloudPassLine(context)}\n\n`);
    return;
  }
  process.stdout.write(`${cloudUpgradeLine(context)}\n\n`);
}

export function printCloudInfo(): void {
  process.stdout.write(
    [
      "",
      c(ANSI.bold, "MCP Observatory Cloud"),
      "",
      "Free local OSS use remains unlimited. Sign in with GitHub and upload one hosted",
      "snapshot before deciding whether retained history is worth paying for.",
      "",
      "Self-serve hosted plan:",
      `  Individual Pro: $29/month — ${SELF_SERVE_PRICING_URL}?plan=individual`,
      "  One user, hosted history, CI ingestion, regression markers, and artifact downloads.",
      `  Try the free snapshot first: ${getBinName()} cloud upload`,
      "",
      "Need a human production decision?",
      "  Release Gate Pilot: $15,000 for 1-3 servers in ten business days.",
      "  https://mcp-observatory.com/release-gate-pilot/",
      "",
      `Contact: ${CONTACT}`,
      "",
    ].join("\n"),
  );
}
