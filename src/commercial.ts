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
  return process.env["MCP_OBSERVATORY_CLOUD_ENDPOINT"]?.trim() || `${getCloudBaseUrl().replace(/\/$/, "")}/api/v1/artifacts`;
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

/** Compatibility exports for old command call sites. Observatory has no paid tier. */
export function cloudUpgradeLine(_context: "ci" | "security" | "fleet" | "general" = "general"): string {
  return cloudPassLine(_context);
}

export function cloudPassLine(_context: "ci" | "security" | "fleet" | "general" = "general"): string {
  void _context;
  return c(ANSI.dim, `  Continue in ClearFrame: ${getBinName()} clearframe — prepare a local task for the CLI or Mac app.`);
}

export function maybePrintCloudCta(
  context: "ci" | "security" | "fleet" | "general" = "general",
  _gate?: string,
): void {
  void _gate;
  if (isQuiet() || !process.stdout.isTTY || process.env["CI"] || process.env["MCP_OBSERVATORY_NO_PROMO"] === "1") return;
  process.stderr.write(`${cloudPassLine(context)}\n`);
}

export function printCloudInfo(): void {
  process.stdout.write([
    "MCP Observatory is free and open source under MIT.",
    `Local history and downloads: ${getBinName()} dashboard`,
    `Continue in ClearFrame: ${getBinName()} clearframe`,
    "CLI and Mac app: https://clearframecode.com/download/?utm_source=mcp-observatory&utm_medium=cli&utm_campaign=opensource",
    "Legacy cloud login/upload remain available for existing accounts.",
    "No Observatory subscription or ClearFrame account is needed for local features.",
    `Contact: ${CONTACT}`, "",
  ].join("\n"));
}
