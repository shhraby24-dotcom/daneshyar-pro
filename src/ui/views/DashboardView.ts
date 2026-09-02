/**
 * ============================================================
 * دانش‌یار پرو - DashboardView (نسخه‌ی ۱۱ — آتشدانِ آرام)
 * ============================================================
 * 🔥 بازگشت شعله‌ی Lottie اصلی (با بهینه‌سازی: توقف هوشمند، بدون نشت)
 * 🧘 بدون هم‌پوشانی: هیچ margin منفی، هیچ اسکرول بریده‌شده
 * 🎯 یک اقدام اصلی + لانچر شبکه‌ای + روایت هفته + چالش‌ها
 * ❌ بدون خط کهکشانی · بدون ایموجی
 * @module ui/views/DashboardView
 * @version 11.0.0
 */
import { getRouter } from '@/core/Router';
import { getInstance as getLogger } from '@/core/Logger';
import { getDatabase } from '@/core/Database';
import { getStreakService, type StreakStats } from '@/services/StreakService';
import { getSRS, type Flashcard as SRSCard } from '@/services/SRS';
import { isPremium } from '@/services/Premium';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '@/ui/components/Button';
import { toPersianDigits } from '@/utils/dateFormatter';
import { getChallengesWithStatus } from '@/services/RewardEngine';
import { createIcon, iconHTML } from '@/services/IconService';
import lottie from 'lottie-web';
import flameAnim from '@/assets/flame.json';

const logger = getLogger().module('DashboardView');
const srs = getSRS();

const XP_KEY = 'daneshyar_xp';
const UPSELL_KEY = 'daneshyar_dash_upsell_dismissed';
const DAILY_GOAL = 20;
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const DAILY_TIPS = [
  'مرور فعال یعنی قبل از دیدن جواب، خودت آن را بگویی.',
  'جلسه‌ی کوتاه و پرتکرار، بهتر از یک جلسه‌ی طولانی است.',
  'سخت‌ترین کارت‌ها را درست قبل از خواب مرور کن.',
  'درس را برای یک شاگرد خیالی توضیح بده؛ بهترین راه یادگیری.',
  'اگر یادت نیامد ناامید نشو؛ تلاش برای یادآوری، حافظه را قوی می‌کند.',
  'بعد از هر جلسه، یک خط خلاصه به زبان خودت بنویس.',
  'تمرین مخلوط (چند موضوع) ماندگاری را بیشتر می‌کند.',
  'گوشی خاموش، خارج از دید — نه فقط بی‌صدا.',
  '۵ دقیقه قدم‌زدن بعد از مطالعه، حافظه را تثبیت می‌کند.',
  'سرفصل‌ها را به سوال تبدیل کن؛ مغز عاشق سوال است.',
  'مرور همان روز، برابر ده مرورِ هفته‌ی بعد ارزش دارد.',
  'جواب را بلند بگو یا بنویس؛ فقط خواندن کافی نیست.',
  'قانون پومودورو: ۲۵ دقیقه تمرکز، ۵ دقیقه استراحت واقعی.',
  'کارت‌های سخت گنج‌اند؛ مرورشان بیشترین ارزش را دارد.',
  'هر روز ساعت مشخص درس بخوان؛ عادت، اراده را آزاد می‌کند.',
  'قبل از مطالعه آب بخور؛ مغز تشنه دیر یاد می‌گیرد.',
];

function getXP(): number { try { return parseInt(localStorage.getItem(XP_KEY) || '0', 10) || 0; } catch { return 0; } }
const levelOf = (xp: number): number => Math.floor(xp / 100) + 1;
const dayTip = (): string => {
  const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return DAILY_TIPS[doy % DAILY_TIPS.length] ?? DAILY_TIPS[0] ?? 'مرور فعال یعنی قبل از دیدن جواب، خودت آن را بگویی.';
};

function companionLine(st: StreakStats, hasHistory: boolean, goalDone: boolean): string {
  if (!hasHistory) return 'خوش اومدی! بیا اولین شعله‌ات را روشن کنیم.';
  if (goalDone) return 'هدف امروز کامل شد — بهت افتخار می‌کنم!';
  if (st.studiedToday) return 'امروزت را روشن شروع کردی؛ همین‌طور ادامه بده.';
  if (st.currentStreak > 0) return `شعله‌ی ${toPersianDigits(String(st.currentStreak))} روزه‌ات منتظر توست؛ یک مرور کوچک کافی است.`;
  return 'اشکالی ندارد؛ امروز یک شروع تازه است.';
}

function statusChip(st: StreakStats, goalDone: boolean): string {
  if (goalDone) return 'شعله امروز بلند است';
  if (st.studiedToday) return 'شعله امروز روشن است';
  if (st.currentStreak > 0) return 'یک مرور کوتاه، شعله را نگه می‌دارد';
  return 'اولین شعله را روشن کن';
}

function burstConfetti(): void {
  if (REDUCED_MOTION) return;
  const c = document.createElement('div');
  c.style.cssText = 'position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:90;';
  const colors = ['#6366f1', '#fbbf24', '#10b981', '#f472b6', '#38bdf8'];
  for (let i = 0; i < 24; i++) {
    const p = document.createElement('span');
    const color = colors[i % colors.length] ?? '#fbbf24';
    p.style.cssText = `position:absolute;top:-14px;width:8px;height:12px;border-radius:2px;background:${color};left:${Math.random() * 100}%;`;
    c.appendChild(p);
    p.animate(
      [{ transform: 'translateY(0) rotate(0deg)', opacity: 1 }, { transform: `translateY(105vh) rotate(${540 + Math.random() * 360}deg)`, opacity: 0.9 }],
      { duration: 1400 + Math.random() * 600, delay: Math.random() * 400, easing: 'ease-in', fill: 'forwards' }
    );
  }
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 2400);
}

/** شعله‌ی Lottie اصلی — بهینه و بدون نشت حافظه */
function createStreakFlame(stats: StreakStats): HTMLElement {
  const alive = stats.currentStreak > 0;
  const surge = alive && stats.studiedToday;
  const wrap = document.createElement('div');
  wrap.className = 'streak-flame' + (alive ? '' : ' cold') + (surge ? ' surge' : '');
  wrap.style.cssText = 'display:flex;justify-content:center;align-items:center;width:100%;';
  const holder = document.createElement('div');
  holder.className = 'flame-canvas';
  holder.style.cssText = 'width:170px;height:190px;';
  wrap.appendChild(holder);

  const anim = lottie.loadAnimation({
    container: holder,
    renderer: 'svg',
    loop: true,
    autoplay: false,
    animationData: flameAnim,
  });
  anim.addEventListener('DOMLoaded', () => {
    if (!alive || REDUCED_MOTION) { anim.goToAndStop(0, true); return; }
    if (surge) {
      anim.setSpeed(2);
      setTimeout(() => anim.setSpeed(1), 1200);
    }
    anim.play();
  });

  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting && !document.hidden && alive && !REDUCED_MOTION) anim.play();
      else anim.pause();
    }
  }, { threshold: 0.1 });
  io.observe(wrap);

  const onVis = (): void => {
    if (document.hidden || !alive || REDUCED_MOTION) anim.pause();
    else anim.play();
  };
  document.addEventListener('visibilitychange', onVis);

  const mo = new MutationObserver(() => {
    if (!wrap.isConnected) {
      io.disconnect();
      mo.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      anim.destroy();
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
  return wrap;
}

/** شیت شناور XP */
function openXpSheet(): void {
  const xp = getXP();
  const level = levelOf(xp);
  const inLevel = xp % 100;
  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,23,.6);backdrop-filter:blur(2px);z-index:80;';
  const sheet = document.createElement('div');
  sheet.className = 'fixed bottom-0 inset-x-0 z-[81] mx-auto max-w-md rounded-t-2xl bg-slate-800 border border-slate-700 p-5 space-y-4';
  backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
  sheet.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
  const close = (): void => { backdrop.remove(); sheet.remove(); };
  backdrop.addEventListener('click', close);
  const handle = document.createElement('div');
  handle.className = 'w-10 h-1 rounded-full bg-slate-600 mx-auto';
  sheet.appendChild(handle);
  const head = document.createElement('div');
  head.className = 'flex items-center gap-3';
  const badge = document.createElement('div');
  badge.className = 'w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-lg font-black text-white';
  badge.textContent = toPersianDigits(String(level));
  const t = document.createElement('div');
  t.className = 'flex-1';
  const t1 = document.createElement('div'); t1.className = 'font-bold text-slate-100'; t1.textContent = `سطح ${toPersianDigits(String(level))}`;
  const t2 = document.createElement('div'); t2.className = 'text-xs text-slate-400'; t2.textContent = `مجموع ${toPersianDigits(String(xp))} XP · هر سطح = ۱۰۰ XP`;
  t.appendChild(t1); t.appendChild(t2);
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'w-9 h-9 rounded-full bg-slate-700/60 text-slate-300 flex items-center justify-center';
  closeBtn.innerHTML = iconHTML('close', 16);
  closeBtn.addEventListener('click', close);
  head.appendChild(badge); head.appendChild(t); head.appendChild(closeBtn);
  sheet.appendChild(head);
  const pRow = document.createElement('div');
  pRow.className = 'flex justify-between text-xs text-slate-400';
  const p1 = document.createElement('span'); p1.textContent = 'پیشرفت تا سطح بعد';
  const p2 = document.createElement('span'); p2.className = 'font-bold text-primary-300'; p2.textContent = `${toPersianDigits(String(inLevel))}/۱۰۰`;
  pRow.appendChild(p1); pRow.appendChild(p2);
  const bar = document.createElement('div');
  bar.className = 'h-2 bg-slate-900 rounded-full overflow-hidden';
  const fill = document.createElement('div');
  fill.className = 'h-full bg-gradient-to-l from-primary-400 to-accent-400';
  fill.style.width = `${inLevel}%`;
  bar.appendChild(fill);
  sheet.appendChild(pRow); sheet.appendChild(bar);
  const wTitle = document.createElement('div');
  wTitle.className = 'text-sm font-bold text-slate-100 flex items-center gap-2';
  wTitle.innerHTML = iconHTML('zap', 16);
  const wt = document.createElement('span'); wt.textContent = 'چطور XP بگیرم؟';
  wTitle.appendChild(wt);
  sheet.appendChild(wTitle);
  const ways: { icon: string; label: string; val: string; color: string }[] = [
    { icon: 'flashcards', label: 'مرور فلش‌کارت (آسان / سخت / نمی‌دانم)', val: '+۱۰ / +۵ / +۲', color: 'text-violet-300' },
    { icon: 'flame', label: 'پاداش کمبو برای پاسخ‌های درست متوالی', val: '+کمبو', color: 'text-accent-300' },
    { icon: 'quiz', label: 'هر پاسخ درست آزمون', val: '+۵', color: 'text-primary-300' },
  ];
  ways.forEach((w) => {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 bg-slate-900/50 rounded-lg p-2.5';
    const ic = document.createElement('span');
    ic.className = `${w.color} flex flex-shrink-0`;
    ic.innerHTML = iconHTML(w.icon, 16);
    const lb = document.createElement('span'); lb.className = 'flex-1 text-xs text-slate-300'; lb.textContent = w.label;
    const vl = document.createElement('span'); vl.className = `text-xs font-bold ${w.color}`; vl.textContent = w.val;
    row.appendChild(ic); row.appendChild(lb); row.appendChild(vl);
    sheet.appendChild(row);
  });
  const cta = createButton({
    label: 'شروع کسب XP', variant: BUTTON_VARIANTS.ACCENT, iconHtml: iconHTML('play', 16),
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
export async function createDashboardView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر داشبورد v11 (آتشدان آرام)');

  const [streakStats, flashcardsRaw, sessions, allNotes, activeChallenges] = await Promise.all([
    getStreakService().getStreakStats(),
    getDatabase().getFlashcards(),
    getDatabase().getStudySessions(),
    getDatabase().getNotes(),
    getChallengesWithStatus(),
  ]);

  const cards = flashcardsRaw as unknown as SRSCard[];
  const dueCount = srs.getDueCards(cards).length;
  const hardCount = cards.filter((c) => srs.isWeak(c)).length;
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todaySessions = sessions.filter((s) => new Date(s.date) >= todayStart).length;
  const goalDone = todaySessions >= DAILY_GOAL;
  const hasHistory = allNotes.length > 0 || cards.length > 0;
  const premium = isPremium();

  const container = document.createElement('div');
  container.className = 'mx-auto max-w-md space-y-4 px-1';

  // ── آن‌بوردینگ ──
  if (!hasHistory) {
    const hero = document.createElement('div');
    hero.className = 'relative overflow-hidden rounded-3xl border border-accent-500/20 px-5 pt-6 pb-6';
    hero.style.background = 'linear-gradient(180deg, rgba(30,27,75,.55) 0%, rgba(30,41,59,.9) 55%, rgba(120,53,15,.28) 100%), #1e293b';
    hero.appendChild(createStreakFlame(streakStats));
    const h1 = document.createElement('h1');
    h1.className = 'mt-2 text-center text-2xl font-black text-slate-100';
    h1.textContent = 'سفرت را شروع کن!';
    const d = document.createElement('p');
    d.className = 'mt-2 text-center text-sm leading-relaxed text-slate-300 px-2';
    d.textContent = 'به دانش‌یار خوش اومدی! اینجا متن‌هایت به دانش ماندگار تبدیل می‌شوند.';
    hero.appendChild(h1); hero.appendChild(d);
    container.appendChild(hero);

    const steps = [
      { num: '۱', icon: 'notes', title: 'اولین یادداشتت را بساز', desc: 'جزوه یا متن درسی‌ات را اضافه کن', route: 'notes' },
      { num: '۲', icon: 'flashcards', title: 'فلش‌کارت بساز', desc: 'از یادداشتت، کارت‌های مرور بساز', route: 'flashcards' },
      { num: '۳', icon: 'flame', title: 'هر روز مرور کن', desc: 'شعله‌ات را روشن نگه دار', route: 'flashcards' },
    ];
    const stepsWrap = document.createElement('div');
    stepsWrap.className = 'space-y-2';
    steps.forEach((step) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'group flex w-full items-center gap-3 rounded-2xl border border-slate-700 bg-slate-800 p-4 text-start transition-all hover:-translate-y-0.5 hover:border-accent-500/50';
      const num = document.createElement('div');
      num.className = 'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-accent-500/40 bg-accent-500/15 text-sm font-black text-accent-400';
      num.textContent = step.num;
      const ic = document.createElement('span');
      ic.className = 'flex flex-shrink-0 items-center text-primary-400 transition-transform group-hover:scale-110';
      ic.appendChild(createIcon(step.icon, 22));
      const tw = document.createElement('div');
      tw.className = 'min-w-0 flex-1';
      const tt = document.createElement('div'); tt.className = 'text-sm font-bold text-slate-100'; tt.textContent = step.title;
      const td = document.createElement('div'); td.className = 'text-xs text-slate-400'; td.textContent = step.desc;
      tw.appendChild(tt); tw.appendChild(td);
      const ar = document.createElement('span');
      ar.className = 'flex items-center text-slate-500 transition-all group-hover:-translate-x-1 group-hover:text-accent-400';
      ar.innerHTML = iconHTML('back', 16);
      el.appendChild(num); el.appendChild(ic); el.appendChild(tw); el.appendChild(ar);
      el.addEventListener('click', () => { void getRouter().navigate(step.route); });
      stepsWrap.appendChild(el);
    });
    container.appendChild(stepsWrap);
    return container;
  }

  // ── ۱) هیروی شعله (Lottie اصلی) ──
  const hero = document.createElement('div');
  hero.className = 'relative overflow-hidden rounded-3xl border border-accent-500/20 px-5 pt-6 pb-6';
  hero.style.background = 'linear-gradient(180deg, rgba(30,27,75,.55) 0%, rgba(30,41,59,.9) 55%, rgba(120,53,15,.28) 100%), #1e293b';

  // بج سطح (گوشه، بدون هیچ چیز اضافه)
  const xp = getXP();
  const lvlBadge = document.createElement('button');
  lvlBadge.type = 'button';
  lvlBadge.className = 'absolute top-4 end-4 flex items-center gap-1.5 bg-slate-900/60 backdrop-blur border border-slate-700 hover:border-slate-500 rounded-full px-2.5 py-1 transition-all active:scale-95';
  const lvlDot = document.createElement('div');
  lvlDot.className = 'w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-[10px] font-black text-white';
  lvlDot.textContent = toPersianDigits(String(levelOf(xp)));
  const chev = document.createElement('span');
  chev.className = 'text-slate-500 flex';
  chev.innerHTML = iconHTML('chevron-left', 12);
  lvlBadge.appendChild(lvlDot); lvlBadge.appendChild(chev);
  lvlBadge.addEventListener('click', () => openXpSheet());
  hero.appendChild(lvlBadge);

  hero.appendChild(createStreakFlame(streakStats));

  const numRow = document.createElement('div');
  numRow.className = 'mt-1 text-center';
  const big = document.createElement('div');
  big.className = 'text-6xl font-black tracking-tight text-accent-400 leading-none';
  big.textContent = toPersianDigits(String(streakStats.currentStreak));
  const lbl = document.createElement('div');
  lbl.className = 'mt-1 text-sm font-bold text-slate-200';
  lbl.textContent = 'روز شعله';
  numRow.appendChild(big); numRow.appendChild(lbl);
  hero.appendChild(numRow);

  const msg = document.createElement('p');
  msg.className = 'mt-3 text-center text-sm text-slate-300 leading-relaxed px-2';
  msg.textContent = companionLine(streakStats, hasHistory, goalDone);
  hero.appendChild(msg);

  const chip = document.createElement('div');
  chip.className = 'mt-3 flex justify-center';
  const chipIn = document.createElement('span');
  chipIn.className = 'inline-flex items-center gap-1.5 rounded-full bg-slate-900/60 backdrop-blur border border-slate-700 px-3 py-1 text-[11px] text-slate-300';
  chipIn.innerHTML = iconHTML('flame', 12, streakStats.currentStreak > 0 ? 'text-accent-400' : 'text-slate-500');
  const chipT = document.createElement('span');
  chipT.textContent = statusChip(streakStats, goalDone);
  chipIn.appendChild(chipT);
  chip.appendChild(chipIn);
  hero.appendChild(chip);
  container.appendChild(hero);

  // ── ۲) کارت اکشن (بدون هم‌پوشانی) ──
  const action = document.createElement('div');
  action.className = 'rounded-2xl bg-slate-800 border border-slate-700 p-4 space-y-3';
  const aTop = document.createElement('div');
  aTop.className = 'flex items-center justify-between gap-2';
  const aInfo = document.createElement('div');
  const aTitle = document.createElement('div');
  aTitle.className = 'text-base font-black text-slate-100';
  aTitle.textContent = dueCount > 0 ? `مرور ${toPersianDigits(String(dueCount))} کارت` : hardCount > 0 ? 'مرور کارت‌های سخت' : 'ساخت فلش‌کارت جدید';
  const aSub = document.createElement('div');
  aSub.className = 'text-[11px] text-slate-400 mt-0.5';
  aSub.textContent = dueCount > 0
    ? `تقریباً ${toPersianDigits(String(Math.max(1, Math.round((dueCount * 10) / 60))))} دقیقه`
    : 'یک قدم کوچک امروز، یک جهش بزرگ برای حافظه';
  aInfo.appendChild(aTitle); aInfo.appendChild(aSub);
  aTop.appendChild(aInfo);
  const R = 17; const C = 2 * Math.PI * R;
  const p = Math.min(todaySessions / DAILY_GOAL, 1);
  const ring = document.createElement('div');
  ring.className = 'relative flex-shrink-0';
  ring.innerHTML = `<svg width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="${R}" fill="none" stroke="#334155" stroke-width="5"/><circle cx="22" cy="22" r="${R}" fill="none" stroke="#fbbf24" stroke-width="5" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p)}" transform="rotate(-90 22 22)"/></svg>`;
  const ringTxt = document.createElement('div');
  ringTxt.className = 'absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-200';
  ringTxt.dir = 'ltr';
  ringTxt.textContent = `${Math.min(todaySessions, DAILY_GOAL)}/${DAILY_GOAL}`;
  ring.appendChild(ringTxt);
  aTop.appendChild(ring);
  action.appendChild(aTop);
  const cta = createButton({
    label: dueCount > 0 ? `شروع مرور (${toPersianDigits(String(dueCount))})` : hardCount > 0 ? 'مرور کارت‌های سخت' : 'ساخت فلش‌کارت',
    variant: BUTTON_VARIANTS.ACCENT, size: BUTTON_SIZES.LG,
    iconHtml: iconHTML('play', 18),
    onClick: () => { void getRouter().navigate('flashcards'); },
  });
  cta.classList.add('w-full');
  action.appendChild(cta);
  container.appendChild(action);

  // ── ۳) لانچر شبکه‌ای (بدون اسکرول بریده) ──
  const challengesActive = activeChallenges.filter((c) => !c.completed);
  const launcher = document.createElement('div');
  launcher.className = 'grid grid-cols-3 gap-2';
  const tiles: { route: string; icon: string; label: string; cls: string; badge?: number }[] = [
    { route: 'flashcards', icon: 'flashcards', label: 'فلش‌کارت', cls: 'text-violet-300 bg-violet-500/10', badge: dueCount || undefined },
    { route: 'notes', icon: 'notes', label: 'یادداشت‌ها', cls: 'text-primary-300 bg-primary-500/10' },
    { route: 'quiz', icon: 'quiz', label: 'آزمون', cls: 'text-accent-300 bg-accent-500/10' },
    { route: 'summarizer', icon: 'summarizer', label: 'خلاصه‌ساز', cls: 'text-teal-300 bg-teal-500/10' },
    { route: 'pomodoro', icon: 'pomodoro', label: 'تمرکز', cls: 'text-rose-300 bg-rose-500/10' },
    { route: 'challenges', icon: 'trophy', label: 'چالش‌ها', cls: 'text-green-300 bg-green-500/10', badge: challengesActive.length || undefined },
  ];
  tiles.forEach((q) => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'relative flex flex-col items-center gap-1.5 rounded-2xl bg-slate-800 border border-slate-700 p-3 min-h-[80px] justify-center transition-all hover:-translate-y-0.5 hover:border-slate-500';
    const ic = document.createElement('div');
    ic.className = `w-9 h-9 rounded-xl flex items-center justify-center ${q.cls}`;
    ic.appendChild(createIcon(q.icon, 18));
    const lb = document.createElement('span');
    lb.className = 'text-[11px] font-medium text-slate-300';
    lb.textContent = q.label;
    tile.appendChild(ic); tile.appendChild(lb);
    if (q.badge) {
      const b = document.createElement('span');
      b.className = 'absolute -top-1.5 -end-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center';
      b.textContent = toPersianDigits(String(q.badge));
      tile.appendChild(b);
    }
    tile.addEventListener('click', () => { void getRouter().navigate(q.route); });
    launcher.appendChild(tile);
  });
  container.appendChild(launcher);

  // ── ۴) روایت هفته ──
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7); weekAgo.setHours(0, 0, 0, 0);
  const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14); twoWeeksAgo.setHours(0, 0, 0, 0);
  const thisWeek = sessions.filter((s) => new Date(s.date) >= weekAgo).length;
  const lastWeek = sessions.filter((s) => new Date(s.date) >= twoWeeksAgo && new Date(s.date) < weekAgo).length;
  const story = document.createElement('div');
  story.className = 'rounded-2xl bg-slate-800 border border-slate-700 p-4 space-y-3';
  const sHead = document.createElement('div');
  sHead.className = 'flex items-center gap-2';
  sHead.appendChild(createIcon('trending', 16, 'text-primary-400'));
  const sT = document.createElement('h3');
  sT.className = 'text-sm font-bold text-slate-100';
  sT.textContent = 'این هفته‌ات';
  sHead.appendChild(sT);
  story.appendChild(sHead);
  const narrative = document.createElement('p');
  narrative.className = 'text-xs text-slate-300 leading-relaxed';
  if (thisWeek === 0) narrative.textContent = 'هنوز شروع نکرده‌ای؛ اولین مرور امروز، هفته‌ات را روشن می‌کند.';
  else if (lastWeek > 0 && thisWeek >= lastWeek) narrative.textContent = `${toPersianDigits(String(thisWeek))} جلسه مطالعه — ${toPersianDigits(String(Math.round(((thisWeek - lastWeek) / lastWeek) * 100)))}٪ جلوتر از هفته‌ی قبل. داری می‌درخشی!`;
  else if (lastWeek > thisWeek) narrative.textContent = `${toPersianDigits(String(thisWeek))} جلسه؛ کمی کمتر از هفته‌ی قبل — یک مرور کوچک امروز کافی است.`;
  else narrative.textContent = `${toPersianDigits(String(thisWeek))} جلسه مطالعه داشتی. ادامه بده!`;
  story.appendChild(narrative);
  if (thisWeek >= 3) {
    const days7: { label: string; count: number; today: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const count = sessions.filter((s) => { const sd = new Date(s.date); return sd >= d && sd < next; }).length;
      days7.push({ label: i === 0 ? 'امروز' : d.toLocaleDateString('fa-IR', { weekday: 'short' }), count, today: i === 0 });
    }
    const max = Math.max(...days7.map((x) => x.count), 1);
    const bars = document.createElement('div');
    bars.className = 'flex items-end justify-between gap-1.5 h-16';
    days7.forEach((d) => {
      const col = document.createElement('div');
      col.className = 'flex-1 flex flex-col items-center gap-0.5';
      const track = document.createElement('div');
      track.className = 'w-full h-12 bg-slate-700/30 rounded overflow-hidden flex items-end';
      const fillBar = document.createElement('div');
      fillBar.className = `w-full rounded-t ${d.today ? 'bg-accent-400' : 'bg-primary-500/70'}`;
      fillBar.style.height = `${Math.max((d.count / max) * 100, d.count > 0 ? 10 : 3)}%`;
      track.appendChild(fillBar);
      const lb = document.createElement('div');
      lb.className = `text-[9px] ${d.today ? 'text-accent-400 font-bold' : 'text-slate-500'}`;
      lb.textContent = d.label;
      col.appendChild(track); col.appendChild(lb);
      bars.appendChild(col);
    });
    story.appendChild(bars);
  }
  if (streakStats.nextMilestone) {
    const mRow = document.createElement('div');
    mRow.className = 'flex items-center gap-1.5 text-[11px] text-accent-300';
    const mT = document.createElement('span');
    mT.textContent = `${toPersianDigits(String(streakStats.nextMilestone.remaining))} روز تا رکورد ${toPersianDigits(String(streakStats.nextMilestone.target))} روز`;
    mRow.appendChild(mT);
    story.appendChild(mRow);
  }
  const tip = document.createElement('p');
  tip.className = 'text-[10px] text-slate-500 leading-relaxed border-t border-slate-700/60 pt-2';
  tip.textContent = `نکته‌ی روز: ${dayTip()}`;
  story.appendChild(tip);
  container.appendChild(story);

  // ── ) چالش‌های فعال ─
  if (challengesActive.length > 0) {
    const w = document.createElement('div');
    w.className = 'rounded-2xl bg-slate-800 border border-slate-700 p-4 space-y-2';
    const head = document.createElement('div');
    head.className = 'flex items-center justify-between';
    const title = document.createElement('div');
    title.className = 'flex items-center gap-2 text-sm font-bold text-slate-100';
    title.innerHTML = `<span class="text-primary-400 flex">${iconHTML('target', 16)}</span> <span>چالش‌های فعال</span>`;
    const viewAll = document.createElement('button');
    viewAll.type = 'button';
    viewAll.className = 'text-xs font-bold text-primary-400 hover:text-primary-300';
    viewAll.textContent = 'همه';
    viewAll.addEventListener('click', () => { void getRouter().navigate('challenges'); });
    head.appendChild(title); head.appendChild(viewAll);
    w.appendChild(head);
    challengesActive.slice(0, 2).forEach((ch) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'flex w-full items-center gap-2 rounded-xl bg-slate-900/50 p-2.5 text-start transition-all hover:bg-slate-900';
      const ic = document.createElement('div');
      ic.className = 'flex flex-shrink-0 items-center text-primary-400';
      ic.appendChild(createIcon('trophy', 18));
      const info = document.createElement('div');
      info.className = 'flex-1 min-w-0';
      const t = document.createElement('div');
      t.className = 'text-xs font-medium text-slate-200 truncate';
      t.textContent = ch.title;
      const pBar = document.createElement('div');
      pBar.className = 'mt-1 h-1 overflow-hidden rounded-full bg-slate-700';
      const pFill = document.createElement('div');
      pFill.className = 'h-full bg-primary-400 transition-all';
      pFill.style.width = `${ch.progress}%`;
      pBar.appendChild(pFill);
      info.appendChild(t); info.appendChild(pBar);
      const reward = document.createElement('div');
      reward.className = 'flex-shrink-0 text-center';
      const rn = document.createElement('div');
      rn.className = 'text-sm font-black text-primary-400';
      rn.textContent = '+' + toPersianDigits(String(ch.rewardDays));
      const rl = document.createElement('div');
      rl.className = 'flex items-center gap-0.5 text-[9px] text-slate-500';
      rl.innerHTML = `${iconHTML('award', 10)} <span>روز</span>`;
      reward.appendChild(rn); reward.appendChild(rl);
      item.appendChild(ic); item.appendChild(info); item.appendChild(reward);
      item.addEventListener('click', () => { void getRouter().navigate('challenges'); });
      w.appendChild(item);
    });
    container.appendChild(w);
  }

  // ── ۶) Upsell انتها ──
  if (!premium) {
    const today = new Date().toDateString();
    let dismissed = false;
    try { dismissed = localStorage.getItem(UPSELL_KEY) === today; } catch { /* ignore */ }
    if (!dismissed) {
      const upsell = document.createElement('div');
      upsell.className = 'flex items-center gap-2 rounded-2xl border border-accent-500/30 bg-accent-500/10 px-3 py-2.5';
      upsell.appendChild(createIcon('sparkles', 16, 'text-accent-400 flex-shrink-0'));
      const ut = document.createElement('div');
      ut.className = 'flex-1 text-xs text-slate-200';
      ut.textContent = 'با پریمیوم: مرور نامحدود، سهمیه AI بیشتر و قابلیت‌های ویژه';
      upsell.appendChild(ut);
      const go = document.createElement('button');
      go.type = 'button';
      go.className = 'text-xs font-bold text-accent-300 hover:text-accent-200 whitespace-nowrap';
      go.textContent = 'مشاهده';
      go.addEventListener('click', () => { void getRouter().navigate('premium'); });
      upsell.appendChild(go);
      const dismiss = document.createElement('button');
      dismiss.type = 'button';
      dismiss.className = 'flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-slate-200 flex-shrink-0';
      dismiss.innerHTML = iconHTML('close', 12);
      dismiss.setAttribute('aria-label', 'بستن');
      dismiss.addEventListener('click', () => {
        try { localStorage.setItem(UPSELL_KEY, today); } catch { /* ignore */ }
        upsell.remove();
      });
      upsell.appendChild(dismiss);
      container.appendChild(upsell);
    }
  }

  if (goalDone) burstConfetti();
  return container;
}

export default createDashboardView;