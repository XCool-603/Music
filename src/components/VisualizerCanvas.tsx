import React, { useEffect, useRef } from 'react';
import { VisualizerMode } from '../types';
import { audioEngine } from '../utils/audioEngine';

interface VisualizerCanvasProps {
  mode: VisualizerMode;
  isPlaying: boolean;
  themeColor?: string;
  className?: string;
  height?: number;
}

export const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({
  mode,
  isPlaying,
  themeColor = '#6366f1',
  className = '',
  height = 80,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 300;
    const canvasHeight = height;

    canvas.width = width * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.scale(dpr, dpr);

    const freqData = new Uint8Array(128);
    const timeData = new Uint8Array(128);

    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, canvasHeight);

      if (isPlaying) {
        audioEngine.getAnalyserData(freqData);
        audioEngine.getTimeDomainData(timeData);
      } else {
        // Idle gentle wave animation
        phase += 0.03;
        for (let i = 0; i < 64; i++) {
          freqData[i] = Math.max(8, (Math.sin(phase + i * 0.2) + 1) * 16);
          timeData[i] = 128 + Math.sin(phase * 1.5 + i * 0.1) * 10;
        }
      }

      if (mode === 'bars') {
        const barCount = Math.min(48, Math.floor(width / 6));
        const barWidth = (width / barCount) - 2;

        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor((i / barCount) * 50);
          const rawVal = freqData[dataIndex] || 0;
          const barHeight = Math.max(3, (rawVal / 255) * (canvasHeight - 6));
          const x = i * (barWidth + 2);
          const y = canvasHeight - barHeight;

          const gradient = ctx.createLinearGradient(0, y, 0, canvasHeight);
          gradient.addColorStop(0, themeColor);
          gradient.addColorStop(1, `${themeColor}40`);

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
          ctx.fill();

          // Cap indicator
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = 0.8;
          ctx.fillRect(x, Math.max(0, y - 2), barWidth, 1.5);
          ctx.globalAlpha = 1.0;
        }
      } else if (mode === 'wave') {
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = themeColor;
        ctx.shadowColor = themeColor;
        ctx.shadowBlur = 10;

        const sliceWidth = width / 64;
        let x = 0;

        for (let i = 0; i < 64; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * canvasHeight) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (mode === 'circle') {
        const centerX = width / 2;
        const centerY = canvasHeight / 2;
        const baseRadius = Math.min(centerX, centerY) * 0.45;
        const totalPoints = 40;

        ctx.beginPath();
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 2;

        for (let i = 0; i < totalPoints; i++) {
          const angle = (i / totalPoints) * Math.PI * 2;
          const val = (freqData[i % 32] / 255) * (baseRadius * 0.8);
          const r = baseRadius + val;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.stroke();

        // Inner glowing core
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `${themeColor}30`;
        ctx.fill();
      } else if (mode === 'neon') {
        const steps = 24;
        const stepWidth = width / steps;
        for (let i = 0; i < steps; i++) {
          const val = freqData[i * 2] / 255;
          const segments = Math.floor(val * 10);
          const x = i * stepWidth + 2;

          for (let s = 0; s < 10; s++) {
            const segY = canvasHeight - (s + 1) * (canvasHeight / 11);
            const isLit = s <= segments;
            ctx.fillStyle = isLit
              ? s > 7
                ? '#ef4444'
                : s > 4
                ? '#f59e0b'
                : themeColor
              : 'rgba(255,255,255,0.06)';
            ctx.fillRect(x, segY, stepWidth - 4, (canvasHeight / 11) - 2);
          }
        }
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [mode, isPlaying, themeColor, height]);

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full block"
        style={{ height: `${height}px` }}
      />
    </div>
  );
};
