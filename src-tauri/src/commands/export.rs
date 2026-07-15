use std::fs;
use std::path::Path;

use tauri::State;

use crate::state::SettingsState;

/**
 * 将文本内容写入指定路径
 *
 * 用于导出功能（HTML、纯文本等）。不要求目标路径位于已授权的工作区根目录下，
 * 因为导出文件通常由用户通过保存对话框选择位置。文件存在则覆盖。
 */
#[tauri::command]
pub async fn save_text_file(path: String, content: String) -> Result<(), String> {
    let target = Path::new(&path);

    if let Some(parent) = target.parent() {
        if !parent.as_os_str().is_empty() && !parent.is_dir() {
            return Err(format!("父目录不存在: {}", parent.display()));
        }
    }

    fs::write(target, content).map_err(|e| format!("保存文件失败: {}", e))?;
    Ok(())
}

/**
 * 触发浏览器打印对话框（用于 PDF 导出）
 *
 * 通过调用 window.print()，由用户在打印对话框中选择"另存为 PDF"。
 * 渲染端负责调用 window.print()，本命令保留以便将来扩展服务器端 PDF 渲染。
 */
#[tauri::command]
pub async fn export_pdf(_settings: State<'_, SettingsState>) -> Result<(), String> {
    // 当前实现由前端通过 window.print() 触发
    // 此命令保留供将来扩展（服务端 PDF 渲染、批处理等）
    Ok(())
}
