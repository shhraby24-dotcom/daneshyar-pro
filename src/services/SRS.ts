/**
 * ============================================================
 * دانش‌یار پرو - SRS نسخه‌ی ۲ (مرور هوشمند تطبیقی)
 * ============================================================
 * 🧠 یادگیری مجدد درون‌روزی: کارت ضعیف همان روز برمی‌گردد [۱۰دقیقه→۱ساعت→۱روز]
 * 🎓 فارغ‌التحصیلی: ۳ درست متوالی + فاصله≥۲۱ روز ⇒ برای همیشه از چرخه‌ی ضعف خارج
 * 📉 منحنی فراموشی: صف مرور بر اساس پرریسک‌ترین کارت‌ها (R = 0.5^(t/S))
 * 🔀 Interleaving موضوع‌ها + Fuzz ±۵٪ + سقف بار روزانه (بهینه)
 * 🎚️ Ease تطبیقی [۱.۳–۲.۸] با بازیابی کندتر برای کارت‌های سخت
 * ⚡ سازگار با همه‌ی APIهای قبلی (هیچ viewای نمی‌شکند)
 * @module services/SRS
 * @version 2.0.0
 */
import { getInstance as getLogger } from '@/core/Logger';

const logger = getLogger().module('SRS');

// ============================================================
// Types
// ============================================================
export const QUALITY_LEVELS = {
  BLACKOUT: 0, INCORRECT: 1, HARD: 2, CORRECT_HARD: 3, CORRECT: 4, PERFECT: 5,
} as const;
export type QualityLevel = (typeof QUALITY_LEVELS)[keyof typeof QUALITY_LEVELS];

export type ConceptType = 'math' | 'definition' | 'formula' | 'concept' | 'fact' | 'default';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
  conceptType: ConceptType;
  createdAt: string;
  ease: number;
  interval: number;
  repetitions: number;
  lapses: number;
  nextReview: string;
  lastReview: string | null;
  lastQuality: number | null;
  totalReviews: number;
  // ── فیلدهای v2 (اختیاری، سازگار عقب‌رو) ──
  relearnStep?: number | null;   // ایندکس پله‌ی یادگیری مجدد؛ null = بیرون
  consecutiveCorrect?: number;   // درست‌های متوالی
  mature?: boolean;              // فارغ‌التحصیل‌شده
  difficulty?: number;           // 0..1 (AI یا هیورستیک)
}

export interface CreateCardData {
  id?: string;
  front: string;
  back: string;
  topic?: string;
  conceptType?: ConceptType;
  difficulty?: number;
}

export interface SRSConfig {
  initialEase: number; minEase: number; maxEase: number; maxInterval: number;
}
export interface ForecastEntry { date: string; count: number; }
export interface SRSStats {
  total: number; due: number; new: number; learning: number; reviewedToday: number;
  retentionRate: number; averageEase: number; averageInterval: number;
  forecast: ForecastEntry[]; maturity: number;
}
export interface SRSRecommendation { type: 'warning' | 'info' | 'success'; message: string; action: string; }
export interface EfficiencyAnalysis {
  dailyBurden: number; dailyTimeMinutes: number; retentionRate: number;
  efficiency: number; recommendations: SRSRecommendation[];
}
export interface OptimalTimePrediction {
  status: 'overdue' | 'due_today' | 'future';
  priority: 'high' | 'medium' | 'low';
  message: string; hoursOverdue?: string; hoursUntil?: string; daysUntil?: number;
}

// ============================================================
// ثابت‌های هوشمند
// ============================================================
/** پله‌های یادگیری مجدد (دقیقه): ۱۰ دقیقه → ۱ ساعت → ۱ روز */
export const RELEARN_STEPS_MIN = [10, 60, 1440];
const MATURE_INTERVAL = 21;
const GRAD_CORRECT = 3;
const DAY_MS = 86400000;

const CONTENT_MULTIPLIERS: Record<ConceptType, number> = {
  math: 0.8, definition: 1.0, formula: 0.85, concept: 1.1, fact: 1.2, default: 1.0,
};

// ============================================================
// کلاس اصلی
// ============================================================
export class SpacedRepetitionSystem {
  private config: SRSConfig;
  constructor() {
    this.config = { initialEase: 2.5, minEase: 1.3, maxEase: 2.8, maxInterval: 365 };
    logger.debug('SRS v2 initialized (adaptive spaced repetition)');
  }

  // ── زمان مرور بعدی (هسته‌ی هوشمند) ──
  schedule(card: Flashcard, quality: number): Flashcard {
    if (quality < 0 || quality > 5) throw new Error('کیفیت باید بین 0 تا 5 باشد');
    const now = new Date();
    const u: Flashcard = { ...card };
    u.lastReview = now.toISOString();
    u.lastQuality = quality;
    u.totalReviews = (u.totalReviews ?? 0) + 1;
    const difficulty = u.difficulty ?? 0.5;

    // ── پاسخ نادرست → ورود به یادگیری مجدد درون‌روزی ──
    if (quality < 3) {
      u.lapses = (u.lapses ?? 0) + 1;
      u.consecutiveCorrect = 0;
      u.mature = false;
      u.relearnStep = 0;
      u.ease = Math.max(this.config.minEase, (u.ease ?? this.config.initialEase) - 0.2);
      u.nextReview = new Date(now.getTime() + (RELEARN_STEPS_MIN[0] ?? 10) * 60000).toISOString();
      logger.debug('کارت وارد یادگیری مجدد شد', { cardId: card.id, lapses: u.lapses });
      return u;
    }

    // ── پاسخ درست ──
    u.consecutiveCorrect = (u.consecutiveCorrect ?? 0) + 1;

    if (u.relearnStep != null) {
      const next = u.relearnStep + 1;
      if (next >= RELEARN_STEPS_MIN.length) {
        // پایان پله‌ها → خروج از یادگیری مجدد
        u.relearnStep = null;
        u.repetitions = 1;
        u.interval = 1;
      } else {
        u.relearnStep = next;
        u.nextReview = new Date(now.getTime() + (RELEARN_STEPS_MIN[next] ?? 1440) * 60000).toISOString();
        return u;
      }
    } else {
      // رشد SM-2 با Fuzz
      if ((u.repetitions ?? 0) === 0) u.interval = 1;
      else if ((u.repetitions ?? 0) === 1) u.interval = 6;
      else {
        let iv = Math.round((u.interval || 1) * (u.ease || 2.5));
        if (iv > 2) iv = Math.round(iv * (0.95 + Math.random() * 0.1));
        u.interval = iv;
      }
      u.repetitions = (u.repetitions ?? 0) + 1;
    }

    // ── Ease: افت سریع در lapse (بالا)، بازیابی آرام در درست؛ کارت سخت کندتر بالا می‌رود ──
    const gain = (0.05 + (quality - 3) * 0.05) * (1 - difficulty * 0.5);
    u.ease = Math.min(this.config.maxEase, Math.max(this.config.minEase, (u.ease ?? this.config.initialEase) + gain));

    // ── ضریب نوع محتوا + سقف ──
    const mult = CONTENT_MULTIPLIERS[u.conceptType ?? 'default'] ?? 1.0;
    u.interval = Math.min(Math.max(1, Math.round((u.interval || 1) * mult)), this.config.maxInterval);

    // ── فارغ‌التحصیلی: قوی شد ⇒ برای همیشه از چرخه‌ی ضعف خارج ──
    if ((u.consecutiveCorrect ?? 0) >= GRAD_CORRECT && (u.interval ?? 0) >= MATURE_INTERVAL) {
      u.mature = true;
      logger.debug('کارت فارغ‌التحصیل شد', { cardId: card.id, interval: u.interval });
    }

    u.nextReview = this._daysFrom(now, u.interval || 1);
    return u;
  }

  // ── احتمال فراموشی (منحنی فراموشی؛ نصف‌عمر = interval) ──
  getRetention(card: Flashcard): number {
    if (!card.lastReview) return 1;
    const elapsed = (Date.now() - new Date(card.lastReview).getTime()) / DAY_MS;
    const stability = Math.max(card.interval || 1, 1);
    return Math.pow(0.5, elapsed / stability);
  }

  // ── کارت ضعیف؟ (در یادگیری مجدد، یا lapse بدون فارغ‌التحصیلی) ──
  isWeak(card: Flashcard): boolean {
    return card.relearnStep != null || ((card.lapses ?? 0) > 0 && card.mature !== true);
  }

  // ── صف هوشمند: relearn اول، بعد due به‌ترتیب ریسک با interleaving، بعد جدید (با سقف) ──
  buildSmartQueue(cards: Flashcard[], opts: { newLimit?: number; dueCap?: number } = {}): Flashcard[] {
    const newLimit = opts.newLimit ?? 20;
    const dueCap = opts.dueCap ?? 100;
    const now = new Date();
    const isDue = (c: Flashcard): boolean => new Date(c.nextReview) <= now;
    const relearn = cards.filter((c) => c.relearnStep != null && isDue(c));
    const due = cards
      .filter((c) => c.relearnStep == null && isDue(c))
      .sort((a, b) => this.getRetention(a) - this.getRetention(b))
      .slice(0, dueCap);
    const fresh = this.getNewCards(cards).sort(() => Math.random() - 0.5).slice(0, newLimit);
    return [...relearn, ...this._interleaveTopics(due), ...fresh];
  }

  getDueCards(cards: Flashcard[]): Flashcard[] {
    const now = new Date();
    return cards.filter((c) => new Date(c.nextReview) <= now);
  }
  getNewCards(cards: Flashcard[]): Flashcard[] {
    return cards.filter((c) => !c.lastReview);
  }
  getLearningCards(cards: Flashcard[]): Flashcard[] {
    return cards.filter((c) => c.relearnStep != null || ((c.repetitions ?? 0) < 2 && !!c.lastReview));
  }

  getStats(cards: Flashcard[]): SRSStats {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const due = this.getDueCards(cards);
    const newCards = this.getNewCards(cards);
    const learning = this.getLearningCards(cards);
    const reviewedToday = cards.filter((c) => {
      if (!c.lastReview) return false;
      return new Date(c.lastReview) >= today;
    }).length;
    const totalReviews = cards.reduce((s, c) => s + (c.totalReviews ?? 0), 0);
    const lapses = cards.reduce((s, c) => s + (c.lapses ?? 0), 0);
    const retentionRate = totalReviews > 0 ? parseFloat((((totalReviews - lapses) / totalReviews) * 100).toFixed(1)) : 0;
    const forecast: ForecastEntry[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today); d.setDate(d.getDate() + i);
      const ds = d.toDateString();
      forecast.push({ date: d.toISOString(), count: cards.filter((c) => new Date(c.nextReview).toDateString() === ds).length });
    }
    return {
      total: cards.length, due: due.length, new: newCards.length, learning: learning.length,
      reviewedToday, retentionRate,
      averageEase: this._avgEase(cards), averageInterval: this._avgInterval(cards),
      forecast, maturity: this._maturity(cards),
    };
  }

  analyzeEfficiency(cards: Flashcard[]): EfficiencyAnalysis {
    const stats = this.getStats(cards);
    const matureCards = cards.filter((c) => (c.interval ?? 0) >= 21);
    const dailyBurden = matureCards.reduce((s, c) => s + 1 / (c.interval || 1), 0);
    const dailyTimeMinutes = (dailyBurden * 10) / 60;
    return {
      dailyBurden: parseFloat(dailyBurden.toFixed(1)),
      dailyTimeMinutes: parseFloat(dailyTimeMinutes.toFixed(1)),
      retentionRate: stats.retentionRate,
      efficiency: this._efficiencyScore(stats),
      recommendations: this._recommendations(stats, cards),
    };
  }

  predictOptimalTime(card: Flashcard): OptimalTimePrediction {
    const now = new Date();
    const hoursUntilDue = (new Date(card.nextReview).getTime() - now.getTime()) / 3600000;
    if (hoursUntilDue < 0) return { status: 'overdue', priority: 'high', message: 'این کارت باید فوراً مرور شود', hoursOverdue: Math.abs(hoursUntilDue).toFixed(1) };
    if (hoursUntilDue < 24) return { status: 'due_today', priority: 'medium', message: 'امروز باید مرور شود', hoursUntil: hoursUntilDue.toFixed(1) };
    return { status: 'future', priority: 'low', message: `${Math.ceil(hoursUntilDue / 24)} روز دیگر`, daysUntil: Math.ceil(hoursUntilDue / 24) };
  }

  createCard(data: CreateCardData): Flashcard {
    return {
      id: data.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      front: data.front, back: data.back,
      topic: data.topic || 'general',
      conceptType: data.conceptType || 'default',
      createdAt: new Date().toISOString(),
      ease: this.config.initialEase, interval: 0, repetitions: 0, lapses: 0,
      nextReview: new Date().toISOString(),
      lastReview: null, lastQuality: null, totalReviews: 0,
      relearnStep: null, consecutiveCorrect: 0, mature: false,
      difficulty: data.difficulty,
    };
  }

  resetCard(card: Flashcard): Flashcard {
    return { ...card, ease: this.config.initialEase, interval: 0, repetitions: 0, lapses: 0, nextReview: new Date().toISOString(), lastReview: null, lastQuality: null, relearnStep: null, consecutiveCorrect: 0, mature: false };
  }

  // ── خصوصی ──
  private _daysFrom(now: Date, days: number): string {
    const d = new Date(now); d.setDate(d.getDate() + days); return d.toISOString();
  }
  private _interleaveTopics(sorted: Flashcard[]): Flashcard[] {
    const out: Flashcard[] = [];
    const pool = [...sorted];
    let last = '';
    while (pool.length > 0) {
      let idx = pool.findIndex((c) => (c.topic || 'general') !== last);
      if (idx === -1 || idx > 4) idx = 0;
      const c = pool.splice(idx, 1)[0];
      if (c) { out.push(c); last = c.topic || 'general'; }
    }
    return out;
  }
  private _avgEase(cards: Flashcard[]): number {
    if (cards.length === 0) return 0;
    return parseFloat((cards.reduce((s, c) => s + (c.ease ?? this.config.initialEase), 0) / cards.length).toFixed(2));
  }
  private _avgInterval(cards: Flashcard[]): number {
    const w = cards.filter((c) => (c.interval ?? 0) > 0);
    if (w.length === 0) return 0;
    return Math.round(w.reduce((s, c) => s + c.interval, 0) / w.length);
  }
  private _maturity(cards: Flashcard[]): number {
    if (cards.length === 0) return 0;
    return parseFloat(((cards.filter((c) => (c.interval ?? 0) >= 21).length / cards.length) * 100).toFixed(1));
  }
  private _efficiencyScore(stats: SRSStats): number {
    let score = 100;
    if (stats.retentionRate < 90) score -= (90 - stats.retentionRate) * 2;
    if (stats.averageEase < 2.0) score -= (2.0 - stats.averageEase) * 20;
    if (stats.maturity > 50) score += (stats.maturity - 50) * 0.5;
    return parseFloat(Math.max(0, Math.min(100, score)).toFixed(0));
  }
  private _recommendations(stats: SRSStats, cards: Flashcard[]): SRSRecommendation[] {
    const r: SRSRecommendation[] = [];
    if (stats.retentionRate < 85) r.push({ type: 'warning', message: 'نرخ یادآوری پایین است. کارت‌های سخت را بیشتر مرور کنید.', action: 'review_hard_cards' });
    if (stats.due > 20) r.push({ type: 'info', message: `${stats.due} کارت آماده مرور دارید. بهتر است امروز مرور کنید.`, action: 'start_review' });
    if (stats.averageEase < 2.0) r.push({ type: 'warning', message: 'میانگین سهولت کارت‌ها پایین است. شاید کارت‌ها خیلی سخت هستند.', action: 'review_difficulty' });
    if (stats.maturity < 30 && cards.length > 10) r.push({ type: 'info', message: 'هنوز بیشتر کارت‌ها بالغ نشده‌اند. به مرور ادامه دهید.', action: 'continue_review' });
    return r;
  }
}

let srsInstance: SpacedRepetitionSystem | null = null;
export function getSRS(): SpacedRepetitionSystem {
  if (!srsInstance) srsInstance = new SpacedRepetitionSystem();
  return srsInstance;
}
export function resetSRS(): void { srsInstance = null; }
export default getSRS();