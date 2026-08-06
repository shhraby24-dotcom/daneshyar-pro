/**
 * ============================================================
 * دانش‌یار پرو - PomodoroView v2 (مدیریت زمان مطالعه)
 * ============================================================
 * ⏱️ زمان داخل حلقه (بدون اورلپ) + وضعیت زیر آن
 * 🔊 صدای نرم و متفاوت برای پایان تمرکز/استراحت (WebAudio)
 * 📳 ویبره روی موبایل
 * 🔥 هر جلسه تمرکز → logStudySession → سوخت Streak
 * 🔁 چرخه: هر ۴ تمرکز → استراحت بلند (نمایش با نقطه‌ها)
 * @module ui/views/PomodoroView
 * @version 2.0.0
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getDatabase } from '@/core/Database';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '@/ui/components/Button';
import { getToast } from '@/ui/components/Toast';
import { createSectionHeader } from '@/ui/components/Card';
import { toPersianDigits } from '@/utils/dateFormatter';

const logger = getLogger().module('PomodoroView');

type Mode = 'focus' | 'short' | 'long';

const MODES: { value: Mode; label: string; icon: string }[] = [
  { value: 'focus', label: 'تمرکز', icon: '🎯' },
  { value: 'short', label: 'استراحت کوتاه', icon: '☕' },
  { value: 'long', label: 'استراحت بلند', icon: '🌿' },
];

const SIZE = 260;
const R = 110;
const CIRC = 2 * Math.PI * R;

const formatMMSS = (s: number): string => {
  if (s < 0) s = 0;
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

// ============================================================
// صدا (WebAudio — بدون فایل خارجی)
// ============================================================
function playChime(kind: 'focus' | 'break'): void {
  try {
    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctx = w.AudioContext || w.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    // ملودی صعودی برای پایان تمرکز، ملودی متفاوت برای پایان استراحت
    const notes = kind === 'focus' ? [660, 880] : [523, 659];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  } catch { /* ignore */ }
}
function vibrate(pattern: number | number[]): void {
  try { navigator.vibrate?.(pattern as number[]); } catch { /* ignore */ }
}

// ============================================================
// View اصلی
// ============================================================
export async function createPomodoroView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر پومودورو v2');
  const container = document.createElement('div');
  container.className = 'mx-auto max-w-md space-y-6';

  const durations: Record<Mode, number> = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
  let mode: Mode = 'focus';
  let remaining = durations.focus;
  let running = false;
  let timer: number | null = null;
  let completedToday = 0;

  try {
    const sessions = await getDatabase().getStudySessions();
    const today = new Date().toDateString();
    completedToday = sessions.filter(
      (s) => s.type === 'pomodoro' && new Date(s.date).toDateString() === today
    ).length;
  } catch { /* ignore */ }

  // refs
  let timeEl: HTMLElement | null = null;
  let statusEl: HTMLElement | null = null;
  let ringEl: SVGCircleElement | null = null;

  const stopTimer = (): void => { if (timer) { clearInterval(timer); timer = null; } };

  const setRing = (): void => {
    if (ringEl) ringEl.style.strokeDashoffset = String(CIRC * (1 - remaining / durations[mode]));
    if (timeEl) timeEl.textContent = formatMMSS(remaining);
  };

  const complete = (): void => {
    stopTimer();
    running = false;
    if (mode === 'focus') {
      completedToday++;
      void getDatabase().logStudySession('pomodoro', { minutes: Math.round(durations.focus / 60) });
      playChime('focus');
      vibrate([120, 60, 120]);
      const next: Mode = completedToday % 4 === 0 ? 'long' : 'short';
      getToast().success(`جلسه تمرکز تمام شد! 🎉 (${toPersianDigits(String(completedToday))} امروز) — حالا استراحت کن`);
      mode = next;
    } else {
      playChime('break');
      vibrate([80]);
      getToast().info('استراحت تمام شد — برگرد به تمرکز 🎯');
      mode = 'focus';
    }
    remaining = durations[mode];
    render();
  };

  const tick = (): void => {
    remaining--;
    setRing();
    if (remaining <= 0) complete();
  };

  const toggle = (): void => {
    if (running) { stopTimer(); running = false; }
    else { running = true; timer = window.setInterval(tick, 1000); }
    render();
  };

  const reset = (): void => { stopTimer(); running = false; remaining = durations[mode]; render(); };

  const setMode = (m: Mode): void => { stopTimer(); running = false; mode = m; remaining = durations[m]; render(); };

  // ── render ──
  const render = (): void => {
    container.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'text-center space-y-2';
    const em = document.createElement('div'); em.className = 'text-6xl'; em.textContent = '⏱️';
    const t = document.createElement('h1'); t.className = 'text-3xl font-black text-slate-100'; t.textContent = 'پومودورو';
    const s = document.createElement('p'); s.className = 'text-sm text-slate-400';
    s.textContent = 'با تمرکزِ زمان‌بندی‌شده، بیشتر یاد بگیر';
    header.appendChild(em); header.appendChild(t); header.appendChild(s);
    container.appendChild(header);

    // حلقه + زمان داخل آن
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
    bg.setAttribute('fill', 'none'); bg.setAttribute('stroke', '#1e293b'); bg.setAttribute('stroke-width', '14');
    const fg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    fg.setAttribute('cx', String(SIZE / 2)); fg.setAttribute('cy', String(SIZE / 2)); fg.setAttribute('r', String(R));
    fg.setAttribute('fill', 'none');
    fg.setAttribute('stroke', mode === 'focus' ? '#6366f1' : '#10b981');
    fg.setAttribute('stroke-width', '14'); fg.setAttribute('stroke-linecap', 'round');
    fg.setAttribute('stroke-dasharray', String(CIRC));
    fg.setAttribute('transform', `rotate(-90 ${SIZE / 2} ${SIZE / 2})`);
    fg.style.strokeDashoffset = String(CIRC * (1 - remaining / durations[mode]));
    fg.style.transition = 'stroke-dashoffset 1s linear';
    ringEl = fg;
    svg.appendChild(bg); svg.appendChild(fg);
    ringWrap.appendChild(svg);

    // لایه مرکزی (زمان + وضعیت) — داخل حلقه
    const center = document.createElement('div');
    center.className = 'absolute inset-0 flex flex-col items-center justify-center pointer-events-none';
    timeEl = document.createElement('div');
    timeEl.className = 'text-5xl font-black text-slate-100 tabular-nums';
    timeEl.textContent = formatMMSS(remaining);
    statusEl = document.createElement('div');
    statusEl.className = 'text-sm text-slate-400 mt-2';
    statusEl.textContent = running
      ? (mode === 'focus' ? 'در حال تمرکز...' : 'در حال استراحت...')
      : 'آماده';
    center.appendChild(timeEl); center.appendChild(statusEl);
    ringWrap.appendChild(center);
    container.appendChild(ringWrap);

    // چیپ‌های حالت
    const modeRow = document.createElement('div');
    modeRow.className = 'grid grid-cols-3 gap-2';
    MODES.forEach((m) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `border rounded-lg p-3 text-center transition-all ${mode === m.value ? 'bg-primary-500/20 border-primary-500 text-primary-300' : 'bg-slate-900/50 border-slate-700 text-slate-400'}`;
      const ic = document.createElement('div'); ic.className = 'text-2xl'; ic.textContent = m.icon;
      const lb = document.createElement('div'); lb.className = 'text-xs mt-1'; lb.textContent = m.label;
      b.appendChild(ic); b.appendChild(lb);
      b.addEventListener('click', () => setMode(m.value));
      modeRow.appendChild(b);
    });
    container.appendChild(modeRow);

    // دکمه‌ها
    const btnRow = document.createElement('div');
    btnRow.className = 'grid grid-cols-2 gap-3';
    btnRow.appendChild(createButton({
      label: running ? '⏸️ توقف' : '▶️ شروع',
      variant: running ? BUTTON_VARIANTS.SECONDARY : BUTTON_VARIANTS.ACCENT,
      size: BUTTON_SIZES.LG,
      onClick: toggle,
    }));
    btnRow.appendChild(createButton({ label: '🔄 ریست', variant: BUTTON_VARIANTS.GHOST, size: BUTTON_SIZES.LG, onClick: reset }));
    container.appendChild(btnRow);

    // پیشرفت امروز (با نقطه‌های چرخه)
    const statsBox = document.createElement('div');
    statsBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4';
    statsBox.appendChild(createSectionHeader({ title: 'پیشرفت امروز', icon: '🔥' }));
    const row = document.createElement('div');
    row.className = 'grid grid-cols-2 gap-3 text-center';
    const a = document.createElement('div');
    a.className = 'bg-slate-900/50 rounded-lg p-3';
    const av = document.createElement('div'); av.className = 'text-2xl font-bold text-accent-400'; av.textContent = toPersianDigits(String(completedToday));
    const al = document.createElement('div'); al.className = 'text-xs text-slate-400'; al.textContent = 'پومودورو امروز';
    a.appendChild(av); a.appendChild(al);
    const b = document.createElement('div');
    b.className = 'bg-slate-900/50 rounded-lg p-3';
    const dots = document.createElement('div'); dots.className = 'flex justify-center gap-2 py-1';
    const cycleDone = completedToday % 4;
    for (let i = 0; i < 4; i++) {
      const d = document.createElement('div');
      d.className = `w-3 h-3 rounded-full ${i < cycleDone ? 'bg-primary-500' : 'bg-slate-700'}`;
      dots.appendChild(d);
    }
    const bl = document.createElement('div'); bl.className = 'text-xs text-slate-400 mt-1'; bl.textContent = 'تا استراحت بلند';
    b.appendChild(dots); b.appendChild(bl);
    row.appendChild(a); row.appendChild(b);
    statsBox.appendChild(row);
    container.appendChild(statsBox);

    // تنظیم مدت‌ها
    const setBox = document.createElement('div');
    setBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3';
    setBox.appendChild(createSectionHeader({ title: 'مدت‌ها (دقیقه)', icon: '⚙️' }));
    (Object.keys(durations) as Mode[]).forEach((m) => {
      const r = document.createElement('div');
      r.className = 'flex items-center justify-between';
      const l = document.createElement('span'); l.className = 'text-sm text-slate-300';
      l.textContent = MODES.find((x) => x.value === m)?.label ?? m;
      const ctrl = document.createElement('div'); ctrl.className = 'flex items-center gap-2';
      const val = document.createElement('span'); val.className = 'font-bold text-slate-100 min-w-[2.5rem] text-center';
      val.textContent = toPersianDigits(String(durations[m] / 60));
      const minus = createButton({ label: '−', variant: BUTTON_VARIANTS.SECONDARY, size: BUTTON_SIZES.SM, onClick: () => {
        durations[m] = Math.max(60, durations[m] - 5 * 60);
        val.textContent = toPersianDigits(String(durations[m] / 60));
        if (!running && mode === m) { remaining = durations[m]; setRing(); }
      } });
      const plus = createButton({ label: '+', variant: BUTTON_VARIANTS.SECONDARY, size: BUTTON_SIZES.SM, onClick: () => {
        durations[m] = Math.min(90 * 60, durations[m] + 5 * 60);
        val.textContent = toPersianDigits(String(durations[m] / 60));
        if (!running && mode === m) { remaining = durations[m]; setRing(); }
      } });
      ctrl.appendChild(minus); ctrl.appendChild(val); ctrl.appendChild(plus);
      r.appendChild(l); r.appendChild(ctrl);
      setBox.appendChild(r);
    });
    container.appendChild(setBox);
  };

  render();

  // cleanup هنگام خروج
  const observer = new MutationObserver(() => {
    if (!document.body.contains(container)) { stopTimer(); observer.disconnect(); }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return container;
}

export default createPomodoroView;