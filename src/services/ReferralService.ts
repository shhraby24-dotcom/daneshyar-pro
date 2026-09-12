/**
 * دانش‌یار پرو - سرویس دعوت دوستان
 * @module services/ReferralService
 */
import { getSupabaseClient, getSession } from '@/services/AuthService';
import { activateEntitlement } from '@/services/Premium';
import { getInstance as getLogger } from '@/core/Logger';

const logger = getLogger().module('ReferralService');

const REFERRAL_LS = 'daneshyar_pending_ref';
export const MAX_REFERRALS = 20;
// Reward days are now handled as reward entitlement, not paid subscription
export const REWARD_DAYS = 3;

/** ذخیره کد دعوت در localStorage (هنگام ورود با لینک) */
export function savePendingRef(code: string): void {
  try { localStorage.setItem(REFERRAL_LS, code); } catch { /* ignore */ }
}

/** خواندن کد دعوت ذخیره‌شده */
export function getPendingRef(): string | null {
  try { return localStorage.getItem(REFERRAL_LS); } catch { return null; }
}

/** پاک کردن کد دعوت بعد از استفاده */
export function clearPendingRef(): void {
  try { localStorage.removeItem(REFERRAL_LS); } catch { /* ignore */ }
}

/** گرفتن کد دعوت کاربر فعلی (با ساخت خودکار اگر نبود) */
export async function getMyReferralCode(): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const session = await getSession();
  if (!session?.user) return null;

  // تلاش اول: خواندن از دیتابیس
  const { data } = await client
    .from('profiles')
    .select('referral_code')
    .eq('user_id', session.user.id)
    .maybeSingle();

  const existingCode = (data as { referral_code?: string })?.referral_code;
  if (existingCode) return existingCode;

  // اگر کد نبود، از Edge Function بساز
  try {
    const { data: ensureData, error } = await client.functions.invoke('ensure-profile', {
      body: {},
    });
    if (!error && ensureData?.ok && ensureData.referralCode) {
      logger.info('Referral code created (ensure-profile)');
      return ensureData.referralCode as string;
    }
  } catch (e) {
    logger.warn('Error in ensure-profile', e);
  }

  return null;
}

/** ساخت لینک دعوت کامل */
export async function getReferralLink(): Promise<string | null> {
  const code = await getMyReferralCode();
  if (!code) return null;
  const base = window.location.origin + window.location.pathname;
  return `${base}#/auth?ref=${code}`;
}

/** آمار دعوت‌های کاربر */
export async function getReferralStats(): Promise<{ count: number; max: number }> {
  const client = getSupabaseClient();
  if (!client) return { count: 0, max: MAX_REFERRALS };
  const session = await getSession();
  if (!session?.user) return { count: 0, max: MAX_REFERRALS };
  const { data } = await client
    .from('profiles')
    .select('referral_count')
    .eq('user_id', session.user.id)
    .maybeSingle();
  return {
    count: (data as { referral_count?: number })?.referral_count ?? 0,
    max: MAX_REFERRALS,
  };
}

/** پردازش دعوت بعد از ثبت‌نام (صدا زدن Edge Function) */
export async function processReferralOnSignup(): Promise<{ ok: boolean; rewardDays?: number; error?: string }> {
  const refCode = getPendingRef();
  if (!refCode) return { ok: false, error: 'no_ref' };

  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'no_client' };

  const session = await getSession();
  if (!session?.user) return { ok: false, error: 'no_user' };

  try {
    const { data, error } = await client.functions.invoke('clever-handler', {
      body: { refCode },
    });
    if (error) {
      logger.warn('Error in process-referral', error);
      return { ok: false, error: error.message };
    }
    if (data?.ok) {
      clearPendingRef();
      // Grant reward entitlement instead of paid subscription
      if (data.rewardDays) {
        activateEntitlement('reward', 'referral', data.rewardDays);
      }
      logger.info('Referral processed', { rewardDays: data.rewardDays });
      return { ok: true, rewardDays: data.rewardDays };
    }
    return { ok: false, error: data?.error ?? 'unknown' };
  } catch (e) {
    logger.error('Error in processReferralOnSignup', e);
    return { ok: false, error: String(e) };
  }
}
