/**
 * دانش‌یار پرو - سرویس خلاصه‌سازی هوشمند آفلاین
 * پیاده‌سازی الگوریتم‌های TextRank و TF-IDF برای خلاصه‌سازی متن
 * @module services/Summarizer
 */

import LoggerModule from '../core/Logger.js';

const logger = LoggerModule.getInstance().module('Summarizer');

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
  'طور', 'گونه', 'قدر', 'حد', 'اندازه', 'برابر', 'مقابل', 'ضمن', 'طی', 'علیه', 'با',
  'بی', 'بدون', 'پیش', 'بعد', 'قبل', 'پس از', 'تا', 'حتی', 'فقط', 'نه', 'آری', 'بله',
  'خیر', 'شاید', 'حتما', 'قطعاً', 'البته', 'بنابراین', 'پس', 'چون', 'زیرا', 'اگرچه',
  'با این حال', 'اما', 'ولی', 'هر چند', 'در حالی که', 'وقتی', 'زمانی', 'هنگامی', 'چنانچه'
]);

/**
 * کلمات سیگنال (برای شناسایی جملات مهم)
 */
const SIGNAL_WORDS = {
  definition: ['تعریف', 'یعنی', 'عبارت است از', 'به معنای', 'مفهوم'],
  important: ['مهم', 'اصلی', 'کلیدی', 'اساسی', 'بنیادی', 'حیاتی', 'ضروری'],
  result: ['بنابراین', 'نتیجه', 'در نتیجه', 'پس', 'از این رو', 'لذا'],
  example: ['مثلاً', 'برای مثال', 'مانند', 'نظیر', 'از جمله'],
  summary: ['به طور خلاصه', 'در نهایت', 'جمع‌بندی', 'به عبارت دیگر', 'در واقع'],
  emphasis: ['توجه', 'دقت', 'نکته', 'یادآوری', 'تأکید']
};

/**
 * کلاس اصلی Summarizer
 */
class Summarizer {
  constructor() {
    logger.debug('Summarizer initialized');
  }

  /**
   * خلاصه‌سازی متن
   * @param {string} text - متن اصلی
   * @param {Object} [options] - تنظیمات
   * @param {string} [options.level='medium'] - سطح خلاصه (short, medium, long)
   * @param {boolean} [options.forExam=false] - برای کنکوری‌ها؟
   * @param {boolean} [options.preserveStructure=true] - حفظ ساختار؟
   * @returns {Object} نتیجه خلاصه‌سازی
   */
  summarize(text, options = {}) {
    const {
      level = 'medium',
      forExam = false,
      preserveStructure = true
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
          sentenceCount: sentences.length
        };
      }

      // استخراج کلمات کلیدی
      const keywords = this._extractKeywords(text, 20);

      // امتیازدهی به جملات
      const scoredSentences = this._scoreSentences(sentences, keywords, forExam);

      // انتخاب جملات برتر
      const count = this._getDesiredCount(level, sentences.length);
      const selected = this._selectTopSentences(scoredSentences, count, preserveStructure);

      // ساخت خلاصه
      const summary = selected.map(s => s.text).join(' ');

      // استخراج نکات کلیدی
      const keyPoints = this._extractKeyPoints(scoredSentences, keywords, forExam);

      logger.timeEnd('summarize');

      return {
        summary,
        keyPoints,
        keywords: keywords.slice(0, 10),
        sentenceCount: selected.length,
        totalSentences: sentences.length
      };
    } catch (error) {
      logger.error('خطا در خلاصه‌سازی', error);
      throw error;
    }
  }

  /**
   * استخراج نکات کلیدی
   * @param {string} text - متن اصلی
   * @param {number} [count=7] - تعداد نکات
   * @param {boolean} [forExam=false] - برای کنکوری‌ها؟
   * @returns {Array<string>}
   */
  extractKeyPoints(text, count = 7, forExam = false) {
    const sentences = this._splitIntoSentences(text);
    const keywords = this._extractKeywords(text, 20);
    const scored = this._scoreSentences(sentences, keywords, forExam);
    
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(s => s.text);
  }

  /**
   * استخراج کلمات کلیدی با TF-IDF
   * @param {string} text - متن
   * @param {number} [topN=15] - تعداد کلمات
   * @returns {Array<string>}
   */
  extractKeywords(text, topN = 15) {
    return this._extractKeywords(text, topN);
  }

  /**
   * تقسیم متن به جملات
   * @private
   */
  _splitIntoSentences(text) {
    // الگوهای پایان جمله
    const sentenceEnders = /[.!?؟]/;
    const sentences = [];
    
    // تقسیم اولیه
    const parts = text.split(/(?<=[.!?؟])\s+|\n+/);
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.length > 10 && trimmed.length < 500) {
        sentences.push(trimmed);
      }
    }
    
    return sentences;
  }

  /**
   * تقسیم جمله به کلمات
   * @private
   */
  _tokenize(text) {
    return text
      .replace(/[.,!?؟()«»""''\-]/g, ' ')
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length >= 3 && !PERSIAN_STOPWORDS.has(w));
  }

  /**
   * استخراج کلمات کلیدی با TF-IDF ساده‌شده
   * @private
   */
  _extractKeywords(text, topN) {
    const sentences = this._splitIntoSentences(text);
    const wordFreq = {};
    const wordDocFreq = {};
    const totalDocs = sentences.length;

    // محاسبه TF (Term Frequency)
    sentences.forEach(sentence => {
      const words = this._tokenize(sentence);
      const uniqueWords = new Set(words);

      words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });

      uniqueWords.forEach(word => {
        wordDocFreq[word] = (wordDocFreq[word] || 0) + 1;
      });
    });

    // محاسبه TF-IDF
    const tfidf = {};
    for (const word in wordFreq) {
      const tf = wordFreq[word] / text.split(/\s+/).length;
      const idf = Math.log(totalDocs / (wordDocFreq[word] || 1));
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
   * @private
   */
  _scoreSentences(sentences, keywords, forExam) {
    return sentences.map((sentence, index) => {
      let score = 0;
      const words = this._tokenize(sentence);

      // ۱. امتیاز بر اساس کلمات کلیدی
      const keywordMatches = keywords.filter(kw => sentence.includes(kw)).length;
      score += keywordMatches * 3;

      // ۲. امتیاز موقعیتی
      if (index === 0) score += 5; // جمله اول
      if (index === sentences.length - 1) score += 3; // جمله آخر
      if (index < sentences.length * 0.2) score += 2; // ۲۰٪ اول
      if (index > sentences.length * 0.8) score += 1; // ۲۰٪ آخر

      // ۳. امتیاز طول جمله (جملات متوسط بهترند)
      if (words.length >= 10 && words.length <= 30) score += 2;
      else if (words.length > 30) score -= 1;

      // ۴. امتیاز کلمات سیگنال
      for (const category in SIGNAL_WORDS) {
        const words = SIGNAL_WORDS[category];
        if (words.some(w => sentence.includes(w))) {
          score += category === 'definition' ? 4 : 
                   category === 'important' ? 3 : 
                   category === 'summary' ? 3 : 2;
        }
      }

      // ۵. برای کنکوری‌ها: امتیاز بیشتر برای اعداد و فرمول‌ها
      if (forExam) {
        if (/\d+/.test(sentence)) score += 2; // اعداد
        if (/\$[^$]+\$/.test(sentence)) score += 3; // فرمول‌های LaTeX
        if (/فرمول|قانون|قضیه|تعریف/.test(sentence)) score += 3;
      }

      // ۶. شباهت با جملات دیگر (TextRank)
      let similarity = 0;
      const currentWords = new Set(words);
      sentences.forEach((other, otherIndex) => {
        if (index === otherIndex) return;
        const otherWords = new Set(this._tokenize(other));
        const intersection = [...currentWords].filter(w => otherWords.has(w)).length;
        similarity += intersection;
      });
      score += similarity * 0.5;

      return {
        text: sentence,
        score,
        index,
        keywords: keywordMatches
      };
    });
  }

  /**
   * انتخاب جملات برتر
   * @private
   */
  _selectTopSentences(scoredSentences, count, preserveStructure) {
    const sorted = [...scoredSentences].sort((a, b) => b.score - a.score);
    const selected = sorted.slice(0, count);

    if (preserveStructure) {
      // مرتب‌سازی بر اساس ترتیب اصلی
      selected.sort((a, b) => a.index - b.index);
    }

    return selected;
  }

  /**
   * استخراج نکات کلیدی
   * @private
   */
  _extractKeyPoints(scoredSentences, keywords, forExam) {
    // انتخاب جملات با بالاترین امتیاز که حاوی کلمات کلیدی هستند
    const candidates = scoredSentences
      .filter(s => s.keywords > 0)
      .sort((a, b) => b.score - a.score);

    const points = [];
    const usedKeywords = new Set();

    for (const candidate of candidates) {
      if (points.length >= 7) break;

      // بررسی اینکه کلمات کلیدی جدیدی اضافه می‌کند
      const newKeywords = keywords.filter(kw => 
        candidate.text.includes(kw) && !usedKeywords.has(kw)
      );

      if (newKeywords.length > 0 || points.length < 3) {
        points.push(candidate.text);
        newKeywords.forEach(kw => usedKeywords.add(kw));
      }
    }

    return points;
  }

  /**
   * محاسبه تعداد جملات مورد نیاز
   * @private
   */
  _getDesiredCount(level, totalSentences) {
    const ratios = {
      short: 0.15,   // ۱۵٪ جملات
      medium: 0.25,  // ۲۵٪ جملات
      long: 0.40     // ۴۰٪ جملات
    };

    const ratio = ratios[level] || ratios.medium;
    const count = Math.ceil(totalSentences * ratio);

    // محدود کردن بین ۳ تا ۱۵ جمله
    return Math.max(3, Math.min(15, count));
  }

  /**
   * تحلیل ساختار متن
   * @param {string} text
   * @returns {Object}
   */
  analyzeStructure(text) {
    const sentences = this._splitIntoSentences(text);
    const words = text.split(/\s+/).filter(Boolean);
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

    return {
      sentenceCount: sentences.length,
      wordCount: words.length,
      paragraphCount: paragraphs.length,
      averageSentenceLength: words.length / sentences.length,
      hasLists: /^[-*•]\s+/m.test(text),
      hasHeaders: /^#+\s+/m.test(text) || /^\*\*[^*]+\*\*/m.test(text)
    };
  }
}

// ============================================================
// Singleton
// ============================================================

let summarizerInstance = null;

export function getSummarizer() {
  if (!summarizerInstance) {
    summarizerInstance = new Summarizer();
  }
  return summarizerInstance;
}

export default getSummarizer();