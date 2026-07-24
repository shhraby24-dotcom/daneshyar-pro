/**
 * ============================================================
 * دانش‌یار پرو - سرویس تولید آزمون هوشمند آفلاین
 * ============================================================
 *
 * تولید سوالات متنوع با تحلیل نقاط ضعف و الگوریتم‌های NLP
 *
 * ✅ ۳ نوع سوال: چندگزینه‌ای، جاخالی، درست/غلط
 * ✅ ماتریس نقاط ضعف بر اساس تاریخچه
 * ✅ NLP فارسی: استخراج جملات، مفاهیم، کلیدواژه‌ها
 * ✅ تحلیل نتایج با پیشنهادات هوشمند
 * ✅ سطوح سختی خودکار
 *
 * @module services/QuizGenerator
 * @version 1.0.0-beta.1
 */

import { getInstance as getLogger } from '@/core/Logger';
import { getSummarizer } from '@/services/Summarizer';

const logger = getLogger().module('QuizGenerator');

// ============================================================
// Types و Interfaces
// ============================================================

/**
 * انواع سوالات پشتیبانی شده
 */
export const QUESTION_TYPES = {
  MULTIPLE_CHOICE: 'mc',
  FILL_BLANK: 'fill',
  TRUE_FALSE: 'tf',
  MATCHING: 'match',
  ORDERING: 'order',
  SHORT_ANSWER: 'short',
} as const;

export type QuestionType = (typeof QUESTION_TYPES)[keyof typeof QUESTION_TYPES];

/**
 * سطوح سختی سوال
 */
export const DIFFICULTY_LEVELS = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
  VERY_HARD: 4,
} as const;

export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[keyof typeof DIFFICULTY_LEVELS];

/**
 * یک سوال تولید شده
 */
export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctIndex?: number;
  answer: string;
  acceptableAnswers?: string[];
  explanation: string;
  difficulty: DifficultyLevel;
  concept: string;
  source: string;
}

/**
 * تنظیمات تولید آزمون
 */
export interface GenerateOptions {
  count?: number;
  types?: QuestionType[];
  forExam?: boolean;
  weaknessMatrix?: WeaknessMatrix | null;
}

/**
 * نتیجه تولید آزمون
 */
export interface QuizResult {
  questions: Question[];
  totalGenerated: number;
  requested: number;
  metadata: {
    keywords: string[];
    concepts: string[];
    totalSentences: number;
  };
}

/**
 * یک ورودی ماتریس ضعف
 */
export interface WeaknessEntry {
  correct: number;
  wrong: number;
  unanswered: number;
  totalAttempts: number;
  weaknessScore: number;
  difficultyLevels: Record<DifficultyLevel, { correct: number; total: number }>;
}

/**
 * ماتریس نقاط ضعف
 */
export type WeaknessMatrix = Record<string, WeaknessEntry>;

/**
 * یک پیشنهاد
 */
export interface Recommendation {
  type: 'critical' | 'warning' | 'success' | 'info' | 'action';
  icon: string;
  message: string;
  weakConcepts?: string[];
}

/**
 * نتیجه تحلیل آزمون
 */
export interface AnalysisResult {
  totalQuestions: number;
  correct: number;
  wrong: number;
  unanswered: number;
  score: number;
  percentage: number;
  timeSpent: number;
  byType: Record<string, { total: number; correct: number }>;
  byDifficulty: Record<number, { total: number; correct: number }>;
  byConcept: Record<string, { total: number; correct: number; wrong: Array<{ question: string; userAnswer: unknown; correctAnswer: string }> }>;
  recommendations: Recommendation[];
}

/**
 * تاریخچه آزمون (برای محاسبه ماتریس ضعف)
 */
export interface QuizHistoryEntry {
  questions: Array<{ concept?: string; difficulty?: DifficultyLevel }>;
  results: boolean[];
  answers?: unknown[];
}

// ============================================================
// کلاس اصلی QuizGenerator
// ============================================================

/**
 * کلاس اصلی QuizGenerator
 */
export class QuizGenerator {
  constructor() {
    logger.debug('QuizGenerator initialized');
  }

  /**
   * تولید آزمون از متن
   */
  generate(text: string, options: GenerateOptions = {}): QuizResult {
    const {
      count = 10,
      types = ['mc', 'fill', 'tf'],
      forExam = false,
      weaknessMatrix = null,
    } = options;

    logger.time('generate-quiz');

    try {
      // استخراج اطلاعات از متن
      const keywords = this._extractKeywords(text, 25);
      const sentences = this._extractSentences(text);
      const concepts = this._extractConcepts(text, keywords);

      if (sentences.length < 5) {
        throw new Error('متن برای تولید سوال کافی نیست (حداقل ۵ جمله نیاز است)');
      }

      // انتخاب جملات بر اساس ماتریس نقاط ضعف
      const selectedSentences = weaknessMatrix
        ? this._selectByWeakness(sentences, weaknessMatrix, count)
        : this._selectSentences(sentences, keywords, count);

      // تولید سوالات
      const questions: Question[] = [];
      const usedSentences = new Set<string>();

      for (let i = 0; i < count && selectedSentences.length > 0; i++) {
        const type = types[i % types.length] ?? QUESTION_TYPES.MULTIPLE_CHOICE;

        const sentenceIndex = this._findSuitableSentence(
          selectedSentences,
          usedSentences,
          type,
          keywords
        );

        if (sentenceIndex === -1) continue;

        const sentence = selectedSentences[sentenceIndex];
        if (!sentence) continue;
        usedSentences.add(sentence);

        const question = this._generateQuestion(
          sentence,
          type,
          keywords,
          concepts,
          forExam
        );

        if (question) {
          questions.push(question);
        }
      }

      logger.timeEnd('generate-quiz');

      return {
        questions,
        totalGenerated: questions.length,
        requested: count,
        metadata: {
          keywords: keywords.slice(0, 10),
          concepts: concepts.slice(0, 5),
          totalSentences: sentences.length,
        },
      };
    } catch (error) {
      logger.error('خطا در تولید آزمون', error);
      throw error;
    }
  }

  /**
   * محاسبه ماتریس نقاط ضعف بر اساس تاریخچه
   */
  calculateWeaknessMatrix(concepts: string[], quizHistory: QuizHistoryEntry[]): WeaknessMatrix {
    const matrix: WeaknessMatrix = {};

    // مقداردهی اولیه
    concepts.forEach((concept) => {
      matrix[concept] = this._createEmptyMatrixEntry();
    });

    // پردازش تاریخچه
    if (!quizHistory || quizHistory.length === 0) {
      return matrix;
    }

    quizHistory.forEach((quiz) => {
      if (!quiz.questions || !quiz.results) return;

      quiz.questions.forEach((question, idx) => {
        const concept = question.concept || 'general';
        if (!matrix[concept]) {
          matrix[concept] = this._createEmptyMatrixEntry();
        }

        const entry = matrix[concept];
        const isCorrect = quiz.results[idx];
        const wasAnswered = quiz.answers && quiz.answers[idx] !== undefined;

        entry.totalAttempts++;

        if (!wasAnswered) {
          entry.unanswered++;
        } else if (isCorrect) {
          entry.correct++;
        } else {
          entry.wrong++;
        }

        // آمار بر اساس سطح سختی
        const difficulty = question.difficulty || DIFFICULTY_LEVELS.MEDIUM;
        if (entry.difficultyLevels[difficulty]) {
          entry.difficultyLevels[difficulty].total++;
          if (wasAnswered && isCorrect) {
            entry.difficultyLevels[difficulty].correct++;
          }
        }
      });
    });

    // محاسبه امتیاز ضعف
    Object.keys(matrix).forEach((concept) => {
        const entry = matrix[concept];
        if (entry && entry.totalAttempts > 0) {
        const successRate = entry.correct / entry.totalAttempts;
        entry.weaknessScore = (1 - successRate) * 100;

        if (entry.totalAttempts < 3) {
          entry.weaknessScore *= 0.5;
        }
      }
    });

    return matrix;
  }

  /**
   * تولید سوالات بر اساس ماتریس نقاط ضعف
   */
  generateFromWeakness(
    text: string,
    weaknessMatrix: WeaknessMatrix,
    options: GenerateOptions = {}
  ): QuizResult {
    return this.generate(text, {
      ...options,
      weaknessMatrix,
    });
  }

  /**
   * تحلیل نتیجه آزمون
   */
  analyzeResults(quiz: QuizResult, answers: unknown[]): AnalysisResult {
    const analysis: AnalysisResult = {
      totalQuestions: quiz.questions.length,
      correct: 0,
      wrong: 0,
      unanswered: 0,
      score: 0,
      percentage: 0,
      timeSpent: 0,
      byType: {},
      byDifficulty: {},
      byConcept: {},
      recommendations: [],
    };

    quiz.questions.forEach((question, idx) => {
      const userAnswer = answers[idx];
      const isAnswered = userAnswer !== undefined && userAnswer !== null;
      const isCorrect = this._checkAnswer(question, userAnswer);

      if (!isAnswered) {
        analysis.unanswered++;
      } else if (isCorrect) {
        analysis.correct++;
      } else {
        analysis.wrong++;
      }

      // تحلیل بر اساس نوع
      const type = question.type;
      if (!analysis.byType[type]) {
        analysis.byType[type] = { total: 0, correct: 0 };
      }
      analysis.byType[type].total++;
      if (isAnswered && isCorrect) {
        analysis.byType[type].correct++;
      }

      // تحلیل بر اساس سختی
      const diff = question.difficulty || DIFFICULTY_LEVELS.MEDIUM;
      if (!analysis.byDifficulty[diff]) {
        analysis.byDifficulty[diff] = { total: 0, correct: 0 };
      }
      analysis.byDifficulty[diff].total++;
      if (isAnswered && isCorrect) {
        analysis.byDifficulty[diff].correct++;
      }

      // تحلیل بر اساس مفهوم
      const concept = question.concept || 'general';
      if (!analysis.byConcept[concept]) {
        analysis.byConcept[concept] = { total: 0, correct: 0, wrong: [] };
      }
      analysis.byConcept[concept].total++;
      if (isAnswered && isCorrect) {
        analysis.byConcept[concept].correct++;
      } else if (isAnswered && !isCorrect) {
        analysis.byConcept[concept].wrong.push({
          question: question.question,
          userAnswer,
          correctAnswer: this._getCorrectAnswerText(question),
        });
      }
    });

    // محاسبه نمره
    analysis.score = analysis.correct;
    analysis.percentage = Math.round(
      (analysis.correct / analysis.totalQuestions) * 100
    );

    // تولید پیشنهادات
    analysis.recommendations = this._generateRecommendations(analysis);

    return analysis;
  }

  // ============================================================
  // متدهای خصوصی
  // ============================================================

  /**
   * استخراج کلیدواژه‌ها (موقت - بعداً با Summarizer.ts جایگزین می‌شود)
   * TODO: با Summarizer.extractKeywords جایگزین شود
   */
    /**
   * استخراج کلیدواژه‌ها (با استفاده از Summarizer)
   */
  private _extractKeywords(text: string, count: number): string[] {
    const summarizer = getSummarizer();
    return summarizer.extractKeywords(text, count);
  }

  /**
   * استخراج جملات از متن
   */
  private _extractSentences(text: string): string[] {
    const sentences = text
      .split(/(?<=[.!?؟])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20 && s.length < 300);

    return sentences;
  }

  /**
   * استخراج مفاهیم از متن
   */
  private _extractConcepts(text: string, keywords: string[]): string[] {
    const concepts = new Set<string>();

    const patterns = [
      /(?:مفهوم|تعریف|اصل|قانون|نظریه|قضیه)\s+[«"']?([^«»"'؟\n]+)[»"']?/g,
      /([^\s]+)\s+(?:عبارت است از|یعنی|به معنای|به مفهوم)/g,
      /(?:به|در)\s+([^\s]+)\s+(?:می‌گویند|گفته می‌شود)/g,
    ];

    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1] && match[1].length > 2 && match[1].length < 50) {
          concepts.add(match[1].trim());
        }
      }
    });

    keywords.slice(0, 10).forEach((kw) => {
      if (kw.length > 3) concepts.add(kw);
    });

    return Array.from(concepts).slice(0, 15);
  }

  /**
   * انتخاب جملات بر اساس نقاط ضعف
   */
  private _selectByWeakness(
    sentences: string[],
    matrix: WeaknessMatrix,
    count: number
  ): string[] {
    const sortedConcepts = Object.entries(matrix)
      .filter(([_, data]) => data.totalAttempts >= 2)
      .sort((a, b) => b[1].weaknessScore - a[1].weaknessScore)
      .map(([concept]) => concept);

    const scored = sentences.map((sentence) => {
      let score = 0;

      sortedConcepts.forEach((concept, idx) => {
        if (sentence.includes(concept)) {
          score += (sortedConcepts.length - idx) * 2;
        }
      });

      const words = sentence.split(/\s+/);
      if (words.length >= 8 && words.length <= 25) score += 3;

      return { sentence, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, count * 2)
      .map((s) => s.sentence);
  }

  /**
   * انتخاب تصادفی جملات با کیفیت
   */
  private _selectSentences(
    sentences: string[],
    keywords: string[],
    count: number
  ): string[] {
    const scored = sentences.map((sentence) => {
      let score = 0;

      const keywordCount = keywords.filter((kw) => sentence.includes(kw)).length;
      score += keywordCount * 2;

      const words = sentence.split(/\s+/);
      if (words.length >= 8 && words.length <= 25) score += 3;

      return { sentence, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, count * 2)
      .map((s) => s.sentence);
  }

  /**
   * پیدا کردن جمله مناسب برای نوع سوال
   */
  private _findSuitableSentence(
    sentences: string[],
    used: Set<string>,
    type: QuestionType,
    keywords: string[]
  ): number {
    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        if (!sentence) continue;
        if (used.has(sentence)) continue;

      const words = sentence.split(/\s+/).filter((w) => w.length >= 3);

      if (type === 'fill') {
        const hasKeyword = keywords.some((kw) => sentence.includes(kw));
        if (hasKeyword && words.length >= 6) return i;
      } else if (type === 'mc') {
        if (words.length >= 5) return i;
      } else if (type === 'tf') {
        if (words.length >= 5) return i;
      }
    }
    return -1;
  }

  /**
   * تولید یک سوال
   */
  private _generateQuestion(
    sentence: string,
    type: QuestionType,
    keywords: string[],
    concepts: string[],
    forExam: boolean
  ): Question | null {
    try {
      switch (type) {
        case QUESTION_TYPES.MULTIPLE_CHOICE:
          return this._generateMCQuestion(sentence, keywords, concepts, forExam);
        case QUESTION_TYPES.FILL_BLANK:
          return this._generateFillQuestion(sentence, keywords, forExam);
        case QUESTION_TYPES.TRUE_FALSE:
          return this._generateTFQuestion(sentence, keywords, forExam);
        default:
          return null;
      }
    } catch (error) {
      logger.warn('خطا در تولید سوال', { type, error });
      return null;
    }
  }

  /**
   * تولید سوال چندگزینه‌ای
   */
  private _generateMCQuestion(
    sentence: string,
    keywords: string[],
    concepts: string[],
    forExam: boolean
  ): Question | null {
    const sentenceWords = sentence.split(/\s+/).filter((w) => w.length >= 3);
    const targetWord =
      sentenceWords.find((w) => keywords.includes(w)) || sentenceWords[0];

    if (!targetWord) return null;

    const questionText = sentence.replace(targetWord, '______');
    const distractors = this._generateDistractors(targetWord, keywords, 3);

    if (distractors.length < 3) return null;

    const options = this._shuffle([targetWord, ...distractors]);
    const correctIndex = options.indexOf(targetWord);
    const difficulty = this._calculateDifficulty(sentence, keywords, forExam);
    const concept = concepts.find((c) => sentence.includes(c)) || 'general';

    return {
      id: this._generateId(),
      type: QUESTION_TYPES.MULTIPLE_CHOICE,
      question: questionText,
      options,
      correctIndex,
      answer: targetWord,
      explanation: `پاسخ صحیح "${targetWord}" است. این کلمه در زمینه جمله، مناسب‌ترین گزینه برای تکمیل مفهوم است.`,
      difficulty,
      concept,
      source: sentence,
    };
  }

  /**
   * تولید سوال جاخالی
   */
  private _generateFillQuestion(
    sentence: string,
    keywords: string[],
    _forExam: boolean
  ): Question | null {
    const sentenceWords = sentence.split(/\s+/).filter((w) => w.length >= 3);
    const targetWord =
      sentenceWords.find((w) => keywords.includes(w)) || sentenceWords[0];

    if (!targetWord) return null;

    const questionText = sentence.replace(targetWord, '______');
    const difficulty = this._calculateDifficulty(sentence, keywords, _forExam);

    return {
      id: this._generateId(),
      type: QUESTION_TYPES.FILL_BLANK,
      question: questionText,
      answer: targetWord,
      acceptableAnswers: this._generateAcceptableAnswers(targetWord),
      explanation: `پاسخ صحیح "${targetWord}" است.`,
      difficulty,
      concept: 'general',
      source: sentence,
    };
  }

  /**
   * تولید سوال درست/غلط
   */
  private _generateTFQuestion(
    sentence: string,
    keywords: string[],
    _forExam: boolean
  ): Question | null {
    const isTrue = Math.random() > 0.5;
    let questionText = sentence;
    const modifications: string[] = [];

    if (!isTrue) {
      const sentenceWords = sentence.split(/\s+/).filter((w) => w.length >= 3);
      const targetWord = sentenceWords.find((w) => keywords.includes(w));

      if (targetWord) {
        const replacement = keywords.find(
          (kw) => kw !== targetWord && !sentence.includes(kw)
        );
        if (replacement) {
          questionText = sentence.replace(targetWord, replacement);
          modifications.push(`جایگزینی "${targetWord}" با "${replacement}"`);
        }
      }
    }

    const difficulty = this._calculateDifficulty(sentence, keywords, _forExam);

    return {
      id: this._generateId(),
      type: QUESTION_TYPES.TRUE_FALSE,
      question: questionText,
      options: ['صحیح', 'غلط'],
      correctIndex: isTrue ? 0 : 1,
      answer: isTrue ? 'صحیح' : 'غلط',
      explanation: isTrue
        ? 'این جمله صحیح است.'
        : `این جمله نادرست است. ${modifications[0] || 'اطلاعات ارائه شده صحیح نیست.'}`,
      difficulty,
      concept: 'general',
      source: sentence,
    };
  }

  /**
   * تولید گزینه‌های غلط (distractors)
   */
  private _generateDistractors(
    correctAnswer: string,
    keywords: string[],
    count: number
  ): string[] {
    const distractors = new Set<string>();
    const correctWords = correctAnswer.split(/\s+/);

    keywords.forEach((kw) => {
      if (kw !== correctAnswer && !correctWords.includes(kw)) {
        distractors.add(kw);
      }
    });

    if (distractors.size < count) {
      const similarWords = this._getSimilarWords(correctAnswer);
      similarWords.forEach((w) => distractors.add(w));
    }

    return Array.from(distractors).slice(0, count);
  }

  /**
   * دریافت کلمات شبیه
   */
  private _getSimilarWords(word: string): string[] {
    const educationalWords = [
      'مفهوم', 'تعریف', 'اصل', 'قانون', 'نظریه', 'فرمول',
      'ویژگی', 'خاصیت', 'عملکرد', 'ساختار', 'نقش', 'اهمیت',
      'روش', 'فرآیند', 'مرحله', 'عامل', 'نتیجه', 'تأثیر',
      'علت', 'دلیل', 'شرط', 'محدودیت', 'مزیت', 'کاربرد',
    ];
    return educationalWords.filter((w) => w !== word).slice(0, 10);
  }

  /**
   * تولید پاسخ‌های قابل قبول (برای جاخالی)
   */
  private _generateAcceptableAnswers(answer: string): string[] {
    const acceptable = [answer];
    acceptable.push(answer.replace(/\s+/g, ' ').trim());
    acceptable.push(answer.replace(/[\u064B-\u0652]/g, ''));
    return [...new Set(acceptable)];
  }

  /**
   * محاسبه سطح سختی
   */
  private _calculateDifficulty(
    sentence: string,
    keywords: string[],
    _forExam: boolean
  ): DifficultyLevel {
    let score: number = DIFFICULTY_LEVELS.MEDIUM;

    const words = sentence.split(/\s+/);
    if (words.length > 20) score++;
    if (words.length < 8) score--;

    const keywordCount = keywords.filter((kw) => sentence.includes(kw)).length;
    if (keywordCount > 3) score++;

    const complexityWords = [
      'بنابراین', 'در نتیجه', 'با این حال', 'اگرچه', 'زیرا', 'چرا که',
    ];
    if (complexityWords.some((w) => sentence.includes(w))) score++;

    return Math.max(
      DIFFICULTY_LEVELS.EASY,
      Math.min(DIFFICULTY_LEVELS.VERY_HARD, score)
    ) as DifficultyLevel;
  }

  /**
   * بررسی پاسخ کاربر
   */
  private _checkAnswer(question: Question, userAnswer: unknown): boolean {
    if (userAnswer === undefined || userAnswer === null) return false;

    switch (question.type) {
      case QUESTION_TYPES.MULTIPLE_CHOICE:
      case QUESTION_TYPES.TRUE_FALSE:
        return userAnswer === question.correctIndex;
      case QUESTION_TYPES.FILL_BLANK: {
        const normalized = String(userAnswer).trim().toLowerCase();
        return (question.acceptableAnswers || []).some(
          (ans) =>
            ans.toLowerCase() === normalized ||
            ans.replace(/\s+/g, '') === normalized.replace(/\s+/g, '')
        );
      }
      default:
        return false;
    }
  }

  /**
   * دریافت متن پاسخ صحیح
   */
  private _getCorrectAnswerText(question: Question): string {
    if (question.options && question.correctIndex !== undefined) {
      return question.options[question.correctIndex] ?? question.answer;
    }
    return question.answer;
  }

  /**
   * تولید پیشنهادات بر اساس تحلیل
   */
  private _generateRecommendations(analysis: AnalysisResult): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (analysis.percentage < 50) {
      recommendations.push({
        type: 'critical',
        icon: '🔴',
        message:
          'نیاز به مطالعه مجدد مباحث دارید. پیشنهاد می‌شود از خلاصه‌ساز برای مرور استفاده کنید.',
      });
    } else if (analysis.percentage < 70) {
      recommendations.push({
        type: 'warning',
        icon: '🟡',
        message:
          'عملکرد قابل قبول اما نیاز به بهبود دارد. روی مفاهیم ضعیف تمرکز کنید.',
      });
    } else if (analysis.percentage >= 90) {
      recommendations.push({
        type: 'success',
        icon: '🟢',
        message: 'عالی! تسلط خوبی بر مباحث دارید.',
      });
    }

    // پیشنهاد بر اساس نوع سوال ضعیف
    const typeNames: Record<string, string> = {
      mc: 'چندگزینه‌ای',
      fill: 'جاخالی',
      tf: 'درست/غلط',
    };

    Object.entries(analysis.byType).forEach(([type, data]) => {
      if (data.total >= 2 && data.correct / data.total < 0.5) {
        recommendations.push({
          type: 'info',
          icon: 'ℹ️',
          message: `در سوالات ${typeNames[type] || type} ضعف دارید. تمرین بیشتری نیاز است.`,
        });
      }
    });

    // پیشنهاد بر اساس مفاهیم ضعیف
    const weakConcepts = Object.entries(analysis.byConcept)
      .filter(([_, data]) => data.total >= 2 && data.correct / data.total < 0.5)
      .map(([concept]) => concept);

    if (weakConcepts.length > 0) {
      recommendations.push({
        type: 'action',
        icon: '🎯',
        message: `مفاهیم ضعیف: ${weakConcepts.slice(0, 3).join('، ')}. روی این موارد بیشتر تمرکز کنید.`,
        weakConcepts,
      });
    }

    return recommendations;
  }

  /**
   * ایجاد ورودی ماتریس خالی
   */
  private _createEmptyMatrixEntry(): WeaknessEntry {
    return {
      correct: 0,
      wrong: 0,
      unanswered: 0,
      totalAttempts: 0,
      weaknessScore: 0,
      difficultyLevels: {
        [DIFFICULTY_LEVELS.EASY]: { correct: 0, total: 0 },
        [DIFFICULTY_LEVELS.MEDIUM]: { correct: 0, total: 0 },
        [DIFFICULTY_LEVELS.HARD]: { correct: 0, total: 0 },
        [DIFFICULTY_LEVELS.VERY_HARD]: { correct: 0, total: 0 },
      },
    };
  }

  /**
   * تولید شناسه یکتا
   */
  private _generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /**
   * Shuffle آرایه
   */
  private _shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i] as T;
      arr[i] = arr[j] as T;
      arr[j] = temp;
    }
    return arr;
  }
}

// ============================================================
// Singleton
// ============================================================

let quizGeneratorInstance: QuizGenerator | null = null;

/**
 * دریافت نمونه singleton از QuizGenerator
 */
export function getQuizGenerator(): QuizGenerator {
  if (!quizGeneratorInstance) {
    quizGeneratorInstance = new QuizGenerator();
  }
  return quizGeneratorInstance;
}

/**
 * ریست کردن نمونه singleton (فقط برای تست)
 */
export function resetQuizGenerator(): void {
  quizGeneratorInstance = null;
}

/**
 * Export پیش‌فرض
 */
export default getQuizGenerator();