/**
 * دانش‌یار پرو - سرویس AI با Edge Function (امن + سهمیه سمت سرور)
 * @module services/AIQuizService
 */
import { getInstance as getLogger } from '@/core/Logger';
import type { Question as QuizQuestion, QuestionType } from '@/services/QuizGenerator';

const logger = getLogger().module('AIQuizService');

const EDGE_FUNCTION_URL = 'https://ueyuyyachmdjnbiteybp.supabase.co/functions/v1/ai-proxy';
const DEVICE_ID_KEY = 'daneshyar_device_id';
const AI_KEYS_LS = 'daneshyar_ai_keys';
const AI_USAGE_LS = 'daneshyar_ai_usage';
const PREMIUM_LS = 'daneshyar_premium';

export type AITier = 'free' | 'byok' | 'premium';

export interface AIResult {
  questions: QuizQuestion[];
  engine: 'edge-function';
  model: string;
  remaining: number;
}

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

// Compatibility functions برای UI
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
      if (u.date === today) {
        return Math.max(0, limits[tier] - u.count);
      }
    }
  } catch { /* ignore */ }
  
  return limits[tier];
}

export function saveUserKeys(gemini: string, groq: string): void {
  try {
    localStorage.setItem(AI_KEYS_LS, JSON.stringify({ gemini, groq }));
  } catch { /* ignore */ }
}

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

export class AIQuizService {
  async generate(
    text: string,
    opts: { count: number; types: QuestionType[]; forExam: boolean }
  ): Promise<AIResult> {
    const deviceId = getOrCreateDeviceId();
    
    logger.info(`درخواست AI Quiz از Edge Function (deviceId: ${deviceId})`);
    
    try {
      const res = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'quiz',
          text,
          count: opts.count,
          types: opts.types,
          forExam: opts.forExam,
          deviceId,
        }),
      });
      
      const data = await res.json();
      
      if (!data.ok) {
        logger.error('Edge Function خطا داد', data);
        throw new Error(data.error || 'خطا در Edge Function');
      }
      
      const questions = parseQuestions(data.output);
      
      logger.info(`✅ AI Quiz موفق با مدل ${data.model} (${data.remaining} باقی‌مانده)`);
      
      return {
        questions,
        engine: 'edge-function',
        model: data.model,
        remaining: data.remaining,
      };
    } catch (err) {
      logger.error('Edge Function شکست', err);
      throw new Error(err instanceof Error ? err.message : 'AI در دسترس نیست');
    }
  }
}

let instance: AIQuizService | null = null;
export function getAIQuizService(): AIQuizService {
  if (!instance) instance = new AIQuizService();
  return instance;
}