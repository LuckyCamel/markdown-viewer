pub mod cli;
mod commands;
mod menu;
mod scope;
mod search;
mod state;

use std::collections::HashSet;
use std::sync::Mutex;

use commands::store::init_store;
use state::{LaunchState, SearchState, SettingsState, WatcherState};
use tauri::Manager;

/**
 * Tauri 应用入口：注册插件与 command
 */
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(launch_paths: Vec<String>) {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            menu::setup_menu(app)?;
            let store = init_store(&app.handle())?;
            app.manage(store);
            Ok(())
        })
        .manage(WatcherState {
            watcher: Mutex::new(None),
            watched_paths: Mutex::new(HashSet::new()),
        })
        .manage(SettingsState::default())
        .manage(SearchState {
            cancelled_ids: Mutex::new(HashSet::new()),
        })
        .manage(LaunchState {
            paths: launch_paths,
        })
        .invoke_handler(tauri::generate_handler![
            commands::directory::list_directory,
            commands::files::check_files_exist,
            commands::files::create_file,
            commands::files::create_directory,
            commands::files::rename_entry,
            commands::files::save_file,
            commands::files::get_mtime,
            commands::trash::move_to_trash,
            commands::search::search_content,
            commands::search::cancel_search,
            commands::watcher::watch_file,
            commands::watcher::unwatch_file,
            commands::settings::update_settings,
            commands::launch::get_launch_paths,
            commands::scope::grant_fs_scope,
            commands::reveal::reveal_path,
            commands::store::get_setting,
            commands::store::set_setting,
            commands::store::migrate_settings,
            commands::export::save_text_file,
            commands::export::export_pdf,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
