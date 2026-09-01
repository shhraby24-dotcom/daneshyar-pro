/**
 * ============================================================
 * دانش‌یار پرو - سرویس صدای تمرکز (سراسری، بدون فایل صوتی)
 * ============================================================
 * 🎧 تولید ambient با WebAudio: باران / امواج / پد آرام
 * 🌍 بین بخش‌ها ادامه می‌یابد (singleton) + مینی‌پیل شناور
 * 🔊 کنترل ترک و صدا از اتاق تمرکز
 * @module services/FocusAudioService
 * @version 1.0.0
 */
import { getRouter } from '@/core/Router';
import { iconHTML } from '@/services/IconService';

export type FocusTrack = 'off' | 'rain' | 'waves' | 'pad';
export const TRACKS: { id: FocusTrack; label: string }[] = [
  { id: 'off', label: 'خاموش' },
  { id: 'rain', label: 'باران' },
  { id: 'waves', label: 'امواج' },
  { id: 'pad', label: 'پد آرام' },
];

class FocusAudioService {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sources: AudioScheduledSourceNode[] = [];
  track: FocusTrack = 'off';
  volume = 0.5;
  private listeners = new Set<() => void>();
  private pill: HTMLElement | null = null;

  constructor() {
    window.addEventListener('hashchange', () => this.ensurePill());
  }

  subscribe(fn: () => void): () => void { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private notify(): void { this.listeners.forEach((f) => f()); this.ensurePill(); }

  private ensureCtx(): void {
    if (this.ctx) return;
    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctx = w.AudioContext || w.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volume;
    this.notify();
  }

  play(track: FocusTrack): void {
    this.teardown();
    this.track = track;
    if (track !== 'off') {
      this.ensureCtx();
      if (this.ctx && this.master) {
        void this.ctx.resume();
        if (track === 'rain') this.buildRain();
        else if (track === 'waves') this.buildWaves();
        else this.buildPad();
      }
    }
    this.notify();
  }

  private teardown(): void {
    this.sources.forEach((s) => { try { s.stop(); } catch { /* ignore */ } });
    this.sources = [];
  }

  private noiseBuffer(seconds: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  /** باران: نویز سفید + فیلتر پایین‌گذر */
  private buildRain(): void {
    if (!this.ctx || !this.master) return;
    const buf = this.noiseBuffer(2); if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 1200;
    const gain = this.ctx.createGain(); gain.gain.value = 0.5;
    src.connect(filter); filter.connect(gain); gain.connect(this.master);
    src.start();
    this.sources.push(src);
  }

  /** امواج: نویز + LFO آرام روی بلندی */
  private buildWaves(): void {
    if (!this.ctx || !this.master) return;
    const buf = this.noiseBuffer(3); if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 500;
    const gain = this.ctx.createGain(); gain.gain.value = 0.4;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.12;
    const lfoGain = this.ctx.createGain(); lfoGain.gain.value = 0.25;
    lfo.connect(lfoGain); lfoGain.connect(gain.gain);
    src.connect(filter); filter.connect(gain); gain.connect(this.master);
    src.start(); lfo.start();
    this.sources.push(src, lfo);
  }

  /** پد آرام: آکورد سینوسی با تنفس آرام */
  private buildPad(): void {
    if (!this.ctx || !this.master) return;
    [220, 277.18, 329.63].forEach((f, i) => {
      if (!this.ctx || !this.master) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine'; osc.frequency.value = f; osc.detune.value = i * 3;
      const gain = this.ctx.createGain(); gain.gain.value = 0.12;
      const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.05 + i * 0.02;
      const lfoGain = this.ctx.createGain(); lfoGain.gain.value = 0.05;
      lfo.connect(lfoGain); lfoGain.connect(gain.gain);
      osc.connect(gain); gain.connect(this.master);
      osc.start(); lfo.start();
      this.sources.push(osc, lfo);
    });
  }

  private ensurePill(): void {
    const inRoom = window.location.hash.includes('pomodoro');
    if (this.track === 'off' || inRoom) { this.pill?.remove(); this.pill = null; return; }
    if (!this.pill) {
      const p = document.createElement('button');
      p.type = 'button';
      p.className = 'fixed bottom-32 end-3 z-40 flex items-center gap-2 rounded-full bg-slate-800/95 backdrop-blur border border-slate-700 px-3 py-2 shadow-xl';
      p.addEventListener('click', () => { void getRouter().navigate('pomodoro'); });
      document.body.appendChild(p);
      this.pill = p;
    }
    const t = TRACKS.find((x) => x.id === this.track);
    this.pill.innerHTML =
      `<span style="color:#fbbf24;display:flex">${iconHTML('music', 14)}</span>` +
      `<span style="font-size:.75rem;font-weight:700;color:#e2e8f0">${t?.label ?? ''}</span>`;
  }
}

let instance: FocusAudioService | null = null;
export function getFocusAudio(): FocusAudioService {
  if (!instance) instance = new FocusAudioService();
  return instance;
}
export default getFocusAudio();