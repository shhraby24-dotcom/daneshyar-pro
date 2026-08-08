/**
 * دانش‌یار پرو - سیستم Router داخلی
 * مدیریت navigation بین view ها با استفاده از hash-based routing
 * @module ui/router
 */

import LoggerModule from '../core/Logger.js';
import EventBusModule, { EVENTS } from '../core/EventBus.js';

const logger = LoggerModule.getInstance().module('Router');
const eventBus = EventBusModule.getInstance();

/**
 * مسیرهای پیش‌فرض و تنظیمات آن‌ها
 */
const DEFAULT_ROUTES = {
  dashboard: {
    title: 'داشبورد',
    icon: '📊',
    requiresAuth: false
  },
  summarizer: {
    title: 'خلاصه‌ساز',
    icon: '✨',
    requiresAuth: false
  },
  quiz: {
    title: 'آزمون‌ساز',
    icon: '📝',
    requiresAuth: false
  },
  flashcards: {
    title: 'فلش‌کارت',
    icon: '🃏',
    requiresAuth: false
  },
  notes: {
    title: 'یادداشت‌ها',
    icon: '📚',
    requiresAuth: false
  },
  translator: {
    title: 'مترجم',
    icon: '🌐',
    requiresAuth: false
  },
  calculator: {
    title: 'ماشین‌حساب',
    icon: '🧮',
    requiresAuth: false
  },
  pomodoro: {
    title: 'پومودورو',
    icon: '⏱️',
    requiresAuth: false
  },
  settings: {
    title: 'تنظیمات',
    icon: '⚙️',
    requiresAuth: false
  }
};

/**
 * کلاس اصلی Router
 */
class Router {
  constructor() {
    // مسیرهای ثبت شده
    this._routes = new Map();
    
    // view factories ثبت شده
    this._viewFactories = new Map();
    
    // route فعلی
    this._currentRoute = null;
    
    // route قبلی (برای back)
    this._previousRoute = null;
    
    // عنصر DOM که view در آن رندر می‌شود
    this._container = null;
    
    // default route (اگر مسیر نامعتبر بود)
    this._defaultRoute = 'dashboard';
    
    // 404 view factory
    this._notFoundFactory = null;
    
    // middlewares
    this._beforeEachHooks = [];
    this._afterEachHooks = [];
    
    // گوش دادن به تغییرات hash
    this._boundHashChange = this._handleHashChange.bind(this);
    window.addEventListener('hashchange', this._boundHashChange);
    
    // گوش دادن به navigation از EventBus
    eventBus.on(EVENTS.UI_NAVIGATE, (data) => {
      if (data && data.route) {
        this.navigate(data.route, data.params);
      }
    });
    
    logger.debug('Router initialized');
  }

  /**
   * تنظیم container که view ها در آن رندر می‌شوند
   * @param {HTMLElement|string} container
   */
  setContainer(container) {
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
   * @param {string} name - نام مسیر
   * @param {Function} factory - تابعی که HTML یا DOM element تولید می‌کند
   * @param {Object} [options] - تنظیمات اضافی
   */
  registerView(name, factory, options = {}) {
    this._viewFactories.set(name, factory);
    
    // ثبت اطلاعات route
    const routeConfig = {
      ...DEFAULT_ROUTES[name],
      ...options,
      name
    };
    this._routes.set(name, routeConfig);
    
    logger.debug('View ثبت شد', { name });
  }

  /**
   * ثبت view factory برای 404
   * @param {Function} factory
   */
  setNotFound(factory) {
    this._notFoundFactory = factory;
  }

  /**
   * تنظیم default route
   * @param {string} route
   */
  setDefaultRoute(route) {
    this._defaultRoute = route;
  }

  /**
   * ثبت middleware قبل از هر navigation
   * @param {Function} hook - (to, from) => boolean|void
   */
  beforeEach(hook) {
    this._beforeEachHooks.push(hook);
  }

  /**
   * ثبت middleware بعد از هر navigation
   * @param {Function} hook - (to, from) => void
   */
  afterEach(hook) {
    this._afterEachHooks.push(hook);
  }

  /**
   * navigation به یک مسیر
   * @param {string} route - نام مسیر
   * @param {Object} [params] - پارامترهای اختیاری
   * @param {Object} [options] - تنظیمات
   * @param {boolean} [options.replace] - جایگزینی به جای push در history
   * @param {boolean} [options.silent] - بدون انتشار event
   */
  async navigate(route, params = {}, options = {}) {
    const { replace = false, silent = false } = options;
    
    // parse route name
    const routeName = this._parseRouteName(route);
    
    // بررسی وجود view factory
    if (!this._viewFactories.has(routeName)) {
      logger.warn('مسیر یافت نشد، نمایش 404', { route: routeName });
      return this._renderNotFound(routeName);
    }
    
    // ساخت route objects
    const from = this._currentRoute;
    const to = {
      name: routeName,
      params: params,
      config: this._routes.get(routeName),
      timestamp: Date.now()
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
        params
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
      to: routeName 
    });
    
    return true;
  }

  /**
   * برگشت به route قبلی
   */
  back() {
    if (this._previousRoute) {
      return this.navigate(this._previousRoute.name, this._previousRoute.params);
    }
    return this.navigate(this._defaultRoute);
  }

  /**
   * دریافت route فعلی
   * @returns {Object|null}
   */
  getCurrentRoute() {
    return this._currentRoute ? { ...this._currentRoute } : null;
  }

  /**
   * دریافت پارامتر فعلی
   * @param {string} [key] - نام پارامتر (اختیاری)
   * @returns {*}
   */
  getParams(key = null) {
    if (!this._currentRoute) return key ? undefined : {};
    const params = this._currentRoute.params || {};
    return key ? params[key] : { ...params };
  }

  /**
   * دریافت لیست همه مسیرهای ثبت شده
   * @returns {Array}
   */
  getRoutes() {
    return Array.from(this._routes.values());
  }

  /**
   * بررسی اینکه آیا یک مسیر ثبت شده است
   * @param {string} name
   * @returns {boolean}
   */
  hasRoute(name) {
    return this._viewFactories.has(name);
  }

  /**
   * ساخت URL hash از route name و params
   * @private
   */
  _buildHashUrl(routeName, params = {}) {
    let url = `#/${routeName}`;
    
    // اضافه کردن params به URL
    const paramKeys = Object.keys(params);
    if (paramKeys.length > 0) {
      const queryString = paramKeys
        .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
        .join('&');
      url += `?${queryString}`;
    }
    
    return url;
  }

  /**
   * parse کردن hash URL به route name و params
   * @private
   */
  _parseHashUrl() {
    const hash = window.location.hash.slice(1) || ''; // حذف #
    
    if (!hash || hash === '/') {
      return { name: this._defaultRoute, params: {} };
    }
    
    // جدا کردن path و query
    const [path, query = ''] = hash.split('?');
    
    // حذف / از ابتدا
    const routeName = path.startsWith('/') ? path.slice(1) : path;
    
    // parse query string
    const params = {};
    if (query) {
      query.split('&').forEach(pair => {
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
   * @private
   */
  _parseRouteName(route) {
    if (!route) return this._defaultRoute;
    
    // اگر # دارد، parse کن
    if (route.startsWith('#')) {
      return this._parseHashUrl().name;
    }
    
    // اگر / دارد، بخش اول را بگیر
    if (route.includes('/')) {
      return route.split('/')[0].split('?')[0];
    }
    
    // حذف query string
    return route.split('?')[0];
  }

  /**
   * رندر یک view
   * @private
   */
  async _renderView(routeName, params) {
    if (!this._container) {
      logger.error('Container تنظیم نشده است');
      return;
    }
    
    const factory = this._viewFactories.get(routeName);
    if (!factory) {
      return this._renderNotFound(routeName);
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
      logger.error('خطا در رندر view', { routeName, error });
      this._hideLoading();
      this._renderError(routeName, error);
    }
  }

  /**
   * رندر view 404
   * @private
   */
  _renderNotFound(routeName) {
    if (this._notFoundFactory) {
      try {
        const result = this._notFoundFactory(routeName);
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

  /**
   * رندر view خطا
   * @private
   */
  _renderError(routeName, error) {
    this._container.innerHTML = `
      <div class="min-h-screen flex items-center justify-center p-8">
        <div class="bg-red-900/20 border border-red-700 rounded-xl p-8 max-w-lg text-center">
          <div class="text-5xl mb-4">❌</div>
          <h2 class="text-xl font-bold text-red-400 mb-2">خطا در بارگذاری صفحه</h2>
          <p class="text-slate-300 mb-4">${error.message || 'خطای ناشناخته'}</p>
          <button onclick="location.reload()" 
                  class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition">
            تلاش مجدد
          </button>
        </div>
      </div>
    `;
  }

  /**
   * نمایش loading
   * @private
   */
  _showLoading() {
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
   * @private
   */
  _hideLoading() {
    // loading خودکار با رندر view حذف می‌شود
  }

  /**
   * مدیریت تغییر hash
   * @private
   */
  _handleHashChange() {
    const { name, params } = this._parseHashUrl();
    
    // جلوگیری از navigation تکراری
    if (this._currentRoute && 
        this._currentRoute.name === name && 
        JSON.stringify(this._currentRoute.params) === JSON.stringify(params)) {
      return;
    }
    
    this.navigate(name, params, { silent: true });
  }

  /**
   * راه‌اندازی اولیه بر اساس URL فعلی
   */
  async start() {
    const { name, params } = this._parseHashUrl();
    
    if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
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
  destroy() {
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

let routerInstance = null;

export function getRouter() {
  if (!routerInstance) {
    routerInstance = new Router();
  }
  return routerInstance;
}

export default getRouter();