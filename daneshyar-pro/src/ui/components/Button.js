/**
 * دانش‌یار پرو - کامپوننت دکمه استاندارد
 * توابع کمکی برای ساخت دکمه‌ها با استایل یکپارچه
 * @module ui/components/Button
 */

/**
 * انواع دکمه (variant)
 */
export const BUTTON_VARIANTS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  GHOST: 'ghost',
  DANGER: 'danger',
  SUCCESS: 'success',
  ACCENT: 'accent'
};

/**
 * اندازه‌های دکمه
 */
export const BUTTON_SIZES = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg'
};

/**
 * کلاس‌های CSS برای هر variant
 */
const VARIANT_CLASSES = {
  [BUTTON_VARIANTS.PRIMARY]: 
    'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/20',
  [BUTTON_VARIANTS.SECONDARY]: 
    'bg-slate-700 hover:bg-slate-600 text-slate-100',
  [BUTTON_VARIANTS.GHOST]: 
    'bg-transparent hover:bg-slate-700 text-slate-300 border border-slate-600',
  [BUTTON_VARIANTS.DANGER]: 
    'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20',
  [BUTTON_VARIANTS.SUCCESS]: 
    'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20',
  [BUTTON_VARIANTS.ACCENT]: 
    'bg-accent-500 hover:bg-accent-600 text-white shadow-lg shadow-accent-500/20'
};

/**
 * کلاس‌های CSS برای هر اندازه
 */
const SIZE_CLASSES = {
  [BUTTON_SIZES.SM]: 'px-3 py-1.5 text-xs',
  [BUTTON_SIZES.MD]: 'px-4 py-2 text-sm',
  [BUTTON_SIZES.LG]: 'px-6 py-3 text-base'
};

/**
 * ساخت یک دکمه استاندارد
 * 
 * @param {Object} options
 * @param {string} options.label - متن دکمه
 * @param {string} [options.variant='primary'] - نوع دکمه
 * @param {string} [options.size='md'] - اندازه دکمه
 * @param {string} [options.icon] - آیکون (emoji یا HTML) اختیاری
 * @param {string} [options.iconPosition='start'] - موقعیت آیکون (start/end)
 * @param {boolean} [options.fullWidth=false] - تمام عرض
 * @param {boolean} [options.disabled=false] - غیرفعال
 * @param {boolean} [options.loading=false] - در حال بارگذاری
 * @param {string} [options.type='button'] - نوع HTML (button/submit/reset)
 * @param {string} [options.id] - شناسه
 * @param {string} [options.className] - کلاس‌های اضافی
 * @param {Function} [options.onClick] - تابع کلیک
 * @returns {HTMLButtonElement}
 * 
 * @example
 * const btn = createButton({
 *   label: 'ذخیره',
 *   variant: 'primary',
 *   icon: '💾',
 *   onClick: () => save()
 * });
 * container.appendChild(btn);
 */
export function createButton(options = {}) {
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
    onClick = null
  } = options;

  const btn = document.createElement('button');
  btn.type = type;
  
  // ساخت کلاس‌ها
  const classes = [
    'inline-flex items-center justify-center gap-2',
    'font-medium rounded-lg',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-900',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    VARIANT_CLASSES[variant] || VARIANT_CLASSES[BUTTON_VARIANTS.PRIMARY],
    SIZE_CLASSES[size] || SIZE_CLASSES[BUTTON_SIZES.MD]
  ];

  if (fullWidth) classes.push('w-full');
  if (loading) classes.push('opacity-75 cursor-wait');
  if (className) classes.push(className);

  btn.className = classes.join(' ');

  if (id) btn.id = id;
  if (disabled || loading) btn.disabled = true;

  // ساخت محتوا
  const labelSpan = document.createElement('span');
  labelSpan.textContent = label;

  if (loading) {
    // نمایش spinner به جای آیکون
    const spinner = document.createElement('span');
    spinner.className = 'inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin';
    btn.appendChild(spinner);
    btn.appendChild(labelSpan);
  } else if (icon) {
    const iconSpan = document.createElement('span');
    iconSpan.className = 'inline-flex';
    iconSpan.innerHTML = icon;

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

  // اتصال onClick
  if (onClick && typeof onClick === 'function') {
    btn.addEventListener('click', async (e) => {
      if (btn.disabled) return;
      try {
        await onClick(e);
      } catch (error) {
        console.error('Button click error:', error);
      }
    });
  }

  return btn;
}

/**
 * ساخت گروهی از دکمه‌ها در یک container
 * 
 * @param {Array<Object>} buttons - آرایه‌ای از تنظیمات دکمه
 * @param {Object} [options] - تنظیمات container
 * @param {string} [options.className] - کلاس container
 * @param {string} [options.gap='gap-2'] - فاصله بین دکمه‌ها
 * @returns {HTMLDivElement}
 * 
 * @example
 * const group = createButtonGroup([
 *   { label: 'انصراف', variant: 'ghost' },
 *   { label: 'ذخیره', variant: 'primary', onClick: save }
 * ]);
 */
export function createButtonGroup(buttons, options = {}) {
  const {
    className = '',
    gap = 'gap-2'
  } = options;

  const container = document.createElement('div');
  container.className = `flex items-center ${gap} ${className}`.trim();

  buttons.forEach(btnConfig => {
    const btn = createButton(btnConfig);
    container.appendChild(btn);
  });

  return container;
}

/**
 * ساخت دکمه آیکونی (فقط آیکون، بدون متن)
 * 
 * @param {Object} options
 * @param {string} options.icon - آیکون
 * @param {string} [options.label] - label برای accessibility (aria-label)
 * @param {string} [options.variant='ghost']
 * @param {string} [options.size='md']
 * @param {Function} [options.onClick]
 * @returns {HTMLButtonElement}
 */
export function createIconButton(options = {}) {
  const {
    icon,
    label = '',
    variant = BUTTON_VARIANTS.GHOST,
    size = BUTTON_SIZES.MD,
    onClick = null,
    disabled = false,
    className = ''
  } = options;

  const sizeMap = {
    [BUTTON_SIZES.SM]: 'w-8 h-8 text-sm',
    [BUTTON_SIZES.MD]: 'w-10 h-10 text-base',
    [BUTTON_SIZES.LG]: 'w-12 h-12 text-lg'
  };

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `
    inline-flex items-center justify-center
    rounded-lg transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-primary-500
    disabled:opacity-50 disabled:cursor-not-allowed
    ${VARIANT_CLASSES[variant] || VARIANT_CLASSES[BUTTON_VARIANTS.GHOST]}
    ${sizeMap[size] || sizeMap[BUTTON_SIZES.MD]}
    ${className}
  `.replace(/\s+/g, ' ').trim();

  if (label) btn.setAttribute('aria-label', label);
  if (disabled) btn.disabled = true;

  const iconSpan = document.createElement('span');
  iconSpan.innerHTML = icon;
  btn.appendChild(iconSpan);

  if (onClick) {
    btn.addEventListener('click', async (e) => {
      if (btn.disabled) return;
      try {
        await onClick(e);
      } catch (error) {
        console.error('Icon button click error:', error);
      }
    });
  }

  return btn;
}

export default {
  createButton,
  createButtonGroup,
  createIconButton,
  BUTTON_VARIANTS,
  BUTTON_SIZES
};