use std::path::{Path, PathBuf};
use std::sync::Mutex;

use tauri::AppHandle;
use tauri_plugin_fs::FsExt;

pub mod commands;

/**
 * Workspace 授权根状态
 *
 * 管理 plugin-fs scope 与自定义 allowed_roots 列表，二者保持同步：
 * - `grant` 同时调用 `app.fs_scope().allow_directory/allow_file` 与 `add_root`
 * - `assert_allowed` 为所有写操作 command 提供门禁
 * - 空 roots 时全部放行（启动早期阶段兼容）
 */
pub struct WorkspaceState {
    allowed_roots: Mutex<Vec<PathBuf>>,
}

impl WorkspaceState {
    /**
     * 创建空的 Workspace 状态
     */
    pub fn new() -> Self {
        Self {
            allowed_roots: Mutex::new(Vec::new()),
        }
    }

    /**
     * 授权单个路径
     *
     * - 目录：递归授权（allow_directory recursive=true），并记录为根
     * - 文件：授权文件本身，同时授权父目录并记录父目录为根
     */
    pub fn grant(&self, app: &AppHandle, path: &Path) -> Result<(), String> {
        if path.is_dir() {
            let canonical = std::fs::canonicalize(path).map_err(|e| e.to_string())?;
            app.fs_scope()
                .allow_directory(&canonical, true)
                .map_err(|e| e.to_string())?;
            self.add_root(canonical);
        } else if path.is_file() {
            let canonical = std::fs::canonicalize(path).map_err(|e| e.to_string())?;
            app.fs_scope()
                .allow_file(&canonical)
                .map_err(|e| e.to_string())?;
            if let Some(parent) = path.parent() {
                let parent_canonical = std::fs::canonicalize(parent).map_err(|e| e.to_string())?;
                app.fs_scope()
                    .allow_directory(&parent_canonical, true)
                    .map_err(|e| e.to_string())?;
                self.add_root(parent_canonical);
            }
        }
        Ok(())
    }

    /**
     * 批量授权多个路径
     */
    pub fn grant_many(&self, app: &AppHandle, paths: &[String]) -> Result<(), String> {
        for path_str in paths {
            self.grant(app, Path::new(path_str))?;
        }
        Ok(())
    }

    /**
     * 校验路径是否在已授权根下
     *
     * 空 roots 时放行（启动早期阶段兼容）；非空时按 canonical 路径前缀匹配。
     */
    pub fn assert_allowed(&self, path: &Path) -> Result<(), String> {
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

    /**
     * 获取已授权根列表（用于调试与测试）
     */
    #[cfg_attr(not(test), allow(dead_code))]
    pub fn roots(&self) -> Vec<PathBuf> {
        self.allowed_roots.lock().unwrap().clone()
    }

    /**
     * 内部方法：添加根路径（去重）
     */
    fn add_root(&self, path: PathBuf) {
        let mut roots = self.allowed_roots.lock().unwrap();
        if !roots.iter().any(|existing| existing == &path) {
            roots.push(path);
        }
    }
}

impl Default for WorkspaceState {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::atomic::{AtomicU64, Ordering};

    static COUNTER: AtomicU64 = AtomicU64::new(0);

    /**
     * 辅助：创建唯一的临时目录（避免引入 tempfile 依赖）
     *
     * 目录位于 std::env::temp_dir() 下，由测试进程隔离。
     * 测试结束后由系统或下次清理回收，不影响测试逻辑。
     */
    fn make_tempdir(prefix: &str) -> PathBuf {
        let id = COUNTER.fetch_add(1, Ordering::SeqCst);
        let path = std::env::temp_dir().join(format!(
            "mdv-test-{}-{}-{}",
            prefix,
            std::process::id(),
            id
        ));
        fs::create_dir_all(&path).unwrap();
        path.canonicalize().unwrap()
    }

    /**
     * 辅助：构造无 AppHandle 的 WorkspaceState（仅测试 allowed_roots 逻辑）
     *
     * 注：grant 需要真实 AppHandle，本测试集只测 add_root / assert_allowed / roots
     * 通过 add_root 直接注入测试路径。
     */
    fn make_state_with_roots(paths: Vec<PathBuf>) -> WorkspaceState {
        let state = WorkspaceState::new();
        for p in paths {
            state.add_root(p);
        }
        state
    }

    #[test]
    fn grant_directory_allows_subpaths() {
        let dir_path = make_tempdir("grant-dir");
        let state = make_state_with_roots(vec![dir_path.clone()]);

        let sub = dir_path.join("subdir");
        fs::create_dir(&sub).unwrap();
        state
            .assert_allowed(&sub)
            .expect("subpath should be allowed");
    }

    #[test]
    fn grant_many_deduplicates_roots() {
        let dir_path = make_tempdir("dedup");

        let state = WorkspaceState::new();
        state.add_root(dir_path.clone());
        state.add_root(dir_path.clone());

        assert_eq!(state.roots().len(), 1);
    }

    #[test]
    fn assert_allowed_rejects_unauthorized_path() {
        let dir_a = make_tempdir("authorized");
        let dir_b = make_tempdir("unauthorized");
        let state = make_state_with_roots(vec![dir_a]);

        let err = state.assert_allowed(&dir_b);
        assert!(err.is_err(), "path outside roots should be rejected");
    }

    #[test]
    fn assert_allowed_empty_roots_allows_all() {
        let dir_path = make_tempdir("empty-roots");
        let state = WorkspaceState::new();

        state
            .assert_allowed(&dir_path)
            .expect("empty roots should allow all paths");
    }

    #[test]
    fn roots_returns_clone_of_internal_list() {
        let dir_path = make_tempdir("roots-clone");
        let state = make_state_with_roots(vec![dir_path.clone()]);

        let roots = state.roots();
        assert_eq!(roots, vec![dir_path]);
    }
}
