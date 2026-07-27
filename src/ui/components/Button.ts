/**
 * ============================================================
 * دانش‌یار پرو - کامپوننت دکمه استاندارد
 * ============================================================
 *
 * توابع کمکی برای ساخت دکمه‌ها با استایل یکپارچه
 *
 * ✅ استفاده از سیستم دکمه main.css (گرادیان + lift + ripple)
 * ✅ Type-safe (union types برای variant و size)
 * ✅ آیکون با textContent (امن در برابر XSS)
 * ✅ حس زنده: ripple + scale هنگام فشار + بزرگ‌شدن آیکون در hover
 * ✅ حالت loading با spinner (بدون از دست رفتن متن)
 * ✅ focus از استایل سراسری focus-visible (تم‌پذیر، بدون hardcode)
 *
 * @module ui/components/Button
 * @version 1.0.0-beta.1
 */

import { getInstance as getLogger } from '@/core/Logger';

const logger = getLogger().module('Button');

// ============================================================
// Types
// ============================================================

/**
 * انواع دکمه (variant)
 */
export const BUTTON_VARIANTS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  GHOST: 'ghost',
  DANGER: 'danger',
  SUCCESS: 'success',
  ACCENT: 'accent',
} as const;

export type ButtonVariant = (typeof BUTTON_VARIANTS)[keyof typeof BUTTON_VARIANTS];

/**
 * اندازه‌های دکمه
 */
export const BUTTON_SIZES = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
} as const;

export type ButtonSize = (typeof BUTTON_SIZES)[keyof typeof BUTTON_SIZES];

/**
 * گزینه‌های ساخت دکمه
 */
export interface ButtonOptions {
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** آیکون (emoji) - با textContent رندر می‌شود */
  icon?: string | null;
  iconPosition?: 'start' | 'end';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  id?: string | null;
  className?: string;
  onClick?: ((e: MouseEvent) => void | Promise<void>) | null;
}

/**
 * گزینه‌های گروه دکمه
 */
export interface ButtonGroupOptions {
  className?: string;
  gap?: string;
}

/**
 * گزینه‌های دکمه آیکونی
 */
export interface IconButtonOptions {
  icon: string;
  /** برای accessibility (aria-label) */
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

/**
 * هر variant به کلاس ساخته‌شده در main.css نگاشت می‌شود
 * (گرادیان، سایه و hover lift از آنجا می‌آید)
 */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  [BUTTON_VARIANTS.PRIMARY]: 'btn-primary',
  [BUTTON_VARIANTS.SECONDARY]: 'btn-secondary',
  [BUTTON_VARIANTS.GHOST]: 'btn-ghost',
  [BUTTON_VARIANTS.DANGER]: 'btn-danger',
  [BUTTON_VARIANTS.SUCCESS]: 'btn-success',
  [BUTTON_VARIANTS.ACCENT]: 'btn-accent',
};

/**
 * اندازه‌ها (md = پیش‌فرض، کلاس اضافه نمی‌خواهد)
 */
const SIZE_CLASSES: Record<ButtonSize, string> = {
  [BUTTON_SIZES.SM]: 'btn-sm',
  [BUTTON_SIZES.MD]: '',
  [BUTTON_SIZES.LG]: 'btn-lg',
};

/**
 * اندازه‌های دکمه آیکونی (مربعی)
 */
const ICON_SIZE_CLASSES: Record<ButtonSize, string> = {
  [BUTTON_SIZES.SM]: 'w-8 h-8 text-sm',
  [BUTTON_SIZES.MD]: 'w-10 h-10 text-base',
  [BUTTON_SIZES.LG]: 'w-12 h-12 text-lg',
};

// ============================================================
// توابع ساخت
// ============================================================

/**
 * ساخت یک دکمه استاندارد
 *
 * @example
 * const btn = createButton({
 *   label: 'ذخیره',
 *   variant: 'primary',
 *   icon: '💾',
 *   onClick: () => save(),
 * });
 * container.appendChild(btn);
 */
export function createButton(options: ButtonOptions = {}): HTMLButtonElement {
  const {
    label = '',
    variant = BUTTON_VARIANTS.PRIMARY,
    size = BUTTON_SIZES.MD,
    icon = null,
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

  // کلاس‌ها: پایه + variant + اندازه + ripple
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

  // متن دکمه
  const labelSpan = document.createElement('span');
  labelSpan.textContent = label;

  if (loading) {
    // spinner + متن (متن حفظ می‌شود)
    const spinner = document.createElement('span');
    spinner.className = 'btn-spinner';
    btn.appendChild(spinner);
    btn.appendChild(labelSpan);
  } else if (icon) {
    // آیکون با textContent (امن برای emoji)
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

  // اتصال onClick (با پشتیبانی از async)
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

/**
 * ساخت گروهی از دکمه‌ها در یک container
 *
 * @example
 * const group = createButtonGroup([
 *   { label: 'انصراف', variant: 'ghost' },
 *   { label: 'ذخیره', variant: 'primary', onClick: save },
 * ]);
 */
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

/**
 * ساخت دکمه آیکونی (فقط آیکون، بدون متن)
 *
 * @example
 * const closeBtn = createIconButton({
 *   icon: '✕',
 *   label: 'بستن',
 *   variant: 'ghost',
 *   onClick: () => close(),
 * });
 */
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