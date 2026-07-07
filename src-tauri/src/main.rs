use std::collections::HashSet;
use std::fs::{self, File};
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{Emitter, State, Window};
use notify::{RecommendedWatcher, RecursiveMode, Watcher};

struct WatcherState {
    watcher: Mutex<Option<RecommendedWatcher>>,
    watched_paths: Mutex<HashSet<PathBuf>>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct SearchMatch {
    path: String,
    line: usize,
    column: usize,
    match_text: String,
    line_content: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct SearchProgress {
    total_files: usize,
    searched_files: usize,
    matches: Vec<SearchMatch>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct FileChangePayload {
    path: String,
    change_type: String,
    content: Option<String>,
}

/**
 * 列出目录下的文件和文件夹
 */
#[tauri::command]
async fn list_directory(dir_path: String) -> Result<Vec<serde_json::Value>, String> {
    let path = Path::new(&dir_path);
    let mut entries = Vec::new();

    for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_name = entry.file_name().to_string_lossy().to_string();
        
        if file_name.starts_with('.') || matches!(file_name.as_str(), ".git" | "node_modules" | "__pycache__" | ".DS_Store") {
            continue;
        }

        let is_dir = entry.path().is_dir();
        entries.push(serde_json::json!({
            "name": file_name,
            "path": entry.path().to_string_lossy().to_string(),
            "isDirectory": is_dir,
            "isHidden": file_name.starts_with('.'),
        }));
    }

    entries.sort_by(|a, b| {
        let a_dir = a["isDirectory"].as_bool().unwrap_or(false);
        let b_dir = b["isDirectory"].as_bool().unwrap_or(false);
        if a_dir != b_dir {
            a_dir.cmp(&b_dir).reverse()
        } else {
            a["name"].as_str().unwrap_or("").cmp(b["name"].as_str().unwrap_or(""))
        }
    });

    Ok(entries)
}

/**
 * 读取文件内容
 */
#[tauri::command]
async fn read_file(file_path: String) -> Result<String, String> {
    fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

/**
 * 在目录中搜索内容
 */
#[tauri::command]
async fn search_content(
    dir_path: String,
    query: String,
    window: Window,
) -> Result<(), String> {
    let path = Path::new(&dir_path);
    let mut all_files = Vec::new();
    walk_dir(path, &mut all_files);

    let text_extensions = [".md", ".markdown", ".txt", ".json", ".yaml", ".yml", ".toml", ".rs", ".ts", ".js", ".html", ".css"];
    let filtered_files: Vec<PathBuf> = all_files
        .into_iter()
        .filter(|p| {
            if let Some(ext) = p.extension() {
                text_extensions.contains(&ext.to_string_lossy().as_ref())
            } else {
                false
            }
        })
        .collect();

    let total_files = filtered_files.len();
    let mut all_matches = Vec::new();

    for (i, file_path) in filtered_files.iter().enumerate() {
        if let Ok(file) = File::open(file_path) {
            let reader = BufReader::new(file);
            for (line_num, line) in reader.lines().enumerate() {
                if let Ok(line) = line {
                    if let Some(col) = line.to_lowercase().find(&query.to_lowercase()) {
                        let start = std::cmp::max(0, col as i32 - 20) as usize;
                        let end = std::cmp::min(line.len(), col + query.len() + 20);
                        all_matches.push(SearchMatch {
                            path: file_path.to_string_lossy().to_string(),
                            line: line_num + 1,
                            column: col + 1,
                            match_text: query.clone(),
                            line_content: line[start..end].trim().to_string(),
                        });
                    }
                }
            }
        }

        let progress = SearchProgress {
            total_files,
            searched_files: i + 1,
            matches: all_matches.clone(),
        };

        window.emit("search-result", progress).unwrap_or(());
    }

    Ok(())
}

/**
 * 开始监听文件变更监听指定文件
 */
#[tauri::command]
async fn watch_file(
    file_path: String,
    window: Window,
    state: State<'_, WatcherState>,
) -> Result<(), String> {
    let path = PathBuf::from(&file_path);

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
                        fs::read_to_string(&path).ok()
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
        }).map_err(|e| e.to_string())?;

        *watcher_guard = Some(watcher);
    }

    if let Some(watcher) = watcher_guard.as_mut() {
        watcher.watch(&path, RecursiveMode::NonRecursive)
            .map_err(|e| e.to_string())?;
        watched.insert(path);
    }

    Ok(())
}

/**
 * 停止监听指定文件
 */
#[tauri::command]
async fn unwatch_file(
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

fn walk_dir(path: &Path, files: &mut Vec<PathBuf>) {
    if path.is_dir() {
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let entry_path = entry.path();
                let file_name = entry.file_name().to_string_lossy().to_string();
                
                if file_name.starts_with('.') || matches!(file_name.as_str(), ".git" | "node_modules" | "__pycache__" | ".DS_Store") {
                    continue;
                }

                if entry_path.is_dir() {
                    walk_dir(&entry_path, files);
                } else {
                    files.push(entry_path);
                }
            }
        }
    }
}

fn main() {
    tauri::Builder::default()
        .manage(WatcherState {
            watcher: Mutex::new(None),
            watched_paths: Mutex::new(HashSet::new()),
        })
        .invoke_handler(tauri::generate_handler![
            list_directory,
            read_file,
            search_content,
            watch_file,
            unwatch_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
