//! 摸鱼小助手：托盘常驻 + 全局老板键一键伪装切屏。
//!
//! 架构：Rust 侧持有全部状态与窗口管理（遮罩窗口预创建、多显示器同步、
//! 焦点恢复、托盘、全局快捷键、配置持久化）；前端 cover/settings 两页
//! 只做呈现，通过命令与事件通信。

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod focus;

use std::{fs, path::PathBuf, sync::Mutex};

use serde::{Deserialize, Serialize};
use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl,
    WebviewWindowBuilder, Wry,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

const TRAY_ID: &str = "moyu-tray";
const SETTINGS_LABEL: &str = "settings";
const COVER_PREFIX: &str = "cover-";
const EVENT_SKIN_CHANGED: &str = "moyu://skin-changed";
const EVENT_CONFIG_CHANGED: &str = "moyu://config-changed";
const DEFAULT_HOTKEY: &str = "F9";

/// (skin id, 菜单显示名, OS 窗口伪装标题, macOS 视口外露色带颜色)
const SKINS: &[(&str, &str, &str, (f64, f64, f64))] = &[
    (
        "excel",
        "Excel 表格",
        "2026Q3经营分析.xlsx - Excel",
        (0.129, 0.451, 0.275), // #217346 顶栏绿
    ),
    (
        "vscode",
        "VS Code",
        "life.ts - my-project - Visual Studio Code",
        (0.118, 0.118, 0.118), // #1e1e1e
    ),
    (
        "word",
        "Word 文档",
        "Q3季度总结.docx",
        (0.961, 0.961, 0.961), // #f5f5f5
    ),
];

fn fake_title(skin: &str) -> &'static str {
    SKINS
        .iter()
        .find(|s| s.0 == skin)
        .map(|s| s.2)
        .unwrap_or(SKINS[0].2)
}

fn is_valid_skin(skin: &str) -> bool {
    SKINS.iter().any(|s| s.0 == skin)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct Config {
    hotkey: String,
    skin: String,
    autostart: bool,
    tray_left_toggles: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            hotkey: DEFAULT_HOTKEY.into(),
            skin: SKINS[0].0.into(),
            autostart: false,
            tray_left_toggles: true,
        }
    }
}

struct AppState {
    config: Mutex<Config>,
    focus: Mutex<Option<focus::SavedFocus>>,
    cover_sig: Mutex<String>,
    registered_hotkey: Mutex<Option<String>>,
    tray: Mutex<Option<TrayIcon<Wry>>>,
}

// ------------------------------ 配置持久化 ------------------------------

fn config_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|d| d.join("config.json"))
}

fn load_config(app: &AppHandle) -> Config {
    config_path(app)
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_config(app: &AppHandle, cfg: &Config) {
    if let Some(path) = config_path(app) {
        if let Some(dir) = path.parent() {
            let _ = fs::create_dir_all(dir);
        }
        if let Ok(json) = serde_json::to_string_pretty(cfg) {
            let _ = fs::write(path, json);
        }
    }
}

// ------------------------------ 遮罩窗口 -------------------------------

fn cover_windows(app: &AppHandle) -> Vec<tauri::WebviewWindow<Wry>> {
    let mut labels: Vec<String> = app
        .webview_windows()
        .into_keys()
        .filter(|l| l.starts_with(COVER_PREFIX))
        .collect();
    labels.sort();
    labels
        .into_iter()
        .filter_map(|l| app.get_webview_window(&l))
        .collect()
}

fn cover_visible(app: &AppHandle) -> bool {
    cover_windows(app)
        .iter()
        .any(|w| w.is_visible().unwrap_or(false))
}

/// 按当前显示器布局同步遮罩窗口：复用已有窗口，显示器增减/换布局时重摆或新建。
fn sync_cover_windows(app: &AppHandle) -> tauri::Result<Vec<tauri::WebviewWindow<Wry>>> {
    let monitors = app.available_monitors()?;
    let mut sig = String::new();
    for m in &monitors {
        let p = m.position();
        let s = m.size();
        sig.push_str(&format!("{},{},{},{};", p.x, p.y, s.width, s.height));
    }

    {
        let state = app.state::<AppState>();
        let mut last_sig = state.cover_sig.lock().unwrap();
        if *last_sig != sig {
            let title = fake_title(&state.config.lock().unwrap().skin);
            let existing = cover_windows(app);
            for (i, m) in monitors.iter().enumerate() {
                let pos = m.position();
                let size = m.size();
                if let Some(w) = existing.get(i) {
                    let _ = w.set_position(PhysicalPosition::new(pos.x, pos.y));
                    let _ = w.set_size(PhysicalSize::new(size.width, size.height));
                } else {
                    let win = WebviewWindowBuilder::new(
                        app,
                        format!("{COVER_PREFIX}{i}"),
                        WebviewUrl::App("cover.html".into()),
                    )
                    .title(title)
                    .decorations(false)
                    .resizable(false)
                    .maximizable(false)
                    .minimizable(false)
                    .closable(false)
                    .visible(false)
                    .focused(false)
                    .always_on_top(true)
                    .skip_taskbar(true)
                    .shadow(false)
                    // 伪装页无状态：隐身模式避免 WKWebView 磁盘缓存旧页面
                    // （缓存旧 cover.html 会引用已换哈希的资源，加载 404 白屏）
                    .incognito(true)
                    .build()?;
                    let _ = win.set_position(PhysicalPosition::new(pos.x, pos.y));
                    let _ = win.set_size(PhysicalSize::new(size.width, size.height));
                }
            }
            *last_sig = sig;
        }
    }

    Ok(cover_windows(app))
}

fn show_covers(app: &AppHandle) {
    match sync_cover_windows(app) {
        Ok(wins) => {
            focus::remember(app);
            let skin = app.state::<AppState>().config.lock().unwrap().skin.clone();
            let title = fake_title(&skin);
            for (i, w) in wins.iter().enumerate() {
                let _ = w.set_title(title);
                let _ = w.set_always_on_top(true);
                let _ = w.show();
                apply_mac_cover_chrome(app, w, &skin);
                if i == 0 {
                    let _ = w.set_focus();
                }
            }
        }
        Err(e) => eprintln!("[moyu] 显示遮罩失败: {e}"),
    }
}

/// macOS：遮罩收起后恢复系统菜单栏与 Dock
#[cfg(target_os = "macos")]
fn restore_mac_chrome() {
    use objc2::MainThreadMarker;
    use objc2_app_kit::{NSApplication, NSApplicationPresentationOptions};
    if let Some(mtm) = MainThreadMarker::new() {
        NSApplication::sharedApplication(mtm)
            .setPresentationOptions(NSApplicationPresentationOptions::empty());
    }
}

#[cfg(not(target_os = "macos"))]
fn restore_mac_chrome() {}

fn hide_covers(app: &AppHandle) {
    for w in cover_windows(app) {
        let _ = w.hide();
    }
    restore_mac_chrome();
    focus::restore(app);
}

/// macOS：外露色带染色 + 隐藏菜单栏/Dock。
/// macOS 26 的 WKWebView 会按安全区内缩页面视口（刘海/相机 Housing 区域），
/// 视口外的窗口背景默认纯黑、非常突兀——把它染成当前皮肤顶栏的颜色，
/// 视觉上等同顶栏延伸进系统菜单栏区域。
#[cfg(target_os = "macos")]
fn apply_mac_cover_chrome(app: &AppHandle, w: &tauri::WebviewWindow<Wry>, skin: &str) {
    use objc2::MainThreadMarker;
    use objc2_app_kit::{
        NSApplication, NSApplicationPresentationOptions, NSColor, NSWindow,
    };
    let rgb = SKINS
        .iter()
        .find(|s| s.0 == skin)
        .map(|s| s.3)
        .unwrap_or(SKINS[0].3);
    unsafe {
        let ptr = w.ns_window().unwrap_or(std::ptr::null_mut()) as *mut NSWindow;
        if let Some(window) = ptr.as_ref() {
            let (r, g, b) = rgb;
            let color = NSColor::colorWithSRGBRed_green_blue_alpha(r, g, b, 1.0);
            window.setBackgroundColor(Some(&color));
        }
    }
    // 隐藏菜单栏与 Dock，遮罩期间无系统元素穿帮
    if let Some(mtm) = MainThreadMarker::new() {
        let ns_app = NSApplication::sharedApplication(mtm);
        let options = NSApplicationPresentationOptions::HideMenuBar
            | NSApplicationPresentationOptions::HideDock;
        ns_app.setPresentationOptions(options);
    }
    let _ = app;
}

#[cfg(not(target_os = "macos"))]
fn apply_mac_cover_chrome(_app: &AppHandle, _w: &tauri::WebviewWindow<Wry>, _skin: &str) {}

fn toggle_cover(app: &AppHandle) {
    // AppKit 窗口操作（含 setLevel）必须在主线程执行
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || {
        if cover_visible(&handle) {
            hide_covers(&handle);
        } else {
            show_covers(&handle);
        }
    });
}

// ------------------------------ 全局快捷键 ------------------------------

fn apply_hotkey(app: &AppHandle, hotkey: &str) -> Result<(), String> {
    let shortcut: Shortcut = hotkey
        .parse()
        .map_err(|_| format!("无法识别的快捷键：{hotkey}"))?;
    let gs = app.global_shortcut();
    // 先注册新键，成功后再注销旧键，避免失败时出现“无热键”的空窗
    gs.on_shortcut(shortcut, |app, _shortcut, event| {
        if event.state() == ShortcutState::Pressed {
            toggle_cover(app);
        }
    })
    .map_err(|e| format!("快捷键 {hotkey} 注册失败（可能被其他程序占用）：{e}"))?;

    let state = app.state::<AppState>();
    let mut registered = state.registered_hotkey.lock().unwrap();
    if let Some(prev) = registered.as_deref() {
        if prev != hotkey {
            if let Ok(p) = prev.parse::<Shortcut>() {
                let _ = gs.unregister(p);
            }
        }
    }
    *registered = Some(hotkey.to_string());
    Ok(())
}

// -------------------------------- 托盘 ---------------------------------

fn build_tray_menu(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    let cfg = app.state::<AppState>().config.lock().unwrap().clone();
    let autostart_on = app.autolaunch().is_enabled().unwrap_or(false);

    let toggle_label = format!("立即伪装 / 恢复（{}）", cfg.hotkey);
    let toggle_i = MenuItem::with_id(app, "toggle", toggle_label, true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let skin_items: Vec<CheckMenuItem<Wry>> = SKINS
        .iter()
        .map(|(id, name, _, _)| {
            CheckMenuItem::with_id(
                app,
                format!("skin:{id}"),
                *name,
                true,
                cfg.skin == *id,
                None::<&str>,
            )
        })
        .collect::<Result<_, _>>()?;
    let skin_refs: Vec<&dyn tauri::menu::IsMenuItem<Wry>> =
        skin_items.iter().map(|i| i as &dyn tauri::menu::IsMenuItem<Wry>).collect();
    let skin_sub = Submenu::with_id(app, "skin-sub", "伪装界面", true)?;
    skin_sub.append_items(&skin_refs)?;
    let auto_i = CheckMenuItem::with_id(
        app,
        "autostart",
        "开机自动启动",
        true,
        autostart_on,
        None::<&str>,
    )?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let settings_i = MenuItem::with_id(app, "settings", "设置…", true, None::<&str>)?;
    let sep3 = PredefinedMenuItem::separator(app)?;
    let quit_i = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    Menu::with_items(
        app,
        &[
            &toggle_i,
            &sep1,
            &skin_sub,
            &auto_i,
            &sep2,
            &settings_i,
            &sep3,
            &quit_i,
        ],
    )
}

fn rebuild_tray_menu(app: &AppHandle) {
    let tray = app.state::<AppState>().tray.lock().unwrap().clone();
    if let Some(tray) = tray {
        match build_tray_menu(app) {
            Ok(menu) => {
                let _ = tray.set_menu(Some(menu));
            }
            Err(e) => eprintln!("[moyu] 重建托盘菜单失败: {e}"),
        }
    }
}

fn show_settings(app: &AppHandle) {
    if let Some(w) = app.get_webview_window(SETTINGS_LABEL) {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

fn sync_window_titles(app: &AppHandle) {
    let title = fake_title(&app.state::<AppState>().config.lock().unwrap().skin);
    for w in cover_windows(app) {
        let _ = w.set_title(title);
    }
}

fn handle_menu_event(app: &AppHandle, id: &str) {
    match id {
        "toggle" => toggle_cover(app),
        "settings" => show_settings(app),
        "quit" => app.exit(0),
        "autostart" => {
            let al = app.autolaunch();
            let enabled = al.is_enabled().unwrap_or(false);
            let result = if enabled { al.disable() } else { al.enable() };
            if let Err(e) = result {
                eprintln!("[moyu] 自启设置失败: {e}");
            }
            let now = al.is_enabled().unwrap_or(false);
            {
                let state = app.state::<AppState>();
                let mut cfg = state.config.lock().unwrap().clone();
                cfg.autostart = now;
                save_config(app, &cfg);
                *state.config.lock().unwrap() = cfg;
            }
            rebuild_tray_menu(app);
        }
        other => {
            if let Some(skin) = other.strip_prefix("skin:") {
                if is_valid_skin(skin) {
                    let state = app.state::<AppState>();
                    let mut cfg = state.config.lock().unwrap().clone();
                    cfg.skin = skin.to_string();
                    save_config(app, &cfg);
                    *state.config.lock().unwrap() = cfg;
                    let _ = app.emit(EVENT_SKIN_CHANGED, skin);
                    sync_window_titles(app);
                    rebuild_tray_menu(app);
                }
            }
        }
    }
}

// -------------------------------- 命令 ---------------------------------

#[tauri::command]
fn get_config(app: AppHandle) -> Config {
    app.state::<AppState>().config.lock().unwrap().clone()
}

#[tauri::command]
fn set_config(app: AppHandle, config: Config) -> Result<(), String> {
    if !is_valid_skin(&config.skin) {
        return Err("未知的伪装界面".into());
    }
    if config.hotkey.trim().is_empty() {
        return Err("老板键不能为空".into());
    }

    let state = app.state::<AppState>();
    let old = state.config.lock().unwrap().clone();
    let skin_changed = old.skin != config.skin;

    if old.hotkey != config.hotkey {
        apply_hotkey(&app, &config.hotkey)?;
    }

    let auto_result = if config.autostart {
        app.autolaunch().enable()
    } else {
        app.autolaunch().disable()
    };

    save_config(&app, &config);
    *state.config.lock().unwrap() = config.clone();

    if skin_changed {
        let _ = app.emit(EVENT_SKIN_CHANGED, config.skin.clone());
        sync_window_titles(&app);
    }
    let _ = app.emit(EVENT_CONFIG_CHANGED, config);
    rebuild_tray_menu(&app);

    auto_result.map_err(|e| format!("开机自启设置失败：{e}"))
}

#[tauri::command]
fn toggle_cover_now(app: AppHandle) {
    toggle_cover(&app);
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

// -------------------------------- 入口 ---------------------------------

fn main() {
    tauri::Builder::default()
        // 单实例：重复启动时把参数转交给运行中的实例（--toggle 触发伪装切换，
        // 其余情况唤出设置窗口），须最先注册
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if args.iter().any(|a| a == "--toggle") {
                toggle_cover(app);
            } else {
                show_settings(app);
            }
        }))
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_config,
            set_config,
            toggle_cover_now,
            quit_app
        ])
        .setup(|app| {
            let handle = app.handle().clone();

            // 托盘应用：mac 不占 Dock
            #[cfg(target_os = "macos")]
            let _ = handle.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let cfg = load_config(&handle);
            app.manage(AppState {
                config: Mutex::new(cfg.clone()),
                focus: Mutex::new(None),
                cover_sig: Mutex::new(String::new()),
                registered_hotkey: Mutex::new(None),
                tray: Mutex::new(None),
            });

            // 预创建遮罩窗口：首次按下老板键零延迟
            if let Err(e) = sync_cover_windows(&handle) {
                eprintln!("[moyu] 预创建遮罩窗口失败: {e}");
            }

            if let Err(e) = apply_hotkey(&handle, &cfg.hotkey) {
                eprintln!("[moyu] {e}");
            }

            // 自启状态与配置对齐
            let al = handle.autolaunch();
            let enabled = al.is_enabled().unwrap_or(false);
            if cfg.autostart != enabled {
                let result = if cfg.autostart { al.enable() } else { al.disable() };
                if let Err(e) = result {
                    eprintln!("[moyu] 自启设置失败: {e}");
                }
            }

            let icon = handle
                .default_window_icon()
                .expect("bundle icon missing")
                .clone();
            let tray = TrayIconBuilder::with_id(TRAY_ID)
                .icon(icon)
                .tooltip("摸鱼小助手")
                .menu(&build_tray_menu(&handle)?)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| handle_menu_event(app, event.id().as_ref()))
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        let toggles = app
                            .state::<AppState>()
                            .config
                            .lock()
                            .unwrap()
                            .tray_left_toggles;
                        if toggles {
                            toggle_cover(app);
                        }
                    }
                })
                .build(&handle)?;
            *app.state::<AppState>().tray.lock().unwrap() = Some(tray);

            // 设置窗口（隐身模式：与遮罩页同理，避免 WKWebView 磁盘缓存旧页面）
            let settings = WebviewWindowBuilder::new(
                &handle,
                SETTINGS_LABEL,
                WebviewUrl::App("settings.html".into()),
            )
            .title("摸鱼小助手 · 设置")
            .inner_size(640.0, 620.0)
            .min_inner_size(560.0, 520.0)
            .center()
            .visible(false)
            .resizable(true)
            .incognito(true)
            .build()?;
            let w = settings.clone();
            settings.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = w.hide();
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running moyu assistant");
}
