/**
 * دانش‌یار پرو - سیستم Spaced Repetition (SRS)
 * پیاده‌سازی الگوریتم SM-2 برای یادگیری بهینه فلش‌کارت‌ها
 * @module services/SRS
 */

import LoggerModule from '../core/Logger.js';

const logger = LoggerModule.getInstance().module('SRS');

/**
 * سطوح کیفیت پاسخ (0-5)
 * 0 = کاملاً فراموش شده
 * 1 = تقریباً فراموش شده
 * 2 = سخت به یاد آورد
 * 3 = با تلاش به یاد آورد
 * 4 = با کمی تلاش به یاد آورد
 * 5 = به راحتی به یاد آورد
 */
export const QUALITY_LEVELS = {
  BLACKOUT: 0,
  INCORRECT: 1,
  HARD: 2,
  CORRECT_HARD: 3,
  CORRECT: 4,
  PERFECT: 5
};

/**
 * ضرایب تطبیقی برای محتوای فارسی
 */
const CONTENT_MULTIPLIERS = {
  math: 0.8,      // مفاهیم ریاضی نیاز به تکرار بیشتر
  definition: 1.0, // تعاریف استاندارد
  formula: 0.85,  // فرمول‌ها
  concept: 1.1,   // مفاهیم انتزاعی
  fact: 1.2,      // حقایق ساده
  default: 1.0
};

/**
 * کلاس اصلی SRS
 */
class SpacedRepetitionSystem {
  constructor() {
    this.config = {
      initialEase: 2.5,           // سهولت اولیه
      minEase: 1.3,               // حداقل سهولت
      maxInterval: 365,           // حداکثر فاصله (روز)
      graduationInterval: 1,      // فاصله پس از فارغ‌التحصیلی
      easyInterval: 4,            // فاصله برای پاسخ آسان
      learningSteps: [1, 10],     // مراحل یادگیری (دقیقه)
      graduatingInterval: 1,      // فاصله فارغ‌التحصیلی (روز)
      easyIntervalDays: 4         // فاصله آسان (روز)
    };

    logger.debug('SRS initialized with SM-2 algorithm');
  }

  /**
   * محاسبه زمان مرور بعدی یک فلش‌کارت
   * @param {Object} card - فلش‌کارت
   * @param {number} quality - کیفیت پاسخ (0-5)
   * @returns {Object} فلش‌کارت به‌روزشده
   */
  schedule(card, quality) {
    if (quality < 0 || quality > 5) {
      throw new Error('کیفیت باید بین 0 تا 5 باشد');
    }

    const now = new Date();
    const updated = { ...card };

    // اگر کیفیت کمتر از 3 باشد (پاسخ نادرست یا سخت)
    if (quality < 3) {
      // ریست به مرحله یادگیری
      updated.repetitions = 0;
      updated.interval = 1;
      updated.lapses = (updated.lapses || 0) + 1;
      
      logger.debug('کارت reset شد', {
        cardId: card.id,
        quality,
        lapses: updated.lapses
      });
    } else {
      // پاسخ صحیح
      if (updated.repetitions === 0) {
        // اولین پاسخ صحیح
        updated.interval = 1;
      } else if (updated.repetitions === 1) {
        // دومین پاسخ صحیح
        updated.interval = 6;
      } else {
        // پاسخ‌های بعدی
        updated.interval = Math.round(updated.interval * updated.ease);
      }
      
      updated.repetitions = (updated.repetitions || 0) + 1;
    }

    // به‌روزرسانی ease factor
    const easeChange = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    updated.ease = Math.max(
      this.config.minEase,
      (updated.ease || this.config.initialEase) + easeChange
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
    updated.totalReviews = (updated.totalReviews || 0) + 1;

    logger.debug('کارت schedule شد', {
      cardId: card.id,
      quality,
      interval: updated.interval,
      ease: updated.ease.toFixed(2),
      nextReview: updated.nextReview
    });

    return updated;
  }

  /**
   * دریافت فلش‌کارت‌های آماده مرور
   * @param {Array} flashcards - همه فلش‌کارت‌ها
   * @returns {Array} فلش‌کارت‌های آماده
   */
  getDueCards(flashcards) {
    const now = new Date();
    return flashcards.filter(card => {
      const nextReview = new Date(card.nextReview);
      return nextReview <= now;
    });
  }

  /**
   * دریافت فلش‌کارت‌های جدید (هرگز مرور نشده)
   * @param {Array} flashcards
   * @returns {Array}
   */
  getNewCards(flashcards) {
    return flashcards.filter(card => !card.lastReview);
  }

  /**
   * دریافت فلش‌کارت‌های در حال یادگیری
   * @param {Array} flashcards
   * @returns {Array}
   */
  getLearningCards(flashcards) {
    return flashcards.filter(card => 
      card.repetitions !== undefined && 
      card.repetitions < 2 && 
      card.lastReview
    );
  }

  /**
   * محاسبه آمار مرور
   * @param {Array} flashcards
   * @returns {Object}
   */
  getStats(flashcards) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const due = this.getDueCards(flashcards);
    const newCards = this.getNewCards(flashcards);
    const learning = this.getLearningCards(flashcards);
    
    // فلش‌کارت‌های مرور شده امروز
    const reviewedToday = flashcards.filter(card => {
      if (!card.lastReview) return false;
      const reviewDate = new Date(card.lastReview);
      return reviewDate >= today;
    });

    // محاسبه retention rate
    const totalReviews = flashcards.reduce((sum, c) => sum + (c.totalReviews || 0), 0);
    const lapses = flashcards.reduce((sum, c) => sum + (c.lapses || 0), 0);
    const retentionRate = totalReviews > 0 
      ? ((totalReviews - lapses) / totalReviews * 100).toFixed(1)
      : 0;

    // پیش‌بینی مرورهای آینده (7 روز آینده)
    const forecast = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toDateString();
      
      const count = flashcards.filter(card => {
        const nextReview = new Date(card.nextReview);
        return nextReview.toDateString() === dateStr;
      }).length;
      
      forecast.push({
        date: date.toISOString(),
        count
      });
    }

    return {
      total: flashcards.length,
      due: due.length,
      new: newCards.length,
      learning: learning.length,
      reviewedToday: reviewedToday.length,
      retentionRate: parseFloat(retentionRate),
      averageEase: this._calculateAverageEase(flashcards),
      averageInterval: this._calculateAverageInterval(flashcards),
      forecast,
      maturity: this._calculateMaturity(flashcards)
    };
  }

  /**
   * محاسبه بهینگی مرور
   * @param {Array} flashcards
   * @returns {Object}
   */
  analyzeEfficiency(flashcards) {
    const stats = this.getStats(flashcards);
    
    // محاسبه burden (تعداد مرورهای روزانه مورد نیاز)
    const matureCards = flashcards.filter(c => c.interval >= 21);
    const dailyBurden = matureCards.reduce((sum, c) => {
      return sum + (1 / (c.interval || 1));
    }, 0);

    // تخمین زمان مطالعه روزانه
    const avgTimePerCard = 10; // ثانیه
    const dailyTimeMinutes = (dailyBurden * avgTimePerCard) / 60;

    return {
      dailyBurden: dailyBurden.toFixed(1),
      dailyTimeMinutes: dailyTimeMinutes.toFixed(1),
      retentionRate: stats.retentionRate,
      efficiency: this._calculateEfficiencyScore(stats),
      recommendations: this._generateRecommendations(stats, flashcards)
    };
  }

  /**
   * پیش‌بینی زمان بهینه برای مرور
   * @param {Object} card
   * @returns {Object}
   */
  predictOptimalTime(card) {
    const now = new Date();
    const nextReview = new Date(card.nextReview);
    const hoursUntilDue = (nextReview - now) / (1000 * 60 * 60);

    // اگر overdue است
    if (hoursUntilDue < 0) {
      return {
        status: 'overdue',
        priority: 'high',
        message: 'این کارت باید فوراً مرور شود',
        hoursOverdue: Math.abs(hoursUntilDue).toFixed(1)
      };
    }

    // اگر امروز باید مرور شود
    if (hoursUntilDue < 24) {
      return {
        status: 'due_today',
        priority: 'medium',
        message: 'امروز باید مرور شود',
        hoursUntil: hoursUntilDue.toFixed(1)
      };
    }

    // آینده
    return {
      status: 'future',
      priority: 'low',
      message: `${Math.ceil(hoursUntilDue / 24)} روز دیگر`,
      daysUntil: Math.ceil(hoursUntilDue / 24)
    };
  }

  /**
   * محاسبه ضریب تطبیقی بر اساس نوع محتوا
   * @private
   */
  _getContentMultiplier(conceptType) {
    return CONTENT_MULTIPLIERS[conceptType] || CONTENT_MULTIPLIERS.default;
  }

  /**
   * محاسبه میانگین ease
   * @private
   */
  _calculateAverageEase(flashcards) {
    if (flashcards.length === 0) return 0;
    const total = flashcards.reduce((sum, c) => sum + (c.ease || this.config.initialEase), 0);
    return (total / flashcards.length).toFixed(2);
  }

  /**
   * محاسبه میانگین interval
   * @private
   */
  _calculateAverageInterval(flashcards) {
    const withInterval = flashcards.filter(c => c.interval);
    if (withInterval.length === 0) return 0;
    const total = withInterval.reduce((sum, c) => sum + c.interval, 0);
    return Math.round(total / withInterval.length);
  }

  /**
   * محاسبه maturity (درصد کارت‌های بالغ)
   * @private
   */
  _calculateMaturity(flashcards) {
    if (flashcards.length === 0) return 0;
    const mature = flashcards.filter(c => c.interval >= 21).length;
    return ((mature / flashcards.length) * 100).toFixed(1);
  }

  /**
   * محاسبه امتیاز کارایی
   * @private
   */
  _calculateEfficiencyScore(stats) {
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
    
    return Math.max(0, Math.min(100, score)).toFixed(0);
  }

  /**
   * تولید پیشنهادات
   * @private
   */
  _generateRecommendations(stats, flashcards) {
    const recommendations = [];

    if (stats.retentionRate < 85) {
      recommendations.push({
        type: 'warning',
        message: 'نرخ یادآوری پایین است. کارت‌های سخت را بیشتر مرور کنید.',
        action: 'review_hard_cards'
      });
    }

    if (stats.due > 20) {
      recommendations.push({
        type: 'info',
        message: `${stats.due} کارت آماده مرور دارید. بهتر است امروز مرور کنید.`,
        action: 'start_review'
      });
    }

    if (stats.averageEase < 2.0) {
      recommendations.push({
        type: 'warning',
        message: 'میانگین سهولت کارت‌ها پایین است. شاید کارت‌ها خیلی سخت هستند.',
        action: 'review_difficulty'
      });
    }

    if (stats.maturity < 30 && flashcards.length > 10) {
      recommendations.push({
        type: 'info',
        message: 'هنوز بیشتر کارت‌ها بالغ نشده‌اند. به مرور ادامه دهید.',
        action: 'continue_review'
      });
    }

    return recommendations;
  }

  /**
   * ایجاد فلش‌کارت جدید با مقادیر پیش‌فرض
   * @param {Object} data - داده‌های فلش‌کارت
   * @returns {Object}
   */
  createCard(data) {
    return {
      id: data.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      front: data.front,
      back: data.back,
      topic: data.topic || 'general',
      conceptType: data.conceptType || 'default',
      createdAt: new Date().toISOString(),
      
      // SRS fields
      ease: this.config.initialEase,
      interval: 0,
      repetitions: 0,
      lapses: 0,
      nextReview: new Date().toISOString(),
      lastReview: null,
      lastQuality: null,
      totalReviews: 0
    };
  }

  /**
   * ریست کردن یک فلش‌کارت
   * @param {Object} card
   * @returns {Object}
   */
  resetCard(card) {
    return {
      ...card,
      ease: this.config.initialEase,
      interval: 0,
      repetitions: 0,
      lapses: 0,
      nextReview: new Date().toISOString(),
      lastReview: null,
      lastQuality: null
    };
  }
}

// ============================================================
// Singleton
// ============================================================

let srsInstance = null;

export function getSRS() {
  if (!srsInstance) {
    srsInstance = new SpacedRepetitionSystem();
  }
  return srsInstance;
}

export default getSRS();