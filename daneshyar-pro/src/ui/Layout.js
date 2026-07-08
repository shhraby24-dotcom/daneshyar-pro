/**
 * دانش‌یار پرو - Layout اصلی برنامه
 * چارچوب کلی شامل Sidebar، Topbar و Main Content Area
 * @module ui/Layout
 */

import router from './router.js';
import state from '../core/State.js';
import EventBusModule, { EVENTS } from '../core/EventBus.js';
import LoggerModule from '../core/Logger.js';

const logger = LoggerModule.getInstance().module('Layout');
const eventBus = EventBusModule.getInstance();

/**
 * آیتم‌های navigation اصلی
 */
const NAV_ITEMS = [
  { route: 'dashboard', icon: '📊', label: 'داشبورد' },
  { route: 'summarizer', icon: '✨', label: 'خلاصه‌ساز' },
  { route: 'quiz', icon: '📝', label: 'آزمون‌ساز' },
  { route: 'flashcards', icon: '🃏', label: 'فلش‌کارت' },
  { route: 'notes', icon: '📚', label: 'یادداشت‌ها' },
  { route: 'translator', icon: '🌐', label: 'مترجم' },
  { route: 'calculator', icon: '🧮', label: 'ماشین‌حساب' },
  { route: 'pomodoro', icon: '⏱️', label: 'پومودورو' },
  { route: 'settings', icon: '⚙️', label: 'تنظیمات' }
];

/**
 * کلاس Layout
 */
class Layout {
  constructor() {
    this._isSidebarOpen = false;
    this._currentTheme = 'dark';
    
    // گوش دادن به تغییرات تم
    state.subscribe('settings', (settings) => {
      if (settings.theme !== this._currentTheme) {
        this._currentTheme = settings.theme;
        this._applyTheme(settings.theme);
      }
    });
    
    // گوش دادن به navigation
    eventBus.on('router:navigated', ({ to }) => {
      this._updateActiveNav(to.name);
      this._closeSidebarOnMobile();
    });
    
    logger.debug('Layout initialized');
  }

  /**
   * رندر کامل layout
   * @returns {HTMLElement}
   */
  render() {
    const container = document.createElement('div');
    container.className = 'min-h-screen flex';
    
    container.innerHTML = `
      <!-- Sidebar -->
      <aside id="sidebar" class="fixed inset-y-0 right-0 z-40 w-64 bg-slate-800 border-l border-slate-700 transform transition-transform duration-300 lg:translate-x-0 lg:static">
        <div class="flex flex-col h-full">
          <!-- Logo -->
          <div class="p-6 border-b border-slate-700">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-2xl">
                🎓
              </div>
              <div>
                <h1 class="text-lg font-bold">دانش‌یار پرو</h1>
                <p class="text-xs text-slate-400">نسخه ۸.۰</p>
              </div>
            </div>
          </div>
          
          <!-- Navigation -->
          <nav class="flex-1 p-4 overflow-y-auto">
            <div class="space-y-1" id="nav-items">
              ${this._renderNavItems()}
            </div>
          </nav>
          
          <!-- Footer -->
          <div class="p-4 border-t border-slate-700">
            <div class="flex items-center justify-between text-xs text-slate-400">
              <span>حالت تاریک</span>
              <button id="theme-toggle" class="p-2 hover:bg-slate-700 rounded-lg transition">
                ${this._currentTheme === 'dark' ? '🌙' : '☀️'}
              </button>
            </div>
          </div>
        </div>
      </aside>
      
      <!-- Main Content -->
      <div class="flex-1 flex flex-col lg:mr-64">
        <!-- Topbar -->
        <header class="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700">
          <div class="flex items-center justify-between px-6 py-4">
            <!-- Mobile Menu Button -->
            <button id="mobile-menu-btn" class="lg:hidden p-2 hover:bg-slate-800 rounded-lg transition">
              <span class="text-xl">☰</span>
            </button>
            
            <!-- Search Box -->
            <div class="flex-1 max-w-xl mx-4">
              <div class="relative">
                <input type="text" 
                       placeholder="جستجو یا دستور... (Ctrl+K)" 
                       class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:border-primary-500 transition">
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              </div>
            </div>
            
            <!-- Actions -->
            <div class="flex items-center gap-2">
              <button id="export-btn" class="p-2 hover:bg-slate-800 rounded-lg transition" title="خروجی">
                📥
              </button>
              <button id="import-btn" class="p-2 hover:bg-slate-800 rounded-lg transition" title="ورودی">
                📤
              </button>
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
    
    // اتصال event ها
    this._bindEvents(container);
    
    // اعمال تم
    this._applyTheme(this._currentTheme);
    
    return container;
  }

  /**
   * رندر آیتم‌های navigation
   * @private
   */
  _renderNavItems() {
    const currentRoute = router.getCurrentRoute()?.name || 'dashboard';
    
    return NAV_ITEMS.map(item => {
      const isActive = currentRoute === item.route;
      return `
        <button data-route="${item.route}" 
                class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive 
                    ? 'bg-primary-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-700'
                }">
          <span class="text-xl">${item.icon}</span>
          <span class="font-medium">${item.label}</span>
        </button>
      `;
    }).join('');
  }

  /**
   * اتصال event ها
   * @private
   */
  _bindEvents(container) {
    // Navigation clicks
    container.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const route = btn.dataset.route;
        router.navigate(route);
      });
    });
    
    // Mobile menu toggle
    const mobileMenuBtn = container.querySelector('#mobile-menu-btn');
    const sidebar = container.querySelector('#sidebar');
    const overlay = container.querySelector('#mobile-overlay');
    
    mobileMenuBtn?.addEventListener('click', () => {
      this._toggleSidebar();
    });
    
    overlay?.addEventListener('click', () => {
      this._closeSidebar();
    });
    
    // Theme toggle
    const themeToggle = container.querySelector('#theme-toggle');
    themeToggle?.addEventListener('click', () => {
      const newTheme = this._currentTheme === 'dark' ? 'light' : 'dark';
      state.updateSettings({ theme: newTheme });
    });
    
    // Export/Import
    container.querySelector('#export-btn')?.addEventListener('click', () => {
      eventBus.emit('action:export');
    });
    
    container.querySelector('#import-btn')?.addEventListener('click', () => {
      eventBus.emit('action:import');
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+K برای جستجو
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // TODO: باز کردن command palette
        logger.info('Command palette درخواست شد');
      }
      
      // Ctrl+1-9 برای navigation سریع
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (index < NAV_ITEMS.length) {
          router.navigate(NAV_ITEMS[index].route);
        }
      }
    });
  }

  /**
   * به‌روزرسانی nav item فعال
   * @private
   */
  _updateActiveNav(routeName) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(btn => {
      const isActive = btn.dataset.route === routeName;
      if (isActive) {
        btn.classList.add('bg-primary-600', 'text-white');
        btn.classList.remove('text-slate-300', 'hover:bg-slate-700');
      } else {
        btn.classList.remove('bg-primary-600', 'text-white');
        btn.classList.add('text-slate-300', 'hover:bg-slate-700');
      }
    });
  }

  /**
   * toggle sidebar (موبایل)
   * @private
   */
  _toggleSidebar() {
    this._isSidebarOpen = !this._isSidebarOpen;
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    
    if (this._isSidebarOpen) {
      sidebar.classList.remove('translate-x-full');
      overlay.classList.remove('hidden');
    } else {
      sidebar.classList.add('translate-x-full');
      overlay.classList.add('hidden');
    }
  }

  /**
   * بستن sidebar
   * @private
   */
  _closeSidebar() {
    this._isSidebarOpen = false;
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    
    sidebar.classList.add('translate-x-full');
    overlay.classList.add('hidden');
  }

  /**
   * بستن sidebar در موبایل بعد از navigation
   * @private
   */
  _closeSidebarOnMobile() {
    if (window.innerWidth < 1024) {
      this._closeSidebar();
    }
  }

  /**
   * اعمال تم
   * @private
   */
  _applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.body.classList.remove('bg-slate-900', 'text-slate-100');
      document.body.classList.add('bg-slate-50', 'text-slate-900');
    } else {
      document.documentElement.classList.remove('light');
      document.body.classList.add('bg-slate-900', 'text-slate-100');
      document.body.classList.remove('bg-slate-50', 'text-slate-900');
    }
    
    // به‌روزرسانی آیکون تم
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
    
    logger.info('تم اعمال شد', { theme });
  }

  /**
   * دریافت container اصلی محتوا
   * @returns {HTMLElement}
   */
  getMainContent() {
    return document.getElementById('main-content');
  }
}

// ============================================================
// Singleton
// ============================================================

let layoutInstance = null;

export function getLayout() {
  if (!layoutInstance) {
    layoutInstance = new Layout();
  }
  return layoutInstance;
}

export default getLayout();