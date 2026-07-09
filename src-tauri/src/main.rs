// Release 构建使用 Windows GUI 子系统，避免启动时弹出控制台窗口
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/**
 * 应用进程入口：解析 CLI 后启动 Tauri 或退出
 */
fn main() {
    match markdown_viewer_lib::cli::prepare_launch() {
        markdown_viewer_lib::cli::LaunchPrep::Exit => {}
        markdown_viewer_lib::cli::LaunchPrep::Run(paths) => markdown_viewer_lib::run(paths),
    }
}
