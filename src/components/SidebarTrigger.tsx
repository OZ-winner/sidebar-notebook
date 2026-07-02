import { useEffect, useRef, useState, useCallback } from "react";
import { getCurrentWindow, PhysicalPosition } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

export default function SidebarTrigger() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [sh, setSh] = useState(1080);
  const [sw, setSw] = useState(1920);
  const [dragging, setDragging] = useState(false);
  const posRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ sy: 0, oy: 0 });

  useEffect(() => {
    (async () => {
      const w = getCurrentWindow();
      const ss: any = await invoke("get_screen_size");
      setSw(ss.width); setSh(ss.height);
      const x = ss.width - 16;
      const y = Math.round(ss.height / 3) - 16;
      posRef.current = { x, y };
      await w.setIgnoreCursorEvents(false);
      await w.setPosition(new PhysicalPosition(x, y));
    })();
  }, []);

  const togglePanel = useCallback(async () => {
    await invoke("toggle_panel");
  }, []);

  // Vertical drag along right edge
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) return;
    e.preventDefault();
    setDragging(true);
    const w = getCurrentWindow();
    dragRef.current = { sy: e.screenY, oy: posRef.current.y };
    const onMove = (me: MouseEvent) => {
      const dy = me.screenY - dragRef.current.sy;
      const ny = Math.max(0, Math.min(sh - 32, dragRef.current.oy + dy));
      posRef.current = { x: sw - 16, y: ny };
      w.setPosition(new PhysicalPosition(sw - 16, ny));
    };
    const onUp = () => {
      setDragging(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <>
      <div className={`sidebar-trigger ${dragging ? "dragging" : ""}`}
        onMouseDown={onMouseDown} onClick={togglePanel} title="速记"
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