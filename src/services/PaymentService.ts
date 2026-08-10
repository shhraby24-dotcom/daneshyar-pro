/**
 * دانش‌یار پرو - درگاه پرداخت (بخش A: شبیه‌سازی بتا)
 * 🔜 بخش B: اتصال به زرین‌پال
 * @module services/PaymentService
 */
import { getSupabaseClient, getSession } from '@/services/AuthService';
import { activatePremium, type Plan } from '@/services/Premium';
import { getInstance as getLogger } from '@/core/Logger';
const logger = getLogger().module('Payment');

export interface PaymentResult {
  ok: boolean;
  error?: string;
  message?: string;
}

export async function requestPayment(plan: Plan): Promise<PaymentResult> {
  logger.info('درخواست پرداخت', { plan: plan.id });
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'سرویس ابری فعال نیست' };
  const session = await getSession();
  if (!session?.user) return { ok: false, error: 'برای خرید ابتدا وارد شوید' };
  const userId = session.user.id;

  // ── حالت بتا: شبیه‌سازی پرداخت موفق ──
  const days = plan.id === 'yearly' ? 365 : 30;
  const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
  const now = new Date().toISOString();

  const { error } = await client
    .from('subscriptions')
    .upsert(
      { user_id: userId, plan: plan.id, expires_at: expiresAt, updated_at: now },
      { onConflict: 'user_id' }
    );

  if (error) {
    logger.error('خطا در ذخیره اشتراک', error.message);
    return { ok: false, error: 'ذخیره اشتراک ناموفق بود' };
  }

  activatePremium(plan.id);
  logger.info('✅ پرداخت شبیه‌سازی شد و پریمیوم فعال شد', { plan: plan.id });
  return { ok: true, message: 'پرداخت (شبیه‌سازی بتا) موفق! پریمیوم فعال شد 💎' };
}