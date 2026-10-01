# 贡献指南

感谢你帮助让 MCP Observatory 更加完善和可信。

本项目遵循 [Contributor Covenant 行为准则](./CODE_OF_CONDUCT.md)。参与即表示你同意遵守此准则。

## 🌏 欢迎国际贡献者

我们欢迎来自中国、韩国、日本以及整个亚洲的贡献者。

- [中文 README](README-zh-CN.md) — 简体中文文档
- 欢迎提交中文 issues 和 PRs
- 我们使用 `good first issue`（新手友好）标签标注适合新手的任务
- Gitee 镜像: https://gitee.com/williamweishuhn/mcp-observatory

## 5 分钟快速开始

```bash
git clone https://github.com/KryptosAI/mcp-observatory.git
cd mcp-observatory
npm install
npm test
npm run typecheck # 约5秒，无错误
npm run lint      # 约5秒，干净通过
```

准备就绪。挑选一个标记为 [新手友好](https://github.com/KryptosAI/mcp-observatory/issues?q=is%3Aopen+label%3A%22good+first+issue%22) 的 issue 开始吧。

好的贡献让证据更清晰；弱的贡献通常增加复杂度的速度比增加信任的速度更快。

## 什么是好的贡献

- 清晰大于广度
- 证据大于功能数量
- 小而聚焦的 PR 优于大而无当的架构重构
- 包含具体的 artifact 或报告，能说明实际问题
- 文档要解决真实的疑惑，而不是堆砌文字

## 当前优先级

- 向 [MCP Target Registry](./docs/target-registry.md) 添加一个安全的 MCP 目标
- 按照 [Target Contribution Guide](./docs/target-contribution-guide.md) 提交带证据的小型首次 PR
- 从开放的 [good first issue](https://github.com/KryptosAI/mcp-observatory/issues?q=is%3Aopen+label%3A%22good+first+issue%22) 或 [roadmap issue](https://github.com/KryptosAI/mcp-observatory/issues?q=is%3Aopen+label%3Aroadmap) 中挑选，对照 [ROADMAP](./ROADMAP.md) 推进

## 可能不会被接受的贡献

- 泛化的仪表板或控制平面想法
- 没有实际失败目标支撑的抽象适配器工作
- 不附带证据或 artifact 的功能添加
- 不影响信任度、清晰度或报告质量的大规模打包/工作流改动

## 基本原则

- 保持 CLI 作为主要界面。
- 不要将项目变成通用仪表板。
- 将 artifact schema 和 Markdown 报告视为核心产品界面。
- 保持项目作为官方合规工具的补充定位。

## 开发

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run smoke
```

在提交较大 PR 之前，建议运行（可选）：

```bash
npm run integration:real
```

## 首次贡献指南

如果这是你第一次为本项目贡献，请选择以下路径之一：

> 💡 浏览所有 [新手友好 issues →](https://github.com/KryptosAI/mcp-observatory/issues?q=is%3Aopen+label%3A%22good+first+issue%22)

1. **目标路径**：向 `docs/safety-index/targets.json` 添加一个公开、无需密钥的 MCP 服务器，并包含生成的证据。
2. **文档路径**：改进一个 README 或 CONTRIBUTING 章节，保持修改范围紧凑。
3. **报告路径**：改进一个 Markdown 报告章节，并更新已提交的示例报告。
4. **Fixture 路径**：在 `examples/` 或 `tests/fixtures/` 中添加或完善一个确定性目标或 artifact。

每条路径的步骤：

- 打开对应的 GitHub issue
- 说明你计划修改的具体文件
- 保持 diff 小而清晰
- 附上你执行过的验证命令

## 示例和集成的证据标准

如果你在 `examples/` 下添加或修改任何内容，或涉及真实服务器的工作流，请包含：

- 一个具体的服务器或工作流，而非假设性的集成
- 当变更影响可观察输出时，提交一份 artifact 或 Markdown 报告
- 一句话说明这个示例教会我们什么

## Fixture 贡献

添加 fixture 时：

- 确保它是确定性的
- 使用最小的可行面来证明能力形态
- 偏好明确的证据而非巧妙的测试技巧
- 记录这个 fixture 在证明什么、为什么重要

通过普通 GitHub issue（已启用空白 issue）提出新案例，或当 fixture 支撑某个 Safety Index 目标时使用 [MCP target contribution](https://github.com/KryptosAI/mcp-observatory/issues/new?template=target-contribution.yml) 模板。

## Target Registry 贡献

最快有用的贡献是添加一个安全的 MCP 目标。从 [MCP Target Registry](./docs/target-registry.md) 开始，然后参考 [Target Contribution Guide](./docs/target-contribution-guide.md)。

最小 PR 结构：

- 在 `docs/safety-index/targets.json` 中添加一个新对象
- 在 `docs/safety-index/artifacts/` 下提交生成的 JSON 和 Markdown 证据
- 更新 `docs/mcp-server-safety-index.md`
- 在 PR 描述中附上验证命令
