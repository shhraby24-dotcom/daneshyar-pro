/**
 * دانش‌یار پرو - دروازه سهمیه AI
 * قبل از هر AI call چک می‌کند؛ اگر سهمیه نبود، paywall نشان می‌دهد.
 * @module services/QuotaGate
 */
import { getTier, getRemainingQuota } from '@/services/AIQuizService';
import { showPaywall } from '@/ui/components/PaywallModal';
import { getInstance as getLogger } from '@/core/Logger';

const logger = getLogger().module('QuotaGate');

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * بررسی اجازه استفاده از AI.
 * - Premium: همیشه مجاز (۱۰۰/روز)
 * - BYOK: همیشه مجاز (کلید خودشان، paywall نشان نمی‌دهیم)
 * - Free: چک سهمیه روزانه (۳/روز)
 */
export function checkAIQuota(context: string): QuotaCheckResult {
  const tier = getTier();

  // پریمیوم و BYOK بدون محدودیت عملی
  if (tier === 'premium' || tier === 'byok') {
    return { allowed: true };
  }

  // کاربر رایگان: چک سهمیه
  const remaining = getRemainingQuota();
  if (remaining <= 0) {
    logger.info('سهمیه رایگان تمام شد، نمایش paywall', { context });
    showPaywall(context);
    return { allowed: false, reason: 'quota_exhausted' };
  }

  return { allowed: true };
}

/**
 * اطلاعات سهمیه برای نمایش در UI (مثلاً در QuizView یا Dashboard)
 */
export function getQuotaInfo(): { remaining: number; tier: string } {
  return {
    remaining: getRemainingQuota(),
    tier: getTier(),
  };
}