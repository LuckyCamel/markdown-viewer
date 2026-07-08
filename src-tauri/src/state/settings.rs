use std::path::Path;
use std::path::PathBuf;
use std::sync::Mutex;

pub const DEFAULT_IGNORE_LIST: &[&str] = &[".git", "node_modules", "__pycache__", ".DS_Store"];
pub const DEFAULT_MARKDOWN_EXTENSIONS: &[&str] = &["md", "markdown"];

/**
 * 忽略列表、扩展名与已授权 workspace 根路径
 */
pub struct SettingsState {
    pub ignore_list: Mutex<Vec<String>>,
    pub markdown_extensions: Mutex<Vec<String>>,
    pub allowed_roots: Mutex<Vec<PathBuf>>,
}

impl SettingsState {
    /**
     * 创建带默认忽略列表与扩展名的设置状态
     */
    pub fn default() -> Self {
        Self {
            ignore_list: Mutex::new(
                DEFAULT_IGNORE_LIST
                    .iter()
                    .map(|s| s.to_string())
                    .collect(),
            ),
            markdown_extensions: Mutex::new(
                DEFAULT_MARKDOWN_EXTENSIONS
                    .iter()
                    .map(|s| s.to_string())
                    .collect(),
            ),
            allowed_roots: Mutex::new(Vec::new()),
        }
    }

    /**
     * 判断文件名是否在忽略列表中
     */
    pub fn is_ignored(&self, name: &str) -> bool {
        let list = self.ignore_list.lock().unwrap();
        list.iter().any(|item| item == name)
    }

    /**
     * 判断路径是否为 Markdown 文件（含无扩展名规则）
     */
    pub fn is_markdown_file(&self, path: &Path) -> bool {
        let exts = self.markdown_extensions.lock().unwrap();
        match path.extension() {
            Some(ext) => {
                let ext_str = ext.to_string_lossy().to_string();
                exts.iter().any(|e| !e.is_empty() && e == &ext_str)
            }
            None => exts.iter().any(|e| e.is_empty()),
        }
    }

    /**
     * 判断路径是否参与全文搜索
     */
    pub fn is_text_file(&self, path: &Path) -> bool {
        if self.is_markdown_file(path) {
            return true;
        }
        if let Some(ext) = path.extension() {
            let ext_str = ext.to_string_lossy().to_string();
            let text_extensions =
                ["txt", "json", "yaml", "yml", "toml", "rs", "ts", "js", "html", "css"];
            text_extensions.contains(&ext_str.as_str())
        } else {
            false
        }
    }

    /**
     * 记录 workspace 根路径（去重）
     */
    pub fn add_allowed_root(&self, path: PathBuf) {
        let mut roots = self.allowed_roots.lock().unwrap();
        if !roots.iter().any(|existing| existing == &path) {
            roots.push(path);
        }
    }

    /**
     * 校验路径是否在已授权 workspace 根之下
     */
    pub fn ensure_under_allowed_root(&self, path: &Path) -> Result<(), String> {
        let roots = self.allowed_roots.lock().unwrap();
        if roots.is_empty() {
            return Ok(());
        }

        let canonical = std::fs::canonicalize(path).map_err(|e| e.to_string())?;
        for root in roots.iter() {
            let root_canonical = std::fs::canonicalize(root).map_err(|e| e.to_string())?;
            if canonical.starts_with(&root_canonical) {
                return Ok(());
            }
        }
        Err(format!(
            "path not allowed: {}",
            canonical.to_string_lossy()
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn settings_with(exts: Vec<&str>) -> SettingsState {
        SettingsState {
            ignore_list: Mutex::new(vec![]),
            markdown_extensions: Mutex::new(exts.into_iter().map(String::from).collect()),
            allowed_roots: Mutex::new(vec![]),
        }
    }

    #[test]
    fn markdown_file_matches_extensionless_when_configured() {
        let settings = settings_with(vec!["md", ""]);
        assert!(settings.is_markdown_file(Path::new("README")));
        assert!(settings.is_markdown_file(Path::new("guide.md")));
        assert!(!settings.is_markdown_file(Path::new("image.png")));
    }
}
