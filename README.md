# MUSE.AUDIO — 多端自适应 Hi-Fi 音乐播放器

支持桌面端、平板与移动端多端自适应的高保真音乐播放器，全面兼容洛雪音乐 (LX Music) 自定义音源 JS 脚本导入、高品质音乐/歌词/封面一键下载、实时音频流与动态歌词解析，具备实时频谱可视化、LRC 动态同步歌词、10段专业 DSP/EQ 均衡器与播放列表管理功能。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript 5.8 |
| 路由 | react-router-dom v7 (HashRouter) |
| 样式 | Tailwind CSS 4 + Lucide React 图标 |
| 构建 | Vite 6 |
| 桌面端 | Tauri 2 (Rust) — Windows/macOS/Linux |
| 移动端 | Capacitor 8 — Android/iOS |
| 鸿蒙 | ArkWeb WebView 壳 — HarmonyOS NEXT |
| 后端 API | .NET 8 (C#) — 音乐搜索/流媒体代理 |
| AI | Google Gemini API (`@google/genai`) |
| 动画 | Motion (Framer Motion) |
| 音频 DSP | Web Audio API — 10/15段 EQ + 3D 环绕 + 压缩器 |

---

## 项目结构

```
muse-app/
├── src/                          # 前端 React 源码
│   ├── main.tsx                  # 入口，HashRouter 挂载
│   ├── App.tsx                   # 根组件，全局状态管理中心
│   ├── types.ts                  # 全部 TypeScript 类型定义
│   ├── index.css                 # 全局样式
│   ├── components/               # UI 组件 (20个)
│   │   ├── BottomPlayerBar.tsx    # 底部播放控制栏
│   │   ├── FullScreenPlayer.tsx   # 全屏沉浸式播放器
│   │   ├── Sidebar.tsx            # 桌面端侧边栏导航
│   │   ├── Header.tsx             # 顶部搜索/导航栏
│   │   ├── MobileBottomNav.tsx    # 移动端底部导航
│   │   ├── DiscoverView.tsx       # 发现页（首页）
│   │   ├── SearchView.tsx         # 搜索页
│   │   ├── LibraryView.tsx        # 音乐库页
│   │   ├── PlaylistDetailView.tsx # 歌单详情页
│   │   ├── MyView.tsx             # 个人中心页
│   │   ├── LyricsView.tsx         # LRC 歌词展示
│   │   ├── VisualizerCanvas.tsx   # 实时频谱可视化 (Canvas)
│   │   ├── EqualizerModal.tsx     # 10/15段 EQ 均衡器弹窗
│   │   ├── QueueDrawer.tsx        # 播放队列抽屉
│   │   ├── SleepTimerModal.tsx    # 睡眠定时器
│   │   ├── PlaylistModal.tsx      # 歌单创建/添加弹窗
│   │   ├── DownloadModal.tsx      # 下载弹窗
│   │   ├── DownloadToastNotification.tsx  # 下载通知
│   │   ├── SourceScriptManagerView.tsx    # 自定义音源脚本管理
│   │   ├── LocalFileImporter.tsx  # 本地文件导入
│   │   └── ImageWithFallback.tsx  # 图片加载兜底组件
│   ├── utils/                    # 工具模块 (7个)
│   │   ├── audioEngine.ts         # 核心音频引擎 (Web Audio API + DSP)
│   │   ├── sourceScriptEngine.ts  # 洛雪音乐音源脚本引擎
│   │   ├── apiBase.ts             # API 地址解析
│   │   ├── downloadManager.ts     # 下载管理器
│   │   ├── lyricsParser.ts        # LRC 歌词解析器
│   │   ├── nativeAudio.ts         # iOS 原生音频桥接 (AVPlayer)
│   │   └── imageUtils.ts          # 图片工具
│   └── data/                     # 静态数据
│       ├── discoveryData.ts
│       └── musicData.ts
│
├── src-tauri/                    # Tauri 2 桌面/移动端原生壳
│   ├── tauri.conf.json           # Tauri 配置
│   ├── src/main.rs               # Rust 入口
│   ├── src/lib.rs                 # Rust 核心逻辑 + Tauri Commands
│   ├── src/webserver.rs           # 移动端内嵌 Web 服务器
│   ├── embedded/                  # 内嵌前端资源
│   ├── plugins/
│   │   ├── native-audio/          # 原生音频插件 (iOS AVPlayer)
│   │   └── keepawake/            # 屏幕常亮/后台播放插件
│   └── gen/android/              # Android 生成工程
│
├── background/Muse.Audio.Api/     # .NET 8 后端 API
│   ├── Program.cs                 # 服务入口 (端口 3001)
│   ├── Controllers/
│   │   ├── MusicController.cs     # 音乐搜索/流媒体/歌词 API
│   │   ├── DiscoveryController.cs # 发现页数据 API
│   │   └── ProxyController.cs     # 代理 API
│   ├── Services/
│   │   ├── MusicService.cs        # 音乐搜索与流媒体核心服务
│   │   ├── ProxyService.cs        # 代理服务
│   │   └── TracksData.cs          # 曲目数据
│   └── Models/MusicModels.cs      # 数据模型
│
├── harmonyos/                    # 鸿蒙 (HarmonyOS NEXT) 工程
│   ├── AppScope/                 # 应用配置
│   └── entry/                    # 入口模块 (ArkWeb WebView)
│
├── .github/workflows/            # CI/CD 工作流 (6个平台)
├── docs/apple-build.md           # Apple 平台构建指南
├── harmonyos/BUILD.md            # 鸿蒙构建指南
├── Dockerfile                    # Docker 构建 (Android APK)
├── capacitor.config.ts           # Capacitor 配置
├── vite.config.ts                # Vite 构建配置
└── package.json                  # 项目配置与依赖
```

---

## 核心架构

### 前端状态管理

采用 React 原生 `useState` + `useRef` + `useCallback` 组合模式，全局状态集中在 `App.tsx` 中管理：

- **音频状态**：`currentTrack`, `isPlaying`, `currentTime`, `duration`, `volume`, `playbackMode`, `queue`
- **音频 DSP 设置**：`audioSettings` (EQ均衡器、3D环绕、电子管温暖度、压缩器)
- **数据状态**：`tracks`, `playlists`, `favorites`, `recentHistory`
- **自定义音源**：`customScripts` (洛雪音乐兼容脚本)

### 路由设计

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | DiscoverView | 发现页（首页） |
| `/search` | SearchView | 搜索页 |
| `/sources` | SourceScriptManagerView | 音源脚本管理 |
| `/playlist/:id` | PlaylistDetailView | 歌单详情 |
| `/library` | LibraryView | 音乐库 |
| `/favorites` | LibraryView | 收藏列表 |
| `/local` | LocalFileImporter | 本地文件导入 |
| `/mine` | MyView | 个人中心 |

### 音频引擎 (audioEngine.ts)

基于 Web Audio API 构建的专业 DSP 处理链：

- 10段/15段参数均衡器 (31Hz-16kHz)
- 3D 环绕声 (Studio/Hall/Club/Wide)
- 模拟电子管谐波饱和
- 母带动态峰值压缩器
- 立体声宽度调节 (0-200%)
- A/B 对比旁路切换
- 播放速度 0.5x-2.0x
- 双模式播放 (HTML5 Audio / iOS AVPlayer)

### 音源脚本引擎 (sourceScriptEngine.ts)

兼容洛雪音乐 (LX Music) 自定义音源 JS 脚本系统：

- 动态加载和执行 JS 音源脚本
- 内置两套默认脚本：开放公共音源扩展 + 极简 Lo-Fi 音源
- 多音源搜索聚合（网易、QQ、酷我、环境音等）
- 音频 URL 解析、歌词获取、封面获取

### 后端 API

.NET 8 后端，默认部署在 `http://dxcool.cn:3001`：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/discovery` | GET | 发现页数据 |
| `/api/music/search` | GET | 音乐搜索 |
| `/api/music/stream` | GET | 音频流代理 |
| `/api/music/stream-url` | GET | 直链 URL 解析 |
| `/api/music/lyric` | GET | 歌词获取 |
| `/api/music/pic` | GET | 封面获取 |

---

## 多平台适配

| 平台 | 技术方案 | 关键特性 |
|------|---------|---------|
| Web/PWA | Vite + React | 响应式布局、PWA 离线、百度统计 |
| Windows | Tauri 2 (MSVC) | NSIS/MSI 安装包、WebView2 |
| macOS | Tauri 2 (Universal) | .app/.dmg、Hardened Runtime |
| Linux | Tauri 2 (x86_64) | AppImage/deb 包 |
| Android | Tauri 2 + Capacitor | APK、前台媒体服务、后台播放 |
| iOS | Tauri 2 + 原生 AVPlayer | 后台音频、锁屏控制、Now Playing |
| HarmonyOS | ArkWeb WebView 壳 | DevEco Studio、HAP 打包 |

---

## 本地开发

**前置要求：** Node.js

```bash
# 安装依赖
npm install

# 配置 Gemini API Key
# 在 .env.local 中设置 GEMINI_API_KEY

# 启动开发服务器
npm run dev
```

开发服务器默认运行在 `http://localhost:3000`，API 请求自动代理到 `http://dxcool.cn:3001`。

---

## 构建命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 本地开发 |
| `npm run build:frontend` | 前端构建 |
| `npm run build:win` | Windows 桌面端构建 |
| `npm run build:mac` | macOS 桌面端构建 |
| `npm run build:linux` | Linux 桌面端构建 |
| `npm run build:android` | Android 构建 |
| `npm run build:ios` | iOS 构建 |
| `npm run harmony:web` | 鸿蒙 Web 资源部署 |
| `npm run lint` | TypeScript 类型检查 |

---

## CI/CD

项目通过 GitHub Actions 实现六大平台的自动化构建：

- [build-windows.yml](.github/workflows/build-windows.yml)
- [build-macos.yml](.github/workflows/build-macos.yml)
- [build-linux.yml](.github/workflows/build-linux.yml)
- [build-android.yml](.github/workflows/build-android.yml)
- [build-ios.yml](.github/workflows/build-ios.yml)
- [build-harmony.yml](.github/workflows/build-harmony.yml)

---

## 平台构建指南

- [Apple (macOS/iOS) 构建与签名指南](docs/apple-build.md)
- [HarmonyOS NEXT 打包指南](harmonyos/BUILD.md)

---

## 功能特性

- 实时频谱可视化 (柱状/波形/圆形/霓虹四种模式)
- LRC 动态同步歌词 (支持翻译)
- 10段/15段专业参数均衡器 (31Hz-16kHz)
- 3D 环绕声 / 电子管温暖度 / 压缩器
- 播放列表管理 (创建/编辑/收藏)
- 高品质音乐/歌词/封面下载
- 洛雪音乐 (LX Music) 自定义音源脚本兼容
- 本地音频文件导入播放
- 睡眠定时器
- 键盘快捷键 (空格播放/暂停, 方向键快进快退/音量, M静音, F全屏)
- 移动端边缘滑动返回手势
- 屏幕常亮 (播放时防止锁屏)
- iOS 后台音频播放 (原生 AVPlayer)
- PWA 离线支持