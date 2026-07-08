/**
 * ============================================================
 * دانش‌یار پرو - سیستم لاگ حرفه‌ای
 * ============================================================
 * 
 * این ماژول یک سیستم لاگ کامل ارائه می‌دهد که:
 * 
 * ✅ سطوح مختلف لاگ (debug, info, warn, error, fatal)
 * ✅ رنگ‌بندی زیبا در کنسول مرورگر
 * ✅ اضافه کردن context و metadata
 * ✅ grouping برای لاگ‌های مرتبط
 * ✅ فعال/غیرفعال کردن سطوح مختلف
 * ✅ singleton pattern (فقط یک نمونه در کل برنامه)
 * ✅ timestamp خودکار
 * 
 * @module core/Logger
 * @version 1.0.0
 */

/**
 * سطوح لاگ و اولویت آن‌ها
 * هرچه عدد کمتر باشد، اولویت بالاتر است
 */
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
  SILENT: 5 // هیچ لاگی نمایش داده نمی‌شود
};

/**
 * رنگ‌های هر سطح لاگ در کنسول
 */
const LOG_COLORS = {
  DEBUG: {
    bg: '#374151',      // خاکستری تیره
    text: '#d1d5db',    // خاکستری روشن
    icon: '🔍'
  },
  INFO: {
    bg: '#1e40af',      // آبی تیره
    text: '#dbeafe',    // آبی روشن
    icon: 'ℹ️'
  },
  WARN: {
    bg: '#92400e',      // نارنجی تیره
    text: '#fef3c7',    // زرد روشن
    icon: '⚠️'
  },
  ERROR: {
    bg: '#991b1b',      // قرمز تیره
    text: '#fee2e2',    // قرمز روشن
    icon: '❌'
  },
  FATAL: {
    bg: '#7f1d1d',      // قرمز خیلی تیره
    text: '#fecaca',    // قرمز خیلی روشن
    icon: '💀'
  }
};

/**
 * کلاس اصلی Logger
 * 
 * این کلاس به صورت singleton پیاده‌سازی شده است،
 * یعنی در کل برنامه فقط یک نمونه از آن وجود دارد.
 */
class Logger {
  /**
   * سازنده کلاس Logger
   * @param {Object} options - تنظیمات اولیه
   * @param {string} options.level - سطح پیش‌فرض لاگ
   * @param {boolean} options.enabled - آیا لاگ فعال است؟
   * @param {boolean} options.showTimestamp - آیا timestamp نمایش داده شود؟
   * @param {boolean} options.persistToStorage - آیا لاگ‌ها در localStorage ذخیره شوند؟
   */
  constructor(options = {}) {
    // تنظیمات پیش‌فرض
    this.config = {
      level: options.level || 'DEBUG',
      enabled: options.enabled !== false,
      showTimestamp: options.showTimestamp !== false,
      persistToStorage: options.persistToStorage || false,
      maxStoredLogs: options.maxStoredLogs || 100
    };

    // آرایه لاگ‌های ذخیره شده
    this._storedLogs = [];

    // نام ماژول پیش‌فرض
    this._moduleName = 'App';

    // لاگ اولیه
    this._log('DEBUG', 'Logger initialized', {
      config: this.config
    });
  }

  /**
   * تنظیم نام ماژول فعلی
   * این متد یک Logger جدید برمی‌گرداند که نام ماژول آن تنظیم شده
   * 
   * @param {string} moduleName - نام ماژول
   * @returns {Logger} یک نمونه Logger با نام ماژول جدید
   * 
   * @example
   * const logger = Logger.getInstance().module('NotesFeature');
   * logger.info('یادداشت جدید اضافه شد');
   */
  module(moduleName) {
    // یک wrapper برمی‌گردانیم که نام ماژول را اضافه می‌کند
    const wrapper = Object.create(this);
    wrapper._moduleName = moduleName;
    return wrapper;
  }

  /**
   * لاگ سطح DEBUG
   * برای اطلاعات دقیق و فنی که فقط در زمان توسعه نیاز است
   * 
   * @param {string} message - پیام لاگ
   * @param {Object} [data] - داده‌های اضافی
   */
  debug(message, data = null) {
    this._log('DEBUG', message, data);
  }

  /**
   * لاگ سطح INFO
   * برای اطلاعات عمومی و عادی
   * 
   * @param {string} message - پیام لاگ
   * @param {Object} [data] - داده‌های اضافی
   */
  info(message, data = null) {
    this._log('INFO', message, data);
  }

  /**
   * لاگ سطح WARN
   * برای هشدارها و مواردی که نیاز به توجه دارند
   * 
   * @param {string} message - پیام لاگ
   * @param {Object} [data] - داده‌های اضافی
   */
  warn(message, data = null) {
    this._log('WARN', message, data);
  }

  /**
   * لاگ سطح ERROR
   * برای خطاهایی که برنامه می‌تواند از آن‌ها بازیابی شود
   * 
   * @param {string} message - پیام لاگ
   * @param {Object|Error} [data] - داده‌های اضافی یا شیء Error
   */
  error(message, data = null) {
    this._log('ERROR', message, data);
  }

  /**
   * لاگ سطح FATAL
   * برای خطاهای بحرانی که برنامه نمی‌تواند ادامه دهد
   * 
   * @param {string} message - پیام لاگ
   * @param {Object|Error} [data] - داده‌های اضافی یا شیء Error
   */
  fatal(message, data = null) {
    this._log('FATAL', message, data);
  }

  /**
   * شروع یک گروه لاگ
   * 
   * @param {string} label - برچسب گروه
   * @param {boolean} [collapsed=false] - آیا گروه بسته شروع شود؟
   */
  group(label, collapsed = false) {
    if (!this._shouldLog('INFO')) return;
    
    if (collapsed) {
      console.groupCollapsed(
        `%c${LOG_COLORS.INFO.icon} [${this._moduleName}] ${label}`,
        `color: ${LOG_COLORS.INFO.text}; font-weight: bold;`
      );
    } else {
      console.group(
        `%c${LOG_COLORS.INFO.icon} [${this._moduleName}] ${label}`,
        `color: ${LOG_COLORS.INFO.text}; font-weight: bold;`
      );
    }
  }

  /**
   * پایان گروه لاگ
   */
  groupEnd() {
    console.groupEnd();
  }

  /**
   * نمایش یک جدول در کنسول
   * 
   * @param {Array|Object} data - داده‌های جدول
   * @param {string} [label] - برچسب اختیاری
   */
  table(data, label = null) {
    if (!this._shouldLog('INFO')) return;
    
    if (label) {
      this.info(label);
    }
    console.table(data);
  }

  /**
   * اندازه‌گیری زمان یک عملیات
   * 
   * @param {string} label - برچسب تایمر
   */
  time(label) {
    if (!this._shouldLog('DEBUG')) return;
    console.time(`[${this._moduleName}] ${label}`);
  }

  /**
   * پایان اندازه‌گیری زمان
   * 
   * @param {string} label - برچسب تایمر
   */
  timeEnd(label) {
    if (!this._shouldLog('DEBUG')) return;
    console.timeEnd(`[${this._moduleName}] ${label}`);
  }

  /**
   * شمارش تعداد فراخوانی‌ها
   * 
   * @param {string} label - برچسب شمارنده
   */
  count(label) {
    if (!this._shouldLog('DEBUG')) return;
    console.count(`[${this._moduleName}] ${label}`);
  }

  /**
   * ریست شمارنده
   * 
   * @param {string} label - برچسب شمارنده
   */
  countReset(label) {
    console.countReset(`[${this._moduleName}] ${label}`);
  }

  /**
   * تنظیم سطح لاگ
   * 
   * @param {string} level - سطح جدید (DEBUG, INFO, WARN, ERROR, FATAL, SILENT)
   */
  setLevel(level) {
    const normalizedLevel = level.toUpperCase();
    if (LOG_LEVELS[normalizedLevel] !== undefined) {
      this.config.level = normalizedLevel;
      this.info('سطح لاگ تغییر کرد', { newLevel: normalizedLevel });
    } else {
      this.warn('سطح لاگ نامعتبر', { requestedLevel: level });
    }
  }

  /**
   * فعال/غیرفعال کردن لاگ
   * 
   * @param {boolean} enabled - آیا لاگ فعال باشد؟
   */
  setEnabled(enabled) {
    this.config.enabled = enabled;
  }

  /**
   * دریافت تمام لاگ‌های ذخیره شده
   * 
   * @returns {Array} آرایه لاگ‌ها
   */
  getStoredLogs() {
    return [...this._storedLogs];
  }

  /**
   * پاک کردن لاگ‌های ذخیره شده
   */
  clearStoredLogs() {
    this._storedLogs = [];
    if (this.config.persistToStorage) {
      try {
        localStorage.removeItem('daneshyar_logs');
      } catch (e) {
        // خطا را نادیده می‌گیریم
      }
    }
    this.info('لاگ‌های ذخیره شده پاک شدند');
  }

  /**
   * خروجی گرفتن از لاگ‌ها به صورت JSON
   * 
   * @returns {string} JSON string از لاگ‌ها
   */
  exportLogs() {
    return JSON.stringify(this._storedLogs, null, 2);
  }

  /**
   * متد اصلی لاگ (خصوصی)
   * این متد توسط متدهای عمومی فراخوانی می‌شود
   * 
   * @private
   * @param {string} level - سطح لاگ
   * @param {string} message - پیام لاگ
   * @param {Object|Error} [data] - داده‌های اضافی
   */
  _log(level, message, data = null) {
    // بررسی آیا باید لاگ کنیم یا نه
    if (!this._shouldLog(level)) {
      return;
    }

    // ساخت شیء لاگ
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level,
      module: this._moduleName,
      message: message,
      data: data
    };

    // ذخیره لاگ
    this._storeLog(logEntry);

    // نمایش در کنسول
    this._displayLog(logEntry);
  }

  /**
   * بررسی اینکه آیا باید این سطح لاگ نمایش داده شود
   * 
   * @private
   * @param {string} level - سطح لاگ
   * @returns {boolean}
   */
  _shouldLog(level) {
    if (!this.config.enabled) return false;
    
    const currentLevelPriority = LOG_LEVELS[this.config.level];
    const messageLevelPriority = LOG_LEVELS[level];
    
    return messageLevelPriority >= currentLevelPriority;
  }

  /**
   * نمایش لاگ در کنسول با رنگ‌بندی
   * 
   * @private
   * @param {Object} logEntry - شیء لاگ
   */
  _displayLog(logEntry) {
    const { level, module, message, data, timestamp } = logEntry;
    const colors = LOG_COLORS[level];

    // ساخت timestamp قابل خواندن
    const timeStr = this.config.showTimestamp 
      ? `[${new Date(timestamp).toLocaleTimeString('fa-IR')}] `
      : '';

    // ساخت استایل CSS برای کنسول
    const style = `
      background: ${colors.bg};
      color: ${colors.text};
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: bold;
    `.replace(/\s+/g, ' ').trim();

    // انتخاب متد console مناسب
    const consoleMethod = {
      DEBUG: 'log',
      INFO: 'info',
      WARN: 'warn',
      ERROR: 'error',
      FATAL: 'error'
    }[level];

    // نمایش لاگ
    if (data !== null && data !== undefined) {
      // اگر داده اضافی داریم
      console[consoleMethod](
        `%c${colors.icon} ${timeStr}[${module}] ${message}`,
        style,
        data
      );
    } else {
      // فقط پیام
      console[consoleMethod](
        `%c${colors.icon} ${timeStr}[${module}] ${message}`,
        style
      );
    }

    // اگر Error object است، stack trace را هم نمایش بده
    if (data instanceof Error && data.stack) {
      console.error(data.stack);
    }
  }

  /**
   * ذخیره لاگ در حافظه و localStorage
   * 
   * @private
   * @param {Object} logEntry - شیء لاگ
   */
  _storeLog(logEntry) {
    // اضافه به آرایه
    this._storedLogs.push(logEntry);

    // محدود کردن تعداد لاگ‌ها
    if (this._storedLogs.length > this.config.maxStoredLogs) {
      this._storedLogs = this._storedLogs.slice(-this.config.maxStoredLogs);
    }

    // ذخیره در localStorage اگر فعال باشد
    if (this.config.persistToStorage) {
      try {
        localStorage.setItem(
          'daneshyar_logs',
          JSON.stringify(this._storedLogs)
        );
      } catch (e) {
        // اگر localStorage پر شد، غیرفعال کن
        this.config.persistToStorage = false;
        console.warn('Logger: localStorage پر شد، ذخیره‌سازی غیرفعال شد');
      }
    }
  }

  /**
   * بارگذاری لاگ‌های ذخیره شده از localStorage
   * 
   * @private
   */
  _loadStoredLogs() {
    if (!this.config.persistToStorage) return;
    
    try {
      const stored = localStorage.getItem('daneshyar_logs');
      if (stored) {
        this._storedLogs = JSON.parse(stored);
      }
    } catch (e) {
      // خطا را نادیده می‌گیریم
      this._storedLogs = [];
    }
  }
}

// ============================================================
// پیاده‌سازی Singleton Pattern
// ============================================================

/**
 * نمونه singleton از Logger
 * این متغیر در کل برنامه یکسان است
 */
let loggerInstance = null;

/**
 * دریافت نمونه singleton از Logger
 * 
 * @param {Object} [options] - تنظیمات اولیه (فقط در اولین فراخوانی)
 * @returns {Logger} نمونه Logger
 * 
 * @example
 * // اولین بار با تنظیمات
 * const logger = Logger.getInstance({ level: 'INFO' });
 * 
 * // دفعات بعدی بدون تنظیمات
 * const logger2 = Logger.getInstance();
 * // logger === logger2 (همان نمونه)
 */
function getInstance(options = {}) {
  if (!loggerInstance) {
    loggerInstance = new Logger(options);
  }
  return loggerInstance;
}

/**
 * ریست کردن نمونه singleton (فقط برای تست)
 * 
 * @private
 */
function resetInstance() {
  loggerInstance = null;
}

// ============================================================
// Export
// ============================================================

export {
  Logger,
  getInstance,
  resetInstance,
  LOG_LEVELS
};

// Default export برای استفاده ساده‌تر
export default {
  getInstance,
  resetInstance,
  LOG_LEVELS
};