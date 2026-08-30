/**
 * ============================================================
 * دانش‌یار پرو - سرویس خلاصه‌سازی AI تطبیقی (Domain-Aware)
 * ============================================================
 * 🧠 پرامپت تطبیقی: نوع متن را تشخیص می‌دهد و لحن/حفاظت را تنظیم می‌کند
 * 📜 قانون طلایی: بخش‌های اصیل (بیت/لغت/فرمول/تعریف) دست‌نخورده می‌مانند
 * 🔗 زنجیره: کش → Gemini → Groq → (خطا → آفلاین در View)
 * 💾 کش هوشمند: هر متن+سطح یک‌بار ساخته می‌شود (هزینه کمتر + باز شدن آنی)
 * 🎚️ سهمیه روزانه مشترک با آزمون (همان AI_USAGE_LS)
 * @module services/AISummaryService
 * @version 1.0.0
 */
import { getInstance as getLogger } from '@/core/Logger';
import { AI_CONFIG, AI_KEYS_LS, AI_USAGE_LS } from '@/config/ai';
import type { SummaryLevel } from '@/services/Summarizer';
import { API_BASE } from '@/config/api';

const logger = getLogger().module('AISummaryService');

const CACHE_LS = 'daneshyar_ai_summary_cache';
const CACHE_MAX = 20;

// ============================================================
// Types
// ============================================================
export interface AISummarySection { title: string; points: string[]; }
export interface AISelfTest { q: string; a: string; }
export interface AIPreserved { text: string; why: string; }

export interface AISummary {
  domain: string;
  tone: string;
  simple_summary: string;
  sections: AISummarySection[];
  preserved: AIPreserved[];
  analogy: string;
  mnemonic: string;
  self_test: AISelfTest[];
  keywords: string[];
}

export interface AISummaryResult extends AISummary {
  engine: 'gemini' | 'groq' | 'cache';
}

export interface AISummaryOptions {
  level: SummaryLevel;
  forExam: boolean;
}

// ============================================================
// کلیدها و سهمیه (مشترک با آزمون)
// ============================================================
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
  try {
    localStorage.setItem(AI_USAGE_LS, JSON.stringify({ date: new Date().toDateString(), count: readUsage() + 1 }));
  } catch { /* ignore */ }
}

// ============================================================
// کش
// ============================================================
function hashText(t: string): string {
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return String(h >>> 0);
}
function cacheKey(text: string, opts: AISummaryOptions): string {
  return `${opts.level}|${opts.forExam ? 1 : 0}|${hashText(text.slice(0, 2000))}|${text.length}`;
}
function readCache(): Record<string, AISummary> {
  try {
    const raw = localStorage.getItem(CACHE_LS);
    return raw ? (JSON.parse(raw) as Record<string, AISummary>) : {};
  } catch { return {}; }
}
function writeCache(key: string, value: AISummary): void {
  try {
    const cache = readCache();
    cache[key] = value;
    const keys = Object.keys(cache);
    if (keys.length > CACHE_MAX) delete cache[keys[0]!];
    localStorage.setItem(CACHE_LS, JSON.stringify(cache));
  } catch { /* ignore */ }
}

// ============================================================
// پرامپت تطبیقی
// ============================================================
function buildPrompt(text: string, opts: AISummaryOptions): string {
  const levelDesc =
    opts.level === 'short' ? 'خیلی کوتاه و فشرده (حداکثر ۵ نکته)' :
    opts.level === 'long' ? 'کامل و با جزئیات کافی' : 'متوسط و متعادل';
  return `تو یک معلم خصوصی حرفه‌ای ایرانی هستی که متن درسی را برای «حفظ سریع و ماندگار» آماده می‌کند.

── گام ۱: تشخیص نوع متن ──
نوع متن را تشخیص بده: [ادبی/شعر] [زبان/لغت] [ریاضی/فرمول] [علوم/تعریفی] [تاریخ/معلومات عمومی] [ترکیبی]

── گام ۲: قانون لحن بر اساس نوع ──
• ادبی/شعر و زبان: لحن نیمه‌رسمی و محترمانه بماند؛ فقط جملات توضیحی/ربطی ساده شود. ابیات، آرایه‌ها، لغت‌ها و معانی دقیق دست‌نخورده بمانند.
• ریاضی/علوم: توضیح‌ها ساده شود، ولی تعریف، قضیه، فرمول و نمادها عیناً حفظ شوند.
• تاریخ/عمومی: می‌تواند خودمانی‌تر شود، ولی اسامی، تاریخ‌ها و اعداد دقیقاً حفظ شوند.

── گام ۳: قانون طلایی حفاظت (هرگز تغییر نده، عیناً در preserved بیاور) ──
) ابیات و عبارات ادبی  ۲) لغت و معنی دقیق  ۳) فرمول و نماد  ۴) تعریف رسمی  ۵) اسامی خاص، تاریخ‌ها و اعداد

── گام ۴: خلاصه‌سازی ──
سطح خلاصه: ${levelDesc}
${opts.forExam ? 'حالت کنکوری: روی تعاریف، اعداد، فرمول‌ها و نکات تست‌خیز تمرکز کن.' : 'حالت عادی: برای یادگیری و حفظ آسان.'}
بقیه‌ی متن را ساده، کوتاه و قابل‌حفظ کن؛ با سرفصل و دسته‌بندی.
تشبیه/مثال روزمره فقط برای مفاهیم انتزاعیِ غیرادبی. برای لیست‌ها و ترتیب‌ها یک قلاب حافظه بساز.

── گام ۵: خودآزمایی ──
۲ تا ۳ سوال کوتاه برای مرور فعال.

قانون سخت: فقط بر اساس متن کاربر جواب بده؛ هیچ چیزی اختراع نکن.
خروجی فقط JSON معتبر با این ساختار:
{"domain":"...","tone":"...","simple_summary":"...","sections":[{"title":"...","points":["..."]}],"preserved":[{"text":"...","why":"..."}],"analogy":"...","mnemonic":"...","self_test":[{"q":"...","a":"..."}],"keywords":["..."]}

متن کاربر:
${text.slice(0, 6000)}`;
}

// ============================================================
// پارس و نرمال‌سازی
// ============================================================
function parseSummary(raw: string): AISummary {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('خروجی JSON نامعتبر');
  const obj = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;

  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  const sections: AISummarySection[] = Array.isArray(obj.sections)
    ? (obj.sections as Array<Record<string, unknown>>)
        .map((s) => ({
          title: str(s.title) || 'بخش',
          points: Array.isArray(s.points) ? (s.points as unknown[]).map(String) : [],
        }))
        .filter((s) => s.points.length > 0)
    : [];
  const preserved: AIPreserved[] = Array.isArray(obj.preserved)
    ? (obj.preserved as Array<Record<string, unknown>>)
        .map((p) => ({ text: str(p.text), why: str(p.why) }))
        .filter((p) => p.text.length > 0)
    : [];
  const self_test: AISelfTest[] = Array.isArray(obj.self_test)
    ? (obj.self_test as Array<Record<string, unknown>>)
        .map((t) => ({ q: str(t.q), a: str(t.a) }))
        .filter((t) => t.q.length > 0)
    : [];
  const keywords: string[] = Array.isArray(obj.keywords) ? (obj.keywords as unknown[]).map(String) : [];

  const summary: AISummary = {
    domain: str(obj.domain) || 'عمومی',
    tone: str(obj.tone) || 'ساده',
    simple_summary: str(obj.simple_summary),
    sections,
    preserved,
    analogy: str(obj.analogy),
    mnemonic: str(obj.mnemonic),
    self_test,
    keywords,
  };
  if (!summary.simple_summary && sections.length === 0) throw new Error('خلاصه خالی است');
  return summary;
}

// ============================================================
// فراخوانی ارائه‌دهنده‌ها
// ============================================================
async function callGemini(key: string, prompt: string): Promise<AISummary> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
      }),
    }
  );
  if (!res.ok) throw new Error('Gemini error ' + res.status);
  const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return parseSummary(text);
}

async function callGroq(key: string, prompt: string): Promise<AISummary> {
  const res = await fetch(`${API_BASE.groq}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: AI_CONFIG.GROQ_MODEL,
      messages: [
        { role: 'system', content: 'فقط JSON معتبر برگردان، بدون توضیح اضافه.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
    }),
  });
  if (!res.ok) throw new Error('Groq error ' + res.status);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content ?? '';
  return parseSummary(text);
}

// ============================================================
// API عمومی
// ============================================================
export async function getAISummary(text: string, opts: AISummaryOptions): Promise<AISummaryResult> {
  // ۱) کش
  const key = cacheKey(text, opts);
  const cached = readCache()[key];
  if (cached) {
    logger.info('خلاصه از کش');
    return { ...cached, engine: 'cache' };
  }

  const user = readUserKeys();
  const geminiKey = user.gemini || AI_CONFIG.DEV_GEMINI_KEY;
  const groqKey = user.groq || AI_CONFIG.DEV_GROQ_KEY;
  const prompt = buildPrompt(text, opts);

  // ۲) Gemini
  if (geminiKey) {
    try {
      const s = await callGemini(geminiKey, prompt);
      writeCache(key, s);
      consumeQuota();
      return { ...s, engine: 'gemini' };
    } catch (e) { logger.warn('Gemini شکست', e); }
  }
  // ۳) Groq
  if (groqKey) {
    try {
      const s = await callGroq(groqKey, prompt);
      writeCache(key, s);
      consumeQuota();
      return { ...s, engine: 'groq' };
    } catch (e) { logger.warn('Groq شکست', e); }
  }
  throw new Error('AI در دسترس نیست');
}