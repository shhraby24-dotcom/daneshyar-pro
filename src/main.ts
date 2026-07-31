/**
 * ============================================================
 * دانش‌یار پرو - نقطه شروع برنامه
 * ============================================================
 *
 * @module main
 * @version 1.0.0-beta.1
 */

import './style.css';
import { getInstance as getLogger } from '@/core/Logger';
import { getInstance as getEventBus } from '@/core/EventBus';
import { getStorage } from '@/core/Storage';
import { getState } from '@/core/State';
import { getRouter } from '@/core/Router';
import { getErrorHandler } from '@/core/Errors';
import { getLayout } from '@/ui/Layout';
import { createDashboardView } from '@/ui/views/DashboardView';
import { createNotesView } from '@/ui/views/NotesView';

// ============================================================
// مقداردهی اولیه ماژول‌های Core
// ============================================================

const logger = getLogger({
  level: 'DEBUG',
  showTimestamp: true,
  persistToStorage: false,
});

getEventBus({ debug: false });
const storage = getStorage();
const state = getState();
const router = getRouter();
getErrorHandler();

logger.info('🚀 دانش‌یار پرو در حال راه‌اندازی...');

// ============================================================
// تابع اصلی Bootstrap
// ============================================================

async function bootstrap(): Promise<void> {
  try {
    // مرحله ۱: آماده‌سازی DOM
    logger.info('📦 مرحله ۱: آماده‌سازی DOM');
    const app = document.createElement('div');
    app.id = 'app';
    document.body.innerHTML = '';
    document.body.appendChild(app);

    // مرحله ۲: بارگذاری State
    logger.info('📦 مرحله ۲: بارگذاری State');
    await state.load();
    logger.info('✅ State بارگذاری شد', { ready: state.isReady() });

    // مرحله ۳: تنظیم Container برای Router
    logger.info('📦 مرحله ۳: رندر Layout');
    const layoutEl = getLayout().render();
    app.appendChild(layoutEl);

    logger.info('📦 مرحله ۴: تنظیم Router');
    router.setContainer('#main-content');

    // مرحله ۴: ثبت View ها
    logger.info('📦 مرحله ۴: ثبت View ها');
    registerViews();

    // مرحله ۵: شروع Router
    logger.info('📦 مرحله ۵: شروع Router');
    await router.start();

    // مرحله ۶: آماده!
    logger.info('✅ دانش‌یار پرو آماده است!');
    logger.info('📊 آمار Storage', storage.getStats());

  } catch (error) {
    logger.error('❌ خطا در راه‌اندازی برنامه', error);
    showFatalError(error);
  }
}

// ============================================================
// ثبت View ها (موقت - بعداً با View های واقعی جایگزین می‌شود)
// ============================================================

// ============================================================
// Placeholder برای View هایی که هنوز منتقل نشده‌اند
// ============================================================

function createComingSoonView(title: string, icon: string, description: string) {
  return () => {
    const div = document.createElement('div');
    div.className = 'min-h-[70vh] flex items-center justify-center p-8 fade-in';
    div.innerHTML = `
      <div class="text-center max-w-md">
        <div class="w-24 h-24 mx-auto mb-6 rounded-full bg-primary-500/10 border border-primary-500/30 flex items-center justify-center text-5xl pulse-ring">
          ${icon}
        </div>
        <h1 class="text-3xl font-black text-slate-100 mb-3">${title}</h1>
        <p class="text-slate-400 text-lg leading-relaxed mb-2">${description}</p>
        <p class="text-slate-500 text-sm mb-8">این بخش به‌زودی تکمیل می‌شود 🚧</p>
        <button onclick="location.hash = '#/dashboard'" class="btn btn-primary">
          ← بازگشت به داشبورد
        </button>
      </div>
    `;
    return div;
  };
}

  // ── View های placeholder (تا وقتی View اصلی ساخته شود) ──
  router.registerView('summarizer', createComingSoonView('خلاصه‌ساز', '✨', 'متن‌های طولانی را به خلاصه‌های مفید تبدیل کن.'));
  router.registerView('quiz', createComingSoonView('آزمون‌ساز', '📝', 'از هر متنی، آزمون هوشمند بساز.'));
  router.registerView('flashcards', createComingSoonView('فلش‌کارت', '🃏', 'با تکرار با فاصله، ماندگار یاد بگیر.'));
  router.registerView('notes', createNotesView);
  router.registerView('translator', createComingSoonView('مترجم', '🌐', 'ترجمه هوشمند متن‌های تخصصی.'));
  router.registerView('calculator', createComingSoonView('ماشین‌حساب', '🧮', 'محاسبات سریع علمی.'));
  router.registerView('pomodoro', createComingSoonView('پومودورو', '⏱️', 'با تکنیک پومودورو، متمرکز کار کن.'));
  router.registerView('settings', createComingSoonView('تنظیمات', '⚙️', 'برنامه را شخصی‌سازی کن.'));
  
function registerViews(): void {
  router.registerView('dashboard', createDashboardView);

  router.setNotFound((params) => {
    const div = document.createElement('div');
    div.className = 'min-h-screen bg-slate-900 flex items-center justify-center p-8';
    div.innerHTML = `
      <div class="text-center">
        <div class="text-7xl mb-4">🔍</div>
        <h1 class="text-3xl font-bold text-white mb-2">صفحه یافت نشد</h1>
        <p class="text-slate-400 mb-6">مسیر "${String(params.route ?? '')}" وجود ندارد</p>
        <button onclick="location.hash = '#/dashboard'"
                class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition">
          بازگشت به داشبورد
        </button>
      </div>
    `;
    return div;
  });
}

// ============================================================
// صفحه خطای بحرانی
// ============================================================

function showFatalError(error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div class="min-h-screen bg-slate-900 flex items-center justify-center p-8">
        <div class="bg-red-900/20 border border-red-700 rounded-xl p-8 max-w-lg text-center">
          <div class="text-5xl mb-4">💀</div>
          <h2 class="text-xl font-bold text-red-400 mb-2">خطای بحرانی</h2>
          <p class="text-slate-300 mb-4">${errorMessage}</p>
          <button onclick="location.reload()"
                  class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition">
            تلاش مجدد
          </button>
        </div>
      </div>
    `;
  }
}

// ============================================================
// اجرای برنامه
// ============================================================

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



// ============================================================
// تست Dashboard - کاشت داده دمو (موقت)
// ============================================================

import { getDatabase } from '@/core/Database';

async function seedDemoData(): Promise<void> {
  const db = getDatabase();
  await db.init();

  const existing = await db.getNotes();
  if (existing.length > 0) {
    logger.info('⏭️ داده دمو از قبل وجود دارد');
    return;
  }

  logger.info('🌱 در حال کاشت داده دمو...');
  const now = Date.now();
  const DAY = 86400000;

  // یادداشت‌ها
  const noteSamples = [
    { title: 'جزوه ریاضی — مشتق', content: 'مشتق تابع y=x^n برابر است با y\'=nx^(n-1). برای توابع مرکب از قاعده زنجیره‌ای استفاده می‌کنیم.' },
    { title: 'خلاصه فصل ۳ فیزیک', content: 'قانون دوم نیوتن: F=ma. نیروی خالص وارد بر جسم برابر است با جرم ضرب در شتاب.' },
    { title: 'لغات انگلیسی — درس ۵', content: 'abundant: فراوان، benevolent: خیرخواه، candid: صریح و صادق.' },
    { title: 'تاریخ — انقلاب مشروطه', content: 'انقلاب مشروطه در سال ۱۲۸۵ شمسی آغاز شد و منجر به تأسیس مجلس شورای ملی گردید.' },
    { title: 'شیمی — جدول تناوبی', content: 'عناصر در جدول تناوبی بر اساس عدد اتمی مرتب شده‌اند.' },
  ];
  for (let i = 0; i < noteSamples.length; i++) {
    const s = noteSamples[i];
    if (!s) continue;
    await db.addNote({
      id: `demo-note-${i}`,
      title: s.title,
      content: s.content,
      createdAt: new Date(now - i * DAY).toISOString(),
      updatedAt: new Date(now - i * DAY).toISOString(),
    });
  }

  // فلش‌کارت‌ها (۴ تا آماده مرور، بقیه بعداً)
  const cardSamples = [
    { front: 'مشتق x² چیست؟', back: '2x' },
    { front: 'قانون دوم نیوتن؟', back: 'F = ma' },
    { front: 'پایتخت فرانسه؟', back: 'پاریس' },
    { front: 'H₂O چیست؟', back: 'آب' },
    { front: 'جذر ۱۴۴؟', back: '۱۲' },
    { front: 'بزرگ‌ترین سیاره؟', back: 'مشتری' },
  ];
  for (let i = 0; i < cardSamples.length; i++) {
    const s = cardSamples[i];
    if (!s) continue;
    const dueOffset = i < 4 ? -3600000 : (i - 3) * DAY;
    await db.addFlashcard({
      id: `demo-card-${i}`,
      front: s.front,
      back: s.back,
      deck: 'دمو',
      createdAt: new Date(now - 7 * DAY).toISOString(),
      nextReview: new Date(now + dueOffset).toISOString(),
      interval: 1,
      easeFactor: 2.5,
      repetitions: 1,
    });
  }

  // نتایج آزمون
  for (let i = 0; i < 3; i++) {
    await db.addQuizResult({
      id: `demo-quiz-${i}`,
      title: `آزمون ریاضی ${i + 1}`,
      date: new Date(now - (i + 1) * 2 * DAY).toISOString(),
      totalQuestions: 10,
      correct: 7 + i,
      wrong: 3 - i,
      unanswered: 0,
      percentage: 70 + i * 10,
      timeSpent: 300 + i * 60,
    });
  }

  // جلسات مطالعه (۲۵ روز اخیر، با چند روز خالی برای واقع‌گرایی)
  for (let d = 0; d < 25; d++) {
    if (d >= 6 && (d % 5 === 2 || d % 7 === 4)) continue;
    await db.logStudySession('demo', {
      date: new Date(now - d * DAY).toISOString(),
      duration: 25 + (d % 3) * 10,
    });
  }

  logger.info('✅ داده دمو کاشته شد! صفحه را رفرش کن');
}

bootstrap();

// کاشت داده دمو (فقط یک بار)
setTimeout(() => {
  seedDemoData().catch((e) => logger.error('خطا در کاشت دمو', e));
}, 500);