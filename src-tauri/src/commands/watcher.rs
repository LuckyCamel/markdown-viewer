use std::fs;
use std::path::PathBuf;

use notify::{RecursiveMode, Watcher};
use tauri::{Emitter, State, Window};

use crate::state::SettingsState;
use crate::state::WatcherState;

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct FileChangePayload {
    path: String,
    change_type: String,
    content: Option<String>,
}

/**
 * 开始监听指定文件变更
 */
#[tauri::command]
pub async fn watch_file(
    file_path: String,
    window: Window,
    settings: State<'_, SettingsState>,
    state: State<'_, WatcherState>,
) -> Result<(), String> {
    let path = PathBuf::from(&file_path);
    settings.ensure_under_allowed_root(&path)?;

    let mut watched = state.watched_paths.lock().unwrap();
    if watched.contains(&path) {
        return Ok(());
    }

    let mut watcher_guard = state.watcher.lock().unwrap();
    if watcher_guard.is_none() {
        let window_clone = window.clone();
        let watcher = notify::recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
            if let Ok(event) = res {
                for path in &event.paths {
                    let path_str = path.to_string_lossy().to_string();
                    let change_type = match event.kind {
                        notify::EventKind::Modify(_) => "change",
                        notify::EventKind::Remove(_) => "delete",
                        notify::EventKind::Create(_) => "create",
                        _ => continue,
                    };

                    let content = if change_type == "change" {
                        fs::read_to_string(path).ok()
                    } else {
                        None
                    };

                    let payload = FileChangePayload {
                        path: path_str,
                        change_type: change_type.to_string(),
                        content,
                    };

                    window_clone.emit("file-change", payload).unwrap_or(());
                }
            }
        })
        .map_err(|e| e.to_string())?;

        *watcher_guard = Some(watcher);
    }

    if let Some(watcher) = watcher_guard.as_mut() {
        watcher
            .watch(&path, RecursiveMode::NonRecursive)
            .map_err(|e| e.to_string())?;
        watched.insert(path);
    }

    Ok(())
}

/**
 * 停止监听指定文件
 */
#[tauri::command]
pub async fn unwatch_file(
    file_path: String,
    state: State<'_, WatcherState>,
) -> Result<(), String> {
    let path = PathBuf::from(&file_path);

    let mut watched = state.watched_paths.lock().unwrap();
    if !watched.contains(&path) {
        return Ok(());
    }

    let mut watcher_guard = state.watcher.lock().unwrap();
    if let Some(watcher) = watcher_guard.as_mut() {
        watcher.unwatch(&path).map_err(|e| e.to_string())?;
        watched.remove(&path);
    }

    Ok(())
}
