use tauri::Manager;
use std::path::PathBuf;
use tauri::tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIconEvent};
use tauri::menu::{Menu, MenuItemBuilder};

fn notebook_dir() -> Result<PathBuf, String> {
    let profile = std::env::var("USERPROFILE").map_err(|_| "USERPROFILE not set".to_string())?;
    let path = PathBuf::from(profile).join("Desktop").join("notebook");
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path)
}

fn parse_fm(content: &str) -> (String, String, String, String) {
    let mut title = String::new();
    let mut created = String::new();
    let mut updated = String::new();
    let body = if let Some(rest) = content.strip_prefix("---\n") {
        if let Some(end) = rest.find("\n---") {
            let fm = &rest[..end];
            for line in fm.lines() {
                if let Some(v) = line.strip_prefix("title: ") { title = v.trim().to_string(); }
                if let Some(v) = line.strip_prefix("created: ") { created = v.trim().to_string(); }
                if let Some(v) = line.strip_prefix("updated: ") { updated = v.trim().to_string(); }
            }
            rest[end + 4..].trim().to_string()
        } else { content.to_string() }
    } else { content.to_string() };
    (title, created, updated, body)
}

fn make_fm(title: &str, created: &str, updated: &str, body: &str) -> String {
    format!("---\ntitle: {}\ncreated: {}\nupdated: {}\n---\n\n{}", title, created, updated, body.trim())
}

#[derive(serde::Serialize)]
struct ScreenSize { width: i32, height: i32 }

#[derive(serde::Serialize)]
struct NoteInfo { filename: String, title: String, created: String, updated: String }

#[tauri::command]
fn get_screen_size(app: tauri::AppHandle) -> Result<ScreenSize, String> {
    let m = app.primary_monitor().ok().flatten().ok_or("no monitor")?;
    Ok(ScreenSize { width: m.size().width as i32, height: m.size().height as i32 })
}

#[tauri::command]
fn list_notes() -> Result<Vec<NoteInfo>, String> {
    let dir = notebook_dir()?;
    let mut entries: Vec<_> = std::fs::read_dir(&dir).map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().is_some_and(|ext| ext == "md"))
        .collect();
    entries.sort_by_key(|e| e.path());
    entries.reverse();
    let mut notes = Vec::new();
    for e in entries {
        let filename = e.file_name().to_string_lossy().to_string();
        let content = std::fs::read_to_string(e.path()).map_err(|e| e.to_string())?;
        let (title, created, updated, _) = parse_fm(&content);
        notes.push(NoteInfo { filename, title, created, updated });
    }
    Ok(notes)
}

#[tauri::command]
fn create_note() -> Result<String, String> {
    let dir = notebook_dir()?;
    let now = chrono::Local::now();
    let ts = now.format("%Y%m%d_%H%M%S").to_string();
    let tf = now.format("%Y-%m-%d %H:%M").to_string();
    let filename = format!("note_{}.md", ts);
    let default_title = now.format("%m月%d日 %H:%M").to_string();
    std::fs::write(dir.join(&filename), make_fm(&default_title, &tf, &tf, "")).map_err(|e| e.to_string())?;
    Ok(filename)
}

#[tauri::command]
fn save_note(filename: String, content: String) -> Result<(), String> {
    let dir = notebook_dir()?;
    let path = dir.join(&filename);
    let existing = std::fs::read_to_string(&path).unwrap_or_default();
    let (title, created, _, _) = parse_fm(&existing);
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M").to_string();
    std::fs::write(&path, make_fm(&title, &created, &now, &content)).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn read_note(filename: String) -> Result<String, String> {
    let content = std::fs::read_to_string(notebook_dir()?.join(&filename)).map_err(|e| e.to_string())?;
    let (_, _, _, body) = parse_fm(&content);
    Ok(body)
}

#[tauri::command]
fn delete_note(filename: String) -> Result<(), String> {
    std::fs::remove_file(notebook_dir()?.join(&filename)).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn update_title(filename: String, title: String) -> Result<(), String> {
    let dir = notebook_dir()?;
    let path = dir.join(&filename);
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let (_, created, updated, body) = parse_fm(&content);
    std::fs::write(&path, make_fm(&title, &created, &updated, &body)).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn toggle_panel(app: tauri::AppHandle) -> Result<bool, String> {
    if let Some(p) = app.get_webview_window("panel") {
        let vis = p.is_visible().map_err(|e| e.to_string())?;
        if vis {
            p.hide().map_err(|e| e.to_string())?;
            return Ok(false);
        }
        let mon = app.primary_monitor().ok().flatten();
        let sw = mon.map(|m| m.size().width as i32).unwrap_or(1920);
        let pw = p.outer_size().map_err(|e| e.to_string())?.width as i32;
        p.set_position(tauri::PhysicalPosition::new(sw - pw, 0)).map_err(|e| e.to_string())?;
        p.show().map_err(|e| e.to_string())?;
        p.set_focus().map_err(|e| e.to_string())?;
        Ok(true)
    } else {
        Err("panel window not found".into())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let mon = app.primary_monitor().ok().flatten();
            let (sw, sh) = mon.map(|m| (m.size().width as i32, m.size().height as i32)).unwrap_or((1920, 1080));

            // Trigger: 32x32 at right edge, ~1/3 from top
            if let Some(w) = app.get_webview_window("trigger") {
                w.set_size(tauri::PhysicalSize::new(32, 32)).ok();
                w.set_position(tauri::PhysicalPosition::new(sw - 16, sh / 3 - 16)).ok();
            }

            // Panel
            if let Some(w) = app.get_webview_window("panel") {
                w.set_position(tauri::PhysicalPosition::new(sw - 400, 0)).ok();
                w.set_size(tauri::PhysicalSize::new(400, sh)).ok();
            }

            // Tray
            if let Some(icon) = app.default_window_icon().cloned() {
                let ah = app.handle();
                let toggle_item = MenuItemBuilder::with_id("toggle", "速记").build(ah).unwrap();
                let start_item = MenuItemBuilder::with_id("autostart", "开机自启").build(ah).unwrap();
                let sep = tauri::menu::PredefinedMenuItem::separator(ah).unwrap();
                let close_item = MenuItemBuilder::with_id("close", "关闭").build(ah).unwrap();
                let menu = Menu::with_items(ah, &[&toggle_item, &sep, &start_item, &close_item]).unwrap();
                TrayIconBuilder::new().icon(icon).tooltip("速记")
                    .menu(&menu)
                    .on_menu_event(|app2, ev| {
                        match ev.id().as_ref() {
                            "toggle" => {
                                if let Some(p) = app2.get_webview_window("panel") {
                                    let ah3 = app2.clone();
                                    tauri::async_runtime::spawn(async move {
                                        let vis = p.is_visible().ok().unwrap_or(false);
                                        if vis { p.hide().ok(); return; }
                                        let mon = ah3.primary_monitor().ok().flatten();
                                        let sw = mon.map(|m| m.size().width as i32).unwrap_or(1920);
                                        let pw = p.outer_size().ok().map(|s| s.width as i32).unwrap_or(400);
                                        p.set_position(tauri::PhysicalPosition::new(sw - pw, 0)).ok();
                                        p.show().ok(); p.set_focus().ok();
                                    });
                                }
                            }
                            "autostart" => {
                                let startup = PathBuf::from(std::env::var("APPDATA").unwrap_or_default())
                                    .join("Microsoft").join("Windows").join("Start Menu").join("Programs").join("Startup");
                                let lnk = startup.join("速记.lnk");
                                if lnk.exists() { std::fs::remove_file(&lnk).ok(); }
                                else {
                                    use std::os::windows::process::CommandExt;
                                    const CNW: u32 = 0x08000000;
                                    if let Ok(exe) = std::env::current_exe() {
                                        let ps = format!("$s=(New-Object -COM WScript.Shell).CreateShortcut(\"{0}\");$s.TargetPath=\"{1}\";$s.Save()",
                                            lnk.to_string_lossy().replace("'", "''"),
                                            exe.to_string_lossy().replace("'", "''"));
                                        std::process::Command::new("powershell")
                                            .args(["-NoProfile", "-Command", &ps]).creation_flags(CNW).output().ok();
                                    }
                                }
                            }
                            "close" => { app2.exit(0); }
                            _ => {}
                        }
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                            if let Some(p) = tray.app_handle().get_webview_window("panel") {
                                let ah4 = tray.app_handle().clone();
                                tauri::async_runtime::spawn(async move {
                                    let vis = p.is_visible().ok().unwrap_or(false);
                                    if vis { p.hide().ok(); return; }
                                    let mon = ah4.primary_monitor().ok().flatten();
                                    let sw = mon.map(|m| m.size().width as i32).unwrap_or(1920);
                                    let pw = p.outer_size().ok().map(|s| s.width as i32).unwrap_or(400);
                                    p.set_position(tauri::PhysicalPosition::new(sw - pw, 0)).ok();
                                    p.show().ok(); p.set_focus().ok();
                                });
                            }
                        }
                    })
                    .build(ah).ok();
            }

            #[cfg(debug_assertions)]
            if let Some(w) = app.get_webview_window("panel") { w.open_devtools(); }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_screen_size, list_notes, create_note, save_note, read_note,
            delete_note, update_title, toggle_panel,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}