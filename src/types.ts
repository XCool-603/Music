export interface LyricLine {
  time: number; // in seconds
  text: string;
  translation?: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  coverUrl: string;
  audioUrl: string;
  genre: string;
  lyrics: string; // LRC formatted string
  isLocal?: boolean;
  bpm?: number;
  year?: number;
  themeColor?: string;
  bitrate?: string;
  sourceScriptId?: string;
  sourceKey?: string;
  sourceName?: string;
  sourceRawInfo?: any;
}

export interface Playlist {
  id: string;
  name: string;
  coverUrl: string;
  description: string;
  trackIds: string[];
  isCustom?: boolean;
  tags: string[];
  createdAt?: string;
}

export type PlaybackMode = 'sequence' | 'repeat-all' | 'repeat-one' | 'shuffle';

export type VisualizerMode = 'bars' | 'wave' | 'circle' | 'neon';

export type ActiveTab = 
  | 'discover'
  | 'search'
  | 'library'
  | 'favorites'
  | 'sources'
  | 'local'
  | 'mine'
  | 'playlist-detail'
  | 'equalizer'
  | 'recent';

export interface CustomSourceScript {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  enabled: boolean;
  rawCode: string;
  sources: string[];
  qualities: string[];
  homepage?: string;
  importedAt: string;
  status: 'ready' | 'error' | 'disabled';
  errorMsg?: string;
}

export interface EQPreset {
  id: string;
  name: string;
  category?: 'genre' | 'vocal' | 'device' | 'scene' | 'custom';
  gains: number[]; // 10 or 15 values in dB: [-15 to +15]
  preamp?: number;
  bassBoost?: number;
  trebleAir?: number;
  vocalClarity?: number;
  surround3D?: boolean;
  spatialMode?: 'off' | 'studio' | 'hall' | 'club' | 'wide';
  stereoWidth?: number;
  tubeWarmth?: number;
  compressor?: boolean;
}

export type StreamQuality = 'standard' | 'high' | 'lossless';

export interface AudioSettings {
  playbackSpeed: number; // 0.5 to 2.0
  quality: StreamQuality; // stream quality tier
  bassBoost: number; // 0 to 10
  trebleAir: number; // 0 to 10 (12kHz-20kHz air band sparkle)
  vocalClarity: number; // 0 to 10 (2kHz-4kHz vocal presence)
  surround3D: boolean;
  spatialMode: 'off' | 'studio' | 'hall' | 'club' | 'wide';
  stereoWidth: number; // 0 to 200 (%)
  tubeWarmth: number; // 0 to 10 (analog tube harmonic saturation)
  compressorEnabled: boolean; // mastering dynamics peak limiter
  preampGain: number; // -12 to +12 dB
  isBypassed: boolean; // A/B test bypass
  bandsMode: '10' | '15'; // 10-band or 15-band mode
  eqGains: number[]; // 10 or 15 values
  selectedPreset: string;
  customPresets?: EQPreset[];
}

export type DeviceViewMode = 'responsive' | 'mobile' | 'tablet' | 'desktop';

export interface GenreCategory {
  id: string;
  name: string;
  icon: string;
  filterKeywords: string[];
}
