/**
 * IndexedDB Utility for Caching Large JSON Files
 * Stores downloaded data locally to avoid re-downloading on next visit
 */

const DB_NAME = 'icd10-db';
const DB_VERSION = 1;
const STORE_NAME = 'data-cache';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

interface CachedData {
  key: string;
  data: any;
  timestamp: number;
}

/**
 * Initialize IndexedDB database
 */
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
};

/**
 * Save data to IndexedDB
 */
export const saveToCache = async (key: string, data: any): Promise<void> => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const cacheItem: CachedData = {
      key,
      data,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(cacheItem);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.warn('Failed to save to cache:', error);
    // Silently fail - cache is optional
  }
};

/**
 * Load data from IndexedDB
 */
export const loadFromCache = async (key: string): Promise<any | null> => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as CachedData | undefined;

        if (!result) {
          resolve(null);
          return;
        }

        // Check if cache has expired
        const isExpired = Date.now() - result.timestamp > CACHE_DURATION;
        if (isExpired) {
          // Delete expired cache
          deleteFromCache(key).catch(console.warn);
          resolve(null);
          return;
        }

        resolve(result.data);
      };
    });
  } catch (error) {
    console.warn('Failed to load from cache:', error);
    return null;
  }
};

/**
 * Delete specific cache entry
 */
export const deleteFromCache = async (key: string): Promise<void> => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.warn('Failed to delete from cache:', error);
  }
};

/**
 * Clear all cache
 */
export const clearCache = async (): Promise<void> => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
};

/**
 * Get cache size in bytes
 */
export const getCacheSize = async (): Promise<number> => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const items = request.result as CachedData[];
        const size = JSON.stringify(items).length;
        resolve(size);
      };
    });
  } catch (error) {
    console.warn('Failed to get cache size:', error);
    return 0;
  }
};

/**
 * Load data with caching strategy
 * 1. Try to load from cache
 * 2. If not in cache or expired, download from server
 * 3. Save to cache for next time
 */
export const loadDataWithCache = async (
  key: string,
  url: string,
  options?: RequestInit
): Promise<any> => {
  // Try to load from cache first
  const cachedData = await loadFromCache(key);
  if (cachedData) {
    console.log(`Loaded ${key} from cache`);
    return cachedData;
  }

  // Download from server
  console.log(`Downloading ${key} from server...`);
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${key}: ${response.statusText}`);
  }

  const data = await response.json();

  // Save to cache for next time
  await saveToCache(key, data);
  console.log(`Saved ${key} to cache`);

  return data;
};

/**
 * Preload multiple datasets
 */
export const preloadData = async (
  datasets: Array<{ key: string; url: string }>
): Promise<void> => {
  const promises = datasets.map(({ key, url }) =>
    loadDataWithCache(key, url).catch((error) => {
      console.warn(`Failed to preload ${key}:`, error);
    })
  );

  await Promise.all(promises);
};


/**
 * Clear all browser storage (IndexedDB, localStorage, sessionStorage)
 * Use this to force refresh of all cached data
 */
export const clearAllStorage = async (): Promise<void> => {
  try {
    // Clear IndexedDB
    await clearCache();
    console.log('Cleared IndexedDB cache');

    // Clear localStorage
    localStorage.clear();
    console.log('Cleared localStorage');

    // Clear sessionStorage
    sessionStorage.clear();
    console.log('Cleared sessionStorage');

    // Delete all IndexedDB databases
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }
      console.log('Deleted all IndexedDB databases');
    }

    console.log('All storage cleared successfully');
  } catch (error) {
    console.error('Failed to clear all storage:', error);
  }
};
