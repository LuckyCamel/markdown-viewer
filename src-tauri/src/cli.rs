pub enum LaunchPrep {
    Exit,
    Run(Vec<String>),
}

const HELP: &str = "Markdown Viewer

Usage: markdown-viewer [options] [path...]

Options:
  -v, --version   Print version and exit
  -h, --help      Print this help and exit

Arguments:
  path            Optional file or folder to open at launch
";

/**
 * 解析 CLI 参数；-v/-h 时打印并 Exit，否则返回待打开路径列表
 */
pub fn prepare_launch() -> LaunchPrep {
    let mut paths = Vec::new();

    for arg in std::env::args().skip(1) {
        match arg.as_str() {
            "-v" | "--version" => {
                let version = option_env!("APP_VERSION").unwrap_or("unknown");
                println!("{version}");
                return LaunchPrep::Exit;
            }
            "-h" | "--help" => {
                println!("{}", HELP.trim());
                return LaunchPrep::Exit;
            }
            a if a.starts_with('-') => continue,
            a => paths.push(a.to_string()),
        }
    }

    LaunchPrep::Run(paths)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn help_text_contains_usage() {
        assert!(HELP.contains("Usage:"));
    }
}
