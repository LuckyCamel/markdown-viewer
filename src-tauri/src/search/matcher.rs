use std::env;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

use regex::Regex;

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

/**
 * 在单个文件中使用正则表达式查找匹配
 */
pub fn find_matches_in_file_regex(
    file_path: &Path,
    pattern: &str,
) -> Vec<SearchMatch> {
    let mut matches = Vec::new();
    let Ok(re) = Regex::new(pattern) else {
        return matches;
    };

    let Ok(file) = File::open(file_path) else {
        return matches;
    };

    let reader = BufReader::new(file);
    for (line_num, line) in reader.lines().enumerate() {
        if matches.len() >= MAX_MATCHES {
            break;
        }
        let Ok(line) = line else { continue };
        for m in re.find_iter(&line) {
            if matches.len() >= MAX_MATCHES {
                break;
            }
            let col = m.start();
            let start = std::cmp::max(0, col as i32 - 20) as usize;
            let end = std::cmp::min(line.len(), col + m.len() + 20);
            matches.push(SearchMatch {
                path: file_path.to_string_lossy().to_string(),
                line: line_num + 1,
                column: col + 1,
                match_text: m.as_str().to_string(),
                line_content: line[start..end].trim().to_string(),
            });
        }
    }
    matches
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::write;
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicUsize, Ordering};

    static COUNTER: AtomicUsize = AtomicUsize::new(0);

    fn create_test_file(content: &str) -> PathBuf {
        let id = COUNTER.fetch_add(1, Ordering::SeqCst);
        let path = env::temp_dir().join(format!("test_search_file_{}.txt", id));
        write(&path, content).unwrap();
        path
    }

    #[test]
    fn finds_exact_matches() {
        let path = create_test_file("hello world\nhello rust\nhello world again");
        let matches = find_matches_in_file(&path, "hello", "hello");
        assert_eq!(matches.len(), 3);
        assert_eq!(matches[0].line, 1);
        assert_eq!(matches[1].line, 2);
        assert_eq!(matches[2].line, 3);
        std::fs::remove_file(path).ok();
    }

    #[test]
    fn matches_case_insensitive() {
        let path = create_test_file("Hello World\nHELLO RUST\nhello again");
        let matches = find_matches_in_file(&path, "hello", "hello");
        assert_eq!(matches.len(), 3);
        std::fs::remove_file(path).ok();
    }

    #[test]
    fn returns_empty_for_nonexistent_file() {
        let matches = find_matches_in_file(Path::new("/nonexistent/file.txt"), "test", "test");
        assert!(matches.is_empty());
    }

    #[test]
    fn returns_empty_for_no_matches() {
        let path = create_test_file("hello world\ntest content");
        let matches = find_matches_in_file(&path, "xyz", "xyz");
        assert!(matches.is_empty());
        std::fs::remove_file(path).ok();
    }

    #[test]
    fn includes_context_around_match() {
        let path = create_test_file("this is a long line containing the word test somewhere");
        let matches = find_matches_in_file(&path, "test", "test");
        assert!(!matches.is_empty());
        assert!(matches[0].line_content.contains("test"));
        assert!(matches[0].line_content.len() > 4);
        std::fs::remove_file(path).ok();
    }

    #[test]
    fn finds_regex_matches() {
        let path = create_test_file("hello 123 world 456");
        let matches = find_matches_in_file_regex(&path, r"\d+");
        assert_eq!(matches.len(), 2);
        std::fs::remove_file(path).ok();
    }

    #[test]
    fn returns_empty_for_invalid_regex() {
        let path = create_test_file("hello world");
        let matches = find_matches_in_file_regex(&path, r"[invalid");
        assert_eq!(matches.len(), 0);
        std::fs::remove_file(path).ok();
    }
}


