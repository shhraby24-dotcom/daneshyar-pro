/**
 * ============================================================
 * دانش‌یار پرو - سیستم Modal (پنجره‌های شناور)
 * ============================================================
 *
 * ✅ باگ بحرانی prompt() اصلاح شد (دیگر null اشتباه برنمی‌گرداند)
 * ✅ Focus Trap: با Tab فقط داخل مودال می‌چرخید (دسترس‌پذیری)
 * ✅ Spinner به جای '...' (آیکون و متن دکمه حفظ می‌شود)
 * ✅ ساخت DOM با createElement/textContent (امن در برابر XSS)
 * ✅ قفل اسکرول + بازگرداندن focus + ESC + کلیک روی overlay
 * ✅ ساخت خودکار container
 * ✅ یکپارچه با EventBus (UI_MODAL_OPEN / UI_MODAL_CLOSE)
 *
 * @module ui/components/Modal
 * @version 1.0.0-beta.1
 */

import { getInstance as getEventBus, EVENTS } from '@/core/EventBus';
import { getInstance as getLogger } from '@/core/Logger';

const logger = getLogger().module('Modal');
const eventBus = getEventBus();

// ============================================================
// Types
// ============================================================

/**
 * اندازه‌های مودال
 */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';

/**
 * نوع دکمه‌های مودال
 */
export type ModalButtonType = 'primary' | 'secondary' | 'accent' | 'success' | 'danger' | 'ghost';

/**
 * تنظیمات یک دکمه مودال
 */
export interface ModalButton {
  label: string;
  type?: ModalButtonType;
  onClick?: ((e: MouseEvent) => void | Promise<void>) | null;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}

/**
 * گزینه‌های باز کردن مودال
 */
export interface ModalOptions {
  title?: string | null;
  /** اگر string باشد به عنوان HTML درج می‌شود (مسئولیت sanitization با فراخوان) */
  content?: string | HTMLElement | DocumentFragment;
  buttons?: ModalButton[];
  size?: ModalSize;
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
  onClose?: (() => void) | null;
  onOpen?: ((modal: HTMLElement) => void) | null;
  showCloseButton?: boolean;
}

/**
 * گزینه‌های دیالوگ confirm
 */
export interface ConfirmOptions {
  confirmText?: string;
  cancelText?: string;
  confirmType?: ModalButtonType;
  dangerMode?: boolean;
  icon?: string | null;
}

/**
 * گزینه‌های دیالوگ prompt
 */
export interface PromptOptions {
  placeholder?: string;
  defaultValue?: string;
  inputType?: string;
  confirmText?: string;
  cancelText?: string;
  required?: boolean;
}

interface ActiveModal {
  element: HTMLElement;
  onClose: (() => void) | null;
}

// ============================================================
// ثابت‌ها
// ============================================================

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  full: 'max-w-full mx-4',
};

/**
 * سلکتور عناصر قابل focus (برای focus trap و focus اولیه)
 */
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// ============================================================
// ModalManager
// ============================================================

/**
 * کلاس مدیریت Modal
 */
export class ModalManager {
  private _container: HTMLElement | null = null;
  private _activeModal: ActiveModal | null = null;
  private _previousFocus: HTMLElement | null = null;
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    eventBus.on(EVENTS.UI_MODAL_OPEN, (data: unknown) => {
      if (data && typeof data === 'object') {
        this.open(data as ModalOptions);
      }
    });
    eventBus.on(EVENTS.UI_MODAL_CLOSE, () => {
      this.close();
    });
    logger.debug('ModalManager initialized');
  }

  // ============================================================
  // باز و بسته کردن
  // ============================================================

  /**
   * باز کردن مودال
   * @returns عنصر مودال (یا null در صورت خطا)
   */
  open(options: ModalOptions = {}): HTMLElement | null {
    const container = this._ensureContainer();

    // اگر مودال فعالی هست، سریع ببند
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
      showCloseButton = true,
    } = options;

    // ذخیره عنصر متمرکز فعلی (برای بازگرداندن بعد از بستن)
    this._previousFocus = (document.activeElement as HTMLElement | null) ?? null;

    const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[9998] flex items-center justify-center p-4 modal-wrapper';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    // اسکلت ثابت (بدون داده کاربر - امن)
    modal.innerHTML = `
      <div class="modal-overlay absolute inset-0"></div>
      <div class="modal-content relative ${sizeClass} w-full scale-in flex flex-col" style="z-index: 9999; max-height: 85vh;">
        <div class="modal-header flex-shrink-0" id="modal-header"></div>
        <div class="modal-body flex-1 overflow-y-auto" id="modal-body"></div>
        <div class="modal-footer flex-shrink-0" id="modal-footer"></div>
      </div>
    `;

    // ── Header (عنوان + دکمه بستن) ──
    const header = modal.querySelector<HTMLElement>('#modal-header');
    if (header) {
      if (title || showCloseButton) {
        if (title) {
          const h2 = document.createElement('h2');
          h2.id = 'modal-title';
          h2.className = 'modal-title';
          h2.textContent = title;
          header.appendChild(h2);
          modal.setAttribute('aria-labelledby', 'modal-title');
        } else {
          header.appendChild(document.createElement('div'));
        }
        if (showCloseButton) {
          const closeBtn = document.createElement('button');
          closeBtn.className = 'modal-close';
          closeBtn.setAttribute('aria-label', 'بستن');
          closeBtn.textContent = '✕';
          closeBtn.addEventListener('click', () => this.close());
          header.appendChild(closeBtn);
        }
      } else {
        header.remove();
      }
    }

    // ── Body (محتوا) ──
    const body = modal.querySelector<HTMLElement>('#modal-body');
    if (body) {
      if (typeof content === 'string') {
        body.innerHTML = content;
      } else if (content instanceof HTMLElement || content instanceof DocumentFragment) {
        body.appendChild(content);
      }
    }

    // ── Footer (دکمه‌ها) ──
    const footer = modal.querySelector<HTMLElement>('#modal-footer');
    if (footer) {
      if (buttons.length > 0) {
        buttons.forEach((btnConfig) => footer.appendChild(this._createButton(btnConfig)));
      } else {
        footer.remove();
      }
    }

    // ── بستن با کلیک روی overlay ──
    if (closeOnOverlay) {
      const overlay = modal.querySelector<HTMLElement>('.modal-overlay');
      overlay?.addEventListener('click', (e) => {
        if (e.target === overlay) this.close();
      });
    }

    // ── Keyboard handler (ESC + Focus Trap) ──
    this._keyHandler = (e: KeyboardEvent) => {
      if (this._activeModal?.element !== modal) return;
      if (e.key === 'Escape' && closeOnEscape) {
        this.close();
      } else if (e.key === 'Tab') {
        this._trapFocus(e, modal);
      }
    };
    document.addEventListener('keydown', this._keyHandler);

    container.appendChild(modal);
    container.classList.add('active');

    this._activeModal = { element: modal, onClose };

    // قفل اسکرول صفحه اصلی
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    // focus روی اولین عنصر قابل focus + onOpen
    setTimeout(() => {
      const firstFocusable = modal.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      try {
        firstFocusable?.focus();
      } catch {
        /* ignore */
      }
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
   * بستن مودال (idempotent - فراخوانی تکراری بی‌ضرر است)
   * @param immediate - بستن فوری بدون انیمیشن
   */
  close(immediate = false): void {
    if (!this._activeModal) return;

    const { element, onClose } = this._activeModal;
    this._activeModal = null; // حذف فوری (برای idempotent بودن)

    const cleanup = (): void => {
      if (this._keyHandler) {
        document.removeEventListener('keydown', this._keyHandler);
        this._keyHandler = null;
      }
      element.remove();
      this._container?.classList.remove('active');

      // بازگرداندن اسکرول صفحه
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';

      // بازگرداندن focus
      if (this._previousFocus && typeof this._previousFocus.focus === 'function') {
        try {
          this._previousFocus.focus();
        } catch {
          /* ignore */
        }
      }

      if (onClose) {
        try {
          onClose();
        } catch (error) {
          logger.error('خطا در onClose modal', error);
        }
      }
      logger.debug('Modal بسته شد');
    };

    if (immediate) {
      cleanup();
      return;
    }

    // انیمیشن خروج
    const content = element.querySelector('.modal-content');
    const overlay = element.querySelector('.modal-overlay');
    content?.classList.add('fade-out');
    overlay?.classList.add('fade-out');
    setTimeout(cleanup, 200);
  }

  /**
   * آیا مودال فعالی وجود دارد؟
   */
  isOpen(): boolean {
    return this._activeModal !== null;
  }

  // ============================================================
  // Focus Trap (دسترس‌پذیری)
  // ============================================================

  /**
   * نگه داشتن focus داخل مودال هنگام Tab زدن
   */
  private _trapFocus(e: KeyboardEvent, modal: HTMLElement): void {
    const focusables = modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) return;

    if (e.shiftKey) {
      // Shift+Tab: اگر روی اولین عنصر هستیم، برو به آخر
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab: اگر روی آخرین عنصر هستیم، برو به اول
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // ============================================================
  // ساخت دکمه
  // ============================================================

  /**
   * ساخت یک دکمه مودال (با spinner برای onClick های async)
   */
  private _createButton(config: ModalButton): HTMLButtonElement {
    const { label, type = 'ghost', onClick = null, disabled = false, className = '', autoFocus = false } = config;

    const btn = document.createElement('button');
    btn.className = `btn btn-${type} ${className}`.trim();
    btn.textContent = label;
    btn.disabled = disabled;
    if (autoFocus) btn.autofocus = true;

    if (onClick && typeof onClick === 'function') {
      btn.addEventListener('click', async (e) => {
        try {
          const result = onClick(e);
          // اگر Promise برگرداند، spinner نشان بده (متن دکمه حفظ می‌شود)
          if (result instanceof Promise) {
            btn.disabled = true;
            const spinner = document.createElement('span');
            spinner.className = 'btn-spinner';
            btn.insertBefore(spinner, btn.firstChild);
            try {
              await result;
            } finally {
              btn.disabled = false;
              spinner.remove();
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
   * اطمینان از وجود container (خودکار ساخته می‌شود)
   */
  private _ensureContainer(): HTMLElement {
    if (this._container && document.body.contains(this._container)) {
      return this._container;
    }
    let container = document.getElementById('modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'modal-container';
      document.body.appendChild(container);
    }
    this._container = container;
    return container;
  }

  // ============================================================
  // متدهای کمکی (Shortcuts)
  // ============================================================

  /**
   * دیالوگ تایید
   * @returns true اگر تایید شد، false اگر انصراف
   */
  confirm(title: string, message: string, options: ConfirmOptions = {}): Promise<boolean> {
    return new Promise((resolve) => {
      const { confirmText = 'تایید', cancelText = 'انصراف', confirmType = 'primary', dangerMode = false, icon = null } = options;

      const iconMap: Record<string, string> = {
        warning: '⚠️',
        danger: '🚨',
        question: '❓',
        info: 'ℹ️',
        success: '✅',
      };
      const displayIcon = icon ?? (dangerMode ? iconMap.danger : iconMap.question) ?? '❓';

      const content = document.createElement('div');
      content.className = 'text-center py-4';

      const iconDiv = document.createElement('div');
      iconDiv.className = 'text-5xl mb-4';
      iconDiv.textContent = displayIcon;
      content.appendChild(iconDiv);

      const msg = document.createElement('p');
      msg.className = 'text-slate-300 leading-relaxed whitespace-pre-wrap';
      msg.textContent = message;
      content.appendChild(msg);

      let resolved = false;

      const buttons: ModalButton[] = [
        {
          label: cancelText,
          type: 'ghost',
          onClick: () => {
            if (resolved) return;
            resolved = true;
            this.close();
            resolve(false);
          },
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
          },
        },
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
        },
      });
    });
  }

  /**
   * پیام ساده (Alert)
   */
  alert(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): Promise<void> {
    return new Promise((resolve) => {
      const icons: Record<string, string> = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };

      const content = document.createElement('div');
      content.className = 'text-center py-4';

      const iconDiv = document.createElement('div');
      iconDiv.className = 'text-5xl mb-4';
      iconDiv.textContent = icons[type] ?? icons.info ?? 'ℹ️';
      content.appendChild(iconDiv);

      const msg = document.createElement('p');
      msg.className = 'text-slate-300 leading-relaxed whitespace-pre-wrap';
      msg.textContent = message;
      content.appendChild(msg);

      let resolved = false;

      const buttons: ModalButton[] = [
        {
          label: 'باشه',
          type: 'primary',
          autoFocus: true,
          onClick: () => {
            if (resolved) return;
            resolved = true;
            this.close();
            resolve();
          },
        },
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
        },
      });
    });
  }

  /**
   * دریافت ورودی از کاربر (Prompt)
   * ⭐ باگ نسخه قدیمی (id با فاصله اضافه → همیشه null) اصلاح شد
   * @returns مقدار ورودی، یا null اگر انصراف
   */
  prompt(title: string, message: string, options: PromptOptions = {}): Promise<string | null> {
    return new Promise((resolve) => {
      const { placeholder = '', defaultValue = '', inputType = 'text', confirmText = 'تایید', cancelText = 'انصراف', required = false } = options;

      // ساخت محتوا با createElement (بدون innerHTML - بدون فاصله اضافه)
      const content = document.createElement('div');
      content.className = 'space-y-4';

      const msg = document.createElement('p');
      msg.className = 'text-slate-300 leading-relaxed';
      msg.textContent = message;
      content.appendChild(msg);

      const input = document.createElement('input');
      input.type = inputType;
      input.id = 'modal-prompt-input';
      input.className = 'input w-full';
      input.placeholder = placeholder;
      input.value = defaultValue;
      if (required) input.required = true;
      content.appendChild(input);

      let resolved = false;

      const buttons: ModalButton[] = [
        {
          label: cancelText,
          type: 'ghost',
          onClick: () => {
            if (resolved) return;
            resolved = true;
            this.close();
            resolve(null);
          },
        },
        {
          label: confirmText,
          type: 'primary',
          onClick: () => {
            if (resolved) return;
            // ⭐ دسترسی مستقیم به input (نه getElementById که باگ داشت)
            const value = input.value.trim();

            if (required && !value) {
              input.classList.add('border-red-500', 'shake');
              setTimeout(() => input.classList.remove('shake'), 500);
              input.focus();
              return;
            }

            resolved = true;
            this.close();
            resolve(value);
          },
        },
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
        },
      });

      // focus روی input + select متن + Enter برای تایید
      setTimeout(() => {
        input.focus();
        if (defaultValue) input.select();
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const confirmBtn = this._activeModal?.element.querySelector<HTMLElement>('#modal-footer .btn-primary');
            confirmBtn?.click();
          }
        });
      }, 150);
    });
  }

  /**
   * مودال بارگذاری
   * @returns تابعی برای بستن مودال
   */
  loading(message = 'در حال پردازش...'): () => void {
    const content = document.createElement('div');
    content.className = 'text-center py-8';

    const spinnerWrap = document.createElement('div');
    spinnerWrap.className = 'inline-block mb-4';
    const spinner = document.createElement('div');
    spinner.className = 'w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin';
    spinnerWrap.appendChild(spinner);
    content.appendChild(spinnerWrap);

    const msg = document.createElement('p');
    msg.className = 'text-slate-300';
    msg.textContent = message;
    content.appendChild(msg);

    this.open({
      content,
      size: 'sm',
      showCloseButton: false,
      closeOnOverlay: false,
      closeOnEscape: false,
    });

    return () => this.close();
  }

  // ============================================================
  // به‌روزرسانی مودال فعال
  // ============================================================

  /**
   * به‌روزرسانی محتوای مودال فعال
   */
  updateContent(newContent: string | HTMLElement): void {
    if (!this._activeModal) return;
    const body = this._activeModal.element.querySelector<HTMLElement>('#modal-body');
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
   */
  updateTitle(newTitle: string): void {
    if (!this._activeModal) return;
    const titleEl = this._activeModal.element.querySelector<HTMLElement>('#modal-title');
    if (titleEl) {
      titleEl.textContent = newTitle;
    }
  }
}

// ============================================================
// Singleton
// ============================================================

let modalInstance: ModalManager | null = null;

/**
 * دریافت نمونه singleton از ModalManager
 */
export function getModal(): ModalManager {
  if (!modalInstance) {
    modalInstance = new ModalManager();
  }
  return modalInstance;
}

/**
 * ریست کردن نمونه singleton (فقط برای تست)
 */
export function resetModal(): void {
  if (modalInstance) {
    modalInstance.close(true);
  }
  modalInstance = null;
}

/**
 * Export پیش‌فرض
 */
export default getModal();