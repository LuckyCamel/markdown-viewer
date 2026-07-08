use tauri::State;

use crate::state::LaunchState;

/**
 * 返回启动时 CLI 传入的路径（文件或目录）
 */
#[tauri::command]
pub fn get_launch_paths(state: State<'_, LaunchState>) -> Vec<String> {
    state.paths.clone()
}
