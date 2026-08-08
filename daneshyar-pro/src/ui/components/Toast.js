/**
 * دانش‌یار پرو - سیستم Toast (پیام‌های اعلان)
 * نمایش پیام‌های غیرمداخله‌گر به کاربر
 * @module ui/components/Toast
 */

import EventBusModule, { EVENTS } from '../../core/EventBus.js';
import LoggerModule from '../../core/Logger.js';

const logger = LoggerModule.getInstance().module('Toast');
const eventBus = EventBusModule.getInstance();

/**
 * انواع Toast و آیکون‌های آن‌ها
 */
const TOAST_TYPES = {
  SUCCESS: { icon: '✅', className: 'success' },
  ERROR: { icon: '❌', className: 'error' },
  WARNING: { icon: '⚠️', className: 'warning' },
  INFO: { icon: 'ℹ️', className: 'info' }
};

/**
 * کلاس Toast Manager
 */
class ToastManager {
  constructor() {
    this._container = null;
    this._toasts = new Map();
    this._idCounter = 0;
    
    // گوش دادن به رویدادهای Toast از EventBus
    eventBus.on(EVENTS.UI_TOAST, (data) => {
      this.show(data);
    });
    
    logger.debug('ToastManager initialized');
  }

  /**
   * تنظیم container که Toast ها در آن نمایش داده می‌شوند
   * @param {HTMLElement|string} container
   */
  setContainer(container) {
    if (typeof container === 'string') {
      this._container = document.querySelector(container);
    } else {
      this._container = container;
    }
  }

  /**
   * نمایش یک Toast
   * @param {Object} options
   * @param {string} options.type - نوع (success, error, warning, info)
   * @param {string} [options.title] - عنوان اختیاری
   * @param {string} options.message - پیام
   * @param {number} [options.duration] - مدت نمایش (ms)
   * @param {boolean} [options.dismissible] - قابل بستن دستی؟
   * @returns {string} شناسه Toast
   */
  show(options = {}) {
    const {
      type = 'info',
      title = null,
      message = '',
      duration = 5000,
      dismissible = true
    } = options;

    if (!this._container) {
      logger.warn('Toast container تنظیم نشده است');
      return null;
    }

    const id = `toast-${++this._idCounter}`;
    const typeConfig = TOAST_TYPES[type.toUpperCase()] || TOAST_TYPES.INFO;

    // ساخت عنصر Toast
    const toast = document.createElement('div');
    toast.className = `toast ${typeConfig.className} fade-in`;
    toast.dataset.id = id;
    
    toast.innerHTML = `
      <span class="toast-icon">${typeConfig.icon}</span>
      <div class="toast-message">
        ${title ? `<div class="font-bold mb-1">${this._escapeHtml(title)}</div>` : ''}
        <div>${this._escapeHtml(message)}</div>
      </div>
      ${dismissible ? `
        <button class="toast-close" aria-label="بستن">✕</button>
      ` : ''}
    `;

    // اتصال دکمه بستن
    if (dismissible) {
      const closeBtn = toast.querySelector('.toast-close');
      closeBtn?.addEventListener('click', () => this.dismiss(id));
    }

    // اضافه کردن به container
    this._container.appendChild(toast);
    this._toasts.set(id, { element: toast, timeout: null });

    // تنظیم auto-dismiss
    if (duration > 0) {
      const timeout = setTimeout(() => this.dismiss(id), duration);
      this._toasts.get(id).timeout = timeout;
    }

    logger.debug('Toast نمایش داده شد', { id, type, message });
    return id;
  }

  /**
   * بستن یک Toast
   * @param {string} id
   */
  dismiss(id) {
    const toastData = this._toasts.get(id);
    if (!toastData) return;

    const { element, timeout } = toastData;

    // لغو timeout
    if (timeout) clearTimeout(timeout);

    // انیمیشن خروج
    element.classList.remove('fade-in');
    element.classList.add('fade-out');

    // حذف پس از انیمیشن
    setTimeout(() => {
      element.remove();
      this._toasts.delete(id);
    }, 300);
  }

  /**
   * بستن همه Toast ها
   */
  dismissAll() {
    for (const id of this._toasts.keys()) {
      this.dismiss(id);
    }
  }

  /**
   * escape کردن HTML
   * @private
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // --------------------------------------------------------
  // متدهای کمکی (shortcuts)
  // --------------------------------------------------------

  success(message, title = null, duration = 5000) {
    return this.show({ type: 'success', message, title, duration });
  }

  error(message, title = null, duration = 7000) {
    return this.show({ type: 'error', message, title, duration });
  }

  warning(message, title = null, duration = 6000) {
    return this.show({ type: 'warning', message, title, duration });
  }

  info(message, title = null, duration = 5000) {
    return this.show({ type: 'info', message, title, duration });
  }
}

// ============================================================
// Singleton
// ============================================================

let toastInstance = null;

export function getToast() {
  if (!toastInstance) {
    toastInstance = new ToastManager();
  }
  return toastInstance;
}

export default getToast();