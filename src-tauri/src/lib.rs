use std::collections::HashSet;
use std::fs::{self, File};
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{Emitter, State, Window};

pub mod cli;

const DEFAULT_IGNORE_LIST: &[&str] = &[".git", "node_modules", "__pycache__", ".DS_Store"];
const DEFAULT_MARKDOWN_EXTENSIONS: &[&str] = &["md", "markdown"];
const SEARCH_EMIT_INTERVAL: usize = 5;

struct LaunchState {
    paths: Vec<String>,
}

struct SearchState {
    cancelled_ids: Mutex<HashSet<String>>,
}

struct WatcherState {
    watcher: Mutex<Option<RecommendedWatcher>>,
    watched_paths: Mutex<HashSet<PathBuf>>,
}

struct SettingsState {
    ignore_list: Mutex<Vec<String>>,
    markdown_extensions: Mutex<Vec<String>>,
}

impl SettingsState {
    fn default() -> Self {
        Self {
            ignore_list: Mutex::new(
                DEFAULT_IGNORE_LIST
                    .iter()
                    .map(|s| s.to_string())
                    .collect(),
            ),
            markdown_extensions: Mutex::new(
                DEFAULT_MARKDOWN_EXTENSIONS
                    .iter()
                    .map(|s| s.to_string())
                    .collect(),
            ),
        }
    }

    fn is_ignored(&self, name: &str) -> bool {
        let list = self.ignore_list.lock().unwrap();
        list.iter().any(|item| item == name)
    }

    fn is_markdown_file(&self, path: &Path) -> bool {
        let exts = self.markdown_extensions.lock().unwrap();
        match path.extension() {
            Some(ext) => {
                let ext_str = ext.to_string_lossy().to_string();
                exts.iter().any(|e| !e.is_empty() && e == &ext_str)
            }
            None => exts.iter().any(|e| e.is_empty()),
        }
    }

    fn is_text_file(&self, path: &Path) -> bool {
        if self.is_markdown_file(path) {
            return true;
        }
        if let Some(ext) = path.extension() {
            let ext_str = ext.to_string_lossy().to_string();
            let text_extensions = ["txt", "json", "yaml", "yml", "toml", "rs", "ts", "js", "html", "css"];
            text_extensions.contains(&ext_str.as_str())
        } else {
            false
        }
    }
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SearchMatch {
    path: String,
    line: usize,
    column: usize,
    #[serde(rename = "matchText")]
    match_text: String,
    line_content: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SearchProgress {
    search_id: String,
    total_files: usize,
    searched_files: usize,
    matches: Vec<SearchMatch>,
    is_complete: bool,
    cancelled: bool,
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
async fn list_directory(
    dir_path: String,
    settings: State<'_, SettingsState>,
) -> Result<Vec<serde_json::Value>, String> {
    let path = Path::new(&dir_path);
    let mut entries = Vec::new();

    for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_name = entry.file_name().to_string_lossy().to_string();

        if settings.is_ignored(&file_name) {
            continue;
        }

        let is_dir = entry.path().is_dir();
        let is_markdown = !is_dir && settings.is_markdown_file(&entry.path());
        entries.push(serde_json::json!({
            "name": file_name,
            "path": entry.path().to_string_lossy().to_string(),
            "isDirectory": is_dir,
            "isHidden": file_name.starts_with('.'),
            "isMarkdown": is_markdown,
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
 * 在目录中搜索内容
 */
#[tauri::command]
async fn search_content(
    dir_path: String,
    query: String,
    search_id: String,
    window: Window,
    settings: State<'_, SettingsState>,
    search_state: State<'_, SearchState>,
) -> Result<(), String> {
    {
        let mut cancelled = search_state.cancelled_ids.lock().unwrap();
        cancelled.remove(&search_id);
    }

    let path = Path::new(&dir_path);
    let mut all_files = Vec::new();
    walk_dir(path, &mut all_files, &settings);

    let filtered_files: Vec<PathBuf> = all_files
        .into_iter()
        .filter(|p| settings.is_text_file(p))
        .collect();

    let total_files = filtered_files.len();
    let query_lower = query.to_lowercase();
    let mut all_matches = Vec::new();

    let emit_progress = |window: &Window,
                         search_id: &str,
                         total_files: usize,
                         searched_files: usize,
                         matches: &[SearchMatch],
                         is_complete: bool,
                         cancelled: bool| {
        let progress = SearchProgress {
            search_id: search_id.to_string(),
            total_files,
            searched_files,
            matches: matches.to_vec(),
            is_complete,
            cancelled,
        };
        window.emit("search-result", progress).unwrap_or(());
    };

    if total_files == 0 {
        emit_progress(&window, &search_id, 0, 0, &[], true, false);
        return Ok(());
    }

    for (i, file_path) in filtered_files.iter().enumerate() {
        if search_state.cancelled_ids.lock().unwrap().contains(&search_id) {
            emit_progress(
                &window,
                &search_id,
                total_files,
                i,
                &all_matches,
                true,
                true,
            );
            search_state.cancelled_ids.lock().unwrap().remove(&search_id);
            return Ok(());
        }

        if let Ok(file) = File::open(file_path) {
            let reader = BufReader::new(file);
            for (line_num, line) in reader.lines().enumerate() {
                if let Ok(line) = line {
                    if let Some(col) = line.to_lowercase().find(&query_lower) {
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

        let searched = i + 1;
        let is_complete = searched == total_files;
        if is_complete || searched % SEARCH_EMIT_INTERVAL == 0 {
            emit_progress(
                &window,
                &search_id,
                total_files,
                searched,
                &all_matches,
                is_complete,
                false,
            );
        }
    }

    search_state.cancelled_ids.lock().unwrap().remove(&search_id);
    Ok(())
}

/**
 * 取消进行中的内容搜索
 */
#[tauri::command]
async fn cancel_search(
    search_id: String,
    search_state: State<'_, SearchState>,
) -> Result<(), String> {
    search_state.cancelled_ids.lock().unwrap().insert(search_id);
    Ok(())
}

/**
 * 开始监听指定文件变更
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

/**
 * 返回启动时 CLI 传入的路径（文件或目录）
 */
#[tauri::command]
fn get_launch_paths(state: State<'_, LaunchState>) -> Vec<String> {
    state.paths.clone()
}

/**
 * 更新设置（忽略列表和扩展名）
 */
#[tauri::command]
async fn update_settings(
    ignore_list: Vec<String>,
    markdown_extensions: Vec<String>,
    settings: State<'_, SettingsState>,
) -> Result<(), String> {
    {
        let mut list = settings.ignore_list.lock().unwrap();
        *list = ignore_list;
    }
    {
        let mut exts = settings.markdown_extensions.lock().unwrap();
        *exts = markdown_extensions;
    }
    Ok(())
}

fn walk_dir(path: &Path, files: &mut Vec<PathBuf>, settings: &SettingsState) {
    if path.is_dir() {
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let entry_path = entry.path();
                let file_name = entry.file_name().to_string_lossy().to_string();

                if settings.is_ignored(&file_name) {
                    continue;
                }

                if entry_path.is_dir() {
                    walk_dir(&entry_path, files, settings);
                } else {
                    files.push(entry_path);
                }
            }
        }
    }
}

/**
 * Tauri 应用入口：注册插件与 command
 */
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(launch_paths: Vec<String>) {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(WatcherState {
            watcher: Mutex::new(None),
            watched_paths: Mutex::new(HashSet::new()),
        })
        .manage(SettingsState::default())
        .manage(SearchState {
            cancelled_ids: Mutex::new(HashSet::new()),
        })
        .manage(LaunchState {
            paths: launch_paths,
        })
        .invoke_handler(tauri::generate_handler![
            list_directory,
            search_content,
            cancel_search,
            watch_file,
            unwatch_file,
            update_settings,
            get_launch_paths,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod settings_tests {
    use super::*;

    fn settings_with(exts: Vec<&str>) -> SettingsState {
        SettingsState {
            ignore_list: Mutex::new(vec![]),
            markdown_extensions: Mutex::new(exts.into_iter().map(String::from).collect()),
        }
    }

    #[test]
    fn markdown_file_matches_extensionless_when_configured() {
        let settings = settings_with(vec!["md", ""]);
        assert!(settings.is_markdown_file(Path::new("README")));
        assert!(settings.is_markdown_file(Path::new("guide.md")));
        assert!(!settings.is_markdown_file(Path::new("image.png")));
    }
}
