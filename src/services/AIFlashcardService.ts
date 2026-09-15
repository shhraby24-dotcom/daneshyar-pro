/**
 * دانش‌یار پرو - AI فلش‌کارت با Edge Function
 * @module services/AIFlashcardService
 */
import { getInstance as getLogger } from '@/core/Logger';
import type { ConceptType } from '@/services/SRS';

const logger = getLogger().module('AIFlashcard');

const EDGE_FUNCTION_URL = 'https://ueyuyyachmdjnbiteybp.supabase.co/functions/v1/ai-proxy';
const DEVICE_ID_KEY = 'daneshyar_device_id';

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

function parseScore(raw: string): number {
  const m = raw.match(/0?\.\d+|\d(\.\d+)?/);
  if (!m) throw new Error('عدد پیدا نشد');
  const v = parseFloat(m[0]);
  if (Number.isNaN(v)) throw new Error('عدد نامعتبر');
  return Math.max(0, Math.min(1, v > 1 ? v / 10 : v));
}

export interface DifficultyResult {
  difficulty: number;
  engine: 'edge-function' | 'heuristic';
  model?: string;
  remaining?: number;
}

/** تخمین سختی کارت (AI با فال‌بک هوشمند) */
export async function estimateCardDifficulty(
  front: string,
  back: string,
  conceptType?: ConceptType
): Promise<DifficultyResult> {
  const deviceId = getOrCreateDeviceId();
  
  logger.info(`درخواست تخمین سختی از Edge Function (deviceId: ${deviceId})`);

  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'difficulty',
        front,
        back,
        deviceId,
      }),
    });

    const data = await res.json();

    if (!data.ok) {
      logger.error('Edge Function خطا داد', data);
      throw new Error(data.error || 'خطا در Edge Function');
    }

    const difficulty = parseScore(data.output);
    
    logger.info(`✅ تخمین سختی موفق با مدل ${data.model}: ${difficulty}`);

    return {
      difficulty,
      engine: 'edge-function',
      model: data.model,
      remaining: data.remaining,
    };
  } catch (err) {
    logger.error('Edge Function شکست، استفاده از heuristic', err);
    return {
      difficulty: heuristicDifficulty(front, back, conceptType),
      engine: 'heuristic',
    };
  }
}

/** تحلیل موضوع ضعیف در پایان جلسه؛ null یعنی AI در دسترس نیست */
export async function getWeakTopicInsight(
  weakTopics: { topic: string; count: number }[]
): Promise<string | null> {
  if (weakTopics.length === 0) return null;
  
  const deviceId = getOrCreateDeviceId();
  const topics = weakTopics.map((t) => `${t.topic} (${t.count} خطا)`).join('، ');
  
  logger.info(`درخواست تحلیل موضوع ضعیف از Edge Function (deviceId: ${deviceId})`);

  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'insight',
        topics,
        deviceId,
      }),
    });

    const data = await res.json();

    if (!data.ok) {
      logger.error('Edge Function خطا داد', data);
      return null;
    }

    logger.info(`✅ تحلیل موضوع ضعیف موفق با مدل ${data.model}`);

    return data.output.trim();
  } catch (err) {
    logger.error('Edge Function شکست', err);
    return null;
  }
}