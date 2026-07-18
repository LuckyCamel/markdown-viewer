use std::path::PathBuf;

use crate::search::{walk_dir, MAX_MATCHES, SEARCH_EMIT_INTERVAL};
use crate::search::cancelled_store::CancelledStore;
use crate::search::matcher::{find_matches_in_file, find_matches_in_file_regex};
use crate::search::types::SearchProgress;
use crate::filters::FileFilters;

pub struct SearchSession<'a> {
    search_id: String,
    cancelled_store: &'a CancelledStore,
}

impl<'a> SearchSession<'a> {
    pub fn new(search_id: String, cancelled_store: &'a CancelledStore) -> Self {
        Self {
            search_id,
            cancelled_store,
        }
    }

    pub fn run<F>(self, dir_paths: Vec<PathBuf>, query: String, is_regex: bool, filters: FileFilters, mut emit: F)
        where F: FnMut(&SearchProgress)
    {
        let mut all_files = Vec::new();
        for dir_path in &dir_paths {
            walk_dir(dir_path, &mut all_files, &filters);
        }

        let filtered_files: Vec<_> = all_files
            .into_iter()
            .filter(|p| filters.is_text_file(p))
            .collect();

        let total_files = filtered_files.len();
        let query_lower = query.to_lowercase();
        let mut all_matches = Vec::new();
        let mut last_emit_len = 0;
        let mut truncated = false;

        if total_files == 0 {
            emit(&SearchProgress {
                search_id: self.search_id.clone(),
                total_files: 0,
                searched_files: 0,
                matches: Vec::new(),
                new_matches: None,
                is_complete: true,
                cancelled: false,
                truncated: None,
                match_limit: None,
            });
            return;
        }

        for (i, file_path) in filtered_files.iter().enumerate() {
            if self.cancelled_store.is_cancelled(&self.search_id) {
                emit(&SearchProgress {
                    search_id: self.search_id.clone(),
                    total_files,
                    searched_files: i,
                    matches: all_matches.clone(),
                    new_matches: None,
                    is_complete: true,
                    cancelled: true,
                    truncated: None,
                    match_limit: None,
                });
                self.cancelled_store.remove(&self.search_id);
                return;
            }

            if !truncated {
                let file_matches = if is_regex {
                    find_matches_in_file_regex(file_path, &query)
                } else {
                    find_matches_in_file(file_path, &query, &query_lower)
                };
                for m in file_matches {
                    if all_matches.len() >= MAX_MATCHES {
                        truncated = true;
                        break;
                    }
                    all_matches.push(m);
                }
            }

            let searched = i + 1;
            let is_complete = searched == total_files;
            if is_complete || searched % SEARCH_EMIT_INTERVAL == 0 {
                let new_matches = if last_emit_len < all_matches.len() {
                    Some(all_matches[last_emit_len..].to_vec())
                } else {
                    None
                };
                last_emit_len = all_matches.len();
                emit(&SearchProgress {
                    search_id: self.search_id.clone(),
                    total_files,
                    searched_files: searched,
                    matches: all_matches.clone(),
                    new_matches,
                    is_complete,
                    cancelled: false,
                    truncated: if truncated { Some(true) } else { None },
                    match_limit: if truncated { Some(MAX_MATCHES) } else { None },
                });
            }
        }

        self.cancelled_store.remove(&self.search_id);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::fs;
    use crate::commands::store::StoreState;
    use std::collections::HashMap;

    fn create_test_filters() -> FileFilters {
        let store = StoreState::from_map_for_test(HashMap::new());
        FileFilters::from_store(&store).unwrap()
    }

    fn create_test_dir(files: &[(&str, &str)]) -> PathBuf {
        static TEST_COUNTER: AtomicUsize = AtomicUsize::new(0);
        let id = TEST_COUNTER.fetch_add(1, Ordering::Relaxed);
        let dir = env::temp_dir().join(format!("test_search_session_{}", id));
        fs::remove_dir_all(&dir).ok();
        fs::create_dir_all(&dir).unwrap();
        for (name, content) in files {
            fs::write(dir.join(name), content).unwrap();
        }
        dir
    }

    #[test]
    fn search_session_finds_matches() {
        let dir = create_test_dir(&[("file1.md", "hello world"), ("file2.md", "hello rust")]);
        let filters = create_test_filters();
        let cancelled_store = CancelledStore::new();
        let mut emitted_progress = Vec::new();

        let session = SearchSession::new("test".to_string(), &cancelled_store);
        session.run(
            vec![dir.clone()],
            "hello".to_string(),
            false,
            filters,
            |p| emitted_progress.push(p.clone()),
        );

        assert!(!emitted_progress.is_empty());
        let last = emitted_progress.last().unwrap();
        assert!(last.is_complete);
        assert!(last.matches.len() >= 2);

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn search_session_cancels() {
        let content = "hello ".repeat(1000);
        let dir = create_test_dir(&[("file1.md", &content)]);
        let filters = create_test_filters();
        let cancelled_store = CancelledStore::new();
        let mut emitted_progress = Vec::new();

        let session = SearchSession::new("test".to_string(), &cancelled_store);
        cancelled_store.cancel("test");

        session.run(
            vec![dir.clone()],
            "hello".to_string(),
            false,
            filters,
            |p| emitted_progress.push(p.clone()),
        );

        assert!(!emitted_progress.is_empty());
        let last = emitted_progress.last().unwrap();
        assert!(last.cancelled);

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn search_session_returns_empty_for_no_files() {
        let dir = create_test_dir(&[]);
        let filters = create_test_filters();
        let cancelled_store = CancelledStore::new();
        let mut emitted_progress = Vec::new();

        let session = SearchSession::new("test".to_string(), &cancelled_store);
        session.run(
            vec![dir.clone()],
            "hello".to_string(),
            false,
            filters,
            |p| emitted_progress.push(p.clone()),
        );

        assert!(!emitted_progress.is_empty());
        let last = emitted_progress.last().unwrap();
        assert!(last.is_complete);
        assert!(last.matches.is_empty());

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn search_session_emits_progress_at_interval() {
        let dir = create_test_dir(&[
            ("file0.md", "hello"),
            ("file1.md", "hello"),
            ("file2.md", "hello"),
            ("file3.md", "hello"),
            ("file4.md", "hello"),
            ("file5.md", "hello"),
            ("file6.md", "hello"),
            ("file7.md", "hello"),
            ("file8.md", "hello"),
            ("file9.md", "hello"),
        ]);
        let filters = create_test_filters();
        let cancelled_store = CancelledStore::new();
        let mut emitted_progress = Vec::new();

        let session = SearchSession::new("test".to_string(), &cancelled_store);
        session.run(
            vec![dir.clone()],
            "hello".to_string(),
            false,
            filters,
            |p| emitted_progress.push(p.clone()),
        );

        assert!(emitted_progress.len() >= 2);

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn search_session_runs_with_regex() {
        let dir = create_test_dir(&[("file1.md", "hello 123 world"), ("file2.md", "hello 456")]);
        let filters = create_test_filters();
        let cancelled_store = CancelledStore::new();
        let mut emitted_progress = Vec::new();

        let session = SearchSession::new("test".to_string(), &cancelled_store);
        session.run(
            vec![dir.clone()],
            r"\d+".to_string(),
            true,
            filters,
            |p| emitted_progress.push(p.clone()),
        );

        assert!(!emitted_progress.is_empty());
        let last = emitted_progress.last().unwrap();
        assert!(last.matches.len() >= 2);

        fs::remove_dir_all(&dir).ok();
    }
}
