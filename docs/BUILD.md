# 打包指南

项目是 Tauri 2 应用，一套代码出 Windows 与 macOS 双平台安装包。**首次构建前**请先完成
[准备](#准备) 与 `npm install`。

```
moyu-assistant/
├── src/               # 前端（伪装皮肤 + 设置页，Vite + 原生 TS）
├── src-tauri/         # Rust 核心（托盘/全局热键/遮罩窗口/焦点恢复）
└── docs/BUILD.md      # 本文
```

产物对照：

| 平台 | 命令 | 产物 |
| --- | --- | --- |
| Windows | `npm run tauri:build` | `src-tauri/target/release/bundle/nsis/*-setup.exe`（NSIS 安装包，另附 msi） |
| macOS | `npm run tauri:build` | `src-tauri/target/release/bundle/macos/MoyuAssistant.app` + `bundle/dmg/*.dmg` |

> 若 mac 上 dmg 打包脚本报错（macOS 26 常见，bundle_dmg.sh 需要 Finder 自动化权限），
> 用 hdiutil 手动补一个：
>
> ```bash
> rm -rf /tmp/moyu-dmg && mkdir -p /tmp/moyu-dmg
> cp -R src-tauri/target/release/bundle/macos/MoyuAssistant.app /tmp/moyu-dmg/
> ln -sf /Applications /tmp/moyu-dmg/Applications
> hdiutil create -volname "MoyuAssistant" -srcfolder /tmp/moyu-dmg -ov -format UDZO \
>   -o src-tauri/target/release/bundle/dmg/MoyuAssistant_0.1.0_aarch64.dmg
> ```

## 准备

### Windows 打包机

1. Node.js ≥ 18（含 npm）。
2. Rust MSVC 工具链：安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
   （勾选"使用 C++ 的桌面开发"），再装 [rustup](https://rustup.rs)，选 `x86_64-pc-windows-msvc`。
3. WebView2 Runtime：Win10/11 一般自带；没有也没关系，安装包已配置 `downloadBootstrapper`
   模式，安装时自动下载。

```powershell
npm install
npm run tauri:build
# 产物：src-tauri/target/release/bundle/nsis/MoyuAssistant_0.1.0_x64-setup.exe
```

### macOS 开发机

```bash
# Rust（已装可跳过）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

npm install
npm run tauri:dev     # 开发调试（托盘/热键/遮罩全功能可测）
npm run tauri:build   # 出 .app 与 .dmg
```

## 日常开发注意

- 前端构建产物在 `dist/`。**debug 直启二进制时 Tauri 以增量缓存展开资源**，改动前端后
  请让 `src-tauri/src/main.rs` 内容发生一次真实变化（或 `cargo clean -p moyu-assistant`），
  否则可能加载到旧资源；`npm run tauri:dev`（vite 实时服务）无此问题。
- 遮罩页与设置页均开启**隐身模式**（incognito）：伪装页无状态，同时规避 WKWebView 磁盘
  缓存导致的升级后白屏（旧 cover.html 引用已换哈希的资源会 404）。
- 默认老板键 F9，托盘右键菜单或设置窗口可改；重复启动会把参数转交给运行中的实例，
  `moyu-assistant --toggle` 可从脚本触发伪装切换。
- 未签名构建在 Windows 上可能被 SmartScreen 提示（仍可运行），mac 首次打开需右键 → 打开；
  代码签名留作后续迭代。
