use std::path::Path;

/**
 * 批量检查文件/目录是否存在
 *
 * 接收一组路径，返回与路径一一对应的存在性布尔值。
 * 用于启动时校验最近文件/目录条目是否仍然有效。
 */
#[tauri::command]
pub async fn check_files_exist(paths: Vec<String>) -> Result<Vec<bool>, String> {
    Ok(paths.iter().map(|p| Path::new(p).exists()).collect())
}
