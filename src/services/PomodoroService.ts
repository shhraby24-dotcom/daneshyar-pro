/**
 * ============================================================
 * دانش‌یار پرو - سرویس سراسری پومودورو (موتور اتاق تمرکز)
 * ============================================================
 * ⏱️ تایمر مبتنی بر مهر زمانی: بین بخش‌ها و حتی بعد از رفرش ادامه می‌یابد
 * 🎯 هدف تمرکز: آزاد / یادداشت / هر بخش اپ / کتاب و خارج از اپ
 * 💊 مینی‌پیل شناور در کل برنامه (ضربه = بازگشت به اتاق تمرکز)
 * 🔔 صدای متفاوت + ویبره برای پایان تمرکز/استراحت
 * 🔥 هر جلسه تمرکز → logStudySession → سوخت استریک
 * @module services/PomodoroService
 * @version 1.0.0
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getDatabase } from '@/core/Database';
import { getRouter } from '@/core/Router';
import { getToast } from '@/ui/components/Toast';
import { toPersianDigits } from '@/utils/dateFormatter';
import { iconHTML } from '@/services/IconService';

const logger = getLogger().module('Pomodoro');
const LS_KEY = 'daneshyar_pomodoro_v3';

export type PomodoroMode = 'focus' | 'short' | 'long';
export type TargetKind = 'free' | 'note' | 'flashcards' | 'quiz' | 'summarizer' | 'book';
export interface FocusTarget { kind: TargetKind; noteId?: string; label: string; }

export const MODE_META: Record<PomodoroMode, { label: string; color: string; icon: string }> = {
  focus: { label: 'تمرکز', color: '#818cf8', icon: 'target' },
  short: { label: 'استراحت کوتاه', color: '#2dd4bf', icon: 'coffee' },
  long: { label: 'استراحت بلند', color: '#fbbf24', icon: 'moon' },
};

interface Persisted {
  mode: PomodoroMode;
  running: boolean;
  endAt: number | null;
  remaining: number;
  durations: Record<PomodoroMode, number>;
  cycle: number;
  completedToday: number;
  focusMinutesToday: number;
  completedDate: string;
  target: FocusTarget;
}

const DEFAULTS: Persisted = {
  mode: 'focus', running: false, endAt: null, remaining: 25 * 60,
  durations: { focus: 25 * 60, short: 5 * 60, long: 15 * 60 },
  cycle: 0, completedToday: 0, focusMinutesToday: 0,
  completedDate: new Date().toDateString(),
  target: { kind: 'free', label: 'تمرکز آزاد' },
};

type Listener = () => void;

function playChime(kind: 'focus' | 'break'): void {
  try {
    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctx = w.AudioContext || w.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
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
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.55);
    });
  } catch { /* ignore */ }
}
function vibrate(p: number | number[]): void { try { navigator.vibrate?.(p as number[]); } catch { /* ignore */ } }

export class PomodoroService {
  private st: Persisted;
  private listeners = new Set<Listener>();
  private pill: HTMLElement | null = null;

  constructor() {
    this.st = this.load();
    // روز جدید → شمارنده‌ها صفر
    if (this.st.completedDate !== new Date().toDateString()) {
      this.st.completedDate = new Date().toDateString();
      this.st.completedToday = 0;
      this.st.focusMinutesToday = 0;
    }
    // اگر هنگام غیبت تمام شده بود، بی‌صدا جمع کن
    if (this.st.running && this.st.endAt != null && Date.now() >= this.st.endAt) {
      this.finalize(true);
    }
    window.setInterval(() => this.tick(), 1000);
    window.addEventListener('hashchange', () => this.ensurePill());
    logger.info('سرویس پومودورو آماده');
    this.ensurePill();
  }

  private load(): Persisted {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Persisted>) };
    } catch { /* ignore */ }
    return { ...DEFAULTS };
  }
  private persist(): void { try { localStorage.setItem(LS_KEY, JSON.stringify(this.st)); } catch { /* ignore */ } }

  subscribe(fn: Listener): () => void { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private notify(): void { this.listeners.forEach((fn) => fn()); this.ensurePill(); }

  getState(): Persisted & { liveRemaining: number } {
    return { ...this.st, liveRemaining: this.live() };
  }
  private live(): number {
    if (this.st.running && this.st.endAt != null) return Math.max(0, Math.round((this.st.endAt - Date.now()) / 1000));
    return this.st.remaining;
  }

  start(): void {
    this.st.running = true;
    this.st.endAt = Date.now() + this.live() * 1000;
    this.persist(); this.notify();
  }
  pause(): void {
    this.st.remaining = this.live();
    this.st.running = false;
    this.st.endAt = null;
    this.persist(); this.notify();
  }
  reset(): void {
    this.st.running = false; this.st.endAt = null;
    this.st.remaining = this.st.durations[this.st.mode];
    this.persist(); this.notify();
  }
  setMode(m: PomodoroMode): void {
    this.st.mode = m; this.st.running = false; this.st.endAt = null;
    this.st.remaining = this.st.durations[m];
    this.persist(); this.notify();
  }
  setDuration(m: PomodoroMode, sec: number): void {
    this.st.durations[m] = sec;
    if (this.st.running) { this.st.running = false; this.st.endAt = null; }
    if (this.st.mode === m) this.st.remaining = sec;
    this.persist(); this.notify();
  }
  setTarget(t: FocusTarget): void { this.st.target = t; this.persist(); this.notify(); }
  /** رد کردن: در استراحت → تمرکز؛ در تمرکز → استراحت کوتاه (بدون ثبت) */
  skip(): void {
    this.st.mode = this.st.mode === 'focus' ? 'short' : 'focus';
    this.st.running = false; this.st.endAt = null;
    this.st.remaining = this.st.durations[this.st.mode];
    this.persist(); this.notify();
  }

  private tick(): void {
    if (!this.st.running || this.st.endAt == null) return;
    if (Date.now() >= this.st.endAt) this.finalize(false);
    else this.notify();
  }

  private finalize(silent: boolean): void {
    const wasFocus = this.st.mode === 'focus';
    this.st.running = false; this.st.endAt = null;
    if (wasFocus) {
      this.st.completedToday++;
      this.st.focusMinutesToday += Math.round(this.st.durations.focus / 60);
      this.st.cycle = (this.st.cycle + 1) % 4;
      void getDatabase().logStudySession('pomodoro', { minutes: Math.round(this.st.durations.focus / 60) });
      if (!silent) { playChime('focus'); vibrate([120, 60, 120]); }
      const next: PomodoroMode = this.st.cycle === 0 ? 'long' : 'short';
      this.st.mode = next;
      if (!silent) getToast().success(next === 'long' ? '۴ جلسه کامل شد — استراحت بلند بگیر!' : 'جلسه تمام شد — استراحت کوتاه');
    } else {
      if (!silent) { playChime('break'); vibrate([80]); getToast().info('استراحت تمام شد — برگرد به تمرکز'); }
      this.st.mode = 'focus';
    }
    this.st.remaining = this.st.durations[this.st.mode];
    this.persist(); this.notify();
  }

  // ── مینی‌پیل شناور ──
  private ensurePill(): void {
    const inRoom = window.location.hash.includes('pomodoro');
    const active = this.st.running || this.live() < this.st.durations[this.st.mode];
    if (inRoom || !active) { this.pill?.remove(); this.pill = null; return; }
    if (!this.pill) {
      const p = document.createElement('button');
      p.type = 'button';
      p.className = 'fixed bottom-20 end-3 z-40 flex items-center gap-2 rounded-full bg-slate-800/95 backdrop-blur border border-slate-700 px-3 py-2 shadow-xl';
      p.addEventListener('click', () => { void getRouter().navigate('pomodoro'); });
      document.body.appendChild(p);
      this.pill = p;
    }
    const meta = MODE_META[this.st.mode];
    const mm = Math.floor(this.live() / 60); const ss = this.live() % 60;
    this.pill.innerHTML =
      `<span style="width:8px;height:8px;border-radius:9999px;background:${meta.color}"></span>` +
      `<span style="font-weight:800;font-size:.8rem;color:#e2e8f0" dir="ltr">${toPersianDigits(String(mm).padStart(2, '0'))}:${toPersianDigits(String(ss).padStart(2, '0'))}</span>` +
      `<span style="color:${meta.color};display:flex">${iconHTML(this.st.running ? 'pause' : 'play', 14)}</span>`;
  }
}

let instance: PomodoroService | null = null;
export function getPomodoroService(): PomodoroService {
  if (!instance) instance = new PomodoroService();
  return instance;
}
export default getPomodoroService();