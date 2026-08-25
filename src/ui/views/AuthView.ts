/**
 * ============================================================
 * دانش‌یار پرو - AuthView (ورود/ثبت‌نام + مهمان + دعوت)
 * ============================================================
 * ✅ اگر کاربر وارد شده باشد، فرم را نشان نمی‌دهد
 *    (به‌جایش کارت «شما وارد شده‌اید»)
 * ✅ نمایش/پنهان رمز با آیکون Lucide (نه استیکر)
 * ✅ سایز فونت یکپارچه و منظم
 * ✅ پردازش کد دعوت بعد از ثبت‌نام موفق
 * @module ui/views/AuthView
 * @version 3.0.0
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getRouter } from '@/core/Router';
import { signIn, signUp, signOut, getCurrentUser, isSupabaseEnabled } from '@/services/AuthService';
import { processReferralOnSignup } from '@/services/ReferralService';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '@/ui/components/Button';
import { createInput, createFormGroup } from '@/ui/components/Input';
import { getToast } from '@/ui/components/Toast';
import { syncAll } from '@/services/SyncService';
import { loadSubscription } from '@/services/SubscriptionService';
import { toPersianDigits } from '@/utils/dateFormatter';
import { createIcon, iconHTML } from '@/services/IconService';

const logger = getLogger().module('AuthView');

export async function createAuthView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر AuthView');
  const container = document.createElement('div');
  container.className = 'mx-auto max-w-md space-y-6';

  // ── اگر کاربر وارد شده باشد، فرم را نشان نده ──
  const user = await getCurrentUser();
  if (user) {
    return buildLoggedIn(container, user.email ?? 'کاربر');
  }
  return buildForm(container);
}

// ============================================================
// حالت «وارد شده» — به‌جای فرم
// ============================================================
function buildLoggedIn(container: HTMLElement, email: string): HTMLElement {
  const card = document.createElement('div');
  card.className = 'bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center space-y-4';

  const iconWrap = document.createElement('div');
  iconWrap.className = 'flex justify-center text-green-400';
  iconWrap.appendChild(createIcon('check', 48));
  card.appendChild(iconWrap);

  const title = document.createElement('h1');
  title.className = 'text-xl font-bold text-slate-100';
  title.textContent = 'شما وارد حساب شده‌اید';
  card.appendChild(title);

  const emailEl = document.createElement('div');
  emailEl.className = 'text-sm text-slate-400';
  emailEl.dir = 'ltr';
  emailEl.textContent = email;
  card.appendChild(emailEl);

  const dashBtn = createButton({
    label: 'رفتن به داشبورد',
    iconHtml: iconHTML('dashboard', 18),
    variant: BUTTON_VARIANTS.PRIMARY,
    size: BUTTON_SIZES.MD,
    onClick: () => { getRouter().navigate('dashboard'); },
  });
  dashBtn.classList.add('w-full');
  card.appendChild(dashBtn);

  const outBtn = createButton({
    label: 'خروج از این حساب',
    iconHtml: iconHTML('logout', 18),
    variant: BUTTON_VARIANTS.GHOST,
    size: BUTTON_SIZES.SM,
    onClick: async () => {
      await signOut();
      getToast().success('از حساب خارج شدی');
      getRouter().navigate('auth');
    },
  });
  outBtn.classList.add('w-full');
  card.appendChild(outBtn);

  container.appendChild(card);
  return container;
}

// ============================================================
// فرم ورود/ثبت‌نام
// ============================================================
function buildForm(container: HTMLElement): HTMLElement {
  const urlRef = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('ref');
  let mode: 'login' | 'signup' = urlRef ? 'signup' : 'login';

  const render = (): void => {
    container.innerHTML = '';

    // ── هدر با سایز منظم ──
    const header = document.createElement('div');
    header.className = 'text-center space-y-2';
    const em = document.createElement('div');
    em.className = 'flex justify-center text-primary-400';
    em.appendChild(createIcon('user', 48));
    const t = document.createElement('h1');
    t.className = 'text-2xl font-bold text-slate-100';
    t.textContent = mode === 'login' ? 'ورود' : 'ثبت‌نام';
    const s = document.createElement('p');
    s.className = 'text-sm text-slate-400';
    s.textContent = mode === 'login'
      ? 'به حسابت وارد شو تا داده‌هایت بین دستگاه‌ها سینک شوند'
      : 'حساب بساز تا یادداشت‌ها و کارت‌هایت همیشه همراهت باشند';
    header.appendChild(em);
    header.appendChild(t);
    header.appendChild(s);
    container.appendChild(header);

    // ── بنر دعوت ──
    if (urlRef) {
      const refBanner = document.createElement('div');
      refBanner.className = 'bg-primary-500/10 border border-primary-500/30 rounded-xl p-4 text-center space-y-1';
      refBanner.innerHTML = `
        <div class="flex justify-center text-primary-400">${iconHTML('gift', 28)}</div>
        <div class="font-bold text-primary-300">دعوت شده‌ای!</div>
        <div class="text-xs text-slate-400">بعد از ثبت‌نام، ۳ روز پریمیوم هدیه می‌گیری</div>
      `;
      container.appendChild(refBanner);
    }

    // ── هشدار سرویس ابری ──
    if (!isSupabaseEnabled()) {
      const note = document.createElement('div');
      note.className = 'bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 text-sm text-amber-200';
      note.textContent = 'سرویس ابری هنوز پیکربندی نشده. فعلاً می‌توانی به‌صورت مهمان ادامه دهی.';
      container.appendChild(note);
    }

    // ── فرم ──
    const form = document.createElement('div');
    form.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-4';

    const emailInput = createInput({ type: 'email', placeholder: 'you@example.com' });
    emailInput.dir = 'ltr';
    form.appendChild(createFormGroup({ label: 'ایمیل', input: emailInput, required: true }));

    // ── رمز عبور با آیکون چشم (Lucide) ──
    const passWrap = document.createElement('div');
    passWrap.className = 'relative';
    const passInput = document.createElement('input');
    passInput.type = 'password';
    passInput.className = 'input w-full pe-11';
    passInput.placeholder = 'رمز عبور';
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.setAttribute('aria-label', 'نمایش یا پنهان کردن رمز');
    toggleBtn.className = 'absolute end-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1.5 rounded';
    let visible = false;
    const paintToggle = (): void => {
      toggleBtn.innerHTML = iconHTML(visible ? 'eyeoff' : 'eye', 18);
      passInput.type = visible ? 'text' : 'password';
    };
    paintToggle();
    toggleBtn.addEventListener('click', () => { visible = !visible; paintToggle(); });
    passWrap.appendChild(passInput);
    passWrap.appendChild(toggleBtn);
    form.appendChild(createFormGroup({ label: 'رمز عبور', input: passWrap, required: true }));

    // ── دکمه ارسال ──
    const submit = createButton({
      label: mode === 'login' ? 'ورود' : 'ثبت‌نام',
      iconHtml: iconHTML(mode === 'login' ? 'login' : 'plus', 18),
      variant: BUTTON_VARIANTS.PRIMARY,
      size: BUTTON_SIZES.LG,
      onClick: async () => {
        const email = emailInput.value.trim();
        const pass = passInput.value;
        if (!email || !pass) { getToast().error('ایمیل و رمز را وارد کن'); return; }
        submit.disabled = true;
        const res = mode === 'login' ? await signIn(email, pass) : await signUp(email, pass);
        submit.disabled = false;
        if (res.ok) {
          getToast().success(mode === 'login' ? 'خوش آمدی!' : 'حساب ساخته شد! ایمیل تایید را چک کن');
          void syncAll();
          void loadSubscription();
          if (mode === 'signup') {
            setTimeout(async () => {
              try {
                const refResult = await processReferralOnSignup();
                if (refResult.ok) {
                  getToast().success(`${toPersianDigits(String(refResult.rewardDays ?? 3))} روز پریمیوم هدیه گرفتی!`);
                  void loadSubscription();
                } else if (refResult.error && refResult.error !== 'no_ref') {
                  logger.debug('نتیجه دعوت', refResult);
                }
              } catch (e) {
                logger.warn('خطا در پردازش دعوت', e);
              }
            }, 2500);
          }
          getRouter().navigate('dashboard');
        } else {
          getToast().error(res.error ?? 'خطا رخ داد');
        }
      },
    });
    submit.classList.add('w-full');
    form.appendChild(submit);

    // ── سوییچ ورود/ثبت‌نام ──
    const toggle = createButton({
      label: mode === 'login' ? 'حساب نداری؟ ثبت‌نام کن' : 'حساب داری؟ وارد شو',
      variant: BUTTON_VARIANTS.GHOST,
      size: BUTTON_SIZES.SM,
      onClick: () => { mode = mode === 'login' ? 'signup' : 'login'; render(); },
    });
    toggle.classList.add('w-full');
    form.appendChild(toggle);

    container.appendChild(form);

    // ── دکمه مهمان ──
    const guest = createButton({
      label: 'ادامه به‌عنوان مهمان',
      iconHtml: iconHTML('user', 18),
      variant: BUTTON_VARIANTS.SECONDARY,
      size: BUTTON_SIZES.MD,
      onClick: () => { getRouter().navigate('dashboard'); },
    });
    guest.classList.add('w-full');
    container.appendChild(guest);
  };

  render();
  return container;
}

export default createAuthView;