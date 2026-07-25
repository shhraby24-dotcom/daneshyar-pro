/**
 * ============================================================
 * دانش‌یار پرو - سیستم Toast (پیام‌های اعلان)
 * ============================================================
 *
 * نمایش پیام‌های غیرمداخله‌گر با حس زنده:
 * ✅ ساخت خودکار container (بدون تنظیم دستی - دیگر شکست بی‌صدا نداریم)
 * ✅ حداکثر ۵ توست همزمان (حذف قدیمی‌ترین)
 * ✅ نوار پیشرفت متحرک (همگام با زمان باقی‌مانده)
 * ✅ مکث با hover و ادامه با خروج نشانگر
 * ✅ جلوگیری از توست‌های تکراری (dedup)
 * ✅ دسترس‌پذیری: aria-live + role="status"
 * ✅ ساخت DOM با textContent (بدون innerHTML - امن در برابر XSS)
 * ✅ یکپارچه با EventBus (EVENTS.UI_TOAST)
 *
 * @module ui/components/Toast
 * @version 1.0.0-beta.1
 */

import { getInstance as getEventBus, EVENTS } from '@/core/EventBus';
import { getInstance as getLogger } from '@/core/Logger';

const logger = getLogger().module('Toast');
const eventBus = getEventBus();

// ============================================================
// Types
// ============================================================

/**
 * انواع Toast
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * گزینه‌های نمایش Toast
 */
export interface ToastOptions {
  type?: ToastType;
  title?: string | null;
  message: string;
  duration?: number;
  dismissible?: boolean;
}

interface ToastTypeConfig {
  icon: string;
}

const TOAST_TYPES: Record<ToastType, ToastTypeConfig> = {
  success: { icon: '✅' },
  error: { icon: '❌' },
  warning: { icon: '⚠️' },
  info: { icon: 'ℹ️' },
};

/**
 * حداکثر تعداد توست همزمان
 */
const MAX_TOASTS = 5;

/**
 * مدت انیمیشن خروج
 */
const EXIT_ANIMATION_MS = 300;

/**
 * داده‌های داخلی هر توست
 */
interface ToastData {
  element: HTMLElement;
  progressBar: HTMLElement | null;
  timeoutId: ReturnType<typeof setTimeout> | null;
  startTime: number;
  remaining: number;
  duration: number;
  isPaused: boolean;
  type: ToastType;
  message: string;
}

// ============================================================
// ToastManager
// ============================================================

/**
 * کلاس مدیریت Toast
 */
export class ToastManager {
  private _container: HTMLElement | null = null;
  private _toasts = new Map<string, ToastData>();
  private _idCounter = 0;

  constructor() {
    // گوش دادن به رویداد Toast از EventBus (زنجیره Errors → Toast)
    eventBus.on(EVENTS.UI_TOAST, (data: unknown) => {
      this.show(this._coerceOptions(data));
    });
    logger.debug('ToastManager initialized');
  }

  // ============================================================
  // نمایش و بستن
  // ============================================================

  /**
   * نمایش یک Toast
   * @returns شناسه توست (یا null اگر پیام خالی باشد)
   */
  show(options: ToastOptions): string | null {
    const type = this._normalizeType(options.type);
    const title = options.title ?? null;
    const message = options.message;
    const duration = options.duration ?? 5000;
    const dismissible = options.dismissible ?? true;

    if (!message) {
      logger.warn('Toast بدون پیام - نادیده گرفته شد');
      return null;
    }

    const container = this._ensureContainer();

    // Dedup: اگر توست یکسانی در حال نمایش است، حذفش کن (جدید با تایمر تازه جایگزین می‌شود)
    for (const [existingId, data] of this._toasts) {
      if (data.type === type && data.message === message) {
        this.dismiss(existingId);
        break;
      }
    }

    // اعمال سقف: حذف قدیمی‌ترین توست‌ها
    while (this._toasts.size >= MAX_TOASTS) {
      const oldestId = this._toasts.keys().next().value;
      if (oldestId === undefined) break;
      this.dismiss(oldestId);
    }

    const id = `toast-${++this._idCounter}`;
    const config = TOAST_TYPES[type];

    // ساخت عنصر با textContent (امن در برابر XSS)
    const toast = document.createElement('div');
    toast.className = `toast ${type} fade-in`;
    toast.dataset.id = id;
    toast.setAttribute('role', 'status');

    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.textContent = config.icon;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'toast-message';

    if (title) {
      const titleDiv = document.createElement('div');
      titleDiv.className = 'toast-title';
      titleDiv.textContent = title;
      messageDiv.appendChild(titleDiv);
    }

    const textDiv = document.createElement('div');
    textDiv.textContent = message;
    messageDiv.appendChild(textDiv);

    toast.appendChild(iconSpan);
    toast.appendChild(messageDiv);

    if (dismissible) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'toast-close';
      closeBtn.setAttribute('aria-label', 'بستن');
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', () => this.dismiss(id));
      toast.appendChild(closeBtn);
    }

    // نوار پیشرفت (فقط برای توست‌های auto-dismiss)
    let progressBar: HTMLElement | null = null;
    if (duration > 0) {
      progressBar = document.createElement('div');
      progressBar.className = 'toast-progress-bar';
      progressBar.style.animationDuration = `${duration}ms`;
      toast.appendChild(progressBar);
    }

    container.appendChild(toast);

    const data: ToastData = {
      element: toast,
      progressBar,
      timeoutId: null,
      startTime: Date.now(),
      remaining: duration,
      duration,
      isPaused: false,
      type,
      message,
    };
    this._toasts.set(id, data);

    if (duration > 0) {
      data.timeoutId = setTimeout(() => this.dismiss(id), duration);
    }

    // مکث با hover / ادامه با خروج
    toast.addEventListener('mouseenter', () => this._pause(id));
    toast.addEventListener('mouseleave', () => this._resume(id));

    logger.debug('Toast نمایش داده شد', { id, type, message });
    return id;
  }

  /**
   * بستن یک Toast (idempotent - فراخوانی تکراری بی‌ضرر است)
   */
  dismiss(id: string): void {
    const data = this._toasts.get(id);
    if (!data) return;

    // حذف فوری از map (برای idempotent بودن و اعمال سقف درست)
    this._toasts.delete(id);

    if (data.timeoutId !== null) {
      clearTimeout(data.timeoutId);
    }

    const el = data.element;
    el.classList.remove('fade-in');
    el.classList.add('fade-out');
    setTimeout(() => {
      el.remove();
    }, EXIT_ANIMATION_MS);
  }

  /**
   * بستن همه Toastها
   */
  dismissAll(): void {
    for (const id of [...this._toasts.keys()]) {
      this.dismiss(id);
    }
  }

  // ============================================================
  // مکث و ادامه (hover)
  // ============================================================

  /**
   * مکث تایمر و انیمیشن با hover
   */
  private _pause(id: string): void {
    const data = this._toasts.get(id);
    if (!data || data.isPaused || data.duration <= 0) return;

    if (data.timeoutId !== null) {
      clearTimeout(data.timeoutId);
      data.timeoutId = null;
    }

    data.remaining -= Date.now() - data.startTime;
    data.isPaused = true;

    if (data.progressBar) {
      data.progressBar.style.animationPlayState = 'paused';
    }
  }

  /**
   * ادامه تایمر و انیمیشن پس از خروج نشانگر
   */
  private _resume(id: string): void {
    const data = this._toasts.get(id);
    if (!data || !data.isPaused) return;

    data.isPaused = false;
    data.startTime = Date.now();

    if (data.progressBar) {
      data.progressBar.style.animationPlayState = 'running';
    }

    if (data.remaining > 0) {
      data.timeoutId = setTimeout(() => this.dismiss(id), data.remaining);
    } else {
      this.dismiss(id);
    }
  }

  // ============================================================
  // متدهای کمکی
  // ============================================================

  /**
   * اطمینان از وجود container (خودکار ساخته می‌شود)
   */
  private _ensureContainer(): HTMLElement {
    if (this._container && document.body.contains(this._container)) {
      return this._container;
    }

    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    // دسترس‌پذیری: اعلام توست‌ها به صفحه‌خوان
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'false');

    this._container = container;
    return container;
  }

  /**
   * اعتبارسنجی و نرمال‌سازی نوع (type-safe)
   */
  private _normalizeType(type: unknown): ToastType {
    if (typeof type === 'string') {
      const lower = type.toLowerCase();
      if (lower === 'success' || lower === 'error' || lower === 'warning' || lower === 'info') {
        return lower;
      }
    }
    return 'info';
  }

  /**
   * تبدیل داده EventBus به ToastOptions (با اعتبارسنجی)
   */
  private _coerceOptions(data: unknown): ToastOptions {
    if (typeof data === 'string') {
      return { message: data };
    }

    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      return {
        type: this._normalizeType(d.type),
        title: typeof d.title === 'string' ? d.title : null,
        message: typeof d.message === 'string' ? d.message : String(d.message ?? ''),
        duration: typeof d.duration === 'number' ? d.duration : undefined,
        dismissible: typeof d.dismissible === 'boolean' ? d.dismissible : undefined,
      };
    }

    return { message: '' };
  }

  // ============================================================
  // میان‌برها (Shortcuts)
  // ============================================================

  success(message: string, title: string | null = null, duration = 5000): string | null {
    return this.show({ type: 'success', message, title, duration });
  }

  error(message: string, title: string | null = null, duration = 7000): string | null {
    return this.show({ type: 'error', message, title, duration });
  }

  warning(message: string, title: string | null = null, duration = 6000): string | null {
    return this.show({ type: 'warning', message, title, duration });
  }

  info(message: string, title: string | null = null, duration = 5000): string | null {
    return this.show({ type: 'info', message, title, duration });
  }
}

// ============================================================
// Singleton
// ============================================================

let toastInstance: ToastManager | null = null;

/**
 * دریافت نمونه singleton از ToastManager
 */
export function getToast(): ToastManager {
  if (!toastInstance) {
    toastInstance = new ToastManager();
  }
  return toastInstance;
}

/**
 * ریست کردن نمونه singleton (فقط برای تست)
 */
export function resetToast(): void {
  if (toastInstance) {
    toastInstance.dismissAll();
  }
  toastInstance = null;
}

/**
 * Export پیش‌فرض
 */
export default getToast();