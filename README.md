# 摸鱼小助手（MoyuAssistant）

Windows / macOS 双平台的**系统级摸鱼切屏工具**：启动后常驻系统托盘，任何界面下按下
**老板键**（默认 `F9`），屏幕瞬间盖上一套以假乱真的工作界面；再按一次，一切恢复原样。

伪装界面移植自 [life-restart-standalone](../game) 摸鱼版游戏的老板键设计，共三套皮肤：

| 皮肤 | 窗口伪装标题 | 内容 |
| --- | --- | --- |
| Excel 表格 | `2026Q3经营分析.xlsx - Excel` | 24 行销售明细 + 实时合计/状态栏 |
| VS Code | `life.ts - my-project - Visual Studio Code` | TS 项目代码 + 伪语法高亮 |
| Word 文档 | `Q3季度总结.docx` | 季度工作总结文档排版 |

## 功能

- **全局老板键**：任意界面（游戏/视频/网页）按下即盖屏，零动画瞬间出现；再按恢复，
  焦点自动还给原应用。默认 `F9`，设置里可录制任意组合键。
- **托盘常驻**：无主窗口；右键菜单 = 立即伪装/恢复、皮肤切换、开机自启、设置、退出；
  左键点击图标 = 快速切换（可关）。
- **多显示器全覆盖**：每个屏幕一个遮罩窗口，显示器热插拔自动重排。
- **设置窗口**：热键录制、默认皮肤、开机自启、托盘左键行为；配置持久化本地 JSON。
- **单实例**：重复启动唤出设置窗口；`moyu-assistant --toggle` 可从脚本触发切换。

## 快速开始

```bash
npm install
npm run tauri:dev     # 开发调试
npm run tauri:build   # 打包（产物见 docs/BUILD.md）
```

安装包构建与分发详见 [docs/BUILD.md](docs/BUILD.md)。

## 架构

```
src/
├── cover/        # 全屏伪装页：皮肤注册表 + Excel/VSCode/Word 三套皮肤（纯 DOM + CSS）
├── settings/     # 设置窗口页（热键录制/皮肤/自启开关）
└── shared/
src-tauri/
└── src/
    ├── main.rs   # 托盘、全局快捷键、遮罩窗口管理（多屏同步）、配置持久化、命令
    └── focus.rs  # 焦点恢复：Windows SetForegroundWindow / macOS NSRunningApplication
```

- Rust 侧持有全部状态与窗口管理；前端只做呈现，通过命令与事件通信（照搬 game 项目
  "皮肤只做呈现、不碰状态" 的注册表模式）。
- 遮罩窗口启动时预创建并隐藏，老板键按下零延迟显示；CSS 全局禁用 transition/animation。
- macOS 上显示遮罩时以 kiosk 同款机制隐藏菜单栏与 Dock，收起时还原；窗口背景染成
  皮肤主题色以自然衔接安全区。
- 遮罩页/设置页均以隐身模式（incognito）加载，规避 WKWebView 磁盘缓存的旧页面问题。

## 已知限制

- macOS 菜单栏在遮罩期间隐藏，收起后恢复；遮罩自身的假标题不会进入菜单栏（Windows
  无此问题，任务栏标题即伪装标题）。
- 未签名构建：Windows 可能被 SmartScreen 提示，mac 首次打开需右键 → 打开。
