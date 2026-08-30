/**
 * دانش‌یار پرو - سرویس AI با زنجیره Gemini → Groq → خطا
 * + مدیریت سهمیه (free / byok / premium)
 * @module services/AIQuizService
 */
import { getInstance as getLogger } from '@/core/Logger';
import { AI_CONFIG, AI_LIMITS, AI_KEYS_LS, AI_USAGE_LS, PREMIUM_LS, type AITier } from '@/config/ai';
import type { Question as QuizQuestion, QuestionType } from '@/services/QuizGenerator';
import { API_BASE } from '@/config/api';

const logger = getLogger().module('AIQuizService');

export interface AIResult { questions: QuizQuestion[]; engine: 'gemini' | 'groq'; }

function readUserKeys(): { gemini: string; groq: string } {
  try {
    const raw = localStorage.getItem(AI_KEYS_LS);
    if (raw) {
      const d = JSON.parse(raw) as { gemini?: string; groq?: string };
      return { gemini: d.gemini ?? '', groq: d.groq ?? '' };
    }
  } catch { /* ignore */ }
  return { gemini: '', groq: '' };
}

export function saveUserKeys(gemini: string, groq: string): void {
  try { localStorage.setItem(AI_KEYS_LS, JSON.stringify({ gemini, groq })); } catch { /* ignore */ }
}

export function getTier(): AITier {
  try { if (localStorage.getItem(PREMIUM_LS) === '1') return 'premium'; } catch { /* ignore */ }
  const k = readUserKeys();
  if (k.gemini || k.groq) return 'byok';
  return 'free';
}

function todayKey(): string { return new Date().toDateString(); }
function readUsage(): number {
  try {
    const raw = localStorage.getItem(AI_USAGE_LS);
    if (raw) { const u = JSON.parse(raw) as { date: string; count: number }; if (u.date === todayKey()) return u.count; }
  } catch { /* ignore */ }
  return 0;
}
function consumeQuota(): void {
  try { localStorage.setItem(AI_USAGE_LS, JSON.stringify({ date: todayKey(), count: readUsage() + 1 })); } catch { /* ignore */ }
}
export function getRemainingQuota(): number {
  return Math.max(0, AI_LIMITS[getTier()] - readUsage());
}

const PROMPT = (text: string, count: number, types: QuestionType[], forExam: boolean): string =>
  `تو یک معلم ایرانی هستی. از متن زیر دقیقاً ${count} سوال آموزشی به زبان فارسی بساز.
انواع مجاز: ${types.join(', ')} (mc=چندگزینه‌ای، fill=جاخالی، tf=درست/غلط).
${forExam ? 'سوالات سخت و کنکوری باشند.' : 'سوالات متعادل باشند.'}
خروجی را فقط به صورت یک آرایه JSON معتبر برگردان با این ساختار:
[{"type":"mc","question":"...","options":["a","b","c","d"],"correctIndex":0,"answer":"a","explanation":"...","difficulty":2,"concept":"..."}]
برای fill فیلد answer و acceptableAnswers بگذار. برای tf گزینه‌ها ["صحیح","غلط"].

متن:
${text.slice(0, 6000)}`;

function parseQuestions(raw: string): QuizQuestion[] {
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('خروجی JSON نامعتبر');
  const arr = JSON.parse(raw.slice(start, end + 1)) as Array<Record<string, unknown>>;
  const out: QuizQuestion[] = [];
  for (const item of arr) {
    const type = (item.type as QuestionType) ?? 'mc';
    if (!['mc', 'fill', 'tf'].includes(type)) continue;
    const q = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      type,
      question: String(item.question ?? ''),
      options: Array.isArray(item.options) ? (item.options as unknown[]).map(String) : undefined,
      correctIndex: typeof item.correctIndex === 'number' ? item.correctIndex : undefined,
      answer: item.answer ? String(item.answer) : undefined,
      acceptableAnswers: Array.isArray(item.acceptableAnswers) ? (item.acceptableAnswers as unknown[]).map(String) : undefined,
      explanation: item.explanation ? String(item.explanation) : undefined,
      difficulty: typeof item.difficulty === 'number' ? Math.max(1, Math.min(4, item.difficulty)) : 2,
      concept: item.concept ? String(item.concept) : 'general',
    };
    if (!q.question) continue;
    if ((type === 'mc' || type === 'tf') && (!q.options || q.correctIndex === undefined)) continue;
    if (type === 'fill' && !q.answer) continue;
    out.push(q as unknown as QuizQuestion);
  }
  if (out.length === 0) throw new Error('سوال معتبری پارس نشد');
  return out;
}

async function callGemini(key: string, prompt: string): Promise<QuizQuestion[]> {

  const res = await fetch(`${API_BASE.gemini}/${AI_CONFIG.GEMINI_MODEL}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) throw new Error('Gemini error ' + res.status);
  const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return parseQuestions(text);
}

async function callGroq(key: string, prompt: string): Promise<QuizQuestion[]> {
  const res = await fetch(`${API_BASE.groq}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: AI_CONFIG.GROQ_MODEL,
      messages: [
        { role: 'system', content: 'فقط JSON معتبر برگردان، بدون توضیح اضافه.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error('Groq error ' + res.status);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content ?? '';
  return parseQuestions(text);
}

export class AIQuizService {
  async generate(text: string, opts: { count: number; types: QuestionType[]; forExam: boolean }): Promise<AIResult> {
    const user = readUserKeys();
    const geminiKey = user.gemini || AI_CONFIG.DEV_GEMINI_KEY;
    const groqKey = user.groq || AI_CONFIG.DEV_GROQ_KEY;
    const prompt = PROMPT(text, opts.count, opts.types, opts.forExam);

    if (geminiKey) {
      try {
        const questions = await callGemini(geminiKey, prompt);
        consumeQuota();
        return { questions, engine: 'gemini' };
      } catch (e) { logger.warn('Gemini شکست، رفتن به Groq', e); }
    }
    if (groqKey) {
      try {
        const questions = await callGroq(groqKey, prompt);
        consumeQuota();
        return { questions, engine: 'groq' };
      } catch (e) { logger.warn('Groq شکست', e); }
    }
    throw new Error('AI در دسترس نیست');
  }
}

let instance: AIQuizService | null = null;
export function getAIQuizService(): AIQuizService {
  if (!instance) instance = new AIQuizService();
  return instance;
}