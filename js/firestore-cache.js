// firestore-cache.js
// Manual Firestore caching using IndexedDB (fixed and namespaced)

import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@7/+esm';

const DB_NAME = 'apploads-firestore-cache';
const DB_VERSION = 1;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (same as you had)

let dbPromise;

function initDB() {
  if (dbPromise) return dbPromise;

  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('loads')) {
        db.createObjectStore('loads');
      }
      if (!db.objectStoreNames.contains('sales')) {
        db.createObjectStore('sales');
      }
      if (!db.objectStoreNames.contains('metadata')) {
        // metadata will store { timestamp, storeName } by key
        db.createObjectStore('metadata');
      }
    },
  });

  return dbPromise;
}

/**
 * Get cached data by key.
 * - Reads metadata first (metadata store keyed by 'key').
 * - Uses metadata.storeName to read actual data from that store with the same key.
 * - Returns null if missing or expired.
 *
 * Signature preserved: getCachedData(key)
 */
export async function getCachedData(key) {
  const db = await initDB();

  try {
    const metadata = await db.get('metadata', key);
    if (!metadata || !metadata.storeName) {
      // No metadata → no cache
      // console.log('❌ No metadata for key', key);
      return null;
    }

    const age = Date.now() - (metadata.timestamp || 0);

    if (age > CACHE_DURATION) {
      // expired
      // console.log('⏰ Cache expired for', key);
      return null;
    }

    // read data from the correct store
    const storeName = metadata.storeName;
    const data = await db.get(storeName, key);

    if (!data) {
      // console.log('❌ Data missing for key', key, 'in store', storeName);
      return null;
    }

    // console.log('✅ Returning cached data for', key);
    return data;
  } catch (err) {
    console.error('Error reading cache (getCachedData):', err);
    return null;
  }
}

/**
 * Put cached data.
 * - storeName: the name of object store to save the data in (e.g. 'loads' or 'sales')
 * - key: the cache key (e.g. 'initial-loads')
 *
 * Signature preserved: setCachedData(key, data, storeName)
 */
export async function setCachedData(key, data, storeName = 'loads') {
  const db = await initDB();

  try {
    // Ensure store exists in current DB schema
    if (!db.objectStoreNames.contains(storeName)) {
      // If a new storeName appears, create it by upgrading the DB version.
      // But IDB (idb lib) does not support creating stores on-the-fly easily without version bump.
      // For now, gracefully fail and write to 'loads' fallback.
      console.warn(`Store "${storeName}" does not exist. Falling back to "loads".`);
      storeName = 'loads';
    }

    await db.put(storeName, data, key);
    await db.put('metadata', { timestamp: Date.now(), storeName }, key);

    // console.log('💾 Cached data for:', key, 'in store:', storeName);
  } catch (err) {
    console.error('Error writing cache (setCachedData):', err);
  }
}

/**
 * Clear all caches (loads, sales and metadata)
 */
export async function clearCache() {
  const db = await initDB();

  try {
    if (db.objectStoreNames.contains('loads')) {
      await db.clear('loads');
    }
    if (db.objectStoreNames.contains('sales')) {
      await db.clear('sales');
    }
    if (db.objectStoreNames.contains('metadata')) {
      await db.clear('metadata');
    }

    console.log('🧹 Cache cleared');
  } catch (err) {
    console.error('Error clearing cache:', err);
  }
}