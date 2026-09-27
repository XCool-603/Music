import React, { useState } from 'react';
import { Scale, ShieldAlert, FileText, Info, CheckCircle2, Mail, ExternalLink, X } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFirstLaunch?: boolean;
  onAgree?: () => void;
}

type TabType = 'disclaimer' | 'terms' | 'copyright' | 'about';

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  isFirstLaunch = false,
  onAgree,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('disclaimer');
  const [hasAgreed, setHasAgreed] = useState(false);

  if (!isOpen) return null;

  const handleAgreeAndContinue = () => {
    try {
      localStorage.setItem('muse_legal_agreed', 'true');
    } catch {
      // Ignore localStorage error
    }
    if (onAgree) onAgree();
    onClose();
  };

  const handleDecline = () => {
    alert('由于您未同意法律声明与免责条款，本软件无法继续运行。请关闭窗口或卸载本软件。');
    if (typeof window !== 'undefined' && (window as unknown as { __TAURI__?: unknown }).__TAURI__) {
      try {
        window.close();
      } catch {
        // Fallback
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all"
      onClick={isFirstLaunch ? undefined : onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-2xl max-h-[88vh] bg-zinc-900/95 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden text-zinc-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                {isFirstLaunch ? '首次启动许可与免责声明' : '法律与免责声明'}
              </h2>
              <p className="text-xs text-zinc-400">
                MUSE.AUDIO 法律合规、版权保护与服务协议
              </p>
            </div>
          </div>
          {!isFirstLaunch && (
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/50 px-6 pt-2 space-x-2 overflow-x-auto text-sm">
          <button
            onClick={() => setActiveTab('disclaimer')}
            className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 font-medium transition whitespace-nowrap ${
              activeTab === 'disclaimer'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>免责声明</span>
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 font-medium transition whitespace-nowrap ${
              activeTab === 'terms'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>用户协议</span>
          </button>
          <button
            onClick={() => setActiveTab('copyright')}
            className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 font-medium transition whitespace-nowrap ${
              activeTab === 'copyright'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>版权申诉 (DMCA)</span>
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 font-medium transition whitespace-nowrap ${
              activeTab === 'about'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>关于与开源</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-zinc-300 leading-relaxed custom-scrollbar">
          {activeTab === 'disclaimer' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                ⚠️ 重要提示：在使用 MUSE.AUDIO 之前，请务必仔细阅读本声明。如继续使用本软件，即视为您已完全知晓并无条件接受本声明之全部条款。
              </div>

              <div>
                <h3 className="font-semibold text-white mb-1.5 text-base">一、技术中立与非商业学术用途</h3>
                <p>
                  MUSE.AUDIO 仅是一款开源的本地跨平台多媒体播放器与音频渲染客户端。本项目完全秉持<strong>技术中立性</strong>原则，所有源代码与编译产物仅供计算机软件工程、跨平台技术、Web Audio DSP 数字音频处理研究及学术交流之用，严禁将本软件或相关技术用于任何形式的商业运营与盈利性行为。
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-1.5 text-base">二、无音频托管与存储保证</h3>
                <p>
                  本软件及开发者<strong>不拥有、不上传、不托管、不存储且不传播任何受版权保护的音频、视频、歌词、唱片封面等作品</strong>。本软件不提供任何流媒体存储服务器，所有播放内容均由用户本地设备或者用户自行接入的网络提供商进行数据传输。
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-1.5 text-base">三、用户自定义脚本责任限制</h3>
                <p>
                  MUSE.AUDIO 提供了可拓展的第三方音源脚本加载解析能力（例如洛雪音乐 LX Music 音源脚本格式）。这些脚本均由用户自主编写、或从互联网络自行导入。<strong>用户使用或导入脚本所产生的一切访问行为、版权争议与法律责任，概由用户自行完全承担，开发者及项目开源社区不承担任何连带法律责任。</strong>
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-1.5 text-base">四、著作权人避风港原则 (Safe Harbor)</h3>
                <p>
                  本软件坚决尊重并保护广大版权所有人的合法权益。若权利人认为本软件的某些技术展示侵犯了其合法版权，请参照“版权申诉”条款及时向我们提供权属证明，我们将在法律规定时限内核实并采取断开或清除措施。
                </p>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-white mb-1.5 text-base">一、使用范围与限制</h3>
                <p>
                  用户承诺仅在个人合法学习、研究、非商业目的范围内使用本软件。严禁利用本软件从事侵犯他人著作权、盗版转售、破坏网络安全或违反任何国家和地区法律法规的非法活动。
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-1.5 text-base">二、下载缓存功能合规性</h3>
                <p>
                  本软件内置的离线下载及音频缓存功能，仅供用户在符合当地著作权法律所规定的“个人合理使用（Fair Use）”范围内体验。用户不得将下载的媒体文件公开展播、网络分发、转售或用于商业目的。因超出合理使用范畴而引发的法律纠纷由使用者承担全责。
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-1.5 text-base">三、服务可用性与无保证声明</h3>
                <p>
                  本软件按“现状 (AS IS)”提供，不附带任何明示或暗示的保证（包括但不限于适销性、特定用途适用性或无错误运行保证）。因网络中断、第三方接口变更、音源失效等原因造成的使用异常，开发者不承担赔偿责任。
                </p>
              </div>
            </div>
          )}

          {activeTab === 'copyright' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
                ⚖️ 我们高度尊重知识产权并遵守《中华人民共和国著作权法》、《信息网络传播权保护条例》以及美国《数字千年版权法案》(DMCA)。
              </div>

              <div>
                <h3 className="font-semibold text-white mb-1.5 text-base">权利人侵权通知流程 (Notice & Takedown)</h3>
                <p className="mb-2">
                  如果您是某项音频/歌词/图片等作品的合法著作权人或经授权的代理人，并认为本软件的某些代码或接口指向存在侵权嫌疑，请通过以下官方邮箱联系我们提交权利通知书：
                </p>
                <div className="p-3 rounded-lg bg-zinc-800/80 border border-zinc-700/60 font-mono text-xs space-y-1 text-zinc-200">
                  <p>📧 优先受理邮箱：<strong className="text-indigo-400">copyright@dxcool.cn</strong></p>
                  <p>📧 备用联络邮箱：<strong className="text-indigo-400">xcool603@gmail.com</strong></p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-1.5 text-base">通知书应当包含的内容</h3>
                <ol className="list-decimal list-inside space-y-1 text-zinc-300">
                  <li>权利人的姓名/名称、联系方式及身份权属证明文件；</li>
                  <li>涉嫌侵权内容在软件中的具体名称及指引定位；</li>
                  <li>构成侵权的初步证明材料；</li>
                  <li>对通知书真实性负责的合法签署声明。</li>
                </ol>
                <p className="mt-2 text-xs text-zinc-400">
                  我们在收到符合要求的通知书后，将在法律规定的时限内立即处理相关技术链接或在软件更新中予以阻断。
                </p>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-white mb-1.5 text-base">MUSE.AUDIO 项目背景</h3>
                <p>
                  MUSE.AUDIO 旨在探索现代 Web 与 Native 深度融合的技术极限，通过 Web Audio API 打造极致的母带级 DSP 均衡与环绕声听觉体验，并支持全终端（Windows, macOS, Linux, Android, iOS, HarmonyOS NEXT）一致的用户交互。
                </p>
              </div>

              <div className="p-3 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-400">当前版本：</span>
                  <span className="font-mono text-indigo-400 font-medium">v1.0.0 (Official Release)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">开源协议：</span>
                  <span className="font-mono text-zinc-200">MIT License</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">GitHub 仓库：</span>
                  <a
                    href="https://github.com/XCool-603/Music"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center text-indigo-400 hover:underline"
                  >
                    <span>XCool-603/Music</span>
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          {isFirstLaunch ? (
            <>
              <label className="flex items-center space-x-2.5 text-xs text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasAgreed}
                  onChange={e => setHasAgreed(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900 cursor-pointer"
                />
                <span>我已仔细阅读并完全理解、同意上述全部免责声明与服务协议</span>
              </label>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  onClick={handleDecline}
                  className="flex-1 sm:flex-initial px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
                >
                  拒绝并退出
                </button>
                <button
                  disabled={!hasAgreed}
                  onClick={handleAgreeAndContinue}
                  className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-5 py-2 text-xs font-medium rounded-lg transition ${
                    hasAgreed
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>同意并进入软件</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex justify-between w-full items-center">
              <span className="text-xs text-zinc-500">MUSE.AUDIO © 2026 XCool. All rights reserved.</span>
              <button
                onClick={onClose}
                className="px-5 py-2 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition"
              >
                关闭
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
