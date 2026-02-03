
import { MediaAsset } from '../types';

const DB_NAME = 'EditModeDB';
const STORE_NAME = 'assets';

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not supported'));
        return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const saveAssetToDB = async (id: string, file: File | Blob) => {
  try {
      const db = await initDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(file, id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
  } catch (e) {
      console.warn("Failed to save asset to DB", e);
  }
};

export const loadAssetsFromDB = async (): Promise<Record<string, Blob>> => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAllKeys();
            const assets: Record<string, Blob> = {};
            
            request.onsuccess = async () => {
                const keys = request.result;
                if (keys.length === 0) {
                    resolve(assets);
                    return;
                }

                let count = 0;
                // Iterate keys to get values
                for (const key of keys) {
                    const getReq = store.get(key);
                    getReq.onsuccess = () => {
                        assets[key as string] = getReq.result;
                        count++;
                        if (count === keys.length) resolve(assets);
                    };
                    getReq.onerror = () => {
                         count++;
                         if (count === keys.length) resolve(assets);
                    }
                }
            };
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.warn("Failed to load assets from DB", e);
        return {};
    }
};

export const saveStateToLocal = (state: any) => {
    try {
        const serialized = JSON.stringify(state);
        localStorage.setItem('editmode_project_state', serialized);
    } catch (e) { 
        console.warn('LocalStorage Save failed', e); 
    }
};

export const loadStateFromLocal = () => {
    try {
        const serialized = localStorage.getItem('editmode_project_state');
        return serialized ? JSON.parse(serialized) : undefined;
    } catch (e) { return undefined; }
};