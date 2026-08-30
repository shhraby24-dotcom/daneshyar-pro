/**
 * ============================================================
 * دانش‌یار پرو - پیکربندی API
 * ============================================================
 * در development: استفاده از Vite proxy (بدون CORS)
 * در production: مستقیم به API (نیاز به Edge Function)
 * @module config/api
 * @version 1.0.0
 */

export const API_BASE = {
  /** Gemini API base URL */
  gemini: import.meta.env.DEV ? '/api/gemini' : 'https://generativelanguage.googleapis.com/v1beta/models',
  /** Groq API base URL */
  groq: import.meta.env.DEV ? '/api/groq' : 'https://api.groq.com/openai/v1',
};