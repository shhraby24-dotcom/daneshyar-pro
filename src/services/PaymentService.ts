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

  // 🔜 برای production واقعی: ریدایرکت به درگاه زرین‌پال
  // فعلاً برای بتا: grant از طریق Edge Function (امن، چون فقط از مسیر معتبر)
  const { data, error } = await client.functions.invoke('smooth-responder', {
    body: { planId: plan.id },
  });

  if (error || !data?.ok) {
    let msg = error ? (error.message ?? String(error)) : 'پاسخ نامعتبر از سرور';
    // خواندن جزئیات خطا از response سرور
    try {
      const ctx = (error as unknown as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        const errData = await ctx.json();
        if (errData && errData.error) msg = String(errData.error);
      }
    } catch { /* ignore */ }
    logger.error('خطا در فعال‌سازی اشتراک', { error, data });
    return { ok: false, error: 'خطا: ' + msg };
  }

  activatePremium(plan.id);
  logger.info('✅ پریمیوم فعال شد (از طریق Edge Function)', { plan: plan.id });
  return { ok: true, message: 'پرداخت (شبیه‌سازی بتا) موفق! پریمیوم فعال شد 💎' };
}