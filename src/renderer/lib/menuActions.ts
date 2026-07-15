/** 原生菜单项 ID，与 Rust `menu.rs` 常量一致 */
export const MENU_OPEN_FOLDER = 'menu_open_folder'
export const MENU_ADD_FOLDER_TO_WORKSPACE = 'menu_add_folder_to_workspace'
export const MENU_OPEN_FILE = 'menu_open_file'
export const MENU_CLOSE_TAB = 'menu_close_tab'
export const MENU_TOGGLE_SIDEBAR = 'menu_toggle_sidebar'
export const MENU_TOGGLE_OUTLINE = 'menu_toggle_outline'
export const MENU_FILE_SEARCH = 'menu_file_search'
export const MENU_CONTENT_SEARCH = 'menu_content_search'
export const MENU_SETTINGS = 'menu_settings'
export const MENU_ABOUT = 'menu_about'
export const MENU_TOGGLE_VIEW_MODE = 'menu_toggle_view_mode'
export const MENU_EXPORT_PDF = 'menu_export_pdf'
export const MENU_EXPORT_HTML = 'menu_export_html'
export const MENU_OPEN_TODAYS_NOTE = 'menu_open_todays_note'

export type MenuActionId =
  | typeof MENU_OPEN_FOLDER
  | typeof MENU_ADD_FOLDER_TO_WORKSPACE
  | typeof MENU_OPEN_FILE
  | typeof MENU_CLOSE_TAB
  | typeof MENU_TOGGLE_SIDEBAR
  | typeof MENU_TOGGLE_OUTLINE
  | typeof MENU_FILE_SEARCH
  | typeof MENU_CONTENT_SEARCH
  | typeof MENU_SETTINGS
  | typeof MENU_ABOUT
  | typeof MENU_TOGGLE_VIEW_MODE
  | typeof MENU_EXPORT_PDF
  | typeof MENU_EXPORT_HTML
  | typeof MENU_OPEN_TODAYS_NOTE
