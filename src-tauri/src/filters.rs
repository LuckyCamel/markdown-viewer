use std::path::Path;

use crate::commands::store::StoreState;

/**
 * 默认忽略列表（KV 中无 ignoreList 时使用）
 */
const DEFAULT_IGNORE_LIST: &[&str] = &[".git", "node_modules", "__pycache__", ".DS_Store"];

/**
 * 默认 Markdown 扩展名（KV 中无 markdownExtensions 时使用）
 */
const DEFAULT_MARKDOWN_EXTENSIONS: &[&str] = &["md", "markdown"];

/**
 * 默认文本扩展名（KV 中无 textExtensions 时使用）
 */
const DEFAULT_TEXT_EXTENSIONS: &[&str] = &[
    // 前端/脚本
    "js", "jsx", "mjs", "cjs", "ts", "tsx",
    // Python
    "py", "pyw", "pyi",
    // Shell
    "sh", "bash", "zsh",
    // 数据/配置
    "json", "jsonc", "yaml", "yml", "toml", "ini", "cfg",
    // Web
    "html", "htm", "xml", "svg", "css", "scss", "less",
    // SQL
    "sql",
    // 系统语言
    "go", "rs", "rust", "java",
    "c", "h", "cpp", "cc", "cxx", "hpp", "hh",
    "cs", "csx", "php", "phtml",
    "rb", "ruby", "swift", "kt", "kts", "dart",
    // 其他
    "lua", "pl", "pm", "r", "scala", "hs", "lhs",
    "txt", "md", "markdown", "mkd",
];

/**
 * 文件过滤器：从 StoreState 读取 ignore_list / markdown_extensions / text_extensions
 *
 * 每次 command 调用时构造，不缓存（StoreState 内部已有内存缓存）。
 * 替代原 `SettingsState` 的文件类型判断职责。
 */
pub struct FileFilters {
    ignore_list: Vec<String>,
    markdown_extensions: Vec<String>,
    text_extensions: Vec<String>,
}

impl FileFilters {
    /**
     * 从 StoreState 读取 ignore_list、markdown_extensions 和 text_extensions
     *
     * KV 中无对应键时，使用对应的默认值。
     */
    pub fn from_store(store: &StoreState) -> Result<Self, String> {
        let ignore_list = store
            .get::<Vec<String>>("ignoreList")?
            .unwrap_or_else(|| DEFAULT_IGNORE_LIST.iter().map(|s| s.to_string()).collect());
        let markdown_extensions = store
            .get::<Vec<String>>("markdownExtensions")?
            .unwrap_or_else(|| {
                DEFAULT_MARKDOWN_EXTENSIONS
                    .iter()
                    .map(|s| s.to_string())
                    .collect()
            });
        let text_extensions = store
            .get::<Vec<String>>("textExtensions")?
            .unwrap_or_else(|| DEFAULT_TEXT_EXTENSIONS.iter().map(|s| s.to_string()).collect());
        Ok(Self {
            ignore_list,
            markdown_extensions,
            text_extensions,
        })
    }

    /**
     * 判断文件名是否在忽略列表中
     */
    pub fn is_ignored(&self, name: &str) -> bool {
        self.ignore_list.iter().any(|item| item == name)
    }

    /**
     * 判断路径是否为 Markdown 文件（含无扩展名规则）
     */
    pub fn is_markdown_file(&self, path: &Path) -> bool {
        match path.extension() {
            Some(ext) => {
                let ext_str = ext.to_string_lossy().to_string();
                self.markdown_extensions
                    .iter()
                    .any(|e| !e.is_empty() && e == &ext_str)
            }
            None => self.markdown_extensions.iter().any(|e| e.is_empty()),
        }
    }

    /**
     * 判断路径是否为文本文件（参与全文搜索）
     */
    pub fn is_text_file(&self, path: &Path) -> bool {
        if self.is_markdown_file(path) {
            return true;
        }
        if let Some(ext) = path.extension() {
            let ext_str = ext.to_string_lossy().to_string().to_lowercase();
            self.text_extensions.iter().any(|e| e == &ext_str)
        } else {
            // 无扩展名的常见文本文件
            if let Some(name) = path.file_name() {
                let name_str = name.to_string_lossy().to_string();
                matches!(
                    name_str.as_str(),
                    "Makefile" | "makefile" | "Dockerfile" | ".dockerignore" | ".gitignore" | ".env" | "LICENSE" | "README"
                )
            } else {
                false
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn from_store_uses_defaults_when_missing() {
        let store = StoreState::from_map_for_test(HashMap::new());
        let filters = FileFilters::from_store(&store).unwrap();

        assert!(filters.is_ignored(".git"));
        assert!(filters.is_ignored("node_modules"));
        assert!(filters.is_markdown_file(Path::new("guide.md")));
        assert!(!filters.is_markdown_file(Path::new("image.png")));
    }

    #[test]
    fn from_store_reads_custom_ignore_list() {
        let mut data = HashMap::new();
        data.insert(
            "ignoreList".to_string(),
            serde_json::json!(["custom_ignored"]),
        );
        let store = StoreState::from_map_for_test(data);
        let filters = FileFilters::from_store(&store).unwrap();

        assert!(filters.is_ignored("custom_ignored"));
        assert!(!filters.is_ignored(".git"));
    }

    #[test]
    fn from_store_reads_custom_markdown_extensions() {
        let mut data = HashMap::new();
        data.insert(
            "markdownExtensions".to_string(),
            serde_json::json!(["md", ""]),
        );
        let store = StoreState::from_map_for_test(data);
        let filters = FileFilters::from_store(&store).unwrap();

        assert!(filters.is_markdown_file(Path::new("README")));
        assert!(filters.is_markdown_file(Path::new("guide.md")));
        assert!(!filters.is_markdown_file(Path::new("image.png")));
    }

    #[test]
    fn is_ignored_returns_false_for_non_matching() {
        let store = StoreState::from_map_for_test(HashMap::new());
        let filters = FileFilters::from_store(&store).unwrap();

        assert!(!filters.is_ignored("README.md"));
        assert!(!filters.is_ignored("src"));
        assert!(!filters.is_ignored(".vscode"));
    }

    #[test]
    fn is_text_file_matches_common_extensions() {
        let store = StoreState::from_map_for_test(HashMap::new());
        let filters = FileFilters::from_store(&store).unwrap();

        assert!(filters.is_text_file(Path::new("main.rs")));
        assert!(filters.is_text_file(Path::new("app.tsx")));
        assert!(filters.is_text_file(Path::new("config.json")));
        assert!(filters.is_text_file(Path::new("Dockerfile")));
        assert!(filters.is_text_file(Path::new("Makefile")));
        assert!(!filters.is_text_file(Path::new("image.png")));
        assert!(!filters.is_text_file(Path::new("archive.zip")));
    }

    #[test]
    fn from_store_reads_custom_text_extensions() {
        let mut data = HashMap::new();
        data.insert(
            "textExtensions".to_string(),
            serde_json::json!(["md", "custom_ext"]),
        );
        let store = StoreState::from_map_for_test(data);
        let filters = FileFilters::from_store(&store).unwrap();

        assert!(filters.is_text_file(Path::new("guide.md")));
        assert!(filters.is_text_file(Path::new("file.custom_ext")));
        // 默认扩展名不再被识别
        assert!(!filters.is_text_file(Path::new("main.rs")));
        assert!(!filters.is_text_file(Path::new("app.ts")));
    }
}
