/**
 * ============================================================
 * دانش‌یار پرو - SettingsView V5 (طراحی لوکس و یک‌دست)
 * ============================================================
 * 🎨 پالت محدود: بنفش (تعامل) · طلایی (ارزش) · قرمز (خطر)
 * 💎 Hero Premium طلایی + Progress Ring XP
 * 🧠 زیرصفحه‌های AI، Data، Advanced (Progressive Disclosure)
 * 📱 Mobile-first · RTL · Dark/Light
 * ❌ بدون ایموجی · بدون خط کهکشانی · بدون feature فیک
 * @module ui/views/SettingsView
 * @version 5.0.0
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getState } from '@/core/State';
import { getDatabase } from '@/core/Database';
import { saveUserKeys, getRemainingQuota, getTier } from '@/services/AIQuizService';
import { AI_KEYS_LS } from '@/config/ai';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '@/ui/components/Button';
import { getModal } from '@/ui/components/Modal';
import { getToast } from '@/ui/components/Toast';
import { toPersianDigits } from '@/utils/dateFormatter';
import { getCurrentUser, signOut } from '@/services/AuthService';
import { getRouter } from '@/core/Router';
import { syncAll, onSyncStatus, getLastSync, isSyncAvailable, type SyncUIStatus } from '@/services/SyncService';
import { getSubscriptionInfo } from '@/services/SubscriptionService';
import { PLANS } from '@/services/Premium';
import { createIcon, iconHTML } from '@/services/IconService';

const logger = getLogger().module('SettingsView');
const SETTINGS_LS = 'daneshyar_settings';
const XP_KEY = 'daneshyar_xp';

type ThemeId = 'dark' | 'light';
type Phase = 'main' | 'ai' | 'data' | 'advanced';

// ============================================================
// Helpers
// ============================================================
function getXP(): number { try { return parseInt(localStorage.getItem(XP_KEY) || '0', 10) || 0; } catch { return 0; } }
const levelOf = (xp: number): number => Math.floor(xp / 100) + 1;

function readAppSettings(): { autoSaveDraft?: boolean; reduceMotion?: boolean } {
  try {
    const raw = localStorage.getItem(SETTINGS_LS);
    return raw ? (JSON.parse(raw) as { autoSaveDraft?: boolean; reduceMotion?: boolean }) : {};
  } catch { return {}; }
}
function writeAppSettings(patch: Record<string, unknown>): void {
  try {
    const cur = readAppSettings() as Record<string, unknown>;
    localStorage.setItem(SETTINGS_LS, JSON.stringify({ ...cur, ...patch }));
  } catch { /* ignore */ }
}
function readStoredKeys(): { gemini: string; groq: string } {
  try {
    const raw = localStorage.getItem(AI_KEYS_LS);
    if (raw) { const d = JSON.parse(raw) as { gemini?: string; groq?: string }; return { gemini: d.gemini ?? '', groq: d.groq ?? '' }; }
  } catch { /* ignore */ }
  return { gemini: '', groq: '' };
}

// ============================================================
// کامپوننت‌های پایه (یک‌دست و لوکس)
// ============================================================
function createChevron(): HTMLElement {
  const el = document.createElement('span');
  el.className = 'text-slate-500 flex items-center justify-center flex-shrink-0 transition-transform group-hover:-translate-x-0.5';
  el.innerHTML = iconHTML('chevron-left', 17);
  return el;
}

/** ردیف استاندارد — فقط یک رنگ برای آیکون (بنفش) */
function createSettingsRow(opts: {
  icon: string; title: string; description?: string;
  trailing?: HTMLElement; onClick?: () => void; danger?: boolean;
}): HTMLElement {
  const { icon, title, description, trailing, onClick, danger } = opts;
  const row = document.createElement(onClick ? 'button' : 'div');
  if (onClick) (row as HTMLButtonElement).type = 'button';
  row.className = [
    'group w-full text-start min-h-[60px] flex items-center gap-3 px-4 py-3 transition-colors',
    onClick ? (danger ? 'hover:bg-red-500/10 active:bg-red-500/20' : 'hover:bg-slate-700/20 active:bg-slate-700/30') : '',
  ].join(' ');
  if (onClick) row.addEventListener('click', onClick);

  const iconBox = document.createElement('div');
  iconBox.className = `w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
    danger ? 'bg-red-500/15 text-red-400' : 'bg-primary-500/15 text-primary-400'
  }`;
  iconBox.appendChild(createIcon(icon, 18));

  const content = document.createElement('div');
  content.className = 'flex-1 min-w-0';
  const t = document.createElement('div');
  t.className = `text-sm font-semibold ${danger ? 'text-red-400' : 'text-slate-100'}`;
  t.textContent = title;
  content.appendChild(t);
  if (description) {
    const d = document.createElement('div');
    d.className = 'text-[11px] text-slate-500 mt-0.5 leading-relaxed';
    d.textContent = description;
    content.appendChild(d);
  }

  row.appendChild(iconBox);
  row.appendChild(content);
  if (trailing) row.appendChild(trailing);
  else if (onClick) row.appendChild(createChevron());
  return row;
}

/** گروه ردیف‌ها — لیبل ساده و تمیز */
function createSection(title: string, body: HTMLElement): HTMLElement {
  const section = document.createElement('section');
  section.className = 'space-y-2';
  const heading = document.createElement('h2');
  heading.className = 'px-2 text-xs font-semibold text-slate-400';
  heading.textContent = title;
  const group = document.createElement('div');
  group.className = 'bg-slate-800 border border-slate-700/70 rounded-xl overflow-hidden divide-y divide-slate-700/60';
  group.appendChild(body);
  section.appendChild(heading);
  section.appendChild(group);
  return section;
}

function createSwitch(initial: boolean, onChange: (v: boolean) => void): HTMLElement {
  let on = initial;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'w-11 h-6 rounded-full relative flex-shrink-0 transition-colors duration-200';
  const knob = document.createElement('span');
  knob.className = 'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200';
  btn.appendChild(knob);
  const paint = (): void => {
    btn.classList.toggle('bg-primary-500', on);
    btn.classList.toggle('bg-slate-700', !on);
    knob.classList.toggle('start-5', on);
    knob.classList.toggle('start-0.5', !on);
  };
  paint();
  btn.addEventListener('click', () => { on = !on; paint(); onChange(on); });
  return btn;
}

function createSegmented<T extends string>(
  options: { value: T; label: string; icon?: string }[],
  current: T,
  onChange: (v: T) => void
): HTMLElement {
  const seg = document.createElement('div');
  seg.className = 'flex bg-slate-900 rounded-lg p-0.5';
  options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
      current === opt.value ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-slate-200'
    }`;
    if (opt.icon) btn.innerHTML = iconHTML(opt.icon, 13);
    const lb = document.createElement('span');
    lb.textContent = opt.label;
    btn.appendChild(lb);
    btn.addEventListener('click', () => onChange(opt.value));
    seg.appendChild(btn);
  });
  return seg;
}

// ============================================================
// شیت XP (با Progress Ring گرادیانی)
// ============================================================
function openXpSheet(): void {
  const xp = getXP();
  const level = levelOf(xp);
  const inLevel = xp % 100;
  const R = 40; const C = 2 * Math.PI * R;

  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,23,.7);backdrop-filter:blur(4px);z-index:80;';
  backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });

  const sheet = document.createElement('div');
  sheet.className = 'fixed bottom-0 inset-x-0 z-[81] mx-auto max-w-md rounded-t-3xl bg-slate-800 border border-slate-700 p-5 space-y-4';
  sheet.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });

  const close = (): void => { backdrop.remove(); sheet.remove(); };
  backdrop.addEventListener('click', close);

  sheet.appendChild(Object.assign(document.createElement('div'), { className: 'w-10 h-1 rounded-full bg-slate-600 mx-auto' }));

  const ringWrap = document.createElement('div');
  ringWrap.className = 'flex flex-col items-center gap-3 py-2';
  const ring = document.createElement('div');
  ring.className = 'relative';
  ring.innerHTML = `<svg width="110" height="110" viewBox="0 0 110 110">
    <defs><linearGradient id="xp-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#fbbf24"/>
    </linearGradient></defs>
    <circle cx="55" cy="55" r="${R}" fill="none" stroke="#334155" stroke-width="8"/>
    <circle cx="55" cy="55" r="${R}" fill="none" stroke="url(#xp-grad)" stroke-width="8"
      stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - inLevel/100)}"
      transform="rotate(-90 55 55)" style="transition:stroke-dashoffset .8s ease-out"/>
  </svg>`;
  const badge = document.createElement('div');
  badge.className = 'absolute inset-0 flex flex-col items-center justify-center';
  const b1 = document.createElement('div');
  b1.className = 'text-3xl font-black bg-gradient-to-br from-primary-400 to-accent-400 bg-clip-text text-transparent';
  b1.textContent = toPersianDigits(String(level));
  const b2 = document.createElement('div');
  b2.className = 'text-[9px] text-slate-500 font-bold uppercase tracking-wider';
  b2.textContent = 'سطح';
  badge.appendChild(b1); badge.appendChild(b2);
  ring.appendChild(badge);
  ringWrap.appendChild(ring);

  const xpText = document.createElement('div');
  xpText.className = 'text-center';
  const x1 = document.createElement('div');
  x1.className = 'text-sm font-bold text-slate-200';
  x1.innerHTML = `${toPersianDigits(String(inLevel))} <span class="text-slate-500">از</span> ۱۰۰ <span class="text-slate-500">XP تا سطح بعد</span>`;
  const x2 = document.createElement('div');
  x2.className = 'text-xs text-slate-500 mt-0.5';
  x2.textContent = `مجموع کل: ${toPersianDigits(String(xp))} XP`;
  xpText.appendChild(x1); xpText.appendChild(x2);
  ringWrap.appendChild(xpText);
  sheet.appendChild(ringWrap);

  const wTitle = document.createElement('div');
  wTitle.className = 'text-sm font-bold text-slate-100 flex items-center gap-2 pt-2 border-t border-slate-700';
  wTitle.innerHTML = iconHTML('zap', 16);
  const wt = document.createElement('span'); wt.textContent = 'چطور XP بگیرم؟';
  wTitle.appendChild(wt);
  sheet.appendChild(wTitle);

  const ways: { icon: string; label: string; val: string; desc: string }[] = [
    { icon: 'flashcards', label: 'مرور فلش‌کارت', val: '+۱۰ / +۵ / +۲', desc: 'آسان · سخت · نمی‌دانم' },
    { icon: 'flame', label: 'پاداش کمبو', val: '+کمبو', desc: 'پاسخ‌های درست متوالی' },
    { icon: 'quiz', label: 'پاسخ درست آزمون', val: '+۵', desc: 'هر سوال صحیح' },
  ];
  ways.forEach((w) => {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-3 bg-slate-900/50 rounded-lg p-3';
    const ic = document.createElement('span');
    ic.className = 'w-9 h-9 rounded-lg bg-primary-500/15 text-primary-400 flex items-center justify-center flex-shrink-0';
    ic.innerHTML = iconHTML(w.icon, 16);
    const lb = document.createElement('div');
    lb.className = 'flex-1';
    const lt = document.createElement('div'); lt.className = 'text-sm font-semibold text-slate-200'; lt.textContent = w.label;
    const ld = document.createElement('div'); ld.className = 'text-[10px] text-slate-500'; ld.textContent = w.desc;
    lb.appendChild(lt); lb.appendChild(ld);
    const vl = document.createElement('span'); vl.className = 'text-xs font-bold text-accent-400'; vl.textContent = w.val;
    row.appendChild(ic); row.appendChild(lb); row.appendChild(vl);
    sheet.appendChild(row);
  });

  const cta = createButton({
    label: 'شروع کسب XP', variant: BUTTON_VARIANTS.ACCENT, size: BUTTON_SIZES.LG,
    iconHtml: iconHTML('play', 16),
    onClick: () => { close(); void getRouter().navigate('flashcards'); },
  });
  cta.classList.add('w-full');
  sheet.appendChild(cta);

  document.body.appendChild(backdrop);
  document.body.appendChild(sheet);
}

// ============================================================
// View اصلی
// ============================================================
export async function createSettingsView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر تنظیمات V5 (لوکس)');
  const container = document.createElement('div');
  container.className = 'mx-auto w-full max-w-2xl px-1 pb-6 space-y-6';
  const state = getState();
  let phase: Phase = 'main';

  const render = (): void => {
    container.innerHTML = '';
    const phaseEl = phase === 'ai' ? buildAISubpage() :
                    phase === 'data' ? buildDataSubpage() :
                    phase === 'advanced' ? buildAdvancedSubpage() :
                    buildMain();
    container.appendChild(phaseEl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ═════════════════════════════════════════════════════════
  // صفحه اصلی
  // ═════════════════════════════════════════════════════════
  function buildMain(): HTMLElement {
    const page = document.createElement('div');
    page.className = 'space-y-6';

    // ── هدر ──
    const header = document.createElement('div');
    const titleRow = document.createElement('div');
    titleRow.className = 'flex items-center gap-3';
    const hi = document.createElement('div');
    hi.className = 'w-12 h-12 rounded-xl bg-primary-500/15 text-primary-400 flex items-center justify-center';
    hi.appendChild(createIcon('settings', 26));
    titleRow.appendChild(hi);
    const hTxt = document.createElement('div');
    const h1 = document.createElement('h1');
    h1.className = 'text-2xl sm:text-3xl font-black text-slate-100';
    h1.textContent = 'تنظیمات';
    const h2 = document.createElement('p');
    h2.className = 'text-xs text-slate-500 mt-0.5';
    h2.textContent = 'دانش‌یار را مطابق خودت شخصی‌سازی کن';
    hTxt.appendChild(h1); hTxt.appendChild(h2);
    titleRow.appendChild(hTxt);
    header.appendChild(titleRow);
    page.appendChild(header);

    // ── کارت پیشرفت (Progress Ring) ──
    page.appendChild(buildProgressCard());

    // ── Hero Premium طلایی ──
    page.appendChild(buildPremiumHero());

    // ── گروه‌ها (همه با آیکون‌های یک‌رنگ) ──
    page.appendChild(createSection('حساب کاربری', buildAccountGroup()));
    page.appendChild(createSection('ظاهر و تجربه', buildAppearanceGroup()));
    page.appendChild(createSection('یادگیری', buildLearningGroup()));
    page.appendChild(createSection('هوش مصنوعی', buildAIGroup()));
    page.appendChild(createSection('داده‌ها', buildDataGroup()));
    page.appendChild(createSection('پیشرفته', buildAdvancedGroup()));
    page.appendChild(createSection('درباره', buildAboutGroup()));

    // Footer
    const footer = document.createElement('div');
    footer.className = 'text-center pt-4 pb-2 space-y-1';
    const fb = document.createElement('div');
    fb.className = 'text-[10px] font-semibold text-slate-600';
    fb.textContent = 'دانش‌یار پرو';
    const fv = document.createElement('div');
    fv.className = 'text-[9px] text-slate-700';
    fv.textContent = `نسخه ${toPersianDigits('1.0.0-beta.1')}`;
    footer.appendChild(fb); footer.appendChild(fv);
    page.appendChild(footer);

    return page;
  }

  // ═════════════════════════════════════════════════════════
  // کارت پیشرفت
  // ═════════════════════════════════════════════════════════
  function buildProgressCard(): HTMLElement {
    const xp = getXP();
    const level = levelOf(xp);
    const inLevel = xp % 100;
    const R = 24; const C = 2 * Math.PI * R;

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'w-full bg-slate-800 border border-slate-700/70 hover:border-primary-500/40 rounded-2xl p-4 transition-all active:scale-[.99] group';

    const row = document.createElement('div');
    row.className = 'flex items-center gap-4';

    const ringWrap = document.createElement('div');
    ringWrap.className = 'relative flex-shrink-0';
    ringWrap.innerHTML = `<svg width="60" height="60" viewBox="0 0 60 60">
      <defs><linearGradient id="xp-small" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#fbbf24"/>
      </linearGradient></defs>
      <circle cx="30" cy="30" r="${R}" fill="none" stroke="#334155" stroke-width="5"/>
      <circle cx="30" cy="30" r="${R}" fill="none" stroke="url(#xp-small)" stroke-width="5"
        stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - inLevel/100)}"
        transform="rotate(-90 30 30)" style="transition:stroke-dashoffset .6s ease-out"/>
    </svg>`;
    const badge = document.createElement('div');
    badge.className = 'absolute inset-0 flex items-center justify-center text-lg font-black text-slate-100';
    badge.textContent = toPersianDigits(String(level));
    ringWrap.appendChild(badge);
    row.appendChild(ringWrap);

    const txt = document.createElement('div');
    txt.className = 'flex-1 min-w-0 text-start';
    const t1 = document.createElement('div');
    t1.className = 'text-base font-bold text-slate-100';
    t1.textContent = `سطح ${toPersianDigits(String(level))}`;
    const t2 = document.createElement('div');
    t2.className = 'text-xs text-slate-400 mt-0.5';
    t2.textContent = `${toPersianDigits(String(inLevel))}/${toPersianDigits('۱۰۰')} XP تا سطح بعد`;
    txt.appendChild(t1); txt.appendChild(t2);
    row.appendChild(txt);

    row.appendChild(createChevron());

    card.appendChild(row);
    card.addEventListener('click', openXpSheet);
    return card;
  }

  // ═════════════════════════════════════════════════════════
  // Hero Premium طلایی (تنها گرادیان رنگی صفحه)
  // ═════════════════════════════════════════════════════════
  function buildPremiumHero(): HTMLElement {
    const info = getSubscriptionInfo();

    if (info.isPremium) {
      const plan = PLANS.find((p) => p.id === info.planId);
      const hero = document.createElement('div');
      hero.className = 'relative overflow-hidden rounded-2xl border border-accent-500/30 p-5';
      hero.style.background = 'linear-gradient(135deg, rgba(251,191,36,.10) 0%, rgba(251,191,36,.03) 50%, rgba(30,41,59,1) 100%)';

      const glow = document.createElement('div');
      glow.className = 'absolute -top-16 -end-16 w-40 h-40 rounded-full bg-accent-500/15 blur-3xl pointer-events-none';
      hero.appendChild(glow);

      const inner = document.createElement('div');
      inner.className = 'relative space-y-4';

      const top = document.createElement('div');
      top.className = 'flex items-center justify-between gap-3';
      const brand = document.createElement('div');
      brand.className = 'flex items-center gap-3';
      const cr = document.createElement('div');
      cr.className = 'w-11 h-11 rounded-xl bg-accent-500/20 text-accent-400 flex items-center justify-center';
      cr.innerHTML = iconHTML('award', 22);
      const bt = document.createElement('div');
      const bt1 = document.createElement('div'); bt1.className = 'text-sm font-black text-accent-300'; bt1.textContent = 'Premium';
      const bt2 = document.createElement('div'); bt2.className = 'text-[11px] text-slate-400 mt-0.5'; bt2.textContent = plan ? `پلن ${plan.label}` : 'دانش‌یار پرو';
      bt.appendChild(bt1); bt.appendChild(bt2);
      brand.appendChild(cr); brand.appendChild(bt);
      const status = document.createElement('span');
      status.className = 'text-[10px] font-bold text-accent-300 bg-accent-500/15 border border-accent-500/30 px-2.5 py-1 rounded-full flex items-center gap-1';
      status.innerHTML = iconHTML('check', 11);
      const st = document.createElement('span'); st.textContent = 'فعال';
      status.appendChild(st);
      top.appendChild(brand); top.appendChild(status);
      inner.appendChild(top);

      const days = document.createElement('div');
      days.className = 'bg-slate-900/60 border border-slate-700/60 rounded-lg p-3 flex items-center justify-between';
      const dL = document.createElement('div'); dL.className = 'text-xs text-slate-400'; dL.textContent = 'روزهای باقی‌مانده';
      const dV = document.createElement('div'); dV.className = 'text-2xl font-black text-accent-400'; dV.textContent = toPersianDigits(String(info.daysLeft));
      days.appendChild(dL); days.appendChild(dV);
      inner.appendChild(days);

      const btn = createButton({
        label: 'مدیریت اشتراک', variant: BUTTON_VARIANTS.ACCENT, size: BUTTON_SIZES.MD,
        iconHtml: iconHTML('settings', 16),
        onClick: () => { void getRouter().navigate('premium'); },
      });
      btn.classList.add('w-full');
      inner.appendChild(btn);
      hero.appendChild(inner);
      return hero;
    }

    if (info.isTrial) {
      const hero = document.createElement('div');
      hero.className = 'rounded-2xl p-5 bg-slate-800 border border-primary-500/30';
      const top = document.createElement('div');
      top.className = 'flex items-center gap-3 mb-4';
      const ic = document.createElement('div');
      ic.className = 'w-11 h-11 rounded-xl bg-primary-500/15 text-primary-400 flex items-center justify-center';
      ic.innerHTML = iconHTML('gift', 22);
      const txt = document.createElement('div');
      const tt = document.createElement('div'); tt.className = 'text-sm font-bold text-slate-100'; tt.textContent = 'دوره آزمایشی فعال';
      const td = document.createElement('div'); td.className = 'text-xs text-slate-400 mt-0.5'; td.textContent = `${toPersianDigits(String(info.trialDaysLeft))} روز تا پایان`;
      txt.appendChild(tt); txt.appendChild(td);
      top.appendChild(ic); top.appendChild(txt);
      hero.appendChild(top);
      const btn = createButton({
        label: 'ارتقا به Premium', variant: BUTTON_VARIANTS.ACCENT, size: BUTTON_SIZES.MD,
        iconHtml: iconHTML('sparkles', 16),
        onClick: () => { void getRouter().navigate('premium'); },
      });
      btn.classList.add('w-full');
      hero.appendChild(btn);
      return hero;
    }

    // Free
    const hero = document.createElement('div');
    hero.className = 'rounded-2xl p-5 bg-slate-800 border border-slate-700/70';
    const top = document.createElement('div');
    top.className = 'flex items-center gap-3 mb-4';
    const ic = document.createElement('div');
    ic.className = 'w-11 h-11 rounded-xl bg-accent-500/15 text-accent-400 flex items-center justify-center';
    ic.innerHTML = iconHTML('award', 22);
    const txt = document.createElement('div');
    const tt = document.createElement('div'); tt.className = 'text-sm font-bold text-slate-100'; tt.textContent = 'دانش‌یار پرو Premium';
    const td = document.createElement('div'); td.className = 'text-xs text-slate-400 mt-0.5'; td.textContent = 'قابلیت‌های بیشتر برای مطالعه';
    txt.appendChild(tt); txt.appendChild(td);
    top.appendChild(ic); top.appendChild(txt);
    hero.appendChild(top);
    const features = document.createElement('div');
    features.className = 'space-y-1.5 mb-4';
    ['مرور نامحدود فلش‌کارت', 'سهمیه AI بیشتر', 'همگام‌سازی بین دستگاه‌ها'].forEach((f) => {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-2 text-xs text-slate-300';
      row.innerHTML = `<span class="text-accent-400 flex">${iconHTML('check', 12)}</span>`;
      const sp = document.createElement('span'); sp.textContent = f;
      row.appendChild(sp);
      features.appendChild(row);
    });
    hero.appendChild(features);
    const btn = createButton({
      label: 'مشاهده امکانات', variant: BUTTON_VARIANTS.ACCENT, size: BUTTON_SIZES.MD,
      iconHtml: iconHTML('sparkles', 16),
      onClick: () => { void getRouter().navigate('premium'); },
    });
    btn.classList.add('w-full');
    hero.appendChild(btn);
    return hero;
  }

  // ═════════════════════════════════════════════════════════
  // گروه‌ها — همه با آیکون‌های بنفش یک‌دست
  // ═════════════════════════════════════════════════════════

  function buildAccountGroup(): HTMLElement {
    const g = document.createElement('div');
    const accountInner = document.createElement('div');
    accountInner.className = 'px-4 py-3';
    const ai = document.createElement('div');
    ai.className = 'flex items-center gap-3';
    const avatar = document.createElement('div');
    avatar.className = 'w-11 h-11 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-black text-base flex-shrink-0';
    avatar.textContent = '?';
    ai.appendChild(avatar);
    const txt = document.createElement('div');
    txt.className = 'flex-1 min-w-0';
    const tt = document.createElement('div');
    tt.className = 'text-sm font-semibold text-slate-100 truncate';
    tt.textContent = 'در حال بررسی...';
    const td = document.createElement('div');
    td.className = 'text-[11px] text-slate-500 mt-0.5';
    txt.appendChild(tt); txt.appendChild(td);
    const holder = document.createElement('div');
    holder.className = 'flex-shrink-0';
    ai.appendChild(txt); ai.appendChild(holder);
    accountInner.appendChild(ai);
    g.appendChild(accountInner);

    void getCurrentUser().then((user) => {
      if (user) {
        avatar.textContent = (user.email ?? 'U').charAt(0).toUpperCase();
        tt.textContent = user.email ?? 'کاربر';
        td.textContent = 'حساب فعال';
        holder.appendChild(createButton({
          label: 'خروج', variant: BUTTON_VARIANTS.GHOST, size: BUTTON_SIZES.SM,
          onClick: async () => {
            const ok = await getModal().confirm('خروج از حساب', 'آیا مطمئنی؟ داده‌های محلی حفظ می‌شوند.', { confirmText: 'خروج', dangerMode: true });
            if (!ok) return;
            await signOut();
            getToast().success('از حساب خارج شدی');
            tt.textContent = 'وارد نشده';
            td.textContent = 'برای سینک وارد شو';
            avatar.textContent = '?';
            holder.innerHTML = '';
            holder.appendChild(createButton({ label: 'ورود', variant: BUTTON_VARIANTS.PRIMARY, size: BUTTON_SIZES.SM, onClick: () => { void getRouter().navigate('auth'); } }));
          },
        }));
      } else {
        tt.textContent = 'وارد نشده';
        td.textContent = 'برای سینک بین دستگاه‌ها وارد شو';
        holder.appendChild(createButton({ label: 'ورود / ثبت‌نام', variant: BUTTON_VARIANTS.PRIMARY, size: BUTTON_SIZES.SM, onClick: () => { void getRouter().navigate('auth'); } }));
      }
    });

    if (isSyncAvailable()) {
      const syncWrap = document.createElement('div');
      syncWrap.className = 'px-4 py-3 border-t border-slate-700/60';
      const syncRow = document.createElement('div');
      syncRow.className = 'flex items-center gap-3';
      const sb = document.createElement('div');
      sb.className = 'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary-500/15 text-primary-400';
      sb.appendChild(createIcon('sync', 18));
      const st = document.createElement('div');
      st.className = 'flex-1 min-w-0';
      const stt = document.createElement('div');
      stt.className = 'text-sm font-semibold text-slate-100';
      stt.textContent = 'همگام‌سازی';
      const std = document.createElement('div');
      std.className = 'text-[11px] text-slate-500 mt-0.5';
      std.textContent = 'در حال بررسی...';
      st.appendChild(stt); st.appendChild(std);
      const syncBtn = createButton({ label: 'سینک', variant: BUTTON_VARIANTS.PRIMARY, size: BUTTON_SIZES.SM, iconHtml: iconHTML('refresh', 14), onClick: () => { void syncAll(); } });
      syncRow.appendChild(sb); syncRow.appendChild(st); syncRow.appendChild(syncBtn);
      syncWrap.appendChild(syncRow);

      const unsub = onSyncStatus((s: SyncUIStatus) => {
        const last = getLastSync();
        if (s === 'syncing') { std.textContent = 'در حال سینک...'; syncBtn.disabled = true; }
        else if (s === 'success') { std.textContent = 'سینک با موفقیت انجام شد'; syncBtn.disabled = false; }
        else if (s === 'error') { std.textContent = 'خطا در سینک'; syncBtn.disabled = false; }
        else { std.textContent = last ? `آخرین سینک: ${last}` : 'هنوز سینک نشده'; syncBtn.disabled = false; }
      });
      const obs = new MutationObserver(() => {
        if (!document.body.contains(syncWrap)) { unsub(); obs.disconnect(); }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      g.appendChild(syncWrap);
    }
    return g;
  }

  function buildAppearanceGroup(): HTMLElement {
    const g = document.createElement('div');
    const settings = readAppSettings();
    const current = String(state.getSettings()?.theme ?? 'dark') as ThemeId;

    // تم
    const themeRow = document.createElement('div');
    themeRow.className = 'flex items-center gap-3 px-4 py-3';
    const tb = document.createElement('div');
    tb.className = 'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary-500/15 text-primary-400';
    tb.appendChild(createIcon('palette', 18));
    themeRow.appendChild(tb);
    const tl = document.createElement('div');
    tl.className = 'flex-1 text-sm font-semibold text-slate-100';
    tl.textContent = 'حالت نمایش';
    themeRow.appendChild(tl);
    themeRow.appendChild(createSegmented<ThemeId>([
      { value: 'dark', label: 'تاریک', icon: 'moon' },
      { value: 'light', label: 'روشن', icon: 'sun' },
    ], current, (v) => {
      state.updateSettings({ theme: v });
      getToast().success(v === 'dark' ? 'حالت تاریک فعال شد' : 'حالت روشن فعال شد');
      render();
    }));
    g.appendChild(themeRow);

    // کاهش انیمیشن
    g.appendChild(createSettingsRow({
      icon: 'minimize',
      title: 'کاهش انیمیشن',
      description: 'برای کسانی که حرکت زیاد اذیت‌شان می‌کند',
      trailing: createSwitch(settings.reduceMotion === true, (v) => {
        writeAppSettings({ reduceMotion: v });
        getToast().success(v ? 'انیمیشن کاهش یافت' : 'انیمیشن کامل فعال شد');
      }),
    }));

    return g;
  }

  function buildLearningGroup(): HTMLElement {
    const g = document.createElement('div');
    const settings = readAppSettings();

    g.appendChild(createSettingsRow({
      icon: 'save',
      title: 'ذخیره خودکار پیش‌نویس',
      description: 'بازیابی متن در صورت بسته‌شدن ناگهانی برنامه',
      trailing: createSwitch(settings.autoSaveDraft !== false, (v) => {
        writeAppSettings({ autoSaveDraft: v });
        getToast().success(v ? 'ذخیره خودکار فعال شد' : 'ذخیره خودکار غیرفعال شد');
      }),
    }));

    return g;
  }

  function buildAIGroup(): HTMLElement {
    const g = document.createElement('div');
    const keys = readStoredKeys();
    const quota = getRemainingQuota();
    const tier = getTier();

    g.appendChild(createSettingsRow({
      icon: 'sparkles',
      title: 'دستیار هوشمند',
      description: `${tier} · سهمیه ${toPersianDigits(String(quota))} · ${keys.gemini ? 'کلید شخصی' : 'کلید پیش‌فرض'}`,
      onClick: () => { phase = 'ai'; render(); },
    }));
    return g;
  }

  function buildDataGroup(): HTMLElement {
    const g = document.createElement('div');
    g.appendChild(createSettingsRow({
      icon: 'database',
      title: 'پشتیبان و بازیابی',
      description: 'خروجی JSON، بازیابی از فایل',
      onClick: () => { phase = 'data'; render(); },
    }));
    return g;
  }

  function buildAdvancedGroup(): HTMLElement {
    const g = document.createElement('div');
    g.appendChild(createSettingsRow({
      icon: 'sliders',
      title: 'تنظیمات پیشرفته',
      description: 'پاک کردن کش، ریست، مدیریت داده‌ها',
      onClick: () => { phase = 'advanced'; render(); },
    }));
    return g;
  }

  function buildAboutGroup(): HTMLElement {
    const g = document.createElement('div');
    g.appendChild(createSettingsRow({
      icon: 'award',
      title: 'دانش‌یار پرو',
      description: `نسخه ${toPersianDigits('1.0.0-beta.1')} · ساخته‌شده برای یادگیری بهتر`,
    }));
    [
      { id: 'terms', icon: 'file-text', label: 'شرایط استفاده' },
      { id: 'privacy', icon: 'shield', label: 'حریم خصوصی' },
      { id: 'refund', icon: 'creditcard', label: 'سیاست بازپرداخت' },
    ].forEach((l) => {
      g.appendChild(createSettingsRow({
        icon: l.icon, title: l.label,
        onClick: () => { void getRouter().navigate('legal', { doc: l.id }); },
      }));
    });
    return g;
  }

  // ═════════════════════════════════════════════════════════
  // زیرصفحه AI
  // ═════════════════════════════════════════════════════════
  function buildAISubpage(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'space-y-4';
    const header = document.createElement('div');
    header.className = 'flex items-center gap-3 sticky top-0 bg-slate-900/95 backdrop-blur z-10 py-3 -mx-1 px-1';
    header.appendChild(createButton({ label: 'بازگشت', variant: BUTTON_VARIANTS.GHOST, size: BUTTON_SIZES.SM, iconHtml: iconHTML('back', 16), onClick: () => { phase = 'main'; render(); } }));
    const t = document.createElement('h1'); t.className = 'text-xl font-black text-slate-100 flex-1'; t.textContent = 'دستیار هوشمند';
    header.appendChild(t);
    wrap.appendChild(header);

    const intro = document.createElement('div');
    intro.className = 'bg-slate-800 border border-slate-700/70 rounded-xl p-4 space-y-3';
    const ih = document.createElement('div');
    ih.className = 'flex items-center gap-2';
    ih.appendChild(createIcon('sparkles', 20, 'text-primary-400'));
    const iT = document.createElement('h3'); iT.className = 'font-bold text-slate-100'; iT.textContent = 'مدل فعال';
    ih.appendChild(iT); intro.appendChild(ih);
    const modelChip = document.createElement('div');
    modelChip.className = 'flex items-center gap-3 bg-primary-500/10 border border-primary-500/30 rounded-lg p-3';
    const mic = document.createElement('div');
    mic.className = 'w-10 h-10 rounded-lg bg-primary-500/20 text-primary-400 flex items-center justify-center flex-shrink-0';
    mic.appendChild(createIcon('sparkles', 20));
    modelChip.appendChild(mic);
    const mTxt = document.createElement('div');
    mTxt.className = 'flex-1 min-w-0';
    const m1 = document.createElement('div'); m1.className = 'text-sm font-bold text-primary-300'; m1.textContent = 'Google Gemini';
    const m2 = document.createElement('div'); m2.className = 'text-xs text-slate-400 mt-0.5'; m2.textContent = `سهمیه امروز: ${toPersianDigits(String(getRemainingQuota()))} (${getTier()})`;
    mTxt.appendChild(m1); mTxt.appendChild(m2);
    modelChip.appendChild(mTxt);
    const check = document.createElement('div');
    check.className = 'w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center flex-shrink-0';
    check.innerHTML = iconHTML('check', 16);
    modelChip.appendChild(check);
    intro.appendChild(modelChip);
    wrap.appendChild(intro);

    const keys = readStoredKeys();
    const kb = document.createElement('div');
    kb.className = 'bg-slate-800 border border-slate-700/70 rounded-xl p-4 space-y-3';
    const kh = document.createElement('div');
    kh.className = 'flex items-center gap-2';
    kh.appendChild(createIcon('key', 18, 'text-primary-400'));
    const kT = document.createElement('h3'); kT.className = 'font-bold text-slate-100'; kT.textContent = 'کلیدهای API شخصی (اختیاری)';
    kh.appendChild(kT); kb.appendChild(kh);
    const kDesc = document.createElement('p');
    kDesc.className = 'text-xs text-slate-400 leading-relaxed';
    kDesc.textContent = 'با کلید شخصی، سهمیه نامحدود خواهی داشت.';
    kb.appendChild(kDesc);

    const gW = document.createElement('div'); gW.className = 'space-y-1.5';
    const gL = document.createElement('label'); gL.className = 'text-xs font-semibold text-slate-300'; gL.textContent = 'کلید Gemini';
    const gI = document.createElement('input'); gI.type = 'password'; gI.className = 'input w-full'; gI.dir = 'ltr'; gI.placeholder = 'AIza...'; gI.value = keys.gemini;
    gW.appendChild(gL); gW.appendChild(gI); kb.appendChild(gW);

    const qW = document.createElement('div'); qW.className = 'space-y-1.5';
    const qL = document.createElement('label'); qL.className = 'text-xs font-semibold text-slate-300'; qL.textContent = 'کلید Groq (پشتیبان)';
    const qI = document.createElement('input'); qI.type = 'password'; qI.className = 'input w-full'; qI.dir = 'ltr'; qI.placeholder = 'gsk_...'; qI.value = keys.groq;
    qW.appendChild(qL); qW.appendChild(qI); kb.appendChild(qW);

    const save = createButton({
      label: 'ذخیره کلیدها', variant: BUTTON_VARIANTS.PRIMARY, size: BUTTON_SIZES.MD,
      iconHtml: iconHTML('save', 16),
      onClick: () => { saveUserKeys(gI.value.trim(), qI.value.trim()); getToast().success('کلیدها ذخیره شدند'); render(); },
    });
    save.classList.add('w-full');
    kb.appendChild(save);

    if (keys.gemini || keys.groq) {
      const clear = createButton({
        label: 'حذف کلیدها', variant: BUTTON_VARIANTS.GHOST, size: BUTTON_SIZES.SM,
        iconHtml: iconHTML('trash', 14),
        onClick: async () => {
          const ok = await getModal().confirm('حذف کلیدها', 'کلیدهای ذخیره‌شده پاک می‌شوند.', { confirmText: 'حذف', dangerMode: true });
          if (!ok) return;
          try { localStorage.removeItem(AI_KEYS_LS); } catch { /* ignore */ }
          getToast().success('کلیدها حذف شدند');
          render();
        },
      });
      clear.classList.add('w-full');
      kb.appendChild(clear);
    }
    wrap.appendChild(kb);

    const note = document.createElement('div');
    note.className = 'flex items-start gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4';
    const nic = document.createElement('div');
    nic.className = 'w-8 h-8 rounded-lg bg-primary-500/15 text-primary-400 flex items-center justify-center flex-shrink-0';
    nic.appendChild(createIcon('shield', 14));
    const nTxt = document.createElement('div');
    const nt1 = document.createElement('div'); nt1.className = 'text-xs font-bold text-slate-200 mb-1'; nt1.textContent = 'حریم خصوصی';
    const nt2 = document.createElement('p'); nt2.className = 'text-[11px] text-slate-400 leading-relaxed';
    nt2.textContent = 'کلیدها فقط روی دستگاه شما ذخیره می‌شوند. بدون کلید، از کلید پیش‌فرض با سهمیه محدود استفاده می‌شود.';
    nTxt.appendChild(nt1); nTxt.appendChild(nt2);
    note.appendChild(nic); note.appendChild(nTxt);
    wrap.appendChild(note);

    return wrap;
  }

  // ═════════════════════════════════════════════════════════
  // زیرصفحه داده‌ها
  // ═════════════════════════════════════════════════════════
  function buildDataSubpage(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'space-y-4';
    const header = document.createElement('div');
    header.className = 'flex items-center gap-3 sticky top-0 bg-slate-900/95 backdrop-blur z-10 py-3 -mx-1 px-1';
    header.appendChild(createButton({ label: 'بازگشت', variant: BUTTON_VARIANTS.GHOST, size: BUTTON_SIZES.SM, iconHtml: iconHTML('back', 16), onClick: () => { phase = 'main'; render(); } }));
    const t = document.createElement('h1'); t.className = 'text-xl font-black text-slate-100 flex-1'; t.textContent = 'داده‌ها و پشتیبان';
    header.appendChild(t);
    wrap.appendChild(header);

    const sb = document.createElement('div');
    sb.className = 'bg-slate-800 border border-slate-700/70 rounded-xl p-4';
    const sh = document.createElement('div');
    sh.className = 'flex items-center gap-2 mb-3';
    sh.appendChild(createIcon('database', 18, 'text-primary-400'));
    const sT = document.createElement('h3'); sT.className = 'font-bold text-slate-100'; sT.textContent = 'آمار داده‌های شما';
    sh.appendChild(sT); sb.appendChild(sh);
    const sg = document.createElement('div'); sg.className = 'grid grid-cols-3 gap-2';
    const sl = document.createElement('div'); sl.className = 'col-span-3 text-center text-xs text-slate-400 py-4'; sl.textContent = 'در حال محاسبه...';
    sg.appendChild(sl); sb.appendChild(sg);
    void getDatabase().getStats().then((s) => {
      sl.remove();
      [
        { v: s.totalNotes, l: 'یادداشت' },
        { v: s.totalFlashcards, l: 'فلش‌کارت' },
        { v: s.totalQuizzes, l: 'آزمون' },
      ].forEach((it) => {
        const b = document.createElement('div'); b.className = 'bg-slate-900/50 rounded-lg p-3 text-center';
        const v = document.createElement('div'); v.className = 'text-xl font-black text-primary-400'; v.textContent = toPersianDigits(String(it.v));
        const lb = document.createElement('div'); lb.className = 'text-[10px] text-slate-400 mt-0.5'; lb.textContent = it.l;
        b.appendChild(v); b.appendChild(lb);
        sg.appendChild(b);
      });
    });
    wrap.appendChild(sb);

    const bb = document.createElement('div');
    bb.className = 'bg-slate-800 border border-slate-700/70 rounded-xl p-4 space-y-3';
    const bh = document.createElement('div');
    bh.className = 'flex items-center gap-2 mb-2';
    bh.appendChild(createIcon('archive', 18, 'text-primary-400'));
    const bT = document.createElement('h3'); bT.className = 'font-bold text-slate-100'; bT.textContent = 'پشتیبان‌گیری و بازیابی';
    bh.appendChild(bT); bb.appendChild(bh);
    const desc = document.createElement('p');
    desc.className = 'text-xs text-slate-400 leading-relaxed mb-3';
    desc.textContent = 'قبل از پاک کردن داده‌ها یا تغییر دستگاه، یک پشتیبان بساز.';
    bb.appendChild(desc);

    bb.appendChild(createButton({
      label: 'دانلود خروجی JSON', variant: BUTTON_VARIANTS.PRIMARY,
      iconHtml: iconHTML('download', 16),
      onClick: async () => {
        try {
          const json = await getDatabase().exportData();
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `daneshyar-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
          URL.revokeObjectURL(url);
          getToast().success('فایل پشتیبان دانلود شد');
        } catch { getToast().error('خطا در خروجی'); }
      },
    }));

    bb.appendChild(createButton({
      label: 'بازیابی از فایل', variant: BUTTON_VARIANTS.GHOST,
      iconHtml: iconHTML('upload', 16),
      onClick: async () => {
        const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/json';
        input.addEventListener('change', async () => {
          const f = input.files?.[0]; if (!f) return;
          const ok = await getModal().confirm('بازیابی داده‌ها', 'داده‌های فعلی با فایل پشتیبان جایگزین می‌شوند. این عمل غیرقابل بازگشت است.', { confirmText: 'بازیابی', dangerMode: true });
          if (!ok) return;
          try {
            const text = await f.text();
            await getDatabase().importData(text);
            getToast().success('داده‌ها بازیابی شدند');
          } catch { getToast().error('فایل پشتیبان نامعتبر است'); }
        });
        input.click();
      },
    }));
    wrap.appendChild(bb);
    return wrap;
  }

  // ═════════════════════════════════════════════════════════
  // زیرصفحه پیشرفته
  // ═════════════════════════════════════════════════════════
  function buildAdvancedSubpage(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'space-y-4';
    const header = document.createElement('div');
    header.className = 'flex items-center gap-3 sticky top-0 bg-slate-900/95 backdrop-blur z-10 py-3 -mx-1 px-1';
    header.appendChild(createButton({ label: 'بازگشت', variant: BUTTON_VARIANTS.GHOST, size: BUTTON_SIZES.SM, iconHtml: iconHTML('back', 16), onClick: () => { phase = 'main'; render(); } }));
    const t = document.createElement('h1'); t.className = 'text-xl font-black text-slate-100 flex-1'; t.textContent = 'تنظیمات پیشرفته';
    header.appendChild(t);
    wrap.appendChild(header);

    const warn = document.createElement('div');
    warn.className = 'flex items-start gap-3 bg-accent-500/5 border border-accent-500/20 rounded-xl p-4';
    warn.appendChild(createIcon('alert-triangle', 18, 'text-accent-400 flex-shrink-0 mt-0.5'));
    const wTxt = document.createElement('p');
    wTxt.className = 'text-xs text-slate-300 leading-relaxed';
    wTxt.textContent = 'این گزینه‌ها روی داده‌های شما تأثیر می‌گذارند. با احتیاط استفاده کنید.';
    warn.appendChild(wTxt);
    wrap.appendChild(warn);

    const ops = document.createElement('div');
    ops.className = 'bg-slate-800 border border-slate-700/70 rounded-xl overflow-hidden divide-y divide-slate-700/60';

    ops.appendChild(createSettingsRow({
      icon: 'trash',
      title: 'پاک کردن کش برنامه',
      description: 'حافظه‌ی موقت را پاک می‌کند (داده‌ها حفظ می‌شوند)',
      onClick: async () => {
        const ok = await getModal().confirm('پاک کردن کش', 'آیا مطمئنی؟', { confirmText: 'پاک کن' });
        if (!ok) return;
        try {
          if ('caches' in window) {
            const names = await caches.keys();
            await Promise.all(names.map((n) => caches.delete(n)));
          }
          getToast().success('کش پاک شد');
        } catch { getToast().error('خطا در پاک کردن کش'); }
      },
    }));

    ops.appendChild(createSettingsRow({
      icon: 'refresh',
      title: 'ریست تنظیمات',
      description: 'تنظیمات را به حالت پیش‌فرض برمی‌گرداند',
      danger: true,
      onClick: async () => {
        const ok = await getModal().confirm('ریست تنظیمات', 'همه‌ی تنظیمات (به جز داده‌ها) به حالت پیش‌فرض برمی‌گردند.', { confirmText: 'ریست کن', dangerMode: true });
        if (!ok) return;
        try { localStorage.removeItem(SETTINGS_LS); } catch { /* ignore */ }
        getToast().success('تنظیمات ریست شد');
        render();
      },
    }));
    wrap.appendChild(ops);
    return wrap;
  }

  render();
  return container;
}

export default createSettingsView;