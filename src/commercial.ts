import { ANSI, c, getBinName, isQuiet } from "./commands/helpers.js";
import { hasValidToken } from "./auth.js";
import { getAccessToken, whoami } from "./auth.js";

const CONTACT = "william@banksey.com";
export const DEFAULT_CLOUD_UPLOAD_ENDPOINT = "https://app.mcp-observatory.com/api/v1/artifacts";
export const DEFAULT_CLOUD_BASE_URL = "https://app.mcp-observatory.com";

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
      ? "hosted CI history, private-repo reporting, and production badges"
      : context === "security"
        ? "hosted security reports, certification, and controlled drift review"
        : context === "fleet"
          ? "MCP fleet visibility, drift reports, and production support"
          : "hosted reporting, security review, and enterprise support";

  return [
    c(ANSI.dim, `  Production MCP teams: ${value}.`),
    c(ANSI.dim, `  Run ${c(ANSI.cyan, `${bin} cloud`)} or contact ${CONTACT}.`),
  ].join("\n");
}

export function maybePrintCloudCta(context: "ci" | "security" | "fleet" | "general" = "general"): void {
  if (isQuiet() || hasCloudToken()) return;
  process.stdout.write(`${cloudUpgradeLine(context)}\n\n`);
}

export function printCloudInfo(): void {
  process.stdout.write(
    [
      "",
      c(ANSI.bold, "MCP Observatory Cloud"),
      "",
      "Free local OSS use remains available. Production teams can add hosted reporting,",
      "private-repo CI, security reports, certification, support, and MCP fleet visibility.",
      "",
      "Pilot pricing:",
      "  Team Pilot:       starts at $299/month",
      "  Business Pilot:   starts at $999/month",
      "  Enterprise Pilot: starts at $3k/month",
      "  Strategic:        custom, $250k+/year",
      "",
      "Paid pilot paths:",
      "  1. Private MCP readiness review + remediation packet",
      "  2. Hosted CI history for private repos",
      "  3. Recurring security/drift reports",
      "  4. Certification/readiness badge for MCP servers",
      "  5. MCP fleet inventory and production support",
      "",
      "To enable hosted uploads, set MCP_OBSERVATORY_CLOUD_TOKEN after receiving a pilot token.",
      `Upload an artifact: ${getBinName()} cloud upload .mcp-observatory/runs/<run>.json`,
      `Contact: ${CONTACT}`,
      "",
    ].join("\n"),
  );
}
