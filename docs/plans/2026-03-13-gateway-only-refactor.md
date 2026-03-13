# ClawWork Gateway-Only Refactor

> 日期: 2026-03-13  
> 状态: 待实施  
> 影响范围: `packages/desktop`, `packages/shared`, `packages/channel-plugin`(废弃)

## Summary

ClawWork 从"Desktop + Channel Plugin 双通道"收敛为 **OpenClaw Gateway 的原生 WS 客户端**。

- **产品边界不变**: 单用户桌面工作台，只管理自己创建的 Task 会话，不碰其他渠道 session，不做 OpenClaw 管理台。
- **可复用**: 三栏 UI、Task/Message/Artifact 本地模型、SQLite 索引、workspace/Git artifact 存储、搜索/文件浏览器。
- **必须改**: WS 传输层、消息分发层、会话发现与恢复、Settings 连接配置。
- **直接删**: `channel-plugin` 主路径、Plugin WS 协议、`PluginClient`、`agent-message` 通道、plugin 状态 UI。

## Background & Rationale

### 源码验证结论 (2026-03-13 against OpenClaw gateway v2026.3.8)

| 验证项 | 结论 | 源码位置 |
|--------|------|----------|
| Gateway Client 能否独立完成对话 | **能。** `chat.send` 走 `INTERNAL_MESSAGE_CHANNEL`，不经过 channel plugin | `src/gateway/server-methods/chat.ts:1063-1064` |
| `deliver` 参数 | 支持。默认 undefined = false = 不投递外部渠道 | `chat.ts:126-139`, `logs-chat.ts:40` |
| `caps: ["tool-events"]` | 注册后收 tool stream 事件（start/progress/end），否则只收 `chat` delta/final | `chat.ts:1118-1132`, `server-chat.ts:571-585` |
| `mode: "backend"` vs `"ui"` | backend + gateway-client 本地连接可跳过 pairing；远端两者无差异 | `ws-connection/message-handler.ts:143-163` |
| Session key 格式 | `agent:<agentId>:<rest>`，`<rest>` 完全自由，无白名单，max 512 chars | `session-utils.ts` |
| Session auto-create | `chat.send` 对不存在的 sessionKey 自动创建，不报错 | `chat.ts:959-1016` |
| `sessions.list` 过滤 | 无前缀过滤参数，支持 `label` 精确和 `search` 子串匹配 | `server-methods/sessions.ts` |
| Channel Plugin 远程 | 不存在 remote plugin 概念，全部 in-process | 全局搜索无结果 |
| Telegram 消息流 | Gateway 直接 owning，单通道，不是双 WS | `src/telegram/bot*.ts` |

### 为什么不保留 Channel Plugin

| 能力 | Gateway 已有 | Channel Plugin 重复做 |
|------|-------------|---------------------|
| 发消息 | `chat.send` RPC | `user_message` -> `dispatchReply` |
| 收回复 | `chat` broadcast event | `deliver` callback -> WS push |
| 历史 | `chat.history` RPC | 无 |
| Session 管理 | `sessions.*` RPC | 无 |
| 中止 | `chat.abort` RPC | 无 |
| Tool events | `caps: ["tool-events"]` | 无 |

Channel Plugin 的存在意义是为外部消息平台（Telegram/飞书/Discord）做入站适配器。ClawWork 不是外部消息平台。

## Implementation Plan

### Phase G1: 传输层增量改造 (gateway-client.ts)

**策略: 增量补充，不推翻重写。** 现有 GatewayClient 已正确实现 challenge-response、心跳、指数退避重连、chat.send/chat.history/sessions.list。只补缺失能力。

改动点:
1. connect 参数增加 `caps: ["tool-events"]`
2. connect URL 支持 `wss://`（当前只支持 `ws://`）
3. 构造函数改为接受配置对象（url + auth），不再分 host/port/token
4. 新增 `abortChat(sessionKey)` 方法 -> `chat.abort` RPC
5. 新增 `agent` event 处理 -> 转发 tool events 到 renderer

涉及文件:
- `packages/desktop/src/main/ws/gateway-client.ts` — 增量修改

### Phase G2: 删除 Plugin 通道

删除项:
- `packages/desktop/src/main/ws/plugin-client.ts` — 整文件删除
- `packages/desktop/src/main/ws/index.ts` — 移除 `pluginClient` 创建、`getPluginClient()`
- `packages/desktop/src/main/ipc/ws-handlers.ts` — `ws:send-message` 改走 Gateway，删除 plugin 依赖
- `packages/desktop/src/renderer/lib/agent-message.ts` — 整文件删除（Plugin 私有消息处理器）
- `packages/desktop/src/renderer/hooks/useGatewayDispatcher.ts` — 删除 `onAgentMessage` + `onPluginStatus` 两个 useEffect
- `packages/desktop/src/preload/index.ts` — 删除 `onAgentMessage`、`onPluginStatus`
- `packages/desktop/src/preload/clawwork.d.ts` — 删除对应类型
- `packages/desktop/src/renderer/stores/uiStore.ts` — 删除 `pluginStatus`、`setPluginStatus`
- `packages/desktop/src/renderer/layouts/LeftNav/ConnectionStatus.tsx` — 简化为仅 Gateway 状态
- `packages/shared/src/constants.ts` — 删除 `PLUGIN_WS_PORT`
- `packages/shared/src/protocol.ts` — 标记为废弃（Desktop 不再引用，channel-plugin 保留但退出主路径）

### Phase G3: 消息发送路径改走 Gateway

当前: `renderer -> IPC ws:send-message -> PluginClient.sendUserMessage() -> Plugin WS`  
目标: `renderer -> IPC ws:send-message -> GatewayClient.sendChatMessage() -> Gateway WS`

改动点:
- `ws-handlers.ts`: `ws:send-message` handler 改用 `getGatewayClient().sendChatMessage()`
- `ws-handlers.ts`: `ws:gateway-status` 返回值移除 `pluginConnected` 字段
- `gateway-client.ts`: `sendChatMessage` 已有 `deliver: false`，保持

### Phase G4: Tool Events 消费

当前: ToolCallCard 从 Plugin 的 `tool_call` 消息类型渲染。  
目标: 从 Gateway `agent` event 的 `stream: "tool"` 消费。

改动点:
- `useGatewayDispatcher.ts`: 在 Gateway event handler 中增加 `event === 'agent'` 分支
- 处理 tool event payload: `{runId, sessionKey, tool: {name, status, args?, result?}}`
- 更新 messageStore 或新增 toolCallStore

### Phase G5: Session Key 命名空间

当前: `agent:<agentId>:task-<taskId>`  
目标: `agent:main:clawwork:task:<taskId>`

改动点:
- `packages/shared/src/constants.ts`:
  - `buildSessionKey(taskId)` -> `agent:main:clawwork:task:${taskId}`（移除 agentId 参数，固定 `main`）
  - `parseTaskIdFromSessionKey()` -> 匹配 `agent:main:clawwork:task:(.+)` 前缀
  - `SESSION_KEY_PREFIX` -> `'agent:main:clawwork:task:'`
  - `isClawWorkSession(sessionKey)` -> 前缀检测工具函数
- 所有 `buildSessionKey` 调用点更新

### Phase G6: 会话发现与恢复

启动恢复流程:
1. 本地 SQLite 读取 Task 元数据 -> 渲染 Task 列表（快速）
2. 调用 `sessions.list` -> 按 `agent:main:clawwork:task:` 前缀过滤
3. 对比本地 Task 和 Gateway session，补齐缺失的 Task（可能在其他设备创建）
4. 按需调用 `chat.history` 刷新消息流

涉及文件:
- `packages/desktop/src/renderer/stores/taskStore.ts` — 新增 `syncFromGateway()` 方法
- `packages/desktop/src/main/ipc/ws-handlers.ts` — 可能需要新增 `ws:sync-tasks` handler

### Phase G7: 离线只读模式

Gateway 不可达时:
- Task/消息/Artifact 从本地 SQLite 缓存可浏览
- 发送按钮禁用 + 视觉提示
- 搜索/文件浏览器正常工作（纯本地）
- UI 状态栏明确显示"离线 - 只读"

涉及文件:
- `useGatewayDispatcher.ts` — Gateway 断连时设置全局 `offline` 状态
- `uiStore.ts` — 新增 `isOffline` 状态
- `ChatInput.tsx` — 根据 `isOffline` 禁用发送
- `ConnectionStatus.tsx` — 新增离线样式

### Phase G8: Settings 收口

当前 Settings 保留 Gateway URL 配置。  
改动点:
- 删除所有 Plugin 相关配置项
- 保留配置模型:
  - `gatewayUrl: string`
  - `bootstrapToken?: string` (共享密钥)
  - `password?: string` (密码认证)
  - `tlsFingerprint?: string` (远端 TLS 验证)
  - `workspacePath: string`
  - `theme: 'dark' | 'light'`
- `AppConfig` 类型同步更新

### Phase G9: Channel Plugin 归档

- `packages/channel-plugin/` 从 `pnpm-workspace.yaml` 移除
- CLAUDE.md / HANDOFF.md 中标记为废弃
- 文件保留在仓库但不构建、不安装、不文档化

## Execution Order & Dependencies

```
G1 (传输层增量) ─┐
                 ├─→ G3 (消息发走 Gateway) ─→ G4 (Tool Events)
G2 (删 Plugin) ──┘
                        │
                        ↓
                 G5 (Session Key) ─→ G6 (会话恢复)
                        │
                        ↓
                 G7 (离线只读) ─→ G8 (Settings) ─→ G9 (归档)
```

建议实施顺序: G1 → G2+G3 (可合并) → G5 → G4 → G6 → G7 → G8 → G9

## 技术决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| GatewayClient 重写 vs 增量 | **增量** | 现有实现已正确覆盖核心协议，不需要推翻 |
| `mode` | **backend** | 本地跳过 pairing，远端行为与 ui 一致 |
| `deliver` | **显式 false** | 防御性编码，不依赖 OpenClaw 默认值 |
| `caps` | **["tool-events"]** | 必须，否则 ToolCallCard 无实时数据 |
| Session key | **agent:main:clawwork:task:\<taskId\>** | 专属命名空间，前缀过滤隔离其他渠道 |
| Agent 选择 | **固定 main** | 单 agent 够用，不增加 UI 复杂度 |
| 离线只读 | **本次做** | 与主重构共享 Gateway 状态管理代码 |
| Plugin 迁移期 | **无** | 直接废弃，不背兼容包袱 |

## Test Plan

### 连接与认证
- [ ] `connect.challenge` -> `connect` -> `hello-ok` 完成
- [ ] token/password 错误时明确失败状态，不 silent fail
- [ ] 关闭窗口后继续收到 Gateway 事件不崩溃
- [ ] 远端 `wss://` 连接可用

### Task / Session
- [ ] 新建 Task 后首次 `chat.send` 自动创建 `agent:main:clawwork:task:<taskId>` session
- [ ] `sessions.list` 混有 Telegram/WebChat session 时，ClawWork 只显示自己的
- [ ] 重启后从本地 SQLite + Gateway history 正确恢复

### 消息流
- [ ] Assistant 回复完全经 Gateway `chat` event 显示
- [ ] `delta/final/error/aborted` 都正确驱动 UI
- [ ] Tool events (`agent` event) 驱动 ToolCallCard 实时显示
- [ ] `deliver: false` 不把回复投递到外部渠道

### 离线
- [ ] Gateway 不可达时进入本地只读
- [ ] 本地 artifact/历史缓存可浏览
- [ ] 不会误显示在线可发送状态
- [ ] Gateway 恢复后自动重连并恢复在线状态

### 回归
- [ ] 不安装 plugin 时 ClawWork 完整工作
- [ ] 删除 plugin 路径后 tsc --noEmit 零错误
- [ ] dev server 正常启动
- [ ] 现有消息 UI 不退化

## Assumptions

- ClawWork 是 Gateway 的专用桌面工作台，不是 provider/channel
- 只管理 ClawWork 自己的 session，不浏览全局 Gateway session
- 所有 Task 固定到 `main` agent
- 不保留 `channel-plugin` 兼容期，直接废弃
- 不做旧 plugin session / 旧 session key 迁移
- 不依赖 OpenClaw 未导出的 `src/gateway/client.ts`；ClawWork 内自维护 Gateway transport
- Task 标题/状态/标签本地独占，不写回 Gateway
- 本次优先完成文本消息、会话组织、离线只读和 artifact 本地管理

## Files Impact Summary

### 修改
| 文件 | 改动类型 |
|------|----------|
| `packages/shared/src/constants.ts` | session key 格式 + 删 PLUGIN_WS_PORT |
| `packages/desktop/src/main/ws/gateway-client.ts` | 增量: caps, wss, config object, abort, agent event |
| `packages/desktop/src/main/ws/index.ts` | 删 pluginClient |
| `packages/desktop/src/main/ipc/ws-handlers.ts` | send-message 改走 Gateway, 删 plugin 依赖 |
| `packages/desktop/src/preload/index.ts` | 删 onAgentMessage, onPluginStatus |
| `packages/desktop/src/preload/clawwork.d.ts` | 同步类型 |
| `packages/desktop/src/renderer/hooks/useGatewayDispatcher.ts` | 删 plugin effects, 加 agent event 处理 |
| `packages/desktop/src/renderer/stores/uiStore.ts` | 删 pluginStatus, 加 isOffline |
| `packages/desktop/src/renderer/stores/taskStore.ts` | 加 syncFromGateway |
| `packages/desktop/src/renderer/layouts/LeftNav/ConnectionStatus.tsx` | 简化为 Gateway only |
| `packages/desktop/src/renderer/components/ChatInput.tsx` | 离线禁用 |
| `packages/desktop/src/renderer/layouts/Settings/index.tsx` | 删 plugin 配置, 加 token/TLS |

### 删除
| 文件 | 原因 |
|------|------|
| `packages/desktop/src/main/ws/plugin-client.ts` | Plugin 通道废弃 |
| `packages/desktop/src/renderer/lib/agent-message.ts` | Plugin 私有消息处理 |

### 归档 (不删除但退出构建)
| 路径 | 原因 |
|------|------|
| `packages/channel-plugin/` | 从 workspace 移除 |
