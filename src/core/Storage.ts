/**
 * ============================================================
 * دانش‌یار پرو - سیستم ذخیره‌سازی (Storage)
 * ============================================================
 *
 * مدیریت ذخیره‌سازی داده‌ها در localStorage (و بعداً IndexedDB)
 *
 * ✅ Type-safe localStorage operations
 * ✅ JSON serialization/deserialization
 * ✅ Error handling و logging
 * ✅ Event integration با EventBus
 * ✅ آماده برای IndexedDB migration
 *
 * @module core/Storage
 * @version 1.0.0-beta.1
 */

import { getInstance as getLogger } from '@/core/Logger';
import { getInstance as getEventBus, EVENTS } from '@/core/EventBus';

const logger = getLogger().module('Storage');
const eventBus = getEventBus();

// ============================================================
// Types و Interfaces
// ============================================================

/**
 * کلیدهای localStorage
 */
export const LS_KEYS = {
  SETTINGS: 'daneshyar_settings',
  THEME: 'daneshyar_theme',
  ONBOARDING: 'daneshyar_onboarding',
  DRAFT: 'daneshyar_draft',
  LAST_SYNC: 'daneshyar_last_sync',
  NOTES: 'daneshyar_notes',
  FLASHCARDS: 'daneshyar_flashcards',
  QUIZ_HISTORY: 'daneshyar_quiz_history',
  STUDY_SESSIONS: 'daneshyar_study_sessions',
  CUSTOM_SOUNDS: 'daneshyar_custom_sounds',
} as const;

export type LSKey = (typeof LS_KEYS)[keyof typeof LS_KEYS];

/**
 * آمار Storage
 */
export interface StorageStats {
  totalKeys: number;
  usedBytes: number;
  usedKB: number;
  usedMB: number;
}

/**
 * تنظیمات Storage
 */
export interface StorageOptions {
  prefix?: string;
  enableEvents?: boolean;
}

// ============================================================
// کلاس اصلی Storage
// ============================================================

/**
 * کلاس اصلی Storage
 */
export class Storage {
  private _prefix: string;
  private _enableEvents: boolean;

  /**
   * سازنده کلاس Storage
   */
  constructor(options: StorageOptions = {}) {
    this._prefix = options.prefix ?? '';
    this._enableEvents = options.enableEvents !== false;

    logger.debug('Storage initialized', {
      prefix: this._prefix,
      enableEvents: this._enableEvents,
    });
  }

  /**
   * دریافت مقدار از localStorage
   *
   * @example
   * const settings = storage.getLocal<Settings>(LS_KEYS.SETTINGS, defaultSettings);
   */
  getLocal<T>(key: string, defaultValue: T | null = null): T | null {
    try {
      const fullKey = this._getFullKey(key);
      const item = localStorage.getItem(fullKey);

      if (item === null) {
        return defaultValue;
      }

      const parsed = JSON.parse(item) as T;

      logger.debug('داده از localStorage خوانده شد', {
        key: fullKey,
        type: typeof parsed,
      });

      return parsed;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('خطا در خواندن از localStorage', {
        key,
        error: errorMessage,
      });
      return defaultValue;
    }
  }

  /**
   * ذخیره مقدار در localStorage
   *
   * @example
   * storage.setLocal(LS_KEYS.SETTINGS, settings);
   */
  setLocal<T>(key: string, value: T): boolean {
    try {
      const fullKey = this._getFullKey(key);
      const serialized = JSON.stringify(value);

      localStorage.setItem(fullKey, serialized);

      logger.debug('داده در localStorage ذخیره شد', {
        key: fullKey,
        size: serialized.length,
      });

      // انتشار event
      if (this._enableEvents) {
        eventBus.emit(EVENTS.STORAGE_SAVED, {
          key: fullKey,
          size: serialized.length,
        });
      }

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('خطا در ذخیره در localStorage', {
        key,
        error: errorMessage,
      });

      // بررسی خطای پر شدن حافظه
      if (
        error instanceof Error &&
        (error.name === 'QuotaExceededError' ||
          error.message.includes('quota'))
      ) {
        logger.error('localStorage پر شده است!', { key });
        // TODO: نمایش پیام به کاربر
      }

      // انتشار event خطا
      if (this._enableEvents) {
        eventBus.emit(EVENTS.STORAGE_ERROR, {
          key,
          error: errorMessage,
        });
      }

      return false;
    }
  }

  /**
   * حذف یک کلید از localStorage
   */
  removeLocal(key: string): boolean {
    try {
      const fullKey = this._getFullKey(key);
      localStorage.removeItem(fullKey);

      logger.debug('کلید از localStorage حذف شد', { key: fullKey });
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('خطا در حذف از localStorage', {
        key,
        error: errorMessage,
      });
      return false;
    }
  }

  /**
   * بررسی وجود یک کلید در localStorage
   */
  hasLocal(key: string): boolean {
    const fullKey = this._getFullKey(key);
    return localStorage.getItem(fullKey) !== null;
  }

  /**
   * دریافت همه کلیدهای ذخیره شده
   */
  getAllKeys(): string[] {
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this._prefix)) {
        keys.push(key.slice(this._prefix.length));
      }
    }

    return keys;
  }

  /**
   * دریافت آمار Storage
   */
  getStats(): StorageStats {
    let totalSize = 0;
    let totalKeys = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this._prefix)) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
          totalKeys++;
        }
      }
    }

    // تبدیل به bytes (هر کاراکتر در UTF-16 حدود 2 byte است)
    const usedBytes = totalSize * 2;

    return {
      totalKeys,
      usedBytes,
      usedKB: Math.round((usedBytes / 1024) * 100) / 100,
      usedMB: Math.round((usedBytes / 1024 / 1024) * 100) / 100,
    };
  }

  /**
   * پاک کردن همه داده‌های ذخیره شده
   * ⚠️ این متد همه داده‌ها را حذف می‌کند
   */
  clearAll(): void {
    const keys = this.getAllKeys();

    logger.warn('پاک کردن همه داده‌های Storage', { count: keys.length });

    keys.forEach((key) => {
      this.removeLocal(key);
    });

    logger.info('همه داده‌های Storage پاک شدند');
  }

  /**
   * ذخیره چند آیتم به صورت batch
   */
  setMany(items: Record<string, unknown>): boolean {
    let success = true;

    for (const [key, value] of Object.entries(items)) {
      const result = this.setLocal(key, value);
      if (!result) {
        success = false;
      }
    }

    return success;
  }

  /**
   * دریافت چند آیتم به صورت batch
   */
  getMany<T = unknown>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};

    for (const key of keys) {
      result[key] = this.getLocal<T>(key);
    }

    return result;
  }

  /**
   * Export همه داده‌ها به JSON
   */
  exportAll(): string {
    const data: Record<string, unknown> = {};
    const keys = this.getAllKeys();

    for (const key of keys) {
      const value = this.getLocal(key);
      if (value !== null) {
        data[key] = value;
      }
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import داده‌ها از JSON
   */
  importAll(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString) as Record<string, unknown>;

      if (typeof data !== 'object' || data === null) {
        logger.error('داده import شده نامعتبر است');
        return false;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const [key, value] of Object.entries(data)) {
        const result = this.setLocal(key, value);
        if (result) {
          successCount++;
        } else {
          errorCount++;
        }
      }

      logger.info('Import کامل شد', { successCount, errorCount });
      return errorCount === 0;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('خطا در import داده‌ها', { error: errorMessage });
      return false;
    }
  }

  // ============================================================
  // متدهای خصوصی
  // ============================================================

  /**
   * دریافت کلید کامل با prefix
   */
  private _getFullKey(key: string): string {
    return this._prefix + key;
  }
}

// ============================================================
// Singleton
// ============================================================

let storageInstance: Storage | null = null;

/**
 * دریافت نمونه singleton از Storage
 */
export function getStorage(options: StorageOptions = {}): Storage {
  if (!storageInstance) {
    storageInstance = new Storage(options);
  }
  return storageInstance;
}

/**
 * ریست کردن نمونه singleton (فقط برای تست)
 */
export function resetStorage(): void {
  storageInstance = null;
}

/**
 * Export پیش‌فرض
 */
export default getStorage();