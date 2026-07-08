fn main() {
  tauri_build::build();
  let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
  let pkg_path = manifest_dir.join("../package.json");
  let pkg: serde_json::Value =
    serde_json::from_str(&std::fs::read_to_string(&pkg_path).expect("read package.json"))
      .expect("parse package.json");
  let version = pkg["version"].as_str().unwrap_or("unknown");
  println!("cargo:rustc-env=APP_VERSION={version}");
  println!("cargo:rerun-if-changed=../package.json");
}
