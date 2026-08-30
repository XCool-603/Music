# MUSE.AUDIO 鸿蒙(HarmonyOS NEXT)打包指南

> 重要：本工程是 **DevEco Studio(HarmonyOS NEXT) 工程模板**，包含 ArkWeb WebView 壳 + 已部署的 web 资源。
> 打包 HAP **必须**在装有 DevEco Studio 的电脑上进行，并需要**华为开发者实名账号**做签名（签名无法在本机/纯命令行代办）。

---

## 一、环境要求

| 项 | 要求 |
|---|---|
| DevEco Studio | 5.x（HarmonyOS NEXT / API 12 及以上） |
| HarmonyOS SDK | 随 DevEco 安装（API 12+） |
| 系统 | Windows / macOS 均可 |
| 账号 | 华为开发者账号（已实名认证，用于签名）；如需真机测试，手机需登录你的华为账号 |
| 真机 | HarmonyOS NEXT 手机（用 USB 连接 + 开启「开发者模式-USB调试」） |

---

## 二、安装 DevEco Studio

1. 到 [华为开发者官网](https://developer.huawei.com/consumer/cn/deveco-studio) 下载并安装 **DevEco Studio 5.x**。
2. 首次启动按向导：
   - 选择 **HarmonyOS**（不是 OpenHarmony）。
   - 自动/手动安装 **HarmonyOS SDK**（勾选 API 12 或更高）。
   - 登录**华为开发者账号**。
3. 命令行工具路径（供脚本用，非必须）：
   - `hvigorw` / `ohpm` 在 DevEco 安装目录的 `tools` 下（如 `C:\Program Files\Huawei\DevEco Studio\tools\hvigor\bin`）。

---

## 三、打开本工程

1. 用 DevEco Studio 打开项目，目录选：
   ```
   C:\Work\muse-app\harmonyos
   ```
   注意：是 `harmonyos` 这一层（里面有 `build-profile.json5`）。
2. 首次打开等待 **Sync（同步）** 完成，会下载依赖并生成 `.hvigor` 等本地缓存。

---

## 四、（可选）更新 web 资源

前端改动后，把最新 `dist/` 部署进 rawfile（在本仓库根目录用命令行）：

```bash
npm run harmony:web
```

它会执行 `vite build` 并复制到 `harmonyos/entry/src/main/resources/rawfile/www/`。

> 若想重新生成鸿蒙图标：
> ```bash
> npm run harmony:icons
> ```

---

## 五、打调试包（可装真机预览，无需上架 Profile）

DevEco 里：
1. 顶部 **File → Project Structure → Signing Configs**
2. 勾选 **Automatically generate signature**（自动签名，会要求登录华为账号并让你选/建调试证书与 Profile）。
3. `Apply` → `OK` → 重新 Sync。
4. 打开 `entry` 模块 → 点 **Run ▶** 选择真机，直接安装运行（会生成 debug 签名 HAP）。
5. 单独产出 HAP 文件：**Build → Build Hap(s)/APP(s) → Build Hap(s)**，产物在：
   ```
   harmonyos/entry/build/default/outputs/default/entry-default-signed.hap
   ```

---

## 六、打正式签名包

正式包需一套 **release 证书 + 发布 Profile**，在 [AppGallery Connect](https://developer.huawei.com/consumer/cn/service/josp/agc/index.html) 创建：

1. 在 AGC 创建应用（包名 = `com.muse.audio`，即 `AppScope/app.json5` 里的 `bundleName`）。
2. 生成并下载 `*.cer` 证书 + 发布 `.p7b` Profile。
3. DevEco：**File → Project Structure → Signing Configs**，取消自动签名，手动填入：
   - `Store file`（.p12 密钥库）、`Store password`、`Key alias`、`Key password`
   - 勾选 `Release`，选证书 `.cer` 与 Profile `.p7b`
4. **Build → Build Hap(s)/APP(s) → Build Hap(s)**（Release）→ 产物：
   ```
   harmonyos/entry/build/default/outputs/default/entry-default-signed.hap
   ```
5. 发布：此 HAP 可上传 AGC 上架，或签名后直装真机。

---

## 七、真机安装

- 调试包：用 DevEco **Run** 直接装。
- 已签名 HAP：真机连 USB 后，用命令行
  ```
  hdc install <path>\entry-default-signed.hap
  ```
  （`hdc` 在 DevEco SDK 的 toolchains 下，需把设备切到「允许安装」并登录同一华为账号。）

---

## 八、常见坑

- **web 资源没更新**：改前端后必须跑 `npm run harmony:web` 再重新 Build Hap，否则还是旧页面。
- **接口连不上**：App 已配置走 `http://dxcool.cn:3001`（明文 HTTP）。HarmonyOS NEXT 的 ArkWeb 对明文 HTTP 有安全限制，若请求被拦，需将 API 迁移到 **HTTPS**，或在工程里配置 Web 组件的网络放行（见下方说明）。
- **权限**：`module.json5` 已含 `ohos.permission.INTERNET`。音频播放如需后台，还需后续配置 `backgroundTask` / 媒体会话能力（HarmonyOS 音频后台限制较严，纯 Web Audio 在后台可能被挂起）。
- **Service Worker**：rawfile 环境注册 SW 会失败，但代码已 `.catch()` 兜底，无害。

---

## 九、工程结构速览

```
harmonyos/
├─ build-profile.json5          # 工程级构建配置（模块、目标）
├─ hvigorfile.ts / hvigor/      # hvigor 构建脚本
├─ oh-package.json5
├─ AppScope/
│  ├─ app.json5                 # bundleName=com.muse.audio, 版本号
│  └─ resources/base/media/app_icon.png
└─ entry/
   ├─ build-profile.json5 / hvigorfile.ts / oh-package.json5 / obfuscation-rules.txt
   └─ src/main/
      ├─ module.json5           # 入口 Ability + INTERNET 权限 + 图标/标签
      ├─ ets/
      │  ├─ entryability/EntryAbility.ets   # 能力入口，加载 pages/Index
      │  └─ pages/Index.ets                 # ArkWeb WebView 壳，加载 rawfile/www
      └─ resources/
         ├─ base/{element,media,profile}    # 文案/颜色/图标/页面路由
         └─ rawfile/www/                    # 前端 web 构建产物（由 npm run harmony:web 部署）
```
