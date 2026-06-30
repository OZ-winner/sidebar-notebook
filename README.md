# 速记 (Sidebar Notebook)

屏幕右侧的极简单笔记工具，本地存储，离线可用。

![icon](src-tauri/icons/128x128.png)

## 特性

- 笔记本黄色触发色块固定在屏幕右边缘，点击弹出笔记面板
- 笔记以 Markdown 文件存储在 `桌面/notebook/` 文件夹
- 支持标题编辑、Markdown 预览、拖拽调整面板宽度
- 创建/修改自动记录时间（精确到分钟）
- 系统托盘常驻，支持开机自启

## 安装

从 [Releases](https://github.com/OZ-winner/sidebar-notebook/releases) 下载最新版安装包，双击安装即可。

## 开发

```bash
npm install
npx tauri dev
```

## 技术栈

- Tauri v2 + React + TypeScript
- 纯本地，无需联网