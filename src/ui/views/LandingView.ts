/**
 * ============================================================
 * دانش‌یار پرو - LandingView (نسخه‌ی ۵ — اصلاحیه‌ی نهایی)
 * ============================================================
 * 🔘 دکمه‌ها: goTo مقاوم (hash مستقیم + navigate) — بدون گیرکردن
 * 📈 منحنی فراموشی حرفه‌ای: محور، شبکه، ناحیه‌ی فراموشی، toggle دومرحله‌ای
 * 🎴 فلش‌کارت: لمس مقاوم (touch-action)، حفظ حالت هر کارت، fallback بدون backface
 * 📱 نمایش تب‌دار تعاملی: داشبورد/مرور/آزمون/تمرکز با رفتار زنده
 * 💰 ترتیب پلن‌ها: ماهانه → ترمیک (پیشنهاد) → سالانه (روبون طلایی صرفه)
 * 🎨 لوگو = آیکون واقعی اپ (جعبه‌ی تیره + کتاب طلایی)
 * @module ui/views/LandingView
 * @version 5.0.0
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getRouter } from '@/core/Router';
import { PLANS } from '@/services/Premium';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '@/ui/components/Button';
import { createIcon, iconHTML } from '@/services/IconService';
import { toPersianDigits } from '@/utils/dateFormatter';
import lottie from 'lottie-web';
import flameAnim from '@/assets/flame.json';

const logger = getLogger().module('LandingView');
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const SUPPORTS_BACKFACE = typeof CSS !== 'undefined' && CSS.supports('backface-visibility', 'hidden');
const faNum = (n: number): string => Math.round(n).toLocaleString('fa-IR');

/** ناوبری مقاوم: اول hash مستقیم (حتی اگر navigate داخلی گیر کند)، بعد navigate رسمی */
function goTo(route: string, params?: Record<string, string>): void {
  const router = getRouter();
  const q = params ? '?' + Object.keys(params).map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k] ?? '')}`).join('&') : '';
  if (!router.hasRoute(route)) {
    // تشخیص: چه routeهایی واقعاً ثبت شده‌اند؟
    logger.error('مسیر ثبت نشده است', { route, registered: router.getRoutes().map((r) => r.name) });
    // آخرین راه: ریدایرکت کامل از مسیر boot
    window.location.assign(`${window.location.pathname}#/${route}${q}`);
    window.location.reload();
    return;
  }
  try { window.location.hash = `#/${route}${q}`; } catch { /* ignore */ }
  void router.navigate(route, (params ?? {}) as Record<string, unknown>);
}

function injectStyle(): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = `
.ld-rev{opacity:0;transform:translateY(12px);transition:opacity .32s ease,transform .32s ease}
.ld-in{opacity:1;transform:none}
.ld-scene{perspective:1200px;touch-action:manipulation}
.ld-card-inner{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .45s cubic-bezier(.2,.7,.2,1);touch-action:manipulation}
.ld-card-inner.flipped{transform:rotateY(180deg)}
.ld-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:1rem;display:flex;flex-direction:column;justify-content:center;gap:.5rem;padding:1.25rem;text-align:center}
.ld-back{transform:rotateY(180deg)}
.ld-bar{transition:transform .22s ease,opacity .22s ease}
.ld-bar-off{transform:translateY(110%);opacity:0}
.ld-faq-a{display:none}
.ld-faq.open .ld-faq-a{display:block}
.ld-faq.open .ld-faq-chev{transform:rotate(-90deg)}
.ld-faq-chev{transition:transform .2s ease}
@keyframes ld-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.ld-shake{animation:ld-shake .3s ease}
@media (prefers-reduced-motion: reduce){
.ld-rev{transition:none;opacity:1;transform:none}
.ld-card-inner{transition:none}
.ld-bar{transition:none}
.ld-faq-chev{transition:none}
.ld-shake{animation:none}
}`;
  document.head.appendChild(style);
  return style;
}

// ============================================================
// شعله‌ی Lottie (با destroy قابل کنترل)
// ============================================================
function createLiveFlame(): { el: HTMLElement; destroy: () => void } {
  const holder = document.createElement('div');
  holder.className = 'h-20 mx-auto';
  holder.style.width = '70px';
  const anim = lottie.loadAnimation({
    container: holder, renderer: 'svg', loop: true, autoplay: false, animationData: flameAnim,
  });
  anim.addEventListener('DOMLoaded', () => {
    if (REDUCED) { anim.goToAndStop(20, true); return; }
    anim.play();
  });
  const io = new IntersectionObserver((es) => {
    es.forEach((en) => {
      if (en.isIntersecting && !document.hidden && !REDUCED) anim.play();
      else anim.pause();
    });
  }, { threshold: 0.2 });
  io.observe(holder);
  const destroy = (): void => { io.disconnect(); anim.destroy(); };
  return { el: holder, destroy };
}

// ============================================================
// فریم گوشی
// ============================================================
function phoneFrame(screen: HTMLElement): HTMLElement {
  const phone = document.createElement('div');
  phone.className = 'relative rounded-[2rem] border-4 border-slate-700 bg-slate-800 p-2 shadow-2xl mx-auto w-full max-w-[280px]';
  const notch = document.createElement('div');
  notch.className = 'absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-900 rounded-b-xl z-10';
  phone.appendChild(notch);
  screen.className += ' rounded-[1.6rem] bg-slate-900 p-3 pt-6 space-y-2 min-h-[320px]';
  phone.appendChild(screen);
  return phone;
}

function tile(icon: string, label: string, cls: string): HTMLElement {
  const t = document.createElement('div');
  t.className = 'bg-slate-800 rounded-md p-1.5 text-center';
  const ic = document.createElement('div');
  ic.className = `w-7 h-7 rounded-md mx-auto mb-1 flex items-center justify-center ${cls}`;
  ic.appendChild(createIcon(icon, 14));
  const lb = document.createElement('div');
  lb.className = 'text-[9px] text-slate-400';
  lb.textContent = label;
  t.appendChild(ic); t.appendChild(lb);
  return t;
}

// ============================================================
// نمایش تب‌دار تعاملی
// ============================================================
type ScreenBuild = { el: HTMLElement; teardown?: () => void };

function buildDashScreen(): ScreenBuild {
  const s = document.createElement('div');
  const top = document.createElement('div');
  top.className = 'flex items-center justify-between';
  const brand = document.createElement('div');
  brand.className = 'flex items-center gap-1.5';
  const lb = document.createElement('div');
  lb.className = 'w-5 h-5 rounded bg-gradient-to-br from-primary-500/20 to-accent-500/20 border border-slate-700 flex items-center justify-center text-accent-300';
  lb.appendChild(createIcon('books', 11));
  const ln = document.createElement('span');
  ln.className = 'text-[10px] font-bold text-slate-200';
  ln.textContent = 'دانش‌یار پرو';
  brand.appendChild(lb); brand.appendChild(ln);
  const chip = document.createElement('span');
  chip.className = 'inline-flex items-center gap-1 text-[9px] text-accent-300 bg-accent-500/10 rounded-full px-2 py-0.5';
  chip.innerHTML = iconHTML('flame', 10);
  const ct = document.createElement('span'); ct.textContent = '۴ روز';
  chip.appendChild(ct);
  top.appendChild(brand); top.appendChild(chip);
  s.appendChild(top);

  const flame = createLiveFlame();
  s.appendChild(flame.el);

  const num = document.createElement('div');
  num.className = 'text-center';
  const n1 = document.createElement('div');
  n1.className = 'text-xl font-black text-accent-400 leading-none';
  n1.textContent = '۴';
  const n2 = document.createElement('div');
  n2.className = 'text-[9px] text-slate-500 mt-0.5';
  n2.textContent = 'روز شعله';
  num.appendChild(n1); num.appendChild(n2);
  s.appendChild(num);

  const mission = document.createElement('div');
  mission.className = 'bg-slate-800 rounded-lg p-2';
  const m1 = document.createElement('div');
  m1.className = 'text-[10px] font-bold text-slate-200 mb-1';
  m1.textContent = 'مأموریت امروز';
  const bar = document.createElement('div');
  bar.className = 'h-1.5 rounded-full bg-slate-700 overflow-hidden';
  const fill = document.createElement('div');
  fill.className = 'h-full w-3/5 bg-primary-400 rounded-full';
  bar.appendChild(fill);
  const m2 = document.createElement('div');
  m2.className = 'text-[9px] text-slate-500 mt-1';
  m2.textContent = '۱۲ از ۲۰ مرور انجام شد';
  mission.appendChild(m1); mission.appendChild(bar); mission.appendChild(m2);
  s.appendChild(mission);

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-2 gap-1.5';
  grid.appendChild(tile('flashcards', 'فلش‌کارت', 'bg-violet-500/15 text-violet-300'));
  grid.appendChild(tile('notes', 'یادداشت', 'bg-primary-500/15 text-primary-300'));
  grid.appendChild(tile('quiz', 'آزمون', 'bg-accent-500/15 text-accent-300'));
  grid.appendChild(tile('pomodoro', 'تمرکز', 'bg-rose-500/15 text-rose-300'));
  s.appendChild(grid);
  return { el: s, teardown: flame.destroy };
}

function buildReviewScreen(): ScreenBuild {
  const s = document.createElement('div');
  const cards = [
    { q: 'قانون دوم نیوتن؟', a: 'F = m × a' },
    { q: 'وظیفه‌ی میتوکندری؟', a: 'تولید انرژی (ATP)' },
    { q: 'آرایه‌ی تشبیه؟', a: 'مانند کردن چیزی به چیز دیگر' },
  ];
  let idx = 0;
  let flipped = false;
  const chip = document.createElement('span');
  chip.className = 'inline-flex items-center gap-1 text-[9px] text-primary-300 bg-primary-500/10 rounded-full px-2 py-0.5';
  chip.innerHTML = iconHTML('flashcards', 10);
  const ct = document.createElement('span'); ct.textContent = '۸ کارت موعد';
  chip.appendChild(ct);
  s.appendChild(chip);

  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'w-full bg-slate-800 rounded-lg p-3 min-h-[130px] flex flex-col items-center justify-center gap-2 transition-transform active:scale-[.98]';
  card.style.touchAction = 'manipulation';
  const q = document.createElement('div');
  q.className = 'text-[11px] font-bold text-slate-100';
  const a = document.createElement('div');
  a.className = 'text-[11px] text-primary-300 hidden';
  const h = document.createElement('div');
  h.className = 'text-[9px] text-slate-500';
  h.textContent = 'برای دیدن جواب، لمس کن';
  card.appendChild(q); card.appendChild(a); card.appendChild(h);
  s.appendChild(card);

  const paint = (): void => {
    const c = cards[idx] ?? cards[0];
    q.textContent = c?.q ?? '';
    a.textContent = c?.a ?? '';
    q.classList.toggle('hidden', flipped);
    a.classList.toggle('hidden', !flipped);
    h.textContent = flipped ? 'برگشت' : 'برای دیدن جواب، لمس کن';
  };
  card.addEventListener('click', () => { flipped = !flipped; paint(); });
  paint();

  const btns = document.createElement('div');
  btns.className = 'grid grid-cols-3 gap-1';
  ['نمی‌دانم', 'سخت', 'آسان'].forEach((b) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'bg-slate-800 border border-slate-700 rounded-md py-2 text-center text-[9px] text-slate-300 active:scale-[.97] transition-transform';
    el.textContent = b;
    el.addEventListener('click', () => {
      idx = (idx + 1) % cards.length;
      flipped = false;
      paint();
      if (!REDUCED) card.animate([{ opacity: 0.4, transform: 'translateX(6px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 220, easing: 'ease-out' });
    });
    btns.appendChild(el);
  });
  s.appendChild(btns);
  return { el: s };
}

function buildQuizScreen(): ScreenBuild {
  const s = document.createElement('div');
  const chip = document.createElement('span');
  chip.className = 'inline-flex items-center gap-1 text-[9px] text-accent-300 bg-accent-500/10 rounded-full px-2 py-0.5';
  chip.innerHTML = iconHTML('quiz', 10);
  const ct = document.createElement('span'); ct.textContent = 'آزمون · سوال ۱ از ۴';
  chip.appendChild(ct);
  s.appendChild(chip);
  const q = document.createElement('div');
  q.className = 'text-[11px] font-bold text-slate-100 py-1';
  q.textContent = 'وظیفه‌ی میتوکندری کدام است؟';
  s.appendChild(q);
  const score = document.createElement('div');
  score.className = 'text-[9px] text-slate-500';
  score.textContent = 'امتیاز: ۰ از ۱';
  const opts = ['تولید پروتئین', 'تولید انرژی (ATP)', 'ذخیره‌ی آب', 'تقسیم سلول'];
  const rows: HTMLButtonElement[] = [];
  opts.forEach((opt, i) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'w-full bg-slate-800 border border-slate-700 text-slate-300 rounded-md p-2 text-[9px] text-start transition-all';
    el.textContent = opt;
    el.addEventListener('click', () => {
      rows.forEach((r) => { r.disabled = false; r.className = 'w-full bg-slate-800 border border-slate-700 text-slate-300 rounded-md p-2 text-[9px] text-start transition-all'; });
      if (i === 1) {
        el.className = 'w-full bg-slate-800 border border-primary-500 text-primary-300 rounded-md p-2 text-[9px] text-start';
        score.textContent = 'امتیاز: ۱ از ۱ — آفرین!';
      } else {
        el.className = 'w-full bg-slate-800 border border-red-500/60 text-red-300 rounded-md p-2 text-[9px] text-start ld-shake';
        score.textContent = 'اشتباه بود؛ دوباره امتحان کن.';
      }
    });
    rows.push(el);
    s.appendChild(el);
  });
  s.appendChild(score);
  return { el: s };
}

function buildFocusScreen(): ScreenBuild {
  const s = document.createElement('div');
  s.className += ' flex flex-col items-center justify-center gap-2';
  const R = 30; const C = 2 * Math.PI * R;
  const ring = document.createElement('div');
  ring.className = 'relative';
  ring.innerHTML = `<svg width="96" height="96" viewBox="0 0 84 84"><circle cx="42" cy="42" r="${R}" fill="none" stroke="#334155" stroke-width="6"/><circle class="ld-ring-fg" cx="42" cy="42" r="${R}" fill="none" stroke="#fbbf24" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * 0.35}" transform="rotate(-90 42 42)"/></svg>`;
  const txt = document.createElement('div');
  txt.className = 'absolute inset-0 flex items-center justify-center text-base font-black text-slate-100';
  txt.dir = 'ltr';
  s.appendChild(ring);
  const lb = document.createElement('div');
  lb.className = 'text-[10px] text-slate-400';
  lb.textContent = 'جلسه‌ی تمرکز';
  s.appendChild(lb);

  let seconds = 25 * 60 - 1;
  let running = true;
  const paintTime = (): void => {
    const m = Math.floor(seconds / 60);
    const ss = seconds % 60;
    txt.textContent = `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };
  paintTime();
  ring.appendChild(txt);
  const interval = window.setInterval(() => {
    if (!running) return;
    seconds = Math.max(0, seconds - 1);
    paintTime();
  }, 1000);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'text-[10px] font-bold text-slate-200 bg-slate-800 border border-slate-700 rounded-full px-4 py-2 active:scale-[.97] transition-transform';
  toggle.textContent = 'توقف';
  toggle.addEventListener('click', () => {
    running = !running;
    toggle.textContent = running ? 'توقف' : 'ادامه';
  });
  s.appendChild(toggle);

  const chips = document.createElement('div');
  chips.className = 'flex gap-1';
  ['صدای باران', 'ویبره روشن'].forEach((c) => {
    const el = document.createElement('span');
    el.className = 'text-[9px] text-slate-400 bg-slate-800 border border-slate-700 rounded-full px-2 py-0.5';
    el.textContent = c;
    chips.appendChild(el);
  });
  s.appendChild(chips);
  return { el: s, teardown: () => window.clearInterval(interval) };
}

function createShowcase(onUnmount: (fn: () => void) => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'space-y-4';
  const tabsRow = document.createElement('div');
  tabsRow.className = 'flex flex-wrap justify-center gap-2';
  const phoneHolder = document.createElement('div');
  phoneHolder.className = 'ld-rev';

  let teardown: (() => void) | null = null;
  onUnmount(() => { if (teardown) teardown(); });

  const builders: { id: string; label: string; build: () => ScreenBuild }[] = [
    { id: 'dash', label: 'داشبورد', build: buildDashScreen },
    { id: 'review', label: 'مرور', build: buildReviewScreen },
    { id: 'quiz', label: 'آزمون', build: buildQuizScreen },
    { id: 'focus', label: 'تمرکز', build: buildFocusScreen },
  ];
  const tabBtns: HTMLButtonElement[] = [];

  const show = (i: number): void => {
    if (teardown) { teardown(); teardown = null; }
    const def = builders[i] ?? builders[0];
    const built = def ? def.build() : buildDashScreen();
    teardown = built.teardown ?? null;
    const old = phoneHolder.firstElementChild as HTMLElement | null;
    const frame = phoneFrame(built.el);
    if (old) {
      if (!REDUCED) {
        old.animate([{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(-14px)' }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
      }
      window.setTimeout(() => old.remove(), REDUCED ? 0 : 160);
    }
    phoneHolder.appendChild(frame);
    if (!REDUCED) {
      frame.animate([{ opacity: 0, transform: 'translateX(14px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 220, easing: 'ease-out' });
    }
    tabBtns.forEach((b, bi) => {
      b.className = bi === i
        ? 'min-h-11 px-4 rounded-full text-xs font-bold bg-primary-500 text-white transition-all'
        : 'min-h-11 px-4 rounded-full text-xs font-medium bg-slate-800 border border-slate-700 text-slate-400 transition-all';
    });
  };

  builders.forEach((b, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = b.label;
    btn.addEventListener('click', () => show(i));
    tabBtns.push(btn);
    tabsRow.appendChild(btn);
  });

  wrap.appendChild(tabsRow);
  wrap.appendChild(phoneHolder);
  show(0);
  return wrap;
}

// ============================================================
// دمو فلش‌کارت (مقاوم + حفظ حالت)
// ============================================================
const DEMO_CARDS: { q: string; a: string }[] = [
  { q: 'قانون دوم نیوتن؟', a: 'F = m × a — نیرو برابر است با حاصل‌ضرب جرم در شتاب.' },
  { q: 'وظیفه‌ی میتوکندری؟', a: 'تولید انرژی (ATP)؛ نیروگاهِ سلول.' },
  { q: 'آرایه‌ی «تشبیه» یعنی چه؟', a: 'مانند کردن چیزی به چیز دیگر، با ارکان چهارگانه.' },
];

function createFlashDemo(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'space-y-3 max-w-sm mx-auto';
  const scene = document.createElement('button');
  scene.type = 'button';
  scene.className = 'ld-scene block w-full h-44 select-none touch-manipulation';
  scene.setAttribute('aria-label', 'کارت نمونه — برای دیدن جواب، لمس کن');
  const inner = document.createElement('div');
  inner.className = 'ld-card-inner';

  const front = document.createElement('div');
  front.className = 'ld-face bg-slate-800 border border-slate-700';
  const fq = document.createElement('div');
  fq.className = 'text-base font-bold text-slate-100';
  const fa = document.createElement('div');
  fa.className = 'text-[11px] text-slate-500';
  fa.textContent = 'برای دیدن جواب، کارت را لمس کن';
  front.appendChild(fq); front.appendChild(fa);

  const back = document.createElement('div');
  back.className = 'ld-face ld-back bg-slate-800 border border-primary-500/40';
  const ba = document.createElement('div');
  ba.className = 'text-sm text-slate-200 leading-relaxed';
  back.appendChild(ba);

  inner.appendChild(front); inner.appendChild(back);
  scene.appendChild(inner);
  wrap.appendChild(scene);

  const ctrl = document.createElement('div');
  ctrl.className = 'flex items-center justify-center gap-2';
  const dots: HTMLButtonElement[] = [];
  const msg = document.createElement('p');
  msg.className = 'text-center text-[11px] text-slate-500 leading-relaxed hidden';
  msg.textContent = 'این کارت‌ها سرِ وقت برمی‌گردند — اسمش مرور فاصله‌دار است.';

  let idx = 0;
  const flipped = [false, false, false];

  const paint = (): void => {
    const card = DEMO_CARDS[idx] ?? DEMO_CARDS[0];
    fq.textContent = card?.q ?? '';
    ba.textContent = card?.a ?? '';
    const isFlipped = flipped[idx] === true;
    inner.classList.toggle('flipped', isFlipped);
    if (!SUPPORTS_BACKFACE) {
      front.style.visibility = isFlipped ? 'hidden' : 'visible';
      back.style.visibility = isFlipped ? 'visible' : 'hidden';
    }
    dots.forEach((d, i) => {
      d.className = `min-w-11 min-h-11 flex items-center justify-center rounded-full ${i === idx ? '' : 'opacity-60'}`;
      const dot = d.firstElementChild as HTMLElement;
      dot.className = `rounded-full transition-all ${i === idx ? 'w-5 h-2 bg-primary-400' : 'w-2 h-2 bg-slate-600'}`;
    });
  };
  const checkDone = (): void => { if (flipped.every((f) => f)) msg.classList.remove('hidden'); };
  const toggle = (): void => {
    flipped[idx] = !flipped[idx];
    paint();
    checkDone();
  };
  scene.addEventListener('click', toggle);

  DEMO_CARDS.forEach((_, i) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.setAttribute('aria-label', `کارت ${i + 1}`);
    const dot = document.createElement('span');
    d.appendChild(dot);
    d.addEventListener('click', (e) => { e.stopPropagation(); idx = i; paint(); });
    dots.push(d);
    ctrl.appendChild(d);
  });
  paint();
  wrap.appendChild(ctrl);
  wrap.appendChild(msg);
  return wrap;
}

// ============================================================
// منحنی فراموشی حرفه‌ای (toggle دومرحله‌ای)
// ============================================================
function createCurveDemo(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'space-y-4 max-w-md mx-auto';
  const box = document.createElement('div');
  box.className = 'relative bg-slate-800 border border-slate-700 rounded-2xl p-4';

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 320 200');
  svg.setAttribute('class', 'w-full h-auto');

  // شبکه + محور
  [40, 80, 120, 160].forEach((y) => {
    const l = document.createElementNS(svgNS, 'line');
    l.setAttribute('x1', '36'); l.setAttribute('x2', '312');
    l.setAttribute('y1', String(y)); l.setAttribute('y2', String(y));
    l.setAttribute('stroke', '#334155'); l.setAttribute('stroke-width', '0.6');
    svg.appendChild(l);
  });
  const yLabels: [string, number][] = [['۱۰۰٪', 34], ['۵۰٪', 104], ['۰٪', 172]];
  yLabels.forEach(([t, y]) => {
    const tx = document.createElementNS(svgNS, 'text');
    tx.setAttribute('x', '30'); tx.setAttribute('y', String(y));
    tx.setAttribute('text-anchor', 'end'); tx.setAttribute('fill', '#64748b');
    tx.setAttribute('font-size', '9');
    tx.textContent = t;
    svg.appendChild(tx);
  });
  const xLabels: [string, number, string][] = [['روز اول', 36, 'start'], ['هفته‌ها بعد', 312, 'end']];
  xLabels.forEach(([t, x, anc]) => {
    const tx = document.createElementNS(svgNS, 'text');
    tx.setAttribute('x', String(x)); tx.setAttribute('y', '190');
    tx.setAttribute('text-anchor', anc); tx.setAttribute('fill', '#64748b');
    tx.setAttribute('font-size', '9');
    tx.textContent = t;
    svg.appendChild(tx);
  });

  // ناحیه‌ی فراموشی
  const forget = document.createElementNS(svgNS, 'g');
  const fRect = document.createElementNS(svgNS, 'rect');
  fRect.setAttribute('x', '110'); fRect.setAttribute('y', '20');
  fRect.setAttribute('width', '120'); fRect.setAttribute('height', '150');
  fRect.setAttribute('fill', '#ef4444'); fRect.setAttribute('opacity', '0.06');
  const fTxt = document.createElementNS(svgNS, 'text');
  fTxt.setAttribute('x', '170'); fTxt.setAttribute('y', '184');
  fTxt.setAttribute('text-anchor', 'middle'); fTxt.setAttribute('fill', '#f87171');
  fTxt.setAttribute('font-size', '9'); fTxt.setAttribute('opacity', '0.9');
  fTxt.textContent = 'نقطه‌ی فراموشی';
  forget.appendChild(fRect); forget.appendChild(fTxt);
  svg.appendChild(forget);

  // سطح‌ها (area)
  const D_WITHOUT = 'M36,30 C90,34 120,90 170,120 S270,160 312,166';
  const D_WITH = 'M36,30 C60,50 76,66 88,80 L88,44 C116,62 132,76 144,88 L144,52 C176,70 196,84 208,94 L208,60 C244,78 268,90 280,98 L280,66 C296,78 306,86 312,90';
  const areaWithout = document.createElementNS(svgNS, 'path');
  areaWithout.setAttribute('d', `${D_WITHOUT} L312,170 L36,170 Z`);
  areaWithout.setAttribute('fill', '#64748b'); areaWithout.setAttribute('opacity', '0.08');
  const areaWith = document.createElementNS(svgNS, 'path');
  areaWith.setAttribute('d', `${D_WITH} L312,170 L36,170 Z`);
  areaWith.setAttribute('fill', '#818cf8'); areaWith.setAttribute('opacity', '0');
  svg.appendChild(areaWithout); svg.appendChild(areaWith);

  // منحنی‌ها
  const p1 = document.createElementNS(svgNS, 'path');
  p1.setAttribute('d', D_WITHOUT);
  p1.setAttribute('fill', 'none'); p1.setAttribute('stroke', '#64748b');
  p1.setAttribute('stroke-width', '2.5'); p1.setAttribute('stroke-linecap', 'round');
  const p2 = document.createElementNS(svgNS, 'path');
  p2.setAttribute('d', D_WITH);
  p2.setAttribute('fill', 'none'); p2.setAttribute('stroke', '#818cf8');
  p2.setAttribute('stroke-width', '3'); p2.setAttribute('stroke-linecap', 'round');
  p2.setAttribute('opacity', '0');
  svg.appendChild(p1); svg.appendChild(p2);

  // نقطه‌های مرور
  const dotsG = document.createElementNS(svgNS, 'g');
  dotsG.setAttribute('opacity', '0');
  const dotXY: [number, number][] = [[88, 44], [144, 52], [208, 60], [280, 66]];
  const dotEls: SVGCircleElement[] = [];
  dotXY.forEach(([x, y]) => {
    const c = document.createElementNS(svgNS, 'circle');
    c.setAttribute('cx', String(x)); c.setAttribute('cy', String(y));
    c.setAttribute('r', '5'); c.setAttribute('fill', '#fbbf24');
    dotsG.appendChild(c);
    dotEls.push(c);
  });
  svg.appendChild(dotsG);
  box.appendChild(svg);

  const legend = document.createElement('div');
  legend.className = 'flex flex-wrap gap-2 mt-3';
  const l1 = document.createElement('span');
  l1.className = 'inline-flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900/60 border border-slate-700 rounded-full px-2.5 py-1';
  l1.innerHTML = '<span style="width:10px;height:3px;border-radius:2px;background:#64748b;display:inline-block"></span>';
  const l1t = document.createElement('span'); l1t.textContent = 'بدون مرور';
  l1.appendChild(l1t);
  const l2 = document.createElement('span');
  l2.className = 'inline-flex items-center gap-1.5 text-[11px] text-primary-300 bg-slate-900/60 border border-slate-700 rounded-full px-2.5 py-1';
  l2.innerHTML = '<span style="width:10px;height:3px;border-radius:2px;background:#818cf8;display:inline-block"></span>';
  const l2t = document.createElement('span'); l2t.textContent = 'با مرور فاصله‌دار';
  l2.appendChild(l2t);
  const tag = document.createElement('span');
  tag.className = 'inline-flex items-center gap-1.5 text-[11px] font-bold text-accent-300 bg-accent-500/10 border border-accent-500/30 rounded-full px-2.5 py-1 opacity-0 transition-opacity';
  tag.innerHTML = iconHTML('flame', 12);
  const tagT = document.createElement('span'); tagT.textContent = 'یادآوری مرور';
  tag.appendChild(tagT);
  legend.appendChild(l1); legend.appendChild(l2); legend.appendChild(tag);
  box.appendChild(legend);
  wrap.appendChild(box);

  const btn = createButton({
    label: 'مرور را روشن کن', variant: BUTTON_VARIANTS.PRIMARY, size: BUTTON_SIZES.MD,
    iconHtml: iconHTML('refresh', 16), onClick: () => setMode(!withMode),
  });
  btn.classList.add('w-full');
  wrap.appendChild(btn);

  const caption = document.createElement('p');
  caption.className = 'text-[11px] text-slate-500 text-center leading-relaxed';
  caption.textContent = 'دانش‌یار زمان مرور هر کارت را بر اساس عملکردت تنظیم می‌کند.';
  wrap.appendChild(caption);

  let withMode = false;
  let drawn = false;

  const drawPath = (p: SVGPathElement, dur: number, delay = 0): void => {
    if (REDUCED) { p.style.strokeDasharray = 'none'; p.setAttribute('opacity', '1'); return; }
    const len = p.getTotalLength();
    p.style.strokeDasharray = String(len);
    p.animate([{ strokeDashoffset: len, opacity: 1 }, { strokeDashoffset: 0, opacity: 1 }], { duration: dur, delay, easing: 'ease-out', fill: 'forwards' });
  };

  const setMode = (toWith: boolean): void => {
    withMode = toWith;
    if (toWith) {
      forget.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
      p1.animate([{ opacity: 1 }, { opacity: 0.3 }], { duration: 300, fill: 'forwards' });
      areaWithout.animate([{ opacity: 0.08 }, { opacity: 0.03 }], { duration: 300, fill: 'forwards' });
      p2.setAttribute('opacity', '1');
      drawPath(p2, 900);
      areaWith.animate([{ opacity: 0 }, { opacity: 0.14 }], { duration: 600, delay: 400, fill: 'forwards' });
      dotsG.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 700, fill: 'forwards' });
      if (!REDUCED) {
        dotEls.forEach((c, i) => {
          c.style.transformBox = 'fill-box';
          c.style.transformOrigin = 'center';
          c.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 1400, delay: 900 + i * 200, iterations: Infinity, easing: 'ease-in-out' });
        });
      }
      tag.style.opacity = '1';
      btn.textContent = 'حالت بدون مرور';
    } else {
      forget.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'forwards' });
      p1.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 300, fill: 'forwards' });
      areaWithout.animate([{ opacity: 0.03 }, { opacity: 0.08 }], { duration: 300, fill: 'forwards' });
      p2.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
      areaWith.animate([{ opacity: 0.14 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
      dotsG.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
      tag.style.opacity = '0';
      btn.textContent = 'مرور را روشن کن';
    }
  };

  const io = new IntersectionObserver((es) => {
    es.forEach((en) => {
      if (en.isIntersecting && !drawn) {
        drawn = true;
        drawPath(p1, 800);
        io.disconnect();
      }
    });
  }, { threshold: 0.4 });
  io.observe(box);

  return wrap;
}

// ============================================================
// View اصلی
// ============================================================
export async function createLandingView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر لندینگ v5');
  const style = injectStyle();

  const root = document.createElement('div');
  root.className = 'fixed inset-0 z-[70] bg-slate-950 overflow-y-auto';

  const observers: IntersectionObserver[] = [];
  const cleanups: (() => void)[] = [
    () => style.remove(),
    () => observers.forEach((o) => o.disconnect()),
  ];
  const mo = new MutationObserver(() => {
    if (!root.isConnected) { cleanups.forEach((fn) => fn()); mo.disconnect(); }
  });
  mo.observe(document.body, { childList: true, subtree: true });
  cleanups.push(() => mo.disconnect());

  // ── تاپ‌بار (لوگو = آیکون واقعی اپ) ──
  const topbar = document.createElement('div');
  topbar.className = 'sticky top-0 z-40 bg-slate-950/85 backdrop-blur border-b border-slate-800/60';
  const tbIn = document.createElement('div');
  tbIn.className = 'max-w-md md:max-w-2xl lg:max-w-5xl mx-auto flex items-center justify-between px-5 py-3';
  const logo = document.createElement('div');
  logo.className = 'flex items-center gap-2';
  const logoBox = document.createElement('div');
  logoBox.className = 'w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500/20 to-accent-500/20 border border-slate-700 flex items-center justify-center text-accent-300 shadow-lg';
  logoBox.appendChild(createIcon('books', 18));
  const logoTxt = document.createElement('span');
  logoTxt.className = 'font-black text-slate-100 text-sm';
  logoTxt.textContent = 'دانش‌یار پرو';
  logo.appendChild(logoBox); logo.appendChild(logoTxt);
  tbIn.appendChild(logo);
  tbIn.appendChild(createButton({
    label: 'ورود', variant: BUTTON_VARIANTS.GHOST, size: BUTTON_SIZES.SM,
    onClick: () => goTo('auth'),
  }));
  topbar.appendChild(tbIn);
  root.appendChild(topbar);

  const page = document.createElement('div');
  page.className = 'max-w-md md:max-w-2xl lg:max-w-5xl mx-auto px-5';
  page.style.paddingBottom = 'calc(96px + env(safe-area-inset-bottom))';

  const sec = (cls: string): HTMLElement => {
    const s = document.createElement('section');
    s.className = cls;
    page.appendChild(s);
    return s;
  };
  const h2 = (text: string, sub?: string): HTMLElement => {
    const wrap = document.createElement('div');
    wrap.className = 'ld-rev mb-6';
    const h = document.createElement('h2');
    h.className = 'font-black text-slate-100';
    h.style.fontSize = 'clamp(22px, 6vw, 28px)';
    h.style.lineHeight = '1.5';
    h.textContent = text;
    wrap.appendChild(h);
    if (sub) {
      const p = document.createElement('p');
      p.className = 'text-sm text-slate-400 mt-2 leading-relaxed';
      p.textContent = sub;
      wrap.appendChild(p);
    }
    return wrap;
  };

  // ═══ ۱) هیرو ═══
  const hero = sec('pt-10 pb-14');
  const heroGrid = document.createElement('div');
  heroGrid.className = 'grid gap-10 lg:grid-cols-2 lg:items-center';
  const copyCol = document.createElement('div');
  const kicker = document.createElement('span');
  kicker.className = 'ld-rev inline-flex items-center gap-1.5 text-[11px] font-bold text-primary-300 bg-primary-500/10 border border-primary-500/25 rounded-full px-3 py-1.5 mb-4';
  kicker.innerHTML = iconHTML('sparkles', 12);
  const kt = document.createElement('span'); kt.textContent = 'دستیار مطالعه‌ی شخصی فارسی';
  kicker.appendChild(kt);
  copyCol.appendChild(kicker);
  const h1 = document.createElement('h1');
  h1.className = 'ld-rev font-black text-slate-100 mb-4';
  h1.style.fontSize = 'clamp(28px, 8vw, 40px)';
  h1.style.lineHeight = '1.4';
  h1.innerHTML = 'درس خواندن را<br><span class="bg-gradient-to-l from-primary-400 to-accent-400 bg-clip-text text-transparent">هوشمندتر</span> کن،<br>نه سخت‌تر.';
  copyCol.appendChild(h1);
  const sub = document.createElement('p');
  sub.className = 'ld-rev text-base text-slate-400 leading-relaxed mb-6';
  sub.textContent = 'یادداشت، فلش‌کارت، مرور و تمرکز حتی بدون اینترنت؛ ابزارهای هوشمند هنگام اتصال به اینترنت فعال می‌شوند.';
  copyCol.appendChild(sub);
  const heroCta = createButton({
    label: 'رایگان شروع کن', variant: BUTTON_VARIANTS.ACCENT, size: BUTTON_SIZES.LG,
    iconHtml: iconHTML('chevron-left', 18),
    onClick: () => goTo('dashboard'),
  });
  heroCta.classList.add('ld-rev', 'w-full', 'md:w-auto', 'md:px-10', 'active:scale-[.97]');
  copyCol.appendChild(heroCta);
  const micro = document.createElement('p');
  micro.className = 'ld-rev text-[11px] text-slate-500 mt-3';
  micro.textContent = 'رایگان برای همیشه · بدون ثبت‌نام · داده‌ها فقط روی گوشی تو';
  copyCol.appendChild(micro);
  heroGrid.appendChild(copyCol);
  const mockCol = document.createElement('div');
  mockCol.className = 'ld-rev';
  mockCol.appendChild(phoneFrame(buildDashScreen().el));
  const cap = document.createElement('p');
  cap.className = 'text-center text-[11px] text-slate-500 mt-3';
  cap.textContent = 'این چیزی است که وقتی وارد می‌شوی می‌بینی.';
  mockCol.appendChild(cap);
  heroGrid.appendChild(mockCol);
  hero.appendChild(heroGrid);

  // ═══ ) نوار اعتماد ══
  const strip = sec('py-6 border-t border-slate-800/60');
  const stripIn = document.createElement('div');
  stripIn.className = 'ld-rev text-center';
  const s1 = document.createElement('div');
  s1.className = 'text-sm font-bold text-slate-200';
  s1.textContent = 'ساخته‌شده توسط یک دانش‌آموز، برای دانش‌آموزها.';
  const s2 = document.createElement('div');
  s2.className = 'text-xs text-slate-500 mt-1 leading-relaxed';
  s2.textContent = 'دانش‌یار از یک نیاز ساده شروع شد: همه‌ی ابزارهای مطالعه‌ی روزانه، در یک جا.';
  stripIn.appendChild(s1); stripIn.appendChild(s2);
  strip.appendChild(stripIn);

  // ═══ ۳) درد ═══
  const pain = sec('py-14 border-t border-slate-800/60');
  pain.appendChild(h2('مشکل، فقط درس نخواندن نیست.', 'تنبلی نیست؛ مطالعه‌ی پراکنده سخت است.'));
  const painList = document.createElement('div');
  painList.className = 'divide-y divide-slate-800 md:grid md:grid-cols-3 md:gap-8 md:divide-y-0';
  [
    { icon: 'brain', t: 'فراموش می‌کنم', d: 'مطالب را می‌خوانم، اما مرورشان نمی‌کنم.' },
    { icon: 'target', t: 'پراکنده‌ام', d: 'هر ابزار مطالعه یک جای مختلف است.' },
    { icon: 'flame', t: 'استمرار ندارم', d: 'چند روز خوب پیش می‌روم و بعد رها می‌کنم.' },
  ].forEach((p) => {
    const row = document.createElement('div');
    row.className = 'ld-rev flex gap-4 items-start py-5 md:py-0 md:block';
    const ic = document.createElement('div');
    ic.className = 'w-10 h-10 rounded-lg bg-primary-500/15 text-primary-400 flex items-center justify-center flex-shrink-0 md:mb-3';
    ic.appendChild(createIcon(p.icon, 20));
    const tt = document.createElement('div'); tt.className = 'text-sm font-bold text-slate-100 mb-1'; tt.textContent = p.t;
    const dd = document.createElement('div'); dd.className = 'text-xs text-slate-400 leading-relaxed'; dd.textContent = p.d;
    row.appendChild(ic); row.appendChild(tt); row.appendChild(dd);
    painList.appendChild(row);
  });
  pain.appendChild(painList);

  // ═══ ۴) سه قدم ═══
  const how = sec('py-14 border-t border-slate-800/60');
  how.appendChild(h2('در ۳ قدم شروع کن.'));
  const tl = document.createElement('ol');
  tl.className = 'relative border-s border-slate-700 ps-6 space-y-8 max-w-md mx-auto';
  [
    { t: 'درس را وارد کن', d: 'متن یا جزوه‌ات را در دانش‌یار قرار بده.' },
    { t: 'یاد بگیر', d: 'خلاصه، فلش‌کارت و آزمون از متن خودت بساز.' },
    { t: 'به‌موقع مرور کن', d: 'دانش‌یار زمان مرور را یادت می‌اندازد و شعله‌ات را روشن نگه می‌دارد.' },
  ].forEach((st, i) => {
    const li = document.createElement('li');
    li.className = 'ld-rev relative';
    const num = document.createElement('span');
    num.className = 'absolute -start-[37px] top-0 w-7 h-7 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xs font-black text-primary-300';
    num.textContent = String(i + 1);
    const tt = document.createElement('div'); tt.className = 'text-sm font-bold text-slate-100 mb-1'; tt.textContent = st.t;
    const dd = document.createElement('div'); dd.className = 'text-xs text-slate-400 leading-relaxed'; dd.textContent = st.d;
    li.appendChild(num); li.appendChild(tt); li.appendChild(dd);
    tl.appendChild(li);
  });
  how.appendChild(tl);

  // ═══ ۵) منحنی ═══
  const curve = sec('py-14 border-t border-slate-800/60');
  curve.appendChild(h2('فقط نخوان؛ به‌موقع مرور کن.', 'منحنی فراموشی واقعی است؛ مرور فاصله‌دار، آن را شکست می‌دهد.'));
  const curveWrap = document.createElement('div');
  curveWrap.className = 'ld-rev';
  curveWrap.appendChild(createCurveDemo());
  curve.appendChild(curveWrap);

  // ═══ ۶) امتحان کن ═══
  const trySec = sec('py-14 border-t border-slate-800/60');
  trySec.appendChild(h2('به‌جای حرف، امتحانش کن.', 'کارت را لمس کن تا ورق بخورد.'));
  const tryWrap = document.createElement('div');
  tryWrap.className = 'ld-rev';
  tryWrap.appendChild(createFlashDemo());
  trySec.appendChild(tryWrap);

  // ═══ ۷) نمایش تعاملی ═══
  const show = sec('py-14 border-t border-slate-800/60');
  show.appendChild(h2('دانش‌یار را در عمل ببین.', 'هر بخش را لمس کن و امتحان کن.'));
  show.appendChild(createShowcase((fn) => cleanups.push(fn)));

  // ═══ ) اعتماد ═══
  const trust = sec('py-14 border-t border-slate-800/60');
  trust.appendChild(h2('داده‌هایت، مال خودت.'));
  const sigGrid = document.createElement('div');
  sigGrid.className = 'grid md:grid-cols-3 gap-6 mb-6';
  [
    { icon: 'smartphone', t: 'روی دستگاه تو', d: 'یادداشت‌ها و کارت‌ها محلی ذخیره می‌شوند؛ بدون اینترنت هم کار می‌کنند.' },
    { icon: 'download', t: 'فایل پشتیبان آزاد', d: 'هر وقت خواستی خروجی بگیر و روی دستگاه دیگر بازیابی کن.' },
    { icon: 'shield', t: 'شفاف، بدون تبلیغ', d: 'هیچ ردیابی و تبلیغی نیست؛ ابزارهای هوشمند فقط با اینترنت و با اجازه‌ی تو.' },
  ].forEach((t) => {
    const item = document.createElement('div');
    item.className = 'ld-rev flex gap-3 items-start md:block';
    const ic = document.createElement('div');
    ic.className = 'w-10 h-10 rounded-lg bg-primary-500/15 text-primary-400 flex items-center justify-center flex-shrink-0 md:mb-3';
    ic.appendChild(createIcon(t.icon, 20));
    const tt = document.createElement('div'); tt.className = 'text-sm font-bold text-slate-100 mb-1'; tt.textContent = t.t;
    const dd = document.createElement('div'); dd.className = 'text-xs text-slate-400 leading-relaxed'; dd.textContent = t.d;
    item.appendChild(ic); item.appendChild(tt); item.appendChild(dd);
    sigGrid.appendChild(item);
  });
  trust.appendChild(sigGrid);
  const note = document.createElement('div');
  note.className = 'ld-rev bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 max-w-md mx-auto';
  const nq = document.createElement('p');
  nq.className = 'text-sm text-slate-300 leading-relaxed';
  nq.textContent = '«دانش‌یار را برای خودم ساختم — دانش‌آموزی که شب امتحان همه‌چیز را قاطی می‌کرد. حالا همان را به تو می‌دهم؛ ساده، آفلاین و صادق.»';
  const ns = document.createElement('div');
  ns.className = 'text-[11px] text-slate-500 mt-2 flex items-center gap-2';
  ns.innerHTML = iconHTML('award', 12);
  const nst = document.createElement('span'); nst.textContent = 'سازنده‌ی دانش‌یار · ساخته‌شده در ایران';
  ns.appendChild(nst);
  note.appendChild(nq); note.appendChild(ns);
  trust.appendChild(note);

  // ═══ ۹) قیمت ═══
  const pricing = sec('py-14 border-t border-slate-800/60');
  pricing.appendChild(h2('اول رایگان امتحان کن؛ هر وقت خواستی ارتقا بده.', 'برای شروع، نسخه‌ی رایگان کافی است؛ پرو زمانی ارزش دارد که دانش‌یار بخشی از روزت شده باشد.'));
  const priceGrid = document.createElement('div');
  priceGrid.className = 'grid gap-4 md:grid-cols-2';

  const freeCard = document.createElement('div');
  freeCard.className = 'ld-rev bg-slate-800 border border-slate-700 rounded-2xl p-4 md:col-span-2';
  const fName = document.createElement('div'); fName.className = 'text-sm font-bold text-slate-100'; fName.textContent = 'رایگان — برای همیشه';
  const fPrice = document.createElement('div'); fPrice.className = 'text-xl font-black text-slate-100 mt-1'; fPrice.textContent = '۰ تومان';
  freeCard.appendChild(fName); freeCard.appendChild(fPrice);
  const fList = document.createElement('ul');
  fList.className = 'mt-3 space-y-1.5 grid md:grid-cols-2 gap-x-6';
  ['یادداشت و فلش‌کارت', 'مرور فاصله‌دار (با سقف روزانه)', 'پومودورو و تمرکز', '۳ درخواست هوشمند در روز', 'فایل پشتیبان JSON'].forEach((f) => {
    const li = document.createElement('li');
    li.className = 'flex items-center gap-2 text-xs text-slate-300';
    li.innerHTML = `<span class="text-primary-400 flex">${iconHTML('check', 13)}</span>`;
    const sp = document.createElement('span'); sp.textContent = f;
    li.appendChild(sp);
    fList.appendChild(li);
  });
  freeCard.appendChild(fList);
  const fCta = createButton({ label: 'رایگان شروع کن', variant: BUTTON_VARIANTS.PRIMARY, size: BUTTON_SIZES.MD, onClick: () => goTo('dashboard') });
  fCta.classList.add('w-full', 'mt-4');
  freeCard.appendChild(fCta);
  priceGrid.appendChild(freeCard);

  const proFeatures = ['مرور بدون سقف روزانه', 'سهمیه‌ی هوشمند بیشتر', 'قابلیت‌های ویژه‌ی آینده'];
  const yearlyPlan = PLANS.find((p) => p.id === 'yearly');
  const yearlySave = yearlyPlan ? Math.round((1 - yearlyPlan.priceToman / (99000 * yearlyPlan.months)) * 100) : 0;
  [
    { id: 'monthly', hot: false, ribbon: '', cta: 'فعال کن' },
    { id: 'term', hot: true, ribbon: 'پیشنهاد ما', cta: 'ترم را فعال کن' },
    { id: 'yearly', hot: false, ribbon: `بیشترین صرفه · ${toPersianDigits(String(yearlySave))}٪ تخفیف`, cta: 'فعال کن' },
  ].forEach((pd) => {
    const plan = PLANS.find((p) => p.id === pd.id);
    if (!plan) return;
    const days = plan.months * 30;
    const card = document.createElement('div');
    card.className = `ld-rev relative rounded-2xl p-4 ${pd.hot ? 'bg-slate-800 border-2 border-accent-500' : 'bg-slate-800 border border-slate-700'}`;
    const headRow = document.createElement('div');
    headRow.className = 'flex items-center justify-between gap-2';
    const name = document.createElement('div');
    name.className = 'text-sm font-bold text-slate-100';
    name.textContent = plan.label;
    headRow.appendChild(name);
    if (pd.ribbon) {
      const b = document.createElement('span');
      b.className = pd.hot
        ? 'text-[10px] font-black rounded-full px-2.5 py-1 bg-accent-500 text-slate-900 flex-shrink-0'
        : 'text-[10px] font-black rounded-full px-2.5 py-1 bg-accent-500/15 text-accent-300 border border-accent-500/40 flex-shrink-0';
      b.textContent = pd.ribbon;
      headRow.appendChild(b);
    }
    card.appendChild(headRow);
    const desc = document.createElement('div'); desc.className = 'text-xs text-slate-400 mt-1';
    desc.textContent = `${plan.period} · معادل روزی ${faNum(plan.priceToman / days)} تومان`;
    const price = document.createElement('div');
    price.className = `text-xl font-black mt-2 ${pd.hot ? 'text-accent-400' : 'text-slate-100'}`;
    price.textContent = faNum(plan.priceToman) + ' تومان';
    card.appendChild(name); card.appendChild(desc); card.appendChild(price);
    const ul = document.createElement('ul');
    ul.className = 'mt-3 space-y-1.5';
    proFeatures.forEach((f) => {
      const li = document.createElement('li');
      li.className = 'flex items-center gap-2 text-xs text-slate-300';
      li.innerHTML = `<span class="text-primary-400 flex">${iconHTML('check', 13)}</span>`;
      const sp = document.createElement('span'); sp.textContent = f;
      li.appendChild(sp);
      ul.appendChild(li);
    });
    card.appendChild(ul);
    const cta = createButton({
      label: pd.cta, variant: pd.hot ? BUTTON_VARIANTS.ACCENT : BUTTON_VARIANTS.GHOST, size: BUTTON_SIZES.MD,
      onClick: () => goTo('premium'),
    });
    cta.classList.add('w-full', 'mt-4');
    card.appendChild(cta);
    priceGrid.appendChild(card);
  });
  pricing.appendChild(priceGrid);
  const guarantee = document.createElement('p');
  guarantee.className = 'ld-rev text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5 mt-6';
  guarantee.innerHTML = iconHTML('shield', 12);
  const gt = document.createElement('span'); gt.textContent = 'پرداخت امن · تا ۷ روز ضمانت بازگشت وجه · بدون تمدید خودکار';
  guarantee.appendChild(gt);
  pricing.appendChild(guarantee);

  // ═══ ۱۰) FAQ ═══
  const faq = sec('py-14 border-t border-slate-800/60');
  faq.appendChild(h2('سوالی مانده؟'));
  const faqWrap = document.createElement('div');
  faqWrap.className = 'max-w-md md:max-w-2xl mx-auto';
  [
    { q: 'واقعاً رایگانه؟', a: 'بله. نسخه‌ی رایگان همیشه رایگان می‌ماند و امکانات اصلی را دارد؛ فقط سقف استفاده‌ی روزانه دارد.' },
    { q: 'تفاوت رایگان و پرو چیست؟', a: 'در نسخه‌ی رایگان مرور فاصله‌دار سقف روزانه دارد و روزانه ۳ درخواست هوشمند می‌توانی بگیری. پرو این سقف‌ها را برمی‌دارد.' },
    { q: 'بدون اینترنت کار می‌کنه؟', a: 'یادداشت، فلش‌کارت، مرور فاصله‌دار و پومودورو بله؛ کاملاً آفلاین.' },
    { q: 'چه چیزهایی به اینترنت نیاز دارند؟', a: 'فقط آزمون‌ساز و خلاصه‌ساز هوشمند؛ بقیه‌ی ابزارها بدون اینترنت کار می‌کنند.' },
    { q: 'داده‌هایم کجا ذخیره می‌شود؟ اگر گوشی‌ام را عوض کنم چه؟', a: 'داده‌ها فقط روی دستگاه خودت ذخیره می‌شوند. با فایل پشتیبان JSON می‌توانی همه‌چیز را به دستگاه جدید ببری.' },
    { q: 'دانش‌یار جای معلم یا کلاس را می‌گیرد؟', a: 'نه و ادعایش را هم ندارد. دانش‌یار ابزار مرور و تمرین توست؛ مکمل درس خواندن، نه جایگزین آن.' },
    { q: 'اگر اشتراک بخرم و راضی نباشم چه؟', a: 'تا ۷ روز بدون سوال برمی‌گردانیم؛ فقط به ایمیل پشتیبانی پیام بده.' },
  ].forEach((f) => {
    const item = document.createElement('div');
    item.className = 'ld-faq ld-rev bg-slate-800 border border-slate-700 rounded-xl mb-2 overflow-hidden';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'w-full min-h-12 flex items-center justify-between gap-3 p-4 text-start';
    const qt = document.createElement('span'); qt.className = 'text-sm font-bold text-slate-100'; qt.textContent = f.q;
    const chev = document.createElement('span');
    chev.className = 'ld-faq-chev text-slate-500 flex items-center flex-shrink-0';
    chev.innerHTML = iconHTML('chevron-left', 16);
    btn.appendChild(qt); btn.appendChild(chev);
    const ans = document.createElement('div');
    ans.className = 'ld-faq-a px-4 pb-4 text-xs text-slate-400 leading-relaxed';
    ans.textContent = f.a;
    btn.addEventListener('click', () => item.classList.toggle('open'));
    item.appendChild(btn); item.appendChild(ans);
    faqWrap.appendChild(item);
  });
  faq.appendChild(faqWrap);

  // ═══ ۱۱) CTA نهایی + فوتر ═══
  const finalCta = sec('py-14 border-t border-slate-800/60 text-center');
  const fh = document.createElement('h2');
  fh.className = 'ld-rev font-black text-slate-100 mb-5';
  fh.style.fontSize = 'clamp(22px, 6vw, 28px)';
  fh.style.lineHeight = '1.5';
  fh.textContent = 'از ۵ دقیقه‌ی امروز شروع کن؛ بقیه‌اش عادت می‌شود.';
  finalCta.appendChild(fh);
  const bigCta = createButton({
    label: 'رایگان شروع کن', variant: BUTTON_VARIANTS.ACCENT, size: BUTTON_SIZES.LG,
    iconHtml: iconHTML('chevron-left', 18),
    onClick: () => goTo('dashboard'),
  });
  bigCta.classList.add('ld-rev', 'w-full', 'md:w-auto', 'md:px-12', 'active:scale-[.97]');
  finalCta.appendChild(bigCta);
  const beta = document.createElement('p');
  beta.className = 'ld-rev text-[11px] text-slate-500 mt-3 leading-relaxed';
  beta.textContent = 'نسخه‌ی اولیه‌ی دانش‌یار پرو رایگان است؛ تجربه‌ات را با ما در میان بگذار.';
  finalCta.appendChild(beta);

  const footer = document.createElement('footer');
  footer.className = 'py-10 border-t border-slate-800/60 space-y-4 text-center';
  const mail = document.createElement('a');
  mail.href = 'mailto:support.daneshyar.yar@gmail.com';
  mail.className = 'inline-block text-xs text-slate-400 hover:text-slate-200 transition';
  mail.dir = 'ltr';
  mail.textContent = 'support.daneshyar.yar@gmail.com';
  footer.appendChild(mail);
  const legalRow = document.createElement('div');
  legalRow.className = 'flex justify-center gap-4 text-[11px]';
  ([{ id: 'terms', l: 'شرایط استفاده' }, { id: 'privacy', l: 'حریم خصوصی' }, { id: 'refund', l: 'بازگشت وجه' }]).forEach((lk) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'text-slate-500 hover:text-slate-300 transition';
    b.textContent = lk.l;
    b.addEventListener('click', () => goTo('legal', { doc: lk.id }));
    legalRow.appendChild(b);
  });
  footer.appendChild(legalRow);
  const metaRow = document.createElement('div');
  metaRow.className = 'text-[10px] text-slate-600';
  metaRow.textContent = 'ساخته‌شده در ایران · نسخه‌ی اولیه';
  footer.appendChild(metaRow);
  page.appendChild(footer);

  root.appendChild(page);

  // ── نوار چسبان ──
  const bar = document.createElement('div');
  bar.className = 'ld-bar ld-bar-off fixed bottom-0 inset-x-0 z-[75] bg-slate-950/90 backdrop-blur border-t border-slate-800/60';
  bar.style.paddingBottom = 'calc(12px + env(safe-area-inset-bottom))';
  const barIn = document.createElement('div');
  barIn.className = 'max-w-md md:max-w-2xl lg:max-w-5xl mx-auto px-5 pt-3';
  const barBtn = createButton({
    label: 'شروع رایگان — ۰ تومان', variant: BUTTON_VARIANTS.ACCENT, size: BUTTON_SIZES.LG,
    onClick: () => goTo('dashboard'),
  });
  barBtn.classList.add('w-full', 'active:scale-[.97]');
  barIn.appendChild(barBtn);
  bar.appendChild(barIn);
  root.appendChild(bar);

  let heroVis = true;
  let finalVis = false;
  const updateBar = (): void => { bar.classList.toggle('ld-bar-off', heroVis || finalVis); };
  const ioHero = new IntersectionObserver((es) => { es.forEach((e) => { heroVis = e.isIntersecting; updateBar(); }); }, { threshold: 0.2 });
  ioHero.observe(hero);
  const ioFinal = new IntersectionObserver((es) => { es.forEach((e) => { finalVis = e.isIntersecting; updateBar(); }); }, { threshold: 0.2 });
  ioFinal.observe(finalCta);
  observers.push(ioHero, ioFinal);

  const revEls = Array.from(page.querySelectorAll<HTMLElement>('.ld-rev'));
  const ioRev = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (e.isIntersecting) { (e.target as HTMLElement).classList.add('ld-in'); ioRev.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  revEls.forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 70}ms`;
    ioRev.observe(el);
  });
  observers.push(ioRev);

  return root;
}

export default createLandingView;