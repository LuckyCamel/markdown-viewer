use tauri::{AppHandle, State};

use crate::scope;
use crate::state::SettingsState;

/**
 * 为 plugin-fs 动态授权路径，并记录 workspace 根
 */
#[tauri::command]
pub async fn grant_fs_scope(
    paths: Vec<String>,
    app: AppHandle,
    settings: State<'_, SettingsState>,
) -> Result<(), String> {
    scope::grant_fs_paths(&app, &settings, &paths)
}
