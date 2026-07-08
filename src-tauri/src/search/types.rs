use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SearchMatch {
    pub path: String,
    pub line: usize,
    pub column: usize,
    #[serde(rename = "matchText")]
    pub match_text: String,
    pub line_content: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SearchProgress {
    pub search_id: String,
    pub total_files: usize,
    pub searched_files: usize,
    pub matches: Vec<SearchMatch>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub new_matches: Option<Vec<SearchMatch>>,
    pub is_complete: bool,
    pub cancelled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub truncated: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub match_limit: Option<usize>,
}
