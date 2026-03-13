# HANDOFF.md — ClawWork 开发者交接文档

> 最后更新：2026-03-13

## 当前状态

**Phase 3.5 Visual Polish 已完成，文档清理已完成，准备进入 Phase 4。**

所有核心功能（对话流、Task 管理、文件浏览器、产物落盘、Git 版本化）已实现。UI 已从原型级升级到产品级（shadcn/ui + Framer Motion + Inter/JetBrains Mono）。`tsc --noEmit` 零错误。

## 架构

Gateway-Only 架构：Desktop 通过单一 WS 连接与 OpenClaw Gateway (:18789) 通信。

早期设计的 Channel Plugin 双通道架构已在 G1-G9 重构中完全移除。`packages/channel-plugin` 代码保留但已从 `pnpm-workspace.yaml` 排除。

## 已完成的工作

### 功能
- **Phase 1** — Monorepo 骨架、Electron 主进程、Gateway WS 客户端（challenge-response auth + heartbeat + reconnect）、消息收发
- **Phase 2** — Task CRUD、对话流（ChatMessage/ChatInput/StreamingMessage/ToolCallCard）、Progress/Artifacts 面板
- **Phase 3** — Workspace 配置持久化、SQLite 数据库、产物落盘 + Git auto-commit、文件浏览器 + 文件预览
- **Phase 3.5** — 完整设计系统（shadcn/ui + Framer Motion）、全部组件/布局重写、Visual Polish（premium depth pass）
- **Gateway-Only 重构 (G1-G9)** — 移除 Plugin 依赖，单通道完成完整对话流 + 工具调用事件

### 本次 session 完成的文档清理
- 删除 7 个过时的 markdown 文件（`eui.md`, `PLAN-add.md`, `PLAN-Gateway.md`, `findings.md`, `progress.md`, `task_plan.md`, `docs/plans/2026-03-13-channel-plugin-rewrite.md`）
- 更新 `CLAUDE.md` — 移除所有 Plugin/双通道引用，更新 monorepo 树、协议文档、开发命令、已知问题
- 更新 `ROADMAP.md` — 移除 Plugin 相关条目
- 更新 `openclaw-desktop-design.md` — Section 3 重写为 Gateway-Only 架构、Section 6 更新 monorepo 树和技术栈、ADR-001 重写、风险表/任务列表/附录清理

## 下一步：Phase 4

| 任务 | 说明 | 可并行 |
|------|------|--------|
| T4-1 | 主题切换（dark/light），Settings 中可切换 | 是 |
| T4-2 | 全局搜索（SQLite FTS5），Task 标题 + 文件名 + 消息内容 | 是 |
| T4-3 | Settings 页面完善（Server 地址、Workspace 路径、主题） | 是 |
| T4-4 | 错误处理 + 重连（断线提示、重连动画、离线状态） | 是 |
| T4-5 | electron-builder 配置（macOS dmg, Universal Binary） | T4-4 后 |
| T4-6 | 应用图标 + 启动画面 + 元信息 | T4-5 后 |

## 关键文件

| 文件 | 用途 |
|------|------|
| `CLAUDE.md` | 项目指南（架构、协议、进度、踩坑记录） |
| `design-system.md` | 设计系统规范（色彩、字体、间距、动效） |
| `openclaw-desktop-design.md` | 完整设计文档（数据模型、UI 原型、ADR、任务列表） |
| `DEVELOPMENT.md` | 开发环境搭建 |
| `docs/plans/2026-03-13-gateway-only-refactor.md` | Gateway-Only 重构计划（历史 ADR） |

## 已知问题

- Gateway 广播所有 session 事件，客户端需按 sessionKey 过滤
- `mediaLocalRoots` 安全校验可能拒绝文件发送
- Session 4AM 自动重置需服务端配置禁用
- 多任务并行未做系统性测试（T2-10 延后）

## 开发命令

```bash
pnpm install
pnpm --filter @clawwork/desktop dev          # 开发模式
packages/desktop/node_modules/.bin/tsc -b packages/shared/tsconfig.json  # build shared
packages/desktop/node_modules/.bin/tsc --noEmit -p packages/desktop/tsconfig.json  # typecheck
```
