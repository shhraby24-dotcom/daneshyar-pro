/**
 * ============================================================
 * دانش‌یار پرو - AuthView (ورود/ثبت‌نام + مهمان)
 * ============================================================
 * فرم ایمیل/رمز با سوییچ ورود↔ثبت‌نام + دکمه مهمان.
 * @module ui/views/AuthView
 * @version 1.0.0
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getRouter } from '@/core/Router';
import { signIn, signUp, isSupabaseEnabled } from '@/services/AuthService';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '@/ui/components/Button';
import { createInput, createPasswordInput, createFormGroup } from '@/ui/components/Input';
import { getToast } from '@/ui/components/Toast';
import { syncAll } from '@/services/SyncService';
import { loadSubscription } from '@/services/SubscriptionService';
import { processReferralOnSignup } from '@/services/ReferralService';
import { toPersianDigits } from '@/utils/dateFormatter';

const logger = getLogger().module('AuthView');

export async function createAuthView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر AuthView');
  const container = document.createElement('div');
  container.className = 'mx-auto max-w-md space-y-6';
  let mode: 'login' | 'signup' = 'login';

  const render = (): void => {
    container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'text-center space-y-2';
    const em = document.createElement('div'); em.className = 'text-6xl'; em.textContent = '👤';
    const t = document.createElement('h1'); t.className = 'text-3xl font-black text-slate-100';
    t.textContent = mode === 'login' ? 'ورود' : 'ثبت‌نام';
    const s = document.createElement('p'); s.className = 'text-sm text-slate-400';
    s.textContent = mode === 'login'
      ? 'به حسابت وارد شو تا داده‌هایت بین دستگاه‌ها سینک شوند'
      : 'حساب بساز تا یادداشت‌ها و کارت‌هایت همیشه همراهت باشند';
    header.appendChild(em); header.appendChild(t); header.appendChild(s);
    container.appendChild(header);

    if (!isSupabaseEnabled()) {
      const note = document.createElement('div');
      note.className = 'bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 text-sm text-amber-200';
      note.textContent = 'سرویس ابری هنوز پیکربندی نشده (src/config/supabase.ts). فعلاً می‌توانی به‌صورت مهمان ادامه دهی.';
      container.appendChild(note);
    }

    const form = document.createElement('div');
    form.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-4';

    const emailInput = createInput({ type: 'email', placeholder: 'you@example.com' });
    emailInput.dir = 'ltr';
    form.appendChild(createFormGroup({ label: 'ایمیل', input: emailInput, required: true }));

    const passWrap = createPasswordInput({ placeholder: 'رمز عبور' });
    const passInput = passWrap.querySelector('input') as HTMLInputElement;
    form.appendChild(createFormGroup({ label: 'رمز عبور', input: passWrap, required: true }));

    const submit = createButton({
      label: mode === 'login' ? '🔑 ورود' : '✨ ثبت‌نام',
      variant: BUTTON_VARIANTS.PRIMARY, size: BUTTON_SIZES.LG,
      onClick: async () => {
        const email = emailInput.value.trim();
        const pass = passInput.value;
        if (!email || !pass) { getToast().error('ایمیل و رمز را وارد کن'); return; }
        const res = mode === 'login' ? await signIn(email, pass) : await signUp(email, pass);
        if (res.ok) {
          getToast().success(mode === 'login' ? 'خوش آمدی! 🎉' : 'حساب ساخته شد! 📩');
          void syncAll();
          void loadSubscription();
          // ⬇️ پردازش دعوت (فقط برای ثبت‌نام جدید، در پس‌زمینه)
          if (mode === 'signup') {
            setTimeout(async () => {
              const refResult = await processReferralOnSignup();
              if (refResult.ok) {
                getToast().success(`🎁 ${toPersianDigits(String(refResult.rewardDays ?? 3))} روز پریمیوم هدیه گرفتی!`);
              }
            }, 2000);
          }
          getRouter().navigate('dashboard');
        } else {
          getToast().error(res.error ?? 'خطا رخ داد');
        }
      },
    });
    submit.classList.add('w-full');
    form.appendChild(submit);

    const toggle = createButton({
      label: mode === 'login' ? 'حساب نداری؟ ثبت‌نام کن' : 'حساب داری؟ وارد شو',
      variant: BUTTON_VARIANTS.GHOST, size: BUTTON_SIZES.SM,
      onClick: () => { mode = mode === 'login' ? 'signup' : 'login'; render(); },
    });
    toggle.classList.add('w-full');
    form.appendChild(toggle);

    container.appendChild(form);

    const guest = createButton({
      label: '👤 ادامه به‌عنوان مهمان',
      variant: BUTTON_VARIANTS.SECONDARY, size: BUTTON_SIZES.MD,
      onClick: () => { getRouter().navigate('dashboard'); },
    });
    guest.classList.add('w-full');
    container.appendChild(guest);
  };

  render();
  return container;
}

export default createAuthView;