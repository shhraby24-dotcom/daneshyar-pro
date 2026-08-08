/**
 * دانش‌یار پرو - کامپوننت‌های ورودی (Input Components)
 * توابع کمکی برای ساخت input, textarea, select, checkbox با استایل یکپارچه
 * @module ui/components/Input
 */

/**
 * ساخت یک input text استاندارد
 * 
 * @param {Object} options
 * @param {string} [options.type='text'] - نوع input (text, email, password, number, ...)
 * @param {string} [options.placeholder] - placeholder
 * @param {string} [options.value] - مقدار اولیه
 * @param {string} [options.id] - شناسه
 * @param {string} [options.name] - نام
 * @param {boolean} [options.disabled] - غیرفعال
 * @param {boolean} [options.readonly] - فقط خواندنی
 * @param {boolean} [options.required] - الزامی
 * @param {string} [options.className] - کلاس اضافی
 * @param {Function} [options.onInput] - تابع هنگام تایپ
 * @param {Function} [options.onChange] - تابع هنگام تغییر
 * @param {Function} [options.onFocus] - تابع هنگام فوکوس
 * @param {Function} [options.onBlur] - تابع هنگام از دست دادن فوکوس
 * @returns {HTMLInputElement}
 */
export function createInput(options = {}) {
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
    onBlur = null
  } = options;

  const input = document.createElement('input');
  input.type = type;
  input.className = `
    w-full bg-slate-800 border border-slate-700 rounded-lg
    px-4 py-2.5 text-sm text-slate-100
    placeholder:text-slate-500
    focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
    ${className}
  `.replace(/\s+/g, ' ').trim();

  if (placeholder) input.placeholder = placeholder;
  if (value) input.value = value;
  if (id) input.id = id;
  if (name) input.name = name;
  if (disabled) input.disabled = true;
  if (readonly) input.readOnly = true;
  if (required) input.required = true;

  // اتصال event ها
  if (onInput) input.addEventListener('input', onInput);
  if (onChange) input.addEventListener('change', onChange);
  if (onFocus) input.addEventListener('focus', onFocus);
  if (onBlur) input.addEventListener('blur', onBlur);

  return input;
}

/**
 * ساخت textarea استاندارد
 * 
 * @param {Object} options
 * @param {string} [options.placeholder]
 * @param {string} [options.value]
 * @param {number} [options.rows=4]
 * @param {boolean} [options.resize=true] - امکان تغییر اندازه
 * @param {string} [options.id]
 * @param {string} [options.name]
 * @param {boolean} [options.disabled]
 * @param {boolean} [options.required]
 * @param {string} [options.className]
 * @param {Function} [options.onInput]
 * @param {Function} [options.onChange]
 * @returns {HTMLTextAreaElement}
 */
export function createTextarea(options = {}) {
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
    onChange = null
  } = options;

  const textarea = document.createElement('textarea');
  textarea.className = `
    w-full bg-slate-800 border border-slate-700 rounded-lg
    px-4 py-3 text-sm text-slate-100 leading-relaxed
    placeholder:text-slate-500
    focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
    ${resize ? 'resize-y' : 'resize-none'}
    ${className}
  `.replace(/\s+/g, ' ').trim();

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
 * ساخت select (dropdown) استاندارد
 * 
 * @param {Object} options
 * @param {Array<{value: string, label: string, disabled?: boolean}>} options.options - گزینه‌ها
 * @param {string} [options.value] - مقدار انتخاب شده
 * @param {string} [options.placeholder] - گزینه placeholder
 * @param {string} [options.id]
 * @param {string} [options.name]
 * @param {boolean} [options.disabled]
 * @param {boolean} [options.required]
 * @param {string} [options.className]
 * @param {Function} [options.onChange]
 * @returns {HTMLSelectElement}
 */
export function createSelect(options = {}) {
  const {
    options: selectOptions = [],
    value = '',
    placeholder = null,
    id = null,
    name = null,
    disabled = false,
    required = false,
    className = '',
    onChange = null
  } = options;

  const select = document.createElement('select');
  select.className = `
    w-full bg-slate-800 border border-slate-700 rounded-lg
    px-4 py-2.5 text-sm text-slate-100
    focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
    cursor-pointer
    ${className}
  `.replace(/\s+/g, ' ').trim();

  if (id) select.id = id;
  if (name) select.name = name;
  if (disabled) select.disabled = true;
  if (required) select.required = true;

  // اضافه کردن placeholder
  if (placeholder) {
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    placeholderOption.disabled = true;
    placeholderOption.selected = !value;
    select.appendChild(placeholderOption);
  }

  // اضافه کردن گزینه‌ها
  selectOptions.forEach(opt => {
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
 * ساخت checkbox استاندارد
 * 
 * @param {Object} options
 * @param {string} [options.label] - متن کنار چک‌باکس
 * @param {boolean} [options.checked] - انتخاب شده
 * @param {string} [options.id]
 * @param {string} [options.name]
 * @param {boolean} [options.disabled]
 * @param {string} [options.className]
 * @param {Function} [options.onChange]
 * @returns {HTMLLabelElement}
 */
export function createCheckbox(options = {}) {
  const {
    label = '',
    checked = false,
    id = null,
    name = null,
    disabled = false,
    className = '',
    onChange = null
  } = options;

  const labelEl = document.createElement('label');
  labelEl.className = `
    inline-flex items-center gap-2 cursor-pointer
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `.replace(/\s+/g, ' ').trim();

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = `
    w-4 h-4 rounded border-slate-600 bg-slate-800
    text-primary-600 focus:ring-2 focus:ring-primary-500
    transition-colors
  `;
  
  if (id) input.id = id;
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
 * 
 * @param {Object} options
 * @param {string} options.name - نام گروه
 * @param {string} options.value
 * @param {string} [options.label]
 * @param {boolean} [options.checked]
 * @param {boolean} [options.disabled]
 * @param {Function} [options.onChange]
 * @returns {HTMLLabelElement}
 */
export function createRadio(options = {}) {
  const {
    name,
    value,
    label = '',
    checked = false,
    disabled = false,
    className = '',
    onChange = null
  } = options;

  const labelEl = document.createElement('label');
  labelEl.className = `
    inline-flex items-center gap-2 cursor-pointer
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `.replace(/\s+/g, ' ').trim();

  const input = document.createElement('input');
  input.type = 'radio';
  input.name = name;
  input.value = value;
  input.className = `
    w-4 h-4 border-slate-600 bg-slate-800
    text-primary-600 focus:ring-2 focus:ring-primary-500
  `;

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
 * ساخت گروه فرم (label + input + error message)
 * 
 * @param {Object} options
 * @param {string} options.label - متن label
 * @param {HTMLElement} options.input - عنصر ورودی
 * @param {string} [options.helpText] - متن راهنما
 * @param {string} [options.error] - پیام خطا
 * @param {boolean} [options.required]
 * @param {string} [options.className]
 * @returns {HTMLDivElement}
 */
export function createFormGroup(options = {}) {
  const {
    label,
    input,
    helpText = null,
    error = null,
    required = false,
    className = ''
  } = options;

  const group = document.createElement('div');
  group.className = `space-y-1.5 ${className}`;

  // Label
  if (label) {
    const labelEl = document.createElement('label');
    labelEl.className = 'block text-sm font-medium text-slate-300';
    if (input.id) labelEl.htmlFor = input.id;
    labelEl.innerHTML = `
      ${label}
      ${required ? '<span class="text-red-400 mr-1">*</span>' : ''}
    `;
    group.appendChild(labelEl);
  }

  // Input
  group.appendChild(input);

  // Help text
  if (helpText && !error) {
    const help = document.createElement('p');
    help.className = 'text-xs text-slate-500';
    help.textContent = helpText;
    group.appendChild(help);
  }

  // Error message
  if (error) {
    const errorEl = document.createElement('p');
    errorEl.className = 'text-xs text-red-400 flex items-center gap-1';
    errorEl.innerHTML = `<span>⚠️</span><span>${error}</span>`;
    group.appendChild(errorEl);

    // قرمز کردن input
    input.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500/20');
  }

  return group;
}

/**
 * ساخت input با قابلیت نمایش/مخفی کردن password
 * 
 * @param {Object} options
 * @returns {HTMLDivElement}
 */
export function createPasswordInput(options = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'relative';

  const input = createInput({
    ...options,
    type: 'password'
  });

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = `
    absolute left-3 top-1/2 -translate-y-1/2
    text-slate-400 hover:text-slate-200
    transition-colors
  `;
  toggleBtn.innerHTML = '👁️';
  toggleBtn.setAttribute('aria-label', 'نمایش رمز عبور');

  toggleBtn.addEventListener('click', () => {
    if (input.type === 'password') {
      input.type = 'text';
      toggleBtn.innerHTML = '🙈';
      toggleBtn.setAttribute('aria-label', 'مخفی کردن رمز عبور');
    } else {
      input.type = 'password';
      toggleBtn.innerHTML = '👁️';
      toggleBtn.setAttribute('aria-label', 'نمایش رمز عبور');
    }
  });

  wrapper.appendChild(input);
  wrapper.appendChild(toggleBtn);

  return wrapper;
}

/**
 * ساخت input جستجو با آیکون و دکمه پاک کردن
 * 
 * @param {Object} options
 * @param {Function} [options.onSearch] - تابع جستجو
 * @param {number} [options.debounceMs=300] - تأخیر debounce
 * @returns {HTMLDivElement}
 */
export function createSearchInput(options = {}) {
  const {
    placeholder = 'جستجو...',
    onSearch = null,
    debounceMs = 300,
    className = ''
  } = options;

  const wrapper = document.createElement('div');
  wrapper.className = `relative ${className}`;

  const input = createInput({
    placeholder,
    className: 'pr-10 pl-10'
  });

  // آیکون جستجو
  const searchIcon = document.createElement('span');
  searchIcon.className = 'absolute right-3 top-1/2 -translate-y-1/2 text-slate-400';
  searchIcon.innerHTML = '🔍';

  // دکمه پاک کردن
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = `
    absolute left-3 top-1/2 -translate-y-1/2
    text-slate-400 hover:text-slate-200
    transition-colors hidden
  `;
  clearBtn.innerHTML = '✕';
  clearBtn.setAttribute('aria-label', 'پاک کردن');

  let debounceTimer = null;

  input.addEventListener('input', () => {
    // نمایش/مخفی کردن دکمه پاک کردن
    if (input.value) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }

    // Debounce
    if (onSearch) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        onSearch(input.value);
      }, debounceMs);
    }
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.add('hidden');
    input.focus();
    if (onSearch) onSearch('');
  });

  wrapper.appendChild(input);
  wrapper.appendChild(searchIcon);
  wrapper.appendChild(clearBtn);

  return wrapper;
}

export default {
  createInput,
  createTextarea,
  createSelect,
  createCheckbox,
  createRadio,
  createFormGroup,
  createPasswordInput,
  createSearchInput
};