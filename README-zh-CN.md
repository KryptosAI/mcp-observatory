# MCP Observatory

🇺🇸 English: [README.md](README.md)

**来自 ClearFrame 的免费开源 MCP 安全测试工具。** 扫描、审计、报告、本地历史和 CI 功能均采用 MIT 许可证，无需账户或订阅。

## 快速开始

需要 Node.js 20 或更高版本及 npm。在项目目录运行：

```bash
npx -y @kryptosai/mcp-observatory@latest
```

命令会检查已配置的 MCP 服务器；没有配置时会使用内置示例。示例评分仅描述示例服务器。

```bash
# 仅运行内置示例
npx -y @kryptosai/mcp-observatory@latest demo --example
# 查看本地历史、HTML 报告并下载 JSON，无需登录或上传
npx -y @kryptosai/mcp-observatory@latest dashboard
# 创建可供 ClearFrame 审阅的本地任务文件
npx -y @kryptosai/mcp-observatory@latest clearframe
```

`clearframe` 不会自动启动代理、调用模型或上传证据。请先审阅任务文件，再运行输出的只读 CLI 命令，或在 ClearFrame Mac 应用中打开同一项目并将文件内容粘贴到新对话。

[下载 ClearFrame CLI 或 Mac 应用](https://clearframecode.com/download/?utm_source=mcp-observatory&utm_medium=readme-zh&utm_campaign=opensource)。目前支持 Apple Silicon Mac。ClearFrame 有独立的账户及使用条款；所有 Observatory 功能都可独立使用。

## 常用工作流

| 用途 | 命令 |
| --- | --- |
| 扫描已配置服务器 | `scan` |
| 运行指定服务器的检查 | `test <启动命令>` |
| 静态审阅 JS/TS 源码，不执行源码 | `source-audit ./src` |
| 检查技能文件 | `skill-scan <路径>` |
| 审阅软件包名称相似性，不执行命令 | `package-check -- npx -y <软件包>` |
| 审阅跨服务器能力组合 | `toxic-flow first.json second.json` |
| 比较、录制及重放 | `diff`、`record`、`replay`、`verify` |
| 生成 CI 检查 | `setup-ci --all` |
| 查看本地历史和报告 | `dashboard` |
| 为 ClearFrame 准备任务 | `clearframe` |

结果是供审阅的技术证据，不保证服务器安全。深度扫描会调用工具；运行前请了解目标服务器的行为。遥测默认关闭，在明确启用之前不会请求遥测策略或发送事件。

## 自托管与文档

[托管实现源码](https://github.com/KryptosAI/mcp-observatory/tree/main/hosting) 同样采用 MIT 许可证，包含 GitHub 登录、私有证据存储、历史、下载、HTTP 检查和保留期清理。部署需要自己的配置；基础设施费用由部署者承担。自托管不会自动迁移已有托管账户或记录。

- [完整命令与功能](./README.md)
- [ClearFrame 使用流程](./docs/clearframe.md)
- [功能范围与限制](./docs/feature-coverage.md)
- [开源政策](./docs/commercial-boundary.md)
- [隐私说明](./PRIVACY.md)
- [MIT 许可证](./LICENSE)
