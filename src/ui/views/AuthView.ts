/**
 * ============================================================
 * دانش‌یار پرو - AuthView (ورود/ثبت‌نام + گوگل + بازیابی رمز)
 * ============================================================
 * ✅ Google OAuth (بالای فرم)
 * ✅ تب‌های ورود / ثبت‌نام
 * ✅ تأیید ایمیل: صفحه‌ی انتظار + ارسال مجدد (به‌جای پرش بی‌دلیل به داشبورد)
 * ✅ فراموشی رمز: فرم ارسال لینک بازیابی
 * ✅ وضعیت‌های loading و خطاهای واضح
 * ✅ پردازش کد دعوت بعد از ثبت‌نام (مثل قبل)
 * @module ui/views/AuthView
 * @version 4.0.0
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getRouter } from '@/core/Router';
import { getAuthStore } from '@/core/authStore';
import {
  signIn, signUp, signOut, signInWithGoogle,
  resetPasswordForEmail, resendVerification, isSupabaseEnabled,
} from '@/services/AuthService';
import { processReferralOnSignup } from '@/services/ReferralService';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '@/ui/components/Button';
import { createInput, createFormGroup } from '@/ui/components/Input';
import { getToast } from '@/ui/components/Toast';
import { syncAll } from '@/services/SyncService';
import { loadSubscription } from '@/services/SubscriptionService';
import { toPersianDigits } from '@/utils/dateFormatter';
import { createIcon, iconHTML } from '@/services/IconService';

const logger = getLogger().module('AuthView');

/** آیکون رسمی گوگل — markup ثابت و مورد اعتماد (بدون داده‌ی کاربر) */
const GOOGLE_ICON_SVG = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/>
<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
</svg>`;

type FsView = 'form' | 'verify' | 'forgot' | 'loggedIn';

export async function createAuthView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر AuthView');
  const container = document.createElement('div');
  container.className = 'mx-auto max-w-md space-y-6';

  // ── وضعیت اولیه از store مرکزی (نه فراخوانی پراکنده) ──
  const store = getAuthStore();
  const snap = store.snapshot();
  const user = snap.user ?? (await store.refresh()).user ?? null;

  if (user) {
    return buildLoggedIn(container, user.email ?? 'کاربر');
  }
  return buildForm(container);
}

// ============================================================
// حالت «وارد شده»
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
// فرم اصلی (با تب ورود/ثبت‌نام)
// ============================================================
function buildForm(root: HTMLElement): HTMLElement {
  const urlRef = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('ref');
  let mode: 'login' | 'signup' = urlRef ? 'signup' : 'login';
  let view: FsView = 'form';
  let pendingEmail = '';

  const paint = (): void => {
    root.innerHTML = '';
    if (view === 'loggedIn') { root.appendChild(buildLoggedIn(document.createElement('div'), pendingEmail)); return; }
    if (view === 'verify') { root.appendChild(buildVerify(pendingEmail, () => { view = 'form'; paint(); })); return; }
    if (view === 'forgot') { root.appendChild(buildForgot(() => { view = 'form'; paint(); })); return; }
    root.appendChild(buildHeader(mode));
    if (urlRef) root.appendChild(buildRefBanner());
    if (!isSupabaseEnabled()) root.appendChild(buildCloudNote());
    root.appendChild(buildGoogleButton(mode));
    root.appendChild(buildDivider());
    root.appendChild(buildTabs(mode, (m) => { mode = m; paint(); }));
    root.appendChild(buildCredentialsForm(mode, {
      onNeedsVerification: (email) => { pendingEmail = email; view = 'verify'; paint(); },
      onForgot: () => { view = 'forgot'; paint(); },
    }));
    root.appendChild(buildGuestButton());
  };

  paint();
  return root;
}

// ── قطعات ──

function buildHeader(mode: 'login' | 'signup'): HTMLElement {
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
  return header;
}

function buildRefBanner(): HTMLElement {
  const refBanner = document.createElement('div');
  refBanner.className = 'bg-primary-500/10 border border-primary-500/30 rounded-xl p-4 text-center space-y-1';
  refBanner.innerHTML = `
    <div class="flex justify-center text-primary-400">${iconHTML('gift', 28)}</div>
    <div class="font-bold text-primary-300">دعوت شده‌ای!</div>
    <div class="text-xs text-slate-400">بعد از ثبت‌نام، ۳ روز پریمیوم هدیه می‌گیری</div>
  `;
  return refBanner;
}

function buildCloudNote(): HTMLElement {
  const note = document.createElement('div');
  note.className = 'bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 text-sm text-amber-200';
  note.textContent = 'سرویس ابری هنوز پیکربندی نشده. فعلاً می‌توانی به‌صورت مهمان ادامه دهی.';
  return note;
}

function buildGoogleButton(mode: 'login' | 'signup'): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'space-y-2';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'w-full flex items-center justify-center gap-3 rounded-xl bg-white text-slate-800 font-bold py-3 px-4 border border-slate-300 hover:bg-slate-100 active:scale-[.99] transition disabled:opacity-60 disabled:cursor-not-allowed';
  const label = document.createElement('span');
  label.textContent = mode === 'login' ? 'ورود با گوگل' : 'ثبت‌نام با گوگل';
  const icon = document.createElement('span');
  icon.className = 'flex items-center';
  icon.innerHTML = GOOGLE_ICON_SVG;
  btn.appendChild(icon);
  btn.appendChild(label);

  btn.addEventListener('click', async () => {
    if (!isSupabaseEnabled()) { getToast().error('سرویس ابری پیکربندی نشده است'); return; }
    btn.disabled = true;
    label.textContent = 'در حال انتقال به گوگل…';
    try {
      await signInWithGoogle();
      // مرورگر به گوگل می‌رود؛ اگر برگشت، store نشست را می‌گیرد
    } catch (e) {
      btn.disabled = false;
      label.textContent = mode === 'login' ? 'ورود با گوگل' : 'ثبت‌نام با گوگل';
      getToast().error(e instanceof Error ? e.message : 'ورود با گوگل ناموفق بود');
    }
  });

  wrap.appendChild(btn);
  return wrap;
}

function buildDivider(): HTMLElement {
  const d = document.createElement('div');
  d.className = 'flex items-center gap-3 text-xs text-slate-500';
  d.innerHTML = '<span class="h-px flex-1 bg-slate-700"></span><span>یا با ایمیل</span><span class="h-px flex-1 bg-slate-700"></span>';
  return d;
}

function buildTabs(mode: 'login' | 'signup', onSwitch: (m: 'login' | 'signup') => void): HTMLElement {
  const tabs = document.createElement('div');
  tabs.className = 'grid grid-cols-2 gap-1 rounded-xl bg-slate-900/60 p-1';

  const mk = (m: 'login' | 'signup', text: string): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    const active = m === mode;
    b.className = active
      ? 'rounded-lg py-2 text-sm font-bold bg-slate-700 text-slate-100'
      : 'rounded-lg py-2 text-sm text-slate-400 hover:text-slate-200';
    b.setAttribute('aria-pressed', String(active));
    b.addEventListener('click', () => { if (!active) onSwitch(m); });
    return b;
  };

  tabs.appendChild(mk('login', 'ورود'));
  tabs.appendChild(mk('signup', 'ثبت‌نام'));
  return tabs;
}

function buildPasswordField(): { wrap: HTMLElement; input: HTMLInputElement } {
  const wrap = document.createElement('div');
  wrap.className = 'relative';
  const input = document.createElement('input');
  input.type = 'password';
  input.className = 'input w-full pe-11';
  input.placeholder = 'رمز عبور';
  input.autocomplete = 'current-password';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'نمایش یا پنهان کردن رمز');
  toggle.className = 'absolute end-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1.5 rounded';
  let visible = false;
  const paint = (): void => {
    toggle.innerHTML = iconHTML(visible ? 'eyeoff' : 'eye', 18);
    input.type = visible ? 'text' : 'password';
  };
  paint();
  toggle.addEventListener('click', () => { visible = !visible; paint(); });

  wrap.appendChild(input);
  wrap.appendChild(toggle);
  return { wrap, input };
}

interface FormHooks {
  onNeedsVerification: (email: string) => void;
  onForgot: () => void;
}

function buildCredentialsForm(mode: 'login' | 'signup', hooks: FormHooks): HTMLElement {
  const form = document.createElement('div');
  form.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-4';

  const emailInput = createInput({ type: 'email', placeholder: 'you@example.com' });
  emailInput.dir = 'ltr';
  emailInput.autocomplete = 'email';
  form.appendChild(createFormGroup({ label: 'ایمیل', input: emailInput, required: true }));

  const { wrap: passWrap, input: passInput } = buildPasswordField();
  form.appendChild(createFormGroup({ label: 'رمز عبور', input: passWrap, required: true }));

  const submit = createButton({
    label: mode === 'login' ? 'ورود' : 'ثبت‌نام',
    iconHtml: iconHTML(mode === 'login' ? 'login' : 'plus', 18),
    variant: BUTTON_VARIANTS.PRIMARY,
    size: BUTTON_SIZES.LG,
    onClick: async () => {
      const email = emailInput.value.trim();
      const pass = passInput.value;

      if (!email) { getToast().error('ایمیل را وارد کن'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { getToast().error('ایمیل معتبر نیست'); return; }
      if (!pass) { getToast().error('رمز عبور را وارد کن'); return; }
      if (mode === 'signup' && pass.length < 8) { getToast().error('رمز باید حداقل ۸ کاراکتر باشد'); return; }

      submit.disabled = true;
      try {
        if (mode === 'login') {
          const res = await signIn(email, pass);
          if (!res.ok) { getToast().error(res.error ?? 'خطا رخ داد'); return; }
          getToast().success('خوش آمدی!');
          afterLogin();
          return;
        }

        // ── ثبت‌نام ──
        const res = await signUp(email, pass);
        if (!res.ok) { getToast().error(res.error ?? 'خطا رخ داد'); return; }

        // اگر تأیید ایمیل لازم باشد، نشستی ساخته نمی‌شود
        const snap = await getAuthStore().refresh();
        if (!snap.isAuthenticated) {
          hooks.onNeedsVerification(email);
          return;
        }
        getToast().success('حساب ساخته شد!');
        void handleSignupReferral();
        afterLogin();
      } finally {
        submit.disabled = false;
      }
    },
  });
  submit.classList.add('w-full');
  form.appendChild(submit);

  if (mode === 'login') {
    const forgot = document.createElement('button');
    forgot.type = 'button';
    forgot.className = 'w-full text-xs text-slate-400 hover:text-slate-200 underline';
    forgot.textContent = 'رمز عبور را فراموش کرده‌ام';
    forgot.addEventListener('click', hooks.onForgot);
    form.appendChild(forgot);
  }

  return form;
}

function buildGuestButton(): HTMLElement {
  const guest = createButton({
    label: 'ادامه به‌عنوان مهمان',
    iconHtml: iconHTML('user', 18),
    variant: BUTTON_VARIANTS.SECONDARY,
    size: BUTTON_SIZES.MD,
    onClick: () => { getRouter().navigate('dashboard'); },
  });
  guest.classList.add('w-full');
  return guest;
}

// ============================================================
// صفحه‌ی تأیید ایمیل
// ============================================================
function buildVerify(email: string, onBack: () => void): HTMLElement {
  const card = document.createElement('div');
  card.className = 'bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center space-y-4';

  const iconWrap = document.createElement('div');
  iconWrap.className = 'flex justify-center text-primary-400';
  iconWrap.appendChild(createIcon('mail', 48));
  card.appendChild(iconWrap);

  const title = document.createElement('h1');
  title.className = 'text-xl font-bold text-slate-100';
  title.textContent = 'ایمیلت را تأیید کن';
  card.appendChild(title);

  const desc = document.createElement('p');
  desc.className = 'text-sm text-slate-400';
  desc.textContent = 'لینک تأیید به این آدرس ارسال شد:';
  card.appendChild(desc);

  const emailEl = document.createElement('div');
  emailEl.className = 'text-sm font-bold text-slate-200';
  emailEl.dir = 'ltr';
  emailEl.textContent = email;
  card.appendChild(emailEl);

  const note = document.createElement('p');
  note.className = 'text-xs text-slate-500';
  note.textContent = 'بعد از کلیک روی لینک، دوباره وارد شو. اگر ایمیل را ندیدی، پوشه‌ی اسپم را چک کن.';
  card.appendChild(note);

  const resend = createButton({
    label: 'ارسال مجدد ایمیل تأیید',
    iconHtml: iconHTML('mail', 18),
    variant: BUTTON_VARIANTS.PRIMARY,
    size: BUTTON_SIZES.MD,
    onClick: async () => {
      resend.disabled = true;
      try {
        await resendVerification(email);
        getToast().success('ایمیل تأیید دوباره ارسال شد');
      } catch (e) {
        getToast().error(e instanceof Error ? e.message : 'ارسال مجدد ناموفق بود');
      } finally {
        resend.disabled = false;
      }
    },
  });
  resend.classList.add('w-full');
  card.appendChild(resend);

  const back = createButton({
    label: 'بازگشت به ورود',
    variant: BUTTON_VARIANTS.GHOST,
    size: BUTTON_SIZES.SM,
    onClick: onBack,
  });
  back.classList.add('w-full');
  card.appendChild(back);

  return card;
}

// ============================================================
// فراموشی رمز
// ============================================================
function buildForgot(onBack: () => void): HTMLElement {
  const card = document.createElement('div');
  card.className = 'bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4';

  const title = document.createElement('h1');
  title.className = 'text-xl font-bold text-slate-100 text-center';
  title.textContent = 'بازیابی رمز عبور';
  card.appendChild(title);

  const desc = document.createElement('p');
  desc.className = 'text-sm text-slate-400 text-center';
  desc.textContent = 'ایمیل حسابت را وارد کن تا لینک تغییر رمز برایت ارسال شود.';
  card.appendChild(desc);

  const emailInput = createInput({ type: 'email', placeholder: 'you@example.com' });
  emailInput.dir = 'ltr';
  card.appendChild(createFormGroup({ label: 'ایمیل', input: emailInput, required: true }));

  const send = createButton({
    label: 'ارسال لینک بازیابی',
    iconHtml: iconHTML('mail', 18),
    variant: BUTTON_VARIANTS.PRIMARY,
    size: BUTTON_SIZES.MD,
    onClick: async () => {
      const email = emailInput.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { getToast().error('ایمیل معتبر نیست'); return; }
      send.disabled = true;
      try {
        await resetPasswordForEmail(email);
        getToast().success('ایمیل بازیابی ارسال شد — صندوق ورودی را چک کن');
        onBack();
      } catch (e) {
        getToast().error(e instanceof Error ? e.message : 'ارسال ناموفق بود');
      } finally {
        send.disabled = false;
      }
    },
  });
  send.classList.add('w-full');
  card.appendChild(send);

  const back = createButton({
    label: 'بازگشت',
    variant: BUTTON_VARIANTS.GHOST,
    size: BUTTON_SIZES.SM,
    onClick: onBack,
  });
  back.classList.add('w-full');
  card.appendChild(back);

  return card;
}

// ============================================================
// کمک‌ها
// ============================================================

/** همگام‌سازی و اشتراک بعد از ورود — رفتار قبلی حفظ شده */
function afterLogin(): void {
  void syncAll();
  void loadSubscription();
  getRouter().navigate('dashboard');
}

/** پردازش کد دعوت بعد از ثبت‌نام — رفتار قبلی حفظ شده */
async function handleSignupReferral(): Promise<void> {
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

export default createAuthView;
