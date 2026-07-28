/**
 * ============================================================
 * دانش‌یار پرو - کامپوننت‌های ورودی (Input)
 * ============================================================
 *
 * توابع کمکی برای ساخت input, textarea, select, checkbox, radio
 *
 * ✅ XSS-safe: همه متن‌های کاربر با textContent (نه innerHTML)
 * ✅ دکمه نمایش رمز بدون overlap (pe-10 + end-3)
 * ✅ چک‌باکس/رادیو با رنگ واقعی برند (accent-primary-600)
 * ✅ کلاس‌های منطقی RTL (start/end/ps/pe/ms)
 * ✅ جستجو با debounce + دکمه پاک‌کردن محو‌شونده
 * ✅ Type-safe کامل
 *
 * @module ui/components/Input
 * @version 1.0.0-beta.1
 */

// ============================================================
// Types
// ============================================================

export interface InputOptions {
  type?: string;
  placeholder?: string;
  value?: string;
  id?: string | null;
  name?: string | null;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  className?: string;
  onInput?: ((e: Event) => void) | null;
  onChange?: ((e: Event) => void) | null;
  onFocus?: ((e: FocusEvent) => void) | null;
  onBlur?: ((e: FocusEvent) => void) | null;
}

export interface TextareaOptions {
  placeholder?: string;
  value?: string;
  rows?: number;
  resize?: boolean;
  id?: string | null;
  name?: string | null;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  onInput?: ((e: Event) => void) | null;
  onChange?: ((e: Event) => void) | null;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectOptions {
  options?: SelectOption[];
  value?: string;
  placeholder?: string | null;
  id?: string | null;
  name?: string | null;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  onChange?: ((e: Event) => void) | null;
}

export interface CheckboxOptions {
  label?: string;
  checked?: boolean;
  id?: string | null;
  name?: string | null;
  disabled?: boolean;
  className?: string;
  onChange?: ((e: Event) => void) | null;
}

export interface RadioOptions {
  name: string;
  value: string;
  label?: string;
  checked?: boolean;
  id?: string | null;
  disabled?: boolean;
  className?: string;
  onChange?: ((e: Event) => void) | null;
}

export interface FormGroupOptions {
  label?: string | null;
  input: HTMLElement;
  helpText?: string | null;
  error?: string | null;
  required?: boolean;
  className?: string;
}

export type PasswordInputOptions = Omit<InputOptions, 'type'>;

export interface SearchInputOptions {
  placeholder?: string;
  onSearch?: ((value: string) => void) | null;
  debounceMs?: number;
  className?: string;
}

// ============================================================
// کلاس‌های پایه (تم‌پذیر از design-tokens)
// ============================================================

const INPUT_BASE =
  'w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 ' +
  'placeholder:text-slate-500 focus:outline-none focus:border-primary-500 focus:ring-2 ' +
  'focus:ring-primary-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

// ============================================================
// توابع ساخت
// ============================================================

/**
 * ساخت یک input استاندارد
 */
export function createInput(options: InputOptions = {}): HTMLInputElement {
  const {
    type = 'text',
    placeholder = '',
    value = '',
    id = null,
    name = null,
    disabled = false,
    readonly = false,
    required = false,
    className = '',
    onInput = null,
    onChange = null,
    onFocus = null,
    onBlur = null,
  } = options;

  const input = document.createElement('input');
  input.type = type;
  input.className = `${INPUT_BASE} ${className}`.trim();

  if (placeholder) input.placeholder = placeholder;
  if (value) input.value = value;
  if (id) input.id = id;
  if (name) input.name = name;
  if (disabled) input.disabled = true;
  if (readonly) input.readOnly = true;
  if (required) input.required = true;

  if (onInput) input.addEventListener('input', onInput);
  if (onChange) input.addEventListener('change', onChange);
  if (onFocus) input.addEventListener('focus', onFocus);
  if (onBlur) input.addEventListener('blur', onBlur);

  return input;
}

/**
 * ساخت textarea
 */
export function createTextarea(options: TextareaOptions = {}): HTMLTextAreaElement {
  const {
    placeholder = '',
    value = '',
    rows = 4,
    resize = true,
    id = null,
    name = null,
    disabled = false,
    required = false,
    className = '',
    onInput = null,
    onChange = null,
  } = options;

  const textarea = document.createElement('textarea');
  textarea.className = `${INPUT_BASE} leading-relaxed ${resize ? 'resize-y' : 'resize-none'} ${className}`.trim();
  textarea.rows = rows;

  if (placeholder) textarea.placeholder = placeholder;
  if (value) textarea.value = value;
  if (id) textarea.id = id;
  if (name) textarea.name = name;
  if (disabled) textarea.disabled = true;
  if (required) textarea.required = true;

  if (onInput) textarea.addEventListener('input', onInput);
  if (onChange) textarea.addEventListener('change', onChange);

  return textarea;
}

/**
 * ساخت select (dropdown)
 */
export function createSelect(options: SelectOptions = {}): HTMLSelectElement {
  const {
    options: selectOptions = [],
    value = '',
    placeholder = null,
    id = null,
    name = null,
    disabled = false,
    required = false,
    className = '',
    onChange = null,
  } = options;

  const select = document.createElement('select');
  select.className = `${INPUT_BASE} cursor-pointer ${className}`.trim();

  if (id) select.id = id;
  if (name) select.name = name;
  if (disabled) select.disabled = true;
  if (required) select.required = true;

  if (placeholder) {
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    placeholderOption.disabled = true;
    placeholderOption.selected = !value;
    select.appendChild(placeholderOption);
  }

  selectOptions.forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    if (opt.disabled) option.disabled = true;
    if (opt.value === value) option.selected = true;
    select.appendChild(option);
  });

  if (onChange) select.addEventListener('change', onChange);

  return select;
}

/**
 * ساخت checkbox (با رنگ واقعی برند)
 */
export function createCheckbox(options: CheckboxOptions = {}): HTMLLabelElement {
  const {
    label = '',
    checked = false,
    id = null,
    name = null,
    disabled = false,
    className = '',
    onChange = null,
  } = options;

  const labelEl = document.createElement('label');
  labelEl.className = `inline-flex items-center gap-2 cursor-pointer select-none ${
    disabled ? 'opacity-50 cursor-not-allowed' : ''
  } ${className}`.trim();

  const input = document.createElement('input');
  input.type = 'checkbox';
  // ⭐ accent-primary-600 = رنگ واقعی برند (نه text-* که روی checkbox اثر ندارد)
  input.className =
    'w-4 h-4 rounded border-slate-600 bg-slate-800 accent-primary-600 focus:ring-2 focus:ring-primary-500 transition-colors cursor-pointer';

  if (id) {
    input.id = id;
    labelEl.htmlFor = id;
  }
  if (name) input.name = name;
  if (checked) input.checked = true;
  if (disabled) input.disabled = true;

  labelEl.appendChild(input);

  if (label) {
    const span = document.createElement('span');
    span.className = 'text-sm text-slate-300';
    span.textContent = label;
    labelEl.appendChild(span);
  }

  if (onChange) input.addEventListener('change', onChange);

  return labelEl;
}

/**
 * ساخت radio button
 */
export function createRadio(options: RadioOptions): HTMLLabelElement {
  const {
    name,
    value,
    label = '',
    checked = false,
    id = null,
    disabled = false,
    className = '',
    onChange = null,
  } = options;

  const labelEl = document.createElement('label');
  labelEl.className = `inline-flex items-center gap-2 cursor-pointer select-none ${
    disabled ? 'opacity-50 cursor-not-allowed' : ''
  } ${className}`.trim();

  const input = document.createElement('input');
  input.type = 'radio';
  input.name = name;
  input.value = value;
  input.className =
    'w-4 h-4 border-slate-600 bg-slate-800 accent-primary-600 focus:ring-2 focus:ring-primary-500 cursor-pointer';

  if (id) {
    input.id = id;
    labelEl.htmlFor = id;
  }
  if (checked) input.checked = true;
  if (disabled) input.disabled = true;

  labelEl.appendChild(input);

  if (label) {
    const span = document.createElement('span');
    span.className = 'text-sm text-slate-300';
    span.textContent = label;
    labelEl.appendChild(span);
  }

  if (onChange) input.addEventListener('change', onChange);

  return labelEl;
}

/**
 * ساخت گروه فرم (label + input + راهنما/خطا)
 * ⭐ XSS-safe: همه متن‌ها با textContent
 */
export function createFormGroup(options: FormGroupOptions): HTMLDivElement {
  const { label, input, helpText = null, error = null, required = false, className = '' } = options;

  const group = document.createElement('div');
  group.className = `space-y-1.5 ${className}`.trim();

  // ── Label (XSS-safe) ──
  if (label) {
    const labelEl = document.createElement('label');
    labelEl.className = 'block text-sm font-medium text-slate-300';
    if (input.id) labelEl.htmlFor = input.id;

    const labelText = document.createElement('span');
    labelText.textContent = label;
    labelEl.appendChild(labelText);

    if (required) {
      const reqSpan = document.createElement('span');
      reqSpan.className = 'text-red-400 ms-1';
      reqSpan.textContent = '*';
      reqSpan.setAttribute('aria-hidden', 'true');
      labelEl.appendChild(reqSpan);
    }

    group.appendChild(labelEl);
  }

  // ── Input ──
  group.appendChild(input);

  // ── Help text (فقط اگر خطا نباشد) ──
  if (helpText && !error) {
    const help = document.createElement('p');
    help.className = 'text-xs text-slate-500';
    help.textContent = helpText;
    group.appendChild(help);
  }

  // ── Error message (XSS-safe) ──
  if (error) {
    const errorEl = document.createElement('p');
    errorEl.className = 'text-xs text-red-400 flex items-center gap-1';
    errorEl.setAttribute('role', 'alert');

    const warnIcon = document.createElement('span');
    warnIcon.textContent = '⚠️';
    warnIcon.setAttribute('aria-hidden', 'true');
    errorEl.appendChild(warnIcon);

    const errorText = document.createElement('span');
    errorText.textContent = error;
    errorEl.appendChild(errorText);

    group.appendChild(errorEl);

    // قرمز کردن input
    input.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500/20');
  }

  return group;
}

/**
 * ساخت input رمز عبور با دکمه نمایش/مخفی
 * ⭐ بدون overlap: input دارای pe-10 و دکمه در end-3
 */
export function createPasswordInput(options: PasswordInputOptions = {}): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'relative';

  const input = createInput({
    ...options,
    type: 'password',
    className: `pe-10 ${options.className ?? ''}`.trim(),
  });

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className =
    'absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors text-base';
  toggleBtn.textContent = '👁️';
  toggleBtn.setAttribute('aria-label', 'نمایش رمز عبور');

  toggleBtn.addEventListener('click', () => {
    if (input.type === 'password') {
      input.type = 'text';
      toggleBtn.textContent = '🙈';
      toggleBtn.setAttribute('aria-label', 'مخفی کردن رمز عبور');
    } else {
      input.type = 'password';
      toggleBtn.textContent = '👁️';
      toggleBtn.setAttribute('aria-label', 'نمایش رمز عبور');
    }
    input.focus();
  });

  wrapper.appendChild(input);
  wrapper.appendChild(toggleBtn);

  return wrapper;
}

/**
 * ساخت input جستجو با آیکون + دکمه پاک‌کردن + debounce
 */
export function createSearchInput(options: SearchInputOptions = {}): HTMLDivElement {
  const { placeholder = 'جستجو...', onSearch = null, debounceMs = 300, className = '' } = options;

  const wrapper = document.createElement('div');
  wrapper.className = `relative ${className}`.trim();

  const input = createInput({
    placeholder,
    className: 'ps-10 pe-10',
  });

  // آیکون جستجو (سمت start = راست در RTL)
  const searchIcon = document.createElement('span');
  searchIcon.className = 'absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none';
  searchIcon.textContent = '🔍';
  searchIcon.setAttribute('aria-hidden', 'true');

  // دکمه پاک‌کردن (سمت end = چپ در RTL) - با fade
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className =
    'absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 ' +
    'transition-all duration-200 opacity-0 pointer-events-none';
  clearBtn.textContent = '✕';
  clearBtn.setAttribute('aria-label', 'پاک کردن');

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  input.addEventListener('input', () => {
    // نمایش/مخفی دکمه پاک‌کردن (با fade)
    if (input.value) {
      clearBtn.classList.remove('opacity-0', 'pointer-events-none');
    } else {
      clearBtn.classList.add('opacity-0', 'pointer-events-none');
    }

    // Debounce (فقط اگر input هنوز در DOM باشد)
    if (onSearch) {
      if (debounceTimer !== null) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (document.body.contains(input)) {
          onSearch(input.value);
        }
      }, debounceMs);
    }
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.add('opacity-0', 'pointer-events-none');
    input.focus();
    if (onSearch) onSearch('');
  });

  wrapper.appendChild(input);
  wrapper.appendChild(searchIcon);
  wrapper.appendChild(clearBtn);

  return wrapper;
}