use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;

use tauri::State;

use crate::state::SettingsState;

/**
 * 列出目录下的文件和文件夹
 */
#[tauri::command]
pub async fn list_directory(
    dir_path: String,
    settings: State<'_, SettingsState>,
) -> Result<Vec<serde_json::Value>, String> {
    let path = Path::new(&dir_path);
    settings.ensure_under_allowed_root(path)?;

    let mut entries = Vec::new();

    for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_name = entry.file_name().to_string_lossy().to_string();

        if settings.is_ignored(&file_name) {
            continue;
        }

        let file_path = entry.path();
        let is_dir = file_path.is_dir();
        let is_markdown = !is_dir && settings.is_markdown_file(&file_path);
        let is_text_file = !is_dir && settings.is_text_file(&file_path);

        let metadata = entry.metadata().ok();
        let modified = metadata.as_ref().and_then(|m| m.modified().ok()).and_then(|t| {
            t.duration_since(UNIX_EPOCH).ok().map(|d| d.as_secs_f64() * 1000.0)
        });
        let size = if is_dir { None } else { metadata.as_ref().map(|m| m.len()) };

        let mut entry_json = serde_json::json!({
            "name": file_name,
            "path": file_path.to_string_lossy().to_string(),
            "isDirectory": is_dir,
            "isHidden": file_name.starts_with('.'),
            "isMarkdown": is_markdown,
            "isTextFile": is_text_file,
        });

        if let Some(m) = modified {
            entry_json["modified"] = serde_json::json!(m);
        }
        if let Some(s) = size {
            entry_json["size"] = serde_json::json!(s);
        }

        entries.push(entry_json);
    }

    entries.sort_by(|a, b| {
        let a_dir = a["isDirectory"].as_bool().unwrap_or(false);
        let b_dir = b["isDirectory"].as_bool().unwrap_or(false);
        if a_dir != b_dir {
            a_dir.cmp(&b_dir).reverse()
        } else {
            a["name"].as_str().unwrap_or("").cmp(b["name"].as_str().unwrap_or(""))
        }
    });

    Ok(entries)
}
