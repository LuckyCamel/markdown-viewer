use std::collections::HashSet;
use std::sync::Mutex;

pub struct CancelledStore {
    cancelled_ids: Mutex<HashSet<String>>,
}

impl CancelledStore {
    pub fn new() -> Self {
        Self {
            cancelled_ids: Mutex::new(HashSet::new()),
        }
    }

    pub fn is_cancelled(&self, search_id: &str) -> bool {
        self.cancelled_ids.lock().unwrap().contains(search_id)
    }

    pub fn cancel(&self, search_id: &str) {
        self.cancelled_ids.lock().unwrap().insert(search_id.to_string());
    }

    pub fn remove(&self, search_id: &str) {
        self.cancelled_ids.lock().unwrap().remove(search_id);
    }
}
