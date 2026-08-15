use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::Manager;
use base64::{engine::general_purpose::STANDARD, Engine as _};

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

/// 自定义名称侧车文件路径（与存档同目录）
fn sidecar_path(save_path: &str) -> PathBuf {
    match Path::new(save_path).parent() {
        Some(dir) => dir.join("levelNames.json"),
        None => PathBuf::from("levelNames.json"),
    }
}

/// 读取自定义关卡名称侧车文件（不存在返回 None）
#[tauri::command]
fn read_level_names(save_path: String) -> Result<Option<HashMap<String, String>>, String> {
    let path = sidecar_path(&save_path);
    if !path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let names: HashMap<String, String> =
        serde_json::from_str(strip_bom(&content)).map_err(|e| e.to_string())?;
    Ok(Some(names))
}

/// 写入自定义关卡名称侧车文件
#[tauri::command]
fn write_level_names(save_path: String, names: HashMap<String, String>) -> Result<(), String> {
    let path = sidecar_path(&save_path);
    let content = serde_json::to_string_pretty(&names).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())
}

// =======================================================================
// 云同步：云端 JSON 文件下载 + 开发者推送到 GitHub
// =======================================================================

/// 云端数据默认地址（仓库中的 JSON 文件，raw 直链）
const DEFAULT_CLOUD_URL: &str =
    "https://raw.githubusercontent.com/FYWanye/adofai-save-editor/main/cloud/levelNames.json";

/// 本地云配置（token 仅本机保存，不返回给前端明文）
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CloudConfig {
    url: Option<String>,
    owner: Option<String>,
    repo: Option<String>,
    path: Option<String>,
    token: Option<String>,
}

/// 返回给前端的开发者云配置视图（隐藏 token）
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CloudSettingsView {
    has_token: bool,
}

fn cloud_config_path(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_config_dir()
        .unwrap_or_else(|_| dirs::config_dir().unwrap_or_default())
        .join("cloud.json")
}

fn load_cloud_config(app: &tauri::AppHandle) -> CloudConfig {
    let mut cfg = CloudConfig {
        url: Some(DEFAULT_CLOUD_URL.to_string()),
        owner: Some("FYWanye".to_string()),
        repo: Some("adofai-save-editor".to_string()),
        path: Some("cloud/levelNames.json".to_string()),
        token: None,
    };
    let path = cloud_config_path(app);
    if let Ok(content) = fs::read_to_string(&path) {
        if let Ok(v) = serde_json::from_str::<CloudConfig>(&content) {
            if let Some(u) = v.url.as_deref() {
                if !u.trim().is_empty() {
                    cfg.url = Some(u.trim().to_string());
                }
            }
            if let Some(o) = v.owner.as_deref() {
                if !o.trim().is_empty() {
                    cfg.owner = Some(o.trim().to_string());
                }
            }
            if let Some(r) = v.repo.as_deref() {
                if !r.trim().is_empty() {
                    cfg.repo = Some(r.trim().to_string());
                }
            }
            if let Some(p) = v.path.as_deref() {
                if !p.trim().is_empty() {
                    cfg.path = Some(p.trim().to_string());
                }
            }
            if let Some(t) = v.token.as_deref() {
                if !t.trim().is_empty() {
                    cfg.token = Some(t.trim().to_string());
                }
            }
        }
    }
    cfg
}

fn save_cloud_config(app: &tauri::AppHandle, cfg: &CloudConfig) -> Result<(), String> {
    let path = cloud_config_path(app);
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let content = serde_json::to_string_pretty(cfg).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())
}

/// 当前云端下载 URL
fn cloud_url(app: &tauri::AppHandle) -> String {
    load_cloud_config(app)
        .url
        .unwrap_or_else(|| DEFAULT_CLOUD_URL.to_string())
}

/// 下载并解析云端 JSON，返回关卡名称映射
#[tauri::command]
fn cloud_fetch(app: tauri::AppHandle) -> Result<HashMap<String, String>, String> {
    let url = cloud_url(&app);
    let resp = ureq::get(&url)
        .set("User-Agent", "adofai-save-editor")
        .call()
        .map_err(|e| format!("下载失败: {e}"))?;
    let status = resp.status();
    if status >= 400 {
        return Err(format!("云端返回 HTTP {status}"));
    }
    let text = resp.into_string().map_err(|e| format!("读取响应失败: {e}"))?;
    let names: HashMap<String, String> =
        serde_json::from_str(&text).map_err(|e| format!("云端 JSON 解析失败: {e}"))?;
    Ok(names)
}

/// 获取当前云端下载 URL
#[tauri::command]
fn get_cloud_url(app: tauri::AppHandle) -> String {
    cloud_url(&app)
}

/// 保存云端下载 URL
#[tauri::command]
fn set_cloud_url(app: tauri::AppHandle, url: String) -> Result<(), String> {
    let mut cfg = load_cloud_config(&app);
    cfg.url = Some(url.trim().to_string());
    save_cloud_config(&app, &cfg)
}

/// 获取开发者云配置视图（隐藏 token）
#[tauri::command]
fn get_cloud_settings(app: tauri::AppHandle) -> CloudSettingsView {
    let cfg = load_cloud_config(&app);
    CloudSettingsView {
        has_token: cfg
            .token
            .as_deref()
            .map(|t| !t.trim().is_empty())
            .unwrap_or(false),
    }
}

/// 保存开发者 Token（仓库/路径/地址使用默认值）
#[tauri::command]
fn set_cloud_settings(app: tauri::AppHandle, token: String) -> Result<(), String> {
    let mut cfg = load_cloud_config(&app);
    if !token.trim().is_empty() {
        cfg.token = Some(token.trim().to_string());
    }
    save_cloud_config(&app, &cfg)
}

/// 将 JSON 内容推送到 GitHub 仓库文件（开发者用，需 token）
#[tauri::command]
fn cloud_push(app: tauri::AppHandle, content: String) -> Result<(), String> {
    serde_json::from_str::<serde_json::Value>(&content)
        .map_err(|e| format!("内容不是合法 JSON: {e}"))?;
    let cfg = load_cloud_config(&app);
    let owner = cfg.owner.as_deref().unwrap_or("FYWanye");
    let repo = cfg.repo.as_deref().unwrap_or("adofai-save-editor");
    let path = cfg.path.as_deref().unwrap_or("cloud/levelNames.json");
    let token = cfg
        .token
        .as_deref()
        .filter(|t| !t.trim().is_empty())
        .ok_or("尚未配置 GitHub Token（请在开发者设置中填写）")?;

    let api = format!("https://api.github.com/repos/{owner}/{repo}/contents/{path}");
    let auth = format!("Bearer {token}");

    // 1) 获取现有文件 sha（404 表示新文件）
    let mut sha: Option<String> = None;
    match ureq::get(&api)
        .set("Authorization", &auth)
        .set("User-Agent", "adofai-save-editor")
        .set("Accept", "application/vnd.github+json")
        .call()
    {
        Ok(r) => {
            let body = r.into_string().map_err(|e| e.to_string())?;
            let v: serde_json::Value = serde_json::from_str(&body).map_err(|e| e.to_string())?;
            sha = v["sha"].as_str().map(|s| s.to_string());
        }
        Err(ureq::Error::Status(404, _)) => {
            // 文件尚不存在 → 走新建分支
        }
        Err(ureq::Error::Status(code, resp)) => {
            let body = resp.into_string().unwrap_or_default();
            return Err(format!("获取云端文件失败: HTTP {code} {body}"));
        }
        Err(e) => return Err(format!("获取云端文件失败: {e}")),
    }

    // 2) 更新 / 创建文件
    let encoded = STANDARD.encode(content.as_bytes());
    let mut payload = serde_json::json!({
        "message": "更新云端关卡名称",
        "content": encoded,
    });
    if let Some(s) = sha {
        payload["sha"] = serde_json::json!(s);
    }
    let resp = match ureq::put(&api)
        .set("Authorization", &auth)
        .set("User-Agent", "adofai-save-editor")
        .set("Accept", "application/vnd.github+json")
        .set("Content-Type", "application/json")
        .send_string(&payload.to_string())
    {
        Ok(r) => r,
        Err(ureq::Error::Status(code, resp)) => {
            let body = resp.into_string().unwrap_or_default();
            return Err(format!("推送失败: HTTP {code} {body}"));
        }
        Err(e) => return Err(format!("推送失败: {e}")),
    };
    let status = resp.status();
    let text = resp.into_string().map_err(|e| e.to_string())?;
    if status >= 400 {
        return Err(format!("推送失败: HTTP {status} {text}"));
    }
    Ok(())
}

/// 在 App 内打开 GitHub 页面（优先内嵌窗口，失败则系统浏览器）
#[tauri::command]
fn cloud_open(app: tauri::AppHandle, url: String) -> Result<(), String> {
    if let Ok(u) = url::Url::parse(&url) {
        if let Some(win) = app.get_webview_window("cloud-github") {
            let _ = win.navigate(u.clone());
            let _ = win.set_focus();
            return Ok(());
        }
        if tauri::WebviewWindowBuilder::new(
            &app,
            "cloud-github",
            tauri::WebviewUrl::External(u),
        )
        .title("GitHub")
        .inner_size(1000.0, 720.0)
        .build()
        .is_ok()
        {
            return Ok(());
        }
    }
    open_in_browser(&url);
    Ok(())
}

fn open_in_browser(url: &str) {
    #[cfg(target_os = "windows")]
    let _ = std::process::Command::new("cmd")
        .args(["/C", "start", "", url])
        .spawn();
    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open").arg(url).spawn();
    #[cfg(target_os = "linux")]
    let _ = std::process::Command::new("xdg-open").arg(url).spawn();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            auto_detect_save,
            open_save_dialog,
            save_save,
            save_save_as,
            read_level_names,
            write_level_names,
            cloud_fetch,
            get_cloud_url,
            set_cloud_url,
            get_cloud_settings,
            set_cloud_settings,
            cloud_push,
            cloud_open
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
