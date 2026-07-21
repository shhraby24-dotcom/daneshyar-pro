import { getInstance as getLogger } from '@/core/Logger';
import { getInstance as getEventBus, EVENTS } from '@/core/EventBus';
import { getStorage } from '@/core/Storage';

const logger = getLogger().module('State');
const eventBus = getEventBus();
const storage = getStorage();

// ============================================================
// Types و Interfaces
// ============================================================

/**
 * یک یادداشت
 */
export interface Note {
  id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
  wordCount?: number;
}

/**
 * یک فلش‌کارت
 */
export interface Flashcard {
  id: string;
  front: string;
  back: string;
  deck: string;
  tags?: string[];
  createdAt: string;
  nextReview: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
}

/**
 * نتیجه یک آزمون
 */
export interface QuizResult {
  id: string;
  title: string;
  date: string;
  totalQuestions: number;
  correct: number;
  wrong: number;
  unanswered: number;
  percentage: number;
  timeSpent: number;
  settings?: Record<string, unknown>;
}

/**
 * یک جلسه مطالعه
 */
export interface StudySession {
  id: string;
  date: string;
  type: 'pomodoro' | 'quiz' | 'flashcard' | 'reading' | string;
  duration?: number;
  [key: string]: unknown;
}

/**
 * تنظیمات کاربر
 */
export interface Settings {
  theme: 'light' | 'dark' | 'auto';
  language: 'fa' | 'en';
  negativeMarking: boolean;
  defaultQuizCount: number;
  pomodoroWorkMinutes: number;
  pomodoroBreakMinutes: number;
  pomodoroLongBreakMinutes: number;
  autoSaveDraft: boolean;
  [key: string]: unknown;
}

/**
 * آمار کلی برنامه
 */
export interface Stats {
  totalNotes: number;
  totalFlashcards: number;
  totalQuizzes: number;
  averageScore: number;
  studyStreak: number;
}

/**
 * اطلاعات برنامه
 */
export interface AppInfo {
  version: string;
  initialized: boolean;
  firstRun: boolean;
}

/**
 * ساختار کامل State
 */
export interface AppState {
  app: AppInfo;
  notes: Note[];
  flashcards: Flashcard[];
  quizHistory: QuizResult[];
  studySessions: StudySession[];
  settings: Settings;
  stats: Stats;
}

/**
 * تنظیمات متد set
 */
export interface SetOptions {
  persist?: boolean;
  silent?: boolean;
}

/**
 * State listener callback
 */
export type StateListener<T = unknown> = (
  newValue: T,
  oldValue: T | undefined,
  key: string
) => void;

/**
 * کلیدهای State
 */
export type StateKey = keyof AppState;

// ============================================================
// ثابت‌ها
// ============================================================

/**
 * ساختار اولیه state برنامه
 */
const DEFAULT_STATE: AppState = {
  app: {
    version: '1.0.0-beta.1',
    initialized: false,
    firstRun: true,
  },

  notes: [],
  flashcards: [],
  quizHistory: [],
  studySessions: [],

  settings: {
    theme: 'dark',
    language: 'fa',
    negativeMarking: true,
    defaultQuizCount: 10,
    pomodoroWorkMinutes: 25,
    pomodoroBreakMinutes: 5,
    pomodoroLongBreakMinutes: 15,
    autoSaveDraft: true,
  },

  stats: {
    totalNotes: 0,
    totalFlashcards: 0,
    totalQuizzes: 0,
    averageScore: 0,
    studyStreak: 0,
  },
};

/**
 * کلیدهایی که باید به صورت خودکار persist شوند
 */
const PERSIST_KEYS: StateKey[] = [
  'notes',
  'flashcards',
  'quizHistory',
  'studySessions',
  'settings',
];

/**
 * کلیدهای localStorage
 */
const LS_KEYS = {
  SETTINGS: 'daneshyar_settings',
  THEME: 'daneshyar_theme',
  ONBOARDING: 'daneshyar_onboarding',
  DRAFT: 'daneshyar_draft',
  LAST_SYNC: 'daneshyar_last_sync',
  NOTES: 'daneshyar_notes',
  FLASHCARDS: 'daneshyar_flashcards',
  QUIZ_HISTORY: 'daneshyar_quiz_history',
  STUDY_SESSIONS: 'daneshyar_study_sessions',
} as const;

// ============================================================
// کلاس اصلی StateManager
// ============================================================

/**
 * کلاس اصلی StateManager
 */
export class StateManager {
  private _state: AppState;
  private _listeners: Map<string, Set<StateListener>> = new Map();
  private _persistTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  private _isLoading: boolean = false;

  /**
   * سازنده کلاس StateManager
   */
  constructor() {
    this._state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    logger.debug('StateManager initialized');
  }

  /**
   * بارگذاری state از Storage
   * باید یک بار در ابتدای برنامه فراخوانی شود
   */
  async load(): Promise<AppState> {
    if (this._isLoading) return this._state;
    this._isLoading = true;

    try {
      logger.group('بارگذاری state');

      // بارگذاری تنظیمات از localStorage
      const savedSettings = storage.getLocal<Partial<Settings>>(
        LS_KEYS.SETTINGS,
        null
      );
      if (savedSettings) {
        this._state.settings = { ...this._state.settings, ...savedSettings };
        logger.info('تنظیمات بارگذاری شد');
      }

      // بارگذاری theme از localStorage
      const savedTheme = storage.getLocal<'light' | 'dark' | 'auto'>(
        LS_KEYS.THEME,
        null
      );
      if (savedTheme) {
        this._state.settings.theme = savedTheme;
      }

      // بررسی firstRun
      const onboardingDone = storage.getLocal<boolean>(
        LS_KEYS.ONBOARDING,
        false
      );
      this._state.app.firstRun = !onboardingDone;

      // بارگذاری داده‌ها از localStorage
      // TODO: بعداً از IndexedDB استفاده شود
      const notesData = storage.getLocal<Note[]>(LS_KEYS.NOTES, []);
      if (notesData && notesData.length > 0) {
        this._state.notes = notesData;
        logger.info('notes بارگذاری شد', { count: notesData.length });
      }

      const flashcardsData = storage.getLocal<Flashcard[]>(
        LS_KEYS.FLASHCARDS,
        []
      );
      if (flashcardsData && flashcardsData.length > 0) {
        this._state.flashcards = flashcardsData;
        logger.info('flashcards بارگذاری شد', { count: flashcardsData.length });
      }

      const quizData = storage.getLocal<QuizResult[]>(
        LS_KEYS.QUIZ_HISTORY,
        []
      );
      if (quizData && quizData.length > 0) {
        this._state.quizHistory = quizData;
        logger.info('quizHistory بارگذاری شد', { count: quizData.length });
      }

      const sessionsData = storage.getLocal<StudySession[]>(
        LS_KEYS.STUDY_SESSIONS,
        []
      );
      if (sessionsData && sessionsData.length > 0) {
        this._state.studySessions = sessionsData;
        logger.info('studySessions بارگذاری شد', {
          count: sessionsData.length,
        });
      }

      // محاسبه آمار اولیه
      this._recalculateStats();

      this._state.app.initialized = true;
      logger.groupEnd();

      // انتشار رویداد آماده شدن
      await eventBus.emit(EVENTS.APP_READY, { state: this._state });

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
   */
  get<K extends StateKey>(key: K): AppState[K] {
    return this._state[key];
  }

  /**
   * دریافت کل state (کپی عمیق)
   */
  getAll(): AppState {
    return JSON.parse(JSON.stringify(this._state));
  }

  /**
   * تنظیم یک بخش از state
   */
  set<K extends StateKey>(
    key: K,
    value: AppState[K],
    options: SetOptions = {}
  ): void {
    const { persist = true, silent = false } = options;

    const oldValue = this._state[key];
    this._state[key] = value;

    logger.debug('State تغییر کرد', {
      key,
      oldValue: typeof oldValue === 'object' ? '[object]' : oldValue,
      newValue: typeof value === 'object' ? '[object]' : value,
    });

    // فراخوانی listener های این کلید
    this._notifyListeners(key, value, oldValue);

    // انتشار event
    if (!silent) {
      eventBus.emit(EVENTS.STATE_CHANGED, {
        key,
        value,
        oldValue,
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
   */
  update<K extends StateKey>(
    key: K,
    updates: Partial<AppState[K]>
  ): void {
    const current = this._state[key];
    if (typeof current !== 'object' || current === null) {
      logger.warn('update فقط برای اشیاء کار می‌کند', { key });
      return;
    }
    this.set(key, { ...current, ...updates } as AppState[K]);
  }

  // ============================================================
  // متدهای اختصاصی برای notes
  // ============================================================

  /**
   * دریافت همه یادداشت‌ها
   */
  getNotes(): Note[] {
    return this._state.notes;
  }

  /**
   * دریافت یک یادداشت با id
   */
  getNote(id: string): Note | null {
    return this._state.notes.find((n) => n.id === id) || null;
  }

  /**
   * اضافه کردن یادداشت جدید
   */
  addNote(note: Note): Note {
    this._state.notes.unshift(note);
    this._notifyListeners('notes', this._state.notes);
    this._recalculateStats();
    this._schedulePersist('notes');

    eventBus.emit(EVENTS.NOTE_CREATED, note);
    return note;
  }

  /**
   * به‌روزرسانی یادداشت
   */
  updateNote(id: string, updates: Partial<Note>): Note | null {
    const index = this._state.notes.findIndex((n) => n.id === id);
    if (index === -1) {
      logger.warn('یادداشت یافت نشد', { id });
      return null;
    }

    const updatedNote: Note = { ...this._state.notes[index], ...updates } as Note;
    this._state.notes[index] = updatedNote;
    this._notifyListeners('notes', this._state.notes);
    this._schedulePersist('notes');

    eventBus.emit(EVENTS.NOTE_UPDATED, updatedNote);
    return updatedNote;
  }

  /**
   * حذف یادداشت
   */
  deleteNote(id: string): boolean {
    const index = this._state.notes.findIndex((n) => n.id === id);
    if (index === -1) return false;

    const deleted = this._state.notes.splice(index, 1)[0];
    this._notifyListeners('notes', this._state.notes);
    this._recalculateStats();
    this._schedulePersist('notes');

    eventBus.emit(EVENTS.NOTE_DELETED, deleted);
    return true;
  }

  // ============================================================
  // متدهای اختصاصی برای flashcards
  // ============================================================

  /**
   * دریافت همه فلش‌کارت‌ها
   */
  getFlashcards(): Flashcard[] {
    return this._state.flashcards;
  }

  /**
   * دریافت یک فلش‌کارت با id
   */
  getFlashcard(id: string): Flashcard | null {
    return this._state.flashcards.find((f) => f.id === id) || null;
  }

  /**
   * دریافت فلش‌کارت‌هایی که موعد مرورشان رسیده
   */
  getDueFlashcards(): Flashcard[] {
    const now = new Date();
    return this._state.flashcards.filter(
      (f) => new Date(f.nextReview) <= now
    );
  }

  /**
   * اضافه کردن فلش‌کارت جدید
   */
  addFlashcard(flashcard: Flashcard): Flashcard {
    this._state.flashcards.push(flashcard);
    this._notifyListeners('flashcards', this._state.flashcards);
    this._recalculateStats();
    this._schedulePersist('flashcards');

    eventBus.emit(EVENTS.FLASHCARD_CREATED, flashcard);
    return flashcard;
  }

  /**
   * اضافه کردن چند فلش‌کارت
   */
  addFlashcards(cards: Flashcard[]): Flashcard[] {
    this._state.flashcards.push(...cards);
    this._notifyListeners('flashcards', this._state.flashcards);
    this._recalculateStats();
    this._schedulePersist('flashcards');

    for (const card of cards) {
      eventBus.emit(EVENTS.FLASHCARD_CREATED, card);
    }
    return cards;
  }

  /**
   * به‌روزرسانی فلش‌کارت
   */
  updateFlashcard(id: string, updates: Partial<Flashcard>): Flashcard | null {
    const index = this._state.flashcards.findIndex((f) => f.id === id);
    if (index === -1) return null;

    const updatedCard: Flashcard = {
     ...this._state.flashcards[index],
     ...updates,
    } as Flashcard;
    this._state.flashcards[index] = updatedCard;
    this._notifyListeners('flashcards', this._state.flashcards);
    this._schedulePersist('flashcards');

    eventBus.emit(EVENTS.FLASHCARD_REVIEWED, updatedCard);
    return updatedCard;
  }

  /**
   * حذف فلش‌کارت
   */
  deleteFlashcard(id: string): boolean {
    const index = this._state.flashcards.findIndex((f) => f.id === id);
    if (index === -1) return false;

    const deleted = this._state.flashcards.splice(index, 1)[0];
    this._notifyListeners('flashcards', this._state.flashcards);
    this._recalculateStats();
    this._schedulePersist('flashcards');

    eventBus.emit(EVENTS.FLASHCARD_DELETED, deleted);
    return true;
  }

  // ============================================================
  // متدهای اختصاصی برای quizHistory
  // ============================================================

  /**
   * دریافت تاریخچه آزمون‌ها
   */
  getQuizHistory(): QuizResult[] {
    return this._state.quizHistory;
  }

  /**
   * اضافه کردن نتیجه آزمون
   */
  addQuizResult(quizResult: QuizResult): QuizResult {
    this._state.quizHistory.unshift(quizResult);
    this._notifyListeners('quizHistory', this._state.quizHistory);
    this._recalculateStats();
    this._schedulePersist('quizHistory');

    eventBus.emit(EVENTS.QUIZ_COMPLETED, quizResult);
    return quizResult;
  }

  // ============================================================
  // متدهای اختصاصی برای studySessions
  // ============================================================

  /**
   * ثبت یک جلسه مطالعه
   */
  logStudySession(
    type: string,
    data: Record<string, unknown> = {}
  ): StudySession {
    const session: StudySession = {
      id:
        Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date: new Date().toISOString(),
      type,
      ...data,
    };

    this._state.studySessions.push(session);
    this._schedulePersist('studySessions');

    eventBus.emit('session:logged', session);
    return session;
  }

  // ============================================================
  // متدهای settings
  // ============================================================

  /**
   * دریافت تنظیمات
   */
  getSettings(): Settings {
    return { ...this._state.settings };
  }

  /**
   * به‌روزرسانی تنظیمات
   */
  updateSettings(updates: Partial<Settings>): Settings {
    this._state.settings = { ...this._state.settings, ...updates };

    // ذخیره تنظیمات در localStorage
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

  // ============================================================
  // متدهای stats
  // ============================================================

  /**
   * دریافت آمار
   */
  getStats(): Stats {
    return { ...this._state.stats };
  }

  /**
   * محاسبه مجدد آمار (خصوصی)
   */
  private _recalculateStats(): void {
    const notes = this._state.notes;
    const flashcards = this._state.flashcards;
    const quizHistory = this._state.quizHistory;

    const newStats: Stats = {
      totalNotes: notes.length,
      totalFlashcards: flashcards.length,
      totalQuizzes: quizHistory.length,
      averageScore:
        quizHistory.length > 0
          ? Math.round(
              quizHistory.reduce((sum, q) => sum + (q.percentage || 0), 0) /
                quizHistory.length
            )
          : 0,
      studyStreak: this._calculateStudyStreak(),
    };

    const changed =
      JSON.stringify(newStats) !== JSON.stringify(this._state.stats);
    this._state.stats = newStats;

    if (changed) {
      this._notifyListeners('stats', newStats);
    }
  }

  /**
   * محاسبه streak مطالعه (خصوصی)
   */
  private _calculateStudyStreak(): number {
    const sessions = this._state.studySessions;
    if (sessions.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const uniqueDays = new Set(
      sessions.map((s) => {
        const d = new Date(s.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );

    let streak = 0;
    const checkDate = new Date(today);

    while (uniqueDays.has(checkDate.getTime())) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  }

  // ============================================================
  // سیستم Listener ها
  // ============================================================

  /**
   * ثبت listener برای تغییرات یک کلید خاص
   */
  subscribe<K extends StateKey>(
    key: K | '*',
    callback: StateListener<AppState[K]>
  ): () => void {
    if (!this._listeners.has(key)) {
      this._listeners.set(key, new Set());
    }

    this._listeners.get(key)!.add(callback as StateListener);

    // برگرداندن تابع unsubscribe
    return () => {
      const listeners = this._listeners.get(key);
      if (listeners) {
        listeners.delete(callback as StateListener);
      }
    };
  }

  /**
   * ثبت listener برای همه تغییرات
   */
  subscribeAll(callback: StateListener): () => void {
    return this.subscribe('*', callback);
  }

  /**
   * اطلاع به listener ها (خصوصی)
   */
  private _notifyListeners<K extends StateKey>(
    key: K,
    newValue: AppState[K],
    oldValue?: AppState[K]
  ): void {
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

  // ============================================================
  // سیستم Persist
  // ============================================================

  /**
   * زمان‌بندی persist با debounce (خصوصی)
   */
  private _schedulePersist(key: StateKey): void {
    if (this._persistTimers[key]) {
      clearTimeout(this._persistTimers[key]);
    }

    // debounce: 500ms صبر کن
    this._persistTimers[key] = setTimeout(() => {
      this._persistKey(key);
    }, 500);
  }

  /**
   * persist یک کلید (خصوصی)
   */
  private async _persistKey(key: StateKey): Promise<void> {
    // TODO: بعداً از IndexedDB استفاده شود
    try {
      const lsKey = LS_KEYS[key.toUpperCase() as keyof typeof LS_KEYS];
      if (lsKey) {
        storage.setLocal(lsKey, this._state[key]);
        logger.debug(`${key} persist شد`, {
          count: Array.isArray(this._state[key])
            ? (this._state[key] as unknown[]).length
            : 'N/A',
        });
      }
    } catch (error) {
      logger.error(`خطا در persist ${key}`, error);
    }
  }

  /**
   * persist فوری همه داده‌ها (برای قبل از خروج از برنامه)
   */
  async persistAll(): Promise<void> {
    logger.info('در حال persist فوری همه داده‌ها...');

    const promises = PERSIST_KEYS.map((key) => this._persistKey(key));

    await Promise.all(promises);

    storage.setLocal(LS_KEYS.LAST_SYNC, new Date().toISOString());  // ✅ درست
    logger.info('persist کامل شد');
  }

  // ============================================================
  // متدهای کمکی
  // ============================================================

  /**
   * ریست کامل state به مقادیر پیش‌فرض
   * ⚠️ این متد همه داده‌ها را حذف می‌کند
   */
  async reset(): Promise<void> {
    logger.warn('ریست کامل state');

    // پاک کردن localStorage
    Object.values(LS_KEYS).forEach((key) => {
      storage.removeLocal(key);
    });

    // ریست state در حافظه
    this._state = JSON.parse(JSON.stringify(DEFAULT_STATE));

    // اطلاع به listener ها
    for (const key of Object.keys(this._state) as StateKey[]) {
      this._notifyListeners(key, this._state[key]);
    }

    eventBus.emit('state:reset');
  }

  /**
   * علامت‌گذاری onboarding به عنوان کامل شده
   */
  markOnboardingComplete(): void {
    this._state.app.firstRun = false;
    storage.setLocal(LS_KEYS.ONBOARDING, true);
  }

  /**
   * آیا state آماده است؟
   */
  isReady(): boolean {
    return this._state.app.initialized;
  }
}

// ============================================================
// Singleton
// ============================================================

let stateInstance: StateManager | null = null;

/**
 * دریافت نمونه singleton از StateManager
 */
export function getState(): StateManager {
  if (!stateInstance) {
    stateInstance = new StateManager();
  }
  return stateInstance;
}

/**
 * ریست کردن نمونه singleton (فقط برای تست)
 */
export function resetState(): void {
  stateInstance = null;
}

/**
 * Export پیش‌فرض
 */
export default getState();