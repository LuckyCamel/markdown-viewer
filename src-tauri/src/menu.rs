use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{App, Emitter};

/** 菜单项 ID：与前端 `menuActions.ts` 保持一致 */
pub const OPEN_FOLDER: &str = "menu_open_folder";
pub const OPEN_FILE: &str = "menu_open_file";
pub const CLOSE_TAB: &str = "menu_close_tab";
pub const TOGGLE_SIDEBAR: &str = "menu_toggle_sidebar";
pub const TOGGLE_OUTLINE: &str = "menu_toggle_outline";
pub const FILE_SEARCH: &str = "menu_file_search";
pub const CONTENT_SEARCH: &str = "menu_content_search";
pub const SETTINGS: &str = "menu_settings";

/**
 * 构建应用原生菜单并注册点击事件（向前端 emit menu-action）
 */
pub fn setup_menu(app: &App) -> tauri::Result<()> {
    let open_folder = MenuItemBuilder::with_id(OPEN_FOLDER, "Open Folder...").build(app)?;
    let open_file = MenuItemBuilder::with_id(OPEN_FILE, "Open File...").build(app)?;
    let close_tab = MenuItemBuilder::with_id(CLOSE_TAB, "Close Tab").build(app)?;
    let settings = MenuItemBuilder::with_id(SETTINGS, "Settings...").build(app)?;
    let toggle_sidebar = MenuItemBuilder::with_id(TOGGLE_SIDEBAR, "Toggle Sidebar").build(app)?;
    let toggle_outline = MenuItemBuilder::with_id(TOGGLE_OUTLINE, "Toggle Outline").build(app)?;
    let file_search = MenuItemBuilder::with_id(FILE_SEARCH, "Find File...").build(app)?;
    let content_search = MenuItemBuilder::with_id(CONTENT_SEARCH, "Find in Files...").build(app)?;

    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&open_folder)
        .item(&open_file)
        .separator()
        .item(&close_tab)
        .separator()
        .item(&settings)
        .separator()
        .quit()
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .item(&toggle_sidebar)
        .item(&toggle_outline)
        .build()?;

    let search_menu = SubmenuBuilder::new(app, "Search")
        .item(&file_search)
        .item(&content_search)
        .build()?;

    let menu = MenuBuilder::new(app)
        .items(&[&file_menu, &view_menu, &search_menu])
        .build()?;

    app.set_menu(menu)?;

    app.on_menu_event(|app_handle, event| {
        let id = event.id().0.clone();
        let _ = app_handle.emit("menu-action", id);
    });

    Ok(())
}
