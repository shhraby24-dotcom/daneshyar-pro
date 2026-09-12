/**
 * دانش‌یار پرو - دروازه سهمیه AI
 * فقط چک می‌کند؛ نمایش paywall بر عهده View است.
 * @module services/QuotaGate
 */
import { getTier, getRemainingQuota } from '@/services/AIQuizService';
import { getCurrentSubscription, isSubscriptionValid } from '@/services/SubscriptionService';
import { isTrialActive, isRewardEntitlementActive } from '@/services/TrialService';

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: 'quota_exhausted' | 'not_configured';
}

/**
 * بررسی اجازه استفاده از AI.
 * - Paid Subscription: همیشه مجاز
 * - Trial: مجاز
 * - Reward: مجاز
 * - Free: چک سهمیه روزانه
 */
export function checkAIQuota(): QuotaCheckResult {
  // Check paid subscription first
  if (isSubscriptionValid()) return { allowed: true };
  
  // Check trial entitlement
  if (isTrialActive()) return { allowed: true };
  
  // Check reward entitlement
  if (isRewardEntitlementActive()) return { allowed: true };
  
  // Fallback to tier-based check
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
