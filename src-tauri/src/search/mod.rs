pub mod matcher;
pub mod types;
pub mod walk;

pub use walk::walk_dir;

pub const SEARCH_EMIT_INTERVAL: usize = 5;
pub const MAX_MATCHES: usize = 500;
