/**
 * دانش‌یار پرو - سیستم Modal (پنجره‌های شناور)
 * نسخه اصلاح‌شده با رفع باگ اسکرول و پشتیبانی کامل از Light Mode
 * @module ui/components/Modal
 */

import EventBusModule, { EVENTS } from '../../core/EventBus.js';
import LoggerModule from '../../core/Logger.js';

const logger = LoggerModule.getInstance().module('Modal');
const eventBus = EventBusModule.getInstance();

/**
 * اندازه‌های مودال
 */
const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  full: 'max-w-full mx-4'
};

/**
 * کلاس Modal Manager
 */
class ModalManager {
  constructor() {
    this._container = null;
    this._activeModal = null;
    this._previousFocus = null;
    this._escapeHandler = null;
    
    // گوش دادن به رویدادهای Modal از EventBus
    eventBus.on(EVENTS.UI_MODAL_OPEN, (data) => {
      this.open(data);
    });
    
    eventBus.on(EVENTS.UI_MODAL_CLOSE, () => {
      this.close();
    });
    
    logger.debug('ModalManager initialized');
  }

  /**
   * تنظیم container
   * @param {HTMLElement|string} container
   */
  setContainer(container) {
    if (typeof container === 'string') {
      this._container = document.querySelector(container);
    } else {
      this._container = container;
    }
    
    if (!this._container) {
      logger.warn('Modal container یافت نشد');
    }
  }

  /**
   * باز کردن مودال
   * @param {Object} options
   * @param {string} [options.title] - عنوان مودال
   * @param {string|HTMLElement} options.content - محتوای مودال
   * @param {Array} [options.buttons] - دکمه‌های footer
   * @param {string} [options.size='md'] - اندازه
   * @param {boolean} [options.closeOnOverlay=true] - بستن با کلیک روی overlay
   * @param {boolean} [options.closeOnEscape=true] - بستن با ESC
   * @param {Function} [options.onClose] - تابع هنگام بسته شدن
   * @param {boolean} [options.showCloseButton=true] - نمایش دکمه بستن
   * @param {Function} [options.onOpen] - تابع هنگام باز شدن
   * @returns {HTMLElement|null}
   */
  open(options = {}) {
    if (!this._container) {
      logger.warn('Modal container تنظیم نشده است');
      return null;
    }

    // اگر مودال فعالی وجود دارد، آن را سریع ببند
    if (this._activeModal) {
      this.close(true);
    }

    const {
      title = null,
      content = '',
      buttons = [],
      size = 'md',
      closeOnOverlay = true,
      closeOnEscape = true,
      onClose = null,
      onOpen = null,
      showCloseButton = true
    } = options;

    // ذخیره عنصر متمرکز فعلی
    this._previousFocus = document.activeElement;

    // ساخت مودال
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[9998] flex items-center justify-center p-4 modal-wrapper';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    if (title) modal.setAttribute('aria-labelledby', 'modal-title');

    modal.innerHTML = `
      <div class="modal-overlay absolute inset-0"></div>
      <div class="modal-content relative ${SIZE_CLASSES[size] || SIZE_CLASSES.md} w-full scale-in flex flex-col" style="z-index: 9999; max-height: 85vh;">
        ${title || showCloseButton ? `
          <div class="modal-header flex-shrink-0">
            ${title ? `<h2 id="modal-title" class="modal-title">${this._escapeHtml(title)}</h2>` : '<div></div>'}
            ${showCloseButton ? `
              <button class="modal-close" aria-label="بستن">✕</button>
            ` : ''}
          </div>
        ` : ''}
        <div class="modal-body flex-1 overflow-y-auto" id="modal-body"></div>
        ${buttons.length > 0 ? `
          <div class="modal-footer flex-shrink-0" id="modal-footer"></div>
        ` : ''}
      </div>
    `;

    // تنظیم محتوا
    const body = modal.querySelector('#modal-body');
    if (body) {
      if (typeof content === 'string') {
        body.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        body.appendChild(content);
      } else if (content instanceof DocumentFragment) {
        body.appendChild(content);
      }
    }

    // تنظیم دکمه‌ها
    if (buttons.length > 0) {
      const footer = modal.querySelector('#modal-footer');
      if (footer) {
        buttons.forEach(btnConfig => {
          const btn = this._createButton(btnConfig);
          footer.appendChild(btn);
        });
      }
    }

    // اتصال رویدادها
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    if (closeOnOverlay) {
      const overlay = modal.querySelector('.modal-overlay');
      if (overlay) {
        overlay.addEventListener('click', (e) => {
          // فقط اگر کلیک مستقیماً روی overlay بود
          if (e.target === overlay) {
            this.close();
          }
        });
      }
    }

    // ESC handler
    if (closeOnEscape) {
      this._escapeHandler = (e) => {
        if (e.key === 'Escape' && this._activeModal?.element === modal) {
          this.close();
        }
      };
      document.addEventListener('keydown', this._escapeHandler);
    }

    // اضافه کردن به DOM
    this._container.appendChild(modal);
    this._container.classList.add('active');

    // ذخیره اطلاعات مودال
    this._activeModal = {
      element: modal,
      closeOnEscape,
      onClose
    };

    // 🔧 قفل کردن اسکرول صفحه اصلی
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    // Focus روی اولین عنصر قابل focus
    setTimeout(() => {
      const firstFocusable = modal.querySelector(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (firstFocusable) {
        try {
          firstFocusable.focus();
        } catch (e) {
          // ignore
        }
      }
      
      // فراخوانی onOpen
      if (onOpen) {
        try {
          onOpen(modal);
        } catch (error) {
          logger.error('خطا در onOpen modal', error);
        }
      }
    }, 100);

    logger.debug('Modal باز شد', { title, size });
    return modal;
  }

  /**
   * بستن مودال
   * @param {boolean} [immediate=false] - بستن فوری بدون انیمیشن
   */
  close(immediate = false) {
    if (!this._activeModal) return;

    const { element, onClose } = this._activeModal;

    const cleanup = () => {
      // حذف ESC handler
      if (this._escapeHandler) {
        document.removeEventListener('keydown', this._escapeHandler);
        this._escapeHandler = null;
      }

      // حذف عنصر مودال
      if (element && element.parentNode) {
        element.remove();
      }

      if (this._container) {
        this._container.classList.remove('active');
      }

      // 🔧 بازگرداندن اسکرول صفحه
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';

      // بازگرداندن focus
      if (this._previousFocus && typeof this._previousFocus.focus === 'function') {
        try {
          this._previousFocus.focus();
        } catch (e) {
          // ignore
        }
      }

      // فراخوانی onClose
      if (onClose) {
        try {
          onClose();
        } catch (error) {
          logger.error('خطا در onClose modal', error);
        }
      }

      this._activeModal = null;
      logger.debug('Modal بسته شد');
    };

    if (immediate) {
      cleanup();
      return;
    }

    // انیمیشن خروج
    const content = element.querySelector('.modal-content');
    const overlay = element.querySelector('.modal-overlay');

    if (content) content.classList.add('fade-out');
    if (overlay) overlay.classList.add('fade-out');

    setTimeout(cleanup, 200);
  }

  /**
   * بررسی اینکه آیا مودال فعالی وجود دارد
   * @returns {boolean}
   */
  isOpen() {
    return this._activeModal !== null;
  }

  /**
   * ساخت دکمه
   * @private
   */
  _createButton(config) {
    const {
      label,
      type = 'ghost',
      onClick = null,
      disabled = false,
      className = '',
      autoFocus = false
    } = config;

    const btn = document.createElement('button');
    btn.className = `btn btn-${type} ${className}`.trim();
    btn.textContent = label;
    btn.disabled = disabled;
    
    if (autoFocus) {
      btn.autofocus = true;
    }

    if (onClick && typeof onClick === 'function') {
      btn.addEventListener('click', async (e) => {
        try {
          const result = onClick(e);
          
          // اگر Promise برگرداند، صبر کن
          if (result instanceof Promise) {
            btn.disabled = true;
            const originalText = btn.textContent;
            btn.textContent = '...';
            
            try {
              await result;
            } finally {
              btn.disabled = false;
              btn.textContent = originalText;
            }
          }
        } catch (error) {
          logger.error('خطا در onClick دکمه مودال', error);
        }
      });
    }

    return btn;
  }

  /**
   * escape کردن HTML
   * @private
   */
  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================================
  // متدهای کمکی (Shortcuts)
  // ============================================================

  /**
   * نمایش دیالوگ تایید
   * @param {string} title
   * @param {string} message
   * @param {Object} [options]
   * @returns {Promise<boolean>}
   */
  confirm(title, message, options = {}) {
    return new Promise((resolve) => {
      const {
        confirmText = 'تایید',
        cancelText = 'انصراف',
        confirmType = 'primary',
        dangerMode = false,
        icon = null
      } = options;

      const iconMap = {
        warning: '⚠️',
        danger: '🚨',
        question: '❓',
        info: 'ℹ️',
        success: '✅'
      };

      const displayIcon = icon || (dangerMode ? iconMap.danger : iconMap.question);

      const content = document.createElement('div');
      content.className = 'text-center py-4';
      content.innerHTML = `
        <div class="text-5xl mb-4">${displayIcon}</div>
        <p class="text-slate-300 leading-relaxed whitespace-pre-wrap">${this._escapeHtml(message)}</p>
      `;

      let resolved = false;

      const buttons = [
        {
          label: cancelText,
          type: 'ghost',
          onClick: () => {
            if (resolved) return;
            resolved = true;
            this.close();
            resolve(false);
          }
        },
        {
          label: confirmText,
          type: dangerMode ? 'danger' : confirmType,
          autoFocus: !dangerMode,
          onClick: () => {
            if (resolved) return;
            resolved = true;
            this.close();
            resolve(true);
          }
        }
      ];

      this.open({
        title,
        content,
        buttons,
        size: 'sm',
        onClose: () => {
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
        }
      });
    });
  }

  /**
   * نمایش پیام ساده (Alert)
   * @param {string} title
   * @param {string} message
   * @param {string} [type='info']
   * @returns {Promise<void>}
   */
  alert(title, message, type = 'info') {
    return new Promise((resolve) => {
      const icons = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌'
      };

      const content = document.createElement('div');
      content.className = 'text-center py-4';
      content.innerHTML = `
        <div class="text-5xl mb-4">${icons[type] || icons.info}</div>
        <p class="text-slate-300 leading-relaxed whitespace-pre-wrap">${this._escapeHtml(message)}</p>
      `;

      let resolved = false;

      const buttons = [
        {
          label: 'باشه',
          type: 'primary',
          autoFocus: true,
          onClick: () => {
            if (resolved) return;
            resolved = true;
            this.close();
            resolve();
          }
        }
      ];

      this.open({
        title,
        content,
        buttons,
        size: 'sm',
        onClose: () => {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        }
      });
    });
  }

  /**
   * نمایش prompt برای دریافت ورودی
   * @param {string} title
   * @param {string} message
   * @param {Object} [options]
   * @returns {Promise<string|null>}
   */
  prompt(title, message, options = {}) {
    return new Promise((resolve) => {
      const {
        placeholder = '',
        defaultValue = '',
        inputType = 'text',
        confirmText = 'تایید',
        cancelText = 'انصراف',
        required = false
      } = options;

      const content = document.createElement('div');
      content.className = 'space-y-4';
      content.innerHTML = `
        <p class="text-slate-300 leading-relaxed">${this._escapeHtml(message)}</p>
        <input type="${inputType}" 
               id="modal-prompt-input"
               class="input w-full"
               placeholder="${this._escapeHtml(placeholder)}"
               value="${this._escapeHtml(defaultValue)}"
               ${required ? 'required' : ''}>
      `;

      let resolved = false;

      const buttons = [
        {
          label: cancelText,
          type: 'ghost',
          onClick: () => {
            if (resolved) return;
            resolved = true;
            this.close();
            resolve(null);
          }
        },
        {
          label: confirmText,
          type: 'primary',
          autoFocus: false,
          onClick: () => {
            if (resolved) return;
            const input = document.getElementById('modal-prompt-input');
            const value = input ? input.value.trim() : null;
            
            if (required && !value) {
              if (input) {
                input.classList.add('border-red-500', 'shake');
                setTimeout(() => {
                  input.classList.remove('shake');
                }, 500);
              }
              return;
            }
            
            resolved = true;
            this.close();
            resolve(value);
          }
        }
      ];

      this.open({
        title,
        content,
        buttons,
        size: 'md',
        onClose: () => {
          if (!resolved) {
            resolved = true;
            resolve(null);
          }
        }
      });

      // focus روی input و select متن
      setTimeout(() => {
        const input = document.getElementById('modal-prompt-input');
        if (input) {
          input.focus();
          if (defaultValue) {
            input.select();
          }
          
          // Enter برای تایید
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const confirmBtn = document.querySelector('#modal-footer .btn-primary');
              if (confirmBtn) confirmBtn.click();
            }
          });
        }
      }, 150);
    });
  }

  /**
   * نمایش loading modal
   * @param {string} [message='در حال پردازش...']
   * @returns {Function} تابعی برای بستن مودال
   */
  loading(message = 'در حال پردازش...') {
    const content = document.createElement('div');
    content.className = 'text-center py-8';
    content.innerHTML = `
      <div class="inline-block mb-4">
        <div class="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p class="text-slate-300">${this._escapeHtml(message)}</p>
    `;

    this.open({
      content,
      size: 'sm',
      showCloseButton: false,
      closeOnOverlay: false,
      closeOnEscape: false
    });

    // برگرداندن تابع برای بستن
    return () => this.close();
  }

  /**
   * به‌روزرسانی محتوای مودال فعال
   * @param {string|HTMLElement} newContent
   */
  updateContent(newContent) {
    if (!this._activeModal) return;
    
    const body = this._activeModal.element.querySelector('#modal-body');
    if (!body) return;

    body.innerHTML = '';
    if (typeof newContent === 'string') {
      body.innerHTML = newContent;
    } else if (newContent instanceof HTMLElement) {
      body.appendChild(newContent);
    }
  }

  /**
   * به‌روزرسانی عنوان مودال فعال
   * @param {string} newTitle
   */
  updateTitle(newTitle) {
    if (!this._activeModal) return;
    
    const titleEl = this._activeModal.element.querySelector('#modal-title');
    if (titleEl) {
      titleEl.textContent = newTitle;
    }
  }
}

// ============================================================
// Singleton
// ============================================================

let modalInstance = null;

export function getModal() {
  if (!modalInstance) {
    modalInstance = new ModalManager();
  }
  return modalInstance;
}

export default getModal();