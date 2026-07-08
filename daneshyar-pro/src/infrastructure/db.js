/**
 * دانش‌یار پرو - IndexedDB Wrapper
 * سیستم پایگاه داده مرورگر برای ذخیره داده‌های حجیم
 * @module infrastructure/db
 */

const DB_NAME = 'daneshyar_pro';
const DB_VERSION = 1;

/**
 * نام store های پایگاه داده
 */
export const STORES = {
  NOTES: 'notes',
  FLASHCARDS: 'flashcards',
  QUIZZES: 'quizzes',
  QUIZ_HISTORY: 'quiz_history',
  SETTINGS: 'settings',
  STUDY_SESSIONS: 'study_sessions'
};

/**
 * کلاس اصلی Database
 */
class Database {
  constructor() {
    this._db = null;
    this._initPromise = null;
  }

  /**
   * بررسی پشتیبانی مرورگر از IndexedDB
   */
  isSupported() {
    return 'indexedDB' in window;
  }

  /**
   * راه‌اندازی پایگاه داده
   * @returns {Promise<IDBDatabase>}
   */
  async init() {
    if (this._db) return this._db;
    if (this._initPromise) return this._initPromise;

    if (!this.isSupported()) {
      throw new Error('IndexedDB در این مرورگر پشتیبانی نمی‌شود');
    }

    this._initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('خطا در باز کردن IndexedDB: ' + request.error));
      };

      request.onsuccess = () => {
        this._db = request.result;
        
        // مدیریت بستن غیرمنتظره
        this._db.onclose = () => {
          console.warn('IndexedDB بسته شد');
          this._db = null;
        };
        
        resolve(this._db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // ساخت store ها
        const stores = [
          { name: STORES.NOTES, keyPath: 'id' },
          { name: STORES.FLASHCARDS, keyPath: 'id' },
          { name: STORES.QUIZZES, keyPath: 'id' },
          { name: STORES.QUIZ_HISTORY, keyPath: 'id' },
          { name: STORES.SETTINGS, keyPath: 'key' },
          { name: STORES.STUDY_SESSIONS, keyPath: 'id', autoIncrement: true }
        ];

        for (const store of stores) {
          if (!db.objectStoreNames.contains(store.name)) {
            const objectStore = db.createObjectStore(store.name, {
              keyPath: store.keyPath,
              autoIncrement: store.autoIncrement || false
            });
            
            // ایندکس‌های پرکاربرد
            if (store.name === STORES.NOTES) {
              objectStore.createIndex('category', 'category', { unique: false });
              objectStore.createIndex('createdAt', 'createdAt', { unique: false });
              objectStore.createIndex('pinned', 'pinned', { unique: false });
            } else if (store.name === STORES.FLASHCARDS) {
              objectStore.createIndex('nextReview', 'nextReview', { unique: false });
              objectStore.createIndex('topic', 'topic', { unique: false });
            } else if (store.name === STORES.QUIZ_HISTORY) {
              objectStore.createIndex('date', 'date', { unique: false });
              objectStore.createIndex('percentage', 'percentage', { unique: false });
            } else if (store.name === STORES.STUDY_SESSIONS) {
              objectStore.createIndex('date', 'date', { unique: false });
              objectStore.createIndex('type', 'type', { unique: false });
            }
          }
        }
      };
    });

    return this._initPromise;
  }

  /**
   * دریافت transaction
   * @private
   */
  async _getTransaction(storeName, mode = 'readonly') {
    const db = await this.init();
    return db.transaction(storeName, mode);
  }

  /**
   * افزودن یا به‌روزرسانی یک رکورد
   * @param {string} storeName
   * @param {Object} data
   * @returns {Promise<*>} کلید رکورد
   */
  async put(storeName, data) {
    const tx = await this._getTransaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * افزودن چند رکورد به صورت batch
   * @param {string} storeName
   * @param {Array} items
   * @returns {Promise<number>} تعداد رکوردهای اضافه شده
   */
  async putMany(storeName, items) {
    if (!Array.isArray(items) || items.length === 0) return 0;
    
    const tx = await this._getTransaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      let count = 0;
      
      for (const item of items) {
        const request = store.put(item);
        request.onsuccess = () => count++;
        request.onerror = () => reject(request.error);
      }
      
      tx.oncomplete = () => resolve(count);
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * دریافت یک رکورد با کلید
   * @param {string} storeName
   * @param {*} key
   * @returns {Promise<Object|null>}
   */
  async get(storeName, key) {
    const tx = await this._getTransaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * دریافت همه رکوردها
   * @param {string} storeName
   * @returns {Promise<Array>}
   */
  async getAll(storeName) {
    const tx = await this._getTransaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * دریافت همه رکوردها بر اساس ایندکس
   * @param {string} storeName
   * @param {string} indexName
   * @param {*} value
   * @returns {Promise<Array>}
   */
  async getByIndex(storeName, indexName, value) {
    const tx = await this._getTransaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * حذف یک رکورد
   * @param {string} storeName
   * @param {*} key
   * @returns {Promise<boolean>}
   */
  async delete(storeName, key) {
    const tx = await this._getTransaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * حذف چند رکورد
   * @param {string} storeName
   * @param {Array} keys
   * @returns {Promise<number>}
   */
  async deleteMany(storeName, keys) {
    if (!Array.isArray(keys) || keys.length === 0) return 0;
    
    const tx = await this._getTransaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      let count = 0;
      
      for (const key of keys) {
        const request = store.delete(key);
        request.onsuccess = () => count++;
        request.onerror = () => reject(request.error);
      }
      
      tx.oncomplete = () => resolve(count);
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * حذف همه رکوردها
   * @param {string} storeName
   * @returns {Promise<boolean>}
   */
  async clear(storeName) {
    const tx = await this._getTransaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * شمارش رکوردها
   * @param {string} storeName
   * @returns {Promise<number>}
   */
  async count(storeName) {
    const tx = await this._getTransaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * جستجو در رکوردها با تابع predicate
   * @param {string} storeName
   * @param {Function} predicate
   * @returns {Promise<Array>}
   */
  async find(storeName, predicate) {
    const all = await this.getAll(storeName);
    return all.filter(predicate);
  }

  /**
   * جستجوی اولین رکورد مطابق
   * @param {string} storeName
   * @param {Function} predicate
   * @returns {Promise<Object|null>}
   */
  async findOne(storeName, predicate) {
    const all = await this.getAll(storeName);
    return all.find(predicate) || null;
  }

  /**
   * به‌روزرسانی بخشی از یک رکورد
   * @param {string} storeName
   * @param {*} key
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async update(storeName, key, updates) {
    const existing = await this.get(storeName, key);
    if (!existing) {
      throw new Error(`رکورد با کلید ${key} یافت نشد`);
    }
    
    const updated = { ...existing, ...updates };
    await this.put(storeName, updated);
    return updated;
  }

  /**
   * بررسی وجود یک رکورد
   * @param {string} storeName
   * @param {*} key
   * @returns {Promise<boolean>}
   */
  async exists(storeName, key) {
    const item = await this.get(storeName, key);
    return item !== null;
  }

  /**
   * دریافت آمار پایگاه داده
   * @returns {Promise<Object>}
   */
  async getStats() {
    const stats = {};
    
    for (const storeName of Object.values(STORES)) {
      try {
        stats[storeName] = await this.count(storeName);
      } catch {
        stats[storeName] = 0;
      }
    }
    
    return stats;
  }

  /**
   * export کامل پایگاه داده
   * @returns {Promise<Object>}
   */
  async export() {
    const data = {};
    
    for (const storeName of Object.values(STORES)) {
      try {
        data[storeName] = await this.getAll(storeName);
      } catch {
        data[storeName] = [];
      }
    }
    
    return {
      version: DB_VERSION,
      exportedAt: new Date().toISOString(),
      data
    };
  }

  /**
   * import داده‌ها به پایگاه داده
   * @param {Object} data
   * @param {boolean} clearExisting
   * @returns {Promise<Object>} آمار import
   */
  async import(data, clearExisting = false) {
    if (!data || !data.data) {
      throw new Error('ساختار داده نامعتبر است');
    }
    
    const stats = { imported: 0, skipped: 0 };
    
    for (const [storeName, items] of Object.entries(data.data)) {
      if (!Object.values(STORES).includes(storeName)) continue;
      if (!Array.isArray(items)) continue;
      
      if (clearExisting) {
        await this.clear(storeName);
      }
      
      const count = await this.putMany(storeName, items);
      stats.imported += count;
    }
    
    return stats;
  }

  /**
   * بستن اتصال پایگاه داده
   */
  close() {
    if (this._db) {
      this._db.close();
      this._db = null;
      this._initPromise = null;
    }
  }

  /**
   * حذف کامل پایگاه داده
   * @returns {Promise<boolean>}
   */
  async destroy() {
    this.close();
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
}

// ============================================================
// Singleton
// ============================================================

let dbInstance = null;

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = new Database();
  }
  return dbInstance;
}

export default getDatabase();