import { LyricLine } from '../types';

/**
 * Parses LRC format lyrics into structured LyricLine array.
 * Supports both original LRC and enhanced LRC with inline translations.
 */
export function parseLRC(lrcText: string): LyricLine[] {
  if (!lrcText || typeof lrcText !== 'string') return [];

  const lines = lrcText.split('\n');
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
  // Match translation lines in format: [mm:ss.xx](translation text)
  const translationRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]\((.+?)\)/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if this is a translation line with embedded (translation)
    const transMatch = trimmed.match(translationRegex);
    if (transMatch) {
      const minutes = parseInt(transMatch[1], 10);
      const seconds = parseInt(transMatch[2], 10);
      const milliseconds = transMatch[3] ? parseInt(transMatch[3].padEnd(3, '0').slice(0, 3), 10) : 0;
      const time = minutes * 60 + seconds + milliseconds / 1000;
      const translation = transMatch[4].trim();

      // Find existing lyric at this time and add translation
      const existing = result.find((l) => Math.abs(l.time - time) < 0.05);
      if (existing) {
        existing.translation = translation;
      } else {
        result.push({
          time,
          text: '',
          translation,
        });
      }
      continue;
    }

    // Extract all timestamps from the line
    const matches = Array.from(trimmed.matchAll(timeRegex));
    if (matches.length === 0) continue;

    // Clean text by removing all [mm:ss.xx] tags
    const text = trimmed.replace(timeRegex, '').trim();
    if (!text) continue;

    for (const match of matches) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
      const time = minutes * 60 + seconds + milliseconds / 1000;

      result.push({
        time,
        text,
      });
    }
  }

  // Sort chronologically
  result.sort((a, b) => a.time - b.time);
  return result;
}

/**
 * Parses separate translation lyrics (tlyric) and merges them into the main lyrics array.
 */
export function mergeTranslationLyrics(lyrics: LyricLine[], tlyricText: string): LyricLine[] {
  if (!tlyricText || !lyrics.length) return lyrics;

  const tlyricLines = tlyricText.split('\n');
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const line of tlyricLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(timeRegex);
    if (!match) continue;

    const timeMatch = match[0].match(/\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/);
    if (!timeMatch) continue;

    const minutes = parseInt(timeMatch[1], 10);
    const seconds = parseInt(timeMatch[2], 10);
    const milliseconds = timeMatch[3] ? parseInt(timeMatch[3].padEnd(3, '0').slice(0, 3), 10) : 0;
    const time = minutes * 60 + seconds + milliseconds / 1000;
    const translation = trimmed.replace(timeRegex, '').trim();
    if (!translation) continue;

    // Find the closest main lyric line within 1 second
    const closest = lyrics.find((l) => Math.abs(l.time - time) < 1);
    if (closest) {
      closest.translation = translation;
    }
  }

  return lyrics;
}

/**
 * Finds the index of the active lyric line based on current time in seconds
 */
export function getActiveLyricIndex(lyrics: LyricLine[], currentTime: number): number {
  if (!lyrics || lyrics.length === 0) return -1;

  // If before first lyric
  if (currentTime < lyrics[0].time) return 0;

  for (let i = lyrics.length - 1; i >= 0; i--) {
    if (currentTime >= lyrics[i].time) {
      return i;
    }
  }

  return 0;
}

/**
 * Formats time in seconds to mm:ss format
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}