use std::path::Path;

use tauri::AppHandle;
use tauri_plugin_fs::FsExt;

use crate::state::SettingsState;

/**
 * 为 plugin-fs 动态授权目录（递归）
 */
pub fn grant_directory_scope(app: &AppHandle, path: &Path) -> Result<(), String> {
    let canonical = std::fs::canonicalize(path).map_err(|e| e.to_string())?;
    app.fs_scope()
        .allow_directory(&canonical, true)
        .map_err(|e| e.to_string())?;
    Ok(())
}

/**
 * 为 plugin-fs 动态授权单个文件
 */
pub fn grant_file_scope(app: &AppHandle, path: &Path) -> Result<(), String> {
    let canonical = std::fs::canonicalize(path).map_err(|e| e.to_string())?;
    app.fs_scope()
        .allow_file(&canonical)
        .map_err(|e| e.to_string())?;
    Ok(())
}

/**
 * 授权路径：目录递归授权，文件则授权文件及其父目录
 */
pub fn grant_fs_paths(
    app: &AppHandle,
    settings: &SettingsState,
    paths: &[String],
) -> Result<(), String> {
    for path_str in paths {
        let path = Path::new(path_str);
        if path.is_dir() {
            grant_directory_scope(app, path)?;
            if let Ok(canonical) = std::fs::canonicalize(path) {
                settings.add_allowed_root(canonical);
            }
        } else if path.is_file() {
            grant_file_scope(app, path)?;
            if let Some(parent) = path.parent() {
                grant_directory_scope(app, parent)?;
                if let Ok(canonical) = std::fs::canonicalize(parent) {
                    settings.add_allowed_root(canonical);
                }
            }
        }
    }
    Ok(())
}
