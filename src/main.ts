/**
 * ============================================================
 * دانش‌یار پرو - نقطه شروع برنامه
 * ============================================================
 *
 * این فایل مسئول راه‌اندازی اولیه برنامه است:
 * 1. مقداردهی Logger
 * 2. مقداردهی EventBus
 * 3. مقداردهی Storage
 * 4. بارگذاری State
 * 5. راه‌اندازی Router
 * 6. رندر Layout
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

// ============================================================
// مقداردهی اولیه ماژول‌های Core
// ============================================================

const logger = getLogger({
  level: 'DEBUG',
  showTimestamp: true,
  persistToStorage: false,
});

const eventBus = getEventBus({ debug: false });
const storage = getStorage();
const state = getState();
const router = getRouter();

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
    logger.info('📦 مرحله ۳: تنظیم Router');
    router.setContainer('#app');

    // مرحله ۴: ثبت View ها
    // TODO: بعد از انتقال View ها، اینجا ثبت می‌شوند
    logger.info('📦 مرحله ۴: ثبت View ها');
    registerViews();

    // مرحله ۵: شروع Router
    logger.info('📦 مرحله ۵: شروع Router');
    await router.start();

    // مرحله ۶: آماده!
    logger.info('✅ دانش‌یار پرو آماده است!');
    logger.info('📊 آمار Storage', storage.getStats());

    // نمایش پیام خوش‌آمدگویی موقت
    showWelcomeScreen();

  } catch (error) {
    logger.error('❌ خطا در راه‌اندازی برنامه', error);
    showFatalError(error);
  }
}

// ============================================================
// ثبت View ها (موقت - بعداً با View های واقعی جایگزین می‌شود)
// ============================================================

function registerViews(): void {
  // Dashboard - موقت
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
            <div class="bg-slate-900 rounded-lg p-3">🧭 Router</div>
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

  // 404 - صفحه خطا
  router.setNotFound((params) => {
    const div = document.createElement('div');
    div.className = 'min-h-screen bg-slate-900 flex items-center justify-center p-8';
    div.innerHTML = `
      <div class="text-center">
        <div class="text-7xl mb-4">🔍</div>
        <h1 class="text-3xl font-bold text-white mb-2">صفحه یافت نشد</h1>
        <p class="text-slate-400 mb-6">مسیر "${params.route}" وجود ندارد</p>
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
// صفحه خوش‌آمدگویی موقت
// ============================================================

function showWelcomeScreen(): void {
  // فعلاً Router خودش dashboard را نمایش می‌دهد
  // بعداً با Layout واقعی جایگزین می‌شود
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

// ============================================================
// تست Errors (موقت - بعداً حذف می‌شود)
// ============================================================

async function testErrors(): Promise<void> {
  const errorHandler = getErrorHandler();

  logger.info('🧪 تست سیستم Errors');

  // تست ۱: AppError ساده
  logger.info('📝 تست ۱: AppError ساده');
  const err1 = new AppError('یک خطای تست', {
    code: ERROR_CODES.UNKNOWN,
    severity: ERROR_SEVERITY.LOW,
  });
  logger.info('AppError ساخته شد', {
    code: err1.code,
    severity: err1.severity,
    userMessage: err1.getUserMessage(),
  });

  // تست ۲: ValidationError
  logger.info('📝 تست ۲: ValidationError');
  const err2 = new ValidationError('عنوان نمی‌تواند خالی باشد', {
    fields: { title: 'عنوان الزامی است' },
  });
  logger.info('ValidationError ساخته شد', {
    fields: err2.fields,
    userMessage: err2.getUserMessage(),
  });

  // تست ۳: createValidationError
  logger.info('📝 تست ۳: createValidationError');
  const err3 = createValidationError({
    title: 'عنوان الزامی است',
    content: 'محتوا باید حداقل ۱۰ کاراکتر باشد',
  });
  logger.info('createValidationError', {
    fields: err3.fields,
    userMessage: err3.getUserMessage(),
  });

  // تست ۴: NetworkError
  logger.info('📝 تست ۴: NetworkError');
  const err4 = new NetworkError('خطا در اتصال به سرور', {
    status: 500,
    url: 'https://api.example.com',
  });
  logger.info('NetworkError ساخته شد', {
    status: err4.status,
    url: err4.url,
    userMessage: err4.getUserMessage(),
  });

  // تست ۵: execute با retry
  logger.info('📝 تست ۵: execute با retry');
  let attemptCount = 0;
  try {
    await errorHandler.execute(
      async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`تلاش ${attemptCount} شکست خورد`);
        }
        return 'موفق!';
      },
      { retryCount: 3, retryDelay: 500, operationName: 'تست retry' }
    );
    logger.info('✅ execute با retry موفق شد', { attempts: attemptCount });
  } catch {
    logger.error('❌ execute شکست خورد');
  }

  // تست ۶: آمار خطاها
  logger.info('📝 تست ۶: آمار خطاها');
  const stats = errorHandler.getStats();
  logger.info('آمار خطاها', stats);

  // تست ۷: toJSON
  logger.info('📝 تست ۷: toJSON');
  const json = err1.toJSON();
  logger.info('toJSON', json);

  // تست ۸: cause chain
  logger.info('📝 تست ۸: cause chain');
  const rootCause = new Error('علت ریشه‌ای');
  const midError = new AppError('خطای میانی', { cause: rootCause });
  const topError = new AppError('خطای بالایی', { cause: midError });
  const chain = topError.getCauseChain();
  logger.info('cause chain', { length: chain.length });

  logger.info('✅ همه تست‌های Errors موفق بودند!');
  console.log('');
  console.log('🎉 Errors.ts با موفقیت تست شد!');
}
// اجرای تست Errors (موقت)
testErrors();

bootstrap();