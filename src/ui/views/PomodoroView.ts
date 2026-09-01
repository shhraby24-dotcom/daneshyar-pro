/**
 * ============================================================
 * دانش‌یار پرو - PomodoroView (نسخه‌ی ۳. — اتاق تمرکز)
 * ============================================================
 * ✅ هاله‌ی پیش‌تنظیم‌ها با هر کلیک جابه‌جا می‌شود (اسنپ‌شات)
 * 🥇 طلایی: پیش‌تنظیم فعال + نقاط چرخه
 * 🙈 حین اجرا: بخش‌های غیرمهم مخفی (منوی پایین دست‌نخورده)
 * ⏭️ Skip همیشه فعال (در تمرکز با تأیید)
 * 🎧 صدای تمرکز سراسری (باران/امواج/پد) + اسلایدر صدا
 * @module ui/views/PomodoroView
 * @version 3.1.0
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getPomodoroService, MODE_META, type PomodoroMode } from '@/services/PomodoroService';
import { getFocusAudio, TRACKS, type FocusTrack } from '@/services/FocusAudioService';
import { getModal } from '@/ui/components/Modal';
import { toPersianDigits } from '@/utils/dateFormatter';
import { createIcon, iconHTML } from '@/services/IconService';

const logger = getLogger().module('PomodoroView');
const svc = getPomodoroService();
const audio = getFocusAudio();

const SIZE = 280;
const R = 120;
const CIRC = 2 * Math.PI * R;
const GOLD = '#fbbf24';
const formatMMSS = (s: number): string => {
  if (s < 0) s = 0;
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

function burstConfetti(): void {
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

export async function createPomodoroView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر اتاق تمرکز v3.1');
  const container = document.createElement('div');
  container.className = 'mx-auto max-w-md space-y-5';

  // refs برای paint سبک
  let timeEl: HTMLElement | null = null;
  let ringEl: SVGCircleElement | null = null;
  let statusEl: HTMLElement | null = null;
  let startBtn: HTMLButtonElement | null = null;
  let targetEl: HTMLElement | null = null;
  let dotsEl: HTMLElement | null = null;
  let statPomEl: HTMLElement | null = null;
  let statMinEl: HTMLElement | null = null;
  let musicChips = new Map<FocusTrack, HTMLButtonElement>();

  const snapshot = (): string => {
    const s = svc.getState();
    return JSON.stringify([s.mode, s.running, s.durations, s.cycle, s.completedToday, s.focusMinutesToday, s.target]);
  };
  let lastSnap = snapshot();
  let lastMode: PomodoroMode = svc.getState().mode;

  const paint = (): void => {
    const s = svc.getState();
    const meta = MODE_META[s.mode];
    if (timeEl) timeEl.textContent = formatMMSS(s.liveRemaining);
    if (ringEl) {
      ringEl.style.strokeDashoffset = String(CIRC * (1 - s.liveRemaining / s.durations[s.mode]));
      ringEl.setAttribute('stroke', meta.color);
    }
    if (statusEl) {
      statusEl.textContent = s.running
        ? (s.mode === 'focus' ? 'در حال تمرکز...' : 'در حال استراحت...')
        : (s.liveRemaining < s.durations[s.mode] ? 'متوقف شد' : 'آماده');
    }
    if (startBtn) {
      startBtn.innerHTML = iconHTML(s.running ? 'pause' : 'play', 28);
      startBtn.style.background = meta.color;
    }
    if (targetEl) targetEl.textContent = `هدف: ${s.target.label}`;
    if (dotsEl) {
      dotsEl.innerHTML = '';
      for (let i = 0; i < 4; i++) {
        const d = document.createElement('div');
        d.className = `w-3 h-3 rounded-full ${i < s.cycle ? '' : 'bg-slate-700'}`;
        if (i < s.cycle) d.style.background = GOLD;
        dotsEl.appendChild(d);
      }
    }
    if (statPomEl) statPomEl.textContent = toPersianDigits(String(s.completedToday));
    if (statMinEl) statMinEl.textContent = toPersianDigits(String(s.focusMinutesToday));
  };

  const paintMusic = (): void => {
    musicChips.forEach((el, id) => {
      el.className = id === audio.track
        ? 'px-3 py-2 rounded-full text-xs font-bold border border-transparent ring-2 ring-accent-400/60 bg-accent-500/10 text-accent-300'
        : 'px-3 py-2 rounded-full text-xs font-medium border border-slate-700 bg-slate-900/50 text-slate-400 hover:bg-slate-900';
    });
  };

  const unsubSvc = svc.subscribe(() => {
    const snap = snapshot();
    const s = svc.getState();
    if (s.mode !== lastMode && s.mode === 'long' && !s.running) burstConfetti();
    lastMode = s.mode;
    if (snap !== lastSnap) { lastSnap = snap; render(); }
    else paint();
  });
  const unsubAudio = audio.subscribe(() => paintMusic());

  const render = (): void => {
    container.innerHTML = '';
    musicChips = new Map();
    const s = svc.getState();
    const meta = MODE_META[s.mode];

    // هدر یکپارچه (بدون خط کهکشانی)
    const header = document.createElement('div');
    const titleRow = document.createElement('div');
    titleRow.className = 'flex items-center gap-3';
    const headIcon = document.createElement('div');
    headIcon.className = 'w-12 h-12 rounded-xl bg-primary-500/15 text-primary-300 flex items-center justify-center';
    headIcon.appendChild(createIcon('pomodoro', 26));
    titleRow.appendChild(headIcon);
    const h1 = document.createElement('h1');
    h1.className = 'text-2xl sm:text-3xl font-black text-slate-100';
    h1.textContent = 'اتاق تمرکز';
    titleRow.appendChild(h1);
    header.appendChild(titleRow);
    const sub = document.createElement('p');
    sub.className = 'mt-2 text-sm text-slate-400';
    sub.textContent = 'تایمر سراسری است؛ بین بخش‌ها جابه‌جا شو یا حتی اپ را ببند';
    header.appendChild(sub);
    container.appendChild(header);

    // هدف تمرکز (فقط وقتی اجرا نیست)
    if (!s.running) {
      const tBox = document.createElement('div');
      tBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3';
      const tHead = document.createElement('div');
      tHead.className = 'flex items-center gap-2';
      tHead.appendChild(createIcon('target', 18, 'text-primary-400'));
      const tT = document.createElement('h3');
      tT.className = 'font-bold text-slate-100';
      tT.textContent = 'روی چی تمرکز می‌کنی؟';
      tHead.appendChild(tT);
      tBox.appendChild(tHead);
      const targets: { kind: 'free' | 'flashcards' | 'quiz' | 'summarizer' | 'book' | 'note'; label: string; icon: string }[] = [
        { kind: 'free', label: 'تمرکز آزاد', icon: 'target' },
        { kind: 'flashcards', label: 'فلش‌کارت', icon: 'flashcards' },
        { kind: 'quiz', label: 'آزمون', icon: 'quiz' },
        { kind: 'summarizer', label: 'خلاصه‌ساز', icon: 'summarizer' },
        { kind: 'book', label: 'کتاب / خارج از اپ', icon: 'books' },
        { kind: 'note', label: 'یک یادداشت', icon: 'notes' },
      ];
      const tRow = document.createElement('div');
      tRow.className = 'flex flex-wrap gap-2';
      targets.forEach((t) => {
        const on = s.target.kind === t.kind;
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = on
          ? 'flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold border border-transparent ring-2 ring-primary-400/60 bg-primary-500/10 text-primary-300'
          : 'flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border border-slate-700 bg-slate-900/50 text-slate-400 hover:bg-slate-900';
        chip.innerHTML = iconHTML(t.icon, 14);
        const lb = document.createElement('span'); lb.textContent = t.label;
        chip.appendChild(lb);
        chip.addEventListener('click', () => svc.setTarget({ kind: t.kind, label: t.label }));
        tRow.appendChild(chip);
      });
      tBox.appendChild(tRow);
      container.appendChild(tBox);
    }

    // حلقه
    const ringWrap = document.createElement('div');
    ringWrap.className = 'relative flex justify-center';
    ringWrap.style.width = `${SIZE}px`;
    ringWrap.style.height = `${SIZE}px`;
    ringWrap.style.margin = '0 auto';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
    svg.setAttribute('width', String(SIZE));
    svg.setAttribute('height', String(SIZE));
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bg.setAttribute('cx', String(SIZE / 2)); bg.setAttribute('cy', String(SIZE / 2)); bg.setAttribute('r', String(R));
    bg.setAttribute('fill', 'none'); bg.setAttribute('stroke', '#1e293b'); bg.setAttribute('stroke-width', '12');
    const fg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    fg.setAttribute('cx', String(SIZE / 2)); fg.setAttribute('cy', String(SIZE / 2)); fg.setAttribute('r', String(R));
    fg.setAttribute('fill', 'none');
    fg.setAttribute('stroke', meta.color);
    fg.setAttribute('stroke-width', '12');
    fg.setAttribute('stroke-linecap', 'round');
    fg.setAttribute('stroke-dasharray', String(CIRC));
    fg.setAttribute('transform', `rotate(-90 ${SIZE / 2} ${SIZE / 2})`);
    fg.style.transition = 'stroke-dashoffset 1s linear, stroke .3s';
    fg.style.filter = `drop-shadow(0 0 10px ${meta.color}55)`;
    ringEl = fg;
    svg.appendChild(bg); svg.appendChild(fg);
    ringWrap.appendChild(svg);
    const center = document.createElement('div');
    center.className = 'absolute inset-0 flex flex-col items-center justify-center pointer-events-none';
    timeEl = document.createElement('div');
    timeEl.className = 'text-5xl font-black text-slate-100 tabular-nums';
    timeEl.dir = 'ltr';
    statusEl = document.createElement('div');
    statusEl.className = 'text-sm text-slate-400 mt-2';
    targetEl = document.createElement('div');
    targetEl.className = 'text-xs text-slate-500 mt-1';
    center.appendChild(timeEl); center.appendChild(statusEl); center.appendChild(targetEl);
    ringWrap.appendChild(center);
    container.appendChild(ringWrap);

    // نقاط چرخه (طلایی)
    dotsEl = document.createElement('div');
    dotsEl.className = 'flex justify-center gap-2';
    container.appendChild(dotsEl);

    // کنترل‌ها
    const ctrl = document.createElement('div');
    ctrl.className = 'flex items-center justify-center gap-4';
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'w-12 h-12 rounded-full bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center hover:text-slate-200';
    resetBtn.innerHTML = iconHTML('refresh', 18);
    resetBtn.setAttribute('aria-label', 'ریست');
    resetBtn.addEventListener('click', () => svc.reset());
    startBtn = document.createElement('button');
    startBtn.type = 'button';
    startBtn.className = 'w-20 h-20 rounded-full text-slate-900 flex items-center justify-center shadow-xl active:scale-95 transition';
    startBtn.style.background = meta.color;
    startBtn.setAttribute('aria-label', 'شروع/توقف');
    startBtn.addEventListener('click', () => {
      const st = svc.getState();
      if (st.running) { svc.pause(); return; }
      svc.start();
      const tg = st.target.kind;
      if (tg === 'flashcards' || tg === 'quiz' || tg === 'summarizer' || tg === 'note') {
        void import('@/core/Router').then((m) => m.getRouter().navigate(tg === 'note' ? 'notes' : tg));
      }
    });
    const skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    skipBtn.className = 'w-12 h-12 rounded-full bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center hover:text-slate-200';
    skipBtn.innerHTML = iconHTML('skip', 18);
    skipBtn.setAttribute('aria-label', 'رد کردن');
    skipBtn.addEventListener('click', async () => {
      const st = svc.getState();
      if (st.mode === 'focus') {
        const ok = await getModal().confirm('رد کردن تمرکز', 'جلسه‌ی تمرکز بدون ثبت رها شود و به استراحت بروی؟', { confirmText: 'بله، رد شو' });
        if (!ok) return;
      }
      svc.skip();
    });
    ctrl.appendChild(resetBtn); ctrl.appendChild(startBtn); ctrl.appendChild(skipBtn);
    container.appendChild(ctrl);

    if (s.running) {
      const hint = document.createElement('p');
      hint.className = 'text-center text-xs text-slate-500';
      hint.textContent = 'برای تغییر تنظیمات، اول تایمر را متوقف کن';
      container.appendChild(hint);
    }

    // صدای تمرکز (همیشه در دسترس)
    const mBox = document.createElement('div');
    mBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3';
    const mHead = document.createElement('div');
    mHead.className = 'flex items-center gap-2';
    mHead.appendChild(createIcon('music', 18, 'text-accent-400'));
    const mT = document.createElement('h3');
    mT.className = 'font-bold text-slate-100';
    mT.textContent = 'صدای تمرکز';
    mHead.appendChild(mT);
    mBox.appendChild(mHead);
    const mRow = document.createElement('div');
    mRow.className = 'flex flex-wrap gap-2';
    TRACKS.forEach((t) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.textContent = t.label;
      chip.addEventListener('click', () => audio.play(t.id));
      musicChips.set(t.id, chip);
      mRow.appendChild(chip);
    });
    mBox.appendChild(mRow);
    const volRow = document.createElement('div');
    volRow.className = 'flex items-center gap-3';
    const volIcon = document.createElement('span');
    volIcon.className = 'text-slate-400 flex';
    volIcon.innerHTML = iconHTML('music', 14);
    const vol = document.createElement('input');
    vol.type = 'range';
    vol.min = '0'; vol.max = '100';
    vol.value = String(Math.round(audio.volume * 100));
    vol.className = 'flex-1';
    vol.addEventListener('input', () => audio.setVolume(parseInt(vol.value, 10) / 100));
    volRow.appendChild(volIcon); volRow.appendChild(vol);
    mBox.appendChild(volRow);
    container.appendChild(mBox);

    // پیش‌تنظیم‌ها (فقط وقتی اجرا نیست) — فعال = طلایی
    if (!s.running) {
      const pBox = document.createElement('div');
      pBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3';
      const pHead = document.createElement('div');
      pHead.className = 'flex items-center gap-2';
      pHead.appendChild(createIcon('clock', 18, 'text-primary-400'));
      const pT = document.createElement('h3');
      pT.className = 'font-bold text-slate-100';
      pT.textContent = 'پیش‌تنظیم مدت (دقیقه)';
      pHead.appendChild(pT);
      pBox.appendChild(pHead);
      const presets: { mode: PomodoroMode; opts: number[] }[] = [
        { mode: 'focus', opts: [15, 25, 50] },
        { mode: 'short', opts: [5, 10] },
        { mode: 'long', opts: [15, 30] },
      ];
      presets.forEach((pr) => {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2';
        const lb = document.createElement('span');
        lb.className = 'text-xs text-slate-400 w-24 flex-shrink-0';
        lb.textContent = MODE_META[pr.mode].label;
        row.appendChild(lb);
        pr.opts.forEach((o) => {
          const on = s.durations[pr.mode] === o * 60;
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = on
            ? 'px-3 py-1.5 rounded-full text-xs font-bold border border-transparent ring-2 ring-accent-400/60 bg-accent-500/10 text-accent-300'
            : 'px-3 py-1.5 rounded-full text-xs font-medium border border-slate-700 bg-slate-900/50 text-slate-400 hover:bg-slate-900';
          chip.textContent = toPersianDigits(String(o));
          chip.addEventListener('click', () => svc.setDuration(pr.mode, o * 60));
          row.appendChild(chip);
        });
        pBox.appendChild(row);
      });
      container.appendChild(pBox);
    }

    // آمار امروز
    const sBox = document.createElement('div');
    sBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4 grid grid-cols-2 gap-3 text-center';
    const a = document.createElement('div');
    a.className = 'bg-slate-900/50 rounded-lg p-3';
    statPomEl = document.createElement('div');
    statPomEl.className = 'text-2xl font-bold text-accent-400';
    const al = document.createElement('div'); al.className = 'text-xs text-slate-400 mt-1'; al.textContent = 'پومودورو امروز';
    a.appendChild(statPomEl); a.appendChild(al);
    const b = document.createElement('div');
    b.className = 'bg-slate-900/50 rounded-lg p-3';
    statMinEl = document.createElement('div');
    statMinEl.className = 'text-2xl font-bold text-primary-300';
    const bl = document.createElement('div'); bl.className = 'text-xs text-slate-400 mt-1'; bl.textContent = 'دقیقه تمرکز امروز';
    b.appendChild(statMinEl); b.appendChild(bl);
    sBox.appendChild(a); sBox.appendChild(b);
    container.appendChild(sBox);

    paint();
    paintMusic();
  };

  // Space = شروع/توقف
  const onKey = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    if (e.key === ' ') { e.preventDefault(); const st = svc.getState(); if (st.running) svc.pause(); else svc.start(); }
  };
  document.addEventListener('keydown', onKey);

  render();

  const observer = new MutationObserver(() => {
    if (!document.body.contains(container)) {
      unsubSvc(); unsubAudio();
      document.removeEventListener('keydown', onKey);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return container;
}

export default createPomodoroView;