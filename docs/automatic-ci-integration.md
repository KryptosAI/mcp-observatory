# Automatic CI Integration

## Keep your results in the hosted dashboard

Local CI checks are free. Uploading CI results to hosted history requires Individual Pro.

In your MCP server repository, run:

```bash
npx -y @kryptosai/mcp-observatory@latest setup-ci --all --cloud
```

Complete the GitHub device sign-in if prompted. Review the generated workflow and its server startup command before committing it. If your project cannot be detected, pass `--command` with the same startup command you use to run your own MCP server.

The workflow reads the repository Actions secret `MCP_OBSERVATORY_CLOUD_TOKEN`. After signing in locally, you can transfer the credential directly to that secret using the authenticated GitHub CLI, from this repository:

```bash
node -e 'const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),cp=require("node:child_process");const t=JSON.parse(fs.readFileSync(path.join(os.homedir(),".mcp-observatory","auth.json"),"utf8"));if(!t.accessToken||!t.expiresAt||t.expiresAt<=Date.now())throw Error("Run cloud login first");cp.execFileSync("gh",["secret","set","MCP_OBSERVATORY_CLOUD_TOKEN"],{input:t.accessToken,stdio:["pipe","inherit","inherit"]});'
```

This reads your saved Observatory credential and sends it to GitHub without printing it. Never commit `auth.json` or paste its contents into an issue. Alternatively, use the repository's **Settings → Secrets and variables → Actions** to set the secret with the saved `accessToken` value.

Commit the generated files and run the workflow from GitHub's Actions tab. After it succeeds, open your [hosted dashboard](https://app.mcp-observatory.com/dashboard) and check the target's history. Secrets are unavailable to pull requests from forks; use a trusted branch or manual run to verify hosted uploads.

Cloud device credentials currently expire after 30 days. If uploads return `401`, run `npx -y @kryptosai/mcp-observatory@latest cloud login` and repeat the secret transfer. If the workflow already existed, `setup-ci` preserves it; add its `cloud-token` input using the [action reference](../action/README.md) or deliberately regenerate it after reviewing your changes.

## Optional install-time setup

MCP Observatory includes an install-time CI helper for MCP server projects.

By default, the helper is safe and non-mutating: when it detects a likely MCP project, it prints the exact `setup-ci` command to add GitHub Actions. It does not create files unless the project explicitly opts in.

To let installs create the workflow automatically, add this to the MCP server project's `package.json`:

```json
{
  "mcpObservatory": {
    "autoSetupCi": true,
    "command": "npm run mcp",
    "sarif": true
  }
}
```

Then installing MCP Observatory creates `.github/workflows/mcp-observatory.yml` if it does not already exist:

```bash
npm install -D @kryptosai/mcp-observatory
npx @kryptosai/mcp-observatory setup-ci --doctor
```

Environment controls:

- `MCP_OBSERVATORY_AUTO_SETUP_CI=1` creates CI during install for detected MCP projects.
- `MCP_OBSERVATORY_TARGET_COMMAND="npm run mcp"` provides the startup command.
- `MCP_OBSERVATORY_AUTO_SETUP_SARIF=1` enables SARIF upload in the generated workflow.
- `MCP_OBSERVATORY_POSTINSTALL=0` or `MCP_OBSERVATORY_DISABLE_POSTINSTALL=1` disables the helper.

The helper skips CI environments and skips MCP Observatory's own repository. Existing workflows are never overwritten.
