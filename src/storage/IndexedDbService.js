/**
 * MangaShelf — Servicio de Almacenamiento Persistente en IndexedDB
 * ---------------------------------------------------------------------------
 * Permite guardar en el dispositivo (sin límite de 5MB de localStorage):
 * 1. `imported_series`: Obras locales importadas por el usuario (CBZ, EPUB, PDF, Imágenes)
 *    para que se mantengan tras cerrar o recargar la aplicación.
 * 2. `offline_chapters`: Capítulos descargados explícitamente para lectura sin conexión.
 */

const DB_NAME = 'MangaShelfBinaryDB';
const DB_VERSION = 1;
const STORE_IMPORTED = 'imported_series';
const STORE_OFFLINE = 'offline_chapters';

export class IndexedDbService {
  constructor() {
    this.dbPromise = null;
  }

  open() {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB no está disponible en este navegador.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_IMPORTED)) {
          db.createObjectStore(STORE_IMPORTED, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_OFFLINE)) {
          const offlineStore = db.createObjectStore(STORE_OFFLINE, { keyPath: 'chapterKey' });
          offlineStore.createIndex('seriesId', 'seriesId', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // =========================================================================
  // Obras Importadas por el Usuario (CBZ, EPUB, PDF, Imágenes)
  // =========================================================================

  async saveImportedSeries(seriesRecord) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_IMPORTED, 'readwrite');
      const store = tx.objectStore(STORE_IMPORTED);
      store.put(seriesRecord);
      tx.oncomplete = () => resolve(seriesRecord);
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAllImportedSeries() {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_IMPORTED, 'readonly');
        const store = tx.objectStore(STORE_IMPORTED);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('No se pudieron cargar series importadas de IndexedDB:', err);
      return [];
    }
  }

  async deleteImportedSeries(seriesId) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_IMPORTED, 'readwrite');
      const store = tx.objectStore(STORE_IMPORTED);
      store.delete(seriesId);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  // =========================================================================
  // Capítulos Descargados para Lectura Sin Conexión
  // =========================================================================

  _makeChapterKey(seriesId, chapterId) {
    return `${seriesId}::${chapterId}`;
  }

  async saveOfflineChapter(seriesId, chapterId, pages, meta = {}) {
    const db = await this.open();
    const record = {
      chapterKey: this._makeChapterKey(seriesId, chapterId),
      seriesId,
      chapterId,
      pages,
      downloadedAt: new Date().toISOString(),
      ...meta
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OFFLINE, 'readwrite');
      const store = tx.objectStore(STORE_OFFLINE);
      store.put(record);
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => reject(tx.error);
    });
  }

  async getOfflineChapter(seriesId, chapterId) {
    try {
      const db = await this.open();
      const key = this._makeChapterKey(seriesId, chapterId);
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_OFFLINE, 'readonly');
        const store = tx.objectStore(STORE_OFFLINE);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  async removeOfflineChapter(seriesId, chapterId) {
    const db = await this.open();
    const key = this._makeChapterKey(seriesId, chapterId);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OFFLINE, 'readwrite');
      const store = tx.objectStore(STORE_OFFLINE);
      store.delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAllOfflineChapterKeys() {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_OFFLINE, 'readonly');
        const store = tx.objectStore(STORE_OFFLINE);
        const req = store.getAllKeys();
        req.onsuccess = () => resolve(new Set(req.result || []));
        req.onerror = () => reject(req.error);
      });
    } catch {
      return new Set();
    }
  }

  async getStorageUsageEstimate() {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        return {
          usageMB: ((est.usage || 0) / (1024 * 1024)).toFixed(2),
          quotaMB: ((est.quota || 0) / (1024 * 1024)).toFixed(0)
        };
      } catch {
        return null;
      }
    }
    return null;
  }
}
