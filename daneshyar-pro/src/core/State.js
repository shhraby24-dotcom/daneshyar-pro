/**
 * دانش‌یار پرو - سیستم مدیریت وضعیت (State Management)
 * مدیریت وضعیت مرکزی برنامه با قابلیت reactive و auto-persist
 * @module core/State
 */

import storage, { LS_KEYS } from './Storage.js';
import LoggerModule from './Logger.js';
import EventBusModule, { EVENTS } from './EventBus.js';

const logger = LoggerModule.getInstance().module('State');
const eventBus = EventBusModule.getInstance();

/**
 * ساختار اولیه state برنامه
 */
const DEFAULT_STATE = {
  // اطلاعات عمومی
  app: {
    version: '8.0.0',
    initialized: false,
    firstRun: true
  },
  
  // یادداشت‌ها - آرایه‌ای از اشیاء Note
  notes: [],
  
  // فلش‌کارت‌ها - آرایه‌ای از اشیاء Flashcard
  flashcards: [],
  
  // تاریخچه آزمون‌ها
  quizHistory: [],
  
  // جلسات مطالعه (برای heatmap و آمار)
  studySessions: [],
  
  // تنظیمات کاربر
  settings: {
    theme: 'dark',
    language: 'fa',
    negativeMarking: true,
    defaultQuizCount: 10,
    pomodoroWorkMinutes: 25,
    pomodoroBreakMinutes: 5,
    pomodoroLongBreakMinutes: 15,
    autoSaveDraft: true
  },
  
  // آمار کلی (محاسبه شده)
  stats: {
    totalNotes: 0,
    totalFlashcards: 0,
    totalQuizzes: 0,
    averageScore: 0,
    studyStreak: 0
  }
};

/**
 * کلیدهایی که باید به صورت خودکار persist شوند
 */
const PERSIST_KEYS = [
  'notes',
  'flashcards', 
  'quizHistory',
  'studySessions',
  'settings'
];

/**
 * کلیدهایی که باید در IndexedDB ذخیره شوند (داده‌های حجیم)
 */
const IDB_COLLECTIONS = {
  notes: 'notes',
  flashcards: 'flashcards',
  quizHistory: 'quiz_history',
  studySessions: 'study_sessions'
};

/**
 * کلاس اصلی State
 */
class StateManager {
  constructor() {
    // state خصوصی
    this._state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    
    // listener های تغییر state
    this._listeners = new Map();
    
    // timer برای debounce در persist
    this._persistTimers = {};
    
    // در حال بارگذاری اولیه
    this._isLoading = false;
    
    logger.debug('StateManager initialized');
  }

  /**
   * بارگذاری state از Storage
   * باید یک بار در ابتدای برنامه فراخوانی شود
   */
  async load() {
    if (this._isLoading) return;
    this._isLoading = true;
    
    try {
      logger.group('بارگذاری state');
      
      // بارگذاری تنظیمات از localStorage
      const savedSettings = storage.getLocal(LS_KEYS.SETTINGS, null);
      if (savedSettings) {
        this._state.settings = { ...this._state.settings, ...savedSettings };
        logger.info('تنظیمات بارگذاری شد');
      }
      
      // بارگذاری theme از localStorage
      const savedTheme = storage.getLocal(LS_KEYS.THEME, null);
      if (savedTheme) {
        this._state.settings.theme = savedTheme;
      }
      
      // بررسی firstRun
      const onboardingDone = storage.getLocal(LS_KEYS.ONBOARDING, false);
      this._state.app.firstRun = !onboardingDone;
      
      // بارگذاری داده‌های حجیم از IndexedDB
      for (const [stateKey, collection] of Object.entries(IDB_COLLECTIONS)) {
        try {
          const data = await storage.getAll(collection);
          this._state[stateKey] = data || [];
          logger.info(`${stateKey} بارگذاری شد`, { count: data?.length || 0 });
        } catch (error) {
          logger.warn(`خطا در بارگذاری ${stateKey}`, error);
          this._state[stateKey] = [];
        }
      }
      
      // محاسبه آمار اولیه
      this._recalculateStats();
      
      this._state.app.initialized = true;
      logger.groupEnd();
      
      // انتشار رویداد آماده شدن
      eventBus.emit(EVENTS.APP_READY, { state: this._state });
      
      return this._state;
    } catch (error) {
      logger.error('خطا در بارگذاری state', error);
      throw error;
    } finally {
      this._isLoading = false;
    }
  }

  /**
   * دریافت یک بخش از state
   * @param {string} key - نام کلید
   * @returns {*} مقدار
   */
  get(key) {
    return this._state[key];
  }

  /**
   * دریافت کل state (کپی عمیق)
   * @returns {Object}
   */
  getAll() {
    return JSON.parse(JSON.stringify(this._state));
  }

  /**
   * تنظیم یک بخش از state
   * @param {string} key - نام کلید
   * @param {*} value - مقدار جدید
   * @param {Object} [options] - تنظیمات
   * @param {boolean} [options.persist] - آیا persist شود؟
   * @param {boolean} [options.silent] - بدون انتشار event؟
   */
  set(key, value, options = {}) {
    const { persist = true, silent = false } = options;
    
    const oldValue = this._state[key];
    this._state[key] = value;
    
    logger.debug('State تغییر کرد', { 
      key, 
      oldValue: typeof oldValue === 'object' ? '[object]' : oldValue,
      newValue: typeof value === 'object' ? '[object]' : value
    });
    
    // فراخوانی listener های این کلید
    this._notifyListeners(key, value, oldValue);
    
    // انتشار event
    if (!silent) {
      eventBus.emit(EVENTS.STATE_CHANGED, {
        key,
        value,
        oldValue
      });
    }
    
    // محاسبه مجدد آمار اگر لازم است
    if (['notes', 'flashcards', 'quizHistory'].includes(key)) {
      this._recalculateStats();
    }
    
    // persist خودکار
    if (persist && PERSIST_KEYS.includes(key)) {
      this._schedulePersist(key);
    }
  }

  /**
   * به‌روزرسانی جزئی یک بخش از state
   * @param {string} key - نام کلید
   * @param {Object} updates - تغییرات
   */
  update(key, updates) {
    const current = this._state[key];
    if (typeof current !== 'object' || current === null) {
      logger.warn('update فقط برای اشیاء کار می‌کند', { key });
      return;
    }
    this.set(key, { ...current, ...updates });
  }

  // --------------------------------------------------------
  // متدهای اختصاصی برای notes
  // --------------------------------------------------------

  getNotes() {
    return this._state.notes;
  }

  getNote(id) {
    return this._state.notes.find(n => n.id === id) || null;
  }

  addNote(note) {
    this._state.notes.unshift(note);
    this._notifyListeners('notes', this._state.notes);
    this._recalculateStats();
    this._schedulePersist('notes');
    
    eventBus.emit(EVENTS.NOTE_CREATED, note);
    return note;
  }

  updateNote(id, updates) {
    const index = this._state.notes.findIndex(n => n.id === id);
    if (index === -1) {
      logger.warn('یادداشت یافت نشد', { id });
      return null;
    }
    
    this._state.notes[index] = { ...this._state.notes[index], ...updates };
    this._notifyListeners('notes', this._state.notes);
    this._schedulePersist('notes');
    
    eventBus.emit(EVENTS.NOTE_UPDATED, this._state.notes[index]);
    return this._state.notes[index];
  }

  deleteNote(id) {
    const index = this._state.notes.findIndex(n => n.id === id);
    if (index === -1) return false;
    
    const deleted = this._state.notes.splice(index, 1)[0];
    this._notifyListeners('notes', this._state.notes);
    this._recalculateStats();
    this._schedulePersist('notes');
    
    eventBus.emit(EVENTS.NOTE_DELETED, deleted);
    return true;
  }

  // --------------------------------------------------------
  // متدهای اختصاصی برای flashcards
  // --------------------------------------------------------

  getFlashcards() {
    return this._state.flashcards;
  }

  getFlashcard(id) {
    return this._state.flashcards.find(f => f.id === id) || null;
  }

  getDueFlashcards() {
    const now = new Date();
    return this._state.flashcards.filter(f => new Date(f.nextReview) <= now);
  }

  addFlashcard(flashcard) {
    this._state.flashcards.push(flashcard);
    this._notifyListeners('flashcards', this._state.flashcards);
    this._recalculateStats();
    this._schedulePersist('flashcards');
    
    eventBus.emit(EVENTS.FLASHCARD_CREATED, flashcard);
    return flashcard;
  }

  addFlashcards(cards) {
    this._state.flashcards.push(...cards);
    this._notifyListeners('flashcards', this._state.flashcards);
    this._recalculateStats();
    this._schedulePersist('flashcards');
    
    for (const card of cards) {
      eventBus.emit(EVENTS.FLASHCARD_CREATED, card);
    }
    return cards;
  }

  updateFlashcard(id, updates) {
    const index = this._state.flashcards.findIndex(f => f.id === id);
    if (index === -1) return null;
    
    this._state.flashcards[index] = { ...this._state.flashcards[index], ...updates };
    this._notifyListeners('flashcards', this._state.flashcards);
    this._schedulePersist('flashcards');
    
    eventBus.emit(EVENTS.FLASHCARD_REVIEWED, this._state.flashcards[index]);
    return this._state.flashcards[index];
  }

  deleteFlashcard(id) {
    const index = this._state.flashcards.findIndex(f => f.id === id);
    if (index === -1) return false;
    
    const deleted = this._state.flashcards.splice(index, 1)[0];
    this._notifyListeners('flashcards', this._state.flashcards);
    this._recalculateStats();
    this._schedulePersist('flashcards');
    
    eventBus.emit(EVENTS.FLASHCARD_DELETED, deleted);
    return true;
  }

  // --------------------------------------------------------
  // متدهای اختصاصی برای quizHistory
  // --------------------------------------------------------

  getQuizHistory() {
    return this._state.quizHistory;
  }

  addQuizResult(quizResult) {
    this._state.quizHistory.unshift(quizResult);
    this._notifyListeners('quizHistory', this._state.quizHistory);
    this._recalculateStats();
    this._schedulePersist('quizHistory');
    
    eventBus.emit(EVENTS.QUIZ_COMPLETED, quizResult);
    return quizResult;
  }

  // --------------------------------------------------------
  // متدهای اختصاصی برای studySessions
  // --------------------------------------------------------

  logStudySession(type, data = {}) {
    const session = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date: new Date().toISOString(),
      type,
      ...data
    };
    
    this._state.studySessions.push(session);
    this._schedulePersist('studySessions');
    
    eventBus.emit('session:logged', session);
    return session;
  }

  // --------------------------------------------------------
  // متدهای settings
  // --------------------------------------------------------

  getSettings() {
    return { ...this._state.settings };
  }

  updateSettings(updates) {
    this._state.settings = { ...this._state.settings, ...updates };
    
    // ذخیره تنظیمات در localStorage (نه IndexedDB)
    try {
      storage.setLocal(LS_KEYS.SETTINGS, this._state.settings);
      
      // ذخیره theme به صورت جداگانه
      if (updates.theme !== undefined) {
        storage.setLocal(LS_KEYS.THEME, updates.theme);
      }
    } catch (error) {
      logger.error('خطا در ذخیره تنظیمات', error);
    }
    
    this._notifyListeners('settings', this._state.settings);
    eventBus.emit('settings:changed', this._state.settings);
    
    return this._state.settings;
  }

  // --------------------------------------------------------
  // متدهای stats
  // --------------------------------------------------------

  getStats() {
    return { ...this._state.stats };
  }

  _recalculateStats() {
    const notes = this._state.notes;
    const flashcards = this._state.flashcards;
    const quizHistory = this._state.quizHistory;
    
    const newStats = {
      totalNotes: notes.length,
      totalFlashcards: flashcards.length,
      totalQuizzes: quizHistory.length,
      averageScore: quizHistory.length > 0
        ? Math.round(
            quizHistory.reduce((sum, q) => sum + (q.percentage || 0), 0) / 
            quizHistory.length
          )
        : 0,
      studyStreak: this._calculateStudyStreak()
    };
    
    const changed = JSON.stringify(newStats) !== JSON.stringify(this._state.stats);
    this._state.stats = newStats;
    
    if (changed) {
      this._notifyListeners('stats', newStats);
    }
  }

  _calculateStudyStreak() {
    const sessions = this._state.studySessions;
    if (sessions.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const uniqueDays = new Set(
      sessions.map(s => {
        const d = new Date(s.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );
    
    let streak = 0;
    let checkDate = new Date(today);
    
    while (uniqueDays.has(checkDate.getTime())) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    return streak;
  }

  // --------------------------------------------------------
  // سیستم Listener ها
  // --------------------------------------------------------

  /**
   * ثبت listener برای تغییرات یک کلید خاص
   * @param {string} key - کلید (مثلاً 'notes', 'settings')
   * @param {Function} callback - تابع فراخوانی شونده
   * @returns {Function} تابع unsubscribe
   */
  subscribe(key, callback) {
    if (!this._listeners.has(key)) {
      this._listeners.set(key, new Set());
    }
    
    this._listeners.get(key).add(callback);
    
    // برگرداندن تابع unsubscribe
    return () => {
      const listeners = this._listeners.get(key);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  /**
   * ثبت listener برای همه تغییرات
   * @param {Function} callback
   * @returns {Function}
   */
  subscribeAll(callback) {
    return this.subscribe('*', callback);
  }

  _notifyListeners(key, newValue, oldValue) {
    // listener های اختصاصی این کلید
    const listeners = this._listeners.get(key);
    if (listeners) {
      for (const cb of listeners) {
        try {
          cb(newValue, oldValue, key);
        } catch (error) {
          logger.error('خطا در state listener', { key, error });
        }
      }
    }
    
    // listener های عمومی (*)
    const globalListeners = this._listeners.get('*');
    if (globalListeners) {
      for (const cb of globalListeners) {
        try {
          cb(newValue, oldValue, key);
        } catch (error) {
          logger.error('خطا در global state listener', { key, error });
        }
      }
    }
  }

  // --------------------------------------------------------
  // سیستم Persist
  // --------------------------------------------------------

  _schedulePersist(key) {
    if (this._persistTimers[key]) {
      clearTimeout(this._persistTimers[key]);
    }
    
    // debounce: 500ms صبر کن
    this._persistTimers[key] = setTimeout(() => {
      this._persistKey(key);
    }, 500);
  }

  async _persistKey(key) {
    const collection = IDB_COLLECTIONS[key];
    if (!collection) return;
    
    try {
      await storage.saveMany(collection, this._state[key]);
      logger.debug(`${key} persist شد`, { count: this._state[key].length });
    } catch (error) {
      logger.error(`خطا در persist ${key}`, error);
    }
  }

  /**
   * persist فوری همه داده‌ها (برای قبل از خروج از برنامه)
   */
  async persistAll() {
    logger.info('در حال persist فوری همه داده‌ها...');
    
    const promises = PERSIST_KEYS
      .filter(key => IDB_COLLECTIONS[key])
      .map(key => this._persistKey(key));
    
    await Promise.all(promises);
    
    storage.setLocal(LS_KEYS.LAST_SYNC, new Date().toISOString());
    logger.info('persist کامل شد');
  }

  // --------------------------------------------------------
  // متدهای کمکی
  // --------------------------------------------------------

  /**
   * ریست کامل state به مقادیر پیش‌فرض
   * ⚠️ این متد همه داده‌ها را حذف می‌کند
   */
  async reset() {
    logger.warn('ریست کامل state');
    
    // پاک کردن IndexedDB
    for (const collection of Object.values(IDB_COLLECTIONS)) {
      try {
        await storage.clear(collection);
      } catch (error) {
        logger.warn(`خطا در پاک کردن ${collection}`, error);
      }
    }
    
    // پاک کردن localStorage
    storage.removeLocal(LS_KEYS.SETTINGS);
    storage.removeLocal(LS_KEYS.THEME);
    storage.removeLocal(LS_KEYS.DRAFT);
    storage.removeLocal(LS_KEYS.LAST_SYNC);
    storage.removeLocal(LS_KEYS.ONBOARDING);
    
    // ریست state در حافظه
    this._state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    
    // اطلاع به listener ها
    for (const key of Object.keys(this._state)) {
      this._notifyListeners(key, this._state[key]);
    }
    
    eventBus.emit('state:reset');
  }

  /**
   * علامت‌گذاری onboarding به عنوان کامل شده
   */
  markOnboardingComplete() {
    this._state.app.firstRun = false;
    storage.setLocal(LS_KEYS.ONBOARDING, true);
  }

  /**
   * آیا state آماده است؟
   */
  isReady() {
    return this._state.app.initialized;
  }
}

// ============================================================
// Singleton
// ============================================================

let stateInstance = null;

export function getState() {
  if (!stateInstance) {
    stateInstance = new StateManager();
  }
  return stateInstance;
}

export default getState();