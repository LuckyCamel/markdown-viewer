use std::path::Path;
use std::process::Command;

/**
 * 在系统文件管理器中显示指定文件或目录所在位置
 *
 * - Windows: 调用 `explorer.exe /select,<path>` 选中目标
 * - macOS:   调用 `open -R <path>` 在 Finder 中显示
 * - Linux:   调用 `xdg-open <parent_dir>` 打开父目录（无法精确选中）
 *
 * 路径不存在时返回错误，避免文件管理器弹出异常提示。
 */
#[tauri::command]
pub async fn reveal_path(path: String) -> Result<(), String> {
    let target = Path::new(&path);
    if !target.exists() {
        return Err(format!("path does not exist: {}", path));
    }

    #[cfg(target_os = "windows")]
    {
        // explorer.exe 需要反斜杠路径，且 /select, 与路径之间不能有空格
        let native_path = path.replace('/', "\\");
        Command::new("explorer.exe")
            .arg(format!("/select,{}", native_path))
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        // Linux: 打开父目录（目标为目录时直接打开自身）
        let dir_to_open = if target.is_dir() {
            target.to_path_buf()
        } else if let Some(parent) = target.parent() {
            parent.to_path_buf()
        } else {
            target.to_path_buf()
        };
        Command::new("xdg-open")
            .arg(dir_to_open)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
