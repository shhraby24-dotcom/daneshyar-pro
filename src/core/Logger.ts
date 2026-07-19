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
 * سطوح لاگ
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL' | 'SILENT';

/**
 * اولویت سطوح لاگ (هرچه کمتر، مهم‌تر)
 */
export const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
  SILENT: 5,
};

/**
 * رنگ‌های هر سطح لاگ در کنسول
 */
interface LogColor {
  bg: string;
  text: string;
  icon: string;
}

const LOG_COLORS: Record<Exclude<LogLevel, 'SILENT'>, LogColor> = {
  DEBUG: {
    bg: '#374151',
    text: '#d1d5db',
    icon: '🔍',
  },
  INFO: {
    bg: '#1e40af',
    text: '#dbeafe',
    icon: 'ℹ️',
  },
  WARN: {
    bg: '#92400e',
    text: '#fef3c7',
    icon: '⚠️',
  },
  ERROR: {
    bg: '#991b1b',
    text: '#fee2e2',
    icon: '❌',
  },
  FATAL: {
    bg: '#7f1d1d',
    text: '#fecaca',
    icon: '💀',
  },
};

/**
 * تنظیمات Logger
 */
export interface LoggerOptions {
  level?: LogLevel;
  enabled?: boolean;
  showTimestamp?: boolean;
  persistToStorage?: boolean;
  maxStoredLogs?: number;
}

/**
 * یک لاگ entry
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data: unknown;
}

/**
 * کلاس اصلی Logger
 *
 * این کلاس به صورت singleton پیاده‌سازی شده است،
 * یعنی در کل برنامه فقط یک نمونه از آن وجود دارد.
 */
export class Logger {
  private config: Required<LoggerOptions>;
  private _storedLogs: LogEntry[] = [];
  private _moduleName: string = 'App';

  /**
   * سازنده کلاس Logger
   */
  constructor(options: LoggerOptions = {}) {
    // تنظیمات پیش‌فرض
    this.config = {
      level: options.level ?? 'DEBUG',
      enabled: options.enabled !== false,
      showTimestamp: options.showTimestamp !== false,
      persistToStorage: options.persistToStorage ?? false,
      maxStoredLogs: options.maxStoredLogs ?? 100,
    };

    // بارگذاری لاگ‌های قبلی اگر persist فعال است
    if (this.config.persistToStorage) {
      this._loadStoredLogs();
    }

    // لاگ اولیه
    this._log('DEBUG', 'Logger initialized', {
      config: this.config,
    });
  }

  /**
   * تنظیم نام ماژول فعلی
   * این متد یک Logger جدید برمی‌گرداند که نام ماژول آن تنظیم شده
   *
   * @example
   * const logger = Logger.getInstance().module('NotesFeature');
   * logger.info('یادداشت جدید اضافه شد');
   */
  module(moduleName: string): Logger {
    const wrapper = Object.create(this) as Logger;
    wrapper._moduleName = moduleName;
    return wrapper;
  }

  /**
   * لاگ سطح DEBUG
   */
  debug(message: string, data: unknown = null): void {
    this._log('DEBUG', message, data);
  }

  /**
   * لاگ سطح INFO
   */
  info(message: string, data: unknown = null): void {
    this._log('INFO', message, data);
  }

  /**
   * لاگ سطح WARN
   */
  warn(message: string, data: unknown = null): void {
    this._log('WARN', message, data);
  }

  /**
   * لاگ سطح ERROR
   */
  error(message: string, data: unknown = null): void {
    this._log('ERROR', message, data);
  }

  /**
   * لاگ سطح FATAL
   */
  fatal(message: string, data: unknown = null): void {
    this._log('FATAL', message, data);
  }

  /**
   * شروع یک گروه لاگ
   */
  group(label: string, collapsed: boolean = false): void {
    if (!this._shouldLog('INFO')) return;

    const prefix = `${LOG_COLORS.INFO.icon} [${this._moduleName}] ${label}`;
    const style = `color: ${LOG_COLORS.INFO.text}; font-weight: bold;`;

    if (collapsed) {
      console.groupCollapsed(`%c${prefix}`, style);
    } else {
      console.group(`%c${prefix}`, style);
    }
  }

  /**
   * پایان گروه لاگ
   */
  groupEnd(): void {
    console.groupEnd();
  }

  /**
   * نمایش یک جدول در کنسول
   */
  table(data: unknown, label: string | null = null): void {
    if (!this._shouldLog('INFO')) return;

    if (label) {
      this.info(label);
    }
    console.table(data);
  }

  /**
   * اندازه‌گیری زمان یک عملیات
   */
  time(label: string): void {
    if (!this._shouldLog('DEBUG')) return;
    console.time(`[${this._moduleName}] ${label}`);
  }

  /**
   * پایان اندازه‌گیری زمان
   */
  timeEnd(label: string): void {
    if (!this._shouldLog('DEBUG')) return;
    console.timeEnd(`[${this._moduleName}] ${label}`);
  }

  /**
   * شمارش تعداد فراخوانی‌ها
   */
  count(label: string): void {
    if (!this._shouldLog('DEBUG')) return;
    console.count(`[${this._moduleName}] ${label}`);
  }

  /**
   * ریست شمارنده
   */
  countReset(label: string): void {
    console.countReset(`[${this._moduleName}] ${label}`);
  }

  /**
   * تنظیم سطح لاگ
   */
  setLevel(level: LogLevel): void {
    const normalizedLevel = level.toUpperCase() as LogLevel;
    if (LOG_LEVELS[normalizedLevel] !== undefined) {
      this.config.level = normalizedLevel;
      this.info('سطح لاگ تغییر کرد', { newLevel: normalizedLevel });
    } else {
      this.warn('سطح لاگ نامعتبر', { requestedLevel: level });
    }
  }

  /**
   * فعال/غیرفعال کردن لاگ
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * دریافت تمام لاگ‌های ذخیره شده
   */
  getStoredLogs(): LogEntry[] {
    return [...this._storedLogs];
  }

  /**
   * پاک کردن لاگ‌های ذخیره شده
   */
  clearStoredLogs(): void {
    this._storedLogs = [];
    if (this.config.persistToStorage) {
      try {
        localStorage.removeItem('daneshyar_logs');
      } catch {
        // خطا را نادیده می‌گیریم
      }
    }
    this.info('لاگ‌های ذخیره شده پاک شدند');
  }

  /**
   * خروجی گرفتن از لاگ‌ها به صورت JSON
   */
  exportLogs(): string {
    return JSON.stringify(this._storedLogs, null, 2);
  }

  // ============================================================
  // متدهای خصوصی
  // ============================================================

  /**
   * متد اصلی لاگ (خصوصی)
   */
  private _log(level: LogLevel, message: string, data: unknown = null): void {
    if (!this._shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module: this._moduleName,
      message,
      data,
    };

    this._storeLog(logEntry);
    this._displayLog(logEntry);
  }

  /**
   * بررسی اینکه آیا باید این سطح لاگ نمایش داده شود
   */
  private _shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;

    const currentLevelPriority = LOG_LEVELS[this.config.level];
    const messageLevelPriority = LOG_LEVELS[level];

    return messageLevelPriority >= currentLevelPriority;
  }

  /**
   * نمایش لاگ در کنسول با رنگ‌بندی
   */
  private _displayLog(logEntry: LogEntry): void {
    const { level, module, message, data, timestamp } = logEntry;

    if (level === 'SILENT') return;

    const colors = LOG_COLORS[level];

    // ساخت timestamp قابل خواندن
    const timeStr = this.config.showTimestamp
      ? `[${new Date(timestamp).toLocaleTimeString('fa-IR')}] `
      : '';

    // ساخت استایل CSS برای کنسول
    const style = `background: ${colors.bg}; color: ${colors.text}; padding: 4px 8px; border-radius: 4px; font-weight: bold;`;

    // ساخت پیام
    const prefix = `${colors.icon} ${timeStr}[${module}] ${message}`;

    // انتخاب متد console مناسب
    const consoleMethod =
      level === 'DEBUG'
        ? 'log'
        : level === 'INFO'
        ? 'info'
        : level === 'WARN'
        ? 'warn'
        : 'error';

    // نمایش لاگ
    if (data !== null && data !== undefined) {
      console[consoleMethod](`%c${prefix}`, style, data);
    } else {
      console[consoleMethod](`%c${prefix}`, style);
    }

    // اگر Error object است، stack trace را هم نمایش بده
    if (data instanceof Error && data.stack) {
      console.error(data.stack);
    }
  }

  /**
   * ذخیره لاگ در حافظه و localStorage
   */
  private _storeLog(logEntry: LogEntry): void {
    this._storedLogs.push(logEntry);

    // محدود کردن تعداد لاگ‌ها
    if (this._storedLogs.length > this.config.maxStoredLogs) {
      this._storedLogs = this._storedLogs.slice(-this.config.maxStoredLogs);
    }

    // ذخیره در localStorage اگر فعال باشد
    if (this.config.persistToStorage) {
      try {
        localStorage.setItem('daneshyar_logs', JSON.stringify(this._storedLogs));
      } catch {
        // اگر localStorage پر شد، غیرفعال کن
        this.config.persistToStorage = false;
        console.warn('Logger: localStorage پر شد، ذخیره‌سازی غیرفعال شد');
      }
    }
  }

  /**
   * بارگذاری لاگ‌های ذخیره شده از localStorage
   */
  private _loadStoredLogs(): void {
    if (!this.config.persistToStorage) return;

    try {
      const stored = localStorage.getItem('daneshyar_logs');
      if (stored) {
        this._storedLogs = JSON.parse(stored);
      }
    } catch {
      this._storedLogs = [];
    }
  }
}

// ============================================================
// پیاده‌سازی Singleton Pattern
// ============================================================

let loggerInstance: Logger | null = null;

/**
 * دریافت نمونه singleton از Logger
 *
 * @example
 * // اولین بار با تنظیمات
 * const logger = getInstance({ level: 'INFO' });
 *
 * // دفعات بعدی بدون تنظیمات
 * const logger2 = getInstance();
 * // logger === logger2 (همان نمونه)
 */
export function getInstance(options: LoggerOptions = {}): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger(options);
  }
  return loggerInstance;
}

/**
 * ریست کردن نمونه singleton (فقط برای تست)
 */
export function resetInstance(): void {
  loggerInstance = null;
}

/**
 * Export پیش‌فرض برای استفاده ساده
 */
export default {
  getInstance,
  resetInstance,
  LOG_LEVELS,
};