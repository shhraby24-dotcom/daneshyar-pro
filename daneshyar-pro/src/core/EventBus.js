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

import LoggerModule from './Logger.js';

// دریافت نمونه Logger
const logger = LoggerModule.getInstance().module('EventBus');

/**
 * کلاس اصلی EventBus
 */
class EventBus {
  /**
   * سازنده کلاس EventBus
   * @param {Object} options - تنظیمات اولیه
   * @param {number} options.historySize - حداکثر تعداد رویدادهای ذخیره شده در تاریخچه
   * @param {boolean} options.debug - حالت debug (لاگ همه رویدادها)
   * @param {boolean} options.allowWildcard - آیا wildcard مجاز است؟
   */
  constructor(options = {}) {
    this.config = {
      historySize: options.historySize || 100,
      debug: options.debug || false,
      allowWildcard: options.allowWildcard !== false
    };

    // Map برای ذخیره listener ها
    // کلید = نام رویداد، مقدار = آرایه listener ها
    this._listeners = new Map();

    // آرایه برای تاریخچه رویدادها
    this._history = [];

    // نام ماژول پیش‌فرض
    this._moduleName = 'Global';

    // شناسه یکتا برای هر subscription
    this._subscriptionIdCounter = 0;

    logger.debug('EventBus initialized', { config: this.config });
  }

  /**
   * تنظیم نام ماژول برای لاگ‌های بهتر
   * 
   * @param {string} moduleName - نام ماژول
   * @returns {EventBus} یک EventBus جدید با نام ماژول جدید
   * 
   * @example
   * const notesBus = eventBus.module('NotesFeature');
   * notesBus.emit('note:created', { id: '123' });
   */
  module(moduleName) {
    const wrapper = Object.create(this);
    wrapper._moduleName = moduleName;
    return wrapper;
  }

  /**
   * ثبت یک listener برای یک رویداد
   * 
   * @param {string} eventName - نام رویداد
   * @param {Function} callback - تابع callback
   * @param {Object} [options] - تنظیمات اضافی
   * @param {boolean} [options.once] - آیا فقط یک بار فراخوانی شود؟
   * @param {number} [options.priority] - اولویت (عدد بالاتر = اولویت بالاتر)
   * @returns {number} شناسه subscription (برای استفاده در off)
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
  on(eventName, callback, options = {}) {
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
    const listener = {
      id: subscriptionId,
      callback: callback,
      once: options.once || false,
      priority: options.priority || 0,
      module: this._moduleName,
      createdAt: new Date().toISOString()
    };

    // دریافت یا ساخت آرایه listener ها برای این رویداد
    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, []);
    }

    const listeners = this._listeners.get(eventName);
    
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
        once: listener.once
      });
    }

    return subscriptionId;
  }

  /**
   * ثبت یک listener که فقط یک بار فراخوانی می‌شود
   * پس از اولین فراخوانی، به صورت خودکار حذف می‌شود
   * 
   * @param {string} eventName - نام رویداد
   * @param {Function} callback - تابع callback
   * @param {Object} [options] - تنظیمات اضافی
   * @returns {number} شناسه subscription
   * 
   * @example
   * eventBus.once('app:ready', () => {
   *   console.log('برنامه آماده شد (فقط یک بار)');
   * });
   */
  once(eventName, callback, options = {}) {
    return this.on(eventName, callback, { ...options, once: true });
  }

  /**
   * حذف یک listener
   * می‌توان با subscriptionId یا با callback حذف کرد
   * 
   * @param {string} eventName - نام رویداد
   * @param {Function|number} callbackOrId - تابع callback یا شناسه subscription
   * @returns {boolean} آیا حذف موفق بود؟
   * 
   * @example
   * // حذف با شناسه
   * const subId = eventBus.on('test', handler);
   * eventBus.off('test', subId);
   * 
   * // حذف با callback
   * eventBus.off('test', handler);
   */
  off(eventName, callbackOrId) {
    if (!this._listeners.has(eventName)) {
      return false;
    }

    const listeners = this._listeners.get(eventName);
    const initialLength = listeners.length;

    // فیلتر کردن listener ها
    const filtered = listeners.filter(listener => {
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
        removedCount: removed
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
   * @param {string} eventName - نام رویداد
   * @param {*} [data] - داده‌های ارسالی به listener ها
   * @returns {Promise<Array>} آرایه‌ای از نتایج listener ها
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
  async emit(eventName, data = null) {
    // ساخت شیء رویداد
    const event = {
      name: eventName,
      data: data,
      timestamp: new Date().toISOString(),
      module: this._moduleName
    };

    // ذخیره در تاریخچه
    this._addToHistory(event);

    if (this.config.debug) {
      logger.debug('رویداد منتشر شد', {
        event: eventName,
        data: data,
        module: this._moduleName
      });
    }

    // جمع‌آوری همه listener های مرتبط
    const allListeners = this._collectListeners(eventName);

    if (allListeners.length === 0) {
      if (this.config.debug) {
        logger.debug('هیچ listener برای رویداد یافت نشد', { event: eventName });
      }
      return [];
    }

    // فراخوانی listener ها به ترتیب اولویت
    const results = [];
    const listenersToRemove = [];

    for (const { listener, originalEventName } of allListeners) {
      try {
        // فراخوانی callback
        const result = await listener.callback(data, event);
        results.push(result);

        // اگر once بود، برای حذف علامت‌گذاری کن
        if (listener.once) {
          listenersToRemove.push({
            eventName: originalEventName,
            listenerId: listener.id
          });
        }
      } catch (error) {
        logger.error('خطا در listener', {
          event: eventName,
          module: listener.module,
          error: error.message,
          stack: error.stack
        });
        results.push({ error: error.message });
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
   * 
   * @param {string} eventName - نام رویداد
   * @param {*} [data] - داده‌های ارسالی
   * @returns {number} تعداد listener های فراخوانی شده
   */
  emitSync(eventName, data = null) {
    const event = {
      name: eventName,
      data: data,
      timestamp: new Date().toISOString(),
      module: this._moduleName
    };

    this._addToHistory(event);

    const allListeners = this._collectListeners(eventName);
    const listenersToRemove = [];
    let calledCount = 0;

    for (const { listener, originalEventName } of allListeners) {
      try {
        listener.callback(data, event);
        calledCount++;

        if (listener.once) {
          listenersToRemove.push({
            eventName: originalEventName,
            listenerId: listener.id
          });
        }
      } catch (error) {
        logger.error('خطا در listener (sync)', {
          event: eventName,
          error: error.message
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
   * جمع‌آوری همه listener های مرتبط با یک رویداد
   * شامل listener های مستقیم و wildcard
   * 
   * @private
   * @param {string} eventName - نام رویداد
   * @returns {Array} آرایه‌ای از { listener, originalEventName }
   */
  _collectListeners(eventName) {
    const allListeners = [];

    // listener های مستقیم
    if (this._listeners.has(eventName)) {
      const directListeners = this._listeners.get(eventName);
      for (const listener of directListeners) {
        allListeners.push({ listener, originalEventName: eventName });
      }
    }

    // listener های wildcard
    if (this.config.allowWildcard) {
      for (const [pattern, listeners] of this._listeners.entries()) {
        if (pattern !== eventName && this._matchWildcard(pattern, eventName)) {
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
   * 
   * @private
   * @param {string} pattern - الگو (مثلاً 'note:*')
   * @param {string} eventName - نام رویداد (مثلاً 'note:created')
   * @returns {boolean} آیا تطبیق دارد؟
   */
  _matchWildcard(pattern, eventName) {
    if (!pattern.includes('*')) return false;

    // تبدیل pattern به regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')      // * → .*
      .replace(/\?/g, '.')       // ? → .
      .replace(/\./g, '\\.');    // escape کردن نقطه‌ها

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(eventName);
  }

  /**
   * اضافه کردن رویداد به تاریخچه
   * 
   * @private
   * @param {Object} event - شیء رویداد
   */
  _addToHistory(event) {
    this._history.push(event);

    // محدود کردن اندازه تاریخچه
    if (this._history.length > this.config.historySize) {
      this._history = this._history.slice(-this.config.historySize);
    }
  }

  /**
   * دریافت تاریخچه رویدادها
   * 
   * @param {Object} [filter] - فیلتر اختیاری
   * @param {string} [filter.name] - فیلتر بر اساس نام رویداد
   * @param {string} [filter.module] - فیلتر بر اساس ماژول
   * @param {number} [filter.limit] - حداکثر تعداد
   * @returns {Array} آرایه رویدادها
   */
  getHistory(filter = {}) {
    let result = [...this._history];

    // فیلتر بر اساس نام
    if (filter.name) {
      result = result.filter(e => e.name === filter.name);
    }

    // فیلتر بر اساس ماژول
    if (filter.module) {
      result = result.filter(e => e.module === filter.module);
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
  clearHistory() {
    this._history = [];
    logger.info('تاریخچه EventBus پاک شد');
  }

  /**
   * بررسی اینکه آیا رویدادی listener دارد
   * 
   * @param {string} eventName - نام رویداد
   * @returns {boolean}
   */
  hasListeners(eventName) {
    if (this._listeners.has(eventName)) {
      return this._listeners.get(eventName).length > 0;
    }
    return false;
  }

  /**
   * دریافت تعداد listener های یک رویداد
   * 
   * @param {string} eventName - نام رویداد
   * @returns {number}
   */
  listenerCount(eventName) {
    if (!this._listeners.has(eventName)) return 0;
    return this._listeners.get(eventName).length;
  }

  /**
   * دریافت لیست همه نام‌های رویدادهای ثبت شده
   * 
   * @returns {Array<string>}
   */
  eventNames() {
    return Array.from(this._listeners.keys());
  }

  /**
   * حذف همه listener های یک رویداد
   * 
   * @param {string} eventName - نام رویداد
   * @returns {number} تعداد listener های حذف شده
   */
  removeAllListeners(eventName) {
    if (!this._listeners.has(eventName)) return 0;

    const count = this._listeners.get(eventName).length;
    this._listeners.delete(eventName);

    logger.info('همه listener ها حذف شدند', {
      event: eventName,
      count
    });

    return count;
  }

  /**
   * پاک کردن کامل EventBus
   * حذف همه listener ها و تاریخچه
   */
  clear() {
    const eventCount = this._listeners.size;
    const historyCount = this._history.length;

    this._listeners.clear();
    this._history = [];

    logger.info('EventBus پاک شد', {
      removedEvents: eventCount,
      removedHistory: historyCount
    });
  }

  /**
   * دریافت آمار EventBus
   * 
   * @returns {Object}
   */
  getStats() {
    let totalListeners = 0;
    for (const listeners of this._listeners.values()) {
      totalListeners += listeners.length;
    }

    return {
      eventTypes: this._listeners.size,
      totalListeners: totalListeners,
      historySize: this._history.length,
      maxHistorySize: this.config.historySize
    };
  }
}

// ============================================================
// Singleton Pattern
// ============================================================

let eventBusInstance = null;

/**
 * دریافت نمونه singleton از EventBus
 * 
 * @param {Object} [options] - تنظیمات اولیه
 * @returns {EventBus}
 */
function getInstance(options = {}) {
  if (!eventBusInstance) {
    eventBusInstance = new EventBus(options);
  }
  return eventBusInstance;
}

/**
 * ریست کردن نمونه singleton (فقط برای تست)
 * @private
 */
function resetInstance() {
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
 * استفاده از این ثابت‌ها به جای string های خام،
 * احتمال تایپ اشتباه را کاهش می‌دهد
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
  POMODORO_TICK: 'pomodoro:tick'
};

// ============================================================
// Export
// ============================================================

export {
  EventBus,
  getInstance,
  resetInstance
};

export default {
  getInstance,
  resetInstance,
  EVENTS
};