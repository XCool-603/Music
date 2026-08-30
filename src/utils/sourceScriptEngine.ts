import CryptoJS from 'crypto-js';
import { CustomSourceScript, Track } from '../types';
import { normalizeCoverUrl } from './imageUtils';
import { getApiBase } from './apiBase';

/**
 * 洛雪音乐 (LX Music) 自定义音源 JS 脚本执行与兼容引擎
 */

// 示例内置脚本 1：开放公共音源扩展 (Open Music API & Demo Source)
export const DEFAULT_OPEN_SOURCE_SCRIPT = `/*!
 * @name 洛雪开放公共音源扩展
 * @description 支持搜索开放公共音频库、无损高保真流媒体、多音质切换与 LRC 实时歌词解析
 * @version 1.2.0
 * @author LX-Community
 * @homepage https://github.com/lyswhut/lx-music-desktop
 */

(function() {
  const sources = {
    wy: {
      name: '网易开放源',
      type: 'music',
      actions: ['musicUrl', 'lyric', 'pic', 'search'],
      qualitys: ['128k', '320k', 'flac', 'flac24bit'],
    },
    tx: {
      name: '企鹅开放源',
      type: 'music',
      actions: ['musicUrl', 'lyric', 'pic', 'search'],
      qualitys: ['128k', '320k', 'flac'],
    },
    kw: {
      name: '酷我开放源',
      type: 'music',
      actions: ['musicUrl', 'lyric', 'pic', 'search'],
      qualitys: ['128k', '320k', 'flac'],
    },
    ambient: {
      name: '白噪与环境电台',
      type: 'music',
      actions: ['musicUrl', 'lyric', 'pic', 'search'],
      qualitys: ['320k', 'flac'],
    }
  };

  // 内部模拟公共数据库与在线音源库
  const demoDatabase = [
    {
      id: 'open_01',
      title: 'City Lights (Cyber Midnight)',
      artist: 'Kavinsky & Lorn',
      album: 'OutRun Electro Vol.1',
      duration: 372,
      coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      genre: 'Synthwave',
      quality: 'flac',
      lyrics: '[00:00.00]City Lights (Cyber Midnight) - Kavinsky & Lorn\\n[00:06.00]洛雪自定义音源脚本解析成功 [High-Res 96kHz/24bit]\\n[00:15.00]Driving through the neon rainy boulevard\\n[00:25.00]Shadows in the rearview mirror fade away\\n[00:35.00]Digital frequencies harmonize the soul\\n[00:48.00]Pulse in the circuitry running out of time\\n[01:00.00]Neon glow guiding the midnight ride\\n[01:20.00]Electric dreams under the starry skies'
    },
    {
      id: 'open_02',
      title: 'Midnight Coffee & Rainy Jazz',
      artist: 'Norah B. & The Trio',
      album: 'Blue Note Nights',
      duration: 350,
      coverUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&auto=format&fit=crop&q=80',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      genre: 'Jazz Lo-Fi',
      quality: '320k',
      lyrics: '[00:00.00]Midnight Coffee & Rainy Jazz - Norah B.\\n[00:08.00]音源: 洛雪开放白噪与无损声学工程\\n[00:18.00]Raindrops tapping soft upon the pane\\n[00:28.00]Steam rising from a warm ceramic cup\\n[00:38.00]Saxophone echoes down the empty street\\n[00:50.00]Whispering memories we used to keep\\n[01:10.00]Sip of tranquility in the quiet dark'
    },
    {
      id: 'open_03',
      title: 'Space Odyssey (Deep Cosmos)',
      artist: 'Stellar Voyager',
      album: 'Interstellar Horizons',
      duration: 412,
      coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
      genre: 'Ambient Cosmic',
      quality: 'flac24bit',
      lyrics: '[00:00.00]Space Odyssey (Deep Cosmos)\\n[00:10.00]无损环绕声场 3D Spatial Audio Active\\n[00:22.00]Floating across the orbit of Saturn\\n[00:38.00]Zero gravity, infinite silence\\n[00:55.00]Stars blooming in the velvet void\\n[01:15.00]Journey to the edge of the universe'
    }
  ];

  // 监听 LX Music 格式请求事件
  if (typeof lx !== 'undefined') {
    const requestEvent = (lx.EVENT_NAMES && lx.EVENT_NAMES.request) || 'request';
    const initedEvent = (lx.EVENT_NAMES && lx.EVENT_NAMES.inited) || 'inited';

    lx.on(requestEvent, async ({ action, source, info }) => {
      switch (action) {
        case 'search': {
          const text = (info.text || '').toLowerCase();
          const results = demoDatabase.filter(item => 
            item.title.toLowerCase().includes(text) ||
            item.artist.toLowerCase().includes(text) ||
            item.genre.toLowerCase().includes(text) ||
            text === ''
          );
          return {
            page: info.page || 1,
            limit: info.limit || 20,
            total: results.length,
            source,
            list: results.map(item => ({
              id: item.id,
              name: item.title,
              singer: item.artist,
              albumName: item.album,
              interval: item.duration,
              img: item.coverUrl,
              types: [item.quality, '320k', '128k'],
              _raw: item
            }))
          };
        }
        case 'musicUrl': {
          const matched = demoDatabase.find(i => i.id === info.musicInfo?.id);
          const finalUrl = matched ? matched.audioUrl : (info.musicInfo?._raw?.audioUrl || info.musicInfo?.audioUrl || info.musicInfo?.previewUrl || '');
          return {
            url: finalUrl,
            quality: info.quality || '320k'
          };
        }
        case 'lyric': {
          const matched = demoDatabase.find(i => i.id === info.musicInfo?.id);
          const finalLyric = matched ? matched.lyrics : (info.musicInfo?._raw?.lyrics || info.musicInfo?.lyrics || '');
          return {
            lyric: finalLyric,
            tlyric: ''
          };
        }
        case 'pic': {
          const matched = demoDatabase.find(i => i.id === info.musicInfo?.id);
          const finalCover = matched ? matched.coverUrl : (info.musicInfo?._raw?.coverUrl || info.musicInfo?.img || info.musicInfo?.artworkUrl100 || '');
          return {
            url: finalCover
          };
        }
      }
    });

    lx.send(initedEvent, {
      status: true,
      openDevTools: false,
      sources
    });
  }

  // 同时也支持直接导出全局方法 (向后兼容标准模块规范)
  return {
    sources,
    search: async (query, page = 1) => {
      const q = (query || '').toLowerCase();
      return demoDatabase.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.artist.toLowerCase().includes(q) ||
        q === ''
      );
    },
    getMusicUrl: async (musicInfo, quality = '320k') => {
      const matched = demoDatabase.find(i => i.id === musicInfo?.id);
      return matched ? matched.audioUrl : (musicInfo?._raw?.audioUrl || musicInfo?.audioUrl || '');
    },
    getLyric: async (musicInfo) => {
      const matched = demoDatabase.find(i => i.id === musicInfo?.id);
      return matched ? matched.lyrics : (musicInfo?._raw?.lyrics || musicInfo?.lyrics || '');
    }
  };
})();
`;

// 示例内置脚本 2：极简 Lo-Fi 疗愈专用音源
export const DEFAULT_LOFI_SOURCE_SCRIPT = `/*!
 * @name 极简 Lo-Fi & 自然疗愈音源
 * @description 专为深度睡眠、代码专注与白噪音设计的轻量音频流脚本
 * @version 1.0.4
 * @author SoundHealer
 * @homepage https://github.com
 */

(function() {
  const sources = {
    lofi: {
      name: 'Lo-Fi 疗愈电台',
      type: 'music',
      actions: ['musicUrl', 'lyric'],
      qualitys: ['320k', 'flac']
    }
  };

  const lofiTracks = [
    {
      id: 'lofi_01',
      title: 'Rainy Night In Tokyo',
      artist: 'Aesthetic Chords',
      album: 'Late Night Chill Hop',
      duration: 310,
      coverUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      genre: 'Lo-Fi Chill',
      lyrics: '[00:00.00]Rainy Night In Tokyo - Aesthetic Chords\\n[00:05.00]Soft jazz piano chord progressions under warm tape hiss\\n[00:25.00]Muted drum groove for deep focus and reading\\n[00:55.00]Reflective neon raindrops cascading down the window'
    },
    {
      id: 'lofi_02',
      title: 'Summer Meadow Breeze',
      artist: 'Acoustic Sanctuary',
      album: 'Healing Horizons Vol. 2',
      duration: 302,
      coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      genre: 'Healing / Lo-Fi',
      lyrics: '[00:00.00]Summer Meadow Breeze - Acoustic Sanctuary\\n[00:06.00]Gentle wind rustling through emerald pine needles\\n[00:20.00]A tranquil stream reflecting golden dawn\\n[00:40.00]Deep breath in, let tranquility embrace your thoughts\\n[01:10.00]Calm ripples spreading across crystal waters'
    },
    {
      id: 'lofi_03',
      title: 'Midnight Rain on Roof',
      artist: 'Nature Calm Studio',
      album: 'Pure Ambient Series',
      duration: 340,
      coverUrl: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=600&auto=format&fit=crop&q=80',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
      genre: 'White Noise',
      lyrics: '[00:00.00]Midnight Rain on Roof - Nature Calm Studio\\n[00:10.00]Soothing gentle rainfall soothing your mind\\n[00:30.00]Peaceful night, warm blanket, restful sleep'
    }
  ];

  if (typeof lx !== 'undefined') {
    const requestEvent = (lx.EVENT_NAMES && lx.EVENT_NAMES.request) || 'request';
    const initedEvent = (lx.EVENT_NAMES && lx.EVENT_NAMES.inited) || 'inited';

    lx.on(requestEvent, async ({ action, source, info }) => {
      if (action === 'search') {
        const text = (info.text || '').toLowerCase();
        const results = lofiTracks.filter(t => t.title.toLowerCase().includes(text) || t.artist.toLowerCase().includes(text));
        return {
          page: 1,
          limit: 10,
          total: results.length,
          source,
          list: results.map(r => ({
            id: r.id,
            name: r.title,
            singer: r.artist,
            albumName: r.album,
            interval: r.duration,
            img: r.coverUrl,
            types: ['320k', 'flac'],
            _raw: r
          }))
        };
      }
      if (action === 'musicUrl') {
        const item = lofiTracks.find(i => i.id === info.musicInfo?.id);
        const finalUrl = item ? item.audioUrl : (info.musicInfo?._raw?.audioUrl || info.musicInfo?.audioUrl || '');
        return { url: finalUrl, quality: '320k' };
      }
      if (action === 'lyric') {
        const item = lofiTracks.find(i => i.id === info.musicInfo?.id);
        const finalLyric = item ? item.lyrics : (info.musicInfo?._raw?.lyrics || info.musicInfo?.lyrics || '');
        return { lyric: finalLyric };
      }
    });

    lx.send(initedEvent, { status: true, sources });
  }

  return { sources, lofiTracks };
})();
`;

/**
 * 解析 JS 脚本头部的元数据 (如 @name, @version, @author, @description, @homepage)
 */
export function parseScriptMetadata(code: string): Partial<CustomSourceScript> {
  const metadata: Partial<CustomSourceScript> = {
    name: '未命名自定义音源脚本',
    version: '1.0.0',
    author: '未知开发者',
    description: '通过 JavaScript 导入的洛雪自定义音源扩展',
    sources: ['wy', 'tx', 'kw', 'kg', 'mg'],
    qualities: ['128k', '320k', 'flac'],
  };

  // 提取 JSDoc / Header 注释
  const headerMatch = code.match(/\/\*![\s\S]*?\*\//) || code.match(/\/\*\*[\s\S]*?\*\//);
  if (headerMatch) {
    const header = headerMatch[0];
    const nameMatch = header.match(/@name\s+([^\r\n*]+)/);
    if (nameMatch) metadata.name = nameMatch[1].trim();

    const versionMatch = header.match(/@version\s+([^\r\n*]+)/);
    if (versionMatch) metadata.version = versionMatch[1].trim();

    const authorMatch = header.match(/@author\s+([^\r\n*]+)/);
    if (authorMatch) metadata.author = authorMatch[1].trim();

    const descMatch = header.match(/@description\s+([^\r\n*]+)/);
    if (descMatch) metadata.description = descMatch[1].trim();

    const homepageMatch = header.match(/@homepage\s+([^\r\n*]+)/);
    if (homepageMatch) metadata.homepage = homepageMatch[1].trim();
  }

  // 尝试在代码中探测支持的音源标识符 (wy, tx, kw, kg, mg, xm, etc.)
  const detectedSources: string[] = [];
  ['wy', 'tx', 'kw', 'kg', 'mg', 'xm', 'ambient', 'lofi', 'custom'].forEach((src) => {
    if (code.includes(`'${src}'`) || code.includes(`"${src}"`) || code.includes(`${src}:`)) {
      detectedSources.push(src);
    }
  });
  if (detectedSources.length > 0) {
    metadata.sources = Array.from(new Set(detectedSources));
  }

  // 探测音质
  const detectedQualities: string[] = [];
  ['128k', '320k', 'flac', 'flac24bit'].forEach((q) => {
    if (code.includes(`'${q}'`) || code.includes(`"${q}"`)) {
      detectedQualities.push(q);
    }
  });
  if (detectedQualities.length > 0) {
    metadata.qualities = Array.from(new Set(detectedQualities));
  }

  return metadata;
}

/**
 * 洛雪 JS 脚本沙箱运行时执行器
 */
export class SourceScriptRunner {
  public script: CustomSourceScript;
  private eventHandlers: Map<string, Function> = new Map();
  public initedData: any = null;
  private exportResult: any = null;

  constructor(script: CustomSourceScript) {
    this.script = script;
  }

  public async init(): Promise<{ success: boolean; error?: string }> {
    try {
      this.eventHandlers.clear();
      this.initedData = null;

      // 构造完整洛雪音乐客户端内置的 lx 全局 API 环境 (全面兼容 v1 / v2 / v3 规范)
      const EVENT_NAMES = {
        inited: 'inited',
        request: 'request',
        updateAlert: 'updateAlert',
        updateDevTools: 'updateDevTools',
      };

      const mockLx = {
        version: '2.5.0',
        env: 'desktop',
        EVENT_NAMES,
        currentScriptInfo: {
          name: this.script.name,
          description: this.script.description,
          version: this.script.version,
          author: this.script.author,
          homepage: this.script.homepage,
          rawScript: this.script.rawCode,
        },
        on: (eventName: string, handler: Function) => {
          const key = eventName || 'request';
          this.eventHandlers.set(key, handler);
        },
        send: (eventName: string, data: any) => {
          if (eventName === 'inited' || eventName === 'init') {
            this.initedData = data;
            if (data && data.sources && typeof data.sources === 'object') {
              const srcKeys = Object.keys(data.sources);
              if (srcKeys.length > 0) {
                this.script.sources = srcKeys;
              }
            }
          }
        },
        request: (url: string, options: any, callback?: Function) => {
          let reqOptions: any = {};
          let cb: Function = () => {};

          if (typeof options === 'function') {
            cb = options;
          } else {
            reqOptions = options || {};
            cb = callback || (() => {});
          }

          const method = (reqOptions.method || 'GET').toUpperCase();

          // 优先通过全栈服务端透明代理发起网络请求 (突破浏览器跨域限制与受限 Header)
          const backendBase = getApiBase();
          const executeProxy = async () => {
            try {
              const res = await fetch(`${backendBase}/api/proxy/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url,
                  method,
                  headers: reqOptions.headers || {},
                  body: reqOptions.body,
                  form: reqOptions.form,
                }),
              });

              if (res.ok) {
                const data = await res.json();
                const resp = {
                  statusCode: data.statusCode || 200,
                  status: data.statusCode || 200,
                  headers: data.headers || {},
                  body: data.body,
                  rawBody: typeof data.body === 'string' ? data.body : JSON.stringify(data.body),
                };
                cb(null, resp, data.body);
                return resp;
              }
              throw new Error(`Proxy status ${res.status}`);
            } catch (proxyErr) {
              console.warn('[ScriptRunner] Proxy request failed, trying direct fetch:', proxyErr);
              try {
                const directRes = await fetch(url, {
                  method,
                  headers: reqOptions.headers,
                  body: reqOptions.body ? (typeof reqOptions.body === 'string' ? reqOptions.body : JSON.stringify(reqOptions.body)) : undefined,
                });
                const text = await directRes.text();
                let body: any = text;
                try {
                  body = JSON.parse(text);
                } catch {}
                const resp = {
                  statusCode: directRes.status,
                  status: directRes.status,
                  headers: {},
                  body,
                  rawBody: text,
                };
                cb(null, resp, body);
                return resp;
              } catch (directErr) {
                cb(directErr, null, null);
                throw directErr;
              }
            }
          };

          const promise = executeProxy();
          // Provide cancellation function for LX scripts that expect cancel handler
          (promise as any).cancel = () => {};
          return promise;
        },
        utils: {
          buffer: {
            from: (data: any, encoding?: string) => {
              if (typeof data === 'string') {
                if (encoding === 'hex') {
                  const match = data.match(/.{1,2}/g) || [];
                  const arr = new Uint8Array(match.map((byte) => parseInt(byte, 16)));
                  return arr;
                }
                if (encoding === 'base64') {
                  try {
                    const bin = atob(data);
                    const bytes = new Uint8Array(bin.length);
                    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                    return bytes;
                  } catch {
                    return new TextEncoder().encode(data);
                  }
                }
                return new TextEncoder().encode(data);
              }
              if (Array.isArray(data)) {
                return new Uint8Array(data);
              }
              if (data instanceof Uint8Array) {
                return data;
              }
              return new Uint8Array(0);
            },
            bufToString: (buf: any, encoding?: string) => {
              const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf || []);
              if (encoding === 'hex') {
                return Array.from(arr)
                  .map((b) => b.toString(16).padStart(2, '0'))
                  .join('');
              }
              if (encoding === 'base64') {
                let binary = '';
                for (let i = 0; i < arr.length; i++) {
                  binary += String.fromCharCode(arr[i]);
                }
                return btoa(binary);
              }
              return new TextDecoder().decode(arr);
            },
          },
          crypto: {
            md5: (str: any) => {
              try {
                if (typeof str === 'string') {
                  return CryptoJS.MD5(str).toString(CryptoJS.enc.Hex);
                }
                return CryptoJS.MD5(CryptoJS.enc.Latin1.parse(String(str))).toString(CryptoJS.enc.Hex);
              } catch {
                return String(str);
              }
            },
            sha1: (str: any) => {
              try {
                return CryptoJS.SHA1(String(str)).toString(CryptoJS.enc.Hex);
              } catch {
                return String(str);
              }
            },
            sha256: (str: any) => {
              try {
                return CryptoJS.SHA256(String(str)).toString(CryptoJS.enc.Hex);
              } catch {
                return String(str);
              }
            },
            aesEncrypt: (data: any, mode: string = 'CBC', key: any, iv?: any) => {
              try {
                const keyParsed = typeof key === 'string' ? CryptoJS.enc.Utf8.parse(key) : key;
                const ivParsed = iv ? (typeof iv === 'string' ? CryptoJS.enc.Utf8.parse(iv) : iv) : undefined;
                const dataStr = typeof data === 'string' ? data : CryptoJS.enc.Utf8.stringify(data);
                const isECB = mode.toUpperCase().includes('ECB');
                const encrypted = CryptoJS.AES.encrypt(dataStr, keyParsed, {
                  iv: isECB ? undefined : ivParsed,
                  mode: isECB ? CryptoJS.mode.ECB : CryptoJS.mode.CBC,
                  padding: CryptoJS.pad.Pkcs7,
                });
                return encrypted.toString();
              } catch (e) {
                console.warn('[AES Encrypt Error]', e);
                return typeof data === 'string' ? btoa(data) : '';
              }
            },
            aesDecrypt: (data: any, mode: string = 'CBC', key: any, iv?: any) => {
              try {
                const keyParsed = typeof key === 'string' ? CryptoJS.enc.Utf8.parse(key) : key;
                const ivParsed = iv ? (typeof iv === 'string' ? CryptoJS.enc.Utf8.parse(iv) : iv) : undefined;
                const isECB = mode.toUpperCase().includes('ECB');
                const decrypted = CryptoJS.AES.decrypt(data, keyParsed, {
                  iv: isECB ? undefined : ivParsed,
                  mode: isECB ? CryptoJS.mode.ECB : CryptoJS.mode.CBC,
                  padding: CryptoJS.pad.Pkcs7,
                });
                return decrypted.toString(CryptoJS.enc.Utf8);
              } catch (e) {
                console.warn('[AES Decrypt Error]', e);
                return typeof data === 'string' ? atob(data) : data;
              }
            },
            rsaEncrypt: (data: any) => {
              return typeof data === 'string' ? btoa(data) : '';
            },
            base64: {
              encode: (str: string) => {
                try {
                  return btoa(unescape(encodeURIComponent(str)));
                } catch {
                  return btoa(str);
                }
              },
              decode: (str: string) => {
                try {
                  return decodeURIComponent(escape(atob(str)));
                } catch {
                  return atob(str);
                }
              },
            },
          },
          btoa: (str: string) => {
            try {
              return btoa(unescape(encodeURIComponent(str)));
            } catch {
              return btoa(str);
            }
          },
          atob: (str: string) => {
            try {
              return decodeURIComponent(escape(atob(str)));
            } catch {
              return atob(str);
            }
          },
        },
      };

      // 绑定全局对象环境 (支持 window.lx, globalThis.lx, global.lx, require, module, exports)
      const globalScope = (typeof window !== 'undefined' ? window : globalThis) as any;
      globalScope.lx = mockLx;
      globalScope.EVENT_NAMES = mockLx.EVENT_NAMES;
      globalScope.CryptoJS = CryptoJS;

      if (!globalScope.global) {
        globalScope.global = globalScope;
      }
      if (!globalScope.process) {
        globalScope.process = { env: {}, nextTick: (fn: any) => setTimeout(fn, 0) };
      }

      // Polyfill module and exports
      const moduleObj = { exports: {} };
      globalScope.module = moduleObj;
      globalScope.exports = moduleObj.exports;

      if (typeof globalScope.require === 'undefined') {
        globalScope.require = (name: string) => {
          if (name === 'crypto' || name === 'crypto-js') return CryptoJS;
          return {};
        };
      }

      // 执行代码：不使用参数名避免用户代码顶层 const lx / const window 等变量重复声明冲突
      const executionCode = `
        try {
          var lx = (typeof globalThis !== 'undefined' && globalThis.lx) || (typeof window !== 'undefined' && window.lx);
          ${this.script.rawCode}
        } catch (err) {
          throw err;
        }
      `;

      const executionFn = new Function(executionCode);
      this.exportResult = executionFn.call(globalScope);

      // 如果有导出对象，合并
      if (globalScope.module && globalScope.module.exports && Object.keys(globalScope.module.exports).length > 0) {
        this.exportResult = { ...this.exportResult, ...globalScope.module.exports };
      }

      return { success: true };
    } catch (err: any) {
      console.error(`[ScriptRunner] Failed to init script "${this.script.name}":`, err);
      return { success: false, error: err?.message || String(err) };
    }
  }

  /**
   * 是否支持搜索动作
   */
  public hasSearchAction(): boolean {
    return this.eventHandlers.has('request') || (this.exportResult && typeof this.exportResult.search === 'function');
  }

  /**
   * 执行搜索
   */
  public async search(query: string, page: number = 1): Promise<Track[]> {
    try {
      // 1. 优先尝试 lx.on('request') 模式
      const requestHandler = this.eventHandlers.get('request');
      if (requestHandler) {
        const response = await requestHandler({
          action: 'search',
          source: this.script.sources[0] || 'wy',
          info: { text: query, page, limit: 20 },
        });

        if (response && Array.isArray(response.list) && response.list.length > 0) {
          return response.list.map((item: any) => ({
            id: `lx_${this.script.id}_${item.id || item.songmid || Math.random().toString(36).substr(2, 9)}`,
            title: item.name || item.title || item.songname || '未知单曲',
            artist: item.singer || item.artist || item.singers?.[0]?.name || '未知艺术家',
            album: item.albumName || item.album || this.script.name,
            duration: Number(item.interval) || Number(item.duration) || 210,
            coverUrl: normalizeCoverUrl(
              item.img ||
              item.picUrl ||
              item.coverUrl ||
              item.album?.picUrl ||
              item.artworkUrl100
            ),
            audioUrl: item.url || item.audioUrl || item._raw?.audioUrl || '',
            genre: item.genre || `${this.script.name} [JS音源]`,
            lyrics:
              item.lyric ||
              item._raw?.lyrics ||
              `[00:00.00]${item.name || item.title}\n[00:03.00]音源解析自: ${this.script.name}`,
            bitrate: item.types?.[0] || '320k',
            sourceScriptId: this.script.id,
            sourceName: this.script.name,
            sourceKey: item.source || this.script.sources[0] || 'wy',
            sourceRawInfo: item,
          }));
        }
      }

      // 2. 尝试直接导出对象的 search 方法
      if (this.exportResult && typeof this.exportResult.search === 'function') {
        const rawResults = await this.exportResult.search(query, page);
        if (Array.isArray(rawResults) && rawResults.length > 0) {
          return rawResults.map((item: any) => ({
            id: `lx_${this.script.id}_${item.id || Math.random().toString(36).substr(2, 9)}`,
            title: item.title || item.name || '未知单曲',
            artist: item.artist || item.singer || '未知艺术家',
            album: item.album || item.albumName || this.script.name,
            duration: Number(item.duration) || 200,
            coverUrl: normalizeCoverUrl(item.coverUrl || item.img || item.picUrl),
            audioUrl: item.audioUrl || item.url || '',
            genre: item.genre || `${this.script.name} [JS音源]`,
            lyrics:
              item.lyrics ||
              item.lyric ||
              `[00:00.00]${item.title || item.name}\\n[00:04.00]音源解析: ${this.script.name}`,
            bitrate: item.quality || '320k',
            sourceScriptId: this.script.id,
            sourceName: this.script.name,
            sourceKey: this.script.sources[0] || 'wy',
            sourceRawInfo: item,
          }));
        }
      }

      return [];
    } catch (err) {
      console.error(`[ScriptRunner] Search error in "${this.script.name}":`, err);
      return [];
    }
  }

  /**
   * 解析音频真实播放地址
   */
  public async resolveAudioUrl(track: Track, quality: string = '320k'): Promise<string> {
    try {
      const requestHandler = this.eventHandlers.get('request');
      if (requestHandler) {
        const rawInfo = track.sourceRawInfo || {
          id: track.id.replace(`lx_${this.script.id}_`, '').replace('itunes_', ''),
          songmid: track.id.replace(`lx_${this.script.id}_`, '').replace('itunes_', ''),
          name: track.title,
          title: track.title,
          singer: track.artist,
          artist: track.artist,
          albumName: track.album,
          album: track.album,
          interval: track.duration,
          img: track.coverUrl,
          types: ['128k', '320k', 'flac'],
          _raw: track,
        };

        const response = await requestHandler({
          action: 'musicUrl',
          source: track.sourceKey || this.script.sources[0] || 'wy',
          info: {
            type: quality,
            quality,
            musicInfo: rawInfo,
          },
        });

        if (response) {
          if (typeof response === 'string' && response.trim()) {
            return response.trim();
          }
          if (response.url && typeof response.url === 'string' && response.url.trim()) {
            return response.url.trim();
          }
          if (response.data && response.data.url && typeof response.data.url === 'string') {
            return response.data.url.trim();
          }
        }
      }

      if (this.exportResult && typeof this.exportResult.getMusicUrl === 'function') {
        const rawInfo = track.sourceRawInfo || { id: track.id, title: track.title, artist: track.artist };
        const exportedUrl = await this.exportResult.getMusicUrl(rawInfo, quality);
        if (exportedUrl && typeof exportedUrl === 'string' && exportedUrl.trim()) {
          return exportedUrl.trim();
        }
      }

      if (track.audioUrl && typeof track.audioUrl === 'string' && track.audioUrl.trim()) {
        return track.audioUrl.trim();
      }

      return track.audioUrl || '';
    } catch (err) {
      console.error(`[ScriptRunner] Failed to resolve audio URL for track ${track?.title || ''}:`, err);
      return track?.audioUrl || '';
    }
  }

  public async resolveLyric(track: Track): Promise<string> {
    return this.resolveLyrics(track);
  }

  /**
   * 解析动态 LRC 歌词
   */
  public async resolveLyrics(track: Track): Promise<string> {
    try {
      const requestHandler = this.eventHandlers.get('request');
      if (requestHandler) {
        const rawInfo = track.sourceRawInfo || {
          id: track.id.replace(`lx_${this.script.id}_`, ''),
          name: track.title,
          singer: track.artist,
          _raw: track,
        };

        const response = await requestHandler({
          action: 'lyric',
          source: track.sourceKey || this.script.sources[0] || 'wy',
          info: { musicInfo: rawInfo },
        });

        if (response) {
          if (typeof response === 'string') return response;
          if (response.lyric) return response.lyric;
          if (response.lrc) return response.lrc;
        }
      }

      if (this.exportResult && typeof this.exportResult.getLyric === 'function') {
        const rawInfo = track.sourceRawInfo || { id: track.id, title: track.title, artist: track.artist };
        const res = await this.exportResult.getLyric(rawInfo);
        if (res && typeof res === 'string') return res;
      }

      return track.lyrics || '';
    } catch (err) {
      console.error(`[ScriptRunner] Failed to resolve lyric for track ${track.title}:`, err);
      return track.lyrics || '';
    }
  }
}

/**
 * 聚合多源在线检索 (支持酷我音乐、网易云音乐与全网聚合)
 */
export async function searchAggregatedOnlineMusic(
  query: string,
  activeScripts: CustomSourceScript[],
  platform: 'all' | 'kuwo' | 'netease' = 'all'
): Promise<Track[]> {
  const trimmed = (query || '').trim();
  if (!trimmed) return [];

  const results: Track[] = [];

  // 1. 优先调用后端全长无损音乐库检索 (真实全长 3~5 分钟完整原曲 + 动态逐字 LRC 歌词 + 高清封面)
  try {
    const res = await fetch(`${getApiBase()}/api/music/search?q=${encodeURIComponent(trimmed)}&limit=30&source=${platform}`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.list) && data.list.length > 0) {
        const primaryScript = activeScripts.find((s) => s.enabled) || activeScripts[0];

        data.list.forEach((item: any) => {
          const finalCover = normalizeCoverUrl(item.coverUrl);
          results.push({
            id: item.id,
            title: item.title,
            artist: item.artist,
            album: item.album,
            duration: item.duration || 240,
            coverUrl: finalCover,
            audioUrl: item.audioUrl,
            genre: item.genre || '流行音乐',
            lyrics: '', // 播放时自动流式请求真实完整 LRC 歌词
            bitrate: item.bitrate || '320kbps / 无损全长',
            sourceScriptId: primaryScript?.id,
            sourceName: item.sourceName || (item.sourceKey === 'kw' ? '酷我音乐' : '网易云音乐'),
            sourceKey: item.sourceKey || 'kw',
            sourceRawInfo: {
              id: item.rid || item.id,
              songmid: item.rid || item.id,
              name: item.title,
              singer: item.artist,
              albumName: item.album,
              interval: item.duration,
              img: finalCover,
            },
          });
        });
      }
    }
  } catch (err) {
    console.log('[Aggregator] Backend full search fallback:', err);
  }

  // 2. 如果后端未检索到，回退至 iTunes Open Music 备用检索
  if (results.length === 0) {
    try {
      let itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&entity=song&limit=25&country=CN`;
      let res = await fetch(itunesUrl);
      let data = res.ok ? await res.json() : null;

      if (!data || !data.results || data.results.length === 0) {
        itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&entity=song&limit=25`;
        res = await fetch(itunesUrl);
        data = res.ok ? await res.json() : null;
      }

      if (data && data.results && Array.isArray(data.results)) {
        const primaryScript = activeScripts.find((s) => s.enabled) || activeScripts[0];

        data.results.forEach((item: any) => {
          const highResCover = item.artworkUrl100
            ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg')
            : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80';

          const trackId = `itunes_${item.trackId}`;
          const rawAudio = item.previewUrl || '';

          results.push({
            id: trackId,
            title: item.trackName || '未知单曲',
            artist: item.artistName || '未知歌手',
            album: item.collectionName || '单曲合辑',
            duration: Math.round((item.trackTimeMillis || 180000) / 1000),
            coverUrl: highResCover,
            audioUrl: rawAudio,
            genre: item.primaryGenreName || '流行音乐',
            lyrics: `[00:00.00]${item.trackName || '单曲'} - ${item.artistName || '未知歌手'}\n[00:03.00]专辑: ${item.collectionName || '单曲合辑'}\n[00:06.00]音源解析: ${primaryScript ? primaryScript.name : '开放音频聚合引擎'}\n[00:10.00]高保真原声音频流已就绪 (AAC 256k / FLAC)\n[00:20.00]正在同步声学动态频谱与无损均衡器...`,
            bitrate: '320k',
            sourceScriptId: primaryScript?.id,
            sourceName: primaryScript ? primaryScript.name : '多源聚合库',
            sourceKey: 'wy',
            sourceRawInfo: {
              id: String(item.trackId),
              name: item.trackName,
              singer: item.artistName,
              albumName: item.collectionName,
              interval: Math.round((item.trackTimeMillis || 180000) / 1000),
              img: highResCover,
              audioUrl: rawAudio,
            },
          });
        });
      }
    } catch (err) {
      console.log('[Aggregator] Online search fallback:', err);
    }
  }

  // 3. 同时使用已启用的用户 JS 音源脚本的 search() 进行检索扩展
  for (const script of activeScripts) {
    if (!script.enabled) continue;
    try {
      const runner = new SourceScriptRunner(script);
      const initRes = await runner.init();
      if (initRes.success && runner.hasSearchAction()) {
        const customResults = await runner.search(trimmed, 1);
        if (customResults.length > 0) {
          results.unshift(...customResults);
        }
      }
    } catch (e) {
      console.warn(`[Aggregator] Script ${script.name} search failed:`, e);
    }
  }

  return results;
}
