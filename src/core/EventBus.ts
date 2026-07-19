/**
 * ============================================================
 * دانش‌یار پرو - سیستم EventBus (پیام‌رسان بین ماژول‌ها)
 * ============================================================
 *
 * این ماژول یک سیستم publish/subscribe پیاده‌سازی می‌کند که
 * به ماژول‌های مختلف اجازه می‌دهد بدون وابستگی مستقیم با هم
 * ارتباط برقرار کنند.
 *
 * ✅ پشتیبانی از subscribe (on) و unsubscribe (off)
 * ✅ رویدادهای یک‌باره (once)
 * ✅ پشتیبانی از wildcard (*)
 * ✅ تاریخچه رویدادها (event history)
 * ✅ متد ماژول‌محور (module)
 * ✅ یکپارچگی با Logger
 * ✅ singleton pattern
 * ✅ پشتیبانی از async handlers
 *
 * @module core/EventBus
 * @version 1.0.0
 */

import { getInstance as getLogger } from '@/core/Logger';

// دریافت نمونه Logger
const logger = getLogger().module('EventBus');

// ============================================================
// Types و Interfaces
// ============================================================

/**
 * تنظیمات اولیه EventBus
 */
export interface EventBusOptions {
  historySize?: number;
  debug?: boolean;
  allowWildcard?: boolean;
}

/**
 * تنظیمات subscription
 */
export interface SubscriptionOptions {
  once?: boolean;
  priority?: number;
}

/**
 * یک listener ثبت شده
 */
interface Listener {
  id: number;
  callback: EventCallback;
  once: boolean;
  priority: number;
  module: string;
  createdAt: string;
}

/**
 * شیء رویداد
 */
export interface EventObject {
  name: string;
  data: unknown;
  timestamp: string;
  module: string;
}

/**
 * نوع callback برای listener ها
 */
export type EventCallback = (
  data: unknown,
  event: EventObject
) => void | Promise<void> | unknown;

/**
 * فیلتر برای تاریخچه
 */
export interface HistoryFilter {
  name?: string;
  module?: string;
  limit?: number;
}

/**
 * آمار EventBus
 */
export interface EventBusStats {
  eventTypes: number;
  totalListeners: number;
  historySize: number;
  maxHistorySize: number;
}

// ============================================================
// کلاس اصلی EventBus
// ============================================================

/**
 * کلاس اصلی EventBus
 */
export class EventBus {
  private config: Required<EventBusOptions>;
  private _listeners: Map<string, Listener[]> = new Map();
  private _history: EventObject[] = [];
  private _moduleName: string = 'Global';
  private _subscriptionIdCounter: number = 0;

  /**
   * سازنده کلاس EventBus
   */
  constructor(options: EventBusOptions = {}) {
    this.config = {
      historySize: options.historySize ?? 100,
      debug: options.debug ?? false,
      allowWildcard: options.allowWildcard !== false,
    };

    logger.debug('EventBus initialized', { config: this.config });
  }

  /**
   * تنظیم نام ماژول برای لاگ‌های بهتر
   *
   * @example
   * const notesBus = eventBus.module('NotesFeature');
   * notesBus.emit('note:created', { id: '123' });
   */
  module(moduleName: string): EventBus {
    const wrapper = Object.create(this) as EventBus;
    wrapper._moduleName = moduleName;
    return wrapper;
  }

  /**
   * ثبت یک listener برای یک رویداد
   *
   * @example
   * // ثبت ساده
   * const subId = eventBus.on('note:created', (data) => {
   *   console.log('یادداشت جدید:', data);
   * });
   *
   * // با اولویت
   * eventBus.on('note:created', handler, { priority: 10 });
   */
  on(
    eventName: string,
    callback: EventCallback,
    options: SubscriptionOptions = {}
  ): number {
    // اعتبارسنجی ورودی‌ها
    if (typeof eventName !== 'string' || !eventName.trim()) {
      logger.error('نام رویداد نامعتبر است', { eventName });
      throw new Error('Event name must be a non-empty string');
    }

    if (typeof callback !== 'function') {
      logger.error('callback باید یک تابع باشد', { eventName });
      throw new Error('Callback must be a function');
    }

    // بررسی wildcard
    if (eventName.includes('*') && !this.config.allowWildcard) {
      logger.warn('Wildcard غیرفعال است', { eventName });
    }

    // ساخت شیء listener
    const subscriptionId = ++this._subscriptionIdCounter;
    const listener: Listener = {
      id: subscriptionId,
      callback,
      once: options.once ?? false,
      priority: options.priority ?? 0,
      module: this._moduleName,
      createdAt: new Date().toISOString(),
    };

    // دریافت یا ساخت آرایه listener ها برای این رویداد
    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, []);
    }

    const listeners = this._listeners.get(eventName)!;

    // اضافه کردن listener جدید
    listeners.push(listener);

    // مرتب‌سازی بر اساس اولویت (نزولی)
    listeners.sort((a, b) => b.priority - a.priority);

    if (this.config.debug) {
      logger.debug('Listener ثبت شد', {
        event: eventName,
        subscriptionId,
        module: this._moduleName,
        priority: listener.priority,
        once: listener.once,
      });
    }

    return subscriptionId;
  }

  /**
   * ثبت یک listener که فقط یک بار فراخوانی می‌شود
   *
   * @example
   * eventBus.once('app:ready', () => {
   *   console.log('برنامه آماده شد (فقط یک بار)');
   * });
   */
  once(
    eventName: string,
    callback: EventCallback,
    options: Omit<SubscriptionOptions, 'once'> = {}
  ): number {
    return this.on(eventName, callback, { ...options, once: true });
  }

  /**
   * حذف یک listener
   *
   * @example
   * // حذف با شناسه
   * const subId = eventBus.on('test', handler);
   * eventBus.off('test', subId);
   *
   * // حذف با callback
   * eventBus.off('test', handler);
   */
  off(eventName: string, callbackOrId: EventCallback | number): boolean {
    if (!this._listeners.has(eventName)) {
      return false;
    }

    const listeners = this._listeners.get(eventName)!;
    const initialLength = listeners.length;

    // فیلتر کردن listener ها
    const filtered = listeners.filter((listener) => {
      if (typeof callbackOrId === 'number') {
        // حذف با شناسه
        return listener.id !== callbackOrId;
      } else if (typeof callbackOrId === 'function') {
        // حذف با callback
        return listener.callback !== callbackOrId;
      }
      return true;
    });

    // جایگزینی آرایه
    this._listeners.set(eventName, filtered);

    const removed = initialLength - filtered.length;

    if (this.config.debug && removed > 0) {
      logger.debug('Listener حذف شد', {
        event: eventName,
        removedCount: removed,
      });
    }

    // اگر آرایه خالی شد، کلید را حذف کن
    if (filtered.length === 0) {
      this._listeners.delete(eventName);
    }

    return removed > 0;
  }

  /**
   * انتشار یک رویداد و فراخوانی همه listener ها
   *
   * @example
   * // انتشار ساده
   * eventBus.emit('note:created', { id: '123', title: 'تست' });
   *
   * // با wildcard
   * eventBus.on('note:*', (data) => {
   *   console.log('رویداد note دریافت شد:', data);
   * });
   * eventBus.emit('note:created', { id: '123' }); // این listener هم فراخوانی می‌شود
   */
  async emit(eventName: string, data: unknown = null): Promise<unknown[]> {
    // ساخت شیء رویداد
    const event: EventObject = {
      name: eventName,
      data,
      timestamp: new Date().toISOString(),
      module: this._moduleName,
    };

    // ذخیره در تاریخچه
    this._addToHistory(event);

    if (this.config.debug) {
      logger.debug('رویداد منتشر شد', {
        event: eventName,
        data,
        module: this._moduleName,
      });
    }

    // جمع‌آوری همه listener های مرتبط
    const allListeners = this._collectListeners(eventName);

    if (allListeners.length === 0) {
      if (this.config.debug) {
        logger.debug('هیچ listener برای رویداد یافت نشد', {
          event: eventName,
        });
      }
      return [];
    }

    // فراخوانی listener ها به ترتیب اولویت
    const results: unknown[] = [];
    const listenersToRemove: Array<{
      eventName: string;
      listenerId: number;
    }> = [];

    for (const { listener, originalEventName } of allListeners) {
      try {
        // فراخوانی callback
        const result = await listener.callback(data, event);
        results.push(result);

        // اگر once بود، برای حذف علامت‌گذاری کن
        if (listener.once) {
          listenersToRemove.push({
            eventName: originalEventName,
            listenerId: listener.id,
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        logger.error('خطا در listener', {
          event: eventName,
          module: listener.module,
          error: errorMessage,
          stack: errorStack,
        });
        results.push({ error: errorMessage });
      }
    }

    // حذف listener های once
    for (const { eventName: evtName, listenerId } of listenersToRemove) {
      this.off(evtName, listenerId);
    }

    return results;
  }

  /**
   * انتشار همزمان (synchronous) رویداد
   * این متد منتظر listener های async نمی‌ماند
   */
  emitSync(eventName: string, data: unknown = null): number {
    const event: EventObject = {
      name: eventName,
      data,
      timestamp: new Date().toISOString(),
      module: this._moduleName,
    };

    this._addToHistory(event);

    const allListeners = this._collectListeners(eventName);
    const listenersToRemove: Array<{
      eventName: string;
      listenerId: number;
    }> = [];
    let calledCount = 0;

    for (const { listener, originalEventName } of allListeners) {
      try {
        listener.callback(data, event);
        calledCount++;

        if (listener.once) {
          listenersToRemove.push({
            eventName: originalEventName,
            listenerId: listener.id,
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error('خطا در listener (sync)', {
          event: eventName,
          error: errorMessage,
        });
      }
    }

    // حذف listener های once
    for (const { eventName: evtName, listenerId } of listenersToRemove) {
      this.off(evtName, listenerId);
    }

    return calledCount;
  }

  /**
   * دریافت تاریخچه رویدادها
   */
  getHistory(filter: HistoryFilter = {}): EventObject[] {
    let result = [...this._history];

    // فیلتر بر اساس نام
    if (filter.name) {
      result = result.filter((e) => e.name === filter.name);
    }

    // فیلتر بر اساس ماژول
    if (filter.module) {
      result = result.filter((e) => e.module === filter.module);
    }

    // محدود کردن تعداد
    if (filter.limit && filter.limit > 0) {
      result = result.slice(-filter.limit);
    }

    return result;
  }

  /**
   * پاک کردن تاریخچه
   */
  clearHistory(): void {
    this._history = [];
    logger.info('تاریخچه EventBus پاک شد');
  }

  /**
   * بررسی اینکه آیا رویدادی listener دارد
   */
  hasListeners(eventName: string): boolean {
    if (this._listeners.has(eventName)) {
      return this._listeners.get(eventName)!.length > 0;
    }
    return false;
  }

  /**
   * دریافت تعداد listener های یک رویداد
   */
  listenerCount(eventName: string): number {
    if (!this._listeners.has(eventName)) return 0;
    return this._listeners.get(eventName)!.length;
  }

  /**
   * دریافت لیست همه نام‌های رویدادهای ثبت شده
   */
  eventNames(): string[] {
    return Array.from(this._listeners.keys());
  }

  /**
   * حذف همه listener های یک رویداد
   */
  removeAllListeners(eventName: string): number {
    if (!this._listeners.has(eventName)) return 0;

    const count = this._listeners.get(eventName)!.length;
    this._listeners.delete(eventName);

    logger.info('همه listener ها حذف شدند', {
      event: eventName,
      count,
    });

    return count;
  }

  /**
   * پاک کردن کامل EventBus
   */
  clear(): void {
    const eventCount = this._listeners.size;
    const historyCount = this._history.length;

    this._listeners.clear();
    this._history = [];

    logger.info('EventBus پاک شد', {
      removedEvents: eventCount,
      removedHistory: historyCount,
    });
  }

  /**
   * دریافت آمار EventBus
   */
  getStats(): EventBusStats {
    let totalListeners = 0;
    for (const listeners of this._listeners.values()) {
      totalListeners += listeners.length;
    }

    return {
      eventTypes: this._listeners.size,
      totalListeners,
      historySize: this._history.length,
      maxHistorySize: this.config.historySize,
    };
  }

  // ============================================================
  // متدهای خصوصی
  // ============================================================

  /**
   * جمع‌آوری همه listener های مرتبط با یک رویداد
   */
  private _collectListeners(
    eventName: string
  ): Array<{ listener: Listener; originalEventName: string }> {
    const allListeners: Array<{
      listener: Listener;
      originalEventName: string;
    }> = [];

    // listener های مستقیم
    if (this._listeners.has(eventName)) {
      const directListeners = this._listeners.get(eventName)!;
      for (const listener of directListeners) {
        allListeners.push({ listener, originalEventName: eventName });
      }
    }

    // listener های wildcard
    if (this.config.allowWildcard) {
      for (const [pattern, listeners] of this._listeners.entries()) {
        if (
          pattern !== eventName &&
          this._matchWildcard(pattern, eventName)
        ) {
          for (const listener of listeners) {
            allListeners.push({ listener, originalEventName: pattern });
          }
        }
      }
    }

    // مرتب‌سازی بر اساس اولویت
    allListeners.sort((a, b) => b.listener.priority - a.listener.priority);

    return allListeners;
  }

  /**
   * تطبیق الگوی wildcard با نام رویداد
   */
  private _matchWildcard(pattern: string, eventName: string): boolean {
    if (!pattern.includes('*')) return false;

    // تبدیل pattern به regex
    const regexPattern = pattern
      .replace(/\*/g, '.*') // * → .*
      .replace(/\?/g, '.') // ? → .
      .replace(/\./g, '\\.'); // escape کردن نقطه‌ها

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(eventName);
  }

  /**
   * اضافه کردن رویداد به تاریخچه
   */
  private _addToHistory(event: EventObject): void {
    this._history.push(event);

    // محدود کردن اندازه تاریخچه
    if (this._history.length > this.config.historySize) {
      this._history = this._history.slice(-this.config.historySize);
    }
  }
}

// ============================================================
// Singleton Pattern
// ============================================================

let eventBusInstance: EventBus | null = null;

/**
 * دریافت نمونه singleton از EventBus
 */
export function getInstance(options: EventBusOptions = {}): EventBus {
  if (!eventBusInstance) {
    eventBusInstance = new EventBus(options);
  }
  return eventBusInstance;
}

/**
 * ریست کردن نمونه singleton (فقط برای تست)
 */
export function resetInstance(): void {
  if (eventBusInstance) {
    eventBusInstance.clear();
  }
  eventBusInstance = null;
}

// ============================================================
// رویدادهای پیش‌تعریف شده (Event Constants)
// ============================================================

/**
 * ثابت‌های رویدادهای سیستم
 */
export const EVENTS = {
  // رویدادهای سیستم
  APP_READY: 'app:ready',
  APP_ERROR: 'app:error',

  // رویدادهای یادداشت‌ها
  NOTE_CREATED: 'note:created',
  NOTE_UPDATED: 'note:updated',
  NOTE_DELETED: 'note:deleted',
  NOTE_PINNED: 'note:pinned',

  // رویدادهای فلش‌کارت
  FLASHCARD_CREATED: 'flashcard:created',
  FLASHCARD_REVIEWED: 'flashcard:reviewed',
  FLASHCARD_DELETED: 'flashcard:deleted',

  // رویدادهای آزمون
  QUIZ_STARTED: 'quiz:started',
  QUIZ_COMPLETED: 'quiz:completed',
  QUIZ_CANCELLED: 'quiz:cancelled',

  // رویدادهای Storage
  STORAGE_SAVED: 'storage:saved',
  STORAGE_LOADED: 'storage:loaded',
  STORAGE_ERROR: 'storage:error',

  // رویدادهای State
  STATE_CHANGED: 'state:changed',

  // رویدادهای UI
  UI_TOAST: 'ui:toast',
  UI_MODAL_OPEN: 'ui:modal:open',
  UI_MODAL_CLOSE: 'ui:modal:close',
  UI_NAVIGATE: 'ui:navigate',

  // رویدادهای پومودورو
  POMODORO_STARTED: 'pomodoro:started',
  POMODORO_COMPLETED: 'pomodoro:completed',
  POMODORO_TICK: 'pomodoro:tick',
} as const;

// ============================================================
// Export پیش‌فرض
// ============================================================

export default {
  getInstance,
  resetInstance,
  EVENTS,
};