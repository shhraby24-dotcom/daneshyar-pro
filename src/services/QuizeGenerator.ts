/**
 * دانش‌یار پرو - تولید آزمون آفلاین (خودکفا، بدون وابستگی به Summarizer)
 * @module services/QuizGenerator
 */
import { getInstance as getLogger } from '@/core/Logger';

const logger = getLogger().module('QuizGenerator');

export type QuestionType = 'mc' | 'fill' | 'tf';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctIndex?: number;
  answer?: string;
  acceptableAnswers?: string[];
  explanation?: string;
  difficulty: number;
  concept: string;
  source?: string;
}

export interface GenerateOptions {
  count?: number;
  types?: QuestionType[];
  forExam?: boolean;
}

const STOPWORDS = new Set([
  'و','در','به','از','که','این','آن','است','با','بر','را','هم','یا','تا','برای','هر','یک','دو',
  'ما','شما','آنها','او','من','تو','بود','شد','می','نمی','نه','بله','خیر','اگر','پس','چون',
  'زیرا','بنابراین','همچنین','مانند','بین','بعد','قبل','روی','زیر','بالای','داخل','خارج',
  'همه','هیچ','کسی','چیزی','آنچه','یعنی','عبارت','معنا','معنای','دهد','می‌شود','شود','است',
]);

export class QuizGeneratorService {
  generate(text: string, options: GenerateOptions = {}): { questions: QuizQuestion[] } {
    const { count = 10, types = ['mc', 'fill', 'tf'], forExam = false } = options;
    const keywords = this.extractKeywords(text, 25);
    const sentences = this.extractSentences(text);
    if (sentences.length < 5) throw new Error('متن برای تولید سوال کافی نیست (حداقل ۵ جمله)');

    const questions: QuizQuestion[] = [];
    const used = new Set<string>();
    for (let i = 0; i < count && questions.length < count; i++) {
      const type = types[i % types.length] ?? 'mc';
      const sentence = this.pickSentence(sentences, used, keywords);
      if (!sentence) continue;
      used.add(sentence);
      const q = this.buildQuestion(sentence, type, keywords, forExam);
      if (q) questions.push(q);
    }
    logger.info('آزمون آفلاین تولید شد', { count: questions.length });
    return { questions };
  }

  extractKeywords(text: string, limit: number): string[] {
    const freq = new Map<string, number>();
    const words = text.split(/\s+/).map((w) => w.replace(/[^\u0600-\u06FFa-zA-Z0-9]/g, '')).filter((w) => w.length >= 3);
    for (const w of words) {
      if (STOPWORDS.has(w)) continue;
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
    return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([w]) => w);
  }

  private extractSentences(text: string): string[] {
    return text.split(/(?<=[.!?؟])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 20 && s.length < 300);
  }

  private pickSentence(sentences: string[], used: Set<string>, keywords: string[]): string | null {
    let best: string | null = null; let bestScore = -1;
    for (const s of sentences) {
      if (used.has(s)) continue;
      const score = keywords.filter((k) => s.includes(k)).length * 2 +
        (s.split(/\s+/).length >= 8 && s.split(/\s+/).length <= 25 ? 3 : 0);
      if (score > bestScore) { bestScore = score; best = s; }
    }
    return best;
  }

  private buildQuestion(sentence: string, type: QuestionType, keywords: string[], forExam: boolean): QuizQuestion | null {
    const words = sentence.split(/\s+/).filter((w) => w.length >= 3);
    const target = words.find((w) => keywords.includes(w)) ?? words[0];
    if (!target) return null;
    const difficulty = this.calcDifficulty(sentence, keywords, forExam);
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    if (type === 'fill') {
      return { id, type, question: sentence.replace(target, '______'), answer: target,
        acceptableAnswers: [target, target.replace(/\s+/g, ' ').trim()], explanation: `پاسخ صحیح «${target}» است.`, difficulty, concept: 'general', source: sentence };
    }
    if (type === 'tf') {
      const isTrue = Math.random() > 0.5;
      let q = sentence;
      if (!isTrue) {
        const rep = keywords.find((k) => k !== target && !sentence.includes(k));
        if (rep) q = sentence.replace(target, rep);
      }
      return { id, type, question: q, options: ['صحیح', 'غلط'], correctIndex: isTrue ? 0 : 1, answer: isTrue ? 'صحیح' : 'غلط',
        explanation: isTrue ? 'این جمله صحیح است.' : 'این جمله نادرست است.', difficulty, concept: 'general', source: sentence };
    }
    // mc
    const distractors = keywords.filter((k) => k !== target && !sentence.includes(k)).slice(0, 3);
    if (distractors.length < 3) return null;
    const options = this.shuffle([target, ...distractors]);
    return { id, type, question: sentence.replace(target, '______'), options, correctIndex: options.indexOf(target),
      answer: target, explanation: `پاسخ صحیح «${target}» است.`, difficulty, concept: 'general', source: sentence };
  }

  private calcDifficulty(sentence: string, keywords: string[], forExam: boolean): number {
    let score = 2;
    const wc = sentence.split(/\s+/).length;
    if (wc > 20) score++;
    if (wc < 8) score--;
    if (keywords.filter((k) => sentence.includes(k)).length > 3) score++;
    if (forExam) score++;
    return Math.max(1, Math.min(4, score));
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
    return a;
  }
}

let instance: QuizGeneratorService | null = null;
export function getQuizGenerator(): QuizGeneratorService {
  if (!instance) instance = new QuizGeneratorService();
  return instance;
}
export default getQuizGenerator();