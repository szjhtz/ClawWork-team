# HANDOFF.md — ClawWork Project Handoff

> For AI coding tools (Claude, Cursor, Copilot, etc.) picking up this project.
> Last updated: 2026-03-12

---

## What Is This

ClawWork is an **Electron desktop client for OpenClaw** (an AI agent platform). Think "Claude Cowork but for OpenClaw" — three-column layout, multi-task parallel execution, structured progress tracking. Plus file management: all AI artifacts auto-saved to a local Git repo.

**Not** an OpenClaw admin panel. **Not** a chat app. **Not** a collaboration tool. Single-user desktop tool.

## Current State

**Phase 1 + Phase 2 complete. Phase 3 (artifact management) is next.**

The app can:
- Connect to OpenClaw Gateway via WebSocket (challenge-response auth)
- Create multiple Tasks (each = independent OpenClaw session)
- Send messages to AI agents and receive streaming responses
- Render Markdown with syntax highlighting
- Show tool call details in collapsible cards
- Extract progress steps from AI responses (`- [x]`/`- [ ]` patterns)
- List artifacts from message metadata
- Right-click context menu for task status transitions

The app cannot yet:
- Save AI-generated files to disk (Phase 3)
- Git version-control artifacts (Phase 3)
- Browse files across tasks (Phase 3)
- Switch themes (Phase 4)
- Full-text search (Phase 4)
- Configure server address in UI (Phase 4, currently hardcoded)

## How to Run

```bash
# Prerequisites: Node.js 20+, pnpm 10+
pnpm install

# Start dev (Electron hot reload)
pnpm --filter @clawwork/desktop dev

# Type check (run all three)
pnpm exec tsc --noEmit -p packages/shared/tsconfig.json
pnpm exec tsc --noEmit -p packages/desktop/tsconfig.json
pnpm exec tsc --noEmit -p packages/channel-plugin/tsconfig.json
```

**Requires a running OpenClaw server** on `localhost:18789` with gateway token `38d7f008d24a0b508a0ef7149a18bba3ab6ee0bfe5b6f4b9` (hardcoded in `gateway-client.ts`).

## Architecture (2 minutes)

```
pnpm monorepo
├── packages/shared/       → @clawwork/shared (zero-dep types + protocol)
├── packages/channel-plugin/ → OpenClaw plugin (skeleton, not actively used)
└── packages/desktop/      → Electron 34 + React 19 + Tailwind v4
```

**Communication:** Desktop connects to OpenClaw Gateway via WebSocket on `:18789`. Gateway handles AI agent orchestration. Desktop sends `chat.send` RPC, receives `chat` events with streaming deltas.

**State:** Zustand stores in renderer process (taskStore, messageStore, uiStore). No database yet — all state is in-memory, lost on restart. SQLite + Drizzle planned for Phase 3.

**IPC flow:** Renderer → (IPC) → Main process → (WebSocket) → Gateway → Agent → Gateway → (WebSocket) → Main process → (IPC) → Renderer stores.

## File Map

### Shared Types (`packages/shared/src/`)

| File | Purpose |
|------|---------|
| `types.ts` | `Task`, `Message`, `Artifact`, `ToolCall`, `ProgressStep`, enums |
| `protocol.ts` | `WsMessage` union type (8 variants) + type guards |
| `gateway-protocol.ts` | `GatewayFrame` types, `GatewayConnectParams` |
| `constants.ts` | Ports, `buildSessionKey()`, `parseTaskIdFromSessionKey()` |

### Main Process (`packages/desktop/src/main/`)

| File | Purpose |
|------|---------|
| `index.ts` | Electron app lifecycle, window creation, IPC + WS init |
| `ws/gateway-client.ts` | `GatewayClient` class — challenge-response auth, heartbeat, exponential backoff reconnect, `sendChatMessage()`, event forwarding via IPC |
| `ws/plugin-client.ts` | `PluginClient` — connects to channel plugin WS (unused currently) |
| `ws/index.ts` | `initWebSockets()`, getters, `destroy()` |
| `ipc/ws-handlers.ts` | IPC handlers: `ws:send-message`, `ws:chat-history`, `ws:list-sessions`, `ws:gateway-status` |

### Preload (`packages/desktop/src/preload/`)

| File | Purpose |
|------|---------|
| `index.ts` | `buildApi()` factory, exposes `ClawWorkAPI` via `contextBridge` |
| `clawwork.d.ts` | TypeScript interface for `window.clawwork` |

### Renderer (`packages/desktop/src/renderer/`)

| File | Purpose |
|------|---------|
| `App.tsx` | Root: three-column layout (260px + flex + 320px), mounts `useGatewayEventDispatcher` |
| `stores/taskStore.ts` | Task CRUD, `activeTaskId` |
| `stores/messageStore.ts` | `messagesByTask`, `streamingByTask`, `EMPTY_MESSAGES` sentinel |
| `stores/uiStore.ts` | `rightPanelOpen`, `unreadTaskIds` |
| `hooks/useGatewayDispatcher.ts` | Gateway chat events → stores. Parses `payload.message.content[]` |
| `components/ChatMessage.tsx` | User/assistant/system message with Markdown |
| `components/ChatInput.tsx` | Textarea, Enter/Shift+Enter, auto-resize |
| `components/StreamingMessage.tsx` | Delta accumulator + cursor animation |
| `components/ToolCallCard.tsx` | Collapsible tool call card |
| `components/ContextMenu.tsx` | Right-click menu + `useTaskContextMenu` hook |
| `layouts/LeftNav/index.tsx` | Dynamic task list (grouped by status, sorted by time) |
| `layouts/MainArea/index.tsx` | Chat flow, welcome screen, scroll management |
| `layouts/RightPanel/index.tsx` | Progress extraction, artifacts list |

## Critical Pitfalls

### 1. Gateway Chat Event Payload Structure

Content is at `payload.message.content[]`, **NOT** `payload.content[]`.

```json
{
  "type": "event",
  "event": "chat",
  "payload": {
    "sessionKey": "agent:main:task-<uuid>",
    "state": "delta",
    "message": {
      "role": "assistant",
      "content": [{ "type": "text", "text": "..." }]
    }
  }
}
```

### 2. Zustand Selector Infinite Loop

**Never call `get()` inside a Zustand selector.** This pattern causes infinite re-renders:

```typescript
// BAD — creates new object reference every render
useStore((s) => s.getMessages(taskId))
// where getMessages internally calls get()

// GOOD — direct state access
useStore((s) => s.messagesByTask[taskId] ?? EMPTY_MESSAGES)
```

Use module-level `const EMPTY_MESSAGES: Message[] = []` to avoid new empty array references.

### 3. electron-vite Preload Path

electron-vite outputs preload as `.mjs` (not `.js`). Main process must load `preload/index.mjs`.

### 4. @clawwork/shared Must Be Bundled

In `electron.vite.config.ts`, `@clawwork/shared` must NOT be externalized — it must be bundled into the output.

### 5. Gateway Auth

Protocol version must be 3. Client ID must be `gateway-client`, mode must be `backend`. First frame after receiving `connect.challenge` must be `connect` request, or connection is closed.

## What's Next: Phase 3

### T3-1 through T3-3: Artifact Storage Pipeline

1. Channel Plugin `sendMedia()` → WS message with `mediaPath` to client
2. Client copies file from `mediaPath` to task artifact directory
3. Git auto-commit on artifact changes

**Dependencies:** `better-sqlite3`, `drizzle-orm`, `simple-git` (listed in design doc but not yet installed)

### T3-4 through T3-7: File Browser

1. File browser view in Main Area (replaces chat when Files clicked)
2. File cards: icon + name + date + parent task name
3. Click file → jump to source task + highlight message
4. File preview: Markdown inline, code highlight, image thumbnail

See `openclaw-desktop-design.md` sections 4.3 and Phase 3 for full specs.

## Phase 4 (After Phase 3)

- T4-1: Theme switching (dark/light, CSS Variables already defined)
- T4-2: Full-text search (SQLite FTS5)
- T4-3: Settings page (server address, workspace path)
- T4-4: Error handling + reconnect UX
- T4-5-7: electron-builder packaging (macOS dmg)

## Coding Conventions

- TypeScript strict, no `any` (except channel plugin `api` param)
- All colors via CSS Variables (`var(--xxx)`), never hardcoded hex
- Components in `components/` (reusable) or `layouts/` (layout-level)
- One Zustand store per domain (`taskStore`, `messageStore`, `uiStore`)
- WS message types defined in `@clawwork/shared/src/protocol.ts`
- File length limit: 200 lines for TS/TSX files
- Session key format: `agent:<agentId>:task-<taskId>`

## Reference Documents

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | Project guide with progress tracking and tech discoveries |
| `openclaw-desktop-design.md` | Full design spec (data models, UI mockups, ADRs, 28 task descriptions) |
| `~/.agents/memories/.../gateway-ws-protocol.md` | Complete Gateway WS protocol reference (reverse-engineered) |

## Git History

```
bc220ad feat: implement Phase 2 core UI interaction (T2-0 ~ T2-9)
c882b4e feat: implement Gateway WS communication link (Phase 1.3: T1-7/T1-8/T1-9)
e87448e update CLAUDE.md and package lock
375154c feat: initialize ClawWork monorepo with project skeleton (Phase 1.1 + 1.2)
```
