/**
 * ============================================================
 * دانش‌یار پرو - AuthService (singleton Supabase client)
 * ============================================================
 * ✅ ایمیل/رمز (سازگار با نسخه‌ی قبل — همان امضاها)
 * ✅ Google OAuth
 * ✅ بازیابی رمز و تأیید ایمیل (OTP)
 * ✅ مدیریت نشست/دستگاه (در حد امکان کلاینت)
 * ✅ لیست سیاه ایمیل موقت (لایه ۲ ضد کلاهبرداری)
 * ✅ رویدادهای EventBus: auth:login / auth:logout / auth:session_changed
 * @module services/AuthService
 * @version 2.0.0
 */
import { createClient, type SupabaseClient, type Session, type User } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_ENABLED } from '@/config/supabase';
import { isTempEmail } from '@/config/tempEmailBlacklist';
import { getInstance as getLogger } from '@/core/Logger';
import { getInstance as getEventBus, EVENTS } from '@/core/EventBus';
import { AppError } from '@/core/Errors';

const logger = getLogger().module('AuthService');

let client: SupabaseClient | null = null;

/** نشانی بازگشت بعد از OAuth/بازیابی رمز — hash-based routing پروژه */
function authRedirectUrl(): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/auth`;
}

function fail(message: string, cause?: unknown, context?: Record<string, unknown>): never {
  logger.error(message, context ?? {});
  throw new AppError(message, {
    code: 'AUTH_FAILED',
    context: { ...(context ?? {}), cause: cause instanceof Error ? cause.message : String(cause ?? '') },
    cause: cause instanceof Error ? cause : null,
    userFriendly: true,
  });
}

function emitAuthEvent(name: string, payload: Record<string, unknown> = {}): void {
  void getEventBus().emit(name, payload);
}

/** singleton — فقط یک بار ساخته می‌شود */
function getClient(): SupabaseClient | null {
  if (!SUPABASE_ENABLED) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

/** برای استفاده در SyncService (همان instance) */
export function getSupabaseClient(): SupabaseClient | null {
  return getClient();
}

/** re-export نوع SupabaseClient برای SyncService */
export type { SupabaseClient } from '@supabase/supabase-js';

export function isSupabaseEnabled(): boolean { return SUPABASE_ENABLED; }

/** آیا ایمیل در لیست سیاه سرویس‌های موقت است؟ */
export { isTempEmail };

// ============================================================
// ایمیل + رمز (سازگار با نسخه ۱)
// ============================================================

export async function signUp(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const c = getClient();
  if (!c) return { ok: false, error: 'سرویس ابری فعال نیست' };

  // لایه ۲ ضد کلاهبرداری: ایمیل موقت
  if (isTempEmail(email)) {
    logger.warn('ثبت‌نام با ایمیل موقت مسدود شد', { email });
    return { ok: false, error: 'ایمیل‌های موقت پذیرفته نمی‌شوند. لطفاً ایمیل واقعی وارد کن.' };
  }

  const { error } = await c.auth.signUp({ email, password, options: { emailRedirectTo: authRedirectUrl() } });
  if (error) { logger.warn('signUp failed', error.message); return { ok: false, error: error.message }; }
  logger.info('ثبت‌نام موفق', { email });
  return { ok: true };
}

export async function signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const c = getClient();
  if (!c) return { ok: false, error: 'سرویس ابری فعال نیست' };
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) { logger.warn('signIn failed', error.message); return { ok: false, error: error.message }; }
  logger.info('ورود موفق', { email });
  emitAuthEvent(EVENTS.AUTH_LOGIN, { method: 'password' });
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const c = getClient();
  if (c) await c.auth.signOut();
  logger.info('خروج از حساب');
  emitAuthEvent(EVENTS.AUTH_LOGOUT, { scope: 'local' });
}

export async function getSession(): Promise<Session | null> {
  const c = getClient();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session;
}

export async function getCurrentUser(): Promise<User | null> {
  const s = await getSession();
  return s?.user ?? null;
}

/**
 * گوش دادن به تغییرات auth (زنده‌شده — قبلاً کد مرده بود).
 * هم callback را صدا می‌زند، هم EventBus را publish می‌کند.
 */
export function onAuthChange(cb: (user: User | null) => void): () => void {
  const c = getClient();
  if (!c) return () => {};
  const { data } = c.auth.onAuthStateChange((event, session) => {
    const user = session?.user ?? null;
    logger.debug('auth state changed', { event, hasUser: Boolean(user) });
    emitAuthEvent(EVENTS.AUTH_SESSION_CHANGED, { event, hasUser: Boolean(user) });
    cb(user);
  });
  return () => data.subscription.unsubscribe();
}

// ============================================================
// Google OAuth
// ============================================================

/**
 * ورود/ثبت‌نام با گوگل.
 * ⚠️ نیازمند فعال بودن provider گوگل در Supabase Dashboard (Authentication → Providers).
 * پس از موفقیت مرورگر به `#/auth` برمی‌گردد و نشست خودکار برقرار می‌شود.
 */
export async function signInWithGoogle(): Promise<void> {
  const c = getClient();
  if (!c) fail('سرویس ابری فعال نیست', undefined, { op: 'signInWithGoogle' });

  const { error } = await c!.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: authRedirectUrl(), queryParams: { prompt: 'select_account' } },
  });
  if (error) fail('ورود با گوگل ناموفق بود', error, { op: 'signInWithGoogle' });
  logger.info('OAuth گوگل آغاز شد');
  emitAuthEvent(EVENTS.AUTH_LOGIN, { method: 'google' });
}

/** آدرس برگشت OAuth — برای نمایش/تست */
export const OAUTH_REDIRECT_URL = authRedirectUrl();

// ============================================================
// بازیابی رمز و تأیید ایمیل
// ============================================================

/** ارسال ایمیل بازیابی رمز عبور */
export async function resetPasswordForEmail(email: string): Promise<void> {
  const c = getClient();
  if (!c) fail('سرویس ابری فعال نیست', undefined, { op: 'resetPassword' });
  if (isTempEmail(email)) fail('ایمیل‌های موقت پذیرفته نمی‌شوند', undefined, { op: 'resetPassword' });

  const { error } = await c!.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() });
  if (error) fail('ارسال ایمیل بازیابی ناموفق بود', error, { op: 'resetPassword', email });
  logger.info('ایمیل بازیابی رمز ارسال شد', { email });
}

/** تأیید ایمیل با کد OTP */
export async function verifyOtp(email: string, token: string): Promise<void> {
  const c = getClient();
  if (!c) fail('سرویس ابری فعال نیست', undefined, { op: 'verifyOtp' });
  const { error } = await c!.auth.verifyOtp({ email, token, type: 'email' });
  if (error) fail('کد تأیید نامعتبر یا منقضی است', error, { op: 'verifyOtp', email });
  logger.info('ایمیل تأیید شد', { email });
  emitAuthEvent(EVENTS.AUTH_LOGIN, { method: 'email_otp' });
}

/** ارسال مجدد ایمیل تأیید ثبت‌نام */
export async function resendVerification(email: string): Promise<void> {
  const c = getClient();
  if (!c) fail('سرویس ابری فعال نیست', undefined, { op: 'resendVerification' });
  const { error } = await c!.auth.resend({ type: 'signup', email, options: { emailRedirectTo: authRedirectUrl() } });
  if (error) fail('ارسال مجدد ایمیل تأیید ناموفق بود', error, { op: 'resendVerification', email });
  logger.info('ایمیل تأیید مجدداً ارسال شد', { email });
}

// ============================================================
// مدیریت نشست / دستگاه
// ============================================================

export interface AuthSessionInfo {
  id: string;
  device: string;
  lastActive: string;
  ip: string | null;
  current: boolean;
}

const SESSIONS_ENDPOINT = `${SUPABASE_URL}/functions/v1/auth-sessions`;

/**
 * فهرست نشست‌های فعال کاربر.
 * ⚠️ SDK کلاینت Supabase چنین API‌ای ندارد (فقط `auth.admin.*` با service_role).
 * این متد تلاش می‌کند از تابع سروری `auth-sessions` بخواند؛ اگر موجود نباشد
 * یک لیست خالی برمی‌گرداند و هشدار لاگ می‌کند (بدون شکستن UI).
 */
export async function getActiveSessions(): Promise<AuthSessionInfo[]> {
  const c = getClient();
  const session = await getSession();
  if (!c || !session) return [];

  try {
    const res = await fetch(SESSIONS_ENDPOINT, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { sessions?: AuthSessionInfo[] };
    return Array.isArray(data.sessions) ? data.sessions : [];
  } catch (e) {
    logger.warn('فهرست نشست‌ها در دسترس نیست (نیازمند تابع سروری auth-sessions)', {
      error: e instanceof Error ? e.message : String(e),
    });
    return [];
  }
}

/**
 * خروج از یک دستگاه مشخص.
 * ⚠️ فقط با تابع سروری امکان‌پذیر است؛ در نبود آن خطای شفاف می‌دهد
 * تا کاربر به‌اشتباه فکر نکند فقط یک دستگاه خارج شده است.
 */
export async function signOutDevice(sessionId: string): Promise<void> {
  const session = await getSession();
  if (!session) fail('نشستی برای خروج وجود ندارد', undefined, { op: 'signOutDevice' });

  try {
    const res = await fetch(SESSIONS_ENDPOINT, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session!.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    logger.info('دستگاه خارج شد', { sessionId });
    emitAuthEvent(EVENTS.AUTH_LOGOUT, { scope: 'device', sessionId });
  } catch (e) {
    fail('خروج از یک دستگاه نیازمند تابع سروری auth-sessions است؛ از «خروج از همه» استفاده کن', e, {
      op: 'signOutDevice',
      sessionId,
    });
  }
}

/** خروج از همه‌ی دستگاه‌ها (global sign-out) */
export async function signOutAll(): Promise<void> {
  const c = getClient();
  if (!c) fail('سرویس ابری فعال نیست', undefined, { op: 'signOutAll' });
  const { error } = await c!.auth.signOut({ scope: 'global' });
  if (error) fail('خروج از همه دستگاه‌ها ناموفق بود', error, { op: 'signOutAll' });
  logger.info('خروج از همه دستگاه‌ها');
  emitAuthEvent(EVENTS.AUTH_LOGOUT, { scope: 'global' });
}
