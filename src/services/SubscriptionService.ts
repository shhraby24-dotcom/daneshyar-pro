/**
 * دانش‌یار پرو - پریمیوم متصل به حساب کاربری
 * @module services/SubscriptionService
 */
import { getSupabaseClient, getSession } from '@/services/AuthService';
import { isPremium, activatePremium, deactivatePremium, getPremiumPlan, getPremiumDaysLeft } from '@/services/Premium';
import { getInstance as getLogger } from '@/core/Logger';
const logger = getLogger().module('Subscription');

export interface Subscription {
  plan: string;
  expires_at: string;
  updated_at: string;
}

/** خواندن اشتراک از Supabase و اعمال روی پریمیوم محلی */
export async function loadSubscription(): Promise<Subscription | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const session = await getSession();
  if (!session?.user) return null;
  const userId = session.user.id;

  const { data, error } = await client
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) { logger.debug('اشتراکی یافت نشد'); return null; }

  const sub = data as Subscription;
  if (new Date(sub.expires_at) > new Date()) {
    if (!isPremium()) activatePremium(sub.plan);
    logger.info('✅ اشتراک فعال بارگذاری شد', { plan: sub.plan });
    return sub;
  }
  if (isPremium()) deactivatePremium();
  return null;
}
import { isTrialActive, getTrialDaysLeft } from '@/services/TrialService';

export interface SubscriptionInfo {
  isPremium: boolean;
  isTrial: boolean;
  planId: string | null;
  daysLeft: number;
  trialDaysLeft: number;
}

/** اطلاعات کامل اشتراک برای نمایش در UI */
export function getSubscriptionInfo(): SubscriptionInfo {
  return {
    isPremium: isPremium(),
    isTrial: isTrialActive(),
    planId: getPremiumPlan(),
    daysLeft: getPremiumDaysLeft(),
    trialDaysLeft: getTrialDaysLeft(),
  };
}