use std::path::Path;

use tauri::State;

use crate::commands::store::StoreState;
use crate::filesystem::{FileEntry, Filesystem};
use crate::filters::FileFilters;
use crate::workspace::WorkspaceState;

#[tauri::command]
pub async fn list_directory(
    dir_path: String,
    workspace: State<'_, WorkspaceState>,
    store: State<'_, StoreState>,
) -> Result<Vec<FileEntry>, String> {
    let path = Path::new(&dir_path);
    workspace.assert_allowed(path)?;

    let filters = FileFilters::from_store(&store)?;
    Filesystem::list_directory(path, &filters)
}
