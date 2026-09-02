# MUSE.AUDIO — macOS / iOS 构建与签名指南

> 本机为 Windows，**macOS(.app/.dmg) 与 iOS(.ipa) 只能在 macOS + Xcode 上构建**。
> 本目录所有配置已就绪，你只需在 Mac 上按下面步骤做。**需要 Apple 开发者账号**做签名。

## 当前已完成配置

| 项 | 文件 | 说明 |
|---|---|---|
| 平台标识 | `src-tauri/tauri.conf.json` → `identifier: com.dxcool.museaudio` | 双端共用 bundle id |
| macOS 图标 | `src-tauri/icons/icon.icns` | 已从 `icon.svg` 生成 |
| iOS 图标 | `bundle.icon` 里的 `.icns`/png | Tauri 自动转 AppIcon 集 |
| macOS 签名 | `bundle.macOS.signingIdentity`(运行时指定) + `entitlements.macos.plist` | App Sandbox + 网络客户端 |
| macOS 最低版本 | `bundle.macOS.minimumSystemVersion = 10.15` | |
| macOS 常驻内存 | `hardenedRuntime = true` | 需配合签名 |
| macOS DMG | `bundle.macOS.dmg.windowSize 660x420` | |
| iOS 最低版本 | `bundle.iOS.minimumSystemVersion = 14.0` | |
| iOS 后台音频 | `src-tauri/Info.ios.plist` → `UIBackgroundModes: audio` | 音乐 App 后台播放必需 |
| iOS 明文 HTTP | `Info.ios.plist` → `NSAllowsArbitraryLoads = true` | 放行 `http://dxcool.cn:3001` |
| 构建脚本 | `npm run build:mac` / `npm run build:ios` | package.json |

## 你需要做的（在 Mac 上）

### 0. 环境
- macOS（Intel 或 Apple Silicon 均可）
- 安装 [Xcode](https://apps.apple.com/us/app/xcode/)（从 App Store）并 `xcode-select --install`
- 安装 Node + npm + Rust（`tauri` 命令可用，本工程已装 `@tauri-apps/cli`）
- **Apple Developer Program 会员**（$99/年）才能真机/上架签名

### 1. 首次初始化苹果工程（只需一次）
在 `src-tauri` 目录下的项目根执行：
```bash
npm run tauri:macos:init   # 生成 src-tauri/gen/apple 的 macOS 工程
npm run tauri:ios:init     # 生成 iOS 工程
```
> 生成前会确认 bundle id（`com.dxcool.museaudio`）。生成后可改用 Xcode 打开 `gen/apple/<product>.xcodeproj`。
> native-audio 插件的 iOS Swift 包通过其 `build.rs` 中的 `.ios_path("ios")` 自动被发现并链接，`tauri ios init` 会自动处理。

### 2. 构建 macOS（未签名/本地签名）
```bash
npm run build:mac
```
生成目录：`src-tauri/target/universal-apple-darwin/release/bundle/`
- `muse-audio.app` 与 `muse-audio_0.1.0_universal.dmg`

本地跑通可先不设签名看效果；发布才需要按第 4 步签名。

### 3. 构建 iOS（模拟器/真机调试）
```bash
# 模拟器
npm run build:ios -- -- --ios-target=aarch64-apple-ios-sim --debug
# 或直接用 Xcode 打开 gen/apple 工程，选 iPhone 模拟器点 Run
```

### 4. 签名

#### macOS（Developer ID + 公证）
1. 在 [Apple Developer](https://developer.apple.com/account) 申请 **Developer ID Application** 证书（需开启 2FA）。
2. 设置签名身份并构建：
   ```bash
   export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)"
   npm run build:mac
   ```
3. 公证（Tauri 用 `providerShortName`）；`tauri.conf.json` 有 `bundle.macOS.providerShortName`，填你的 TeamID 前缀。
4. entitlements 已指向 `entitlements.macos.plist`（App Sandbox + network.client）。

#### iOS（开发/真机）
iOS 签名完全由 Xcode 管理：
1. Xcode → 打开 `gen/apple` 工程 → Signing & Capabilities。
2. 勾选 **Automatically manage signing**，选你的 Team。
3. 选真机 → Run（个人开发者账号首次需在手机 设置→通用→VPN与设备管理 信任）。
4. 发布归档：Product → Archive → Distribute App。

### 5. 常见问题
- **iOS 后台播放被切**：`Info.ios.plist` 已加 `UIBackgroundModes=audio`；还需 App 确实在播放（HTML5 audio 在 WKWebView 后台可能受限，若不行需用原生音频通道）。
- **HTTP 被拦**：已设 `NSAllowsArbitraryLoads=true` 放行 `dxcool.cn:3001`（明文 HTTP）。上架评审可能要求改用 HTTPS，建议后端加 TLS。
- **`tauri ios init` 找不到 Xcode**：确认已装 Xcode 并运行 `xcode-select --install`。
- **重新打包需刷新 web 资源**：先 `npm run build:tauri` 让 `src-tauri/embedded` 更新，再构建。
