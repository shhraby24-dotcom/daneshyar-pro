/**
 * ============================================================
 * دانش‌یار پرو - مدیریت صدا (نسخه ۱۰۰٪ آفلاین)
 * ============================================================
 *
 * همه صداها با Web Audio API تولید می‌شوند - بدون نیاز به URL خارجی
 *
 * ✅ ۶ صدای اعلان (bell, chime, digital, soft, classic, success)
 * ✅ ۸ صدای محیطی (rain, forest, cafe, ocean, fireplace, white, pink, brown)
 * ✅ صداهای سفارشی (URL یا فایل)
 * ✅ User Interaction Detection (حل NotAllowedError)
 * ✅ یکپارچه با Storage.ts
 *
 * @module services/SoundManager
 * @version 1.0.0-beta.1
 */

import { getInstance as getLogger } from '@/core/Logger';
import { getStorage } from '@/core/Storage';

const logger = getLogger().module('SoundManager');
const storage = getStorage();

// ============================================================
// Types و Interfaces
// ============================================================

/**
 * کلیدهای ذخیره‌سازی
 */
const SOUND_STORAGE_KEYS = {
  SETTINGS: 'pomodoro_sound_settings',
  CUSTOM_SOUNDS: 'pomodoro_custom_sounds',
} as const;

/**
 * شناسه صداهای اعلان
 */
export type NotificationSoundId =
  | 'bell'
  | 'chime'
  | 'digital'
  | 'soft'
  | 'classic'
  | 'success'
  | 'custom';

/**
 * شناسه صداهای محیطی
 */
export type AmbientSoundId =
  | 'rain'
  | 'forest'
  | 'cafe'
  | 'ocean'
  | 'fireplace'
  | 'white'
  | 'pink'
  | 'brown';

/**
 * یک صدای سفارشی
 */
export interface CustomSound {
  id: string;
  name: string;
  url?: string;
  dataUrl?: string;
  type: 'url' | 'file';
  createdAt: string;
}

/**
 * تنظیمات صدا
 */
export interface SoundSettings {
  notificationSound: NotificationSoundId;
  notificationVolume: number;
  ambientSound: AmbientSoundId | null;
  ambientVolume: number;
  customSound: CustomSound | null;
}

/**
 * اطلاعات یک صدای محیطی
 */
export interface AmbientSoundInfo {
  id: AmbientSoundId;
  icon: string;
  label: string;
}

/**
 * اطلاعات یک صدای اعلان
 */
export interface NotificationSoundInfo {
  icon: string;
  label: string;
}

/**
 * nod های فعال ambient
 */
interface AmbientNodes {
  masterGain: GainNode;
  sources: AudioBufferSourceNode[];
  oscillators: OscillatorNode[];
  intervals: Array<ReturnType<typeof setInterval>>;
}

/**
 * نتیجه ساخت ambient
 */
interface AmbientResult {
  sources: AudioBufferSourceNode[];
  oscillators?: OscillatorNode[];
  intervals?: Array<ReturnType<typeof setInterval>>;
}

// ============================================================
// کلاس اصلی SoundManager
// ============================================================

/**
 * کلاس اصلی SoundManager
 */
export class SoundManager {
  private audioContext: AudioContext | null = null;
  private ambientNodes: AmbientNodes | null = null;
  private currentAmbientSound: AmbientSoundId | null = null;
  private userInteracted: boolean = false;
  private settings: SoundSettings;
  private customSounds: CustomSound[];

  constructor() {
    // تنظیم تعامل کاربر (برای حل NotAllowedError)
    this._setupUserInteractionListener();

    // بارگذاری تنظیمات
    this.settings = this._loadSettings();
    this.customSounds = this._loadCustomSounds();

    logger.info('SoundManager آفلاین راه‌اندازی شد');
  }

  // ============================================================
  // User Interaction Detection
  // ============================================================

  /**
   * تنظیم listener برای تشخیص تعامل کاربر
   */
  private _setupUserInteractionListener(): void {
    const markInteracted = (): void => {
      this.userInteracted = true;
      document.removeEventListener('click', markInteracted);
      document.removeEventListener('keydown', markInteracted);
      document.removeEventListener('touchstart', markInteracted);
      logger.debug('User interacted - صداها فعال شدند');
    };

    document.addEventListener('click', markInteracted);
    document.addEventListener('keydown', markInteracted);
    document.addEventListener('touchstart', markInteracted, { passive: true });
  }

  // ============================================================
  // AudioContext
  // ============================================================

  /**
   * دریافت یا ساخت AudioContext
   */
  private _getContext(): AudioContext {
    if (!this.audioContext) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.audioContext = new AC();
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {
        // نادیده گرفتن خطای resume
      });
    }

    return this.audioContext;
  }

  // ============================================================
  // تنظیمات (با Storage.ts)
  // ============================================================

  /**
   * بارگذاری تنظیمات از Storage
   */
  private _loadSettings(): SoundSettings {
    const saved = storage.getLocal<SoundSettings>(
      SOUND_STORAGE_KEYS.SETTINGS,
      null
    );

    if (saved) {
      return {
        notificationSound: saved.notificationSound ?? 'bell',
        notificationVolume: saved.notificationVolume ?? 0.7,
        ambientSound: saved.ambientSound ?? null,
        ambientVolume: saved.ambientVolume ?? 0.3,
        customSound: saved.customSound ?? null,
      };
    }

    return {
      notificationSound: 'bell',
      notificationVolume: 0.7,
      ambientSound: null,
      ambientVolume: 0.3,
      customSound: null,
    };
  }

  /**
   * ذخیره تنظیمات در Storage
   */
  private _saveSettings(): void {
    storage.setLocal(SOUND_STORAGE_KEYS.SETTINGS, this.settings);
  }

  /**
   * بارگذاری صداهای سفارشی از Storage
   */
  private _loadCustomSounds(): CustomSound[] {
    return storage.getLocal<CustomSound[]>(
      SOUND_STORAGE_KEYS.CUSTOM_SOUNDS,
      []
    ) ?? [];
  }

  /**
   * ذخیره صداهای سفارشی در Storage
   */
  private _saveCustomSounds(): void {
    storage.setLocal(SOUND_STORAGE_KEYS.CUSTOM_SOUNDS, this.customSounds);
  }

  // ============================================================
  // صداهای اعلان (Notification)
  // ============================================================

  /**
   * پخش صدای اعلان
   */
  playNotification(): void {
    const sound = this.settings.notificationSound;
    const volume = this.settings.notificationVolume;

    logger.info('پخش صدای اعلان', { sound, volume });

    try {
      // اولویت ۱: صدای سفارشی
      if (sound === 'custom' && this.settings.customSound) {
        this.playCustomSound(this.settings.customSound);
        return;
      }

      // اولویت ۲: صداهای پیش‌فرض
      const ctx = this._getContext();

      switch (sound) {
        case 'bell':
          this._soundBell(ctx, volume);
          break;
        case 'chime':
          this._soundChime(ctx, volume);
          break;
        case 'digital':
          this._soundDigital(ctx, volume);
          break;
        case 'soft':
          this._soundSoft(ctx, volume);
          break;
        case 'classic':
          this._soundClassic(ctx, volume);
          break;
        case 'success':
          this._soundSuccess(ctx, volume);
          break;
        default:
          logger.warn('صدای ناشناخته', { sound });
      }

      logger.info('صدای اعلان پخش شد', { sound });
    } catch (error) {
      logger.error('خطا در پخش صدای اعلان', error);
    }
  }

  // ============================================================
  // تولید صداهای اعلان (۶ صدا)
  // ============================================================

  /**
   * 🔔 صدای زنگ کلاسیک
   */
  private _soundBell(ctx: AudioContext, volume: number): void {
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = now + i * 0.15;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume * 0.4, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  /**
   * 🎐 صدای چایم
   */
  private _soundChime(ctx: AudioContext, volume: number): void {
    const now = ctx.currentTime;
    [1046.5, 1318.5, 1567.98, 2093].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = now + i * 0.1;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume * 0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }

  /**
   * 📟 صدای دیجیتال
   */
  private _soundDigital(ctx: AudioContext, volume: number): void {
    const now = ctx.currentTime;
    [0, 0.15, 0.3].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 1000;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = now + offset;
      gain.gain.setValueAtTime(volume * 0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
      osc.start(t);
      osc.stop(t + 0.1);
    });
  }

  /**
   * 🎵 صدای نرم
   */
  private _soundSoft(ctx: AudioContext, volume: number): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.05);
    gain.gain.linearRampToValueAtTime(0, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  /**
   * ⏰ صدای آلارم کلاسیک
   */
  private _soundClassic(ctx: AudioContext, volume: number): void {
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const t = now + i * 0.2;
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.linearRampToValueAtTime(1200, t + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(volume * 0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      osc.start(t);
      osc.stop(t + 0.15);
    }
  }

  /**
   * ✨ صدای موفقیت
   */
  private _soundSuccess(ctx: AudioContext, volume: number): void {
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = now + i * 0.12;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume * 0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  // ============================================================
  // صداهای محیطی (Ambient)
  // ============================================================

  /**
   * شروع صدای محیطی
   */
  startAmbient(soundName: AmbientSoundId | null = null): void {
    const sound = soundName ?? this.settings.ambientSound;
    if (!sound) return;

    // اگر همان صدا در حال پخش است، کاری نکن
    if (this.currentAmbientSound === sound && this.ambientNodes) {
      return;
    }

    this.stopAmbient();

    // اگر کاربر هنوز تعامل نکرده، بعد از اولین تعامل شروع کن
    if (!this.userInteracted) {
      const handler = (): void => {
        document.removeEventListener('click', handler);
        if (sound) {
          this.startAmbient(sound);
        }
      };
      document.addEventListener('click', handler, { once: true });
      return;
    }

    try {
      const ctx = this._getContext();
      const masterGain = ctx.createGain();
      masterGain.gain.value = this.settings.ambientVolume;
      masterGain.connect(ctx.destination);

      let result: AmbientResult | undefined;

      switch (sound) {
        case 'rain':
          result = this._ambientRain(ctx, masterGain);
          break;
        case 'forest':
          result = this._ambientForest(ctx, masterGain);
          break;
        case 'cafe':
          result = this._ambientCafe(ctx, masterGain);
          break;
        case 'ocean':
          result = this._ambientOcean(ctx, masterGain);
          break;
        case 'fireplace':
          result = this._ambientFireplace(ctx, masterGain);
          break;
        case 'white':
          result = this._ambientWhiteNoise(ctx, masterGain);
          break;
        case 'brown':
          result = this._ambientBrownNoise(ctx, masterGain);
          break;
        case 'pink':
          result = this._ambientPinkNoise(ctx, masterGain);
          break;
        default:
          return;
      }

      if (result) {
        this.ambientNodes = {
          masterGain,
          sources: result.sources,
          oscillators: result.oscillators ?? [],
          intervals: result.intervals ?? [],
        };
        this.currentAmbientSound = sound;
        logger.info('Ambient شروع شد', { sound });
      }
    } catch (error) {
      logger.error('خطا در شروع ambient', error);
    }
  }

  /**
   * توقف صدای محیطی
   */
  stopAmbient(): void {
    if (!this.ambientNodes) return;

    try {
      const { masterGain, sources, oscillators, intervals } =
        this.ambientNodes;

      // Fade out
      if (masterGain && this.audioContext) {
        const now = this.audioContext.currentTime;
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.setValueAtTime(masterGain.gain.value, now);
        masterGain.gain.linearRampToValueAtTime(0, now + 0.3);
      }

      // Stop sources after fade
      setTimeout(() => {
        sources.forEach((s) => {
          try {
            s.stop();
          } catch {
            // نادیده گرفتن
          }
        });
        oscillators.forEach((o) => {
          try {
            o.stop();
          } catch {
            // نادیده گرفتن
          }
        });
        intervals.forEach((i) => clearInterval(i));
        try {
          masterGain.disconnect();
        } catch {
          // نادیده گرفتن
        }
      }, 400);
    } catch {
      // نادیده گرفتن خطای cleanup
    }

    this.ambientNodes = null;
    this.currentAmbientSound = null;
  }

  // ============================================================
  // تنظیمات Volume
  // ============================================================

  /**
   * تنظیم حجم صدای اعلان
   */
  setNotificationVolume(volume: number): void {
    this.settings.notificationVolume = Math.max(0, Math.min(1, volume));
    this._saveSettings();
  }

  /**
   * تنظیم حجم صدای محیطی
   */
  setAmbientVolume(volume: number): void {
    this.settings.ambientVolume = Math.max(0, Math.min(1, volume));

    if (this.ambientNodes?.masterGain && this.audioContext) {
      this.ambientNodes.masterGain.gain.setTargetAtTime(
        volume,
        this.audioContext.currentTime,
        0.1
      );
    }

    this._saveSettings();
  }

  /**
   * تنظیم صدای اعلان
   */
  setNotificationSound(soundName: NotificationSoundId): void {
    this.settings.notificationSound = soundName;
    this._saveSettings();
  }

  /**
   * تنظیم صدای محیطی
   */
  setAmbientSound(soundName: AmbientSoundId | null): void {
    this.settings.ambientSound = soundName;
    this._saveSettings();

    if (soundName) {
      this.startAmbient(soundName);
    } else {
      this.stopAmbient();
    }
  }

  // ============================================================
  // صداهای سفارشی
  // ============================================================

  /**
   * پخش صدای سفارشی
   */
  playCustomSound(sound: CustomSound): void {
    const audioSrc = sound.type === 'url' ? sound.url : sound.dataUrl;
    if (!audioSrc) {
      logger.warn('صدای سفارشی URL ندارد', { sound });
      return;
    }

    const audio = new Audio(audioSrc);
    audio.volume = this.settings.notificationVolume;
    audio.play().catch((e) => {
      logger.error('خطا در پخش صدای سفارشی', e);
    });
  }

  /**
   * تنظیم صدای سفارشی به عنوان اعلان
   */
  setCustomNotificationSound(sound: CustomSound): void {
    this.settings.notificationSound = 'custom';
    this.settings.customSound = sound;
    this._saveSettings();
    logger.info('صدای سفارشی به عنوان اعلان تنظیم شد', { name: sound.name });
  }

  /**
   * اضافه کردن صدای سفارشی از URL
   */
  addCustomSoundFromUrl(name: string, url: string): CustomSound {
    if (this.customSounds.some((s) => s.name === name)) {
      throw new Error('نام تکراری');
    }

    const sound: CustomSound = {
      id: Date.now().toString(36),
      name: name.trim(),
      url: url.trim(),
      type: 'url',
      createdAt: new Date().toISOString(),
    };

    this.customSounds.push(sound);
    this._saveCustomSounds();
    return sound;
  }

  /**
   * اضافه کردن صدای سفارشی از فایل
   */
  async addCustomSoundFromFile(name: string, file: File): Promise<CustomSound> {
    if (!file.type.startsWith('audio/')) {
      throw new Error('فایل باید صوتی باشد');
    }

    if (file.size > 3 * 1024 * 1024) {
      throw new Error('حجم فایل بیشتر از ۳MB');
    }

    if (this.customSounds.some((s) => s.name === name)) {
      throw new Error('نام تکراری');
    }

    return new Promise<CustomSound>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const dataUrl = e.target?.result as string;

          const sound: CustomSound = {
            id: Date.now().toString(36),
            name: name.trim(),
            dataUrl,
            type: 'file',
            createdAt: new Date().toISOString(),
          };

          this.customSounds.push(sound);
          this._saveCustomSounds();
          resolve(sound);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * حذف صدای سفارشی
   */
  removeCustomSound(id: string): boolean {
    const idx = this.customSounds.findIndex((s) => s.id === id);
    if (idx === -1) return false;

    const removed = this.customSounds.splice(idx, 1)[0];
    this._saveCustomSounds();

    // اگر صدای حذف‌شده، صدای اعلان فعلی بود، ریست کن
    if (removed && this.settings.customSound?.id === removed.id) {
      this.settings.notificationSound = 'bell';
      this.settings.customSound = null;
      this._saveSettings();
    }

    return true;
  }

  // ============================================================
  // تولید صداهای محیطی با Web Audio API
  // ============================================================

  /**
   * ایجاد نویز تصادفی (buffer)
   */
  private _createNoiseBuffer(
    ctx: AudioContext,
    seconds: number = 2,
    type: 'white' | 'pink' | 'brown' = 'white'
  ): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * seconds;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;

    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;

      if (type === 'white') {
        data[i] = white * 0.5;
      } else if (type === 'pink') {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
        b6 = white * 0.115926;
      } else if (type === 'brown') {
        b0 = (b0 + 0.02 * white) / 1.02;
        data[i] = b0 * 3.5;
      }
    }

    return buffer;
  }

  /**
   * 🌧️ صدای باران
   */
  private _ambientRain(ctx: AudioContext, masterGain: GainNode): AmbientResult {
    const sources: AudioBufferSourceNode[] = [];
    const intervals: Array<ReturnType<typeof setInterval>> = [];

    // صدای باران پایه (pink noise فیلتر شده)
    const buffer = this._createNoiseBuffer(ctx, 4, 'pink');
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 1000;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 8000;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.8;

    noise.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start();
    sources.push(noise);

    // قطرات تکی
    const dropInterval = setInterval(() => {
      if (!this.ambientNodes) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 2000 + Math.random() * 3000;
      osc.connect(gain);
      gain.connect(masterGain);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.1);
    }, 200 + Math.random() * 300);
    intervals.push(dropInterval);

    return { sources, intervals };
  }

  /**
   * 🌲 صدای جنگل
   */
  private _ambientForest(ctx: AudioContext, masterGain: GainNode): AmbientResult {
    const sources: AudioBufferSourceNode[] = [];
    const intervals: Array<ReturnType<typeof setInterval>> = [];

    // باد ملایم
    const buffer = this._createNoiseBuffer(ctx, 4, 'brown');
    const wind = ctx.createBufferSource();
    wind.buffer = buffer;
    wind.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 500;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.3;

    wind.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(masterGain);
    wind.start();
    sources.push(wind);

    // صدای پرندگان
    const chirpInterval = setInterval(() => {
      if (!this.ambientNodes) return;
      if (Math.random() > 0.6) return;

      const now = ctx.currentTime;
      const baseFreq = 2000 + Math.random() * 2000;
      const noteCount = 2 + Math.floor(Math.random() * 3);

      for (let i = 0; i < noteCount; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const freq = baseFreq + (Math.random() - 0.5) * 500;
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        osc.frequency.linearRampToValueAtTime(freq * 1.1, now + i * 0.08 + 0.05);
        osc.connect(gain);
        gain.connect(masterGain);
        const t = now + i * 0.08;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.08, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        osc.start(t);
        osc.stop(t + 0.08);
      }
    }, 800);
    intervals.push(chirpInterval);

    return { sources, intervals };
  }

  /**
   * ☕ صدای کافه
   */
  private _ambientCafe(ctx: AudioContext, masterGain: GainNode): AmbientResult {
    const sources: AudioBufferSourceNode[] = [];
    const intervals: Array<ReturnType<typeof setInterval>> = [];

    // همهمه پس‌زمینه
    const buffer = this._createNoiseBuffer(ctx, 4, 'pink');
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 800;
    bandpass.Q.value = 0.5;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.4;

    noise.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start();
    sources.push(noise);

    // صدای فنجان/قاشق
    const clinkInterval = setInterval(() => {
      if (!this.ambientNodes) return;
      if (Math.random() > 0.4) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 3000 + Math.random() * 2000;
      osc.connect(gain);
      gain.connect(masterGain);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.2);
    }, 1500);
    intervals.push(clinkInterval);

    return { sources, intervals };
  }

  /**
   * 🌊 صدای اقیانوس
   */
  private _ambientOcean(ctx: AudioContext, masterGain: GainNode): AmbientResult {
    const sources: AudioBufferSourceNode[] = [];
    const oscillators: OscillatorNode[] = [];

    // نویز قهوه‌ای
    const buffer = this._createNoiseBuffer(ctx, 4, 'brown');
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 600;

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.1;
    lfoGain.gain.value = 0.25;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.5;

    lfo.connect(lfoGain);
    lfoGain.connect(noiseGain.gain);
    noise.connect(lowpass);
    lowpass.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start();
    lfo.start();
    sources.push(noise);
    oscillators.push(lfo);

    // لایه دوم: کف
    const foamBuffer = this._createNoiseBuffer(ctx, 3, 'white');
    const foam = ctx.createBufferSource();
    foam.buffer = foamBuffer;
    foam.loop = true;

    const foamFilter = ctx.createBiquadFilter();
    foamFilter.type = 'highpass';
    foamFilter.frequency.value = 4000;

    const foamGain = ctx.createGain();
    foamGain.gain.value = 0.1;

    const lfo2 = ctx.createOscillator();
    const lfo2Gain = ctx.createGain();
    lfo2.frequency.value = 0.15;
    lfo2Gain.gain.value = 0.08;

    lfo2.connect(lfo2Gain);
    lfo2Gain.connect(foamGain.gain);
    foam.connect(foamFilter);
    foamFilter.connect(foamGain);
    foamGain.connect(masterGain);
    foam.start();
    lfo2.start();
    sources.push(foam);
    oscillators.push(lfo2);

    return { sources, oscillators };
  }

  /**
   * 🔥 صدای شومینه
   */
  private _ambientFireplace(ctx: AudioContext, masterGain: GainNode): AmbientResult {
    const sources: AudioBufferSourceNode[] = [];
    const intervals: Array<ReturnType<typeof setInterval>> = [];

    // صدای پایه آتش
    const buffer = this._createNoiseBuffer(ctx, 4, 'brown');
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 1;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.5;

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start();
    sources.push(noise);

    // crackles
    const crackleInterval = setInterval(() => {
      if (!this.ambientNodes) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 100 + Math.random() * 300;
      osc.connect(gain);
      gain.connect(masterGain);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.05);
    }, 100 + Math.random() * 200);
    intervals.push(crackleInterval);

    return { sources, intervals };
  }

  /**
   * 💨 نویز سفید
   */
  private _ambientWhiteNoise(ctx: AudioContext, masterGain: GainNode): AmbientResult {
    const buffer = this._createNoiseBuffer(ctx, 4, 'white');
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0.4;
    noise.connect(gain);
    gain.connect(masterGain);
    noise.start();
    return { sources: [noise] };
  }

  /**
   * 🟫 نویز قهوه‌ای
   */
  private _ambientBrownNoise(ctx: AudioContext, masterGain: GainNode): AmbientResult {
    const buffer = this._createNoiseBuffer(ctx, 4, 'brown');
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    noise.connect(gain);
    gain.connect(masterGain);
    noise.start();
    return { sources: [noise] };
  }

  /**
   * 🌸 نویز صورتی
   */
  private _ambientPinkNoise(ctx: AudioContext, masterGain: GainNode): AmbientResult {
    const buffer = this._createNoiseBuffer(ctx, 4, 'pink');
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0.4;
    noise.connect(gain);
    gain.connect(masterGain);
    noise.start();
    return { sources: [noise] };
  }

  // ============================================================
  // Public API
  // ============================================================

  /**
   * دریافت لیست صداهای موجود
   */
  getAvailableSounds(): {
    builtIn: NotificationSoundId[];
    custom: CustomSound[];
    ambient: AmbientSoundInfo[];
  } {
    return {
      builtIn: ['bell', 'chime', 'digital', 'soft', 'classic', 'success'],
      custom: [...this.customSounds],
      ambient: [
        { id: 'rain', icon: '🌧️', label: 'باران' },
        { id: 'forest', icon: '🌲', label: 'جنگل' },
        { id: 'cafe', icon: '☕', label: 'کافه' },
        { id: 'ocean', icon: '🌊', label: 'اقیانوس' },
        { id: 'fireplace', icon: '🔥', label: 'شومینه' },
        { id: 'white', icon: '💨', label: 'نویز سفید' },
        { id: 'pink', icon: '🌸', label: 'نویز صورتی' },
        { id: 'brown', icon: '🟫', label: 'نویز قهوه‌ای' },
      ],
    };
  }

  /**
   * دریافت تنظیمات
   */
  getSettings(): SoundSettings {
    return { ...this.settings };
  }

  /**
   * دریافت اطلاعات صداهای اعلان
   */
  getNotificationSoundInfo(): Record<string, NotificationSoundInfo> {
    return {
      bell: { icon: '🔔', label: 'زنگ کلاسیک' },
      chime: { icon: '🎐', label: 'چایم' },
      digital: { icon: '📟', label: 'دیجیتال' },
      soft: { icon: '🎵', label: 'نرم' },
      classic: { icon: '⏰', label: 'آلارم' },
      success: { icon: '✨', label: 'موفقیت' },
    };
  }

  /**
   * تست پخش یک صدای built-in (همه ۶ صدا)
   */
  testSound(soundId: NotificationSoundId): void {
    logger.info('تست صدا', { soundId });

    try {
      const volume = this.settings.notificationVolume;
      const ctx = this._getContext();

      switch (soundId) {
        case 'bell':
          this._soundBell(ctx, volume);
          break;
        case 'chime':
          this._soundChime(ctx, volume);
          break;
        case 'digital':
          this._soundDigital(ctx, volume);
          break;
        case 'soft':
          this._soundSoft(ctx, volume);
          break;
        case 'classic':
          this._soundClassic(ctx, volume);
          break;
        case 'success':
          this._soundSuccess(ctx, volume);
          break;
        default:
          logger.warn('صدای ناشناخته برای تست', { soundId });
      }
    } catch (error) {
      logger.error('خطا در تست صدا', error);
    }
  }

  /**
   * آیا صدای محیطی در حال پخش است؟
   */
  isAmbientPlaying(): boolean {
    return this.ambientNodes !== null;
  }

  /**
   * دریافت صدای محیطی فعلی
   */
  getCurrentAmbientSound(): AmbientSoundId | null {
    return this.currentAmbientSound;
  }

  /**
   * نابودسازی (cleanup)
   */
  destroy(): void {
    this.stopAmbient();

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        // نادیده گرفتن
      }
      this.audioContext = null;
    }

    logger.debug('SoundManager destroyed');
  }
}

// ============================================================
// Singleton
// ============================================================

let soundManagerInstance: SoundManager | null = null;

/**
 * دریافت نمونه singleton از SoundManager
 */
export function getSoundManager(): SoundManager {
  if (!soundManagerInstance) {
    soundManagerInstance = new SoundManager();
  }
  return soundManagerInstance;
}

/**
 * ریست کردن نمونه singleton (فقط برای تست)
 */
export function resetSoundManager(): void {
  if (soundManagerInstance) {
    soundManagerInstance.destroy();
  }
  soundManagerInstance = null;
}

/**
 * Export پیش‌فرض
 */
export default getSoundManager();