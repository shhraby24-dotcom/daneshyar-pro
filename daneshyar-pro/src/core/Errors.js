/**
 * ============================================================
 * دانش‌یار پرو - سیستم مدیریت خطا متمرکز
 * ============================================================
 * 
 * این ماژول یک سیستم کامل برای مدیریت خطاها ارائه می‌دهد که شامل:
 * 
 * ✅ کلاس پایه AppError
 * ✅ کلاس‌های خطای اختصاصی برای هر نوع خطا
 * ✅ ErrorHandler مرکزی با یکپارچگی با Logger و EventBus
 * ✅ سیستم نمایش خطا به کاربر (Toast)
 * ✅ قابلیت retry خودکار
 * ✅ Error boundaries برای React-like components
 * ✅ Error categorization (user, system, network, ...)
 * ✅ Stack trace در حالت توسعه
 * 
 * @module core/Errors
 * @version 1.0.0
 */

import LoggerModule from './Logger.js';
import EventBusModule, { EVENTS } from './EventBus.js';

// دریافت نمونه‌های singleton
const logger = LoggerModule.getInstance().module('Errors');
const eventBus = EventBusModule.getInstance();

// ============================================================
// ثابت‌های خطا
// ============================================================

/**
 * کدهای خطا - هر خطا یک کد یکتا دارد که می‌توان از آن
 * برای نمایش پیام مناسب به کاربر استفاده کرد
 */
export const ERROR_CODES = {
  // خطاهای عمومی (1xxx)
  UNKNOWN: 'ERR_1000',
  INTERNAL: 'ERR_1001',
  TIMEOUT: 'ERR_1002',
  CANCELLED: 'ERR_1003',
  
  // خطاهای اعتبارسنجی (2xxx)
  VALIDATION: 'ERR_2000',
  REQUIRED_FIELD: 'ERR_2001',
  INVALID_FORMAT: 'ERR_2002',
  OUT_OF_RANGE: 'ERR_2003',
  DUPLICATE: 'ERR_2004',
  
  // خطاهای ذخیره‌سازی (3xxx)
  STORAGE: 'ERR_3000',
  STORAGE_FULL: 'ERR_3001',
  STORAGE_CORRUPT: 'ERR_3002',
  STORAGE_NOT_FOUND: 'ERR_3003',
  STORAGE_PERMISSION: 'ERR_3004',
  
  // خطاهای شبکه (4xxx)
  NETWORK: 'ERR_4000',
  NETWORK_OFFLINE: 'ERR_4001',
  NETWORK_TIMEOUT: 'ERR_4002',
  NETWORK_SERVER: 'ERR_4003',
  
  // خطاهای دسترسی (5xxx)
  PERMISSION: 'ERR_5000',
  MICROPHONE: 'ERR_5001',
  CAMERA: 'ERR_5002',
  FILE_ACCESS: 'ERR_5003',
  
  // خطاهای داده (6xxx)
  NOT_FOUND: 'ERR_6000',
  ALREADY_EXISTS: 'ERR_6001',
  INVALID_STATE: 'ERR_6002',
  
  // خطاهای AI (7xxx)
  AI_SERVICE: 'ERR_7000',
  AI_RATE_LIMIT: 'ERR_7001',
  AI_INVALID_RESPONSE: 'ERR_7002'
};

/**
 * دسته‌بندی خطاها - برای گزارش‌گیری و تحلیل
 */
export const ERROR_CATEGORIES = {
  USER: 'user',           // خطای کاربر (مثلاً ورودی نامعتبر)
  SYSTEM: 'system',       // خطای سیستم (باگ یا مشکل داخلی)
  NETWORK: 'network',     // خطای شبکه
  STORAGE: 'storage',     // خطای ذخیره‌سازی
  PERMISSION: 'permission', // خطای دسترسی
  EXTERNAL: 'external',   // خطای سرویس خارجی
  UNKNOWN: 'unknown'      // نامشخص
};

/**
 * سطوح شدت خطا
 */
export const ERROR_SEVERITY = {
  LOW: 'low',         // خطای کوچک، قابل بازیابی
  MEDIUM: 'medium',   // خطای متوسط، نیاز به توجه
  HIGH: 'high',       // خطای مهم، ممکن است عملیات متوقف شود
  CRITICAL: 'critical' // خطای بحرانی، برنامه ممکن است متوقف شود
};

// ============================================================
// کلاس پایه AppError
// ============================================================

/**
 * کلاس پایه برای همه خطاهای برنامه
 * 
 * @extends Error
 */
export class AppError extends Error {
  /**
   * سازنده AppError
   * 
   * @param {string} message - پیام خطا
   * @param {Object} [options] - تنظیمات اضافی
   * @param {string} [options.code] - کد خطا
   * @param {string} [options.category] - دسته‌بندی خطا
   * @param {string} [options.severity] - شدت خطا
   * @param {Object} [options.context] - اطلاعات زمینه
   * @param {Error} [options.cause] - خطای اصلی (cause)
   * @param {boolean} [options.userFriendly] - آیا پیام برای کاربر مناسب است؟
   * @param {string} [options.userMessage] - پیام مخصوص کاربر
   * @param {boolean} [options.retryable] - آیا قابل retry است؟
   * @param {number} [options.retryCount] - تعداد دفعات retry
   */
  constructor(message, options = {}) {
    super(message);
    
    // تنظیم نام کلاس برای stack trace
    this.name = this.constructor.name;
    
    // کد خطا
    this.code = options.code || ERROR_CODES.UNKNOWN;
    
    // دسته‌بندی
    this.category = options.category || ERROR_CATEGORIES.UNKNOWN;
    
    // شدت
    this.severity = options.severity || ERROR_SEVERITY.MEDIUM;
    
    // اطلاعات زمینه
    this.context = options.context || {};
    
    // خطای اصلی (cause chain)
    this.cause = options.cause || null;
    
    // آیا پیام برای کاربر مناسب است؟
    this.userFriendly = options.userFriendly !== false;
    
    // پیام مخصوص کاربر (اگر با message فرق دارد)
    this.userMessage = options.userMessage || null;
    
    // آیا قابل retry است؟
    this.retryable = options.retryable || false;
    
    // تعداد دفعات retry
    this.retryCount = options.retryCount || 0;
    
    // timestamp
    this.timestamp = new Date().toISOString();
    
    // stack trace را capture می‌کنیم
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * تبدیل خطا به JSON
   * 
   * @returns {Object}
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      context: this.context,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message
      } : null,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  /**
   * دریافت پیام مناسب برای کاربر
   * 
   * @returns {string}
   */
  getUserMessage() {
    if (this.userMessage) return this.userMessage;
    if (this.userFriendly) return this.message;
    return 'یک خطای غیرمنتظره رخ داد. لطفاً دوباره تلاش کنید.';
  }

  /**
   * دریافت cause chain (زنجیره علت‌ها)
   * 
   * @returns {Array<Error>}
   */
  getCauseChain() {
    const chain = [this];
    let current = this.cause;
    while (current) {
      chain.push(current);
      current = current.cause;
    }
    return chain;
  }

  /**
   * آیا این خطا از نوع خاصی است؟
   * 
   * @param {string} codeOrCategory - کد یا دسته‌بندی
   * @returns {boolean}
   */
  is(codeOrCategory) {
    return this.code === codeOrCategory || this.category === codeOrCategory;
  }
}

// ============================================================
// کلاس‌های خطای اختصاصی
// ============================================================

/**
 * خطای اعتبارسنجی
 * وقتی داده‌های ورودی کاربر نامعتبر هستند
 */
export class ValidationError extends AppError {
  /**
   * @param {string} message - پیام خطا
   * @param {Object} [options] - تنظیمات اضافی
   * @param {Object} [options.fields] - فیلدهای نامعتبر
   */
  constructor(message, options = {}) {
    super(message, {
      code: ERROR_CODES.VALIDATION,
      category: ERROR_CATEGORIES.USER,
      severity: ERROR_SEVERITY.LOW,
      userFriendly: true,
      ...options
    });
    
    // فیلدهای نامعتبر
    this.fields = options.fields || {};
  }
}

/**
 * خطای ذخیره‌سازی
 * وقتی مشکل در خواندن/نوشتن localStorage یا IndexedDB
 */
export class StorageError extends AppError {
  /**
   * @param {string} message - پیام خطا
   * @param {Object} [options] - تنظیمات اضافی
   * @param {string} [options.operation] - نوع عملیات (read, write, delete)
   * @param {string} [options.key] - کلید ذخیره‌سازی
   */
  constructor(message, options = {}) {
    super(message, {
      code: ERROR_CODES.STORAGE,
      category: ERROR_CATEGORIES.STORAGE,
      severity: ERROR_SEVERITY.HIGH,
      retryable: true,
      ...options
    });
    
    this.operation = options.operation || 'unknown';
    this.key = options.key || null;
  }
}

/**
 * خطای شبکه
 * وقتی مشکل در ارتباط با سرور یا اینترنت
 */
export class NetworkError extends AppError {
  /**
   * @param {string} message - پیام خطا
   * @param {Object} [options] - تنظیمات اضافی
   * @param {number} [options.status] - کد وضعیت HTTP
   * @param {string} [options.url] - URL درخواست
   */
  constructor(message, options = {}) {
    super(message, {
      code: ERROR_CODES.NETWORK,
      category: ERROR_CATEGORIES.NETWORK,
      severity: ERROR_SEVERITY.MEDIUM,
      retryable: true,
      userMessage: 'اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.',
      ...options
    });
    
    this.status = options.status || null;
    this.url = options.url || null;
  }
}

/**
 * خطای NotFound
 * وقتی چیزی پیدا نشد
 */
export class NotFoundError extends AppError {
  /**
   * @param {string} message - پیام خطا
   * @param {Object} [options] - تنظیمات اضافی
   * @param {string} [options.entity] - نوع موجودیت
   * @param {string} [options.id] - شناسه
   */
  constructor(message, options = {}) {
    super(message, {
      code: ERROR_CODES.NOT_FOUND,
      category: ERROR_CATEGORIES.USER,
      severity: ERROR_SEVERITY.LOW,
      ...options
    });
    
    this.entity = options.entity || 'item';
    this.id = options.id || null;
  }
}

/**
 * خطای دسترسی
 * وقتی کاربر دسترسی لازم را ندارد
 */
export class PermissionError extends AppError {
  /**
   * @param {string} message - پیام خطا
   * @param {Object} [options] - تنظیمات اضافی
   * @param {string} [options.permission] - نوع دسترسی
   */
  constructor(message, options = {}) {
    super(message, {
      code: ERROR_CODES.PERMISSION,
      category: ERROR_CATEGORIES.PERMISSION,
      severity: ERROR_SEVERITY.MEDIUM,
      userFriendly: true,
      ...options
    });
    
    this.permission = options.permission || null;
  }
}

/**
 * خطای Timeout
 * وقتی یک عملیات بیش از حد طول کشیده
 */
export class TimeoutError extends AppError {
  /**
   * @param {string} message - پیام خطا
   * @param {Object} [options] - تنظیمات اضافی
   * @param {number} [options.timeoutMs] - مدت timeout به میلی‌ثانیه
   */
  constructor(message, options = {}) {
    super(message, {
      code: ERROR_CODES.TIMEOUT,
      category: ERROR_CATEGORIES.SYSTEM,
      severity: ERROR_SEVERITY.MEDIUM,
      retryable: true,
      ...options
    });
    
    this.timeoutMs = options.timeoutMs || null;
  }
}

/**
 * خطای AI Service
 * وقتی سرویس هوش مصنوعی مشکل دارد
 */
export class AIServiceError extends AppError {
  /**
   * @param {string} message - پیام خطا
   * @param {Object} [options] - تنظیمات اضافی
   * @param {string} [options.provider] - نام ارائه‌دهنده سرویس
   */
  constructor(message, options = {}) {
    super(message, {
      code: ERROR_CODES.AI_SERVICE,
      category: ERROR_CATEGORIES.EXTERNAL,
      severity: ERROR_SEVERITY.MEDIUM,
      retryable: true,
      userMessage: 'سرویس هوش مصنوعی موقتاً در دسترس نیست. لطفاً دوباره تلاش کنید.',
      ...options
    });
    
    this.provider = options.provider || null;
  }
}

// ============================================================
// ErrorHandler مرکزی
// ============================================================

/**
 * کلاس ErrorHandler مرکزی
 * این کلاس مسئول مدیریت همه خطاهای برنامه است
 */
class ErrorHandler {
  constructor() {
    // آیا در حالت توسعه هستیم؟
    this.isDev = true;
    
    // آیا خطاها به کاربر نمایش داده شوند؟
    this.showToUser = true;
    
    // آرایه listener های خطا
    this._errorListeners = [];
    
    // آمار خطاها
    this._stats = {
      total: 0,
      byCategory: {},
      bySeverity: {},
      lastError: null
    };

    // ثبت handler برای خطاهای catch نشده
    this._setupGlobalHandlers();

    logger.debug('ErrorHandler initialized');
  }

  /**
   * تنظیم handler های سراسری
   * @private
   */
  _setupGlobalHandlers() {
    // خطاهای catch نشده در promise
    window.addEventListener('unhandledrejection', (event) => {
      this.handle(event.reason, { source: 'unhandledrejection' });
      event.preventDefault();
    });

    // خطاهای catch نشده در کد
    window.addEventListener('error', (event) => {
      this.handle(event.error || new Error(event.message), {
        source: 'window.error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
  }

  /**
   * مدیریت یک خطا
   * این متد اصلی است که باید برای همه خطاها فراخوانی شود
   * 
   * @param {Error|AppError} error - خطای رخ داده
   * @param {Object} [context] - اطلاعات زمینه اضافی
   */
  handle(error, context = {}) {
    // تبدیل خطاهای معمولی به AppError
    const appError = this._normalize(error, context);
    
    // به‌روزرسانی آمار
    this._updateStats(appError);
    
    // لاگ کردن
    this._log(appError);
    
    // انتشار رویداد
    this._emit(appError);
    
    // نمایش به کاربر
    if (this.showToUser) {
      this._showToUser(appError);
    }
    
    // فراخوانی listener های سفارشی
    this._notifyListeners(appError);
    
    return appError;
  }

  /**
   * تبدیل خطاهای معمولی به AppError
   * @private
   */
  _normalize(error, context) {
    if (error instanceof AppError) {
      // اگر قبلاً AppError است، فقط context را اضافه کن
      if (Object.keys(context).length > 0) {
        error.context = { ...error.context, ...context };
      }
      return error;
    }
    
    if (error instanceof Error) {
      // تبدیل Error معمولی به AppError
      return new AppError(error.message, {
        category: ERROR_CATEGORIES.SYSTEM,
        severity: ERROR_SEVERITY.MEDIUM,
        cause: error,
        context
      });
    }
    
    // اگر اصلاً Error نبود
    return new AppError(String(error), {
      category: ERROR_CATEGORIES.UNKNOWN,
      severity: ERROR_SEVERITY.MEDIUM,
      context
    });
  }

  /**
   * به‌روزرسانی آمار خطاها
   * @private
   */
  _updateStats(error) {
    this._stats.total++;
    
    // آمار دسته‌بندی
    if (!this._stats.byCategory[error.category]) {
      this._stats.byCategory[error.category] = 0;
    }
    this._stats.byCategory[error.category]++;
    
    // آمار شدت
    if (!this._stats.bySeverity[error.severity]) {
      this._stats.bySeverity[error.severity] = 0;
    }
    this._stats.bySeverity[error.severity]++;
    
    this._stats.lastError = {
      code: error.code,
      message: error.message,
      timestamp: error.timestamp
    };
  }

  /**
   * لاگ کردن خطا
   * @private
   */
  _log(error) {
    const logData = {
      code: error.code,
      category: error.category,
      severity: error.severity,
      context: error.context,
      cause: error.cause ? {
        name: error.cause.name,
        message: error.cause.message
      } : null
    };
    
    // انتخاب سطح لاگ بر اساس شدت
    switch (error.severity) {
      case ERROR_SEVERITY.CRITICAL:
        logger.fatal(error.message, logData);
        break;
      case ERROR_SEVERITY.HIGH:
        logger.error(error.message, logData);
        break;
      case ERROR_SEVERITY.MEDIUM:
        logger.warn(error.message, logData);
        break;
      case ERROR_SEVERITY.LOW:
        logger.info(error.message, logData);
        break;
    }
  }

  /**
   * انتشار رویداد خطا
   * @private
   */
  _emit(error) {
    eventBus.emit('error:occurred', {
      error: error,
      code: error.code,
      category: error.category,
      severity: error.severity,
      userMessage: error.getUserMessage()
    });
  }

  /**
   * نمایش خطا به کاربر
   * @private
   */
  _showToUser(error) {
    const userMessage = error.getUserMessage();
    
    // نگاشت شدت به نوع Toast
    const severityToToastType = {
      [ERROR_SEVERITY.LOW]: 'info',
      [ERROR_SEVERITY.MEDIUM]: 'warning',
      [ERROR_SEVERITY.HIGH]: 'error',
      [ERROR_SEVERITY.CRITICAL]: 'error'
    };
    
    const toastType = severityToToastType[error.severity] || 'error';
    
    // انتشار رویداد Toast
    eventBus.emit(EVENTS.UI_TOAST, {
      type: toastType,
      title: 'خطا',
      message: userMessage,
      duration: error.severity === ERROR_SEVERITY.CRITICAL ? 10000 : 5000,
      dismissible: true
    });
  }

  /**
   * اطلاع به listener های سفارشی
   * @private
   */
  _notifyListeners(error) {
    for (const listener of this._errorListeners) {
      try {
        listener(error);
      } catch (e) {
        // اگر خود listener خطا داد، فقط لاگ کن
        logger.error('خطا در error listener', { listenerError: e });
      }
    }
  }

  /**
   * ثبت یک listener سفارشی برای خطاها
   * 
   * @param {Function} listener - تابع listener
   * @returns {Function} تابع unsubscribe
   */
  onError(listener) {
    this._errorListeners.push(listener);
    
    // برگرداندن تابع unsubscribe
    return () => {
      const index = this._errorListeners.indexOf(listener);
      if (index > -1) {
        this._errorListeners.splice(index, 1);
      }
    };
  }

  /**
   * اجرای یک تابع با مدیریت خودکار خطا
   * 
   * @param {Function} fn - تابع برای اجرا
   * @param {Object} [options] - تنظیمات
   * @param {number} [options.retryCount] - تعداد retry در صورت خطا
   * @param {number} [options.retryDelay] - تاخیر بین retry ها
   * @param {string} [options.operationName] - نام عملیات برای لاگ
   * @returns {Promise<*>}
   * 
   * @example
   * const result = await errorHandler.execute(
   *   async () => {
   *     return await someRiskyOperation();
   *   },
   *   { retryCount: 3, retryDelay: 1000, operationName: 'ذخیره یادداشت' }
   * );
   */
  async execute(fn, options = {}) {
    const {
      retryCount = 0,
      retryDelay = 1000,
      operationName = 'operation'
    } = options;
    
    let lastError = null;
    
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const result = await fn();
        
        if (attempt > 0) {
          logger.info(`عملیات پس از ${attempt} تلاش موفق شد`, {
            operation: operationName
          });
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt < retryCount) {
          logger.warn(`تلاش ${attempt + 1} ناموفق، retry در ${retryDelay}ms`, {
            operation: operationName,
            error: error.message
          });
          
          // تاخیر قبل از retry
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    // همه تلاش‌ها شکست خوردند
    this.handle(lastError, {
      operation: operationName,
      attempts: retryCount + 1
    });
    
    throw lastError;
  }

  /**
   * اجرای همزمان (sync) با مدیریت خطا
   * 
   * @param {Function} fn - تابع برای اجرا
   * @param {*} [fallback] - مقدار بازگشتی در صورت خطا
   * @param {Object} [context] - اطلاعات زمینه
   * @returns {*}
   */
  executeSync(fn, fallback = null, context = {}) {
    try {
      return fn();
    } catch (error) {
      this.handle(error, context);
      return fallback;
    }
  }

  /**
   * دریافت آمار خطاها
   * 
   * @returns {Object}
   */
  getStats() {
    return { ...this._stats };
  }

  /**
   * ریست کردن آمار
   */
  resetStats() {
    this._stats = {
      total: 0,
      byCategory: {},
      bySeverity: {},
      lastError: null
    };
    logger.info('آمار خطاها ریست شد');
  }

  /**
   * فعال/غیرفعال کردن نمایش خطا به کاربر
   * 
   * @param {boolean} show
   */
  setShowToUser(show) {
    this.showToUser = show;
  }

  /**
   * تنظیم حالت توسعه
   * 
   * @param {boolean} isDev
   */
  setDevMode(isDev) {
    this.isDev = isDev;
  }
}

// ============================================================
// توابع کمکی (Helper Functions)
// ============================================================

/**
 * ایجاد یک خطای ValidationError با بررسی چندین فیلد
 * 
 * @param {Object} errors - آبجکت خطاها { fieldName: errorMessage }
 * @returns {ValidationError}
 * 
 * @example
 * const error = createValidationError({
 *   title: 'عنوان نمی‌تواند خالی باشد',
 *   content: 'محتوا باید حداقل ۱۰ کاراکتر باشد'
 * });
 */
export function createValidationError(errors) {
  const messages = Object.values(errors);
  const firstMessage = messages[0] || 'خطا در اعتبارسنجی';
  
  return new ValidationError(firstMessage, {
    fields: errors,
    userMessage: messages.join('\n')
  });
}

/**
 * wrapper برای توابع async که خطاها را خودکار مدیریت می‌کند
 * 
 * @param {Function} asyncFn - تابع async
 * @param {Object} [options] - تنظیمات
 * @returns {Function}
 * 
 * @example
 * const safeSaveNote = withErrorHandling(saveNote, {
 *   operationName: 'ذخیره یادداشت'
 * });
 * 
 * const result = await safeSaveNote(noteData);
 */
export function withErrorHandling(asyncFn, options = {}) {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      errorHandler.handle(error, {
        operation: options.operationName || asyncFn.name,
        args: args
      });
      throw error;
    }
  };
}

// ============================================================
// Singleton
// ============================================================

let errorHandlerInstance = null;

/**
 * دریافت نمونه singleton از ErrorHandler
 * 
 * @returns {ErrorHandler}
 */
export function getErrorHandler() {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new ErrorHandler();
  }
  return errorHandlerInstance;
}

// نمونه پیش‌فرض export می‌شود
const errorHandler = getErrorHandler();
export default errorHandler;