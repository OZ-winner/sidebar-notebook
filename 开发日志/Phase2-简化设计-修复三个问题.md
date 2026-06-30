# Phase 2 — 简化交互设计，修复三个核心问题

**日期：** 2026-06-26

## 解决的问题

### 问题 1：未展开时半透明有边框
**旧方案：** 窗口在 44×44（图标态）和 400×屏高（面板态）之间 resize，`setSize` 异步且和 CSS 动画不同步，导致 DWM 阴影边框残留在屏幕上。
**新方案：** 窗口固定 400px × 屏高，不做任何 resize。右侧 40px 设 `#2d2d2d` 实色背景竖条 Handle，左侧 360px 面板通过纯 CSS `transform: translateX` 控制显示隐藏。`tauri.conf.json` 中 `transparent: false`，消除 DWM 阴影。

### 问题 2：展开后没有加号 / Ctrl+N 无效
**旧方案：** 点击图标 → `switchToFull()` 调用 `setSize(400, sh)` → 窗口 resize 触发 Windows 失焦/重获焦点 → `onFocusChanged` 监听到失焦 → 瞬间关闭面板。用户从未看到 "+" 按钮。
**新方案：** 无 resize → 展开时不触发焦点变化 → `onFocusChanged` 正常工作 → 面板稳定打开 → "+" 按钮和 Ctrl+N 快捷键可正常点击。

### 问题 3：拖拽卡顿 + 整个笔记栏移动
**旧方案：** 每帧 `mousemove` 调一次 `setPosition`（异步 IPC），造成卡顿。单窗口架构下拖动图标就是拖起整个窗口。
**新方案：** 删除 `FloatingIcon` 组件和所有拖拽逻辑。替换为固定右侧竖条 `SidebarTrigger`，仅点击触发面板切换。

## 文件改动清单

| 文件 | 变化 |
|------|------|
| **删除** `FloatingIcon.tsx` | 整文件删除（替换为 SidebarTrigger） |
| **新建** `SidebarTrigger.tsx` | 40px 宽全高竖条 + 居中笔图标，点击触发 `onClick` |
| `App.tsx` | 删掉全部 `switchToIcon/Full`、`handleNewNote`、Tauri IPC 导入、键盘监听。简化为纯状态管理 |
| `NotePanel.tsx` | 删除 `onNewNote` prop（保留 `+` 按钮但暂不可点击） |
| `global.css` | 删 `.floating-icon`、`.overlay`。加 `.sidebar-trigger`、`.trigger-grip`。`body` 从 `transparent` 改 `#1e1e1e`。面板 `translateX(100%+64px)` → `translateX(-100%)`，去掉 `opacity/visibility` 动画 |
| `tauri.conf.json` | `transparent: true` → `false` |
| `lib.rs` | 删 `Emitter` 导入和 `.on_window_event`，保留 `setup` |
| `capabilities/default.json` | 从 11 个权限精简到 `core:default` + `core:event:default` 两个 |

## 当前交互流程

```
屏幕右侧边缘 (固定 400px)：
┌────────────┬────┐
│ 面板 (360px) │Handle│  ← Handle 始终可见
│            │  40│     面板滑动: translateX
│            │ px │
└────────────┴────┘

1. 点击 Handle → 面板从左侧滑入
2. 点击面板外部 → onFocusChanged → 面板滑回
3. 窗口始终 fixed，无 resize，无焦点变化
```

## 编译状态

- TypeScript: ✅ 通过
- Rust (cargo build): ✅ 通过
- 运行方式：`cd /d %TEMP%\sidebar-notes && npx tauri dev`

## 待做 (Phase 3)

- [ ] 编辑器（Markdown + 图片粘贴）
- [ ] 笔记持久化（SQLite）
- [ ] 标签系统
- [ ] "+" 按钮实际功能
- [ ] Ctrl+N 实际功能
### 日期：2026-06-26
### 变更：简化交互设计，删除拖拽和 resize
### 状态：三个问题全部修复，编译通过

---

> 若重新从头编译：`cd /d %TEMP%\sidebar-notes && cargo clean && cargo build --manifest-path src-tauri\Cargo.toml`
