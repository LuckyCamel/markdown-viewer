use std::fs;
use std::path::{Path, PathBuf};

use crate::state::SettingsState;

/**
 * 递归收集目录下所有文件路径（跳过忽略项）
 */
pub fn walk_dir(path: &Path, files: &mut Vec<PathBuf>, settings: &SettingsState) {
    if !path.is_dir() {
        return;
    }
    let Ok(entries) = fs::read_dir(path) else {
        return;
    };
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
