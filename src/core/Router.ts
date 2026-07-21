/**
 * ============================================================
 * دانش‌یار پرو - سیستم Router داخلی
 * ============================================================
 *
 * مدیریت navigation بین view ها با استفاده از hash-based routing
 *
 * ✅ Hash-based routing (#/dashboard, #/notes, ...)
 * ✅ Middleware system (beforeEach, afterEach)
 * ✅ View factory pattern با lazy loading
 * ✅ 404 و Error handling
 * ✅ Browser History API (Back/Forward)
 * ✅ Parameter passing بین صفحات
 * ✅ Event integration با EventBus
 *
 * @module core/Router
 * @version 1.0.0-beta.1
 */

import { getInstance as getLogger } from '@/core/Logger';
import { getInstance as getEventBus, EVENTS } from '@/core/EventBus';

const logger = getLogger().module('Router');
const eventBus = getEventBus();

// ============================================================
// Types و Interfaces
// ============================================================

/**
 * اطلاعات یک route
 */
export interface RouteConfig {
  name: string;
  title: string;
  icon?: string;
  requiresAuth?: boolean;
  meta?: Record<string, unknown>;
}

/**
 * یک route object (در navigation)
 */
export interface RouteObject {
  name: string;
  params: Record<string, unknown>;
  config?: RouteConfig;
  timestamp: number;
}

/**
 * تنظیمات navigation
 */
export interface NavigateOptions {
  replace?: boolean;
  silent?: boolean;
}

/**
 * نتیجه یک view factory
 */
export type ViewFactoryResult =
  | string
  | HTMLElement
  | { render: () => HTMLElement | Promise<HTMLElement> }
  | Promise<string | HTMLElement>;

/**
 * یک view factory
 */
export type ViewFactory = (
  params: Record<string, unknown>
) => ViewFactoryResult | Promise<ViewFactoryResult>;

/**
 * Middleware قبل از navigation
 */
export type BeforeEachHook = (
  to: RouteObject,
  from: RouteObject | null
) => boolean | void | Promise<boolean | void>;

/**
 * Middleware بعد از navigation
 */
export type AfterEachHook = (
  to: RouteObject,
  from: RouteObject | null
) => void | Promise<void>;

/**
 * اطلاعات navigation (برای event)
 */
export interface NavigationEvent {
  to: RouteObject;
  from: RouteObject | null;
  params: Record<string, unknown>;
}

/**
 * تنظیمات اولیه Router
 */
export interface RouterOptions {
  defaultRoute?: string;
  container?: HTMLElement | string;
}

// ============================================================
// ثابت‌ها
// ============================================================

/**
 * مسیرهای پیش‌فرض و تنظیمات آن‌ها
 */
const DEFAULT_ROUTES: Record<string, Omit<RouteConfig, 'name'>> = {
  dashboard: {
    title: 'داشبورد',
    icon: '📊',
    requiresAuth: false,
  },
  summarizer: {
    title: 'خلاصه‌ساز',
    icon: '✨',
    requiresAuth: false,
  },
  quiz: {
    title: 'آزمون‌ساز',
    icon: '📝',
    requiresAuth: false,
  },
  flashcards: {
    title: 'فلش‌کارت',
    icon: '🃏',
    requiresAuth: false,
  },
  notes: {
    title: 'یادداشت‌ها',
    icon: '📚',
    requiresAuth: false,
  },
  translator: {
    title: 'مترجم',
    icon: '🌐',
    requiresAuth: false,
  },
  calculator: {
    title: 'ماشین‌حساب',
    icon: '🧮',
    requiresAuth: false,
  },
  pomodoro: {
    title: 'پومودورو',
    icon: '⏱️',
    requiresAuth: false,
  },
  settings: {
    title: 'تنظیمات',
    icon: '⚙️',
    requiresAuth: false,
  },
};

// ============================================================
// کلاس اصلی Router
// ============================================================

/**
 * کلاس اصلی Router
 */
export class Router {
  private _routes: Map<string, RouteConfig> = new Map();
  private _viewFactories: Map<string, ViewFactory> = new Map();
  private _currentRoute: RouteObject | null = null;
  private _previousRoute: RouteObject | null = null;
  private _container: HTMLElement | null = null;
  private _defaultRoute: string = 'dashboard';
  private _notFoundFactory: ViewFactory | null = null;
  private _beforeEachHooks: BeforeEachHook[] = [];
  private _afterEachHooks: AfterEachHook[] = [];
  private _boundHashChange: () => void;

  /**
   * سازنده کلاس Router
   */
  constructor(options: RouterOptions = {}) {
    if (options.defaultRoute) {
      this._defaultRoute = options.defaultRoute;
    }

    if (options.container) {
      this.setContainer(options.container);
    }

    // گوش دادن به تغییرات hash
    this._boundHashChange = this._handleHashChange.bind(this);
    window.addEventListener('hashchange', this._boundHashChange);

    // گوش دادن به navigation از EventBus
    eventBus.on(EVENTS.UI_NAVIGATE, (data: unknown) => {
      const navData = data as { route?: string; params?: Record<string, unknown> };
      if (navData && navData.route) {
        this.navigate(navData.route, navData.params || {});
      }
    });

    logger.debug('Router initialized');
  }

  /**
   * تنظیم container که view ها در آن رندر می‌شوند
   */
  setContainer(container: HTMLElement | string): void {
    if (typeof container === 'string') {
      this._container = document.querySelector(container);
    } else {
      this._container = container;
    }

    if (!this._container) {
      logger.error('Container یافت نشد', { container });
    }
  }

  /**
   * ثبت یک view factory برای یک مسیر
   */
  registerView(
    name: string,
    factory: ViewFactory,
    options: Partial<RouteConfig> = {}
  ): void {
    this._viewFactories.set(name, factory);

    // ثبت اطلاعات route
    const defaultConfig = DEFAULT_ROUTES[name] ?? { title: name };
    const routeConfig: RouteConfig = {
      ...defaultConfig,
      ...options,
      name,
      title: options.title ?? defaultConfig.title ?? name,
    };
    this._routes.set(name, routeConfig);

    logger.debug('View ثبت شد', { name });
  }

  /**
   * ثبت view factory برای 404
   */
  setNotFound(factory: ViewFactory): void {
    this._notFoundFactory = factory;
  }

  /**
   * تنظیم default route
   */
  setDefaultRoute(route: string): void {
    this._defaultRoute = route;
  }

  /**
   * ثبت middleware قبل از هر navigation
   */
  beforeEach(hook: BeforeEachHook): void {
    this._beforeEachHooks.push(hook);
  }

  /**
   * ثبت middleware بعد از هر navigation
   */
  afterEach(hook: AfterEachHook): void {
    this._afterEachHooks.push(hook);
  }

  /**
   * navigation به یک مسیر
   */
  async navigate(
    route: string,
    params: Record<string, unknown> = {},
    options: NavigateOptions = {}
  ): Promise<boolean> {
    const { replace = false, silent = false } = options;

    // parse route name
    const routeName = this._parseRouteName(route);

    // بررسی وجود view factory
    if (!this._viewFactories.has(routeName)) {
      logger.warn('مسیر یافت نشد، نمایش 404', { route: routeName });
      await this._renderNotFound(routeName);
      return false;
    }

    // ساخت route objects
    const from = this._currentRoute;
    const to: RouteObject = {
      name: routeName,
      params,
      config: this._routes.get(routeName),
      timestamp: Date.now(),
    };

    // اجرای beforeEach hooks
    for (const hook of this._beforeEachHooks) {
      try {
        const result = await hook(to, from);
        if (result === false) {
          logger.info('Navigation لغو شد توسط hook', { route: routeName });
          return false;
        }
      } catch (error) {
        logger.error('خطا در beforeEach hook', error);
        return false;
      }
    }

    // به‌روزرسانی hash URL
    const hashUrl = this._buildHashUrl(routeName, params);
    if (replace) {
      history.replaceState(null, '', hashUrl);
    } else {
      history.pushState(null, '', hashUrl);
    }

    // رندر view
    await this._renderView(routeName, params);

    // به‌روزرسانی state
    this._previousRoute = this._currentRoute;
    this._currentRoute = to;

    // انتشار event
    if (!silent) {
      eventBus.emit('router:navigated', {
        to,
        from,
        params,
      });
    }

    // اجرای afterEach hooks
    for (const hook of this._afterEachHooks) {
      try {
        await hook(to, from);
      } catch (error) {
        logger.error('خطا در afterEach hook', error);
      }
    }

    logger.info('Navigation موفق', {
      from: from?.name,
      to: routeName,
    });

    return true;
  }

  /**
   * برگشت به route قبلی
   */
  back(): Promise<boolean> {
    if (this._previousRoute) {
      return this.navigate(
        this._previousRoute.name,
        this._previousRoute.params
      );
    }
    return this.navigate(this._defaultRoute);
  }

  /**
   * دریافت route فعلی
   */
  getCurrentRoute(): RouteObject | null {
    return this._currentRoute ? { ...this._currentRoute } : null;
  }

  /**
   * دریافت پارامتر فعلی
   */
  getParams<T = unknown>(key?: string): T | Record<string, unknown> | undefined {
    if (!this._currentRoute) return key ? undefined : {};
    const params = this._currentRoute.params || {};
    return key ? (params[key] as T) : { ...params };
  }

  /**
   * دریافت لیست همه مسیرهای ثبت شده
   */
  getRoutes(): RouteConfig[] {
    return Array.from(this._routes.values());
  }

  /**
   * بررسی اینکه آیا یک مسیر ثبت شده است
   */
  hasRoute(name: string): boolean {
    return this._viewFactories.has(name);
  }

  // ============================================================
  // متدهای خصوصی
  // ============================================================

  /**
   * ساخت URL hash از route name و params
   */
  private _buildHashUrl(
    routeName: string,
    params: Record<string, unknown> = {}
  ): string {
    let url = `#/${routeName}`;

    // اضافه کردن params به URL
    const paramKeys = Object.keys(params);
    if (paramKeys.length > 0) {
      const queryString = paramKeys
        .map(
          (k) =>
            `${encodeURIComponent(k)}=${encodeURIComponent(String(params[k]))}`
        )
        .join('&');
      url += `?${queryString}`;
    }

    return url;
  }

  /**
   * parse کردن hash URL به route name و params
   */
  private _parseHashUrl(): { name: string; params: Record<string, unknown> } {
    const hash = window.location.hash.slice(1) || ''; // حذف #

    if (!hash || hash === '/') {
      return { name: this._defaultRoute, params: {} };
    }

    // جدا کردن path و query
    const parts = hash.split('?');
    const path = parts[0] ?? '';
    const query = parts[1] ?? '';

    // حذف / از ابتدا
    const routeName: string = path.startsWith('/') ? path.slice(1) : path;

    // parse query string
    const params: Record<string, unknown> = {};
    if (query) {
      query.split('&').forEach((pair) => {
        const [key, value] = pair.split('=');
        if (key) {
          params[decodeURIComponent(key)] = value
            ? decodeURIComponent(value)
            : '';
        }
      });
    }

    return { name: routeName, params };
  }

  /**
   * parse کردن route name (حذف / و query)
   */
  private _parseRouteName(route: string): string {
    if (!route) return this._defaultRoute;

    // اگر # دارد، parse کن
    if (route.startsWith('#')) {
      return this._parseHashUrl().name;
    }

    // اگر / دارد، بخش اول را بگیر
    if (route.includes('/')) {
      return (route.split('/')[0] ?? '').split('?')[0] ?? this._defaultRoute;
    }

    // حذف query string
    return route.split('?')[0] ?? this._defaultRoute;
  }

  /**
   * رندر یک view
   */
  private async _renderView(
    routeName: string,
    params: Record<string, unknown>
  ): Promise<void> {
    if (!this._container) {
      logger.error('Container تنظیم نشده است');
      return;
    }

    const factory = this._viewFactories.get(routeName);
    if (!factory) {
      await this._renderNotFound(routeName);
      return;
    }

    try {
      // نمایش loading
      this._showLoading();

      // فراخوانی factory
      const result = await Promise.resolve(factory(params));

      // حذف loading
      this._hideLoading();

      // رندر نتیجه
      if (typeof result === 'string') {
        this._container.innerHTML = result;
      } else if (result instanceof HTMLElement) {
        this._container.innerHTML = '';
        this._container.appendChild(result);
      } else if (result && typeof result.render === 'function') {
        this._container.innerHTML = '';
        const element = await result.render();
        this._container.appendChild(element);
      } else {
        logger.warn('نتیجه factory نامعتبر است', { routeName });
        this._container.innerHTML = '';
      }

      // به‌روزرسانی عنوان صفحه
      const routeConfig = this._routes.get(routeName);
      if (routeConfig && routeConfig.title) {
        document.title = `${routeConfig.title} | دانش‌یار پرو`;
      }

      // scroll به بالا
      window.scrollTo(0, 0);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('خطا در رندر view', { routeName, error: errorMessage });
      this._hideLoading();
      this._renderError(routeName, error);
    }
  }

  /**
   * رندر view 404
   */
  private async _renderNotFound(routeName: string): Promise<void> {
    if (this._notFoundFactory && this._container) {
      try {
        const result = await Promise.resolve(
          this._notFoundFactory({ route: routeName })
        );
        if (typeof result === 'string') {
          this._container.innerHTML = result;
        } else if (result instanceof HTMLElement) {
          this._container.innerHTML = '';
          this._container.appendChild(result);
        }
        return;
      } catch (error) {
        logger.error('خطا در رندر 404', error);
      }
    }

    // fallback 404
    if (this._container) {
      this._container.innerHTML = `
        <div class="min-h-screen flex items-center justify-center p-8">
          <div class="text-center">
            <div class="text-7xl mb-4">🔍</div>
            <h1 class="text-3xl font-bold mb-2">صفحه یافت نشد</h1>
            <p class="text-slate-400 mb-6">مسیر "${routeName}" وجود ندارد</p>
            <button onclick="location.hash = '#/dashboard'" 
                    class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition">
              بازگشت به داشبورد
            </button>
          </div>
        </div>
      `;
    }
  }

  /**
   * رندر view خطا
   */
  private _renderError(_routeName: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (this._container) {
      this._container.innerHTML = `
        <div class="min-h-screen flex items-center justify-center p-8">
          <div class="bg-red-900/20 border border-red-700 rounded-xl p-8 max-w-lg text-center">
            <div class="text-5xl mb-4">❌</div>
            <h2 class="text-xl font-bold text-red-400 mb-2">خطا در بارگذاری صفحه</h2>
            <p class="text-slate-300 mb-4">${errorMessage || 'خطای ناشناخته'}</p>
            <button onclick="location.reload()" 
                    class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition">
              تلاش مجدد
            </button>
          </div>
        </div>
      `;
    }
  }

  /**
   * نمایش loading
   */
  private _showLoading(): void {
    // اگر container خالی است، یک placeholder کوچک نشان بده
    if (this._container && !this._container.innerHTML.trim()) {
      this._container.innerHTML = `
        <div class="flex items-center justify-center p-12">
          <div class="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent"></div>
        </div>
      `;
    }
  }

  /**
   * حذف loading
   */
  private _hideLoading(): void {
    // loading خودکار با رندر view حذف می‌شود
  }

  /**
   * مدیریت تغییر hash
   */
  private _handleHashChange(): void {
    const { name, params } = this._parseHashUrl();

    // جلوگیری از navigation تکراری
    if (
      this._currentRoute &&
      this._currentRoute.name === name &&
      JSON.stringify(this._currentRoute.params) === JSON.stringify(params)
    ) {
      return;
    }

    this.navigate(name, params, { silent: true });
  }

  /**
   * راه‌اندازی اولیه بر اساس URL فعلی
   */
  async start(): Promise<void> {
    const { name, params } = this._parseHashUrl();

    if (
      !window.location.hash ||
      window.location.hash === '#' ||
      window.location.hash === '#/'
    ) {
      // URL خالی است، به default route برو
      await this.navigate(this._defaultRoute, {}, { replace: true });
    } else {
      // URL مشخص است، به همان مسیر برو
      await this.navigate(name, params, { replace: true });
    }

    logger.info('Router شروع شد', { initialRoute: name });
  }

  /**
   * حذف router (cleanup)
   */
  destroy(): void {
    window.removeEventListener('hashchange', this._boundHashChange);
    this._routes.clear();
    this._viewFactories.clear();
    this._beforeEachHooks = [];
    this._afterEachHooks = [];
    logger.debug('Router destroyed');
  }
}

// ============================================================
// Singleton
// ============================================================

let routerInstance: Router | null = null;

/**
 * دریافت نمونه singleton از Router
 */
export function getRouter(): Router {
  if (!routerInstance) {
    routerInstance = new Router();
  }
  return routerInstance;
}

/**
 * ریست کردن نمونه singleton (فقط برای تست)
 */
export function resetRouter(): void {
  if (routerInstance) {
    routerInstance.destroy();
  }
  routerInstance = null;
}

/**
 * Export پیش‌فرض
 */
export default getRouter();