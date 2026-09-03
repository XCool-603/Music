import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  EQ_FREQUENCIES_10,
  EQ_FREQUENCIES_15,
  BAND_METAS_10,
  BAND_METAS_15,
  EQ_PRESETS,
  audioEngine,
} from '../utils/audioEngine';
import { AudioSettings, EQPreset } from '../types';
import {
  Sliders,
  RotateCcw,
  Volume2,
  Sparkles,
  X,
  Activity,
  Mic,
  Headphones,
  Bookmark,
  Plus,
  Trash2,
  Radio,
  ShieldCheck,
  Waves,
  ArrowDownUp,
  Cpu,
  Check,
  Zap,
} from 'lucide-react';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioSettings: AudioSettings;
  setAudioSettings: React.Dispatch<React.SetStateAction<AudioSettings>>;
}

const STORAGE_CUSTOM_PRESETS = 'muse_custom_eq_presets';

export const EqualizerModal: React.FC<EqualizerModalProps> = ({
  isOpen,
  onClose,
  audioSettings,
  setAudioSettings,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [customPresets, setCustomPresets] = useState<EQPreset[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CUSTOM_PRESETS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [hoveredBandIndex, setHoveredBandIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'eq' | 'dsp' | 'presets'>('eq');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isDraggingNodeRef = useRef<number | null>(null);

  const bandsMode = audioSettings.bandsMode || '10';
  const frequencies = bandsMode === '15' ? EQ_FREQUENCIES_15 : EQ_FREQUENCIES_10;
  const bandMetas = bandsMode === '15' ? BAND_METAS_15 : BAND_METAS_10;

  // Ensure gains array matches frequency count
  const currentGains = useMemo(() => {
    const targetLen = frequencies.length;
    if (audioSettings.eqGains.length === targetLen) {
      return audioSettings.eqGains;
    }
    const newArr = new Array(targetLen).fill(0);
    for (let i = 0; i < Math.min(audioSettings.eqGains.length, targetLen); i++) {
      newArr[i] = audioSettings.eqGains[i];
    }
    return newArr;
  }, [audioSettings.eqGains, frequencies.length]);

  // Save custom presets to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CUSTOM_PRESETS, JSON.stringify(customPresets));
    } catch (e) {
      console.error(e);
    }
  }, [customPresets]);

  // Apply all DSP settings to audio engine
  const updateSettings = useCallback(
    (updater: (prev: AudioSettings) => AudioSettings) => {
      setAudioSettings((prev) => {
        const next = updater(prev);
        audioEngine.applySettings(next);
        return next;
      });
    },
    [setAudioSettings]
  );

  // Handle Gain Change for a specific band
  const handleGainChange = (bandIndex: number, value: number) => {
    const clamped = Math.max(-12, Math.min(12, Math.round(value * 2) / 2));
    const nextGains = [...currentGains];
    nextGains[bandIndex] = clamped;

    updateSettings((prev) => ({
      ...prev,
      eqGains: nextGains,
      selectedPreset: 'custom',
    }));
  };

  // Change Band Mode (10 vs 15)
  const handleBandModeToggle = (mode: '10' | '15') => {
    if (mode === bandsMode) return;
    const targetFreqs = mode === '15' ? EQ_FREQUENCIES_15 : EQ_FREQUENCIES_10;
    const newGains = new Array(targetFreqs.length).fill(0);

    // Interpolate previous curve into new frequency grid
    targetFreqs.forEach((tf, newIdx) => {
      let nearestIdx = 0;
      let minDiff = Infinity;
      frequencies.forEach((oldFreq, oldIdx) => {
        const diff = Math.abs(Math.log2(tf / oldFreq));
        if (diff < minDiff) {
          minDiff = diff;
          nearestIdx = oldIdx;
        }
      });
      newGains[newIdx] = currentGains[nearestIdx] || 0;
    });

    updateSettings((prev) => ({
      ...prev,
      bandsMode: mode,
      eqGains: newGains,
      selectedPreset: 'custom',
    }));
  };

  // Select Preset
  const handlePresetSelect = (preset: EQPreset) => {
    let matchedGains = [...preset.gains];
    if (matchedGains.length !== frequencies.length) {
      // Scale gains if band count differs
      matchedGains = new Array(frequencies.length).fill(0).map((_, i) => {
        const ratio = i / (frequencies.length - 1);
        const srcIdx = Math.min(preset.gains.length - 1, Math.floor(ratio * (preset.gains.length - 1)));
        return preset.gains[srcIdx] || 0;
      });
    }

    updateSettings((prev) => ({
      ...prev,
      selectedPreset: preset.id,
      eqGains: matchedGains,
      preampGain: preset.preamp !== undefined ? preset.preamp : prev.preampGain,
      bassBoost: preset.bassBoost !== undefined ? preset.bassBoost : prev.bassBoost,
      trebleAir: preset.trebleAir !== undefined ? preset.trebleAir : prev.trebleAir,
      vocalClarity: preset.vocalClarity !== undefined ? preset.vocalClarity : prev.vocalClarity,
      surround3D: preset.surround3D !== undefined ? preset.surround3D : prev.surround3D,
      spatialMode: preset.spatialMode !== undefined ? preset.spatialMode : prev.spatialMode,
      stereoWidth: preset.stereoWidth !== undefined ? preset.stereoWidth : prev.stereoWidth,
      tubeWarmth: preset.tubeWarmth !== undefined ? preset.tubeWarmth : prev.tubeWarmth,
      compressorEnabled: preset.compressor !== undefined ? preset.compressor : prev.compressorEnabled,
    }));
  };

  // Curve Tools: Flat Reset
  const handleFlatReset = () => {
    updateSettings((prev) => ({
      ...prev,
      selectedPreset: 'flat',
      eqGains: new Array(frequencies.length).fill(0),
      preampGain: 0,
      bassBoost: 0,
      trebleAir: 0,
      vocalClarity: 0,
      tubeWarmth: 0,
    }));
  };

  // Curve Tools: Smooth
  const handleSmoothCurve = () => {
    const nextGains = currentGains.map((val, idx, arr) => {
      const prev = arr[idx - 1] ?? val;
      const next = arr[idx + 1] ?? val;
      return Math.round(((prev + val * 2 + next) / 4) * 2) / 2;
    });
    updateSettings((prev) => ({
      ...prev,
      eqGains: nextGains,
      selectedPreset: 'custom',
    }));
  };

  // Curve Tools: Invert
  const handleInvertCurve = () => {
    const nextGains = currentGains.map((v) => -v);
    updateSettings((prev) => ({
      ...prev,
      eqGains: nextGains,
      selectedPreset: 'custom',
    }));
  };

  // Save Custom Preset
  const handleSaveCustomPreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset: EQPreset = {
      id: `custom_${Date.now()}`,
      name: newPresetName.trim(),
      category: 'custom',
      gains: [...currentGains],
      preamp: audioSettings.preampGain,
      bassBoost: audioSettings.bassBoost,
      trebleAir: audioSettings.trebleAir,
      vocalClarity: audioSettings.vocalClarity,
      surround3D: audioSettings.surround3D,
      spatialMode: audioSettings.spatialMode,
      stereoWidth: audioSettings.stereoWidth,
      tubeWarmth: audioSettings.tubeWarmth,
      compressor: audioSettings.compressorEnabled,
    };

    setCustomPresets((prev) => [newPreset, ...prev]);
    setNewPresetName('');
    setIsSavingPreset(false);
    updateSettings((prev) => ({ ...prev, selectedPreset: newPreset.id }));
  };

  // Delete Custom Preset
  const handleDeleteCustomPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomPresets((prev) => prev.filter((p) => p.id !== id));
    if (audioSettings.selectedPreset === id) {
      updateSettings((prev) => ({ ...prev, selectedPreset: 'flat' }));
    }
  };

  // Preamp Gain Change
  const handlePreampChange = (val: number) => {
    updateSettings((prev) => ({ ...prev, preampGain: val }));
  };

  // Bypass Toggle
  const handleBypassToggle = () => {
    updateSettings((prev) => ({ ...prev, isBypassed: !prev.isBypassed }));
  };

  // Format Frequency
  const formatFreq = (f: number) => {
    if (f >= 1000) return `${f / 1000}k`;
    return `${f}`;
  };

  // --- Real-time Interactive Curve & FFT Spectrum Visualizer ---
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isDestroyed = false;
    const fftData = new Uint8Array(256);

    // Number of response curve test points
    const numPoints = 180;
    const minFreq = 20;
    const maxFreq = 20000;
    const testFreqs = new Float32Array(numPoints);
    for (let i = 0; i < numPoints; i++) {
      testFreqs[i] = minFreq * Math.pow(maxFreq / minFreq, i / (numPoints - 1));
    }

    const freqToX = (f: number, width: number) => {
      const minLog = Math.log10(minFreq);
      const maxLog = Math.log10(maxFreq);
      const logF = Math.log10(Math.max(minFreq, Math.min(maxFreq, f)));
      return ((logF - minLog) / (maxLog - minLog)) * width;
    };

    const dbToY = (db: number, height: number) => {
      const minDb = -15;
      const maxDb = 15;
      const clamped = Math.max(minDb, Math.min(maxDb, db));
      return height - ((clamped - minDb) / (maxDb - minDb)) * height;
    };

    const yToDb = (y: number, height: number) => {
      const minDb = -15;
      const maxDb = 15;
      const ratio = 1 - Math.max(0, Math.min(1, y / height));
      return minDb + ratio * (maxDb - minDb);
    };

    const render = () => {
      if (isDestroyed) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 600;
      const height = rect.height || 180;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // 1. Background Grid & Frequency Guides
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;

      // Frequency vertical lines (20, 50, 100, 250, 500, 1k, 2k, 5k, 10k, 20k)
      const guideFreqs = [50, 100, 250, 500, 1000, 2500, 5000, 10000];
      guideFreqs.forEach((f) => {
        const x = freqToX(f, width);
        ctx.beginPath();
        ctx.setLineDash([3, 4]);
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = '9px monospace';
        ctx.fillText(f >= 1000 ? `${f / 1000}k` : `${f}`, x + 3, height - 6);
      });

      // dB horizontal lines (+12, +6, 0, -6, -12)
      [-12, -6, 0, 6, 12].forEach((db) => {
        const y = dbToY(db, height);
        ctx.beginPath();
        if (db === 0) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.lineWidth = 1.2;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
        }
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = db === 0 ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.25)';
        ctx.font = '9px monospace';
        ctx.fillText(`${db > 0 ? '+' : ''}${db}dB`, 6, y - 3);
      });

      // 2. Real-time FFT Audio Spectrum in the background
      audioEngine.getAnalyserData(fftData);
      const barCount = 48;
      const barWidth = width / barCount;
      for (let i = 0; i < barCount; i++) {
        const val = fftData[Math.floor((i / barCount) * 80)] || 0;
        const normVal = val / 255;
        const barH = normVal * (height * 0.7);
        const bx = i * barWidth;
        const by = height - barH;

        const specGrad = ctx.createLinearGradient(0, by, 0, height);
        specGrad.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
        specGrad.addColorStop(1, 'rgba(14, 165, 233, 0.03)');

        ctx.fillStyle = specGrad;
        ctx.fillRect(bx, by, barWidth - 1, barH);
      }

      // 3. Exact Mathematical Frequency Response Curve
      const isBypassed = audioSettings.isBypassed ?? false;
      const responseDbs = isBypassed
        ? new Float32Array(numPoints).fill(audioSettings.preampGain || 0)
        : audioEngine.calculateFrequencyResponse(
            testFreqs,
            currentGains,
            bandsMode,
            audioSettings.preampGain || 0,
            audioSettings.bassBoost || 0,
            audioSettings.vocalClarity || 0,
            audioSettings.trebleAir || 0
          );

      // Draw Curve Fill
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let i = 0; i < numPoints; i++) {
        const x = freqToX(testFreqs[i], width);
        const y = dbToY(responseDbs[i], height);
        if (i === 0) ctx.lineTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();

      const curveFillGrad = ctx.createLinearGradient(0, 0, 0, height);
      if (isBypassed) {
        curveFillGrad.addColorStop(0, 'rgba(148, 163, 184, 0.15)');
        curveFillGrad.addColorStop(1, 'rgba(148, 163, 184, 0.0)');
      } else {
        curveFillGrad.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
        curveFillGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.15)');
        curveFillGrad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
      }
      ctx.fillStyle = curveFillGrad;
      ctx.fill();

      // Draw Curve Stroke Line
      ctx.beginPath();
      for (let i = 0; i < numPoints; i++) {
        const x = freqToX(testFreqs[i], width);
        const y = dbToY(responseDbs[i], height);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = isBypassed ? '#94a3b8' : '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = isBypassed ? 'transparent' : '#0ea5e9';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 4. Interactive Control Points for each EQ Band
      frequencies.forEach((freq, idx) => {
        const gain = currentGains[idx] || 0;
        const x = freqToX(freq, width);
        const y = dbToY(gain + (audioSettings.preampGain || 0), height);
        const isHovered = hoveredBandIndex === idx || isDraggingNodeRef.current === idx;

        // Band Guide Stem
        ctx.beginPath();
        ctx.strokeStyle = isHovered ? 'rgba(99, 102, 241, 0.6)' : 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = isHovered ? 1.5 : 1;
        ctx.moveTo(x, y);
        ctx.lineTo(x, height);
        ctx.stroke();

        // Control Node Outer Ring
        ctx.beginPath();
        ctx.arc(x, y, isHovered ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? '#ffffff' : '#0f172a';
        ctx.fill();
        ctx.strokeStyle = isHovered ? '#6366f1' : gain !== 0 ? '#38bdf8' : '#64748b';
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.stroke();

        // Hover Tag Tooltip on Canvas
        if (isHovered) {
          const meta = bandMetas[idx];
          const text = `${meta.label}: ${gain > 0 ? '+' : ''}${gain.toFixed(1)} dB`;
          ctx.font = 'bold 10px monospace';
          const tw = ctx.measureText(text).width + 12;
          const tx = Math.max(10, Math.min(width - tw - 10, x - tw / 2));
          const ty = Math.max(20, y - 14);

          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.beginPath();
          ctx.roundRect(tx, ty - 12, tw, 18, 4);
          ctx.fill();
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#38bdf8';
          ctx.fillText(text, tx + 6, ty + 1);
        }
      });

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    // Canvas Pointer Events for Direct Curve Dragging
    const handlePointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      let closestIdx = -1;
      let minDistance = 25;

      frequencies.forEach((freq, idx) => {
        const nx = freqToX(freq, rect.width);
        const ny = dbToY(currentGains[idx] + (audioSettings.preampGain || 0), rect.height);
        const dist = Math.hypot(x - nx, y - ny);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = idx;
        }
      });

      if (closestIdx !== -1) {
        isDraggingNodeRef.current = closestIdx;
        setHoveredBandIndex(closestIdx);
        canvas.setPointerCapture(e.pointerId);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (isDraggingNodeRef.current !== null) {
        const bandIdx = isDraggingNodeRef.current;
        const targetDb = yToDb(y, rect.height) - (audioSettings.preampGain || 0);
        handleGainChange(bandIdx, targetDb);
      } else {
        // Detect Hover
        let foundIdx: number | null = null;
        frequencies.forEach((freq, idx) => {
          const nx = freqToX(freq, rect.width);
          const ny = dbToY(currentGains[idx] + (audioSettings.preampGain || 0), rect.height);
          const dist = Math.hypot(x - nx, y - ny);
          if (dist < 18) {
            foundIdx = idx;
          }
        });
        setHoveredBandIndex(foundIdx);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (isDraggingNodeRef.current !== null) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch {}
        isDraggingNodeRef.current = null;
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);

    return () => {
      isDestroyed = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isOpen, currentGains, frequencies, bandMetas, bandsMode, audioSettings, hoveredBandIndex]);

  if (!isOpen) return null;

  // Filter presets
  const allPresets = [...EQ_PRESETS, ...customPresets];
  const filteredPresets = allPresets.filter((p) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'custom') return p.category === 'custom';
    return p.category === activeCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-950/95 border border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 text-cyan-400 rounded-2xl border border-cyan-500/30 shadow-inner">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  DSP 专业母带级音频均衡器
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  32-bit Float Hi-Fi
                </span>
              </div>
              <p className="text-xs text-slate-400">硬件级多段级联 IIR 滤波器 · 空间混响拓宽 · 模拟电子管谐波</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bypass A/B Button */}
            <button
              onClick={handleBypassToggle}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                audioSettings.isBypassed
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
              title="A/B 旁通测试：快速对比原声音效与当前均衡器"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{audioSettings.isBypassed ? '已旁通 (原声直通)' : 'DSP 效果生效中'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Mode Tabs */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-900/60 border-b border-slate-800/60">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('eq')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'eq'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>频响曲线 & 多段推子</span>
            </button>
            <button
              onClick={() => setActiveTab('dsp')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'dsp'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>空间环绕 & 模拟胆管机架</span>
            </button>
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'presets'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>调音预设库 ({allPresets.length})</span>
            </button>
          </div>

          {/* Quick Curve Tools */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleFlatReset}
              className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg transition flex items-center gap-1 border border-slate-700/50"
              title="重置所有频段为 0dB 平直"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">一键平直</span>
            </button>
            <button
              onClick={handleSmoothCurve}
              className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg transition flex items-center gap-1 border border-slate-700/50"
              title="平滑曲线消除突变"
            >
              <Waves className="w-3 h-3" />
              <span className="hidden sm:inline">平滑曲线</span>
            </button>
            <button
              onClick={handleInvertCurve}
              className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg transition flex items-center gap-1 border border-slate-700/50"
              title="反向对称翻转当前增益"
            >
              <ArrowDownUp className="w-3 h-3" />
              <span className="hidden sm:inline">反相</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {activeTab === 'eq' && (
            <>
              {/* Interactive Curve Display Canvas */}
              <div className="relative bg-slate-950 rounded-2xl border border-slate-800/90 p-3 shadow-inner overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs font-mono font-semibold text-slate-300">
                      实时频响传递曲线 (Transfer Function) + 实时频谱
                    </span>
                  </div>

                  {/* 10-Band vs 15-Band Selector */}
                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                    <button
                      onClick={() => handleBandModeToggle('10')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition ${
                        bandsMode === '10' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      10 段标准
                    </button>
                    <button
                      onClick={() => handleBandModeToggle('15')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition ${
                        bandsMode === '15' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      15 段录音棚级
                    </button>
                  </div>
                </div>

                {/* Canvas */}
                <div className="relative h-44 sm:h-52 w-full touch-none cursor-crosshair">
                  <canvas ref={canvasRef} className="w-full h-full block rounded-xl" />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1 px-1">
                  <span>20Hz (极低频)</span>
                  <span>100Hz (低音)</span>
                  <span>1kHz (核心人声)</span>
                  <span>5kHz (存在感)</span>
                  <span>20kHz (空气感)</span>
                </div>
              </div>

              {/* Preamp & Channel Sliders Rack */}
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-800/80">
                  {/* Preamp Gain Control */}
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                      <span>前级增益 (Preamp)</span>
                    </div>
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={0.5}
                      value={audioSettings.preampGain ?? 0}
                      onChange={(e) => handlePreampChange(parseFloat(e.target.value))}
                      style={{ ['--slider-fill' as string]: `${(((audioSettings.preampGain ?? 0) + 12) / 24) * 100}%` }}
                      className="w-28 sm:w-36 accent-cyan-400 cursor-pointer"
                    />
                    <span
                      className={`text-xs font-mono font-bold w-12 text-right ${
                        (audioSettings.preampGain ?? 0) > 0
                          ? 'text-cyan-400'
                          : (audioSettings.preampGain ?? 0) < 0
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {(audioSettings.preampGain ?? 0) > 0 ? `+` : ''}
                      {(audioSettings.preampGain ?? 0).toFixed(1)}dB
                    </span>
                  </div>

                  {/* Active Preset Tag */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">当前方案:</span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {allPresets.find((p) => p.id === audioSettings.selectedPreset)?.name || '自定义调音 (Custom)'}
                    </span>
                  </div>
                </div>

                {/* Vertical Sliders Grid */}
                <div
                  className={`grid gap-1.5 sm:gap-2 pb-2 items-end ${
                    bandsMode === '15' ? 'grid-cols-8 sm:grid-cols-15' : 'grid-cols-5 sm:grid-cols-10'
                  }`}
                >
                  {frequencies.map((freq, idx) => {
                    const gain = currentGains[idx] || 0;
                    const meta = bandMetas[idx];
                    const isHovered = hoveredBandIndex === idx;

                    return (
                      <div
                        key={freq}
                        onMouseEnter={() => setHoveredBandIndex(idx)}
                        onMouseLeave={() => setHoveredBandIndex(null)}
                        className={`flex flex-col items-center justify-between p-1.5 rounded-xl transition duration-150 ${
                          isHovered ? 'bg-slate-800/80 ring-1 ring-cyan-500/50' : 'bg-slate-950/40'
                        }`}
                      >
                        {/* Gain Badge */}
                        <span
                          className={`text-[10px] font-mono font-bold px-1 rounded ${
                            gain > 0
                              ? 'text-cyan-300 bg-cyan-500/20'
                              : gain < 0
                              ? 'text-rose-300 bg-rose-500/20'
                              : 'text-slate-500'
                          }`}
                        >
                          {gain > 0 ? `+${gain}` : gain}
                        </span>

                        {/* Slider Track */}
                        <div className="relative h-32 sm:h-40 flex items-center justify-center my-1 w-full">
                          <input
                            type="range"
                            min={-12}
                            max={12}
                            step={0.5}
                            value={gain}
                            onChange={(e) => handleGainChange(idx, parseFloat(e.target.value))}
                            style={{ ['--slider-fill' as string]: `${((gain + 12) / 24) * 100}%` }}
                            className="w-28 sm:w-36 accent-cyan-400 -rotate-90 cursor-pointer origin-center"
                          />
                        </div>

                        {/* Frequency Label */}
                        <div className="text-center mt-1">
                          <button
                            type="button"
                            onClick={() => handleGainChange(idx, 0)}
                            className="text-[11px] font-mono font-bold text-slate-300 hover:text-cyan-400 block transition"
                            title="点击快速置零 0dB"
                          >
                            {formatFreq(freq)}
                          </button>
                          <span className="text-[8px] text-slate-500 line-clamp-1 hidden sm:block">
                            {meta.regionName.split(' ')[0]}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activeTab === 'dsp' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Sub-Bass Boost */}
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">重低音下潜 (Sub-Bass Dive)</div>
                      <div className="text-xs text-slate-400">80Hz 超低音动态谐波增益</div>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold text-blue-400">
                    +{((audioSettings.bassBoost || 0) * 1.2).toFixed(1)} dB
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={audioSettings.bassBoost || 0}
                  onChange={(e) => updateSettings((prev) => ({ ...prev, bassBoost: parseInt(e.target.value, 10) }))}
                  style={{ ['--slider-fill' as string]: `${((audioSettings.bassBoost || 0) / 10) * 100}%` }}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* 2. Vocal Clarity */}
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                      <Mic className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">人声清澈结像 (Vocal Clarity)</div>
                      <div className="text-xs text-slate-400">2.8kHz 中高频人声齿音结像与穿透力</div>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    +{((audioSettings.vocalClarity || 0) * 0.8).toFixed(1)} dB
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={audioSettings.vocalClarity || 0}
                  onChange={(e) => updateSettings((prev) => ({ ...prev, vocalClarity: parseInt(e.target.value, 10) }))}
                  style={{ ['--slider-fill' as string]: `${((audioSettings.vocalClarity || 0) / 10) * 100}%` }}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* 3. Treble Air */}
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">极高频空气感 (Treble Air Sparkle)</div>
                      <div className="text-xs text-slate-400">12kHz-20kHz 天籁超高频泛音延展</div>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold text-purple-400">
                    +{((audioSettings.trebleAir || 0) * 0.9).toFixed(1)} dB
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={audioSettings.trebleAir || 0}
                  onChange={(e) => updateSettings((prev) => ({ ...prev, trebleAir: parseInt(e.target.value, 10) }))}
                  style={{ ['--slider-fill' as string]: `${((audioSettings.trebleAir || 0) / 10) * 100}%` }}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* 4. Analog Tube Warmth */}
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                      <Radio className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">模拟电子管温暖度 (Tube Warmth)</div>
                      <div className="text-xs text-slate-400">偶次谐波微饱和 · 黑胶黑胶唱机温润感</div>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold text-amber-400">
                    {audioSettings.tubeWarmth || 0} 级
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={audioSettings.tubeWarmth || 0}
                  onChange={(e) => updateSettings((prev) => ({ ...prev, tubeWarmth: parseInt(e.target.value, 10) }))}
                  style={{ ['--slider-fill' as string]: `${((audioSettings.tubeWarmth || 0) / 10) * 100}%` }}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* 5. 3D Spatial Acoustic Room */}
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800/80 md:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl">
                      <Headphones className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">3D 空间环绕 & 房间声学混响</div>
                      <div className="text-xs text-slate-400">卷积脉冲算法模拟不同环境真实声场漫反射</div>
                    </div>
                  </div>

                  {/* Stereo Width Slider */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">立体声展宽:</span>
                    <input
                      type="range"
                      min={50}
                      max={180}
                      step={5}
                      value={audioSettings.stereoWidth || 100}
                      onChange={(e) => updateSettings((prev) => ({ ...prev, stereoWidth: parseInt(e.target.value, 10) }))}
                      style={{ ['--slider-fill' as string]: `${(((audioSettings.stereoWidth || 100) - 50) / 130) * 100}%` }}
                      className="w-24 accent-cyan-400 cursor-pointer"
                    />
                    <span className="text-xs font-mono font-bold text-cyan-300 w-10 text-right">
                      {audioSettings.stereoWidth || 100}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'off', label: '关闭 (Direct)', desc: '原声无混响' },
                    { id: 'studio', label: '录音棚 (Studio)', desc: '紧凑聚焦干声' },
                    { id: 'hall', label: '音乐厅 (Hall)', desc: '宽广交响余音' },
                    { id: 'club', label: 'Live 俱乐部 (Club)', desc: '沉浸热烈现场' },
                    { id: 'wide', label: '极宽声场 (Ultra-Wide)', desc: '全景声像展宽' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => updateSettings((prev) => ({ ...prev, spatialMode: mode.id as any }))}
                      className={`p-3 rounded-xl text-left transition border ${
                        (audioSettings.spatialMode || 'off') === mode.id
                          ? 'bg-cyan-500/20 border-cyan-500/60 text-white shadow-lg shadow-cyan-500/10'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="text-xs font-bold">{mode.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{mode.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 6. Mastering Peak Limiter */}
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800/80 md:col-span-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">母带级防爆音动态压限器 (Peak Limiter)</div>
                    <div className="text-xs text-slate-400">大增益智能防削顶失真，保持声音宏大饱满不破音</div>
                  </div>
                </div>

                <button
                  onClick={() => updateSettings((prev) => ({ ...prev, compressorEnabled: !prev.compressorEnabled }))}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    audioSettings.compressorEnabled
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{audioSettings.compressorEnabled ? '保护已开启' : '已关闭'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'presets' && (
            <div className="space-y-4">
              {/* Presets Category Filter & Save New */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'all', label: '全部' },
                    { id: 'genre', label: '🎵 音乐流派' },
                    { id: 'vocal', label: '🎙️ 人声优化' },
                    { id: 'device', label: '🎧 设备补偿' },
                    { id: 'scene', label: '🎬 场景音效' },
                    { id: 'custom', label: '⭐ 我的预设' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        activeCategory === cat.id
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Save Current as Custom Preset Button */}
                <button
                  onClick={() => setIsSavingPreset(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md hover:opacity-90 transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>保存当前调音为预设</span>
                </button>
              </div>

              {/* Save Preset Dialog */}
              {isSavingPreset && (
                <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/40 rounded-2xl flex items-center gap-2">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="输入自定义预设名称 (如: 我的专属夜曲煲机)..."
                    className="flex-1 bg-slate-900/80 border border-indigo-500/30 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveCustomPreset}
                    className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 transition"
                  >
                    确认保存
                  </button>
                  <button
                    onClick={() => setIsSavingPreset(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-700 transition"
                  >
                    取消
                  </button>
                </div>
              )}

              {/* Presets Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredPresets.map((preset) => {
                  const isSelected = audioSettings.selectedPreset === preset.id;
                  const isCustom = preset.category === 'custom';

                  return (
                    <div
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between group ${
                        isSelected
                          ? 'bg-gradient-to-br from-indigo-600/30 to-cyan-600/20 border-cyan-500/80 text-white shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/50'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold tracking-wide">{preset.name}</span>
                        <div className="flex items-center gap-1.5">
                          {isCustom && (
                            <button
                              onClick={(e) => handleDeleteCustomPreset(preset.id, e)}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded transition"
                              title="删除此自定义预设"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isSelected && (
                            <span className="p-1 rounded-full bg-cyan-500 text-black">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Mini Gain Curve Representation */}
                      <div className="flex items-end gap-0.5 h-6 my-1 bg-slate-950/60 p-1 rounded-lg">
                        {preset.gains.map((g, idx) => {
                          const h = Math.max(2, ((g + 12) / 24) * 16);
                          return (
                            <div
                              key={idx}
                              className={`flex-1 rounded-sm ${
                                isSelected ? 'bg-cyan-400' : 'bg-slate-600 group-hover:bg-slate-400'
                              }`}
                              style={{ height: `${h}px` }}
                            />
                          );
                        })}
                      </div>

                      {/* Feature Pills */}
                      <div className="flex flex-wrap items-center gap-1 mt-1 text-[9px] font-mono text-slate-400">
                        {preset.bassBoost ? (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            低音+{preset.bassBoost}
                          </span>
                        ) : null}
                        {preset.trebleAir ? (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            空气感+{preset.trebleAir}
                          </span>
                        ) : null}
                        {preset.tubeWarmth ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            胆管温润
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>实时双向同步：拖拽曲线上圆点或下方推子均可精密微调</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
