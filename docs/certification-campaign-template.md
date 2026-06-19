# MCP Observatory Certification Campaign

Use this tracker for outbound PR waves against MCP server repositories.

## Campaign Goal

Open helpful PRs that add MCP Observatory CI checks and a public compatibility/security badge to popular MCP server projects.

One-shot campaign target:

- 50 researched repos
- 25 PRs opened
- 10 accepted checks or badges
- 5 public proof points added to launch materials
- 3 production/security pilot conversations started

## Qualification Rules

Prioritize:

- active MCP server repos
- clear install/run command
- recent commit or release in the last 90 days
- 100+ stars, meaningful npm downloads, directory popularity, or enterprise category
- developer tools, security, CI/CD, database, browser automation, SaaS, cloud, or finance servers

Skip:

- servers that require private credentials to start
- repos with destructive default tools
- abandoned repos unless they have major download volume
- projects that already have equivalent MCP compatibility/security CI

## Tracker

| Priority | Repo | Package/Command | Category | Stars/Downloads/Listing Signal | Activity Signal | Risk Notes | Status | PR URL | Accepted/Badge/Proof |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `owner/repo` | `npx -y package` | Security | | | | researched | | |
| 2 | `owner/repo` | `npx -y package` | Developer Tools | | | | researched | | |
| 3 | `owner/repo` | `uvx package` | Browser Automation | | | | researched | | |
| 4 | `owner/repo` | `docker run image` | Database | | | | researched | | |
| 5 | `owner/repo` | `npx -y package` | Cloud | | | | researched | | |
| 6 | `owner/repo` | `npx -y package` | SaaS | | | | researched | | |
| 7 | `owner/repo` | `uvx package` | Finance | | | | researched | | |
| 8 | `owner/repo` | `npx -y package` | Developer Tools | | | | researched | | |
| 9 | `owner/repo` | `npx -y package` | Security | | | | researched | | |
| 10 | `owner/repo` | `docker run image` | Infrastructure | | | | researched | | |
| 11 | `owner/repo` | `npx -y package` | Developer Tools | | | | researched | | |
| 12 | `owner/repo` | `uvx package` | Data | | | | researched | | |
| 13 | `owner/repo` | `npx -y package` | Search | | | | researched | | |
| 14 | `owner/repo` | `npx -y package` | Filesystem | | | | researched | | |
| 15 | `owner/repo` | `docker run image` | Browser Automation | | | | researched | | |
| 16 | `owner/repo` | `npx -y package` | API | | | | researched | | |
| 17 | `owner/repo` | `uvx package` | Security | | | | researched | | |
| 18 | `owner/repo` | `npx -y package` | Database | | | | researched | | |
| 19 | `owner/repo` | `npx -y package` | Developer Tools | | | | researched | | |
| 20 | `owner/repo` | `docker run image` | Cloud | | | | researched | | |
| 21 | `owner/repo` | `npx -y package` | SaaS | | | | researched | | |
| 22 | `owner/repo` | `uvx package` | Data | | | | researched | | |
| 23 | `owner/repo` | `npx -y package` | Security | | | | researched | | |
| 24 | `owner/repo` | `npx -y package` | Developer Tools | | | | researched | | |
| 25 | `owner/repo` | `docker run image` | Infrastructure | | | | researched | | |
| 26 | `owner/repo` | `npx -y package` | Browser Automation | | | | researched | | |
| 27 | `owner/repo` | `uvx package` | API | | | | researched | | |
| 28 | `owner/repo` | `npx -y package` | Database | | | | researched | | |
| 29 | `owner/repo` | `npx -y package` | Search | | | | researched | | |
| 30 | `owner/repo` | `docker run image` | Cloud | | | | researched | | |
| 31 | `owner/repo` | `npx -y package` | Developer Tools | | | | researched | | |
| 32 | `owner/repo` | `uvx package` | Security | | | | researched | | |
| 33 | `owner/repo` | `npx -y package` | SaaS | | | | researched | | |
| 34 | `owner/repo` | `npx -y package` | Data | | | | researched | | |
| 35 | `owner/repo` | `docker run image` | Infrastructure | | | | researched | | |
| 36 | `owner/repo` | `npx -y package` | Finance | | | | researched | | |
| 37 | `owner/repo` | `uvx package` | Browser Automation | | | | researched | | |
| 38 | `owner/repo` | `npx -y package` | API | | | | researched | | |
| 39 | `owner/repo` | `npx -y package` | Database | | | | researched | | |
| 40 | `owner/repo` | `docker run image` | Security | | | | researched | | |
| 41 | `owner/repo` | `npx -y package` | Developer Tools | | | | researched | | |
| 42 | `owner/repo` | `uvx package` | Data | | | | researched | | |
| 43 | `owner/repo` | `npx -y package` | Search | | | | researched | | |
| 44 | `owner/repo` | `npx -y package` | SaaS | | | | researched | | |
| 45 | `owner/repo` | `docker run image` | Cloud | | | | researched | | |
| 46 | `owner/repo` | `npx -y package` | Filesystem | | | | researched | | |
| 47 | `owner/repo` | `uvx package` | Security | | | | researched | | |
| 48 | `owner/repo` | `npx -y package` | Developer Tools | | | | researched | | |
| 49 | `owner/repo` | `npx -y package` | Infrastructure | | | | researched | | |
| 50 | `owner/repo` | `docker run image` | Browser Automation | | | | researched | | |

Statuses:

- `researched`
- `branch-ready`
- `pr-opened`
- `accepted`
- `declined`
- `needs-maintainer-input`
- `proof-captured`
- `pilot-lead`

## PR Checklist

- Add `.github/workflows/mcp-observatory.yml`
- Use `deep: true` and `security: true`
- Keep `fail-on-regression: true` unless the repo is noisy
- Add README badge only when it fits the repo style
- Include the maintainer PR body from `certification-distribution.md`
- Do not include raw telemetry, private evidence, or sales pricing

## PR Templates

### Workflow-Only PR

```md
This adds a lightweight MCP Observatory check for this MCP server.

Why it helps:

- verifies MCP tools/prompts/resources still respond correctly
- catches schema drift and common security footguns before release
- posts a readable PR report for maintainers
- gives users a compatibility signal when evaluating MCP servers

It runs in GitHub Actions and does not require an account. If the check is too strict for this repo, `fail-on-regression: false` can be used while keeping the report visible.
```

### Workflow + Badge PR

```md
This adds MCP Observatory CI plus a small README badge so users can see this server is checked for MCP compatibility, schema drift, and common security issues.

The workflow runs on PRs and pushes to `main`. The badge links back to MCP Observatory for context and can be removed if it does not fit the repo style.
```

### Issue-Only Fallback

```md
I tried preparing a small MCP Observatory CI check for this server, but did not want to open a PR without confirming the safest startup command.

Would you accept a workflow that runs:

```bash
npx @kryptosai/mcp-observatory test <server command> --security --deep
```

The goal is to give users a visible compatibility/security signal and catch schema drift before releases.
```

## Proof Capture

For accepted PRs, record:

- repo
- PR URL
- category
- accepted date
- badge added: yes/no
- CI status
- quote or maintainer reaction if public
- whether the repo appears in Glama, PulseMCP, Smithery, or awesome-MCP lists

Use accepted PRs as proof for:

- README traction section
- launch posts
- enterprise outreach
- directory listing copy
- weekly MCP safety report
