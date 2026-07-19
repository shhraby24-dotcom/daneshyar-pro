/**
 * دانش‌یار پرو - نقطه شروع برنامه
 * @module main
 */

import './style.css';
import { getInstance as getLogger } from '@/core/Logger';
import { getInstance as getEventBus } from '@/core/EventBus';
import { getState } from '@/core/State';
import { getRouter } from '@/core/Router';

// مقداردهی اولیه Logger
const logger = getLogger({ level: 'DEBUG' });
logger.info('🚀 دانش‌یار پرو در حال راه‌اندازی...');

// مقداردهی اولیه EventBus
const eventBus = getEventBus({ debug: false });

// مقداردهی اولیه State
const state = getState();

// مقداردهی اولیه Router
const router = getRouter();

// تابع اصلی
async function main() {
  try {
    // ============================================
    // مرحله ۱: آماده‌سازی DOM
    // ============================================
    logger.info('🎨 آماده‌سازی DOM...');
    
    // ایجاد container اصلی
    const app = document.createElement('div');
    app.id = 'app';
    document.body.innerHTML = '';
    document.body.appendChild(app);
    
    logger.info('✅ Container آماده شد', { id: 'app' });

    // ============================================
    // مرحله ۲: بارگذاری State
    // ============================================
    logger.info('📦 در حال بارگذاری state...');
    await state.load();
    logger.info('✅ State بارگذاری شد');

    // ============================================
    // مرحله ۳: تنظیم Container برای Router
    // ============================================
    router.setContainer('#app');

    // ============================================
    // مرحله ۴: ثبت View های تست
    // ============================================
    logger.info('📝 ثبت View های تست');
    
    router.registerView('dashboard', () => {
      const div = document.createElement('div');
      div.className = 'min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-8';
      div.innerHTML = `
        <div class="max-w-4xl mx-auto">
          <h1 class="text-4xl font-bold text-white mb-4">📊 داشبورد</h1>
          <p class="text-white/90 mb-8">به دانش‌یار پرو خوش آمدید!</p>
          <div class="grid grid-cols-2 gap-4">
            <button onclick="location.hash='#/notes'" class="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 transition">
              📚 یادداشت‌ها
            </button>
            <button onclick="location.hash='#/quiz'" class="bg-white text-purple-600 px-6 py-3 rounded-lg font-bold hover:bg-purple-50 transition">
              📝 آزمون‌ساز
            </button>
          </div>
        </div>
      `;
      return div;
    });

    router.registerView('notes', () => {
      const div = document.createElement('div');
      div.className = 'min-h-screen bg-slate-900 p-8';
      div.innerHTML = `
        <div class="max-w-4xl mx-auto">
          <button onclick="location.hash='#/dashboard'" class="text-primary-400 mb-4 hover:underline">← بازگشت</button>
          <h1 class="text-4xl font-bold text-white mb-4">📚 یادداشت‌ها</h1>
          <p class="text-slate-300">صفحه یادداشت‌ها (در حال توسعه)</p>
        </div>
      `;
      return div;
    });

    router.registerView('quiz', () => {
      const div = document.createElement('div');
      div.className = 'min-h-screen bg-slate-900 p-8';
      div.innerHTML = `
        <div class="max-w-4xl mx-auto">
          <button onclick="location.hash='#/dashboard'" class="text-primary-400 mb-4 hover:underline">← بازگشت</button>
          <h1 class="text-4xl font-bold text-white mb-4">📝 آزمون‌ساز</h1>
          <p class="text-slate-300">صفحه آزمون‌ساز (در حال توسعه)</p>
        </div>
      `;
      return div;
    });

    // ============================================
    // مرحله ۵: ثبت Middleware
    // ============================================
    router.beforeEach((to, from) => {
      logger.debug('قبل از navigation', { to: to.name, from: from?.name });
    });

    router.afterEach((to, from) => {
      logger.debug('بعد از navigation', { to: to.name, from: from?.name });
    });

    // ============================================
    // مرحله ۶: شروع Router
    // ============================================
    logger.info('🚦 شروع Router...');
    await router.start();

    logger.info('✅ Router با موفقیت راه‌اندازی شد!');
    console.log('');
    console.log('🎉 Router تست شد!');
    console.log('📦 روی دکمه‌ها کلیک کن تا navigation را ببینی');
    console.log('🔗 URL را تغییر بده (مثلاً #/notes)');
  } catch (error) {
    logger.error('خطا در تست Router', error);
  }
}

// اجرای برنامه
main();