use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Mutex;
use notify::RecommendedWatcher;

/**
 * 文件变更监听器状态
 */
pub struct WatcherState {
    pub watcher: Mutex<Option<RecommendedWatcher>>,
    pub watched_paths: Mutex<HashSet<PathBuf>>,
}
