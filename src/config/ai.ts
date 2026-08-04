/**
 * دانش‌یار پرو - پیکربندی AI
 * ⬇️ کلیدهای توسعه‌دهنده را یک‌بار اینجا بگذار
 * @module config/ai
 */
export const AI_CONFIG = {
  DEV_GEMINI_KEY: '', // ← کلید Gemini تو
  DEV_GROQ_KEY: '',   // ← کلید Groq تو
  GEMINI_MODEL: 'gemini-2.0-flash',
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