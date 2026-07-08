/**
 * دانش‌یار پرو - View تنظیمات
 * مدیریت تنظیمات برنامه، Import/Export و داده‌ها
 * @module ui/views/SettingsView
 */

import state from '../../core/State.js';
import storage from '../../core/Storage.js';
import router from '../router.js';
import LoggerModule from '../../core/Logger.js';
import EventBusModule from '../../core/EventBus.js';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '../components/Button.js';
import { createCheckbox } from '../components/Input.js';
import toast from '../components/Toast.js';
import modal from '../components/Modal.js';

const logger = LoggerModule.getInstance().module('SettingsView');

/**
 * ساخت View تنظیمات
 * @returns {HTMLElement}
 */
export function createSettingsView() {
  logger.info('رندر تنظیمات');

  const container = document.createElement('div');
  container.className = 'space-y-6 fade-in max-w-4xl mx-auto';

  // Header
  container.appendChild(createHeader());

  // بخش ۱: ظاهر
  container.appendChild(createAppearanceSection());

  // بخش ۲: تنظیمات آزمون
  container.appendChild(createQuizSettingsSection());

  // بخش ۳: مدیریت داده‌ها
  container.appendChild(createDataManagementSection());

  // بخش ۴: آمار ذخیره‌سازی
  container.appendChild(createStorageStatsSection());

  // بخش ۵: درباره
  container.appendChild(createAboutSection());

  return container;
}

/**
 * Header صفحه
 */
function createHeader() {
  const header = document.createElement('div');
  header.innerHTML = `
    <div>
      <h1 class="text-3xl font-bold text-slate-100 mb-2 flex items-center gap-3">
        <span class="text-4xl">⚙️</span>
        تنظیمات
      </h1>
      <p class="text-slate-400">
        برنامه را مطابق سلیقه خود شخصی‌سازی و داده‌ها را مدیریت کنید
      </p>
    </div>
  `;
  return header;
}

/**
 * بخش ظاهر (Theme)
 */
function createAppearanceSection() {
  const section = createSectionCard('🎨', 'ظاهر برنامه', 'تنظیمات نمایش و رنگ‌بندی');

  const content = document.createElement('div');
  content.className = 'space-y-4';

  // Theme Selector
  const themeLabel = document.createElement('label');
  themeLabel.className = 'block text-sm font-medium text-slate-300 mb-2';
  themeLabel.textContent = 'حالت رنگی';
  content.appendChild(themeLabel);

  const themeButtons = document.createElement('div');
  themeButtons.className = 'grid grid-cols-2 gap-3';

  const currentTheme = state.get('settings').theme;

  // Dark Theme Button
  const darkBtn = document.createElement('button');
  darkBtn.className = `p-4 rounded-lg border-2 transition-all ${
    currentTheme === 'dark' 
      ? 'border-primary-500 bg-slate-800' 
      : 'border-slate-700 bg-slate-900 hover:border-slate-600'
  }`;
  darkBtn.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="text-2xl">🌙</div>
      <div class="text-right">
        <div class="font-semibold text-slate-100">تاریک</div>
        <div class="text-xs text-slate-400">پیش‌فرض</div>
      </div>
    </div>
  `;
  darkBtn.onclick = () => changeTheme('dark');
  themeButtons.appendChild(darkBtn);

  // Light Theme Button
  const lightBtn = document.createElement('button');
  lightBtn.className = `p-4 rounded-lg border-2 transition-all ${
    currentTheme === 'light' 
      ? 'border-primary-500 bg-slate-800' 
      : 'border-slate-700 bg-slate-900 hover:border-slate-600'
  }`;
  lightBtn.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="text-2xl">☀️</div>
      <div class="text-right">
        <div class="font-semibold text-slate-100">روشن</div>
        <div class="text-xs text-slate-400">مناسب روز</div>
      </div>
    </div>
  `;
  lightBtn.onclick = () => changeTheme('light');
  themeButtons.appendChild(lightBtn);

  content.appendChild(themeButtons);

  section.appendChild(content);
  return section;
}

/**
 * تغییر تم
 */
function changeTheme(newTheme) {
  const currentTheme = state.get('settings').theme;
  if (currentTheme === newTheme) return;

  state.updateSettings({ theme: newTheme });
  toast.success(`تم به "${newTheme === 'dark' ? 'تاریک' : 'روشن'}" تغییر کرد`);

  // رندر مجدد صفحه
  setTimeout(() => router.navigate('settings'), 300);
}

/**
 * بخش تنظیمات آزمون
 */
function createQuizSettingsSection() {
  const section = createSectionCard('📝', 'تنظیمات آزمون', 'قوانین و شرایط آزمون‌ها');

  const content = document.createElement('div');
  content.className = 'space-y-4';

  const settings = state.get('settings');

  // نمره منفی
  const negMarking = createCheckbox({
    label: 'اعمال نمره منفی (هر ۳ غلط = ۱ صحیح کسر می‌شود، مانند کنکور)',
    checked: settings.negativeMarking,
    onChange: (e) => {
      state.updateSettings({ negativeMarking: e.target.checked });
      toast.success('تنظیم ذخیره شد');
    }
  });
  content.appendChild(negMarking);

  // توضیح
  const infoBox = document.createElement('div');
  infoBox.className = 'bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-xs text-slate-400 leading-relaxed';
  infoBox.innerHTML = `
    <div class="flex gap-2">
      <span class="text-primary-400">ℹ️</span>
      <div>
        <strong class="text-slate-300">نمره منفی:</strong>
        این گزینه دقیقاً مانند کنکور سراسری عمل می‌کند.
        اگر فعال باشد، پاسخ غلط نمره کسر می‌کند.
        مناسب برای تمرین در شرایط واقعی آزمون.
      </div>
    </div>
  `;
  content.appendChild(infoBox);

  // تعداد پیش‌فرض سوالات
  const countWrapper = document.createElement('div');
  countWrapper.innerHTML = `
    <label class="block text-sm font-medium text-slate-300 mb-2">
      تعداد پیش‌فرض سوالات در آزمون
    </label>
    <div class="flex items-center gap-3">
      <input type="range" min="5" max="30" step="5" value="${settings.defaultQuizCount}"
             class="flex-1 accent-primary-500" id="quiz-count-range">
      <span class="text-primary-400 font-bold w-12 text-center bg-slate-800 py-1 rounded" id="quiz-count-value">
        ${settings.defaultQuizCount}
      </span>
    </div>
  `;
  content.appendChild(countWrapper);

  setTimeout(() => {
    const range = document.getElementById('quiz-count-range');
    const value = document.getElementById('quiz-count-value');
    if (range && value) {
      range.oninput = (e) => {
        value.textContent = e.target.value;
      };
      range.onchange = (e) => {
        state.updateSettings({ defaultQuizCount: parseInt(e.target.value) });
        toast.success('تعداد پیش‌فرض ذخیره شد');
      };
    }
  }, 0);

  section.appendChild(content);
  return section;
}

/**
 * بخش مدیریت داده‌ها
 */
function createDataManagementSection() {
  const section = createSectionCard('💾', 'مدیریت داده‌ها', 'پشتیبان‌گیری و بازیابی اطلاعات');

  const content = document.createElement('div');
  content.className = 'space-y-3';

  // دکمه Export
  const exportCard = document.createElement('div');
  exportCard.className = 'bg-slate-900/50 border border-slate-700 rounded-lg p-4 flex items-center gap-4';
  exportCard.innerHTML = `
    <div class="text-3xl">📥</div>
    <div class="flex-1">
      <div class="font-semibold text-slate-100 mb-1">خروجی گرفتن از داده‌ها</div>
      <div class="text-xs text-slate-400">
        همه یادداشت‌ها، فلش‌کارت‌ها و تاریخچه آزمون‌ها در یک فایل JSON ذخیره می‌شوند
      </div>
    </div>
  `;
  const exportBtn = createButton({
    label: 'خروجی',
    variant: BUTTON_VARIANTS.PRIMARY,
    size: BUTTON_SIZES.SM,
    onClick: handleExport
  });
  exportCard.appendChild(exportBtn);
  content.appendChild(exportCard);

  // دکمه Import
  const importCard = document.createElement('div');
  importCard.className = 'bg-slate-900/50 border border-slate-700 rounded-lg p-4 flex items-center gap-4';
  importCard.innerHTML = `
    <div class="text-3xl">📤</div>
    <div class="flex-1">
      <div class="font-semibold text-slate-100 mb-1">بازیابی از فایل پشتیبان</div>
      <div class="text-xs text-slate-400">
        داده‌های قبلی را از یک فایل JSON وارد کنید (داده‌های فعلی حفظ می‌شوند)
      </div>
    </div>
  `;
  const importBtn = createButton({
    label: 'ورودی',
    variant: BUTTON_VARIANTS.ACCENT,
    size: BUTTON_SIZES.SM,
    onClick: handleImport
  });
  importCard.appendChild(importBtn);
  content.appendChild(importCard);

  // دکمه حذف همه
  const resetCard = document.createElement('div');
  resetCard.className = 'bg-red-950/30 border border-red-900/50 rounded-lg p-4 flex items-center gap-4';
  resetCard.innerHTML = `
    <div class="text-3xl">⚠️</div>
    <div class="flex-1">
      <div class="font-semibold text-red-300 mb-1">حذف همه داده‌ها</div>
      <div class="text-xs text-red-400/70">
        این عمل غیرقابل بازگشت است! حتماً قبل از آن خروجی بگیرید
      </div>
    </div>
  `;
  const resetBtn = createButton({
    label: 'حذف کامل',
    variant: BUTTON_VARIANTS.DANGER,
    size: BUTTON_SIZES.SM,
    onClick: handleReset
  });
  resetCard.appendChild(resetBtn);
  content.appendChild(resetCard);

  section.appendChild(content);
  return section;
}

/**
 * Export داده‌ها
 */
async function handleExport() {
  try {
    toast.info('در حال آماده‌سازی فایل پشتیبان...');
    logger.time('export');

    const data = {
      app: 'Daneshyar Pro',
      version: '8.0.0',
      exportedAt: new Date().toISOString(),
      notes: state.get('notes') || [],
      flashcards: state.get('flashcards') || [],
      quizHistory: state.get('quizHistory') || [],
      studySessions: state.get('studySessions') || [],
      settings: state.get('settings') || {}
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `daneshyar-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    logger.timeEnd('export');
    toast.success(
      `${data.notes.length} یادداشت و ${data.flashcards.length} فلش‌کارت در فایل پشتیبان ذخیره شد`,
      'خروجی موفق'
    );
  } catch (error) {
    logger.error('خطا در export', error);
    toast.error('خطا در ایجاد فایل پشتیبان: ' + error.message);
  }
}

/**
 * Import داده‌ها
 */
async function handleImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // اعتبارسنجی
      if (data.app !== 'Daneshyar Pro') {
        throw new Error('فایل پشتیبان معتبر نیست');
      }

      // نمایش پیش‌نمایش
      const preview = document.createElement('div');
      preview.className = 'space-y-3';
      preview.innerHTML = `
        <div class="bg-slate-900/50 rounded-lg p-4 space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">یادداشت‌ها:</span>
            <span class="font-bold text-slate-100">${(data.notes || []).length}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">فلش‌کارت‌ها:</span>
            <span class="font-bold text-slate-100">${(data.flashcards || []).length}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">تاریخچه آزمون‌ها:</span>
            <span class="font-bold text-slate-100">${(data.quizHistory || []).length}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">تاریخ پشتیبان:</span>
            <span class="font-bold text-slate-100">${new Date(data.exportedAt).toLocaleDateString('fa-IR')}</span>
          </div>
        </div>
        <p class="text-xs text-slate-400">
          ⚠️ داده‌های وارد شده به داده‌های فعلی اضافه می‌شوند (جایگزین نمی‌شوند).
        </p>
      `;

      const confirmed = await modal.confirm(
        'تایید بازیابی',
        '',
        { confirmText: 'بله، بازیابی کن' }
      );

      // چون modal.confirm فقط message string می‌گیرد، از modal.open استفاده می‌کنیم
      // این را با modal.open جایگزین می‌کنیم:

      modal.open({
        title: 'تایید بازیابی داده‌ها',
        content: preview,
        size: 'md',
        buttons: [
          {
            label: 'انصراف',
            type: 'ghost',
            onClick: () => modal.close()
          },
          {
            label: 'بله، بازیابی کن',
            type: 'primary',
            onClick: async () => {
              modal.close();
              await performImport(data);
            }
          }
        ]
      });

    } catch (error) {
      logger.error('خطا در import', error);
      toast.error('فایل نامعتبر یا خراب: ' + error.message);
    }
  };

  input.click();
}

/**
 * انجام Import واقعی
 */
async function performImport(data) {
  try {
    toast.info('در حال بازیابی داده‌ها...');

    let importedNotes = 0;
    let importedCards = 0;
    let importedQuizzes = 0;

    // Import یادداشت‌ها
    if (Array.isArray(data.notes)) {
      for (const note of data.notes) {
        // بررسی تکراری نبودن
        const exists = state.get('notes').some(n => n.id === note.id);
        if (!exists) {
          state.addNote(note);
          importedNotes++;
        }
      }
    }

    // Import فلش‌کارت‌ها
    if (Array.isArray(data.flashcards)) {
      for (const card of data.flashcards) {
        const exists = state.get('flashcards').some(f => f.id === card.id);
        if (!exists) {
          state.addFlashcard(card);
          importedCards++;
        }
      }
    }

    // Import تاریخچه
    if (Array.isArray(data.quizHistory)) {
      for (const quiz of data.quizHistory) {
        const exists = state.get('quizHistory').some(q => q.id === quiz.id);
        if (!exists) {
          state.addQuizResult(quiz);
          importedQuizzes++;
        }
      }
    }

    toast.success(
      `${importedNotes} یادداشت، ${importedCards} فلش‌کارت و ${importedQuizzes} آزمون بازیابی شد`,
      'بازیابی موفق'
    );

    logger.info('Import موفق', { importedNotes, importedCards, importedQuizzes });
  } catch (error) {
    logger.error('خطا در performImport', error);
    toast.error('خطا در بازیابی: ' + error.message);
  }
}

/**
 * حذف همه داده‌ها
 */
async function handleReset() {
  const confirmed = await modal.confirm(
    '⚠️ حذف همه داده‌ها',
    'این عمل غیرقابل بازگشت است. همه یادداشت‌ها، فلش‌کارت‌ها، آزمون‌ها و تنظیمات شما حذف خواهند شد.\n\nآیا مطمئن هستید؟',
    {
      dangerMode: true,
      confirmText: 'بله، همه را حذف کن'
    }
  );

  if (!confirmed) return;

  // تایید دوم برای اطمینان
  const doubleConfirmed = await modal.confirm(
    'تایید نهایی',
    'آخرین فرصت! آیا واقعاً مطمئن هستید؟',
    {
      dangerMode: true,
      confirmText: 'بله، مطمئنم'
    }
  );

  if (!doubleConfirmed) return;

  try {
    toast.info('در حال حذف داده‌ها...');
    await state.reset();
    toast.success('همه داده‌ها با موفقیت حذف شدند');
    logger.info('داده‌ها ریست شدند');

    // رفرش صفحه
    setTimeout(() => router.navigate('dashboard'), 1500);
  } catch (error) {
    logger.error('خطا در reset', error);
    toast.error('خطا در حذف داده‌ها: ' + error.message);
  }
}

/**
 * بخش آمار ذخیره‌سازی
 */
function createStorageStatsSection() {
  const section = createSectionCard('📊', 'آمار ذخیره‌سازی', 'وضعیت فضای استفاده شده');

  const stats = state.getStats();
  const notes = state.get('notes') || [];
  const flashcards = state.get('flashcards') || [];
  const quizHistory = state.get('quizHistory') || [];

  // محاسبه تقریبی حجم
  const totalWords = notes.reduce((sum, n) => sum + (n.wordCount || 0), 0);
  const estimatedSize = calculateEstimatedSize();

  const content = document.createElement('div');
  content.className = 'grid grid-cols-2 md:grid-cols-4 gap-3';

  const statItems = [
    { label: 'یادداشت‌ها', value: stats.totalNotes, icon: '📚', color: 'primary' },
    { label: 'فلش‌کارت‌ها', value: stats.totalFlashcards, icon: '🃏', color: 'accent' },
    { label: 'آزمون‌ها', value: stats.totalQuizzes, icon: '📝', color: 'green' },
    { label: 'میانگین نمره', value: `${stats.averageScore}٪`, icon: '📈', color: 'purple' },
    { label: 'کل کلمات', value: totalWords.toLocaleString('fa-IR'), icon: '📝', color: 'blue' },
    { label: 'زنجیره مطالعه', value: `${stats.studyStreak} روز`, icon: '🔥', color: 'orange' },
    { label: 'حجم تقریبی', value: estimatedSize, icon: '💾', color: 'teal' },
    { label: 'جلسات مطالعه', value: (state.get('studySessions') || []).length, icon: '⏱️', color: 'pink' }
  ];

  statItems.forEach(item => {
    const statCard = document.createElement('div');
    statCard.className = 'bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-center';
    statCard.innerHTML = `
      <div class="text-2xl mb-1">${item.icon}</div>
      <div class="text-lg font-bold text-slate-100">${item.value}</div>
      <div class="text-xs text-slate-400">${item.label}</div>
    `;
    content.appendChild(statCard);
  });

  section.appendChild(content);
  return section;
}

/**
 * محاسبه حجم تقریبی داده‌ها
 */
function calculateEstimatedSize() {
  try {
    const data = {
      notes: state.get('notes') || [],
      flashcards: state.get('flashcards') || [],
      quizHistory: state.get('quizHistory') || [],
      settings: state.get('settings') || {}
    };
    const sizeInBytes = new Blob([JSON.stringify(data)]).size;
    const sizeInKB = sizeInBytes / 1024;

    if (sizeInKB < 1024) {
      return `${sizeInKB.toFixed(1)} KB`;
    } else {
      return `${(sizeInKB / 1024).toFixed(2)} MB`;
    }
  } catch {
    return 'نامشخص';
  }
}

/**
 * بخش درباره
 */
function createAboutSection() {
  const section = createSectionCard('ℹ️', 'درباره برنامه', 'اطلاعات نسخه و توسعه‌دهنده');

  const content = document.createElement('div');
  content.className = 'space-y-3';

  content.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="bg-slate-900/50 rounded-lg p-3">
        <div class="text-xs text-slate-400 mb-1">نسخه برنامه</div>
        <div class="font-bold text-slate-100">۸.۰.۰ (نسخه پرو)</div>
      </div>
      <div class="bg-slate-900/50 rounded-lg p-3">
        <div class="text-xs text-slate-400 mb-1">معماری</div>
        <div class="font-bold text-slate-100">ES Modules + Vanilla JS</div>
      </div>
      <div class="bg-slate-900/50 rounded-lg p-3">
        <div class="text-xs text-slate-400 mb-1">ذخیره‌سازی</div>
        <div class="font-bold text-slate-100">IndexedDB + localStorage</div>
      </div>
      <div class="bg-slate-900/50 rounded-lg p-3">
        <div class="text-xs text-slate-400 mb-1">وضعیت اتصال</div>
        <div class="font-bold text-green-400">🟢 کاملاً آفلاین</div>
      </div>
    </div>
    
    <div class="bg-gradient-to-l from-primary-500/10 to-accent-500/10 border border-primary-500/30 rounded-lg p-4 mt-4">
      <div class="flex items-start gap-3">
        <span class="text-3xl">🎓</span>
        <div>
          <div class="font-bold text-slate-100 mb-1">دانش‌یار پرو</div>
          <p class="text-xs text-slate-400 leading-relaxed">
            دستیار هوشمند آموزشی کاملاً آفلاین برای دانشجویان و کنکوری‌ها.
            ساخته شده با ❤️ برای یادگیری بهتر.
          </p>
        </div>
      </div>
    </div>
  `;

  section.appendChild(content);
  return section;
}

/**
 * ساخت کارت بخش (helper)
 */
function createSectionCard(icon, title, subtitle) {
  const section = document.createElement('div');
  section.className = 'bg-slate-800 border border-slate-700 rounded-xl overflow-hidden';

  const header = document.createElement('div');
  header.className = 'p-5 border-b border-slate-700 bg-gradient-to-l from-slate-800 to-slate-900/50';
  header.innerHTML = `
    <div class="flex items-center gap-3">
      <span class="text-3xl">${icon}</span>
      <div>
        <h2 class="text-lg font-bold text-slate-100">${title}</h2>
        <p class="text-xs text-slate-400 mt-0.5">${subtitle}</p>
      </div>
    </div>
  `;

  section.appendChild(header);
  return section;
}

export default createSettingsView;