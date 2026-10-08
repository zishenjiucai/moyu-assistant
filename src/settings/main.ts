/**
 * 设置窗口入口：老板键录制 / 皮肤选择 / 自启与托盘行为开关。
 * 保存统一走 set_config 命令，失败（如热键被占用）时回读配置还原 UI。
 */
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Config } from "../cover/main";
import { SKINS } from "../cover/registry";

let cfg: Config = { hotkey: "F9", skin: "excel", autostart: false, trayLeftToggles: true };
let recording = false;
let pendingHotkey: string | null = null;

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const hotkeyBtn = $<HTMLButtonElement>("#hotkey-btn");
const hotkeyHint = $("#hotkey-hint");
const skinList = $("#skin-list");
const optAutostart = $<HTMLInputElement>("#opt-autostart");
const optTrayLeft = $<HTMLInputElement>("#opt-trayleft");
const btnSave = $<HTMLButtonElement>("#btn-save");
const btnTry = $<HTMLButtonElement>("#btn-try");
const btnQuit = $<HTMLButtonElement>("#btn-quit");
const toast = $("#toast");

const isMac = /mac/i.test(navigator.platform);

const HINT_DEFAULT =
  "点击左侧按键后，在键盘上按下新的快捷键组合（Esc 取消）。设置后在任何界面按下老板键即可切换伪装。";
const HINT_SAVED = "已修改，点击「保存设置」后生效。";

const CODE_LABELS: Record<string, string> = {
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Backquote: "`",
  Space: "Space",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
};

function codeLabel(code: string): string {
  if (CODE_LABELS[code]) return CODE_LABELS[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return "Num" + code.slice(6);
  return code;
}

function hotkeyLabel(value: string): string {
  return value
    .split("+")
    .map((part) => {
      if (part === "CommandOrControl") return isMac ? "Cmd" : "Ctrl";
      if (part === "Alt") return isMac ? "Option" : "Alt";
      return codeLabel(part);
    })
    .join(" + ");
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
function showToast(msg: string, isErr = false) {
  toast.textContent = msg;
  toast.classList.toggle("err", isErr);
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.hidden = true), isErr ? 4000 : 2000);
}

function refreshHotkey() {
  const value = pendingHotkey ?? cfg.hotkey;
  hotkeyBtn.textContent = recording ? "按下快捷键…" : hotkeyLabel(value);
  hotkeyBtn.classList.toggle("recording", recording);
  hotkeyHint.textContent = recording
    ? "请按下新的快捷键组合（仅修饰键不算完成，Esc 取消）"
    : pendingHotkey
      ? HINT_SAVED
      : HINT_DEFAULT;
  hotkeyHint.classList.toggle("alert", !!pendingHotkey);
}

function renderSkins() {
  skinList.innerHTML = "";
  for (const skin of SKINS) {
    const card = document.createElement("div");
    card.className = `skin-card${skin.id === cfg.skin ? " active" : ""}`;
    card.innerHTML = `
      <div class="s-name">${skin.name}</div>
      <div class="s-desc">${skin.desc}</div>`;
    card.addEventListener("click", () => {
      cfg.skin = skin.id;
      renderSkins();
    });
    skinList.appendChild(card);
  }
}

function syncChecks() {
  optAutostart.checked = cfg.autostart;
  optTrayLeft.checked = cfg.trayLeftToggles;
}

hotkeyBtn.addEventListener("click", () => {
  recording = true;
  pendingHotkey = null;
  refreshHotkey();
});

document.addEventListener(
  "keydown",
  (e) => {
    if (!recording) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "Escape") {
      recording = false;
      pendingHotkey = null;
      refreshHotkey();
      return;
    }
    // 仅修饰键：继续等待主键
    if (["Control", "Meta", "Alt", "Shift"].includes(e.key)) return;
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push("CommandOrControl");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");
    parts.push(e.code);
    pendingHotkey = parts.join("+");
    recording = false;
    refreshHotkey();
  },
  true
);

btnSave.addEventListener("click", async () => {
  if (recording) {
    showToast("请先完成快捷键录制（Esc 取消）", true);
    return;
  }
  if (pendingHotkey) cfg.hotkey = pendingHotkey;
  cfg.autostart = optAutostart.checked;
  cfg.trayLeftToggles = optTrayLeft.checked;
  try {
    await invoke("set_config", { config: cfg });
    pendingHotkey = null;
    refreshHotkey();
    showToast("已保存 ✓");
  } catch (err) {
    showToast(String(err), true);
    cfg = await invoke<Config>("get_config");
    pendingHotkey = null;
    refreshHotkey();
    renderSkins();
    syncChecks();
  }
});

btnTry.addEventListener("click", () => {
  void invoke("toggle_cover_now");
});

btnQuit.addEventListener("click", () => {
  void invoke("quit_app");
});

async function boot() {
  try {
    cfg = await invoke<Config>("get_config");
  } catch {
    // 浏览器直接打开时使用默认值
  }
  renderSkins();
  syncChecks();
  refreshHotkey();
  await listen<Config>("moyu://config-changed", (e) => {
    cfg = e.payload;
    pendingHotkey = null;
    refreshHotkey();
    renderSkins();
    syncChecks();
  });
}

void boot();
