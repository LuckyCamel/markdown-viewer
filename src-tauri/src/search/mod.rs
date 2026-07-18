pub mod cancelled_store;
pub mod matcher;
pub mod search_session;
pub mod types;
pub mod walk;

pub use cancelled_store::CancelledStore;
pub use search_session::SearchSession;
pub use walk::walk_dir;

pub const SEARCH_EMIT_INTERVAL: usize = 5;
pub const MAX_MATCHES: usize = 500;
