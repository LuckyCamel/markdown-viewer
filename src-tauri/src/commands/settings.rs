use tauri::State;

use crate::state::SettingsState;

/**
 * 更新设置（忽略列表和扩展名）
 */
#[tauri::command]
pub async fn update_settings(
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
