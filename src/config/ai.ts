/**
 * دانش‌یار پرو - پیکربندی AI
 * ⚠️ کلیدهای VITE_* در bundle ظاهر می‌شوند — فقط برای تست/دمو
 * ✅ راه اصلی: BYOK (کاربر کلید خودش را در تنظیمات می‌گذارد)
 * 🔒 راه آینده: Edge Function (بعد از اینماد)
 * @module config/ai
 */

// کلیدهای dev از env (اگر نباشد، خالی می‌ماند)
const envGeminiKey = (import.meta.env as Record<string, string | undefined>).VITE_GEMINI_KEY ?? '';
const envGroqKey = (import.meta.env as Record<string, string | undefined>).VITE_GROQ_KEY ?? '';

export const AI_CONFIG = {
  DEV_GEMINI_KEY: envGeminiKey,
  DEV_GROQ_KEY: envGroqKey,
  GEMINI_MODEL: 'gemini-2.5-flash',  // ✅ مدل صحیح
  GROQ_MODEL: 'llama-3.3-70b-versatile',
};

export type AITier = 'free' | 'byok' | 'premium';

/** سقف آزمون AI در روز per سطح */
export const AI_LIMITS: Record<AITier, number> = {
  free: 3,
  byok: 20,
  premium: 100,
};

export const AI_KEYS_LS = 'daneshyar_ai_keys';
export const AI_USAGE_LS = 'daneshyar_ai_usage';
export const PREMIUM_LS = 'daneshyar_premium';