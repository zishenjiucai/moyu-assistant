/**
 * 遮罩页入口：读配置 → 渲染皮肤 → 监听皮肤切换事件。
 * 在 Tauri 外直接用浏览器打开时（开发调试）回退到默认配置。
 */
import "./skins/skins.css";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getSkin } from "./registry";

export interface Config {
  hotkey: string;
  skin: string;
  autostart: boolean;
  trayLeftToggles: boolean;
}

const root = document.getElementById("root") as HTMLElement;

// 平台标记：mac 上给菜单栏（悬浮于遮罩上层的半透明条）让位
document.documentElement.dataset.platform = /mac/i.test(navigator.platform)
  ? "mac"
  : "win";

function render(skinId: string) {
  const skin = getSkin(skinId);
  document.title = skin.title;
  root.innerHTML = "";
  skin.render(root);
}

async function boot() {
  let skin = "excel";
  try {
    const cfg = await invoke<Config>("get_config");
    skin = cfg.skin;
  } catch {
    // 浏览器调试模式：允许 ?skin=vscode 指定皮肤
    const q = new URLSearchParams(location.search).get("skin");
    if (q) skin = q;
  }
  render(skin);
  await listen<string>("moyu://skin-changed", (e) => render(e.payload));
}

void boot();
