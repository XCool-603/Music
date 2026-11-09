import { Track } from '../types';

const DB_NAME = 'muse_audio_store';
const DB_VERSION = 1;
const STORE_NAME = 'audio_blobs';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save audio blob to IndexedDB for persistent offline playback
 */
export async function saveLocalAudioBlob(trackId: string, blob: Blob): Promise<boolean> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, trackId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[LocalTrackStore] Failed to save blob for', trackId, err);
    return false;
  }
}

/**
 * Retrieve audio blob from IndexedDB by trackId
 */
export async function getLocalAudioBlob(trackId: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(trackId);
      req.onsuccess = () => {
        resolve(req.result instanceof Blob ? req.result : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Remove audio blob from IndexedDB by trackId
 */
export async function deleteLocalAudioBlob(trackId: string): Promise<boolean> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(trackId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Revives expired blob: URLs on page reload or app restart by querying IndexedDB
 */
export async function reviveLocalTracks(tracks: Track[]): Promise<Track[]> {
  const result: Track[] = [];

  for (const t of tracks) {
    if (t.isLocal || (t.audioUrl && (t.audioUrl.startsWith('blob:') || t.id.startsWith('local-')))) {
      try {
        const blob = await getLocalAudioBlob(t.id);
        if (blob) {
          const freshUrl = URL.createObjectURL(blob);
          result.push({
            ...t,
            audioUrl: freshUrl,
          });
          continue;
        }
      } catch (err) {
        console.warn('[LocalTrackStore] Failed to revive track:', t.id, err);
      }
    }
    result.push(t);
  }

  return result;
}
