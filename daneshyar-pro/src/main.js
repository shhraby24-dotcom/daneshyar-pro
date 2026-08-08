/**
 * دانش‌یار پرو - نقطه شروع برنامه
 * @module main
 * @version 8.0.0
 */

// ============================================================
// Import ماژول‌ها
// ============================================================
import LoggerModule from './core/Logger.js';
import EventBusModule, { EVENTS } from './core/EventBus.js';
import state from './core/State.js';
import errorHandler from './core/Errors.js';
import router from './ui/router.js';
import layout from './ui/Layout.js';
import toast from './ui/components/Toast.js';
import modal from './ui/components/Modal.js';
import { createDashboardView } from './ui/views/DashboardView.js';
import { createNotesView } from './ui/views/NotesView.js';
import { createSummarizerView } from './ui/views/SummarizerView.js';
import { createSettingsView } from './ui/views/SettingsView.js';
import { createPomodoroView } from './ui/views/PomodoroView.js';
import { createQuizView } from './ui/views/QuizView.js';
import { createFlashcardsView } from './ui/views/FlashcardsView.js';
import summarizer from './services/Summarizer.js';
import srs from './services/SRS.js';
import quizGenerator from './services/QuizGenerator.js';

// ============================================================
// Singleton ها
// ============================================================
const logger = LoggerModule.getInstance({ level: 'DEBUG', showTimestamp: true });
const eventBus = EventBusModule.getInstance();

// ============================================================
// View های Placeholder
// ============================================================
function createPlaceholderView(title, icon, description) {
  return () => {
    const container = document.createElement('div');
    container.className = 'min-h-[60vh] flex items-center justify-center fade-in';
    container.innerHTML = `
      <div class="text-center max-w-md p-8">
        <div class="text-7xl mb-6">${icon}</div>
        <h1 class="text-3xl font-bold text-slate-100 mb-3">${title}</h1>
        <p class="text-slate-400 mb-6">${description}</p>
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-4 text-sm text-slate-300">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-yellow-400">⚠️</span>
            <span class="font-semibold">ماژول در حال توسعه</span>
          </div>
          <p class="text-slate-400 text-xs">
            زیرساخت این ماژول در فاز ۱ ساخته شد.
            در فازهای بعدی این بخش کامل می‌شود.
          </p>
        </div>
      </div>
    `;
    return container;
  };
}

// ============================================================
// Bootstrap - راه‌اندازی اصلی
// ============================================================
async function bootstrap() {
  logger.group('🚀 راه‌اندازی دانش‌یار پرو');
  
  try {
    // مرحله ۱: حذف loader و نمایش app
    logger.info('مرحله ۱: آماده‌سازی UI');
    const loader = document.getElementById('initial-loader');
    const appRoot = document.getElementById('app');
    
    if (loader) loader.style.display = 'none';
    if (appRoot) appRoot.style.display = 'block';
    
    if (!appRoot) {
      throw new Error('عنصر #app در HTML یافت نشد');
    }
    
    toast.setContainer(document.getElementById('toast-container'));
    modal.setContainer(document.getElementById('modal-container'));
    
    // مرحله ۲: راه‌اندازی Layout
    logger.info('مرحله ۲: راه‌اندازی Layout');
    const layoutElement = layout.render();
    appRoot.appendChild(layoutElement);
    router.setContainer(layout.getMainContent());
    
    // مرحله ۳: بارگذاری State
    logger.info('مرحله ۳: بارگذاری داده‌ها از Storage');
    await state.load();
    
    // مرحله ۴: ثبت View ها
    logger.info('مرحله ۴: ثبت View ها در Router');
        router.registerView('dashboard', createDashboardView);
    router.registerView('notes', createNotesView);
    router.registerView('summarizer', createSummarizerView);
    router.registerView('quiz', createQuizView);
    router.registerView('flashcards', createFlashcardsView);
    router.registerView('translator', createPlaceholderView('مترجم', '🌐', 'ترجمه متون انگلیسی به فارسی'));
    router.registerView('calculator', createPlaceholderView('ماشین‌حساب علمی', '🧮', 'ماشین‌حساب با پشتیبانی از توابع ریاضی'));
    router.registerView('pomodoro', createPomodoroView);
    router.registerView('settings', createSettingsView);
    
    // مرحله ۵: راه‌اندازی Router
    logger.info('مرحله ۵: راه‌اندازی Router');
    await router.start();
    
    // مرحله ۶: ثبت Event Handlers
    logger.info('مرحله ۶: ثبت Event Handlers');
    setupGlobalEventHandlers();
    setupThemeListener();
    
    // مرحله ۷: لاگ وضعیت نهایی
    const stats = state.getStats();
    logger.info('وضعیت نهایی برنامه', stats);
    
    // مرحله ۸: پیام خوش‌آمدگویی
    if (state.get('app').firstRun) {
      setTimeout(() => {
        toast.success('به دانش‌یار پرو خوش آمدید! 🎓', 'اولین اجرا', 4000);
        state.markOnboardingComplete();
      }, 500);
    } else {
      setTimeout(() => {
        toast.info('برنامه آماده استفاده است', 'دانش‌یار پرو', 3000);
      }, 300);
    }
    
    logger.groupEnd();
    logger.info('✅ برنامه با موفقیت راه‌اندازی شد!');
    
  } catch (error) {
    logger.groupEnd();
    logger.fatal('❌ شکست در راه‌اندازی برنامه', error);
    errorHandler.handle(error, { source: 'bootstrap' });
    showBootstrapError(error);
  }
}

// ============================================================
// Event Handlers عمومی
// ============================================================
function setupGlobalEventHandlers() {
  // Export
  eventBus.on('action:export', async () => {
    try {
      logger.info('درخواست export دریافت شد');
      toast.info('در حال آماده‌سازی فایل پشتیبان...');
      
      const data = {
        app: 'Daneshyar Pro',
        version: '8.0.0',
        exportedAt: new Date().toISOString(),
        notes: state.get('notes'),
        flashcards: state.get('flashcards'),
        quizHistory: state.get('quizHistory'),
        settings: state.get('settings')
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daneshyar-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('فایل پشتیبان با موفقیت دانلود شد');
    } catch (error) {
      logger.error('خطا در export', error);
      toast.error('خطا در ایجاد فایل پشتیبان');
    }
  });
  
  // Import
  eventBus.on('action:import', async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        logger.info('شروع import فایل', { fileName: file.name });
        
        const confirmed = await modal.confirm(
          'وارد کردن داده‌ها',
          'آیا مطمئن هستید؟ این عمل، داده‌های فعلی را با داده‌های فایل جایگزین می‌کند.',
          { dangerMode: true, confirmText: 'بله، وارد کن' }
        );
        
        if (!confirmed) return;
        
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          
          if (!data.notes && !data.flashcards) {
            throw new Error('فایل نامعتبر: ساختار صحیح ندارد');
          }
          
          if (Array.isArray(data.notes)) {
            data.notes.forEach(note => state.addNote(note));
          }
          if (Array.isArray(data.flashcards)) {
            data.flashcards.forEach(card => state.addFlashcard(card));
          }
          if (Array.isArray(data.quizHistory)) {
            data.quizHistory.forEach(q => state.addQuizResult(q));
          }
          
          toast.success('داده‌ها با موفقیت وارد شدند');
          logger.info('Import موفق');
        } catch (error) {
          logger.error('خطا در import', error);
          toast.error('فایل نامعتبر یا خراب است');
        }
      };
      
      input.click();
    } catch (error) {
      logger.error('خطا در باز کردن file dialog', error);
    }
  });
  
  // خطاهای پیش‌بینی نشده
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Promise rejection پیش‌بینی نشده', event.reason);
  });
  
  // ذخیره داده‌ها قبل از خروج
  window.addEventListener('beforeunload', () => {
    try {
      if (state.persistAll) state.persistAll();
    } catch (error) {
      logger.warn('خطا در persist قبل از خروج', error);
    }
  });
  
  logger.debug('Event handlers عمومی ثبت شدند');
}

// ============================================================
// Theme Listener
// ============================================================
function setupThemeListener() {
  const settings = state.get('settings');
  
  // اعمال تم اولیه
  applyTheme(settings?.theme || 'dark');
  
  // گوش دادن به تغییرات
  state.subscribe('settings', (newSettings) => {
    applyTheme(newSettings.theme);
  });
  
  logger.debug('Theme listener تنظیم شد');
}

function applyTheme(theme) {
  const html = document.documentElement;
  
  if (theme === 'light') {
    html.classList.add('light');
    html.classList.remove('dark');
    // تغییر theme-color meta tag
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', '#f8fafc');
  } else {
    html.classList.remove('light');
    html.classList.add('dark');
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', '#0f172a');
  }
  
  logger.info('تم اعمال شد', { theme });
}

// ============================================================
// نمایش خطای Bootstrap
// ============================================================
function showBootstrapError(error) {
  const loader = document.getElementById('initial-loader');
  if (loader) loader.style.display = 'none';
  
  const appRoot = document.getElementById('app');
  if (!appRoot) return;
  
  appRoot.style.display = 'block';
  appRoot.innerHTML = `
    <div class="min-h-screen flex items-center justify-center p-8">
      <div class="max-w-lg bg-red-900/20 border border-red-700 rounded-xl p-8 text-center">
        <div class="text-6xl mb-4">❌</div>
        <h2 class="text-2xl font-bold text-red-400 mb-3">خطا در راه‌اندازی برنامه</h2>
        <p class="text-slate-300 mb-4 text-sm">متأسفانه مشکلی در راه‌اندازی دانش‌یار پرو رخ داد.</p>
        <div class="bg-slate-900/60 rounded-lg p-3 text-right text-xs font-mono text-slate-400 mb-4 overflow-auto max-h-40">
          <div class="text-red-400 font-bold mb-1">Error:</div>
          <div>${error.message || 'خطای ناشناخته'}</div>
        </div>
        <div class="flex gap-2 justify-center">
          <button onclick="location.reload()" class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition">تلاش مجدد</button>
          <button onclick="localStorage.clear(); location.reload()" class="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition">ریست کامل</button>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// اجرای Bootstrap
// ============================================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

// Export برای دسترسی در کنسول (Debug)
window.DaneshyarPro = {
  state, router, logger, eventBus, toast, modal, errorHandler,
  services: { summarizer, srs, quizGenerator }
};

logger.info('🎓 دانش‌یار پرو v8.0.0 در حال بارگذاری...');