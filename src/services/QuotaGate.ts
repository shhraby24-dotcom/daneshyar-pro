/**
 * دانش‌یار پرو - دروازه سهمیه AI
 * فقط چک می‌کند؛ نمایش paywall بر عهده View است.
 * @module services/QuotaGate
 */
import { getTier, getRemainingQuota } from '@/services/AIQuizService';

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: 'quota_exhausted' | 'not_configured';
}

/**
 * بررسی اجازه استفاده از AI.
 * - Premium / BYOK: همیشه مجاز
 * - Free: چک سهمیه روزانه
 */
export function checkAIQuota(): QuotaCheckResult {
  const tier = getTier();
  if (tier === 'premium' || tier === 'byok') return { allowed: true };
  const remaining = getRemainingQuota();
  if (remaining <= 0) return { allowed: false, reason: 'quota_exhausted' };
  return { allowed: true };
}

/** اطلاعات سهمیه برای نمایش در UI */
export function getQuotaInfo(): { remaining: number; tier: string } {
  return { remaining: getRemainingQuota(), tier: getTier() };
}