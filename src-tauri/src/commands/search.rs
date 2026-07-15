use std::path::Path;

use tauri::{Emitter, State, Window};

use crate::search::matcher::find_matches_in_file;
use crate::search::types::SearchProgress;
use crate::search::{walk_dir, MAX_MATCHES, SEARCH_EMIT_INTERVAL};
use crate::state::{SearchState, SettingsState};

/**
 * 在目录中搜索内容（增量 emit + 结果上限）
 *
 * is_regex=true 时需要 regex crate 支持；当前构建未启用该依赖，
 * 直接返回错误提示，前端可在 mock 环境下模拟正则搜索。
 */
#[tauri::command]
pub async fn search_content(
    dir_paths: Vec<String>,
    query: String,
    search_id: String,
    is_regex: bool,
    window: Window,
    settings: State<'_, SettingsState>,
    search_state: State<'_, SearchState>,
) -> Result<(), String> {
    if is_regex {
        return Err("正则搜索未启用：缺少 regex 依赖".to_string());
    }

    {
        let mut cancelled = search_state.cancelled_ids.lock().unwrap();
        cancelled.remove(&search_id);
    }

    let mut all_files = Vec::new();
    for dir_path in &dir_paths {
        let path = Path::new(dir_path);
        settings.ensure_under_allowed_root(path)?;
        walk_dir(path, &mut all_files, &settings);
    }

    let filtered_files: Vec<_> = all_files
        .into_iter()
        .filter(|p| settings.is_text_file(p))
        .collect();

    let total_files = filtered_files.len();
    let query_lower = query.to_lowercase();
    let mut all_matches = Vec::new();
    let mut last_emit_len = 0;
    let mut truncated = false;

    let emit_progress = |window: &Window,
                         search_id: &str,
                         total_files: usize,
                         searched_files: usize,
                         all_matches: &Vec<_>,
                         last_emit_len: &mut usize,
                         is_complete: bool,
                         cancelled: bool,
                         truncated: bool| {
        let new_matches = all_matches[*last_emit_len..].to_vec();
        let progress = SearchProgress {
            search_id: search_id.to_string(),
            total_files,
            searched_files,
            matches: all_matches.clone(),
            new_matches: if new_matches.is_empty() {
                None
            } else {
                Some(new_matches)
            },
            is_complete,
            cancelled,
            truncated: if truncated { Some(true) } else { None },
            match_limit: if truncated {
                Some(MAX_MATCHES)
            } else {
                None
            },
        };
        *last_emit_len = all_matches.len();
        window.emit("search-result", progress).unwrap_or(());
    };

    if total_files == 0 {
        emit_progress(
            &window,
            &search_id,
            0,
            0,
            &all_matches,
            &mut last_emit_len,
            true,
            false,
            false,
        );
        return Ok(());
    }

    for (i, file_path) in filtered_files.iter().enumerate() {
        if search_state.cancelled_ids.lock().unwrap().contains(&search_id) {
            emit_progress(
                &window,
                &search_id,
                total_files,
                i,
                &all_matches,
                &mut last_emit_len,
                true,
                true,
                truncated,
            );
            search_state.cancelled_ids.lock().unwrap().remove(&search_id);
            return Ok(());
        }

        if !truncated {
            for m in find_matches_in_file(file_path, &query, &query_lower) {
                if all_matches.len() >= MAX_MATCHES {
                    truncated = true;
                    break;
                }
                all_matches.push(m);
            }
        }

        let searched = i + 1;
        let is_complete = searched == total_files;
        if is_complete || searched % SEARCH_EMIT_INTERVAL == 0 {
            emit_progress(
                &window,
                &search_id,
                total_files,
                searched,
                &all_matches,
                &mut last_emit_len,
                is_complete,
                false,
                truncated,
            );
        }
    }

    search_state.cancelled_ids.lock().unwrap().remove(&search_id);
    Ok(())
}

/**
 * 取消进行中的内容搜索
 */
#[tauri::command]
pub async fn cancel_search(
    search_id: String,
    search_state: State<'_, SearchState>,
) -> Result<(), String> {
    search_state.cancelled_ids.lock().unwrap().insert(search_id);
    Ok(())
}
