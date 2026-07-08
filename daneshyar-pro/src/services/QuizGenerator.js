/**
 * دانش‌یار پرو - سرویس تولید آزمون هوشمند آفلاین
 * تولید سوالات متنوع با تحلیل نقاط ضعف و الگوریتم‌های NLP
 * @module services/QuizGenerator
 */

import LoggerModule from '../core/Logger.js';
import summarizer from './Summarizer.js';

const logger = LoggerModule.getInstance().module('QuizGenerator');

/**
 * انواع سوالات پشتیبانی شده
 */
export const QUESTION_TYPES = {
  MULTIPLE_CHOICE: 'mc',
  FILL_BLANK: 'fill',
  TRUE_FALSE: 'tf',
  MATCHING: 'match',
  ORDERING: 'order',
  SHORT_ANSWER: 'short'
};

/**
 * سطوح سختی سوال
 */
export const DIFFICULTY_LEVELS = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
  VERY_HARD: 4
};

/**
 * الگوهای سوال برای انواع مختلف
 */
const QUESTION_TEMPLATES = {
  mc: [
    'کدام گزینه در مورد "{keyword}" صحیح است؟',
    '{keyword} به چه معناست؟',
    'مهم‌ترین ویژگی {keyword} کدام است؟',
    'در مورد {keyword} کدام مورد نادرست است؟'
  ],
  fill: [
    'جای خالی را پر کنید: "{sentence}"',
    'کلمه مناسب برای تکمیل جمله: "{sentence}"'
  ],
  tf: [
    'آیا این جمله صحیح است؟ "{sentence}"',
    'درست یا غلط: "{sentence}"'
  ]
};

/**
 * کلاس اصلی QuizGenerator
 */
class QuizGenerator {
  constructor() {
    logger.debug('QuizGenerator initialized');
  }

  /**
   * تولید آزمون از متن
   * @param {string} text - متن اصلی
   * @param {Object} options - تنظیمات
   * @param {number} [options.count=10] - تعداد سوالات
   * @param {Array<string>} [options.types] - انواع سوالات
   * @param {boolean} [options.forExam=false] - برای کنکور؟
   * @param {Object} [options.weaknessMatrix] - ماتریس نقاط ضعف
   * @returns {Object} آزمون تولید شده
   */
  generate(text, options = {}) {
    const {
      count = 10,
      types = ['mc', 'fill', 'tf'],
      forExam = false,
      weaknessMatrix = null
    } = options;

    logger.time('generate-quiz');

    try {
      // استخراج اطلاعات از متن
      const keywords = summarizer.extractKeywords(text, 25);
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
      const questions = [];
      const usedSentences = new Set();

      for (let i = 0; i < count && selectedSentences.length > 0; i++) {
        // انتخاب نوع سوال (دوری)
        const type = types[i % types.length];

        // پیدا کردن جمله مناسب
        const sentenceIndex = this._findSuitableSentence(
          selectedSentences, 
          usedSentences, 
          type, 
          keywords
        );

        if (sentenceIndex === -1) continue;

        const sentence = selectedSentences[sentenceIndex];
        usedSentences.add(sentence);

        // تولید سوال
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
          totalSentences: sentences.length
        }
      };
    } catch (error) {
      logger.error('خطا در تولید آزمون', error);
      throw error;
    }
  }

  /**
   * محاسبه ماتریس نقاط ضعف بر اساس تاریخچه
   * @param {Array<string>} concepts - مفاهیم موجود
   * @param {Array} quizHistory - تاریخچه آزمون‌ها
   * @returns {Object} ماتریس نقاط ضعف
   */
  calculateWeaknessMatrix(concepts, quizHistory) {
    const matrix = {};

    // مقداردهی اولیه
    concepts.forEach(concept => {
      matrix[concept] = {
        correct: 0,
        wrong: 0,
        unanswered: 0,
        totalAttempts: 0,
        weaknessScore: 0,
        difficultyLevels: {
          [DIFFICULTY_LEVELS.EASY]: { correct: 0, total: 0 },
          [DIFFICULTY_LEVELS.MEDIUM]: { correct: 0, total: 0 },
          [DIFFICULTY_LEVELS.HARD]: { correct: 0, total: 0 },
          [DIFFICULTY_LEVELS.VERY_HARD]: { correct: 0, total: 0 }
        }
      };
    });

    // پردازش تاریخچه
    if (!quizHistory || quizHistory.length === 0) {
      return matrix;
    }

    quizHistory.forEach(quiz => {
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
    Object.keys(matrix).forEach(concept => {
      const entry = matrix[concept];
      if (entry.totalAttempts > 0) {
        const successRate = entry.correct / entry.totalAttempts;
        // امتیاز ضعف: هرچه نرخ موفقیت کمتر، ضعف بیشتر
        entry.weaknessScore = (1 - successRate) * 100;
        
        // ضریب برای تعداد تلاش‌ها
        if (entry.totalAttempts < 3) {
          entry.weaknessScore *= 0.5; // اعتماد کم
        }
      }
    });

    return matrix;
  }

  /**
   * تولید سوالات بر اساس ماتریس نقاط ضعف
   * @param {string} text
   * @param {Object} weaknessMatrix
   * @param {Object} options
   * @returns {Object}
   */
  generateFromWeakness(text, weaknessMatrix, options = {}) {
    return this.generate(text, {
      ...options,
      weaknessMatrix
    });
  }

  /**
   * تحلیل نتیجه آزمون
   * @param {Object} quiz - آزمون
   * @param {Object} answers - پاسخ‌های کاربر
   * @returns {Object} تحلیل
   */
  analyzeResults(quiz, answers) {
    const analysis = {
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
      recommendations: []
    };

    // تحلیل هر سوال
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
          correctAnswer: this._getCorrectAnswerText(question)
        });
      }
    });

    // محاسبه نمره
    const answered = analysis.correct + analysis.wrong;
    analysis.score = analysis.correct;
    analysis.percentage = Math.round((analysis.correct / analysis.totalQuestions) * 100);

    // تولید پیشنهادات
    analysis.recommendations = this._generateRecommendations(analysis);

    return analysis;
  }

  // ============================================================
  // متدهای خصوصی
  // ============================================================

  /**
   * استخراج جملات از متن
   * @private
   */
  _extractSentences(text) {
    const sentences = text
      .split(/(?<=[.!?؟])\s+|\n+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 300);

    return sentences;
  }

  /**
   * استخراج مفاهیم از متن
   * @private
   */
  _extractConcepts(text, keywords) {
    const concepts = new Set();

    // الگوهای شناسایی مفاهیم
    const patterns = [
      /(?:مفهوم|تعریف|اصل|قانون|نظریه|قضیه)\s+[«"']?([^«»"'؟\n]+)[»"']?/g,
      /([^\s]+)\s+(?:عبارت است از|یعنی|به معنای|به مفهوم)/g,
      /(?:به|در)\s+([^\s]+)\s+(?:می‌گویند|گفته می‌شود)/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1] && match[1].length > 2 && match[1].length < 50) {
          concepts.add(match[1].trim());
        }
      }
    });

    // اضافه کردن کلیدواژه‌های مهم
    keywords.slice(0, 10).forEach(kw => {
      if (kw.length > 3) concepts.add(kw);
    });

    return Array.from(concepts).slice(0, 15);
  }

  /**
   * انتخاب جملات بر اساس نقاط ضعف
   * @private
   */
  _selectByWeakness(sentences, matrix, count) {
    // مرتب‌سازی مفاهیم بر اساس weakness score
    const sortedConcepts = Object.entries(matrix)
      .filter(([_, data]) => data.totalAttempts >= 2)
      .sort((a, b) => b[1].weaknessScore - a[1].weaknessScore)
      .map(([concept]) => concept);

    // امتیازدهی به جملات
    const scored = sentences.map(sentence => {
      let score = 0;

      // تطابق با مفاهیم ضعیف
      sortedConcepts.forEach((concept, idx) => {
        if (sentence.includes(concept)) {
          score += (sortedConcepts.length - idx) * 2;
        }
      });

      // طول مناسب
      const words = sentence.split(/\s+/);
      if (words.length >= 8 && words.length <= 25) score += 3;

      return { sentence, score };
    });

    // انتخاب top
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, count * 2)
      .map(s => s.sentence);
  }

  /**
   * انتخاب تصادفی جملات با کیفیت
   * @private
   */
  _selectSentences(sentences, keywords, count) {
    const scored = sentences.map(sentence => {
      let score = 0;

      // تعداد کلیدواژه‌ها
      const keywordCount = keywords.filter(kw => sentence.includes(kw)).length;
      score += keywordCount * 2;

      // طول مناسب
      const words = sentence.split(/\s+/);
      if (words.length >= 8 && words.length <= 25) score += 3;

      return { sentence, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, count * 2)
      .map(s => s.sentence);
  }

  /**
   * پیدا کردن جمله مناسب برای نوع سوال
   * @private
   */
  _findSuitableSentence(sentences, used, type, keywords) {
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (used.has(sentence)) continue;

      const words = sentence.split(/\s+/).filter(w => w.length >= 3);

      // بررسی مناسب بودن برای نوع سوال
      if (type === 'fill') {
        const hasKeyword = keywords.some(kw => sentence.includes(kw));
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
   * @private
   */
  _generateQuestion(sentence, type, keywords, concepts, forExam) {
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
   * @private
   */
  _generateMCQuestion(sentence, keywords, concepts, forExam) {
    // پیدا کردن کلمه کلیدی در جمله
    const sentenceWords = sentence.split(/\s+/).filter(w => w.length >= 3);
    const targetWord = sentenceWords.find(w => keywords.includes(w)) || sentenceWords[0];

    if (!targetWord) return null;

    // ساخت جمله با جای خالی
    const questionText = sentence.replace(targetWord, '______');

    // تولید distractor ها
    const distractors = this._generateDistractors(targetWord, keywords, 3);
    if (distractors.length < 3) return null;

    // ساخت گزینه‌ها
    const options = this._shuffle([targetWord, ...distractors]);
    const correctIndex = options.indexOf(targetWord);

    // تعیین سطح سختی
    const difficulty = this._calculateDifficulty(sentence, keywords, forExam);

    // شناسایی مفهوم
    const concept = concepts.find(c => sentence.includes(c)) || 'general';

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
      source: sentence
    };
  }

  /**
   * تولید سوال جاخالی
   * @private
   */
  _generateFillQuestion(sentence, keywords, forExam) {
    const sentenceWords = sentence.split(/\s+/).filter(w => w.length >= 3);
    const targetWord = sentenceWords.find(w => keywords.includes(w)) || sentenceWords[0];

    if (!targetWord) return null;

    const questionText = sentence.replace(targetWord, '______');
    const difficulty = this._calculateDifficulty(sentence, keywords, forExam);
    const concept = 'general';

    return {
      id: this._generateId(),
      type: QUESTION_TYPES.FILL_BLANK,
      question: questionText,
      answer: targetWord,
      acceptableAnswers: this._generateAcceptableAnswers(targetWord),
      explanation: `پاسخ صحیح "${targetWord}" است.`,
      difficulty,
      concept,
      source: sentence
    };
  }

  /**
   * تولید سوال درست/غلط
   * @private
   */
  _generateTFQuestion(sentence, keywords, forExam) {
    const isTrue = Math.random() > 0.5;
    let questionText = sentence;
    const modifications = [];

    // اگر قرار است غلط باشد، جمله را تغییر بده
    if (!isTrue) {
      const sentenceWords = sentence.split(/\s+/).filter(w => w.length >= 3);
      const targetWord = sentenceWords.find(w => keywords.includes(w));

      if (targetWord) {
        const replacement = keywords.find(kw => kw !== targetWord && !sentence.includes(kw));
        if (replacement) {
          questionText = sentence.replace(targetWord, replacement);
          modifications.push(`جایگزینی "${targetWord}" با "${replacement}"`);
        }
      }
    }

    const difficulty = this._calculateDifficulty(sentence, keywords, forExam);

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
      source: sentence
    };
  }

  /**
   * تولید گزینه‌های غلط (distractors)
   * @private
   */
  _generateDistractors(correctAnswer, keywords, count) {
    const distractors = new Set();
    const correctWords = correctAnswer.split(/\s+/);

    // از کلیدواژه‌های دیگر
    keywords.forEach(kw => {
      if (kw !== correctAnswer && !correctWords.includes(kw)) {
        distractors.add(kw);
      }
    });

    // اگر کافی نبود، از کلمات شبیه استفاده کن
    if (distractors.size < count) {
      const similarWords = this._getSimilarWords(correctAnswer);
      similarWords.forEach(w => distractors.add(w));
    }

    return Array.from(distractors).slice(0, count);
  }

  /**
   * دریافت کلمات شبیه (simplified)
   * @private
   */
  _getSimilarWords(word) {
    // لیست ساده از کلمات پرکاربرد آموزشی
    const educationalWords = [
      'مفهوم', 'تعریف', 'اصل', 'قانون', 'نظریه', 'فرمول',
      'ویژگی', 'خاصیت', 'عملکرد', 'ساختار', 'نقش', 'اهمیت',
      'روش', 'فرآیند', 'مرحله', 'عامل', 'نتیجه', 'تأثیر',
      'علت', 'دلیل', 'شرط', 'محدودیت', 'مزیت', 'کاربرد'
    ];

    return educationalWords.filter(w => w !== word).slice(0, 10);
  }

  /**
   * تولید پاسخ‌های قابل قبول (برای جاخالی)
   * @private
   */
  _generateAcceptableAnswers(answer) {
    const acceptable = [answer];

    // حذف فاصله‌های اضافی
    acceptable.push(answer.replace(/\s+/g, ' ').trim());

    // حالت بدون اعراب
    acceptable.push(answer.replace(/[\u064B-\u0652]/g, ''));

    return [...new Set(acceptable)];
  }

  /**
   * محاسبه سطح سختی
   * @private
   */
  _calculateDifficulty(sentence, keywords, forExam) {
    let score = DIFFICULTY_LEVELS.MEDIUM;
    const words = sentence.split(/\s+/);

    // طول جمله
    if (words.length > 20) score++;
    if (words.length < 8) score--;

    // تعداد کلیدواژه‌ها
    const keywordCount = keywords.filter(kw => sentence.includes(kw)).length;
    if (keywordCount > 3) score++;

    // پیچیدگی مفهومی
    const complexityWords = ['بنابراین', 'در نتیجه', 'با این حال', 'اگرچه', 'زیرا', 'چرا که'];
    if (complexityWords.some(w => sentence.includes(w))) score++;

    // محدود کردن
    return Math.max(DIFFICULTY_LEVELS.EASY, Math.min(DIFFICULTY_LEVELS.VERY_HARD, score));
  }

  /**
   * بررسی پاسخ کاربر
   * @private
   */
  _checkAnswer(question, userAnswer) {
    if (userAnswer === undefined || userAnswer === null) return false;

    switch (question.type) {
      case QUESTION_TYPES.MULTIPLE_CHOICE:
      case QUESTION_TYPES.TRUE_FALSE:
        return userAnswer === question.correctIndex;

      case QUESTION_TYPES.FILL_BLANK:
        const normalized = String(userAnswer).trim().toLowerCase();
        return question.acceptableAnswers.some(ans =>
          ans.toLowerCase() === normalized ||
          ans.replace(/\s+/g, '') === normalized.replace(/\s+/g, '')
        );

      default:
        return false;
    }
  }

  /**
   * دریافت متن پاسخ صحیح
   * @private
   */
  _getCorrectAnswerText(question) {
    if (question.options && question.correctIndex !== undefined) {
      return question.options[question.correctIndex];
    }
    return question.answer;
  }

  /**
   * تولید پیشنهادات بر اساس تحلیل
   * @private
   */
  _generateRecommendations(analysis) {
    const recommendations = [];

    // پیشنهاد بر اساس درصد
    if (analysis.percentage < 50) {
      recommendations.push({
        type: 'critical',
        icon: '🔴',
        message: 'نیاز به مطالعه مجدد مباحث دارید. پیشنهاد می‌شود از خلاصه‌ساز برای مرور استفاده کنید.'
      });
    } else if (analysis.percentage < 70) {
      recommendations.push({
        type: 'warning',
        icon: '🟡',
        message: 'عملکرد قابل قبول اما نیاز به بهبود دارد. روی مفاهیم ضعیف تمرکز کنید.'
      });
    } else if (analysis.percentage >= 90) {
      recommendations.push({
        type: 'success',
        icon: '🟢',
        message: 'عالی! تسلط خوبی بر مباحث دارید.'
      });
    }

    // پیشنهاد بر اساس نوع سوال ضعیف
    Object.entries(analysis.byType).forEach(([type, data]) => {
      if (data.total >= 2 && (data.correct / data.total) < 0.5) {
        const typeNames = {
          'mc': 'چندگزینه‌ای',
          'fill': 'جاخالی',
          'tf': 'درست/غلط'
        };
        recommendations.push({
          type: 'info',
          icon: 'ℹ️',
          message: `در سوالات ${typeNames[type] || type} ضعف دارید. تمرین بیشتری نیاز است.`
        });
      }
    });

    // پیشنهاد بر اساس مفاهیم ضعیف
    const weakConcepts = Object.entries(analysis.byConcept)
      .filter(([_, data]) => data.total >= 2 && (data.correct / data.total) < 0.5)
      .map(([concept]) => concept);

    if (weakConcepts.length > 0) {
      recommendations.push({
        type: 'action',
        icon: '🎯',
        message: `مفاهیم ضعیف: ${weakConcepts.slice(0, 3).join('، ')}. روی این موارد بیشتر تمرکز کنید.`,
        weakConcepts
      });
    }

    return recommendations;
  }

  /**
   * ایجاد ورودی ماتریس خالی
   * @private
   */
  _createEmptyMatrixEntry() {
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
        [DIFFICULTY_LEVELS.VERY_HARD]: { correct: 0, total: 0 }
      }
    };
  }

  /**
   * تولید شناسه یکتا
   * @private
   */
  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /**
   * Shuffle آرایه
   * @private
   */
  _shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

// ============================================================
// Singleton
// ============================================================

let quizGeneratorInstance = null;

export function getQuizGenerator() {
  if (!quizGeneratorInstance) {
    quizGeneratorInstance = new QuizGenerator();
  }
  return quizGeneratorInstance;
}

export default getQuizGenerator();