use std::fs;
use std::path::{Path, PathBuf};

use crate::filters::FileFilters;

/**
 * 递归收集目录下所有文件路径（跳过忽略项）
 */
pub fn walk_dir(path: &Path, files: &mut Vec<PathBuf>, filters: &FileFilters) {
    if !path.is_dir() {
        return;
    }
    let Ok(entries) = fs::read_dir(path) else {
        return;
    };
    for entry in entries.flatten() {
        let entry_path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();

        if filters.is_ignored(&file_name) {
            continue;
        }

        if entry_path.is_dir() {
            walk_dir(&entry_path, files, filters);
        } else {
            files.push(entry_path);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use std::env;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use crate::commands::store::StoreState;

    static TEST_COUNTER: AtomicUsize = AtomicUsize::new(0);

    fn create_test_dir() -> PathBuf {
        let id = TEST_COUNTER.fetch_add(1, Ordering::Relaxed);
        let dir = env::temp_dir().join(format!("test_walk_dir_{}", id));
        fs::remove_dir_all(&dir).ok();
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("file1.md"), "content1").unwrap();
        fs::write(dir.join("file2.txt"), "content2").unwrap();
        fs::create_dir(dir.join("subdir")).unwrap();
        fs::write(dir.join("subdir").join("file3.md"), "content3").unwrap();
        let git_dir = dir.join(".git");
        fs::create_dir(&git_dir).unwrap();
        fs::write(git_dir.join("config"), "git config").unwrap();
        dir
    }

    fn create_filters() -> FileFilters {
        let store = StoreState::from_map_for_test(HashMap::new());
        FileFilters::from_store(&store).unwrap()
    }

    #[test]
    fn walks_directory_recursively() {
        let dir = create_test_dir();
        let mut files = Vec::new();
        walk_dir(&dir, &mut files, &create_filters());
        assert!(files.len() >= 3);
        let file_names: Vec<String> = files.iter().map(|p| {
            p.file_name().unwrap().to_string_lossy().to_string()
        }).collect();
        assert!(file_names.contains(&"file1.md".to_string()));
        assert!(file_names.contains(&"file2.txt".to_string()));
        assert!(file_names.contains(&"file3.md".to_string()));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn skips_ignored_directories() {
        let dir = create_test_dir();
        let mut files = Vec::new();
        walk_dir(&dir, &mut files, &create_filters());
        let file_names: Vec<String> = files.iter().map(|p| {
            p.to_string_lossy().to_string()
        }).collect();
        assert!(!file_names.iter().any(|n| n.contains(".git")));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn returns_empty_for_nonexistent_dir() {
        let dir = Path::new("/nonexistent/dir/path");
        let mut files = Vec::new();
        walk_dir(dir, &mut files, &create_filters());
        assert!(files.is_empty());
    }

    #[test]
    fn returns_empty_for_file_path() {
        let id = TEST_COUNTER.fetch_add(1, Ordering::Relaxed);
        let dir = env::temp_dir().join(format!("test_file_{}.txt", id));
        fs::write(&dir, "content").unwrap();
        let mut files = Vec::new();
        walk_dir(&dir, &mut files, &create_filters());
        assert!(files.is_empty());
        fs::remove_file(&dir).ok();
    }
}
