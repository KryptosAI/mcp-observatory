# Open-source Observatory hosting

This MIT-licensed Cloudflare Worker provides HTTP MCP checks, private receipt uploads, multi-target history, HTML reports, JSON downloads, GitHub OAuth/device sign-in, and retention cleanup. It is extracted from the existing Observatory service without ClearFrame account, inference, billing, production configuration, or customer data. All features are free; there is no checkout route or paid entitlement.

Use the account-free `mcp-observatory dashboard` for the simplest workflow. Self-hosting is optional and your hosting provider's infrastructure charges still apply. This Worker is a separate deployment; it does not migrate identities, receipts, or subscriptions from the managed ClearFrame account service.

## Verify locally

Use Node.js 24 for hosting checks; the test fixture uses `node:sqlite`. From this folder:

```sh
npm ci
npm run typecheck
npm test
npx wrangler deploy --dry-run
npx wrangler d1 migrations apply mcp-observatory-community --local
npm run dev
```

The checked-in config uses placeholder resource IDs and localhost URLs. A dry run proves bundling, not a configured or authenticated production service. The public health endpoint is `/api/v1/health`; `/api/v1/readiness` verifies D1 migrations. GitHub login and uploads require the identity setup below; no development token is checked in.

## Configure your deployment

1. Choose your own Worker name in `wrangler.toml` and create your own `SCAN_CACHE` KV namespace and D1 database using Wrangler. Replace both placeholder IDs. Do not reuse the managed service's bindings.
2. Set `APP_BASE_URL` and `GITHUB_REDIRECT_URI` to your HTTPS origin and its `/auth/callback` route. Create a GitHub OAuth application for that callback. It needs public profile and email identity, not organization membership.
3. Store `SESSION_SECRET`, `GITHUB_CLIENT_ID`, and `GITHUB_CLIENT_SECRET` with `wrangler secret put NAME`. Generate a random session secret locally; enter secrets through the prompt and never put them into source control or command arguments.
4. Apply `npx wrangler d1 migrations apply mcp-observatory-community --remote`, then deploy with `npm run deploy`. Verify health, readiness, sign-in, an owned receipt upload/download, and denial of another account's records before inviting users.
5. Keep the nightly retention trigger and public-only fetch compatibility flag. Add your own operational monitoring and storage policies. The source defaults to 90-day hosted retention, 1,000 targets, 10,000 uploads/month and 100 hosted scans/month per account. These are resource limits, not purchasable tiers.

## Connect the CLI

Set the deployment URL before **every** cloud command. The upload endpoint is derived from it; `MCP_OBSERVATORY_CLOUD_ENDPOINT` may override it explicitly.

```sh
export MCP_OBSERVATORY_CLOUD_URL=https://your-observatory.example
npx -y @kryptosai/mcp-observatory@latest cloud login
npx -y @kryptosai/mcp-observatory@latest cloud upload
```

A CLI device login creates a signed session for this deployment. Hosted accounts remain isolated by verified GitHub user ID. Reauthenticate when switching deployments; never copy a production token into an example. Optional static `CLOUD_UPLOAD_TOKEN` and `HOSTED_SCAN_TOKEN` bindings are administrative compatibility credentials with broad deployment access; leave them unset for normal personal accounts.

Hosted scans accept authorized public HTTP endpoints only. Local-process targets, credential-bearing URLs, private/reserved networks and redirect following are rejected. Hosted scans enumerate protocol capabilities and return evidence; use the local CLI for the broader source, skill, package, attack simulation and runtime workflows. Keep sensitive evidence private and retain your own backups.

The service makes no model calls and includes no external analytics script. Optional service events stay in this deployment's D1 database. GitHub handles sign-in, Cloudflare hosts storage and public-address DNS verification, and the public Safety Index is fetched from Observatory's published evidence endpoint.

After reviewing a receipt, run `mcp-observatory clearframe` locally to prepare an optional task for ClearFrame CLI or Mac. The task command never launches inference or uploads evidence.
