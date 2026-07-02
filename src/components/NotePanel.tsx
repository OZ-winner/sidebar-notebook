 import { useEffect, useRef, useState, useCallback } from "react";
 import { getCurrentWindow, PhysicalSize, PhysicalPosition } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import ReactMarkdown from "react-markdown";

interface NoteInfo {
  filename: string;
  title: string;
  created: string;
  updated: string;
}
 
 export default function NotePanel() {
   const [sw, setSw] = useState(1920);
   const [sh, setSh] = useState(1080);
   const [panelW, setPanelW] = useState(400);
   const [notes, setNotes] = useState<NoteInfo[]>([]);
   const [active, setActive] = useState<string | null>(null);
   const [content, setContent] = useState<string>("");
   const [listView, setListView] = useState(true);
   const resizing = useRef(false);
   const startX = useRef(0);
   const startW = useRef(400);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
 const activeRef = useRef<string | null>(null);
 const [preview, setPreview] = useState(false);
 const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
 const [autoHide, setAutoHide] = useState(true);
 const [editingTitle, setEditingTitle] = useState(false);
 const titleTimer = useRef<ReturnType<typeof setTimeout>>();

  // 初始化
  useEffect(() => {
     (async () => {
       const ss: any = await invoke("get_screen_size");
       setSw(ss.width); setSh(ss.height);
       const list: any = await invoke("list_notes");
       setNotes(list);
     })();
   }, []);
 
   // 失焦自动隐藏
   useEffect(() => {
     if (!autoHide) return;
     const w = getCurrentWindow();
     const unlisten = w.onFocusChanged(({ payload: focused }) => {
       if (!focused) {
         timerRef.current = setTimeout(() => w.hide(), 150);
       } else {
         clearTimeout(timerRef.current);
       }
     });
     return () => { unlisten.then((u) => u()); clearTimeout(timerRef.current); };
   }, [autoHide]);
 
  // 新建笔记
  const handleNew = useCallback(async () => {
    const filename: string = await invoke("create_note");
    activeRef.current = filename;
    const list: any = await invoke("list_notes");
    setNotes(list);
    setActive(filename);
    setContent("");
    setListView(false);
    setPreview(false);
  }, []);
 
  // 选中笔记
  const handleSelect = useCallback(async (filename: string) => {
    activeRef.current = filename;
    const body: string = await invoke("read_note", { filename });
    setActive(filename);
    setContent(body);
    setListView(false);
    setPreview(false);
  }, []);
 
  // 返回列表
  const handleBack = useCallback(() => {
    activeRef.current = null;
    setActive(null);
    setContent("");
    setListView(true); setEditingTitle(false);
  }, []);
 
  // 内容变更（500ms 防抖保存）
  const handleChange = useCallback((val: string) => {
    setContent(val);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const target = activeRef.current;
      if (!target) return;
      await invoke("save_note", { filename: target, content: val });
      const list: any = await invoke("list_notes");
      setNotes(list);
    }, 500);
 }, []);
 // 标题变更（500ms 防抖）
 const handleTitleChange = useCallback((newTitle: string) => {
   const target = activeRef.current;
   if (!target) return;
   setNotes(prev => prev.map(n => n.filename === target ? { ...n, title: newTitle } : n));
   clearTimeout(titleTimer.current);
   titleTimer.current = setTimeout(async () => {
     await invoke("update_title", { filename: target, title: newTitle });
   }, 500);
 }, []);
 
 // 删除笔记
 const handleDelete = useCallback(async (filename: string) => {
   await invoke("delete_note", { filename });
   if (active === filename) { setActive(null); setContent(""); setListView(true); }
   const list: any = await invoke("list_notes");
   setNotes(list);
   setConfirmDelete(null);
 }, [active]);
 
   // 宽度拖拽
   const onMouseDown = (e: React.MouseEvent) => {
     e.preventDefault();
     resizing.current = true;
     startX.current = e.clientX;
     startW.current = panelW;
     document.addEventListener("mousemove", onMouseMove);
     document.addEventListener("mouseup", onMouseUp);
   };
  const onMouseMove = (e: MouseEvent) => {
    if (!resizing.current) return;
    const delta = startX.current - e.clientX;
    const nw = Math.max(280, Math.min(800, startW.current + delta));
    setPanelW(nw);
    const w = getCurrentWindow();
    w.setSize(new PhysicalSize(nw, sh));
    w.setPosition(new PhysicalPosition(sw - nw, 0));
  };
   const onMouseUp = () => {
     resizing.current = false;
     document.removeEventListener("mousemove", onMouseMove);
     document.removeEventListener("mouseup", onMouseUp);
   };
 
   // 键盘快捷键
   useEffect(() => {
     const h = (e: KeyboardEvent) => {
       if ((e.ctrlKey || e.metaKey) && e.key === "n") { e.preventDefault(); handleNew(); }
     };
     document.addEventListener("keydown", h);
     return () => document.removeEventListener("keydown", h);
  }, [handleNew]);
 const activeNote = notes.find(n => n.filename === active);
 
    return (
    <>
    <div className="note-panel">
       <div className="resize-handle" onMouseDown={onMouseDown} />
       <div className="panel-header">
         <div className="panel-title">
           {!listView && (
             <button className="icon-btn" onClick={handleBack} title="返回列表">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
             </button>
           )}
           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
             <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
           </svg>
           <span>速记</span>
         </div>
  <div className="panel-header-actions">
           {!listView && (
             <button className={`icon-btn ${preview ? "active" : ""}`} onClick={() => setPreview(p => !p)} title={preview ? "编辑" : "预览"}>
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
             </button>
           )}
           <button className={`icon-btn ${autoHide ? "" : "active"}`} onClick={() => setAutoHide(a => !a)} title={autoHide ? "点击外部自动收起: 开" : "点击外部自动收起: 关"}>
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 17 4 4v-7"/><path d="M15 3H9l-1 6h8z"/><path d="m12 17-4 4v-7"/><line x1="15" y1="9" x2="15" y2="3"/><line x1="9" y1="9" x2="9" y2="3"/></svg>
           </button>
           <button className="icon-btn new-btn" onClick={handleNew} title="新建笔记 (Ctrl+N)">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
           </button>
           <button className="icon-btn" onClick={() => getCurrentWindow().hide()} title="关闭">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
           </button>
         </div>
       </div>
 
       <div className="panel-body">
         {notes.length === 0 && listView ? (
           <div className="new-note-placeholder">
             <p>新建笔记...</p>
             <span className="hint">点击上方 + 或按 Ctrl+N</span>
           </div>
         ) : !listView && active ? (
           <div className="note-editor">
            {editingTitle ? (
              <input className="note-title-input" value={activeNote?.title || ""}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => { if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); } }}
                autoFocus
              />
            ) : (
              <div className="note-title" onClick={() => setEditingTitle(true)}>
                {activeNote?.title || "无标题"}
              </div>
            )}
            <div className="note-meta">
              {activeNote && (
                <>
                  <span className="note-time">创建 {activeNote.created}</span>
                  <span className="note-time">修改 {activeNote.updated}</span>
                </>
              )}
              <button className="icon-btn delete-btn" onClick={() => setConfirmDelete(active)} title="删除">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
              </button>
            </div>
            {preview ? (
              <div className="markdown-preview"><ReactMarkdown>{content}</ReactMarkdown></div>
            ) : (
              <textarea className="note-content" value={content} onChange={(e) => handleChange(e.target.value)} autoFocus />
            )}
           </div>
         ) : (
           <div className="note-list">
             {notes.map((note) => (
               <div key={note.filename} className="note-item">
                 <div className="note-item-main" onClick={() => handleSelect(note.filename)}>
                   <div className="note-item-title">{note.title || note.filename.replace(/^note_|\.md$/g, "").replace(/(\d{8})_(\d{6})/, "$1 $2")}</div>
                   <div className="note-item-time">修改 {note.updated}</div>
                 </div>
                 <button className="icon-btn delete-btn-sm" onClick={() => setConfirmDelete(note.filename)} title="删除">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                 </button>
               </div>
             ))}
           </div>
         )}
       </div>
 
            </div>
     {/* 删除确认对话框 */}
     {confirmDelete && (
       <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
         <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
           <p>确定删除这篇笔记吗？</p>
           <div className="confirm-actions">
             <button className="confirm-cancel" onClick={() => setConfirmDelete(null)}>取消</button>
             <button className="confirm-ok" onClick={() => handleDelete(confirmDelete)}>删除</button>
           </div>
         </div>
       </div>
     )}
      </>
  );
 }
