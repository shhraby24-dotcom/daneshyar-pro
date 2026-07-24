/**
 * ============================================================
 * دانش‌یار پرو - سیستم Spaced Repetition (SRS)
 * ============================================================
 *
 * پیاده‌سازی الگوریتم SM-2 برای یادگیری بهینه فلش‌کارت‌ها
 *
 * ✅ الگوریتم SM-2 استاندارد
 * ✅ ضرایب تطبیقی برای محتوای فارسی
 * ✅ پیش‌بینی ۷ روزه مرورهای آینده
 * ✅ تحلیل کارایی با پیشنهادات هوشمند
 * ✅ محاسبه maturity و retention rate
 *
 * @module services/SRS
 * @version 1.0.0-beta.1
 */

import { getInstance as getLogger } from '@/core/Logger';

const logger = getLogger().module('SRS');

// ============================================================
// Types و Interfaces
// ============================================================

/**
 * سطوح کیفیت پاسخ (0-5)
 */
export const QUALITY_LEVELS = {
  BLACKOUT: 0,
  INCORRECT: 1,
  HARD: 2,
  CORRECT_HARD: 3,
  CORRECT: 4,
  PERFECT: 5,
} as const;

export type QualityLevel = (typeof QUALITY_LEVELS)[keyof typeof QUALITY_LEVELS];

/**
 * انواع محتوای آموزشی
 */
export type ConceptType = 'math' | 'definition' | 'formula' | 'concept' | 'fact' | 'default';

/**
 * یک فلش‌کارت
 */
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
}

/**
 * داده‌های ورودی برای ساخت فلش‌کارت
 */
export interface CreateCardData {
  id?: string;
  front: string;
  back: string;
  topic?: string;
  conceptType?: ConceptType;
}

/**
 * تنظیمات SRS
 */
export interface SRSConfig {
  initialEase: number;
  minEase: number;
  maxInterval: number;
  graduationInterval: number;
  easyInterval: number;
  learningSteps: number[];
  graduatingInterval: number;
  easyIntervalDays: number;
}

/**
 * پیش‌بینی مرور آینده
 */
export interface ForecastEntry {
  date: string;
  count: number;
}

/**
 * آمار SRS
 */
export interface SRSStats {
  total: number;
  due: number;
  new: number;
  learning: number;
  reviewedToday: number;
  retentionRate: number;
  averageEase: number;
  averageInterval: number;
  forecast: ForecastEntry[];
  maturity: number;
}

/**
 * پیشنهاد SRS
 */
export interface SRSRecommendation {
  type: 'warning' | 'info' | 'success';
  message: string;
  action: string;
}

/**
 * تحلیل کارایی
 */
export interface EfficiencyAnalysis {
  dailyBurden: number;
  dailyTimeMinutes: number;
  retentionRate: number;
  efficiency: number;
  recommendations: SRSRecommendation[];
}

/**
 * پیش‌بینی زمان بهینه
 */
export interface OptimalTimePrediction {
  status: 'overdue' | 'due_today' | 'future';
  priority: 'high' | 'medium' | 'low';
  message: string;
  hoursOverdue?: string;
  hoursUntil?: string;
  daysUntil?: number;
}

// ============================================================
// ضرایب تطبیقی
// ============================================================

const CONTENT_MULTIPLIERS: Record<ConceptType, number> = {
  math: 0.8,
  definition: 1.0,
  formula: 0.85,
  concept: 1.1,
  fact: 1.2,
  default: 1.0,
};

// ============================================================
// کلاس اصلی SRS
// ============================================================

/**
 * کلاس اصلی SpacedRepetitionSystem
 */
export class SpacedRepetitionSystem {
  private config: SRSConfig;

  constructor() {
    this.config = {
      initialEase: 2.5,
      minEase: 1.3,
      maxInterval: 365,
      graduationInterval: 1,
      easyInterval: 4,
      learningSteps: [1, 10],
      graduatingInterval: 1,
      easyIntervalDays: 4,
    };

    logger.debug('SRS initialized with SM-2 algorithm');
  }

  /**
   * محاسبه زمان مرور بعدی یک فلش‌کارت
   */
  schedule(card: Flashcard, quality: number): Flashcard {
    if (quality < 0 || quality > 5) {
      throw new Error('کیفیت باید بین 0 تا 5 باشد');
    }

    const now = new Date();
    const updated: Flashcard = { ...card };

    // اگر کیفیت کمتر از 3 باشد (پاسخ نادرست یا سخت)
    if (quality < 3) {
      updated.repetitions = 0;
      updated.interval = 1;
      updated.lapses = (updated.lapses ?? 0) + 1;

      logger.debug('کارت reset شد', {
        cardId: card.id,
        quality,
        lapses: updated.lapses,
      });
    } else {
      // پاسخ صحیح
      if (updated.repetitions === 0) {
        updated.interval = 1;
      } else if (updated.repetitions === 1) {
        updated.interval = 6;
      } else {
        updated.interval = Math.round(updated.interval * updated.ease);
      }
      updated.repetitions = (updated.repetitions ?? 0) + 1;
    }

    // به‌روزرسانی ease factor
    const easeChange = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    updated.ease = Math.max(
      this.config.minEase,
      (updated.ease ?? this.config.initialEase) + easeChange
    );

    // اعمال ضریب تطبیقی بر اساس نوع محتوا
    const contentMultiplier = this._getContentMultiplier(card.conceptType);
    const adjustedInterval = Math.round(updated.interval * contentMultiplier);

    // محدود کردن به حداکثر فاصله
    updated.interval = Math.min(adjustedInterval, this.config.maxInterval);

    // محاسبه تاریخ مرور بعدی
    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + updated.interval);
    updated.nextReview = nextReview.toISOString();

    // به‌روزرسانی آمار
    updated.lastReview = now.toISOString();
    updated.lastQuality = quality;
    updated.totalReviews = (updated.totalReviews ?? 0) + 1;

    logger.debug('کارت schedule شد', {
      cardId: card.id,
      quality,
      interval: updated.interval,
      ease: updated.ease.toFixed(2),
      nextReview: updated.nextReview,
    });

    return updated;
  }

  /**
   * دریافت فلش‌کارت‌های آماده مرور
   */
  getDueCards(flashcards: Flashcard[]): Flashcard[] {
    const now = new Date();
    return flashcards.filter((card) => {
      const nextReview = new Date(card.nextReview);
      return nextReview <= now;
    });
  }

  /**
   * دریافت فلش‌کارت‌های جدید (هرگز مرور نشده)
   */
  getNewCards(flashcards: Flashcard[]): Flashcard[] {
    return flashcards.filter((card) => !card.lastReview);
  }

  /**
   * دریافت فلش‌کارت‌های در حال یادگیری
   */
  getLearningCards(flashcards: Flashcard[]): Flashcard[] {
    return flashcards.filter(
      (card) =>
        card.repetitions !== undefined &&
        card.repetitions < 2 &&
        card.lastReview
    );
  }

  /**
   * محاسبه آمار مرور
   */
  getStats(flashcards: Flashcard[]): SRSStats {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const due = this.getDueCards(flashcards);
    const newCards = this.getNewCards(flashcards);
    const learning = this.getLearningCards(flashcards);

    // فلش‌کارت‌های مرور شده امروز
    const reviewedToday = flashcards.filter((card) => {
      if (!card.lastReview) return false;
      const reviewDate = new Date(card.lastReview);
      return reviewDate >= today;
    });

    // محاسبه retention rate
    const totalReviews = flashcards.reduce(
      (sum, c) => sum + (c.totalReviews ?? 0),
      0
    );
    const lapses = flashcards.reduce((sum, c) => sum + (c.lapses ?? 0), 0);
    const retentionRate =
      totalReviews > 0
        ? parseFloat((((totalReviews - lapses) / totalReviews) * 100).toFixed(1))
        : 0;

    // پیش‌بینی مرورهای آینده (7 روز آینده)
    const forecast: ForecastEntry[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toDateString();

      const count = flashcards.filter((card) => {
        const nextReview = new Date(card.nextReview);
        return nextReview.toDateString() === dateStr;
      }).length;

      forecast.push({
        date: date.toISOString(),
        count,
      });
    }

    return {
      total: flashcards.length,
      due: due.length,
      new: newCards.length,
      learning: learning.length,
      reviewedToday: reviewedToday.length,
      retentionRate,
      averageEase: this._calculateAverageEase(flashcards),
      averageInterval: this._calculateAverageInterval(flashcards),
      forecast,
      maturity: this._calculateMaturity(flashcards),
    };
  }

  /**
   * محاسبه بهینگی مرور
   */
  analyzeEfficiency(flashcards: Flashcard[]): EfficiencyAnalysis {
    const stats = this.getStats(flashcards);

    // محاسبه burden (تعداد مرورهای روزانه مورد نیاز)
    const matureCards = flashcards.filter((c) => c.interval >= 21);
    const dailyBurden = matureCards.reduce((sum, c) => {
      return sum + 1 / (c.interval || 1);
    }, 0);

    // تخمین زمان مطالعه روزانه
    const avgTimePerCard = 10; // ثانیه
    const dailyTimeMinutes = (dailyBurden * avgTimePerCard) / 60;

    return {
      dailyBurden: parseFloat(dailyBurden.toFixed(1)),
      dailyTimeMinutes: parseFloat(dailyTimeMinutes.toFixed(1)),
      retentionRate: stats.retentionRate,
      efficiency: this._calculateEfficiencyScore(stats),
      recommendations: this._generateRecommendations(stats, flashcards),
    };
  }

  /**
   * پیش‌بینی زمان بهینه برای مرور
   */
  predictOptimalTime(card: Flashcard): OptimalTimePrediction {
    const now = new Date();
    const nextReview = new Date(card.nextReview);
    const hoursUntilDue =
      (nextReview.getTime() - now.getTime()) / (1000 * 60 * 60);

    // اگر overdue است
    if (hoursUntilDue < 0) {
      return {
        status: 'overdue',
        priority: 'high',
        message: 'این کارت باید فوراً مرور شود',
        hoursOverdue: Math.abs(hoursUntilDue).toFixed(1),
      };
    }

    // اگر امروز باید مرور شود
    if (hoursUntilDue < 24) {
      return {
        status: 'due_today',
        priority: 'medium',
        message: 'امروز باید مرور شود',
        hoursUntil: hoursUntilDue.toFixed(1),
      };
    }

    // آینده
    return {
      status: 'future',
      priority: 'low',
      message: `${Math.ceil(hoursUntilDue / 24)} روز دیگر`,
      daysUntil: Math.ceil(hoursUntilDue / 24),
    };
  }

  /**
   * ایجاد فلش‌کارت جدید با مقادیر پیش‌فرض
   */
  createCard(data: CreateCardData): Flashcard {
    return {
      id:
        data.id ||
        Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      front: data.front,
      back: data.back,
      topic: data.topic || 'general',
      conceptType: data.conceptType || 'default',
      createdAt: new Date().toISOString(),
      ease: this.config.initialEase,
      interval: 0,
      repetitions: 0,
      lapses: 0,
      nextReview: new Date().toISOString(),
      lastReview: null,
      lastQuality: null,
      totalReviews: 0,
    };
  }

  /**
   * ریست کردن یک فلش‌کارت
   */
  resetCard(card: Flashcard): Flashcard {
    return {
      ...card,
      ease: this.config.initialEase,
      interval: 0,
      repetitions: 0,
      lapses: 0,
      nextReview: new Date().toISOString(),
      lastReview: null,
      lastQuality: null,
    };
  }

  // ============================================================
  // متدهای خصوصی
  // ============================================================

  /**
   * محاسبه ضریب تطبیقی بر اساس نوع محتوا
   */
  private _getContentMultiplier(conceptType: ConceptType | undefined): number {
    return CONTENT_MULTIPLIERS[conceptType ?? 'default'] ?? CONTENT_MULTIPLIERS.default;
  }

  /**
   * محاسبه میانگین ease
   */
  private _calculateAverageEase(flashcards: Flashcard[]): number {
    if (flashcards.length === 0) return 0;
    const total = flashcards.reduce(
      (sum, c) => sum + (c.ease ?? this.config.initialEase),
      0
    );
    return parseFloat((total / flashcards.length).toFixed(2));
  }

  /**
   * محاسبه میانگین interval
   */
  private _calculateAverageInterval(flashcards: Flashcard[]): number {
    const withInterval = flashcards.filter((c) => c.interval > 0);
    if (withInterval.length === 0) return 0;
    const total = withInterval.reduce((sum, c) => sum + c.interval, 0);
    return Math.round(total / withInterval.length);
  }

  /**
   * محاسبه maturity (درصد کارت‌های بالغ)
   */
  private _calculateMaturity(flashcards: Flashcard[]): number {
    if (flashcards.length === 0) return 0;
    const mature = flashcards.filter((c) => c.interval >= 21).length;
    return parseFloat(((mature / flashcards.length) * 100).toFixed(1));
  }

  /**
   * محاسبه امتیاز کارایی
   */
  private _calculateEfficiencyScore(stats: SRSStats): number {
    let score = 100;

    // کسر برای retention پایین
    if (stats.retentionRate < 90) {
      score -= (90 - stats.retentionRate) * 2;
    }

    // کسر برای ease خیلی پایین
    if (stats.averageEase < 2.0) {
      score -= (2.0 - stats.averageEase) * 20;
    }

    // پاداش برای maturity بالا
    if (stats.maturity > 50) {
      score += (stats.maturity - 50) * 0.5;
    }

    return parseFloat(Math.max(0, Math.min(100, score)).toFixed(0));
  }

  /**
   * تولید پیشنهادات
   */
  private _generateRecommendations(
    stats: SRSStats,
    flashcards: Flashcard[]
  ): SRSRecommendation[] {
    const recommendations: SRSRecommendation[] = [];

    if (stats.retentionRate < 85) {
      recommendations.push({
        type: 'warning',
        message: 'نرخ یادآوری پایین است. کارت‌های سخت را بیشتر مرور کنید.',
        action: 'review_hard_cards',
      });
    }

    if (stats.due > 20) {
      recommendations.push({
        type: 'info',
        message: `${stats.due} کارت آماده مرور دارید. بهتر است امروز مرور کنید.`,
        action: 'start_review',
      });
    }

    if (stats.averageEase < 2.0) {
      recommendations.push({
        type: 'warning',
        message: 'میانگین سهولت کارت‌ها پایین است. شاید کارت‌ها خیلی سخت هستند.',
        action: 'review_difficulty',
      });
    }

    if (stats.maturity < 30 && flashcards.length > 10) {
      recommendations.push({
        type: 'info',
        message: 'هنوز بیشتر کارت‌ها بالغ نشده‌اند. به مرور ادامه دهید.',
        action: 'continue_review',
      });
    }

    return recommendations;
  }
}

// ============================================================
// Singleton
// ============================================================

let srsInstance: SpacedRepetitionSystem | null = null;

/**
 * دریافت نمونه singleton از SRS
 */
export function getSRS(): SpacedRepetitionSystem {
  if (!srsInstance) {
    srsInstance = new SpacedRepetitionSystem();
  }
  return srsInstance;
}

/**
 * ریست کردن نمونه singleton (فقط برای تست)
 */
export function resetSRS(): void {
  srsInstance = null;
}

/**
 * Export پیش‌فرض
 */
export default getSRS();