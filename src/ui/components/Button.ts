/**
 * ============================================================
 * دانش‌یار پرو - کامپوننت دکمه استاندارد
 * ============================================================
 * ✅ استفاده از سیستم دکمه main.css (گرادیان + lift + ripple)
 * ✅ Type-safe (union types برای variant و size)
 * ✅ آیکون emoji با textContent (امن در برابر XSS)
 * ✅ آیکون حرفه‌ای با iconHtml (فقط برای خروجی iconHTML — trusted)
 * ✅ حس زنده: ripple + scale هنگام فشار
 * ✅ حالت loading با spinner
 * @module ui/components/Button
 * @version 1.1.0
 */
import { getInstance as getLogger } from '@/core/Logger';

const logger = getLogger().module('Button');

// ============================================================
// Types
// ============================================================
export const BUTTON_VARIANTS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  GHOST: 'ghost',
  DANGER: 'danger',
  SUCCESS: 'success',
  ACCENT: 'accent',
} as const;
export type ButtonVariant = (typeof BUTTON_VARIANTS)[keyof typeof BUTTON_VARIANTS];

export const BUTTON_SIZES = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
} as const;
export type ButtonSize = (typeof BUTTON_SIZES)[keyof typeof BUTTON_SIZES];

export interface ButtonOptions {
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** آیکون emoji — با textContent رندر می‌شود (امن) */
  icon?: string | null;
  /**
   * آیکون حرفه‌ای (خروجی iconHTML از IconService) — با innerHTML رندر می‌شود.
   * ⚠️ فقط از خروجی iconHTML() استفاده کن، هرگز محتوای کاربر!
   */
  iconHtml?: string | null;
  iconPosition?: 'start' | 'end';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  id?: string | null;
  className?: string;
  onClick?: ((e: MouseEvent) => void | Promise<void>) | null;
}

export interface ButtonGroupOptions {
  className?: string;
  gap?: string;
}

export interface IconButtonOptions {
  icon: string;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onClick?: ((e: MouseEvent) => void | Promise<void>) | null;
  disabled?: boolean;
  className?: string;
}

// ============================================================
// نگاشت به کلاس‌های main.css
// ============================================================
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  [BUTTON_VARIANTS.PRIMARY]: 'btn-primary',
  [BUTTON_VARIANTS.SECONDARY]: 'btn-secondary',
  [BUTTON_VARIANTS.GHOST]: 'btn-ghost',
  [BUTTON_VARIANTS.DANGER]: 'btn-danger',
  [BUTTON_VARIANTS.SUCCESS]: 'btn-success',
  [BUTTON_VARIANTS.ACCENT]: 'btn-accent',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  [BUTTON_SIZES.SM]: 'btn-sm',
  [BUTTON_SIZES.MD]: '',
  [BUTTON_SIZES.LG]: 'btn-lg',
};

const ICON_SIZE_CLASSES: Record<ButtonSize, string> = {
  [BUTTON_SIZES.SM]: 'w-8 h-8 text-sm',
  [BUTTON_SIZES.MD]: 'w-10 h-10 text-base',
  [BUTTON_SIZES.LG]: 'w-12 h-12 text-lg',
};

// ============================================================
// توابع ساخت
// ============================================================
export function createButton(options: ButtonOptions = {}): HTMLButtonElement {
  const {
    label = '',
    variant = BUTTON_VARIANTS.PRIMARY,
    size = BUTTON_SIZES.MD,
    icon = null,
    iconHtml = null,
    iconPosition = 'start',
    fullWidth = false,
    disabled = false,
    loading = false,
    type = 'button',
    id = null,
    className = '',
    onClick = null,
  } = options;

  const btn = document.createElement('button');
  btn.type = type;

  const classes = [
    'btn',
    'btn-interactive',
    VARIANT_CLASSES[variant] ?? VARIANT_CLASSES[BUTTON_VARIANTS.PRIMARY],
    SIZE_CLASSES[size] ?? '',
    fullWidth ? 'w-full' : '',
    loading ? 'opacity-75 cursor-wait' : '',
    className,
  ].filter(Boolean);
  btn.className = classes.join(' ');

  if (id) btn.id = id;
  if (disabled || loading) btn.disabled = true;

  const labelSpan = document.createElement('span');
  labelSpan.textContent = label;

  if (loading) {
    const spinner = document.createElement('span');
    spinner.className = 'btn-spinner';
    btn.appendChild(spinner);
    btn.appendChild(labelSpan);
  } else if (iconHtml) {
    // ⚠️ فقط برای خروجی iconHTML (trusted) — هرگز محتوای کاربر
    const iconSpan = document.createElement('span');
    iconSpan.className = 'btn-icon flex items-center';
    iconSpan.innerHTML = iconHtml;
    if (iconPosition === 'start') {
      btn.appendChild(iconSpan);
      btn.appendChild(labelSpan);
    } else {
      btn.appendChild(labelSpan);
      btn.appendChild(iconSpan);
    }
  } else if (icon) {
    // emoji با textContent (امن)
    const iconSpan = document.createElement('span');
    iconSpan.className = 'btn-icon';
    iconSpan.textContent = icon;
    if (iconPosition === 'start') {
      btn.appendChild(iconSpan);
      btn.appendChild(labelSpan);
    } else {
      btn.appendChild(labelSpan);
      btn.appendChild(iconSpan);
    }
  } else {
    btn.appendChild(labelSpan);
  }

  if (onClick && typeof onClick === 'function') {
    btn.addEventListener('click', async (e) => {
      if (btn.disabled) return;
      try {
        await onClick(e);
      } catch (error) {
        logger.error('خطا در کلیک دکمه', error);
      }
    });
  }

  return btn;
}

export function createButtonGroup(
  buttons: ButtonOptions[],
  options: ButtonGroupOptions = {}
): HTMLDivElement {
  const { className = '', gap = 'gap-2' } = options;
  const container = document.createElement('div');
  container.className = `flex items-center ${gap} ${className}`.trim();
  buttons.forEach((btnConfig) => {
    container.appendChild(createButton(btnConfig));
  });
  return container;
}

export function createIconButton(options: IconButtonOptions): HTMLButtonElement {
  const {
    icon,
    label = '',
    variant = BUTTON_VARIANTS.GHOST,
    size = BUTTON_SIZES.MD,
    onClick = null,
    disabled = false,
    className = '',
  } = options;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = [
    'btn',
    'btn-square',
    'btn-interactive',
    VARIANT_CLASSES[variant] ?? VARIANT_CLASSES[BUTTON_VARIANTS.GHOST],
    ICON_SIZE_CLASSES[size] ?? ICON_SIZE_CLASSES[BUTTON_SIZES.MD],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (label) btn.setAttribute('aria-label', label);
  if (disabled) btn.disabled = true;

  const iconSpan = document.createElement('span');
  iconSpan.className = 'btn-icon';
  iconSpan.textContent = icon;
  btn.appendChild(iconSpan);

  if (onClick && typeof onClick === 'function') {
    btn.addEventListener('click', async (e) => {
      if (btn.disabled) return;
      try {
        await onClick(e);
      } catch (error) {
        logger.error('خطا در کلیک دکمه آیکونی', error);
      }
    });
  }

  return btn;
}