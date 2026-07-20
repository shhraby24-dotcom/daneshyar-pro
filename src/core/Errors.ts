/**
 * ============================================================
 * دانش‌یار پرو - سیستم مدیریت خطا متمرکز
 * ============================================================
 *
 * ✅ کلاس پایه AppError با cause chain
 * ✅ ۷ کلاس خطای اختصاصی
 * ✅ ErrorHandler مرکزی با retry خودکار
 * ✅ Error categorization و severity levels
 * ✅ Global handlers (unhandledrejection, window.error)
 * ✅ Toast integration با EventBus
 * ✅ Helper functions
 *
 * @module core/Errors
 * @version 1.0.0-beta.1
 */

import { getInstance as getLogger } from '@/core/Logger';
import { getInstance as getEventBus, EVENTS } from '@/core/EventBus';

const logger = getLogger().module('Errors');
const eventBus = getEventBus();

// ============================================================
// Types و Interfaces
// ============================================================

/**
 * کدهای خطا
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
  AI_INVALID_RESPONSE: 'ERR_7002',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * دسته‌بندی خطاها
 */
export const ERROR_CATEGORIES = {
  USER: 'user',
  SYSTEM: 'system',
  NETWORK: 'network',
  STORAGE: 'storage',
  PERMISSION: 'permission',
  EXTERNAL: 'external',
  UNKNOWN: 'unknown',
} as const;

export type ErrorCategory = (typeof ERROR_CATEGORIES)[keyof typeof ERROR_CATEGORIES];

/**
 * سطوح شدت خطا
 */
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type ErrorSeverity = (typeof ERROR_SEVERITY)[keyof typeof ERROR_SEVERITY];

/**
 * تنظیمات AppError
 */
export interface AppErrorOptions {
  code?: ErrorCode | string;
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  context?: Record<string, unknown>;
  cause?: Error | null;
  userFriendly?: boolean;
  userMessage?: string | null;
  retryable?: boolean;
  retryCount?: number;
}

/**
 * تنظیمات ValidationError
 */
export interface ValidationErrorOptions extends AppErrorOptions {
  fields?: Record<string, string>;
}

/**
 * تنظیمات StorageError
 */
export interface StorageErrorOptions extends AppErrorOptions {
  operation?: string;
  key?: string | null;
}

/**
 * تنظیمات NetworkError
 */
export interface NetworkErrorOptions extends AppErrorOptions {
  status?: number | null;
  url?: string | null;
}

/**
 * تنظیمات NotFoundError
 */
export interface NotFoundErrorOptions extends AppErrorOptions {
  entity?: string;
  id?: string | null;
}

/**
 * تنظیمات PermissionError
 */
export interface PermissionErrorOptions extends AppErrorOptions {
  permission?: string | null;
}

/**
 * تنظیمات TimeoutError
 */
export interface TimeoutErrorOptions extends AppErrorOptions {
  timeoutMs?: number | null;
}

/**
 * تنظیمات AIServiceError
 */
export interface AIServiceErrorOptions extends AppErrorOptions {
  provider?: string | null;
}

/**
 * تنظیمات ErrorHandler.execute
 */
export interface ExecuteOptions {
  retryCount?: number;
  retryDelay?: number;
  operationName?: string;
}

/**
 * آمار خطاها
 */
export interface ErrorStats {
  total: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  lastError: {
    code: string;
    message: string;
    timestamp: string;
  } | null;
}

/**
 * Error listener callback
 */
export type ErrorListener = (error: AppError) => void;

// ============================================================
// کلاس پایه AppError
// ============================================================

/**
 * کلاس پایه برای همه خطاهای برنامه
 */
export class AppError extends Error {
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: Record<string, unknown>;
  cause: Error | null;
  userFriendly: boolean;
  userMessage: string | null;
  retryable: boolean;
  retryCount: number;
  timestamp: string;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);

    this.name = this.constructor.name;
    this.code = options.code ?? ERROR_CODES.UNKNOWN;
    this.category = options.category ?? ERROR_CATEGORIES.UNKNOWN;
    this.severity = options.severity ?? ERROR_SEVERITY.MEDIUM;
    this.context = options.context ?? {};
    this.cause = options.cause ?? null;
    this.userFriendly = options.userFriendly !== false;
    this.userMessage = options.userMessage ?? null;
    this.retryable = options.retryable ?? false;
    this.retryCount = options.retryCount ?? 0;
    this.timestamp = new Date().toISOString();

    // stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * تبدیل خطا به JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      context: this.context,
      cause: this.cause
        ? { name: this.cause.name, message: this.cause.message }
        : null,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }

  /**
   * دریافت پیام مناسب برای کاربر
   */
  getUserMessage(): string {
    if (this.userMessage) return this.userMessage;
    if (this.userFriendly) return this.message;
    return 'یک خطای غیرمنتظره رخ داد. لطفاً دوباره تلاش کنید.';
  }

  /**
   * دریافت cause chain
   */
  getCauseChain(): Error[] {
    const chain: Error[] = [this];
    let current: Error | null = this.cause;
    while (current) {
      chain.push(current);
      current = (current as AppError).cause ?? null;
    }
    return chain;
  }

  /**
   * آیا این خطا از نوع خاصی است؟
   */
  is(codeOrCategory: string): boolean {
    return this.code === codeOrCategory || this.category === codeOrCategory;
  }
}

// ============================================================
// کلاس‌های خطای اختصاصی
// ============================================================

/**
 * خطای اعتبارسنجی
 */
export class ValidationError extends AppError {
  fields: Record<string, string>;

  constructor(message: string, options: ValidationErrorOptions = {}) {
    super(message, {
      code: ERROR_CODES.VALIDATION,
      category: ERROR_CATEGORIES.USER,
      severity: ERROR_SEVERITY.LOW,
      userFriendly: true,
      ...options,
    });
    this.fields = options.fields ?? {};
  }
}

/**
 * خطای ذخیره‌سازی
 */
export class StorageError extends AppError {
  operation: string;
  key: string | null;

  constructor(message: string, options: StorageErrorOptions = {}) {
    super(message, {
      code: ERROR_CODES.STORAGE,
      category: ERROR_CATEGORIES.STORAGE,
      severity: ERROR_SEVERITY.HIGH,
      retryable: true,
      ...options,
    });
    this.operation = options.operation ?? 'unknown';
    this.key = options.key ?? null;
  }
}

/**
 * خطای شبکه
 */
export class NetworkError extends AppError {
  status: number | null;
  url: string | null;

  constructor(message: string, options: NetworkErrorOptions = {}) {
    super(message, {
      code: ERROR_CODES.NETWORK,
      category: ERROR_CATEGORIES.NETWORK,
      severity: ERROR_SEVERITY.MEDIUM,
      retryable: true,
      userMessage: 'اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.',
      ...options,
    });
    this.status = options.status ?? null;
    this.url = options.url ?? null;
  }
}

/**
 * خطای NotFound
 */
export class NotFoundError extends AppError {
  entity: string;
  id: string | null;

  constructor(message: string, options: NotFoundErrorOptions = {}) {
    super(message, {
      code: ERROR_CODES.NOT_FOUND,
      category: ERROR_CATEGORIES.USER,
      severity: ERROR_SEVERITY.LOW,
      ...options,
    });
    this.entity = options.entity ?? 'item';
    this.id = options.id ?? null;
  }
}

/**
 * خطای دسترسی
 */
export class PermissionError extends AppError {
  permission: string | null;

  constructor(message: string, options: PermissionErrorOptions = {}) {
    super(message, {
      code: ERROR_CODES.PERMISSION,
      category: ERROR_CATEGORIES.PERMISSION,
      severity: ERROR_SEVERITY.MEDIUM,
      userFriendly: true,
      ...options,
    });
    this.permission = options.permission ?? null;
  }
}

/**
 * خطای Timeout
 */
export class TimeoutError extends AppError {
  timeoutMs: number | null;

  constructor(message: string, options: TimeoutErrorOptions = {}) {
    super(message, {
      code: ERROR_CODES.TIMEOUT,
      category: ERROR_CATEGORIES.SYSTEM,
      severity: ERROR_SEVERITY.MEDIUM,
      retryable: true,
      ...options,
    });
    this.timeoutMs = options.timeoutMs ?? null;
  }
}

/**
 * خطای AI Service
 */
export class AIServiceError extends AppError {
  provider: string | null;

  constructor(message: string, options: AIServiceErrorOptions = {}) {
    super(message, {
      code: ERROR_CODES.AI_SERVICE,
      category: ERROR_CATEGORIES.EXTERNAL,
      severity: ERROR_SEVERITY.MEDIUM,
      retryable: true,
      userMessage:
        'سرویس هوش مصنوعی موقتاً در دسترس نیست. لطفاً دوباره تلاش کنید.',
      ...options,
    });
    this.provider = options.provider ?? null;
  }
}

// ============================================================
// ErrorHandler مرکزی
// ============================================================

/**
 * کلاس ErrorHandler مرکزی
 */
export class ErrorHandler {
  private isDev: boolean = true;
  private showToUser: boolean = true;
  private _errorListeners: ErrorListener[] = [];
  private _stats: ErrorStats = {
    total: 0,
    byCategory: {},
    bySeverity: {},
    lastError: null,
  };

  constructor() {
    this._setupGlobalHandlers();
    logger.debug('ErrorHandler initialized');
  }

  /**
   * تنظیم handler های سراسری
   */
  private _setupGlobalHandlers(): void {
    // خطاهای catch نشده در promise
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      this.handle(event.reason, { source: 'unhandledrejection' });
      event.preventDefault();
    });

    // خطاهای catch نشده در کد
    window.addEventListener('error', (event: ErrorEvent) => {
      this.handle(event.error || new Error(event.message), {
        source: 'window.error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });
  }

  /**
   * مدیریت یک خطا
   */
  handle(error: unknown, context: Record<string, unknown> = {}): AppError {
    const appError = this._normalize(error, context);

    this._updateStats(appError);
    this._log(appError);
    this._emit(appError);

    if (this.showToUser) {
      this._showToUser(appError);
    }

    this._notifyListeners(appError);

    return appError;
  }

  /**
   * تبدیل خطاهای معمولی به AppError
   */
  private _normalize(error: unknown, context: Record<string, unknown>): AppError {
    if (error instanceof AppError) {
      if (Object.keys(context).length > 0) {
        error.context = { ...error.context, ...context };
      }
      return error;
    }

    if (error instanceof Error) {
      return new AppError(error.message, {
        category: ERROR_CATEGORIES.SYSTEM,
        severity: ERROR_SEVERITY.MEDIUM,
        cause: error,
        context,
      });
    }

    return new AppError(String(error), {
      category: ERROR_CATEGORIES.UNKNOWN,
      severity: ERROR_SEVERITY.MEDIUM,
      context,
    });
  }

  /**
   * به‌روزرسانی آمار خطاها
   */
  private _updateStats(error: AppError): void {
    this._stats.total++;

    if (!this._stats.byCategory[error.category]) {
      this._stats.byCategory[error.category] = 0;
    }
    this._stats.byCategory[error.category]++;

    if (!this._stats.bySeverity[error.severity]) {
      this._stats.bySeverity[error.severity] = 0;
    }
    this._stats.bySeverity[error.severity]++;

    this._stats.lastError = {
      code: error.code,
      message: error.message,
      timestamp: error.timestamp,
    };
  }

  /**
   * لاگ کردن خطا
   */
  private _log(error: AppError): void {
    const logData = {
      code: error.code,
      category: error.category,
      severity: error.severity,
      context: error.context,
      cause: error.cause
        ? { name: error.cause.name, message: error.cause.message }
        : null,
    };

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
   */
  private _emit(error: AppError): void {
    eventBus.emit('error:occurred', {
      error,
      code: error.code,
      category: error.category,
      severity: error.severity,
      userMessage: error.getUserMessage(),
    });
  }

  /**
   * نمایش خطا به کاربر
   */
  private _showToUser(error: AppError): void {
    const userMessage = error.getUserMessage();

    const severityToToastType: Record<string, string> = {
      [ERROR_SEVERITY.LOW]: 'info',
      [ERROR_SEVERITY.MEDIUM]: 'warning',
      [ERROR_SEVERITY.HIGH]: 'error',
      [ERROR_SEVERITY.CRITICAL]: 'error',
    };

    const toastType = severityToToastType[error.severity] ?? 'error';

    eventBus.emit(EVENTS.UI_TOAST, {
      type: toastType,
      title: 'خطا',
      message: userMessage,
      duration: error.severity === ERROR_SEVERITY.CRITICAL ? 10000 : 5000,
      dismissible: true,
    });
  }

  /**
   * اطلاع به listener های سفارشی
   */
  private _notifyListeners(error: AppError): void {
    for (const listener of this._errorListeners) {
      try {
        listener(error);
      } catch (e) {
        logger.error('خطا در error listener', { listenerError: e });
      }
    }
  }

  /**
   * ثبت یک listener سفارشی برای خطاها
   */
  onError(listener: ErrorListener): () => void {
    this._errorListeners.push(listener);

    return () => {
      const index = this._errorListeners.indexOf(listener);
      if (index > -1) {
        this._errorListeners.splice(index, 1);
      }
    };
  }

  /**
   * اجرای یک تابع با مدیریت خودکار خطا و retry
   */
  async execute<T>(
    fn: () => Promise<T>,
    options: ExecuteOptions = {}
  ): Promise<T> {
    const {
      retryCount = 0,
      retryDelay = 1000,
      operationName = 'operation',
    } = options;

    let lastError: unknown = null;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const result = await fn();
        if (attempt > 0) {
          logger.info(`عملیات پس از ${attempt} تلاش موفق شد`, {
            operation: operationName,
          });
        }
        return result;
      } catch (error) {
        lastError = error;
        if (attempt < retryCount) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.warn(
            `تلاش ${attempt + 1} ناموفق، retry در ${retryDelay}ms`,
            {
              operation: operationName,
              error: errorMessage,
            }
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    this.handle(lastError, {
      operation: operationName,
      attempts: retryCount + 1,
    });

    throw lastError;
  }

  /**
   * اجرای همزمان (sync) با مدیریت خطا
   */
  executeSync<T>(
    fn: () => T,
    fallback: T | null = null,
    context: Record<string, unknown> = {}
  ): T | null {
    try {
      return fn();
    } catch (error) {
      this.handle(error, context);
      return fallback;
    }
  }

  /**
   * دریافت آمار خطاها
   */
  getStats(): ErrorStats {
    return { ...this._stats };
  }

  /**
   * ریست کردن آمار
   */
  resetStats(): void {
    this._stats = {
      total: 0,
      byCategory: {},
      bySeverity: {},
      lastError: null,
    };
    logger.info('آمار خطاها ریست شد');
  }

  /**
   * فعال/غیرفعال کردن نمایش خطا به کاربر
   */
  setShowToUser(show: boolean): void {
    this.showToUser = show;
  }

  /**
   * تنظیم حالت توسعه
   */
  setDevMode(isDev: boolean): void {
    this.isDev = isDev;
  }
}

// ============================================================
// توابع کمکی (Helper Functions)
// ============================================================

/**
 * ایجاد یک خطای ValidationError با بررسی چندین فیلد
 */
export function createValidationError(
  errors: Record<string, string>
): ValidationError {
  const messages = Object.values(errors);
  const firstMessage = messages[0] ?? 'خطا در اعتبارسنجی';

  return new ValidationError(firstMessage, {
    fields: errors,
    userMessage: messages.join('\n'),
  });
}

/**
 * wrapper برای توابع async که خطاها را خودکار مدیریت می‌کند
 */
export function withErrorHandling<TArgs extends unknown[], TReturn>(
  asyncFn: (...args: TArgs) => Promise<TReturn>,
  options: { operationName?: string } = {}
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      errorHandler.handle(error, {
        operation: options.operationName ?? asyncFn.name,
        args,
      });
      throw error;
    }
  };
}

// ============================================================
// Singleton
// ============================================================

let errorHandlerInstance: ErrorHandler | null = null;

/**
 * دریافت نمونه singleton از ErrorHandler
 */
export function getErrorHandler(): ErrorHandler {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new ErrorHandler();
  }
  return errorHandlerInstance;
}

/**
 * ریست کردن نمونه singleton (فقط برای تست)
 */
export function resetErrorHandler(): void {
  errorHandlerInstance = null;
}

/**
 * نمونه پیش‌فرض
 */
const errorHandler = getErrorHandler();
export default errorHandler;