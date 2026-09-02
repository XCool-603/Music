import { EQPreset, AudioSettings } from '../types';
import { getApiBase } from './apiBase';
import {
  isNativePlayback,
  nativeSetSource,
  nativePlay,
  nativePause,
  nativeSeek,
  nativeSetRate,
  getNativeSnapshot,
} from './nativeAudio';

export const EQ_FREQUENCIES_10 = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
export const EQ_FREQUENCIES_15 = [25, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000, 16000];

// Band frequency metadata for professional UI labels & tooltips
export interface BandMeta {
  freq: number;
  label: string;
  name: string;
  desc: string;
  region: 'sub' | 'bass' | 'lowmid' | 'mid' | 'highmid' | 'presence' | 'air';
  regionName: string;
  color: string;
}

export const BAND_METAS_10: BandMeta[] = [
  { freq: 31, label: '31Hz', name: '极低频 / 次声下潜', desc: '管风琴/合成器超低频基音，控制混音深邃度', region: 'sub', regionName: 'Sub-Bass 超低音', color: '#818cf8' },
  { freq: 63, label: '63Hz', name: '超重低音 / 底鼓冲击', desc: '底鼓与贝斯的核心冲击力与厚重感', region: 'bass', regionName: 'Bass 低音', color: '#6366f1' },
  { freq: 125, label: '125Hz', name: '温暖低频 / 贝斯泛音', desc: '音乐的丰满度与暖度，过高易发浑', region: 'bass', regionName: 'Bass 低音', color: '#3b82f6' },
  { freq: 250, label: '250Hz', name: '中低频 / 弦乐腔体', desc: '人声基频下段与吉他/大提琴共鸣区', region: 'lowmid', regionName: 'Low-Mid 中低频', color: '#0ea5e9' },
  { freq: 500, label: '500Hz', name: '中频基音 / 人声主体', desc: '歌声与主奏乐器的形体感与饱满度', region: 'mid', regionName: 'Mid 核心人声', color: '#10b981' },
  { freq: 1000, label: '1kHz', name: '核心中频 / 穿透力', desc: '决定声音的前后空间距离感与聚焦度', region: 'mid', regionName: 'Mid 核心人声', color: '#eab308' },
  { freq: 2000, label: '2kHz', name: '中高频 / 咬字清晰度', desc: '人声唇齿发音、吉他拔弦质感区', region: 'highmid', regionName: 'High-Mid 中高频', color: '#f97316' },
  { freq: 4000, label: '4kHz', name: '存在感 / 明亮度', desc: '乐器与人声的轮廓锐利度，影响听感清晰感', region: 'presence', regionName: 'Presence 存在感', color: '#ef4444' },
  { freq: 8000, label: '8kHz', name: '高频 / 镲片泛音', desc: '打击乐金属镲片、钢琴敲击清脆感', region: 'presence', regionName: 'Presence 晶莹度', color: '#ec4899' },
  { freq: 16000, label: '16kHz', name: '超高频 / 空气感', desc: '声场开阔度与录音棚呼吸空气感', region: 'air', regionName: 'Brilliance 空气感', color: '#a855f7' },
];

export const BAND_METAS_15: BandMeta[] = [
  { freq: 25, label: '25Hz', name: '次声波 / 地震感', desc: '超重低音极端下潜，影院低音炮震颤', region: 'sub', regionName: 'Sub-Bass', color: '#818cf8' },
  { freq: 40, label: '40Hz', name: '深层低音 / 808轰鸣', desc: '电子音乐 808 Sub-Bass 与管风琴共鸣', region: 'sub', regionName: 'Sub-Bass', color: '#6366f1' },
  { freq: 63, label: '63Hz', name: '重低音 / 底鼓核心', desc: '现代流行流行乐底鼓重击核心点', region: 'bass', regionName: 'Bass', color: '#4f46e5' },
  { freq: 100, label: '100Hz', name: '强劲低频 / 贝斯律动', desc: '电贝斯主要基音，增加音乐动态弹跳感', region: 'bass', regionName: 'Bass', color: '#3b82f6' },
  { freq: 160, label: '160Hz', name: '温暖厚重 / 鼓腔共振', desc: '军鼓鼓腔共鸣与男声低沉磁性质感', region: 'lowmid', regionName: 'Low-Mid', color: '#0ea5e9' },
  { freq: 250, label: '250Hz', name: '中低共鸣 / 乐器形体', desc: '木吉他箱体与钢琴低声部厚度', region: 'lowmid', regionName: 'Low-Mid', color: '#06b6d4' },
  { freq: 400, label: '400Hz', name: '人声基底 / 纸板区', desc: '适度控制可防止声音发闷或盒装感', region: 'mid', regionName: 'Mid', color: '#10b981' },
  { freq: 630, label: '630Hz', name: '中频丰满 / 号角共鸣', desc: '铜管乐与弦乐合奏的主体温暖度', region: 'mid', regionName: 'Mid', color: '#84cc16' },
  { freq: 1000, label: '1kHz', name: '核心基准 / 聚焦度', desc: '声场定位核心，决定主唱贴耳程度', region: 'mid', regionName: 'Mid', color: '#eab308' },
  { freq: 1600, label: '1.6k', name: '中高延展 / 歌声质感', desc: '歌声情感表达核心泛音区', region: 'highmid', regionName: 'High-Mid', color: '#f59e0b' },
  { freq: 2500, label: '2.5k', name: '人声咬字 / 瞬态打击', desc: '军鼓拍打声与人声齿音识别度', region: 'highmid', regionName: 'High-Mid', color: '#f97316' },
  { freq: 4000, label: '4kHz', name: '存在感 / 锋利度', desc: '电吉他失真质感与领奏乐器清晰度', region: 'presence', regionName: 'Presence', color: '#ef4444' },
  { freq: 6300, label: '6.3k', name: '明亮通透 / 丝滑度', desc: '镲片敲击清脆感与高音人声呼吸', region: 'presence', regionName: 'Presence', color: '#f43f5e' },
  { freq: 10000, label: '10k', name: '高频光泽 / 晶莹感', desc: '小提琴泛音与原声吉他指弹光泽', region: 'air', regionName: 'Air', color: '#ec4899' },
  { freq: 16000, label: '16k', name: '天籁极高频 / 空气感', desc: '顶级母带级声场空间感与微动态', region: 'air', regionName: 'Air', color: '#a855f7' },
];

export const EQ_PRESETS: EQPreset[] = [
  // 1. 标准与监听 (Reference & Neutral)
  {
    id: 'flat',
    name: '原声平直 (Flat / Reference)',
    category: 'genre',
    gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    preamp: 0,
    bassBoost: 0,
    trebleAir: 0,
    vocalClarity: 0,
    surround3D: false,
    spatialMode: 'off',
    stereoWidth: 100,
    tubeWarmth: 0,
    compressor: false,
  },
  {
    id: 'studio_monitor',
    name: '录音室母带监听 (Studio Reference)',
    category: 'genre',
    gains: [0.5, 0.5, 0, -0.5, 0, 0.5, 0, 0.5, 1, 1],
    preamp: 0,
    bassBoost: 1,
    trebleAir: 2,
    vocalClarity: 1,
    surround3D: false,
    spatialMode: 'studio',
    stereoWidth: 105,
    tubeWarmth: 1,
    compressor: true,
  },

  // 2. 流行与风格流派 (Genres)
  {
    id: 'pop',
    name: '流行金曲动态 (Pop Master)',
    category: 'genre',
    gains: [2.5, 4, 3, 1, -1, 1.5, 3, 3.5, 3, 2],
    preamp: -1,
    bassBoost: 4,
    trebleAir: 3,
    vocalClarity: 3,
    surround3D: true,
    spatialMode: 'studio',
    stereoWidth: 115,
    tubeWarmth: 2,
    compressor: true,
  },
  {
    id: 'rock',
    name: '摇滚电声现场 (Rock & Metal)',
    category: 'genre',
    gains: [5, 4.5, 3, 1, -2, 0.5, 2.5, 4, 4.5, 3.5],
    preamp: -1.5,
    bassBoost: 5,
    trebleAir: 4,
    vocalClarity: 2,
    surround3D: true,
    spatialMode: 'club',
    stereoWidth: 120,
    tubeWarmth: 4,
    compressor: true,
  },
  {
    id: 'edm',
    name: '电子舞曲狂欢 (EDM & Bass House)',
    category: 'genre',
    gains: [7, 6.5, 4, 0.5, -2, 1, 2.5, 4.5, 5.5, 6],
    preamp: -2,
    bassBoost: 7,
    trebleAir: 5,
    vocalClarity: 1,
    surround3D: true,
    spatialMode: 'club',
    stereoWidth: 130,
    tubeWarmth: 3,
    compressor: true,
  },
  {
    id: 'hiphop',
    name: '嘻哈重低音 (Hip-Hop & Trap)',
    category: 'genre',
    gains: [8, 7, 5, 2, -1, 0, 2, 3, 3.5, 3],
    preamp: -2,
    bassBoost: 8,
    trebleAir: 2,
    vocalClarity: 3,
    surround3D: false,
    spatialMode: 'studio',
    stereoWidth: 110,
    tubeWarmth: 2,
    compressor: true,
  },
  {
    id: 'classical',
    name: '纯净交响古典 (Symphony & Classical)',
    category: 'genre',
    gains: [4, 3, 2, 1, 0, 0.5, 1.5, 2.5, 3.5, 4.5],
    preamp: 0,
    bassBoost: 2,
    trebleAir: 5,
    vocalClarity: 2,
    surround3D: true,
    spatialMode: 'hall',
    stereoWidth: 125,
    tubeWarmth: 1,
    compressor: false,
  },
  {
    id: 'jazz',
    name: '微醺爵士蓝调 (Warm Jazz & Blues)',
    category: 'genre',
    gains: [3.5, 3, 2, 1.5, 0.5, 1, 2, 2.5, 3, 2.5],
    preamp: 0,
    bassBoost: 3,
    trebleAir: 2,
    vocalClarity: 2,
    surround3D: true,
    spatialMode: 'club',
    stereoWidth: 115,
    tubeWarmth: 5,
    compressor: true,
  },
  {
    id: 'rnb',
    name: 'R&B 律动丝滑 (Silk R&B & Soul)',
    category: 'genre',
    gains: [5.5, 4.5, 3, 1, -0.5, 1.5, 3, 3.5, 4, 3.5],
    preamp: -1,
    bassBoost: 5,
    trebleAir: 4,
    vocalClarity: 4,
    surround3D: true,
    spatialMode: 'studio',
    stereoWidth: 120,
    tubeWarmth: 3,
    compressor: true,
  },
  {
    id: 'citypop',
    name: '80s 霓虹复古 (City Pop Retro)',
    category: 'genre',
    gains: [4, 3.5, 2, 0.5, 0, 1.5, 3, 4, 4.5, 5],
    preamp: -1,
    bassBoost: 4,
    trebleAir: 5,
    vocalClarity: 3,
    surround3D: true,
    spatialMode: 'wide',
    stereoWidth: 125,
    tubeWarmth: 6,
    compressor: true,
  },

  // 3. 人声优化 (Vocals)
  {
    id: 'vocal_clear',
    name: '清澈通透女声 (Crystal Female Vocal)',
    category: 'vocal',
    gains: [-2, -1, 0, 1.5, 3.5, 4.5, 5, 4.5, 3.5, 2.5],
    preamp: -0.5,
    bassBoost: 1,
    trebleAir: 6,
    vocalClarity: 7,
    surround3D: true,
    spatialMode: 'studio',
    stereoWidth: 110,
    tubeWarmth: 2,
    compressor: true,
  },
  {
    id: 'vocal_warm',
    name: '醇厚磁性男声 (Warm Male Vocal)',
    category: 'vocal',
    gains: [1, 2, 3, 3.5, 3, 2.5, 2, 2.5, 2, 1],
    preamp: 0,
    bassBoost: 3,
    trebleAir: 2,
    vocalClarity: 5,
    surround3D: true,
    spatialMode: 'studio',
    stereoWidth: 105,
    tubeWarmth: 4,
    compressor: true,
  },
  {
    id: 'podcast',
    name: '播客对白增强 (Podcast & Speech)',
    category: 'vocal',
    gains: [-4, -3, -1, 2, 4, 4.5, 3.5, 2, -1, -3],
    preamp: 0,
    bassBoost: 0,
    trebleAir: 1,
    vocalClarity: 8,
    surround3D: false,
    spatialMode: 'off',
    stereoWidth: 100,
    tubeWarmth: 1,
    compressor: true,
  },

  // 4. 设备补偿预设 (Device Compensation)
  {
    id: 'headphone_bass',
    name: '耳机重低音澎湃 (Headphone Extra Bass)',
    category: 'device',
    gains: [6.5, 5.5, 4, 1.5, -0.5, 0.5, 2, 3, 3.5, 4],
    preamp: -1.5,
    bassBoost: 6,
    trebleAir: 3,
    vocalClarity: 2,
    surround3D: true,
    spatialMode: 'studio',
    stereoWidth: 115,
    tubeWarmth: 2,
    compressor: true,
  },
  {
    id: 'headphone_air',
    name: 'Hi-Fi 通透空气感 (Hi-Fi Air Sparkle)',
    category: 'device',
    gains: [2, 1.5, 0.5, 0, 0.5, 1, 2.5, 4, 5.5, 6.5],
    preamp: -1,
    bassBoost: 2,
    trebleAir: 7,
    vocalClarity: 3,
    surround3D: true,
    spatialMode: 'studio',
    stereoWidth: 120,
    tubeWarmth: 2,
    compressor: false,
  },
  {
    id: 'speaker_optimize',
    name: '笔记本/小音响增强 (Small Speaker Boost)',
    category: 'device',
    gains: [-3, 1, 3.5, 3, 2, 1.5, 2.5, 4, 4.5, 3],
    preamp: 0,
    bassBoost: 4,
    trebleAir: 4,
    vocalClarity: 4,
    surround3D: true,
    spatialMode: 'wide',
    stereoWidth: 135,
    tubeWarmth: 3,
    compressor: true,
  },
  {
    id: 'car_audio',
    name: '车载沉浸动感 (Car Audio Surround)',
    category: 'device',
    gains: [6, 5, 3, 1, -1, 1, 2.5, 4, 4.5, 5],
    preamp: -1.5,
    bassBoost: 6,
    trebleAir: 4,
    vocalClarity: 3,
    surround3D: true,
    spatialMode: 'wide',
    stereoWidth: 140,
    tubeWarmth: 3,
    compressor: true,
  },

  // 5. 场景音效 (Scenes)
  {
    id: 'cinema_3d',
    name: '影院全景杜比声 (Cinema 3D Spatial)',
    category: 'scene',
    gains: [7, 5.5, 3, 1, 0, 1.5, 3, 4.5, 6, 7],
    preamp: -2,
    bassBoost: 7,
    trebleAir: 6,
    vocalClarity: 4,
    surround3D: true,
    spatialMode: 'hall',
    stereoWidth: 150,
    tubeWarmth: 2,
    compressor: true,
  },
  {
    id: 'night_relax',
    name: '深夜柔和助眠 (Night Warm Lo-Fi)',
    category: 'scene',
    gains: [3, 2.5, 2, 1, 0, -1, -2, -3, -4, -5],
    preamp: 0,
    bassBoost: 2,
    trebleAir: 0,
    vocalClarity: 1,
    surround3D: true,
    spatialMode: 'studio',
    stereoWidth: 110,
    tubeWarmth: 6,
    compressor: true,
  },
];

// Helper to calculate tube saturation curve
function makeDistortionCurve(amount = 20, nSamples = 44100): Float32Array {
  const curve = new Float32Array(nSamples);
  const deg = Math.PI / 180;
  const k = typeof amount === 'number' ? amount : 20;
  for (let i = 0; i < nSamples; i++) {
    const x = (i * 2) / nSamples - 1;
    if (k === 0) {
      curve[i] = x;
    } else {
      // Soft tube warmth curve with subtle 2nd order harmonic bias
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
  }
  return curve;
}

// Procedural Reverb Impulse Generator
function createImpulseResponse(ctx: AudioContext, duration = 1.5, decay = 2.0): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const n = length - i;
    const factor = Math.pow(n / length, decay);
    left[i] = (Math.random() * 2 - 1) * factor;
    right[i] = (Math.random() * 2 - 1) * factor;
  }
  return impulse;
}

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;

  // DSP Graph Nodes
  private preampNode: GainNode | null = null;
  private dryGainNode: GainNode | null = null;
  private wetGainNode: GainNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private vocalFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  private eq10Filters: BiquadFilterNode[] = [];
  private eq15Filters: BiquadFilterNode[] = [];
  private tubeWarmthNode: WaveShaperNode | null = null;
  private tubeDryGain: GainNode | null = null;
  private tubeWetGain: GainNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private convolverNode: ConvolverNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private masterGainNode: GainNode | null = null;

  // State
  private isInitialized = false;
  private isConnectedToGraph = false;
  private currentVolume = 0.85;
  private currentRawUrl = '';
  private isProxyRetry = false;
  private simulatedPhase = 0;
  private currentBandsMode: '10' | '15' = '10';
  private cachedGains: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  private isBypassed = false;
  private impulseBuffers: { [key: string]: AudioBuffer } = {};
  // Native (iOS AVPlayer) playback routing. When enabled, playback control and
  // position/duration reads go to the native plugin instead of the HTML5
  // element; volume/EQ setters are ignored (they only affect the Web Audio DSP
  // graph, which is unused in native mode).
  private nativeMode = false;
  private nativeSnapshot = { playing: false, position: 0, duration: 0 };

  constructor() {
    this.initAudioElement();
  }

  private initAudioElement() {
    if (this.audioElement) return;
    this.audioElement = new Audio();
    this.audioElement.preload = 'auto';
    this.audioElement.volume = this.currentVolume;
  }

  private initContext() {
    if (this.isInitialized) return;
    this.initAudioElement();

    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.audioCtx = new AudioCtxClass();

      // 1. Analyser Node
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.82;

      // 2. Preamp Gain Node
      this.preampNode = this.audioCtx.createGain();
      this.preampNode.gain.value = 1.0;

      // 3. Bypass / Wet routing
      this.dryGainNode = this.audioCtx.createGain();
      this.wetGainNode = this.audioCtx.createGain();
      this.dryGainNode.gain.value = 0;
      this.wetGainNode.gain.value = 1.0;

      // 4. Bass Boost (80Hz Low Shelf)
      this.bassFilter = this.audioCtx.createBiquadFilter();
      this.bassFilter.type = 'lowshelf';
      this.bassFilter.frequency.value = 80;
      this.bassFilter.gain.value = 0;

      // 5. Vocal Clarity (2.8kHz Peaking)
      this.vocalFilter = this.audioCtx.createBiquadFilter();
      this.vocalFilter.type = 'peaking';
      this.vocalFilter.frequency.value = 2800;
      this.vocalFilter.Q.value = 1.2;
      this.vocalFilter.gain.value = 0;

      // 6. Treble Air Band (12kHz High Shelf)
      this.trebleFilter = this.audioCtx.createBiquadFilter();
      this.trebleFilter.type = 'highshelf';
      this.trebleFilter.frequency.value = 12000;
      this.trebleFilter.gain.value = 0;

      // 7. 10-Band EQ Filters
      this.eq10Filters = EQ_FREQUENCIES_10.map((freq, index) => {
        const filter = this.audioCtx!.createBiquadFilter();
        if (index === 0) {
          filter.type = 'lowshelf';
        } else if (index === EQ_FREQUENCIES_10.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.value = 1.414;
        }
        filter.frequency.value = freq;
        filter.gain.value = 0;
        return filter;
      });

      // 8. 15-Band EQ Filters
      this.eq15Filters = EQ_FREQUENCIES_15.map((freq, index) => {
        const filter = this.audioCtx!.createBiquadFilter();
        if (index === 0) {
          filter.type = 'lowshelf';
        } else if (index === EQ_FREQUENCIES_15.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.value = 2.0;
        }
        filter.frequency.value = freq;
        filter.gain.value = 0;
        return filter;
      });

      // 9. Tube Warmth (WaveShaper Node)
      this.tubeWarmthNode = this.audioCtx.createWaveShaper();
      this.tubeWarmthNode.curve = makeDistortionCurve(15) as Float32Array<ArrayBuffer>;
      this.tubeWarmthNode.oversample = '4x';
      this.tubeDryGain = this.audioCtx.createGain();
      this.tubeWetGain = this.audioCtx.createGain();
      this.tubeDryGain.gain.value = 1.0;
      this.tubeWetGain.gain.value = 0.0;

      // 10. Stereo Panner
      if (this.audioCtx.createStereoPanner) {
        this.pannerNode = this.audioCtx.createStereoPanner();
      }

      // 11. Spatial Convolver Reverb
      this.convolverNode = this.audioCtx.createConvolver();
      this.reverbWetGain = this.audioCtx.createGain();
      this.reverbWetGain.gain.value = 0.0;
      this.impulseBuffers = {
        studio: createImpulseResponse(this.audioCtx, 0.6, 3.5),
        hall: createImpulseResponse(this.audioCtx, 2.2, 1.8),
        club: createImpulseResponse(this.audioCtx, 1.2, 2.5),
        wide: createImpulseResponse(this.audioCtx, 1.0, 3.0),
      };

      // 12. Mastering Peak Limiter / Dynamics Compressor
      this.compressorNode = this.audioCtx.createDynamicsCompressor();
      this.compressorNode.threshold.setValueAtTime(-14, this.audioCtx.currentTime);
      this.compressorNode.knee.setValueAtTime(20, this.audioCtx.currentTime);
      this.compressorNode.ratio.setValueAtTime(4, this.audioCtx.currentTime);
      this.compressorNode.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
      this.compressorNode.release.setValueAtTime(0.15, this.audioCtx.currentTime);

      // 13. Master Gain Node
      this.masterGainNode = this.audioCtx.createGain();
      this.masterGainNode.gain.value = 1.0;

      // 14. Connect Media Source into Chain
      this.tryConnectMediaSource();

      this.isInitialized = true;
    } catch (e) {
      console.warn('[AudioEngine] Web Audio context init failed:', e);
    }
  }

  private tryConnectMediaSource() {
    if (!this.audioCtx || !this.audioElement || this.sourceNode) return;

    try {
      this.sourceNode = this.audioCtx.createMediaElementSource(this.audioElement);

      // Connect: source -> preamp -> [dry | wet]
      this.sourceNode.connect(this.preampNode!);

      // Bypass route: preamp -> dryGain -> masterGain
      this.preampNode!.connect(this.dryGainNode!);
      this.dryGainNode!.connect(this.masterGainNode!);

      // Wet DSP Chain route: preamp -> wetGain -> bassFilter -> vocalFilter -> trebleFilter
      this.preampNode!.connect(this.wetGainNode!);
      this.wetGainNode!.connect(this.bassFilter!);
      this.bassFilter!.connect(this.vocalFilter!);
      this.vocalFilter!.connect(this.trebleFilter!);

      // Connect 10-Band cascade
      let currentOut: AudioNode = this.trebleFilter!;
      for (let i = 0; i < this.eq10Filters.length; i++) {
        currentOut.connect(this.eq10Filters[i]);
        currentOut = this.eq10Filters[i];
      }

      // Tube warmth mix
      currentOut.connect(this.tubeDryGain!);
      currentOut.connect(this.tubeWarmthNode!);
      this.tubeWarmthNode!.connect(this.tubeWetGain!);

      const postTube = this.audioCtx.createGain();
      this.tubeDryGain!.connect(postTube);
      this.tubeWetGain!.connect(postTube);

      // Stereo panner
      if (this.pannerNode) {
        postTube.connect(this.pannerNode);
        currentOut = this.pannerNode;
      } else {
        currentOut = postTube;
      }

      // Convolver Reverb mix
      if (this.convolverNode && this.reverbWetGain) {
        currentOut.connect(this.convolverNode);
        this.convolverNode.connect(this.reverbWetGain);
        this.reverbWetGain.connect(this.compressorNode!);
      }

      // Compressor & Master Out
      currentOut.connect(this.compressorNode!);
      this.compressorNode!.connect(this.masterGainNode!);

      // Master to Analyser & Destination
      this.masterGainNode!.connect(this.analyser!);
      this.masterGainNode!.connect(this.audioCtx.destination);

      this.isConnectedToGraph = true;
    } catch (err) {
      console.warn('[AudioEngine] MediaElementSource routing warning (handled gracefully):', err);
    }
  }

  public async resume() {
    this.initContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (err) {
        console.warn('[AudioEngine] AudioContext resume error:', err);
      }
    }
  }

  public normalizeAudioUrl(rawUrl: string): string {
    if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
      return '';
    }
    const trimmed = rawUrl.trim();
    if (trimmed.startsWith('/api/')) {
      const base = getApiBase();
      return base ? `${base}${trimmed}` : trimmed;
    }
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
      return trimmed;
    }
    const isHttp = trimmed.startsWith('http://') || trimmed.startsWith('https://');

    if (isHttp) {
      // Direct load official CDN (single-bandwidth, no backend relay).
      // Playback of cross-origin media needs no CORS; on failure the onerror
      // handler below retries through the backend proxy (/api/proxy/audio).
      return trimmed;
    }
    return trimmed;
  }

  /**
   * Route playback through the native AVPlayer plugin instead of the HTML5
   * element. Call after `initNativePlayback` succeeded on iOS. EQ/DSP/volume
   * controls become inert while enabled (native audio bypasses Web Audio).
   */
  public setNativeMode(enabled: boolean): void {
    this.nativeMode = enabled;
  }

  public isUsingNativePlayback(): boolean {
    return this.nativeMode && isNativePlayback();
  }

  public async loadTrack(
    url: string,
    onEnded: () => void,
    onError: (e: unknown) => void,
    metadata?: { title?: string; artist?: string; album?: string; duration?: number },
  ): Promise<void> {
    this.initAudioElement();

    this.currentRawUrl = url;
    this.isProxyRetry = false;

    const playUrl = this.normalizeAudioUrl(url);

    if (this.isUsingNativePlayback()) {
      // Native AVPlayer: hand the resolved URL straight to the plugin and let it
      // own loading + background playback. If the plugin call fails, fall back to
      // the HTML5 path so the session still works.
      const resumePos = this.getCurrentTime();
      const ok = await nativeSetSource(playUrl, {
        title: metadata?.title,
        artist: metadata?.artist,
        album: metadata?.album,
        duration: metadata?.duration || 0,
      }, resumePos);
      if (ok) {
        this.nativeSnapshot = { playing: false, position: resumePos, duration: metadata?.duration || 0 };
        return;
      }
      console.warn('[AudioEngine] native playback failed to load, falling back to HTML5');
      this.loadTrackHtml5(playUrl, onEnded, onError);
      return;
    }

    this.loadTrackHtml5(playUrl, onEnded, onError);
  }

  private loadTrackHtml5(playUrl: string, onEnded: () => void, onError: (e: unknown) => void) {
    if (!this.audioElement) return;

    // When playing a cross-origin CDN link directly through the WebAudio DSP
    // graph (createMediaElementSource), the CDN MUST return Access-Control-Allow-Origin
    // or the graph outputs silence. crossOrigin='anonymous' makes the browser send a
    // CORS request: CDNs that allow it play directly (single bandwidth); CDNs that
    // block it fire onerror below and we fall back to the backend proxy (which
    // appends Access-Control-Allow-Origin: * so WebAudio can output audio).
    this.audioElement.crossOrigin = playUrl.startsWith('http://') || playUrl.startsWith('https://') ? 'anonymous' : '';

    this.audioElement.pause();
    this.audioElement.src = playUrl;
    this.audioElement.onended = onEnded;

    this.audioElement.onerror = (e) => {
      console.warn('[AudioEngine] Audio stream error on:', playUrl, e);
      if (!this.isProxyRetry && this.currentRawUrl && !playUrl.startsWith(`${getApiBase()}/api/proxy/audio`)) {
        this.isProxyRetry = true;
        const proxiedUrl = `${getApiBase()}/api/proxy/audio?url=${encodeURIComponent(this.currentRawUrl)}`;
        if (this.audioElement) {
          // Proxy responses come from our own origin with ACAO:* — clear crossOrigin
          // so the WebAudio MediaElementSource gets real samples, not zeroes.
          this.audioElement.crossOrigin = '';
          this.audioElement.src = proxiedUrl;
          this.audioElement.play().catch(() => {});
        }
        return;
      }
      onError(e);
    };
  }

  public async play(): Promise<void> {
    if (this.isUsingNativePlayback()) {
      nativePlay();
      return;
    }
    await this.resume();
    if (!this.audioElement) return;
    try {
      await this.audioElement.play();
    } catch (e) {
      console.warn('[AudioEngine] Playback trigger warning:', e);
    }
  }

  public pause(): void {
    if (this.isUsingNativePlayback()) {
      nativePause();
      return;
    }
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  public seek(seconds: number): void {
    if (this.isUsingNativePlayback()) {
      nativeSeek(Math.max(0, seconds || 0));
      return;
    }
    if (this.audioElement && isFinite(seconds)) {
      this.audioElement.currentTime = Math.max(0, seconds);
    }
  }

  public setVolume(val: number): void {
    this.currentVolume = Math.max(0, Math.min(1, val));
    if (this.audioElement) {
      this.audioElement.volume = this.currentVolume;
    }
  }

  public getCurrentVolume(): number {
    return this.currentVolume;
  }

  public setPlaybackRate(rate: number): void {
    if (this.isUsingNativePlayback()) {
      nativeSetRate(rate);
      return;
    }
    if (this.audioElement) {
      this.audioElement.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    }
  }

  // --- Professional EQ & DSP Setters ---

  public setBandsMode(mode: '10' | '15') {
    this.currentBandsMode = mode;
  }

  public setEQGains(gains: number[], mode: '10' | '15' = '10') {
    this.cachedGains = gains;
    this.currentBandsMode = mode;
    if (!this.audioCtx) return;

    const filters = mode === '15' ? this.eq15Filters : this.eq10Filters;
    filters.forEach((filter, i) => {
      if (gains[i] !== undefined) {
        filter.gain.setTargetAtTime(gains[i], this.audioCtx!.currentTime, 0.02);
      }
    });
  }

  public setPreampGain(dB: number) {
    if (this.preampNode && this.audioCtx) {
      const linear = Math.pow(10, dB / 20);
      this.preampNode.gain.setTargetAtTime(linear, this.audioCtx.currentTime, 0.02);
    }
  }

  public setBypass(bypassed: boolean) {
    this.isBypassed = bypassed;
    if (!this.audioCtx || !this.dryGainNode || !this.wetGainNode) return;
    const now = this.audioCtx.currentTime;
    if (bypassed) {
      this.dryGainNode.gain.setTargetAtTime(1.0, now, 0.02);
      this.wetGainNode.gain.setTargetAtTime(0.0, now, 0.02);
    } else {
      this.dryGainNode.gain.setTargetAtTime(0.0, now, 0.02);
      this.wetGainNode.gain.setTargetAtTime(1.0, now, 0.02);
    }
  }

  public setBassBoost(level: number) {
    if (this.bassFilter && this.audioCtx) {
      // 0 to 10 -> 0dB to +12dB
      const gainValue = (level / 10) * 12;
      this.bassFilter.gain.setTargetAtTime(gainValue, this.audioCtx.currentTime, 0.02);
    }
  }

  public setVocalClarity(level: number) {
    if (this.vocalFilter && this.audioCtx) {
      // 0 to 10 -> 0dB to +8dB
      const gainValue = (level / 10) * 8;
      this.vocalFilter.gain.setTargetAtTime(gainValue, this.audioCtx.currentTime, 0.02);
    }
  }

  public setTrebleAir(level: number) {
    if (this.trebleFilter && this.audioCtx) {
      // 0 to 10 -> 0dB to +9dB
      const gainValue = (level / 10) * 9;
      this.trebleFilter.gain.setTargetAtTime(gainValue, this.audioCtx.currentTime, 0.02);
    }
  }

  public setTubeWarmth(level: number) {
    if (!this.audioCtx || !this.tubeDryGain || !this.tubeWetGain) return;
    const wet = Math.min(1, Math.max(0, level / 10));
    this.tubeDryGain.gain.setTargetAtTime(1.0 - wet * 0.3, this.audioCtx.currentTime, 0.02);
    this.tubeWetGain.gain.setTargetAtTime(wet * 0.7, this.audioCtx.currentTime, 0.02);
  }

  public setStereoWidth(percent: number) {
    if (!this.pannerNode || !this.audioCtx) return;
    // 0% (mono) to 200% (extra wide)
    const panVal = Math.max(-1, Math.min(1, (percent - 100) / 400));
    this.pannerNode.pan.setTargetAtTime(panVal, this.audioCtx.currentTime, 0.02);
  }

  public setSurround3D(enabled: boolean) {
    if (!this.pannerNode || !this.audioCtx) return;
    this.pannerNode.pan.setTargetAtTime(enabled ? 0.2 : 0, this.audioCtx.currentTime, 0.02);
  }

  public setSpatialMode(mode: 'off' | 'studio' | 'hall' | 'club' | 'wide') {
    if (!this.audioCtx || !this.convolverNode || !this.reverbWetGain) return;

    if (mode === 'off' || !this.impulseBuffers[mode]) {
      this.reverbWetGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.03);
    } else {
      this.convolverNode.buffer = this.impulseBuffers[mode];
      const mixAmounts: { [key: string]: number } = {
        studio: 0.18,
        hall: 0.35,
        club: 0.28,
        wide: 0.25,
      };
      const wet = mixAmounts[mode] || 0.2;
      this.reverbWetGain.gain.setTargetAtTime(wet, this.audioCtx.currentTime, 0.03);
    }
  }

  public setCompressorEnabled(enabled: boolean) {
    if (!this.compressorNode || !this.audioCtx) return;
    if (enabled) {
      this.compressorNode.threshold.setTargetAtTime(-14, this.audioCtx.currentTime, 0.02);
      this.compressorNode.ratio.setTargetAtTime(4, this.audioCtx.currentTime, 0.02);
    } else {
      this.compressorNode.threshold.setTargetAtTime(0, this.audioCtx.currentTime, 0.02);
      this.compressorNode.ratio.setTargetAtTime(1, this.audioCtx.currentTime, 0.02);
    }
  }

  public applySettings(settings: AudioSettings) {
    this.setBandsMode(settings.bandsMode || '10');
    this.setEQGains(settings.eqGains, settings.bandsMode || '10');
    this.setPreampGain(settings.preampGain ?? 0);
    this.setBypass(settings.isBypassed ?? false);
    this.setBassBoost(settings.bassBoost ?? 0);
    this.setVocalClarity(settings.vocalClarity ?? 0);
    this.setTrebleAir(settings.trebleAir ?? 0);
    this.setTubeWarmth(settings.tubeWarmth ?? 0);
    this.setStereoWidth(settings.stereoWidth ?? 100);
    this.setSurround3D(settings.surround3D ?? false);
    this.setSpatialMode(settings.spatialMode ?? 'off');
    this.setCompressorEnabled(settings.compressorEnabled ?? true);
  }

  /**
   * Calculates the exact mathematical frequency response curve in dB across n log-spaced frequencies
   */
  public calculateFrequencyResponse(
    testFreqs: Float32Array,
    gains: number[],
    mode: '10' | '15' = '10',
    preampDb = 0,
    bassBoost = 0,
    vocalClarity = 0,
    trebleAir = 0
  ): Float32Array {
    const n = testFreqs.length;
    const totalMag = new Float32Array(n).fill(1.0);
    const mag = new Float32Array(n);
    const phase = new Float32Array(n);

    if (!this.audioCtx) {
      // Fallback interpolation if AudioContext not ready
      const freqs = mode === '15' ? EQ_FREQUENCIES_15 : EQ_FREQUENCIES_10;
      const res = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const f = testFreqs[i];
        let interpolatedGain = 0;
        for (let j = 0; j < freqs.length; j++) {
          const dist = Math.abs(Math.log10(f / freqs[j]));
          const weight = Math.exp(-dist * dist * 4);
          interpolatedGain += (gains[j] || 0) * weight;
        }
        res[i] = interpolatedGain + preampDb;
      }
      return res;
    }

    try {
      const filters = mode === '15' ? this.eq15Filters : this.eq10Filters;

      // 1. Cascaded EQ filters response
      filters.forEach((filter, idx) => {
        if (gains[idx] !== undefined && gains[idx] !== 0) {
          filter.getFrequencyResponse(testFreqs, mag, phase);
          for (let i = 0; i < n; i++) {
            totalMag[i] *= mag[i];
          }
        }
      });

      // 2. Bass Boost filter response
      if (this.bassFilter && bassBoost > 0) {
        this.bassFilter.getFrequencyResponse(testFreqs, mag, phase);
        for (let i = 0; i < n; i++) {
          totalMag[i] *= mag[i];
        }
      }

      // 3. Vocal Clarity filter response
      if (this.vocalFilter && vocalClarity > 0) {
        this.vocalFilter.getFrequencyResponse(testFreqs, mag, phase);
        for (let i = 0; i < n; i++) {
          totalMag[i] *= mag[i];
        }
      }

      // 4. Treble Air filter response
      if (this.trebleFilter && trebleAir > 0) {
        this.trebleFilter.getFrequencyResponse(testFreqs, mag, phase);
        for (let i = 0; i < n; i++) {
          totalMag[i] *= mag[i];
        }
      }

      // Convert linear magnitude product to decibels
      const resultDb = new Float32Array(n);
      const preampFactor = Math.pow(10, preampDb / 20);
      for (let i = 0; i < n; i++) {
        const linear = totalMag[i] * preampFactor;
        resultDb[i] = linear > 0.0001 ? 20 * Math.log10(linear) : -80;
      }
      return resultDb;
    } catch {
      return new Float32Array(n).fill(preampDb);
    }
  }

  public getCurrentTime(): number {
    if (this.isUsingNativePlayback()) {
      const snap = getNativeSnapshot();
      return snap.position;
    }
    return this.audioElement ? this.audioElement.currentTime : 0;
  }

  public getDuration(): number {
    if (this.isUsingNativePlayback()) {
      const snap = getNativeSnapshot();
      return snap.duration || this.audioElement?.duration || 0;
    }
    return this.audioElement && !isNaN(this.audioElement.duration) ? this.audioElement.duration : 0;
  }

  public getAnalyserData(frequencyArray: Uint8Array): void {
    const isPlaying = this.audioElement && !this.audioElement.paused && this.audioElement.currentTime > 0;

    if (this.analyser && this.isConnectedToGraph && isPlaying) {
      this.analyser.getByteFrequencyData(frequencyArray);
      let sum = 0;
      for (let i = 0; i < Math.min(16, frequencyArray.length); i++) {
        sum += frequencyArray[i];
      }
      if (sum > 10) return;
    }

    if (isPlaying) {
      this.simulatedPhase += 0.08;
      const time = this.audioElement?.currentTime || 0;
      const beat = Math.sin(time * 3.5) * 0.5 + 0.5;
      const subBeat = Math.cos(time * 7) * 0.5 + 0.5;

      for (let i = 0; i < frequencyArray.length; i++) {
        const factor = 1 - i / frequencyArray.length;
        const wave = Math.sin(this.simulatedPhase + i * 0.25) * 0.5 + 0.5;
        const val = (beat * 0.6 + subBeat * 0.4) * factor * 180 * wave * this.currentVolume + 40 * factor;
        frequencyArray[i] = Math.min(255, Math.max(0, Math.floor(val)));
      }
    } else {
      for (let i = 0; i < frequencyArray.length; i++) {
        frequencyArray[i] = Math.max(0, frequencyArray[i] - 8);
      }
    }
  }

  public getTimeDomainData(timeArray: Uint8Array): void {
    const isPlaying = this.audioElement && !this.audioElement.paused && this.audioElement.currentTime > 0;

    if (this.analyser && this.isConnectedToGraph && isPlaying) {
      this.analyser.getByteTimeDomainData(timeArray);
      let isFlat = true;
      for (let i = 0; i < Math.min(16, timeArray.length); i++) {
        if (timeArray[i] !== 128) {
          isFlat = false;
          break;
        }
      }
      if (!isFlat) return;
    }

    if (isPlaying) {
      this.simulatedPhase += 0.05;
      for (let i = 0; i < timeArray.length; i++) {
        const val = 128 + Math.sin(this.simulatedPhase + i * 0.15) * 35 * this.currentVolume;
        timeArray[i] = Math.min(255, Math.max(0, Math.floor(val)));
      }
    } else {
      for (let i = 0; i < timeArray.length; i++) {
        timeArray[i] = 128;
      }
    }
  }

  public destroy() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }
  }
}

export const audioEngine = new AudioEngine();
