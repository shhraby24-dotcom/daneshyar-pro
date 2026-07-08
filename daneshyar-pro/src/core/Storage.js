/**
 * دانش‌یار پرو - سیستم ذخیره‌سازی دو لایه
 * مدیریت خودکار داده‌های کوچک در localStorage و داده‌های حجیم در IndexedDB
 * @module core/Storage
 */

import db, { STORES } from '../infrastructure/db.js';
import LoggerModule from './Logger.js';
import { StorageError } from './Errors.js';

const logger = LoggerModule.getInstance().module('Storage');

// کلیدهای اختصاصی localStorage
export const LS_KEYS = {
  SETTINGS: 'dy_settings',
  THEME: 'dy_theme',
  DRAFT: 'dy_draft',
  LAST_SYNC: 'dy_last_sync',
  ONBOARDING: 'dy_onboarding'
};

// نگاشت نام مجموعه‌ها به Store های IndexedDB
const IDB_MAPPING = {
  notes: STORES.NOTES,
  flashcards: STORES.FLASHCARDS,
  quizzes: STORES.QUIZZES,
  quiz_history: STORES.QUIZ_HISTORY,
  study_sessions: STORES.STUDY_SESSIONS
};

class Storage {
  constructor() {
    this._isIdbReady = false;
    this._initPromise = this._initIdb();
  }

  async _initIdb() {
    try {
      await db.init();
      this._isIdbReady = true;
      logger.info('IndexedDB با موفقیت راه‌اندازی شد');
    } catch (error) {
      logger.error('شکست در راه‌اندازی IndexedDB', error);
      this._isIdbReady = false;
    }
  }

  async _ensureReady() {
    if (!this._isIdbReady) {
      await this._initPromise;
    }
  }

  // --------------------------------------------------------
  // متدهای LocalStorage (برای تنظیمات و داده‌های کوچک)
  // --------------------------------------------------------

  getLocal(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch (error) {
      logger.warn('خطا در خواندن localStorage', { key, error });
      return defaultValue;
    }
  }

  setLocal(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        throw new StorageError('حافظه مرورگر (localStorage) پر شده است', { 
          key, operation: 'write' 
        });
      }
      throw new StorageError('خطا در نوشتن localStorage', { 
        key, operation: 'write', cause: error 
      });
    }
  }

  removeLocal(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      logger.warn('خطا در حذف از localStorage', { key });
    }
  }

  // --------------------------------------------------------
  // متدهای IndexedDB (برای یادداشت‌ها، فلش‌کارت‌ها و...)
  // --------------------------------------------------------

  _getStoreName(collection) {
    const store = IDB_MAPPING[collection];
    if (!store) {
      throw new StorageError(`مجموعه داده نامعتبر: ${collection}`, { key: collection });
    }
    return store;
  }

  async get(collection, id) {
    await this._ensureReady();
    try {
      const storeName = this._getStoreName(collection);
      return await db.get(storeName, id);
    } catch (error) {
      throw new StorageError(`خطا در دریافت آیتم از ${collection}`, { 
        key: id, operation: 'read', cause: error 
      });
    }
  }

  async getAll(collection) {
    await this._ensureReady();
    try {
      const storeName = this._getStoreName(collection);
      return await db.getAll(storeName);
    } catch (error) {
      throw new StorageError(`خطا در دریافت همه آیتم‌های ${collection}`, { 
        operation: 'read', cause: error 
      });
    }
  }

  async save(collection, data) {
    await this._ensureReady();
    try {
      const storeName = this._getStoreName(collection);
      return await db.put(storeName, data);
    } catch (error) {
      throw new StorageError(`خطا در ذخیره آیتم در ${collection}`, { 
        operation: 'write', cause: error 
      });
    }
  }

  async saveMany(collection, items) {
    await this._ensureReady();
    if (!Array.isArray(items) || items.length === 0) return 0;
    try {
      const storeName = this._getStoreName(collection);
      return await db.putMany(storeName, items);
    } catch (error) {
      throw new StorageError(`خطا در ذخیره گروهی در ${collection}`, { 
        operation: 'write', cause: error 
      });
    }
  }

  async remove(collection, id) {
    await this._ensureReady();
    try {
      const storeName = this._getStoreName(collection);
      return await db.delete(storeName, id);
    } catch (error) {
      throw new StorageError(`خطا در حذف آیتم از ${collection}`, { 
        key: id, operation: 'delete', cause: error 
      });
    }
  }

  async clear(collection) {
    await this._ensureReady();
    try {
      const storeName = this._getStoreName(collection);
      return await db.clear(storeName);
    } catch (error) {
      throw new StorageError(`خطا در پاک کردن کامل ${collection}`, { 
        operation: 'delete', cause: error 
      });
    }
  }

  async find(collection, predicate) {
    await this._ensureReady();
    try {
      const storeName = this._getStoreName(collection);
      return await db.find(storeName, predicate);
    } catch (error) {
      throw new StorageError(`خطا در جستجوی ${collection}`, { 
        operation: 'read', cause: error 
      });
    }
  }

  // --------------------------------------------------------
  // متدهای Backup و Restore
  // --------------------------------------------------------

  async exportAll() {
    await this._ensureReady();
    try {
      const idbData = await db.export();
      
      const backup = {
        app: 'Daneshyar Pro',
        version: idbData.version,
        exportedAt: new Date().toISOString(),
        local: {
          settings: this.getLocal(LS_KEYS.SETTINGS, {}),
          theme: this.getLocal(LS_KEYS.THEME, 'dark')
        },
        data: idbData.data
      };
      
      return backup;
    } catch (error) {
      throw new StorageError('خطا در ایجاد فایل پشتیبان', { 
        operation: 'read', cause: error 
      });
    }
  }

  async importAll(backupData, clearExisting = false) {
    await this._ensureReady();
    
    if (!backupData || !backupData.data) {
      throw new StorageError('فایل پشتیبان نامعتبر است');
    }

    try {
      // بازیابی تنظیمات محلی
      if (backupData.local) {
        if (backupData.local.settings) this.setLocal(LS_KEYS.SETTINGS, backupData.local.settings);
        if (backupData.local.theme) this.setLocal(LS_KEYS.THEME, backupData.local.theme);
      }
      
      // بازیابی داده‌های IndexedDB
      const stats = await db.import(backupData, clearExisting);
      
      logger.info('بازیابی داده‌ها با موفقیت انجام شد', stats);
      return stats;
    } catch (error) {
      throw new StorageError('خطا در بازیابی فایل پشتیبان', { 
        operation: 'write', cause: error 
      });
    }
  }
}

// ============================================================
// Singleton
// ============================================================

let storageInstance = null;

export function getStorage() {
  if (!storageInstance) {
    storageInstance = new Storage();
  }
  return storageInstance;
}

export default getStorage();