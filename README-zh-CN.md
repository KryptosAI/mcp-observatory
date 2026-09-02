> 🇺🇸 English: [README.md](README.md) · [中文文档目录](docs/zh/README.md)  

<p align="center">
  <img src="docs/assets/mcp-observatory-logo.png" alt="MCP Observatory" width="482"/>
</p>

<h1 align="center">MCP Observatory</h1>

[![CI](https://github.com/KryptosAI/mcp-observatory/actions/workflows/ci.yml/badge.svg)](https://github.com/KryptosAI/mcp-observatory/actions/workflows/ci.yml)
[![CodeQL](https://github.com/KryptosAI/mcp-observatory/actions/workflows/codeql.yml/badge.svg)](https://github.com/KryptosAI/mcp-observatory/actions/workflows/codeql.yml)
[![覆盖率工作流](https://github.com/KryptosAI/mcp-observatory/actions/workflows/coverage.yml/badge.svg)](https://github.com/KryptosAI/mcp-observatory/actions/workflows/coverage.yml)
[![npm](https://img.shields.io/npm/v/@kryptosai/mcp-observatory)](https://www.npmjs.com/package/@kryptosai/mcp-observatory)
[![GitHub stars](https://img.shields.io/github/stars/KryptosAI/mcp-observatory?style=flat)](https://github.com/KryptosAI/mcp-observatory/stargazers)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

<details>
<summary>更多徽章</summary>

[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/KryptosAI/mcp-observatory/badge)](https://securityscorecards.dev/viewer/?uri=github.com/KryptosAI/mcp-observatory)
[![Dependabot](https://img.shields.io/badge/dependabot-enabled-025e8c?logo=dependabot)](./.github/dependabot.yml)
[![npm provenance workflow](https://img.shields.io/badge/npm%20provenance-workflow-blue)](./.github/workflows/release.yml)
[![npm weekly downloads](https://img.shields.io/npm/dw/@kryptosai/mcp-observatory)](https://www.npmjs.com/package/@kryptosai/mcp-observatory)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-339933)](./package.json)
[![Smithery](https://smithery.ai/badge/@kryptosai/mcp-observatory)](https://smithery.ai/server/@kryptosai/mcp-observatory)
[![mcp-observatory MCP server](https://glama.ai/mcp/servers/KryptosAI/mcp-observatory/badges/score.svg)](https://glama.ai/mcp/servers/KryptosAI/mcp-observatory)
[![All Contributors](https://img.shields.io/badge/all_contributors-8-orange.svg?style=flat-square)](./CONTRIBUTORS.md)
[![Gitee Stars](https://gitee.com/williamweishuhn/mcp-observatory/badge/star.svg)](https://gitee.com/williamweishuhn/mcp-observatory)
[![Gitee Forks](https://gitee.com/williamweishuhn/mcp-observatory/badge/fork.svg)](https://gitee.com/williamweishuhn/mcp-observatory)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-listed-blue)](https://registry.modelcontextprotocol.io)
[![MCP Market](https://img.shields.io/badge/MCP_Market-premium-gold)](https://mcpmarket.com)
[![MCP Hub China](https://img.shields.io/badge/MCP_Hub_China-listed-red)](https://mcp-hub.cn)
[![OpenTools](https://img.shields.io/badge/OpenTools-listed-green)](https://opentools.ai)
[![Gitee](https://img.shields.io/badge/Gitee-镜像-orange)](https://gitee.com/williamweishuhn/mcp-observatory)

</details>

> 我们热烈欢迎中国开发者贡献代码、文档和新的 MCP 服务器安全索引条目。请查看 [CONTRIBUTING.zh-CN.md](CONTRIBUTING.zh-CN.md) 了解如何参与。

**MCP Observatory 在 AI Agent 依赖 MCP 服务器之前，绘制其风险图谱。** 帮助团队在将 MCP 服务器部署到敏感、受监管或关键任务的 AI Agent 环境之前进行验证。

<p align="center">
  <img src="docs/demo.gif" alt="MCP Observatory 演示" width="700"/>
</p>

Agent 不应依赖没人测试过的工具。MCP Observatory 将本地 MCP 检查转化为可移植的验证凭证、风险图谱、发布门禁证据、GitHub Code Scanning 的 SARIF、GitHub Actions 门禁、schema 漂移检测、信任状态输出、评分徽章以及 Agent 可访问的诊断信息。

```bash
npx @kryptosai/mcp-observatory audit npx -y my-mcp-server --profile nsa-mcp --format markdown --output mcp-audit.md
```

信任输出示例：

```json
{
  "target_id": "my-mcp-server",
  "profile": "nsa-mcp",
  "score": 87,
  "status": "needs_review",
  "finding_count": 2
}
```

`nsa-mcp` 配置文件并非官方认证。它将 MCP Observatory 的发现映射到敏感环境的实用控制领域：信任边界、工具权限、工具描述完整性、认证、密钥暴露、schema 验证、输入验证、可审计性、运行时安全性和供应链。

## 信任信号

| 信号 | 含义 |
|---|---|
| CI + 覆盖率 | 类型检查、lint、测试、构建、打包安装、制品验证、冒烟测试以及覆盖率测量均在 GitHub Actions 中运行。 |
| CodeQL + OpenSSF Scorecard | 静态分析和供应链态势在 GitHub 原生安全界面中可见。 |
| Dependabot | npm 和 GitHub Actions 依赖更新每周监控。 |
| npm 溯源工作流 | 发布自动化已为通过 GitHub OIDC 的 npm 溯源做好准备。 |
| 安全策略 | 漏洞报告通过私有披露渠道处理；详见 [SECURITY.md](./SECURITY.md)。 |

## 试用

运行公共证据循环：生成凭证、映射到风险图谱、添加 CI/SARIF，然后免费上传一份个人托管快照；若关键服务器需要人工发布决策，可申请固定范围的 Release Gate Pilot。

```bash
npx @kryptosai/mcp-observatory audit npx -y my-mcp-server --profile nsa-mcp --format markdown --output report.md
npx @kryptosai/mcp-observatory audit npx -y my-mcp-server --profile nsa-mcp --format sarif --output results.sarif
npx @kryptosai/mcp-observatory score npx -y my-mcp-server --profile nsa-mcp --format json
```

或者从首页演示开始：安全地模拟单个服务器的 MCP 攻击准备情况，生成操作凭证，并生成维护者可在 GitHub Code Scanning 中检查的 SARIF 证据。

```bash
npx @kryptosai/mcp-observatory attack-sim npx -y my-mcp-server --sarif attack-results.sarif
```

生成可移植的信任记录：

```bash
npx @kryptosai/mcp-observatory audit npx -y my-mcp-server --profile nsa-mcp --format json --output report.json --receipt receipt.json
npx @kryptosai/mcp-observatory receipt npx -y my-mcp-server --profile nsa-mcp --format markdown --output receipt.md
npx @kryptosai/mcp-observatory risk-graph --input receipt.json --json mcp-risk-graph.json --output mcp-risk-graph.md --html mcp-risk-graph.html
```

然后在 CI 中使其可重复执行：

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y my-mcp-server" --sarif
```

参见 [政府和企业的试点简报](./docs/government-enterprise-pilot.md)、[公共指导对照表](./docs/public-guidance-crosswalk.md)、[采购一页摘要](./docs/procurement-one-pager.md)、[安全尽职调查包](./docs/security-due-diligence.md)、[NSA-MCP 审计 CI 指南](./docs/nsa-mcp-audit-ci.md)、[NSA-MCP 审计报告示例](./docs/examples/nsa-mcp-audit-report.md)、[MCP 凭证](./docs/mcp-receipts.md)、[MCP 攻击模拟器](./docs/mcp-attack-simulator.md)、[工具调用凭证](./docs/tool-call-receipts.md)、[MCP 风险图谱](./docs/receipt-graph.md)、[发布页面](./docs/launch.md)、[GitHub Code Scanning 演示](./docs/code-scanning-demo.md)、[MCP 服务器的 GitHub Code Scanning](./docs/github-code-scanning-for-mcp.md)、[安全报告示例](./docs/mcp-server-safety-index.md)和[参考评估](./docs/reference-evaluations.md)。

想要为你的 Agent 依赖的服务器获取凭证？在 [Drop an MCP server, get a receipt #146](https://github.com/KryptosAI/mcp-observatory/issues/146) 留言，或使用[结构化凭证请求表单](https://github.com/KryptosAI/mcp-observatory/issues/new?template=tool-call-receipt-request.yml)。公开请求可成为安全索引条目、增量凭证、SARIF 证据和维护者 CI 对话。

## 可检查的证据

| 证据 | 位置 |
|---|---|
| GitHub Actions 采用示例 | [`setup-ci --all`](./docs/setup-ci-doctor.md) 及生成的工作流文档 |
| NSA-MCP 审计示例 | [Markdown 报告](./docs/examples/nsa-mcp-audit-report.md)、[SARIF](./docs/examples/nsa-mcp-results.sarif) 和[评分 JSON](./docs/examples/nsa-mcp-score.json) |
| 采购和试点包 | [公共指导对照表](./docs/public-guidance-crosswalk.md)、[采购一页摘要](./docs/procurement-one-pager.md) 和[安全尽职调查](./docs/security-due-diligence.md) |
| 攻击模拟输出 | [MCP 攻击模拟器](./docs/mcp-attack-simulator.md) |
| MCP 凭证 | [可移植信任凭证](./docs/mcp-receipts.md) |
| 工具调用凭证 | [凭证标准](./docs/tool-call-receipts.md) — 可复现的 MCP 证据 |
| 风险图谱 | [服务器到证据的映射](./docs/receipt-graph.md) — Agent 工具链信任决策 |
| SARIF / Code Scanning 输出 | [GitHub Code Scanning 演示](./docs/code-scanning-demo.md) |
| 真实 MCP 服务器评估 | [MCP 服务器安全索引](./docs/mcp-server-safety-index.md) |
| 参考报告 | [参考评估](./docs/reference-evaluations.md) |
| 维护者和贡献者证明 | [MCP Observatory 贡献者](./docs/contributor-recognition.md) |
| 开源与商业边界 | [什么是开源 vs. 商业版](./docs/commercial-boundary.md) |
| 安全披露渠道 | [SECURITY.md](./SECURITY.md) |

另外两条快速路径：

想要贡献？向 [MCP 目标注册表](./docs/target-registry.md)添加一个服务器，使用 [Agent 任务包](./docs/agent-tasks.md)，并通过 [MCP Observatory 贡献者](./docs/contributor-recognition.md)获得公开认可。

欢迎 AI 编程助手和 Agentic 工作流。可创建一个 `Contributor quest`、`Agentic contribution idea` 或 [`Drop an MCP server, get a receipt`](./docs/drop-server-get-receipt.md) issue 来建议目标、提示词、文档修复、凭证或 `setup-ci --sarif` 集成。

一条命令添加 MCP CI 和 Code Scanning：

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y my-mcp-server" --sarif --schedule weekly
```

修复或升级现有的采用工具包：

```bash
npx @kryptosai/mcp-observatory setup-ci --doctor --fix
```

在 MCP 服务器项目中安装 MCP Observatory 时也会打印出准确的 CI 设置命令。项目可以通过 [`mcpObservatory.autoSetupCi`](./docs/automatic-ci-integration.md) 选择在安装时自动创建工作流。

常规的 `scan` 和 `test` 运行默认包含安全的攻击准备模拟。仅在需要旧版兼容模式时使用 `--no-attack-sim`。

当需要安全原生的发布门禁时，将标准化的 MCP 发现上传到 GitHub Code Scanning：

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y my-mcp-server" --sarif
```

将 Observatory 添加为 Agent 可访问的 MCP 服务器：

```bash
claude mcp add mcp-observatory -- npx -y @kryptosai/mcp-observatory serve
```

正在构建自主 Agent、类 OpenClaw 的生产力工具、MCP 网关或 bot 运行时？从 [Agent 运行时快速入门](./docs/agent-runtime-quickstart.md)开始，复制 [OpenClaw MCP 可靠性 Agent 模板](./docs/openclaw-agent-template/SOUL.md)，或让 Agent 直接阅读 [`llms.txt`](./llms.txt) 和 [`AGENTS.md`](./AGENTS.md)。

或立即测试一个服务器：

```bash
npx @kryptosai/mcp-observatory test npx -y @modelcontextprotocol/server-everything
```

可作为 CLI、GitHub Action 或 MCP 服务器使用——让你的 AI Agent 自主扫描、测试、录制、回放和验证其他 MCP 服务器。

<p align="center">
  <img src="./docs/demo.svg" alt="MCP Observatory 扫描输出" width="820">
</p>

[![Observatory MCP server](https://glama.ai/mcp/servers/KryptosAI/mcp-observatory/badges/card.svg)](https://glama.ai/mcp/servers/KryptosAI/mcp-observatory)

Glama 卡片是外部 MCP 目录评分卡。将其视为目录级别的社交证明；在用作生产审批信号之前，请点击查看底层类别详情。

## 为什么选择 MCP Observatory

MCP 服务器正在成为生产依赖。如果 Agent 依赖它们，团队需要一种方法在故障到达用户之前捕获损坏的工具、不安全的 schema、schema 漂移、缓慢响应以及安全陷阱。

Observatory 为维护者和团队提供：

- **一条命令配置 CI** — `setup-ci --all`
- **基于配置文件的审计** — `audit --profile nsa-mcp`
- **MCP 凭证** — 封装目标、证据、裁决、操作和复现命令
- **MCP 风险图谱** — 按能力边界、凭证状态、CI 态势和建议操作对服务器分组
- **操作凭证** — 输出 `allow`、`gate`、`rerun`、`quarantine` 或 `escalate`
- **GitHub PR 评论** — 针对兼容性、漂移和安全发现
- **GitHub Code Scanning SARIF** — 标准化的 MCP 发现
- **健康评分徽章** — 公开信任信号
- **录制/回放/验证** — 用于回归测试的工作流
- **MCP 服务器模式** — Agent 可直接检查其他 MCP 服务器
- **个人托管路径** — 免费保留一份最新快照；Individual Pro 为一位开发者提供 90 天历史、托管 CI、回归标记和制品下载
- **人工发布决策** — `$15,000` Release Gate Pilot 在十个工作日内评估 1–3 个关键服务器

参见[发布页面](./docs/launch.md)、[MCP 服务器的 GitHub Code Scanning](./docs/github-code-scanning-for-mcp.md)、[Code Scanning 演示](./docs/code-scanning-demo.md)、[目标图库](./docs/target-gallery.md)、[目标注册表](./docs/target-registry.md)、[目标贡献指南](./docs/target-contribution-guide.md)、[MCP Observatory 贡献者](./docs/contributor-recognition.md)、[Agent 任务包](./docs/agent-tasks.md)、[MCP 凭证](./docs/mcp-receipts.md)、[工具调用凭证](./docs/tool-call-receipts.md)、[MCP 风险图谱](./docs/receipt-graph.md)、[`setup-ci --doctor`](./docs/setup-ci-doctor.md)、[MCP 服务器安全实战指南](./docs/mcp-security-field-guide.md)、[安全方法论](./docs/methodology.md)、[MCP 服务器安全索引](./docs/mcp-server-safety-index.md)、[2026 年 6 月安全现场报告](./docs/mcp-safety-field-report-2026-06.md)、[参考评估](./docs/reference-evaluations.md)、[MCP lock 文件](./docs/mcp-lock-files.md)、[公开证明](./docs/proof.md)、[活动归因](./docs/campaign-attribution.md)、[本地指标仪表盘](./docs/metrics-dashboard.md)、[开源与商业边界](./docs/commercial-boundary.md)、[MCP 攻击模拟证据包](./docs/attack-simulation-pilot.md)、[私有 MCP 集群风险图谱](./docs/private-mcp-fleet-risk-graph.md) 和[商业支持](./COMMERCIAL.md)。

## 面向安全和平台团队

MCP 服务器正在成为 AI 软件供应链的一部分。Agent 在关键任务工作流中依赖工具之前，需要可靠、可测试、可审计的工具。

MCP Observatory 为安全和平台团队提供 MCP 服务器 CI、schema 漂移检测、安全发现、SARIF/HTML/Markdown 报告和 GitHub Code Scanning 上传。本地开源使用保持免费；个人用户可先免费上传一份托管快照，需要保留历史和托管 CI 时再选择每月 `$29` 的 Individual Pro。

## 生产支持

本地开源使用在 MIT 许可下保持免费。唯一公开的人工服务入口是 MCP Release Gate Pilot：`$15,000`，覆盖 1–3 个关键 MCP 服务器，在 10 个工作日内交付安全模式证据、CI/SARIF 设置、发布决策和修复建议。更大范围只在完成该发布决策后另行界定。

开源仓库是公共证据引擎。私有遥测情报、公司/账户优先级排序、商业排名权重、托管集群工作流和买方特定证据包不在 OSS 包范围内；详见[开源与商业边界](./docs/commercial-boundary.md)。

运行 `npx @kryptosai/mcp-observatory cloud`，从 Issue 选择器发起试点请求，或参见 [COMMERCIAL.md](./COMMERCIAL.md)。另见[隐私与遥测](./PRIVACY.md)、[活动归因](./docs/campaign-attribution.md) 和[生产使用条款](./TERMS.md)。

## 工具对比

| 功能 | mcp-observatory | Snyk agent-scan | Cisco mcp-scanner | agent-shield |
|---|---|---|---|---|
| MCP原生 | ✓ | ✓ | ✓ | ✓ |
| 攻击模拟 | ✓ | ✗ | ✗ | ✗ |
| Schema漂移检测 | ✓ | ✗ | ✗ | ✗ |
| 录制/回放/验证 | ✓ | ✗ | ✗ | ✗ |
| 健康评分(0-100) | ✓ | ✗ | ✗ | ✗ |
| SARIF输出 | ✓ | ✓ | ✓ | ✓ |
| CI/CD原生(setup-ci) | ✓ | ✓ | ✓ | ✓ |
| 公共安全索引 | ✓ | ✗ | ✗ | ✗ |
| 通过mcp-seatbelt运行时强制执行 | ✓ | ✗ | ✗ | ✗ |

## 快速开始

扫描 Claude 配置中的所有 MCP 服务器：

```bash
npx @kryptosai/mcp-observatory
```

更深入 — 同时调用安全工具以验证其实际运行：

```bash
npx @kryptosai/mcp-observatory scan deep
```

测试特定服务器：

```bash
npx @kryptosai/mcp-observatory test npx -y @modelcontextprotocol/server-everything
```

将其添加到 Claude Code 作为 MCP 服务器：

```bash
claude mcp add mcp-observatory -- npx -y @kryptosai/mcp-observatory serve
```

或手动添加到配置：

```json
{
  "mcpServers": {
    "mcp-observatory": {
      "command": "npx",
      "args": ["-y", "@kryptosai/mcp-observatory", "serve"]
    }
  }
}
```

## 命令

| 命令 | 功能 |
|---------|-------------|
| `scan` | 自动发现服务器、检查它们，并默认运行安全的攻击准备模拟 |
| `scan deep` | 扫描、运行安全攻击模拟，并调用安全工具验证其执行 |
| `test <cmd>` / `test --target <file>` | 通过命令或目标配置测试单个服务器并生成操作凭证 |
| `record <cmd>` | 将服务器会话录制到 cassette 文件以供离线回放 |
| `replay <cassette>` | 离线回放 cassette — 无需实时服务器 |
| `verify <cassette> <cmd>` | 验证实时服务器是否仍匹配录制的 cassette |
| `diff <base> <head>` | 比较两个运行制品，检测回归和 schema 漂移 |
| `watch <config>` | 监控服务器变化，在回归时发出警报 |
| `suggest` | 检测技术栈并从注册表中推荐 MCP 服务器 |
| `serve` | 作为 MCP 服务器启动，供 AI Agent 使用 |
| `lock` | 将 MCP 服务器 schema 快照到 lock 文件 |
| `lock verify` | 验证实时服务器与 lock 文件匹配 |
| `history` | 显示 MCP 服务器的健康评分趋势 |
| `setup-ci` / `init-ci` | 创建用于 MCP 兼容性/安全性检查的 GitHub Action 和徽章片段 |
| `setup-ci --sarif` | 生成将标准化发现上传到 GitHub Code Scanning 的工作流 |
| `setup-ci --doctor` | 检查仓库是否具有完整的 CI 采用工具包 |
| `risk-graph --input <path>` | 将凭证和运行制品合并为 JSON、Markdown 和 HTML 的 MCP 风险图谱 |
| `--no-attack-sim` | 在 `scan` 或 `test` 中退出默认的安全攻击模拟 |
| `ci-report` | 生成用于 GitHub Issue 创建的 CI 报告 |
| `enterprise-report` | 从运行制品生成静态的生产/安全报告 |
| `score <cmd>` | 评分 MCP 服务器的健康状况（0-100） |
| `badge <cmd>` | 生成 README 用的 SVG 健康评分徽章 |
| `cloud` | 显示托管报告、安全审查和企业试点选项 |

不带参数运行以进入交互菜单。

## 功能说明

**检查能力** — 连接服务器并验证工具、提示和资源是否正确响应。

**调用工具** — 超越列表。实际调用安全工具（无需参数 / readOnlyHint）并报告哪些工作正常、哪些崩溃。

```bash
npx @kryptosai/mcp-observatory scan deep
```

**检测 schema 漂移** — 对两次运行进行 diff，显示添加/删除的字段、类型变更和破坏性参数更改。

```bash
npx @kryptosai/mcp-observatory diff run-a.json run-b.json
```

**推荐服务器** — 扫描项目中的语言、框架、数据库和云提供商，然后交叉引用 [MCP 注册表](https://registry.modelcontextprotocol.io)推荐你缺少的服务器。

```bash
npx @kryptosai/mcp-observatory suggest
```

或在 MCP 服务器模式下询问 Agent "我应该添加哪些 MCP 服务器？"

**安全扫描** — 分析工具 schema 中的危险模式：shell 注入面、广泛的文件系统访问、缺少认证以及响应中的凭据泄露。

```bash
npx @kryptosai/mcp-observatory test --security npx -y my-mcp-server
```

**录制 / 回放 / 验证** — 捕获实时会话，在 CI 中离线回放，验证无变化。类似 MCP 的 [VCR](https://github.com/vcr/vcr)。

```bash
# 录制会话
npx @kryptosai/mcp-observatory record npx -y @modelcontextprotocol/server-everything

# 离线回放（无需服务器）
npx @kryptosai/mcp-observatory replay .mcp-observatory/cassettes/latest.cassette.json

# 验证实时服务器仍然匹配
npx @kryptosai/mcp-observatory verify cassette.json npx -y @modelcontextprotocol/server-everything
```

**监控回归** — 按间隔重新运行检查并在发生变化时发出警报。

```bash
npx @kryptosai/mcp-observatory watch target.json
```

### 扫描位置

运行 `scan` 时，它会在以下位置查找 MCP 配置：

- `~/.claude.json` (Claude Code)
- `~/Library/Application Support/Claude/claude_desktop_config.json` (Claude Desktop, macOS)
- `%APPDATA%/Claude/claude_desktop_config.json` (Claude Desktop, Windows)
- `.claude.json` 和 `.mcp.json` (当前目录)

## 架构

```
                    ┌─────────────────────────┐
                    │   MCP Observatory CLI    │
                    │  npx @kryptosai/mcp-     │
                    │     observatory scan     │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │   Config Discovery       │
                    │  (Claude, Cursor, etc.)  │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                  ▼
    ┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
    │   Security Scan  │ │  Attack Sim  │ │  Schema Drift    │
    │  (shell, creds)  │ │ (tool poison)│ │  (version diff)  │
    └────────┬────────┘ └──────┬───────┘ └────────┬─────────┘
             │                 │                   │
             └─────────────────┼───────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │   Health Score       │
                    │  (0-100 + verdict)   │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  SARIF       │  │  Markdown    │  │  CI Gateway  │
    │  (Code Scan) │  │  Report      │  │  (setup-ci)  │
    └──────────────┘  └──────────────┘  └──────────────┘
```

## CI / GitHub Action

将 Observatory 添加到 MCP 服务器的 CI 流水线：

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y my-mcp-server" --sarif --schedule weekly
```

检查采用工具包：

```bash
npx @kryptosai/mcp-observatory setup-ci --doctor
```

成功的 `test`、`run` 和单目标 `scan` 检查也会提供将通过结果转换为 CI 采用工具包的选项。该自动转换默认启用 SARIF/Code Scanning 和每周计划检查；当你只需要保守的工作流而不需要 Code Scanning 上传时，使用 `--no-ci-sarif`。

或手动创建工作流：

```yaml
# .github/workflows/observatory.yml
name: MCP Server Check
on: [pull_request]

permissions:
  contents: read

jobs:
  observatory:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: KryptosAI/mcp-observatory/action@v1
        with:
          command: npx -y my-mcp-server
          deep: true
          security: true
          comment-on-pr: false
          set-status: false
```

Action 输入：

| 输入 | 描述 | 默认值 |
|-------|-------------|---------|
| `command` | 要测试的服务器命令 | （如果无 `target` 则必需） |
| `target` | 目标配置 JSON 的路径 | |
| `targets` | 用于多服务器矩阵扫描的 MCP 配置文件路径 | |
| `deep` | 同时调用安全工具 | `false` |
| `security` | 运行安全分析 | `false` |
| `fail-on-regression` | 发现问题时使 action 失败 | `true` |
| `fail-on-baseline-drift` | 基线验证检测到漂移时使 action 失败 | `true` |
| `comment-on-pr` | 以 PR 评论形式发布报告。需要 `pull-requests: write`。 | `true` |
| `set-status` | 在 HEAD SHA 上设置 commit 状态检查（绿色/红色）。需要 `statuses: write`。 | `true` |
| `github-token` | 用于 PR 评论和 commit 状态的 Token | `${{ github.token }}` |

当工作流授予写入权限时，Action 可以评论 PR 并设置 commit 状态。`setup-ci` 默认生成只读的对第三方友好的工作流，并允许维护者稍后选择加入评论/状态。`init-ci` 作为向后兼容的别名继续可用。所有选项见 [`action/README.md`](./action/README.md)。

个人用户可先免费上传一份托管快照，需要 90 天历史和托管 CI 时再选择每月 `$29` 的 Individual Pro。需要生产发布决策的团队可申请 `$15,000`、1–3 个服务器、10 个工作日的 Release Gate Pilot。运行 `npx @kryptosai/mcp-observatory cloud`，或参见 [COMMERCIAL.md](./COMMERCIAL.md)。

### MCP Observatory 公开证据

MCP 服务器维护者可以将公开的兼容性/安全信号添加到其 README：

```md
[![MCP Observatory](https://img.shields.io/badge/MCP%20Observatory-enabled-2563eb)](https://github.com/KryptosAI/mcp-observatory)
```

或通过实时检查生成评分徽章：

```bash
npx @kryptosai/mcp-observatory badge npx -y my-mcp-server --output docs/mcp-health.svg
```

GitHub Action 模板、维护者 PR 正文和徽章发布手册参见[证据分发循环](./docs/certification-distribution.md)。徽章只表示公开证据，不是认证或背书。

从本地运行制品生成可用于试点的生产/安全报告：

```bash
npx @kryptosai/mcp-observatory enterprise-report \
  --account "Your Company" \
  --format html \
  --output observatory-enterprise-report.html
```

为了在 CI 中更清晰的内部账户归因，设置：

```bash
MCP_OBSERVATORY_ORG=your-company.com
MCP_OBSERVATORY_CONTACT=your-team-contact
```

测试飞书/Lark 集成？参见[飞书/Lark MCP 指南](./docs/feishu-lark-mcp.md)。

### Lock 文件

```bash
$ npx @kryptosai/mcp-observatory lock              # 快照所有服务器 schema
$ npx @kryptosai/mcp-observatory lock verify        # 验证自上次锁定以来无漂移
```

Lock 文件是 AI 工具的 package-lock：提交 MCP 合约，然后在 CI 中让每个工具、schema、提示或资源的漂移可见。参见 [MCP lock 文件](./docs/mcp-lock-files.md)。

### 趋势追踪

```bash
$ npx @kryptosai/mcp-observatory history            # 显示一段时间内的健康趋势
```

### 夜间扫描

```bash
$ npx @kryptosai/mcp-observatory ci-report          # 为 CI 生成回归报告
```

## MCP 服务器模式

**没有其他测试工具本身就是一个 MCP 服务器。** 将 Observatory 添加为服务器，你的 AI Agent 就可以自主测试、诊断和监控其他 MCP 服务器。

```bash
claude mcp add mcp-observatory -- npx -y @kryptosai/mcp-observatory serve
```

你的 Agent 获得 10 个工具：

| 工具 | 使用场景 |
|------|---------------|
| `scan` | 检查所有已配置的 MCP 服务器是否健康 |
| `check_server` | 安装前或更新后测试特定服务器 |
| `score_server` | 获取服务器的快速健康评分和等级 |
| `record` | 捕获正常工作的服务器基线以供未来比较 |
| `replay` | 针对录制的会话进行测试 — 无需实时服务器 |
| `verify` | 确认服务器更新未破坏任何内容 |
| `watch` | 检查服务器并查看自上次检查后的变化 |
| `diff_runs` | 在两个检查结果之间发现回归 |
| `get_last_run` | 检索某服务器之前的检查结果 |
| `suggest_servers` | 发现匹配项目技术栈的 MCP 服务器 |

一个检查其他 AI 工具的 AI 工具。它是测试工具的、为工具提供服务的工具。

### 安全性

MCP 服务器运行在 AI 主机内，其中 LLM 选择调用哪些工具。为防止提示注入攻击：

- **命令白名单：** 仅允许 `npx`、`node`、`python`、`python3`、`uvx`、`docker`、`deno`、`bun` 作为基础可执行文件。CLI 无此限制。
- **路径验证：** 文件读取工具被限制在 runs/cassettes 目录内。
- **无任意执行：** 使用 CLI 执行无限制的命令。

### CLI vs MCP：设计差异

| 功能 | CLI | MCP 服务器 | 原因 |
|---------|-----|------------|-----|
| `watch` | 轮询循环 | 单次检查 + diff | 请求/响应不支持长轮询 |
| 交互菜单 | 方向键导航 | 不可用 | MCP 无交互 UI |
| 彩色输出 | `--no-color` 标志 | 始终纯文本 | MCP 返回结构化内容 |
| `report` | 渲染已保存的制品 | 不可用 | Agent 直接读取制品 |
| `serve` | 启动 MCP 服务器 | N/A | 本身就是 MCP 服务器 |
| `run` | 读取目标配置文件 | 内联参数 | MCP 工具直接接受参数 |
| `get_last_run` | 不可用（使用 `ls` + `diff`） | 可用 | Agent 的便利功能 |

## 兼容性

支持使用标准传输协议的任何 MCP 服务器：

| 传输协议 | 示例 | 适配器 |
|-----------|----------|---------|
| **stdio**（大多数服务器） | [filesystem](https://www.npmjs.com/package/@modelcontextprotocol/server-filesystem)、[memory](https://www.npmjs.com/package/@modelcontextprotocol/server-memory)、[context7](https://www.npmjs.com/package/@upstash/context7-mcp)、[brave-search](https://www.npmjs.com/package/@modelcontextprotocol/server-brave-search)、[sentry](https://www.npmjs.com/package/@sentry/mcp-server)、[notion](https://www.npmjs.com/package/@notionhq/notion-mcp-server)、[stripe](https://www.npmjs.com/package/@stripe/mcp) | `local-process` |
| **HTTP/SSE**（远程） | [Cloudflare](https://developers.cloudflare.com/mcp/)、[Exa](https://exa.ai)、[Tavily](https://tavily.com) | `http` |
| **Docker** | 所有 `@modelcontextprotocol/server-*` 镜像 | `local-process`（通过 `docker run -i`） |

需要 API 密钥的服务器通过目标配置中的 `env` 工作。Python 服务器通过 `uvx` 工作。已测试的服务器和已知问题参见[完整兼容性矩阵](./docs/compatibility.md)。

### 目标配置文件

更多控制（环境变量、元数据、自定义超时）：

```json
{
  "targetId": "filesystem-server",
  "adapter": "local-process",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
  "timeoutMs": 15000,
  "skipInvoke": false
}
```

```bash
npx @kryptosai/mcp-observatory run --target ./target.json
```

### HTTP / SSE 目标

```json
{
  "targetId": "my-remote-server",
  "adapter": "http",
  "url": "https://mcp.example.com/mcp",
  "authToken": "${MCP_SERVER_TOKEN}",
  "headers": {
    "X-Api-Key": "$MCP_SERVER_API_KEY"
  },
  "timeoutMs": 15000
}
```

目标配置支持在 `authToken`、`headers` 和 local-process 的 `env` 值中使用 `${VAR}`、`$VAR` 和 `env:VAR` 引用。

## 工具对比

| 功能 | Observatory | [mcp-recorder](https://github.com/punkpeye/mcp-recorder) | [MCPBench](https://github.com/QuantGeekDev/mcpbench) | [mcp-jest](https://github.com/nicobailon/mcp-jest) |
|---------|:-----------:|:----------:|:-------:|:-------:|
| 自动发现服务器 | ✅ | — | — | — |
| 检查能力 | ✅ | — | ✅ | ✅ |
| 调用工具 | ✅ | — | — | ✅ |
| Schema 漂移检测 | ✅ | — | — | — |
| 录制 / 回放 | ✅ | ✅ | — | — |
| 对比 cassette 验证 | ✅ | — | — | — |
| 响应快照 diff | ✅ | — | — | — |
| 基准测试 / 延迟 | — | — | ✅ | — |
| Jest 集成 | — | — | — | ✅ |
| **作为 MCP 服务器运行** | **✅** | — | — | — |

每个工具各有所长。Observatory 专注于回归检测和 CI 友好的工作流。mcp-recorder 擅作透明代理。MCPBench 是性能基准测试的首选。如果你已在 Jest 工作流中，mcp-jest 是理想选择。

## 灵感来源

录制/回放/验证模式受以下项目启发：

- [VCR](https://github.com/vcr/vcr) (Ruby) — 首创了基于 cassette 的 HTTP 录制/回放
- [Polly.js](https://github.com/Netflix/pollyjs) (Netflix) — JavaScript 的 HTTP 交互录制
- [mcp-recorder](https://github.com/punkpeye/mcp-recorder) — MCP 专用流量录制代理
- [MCPBench](https://github.com/QuantGeekDev/mcpbench) — MCP 服务器基准测试
- [mcp-jest](https://github.com/nicobailon/mcp-jest) — MCP 服务器的 Jest 风格测试

## 局限性

- 需要交互式 OAuth 的服务器（如 Google Drive）需要预先认证才能连接 Observatory
- 不支持自定义 WebSocket 传输（如 BrowserTools MCP）
- 少数服务器超时或在初始化前关闭 — 参见[已知问题](./docs/known-issues.md)和[兼容性](./docs/compatibility.md)

## 与 mcp-seatbelt 协作

扫描后再信任。运行 `npx -y @kryptosai/mcp-observatory@latest enforce --start-proxy`：Observatory 会写出默认拒绝的 [mcp-seatbelt](https://github.com/KryptosAI/mcp-seatbelt) 策略并启动代理。Observatory 验证；seatbelt 执行。

## 贡献

欢迎贡献者！本项目遵循[贡献者公约行为准则](./CODE_OF_CONDUCT.md)。最快的参与方式：

[![good first issue](https://img.shields.io/github/issues-search/KryptosAI/mcp-observatory?query=is%3Aopen%20label%3A%22good%20first%20issue%22&label=good%20first%20issue&color=green)](https://github.com/KryptosAI/mcp-observatory/issues?q=is%3Aopen+label%3A%22good+first+issue%22)

```bash
git clone https://github.com/KryptosAI/mcp-observatory.git && cd mcp-observatory && npm install && npm test
```

最常见的首次贡献是向安全索引添加一个 MCP 服务器（10-15 分钟）。完整的指南、代码标准和贡献者认可阶梯参见 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

如果 Observatory 帮你避免了一次部署故障，不妨给它一个 [star](https://github.com/KryptosAI/mcp-observatory)。这能帮助更多人发现这个项目。
