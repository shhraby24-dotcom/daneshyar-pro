/**
 * ============================================================
 * دانش‌یار پرو - AuthService
 * ============================================================
 * ثبت‌نام/ورود/خروج + session + onAuthChange (Supabase)
 * اگر Supabase پیکربندی نشده باشد، همه‌چیز no-op می‌شود.
 * @module services/AuthService
 * @version 1.0.0
 */
import { createClient, type SupabaseClient, type Session, type User } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_ENABLED } from '@/config/supabase';
import { getInstance as getLogger } from '@/core/Logger';

const logger = getLogger().module('AuthService');

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (!SUPABASE_ENABLED) return null;
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

export function isSupabaseEnabled(): boolean { return SUPABASE_ENABLED; }

export async function signUp(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const c = getClient();
  if (!c) return { ok: false, error: 'سرویس ابری فعال نیست' };
  const { error } = await c.auth.signUp({ email, password });
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
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const c = getClient();
  if (c) await c.auth.signOut();
  logger.info('خروج از حساب');
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

export function onAuthChange(cb: (user: User | null) => void): () => void {
  const c = getClient();
  if (!c) return () => {};
  const { data } = c.auth.onAuthStateChange((_event, session) => cb(session?.user ?? null));
  return () => data.subscription.unsubscribe();
}