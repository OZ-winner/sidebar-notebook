# 侧边栏弹出笔记 — 交接文档

## 项目概况

Tauri v2 + React + TypeScript 桌面侧边栏笔记应用。Windows 下运行。

**当前状态**：编译通过，可启动运行。三个交互问题已诊断但尚未修复。

### 快速启动

```cmd
cd /d E:\sidebar-notes
npx tauri dev
```

### 文件结构

```
E:\sidebar-notes/
├── src/
│   ├── App.tsx                     # 主应用，根据窗口渲染不同组件
│   ├── main.tsx
│   ├── components/
│   │   ├── SidebarTrigger.tsx      # 右侧触发竖条
│   │   └── NotePanel.tsx           # 笔记面板
│   └── styles/global.css
├── src-tauri/
│   ├── src/main.rs                 # Windows 入口
│   ├── src/lib.rs                  # 窗口定位
│   ├── Cargo.toml                  # 已启用 windows_acrylic 特性
│   ├── tauri.conf.json
│   └── capabilities/default.json
├── 开发日志/
│   ├── Phase1-初始化与核心交互.md
│   ├── Phase2-简化设计-修复三个问题.md
│   ├── Phase2-路径改名-完整编译.md
│   └── Phase2-双窗口改造.md        # ← 重点看这个
└── dist/                           # 已构建的前端
```

## 三个已知问题

| 问题 | 根因 |
|------|------|
| 未展开时半透明有边框 + 挡鼠标 | 单窗口 400px，`transparent: true` 时 DWM 绘阴影，`transparent: false` 时实色挡背景 |
| 展开后侧边栏遮住笔记栏 + 不可调宽度 | trigger(40px) 和 panel(360px) 在同一窗口内，触发条覆盖面板右边缘 |
| 拖拽整个笔记栏跟着跑 | 单窗口架构，拖动 trigger 就是拖整个窗口 |

## 解决方案：双窗口架构（已确认但未实施）

两个独立 Tauri 窗口：

| 窗口 | 大小 | 位置 | 作用 |
|------|------|------|------|
| `trigger` | 40×40 | 右上角 | 半透明亚克力方块，点击切换面板 |
| `panel`  | 400×屏高 | 右边缘 | 浅色笔记面板，可自由调整宽度 |

交互：点击 trigger → panel 弹出。点击面板外部 → 失焦 → 面板收回。

### 需改动的 8 个文件

完整代码见 `开发日志/Phase2-双窗口改造.md`。

| 文件 | 改什么 |
|------|--------|
| `Cargo.toml` | 加 `windows_acrylic` 特性（已改好） |
| `tauri.conf.json` | 改为双窗口配置（trigger + panel） |
| `lib.rs` | setup 中定位两个窗口 + 设亚克力效果 |
| `SidebarTrigger.tsx` | onClick 控制 panel 窗口 show/hide |
| `NotePanel.tsx` | 失焦 delay 后 hide；左边缘 resize handle |
| `App.tsx` | 按 `getCurrentWindow().label` 渲染对应组件 |
| `global.css` | 浅色主题 + 亚克力样式 |
| `capabilities/default.json` | 恢复窗口操作用权限 |

## 目录改名问题

原目录 `E:\侧边栏弹出笔记`（中文）→ 改名为 `E:\sidebar-notes`（ASCII）。Codex 沙箱的写权限绑定旧路径，shell 命令会拒绝写入新路径。**改用 `apply_patch` 工具可以写入**（沙箱内部路径映射）。

如果新开的 Codex 会话仍然遇到写权限问题，在会话开始时将工作区指向 `E:\sidebar-notes` 即可。

## 建议开局 prompt

复制下面的话粘贴给新 Codex 对话：

> 项目是 `E:\sidebar-notes`，Tauri v2 + React 桌面笔记应用。请先读 `HANDOVER.md`，然后按 `开发日志\Phase2-双窗口改造.md` 实施双窗口方案。所有 8 个文件改动都在里面。

---
*生成于 2026-06-26，由上一轮会话转交*
