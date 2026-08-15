use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveFile {
    path: String,
    content: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveResult {
    success: bool,
    backup_path: Option<String>,
    error: Option<String>,
}

/// 相对 Steam 库目录的游戏存档路径
const GAME_RELATIVE: &str = "A Dance of Fire and Ice/User/data.sav";

/// 收集各平台可能的 Steam `steamapps/common` 目录
fn steam_common_dirs() -> Vec<PathBuf> {
    let mut out: Vec<PathBuf> = Vec::new();

    // Windows：Program Files 各盘符下的 Steam 安装目录
    if cfg!(target_os = "windows") {
        for var in ["ProgramFiles(x86)", "ProgramFiles", "ProgramW6432"] {
            if let Ok(pf) = std::env::var(var) {
                out.push(PathBuf::from(pf).join("Steam").join("steamapps").join("common"));
            }
        }
        for drive in ["D:", "E:", "F:"] {
            out.push(PathBuf::from(drive).join("Steam").join("steamapps").join("common"));
        }
    }

    if let Some(home) = dirs::home_dir() {
        // macOS
        out.push(home.join("Library").join("Application Support").join("Steam").join("steamapps").join("common"));
        // Linux（原生 Steam 与 Flatpak 两种布局）
        out.push(home.join(".steam").join("steam").join("steamapps").join("common"));
        out.push(home.join(".local").join("share").join("Steam").join("steamapps").join("common"));
    }

    out
}

/// 去掉 UTF-8 BOM（部分存档文件带 BOM）
fn strip_bom(s: &str) -> &str {
    s.strip_prefix('\u{feff}').unwrap_or(s)
}

/// 自动探测 Steam 存档
#[tauri::command]
fn auto_detect_save() -> Option<SaveFile> {
    for common in steam_common_dirs() {
        let path = common.join(GAME_RELATIVE);
        if path.exists() {
            if let Ok(content) = fs::read_to_string(&path) {
                return Some(SaveFile {
                    path: path.to_string_lossy().into_owned(),
                    content: strip_bom(&content).to_string(),
                });
            }
        }
    }
    None
}

/// 打开文件对话框选择存档
#[tauri::command]
fn open_save_dialog(app: tauri::AppHandle) -> Option<SaveFile> {
    use tauri_plugin_dialog::DialogExt;

    let path = app
        .dialog()
        .file()
        .add_filter("存档文件", &["sav"])
        .add_filter("所有文件", &["*"])
        .blocking_pick_file()
        .and_then(|f| f.into_path().ok())?;

    let content = fs::read_to_string(&path).ok()?;
    Some(SaveFile {
        path: path.to_string_lossy().into_owned(),
        content: strip_bom(&content).to_string(),
    })
}

/// 保存（写回前自动备份为 .backup）
#[tauri::command]
fn save_save(path: String, content: String) -> SaveResult {
    let p = Path::new(&path);
    let backup = format!("{}.backup", path);

    if let Err(e) = fs::copy(p, &backup) {
        return SaveResult {
            success: false,
            backup_path: None,
            error: Some(format!("备份失败: {e}")),
        };
    }

    match fs::write(p, content) {
        Ok(_) => SaveResult {
            success: true,
            backup_path: Some(backup),
            error: None,
        },
        Err(e) => SaveResult {
            success: false,
            backup_path: None,
            error: Some(e.to_string()),
        },
    }
}

/// 另存为
#[tauri::command]
fn save_save_as(app: tauri::AppHandle, content: String) -> Option<String> {
    use tauri_plugin_dialog::DialogExt;

    let path = app
        .dialog()
        .file()
        .set_file_name("data.sav")
        .add_filter("存档文件", &["sav"])
        .add_filter("所有文件", &["*"])
        .blocking_save_file()
        .and_then(|f| f.into_path().ok())?;

    fs::write(&path, content).ok()?;
    Some(path.to_string_lossy().into_owned())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            auto_detect_save,
            open_save_dialog,
            save_save,
            save_save_as
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
