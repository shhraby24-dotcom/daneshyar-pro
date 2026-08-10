/**
 * ============================================================
 * دانش‌یار پرو - پیکربندی Supabase
 * ============================================================
 * مقادیر را از Supabase → Settings → API بردار و جایگذاری کن.
 * تا وقتی جایگذاری نشده، اپ در حالت «مهمان» (local) می‌ماند.
 * @module config/supabase
 * @version 1.0.0
 */
export const SUPABASE_URL = 'https://ueyuyyachmdjnbiteybp.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_Mpg37q1fCLCioBautf2rJQ_VC_SyzUC';

/** فقط وقتی فعال است که مقادیر واقعی گذاشته شده باشند */
export const SUPABASE_ENABLED =
  !SUPABASE_URL.includes('YOUR_PROJECT') && !SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY');