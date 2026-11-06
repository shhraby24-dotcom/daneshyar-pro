/**
 * ============================================================
 * دانش‌یار پرو - AuthStore (وضعیت مرکزی احراز هویت)
 * ============================================================
 * چرا فایل جدا و نه AppState؟
 * `AppState` در `State.ts` با PERSIST_KEYS در localStorage ذخیره می‌شود؛
 * گذاشتن `User`/`Session` آنجا یعنی توکن‌ها در دو جا ذخیره شوند و تایپ‌های
 * persistence بشکنند. این store در حافظه است و از Supabase منبع می‌گیرد.
 *
 * ✅ singleton، بدون وابستگی به DOM
 * ✅ مشترک بین viewها (حذف فراخوانی‌های پراکنده‌ی getCurrentUser)
 * @module core/authStore
 * @version 1.0.0
 */
import type { Session, User } from '@supabase/supabase-js';
import { getInstance as getLogger } from '@/core/Logger';
import { getSession, onAuthChange, isSupabaseEnabled } from '@/services/AuthService';

const logger = getLogger().module('AuthStore');

export interface AuthSnapshot {
  user: User | null;
  session: Session | null;
  /** true تا وقتی اولین خواندن نشست تمام نشده */
  isLoading: boolean;
  isAuthenticated: boolean;
}

export type AuthListener = (snapshot: AuthSnapshot) => void;

class AuthStore {
  private snap: AuthSnapshot = {
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  };

  private listeners = new Set<AuthListener>();
  private started = false;
  private unsubscribeAuth: (() => void) | null = null;

  /** idempotent — چند بار صدا زدن مشکلی ندارد */
  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    if (!isSupabaseEnabled()) {
      this.patch({ isLoading: false, user: null, session: null, isAuthenticated: false });
      logger.info('Supabase فعال نیست — store در حالت مهمان');
      return;
    }

    this.unsubscribeAuth = onAuthChange((user) => {
      void this.refresh().then(() => {
        logger.debug('store با تغییر auth همگام شد', { hasUser: Boolean(user) });
      });
    });

    await this.refresh();
  }

  /** خواندن تازه از Supabase */
  async refresh(): Promise<AuthSnapshot> {
    try {
      const session = await getSession();
      this.patch({
        session,
        user: session?.user ?? null,
        isAuthenticated: Boolean(session?.user),
        isLoading: false,
      });
    } catch (e) {
      logger.warn('خواندن نشست ناموفق بود', { error: e instanceof Error ? e.message : String(e) });
      this.patch({ isLoading: false });
    }
    return this.snapshot();
  }

  /** وضعیت فعلی (کپی، تا caller نتواند mutate کند) */
  snapshot(): AuthSnapshot {
    return { ...this.snap };
  }

  /** نام مستعار کوتاه */
  get(): AuthSnapshot { return this.snapshot(); }

  subscribe(fn: AuthListener): () => void {
    this.listeners.add(fn);
    // مقدار اولیه را فوراً می‌دهد تا UI بلافاصله رندر شود
    fn(this.snapshot());
    return () => { this.listeners.delete(fn); };
  }

  /** برای حالت‌های خاص (مثلاً بعد از OAuth که SDK خودش نشست را می‌سازد) */
  setSession(session: Session | null): void {
    this.patch({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.user),
      isLoading: false,
    });
  }

  /** فقط برای تست */
  reset(): void {
    this.unsubscribeAuth?.();
    this.unsubscribeAuth = null;
    this.started = false;
    this.snap = { user: null, session: null, isLoading: true, isAuthenticated: false };
  }

  private patch(next: Partial<AuthSnapshot>): void {
    this.snap = { ...this.snap, ...next };
    const copy = this.snapshot();
    this.listeners.forEach((fn) => {
      try { fn(copy); } catch (e) { logger.warn('listener خطا داد', e); }
    });
  }
}

let instance: AuthStore | null = null;

/** singleton — مثل بقیه‌ی core */
export function getAuthStore(): AuthStore {
  if (!instance) instance = new AuthStore();
  return instance;
}

export type { AuthStore };
