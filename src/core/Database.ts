/**
 * ============================================================
 * دانش‌یار پرو - لایه پایگاه‌داده (IndexedDB via Dexie)
 * ============================================================
 *
 * جایگزین قدرتمند localStorage برای ذخیره‌سازی ماندگار
 *
 * ✅ ظرفیت صدها مگابایت (localStorage فقط ~۵MB)
 * ✅ ناهمگام (UI هرگز فریز نمی‌شود)
 * ✅ ایندکس‌گذاری → «کارت‌های موعد» و «آمار روز» در یک چشم‌برهم‌زدن
 * ✅ مهاجرت خودکار از localStorage (هیچ داده‌ای گم نمی‌شود)
 * ✅ فیلدهای sync-ready برای Supabase (ماه ۴)
 * ✅ جدول achievements برای گیمیفیکیشن (Streak Freeze!)
 * ✅ Export/Import برای پشتیبان‌گیری (اعتماد کاربر)
 *
 * @module core/Database
 * @version 1.0.0-beta.1
 */

import Dexie, { type Table } from 'dexie';
import { getInstance as getLogger } from '@/core/Logger';
import type { Note, Flashcard, QuizResult, StudySession } from '@/core/State';

const logger = getLogger().module('Database');

// ============================================================
// Types
// ============================================================

/**
 * وضعیت sync (برای Supabase در ماه ۴)
 */
export type SyncStatus = 'local' | 'pending' | 'synced';

/**
 * موجودیت‌های DB = موجودیت‌های State + متادیتای sync
 */
export type DbNote = Note & { syncStatus?: SyncStatus };
export type DbFlashcard = Flashcard & { syncStatus?: SyncStatus; updatedAt?: string };
export type DbQuizResult = QuizResult & { syncStatus?: SyncStatus };
export type DbStudySession = StudySession & { syncStatus?: SyncStatus };

/**
 * یک دستاورد (مایلستون گیمیفیکیشن)
 */
export interface Achievement {
  /** مثل 'streak_7', 'streak_30', 'quiz_first', 'flashcard_100' */
  id: string;
  unlockedAt: string;
}

/**
 * آمار کلی از DB
 */
export interface DbStats {
  totalNotes: number;
  totalFlashcards: number;
  totalQuizzes: number;
  averageScore: number;
  dueFlashcards: number;
}

// ============================================================
// کلیدهای localStorage (برای مهاجرت)
// ============================================================

const LS_KEYS = {
  NOTES: 'daneshyar_notes',
  FLASHCARDS: 'daneshyar_flashcards',
  QUIZ_HISTORY: 'daneshyar_quiz_history',
  STUDY_SESSIONS: 'daneshyar_study_sessions',
} as const;

const MIGRATION_FLAG = 'daneshyar_idb_migrated';

// ============================================================
// Schema دیتابیس
// ============================================================

/**
 * کلاس Dexie دیتابیس
 * ایندکس‌ها بر اساس الگوهای پرس‌وجوی واقعی طراحی شده‌اند:
 * - flashcards.nextReview → «کارت‌های موعد» (SRS)
 * - studySessions.date → محاسبه Streak و نقشه حرارتی
 * - notes.category / *tags → فیلتر و جستجو
 */
class DaneshyarDB extends Dexie {
  notes!: Table<DbNote, string>;
  flashcards!: Table<DbFlashcard, string>;
  quizHistory!: Table<DbQuizResult, string>;
  studySessions!: Table<DbStudySession, string>;
  achievements!: Table<Achievement, string>;

  constructor() {
    super('daneshyar-pro');
    this.version(1).stores({
      notes: 'id, createdAt, updatedAt, category, *tags',
      flashcards: 'id, deck, nextReview, createdAt, *tags',
      quizHistory: 'id, date, percentage',
      studySessions: 'id, date, type',
      achievements: 'id, unlockedAt',
    });
  }
}

// ============================================================
// سرویس پایگاه‌داده
// ============================================================

/**
 * کلاس اصلی DatabaseService
 */
export class DatabaseService {
  private db: DaneshyarDB;
  private _isInitialized = false;

  constructor() {
    this.db = new DaneshyarDB();
    logger.debug('DatabaseService initialized');
  }

  /**
   * راه‌اندازی (با مهاجرت خودکار از localStorage)
   * باید یک بار در ابتدای برنامه صدا زده شود
   */
  async init(): Promise<void> {
    if (this._isInitialized) return;
    await this._migrateFromLocalStorage();
    this._isInitialized = true;
    logger.info('پایگاه‌داده آماده است');
  }

  // ============================================================
  // مهاجرت از localStorage (بدون از دست رفتن داده)
  // ============================================================

  private async _migrateFromLocalStorage(): Promise<void> {
    if (localStorage.getItem(MIGRATION_FLAG)) {
      logger.debug('مهاجرت قبلاً انجام شده');
      return;
    }

    logger.info('شروع مهاجرت از localStorage به IndexedDB');

    try {
      // فقط اگر جدول خالی است (idempotent)
      if ((await this.db.notes.count()) === 0) {
        const notes = this._readLS<Note[]>(LS_KEYS.NOTES, []);
        if (notes.length > 0) {
          await this.db.notes.bulkAdd(
            notes.map((n) => ({ ...n, syncStatus: 'local' as SyncStatus }))
          );
          logger.info('notes مهاجرت کرد', { count: notes.length });
        }
      }

      if ((await this.db.flashcards.count()) === 0) {
        const cards = this._readLS<Flashcard[]>(LS_KEYS.FLASHCARDS, []);
        if (cards.length > 0) {
          await this.db.flashcards.bulkAdd(
            cards.map((c) => ({ ...c, syncStatus: 'local' as SyncStatus }))
          );
          logger.info('flashcards مهاجرت کرد', { count: cards.length });
        }
      }

      if ((await this.db.quizHistory.count()) === 0) {
        const quizzes = this._readLS<QuizResult[]>(LS_KEYS.QUIZ_HISTORY, []);
        if (quizzes.length > 0) {
          await this.db.quizHistory.bulkAdd(
            quizzes.map((q) => ({ ...q, syncStatus: 'local' as SyncStatus }))
          );
          logger.info('quizHistory مهاجرت کرد', { count: quizzes.length });
        }
      }

      if ((await this.db.studySessions.count()) === 0) {
        const sessions = this._readLS<StudySession[]>(LS_KEYS.STUDY_SESSIONS, []);
        if (sessions.length > 0) {
          await this.db.studySessions.bulkAdd(
            sessions.map((s) => ({ ...s, syncStatus: 'local' as SyncStatus }))
          );
          logger.info('studySessions مهاجرت کرد', { count: sessions.length });
        }
      }

      localStorage.setItem(MIGRATION_FLAG, new Date().toISOString());
      logger.info('✅ مهاجرت کامل شد');
    } catch (error) {
      logger.error('خطا در مهاجرت (برنامه ادامه می‌یابد)', error);
      // پرتاب نمی‌کنیم — برنامه باید حتی اگر مهاجرت شکست خورد کار کند
    }
  }

  private _readLS<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  // ============================================================
  // Notes
  // ============================================================

  async getNotes(): Promise<DbNote[]> {
    return this.db.notes.orderBy('createdAt').reverse().toArray();
  }

  async addNote(note: Note): Promise<DbNote> {
    const dbNote: DbNote = {
      ...note,
      updatedAt: new Date().toISOString(),
      syncStatus: 'local',
    };
    await this.db.notes.add(dbNote);
    return dbNote;
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<DbNote | null> {
    const existing = await this.db.notes.get(id);
    if (!existing) return null;
    const updated: DbNote = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
    };
    await this.db.notes.put(updated);
    return updated;
  }

  async deleteNote(id: string): Promise<boolean> {
    const deleted = await this.db.notes.delete(id);
    return deleted !== undefined;
  }

  async searchNotes(query: string): Promise<DbNote[]> {
    const q = query.trim().toLowerCase();
    if (!q) return this.getNotes();
    const all = await this.db.notes.toArray();
    return all.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  }

  // ============================================================
  // Flashcards
  // ============================================================

  async getFlashcards(): Promise<DbFlashcard[]> {
    return this.db.flashcards.toArray();
  }

  async addFlashcard(card: Flashcard): Promise<DbFlashcard> {
    const dbCard: DbFlashcard = {
      ...card,
      updatedAt: new Date().toISOString(),
      syncStatus: 'local',
    };
    await this.db.flashcards.add(dbCard);
    return dbCard;
  }

  async updateFlashcard(id: string, updates: Partial<Flashcard>): Promise<DbFlashcard | null> {
    const existing = await this.db.flashcards.get(id);
    if (!existing) return null;
    const updated: DbFlashcard = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
    };
    await this.db.flashcards.put(updated);
    return updated;
  }

  async deleteFlashcard(id: string): Promise<boolean> {
    const deleted = await this.db.flashcards.delete(id);
    return deleted !== undefined;
  }

  /**
   * ⭐ کارت‌هایی که موعد مرورشان رسیده (با ایندکس nextReview - فوق سریع)
   */
  async getDueFlashcards(): Promise<DbFlashcard[]> {
    const now = new Date().toISOString();
    return this.db.flashcards.where('nextReview').belowOrEqual(now).toArray();
  }

  async getFlashcardsByDeck(deck: string): Promise<DbFlashcard[]> {
    return this.db.flashcards.where('deck').equals(deck).toArray();
  }

  // ============================================================
  // Quiz History
  // ============================================================

  async getQuizHistory(): Promise<DbQuizResult[]> {
    return this.db.quizHistory.orderBy('date').reverse().toArray();
  }

  async addQuizResult(result: QuizResult): Promise<DbQuizResult> {
    const dbResult: DbQuizResult = { ...result, syncStatus: 'local' };
    await this.db.quizHistory.add(dbResult);
    return dbResult;
  }

  // ============================================================
  // Study Sessions (سوخت Streak!)
  // ============================================================

  async logStudySession(type: string, data: Record<string, unknown> = {}): Promise<DbStudySession> {
    const session: DbStudySession = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date: new Date().toISOString(),
      type,
      syncStatus: 'local',
      ...data,
    };
    await this.db.studySessions.add(session);
    return session;
  }

  async getStudySessions(): Promise<DbStudySession[]> {
    return this.db.studySessions.orderBy('date').reverse().toArray();
  }

  /**
   * جلسات در یک بازه تاریخی (برای نقشه حرارتی و آمار)
   */
  async getSessionsByDateRange(startIso: string, endIso: string): Promise<DbStudySession[]> {
    return this.db.studySessions.where('date').between(startIso, endIso, true, true).toArray();
  }

  /**
   * ⭐ روزهای یکتای مطالعه (برای محاسبه Streak)
   */
  async getUniqueStudyDays(): Promise<Set<string>> {
    const sessions = await this.db.studySessions.toArray();
    const days = new Set<string>();
    for (const s of sessions) {
      const d = new Date(s.date);
      d.setHours(0, 0, 0, 0);
      days.add(d.toDateString());
    }
    return days;
  }

  // ============================================================
  // Achievements (گیمیفیکیشن)
  // ============================================================

  async hasAchievement(id: string): Promise<boolean> {
    const existing = await this.db.achievements.get(id);
    return existing !== undefined;
  }

  /**
   * باز کردن یک دستاورد (فقط اگر قبلاً باز نشده باشد)
   * @returns true اگر تازه باز شد، false اگر قبلاً باز شده بود
   */
  async unlockAchievement(id: string): Promise<boolean> {
    if (await this.hasAchievement(id)) return false;
    await this.db.achievements.add({ id, unlockedAt: new Date().toISOString() });
    logger.info('🏅 دستاورد باز شد', { id });
    return true;
  }

  async getAchievements(): Promise<Achievement[]> {
    return this.db.achievements.orderBy('unlockedAt').reverse().toArray();
  }

  // ============================================================
  // آمار
  // ============================================================

  async getStats(): Promise<DbStats> {
    const [totalNotes, totalFlashcards, totalQuizzes, due] = await Promise.all([
      this.db.notes.count(),
      this.db.flashcards.count(),
      this.db.quizHistory.count(),
      this.getDueFlashcards(),
    ]);

    const quizzes = await this.db.quizHistory.toArray();
    const averageScore =
      quizzes.length > 0
        ? Math.round(quizzes.reduce((sum, q) => sum + (q.percentage || 0), 0) / quizzes.length)
        : 0;

    return {
      totalNotes,
      totalFlashcards,
      totalQuizzes,
      averageScore,
      dueFlashcards: due.length,
    };
  }

  // ============================================================
  // پشتیبان‌گیری (اعتماد کاربر = retention)
  // ============================================================

  /**
   * خروجی کامل داده‌ها (JSON) برای پشتیبان‌گیری
   */
  async exportData(): Promise<string> {
    const [notes, flashcards, quizHistory, studySessions, achievements] = await Promise.all([
      this.db.notes.toArray(),
      this.db.flashcards.toArray(),
      this.db.quizHistory.toArray(),
      this.db.studySessions.toArray(),
      this.db.achievements.toArray(),
    ]);

    return JSON.stringify(
      {
        app: 'daneshyar-pro',
        version: 1,
        exportedAt: new Date().toISOString(),
        notes,
        flashcards,
        quizHistory,
        studySessions,
        achievements,
      },
      null,
      2
    );
  }

  /**
   * بازیابی داده‌ها از فایل پشتیبان (جایگزینی کامل)
   */
  async importData(json: string): Promise<void> {
    let data: {
      notes?: DbNote[];
      flashcards?: DbFlashcard[];
      quizHistory?: DbQuizResult[];
      studySessions?: DbStudySession[];
      achievements?: Achievement[];
    };

    try {
      data = JSON.parse(json);
    } catch {
      throw new Error('فایل پشتیبان نامعتبر است');
    }

    if (!data || typeof data !== 'object') {
      throw new Error('فایل پشتیبان نامعتبر است');
    }

    await this.db.transaction(
      'rw',
      this.db.notes,
      this.db.flashcards,
      this.db.quizHistory,
      this.db.studySessions,
      this.db.achievements,
      async () => {
        if (Array.isArray(data.notes)) {
          await this.db.notes.clear();
          await this.db.notes.bulkAdd(data.notes);
        }
        if (Array.isArray(data.flashcards)) {
          await this.db.flashcards.clear();
          await this.db.flashcards.bulkAdd(data.flashcards);
        }
        if (Array.isArray(data.quizHistory)) {
          await this.db.quizHistory.clear();
          await this.db.quizHistory.bulkAdd(data.quizHistory);
        }
        if (Array.isArray(data.studySessions)) {
          await this.db.studySessions.clear();
          await this.db.studySessions.bulkAdd(data.studySessions);
        }
        if (Array.isArray(data.achievements)) {
          await this.db.achievements.clear();
          await this.db.achievements.bulkAdd(data.achievements);
        }
      }
    );

    logger.info('✅ داده‌ها از پشتیبان بازیابی شد');
  }
}

// ============================================================
// Singleton
// ============================================================

let dbInstance: DatabaseService | null = null;

/**
 * دریافت نمونه singleton از DatabaseService
 */
export function getDatabase(): DatabaseService {
  if (!dbInstance) {
    dbInstance = new DatabaseService();
  }
  return dbInstance;
}

/**
 * ریست کردن نمونه singleton (فقط برای تست)
 */
export function resetDatabase(): void {
  dbInstance = null;
}

/**
 * Export پیش‌فرض
 */
export default getDatabase();