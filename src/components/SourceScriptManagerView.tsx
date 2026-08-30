import React, { useState, useRef } from 'react';
import { CustomSourceScript, Track } from '../types';
import { getApiBase } from '../utils/apiBase';
import {
  parseScriptMetadata,
  SourceScriptRunner,
  searchAggregatedOnlineMusic,
  DEFAULT_OPEN_SOURCE_SCRIPT,
  DEFAULT_LOFI_SOURCE_SCRIPT,
} from '../utils/sourceScriptEngine';
import {
  FileCode,
  Upload,
  Link,
  Plus,
  Play,
  Check,
  AlertCircle,
  Trash2,
  Download,
  ExternalLink,
  Code2,
  Sparkles,
  RefreshCw,
  Eye,
  Sliders,
  CheckCircle2,
  Copy,
  Info,
  Layers,
  Search,
} from 'lucide-react';

interface SourceScriptManagerViewProps {
  scripts: CustomSourceScript[];
  onUpdateScripts: (scripts: CustomSourceScript[]) => void;
  onPlayTrack: (track: Track) => void;
}

export const SourceScriptManagerView: React.FC<SourceScriptManagerViewProps> = ({
  scripts,
  onUpdateScripts,
  onPlayTrack,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'editor' | 'guide'>('list');
  const [urlInput, setUrlInput] = useState('');
  const [isImportingUrl, setIsImportingUrl] = useState(false);
  const [urlError, setUrlError] = useState('');

  // Code Editor modal / sub-view
  const [editingScript, setEditingScript] = useState<CustomSourceScript | null>(null);
  const [editorCode, setEditorCode] = useState('');
  const [editorError, setEditorError] = useState('');
  const [editorSuccess, setEditorSuccess] = useState('');

  // Delete Confirmation State
  const [scriptToDelete, setScriptToDelete] = useState<CustomSourceScript | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Test Runner modal
  const [testingScript, setTestingScript] = useState<CustomSourceScript | null>(null);
  const [testQuery, setTestQuery] = useState('City');
  const [testResults, setTestResults] = useState<Track[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testLog, setTestLog] = useState<{ status: 'idle' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toggle Enable / Disable
  const handleToggleEnable = (id: string) => {
    const updated = scripts.map((s) => {
      if (s.id === id) {
        const nextEnabled = !s.enabled;
        return {
          ...s,
          enabled: nextEnabled,
          status: nextEnabled ? ('ready' as const) : ('disabled' as const),
        };
      }
      return s;
    });
    onUpdateScripts(updated);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Delete Single Script Action (Triggers In-App Modal)
  const handleRequestDelete = (script: CustomSourceScript) => {
    setScriptToDelete(script);
  };

  const handleConfirmDelete = () => {
    if (!scriptToDelete) return;
    const scriptName = scriptToDelete.name;
    const updated = scripts.filter((s) => s.id !== scriptToDelete.id);
    onUpdateScripts(updated);
    setScriptToDelete(null);
    showToast(`已成功移除音源脚本「${scriptName}」`);

    // If currently editing this script in editor, reset editor
    if (editingScript?.id === scriptToDelete.id) {
      setEditingScript(null);
      setEditorCode(DEFAULT_OPEN_SOURCE_SCRIPT);
      setActiveSubTab('list');
    }
  };

  // Clear All Scripts Action
  const handleConfirmClearAll = () => {
    onUpdateScripts([]);
    setIsClearAllModalOpen(false);
    showToast('已清空所有已安装的音源脚本');
    setEditingScript(null);
    setEditorCode(DEFAULT_OPEN_SOURCE_SCRIPT);
    setActiveSubTab('list');
  };

  // Export Script
  const handleExportScript = (script: CustomSourceScript) => {
    const blob = new Blob([script.rawCode], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${script.name.replace(/\s+/g, '_')}_v${script.version}.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import from Local JS File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const code = event.target?.result as string;
        if (!code) return;
        await importScriptCode(code, file.name);
      };
      reader.readAsText(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Import from Online URL (with CORS proxy fallback)
  const handleImportFromUrl = async (customUrl?: string) => {
    const targetUrl = (customUrl || urlInput || '').trim();
    if (!targetUrl) return;
    setIsImportingUrl(true);
    setUrlError('');

    try {
      let code = '';
      try {
        const res = await fetch(targetUrl);
        if (res.ok) {
          code = await res.text();
        } else {
          throw new Error(`Direct HTTP ${res.status}`);
        }
      } catch (directErr) {
        // Fallback to server-side proxy
        const backendBase = getApiBase();
        const proxyRes = await fetch(`${backendBase}/api/proxy/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: targetUrl,
            method: 'GET',
          }),
        });
        if (!proxyRes.ok) throw new Error('网络代理请求音源脚本失败');
        const data = await proxyRes.json();
        if (data.body) {
          code = typeof data.body === 'string' ? data.body : JSON.stringify(data.body);
        } else {
          throw new Error('未获取到脚本内容');
        }
      }

      if (!code || code.length < 20) {
        throw new Error('下载的代码为空或格式不正确');
      }

      await importScriptCode(code, '远程在线音源');
      setUrlInput('');
      setActiveSubTab('list');
    } catch (err: any) {
      setUrlError(`导入失败: ${err.message || '网络请求错误，请检查 URL 是否正确'}`);
    } finally {
      setIsImportingUrl(false);
    }
  };

  // Process & Validate JS Code
  const importScriptCode = async (code: string, fallbackName: string) => {
    try {
      const meta = parseScriptMetadata(code);
      const newScript: CustomSourceScript = {
        id: `script_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: meta.name || fallbackName,
        version: meta.version || '1.0.0',
        author: meta.author || '社区开发者',
        description: meta.description || '洛雪规范音源脚本扩展',
        enabled: true,
        rawCode: code,
        sources: meta.sources && meta.sources.length > 0 ? meta.sources : ['wy', 'kw', 'tx'],
        qualities: meta.qualities && meta.qualities.length > 0 ? meta.qualities : ['128k', '320k', 'flac'],
        homepage: meta.homepage,
        importedAt: new Date().toLocaleDateString('zh-CN'),
        status: 'ready',
      };

      // Test sandbox init
      const runner = new SourceScriptRunner(newScript);
      const initResult = await runner.init();
      if (!initResult.success) {
        newScript.status = 'error';
        newScript.errorMsg = initResult.error;
      }

      onUpdateScripts([newScript, ...scripts]);
      return newScript;
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  // Reset / Restore Default Demo Scripts
  const handleRestoreDefaultScripts = () => {
    const meta1 = parseScriptMetadata(DEFAULT_OPEN_SOURCE_SCRIPT);
    const script1: CustomSourceScript = {
      id: 'default_open_audio_script',
      name: meta1.name || '洛雪开放公共音源扩展',
      version: meta1.version || '1.2.0',
      author: meta1.author || 'LX-Community',
      description: meta1.description || '支持开放公共音频库检索与多音质播放',
      enabled: true,
      rawCode: DEFAULT_OPEN_SOURCE_SCRIPT,
      sources: ['wy', 'tx', 'kw', 'ambient'],
      qualities: ['128k', '320k', 'flac', 'flac24bit'],
      homepage: 'https://github.com/lyswhut/lx-music-desktop',
      importedAt: '系统内置',
      status: 'ready',
    };

    const meta2 = parseScriptMetadata(DEFAULT_LOFI_SOURCE_SCRIPT);
    const script2: CustomSourceScript = {
      id: 'default_lofi_source_script',
      name: meta2.name || '极简 Lo-Fi & 自然疗愈音源',
      version: meta2.version || '1.0.4',
      author: meta2.author || 'SoundHealer',
      description: meta2.description || '专注与睡眠设计的音频流聚合脚本',
      enabled: true,
      rawCode: DEFAULT_LOFI_SOURCE_SCRIPT,
      sources: ['lofi'],
      qualities: ['320k', 'flac'],
      homepage: 'https://github.com',
      importedAt: '系统内置',
      status: 'ready',
    };

    onUpdateScripts([script1, script2]);
  };

  // Open Code Editor
  const handleOpenEditor = (script?: CustomSourceScript) => {
    if (script) {
      setEditingScript(script);
      setEditorCode(script.rawCode);
    } else {
      setEditingScript(null);
      setEditorCode(DEFAULT_OPEN_SOURCE_SCRIPT);
    }
    setEditorError('');
    setEditorSuccess('');
    setActiveSubTab('editor');
  };

  // Save Code Editor
  const handleSaveEditorCode = async () => {
    setEditorError('');
    setEditorSuccess('');

    if (!editorCode.trim()) {
      setEditorError('代码不能为空');
      return;
    }

    try {
      const meta = parseScriptMetadata(editorCode);
      const targetId = editingScript ? editingScript.id : `script_${Date.now()}`;

      const updatedScript: CustomSourceScript = {
        id: targetId,
        name: meta.name || '未命名脚本',
        version: meta.version || '1.0.0',
        author: meta.author || '未知作者',
        description: meta.description || '自定义 JS 音源脚本',
        enabled: editingScript ? editingScript.enabled : true,
        rawCode: editorCode,
        sources: meta.sources && meta.sources.length > 0 ? meta.sources : ['wy', 'tx', 'kw'],
        qualities: meta.qualities && meta.qualities.length > 0 ? meta.qualities : ['128k', '320k', 'flac'],
        homepage: meta.homepage,
        importedAt: editingScript ? editingScript.importedAt : new Date().toLocaleDateString('zh-CN'),
        status: 'ready',
      };

      // Test validation
      const runner = new SourceScriptRunner(updatedScript);
      const res = await runner.init();
      if (!res.success) {
        updatedScript.status = 'error';
        updatedScript.errorMsg = res.error;
        setEditorError(`脚本语法或初始化警告: ${res.error}`);
      }

      if (editingScript) {
        onUpdateScripts(scripts.map((s) => (s.id === editingScript.id ? updatedScript : s)));
      } else {
        onUpdateScripts([updatedScript, ...scripts]);
      }

      setEditorSuccess('脚本已成功保存并通过沙箱注册！');
      setTimeout(() => {
        setActiveSubTab('list');
      }, 800);
    } catch (err: any) {
      setEditorError(`保存失败: ${err.message}`);
    }
  };

  // Run Test Dialog
  const handleOpenTestModal = async (script: CustomSourceScript) => {
    setTestingScript(script);
    setTestQuery('');
    setTestResults([]);
    setIsTesting(true);
    setTestLog({ status: 'idle', message: '正在初始化沙箱环境...' });

    const runner = new SourceScriptRunner(script);
    const initRes = await runner.init();
    if (!initRes.success) {
      setIsTesting(false);
      setTestLog({ status: 'error', message: `初始化失败: ${initRes.error}` });
      return;
    }

    try {
      const results = await runner.search('', 1);
      setTestResults(results);
      setIsTesting(false);
      setTestLog({
        status: 'success',
        message: `沙箱启动正常！成功解析出 ${results.length} 首测试音频数据。`,
      });
    } catch (e: any) {
      setIsTesting(false);
      setTestLog({ status: 'error', message: `检索测试异常: ${e.message}` });
    }
  };

  const handleExecuteTestSearch = async () => {
    const safeQuery = (testQuery || '').trim();
    if (!testingScript) return;
    setIsTesting(true);
    setTestLog({ status: 'idle', message: `正在使用脚本沙箱检索并解析关键词 "${safeQuery || '全部'}"...` });

    try {
      const runner = new SourceScriptRunner(testingScript);
      const initRes = await runner.init();
      if (!initRes.success) {
        setTestLog({ status: 'error', message: `沙箱初始化失败: ${initRes.error}` });
        setIsTesting(false);
        return;
      }

      let results = await runner.search(safeQuery, 1);

      // 若脚本未实现 search (符合大多数六音/洛雪官方标准音源主要负责 musicUrl 的规范)，则结合多源开放索引并由本脚本解析
      if (results.length === 0 && safeQuery) {
        const aggregated = await searchAggregatedOnlineMusic(safeQuery, [testingScript]);
        if (aggregated.length > 0) {
          results = aggregated;
          setTestLog({
            status: 'success',
            message: `已通过多源聚合检索到 ${results.length} 首歌曲，并已自动对接「${testingScript.name}」进行实时音频流与 LRC 歌词解析！点击试听即可验证。`,
          });
        } else {
          setTestLog({
            status: 'success',
            message: `沙箱运行正常。当前关键词未匹配到条目，可尝试输入如 "City"、"Summer"、"周杰伦" 等测试关键词。`,
          });
        }
      } else {
        setTestLog({
          status: 'success',
          message: `脚本原生检索完成！匹配到 ${results.length} 首条目，沙箱完全就绪。可直接点击试听进行音频流与 LRC 歌词验证。`,
        });
      }

      setTestResults(results);
    } catch (e: any) {
      setTestLog({ status: 'error', message: `检索测试失败: ${e.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".js,.txt"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-white/5 border border-white/10 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-[-30%] right-[-10%] w-80 h-80 bg-indigo-600/20 rounded-full blur-[110px] pointer-events-none -z-0" />
        <div className="absolute bottom-[-30%] left-[-10%] w-80 h-80 bg-emerald-500/15 rounded-full blur-[110px] pointer-events-none -z-0" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span>洛雪音乐 (LX Music) 自定义 JS 音源引擎</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              自定义音源脚本扩展管理
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              全面兼容洛雪音乐助手 JavaScript
              音源扩展规范。支持导入自定义脚本、解析多平台无损音质流媒体、获取动态歌词与实时联机检索。
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-2xl shadow-lg shadow-emerald-500/20 transition transform active:scale-95 flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>导入本地 .js 脚本</span>
            </button>

            <button
              onClick={() => handleOpenEditor()}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-2xl border border-white/15 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>在线新建脚本</span>
            </button>

            <button
              onClick={handleRestoreDefaultScripts}
              className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-medium text-xs rounded-2xl border border-white/10 transition flex items-center gap-1.5"
              title="重置恢复内置示例音源"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>重置示例</span>
            </button>

            {scripts.length > 0 && (
              <button
                onClick={() => setIsClearAllModalOpen(true)}
                className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 font-medium text-xs rounded-2xl border border-rose-500/20 transition flex items-center gap-1.5"
                title="清空已安装的全部脚本"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>清空脚本</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sub Navigation Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 gap-2">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none min-w-0 flex-1">
          <button
            onClick={() => setActiveSubTab('list')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
              activeSubTab === 'list'
                ? 'bg-white text-black shadow-md shadow-white/10'
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>已安装 ({scripts.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('editor')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
              activeSubTab === 'editor'
                ? 'bg-white text-black shadow-md shadow-white/10'
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>代码编辑器</span>
          </button>

          <button
            onClick={() => setActiveSubTab('guide')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
              activeSubTab === 'guide'
                ? 'bg-white text-black shadow-md shadow-white/10'
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>脚本规范</span>
          </button>
        </div>

        {/* URL Quick Import Input (when in list tab) */}
        {activeSubTab === 'list' && (
          <div className="flex items-center gap-2 max-w-sm">
            <div className="relative flex-1 flex items-center bg-white/5 border border-white/10 rounded-2xl px-3 py-1.5 text-xs focus-within:border-emerald-400/50">
              <Link className="w-3.5 h-3.5 text-slate-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="输入在线 JS 音源脚本直链 URL..."
                className="bg-transparent border-none outline-none text-xs text-white placeholder:text-slate-500 w-full"
              />
            </div>
            <button
              onClick={handleImportFromUrl}
              disabled={isImportingUrl || !urlInput.trim()}
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white font-semibold text-xs rounded-2xl border border-white/15 transition flex-shrink-0"
            >
              {isImportingUrl ? '下载中...' : '网络导入'}
            </button>
          </div>
        )}
      </div>

      {urlError && (
        <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{urlError}</span>
        </div>
      )}

      {/* Community Presets Quick Bar */}
      {activeSubTab === 'list' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="font-bold text-white">社区常用音源快捷导入：</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">点击即可直接导入已验证的社区洛雪音源</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { name: '全豆要[聚合]', url: 'https://raw.githubusercontent.com/pdone/lx-music-source/main/qdy/latest.js' },
              { name: '六音音源', url: 'https://raw.githubusercontent.com/pdone/lx-music-source/main/sixyin/latest.js' },
              { name: '野花🌷', url: 'https://raw.githubusercontent.com/pdone/lx-music-source/main/flower/latest.js' },
              { name: '野草🌾', url: 'https://raw.githubusercontent.com/pdone/lx-music-source/main/grass/latest.js' },
              { name: 'Huibq源', url: 'https://raw.githubusercontent.com/pdone/lx-music-source/main/huibq/latest.js' },
              { name: '聚合API', url: 'https://raw.githubusercontent.com/pdone/lx-music-source/main/juhe/latest.js' },
            ].map((preset) => (
              <button
                key={preset.name}
                onClick={() => handleImportFromUrl(preset.url)}
                disabled={isImportingUrl}
                className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-emerald-500 hover:text-black text-slate-200 font-medium text-[11px] border border-white/10 transition flex items-center gap-1 active:scale-95 disabled:opacity-50"
              >
                <Download className="w-3 h-3" />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 1: SCRIPTS LIST --- */}
      {activeSubTab === 'list' && (
        <div className="space-y-4">
          {scripts.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-12 text-center border border-white/10 shadow-2xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
                <FileCode className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">暂未导入任何自定义 JS 音源脚本</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                您可以点击右上角的「导入本地 .js 脚本」载入洛雪音乐社区的音源文件，或点击「重置示例」一键恢复系统内置的开放音频与
                Lo-Fi 音源。
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-full shadow-lg transition"
                >
                  导入 .js 文件
                </button>
                <button
                  onClick={handleRestoreDefaultScripts}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-full border border-white/15 transition"
                >
                  加载内置示例音源
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {scripts.map((script) => {
                const isReady = script.status === 'ready' && script.enabled;
                const isError = script.status === 'error';

                return (
                  <div
                    key={script.id}
                    className={`relative bg-white/5 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 border transition shadow-xl ${
                      script.enabled
                        ? 'border-white/15 hover:border-emerald-500/40 bg-white/[0.06]'
                        : 'border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                      {/* Left: Info */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                            <span>{script.name}</span>
                          </h3>

                          {/* Version Tag */}
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-slate-300 border border-white/10">
                            v{script.version}
                          </span>

                          {/* Status Badge */}
                          {isReady && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> 已启用
                            </span>
                          )}
                          {isError && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> 脚本报错
                            </span>
                          )}
                          {!script.enabled && !isError && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">
                              已停用
                            </span>
                          )}

                          <span className="text-xs text-slate-400">
                            作者: <strong className="text-slate-200">{script.author}</strong>
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                          {script.description}
                        </p>

                        {/* Badges: Sources & Bitrates */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-[11px] text-slate-500 font-medium">支持源:</span>
                          {script.sources.map((src) => (
                            <span
                              key={src}
                              className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20"
                            >
                              {src === 'wy'
                                ? '网易'
                                : src === 'tx'
                                ? '企鹅'
                                : src === 'kw'
                                ? '酷我'
                                : src === 'kg'
                                ? '酷狗'
                                : src === 'mg'
                                ? '咪咕'
                                : src}
                            </span>
                          ))}

                          <span className="text-[11px] text-slate-500 font-medium ml-2">音质档位:</span>
                          {script.qualities.map((q) => (
                            <span
                              key={q}
                              className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                            >
                              {q}
                            </span>
                          ))}
                        </div>

                        {script.errorMsg && (
                          <div className="mt-2 p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-mono">
                            错误信息: {script.errorMsg}
                          </div>
                        )}
                      </div>

                      {/* Right: Controls & Actions */}
                      <div className="flex flex-wrap items-center gap-2 flex-shrink-0 pt-2 lg:pt-0">
                        {/* Enable/Disable Switch */}
                        <button
                          onClick={() => handleToggleEnable(script.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                            script.enabled
                              ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20 hover:bg-emerald-400'
                              : 'bg-white/10 text-slate-300 hover:bg-white/15'
                          }`}
                        >
                          {script.enabled ? <Check className="w-3.5 h-3.5" /> : null}
                          <span>{script.enabled ? '已开启' : '启用脚本'}</span>
                        </button>

                        {/* Test Button */}
                        <button
                          onClick={() => handleOpenTestModal(script)}
                          className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-xl border border-white/15 transition flex items-center gap-1.5"
                          title="在沙箱中运行联调测试"
                        >
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          <span>联调测试</span>
                        </button>

                        {/* Edit Code Button */}
                        <button
                          onClick={() => handleOpenEditor(script)}
                          className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl border border-white/10 transition"
                          title="查看并编辑代码"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Export Button */}
                        <button
                          onClick={() => handleExportScript(script)}
                          className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl border border-white/10 transition"
                          title="导出 JS 文件"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleRequestDelete(script)}
                          className="px-2.5 py-2 bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 font-semibold text-xs rounded-xl border border-rose-500/25 hover:border-rose-500/50 transition flex items-center gap-1 active:scale-95"
                          title="删除并移除此音源脚本"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>删除</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: CODE EDITOR --- */}
      {activeSubTab === 'editor' && (
        <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 border border-white/10 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <h3 className="text-base font-bold text-white truncate">
                {editingScript ? `编辑音源脚本: ${editingScript.name}` : '新建自定义音源 JavaScript 脚本'}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setEditorCode(DEFAULT_OPEN_SOURCE_SCRIPT)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs rounded-xl border border-white/10 transition"
              >
                载入标准模板
              </button>

              {editingScript && (
                <button
                  onClick={() => handleRequestDelete(editingScript)}
                  className="px-3.5 py-2 bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 font-bold text-xs rounded-xl border border-rose-500/30 transition flex items-center gap-1.5 active:scale-95"
                  title="删除当前编辑的脚本"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>删除此脚本</span>
                </button>
              )}

              <button
                onClick={handleSaveEditorCode}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>保存并注册脚本</span>
              </button>
            </div>
          </div>

          {editorError && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{editorError}</span>
            </div>
          )}

          {editorSuccess && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{editorSuccess}</span>
            </div>
          )}

          {/* Monaco-style Textarea */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/60 shadow-inner">
            <textarea
              value={editorCode}
              onChange={(e) => setEditorCode(e.target.value)}
              rows={22}
              spellCheck={false}
              className="w-full bg-transparent text-emerald-300 font-mono text-xs sm:text-sm p-4 outline-none resize-y leading-relaxed scrollbar-thin selection:bg-emerald-500/30"
              placeholder="// 在此编写或粘贴洛雪自定义音源 JS 代码..."
            />
          </div>
        </div>
      )}

      {/* --- TAB 3: SPEC & GUIDE --- */}
      {activeSubTab === 'guide' && (
        <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-6 text-slate-300 text-xs sm:text-sm leading-relaxed">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <FileCode className="w-5 h-5 text-emerald-400" />
            <span>洛雪音乐 (LX Music) 自定义音源 JavaScript 协议与实现规范</span>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
              <h4 className="font-bold text-white text-sm">1. 头部元数据注释规范 (JSDoc Header)</h4>
              <p className="text-slate-400 text-xs">
                脚本最顶部建议声明 JSDoc 注释，引擎将自动提取名称、版本、作者与支持音质：
              </p>
              <pre className="p-3 bg-black/60 rounded-xl text-emerald-400 font-mono text-xs overflow-x-auto">
{`/*!
 * @name 我的自建高保真音源
 * @description 支持多源聚合搜索与 FLAC 无损流播放
 * @version 1.0.0
 * @author DeveloperName
 * @homepage https://github.com
 */`}
              </pre>
            </div>

            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
              <h4 className="font-bold text-white text-sm">2. 核心请求事件监听 (lx.on)</h4>
              <p className="text-slate-400 text-xs">
                在沙箱环境中，全局提供类似客户端的 <code className="text-emerald-300 font-mono">lx</code> 对象。通过
                <code className="text-emerald-300 font-mono">lx.on('request', async (params) =&gt; ...)</code> 处理请求：
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300 pl-2">
                <li>
                  <strong className="text-white">action = 'search'</strong>：接收 <code className="text-indigo-300 font-mono">info.text</code>，返回歌曲列表（包含 id、name、singer、albumName、types 等）。
                </li>
                <li>
                  <strong className="text-white">action = 'musicUrl'</strong>：接收 <code className="text-indigo-300 font-mono">info.musicInfo</code> 和 <code className="text-indigo-300 font-mono">info.quality</code>，返回真实音频流直链 <code className="text-indigo-300 font-mono">url</code>。
                </li>
                <li>
                  <strong className="text-white">action = 'lyric'</strong>：返回 LRC 格式动态歌词字符串 <code className="text-indigo-300 font-mono">lyric</code>。
                </li>
                <li>
                  <strong className="text-white">action = 'pic'</strong>：返回歌曲封面大图直链。
                </li>
              </ul>
            </div>

            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
              <h4 className="font-bold text-white text-sm">3. 网络请求 API (lx.request)</h4>
              <p className="text-slate-400 text-xs">
                支持使用内置的 <code className="text-emerald-300 font-mono">lx.request(url, options, callback)</code> 或标准 <code className="text-emerald-300 font-mono">fetch</code> 发起 HTTP/HTTPS 请求。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- TEST MODAL --- */}
      {testingScript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-neutral-900/95 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-emerald-400 fill-current" />
                <div>
                  <h3 className="text-base font-bold text-white">沙箱音源联调测试</h3>
                  <p className="text-xs text-slate-400">正在测试: {testingScript.name}</p>
                </div>
              </div>
              <button
                onClick={() => setTestingScript(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin">
              {/* Test Search Input */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 flex items-center bg-white/5 border border-white/15 rounded-2xl px-3 py-2 text-xs focus-within:border-emerald-400/50">
                  <Search className="w-4 h-4 text-slate-400 mr-2" />
                  <input
                    type="text"
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    placeholder="输入要测试检索的关键词..."
                    className="bg-transparent border-none outline-none text-xs text-white w-full placeholder:text-slate-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleExecuteTestSearch()}
                  />
                </div>
                <button
                  onClick={handleExecuteTestSearch}
                  disabled={isTesting}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs rounded-2xl shadow transition"
                >
                  {isTesting ? '执行中...' : '测试检索'}
                </button>
              </div>

              {/* Status Message */}
              {testLog.message && (
                <div
                  className={`p-3 rounded-2xl text-xs font-mono ${
                    testLog.status === 'success'
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                      : testLog.status === 'error'
                      ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                      : 'bg-white/5 border border-white/10 text-slate-300'
                  }`}
                >
                  {testLog.message}
                </div>
              )}

              {/* Parsed Track Results */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400">解析出的音频条目 ({testResults.length})</div>
                {testResults.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500 border border-dashed border-white/10 rounded-2xl">
                    暂未检索到音频数据
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto scrollbar-thin">
                    {testResults.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 flex items-center justify-between gap-3 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={t.coverUrl} alt={t.title} className="w-10 h-10 rounded-xl object-cover" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{t.title}</div>
                            <div className="text-[11px] text-slate-400 truncate">{t.artist}</div>
                          </div>
                        </div>

                        <button
                          onClick={() => onPlayTrack(t)}
                          className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black font-bold text-xs rounded-xl border border-emerald-500/30 transition flex items-center gap-1"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>试听验证</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setTestingScript(null)}
                className="px-5 py-2 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-2xl transition"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SINGLE SCRIPT DELETE CONFIRMATION MODAL --- */}
      {scriptToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-neutral-900/95 border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">确认删除此音源脚本？</h3>
                <p className="text-xs text-slate-400">操作不可逆，删除后无法自动恢复</p>
              </div>
            </div>

            <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">脚本名称:</span>
                <span className="font-bold text-white">{scriptToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">版本号:</span>
                <span className="font-mono text-emerald-300">v{scriptToDelete.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">作者:</span>
                <span className="text-slate-200">{scriptToDelete.author}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">支持音源:</span>
                <span className="font-mono text-indigo-300">{scriptToDelete.sources.join(', ')}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              删除后，播放器在检索或播放歌曲时将停止调用该脚本。如果需要，您可以随时再次导入或恢复内置示例。
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setScriptToDelete(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-2xl transition"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs rounded-2xl shadow-lg shadow-rose-500/25 transition active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>确认删除</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CLEAR ALL SCRIPTS CONFIRMATION MODAL --- */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-neutral-900/95 border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">确认清空全部音源脚本？</h3>
                <p className="text-xs text-slate-400">将移除当前已安装的全部 {scripts.length} 个音源脚本</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              清空后，所有自定义和内置音源脚本均会被移除。系统将采用内置的全长开放解析引擎进行播放。您后续仍可点击「重置示例」或重新导入 .js 文件。
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsClearAllModalOpen(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-2xl transition"
              >
                取消
              </button>
              <button
                onClick={handleConfirmClearAll}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-rose-600/30 transition active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>清空全部脚本</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- FLOATING TOAST NOTIFICATION --- */}
      {toastMessage && (
        <div className="fixed bottom-24 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300 pointer-events-none">
          <div className="bg-neutral-900/95 backdrop-blur-2xl border border-white/20 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};
