use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

use super::types::SearchMatch;
use super::MAX_MATCHES;

/**
 * 在单个文件中查找 query 命中行
 */
pub fn find_matches_in_file(
    file_path: &Path,
    query: &str,
    query_lower: &str,
) -> Vec<SearchMatch> {
    let mut matches = Vec::new();
    let Ok(file) = File::open(file_path) else {
        return matches;
    };

    let reader = BufReader::new(file);
    for (line_num, line) in reader.lines().enumerate() {
        if matches.len() >= MAX_MATCHES {
            break;
        }
        let Ok(line) = line else { continue };
        if let Some(col) = line.to_lowercase().find(query_lower) {
            let start = std::cmp::max(0, col as i32 - 20) as usize;
            let end = std::cmp::min(line.len(), col + query.len() + 20);
            matches.push(SearchMatch {
                path: file_path.to_string_lossy().to_string(),
                line: line_num + 1,
                column: col + 1,
                match_text: query.to_string(),
                line_content: line[start..end].trim().to_string(),
            });
        }
    }
    matches
}
