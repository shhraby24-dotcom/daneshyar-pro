/**
 * دانش‌یار پرو - سرویس اشتراک پریمیوم
 * منبع حقیقت: جدول subscriptions در Supabase
 * @module services/SubscriptionService
 */
import { getSupabaseClient, getSession } from '@/services/AuthService';
import { getInstance as getLogger } from '@/core/Logger';
const logger = getLogger().module('Subscription');

export interface Subscription {
  plan: string;
  expires_at: string;
  updated_at: string;
}

// Cache for current subscription state
let currentSubscription: Subscription | null = null;

/**
 * خواندن اشتراک از Supabase - منبع حقیقت
 * تنها از جدول subscriptions در Supabase می‌خواند
 * localStorage برای اشتراک پولی استفاده نمی‌شود
 */
export async function loadSubscription(): Promise<Subscription | null> {
  const client = getSupabaseClient();
  if (!client) {
    logger.debug('Supabase client not available');
    return null;
  }
  
  const session = await getSession();
  if (!session?.user) {
    logger.debug('No authenticated user');
    return null;
  }
  
  const userId = session.user.id;

  try {
    const { data, error } = await client
      .from('subscriptions')
      .select('plan, expires_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Error loading subscription', { error, userId });
      throw error;
    }

    if (!data) {
      logger.debug('No subscription found', { userId });
      currentSubscription = null;
      return null;
    }

    currentSubscription = data as Subscription;
    logger.info('Subscription loaded from Supabase', { 
      userId,
      plan: currentSubscription.plan,
      expiresAt: currentSubscription.expires_at
    });
    
    return currentSubscription;
  } catch (e) {
    logger.error('Failed to load subscription', { error: e, userId });
    currentSubscription = null;
    return null;
  }
}

/**
 * دریافت اطلاعات اشتراک فعلی از cache
 * توجه: این اطلاعات از Supabase بارگذاری شده است
 */
export function getCurrentSubscription(): Subscription | null {
  return currentSubscription;
}

/**
 * بررسی اعتبار اشتراک
 */
export function isSubscriptionValid(): boolean {
  if (!currentSubscription) return false;
  try {
    return new Date(currentSubscription.expires_at) > new Date();
  } catch {
    return false;
  }
}

/**
 * دریافت پلن اشتراک فعلی
 */
export function getSubscriptionPlan(): string | null {
  return currentSubscription?.plan ?? null;
}

/**
 * دریافت تاریخ انقضا از سرور
 */
export function getSubscriptionExpiry(): string | null {
  return currentSubscription?.expires_at ?? null;
}

/**
 * روزهای باقی‌مانده اشتراک از سرور
 */
export function getSubscriptionDaysLeft(): number {
  const expiresAt = getSubscriptionExpiry();
  if (!expiresAt) return 0;
  try {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  } catch {
    return 0;
  }
}

/**
 * بارگذاری مجدد اشتراک از سرور
 */
export async function reloadSubscription(): Promise<Subscription | null> {
  currentSubscription = null;
  return await loadSubscription();
}

/**
 * اطلاعات کامل اشتراک برای نمایش در UI
 * توجه: این فقط برای اشتراک پولی از Supabase است
 * Trial و Reward entitlements جداگانه مدیریت می‌شوند
 */
export interface SubscriptionInfo {
  hasPaidSubscription: boolean;
  planId: string | null;
  daysLeft: number;
  expiresAt: string | null;
}

export function getSubscriptionInfo(): SubscriptionInfo {
  return {
    hasPaidSubscription: isSubscriptionValid(),
    planId: getSubscriptionPlan(),
    daysLeft: getSubscriptionDaysLeft(),
    expiresAt: getSubscriptionExpiry(),
  };
}