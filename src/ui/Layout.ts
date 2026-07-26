/**
 * ============================================================
 * دانش‌یار پرو - Layout اصلی برنامه
 * ============================================================
 *
 * چارچوب کلی: Sidebar + Topbar + Main Content
 *
 * ✅ باگ sidebar موبایل اصلاح شد (از اول مخفی است)
 * ✅ باگ فضای مرده دسکتاپ اصلاح شد (sidebar در flow، بدون mr-64)
 * ✅ تم اولیه از state خوانده می‌شود (نه hardcoded)
 * ✅ _applyTheme ساده شد (فقط toggle کلاس .light - توکن‌ها بقیه را انجام می‌دهند)
 * ✅ نشانگر فعال nav: نوار رنگی درخشان + پس‌زمینه ملایم (نه بلوک توپر)
 * ✅ تاریخ امروز در هدر (زنده، از dateFormatter)
 * ✅ نسخه از state (نه hardcoded)
 * ✅ مسیرهای "به‌زودی" (translator/calculator) به جای 404
 * ✅ Focus management + aria (دسترس‌پذیری)
 * ✅ میان‌برهای Ctrl+K (جستجو) و Ctrl+1-9 (ناوبری) - بدون تداخل با تایپ
 *
 * @module ui/Layout
 * @version 1.0.0-beta.1
 */

import { getRouter } from '@/core/Router';
import { getState } from '@/core/State';
import { getInstance as getEventBus } from '@/core/EventBus';
import { getInstance as getLogger } from '@/core/Logger';
import { getToast } from '@/ui/components/Toast';
import { formatPersianDate, toPersianDigits } from '@/utils/dateFormatter';

const logger = getLogger().module('Layout');

// ============================================================
// Types
// ============================================================

interface NavItem {
  route: string;
  icon: string;
  label: string;
  /** اگر true باشد، هنوز View ندارد و به جای 404 توست "به‌زودی" نشان می‌دهد */
  soon?: boolean;
}

// ============================================================
// آیتم‌های ناوبری
// ============================================================

const NAV_ITEMS: NavItem[] = [
  { route: 'dashboard', icon: '📊', label: 'داشبورد' },
  { route: 'summarizer', icon: '✨', label: 'خلاصه‌ساز' },
  { route: 'quiz', icon: '📝', label: 'آزمون‌ساز' },
  { route: 'flashcards', icon: '🃏', label: 'فلش‌کارت' },
  { route: 'notes', icon: '📚', label: 'یادداشت‌ها' },
  { route: 'translator', icon: '🌐', label: 'مترجم', soon: true },
  { route: 'calculator', icon: '🧮', label: 'ماشین‌حساب', soon: true },
  { route: 'pomodoro', icon: '⏱️', label: 'پومودورو' },
  { route: 'settings', icon: '⚙️', label: 'تنظیمات' },
];

// ============================================================
// Layout
// ============================================================

/**
 * کلاس Layout
 */
export class Layout {
  private _router = getRouter();
  private _state = getState();
  private _eventBus = getEventBus();

  private _isSidebarOpen = false;
  private _currentTheme: 'dark' | 'light';
  private _keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    // ⭐ خواندن تم اولیه از state (نه hardcoded)
    this._currentTheme = this._readInitialTheme();

    // گوش دادن به تغییرات تم
    this._state.subscribe('settings', (settings: unknown) => {
      const s = settings as { theme?: string } | null;
      const theme = s?.theme;
      if ((theme === 'dark' || theme === 'light') && theme !== this._currentTheme) {
        this._currentTheme = theme;
        this._applyTheme(theme);
      }
    });

    // گوش دادن به navigation
    this._eventBus.on('router:navigated', (data: unknown) => {
      const to = (data as { to?: { name?: string } })?.to;
      if (to?.name) {
        this._updateActiveNav(to.name);
      }
      this._closeSidebarOnMobile();
    });

    logger.debug('Layout initialized');
  }

  // ============================================================
  // رندر
  // ============================================================

  /**
   * رندر کامل layout
   */
  render(): HTMLElement {
    // ⭐ خواندن مجدد تم از state
    // (سازنده ممکن است قبل از state.load() اجرا شده باشد)
    this._currentTheme = this._readInitialTheme();

    const container = document.createElement('div');
    container.className = 'min-h-screen flex';

    const version = toPersianDigits(this._getVersion());
    const today = formatPersianDate(new Date());

    container.innerHTML = `
      <!-- Sidebar -->
      <aside id="sidebar" class="fixed inset-y-0 right-0 z-40 w-64 bg-slate-800 border-e border-slate-700 transform transition-transform duration-300 translate-x-full lg:translate-x-0 lg:static">
        <div class="flex flex-col h-full">
          <!-- Logo -->
          <div class="p-6 border-b border-slate-700">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-2xl shadow-lg">
                🎓
              </div>
              <div>
                <h1 class="text-lg font-bold">دانش‌یار پرو</h1>
                <p class="text-xs text-slate-400">نسخه ${version}</p>
              </div>
            </div>
          </div>

          <!-- Navigation -->
          <nav class="flex-1 p-4 overflow-y-auto" aria-label="ناوبری اصلی">
            <div class="space-y-1" id="nav-items">
              ${this._renderNavItems()}
            </div>
          </nav>

          <!-- Footer: Theme toggle -->
          <div class="p-4 border-t border-slate-700">
            <div class="flex items-center justify-between text-xs text-slate-400">
              <span>حالت تاریک</span>
              <button id="theme-toggle" aria-label="تغییر تم" class="p-2 hover:bg-slate-700 rounded-lg transition">
                ${this._currentTheme === 'dark' ? '🌙' : '☀️'}
              </button>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <div class="flex-1 flex flex-col min-w-0">
        <!-- Topbar -->
        <header class="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700">
          <div class="flex items-center justify-between px-6 py-4 gap-4">
            <!-- Mobile Menu Button -->
            <button id="mobile-menu-btn" aria-label="باز کردن منو" aria-expanded="false"
                    class="lg:hidden p-2 hover:bg-slate-800 rounded-lg transition">
              <span class="text-xl">☰</span>
            </button>

            <!-- Search Box -->
            <div class="flex-1 max-w-xl">
              <div class="relative">
                <input id="global-search" type="text"
                       placeholder="جستجو یا دستور... (Ctrl+K)"
                       class="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 ps-10 pe-4 text-sm focus:outline-none focus:border-primary-500 transition" />
                <span class="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">🔍</span>
              </div>
            </div>

            <!-- Date (عنصر زنده - هر روز عوض می‌شود) -->
            <div class="hidden md:flex items-center gap-2 text-sm text-slate-400 whitespace-nowrap">
              <span>📅</span>
              <span>${today}</span>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2">
              <button id="export-btn" aria-label="خروجی" title="خروجی" class="p-2 hover:bg-slate-800 rounded-lg transition">📥</button>
              <button id="import-btn" aria-label="ورودی" title="ورودی" class="p-2 hover:bg-slate-800 rounded-lg transition">📤</button>
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <main id="main-content" class="flex-1 p-6 overflow-y-auto">
          <!-- View ها اینجا رندر می‌شوند -->
        </main>
      </div>

      <!-- Mobile Overlay -->
      <div id="mobile-overlay" class="fixed inset-0 bg-black/50 z-30 hidden lg:hidden"></div>
    `;

    this._bindEvents(container);
    this._applyTheme(this._currentTheme);
    return container;
  }

  /**
   * رندر آیتم‌های ناوبری
   */
  private _renderNavItems(): string {
    const currentRoute = this._router.getCurrentRoute()?.name ?? 'dashboard';

    return NAV_ITEMS.map((item) => {
      const isActive = currentRoute === item.route && !item.soon;
      const stateClass = isActive
        ? 'nav-active'
        : 'text-slate-300 hover:bg-slate-700 hover:text-slate-100';
      const ariaCurrent = isActive ? 'aria-current="page"' : '';
      const soonBadge = item.soon ? '<span class="soon-badge">به‌زودی</span>' : '';

      return `
        <button data-route="${item.route}" ${ariaCurrent}
                class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg ${stateClass}">
          <span class="nav-icon text-xl">${item.icon}</span>
          <span class="font-medium flex-1 text-start">${item.label}</span>
          ${soonBadge}
        </button>
      `;
    }).join('');
  }

  // ============================================================
  // اتصال رویدادها
  // ============================================================

  private _bindEvents(container: HTMLElement): void {
    // ناوبری
    container.querySelectorAll<HTMLElement>('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const route = btn.dataset.route;
        const item = NAV_ITEMS.find((i) => i.route === route);
        if (item) this._navigateTo(item);
      });
    });

    // منوی موبایل
    container.querySelector<HTMLElement>('#mobile-menu-btn')?.addEventListener('click', () => {
      this._toggleSidebar();
    });
    container.querySelector<HTMLElement>('#mobile-overlay')?.addEventListener('click', () => {
      this._closeSidebar();
    });

    // تعویض تم
    container.querySelector<HTMLElement>('#theme-toggle')?.addEventListener('click', () => {
      const newTheme = this._currentTheme === 'dark' ? 'light' : 'dark';
      this._state.updateSettings({ theme: newTheme });
    });

    // Export/Import (فعلاً بازخورد می‌دهند - بعداً در main.ts وصل می‌شوند)
    container.querySelector<HTMLElement>('#export-btn')?.addEventListener('click', () => {
      this._eventBus.emit('action:export');
      getToast().info('خروجی گرفتن به‌زودی فعال می‌شود', 'به‌زودی');
    });
    container.querySelector<HTMLElement>('#import-btn')?.addEventListener('click', () => {
      this._eventBus.emit('action:import');
      getToast().info('وارد کردن به‌زودی فعال می‌شود', 'به‌زودی');
    });

    // میان‌برهای کیبورد (یک بار وصل می‌شود، برای cleanup ذخیره می‌شود)
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler);
    }
    this._keydownHandler = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;

      // Ctrl+K → فوکوس روی جستجو
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
        return;
      }

      // Ctrl+1-9 → ناوبری سریع (اگر در حال تایپ نباشیم)
      if (e.key >= '1' && e.key <= '9') {
        const target = e.target as HTMLElement;
        const isTyping =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable;
        if (isTyping) return;

        e.preventDefault();
        const index = parseInt(e.key, 10) - 1;
        const item = NAV_ITEMS[index];
        if (item) this._navigateTo(item);
      }
    };
    document.addEventListener('keydown', this._keydownHandler);
  }

  /**
   * ناوبری به یک آیتم (با مدیریت آیتم‌های "به‌زودی")
   */
  private _navigateTo(item: NavItem): void {
    if (item.soon) {
      getToast().info(`«${item.label}» به‌زودی اضافه می‌شود`, 'به‌زودی');
      return;
    }
    this._router.navigate(item.route);
  }

  // ============================================================
  // مدیریت Sidebar
  // ============================================================

  private _toggleSidebar(): void {
    this._isSidebarOpen = !this._isSidebarOpen;
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    const menuBtn = document.getElementById('mobile-menu-btn');

    if (this._isSidebarOpen) {
      sidebar?.classList.remove('translate-x-full');
      overlay?.classList.remove('hidden');
      menuBtn?.setAttribute('aria-expanded', 'true');
    } else {
      sidebar?.classList.add('translate-x-full');
      overlay?.classList.add('hidden');
      menuBtn?.setAttribute('aria-expanded', 'false');
    }
  }

  private _closeSidebar(): void {
    this._isSidebarOpen = false;
    document.getElementById('sidebar')?.classList.add('translate-x-full');
    document.getElementById('mobile-overlay')?.classList.add('hidden');
    document.getElementById('mobile-menu-btn')?.setAttribute('aria-expanded', 'false');
  }

  private _closeSidebarOnMobile(): void {
    if (window.innerWidth < 1024) {
      this._closeSidebar();
    }
  }

  // ============================================================
  // تم و ناوبری فعال
  // ============================================================

  /**
   * به‌روزرسانی آیتم فعال ناوبری
   */
  private _updateActiveNav(routeName: string): void {
    document.querySelectorAll<HTMLElement>('.nav-item').forEach((btn) => {
      const isActive = btn.dataset.route === routeName;
      if (isActive) {
        btn.classList.add('nav-active');
        btn.classList.remove('text-slate-300', 'hover:bg-slate-700', 'hover:text-slate-100');
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.classList.remove('nav-active');
        btn.classList.add('text-slate-300', 'hover:bg-slate-700', 'hover:text-slate-100');
        btn.removeAttribute('aria-current');
      }
    });
  }

  /**
   * اعمال تم (ساده‌شده: فقط toggle کلاس .light - توکن‌ها بقیه را انجام می‌دهند)
   */
  private _applyTheme(theme: 'dark' | 'light'): void {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
    }

    logger.info('تم اعمال شد', { theme });
  }

  // ============================================================
  // متدهای کمکی
  // ============================================================

  private _readInitialTheme(): 'dark' | 'light' {
    try {
      const theme = this._state.getSettings().theme;
      if (theme === 'light' || theme === 'dark') return theme;
    } catch {
      /* ignore */
    }
    return 'dark';
  }

  private _getVersion(): string {
    try {
      const s = this._state as unknown as { app?: { version?: string } };
      if (s.app?.version) return s.app.version;
    } catch {
      /* ignore */
    }
    return '1.0.0-beta.1';
  }

  /**
   * دریافت container اصلی محتوا (جایی که View ها رندر می‌شوند)
   */
  getMainContent(): HTMLElement | null {
    return document.getElementById('main-content');
  }

  /**
   * پاک‌سازی (حذف listener ها)
   */
  destroy(): void {
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler);
      this._keydownHandler = null;
    }
    logger.debug('Layout destroyed');
  }
}

// ============================================================
// Singleton
// ============================================================

let layoutInstance: Layout | null = null;

/**
 * دریافت نمونه singleton از Layout
 */
export function getLayout(): Layout {
  if (!layoutInstance) {
    layoutInstance = new Layout();
  }
  return layoutInstance;
}

/**
 * ریست کردن نمونه singleton (فقط برای تست)
 */
export function resetLayout(): void {
  if (layoutInstance) {
    layoutInstance.destroy();
  }
  layoutInstance = null;
}

/**
 * Export پیش‌فرض
 */
export default getLayout();