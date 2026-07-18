use tauri::{AppHandle, State};

use crate::workspace::WorkspaceState;

/**
 * 为 plugin-fs 动态授权路径，并记录 workspace 根
 *
 * 替代旧的 `grant_fs_scope` command，统一由 WorkspaceState 管理。
 */
#[tauri::command]
pub async fn grant_workspace(
    paths: Vec<String>,
    app: AppHandle,
    workspace: State<'_, WorkspaceState>,
) -> Result<(), String> {
    workspace.grant_many(&app, &paths)
}
