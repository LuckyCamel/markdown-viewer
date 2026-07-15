use std::path::Path;

use tauri::State;

use crate::state::SettingsState;

/**
 * 将文件/文件夹移至回收站
 */
#[tauri::command]
pub async fn move_to_trash(
    path: String,
    settings: State<'_, SettingsState>,
) -> Result<(), String> {
    let target = Path::new(&path);
    settings.ensure_under_allowed_root(target)?;

    if !target.exists() {
        return Err(format!("路径不存在: {}", path));
    }

    trash::delete(target).map_err(|e| format!("移至回收站失败: {}", e))?;

    Ok(())
}
