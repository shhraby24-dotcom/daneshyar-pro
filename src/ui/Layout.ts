/**
 * ============================================================
 * دانش‌یار پرو - Layout اصلی (Mobile-First)
 * ============================================================
 * دسکتاپ: Sidebar + Topbar
 * موبایل: Topbar شفاف + Bottom Navigation + Bottom Sheet «بیشتر»
 * ✅ Bottom Navigation با پیلِ فعال (ناحیه شست)
 * ✅ Bottom Sheet به سبک launcher اپل
 * ✅ Topbar شفاف که با اسکرول blur می‌گیرد
 * ✅ safe-area (notch / home indicator)
 * ✅ اهداف لمسی ≥ ۴۴px
 * ✅ همه‌ی قابلیت‌های قبلی حفظ شده (تم، میان‌برها، export/import)
 * @module ui/Layout
 * @version 2.0.0-mobile
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
  soon?: boolean;
}

// ============================================================
// آیتم‌های ناوبری
// ============================================================

/** سایدبار دسکتاپ (همه‌ی آیتم‌ها) */
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

/** نوار پایین موبایل (۴ اصلی + «بیشتر») */
const BOTTOM_NAV_ITEMS: NavItem[] = [
  { route: 'dashboard', icon: '🏠', label: 'خانه' },
  { route: 'notes', icon: '📚', label: 'یادداشت' },
  { route: 'flashcards', icon: '🃏', label: 'فلش‌کارت' },
  { route: 'quiz', icon: '📝', label: 'آزمون' },
];

/** منوی «بیشتر» (Bottom Sheet) */
const MORE_ITEMS: NavItem[] = [
  { route: 'summarizer', icon: '✨', label: 'خلاصه‌ساز' },
  { route: 'pomodoro', icon: '⏱️', label: 'پومودورو' },
  { route: 'translator', icon: '🌐', label: 'مترجم', soon: true },
  { route: 'calculator', icon: '🧮', label: 'ماشین‌حساب', soon: true },
  { route: 'settings', icon: '⚙️', label: 'تنظیمات' },
];

// ============================================================
// Layout
// ============================================================

export class Layout {
  private _router = getRouter();
  private _state = getState();
  private _eventBus = getEventBus();
  private _isSidebarOpen = false;
  private _isSheetOpen = false;
  private _currentTheme: 'dark' | 'light';
  private _keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _scrollHandler: (() => void) | null = null;

  constructor() {
    this._currentTheme = this._readInitialTheme();

    this._state.subscribe('settings', (settings: unknown) => {
      const s = settings as { theme?: string } | null;
      const theme = s?.theme;
      if ((theme === 'dark' || theme === 'light') && theme !== this._currentTheme) {
        this._currentTheme = theme;
        this._applyTheme(theme);
      }
    });

    this._eventBus.on('router:navigated', (data: unknown) => {
      const to = (data as { to?: { name?: string } })?.to;
      if (to?.name) {
        this._updateActiveNav(to.name);
      }
      this._closeSidebarOnMobile();
      this._closeSheet();
    });

    logger.debug('Layout initialized');
  }

  // ============================================================
  // رندر
  // ============================================================

  render(): HTMLElement {
    this._currentTheme = this._readInitialTheme();

    const container = document.createElement('div');
    container.className = 'min-h-screen flex';

    const version = toPersianDigits(this._getVersion());
    const today = formatPersianDate(new Date());
    const themeIcon = this._currentTheme === 'dark' ? '🌙' : '☀️';

    container.innerHTML = `
      <!-- ── Sidebar (فقط دسکتاپ) ── -->
      <aside id="sidebar" class="fixed inset-y-0 right-0 z-40 w-64 bg-slate-800 border-e border-slate-700 transform transition-transform duration-300 translate-x-full lg:translate-x-0 lg:static">
        <div class="flex flex-col h-full">
          <div class="p-6 border-b border-slate-700">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-2xl shadow-lg">🎓</div>
              <div>
                <h1 class="text-lg font-bold">دانش‌یار پرو</h1>
                <p class="text-xs text-slate-400">نسخه ${version}</p>
              </div>
            </div>
          </div>
          <nav class="flex-1 p-4 overflow-y-auto" aria-label="ناوبری اصلی">
            <div class="space-y-1" id="nav-items">${this._renderNavItems()}</div>
          </nav>
          <div class="p-4 border-t border-slate-700">
            <div class="flex items-center justify-between text-xs text-slate-400">
              <span>حالت تاریک</span>
              <button id="theme-toggle" aria-label="تغییر تم" class="sidebar-theme-toggle min-w-11 min-h-11 flex items-center justify-center rounded-lg hover:bg-slate-700 transition">${themeIcon}</button>
            </div>
          </div>
        </div>
      </aside>

      <!-- ── Main ── -->
      <div class="flex-1 flex flex-col min-w-0">
        <!-- Topbar شفاف -->
        <header id="topbar" class="sticky top-0 z-30">
          <div class="flex items-center justify-between px-4 py-3 gap-3">
            <button id="mobile-menu-btn" aria-label="باز کردن منو" aria-expanded="false"
                    class="lg:hidden min-w-11 min-h-11 flex items-center justify-center rounded-lg hover:bg-slate-800 transition">
              <span class="text-xl">☰</span>
            </button>
            <div class="flex-1 max-w-xl">
              <div class="relative">
                <input id="global-search" type="text" placeholder="جستجو..."
                       class="w-full bg-slate-800/80 border border-slate-700 rounded-xl py-2.5 ps-10 pe-4 text-base focus:outline-none focus:border-primary-500 transition" />
                <span class="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">🔍</span>
              </div>
            </div>
            <div class="hidden md:flex items-center gap-2 text-sm text-slate-400 whitespace-nowrap">
              <span>📅</span><span>${today}</span>
            </div>
            <div class="flex items-center gap-1">
              <button id="export-btn" aria-label="خروجی" title="خروجی" class="hidden sm:flex min-w-11 min-h-11 items-center justify-center rounded-lg hover:bg-slate-800 transition">📥</button>
              <button id="import-btn" aria-label="ورودی" title="ورودی" class="hidden sm:flex min-w-11 min-h-11 items-center justify-center rounded-lg hover:bg-slate-800 transition">📤</button>
            </div>
          </div>
        </header>

        <main id="main-content" class="flex-1 p-4 overflow-y-auto"><!-- View ها --></main>
      </div>

      <!-- ── Overlay سایدبار ── -->
      <div id="mobile-overlay" class="fixed inset-0 bg-black/50 z-40 hidden lg:hidden"></div>

      <!-- ── Bottom Navigation (موبایل) ── -->
      <nav id="bottom-nav" class="bottom-nav" aria-label="ناوبری پایین">${this._renderBottomNav()}</nav>

      <!-- ── Bottom Sheet «بیشتر» ── -->
      <div id="sheet-overlay" class="sheet-overlay"></div>
      <div id="bottom-sheet" class="bottom-sheet" role="dialog" aria-label="منوی بیشتر">
        <div class="bottom-sheet-grid">${this._renderSheetItems(themeIcon)}</div>
      </div>
    `;

    this._bindEvents(container);
    this._applyTheme(this._currentTheme);
    return container;
  }

  private _renderNavItems(): string {
    const currentRoute = this._router.getCurrentRoute()?.name ?? 'dashboard';
    return NAV_ITEMS.map((item) => {
      const isActive = currentRoute === item.route && !item.soon;
      const stateClass = isActive ? 'nav-active' : 'text-slate-300 hover:bg-slate-700 hover:text-slate-100';
      const ariaCurrent = isActive ? 'aria-current="page"' : '';
      const soonBadge = item.soon ? '<span class="soon-badge">به‌زودی</span>' : '';
      return `
        <button data-route="${item.route}" ${ariaCurrent}
                class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg ${stateClass}">
          <span class="nav-icon text-xl">${item.icon}</span>
          <span class="font-medium flex-1 text-start">${item.label}</span>
          ${soonBadge}
        </button>`;
    }).join('');
  }

  private _renderBottomNav(): string {
    const currentRoute = this._router.getCurrentRoute()?.name ?? 'dashboard';
    const items = BOTTOM_NAV_ITEMS.map((item) => {
      const isActive = currentRoute === item.route;
      return `
        <button data-route="${item.route}" class="bottom-nav-item ${isActive ? 'active' : ''}" ${isActive ? 'aria-current="page"' : ''}>
          <span class="bnav-icon">${item.icon}</span>
          <span class="bnav-label">${item.label}</span>
        </button>`;
    }).join('');

    const isMoreActive = MORE_ITEMS.some((i) => i.route === currentRoute);
    const moreBtn = `
      <button id="more-btn" class="bottom-nav-item ${isMoreActive ? 'active' : ''}" aria-label="منوی بیشتر">
        <span class="bnav-icon">☰</span>
        <span class="bnav-label">بیشتر</span>
      </button>`;

    return items + moreBtn;
  }

  private _renderSheetItems(themeIcon: string): string {
    const items = MORE_ITEMS.map((item) => {
      const soonBadge = item.soon ? '<span class="soon-badge">به‌زودی</span>' : '';
      return `
        <button data-route="${item.route}" class="bottom-sheet-item sheet-nav-item">
          <span class="bs-icon">${item.icon}</span>
          <span class="bs-label">${item.label}</span>
          ${soonBadge}
        </button>`;
    }).join('');

    const themeBtn = `
      <button id="sheet-theme-toggle" class="bottom-sheet-item">
        <span class="bs-icon">${themeIcon}</span>
        <span class="bs-label">حالت ${this._currentTheme === 'dark' ? 'تاریک' : 'روشن'}</span>
      </button>`;

    return items + themeBtn;
  }

  // ============================================================
  // اتصال رویدادها
  // ============================================================

  private _bindEvents(container: HTMLElement): void {
    // ناوبری سایدبار
    container.querySelectorAll<HTMLElement>('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = NAV_ITEMS.find((i) => i.route === btn.dataset.route);
        if (item) this._navigateTo(item);
      });
    });

    // ناوبری نوار پایین
    container.querySelectorAll<HTMLElement>('.bottom-nav-item[data-route]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = BOTTOM_NAV_ITEMS.find((i) => i.route === btn.dataset.route);
        if (item) this._navigateTo(item);
      });
    });

    // منوی «بیشتر»
    container.querySelector<HTMLElement>('#more-btn')?.addEventListener('click', () => this._toggleSheet());
    container.querySelector<HTMLElement>('#sheet-overlay')?.addEventListener('click', () => this._closeSheet());

    // آیتم‌های sheet
    container.querySelectorAll<HTMLElement>('.sheet-nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = MORE_ITEMS.find((i) => i.route === btn.dataset.route);
        if (item) {
          this._closeSheet();
          this._navigateTo(item);
        }
      });
    });

    // تم (سایدبار + sheet)
    const toggleTheme = (): void => {
      const newTheme = this._currentTheme === 'dark' ? 'light' : 'dark';
      this._state.updateSettings({ theme: newTheme });
    };
    container.querySelector<HTMLElement>('#theme-toggle')?.addEventListener('click', toggleTheme);
    container.querySelector<HTMLElement>('#sheet-theme-toggle')?.addEventListener('click', toggleTheme);

    // منوی موبایل (سایدبار)
    container.querySelector<HTMLElement>('#mobile-menu-btn')?.addEventListener('click', () => this._toggleSidebar());
    container.querySelector<HTMLElement>('#mobile-overlay')?.addEventListener('click', () => this._closeSidebar());

    // Export/Import
    container.querySelector<HTMLElement>('#export-btn')?.addEventListener('click', () => {
      this._eventBus.emit('action:export');
      getToast().info('خروجی گرفتن به‌زودی فعال می‌شود', 'به‌زودی');
    });
    container.querySelector<HTMLElement>('#import-btn')?.addEventListener('click', () => {
      this._eventBus.emit('action:import');
      getToast().info('وارد کردن به‌زودی فعال می‌شود', 'به‌زودی');
    });

    // Topbar blur موقع اسکرول
    const main = container.querySelector<HTMLElement>('#main-content');
    const topbar = container.querySelector<HTMLElement>('#topbar');
    if (main && topbar) {
      this._scrollHandler = () => {
        if (main.scrollTop > 8) topbar.classList.add('topbar-scrolled');
        else topbar.classList.remove('topbar-scrolled');
      };
      main.addEventListener('scroll', this._scrollHandler, { passive: true });
    }

    // میان‌برهای کیبورد
    if (this._keydownHandler) document.removeEventListener('keydown', this._keydownHandler);
    this._keydownHandler = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
        return;
      }
      if (e.key >= '1' && e.key <= '9') {
        const target = e.target as HTMLElement;
        const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (isTyping) return;
        e.preventDefault();
        const item = NAV_ITEMS[parseInt(e.key, 10) - 1];
        if (item) this._navigateTo(item);
      }
    };
    document.addEventListener('keydown', this._keydownHandler);
  }

  private _navigateTo(item: NavItem): void {
    if (item.soon) {
      getToast().info(`«${item.label}» به‌زودی اضافه می‌شود`, 'به‌زودی');
      return;
    }
    this._router.navigate(item.route);
  }

  // ============================================================
  // Sidebar
  // ============================================================

  private _toggleSidebar(): void {
    this._isSidebarOpen ? this._closeSidebar() : this._openSidebar();
  }
  private _openSidebar(): void {
    this._isSidebarOpen = true;
    document.getElementById('sidebar')?.classList.remove('translate-x-full');
    document.getElementById('mobile-overlay')?.classList.remove('hidden');
    document.getElementById('mobile-menu-btn')?.setAttribute('aria-expanded', 'true');
  }
  private _closeSidebar(): void {
    this._isSidebarOpen = false;
    document.getElementById('sidebar')?.classList.add('translate-x-full');
    document.getElementById('mobile-overlay')?.classList.add('hidden');
    document.getElementById('mobile-menu-btn')?.setAttribute('aria-expanded', 'false');
  }
  private _closeSidebarOnMobile(): void {
    if (window.innerWidth < 1024) this._closeSidebar();
  }

  // ============================================================
  // Bottom Sheet
  // ============================================================

  private _toggleSheet(): void {
    this._isSheetOpen ? this._closeSheet() : this._openSheet();
  }
  private _openSheet(): void {
    this._isSheetOpen = true;
    document.getElementById('bottom-sheet')?.classList.add('open');
    document.getElementById('sheet-overlay')?.classList.add('open');
  }
  private _closeSheet(): void {
    this._isSheetOpen = false;
    document.getElementById('bottom-sheet')?.classList.remove('open');
    document.getElementById('sheet-overlay')?.classList.remove('open');
  }

  // ============================================================
  // ناوبری فعال + تم
  // ============================================================

  private _updateActiveNav(routeName: string): void {
    // سایدبار
    document.querySelectorAll<HTMLElement>('.nav-item').forEach((btn) => {
      const isActive = btn.dataset.route === routeName;
      btn.classList.toggle('nav-active', isActive);
      btn.classList.toggle('text-slate-300', !isActive);
      btn.classList.toggle('hover:bg-slate-700', !isActive);
      btn.classList.toggle('hover:text-slate-100', !isActive);
      if (isActive) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });

    // نوار پایین
    const inBottom = BOTTOM_NAV_ITEMS.some((i) => i.route === routeName);
    const inMore = MORE_ITEMS.some((i) => i.route === routeName);
    document.querySelectorAll<HTMLElement>('.bottom-nav-item[data-route]').forEach((btn) => {
      const isActive = btn.dataset.route === routeName;
      btn.classList.toggle('active', isActive);
      if (isActive) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
    const moreBtn = document.getElementById('more-btn');
    if (moreBtn) moreBtn.classList.toggle('active', !inBottom && inMore);
  }

  private _applyTheme(theme: 'dark' | 'light'): void {
    if (theme === 'light') document.documentElement.classList.add('light');
    else document.documentElement.classList.remove('light');

    const icon = theme === 'dark' ? '🌙' : '☀️';
    document.querySelectorAll<HTMLElement>('.sidebar-theme-toggle, #sheet-theme-toggle .bs-icon').forEach((el) => {
      el.textContent = icon;
    });
    const sheetLabel = document.querySelector<HTMLElement>('#sheet-theme-toggle .bs-label');
    if (sheetLabel) sheetLabel.textContent = theme === 'dark' ? 'حالت تاریک' : 'حالت روشن';

    logger.info('تم اعمال شد', { theme });
  }

  // ============================================================
  // کمکی
  // ============================================================

  private _readInitialTheme(): 'dark' | 'light' {
    try {
      const theme = this._state.getSettings().theme;
      if (theme === 'light' || theme === 'dark') return theme;
    } catch { /* ignore */ }
    return 'dark';
  }

  private _getVersion(): string {
    try {
      const s = this._state as unknown as { app?: { version?: string } };
      if (s.app?.version) return s.app.version;
    } catch { /* ignore */ }
    return '1.0.0-beta.1';
  }

  getMainContent(): HTMLElement | null {
    return document.getElementById('main-content');
  }

  destroy(): void {
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler);
      this._keydownHandler = null;
    }
    const main = document.getElementById('main-content');
    if (main && this._scrollHandler) {
      main.removeEventListener('scroll', this._scrollHandler);
      this._scrollHandler = null;
    }
    logger.debug('Layout destroyed');
  }
}

// ============================================================
// Singleton
// ============================================================

let layoutInstance: Layout | null = null;

export function getLayout(): Layout {
  if (!layoutInstance) layoutInstance = new Layout();
  return layoutInstance;
}

export function resetLayout(): void {
  if (layoutInstance) layoutInstance.destroy();
  layoutInstance = null;
}

export default getLayout();