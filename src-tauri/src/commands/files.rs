use std::fs;
use std::path::{Path, PathBuf};

use tauri::State;

use crate::commands::store::StoreState;
use crate::filters::FileFilters;
use crate::workspace::WorkspaceState;

/**
 * 批量检查文件/目录是否存在
 *
 * 接收一组路径，返回与路径一一对应的存在性布尔值。
 * 用于启动时校验最近文件/目录条目是否仍然有效。
 */
#[tauri::command]
pub async fn check_files_exist(paths: Vec<String>) -> Result<Vec<bool>, String> {
    Ok(paths.iter().map(|p| Path::new(p).exists()).collect())
}

/**
 * 构建文件条目的 JSON 对象
 */
fn build_file_entry(
    path: &Path,
    name: String,
    is_dir: bool,
    filters: &FileFilters,
) -> serde_json::Value {
    let is_markdown = !is_dir && filters.is_markdown_file(path);
    let is_text_file = !is_dir && filters.is_text_file(path);
    let modified = fs::metadata(path)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs_f64() * 1000.0);

    let size = if is_dir {
        None
    } else {
        fs::metadata(path).ok().map(|m| m.len())
    };

    let mut entry = serde_json::json!({
        "name": name,
        "path": path.to_string_lossy().to_string(),
        "isDirectory": is_dir,
        "isHidden": name.starts_with('.'),
        "isMarkdown": is_markdown,
        "isTextFile": is_text_file,
    });

    if let Some(m) = modified {
        entry["modified"] = serde_json::json!(m);
    }
    if let Some(s) = size {
        entry["size"] = serde_json::json!(s);
    }

    entry
}

/**
 * 新建文件
 */
#[tauri::command]
pub async fn create_file(
    dir_path: String,
    name: String,
    workspace: State<'_, WorkspaceState>,
    store: State<'_, StoreState>,
) -> Result<serde_json::Value, String> {
    let parent = Path::new(&dir_path);
    workspace.assert_allowed(parent)?;

    if !parent.is_dir() {
        return Err(format!("目录不存在: {}", dir_path));
    }

    if name.is_empty() || name.trim().is_empty() {
        return Err("文件名不能为空".to_string());
    }

    let invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
    if name.chars().any(|c| invalid_chars.contains(&c)) {
        return Err("文件名包含非法字符".to_string());
    }

    let file_path: PathBuf = parent.join(&name);

    if file_path.exists() {
        return Err(format!("文件已存在: {}", name));
    }

    fs::File::create(&file_path).map_err(|e| format!("创建文件失败: {}", e))?;

    let filters = FileFilters::from_store(&store)?;
    Ok(build_file_entry(&file_path, name, false, &filters))
}

/**
 * 新建文件夹
 */
#[tauri::command]
pub async fn create_directory(
    dir_path: String,
    name: String,
    workspace: State<'_, WorkspaceState>,
    store: State<'_, StoreState>,
) -> Result<serde_json::Value, String> {
    let parent = Path::new(&dir_path);
    workspace.assert_allowed(parent)?;

    if !parent.is_dir() {
        return Err(format!("目录不存在: {}", dir_path));
    }

    if name.is_empty() || name.trim().is_empty() {
        return Err("文件夹名不能为空".to_string());
    }

    let invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
    if name.chars().any(|c| invalid_chars.contains(&c)) {
        return Err("文件夹名包含非法字符".to_string());
    }

    let new_dir_path: PathBuf = parent.join(&name);

    if new_dir_path.exists() {
        return Err(format!("文件夹已存在: {}", name));
    }

    fs::create_dir(&new_dir_path).map_err(|e| format!("创建文件夹失败: {}", e))?;

    let filters = FileFilters::from_store(&store)?;
    Ok(build_file_entry(&new_dir_path, name, true, &filters))
}

/**
 * 保存文件内容（编辑模式专用）
 *
 * 要求目标路径位于已授权的工作区根目录下。文件存在则覆盖。
 * 返回保存后的修改时间（毫秒级时间戳）。
 */
#[tauri::command]
pub async fn save_file(
    path: String,
    content: String,
    workspace: State<'_, WorkspaceState>,
) -> Result<i64, String> {
    let target = Path::new(&path);
    workspace.assert_allowed(target)?;

    fs::write(target, content).map_err(|e| format!("保存文件失败: {}", e))?;

    let mtime = fs::metadata(target)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
        .ok_or("获取文件修改时间失败".to_string())?;

    Ok(mtime)
}

/**
 * 获取文件修改时间
 *
 * 返回毫秒级时间戳，文件不存在则返回 -1。
 */
#[tauri::command]
pub async fn get_mtime(path: String) -> Result<i64, String> {
    let target = Path::new(&path);

    if !target.exists() {
        return Ok(-1);
    }

    let mtime = fs::metadata(target)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
        .ok_or("获取文件修改时间失败".to_string())?;

    Ok(mtime)
}

/**
 * 重命名文件/文件夹
 */
#[tauri::command]
pub async fn rename_entry(
    old_path: String,
    new_name: String,
    workspace: State<'_, WorkspaceState>,
    store: State<'_, StoreState>,
) -> Result<serde_json::Value, String> {
    let old = Path::new(&old_path);
    workspace.assert_allowed(old)?;

    if !old.exists() {
        return Err(format!("路径不存在: {}", old_path));
    }

    if new_name.is_empty() || new_name.trim().is_empty() {
        return Err("名称不能为空".to_string());
    }

    let invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
    if new_name.chars().any(|c| invalid_chars.contains(&c)) {
        return Err("名称包含非法字符".to_string());
    }

    let parent = old.parent().ok_or("无效的路径")?;
    let new_path = parent.join(&new_name);

    if new_path.exists() {
        return Err(format!("已存在同名文件/文件夹: {}", new_name));
    }

    fs::rename(old, &new_path).map_err(|e| format!("重命名失败: {}", e))?;

    let is_dir = new_path.is_dir();
    let filters = FileFilters::from_store(&store)?;
    Ok(build_file_entry(&new_path, new_name, is_dir, &filters))
}
