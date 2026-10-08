//! 焦点管理：遮罩显示前记住前台应用，隐藏时把焦点还给它（双平台实现）。
//!
//! - Windows：GetForegroundWindow / SetForegroundWindow（按下全局热键的进程
//!   拥有前台激活权限，直接调用即可生效）。
//! - macOS：NSWorkspace.frontmostApplication 记录 pid，恢复时
//!   NSRunningApplication.activateWithOptions 拉回前台。

use tauri::{AppHandle, Manager};

use crate::AppState;

#[derive(Debug, Default, Clone, Copy)]
pub struct SavedFocus {
    #[cfg_attr(not(windows), allow(dead_code))]
    hwnd: isize,
    pid: i32,
}

pub fn remember(app: &AppHandle) {
    let saved = capture();
    if let Some(state) = app.try_state::<AppState>() {
        *state.focus.lock().unwrap() = Some(saved);
    }
}

pub fn restore(app: &AppHandle) {
    if let Some(state) = app.try_state::<AppState>() {
        if let Some(f) = state.focus.lock().unwrap().take() {
            f.activate();
        }
    }
}

// ---------------------------------------------------------------- Windows

#[cfg(windows)]
fn capture() -> SavedFocus {
    use windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow;
    let hwnd = unsafe { GetForegroundWindow() };
    SavedFocus {
        hwnd: hwnd.0 as isize,
        pid: 0,
    }
}

#[cfg(windows)]
impl SavedFocus {
    fn activate(self) {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::UI::WindowsAndMessaging::{IsWindow, SetForegroundWindow};
        if self.hwnd == 0 {
            return;
        }
        let hwnd = HWND(self.hwnd as *mut core::ffi::c_void);
        if unsafe { IsWindow(Some(hwnd)) }.as_bool() {
            unsafe {
                let _ = SetForegroundWindow(hwnd);
            }
        }
    }
}

// ------------------------------------------------------------------ macOS

#[cfg(target_os = "macos")]
fn capture() -> SavedFocus {
    use objc2_app_kit::NSWorkspace;
    let pid = NSWorkspace::sharedWorkspace()
        .frontmostApplication()
        .map(|a| a.processIdentifier())
        .unwrap_or(0);
    SavedFocus { hwnd: 0, pid }
}

#[cfg(target_os = "macos")]
impl SavedFocus {
    fn activate(self) {
        use objc2_app_kit::{NSApplicationActivationOptions, NSRunningApplication};
        if self.pid == 0 {
            return;
        }
        if let Some(ra) = NSRunningApplication::runningApplicationWithProcessIdentifier(self.pid) {
            // macOS 14+ 忽略该标志（默认行为已等同），旧系统需要它抢占激活
            #[allow(deprecated)]
            let options = NSApplicationActivationOptions::ActivateIgnoringOtherApps;
            let _ = ra.activateWithOptions(options);
        }
    }
}

// --------------------------------------------------------------- 其他平台

#[cfg(not(any(windows, target_os = "macos")))]
fn capture() -> SavedFocus {
    SavedFocus::default()
}

#[cfg(not(any(windows, target_os = "macos")))]
impl SavedFocus {
    fn activate(self) {}
}
