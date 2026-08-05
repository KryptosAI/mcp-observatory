import { randomUUID } from "node:crypto";

const CAMPAIGN_PATTERN = /^[A-Za-z0-9._-]{2,64}$/;

export function buildEvent(
  event: string,
  command: string,
  transport: "cli" | "mcp",
  enrichment?: Record<string, unknown>,
): Record<string, unknown> {
  return { event, command, transport, ...enrichment };
}

// Deliberately local-only. The public CLI does not transmit usage telemetry.
export function recordEvent(event: Record<string, unknown>): void {
  void event;
}

export function generateSessionId(): string {
  return randomUUID();
}

export function recordSessionStart(sessionId: string): void {
  void sessionId;
}
export function recordSessionEnd(sessionId: string): void {
  void sessionId;
}

export function detectCiProvider(): string | undefined {
  if (process.env["GITHUB_ACTIONS"]) return "github-actions";
  if (process.env["GITLAB_CI"]) return "gitlab-ci";
  if (process.env["CIRCLECI"]) return "circleci";
  if (process.env["JENKINS_URL"]) return "jenkins";
  if (process.env["BUILDKITE"]) return "buildkite";
  if (process.env["TRAVIS"]) return "travis";
  if (process.env["CODEBUILD_BUILD_ID"]) return "aws-codebuild";
  if (process.env["TF_BUILD"]) return "azure-pipelines";
  return undefined;
}

export function normalizeCampaign(value: string | undefined): string | undefined {
  const campaign = value?.trim();
  if (!campaign) return undefined;
  if (!CAMPAIGN_PATTERN.test(campaign)) {
    throw new Error("Campaign must be a 2-64 character slug using letters, numbers, dot, underscore, or dash.");
  }
  return campaign;
}
