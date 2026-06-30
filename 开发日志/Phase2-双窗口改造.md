# Phase 2 — 双窗口改造（完整实施方案）

**日期：** 2026-06-26
**状态：** 已确认方案，等待实施

## 架构

```
触发窗口 (40×40)：右上角，半透明亚克力方块
面板窗口 (400×屏高)：右边缘，浅色主题，宽度可拖拽调整

交互：
1. 点击 trigger → panel.show() + panel.setFocus()
2. 点击面板外部 → 失焦 → 150ms delay → panel.hide()
3. trigger 始终 40×40，不挡桌面操作
```

## 文件改动

### 1. src-tauri/Cargo.toml（已改好）

```toml
tauri = { version = "2", features = ["windows_acrylic"] }
```

### 2. src-tauri/tauri.conf.json

```json
{
  "productName": "速记",
  "version": "0.1.0",
  "identifier": "com.sidebar.notes",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "label": "trigger",
        "title": "速记",
        "width": 40,
        "height": 40,
        "decorations": false,
        "transparent": true,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "resizable": false,
        "visible": true
      },
      {
        "label": "panel",
        "title": "笔记面板",
        "width": 400,
        "height": 600,
        "decorations": false,
        "transparent": false,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "resizable": false,
        "visible": false
      }
    ],
    "security": { "csp": null }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": ["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.icns", "icons/icon.ico"]
  }
}
```

### 3. src-tauri/src/lib.rs

```rust
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // 获取主显示器尺寸
            let monitors = app.available_monitors().ok();
            let primary = app.primary_monitor().ok().flatten();
            let mon = primary.or_else(|| monitors.and_then(|m| m.into_iter().next()));
            let (sw, sh) = if let Some(m) = mon {
                (m.size().width as i32, m.size().height as i32)
            } else {
                (1920, 1080)
            };

            // Trigger 窗口 — 右上角 40×40
            if let Some(trigger) = app.get_webview_window("trigger") {
                trigger.set_position(tauri::PhysicalPosition::new(sw - 48, 80)).ok();
                trigger.set_size(tauri::PhysicalSize::new(40, 40)).ok();
                if cfg!(feature = "windows_acrylic") {
                    trigger.set_background_effect(tauri::BackgroundEffect::Acrylic).ok();
                }
            }

            // Panel 窗口 — 右侧 400×屏高
            if let Some(panel) = app.get_webview_window("panel") {
                panel.set_position(tauri::PhysicalPosition::new(sw - 400, 0)).ok();
                panel.set_size(tauri::PhysicalSize::new(400, sh)).ok();
            }

            #[cfg(debug_assertions)] {
                if let Some(w) = app.get_webview_window("panel") {
                    w.open_devtools();
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 4. src/App.tsx

```tsx
import { getCurrentWindow } from "@tauri-apps/api/window";
import NotePanel from "./components/NotePanel";
import SidebarTrigger from "./components/SidebarTrigger";

export default function App() {
  const label = getCurrentWindow().label;

  if (label === "trigger") {
    return <SidebarTrigger />;
  }

  if (label === "panel") {
    return <NotePanel />;
  }

  return null;
}
```

### 5. src/components/SidebarTrigger.tsx

```tsx
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

export default function SidebarTrigger() {
  const handleClick = async () => {
    const panel = WebviewWindow.getByLabel("panel");
    if (!panel) return;
    const visible = await panel.isVisible();
    if (visible) {
      await panel.hide();
    } else {
      await panel.show();
      await panel.setFocus();
    }
  };

  return (
    <div className="sidebar-trigger" onClick={handleClick} title="打开笔记">
      <div className="trigger-grip">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="M15 5l4 4" />
        </svg>
      </div>
    </div>
  );
}
```

### 6. src/components/NotePanel.tsx

```tsx
import { useEffect, useRef, useState } from "react";
import { getCurrentWindow, PhysicalSize } from "@tauri-apps/api/window";

export default function NotePanel() {
  const [width, setWidth] = useState(400);
  const resizing = useRef(false);
  const startX = useRef(0);
  const startW = useRef(400);

  // 失焦自动隐藏
  useEffect(() => {
    const w = getCurrentWindow();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unlisten = w.onFocusChanged(({ payload: focused }) => {
      if (!focused) {
        timer = setTimeout(() => w.hide(), 150);
      } else {
        clearTimeout(timer);
      }
    });
    return () => { unlisten.then((u) => u()); clearTimeout(timer); };
  }, []);

  // 宽度拖拽
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    startX.current = e.clientX;
    startW.current = width;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizing.current) return;
    const delta = startX.current - e.clientX;
    const newW = Math.max(280, Math.min(800, startW.current + delta));
    setWidth(newW);
    getCurrentWindow().setSize(new PhysicalSize(newW, 1080));
  };

  const handleMouseUp = () => {
    resizing.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="note-panel">
      <div className="resize-handle" onMouseDown={handleMouseDown} />
      <div className="panel-header">
        <div className="panel-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          <span>速记</span>
        </div>
        <div className="panel-header-actions">
          <button className="icon-btn new-btn" title="新建笔记 (Ctrl+N)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
          </button>
          <button className="icon-btn" onClick={() => getCurrentWindow().hide()} title="关闭">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="panel-body">
        <div className="new-note-placeholder">
          <p>新建笔记...</p>
          <span className="hint">点击上方 + 或按 Ctrl+N</span>
        </div>
      </div>
    </div>
  );
}
```

### 7. src/styles/global.css

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

html, body, #root { height: 100%; overflow: hidden; }

body {
  background: transparent;
  color: #333;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.app-container { position: relative; width: 100%; height: 100vh; }

.sidebar-trigger {
  width: 40px; height: 100vh;
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; user-select: none;
  transition: background 0.15s;
}
.sidebar-trigger:hover { background: rgba(255,255,255,0.3); }
.trigger-grip { color: #888; transition: color 0.15s; }
.sidebar-trigger:hover .trigger-grip { color: #ccc; }

.note-panel {
  position: relative; width: 100%; height: 100vh;
  background: #f8f9fa; display: flex; flex-direction: column;
}

.resize-handle {
  position: absolute; left: 0; top: 0; bottom: 0;
  width: 6px; cursor: ew-resize; z-index: 40;
}
.resize-handle:hover { background: rgba(0,0,0,0.1); }

.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid #e0e0e0; flex-shrink: 0;
}
.panel-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; color: #333; }
.panel-header-actions { display: flex; align-items: center; gap: 4px; }
.icon-btn {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  border: none; border-radius: 8px; background: transparent; color: #888; cursor: pointer;
}
.icon-btn:hover { background: #e8e8e8; color: #555; }
.new-btn { color: #aaa; }
.new-btn:hover { background: #e8f5e9; color: #4caf50; }

.panel-body {
  flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px;
}
.new-note-placeholder { text-align: center; color: #aaa; }
.new-note-placeholder p { font-size: 15px; color: #999; margin-bottom: 6px; }
.new-note-placeholder .hint { font-size: 12px; color: #bbb; }
```

### 8. src-tauri/capabilities/default.json

```json
{
  "$schema": "https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-utils/schema.json",
  "identifier": "default",
  "description": "Capability for all windows",
  "windows": ["trigger", "panel"],
  "permissions": [
    "core:default",
    "core:event:default",
    "core:window:default",
    "core:webviewwindow:default",
    "core:window:allow-show",
    "core:window:allow-hide",
    "core:window:allow-set-size",
    "core:window:allow-set-position"
  ]
}
```

## 实施顺序

1. 改 `tauri.conf.json`（双窗口配置）
2. 改 `lib.rs`（两个窗口的 setup）
3. 改 `global.css`（浅色 + 亚克力）
4. 改 `App.tsx`（按 label 渲染）
5. 改 `SidebarTrigger.tsx`（控制 panel 窗口）
6. 改 `NotePanel.tsx`（失焦 hide + resize）
7. 改 `capabilities/default.json`（权限）
8. `npm run build`（构建前端）
9. `cargo build`（编译 Rust）
10. `npx tauri dev`（测试）

完成后验证：
- 关闭时 trigger 40×40 在右上角，不挡鼠标
- 打开时 400px 面板出现在右侧，trigger 消失
- 拖拽面板左边缘可调整宽度
- 点击面板外部 → 面板自动收回
