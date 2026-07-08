use std::collections::HashSet;
use std::sync::Mutex;

/**
 * 内容搜索取消标记
 */
pub struct SearchState {
    pub cancelled_ids: Mutex<HashSet<String>>,
}
