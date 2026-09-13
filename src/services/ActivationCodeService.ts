/**
 * دانش‌یار پرو - سرویس فعال‌سازی کد اشتراک
 * @module services/ActivationCodeService
 */
import { getSupabaseClient, getSession } from '@/services/AuthService';
import { getInstance as getLogger } from '@/core/Logger';
const logger = getLogger().module('ActivationCodeService');

export interface ActivationResult {
  ok: boolean;
  error?: string;
  planId?: string;
  expiresAt?: string;
}

/**
 * Validate and redeem an activation code
 * Only authenticated users can redeem codes
 */
export async function redeemActivationCode(code: string): Promise<ActivationResult> {
  logger.info('Attempting to redeem activation code');

  // Validate code format
  const trimmedCode = code.trim().toUpperCase();
  if (!trimmedCode || trimmedCode.length < 4) {
    logger.warn('Invalid activation code format');
    return { ok: false, error: 'فرمت کد نامعتبر است. کد باید حداقل ۴ کاراکتر باشد.' };
  }

  const client = getSupabaseClient();
  if (!client) {
    logger.error('Supabase client not available');
    return { ok: false, error: 'سرویس ابری فعال نیست. لطفا بعدا امتحان کنید.' };
  }

  const session = await getSession();
  if (!session?.user) {
    logger.warn('User not authenticated');
    return { ok: false, error: 'برای فعال‌سازی کد ابتدا وارد حساب کاربری شوید.' };
  }

  try {
    // Call Edge Function to redeem the code
    const { data, error } = await client.functions.invoke('redeem-subscription-code', {
      body: { code: trimmedCode },
    });

    if (error) {
      let errorMessage = error.message || String(error);
      
      // Try to extract more detailed error from response
      try {
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx && typeof ctx.json === 'function') {
          const errData = await ctx.json();
          if (errData?.error) {
            errorMessage = String(errData.error);
          }
        }
      } catch {
        // Ignore
      }
      
      logger.error('Error redeeming activation code', { error: errorMessage });
      
      // Map common errors to user-friendly messages
      if (errorMessage.includes('not found') || errorMessage.includes('Invalid')) {
        return { ok: false, error: 'کد فعال‌سازی یافت نشد یا معتبر نیست.' };
      }
      if (errorMessage.includes('already used') || errorMessage.includes('redeemed')) {
        return { ok: false, error: 'این کد قبلاً استفاده شده است.' };
      }
      if (errorMessage.includes('expired')) {
        return { ok: false, error: 'کد فعال‌سازی منقضی شده است.' };
      }
      
      return { ok: false, error: 'خطا در فعال‌سازی کد: ' + errorMessage };
    }

    if (!data?.ok) {
      const errorMsg = data?.error || 'پاسخ نامعتبر از سرور';
      logger.warn('Server returned error for activation code', { error: errorMsg });
      return { ok: false, error: String(errorMsg) };
    }

    // Success - code was redeemed
    logger.info('Activation code redeemed successfully', { 
      planId: data.planId,
      expiresAt: data.expiresAt
    });

    return {
      ok: true,
      planId: data.planId,
      expiresAt: data.expiresAt,
    };
  } catch (e) {
    logger.error('Unexpected error in redeemActivationCode', { error: String(e) });
    return { ok: false, error: 'خطای غیرمنتظره. لطفا بعدا امتحان کنید.' };
  }
}