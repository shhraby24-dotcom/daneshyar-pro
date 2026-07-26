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
  router.registerView('notes', createComingSoonView('یادداشت‌ها', '📚', 'یادداشت‌هایت را دسته‌بندی و مدیریت کن.'));
  router.registerView('translator', createComingSoonView('مترجم', '🌐', 'ترجمه هوشمند متن‌های تخصصی.'));
  router.registerView('calculator', createComingSoonView('ماشین‌حساب', '🧮', 'محاسبات سریع علمی.'));
  router.registerView('pomodoro', createComingSoonView('پومودورو', '⏱️', 'با تکنیک پومودورو، متمرکز کار کن.'));
  router.registerView('settings', createComingSoonView('تنظیمات', '⚙️', 'برنامه را شخصی‌سازی کن.'));
  
function registerViews(): void {
  router.registerView('dashboard', () => {
    const div = document.createElement('div');
    div.className = 'min-h-screen bg-slate-900 flex items-center justify-center p-8';
    div.innerHTML = `
      <div class="text-center max-w-lg">
        <div class="text-7xl mb-6">🎓</div>
        <h1 class="text-4xl font-black bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 bg-clip-text text-transparent mb-4">
          دانش‌یار پرو
        </h1>
        <p class="text-slate-400 text-lg mb-8">
          اپلیکیشن هوشمند مطالعه و یادگیری
        </p>
        <div class="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
          <p class="text-slate-300 text-sm mb-4">
            ✅ زیرساخت حرفه‌ای آماده است
          </p>
          <div class="grid grid-cols-2 gap-3 text-xs text-slate-400">
            <div class="bg-slate-900 rounded-lg p-3">⚡ Vite + TypeScript</div>
            <div class="bg-slate-900 rounded-lg p-3">🎨 Tailwind CSS v4</div>
            <div class="bg-slate-900 rounded-lg p-3">📦 Logger + EventBus</div>
            <div class="bg-slate-900 rounded-lg p-3">🗂️ State + Storage</div>
            <div class="bg-slate-900 rounded-lg p-3">🧭 Router + Errors</div>
            <div class="bg-slate-900 rounded-lg p-3">🔜 Views (به‌زودی)</div>
          </div>
        </div>
        <div class="text-xs text-slate-500">
          نسخه ۱.۰.۰-beta.1 | هفته ۱ از ماه ۱
        </div>
      </div>
    `;
    return div;
  });

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

bootstrap();