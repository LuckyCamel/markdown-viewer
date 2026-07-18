use std::path::{Path, PathBuf};

use regex::Regex;
use tauri::{Emitter, State, Window};

use crate::commands::store::StoreState;
use crate::filters::FileFilters;
use crate::search::{CancelledStore, SearchSession};
use crate::workspace::WorkspaceState;

#[tauri::command]
pub async fn search_content(
    dir_paths: Vec<String>,
    query: String,
    search_id: String,
    is_regex: bool,
    window: Window,
    workspace: State<'_, WorkspaceState>,
    store: State<'_, StoreState>,
    cancelled_store: State<'_, CancelledStore>,
) -> Result<(), String> {
    if is_regex {
        let _ = Regex::new(&query).map_err(|e| format!("正则编译失败: {}", e))?;
    }

    let filters = FileFilters::from_store(&store)?;
    let dir_paths: Vec<PathBuf> = dir_paths.iter().map(|p| Path::new(p).to_path_buf()).collect();

    for path in &dir_paths {
        workspace.assert_allowed(path)?;
    }

    let session = SearchSession::new(search_id, &cancelled_store);
    session.run(dir_paths, query, is_regex, filters, |progress| {
        window.emit("search-result", progress.clone()).unwrap_or(());
    });

    Ok(())
}

#[tauri::command]
pub async fn cancel_search(
    search_id: String,
    cancelled_store: State<'_, CancelledStore>,
) -> Result<(), String> {
    cancelled_store.cancel(&search_id);
    Ok(())
}
