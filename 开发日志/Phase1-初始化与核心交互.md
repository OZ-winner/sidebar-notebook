# Phase 1 — 初始化与核心交互

**日期：** 2026-06-25

## 概述

完成 Tauri v2 + React + TypeScript 项目的初始搭建，实现右上角浮标图标点击侧滑笔记面板的核心交互。

## 项目结构

```
E:\侧边栏弹出笔记/
├── src/                          # React 前端
│   ├── main.tsx                  # 入口
│   ├── App.tsx                   # 主组件（浮标 + 面板状态管理）
│   ├── components/
│   │   ├── FloatingIcon.tsx       # 右上角可拖拽笔图标
│   │   └── NotePanel.tsx         # 右侧滑出笔记面板（含失焦关闭）
│   └── styles/
│       └── global.css            # 全局样式（暗色主题）
├── src-tauri/                    # Tauri 后端
│   ├── src/
│   │   ├── main.rs               # Windows 子系统入口
│   │   └── lib.rs                # 窗口定位、失焦事件
│   ├── Cargo.toml
│   └── tauri.conf.json           # 窗口配置（透明、无边框、置顶）
├── scripts/
│   ├── gen-icons.mjs             # 图标生成（已弃用）
│   └── gen-source-icon.mjs       # 源图标 PNG 生成
├── package.json
└── vite.config.ts
```

## 技术决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 框架 | Tauri v2 + React + TypeScript | 轻量原生壳，窗口表现好 |
| 窗口形态 | 单窗口 400px，透明背景 | 浮标与面板共用一个窗口，CSS 控制切换 |
| 面板动画 | CSS `transform: translateX` | GPU 加速，平滑动画 |
| 失焦关闭 | Tauri `onFocusChanged` API | 点击外部自动收回，无需手动点击关闭 |
| 浮标拖拽 | Tauri `window.setPosition` | 实时移动窗口位置 |

## 关键实现

### 浮标（FloatingIcon）
- 屏幕右上角 44×44 圆角方块，内含笔 SVG 图标
- 鼠标按下 → 全局 mousemove 监听 → 调用 `setPosition` 更新窗口 Y 坐标 → 鼠标释放停止
- X 坐标锁定在屏幕右侧

### 笔记面板（NotePanel）
- 宽度 356px，从右侧 CSS `translateX(100%)` 滑入
- 打开后监听 `onFocusChanged`，失焦自动收回
- 占位内容："新建笔记..."

### 窗口管理（Rust）
- 启动时定位到 `screenWidth - 400, 0`，撑满屏幕高度
- `skipTaskbar: true` 不在任务栏显示
- `alwaysOnTop: true` + 自动隐藏（后续实现全屏检测）

## 踩坑记录

### 1. 中文路径导致 RC.EXE 编译失败
**问题：** 项目路径 `E:\侧边栏弹出笔记` 含中文，`tauri-build` 生成的 `.resource.rc` 文件中路径被错误编码，导致 Windows RC 编译器无法找到图标文件。
**解决：** 在 `C:\Users\OZ\AppData\Local\Temp\sidebar-notes` 临时纯 ASCII 路径下编译。
**后续：** 项目已固定在原路径开发，编译时切到 temp 目录。

### 2. ICO 文件必须符合 3.00 格式
**问题：** 手动生成的 1×1 PNG 和 BMP 像素数据都被 RC.EXE 拒绝（"not in 3.00 format"）。
**解决：** 使用 `npx tauri icon` 命令从源 PNG 生成所有平台图标，生成的 ICO 格式正确。

### 3. Tauri v2 `emit` 需要导入 `Emitter` trait
**问题：** `window.emit()` 需要 `use tauri::Emitter` 导入。
**解决：** 在 `lib.rs` 中添加 `use tauri::{Emitter, Manager}`。

## 当前状态

- [x] Tauri + React 项目骨架
- [x] 无边框透明窗口，右上角定位
- [x] 浮标图标（可拖拽）
- [x] 笔记面板滑动动画
- [x] 失焦自动收回
- [x] Rust 后端编译通过
- [ ] 运行验证未完成（需在用户环境启动 dev server）

## 下一步（Phase 2）

- Markdown 编辑器
- 图片粘贴
- 自动保存
- 笔记列表
- 标签系统
### 日期：2026-06-25
### 状态：核心交互完成，编译通过
### 下一步：运行验证 + Phase 2 编辑器开发

> 从 `E:\侧边栏弹出笔记` 切换到 `C:\Users\OZ\AppData\Local\Temp\sidebar-notes` 目录用 `cargo build` 编译。
> 最终切换到 `E:\侧边栏弹出笔记` 用 `npx tauri dev` 运行。
