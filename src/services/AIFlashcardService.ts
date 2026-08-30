/**
 * ============================================================
 * دانش‌یار پرو - AI فلش‌کارت (تخمین سختی + تحلیل موضوع ضعیف)
 * ============================================================
 * 🔗 زنجیره: Gemini → Groq → فال‌بک هیورستیک (آفلاین/بدون کلید)
 * 🎚️ سهمیه‌ی مشترک روزانه (همان AI_USAGE_LS)
 * ⚡ هرگز حین مرور صدا زده نمی‌شود (فقط ساخت کارت + پایان جلسه)
 * @module services/AIFlashcardService
 * @version 1.0.0
 */
import { getInstance as getLogger } from '@/core/Logger';
import { AI_CONFIG, AI_KEYS_LS, AI_USAGE_LS } from '@/config/ai';
import type { ConceptType } from '@/services/SRS';
import { API_BASE } from '@/config/api';

const logger = getLogger().module('AIFlashcard');

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
function readUsage(): number {
  try {
    const raw = localStorage.getItem(AI_USAGE_LS);
    if (raw) {
      const u = JSON.parse(raw) as { date: string; count: number };
      if (u.date === new Date().toDateString()) return u.count;
    }
  } catch { /* ignore */ }
  return 0;
}
function consumeQuota(): void {
  try { localStorage.setItem(AI_USAGE_LS, JSON.stringify({ date: new Date().toDateString(), count: readUsage() + 1 })); } catch { /* ignore */ }
}

// ============================================================
// فال‌بک هیورستیک (بدون AI)
// ============================================================
export function heuristicDifficulty(front: string, back: string, conceptType?: ConceptType): number {
  const len = front.length + back.length;
  let d = 0.3;
  if (len > 140) d += 0.2; else if (len > 60) d += 0.1;
  if (/[0-9x^²³√∑∫π=+\-*/]/.test(back)) d += 0.2;
  if (conceptType === 'formula' || conceptType === 'math') d += 0.15;
  return Math.min(1, d);
}

const DIFF_PROMPT = (front: string, back: string): string =>
  `تو یک معلم ایرانی هستی. سختیِ یادگیری این فلش‌کارت را برای یک دانش‌آموز ایرانی بین 0 (خیلی آسان) و 1 (خیلی سخت) تخمین بزن.
فقط یک عدد اعشاری برگردان، بدون هیچ توضیح.
سوال: ${front.slice(0, 300)}
پاسخ: ${back.slice(0, 300)}`;

function parseScore(raw: string): number {
  const m = raw.match(/0?\.\d+|\d(\.\d+)?/);
  if (!m) throw new Error('عدد پیدا نشد');
  const v = parseFloat(m[0]);
  if (Number.isNaN(v)) throw new Error('عدد نامعتبر');
  return Math.max(0, Math.min(1, v > 1 ? v / 10 : v));
}

async function callGeminiScore(key: string, prompt: string): Promise<number> {

  const res = await fetch(`${API_BASE.gemini}/${AI_CONFIG.GEMINI_MODEL}:generateContent?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!res.ok) throw new Error('Gemini error ' + res.status);
  const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return parseScore(data.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
}
async function callGroqScore(key: string, prompt: string): Promise<number> {
  const res = await fetch(`${API_BASE.groq}/chat/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: AI_CONFIG.GROQ_MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.2 }),
  });
  if (!res.ok) throw new Error('Groq error ' + res.status);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return parseScore(data.choices?.[0]?.message?.content ?? '');
}

export interface DifficultyResult { difficulty: number; engine: 'gemini' | 'groq' | 'heuristic'; }

/** تخمین سختی کارت (AI با فال‌بک هوشمند) */
export async function estimateCardDifficulty(front: string, back: string, conceptType?: ConceptType): Promise<DifficultyResult> {
  const user = readUserKeys();
  const geminiKey = user.gemini || AI_CONFIG.DEV_GEMINI_KEY;
  const groqKey = user.groq || AI_CONFIG.DEV_GROQ_KEY;
  const prompt = DIFF_PROMPT(front, back);
  if (geminiKey) { try { const d = await callGeminiScore(geminiKey, prompt); consumeQuota(); return { difficulty: d, engine: 'gemini' }; } catch (e) { logger.warn('Gemini شکست', e); } }
  if (groqKey) { try { const d = await callGroqScore(groqKey, prompt); consumeQuota(); return { difficulty: d, engine: 'groq' }; } catch (e) { logger.warn('Groq شکست', e); } }
  return { difficulty: heuristicDifficulty(front, back, conceptType), engine: 'heuristic' };
}

const WEAK_PROMPT = (topics: string): string =>
  `تو یک مربی دلسوز ایرانی هستی. دانش‌آموز در این موضوع‌ها بیشتر اشتباه کرده: ${topics}.
در یک تا دو جمله‌ی کوتاه و انگیزشی به فارسی بگو روی چه چیزی تمرکز کند و چرا. فقط متن، بدون JSON.`;

async function callGeminiText(key: string, prompt: string): Promise<string> {

  const res = await fetch(`${API_BASE.gemini}/${AI_CONFIG.GEMINI_MODEL}:generateContent?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!res.ok) throw new Error('Gemini error ' + res.status);
  const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const t = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!t) throw new Error('متن خالی');
  return t.trim();
}
async function callGroqText(key: string, prompt: string): Promise<string> {
  const res = await fetch(`${API_BASE.groq}/chat/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: AI_CONFIG.GROQ_MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.5 }),
  });
  if (!res.ok) throw new Error('Groq error ' + res.status);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const t = data.choices?.[0]?.message?.content ?? '';
  if (!t) throw new Error('متن خالی');
  return t.trim();
}

/** تحلیل موضوع ضعیف در پایان جلسه؛ null یعنی AI در دسترس نیست (view فال‌بک می‌زند) */
export async function getWeakTopicInsight(weakTopics: { topic: string; count: number }[]): Promise<string | null> {
  if (weakTopics.length === 0) return null;
  const user = readUserKeys();
  const geminiKey = user.gemini || AI_CONFIG.DEV_GEMINI_KEY;
  const groqKey = user.groq || AI_CONFIG.DEV_GROQ_KEY;
  const topics = weakTopics.map((t) => `${t.topic} (${t.count} خطا)`).join('، ');
  const prompt = WEAK_PROMPT(topics);
  if (geminiKey) { try { const t = await callGeminiText(geminiKey, prompt); consumeQuota(); return t; } catch (e) { logger.warn('Gemini شکست', e); } }
  if (groqKey) { try { const t = await callGroqText(groqKey, prompt); consumeQuota(); return t; } catch (e) { logger.warn('Groq شکست', e); } }
  return null;
}