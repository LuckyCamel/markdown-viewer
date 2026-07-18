use serde::{Serialize, Deserialize};
use std::path::{Path, PathBuf};
use std::fs;
use crate::filters::FileFilters;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub is_hidden: bool,
    pub is_markdown: bool,
    pub is_text_file: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modified: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
}

impl FileEntry {
    pub fn from_path(path: &Path, filters: &FileFilters) -> Self {
        let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
        let is_hidden = name.starts_with('.');
        let is_dir = path.is_dir();
        let is_markdown = !is_dir && filters.is_markdown_file(path);
        let is_text_file = !is_dir && filters.is_text_file(path);

        let modified = fs::metadata(path)
            .ok()
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs_f64() * 1000.0);

        let size = if is_dir { None } else { fs::metadata(path).ok().map(|m| m.len()) };

        Self {
            name,
            path: path.to_string_lossy().to_string(),
            is_directory: is_dir,
            is_hidden,
            is_markdown,
            is_text_file,
            modified,
            size,
        }
    }
}

pub struct Filesystem;

impl Filesystem {
    const INVALID_CHARS: [char; 9] = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];

    fn validate_name(name: &str) -> Result<(), String> {
        if name.is_empty() || name.trim().is_empty() {
            return Err("名称不能为空".to_string());
        }
        if name.chars().any(|c| Self::INVALID_CHARS.contains(&c)) {
            return Err("名称包含非法字符".to_string());
        }
        Ok(())
    }

    pub fn list_directory(path: &Path, filters: &FileFilters) -> Result<Vec<FileEntry>, String> {
        if !path.is_dir() {
            return Err(format!("目录不存在: {}", path.display()));
        }

        let mut entries = Vec::new();
        for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let file_name = entry.file_name().to_string_lossy().to_string();

            if filters.is_ignored(&file_name) {
                continue;
            }

            let file_path = entry.path();
            entries.push(FileEntry::from_path(&file_path, filters));
        }

        entries.sort_by(|a, b| {
            let a_dir = a.is_directory;
            let b_dir = b.is_directory;
            if a_dir != b_dir {
                a_dir.cmp(&b_dir).reverse()
            } else {
                a.name.cmp(&b.name)
            }
        });

        Ok(entries)
    }

    pub fn create_file(parent: &Path, name: &str, filters: &FileFilters) -> Result<FileEntry, String> {
        Self::validate_name(name)?;

        if !parent.is_dir() {
            return Err(format!("目录不存在: {}", parent.display()));
        }

        let file_path: PathBuf = parent.join(name);
        if file_path.exists() {
            return Err(format!("文件已存在: {}", name));
        }

        fs::File::create(&file_path).map_err(|e| format!("创建文件失败: {}", e))?;
        Ok(FileEntry::from_path(&file_path, filters))
    }

    pub fn create_directory(parent: &Path, name: &str, filters: &FileFilters) -> Result<FileEntry, String> {
        Self::validate_name(name)?;

        if !parent.is_dir() {
            return Err(format!("目录不存在: {}", parent.display()));
        }

        let new_dir_path: PathBuf = parent.join(name);
        if new_dir_path.exists() {
            return Err(format!("文件夹已存在: {}", name));
        }

        fs::create_dir(&new_dir_path).map_err(|e| format!("创建文件夹失败: {}", e))?;
        Ok(FileEntry::from_path(&new_dir_path, filters))
    }

    pub fn rename(old_path: &Path, new_name: &str, filters: &FileFilters) -> Result<FileEntry, String> {
        Self::validate_name(new_name)?;

        if !old_path.exists() {
            return Err(format!("路径不存在: {}", old_path.display()));
        }

        let parent = old_path.parent().ok_or("无效的路径")?;
        let new_path = parent.join(new_name);

        if new_path.exists() {
            return Err(format!("已存在同名文件/文件夹: {}", new_name));
        }

        fs::rename(old_path, &new_path).map_err(|e| format!("重命名失败: {}", e))?;
        Ok(FileEntry::from_path(&new_path, filters))
    }

    pub fn save_file(path: &Path, content: &str) -> Result<i64, String> {
        fs::write(path, content).map_err(|e| format!("保存文件失败: {}", e))?;

        let mtime = fs::metadata(path)
            .ok()
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as i64)
            .ok_or("获取文件修改时间失败".to_string())?;

        Ok(mtime)
    }

    pub fn get_mtime(path: &Path) -> Result<i64, String> {
        if !path.exists() {
            return Ok(-1);
        }

        let mtime = fs::metadata(path)
            .ok()
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as i64)
            .ok_or("获取文件修改时间失败".to_string())?;

        Ok(mtime)
    }

    pub fn move_to_trash(path: &Path) -> Result<(), String> {
        if !path.exists() {
            return Err(format!("路径不存在: {}", path.display()));
        }

        trash::delete(path).map_err(|e| format!("移至回收站失败: {}", e))?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use crate::commands::store::StoreState;
    use std::collections::HashMap;

    fn create_test_filters() -> FileFilters {
        let store = StoreState::from_map_for_test(HashMap::new());
        FileFilters::from_store(&store).unwrap()
    }

    fn create_test_dir() -> PathBuf {
        static TEST_COUNTER: AtomicUsize = AtomicUsize::new(0);
        let id = TEST_COUNTER.fetch_add(1, Ordering::Relaxed);
        let dir = env::temp_dir().join(format!("test_filesystem_{}", id));
        fs::remove_dir_all(&dir).ok();
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn list_directory_returns_entries() {
        let dir = create_test_dir();
        fs::write(dir.join("file.md"), "content").unwrap();
        fs::create_dir(dir.join("subdir")).unwrap();

        let filters = create_test_filters();
        let entries = Filesystem::list_directory(&dir, &filters).unwrap();

        assert!(entries.len() >= 2);

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn list_directory_respects_ignore_list() {
        let dir = create_test_dir();
        fs::write(dir.join("file.md"), "content").unwrap();
        let git_dir = dir.join(".git");
        fs::create_dir(&git_dir).unwrap();
        fs::write(git_dir.join("config"), "git config").unwrap();

        let filters = create_test_filters();
        let entries = Filesystem::list_directory(&dir, &filters).unwrap();

        assert!(!entries.iter().any(|e| e.name == ".git"));

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn create_file_validates_name() {
        let dir = create_test_dir();
        let filters = create_test_filters();

        let result = Filesystem::create_file(&dir, "file/name.md", &filters);
        assert!(result.is_err());

        let result = Filesystem::create_file(&dir, "", &filters);
        assert!(result.is_err());

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn create_file_returns_entry() {
        let dir = create_test_dir();
        let filters = create_test_filters();

        let entry = Filesystem::create_file(&dir, "test.md", &filters).unwrap();

        assert_eq!(entry.name, "test.md");
        assert!(!entry.is_directory);
        assert!(entry.is_markdown);

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn create_directory_returns_entry() {
        let dir = create_test_dir();
        let filters = create_test_filters();

        let entry = Filesystem::create_directory(&dir, "subdir", &filters).unwrap();

        assert_eq!(entry.name, "subdir");
        assert!(entry.is_directory);

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn rename_entry_updates_path() {
        let dir = create_test_dir();
        let old_path = dir.join("old.md");
        fs::write(&old_path, "content").unwrap();
        let filters = create_test_filters();

        let entry = Filesystem::rename(&old_path, "new.md", &filters).unwrap();

        assert_eq!(entry.name, "new.md");
        assert!(entry.path.ends_with("new.md"));
        assert!(!old_path.exists());
        assert!(dir.join("new.md").exists());

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn save_file_writes_content() {
        let dir = create_test_dir();
        let file_path = dir.join("test.md");

        let mtime = Filesystem::save_file(&file_path, "hello world").unwrap();

        assert!(mtime > 0);
        let content = fs::read_to_string(&file_path).unwrap();
        assert_eq!(content, "hello world");

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn get_mtime_returns_timestamp() {
        let dir = create_test_dir();
        let file_path = dir.join("test.md");
        fs::write(&file_path, "content").unwrap();

        let mtime = Filesystem::get_mtime(&file_path).unwrap();

        assert!(mtime > 0);

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn get_mtime_returns_minus_one_for_nonexistent() {
        let result = Filesystem::get_mtime(Path::new("/nonexistent/file.txt"));

        assert_eq!(result.unwrap(), -1);
    }

    #[test]
    fn move_to_trash_deletes_file() {
        let dir = create_test_dir();
        let file_path = dir.join("test.md");
        fs::write(&file_path, "content").unwrap();

        Filesystem::move_to_trash(&file_path).unwrap();

        assert!(!file_path.exists());

        fs::remove_dir_all(&dir).ok();
    }
}
