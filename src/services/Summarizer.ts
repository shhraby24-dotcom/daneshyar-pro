/**
 * ============================================================
 * دانش‌یار پرو - سرویس خلاصه‌سازی هوشمند آفلاین
 * ============================================================
 *
 * پیاده‌سازی الگوریتم‌های TextRank و TF-IDF برای خلاصه‌سازی متن
 *
 * ✅ TF-IDF برای استخراج کلیدواژه‌ها
 * ✅ TextRank ساده‌شده برای امتیازدهی جملات
 * ✅ ۳ سطح خلاصه: short, medium, long
 * ✅ حالت کنکور (forExam)
 * ✅ کلمات سیگنال فارسی
 * ✅ تحلیل ساختار متن
 *
 * @module services/Summarizer
 * @version 1.0.0-beta.1
 */

import { getInstance as getLogger } from '@/core/Logger';

const logger = getLogger().module('Summarizer');

// ============================================================
// Types و Interfaces
// ============================================================

/**
 * سطح خلاصه
 */
export type SummaryLevel = 'short' | 'medium' | 'long';

/**
 * تنظیمات خلاصه‌سازی
 */
export interface SummarizeOptions {
  level?: SummaryLevel;
  forExam?: boolean;
  preserveStructure?: boolean;
}

/**
 * نتیجه خلاصه‌سازی
 */
export interface SummarizeResult {
  summary: string;
  keyPoints: string[];
  keywords: string[];
  sentenceCount: number;
  totalSentences: number;
}

/**
 * یک جمله امتیازدهی شده
 */
interface ScoredSentence {
  text: string;
  score: number;
  index: number;
  keywordCount: number;
}

/**
 * نتیجه تحلیل ساختار
 */
export interface StructureAnalysis {
  sentenceCount: number;
  wordCount: number;
  paragraphCount: number;
  averageSentenceLength: number;
  hasLists: boolean;
  hasHeaders: boolean;
}

/**
 * دسته‌بندی کلمات سیگنال
 */
type SignalCategory =
  | 'definition'
  | 'important'
  | 'result'
  | 'example'
  | 'summary'
  | 'emphasis';

// ============================================================
// ثابت‌ها
// ============================================================

/**
 * کلمات توقف فارسی (Stopwords)
 */
const PERSIAN_STOPWORDS = new Set([
  'و', 'در', 'به', 'از', 'که', 'این', 'آن', 'با', 'برای', 'را', 'است', 'هستند', 'بود',
  'شد', 'یک', 'هم', 'یا', 'تا', 'اما', 'چون', 'پس', 'خیلی', 'بسیار', 'هر', 'همه', 'ما',
  'شما', 'آنها', 'او', 'من', 'تو', 'اینجا', 'آنجا', 'کجا', 'چه', 'چگونه', 'چرا', 'چیست',
  'نیست', 'باشد', 'شدن', 'کردن', 'گفتن', 'دانستن', 'داشتن', 'بودن', 'خواهد', 'می', 'کن',
  'کنید', 'می\u200cشود', 'می\u200cکند', 'می\u200cکنند', 'اینکه', 'اگر', 'کی', 'هنگام',
  'روی', 'زیر', 'بالای', 'پایین', 'جلو', 'عقب', 'بین', 'کنار', 'درباره', 'مثل', 'مانند',
  'طور', 'گونه', 'قدر', 'حد', 'اندازه', 'برابر', 'مقابل', 'ضمن', 'طی', 'علیه',
  'بی', 'بدون', 'پیش', 'بعد', 'قبل', 'پس از', 'حتی', 'فقط', 'نه', 'آری', 'بله',
  'خیر', 'شاید', 'حتما', 'قطعاً', 'البته', 'بنابراین', 'زیرا', 'اگرچه',
  'با این حال', 'ولی', 'هر چند', 'در حالی که', 'وقتی', 'زمانی', 'هنگامی', 'چنانچه',
]);

/**
 * کلمات سیگنال (برای شناسایی جملات مهم)
 */
const SIGNAL_WORDS: Record<SignalCategory, string[]> = {
  definition: ['تعریف', 'یعنی', 'عبارت است از', 'به معنای', 'مفهوم'],
  important: ['مهم', 'اصلی', 'کلیدی', 'اساسی', 'بنیادی', 'حیاتی', 'ضروری'],
  result: ['بنابراین', 'نتیجه', 'در نتیجه', 'پس', 'از این رو', 'لذا'],
  example: ['مثلاً', 'برای مثال', 'مانند', 'نظیر', 'از جمله'],
  summary: ['به طور خلاصه', 'در نهایت', 'جمع‌بندی', 'به عبارت دیگر', 'در واقع'],
  emphasis: ['توجه', 'دقت', 'نکته', 'یادآوری', 'تأکید'],
};

/**
 * امتیاز هر دسته سیگنال
 */
const SIGNAL_SCORES: Record<SignalCategory, number> = {
  definition: 4,
  important: 3,
  result: 2,
  example: 2,
  summary: 3,
  emphasis: 2,
};

/**
 * نسبت جملات برای هر سطح خلاصه
 */
const LEVEL_RATIOS: Record<SummaryLevel, number> = {
  short: 0.15,
  medium: 0.25,
  long: 0.4,
};

// ============================================================
// کلاس اصلی Summarizer
// ============================================================

/**
 * کلاس اصلی Summarizer
 */
export class Summarizer {
  constructor() {
    logger.debug('Summarizer initialized');
  }

  /**
   * خلاصه‌سازی متن
   */
  summarize(text: string, options: SummarizeOptions = {}): SummarizeResult {
    const {
      level = 'medium',
      forExam = false,
      preserveStructure = true,
    } = options;

    logger.time('summarize');

    try {
      // تقسیم به جملات
      const sentences = this._splitIntoSentences(text);

      if (sentences.length < 3) {
        return {
          summary: text,
          keyPoints: [],
          keywords: [],
          sentenceCount: sentences.length,
          totalSentences: sentences.length,
        };
      }

      // استخراج کلمات کلیدی
      const keywords = this._extractKeywords(text, 20);

      // امتیازدهی به جملات
      const scoredSentences = this._scoreSentences(sentences, keywords, forExam);

      // انتخاب جملات برتر
      const count = this._getDesiredCount(level, sentences.length);
      const selected = this._selectTopSentences(
        scoredSentences,
        count,
        preserveStructure
      );

      // ساخت خلاصه
      const summary = selected.map((s) => s.text).join(' ');

      // استخراج نکات کلیدی
      const keyPoints = this._extractKeyPoints(scoredSentences, keywords);

      logger.timeEnd('summarize');

      return {
        summary,
        keyPoints,
        keywords: keywords.slice(0, 10),
        sentenceCount: selected.length,
        totalSentences: sentences.length,
      };
    } catch (error) {
      logger.error('خطا در خلاصه‌سازی', error);
      throw error;
    }
  }

  /**
   * استخراج نکات کلیدی
   */
  extractKeyPoints(
    text: string,
    count: number = 7,
    forExam: boolean = false
  ): string[] {
    const sentences = this._splitIntoSentences(text);
    const keywords = this._extractKeywords(text, 20);
    const scored = this._scoreSentences(sentences, keywords, forExam);

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map((s) => s.text);
  }

  /**
   * استخراج کلمات کلیدی با TF-IDF
   */
  extractKeywords(text: string, topN: number = 15): string[] {
    return this._extractKeywords(text, topN);
  }

  /**
   * تحلیل ساختار متن
   */
  analyzeStructure(text: string): StructureAnalysis {
    const sentences = this._splitIntoSentences(text);
    const words = text.split(/\s+/).filter(Boolean);
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);

    return {
      sentenceCount: sentences.length,
      wordCount: words.length,
      paragraphCount: paragraphs.length,
      averageSentenceLength:
        sentences.length > 0
          ? parseFloat((words.length / sentences.length).toFixed(1))
          : 0,
      hasLists: /^[-*•]\s+/m.test(text),
      hasHeaders: /^#+\s+/m.test(text) || /^\*\*[^*]+\*\*/m.test(text),
    };
  }

  // ============================================================
  // متدهای خصوصی
  // ============================================================

  /**
   * تقسیم متن به جملات
   */
  private _splitIntoSentences(text: string): string[] {
    const parts = text.split(/(?<=[.!?؟])\s+|\n+/);
    const sentences: string[] = [];

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.length > 10 && trimmed.length < 500) {
        sentences.push(trimmed);
      }
    }

    return sentences;
  }

  /**
   * تقسیم جمله به کلمات (با حذف نیم‌فاصله)
   */
  private _tokenize(text: string): string[] {
    return text
      .replace(/[\u200C]/g, ' ') // حذف نیم‌فاصله
      .replace(/[.,!?؟()«»""''\-]/g, ' ')
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 3 && !PERSIAN_STOPWORDS.has(w));
  }

  /**
   * استخراج کلمات کلیدی با TF-IDF ساده‌شده
   */
  private _extractKeywords(text: string, topN: number): string[] {
    const sentences = this._splitIntoSentences(text);
    const wordFreq: Record<string, number> = {};
    const wordDocFreq: Record<string, number> = {};
    const totalDocs = sentences.length;

    if (totalDocs === 0) return [];

    // محاسبه TF (Term Frequency)
    sentences.forEach((sentence) => {
      const words = this._tokenize(sentence);
      const uniqueWords = new Set(words);

      words.forEach((word) => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });

      uniqueWords.forEach((word) => {
        wordDocFreq[word] = (wordDocFreq[word] || 0) + 1;
      });
    });

    // محاسبه TF-IDF
    const totalWords = text.split(/\s+/).length || 1;
    const tfidf: Record<string, number> = {};

    for (const word in wordFreq) {
      const tf = (wordFreq[word] ?? 0) / totalWords;
      const idf = Math.log((totalDocs + 1) / ((wordDocFreq[word] || 0) + 1)) + 1;
      tfidf[word] = tf * idf;
    }

    // مرتب‌سازی و انتخاب topN
    return Object.entries(tfidf)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([word]) => word);
  }

  /**
   * امتیازدهی به جملات (TextRank ساده‌شده)
   */
  private _scoreSentences(
    sentences: string[],
    keywords: string[],
    forExam: boolean
  ): ScoredSentence[] {
    return sentences.map((sentence, index) => {
      let score = 0;
      const sentenceWords = this._tokenize(sentence);

      // ۱. امتیاز بر اساس کلمات کلیدی
      const keywordCount = keywords.filter((kw) =>
        sentence.includes(kw)
      ).length;
      score += keywordCount * 3;

      // ۲. امتیاز موقعیتی
      if (index === 0) score += 5;
      if (index === sentences.length - 1) score += 3;
      if (index < sentences.length * 0.2) score += 2;
      if (index > sentences.length * 0.8) score += 1;

      // ۳. امتیاز طول جمله
      if (sentenceWords.length >= 10 && sentenceWords.length <= 30) {
        score += 2;
      } else if (sentenceWords.length > 30) {
        score -= 1;
      }

      // ۴. امتیاز کلمات سیگنال (بدون shadow!)
      for (const [category, signalWords] of Object.entries(SIGNAL_WORDS)) {
        if (signalWords.some((w) => sentence.includes(w))) {
          score += SIGNAL_SCORES[category as SignalCategory] ?? 2;
        }
      }

      // ۵. برای کنکوری‌ها
      if (forExam) {
        if (/\d+/.test(sentence)) score += 2;
        if (/\$[^$]+\$/.test(sentence)) score += 3;
        if (/فرمول|قانون|قضیه|تعریف/.test(sentence)) score += 3;
      }

      // ۶. شباهت با جملات دیگر (TextRank)
      let similarity = 0;
      const currentWords = new Set(sentenceWords);

      sentences.forEach((other, otherIndex) => {
        if (index === otherIndex) return;
        const otherWords = new Set(this._tokenize(other));
        const intersection = [...currentWords].filter((w) =>
          otherWords.has(w)
        ).length;
        similarity += intersection;
      });
      score += similarity * 0.5;

      return {
        text: sentence,
        score,
        index,
        keywordCount,
      };
    });
  }

  /**
   * انتخاب جملات برتر
   */
  private _selectTopSentences(
    scoredSentences: ScoredSentence[],
    count: number,
    preserveStructure: boolean
  ): ScoredSentence[] {
    const sorted = [...scoredSentences].sort((a, b) => b.score - a.score);
    const selected = sorted.slice(0, count);

    if (preserveStructure) {
      selected.sort((a, b) => a.index - b.index);
    }

    return selected;
  }

  /**
   * استخراج نکات کلیدی
   */
  private _extractKeyPoints(
    scoredSentences: ScoredSentence[],
    keywords: string[]
  ): string[] {
    const candidates = scoredSentences
      .filter((s) => s.keywordCount > 0)
      .sort((a, b) => b.score - a.score);

    const points: string[] = [];
    const usedKeywords = new Set<string>();

    for (const candidate of candidates) {
      if (points.length >= 7) break;

      const newKeywords = keywords.filter(
        (kw) => candidate.text.includes(kw) && !usedKeywords.has(kw)
      );

      if (newKeywords.length > 0 || points.length < 3) {
        points.push(candidate.text);
        newKeywords.forEach((kw) => usedKeywords.add(kw));
      }
    }

    return points;
  }

  /**
   * محاسبه تعداد جملات مورد نیاز
   */
  private _getDesiredCount(
    level: SummaryLevel,
    totalSentences: number
  ): number {
    const ratio = LEVEL_RATIOS[level] ?? LEVEL_RATIOS.medium;
    const count = Math.ceil(totalSentences * ratio);
    return Math.max(3, Math.min(15, count));
  }
}

// ============================================================
// Singleton
// ============================================================

let summarizerInstance: Summarizer | null = null;

/**
 * دریافت نمونه singleton از Summarizer
 */
export function getSummarizer(): Summarizer {
  if (!summarizerInstance) {
    summarizerInstance = new Summarizer();
  }
  return summarizerInstance;
}

/**
 * ریست کردن نمونه singleton (فقط برای تست)
 */
export function resetSummarizer(): void {
  summarizerInstance = null;
}

/**
 * Export پیش‌فرض
 */
export default getSummarizer();