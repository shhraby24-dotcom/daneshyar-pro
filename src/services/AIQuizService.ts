/**
 * ============================================================
 * دانش‌یار پرو - سرویس آزمون AI با Edge Function (نسخه ۳.۱)
 * ============================================================
 * ✅ تک‌درخواستی: هر آزمون = ۱ درخواست = ۱ واحد سهمیه
 * ✅ سرعت واقعی سمت سرور (shard موازی) — کلاینت ساده می‌ماند
 * ✅ کش هوشمند روزانه (آزمون تکراری آنی)
 * ✅ لغو با AbortSignal + timeout کلاینت ۱۲۰ ثانیه
 * ✅ خطای کاربرپسند (friendlyAIError)
 * @module services/AIQuizService
 * @version 3.1.0
 */
import { getInstance as getLogger } from '@/core/Logger';
import type { Question as QuizQuestion, QuestionType } from '@/services/QuizGenerator';

const logger = getLogger().module('AIQuizService');

const EDGE_FUNCTION_URL = 'https://ueyuyyachmdjnbiteybp.supabase.co/functions/v1/ai-proxy';
const DEVICE_ID_KEY = 'daneshyar_device_id';
const AI_KEYS_LS = 'daneshyar_ai_keys';
const AI_USAGE_LS = 'daneshyar_ai_usage';
const PREMIUM_LS = 'daneshyar_premium';
const QUIZ_CACHE_LS = 'daneshyar_ai_quiz_cache';

/** سقف زمان کل یک آزمون در کلاینت */
export const AI_TIMEOUT_MS = 120_000;
const CACHE_MAX = 8;

export type AITier = 'free' | 'byok' | 'premium';

export interface AIResult {
  questions: QuizQuestion[];
  engine: 'edge-function' | 'cache';
  model: string;
  remaining: number;
  partial?: boolean;
}

export interface GenerateHooks {
  signal?: AbortSignal;
}

// ============================================================
// Device ID
// ============================================================
function getOrCreateDeviceId(): string {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return `device-${Date.now()}`;
  }
}

// ============================================================
// توابع سازگار با UI (بدون تغییر رفتار)
// ============================================================
export function getTier(): AITier {
  try {
    if (localStorage.getItem(PREMIUM_LS) === '1') return 'premium';
  } catch { /* ignore */ }
  try {
    const raw = localStorage.getItem(AI_KEYS_LS);
    if (raw) {
      const d = JSON.parse(raw) as { gemini?: string; groq?: string };
      if (d.gemini || d.groq) return 'byok';
    }
  } catch { /* ignore */ }
  return 'free';
}

export function getRemainingQuota(): number {
  const limits: Record<AITier, number> = { free: 3, byok: 20, premium: 100 };
  const tier = getTier();
  try {
    const raw = localStorage.getItem(AI_USAGE_LS);
    if (raw) {
      const u = JSON.parse(raw) as { date: string; count: number };
      const today = new Date().toDateString();
      if (u.date === today) return Math.max(0, limits[tier] - u.count);
    }
  } catch { /* ignore */ }
  return limits[tier];
}

export function saveUserKeys(gemini: string, groq: string): void {
  try {
    localStorage.setItem(AI_KEYS_LS, JSON.stringify({ gemini, groq }));
  } catch { /* ignore */ }
}

// ============================================================
// کش روزانه (آزمون تکراری = آنی، بدون مصرف سهمیه)
// ============================================================
function hashText(t: string): string {
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return String(h >>> 0);
}
function cacheKey(text: string, opts: { count: number; types: QuestionType[]; forExam: boolean }): string {
  return `${hashText(text.slice(0, 2000))}|${text.length}|${opts.count}|${opts.types.slice().sort().join('+')}|${opts.forExam ? 1 : 0}|${new Date().toDateString()}`;
}
function readCache(key: string): QuizQuestion[] | null {
  try {
    const raw = localStorage.getItem(QUIZ_CACHE_LS);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, QuizQuestion[]>;
    const hit = map[key];
    return Array.isArray(hit) && hit.length > 0 ? hit : null;
  } catch { return null; }
}
/** همگام‌سازی عدد سهمیه با سرور تا بج UI عدد درست نشان دهد */
function syncRemaining(remaining: number): void {
  try {
    const limits: Record<AITier, number> = { free: 3, byok: 20, premium: 100 };
    const used = Math.max(0, limits[getTier()] - remaining);
    localStorage.setItem(AI_USAGE_LS, JSON.stringify({ date: new Date().toDateString(), count: used }));
  } catch { /* ignore */ }
}

function writeCache(key: string, questions: QuizQuestion[]): void {
  try {
    const raw = localStorage.getItem(QUIZ_CACHE_LS);
    const map = raw ? (JSON.parse(raw) as Record<string, QuizQuestion[]>) : {};
    map[key] = questions;
    const keys = Object.keys(map);
    if (keys.length > CACHE_MAX) delete map[keys[0]!];
    localStorage.setItem(QUIZ_CACHE_LS, JSON.stringify(map));
  } catch { /* ignore */ }
}

// ============================================================
// پارس
// ============================================================
function parseQuestions(output: string): QuizQuestion[] {
  const start = output.indexOf('[');
  const end = output.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('خروجی JSON نامعتبر');

  const arr = JSON.parse(output.slice(start, end + 1)) as Array<Record<string, unknown>>;
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

// ============================================================
// خطای کاربرپسند
// ============================================================
export function friendlyAIError(err: unknown): string {
  if (err instanceof DOMException && err.name === 'AbortError') return 'ساخت آزمون لغو شد.';
  const m = err instanceof Error ? err.message : String(err);
  if (/timeout/i.test(m) || (err instanceof DOMException && err.name === 'TimeoutError')) {
    return 'ساخت آزمون بیش از حد طول کشید؛ اتصال اینترنت را بررسی کن و دوباره تلاش کن.';
  }
  if (/quota|سهمیه/i.test(m)) {
    return 'سهمیه‌ی هوش مصنوعی امروزت تمام شده؛ فردا دوباره بیا یا پریمیوم شو.';
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'اتصال اینترنت قطع است؛ چند لحظه دیگر دوباره تلاش کن.';
  }
  if (/fetch|network|failed/i.test(m)) {
    return 'ارتباط با سرور برقرار نشد؛ چند لحظه دیگر دوباره تلاش کن.';
  }
  return 'هوش مصنوعی موقتاً در دسترس نیست؛ چند لحظه دیگر دوباره تلاش کن.';
}

// ============================================================
// سرویس اصلی
// ============================================================
export class AIQuizService {
  async generate(
    text: string,
    opts: { count: number; types: QuestionType[]; forExam: boolean },
    hooks: GenerateHooks = {},
  ): Promise<AIResult> {
    // ۱) کش روزانه
    const key = cacheKey(text, opts);
    const cached = readCache(key);
    if (cached) {
      logger.info(`✅ آزمون از کش (${cached.length} سوال)`);
      return { questions: cached, engine: 'cache', model: 'cache', remaining: getRemainingQuota() };
    }

    // ۲) تک‌درخواست به Edge Function (سرور خودش موازی می‌کند)
    const deviceId = getOrCreateDeviceId();
    logger.info(`درخواست AI Quiz: ${opts.count} سوال (تک‌درخواست)`);

    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(new DOMException('quiz timeout', 'TimeoutError')), AI_TIMEOUT_MS);
    const onExternalAbort = (): void => ctrl.abort(hooks.signal?.reason ?? new DOMException('cancelled', 'AbortError'));
    if (hooks.signal) {
      if (hooks.signal.aborted) onExternalAbort();
      hooks.signal.addEventListener('abort', onExternalAbort, { once: true });
    }

    try {
      const res = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          task: 'quiz',
          text,
          count: opts.count,
          types: opts.types,
          forExam: opts.forExam,
          deviceId,
        }),
      });

      const data = (await res.json()) as Record<string, unknown>;
      if (!data.ok) {
        if (/quota|سهمیه/i.test(String(data.error ?? ''))) syncRemaining(0);
        throw new Error(String(data.error ?? 'خطا در Edge Function'));
      }

      const questions = parseQuestions(String(data.output ?? ''));
      const remaining = typeof data.remaining === 'number' ? data.remaining : getRemainingQuota();
      const partial = data.partial === true;

      writeCache(key, questions);
      syncRemaining(remaining);
      logger.info(`✅ AI Quiz موفق: ${questions.length} سوال (مدل ${String(data.model ?? '?')}${partial ? ' · جزئی' : ''})`);

      return { questions, engine: 'edge-function', model: String(data.model ?? 'unknown'), remaining, partial };
    } finally {
      window.clearTimeout(timer);
      if (hooks.signal) hooks.signal.removeEventListener('abort', onExternalAbort);
    }
  }
}

let instance: AIQuizService | null = null;
export function getAIQuizService(): AIQuizService {
  if (!instance) instance = new AIQuizService();
  return instance;
}