use std::path::Path;

use tauri::State;

use crate::filesystem::Filesystem;
use crate::workspace::WorkspaceState;

#[tauri::command]
pub async fn move_to_trash(
    path: String,
    workspace: State<'_, WorkspaceState>,
) -> Result<(), String> {
    let target = Path::new(&path);
    workspace.assert_allowed(target)?;

    Filesystem::move_to_trash(target)
}
