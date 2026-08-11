/**
 * ============================================================
 * دانش‌یار پرو - نقطه شروع (بهینه‌سازی موبایل + PWA)
 * ============================================================
 * ⚡ code-splitting: فقط داشبورد eager، بقیه lazy (bundle کوچک‌تر)
 * 📲 ثبت Service Worker فقط در production
 * 🧹 حذف کد تکراری Input و ثبت‌های دوباره
 * @module main
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
import { getDatabase } from '@/core/Database';
import { createAuthView } from '@/ui/views/AuthView';
import { syncAll } from '@/services/SyncService';
import { loadSubscription } from '@/services/SubscriptionService';
import { startTrial, hasUsedTrial, checkTrialExpiry } from '@/services/TrialService';
import { isPremium } from '@/services/Premium';

const logger = getLogger({ level: 'DEBUG', showTimestamp: true, persistToStorage: false });
getEventBus({ debug: false });
const storage = getStorage();
const state = getState();
const router = getRouter();
getErrorHandler();
logger.info('🚀 دانش‌یار پرو در حال راه‌اندازی...');

type ViewParams = Record<string, unknown>;

async function bootstrap(): Promise<void> {
  try {
    logger.info('📦 مرحله ۱: آماده‌سازی DOM');
    const app = document.createElement('div');
    app.id = 'app';
    document.body.innerHTML = '';
    document.body.appendChild(app);

    logger.info('📦 مرحله ۲: بارگذاری State');
    await state.load();

    logger.info('📦 مرحله ۳: رندر Layout');
    app.appendChild(getLayout().render());

    logger.info('📦 مرحله ۴: ثبت View ها');
    router.setContainer('#main-content');
    registerViews();

    logger.info('📦 مرحله ۵: شروع Router');
    await router.start();
    void syncAll(); // اگر session نباشد، بی‌صدا رد می‌شود
    void loadSubscription();
        // ── Trial برای کاربران جدید ──
    checkTrialExpiry();
    if (!hasUsedTrial() && !isPremium()) {
      startTrial();
    }
    
    logger.info('✅ دانش‌یار پرو آماده است!');
    logger.info('📊 آمار Storage', storage.getStats());
  } catch (error) {
    logger.error('❌ خطا در راه‌اندازی', error);
    showFatalError(error);
  }
}

function createComingSoonView(title: string, icon: string, description: string) {
  return () => {
    const div = document.createElement('div');
    div.className = 'min-h-[70vh] flex items-center justify-center p-8 fade-in';
    const box = document.createElement('div');
    box.className = 'text-center max-w-md';
    const ic = document.createElement('div'); ic.className = 'text-6xl mb-4'; ic.textContent = icon;
    const t = document.createElement('h1'); t.className = 'text-3xl font-black text-slate-100 mb-3'; t.textContent = title;
    const d = document.createElement('p'); d.className = 'text-slate-400 text-lg mb-6'; d.textContent = description;
    box.appendChild(ic); box.appendChild(t); box.appendChild(d);
    div.appendChild(box);
    return div;
  };
}

function registerViews(): void {
  // ⚡ eager فقط برای اولین صفحه
  router.registerView('dashboard', createDashboardView);

  // ⚡ lazy (code-splitting → شروع سریع‌تر روی موبایل)
  router.registerView('notes', (p: ViewParams) => import('@/ui/views/NotesView').then((m) => m.createNotesView(p)));
  router.registerView('flashcards', (p: ViewParams) => import('@/ui/views/FlashcardsView').then((m) => m.createFlashcardsView(p)));
  router.registerView('quiz', (p: ViewParams) => import('@/ui/views/QuizView').then((m) => m.createQuizView(p)));
  router.registerView('summarizer', (p: ViewParams) => import('@/ui/views/SummarizerView').then((m) => m.createSummarizerView(p)));
  router.registerView('pomodoro', (p: ViewParams) => import('@/ui/views/PomodoroView').then((m) => m.createPomodoroView(p)));
  router.registerView('settings', (p: ViewParams) => import('@/ui/views/SettingsView').then((m) => m.createSettingsView(p)));
  router.registerView('auth', createAuthView);
  // placeholder ها
  router.registerView('translator', createComingSoonView('مترجم', '🌐', 'ترجمه هوشمند متن‌های تخصصی.'));
  router.registerView('calculator', createComingSoonView('ماشین‌حساب', '🧮', 'محاسبات سریع علمی.'));
  router.registerView('premium', (p: ViewParams) => import('@/ui/views/PremiumView').then((m) => m.createPremiumView(p)));
  router.registerView('premium', (p: ViewParams) => import('@/ui/views/PremiumView').then((m) => m.createPremiumView(p)));

  router.setNotFound((params) => {
    const div = document.createElement('div');
    div.className = 'min-h-[70vh] flex items-center justify-center p-8';
    div.textContent = `صفحه "${String(params.route ?? '')}" یافت نشد`;
    return div;
  });
}

function showFatalError(error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error);
  const app = document.getElementById('app');
  if (app) app.textContent = 'خطای بحرانی: ' + msg;
}

// ── Service Worker (فقط production) ──
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => logger.error('ثبت SW ناموفق', e));
  });
}

// ── دمو (فقط بتا) ──
async function seedDemoData(): Promise<void> {
  const db = getDatabase();
  await db.init();
  if ((await db.getNotes()).length > 0) return;
  logger.info('🌱 کاشت داده دمو...');
  const now = Date.now();
  const DAY = 86400000;
  const notes = [
    { title: 'جزوه ریاضی — مشتق', content: 'مشتق تابع y=x^n برابر است با y\'=nx^(n-1). برای توابع مرکب از قاعده زنجیره‌ای استفاده می‌کنیم.' },
    { title: 'خلاصه فصل ۳ فیزیک', content: 'قانون دوم نیوتن: F=ma. نیروی خالص وارد بر جسم برابر است با جرم ضرب در شتاب.' },
    { title: 'لغات انگلیسی — درس ۵', content: 'abundant: فراوان، benevolent: خیرخواه، candid: صریح و صادق.' },
  ];
  for (let i = 0; i < notes.length; i++) {
    const s = notes[i]!;
    await db.addNote({ id: `demo-note-${i}`, title: s.title, content: s.content, createdAt: new Date(now - i * DAY).toISOString(), updatedAt: new Date(now - i * DAY).toISOString() });
  }
}

bootstrap();
setTimeout(() => { seedDemoData().catch((e) => logger.error('خطا در دمو', e)); }, 500);