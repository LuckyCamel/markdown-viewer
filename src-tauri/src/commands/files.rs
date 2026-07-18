use std::path::Path;

use tauri::State;

use crate::commands::store::StoreState;
use crate::filesystem::{FileEntry, Filesystem};
use crate::filters::FileFilters;
use crate::workspace::WorkspaceState;

#[tauri::command]
pub async fn check_files_exist(paths: Vec<String>) -> Result<Vec<bool>, String> {
    Ok(paths.iter().map(|p| Path::new(p).exists()).collect())
}

#[tauri::command]
pub async fn create_file(
    dir_path: String,
    name: String,
    workspace: State<'_, WorkspaceState>,
    store: State<'_, StoreState>,
) -> Result<FileEntry, String> {
    let parent = Path::new(&dir_path);
    workspace.assert_allowed(parent)?;

    let filters = FileFilters::from_store(&store)?;
    Filesystem::create_file(parent, &name, &filters)
}

#[tauri::command]
pub async fn create_directory(
    dir_path: String,
    name: String,
    workspace: State<'_, WorkspaceState>,
    store: State<'_, StoreState>,
) -> Result<FileEntry, String> {
    let parent = Path::new(&dir_path);
    workspace.assert_allowed(parent)?;

    let filters = FileFilters::from_store(&store)?;
    Filesystem::create_directory(parent, &name, &filters)
}

#[tauri::command]
pub async fn rename_entry(
    old_path: String,
    new_name: String,
    workspace: State<'_, WorkspaceState>,
    store: State<'_, StoreState>,
) -> Result<FileEntry, String> {
    let old = Path::new(&old_path);
    workspace.assert_allowed(old)?;

    let filters = FileFilters::from_store(&store)?;
    Filesystem::rename(old, &new_name, &filters)
}

#[tauri::command]
pub async fn save_file(
    path: String,
    content: String,
    workspace: State<'_, WorkspaceState>,
) -> Result<i64, String> {
    let target = Path::new(&path);
    workspace.assert_allowed(target)?;

    Filesystem::save_file(target, &content)
}

#[tauri::command]
pub async fn get_mtime(path: String) -> Result<i64, String> {
    Filesystem::get_mtime(Path::new(&path))
}
