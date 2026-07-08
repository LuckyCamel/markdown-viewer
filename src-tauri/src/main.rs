fn main() {
    match markdown_viewer_lib::cli::prepare_launch() {
        markdown_viewer_lib::cli::LaunchPrep::Exit => {}
        markdown_viewer_lib::cli::LaunchPrep::Run(paths) => markdown_viewer_lib::run(paths),
    }
}
