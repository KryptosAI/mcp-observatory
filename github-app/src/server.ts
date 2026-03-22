/**
 * Express server that receives GitHub webhooks with signature verification
 * and dispatches to the MCP Observatory PR handler.
 */

import express from "express";
import { Webhooks, createNodeMiddleware } from "@octokit/webhooks";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { handlePullRequest, type PullRequestEvent } from "./app.js";

// --- Environment ---

const APP_ID = process.env.GITHUB_APP_ID;
const PRIVATE_KEY = process.env.GITHUB_PRIVATE_KEY;
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const PORT = parseInt(process.env.PORT ?? "3000", 10);

if (!APP_ID || !PRIVATE_KEY || !WEBHOOK_SECRET) {
  console.error(
    "Missing required env vars: GITHUB_APP_ID, GITHUB_PRIVATE_KEY, GITHUB_WEBHOOK_SECRET"
  );
  process.exit(1);
}

// --- Octokit factory ---

function createInstallationOctokit(installationId: number): Octokit {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: APP_ID!,
      privateKey: PRIVATE_KEY!,
      installationId,
    },
  });
}

// --- Webhook handling ---

const webhooks = new Webhooks({ secret: WEBHOOK_SECRET });

webhooks.on(
  ["pull_request.opened", "pull_request.synchronize"],
  async ({ payload }) => {
    const event = payload as unknown as PullRequestEvent;
    const installationId = event.installation?.id;

    if (!installationId) {
      console.error("No installation ID in webhook payload, skipping");
      return;
    }

    const octokit = createInstallationOctokit(installationId);
    await handlePullRequest(event, octokit);
  }
);

webhooks.onError((error) => {
  console.error("Webhook error:", error);
});

// --- Express server ---

const app = express();

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", app: "mcp-observatory-github-app" });
});

// Webhook endpoint with signature verification
app.use(createNodeMiddleware(webhooks, { path: "/api/webhooks" }));

app.listen(PORT, () => {
  console.log(`MCP Observatory GitHub App listening on port ${PORT}`);
  console.log(`Webhook endpoint: POST /api/webhooks`);
});
