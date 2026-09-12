/**
 * دانش‌یار پرو - سرویس پرداخت دستی
 * پرداخت از طریق ارسال رسید به پشتیبانی و دریافت کد فعال‌سازی
 * @module services/PaymentService
 */
import { getSupabaseClient, getSession } from '@/services/AuthService';
import { getInstance as getLogger } from '@/core/Logger';
const logger = getLogger().module('Payment');

export interface PaymentResult {
  ok: boolean;
  error?: string;
  message?: string;
}

/**
 * Request payment - Manual payment flow
 * For manual payments, user sends receipt to support and receives activation code
 * This function does NOT activate Premium - activation happens via ActivationCodeService
 */
export async function requestPayment(planId: string): Promise<PaymentResult> {
  logger.info('Manual payment request', { planId });

  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'سرویس ابری فعال نیست' };

  const session = await getSession();
  if (!session?.user) return { ok: false, error: 'برای خرید ابتدا وارد شوید' };

  // Manual payment flow - no automatic activation
  // User will receive activation code from support after payment verification
  logger.info('Manual payment flow - user will send receipt to support');
  
  return { 
    ok: true, 
    message: 'لطفاً رسید پرداخت را به آدرس پشتیبانی ارسال کنید تا کد فعال‌سازی دریافت نمایید.'
  };
}

/**
 * Get support contact information for manual payments
 */
export function getSupportContacts(): { telegram: string; email: string } {
  return {
    telegram: '@S_upport_Daneshyar',
    email: 'support.daneshyar.yar@gmail.com'
  };
}

/**
 * Get price for a plan
 */
export function getPlanPrice(planId: string): { price: number; days: number } | null {
  const prices: Record<string, { price: number; days: number }> = {
    monthly: { price: 99000, days: 30 },
    term: { price: 320000, days: 120 },
    yearly: { price: 890000, days: 365 },
  };
  return prices[planId] || null;
}