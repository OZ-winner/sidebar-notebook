import { useEffect, useRef, useState, useCallback } from "react";
import { getCurrentWindow, PhysicalPosition } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

export default function SidebarTrigger() {
  const [menuVisible, setMenuVisible] = useState(false);
  const posRef = useRef({ x: 0, y: 0 });

  // Position at right edge, 1/3 down
  useEffect(() => {
    (async () => {
      const w = getCurrentWindow();
      const ss: any = await invoke("get_screen_size");
      const x = ss.width - 16;
      const y = Math.round(ss.height / 3) - 16;
      posRef.current = { x, y };
      await w.setIgnoreCursorEvents(false);
      await w.setPosition(new PhysicalPosition(x, y));
      await w.setFocus();
    })();
  }, []);

  const togglePanel = useCallback(async () => {
    await invoke("toggle_panel");
  }, []);

  return (
    <>
      <div className="sidebar-trigger" onClick={togglePanel} title="速记"
        onContextMenu={e => { e.preventDefault(); setMenuVisible(true); }}>
        <div className="trigger-grip">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="M15 5l4 4" />
          </svg>
        </div>
      </div>
      {menuVisible && (
        <div className="floating-menu-overlay" onClick={() => setMenuVisible(false)}>
          <div className="floating-menu" onClick={e => e.stopPropagation()}>
            <button onClick={() => { togglePanel(); setMenuVisible(false); }}>速记</button>
            <hr />
            <button onClick={async () => { await invoke("enable_autostart"); setMenuVisible(false); }}>开机自启</button>
            <button onClick={() => getCurrentWindow().close()}>关闭</button>
          </div>
        </div>
      )}
    </>
  );
}