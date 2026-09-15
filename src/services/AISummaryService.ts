/**
 * دانش‌یار پرو - سرویس خلاصه‌سازی AI با Edge Function
 * @module services/AISummaryService
 */
import { getInstance as getLogger } from '@/core/Logger';
import type { SummaryLevel } from '@/services/Summarizer';

const logger = getLogger().module('AISummaryService');

const EDGE_FUNCTION_URL = 'https://ueyuyyachmdjnbiteybp.supabase.co/functions/v1/ai-proxy';
const DEVICE_ID_KEY = 'daneshyar_device_id';
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
  engine: 'edge-function' | 'cache';
  model?: string;
  remaining?: number;
}

export interface AISummaryOptions {
  level: SummaryLevel;
  forExam: boolean;
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
// پارس JSON
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

  const deviceId = getOrCreateDeviceId();
  
  logger.info(`درخواست AI Summary از Edge Function (deviceId: ${deviceId})`);

  // ۲) Edge Function
  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'summary',
        text,
        level: opts.level,
        forExam: opts.forExam,
        deviceId,
      }),
    });

    const data = await res.json();

    if (!data.ok) {
      logger.error('Edge Function خطا داد', data);
      throw new Error(data.error || 'خطا در Edge Function');
    }

    const summary = parseSummary(data.output);
    writeCache(key, summary);

    logger.info(`✅ AI Summary موفق با مدل ${data.model} (${data.remaining} باقی‌مانده)`);

    return {
      ...summary,
      engine: 'edge-function',
      model: data.model,
      remaining: data.remaining,
    };
  } catch (err) {
    logger.error('Edge Function شکست', err);
    throw new Error(err instanceof Error ? err.message : 'AI در دسترس نیست');
  }
}