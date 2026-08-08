/**
 * دانش‌یار پرو - مدیریت صدا (نسخه ۱۰۰٪ آفلاین)
 * همه صداها با Web Audio API تولید می‌شوند - بدون نیاز به URL خارجی
 * @module services/SoundManager
 */

import LoggerModule from '../core/Logger.js';

const logger = LoggerModule.getInstance().module('SoundManager');

class SoundManager {
  constructor() {
    this.audioContext = null;
    this.ambientNodes = null;        // nod های فعال ambient
    this.currentAmbientSound = null;
    this.userInteracted = false;     // آیا کاربر با صفحه تعامل کرده؟
    
    // تنظیم تعامل کاربر (برای حل NotAllowedError)
    this._setupUserInteractionListener();
    
    // تنظیمات
    this.settings = this._loadSettings();
    this.customSounds = this._loadCustomSounds();
    
    logger.info('SoundManager آفلاین راه‌اندازی شد');
  }

  // ============================================================
  // User Interaction Detection
  // ============================================================
  
  _setupUserInteractionListener() {
    const markInteracted = () => {
      this.userInteracted = true;
      document.removeEventListener('click', markInteracted);
      document.removeEventListener('keydown', markInteracted);
      document.removeEventListener('touchstart', markInteracted);
      logger.debug('User interacted - صداها فعال شدند');
    };
    
    document.addEventListener('click', markInteracted);
    document.addEventListener('keydown', markInteracted);
    document.addEventListener('touchstart', markInteracted);
  }

  // ============================================================
  // AudioContext
  // ============================================================

  _getContext() {
    if (!this.audioContext) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AC();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  // ============================================================
  // تنظیمات
  // ============================================================

  _loadSettings() {
    try {
      const saved = localStorage.getItem('pomodoro_sound_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      notificationSound: 'bell',
      notificationVolume: 0.7,
      ambientSound: null,
      ambientVolume: 0.3
    };
  }

  _saveSettings() {
    try {
      localStorage.setItem('pomodoro_sound_settings', JSON.stringify(this.settings));
    } catch (e) {}
  }

  _loadCustomSounds() {
    try {
      const saved = localStorage.getItem('pomodoro_custom_sounds');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  }

  _saveCustomSounds() {
    try {
      localStorage.setItem('pomodoro_custom_sounds', JSON.stringify(this.customSounds));
    } catch (e) {
      logger.warn('خطا در ذخیره صداهای سفارشی');
    }
  }

  // ============================================================
  // صداهای اعلان (Notification)
  // ============================================================

  playNotification(soundName = null) {
    if (!this.userInteracted) {
      logger.warn('هنوز تعامل کاربر ثبت نشده - صدا پخش نمی‌شود');
      return;
    }
    
    const sound = soundName || this.settings.notificationSound;
    const volume = this.settings.notificationVolume;

    try {
      // صدای سفارشی؟
      const custom = this.customSounds.find(s => s.name === sound);
      if (custom) {
        this._playCustomSound(custom, volume);
        return;
      }
      
      // صداهای پیش‌فرض
      const ctx = this._getContext();
      switch (sound) {
        case 'bell': this._soundBell(ctx, volume); break;
        case 'chime': this._soundChime(ctx, volume); break;
        case 'digital': this._soundDigital(ctx, volume); break;
        case 'soft': this._soundSoft(ctx, volume); break;
        case 'classic': this._soundClassic(ctx, volume); break;
        case 'success': this._soundSuccess(ctx, volume); break;
        default: this._soundBell(ctx, volume);
      }
    } catch (error) {
      logger.error('خطا در پخش صدای اعلان', error);
    }
  }

  testSound(soundName) {
    // Force user interacted برای تست
    this.userInteracted = true;
    this.playNotification(soundName);
  }

  // ============================================================
  // صداهای محیطی (Ambient) - تولید با Web Audio API
  // ============================================================

  startAmbient(soundName = null) {
    const sound = soundName || this.settings.ambientSound;
    if (!sound) return;

    // اگر همان صدا در حال پخش است، کاری نکن
    if (this.currentAmbientSound === sound && this.ambientNodes) {
      return;
    }

    this.stopAmbient();

    if (!this.userInteracted) {
      // بعد از اولین تعامل کاربر، شروع کن
      const handler = () => {
        document.removeEventListener('click', handler);
        if (this.settings.ambientSound) {
          this.startAmbient(this.settings.ambientSound);
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

      let nodes;
      switch (sound) {
        case 'rain': nodes = this._ambientRain(ctx, masterGain); break;
        case 'forest': nodes = this._ambientForest(ctx, masterGain); break;
        case 'cafe': nodes = this._ambientCafe(ctx, masterGain); break;
        case 'ocean': nodes = this._ambientOcean(ctx, masterGain); break;
        case 'fireplace': nodes = this._ambientFireplace(ctx, masterGain); break;
        case 'white': nodes = this._ambientWhiteNoise(ctx, masterGain); break;
        case 'brown': nodes = this._ambientBrownNoise(ctx, masterGain); break;
        case 'pink': nodes = this._ambientPinkNoise(ctx, masterGain); break;
        default: return;
      }

      this.ambientNodes = { ...nodes, masterGain };
      this.currentAmbientSound = sound;
      logger.info('Ambient شروع شد', { sound });
    } catch (error) {
      logger.error('خطا در شروع ambient', error);
    }
  }

  stopAmbient() {
    if (!this.ambientNodes) return;

    try {
      const { masterGain, sources, oscillators, intervals } = this.ambientNodes;
      
      // Fade out
      if (masterGain && this.audioContext) {
        const now = this.audioContext.currentTime;
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.setValueAtTime(masterGain.gain.value, now);
        masterGain.gain.linearRampToValueAtTime(0, now + 0.3);
      }

      // Stop sources after fade
      setTimeout(() => {
        if (sources) {
          sources.forEach(s => { try { s.stop(); } catch(e){} });
        }
        if (oscillators) {
          oscillators.forEach(o => { try { o.stop(); } catch(e){} });
        }
        if (intervals) {
          intervals.forEach(i => clearInterval(i));
        }
        if (masterGain) {
          try { masterGain.disconnect(); } catch(e){}
        }
      }, 400);
    } catch (e) {}

    this.ambientNodes = null;
    this.currentAmbientSound = null;
  }

  // ============================================================
  // تنظیمات Volume
  // ============================================================

  setNotificationVolume(volume) {
    this.settings.notificationVolume = Math.max(0, Math.min(1, volume));
    this._saveSettings();
  }

  setAmbientVolume(volume) {
    this.settings.ambientVolume = Math.max(0, Math.min(1, volume));
    if (this.ambientNodes?.masterGain) {
      this.ambientNodes.masterGain.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.1);
    }
    this._saveSettings();
  }

  setNotificationSound(soundName) {
    this.settings.notificationSound = soundName;
    this._saveSettings();
  }

  setAmbientSound(soundName) {
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

  async _playCustomSound(sound, volume) {
    try {
      const audio = new Audio(sound.url || sound.dataUrl);
      audio.volume = Math.max(0, Math.min(1, volume));
      await audio.play();
    } catch (error) {
      logger.error('خطا در پخش صدای سفارشی', error);
    }
  }

  addCustomSoundFromUrl(name, url) {
    if (this.customSounds.some(s => s.name === name)) {
      throw new Error('نام تکراری');
    }
    const sound = {
      id: Date.now().toString(36),
      name: name.trim(),
      url: url.trim(),
      type: 'url',
      createdAt: new Date().toISOString()
    };
    this.customSounds.push(sound);
    this._saveCustomSounds();
    return sound;
  }

  async addCustomSoundFromFile(name, file) {
    if (!file.type.startsWith('audio/')) {
      throw new Error('فایل باید صوتی باشد');
    }
    if (file.size > 3 * 1024 * 1024) {
      throw new Error('حجم فایل بیشتر از ۳MB');
    }
    if (this.customSounds.some(s => s.name === name)) {
      throw new Error('نام تکراری');
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const sound = {
            id: Date.now().toString(36),
            name: name.trim(),
            dataUrl: e.target.result,
            type: 'file',
            createdAt: new Date().toISOString()
          };
          this.customSounds.push(sound);
          this._saveCustomSounds();
          resolve(sound);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
      reader.readAsDataURL(file);
    });
  }

  removeCustomSound(id) {
    const idx = this.customSounds.findIndex(s => s.id === id);
    if (idx === -1) return false;
    const removed = this.customSounds.splice(idx, 1)[0];
    this._saveCustomSounds();
    if (this.settings.notificationSound === removed.name) {
      this.settings.notificationSound = 'bell';
      this._saveSettings();
    }
    return true;
  }

  // ============================================================
  // تولید صداهای پیش‌فرض (Notification)
  // ============================================================

  _soundBell(ctx, volume) {
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

  _soundChime(ctx, volume) {
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

  _soundDigital(ctx, volume) {
    const now = ctx.currentTime;
    [0, 0.15, 0.3].forEach(offset => {
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

  _soundSoft(ctx, volume) {
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

  _soundClassic(ctx, volume) {
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

  _soundSuccess(ctx, volume) {
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
  // تولید صداهای محیطی با Web Audio API (آفلاین کامل)
  // ============================================================

  /**
   * ایجاد نویز تصادفی (buffer)
   */
  _createNoiseBuffer(ctx, seconds = 2, type = 'white') {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * seconds;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      
      if (type === 'white') {
        data[i] = white * 0.5;
      } else if (type === 'pink') {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
        b6 = white * 0.115926;
      } else if (type === 'brown') {
        b0 = (b0 + (0.02 * white)) / 1.02;
        data[i] = b0 * 3.5;
      }
    }
    return buffer;
  }

  /**
   * 🌧️ صدای باران
   */
  _ambientRain(ctx, masterGain) {
    const sources = [];
    
    // صدای باران پایه (pink noise فیلتر شده)
    const buffer = this._createNoiseBuffer(ctx, 4, 'pink');
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    
    // High-pass filter برای شبیه‌سازی صدای باران
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 1000;
    
    // Low-pass برای نرم‌تر کردن
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
    
    // قطرات تکی (random plinks)
    const intervals = [];
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
   * 🌲 صدای جنگل (پرندگان + باد ملایم)
   */
  _ambientForest(ctx, masterGain) {
    const sources = [];
    const intervals = [];
    
    // باد ملایم (brown noise)
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
    
    // صدای پرندگان (chirps تصادفی)
    const chirpInterval = setInterval(() => {
      if (!this.ambientNodes) return;
      if (Math.random() > 0.6) return; // گاهی هیچ پرنده‌ای نمی‌خواند
      
      const now = ctx.currentTime;
      const baseFreq = 2000 + Math.random() * 2000;
      
      // هر chirp شامل 2-4 نت است
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
   * ☕ صدای کافه (murmur + clinks)
   */
  _ambientCafe(ctx, masterGain) {
    const sources = [];
    const intervals = [];
    
    // همهمه پس‌زمینه (pink noise با bandpass)
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
    
    // صدای فنجان/قاشق تصادفی
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
   * 🌊 صدای اقیانوس (امواج)
   */
  _ambientOcean(ctx, masterGain) {
    const sources = [];
    const oscillators = [];
    
    // نویز قهوه‌ای به عنوان پایه امواج
    const buffer = this._createNoiseBuffer(ctx, 4, 'brown');
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 600;
    
    // LFO برای modulation (شبیه‌سازی موج)
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.1; // موج هر 10 ثانیه
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
    
    // لایه دوم: high frequency برای صدای کف
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
   * 🔥 صدای شومینه (crackle)
   */
  _ambientFireplace(ctx, masterGain) {
    const sources = [];
    const intervals = [];
    
    // صدای پایه آتش (brown noise)
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
    
    // crackles (ترق و تروق چوب)
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
  _ambientWhiteNoise(ctx, masterGain) {
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
   * نویز قهوه‌ای (برای خواب/تمرکز عمیق)
   */
  _ambientBrownNoise(ctx, masterGain) {
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
   * نویز صورتی (متعادل)
   */
  _ambientPinkNoise(ctx, masterGain) {
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

  getAvailableSounds() {
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
        { id: 'brown', icon: '🟫', label: 'نویز قهوه‌ای' }
      ]
    };
  }

  getSettings() {
    return { ...this.settings };
  }

  getNotificationSoundInfo() {
    return {
      bell: { icon: '🔔', label: 'زنگ کلاسیک' },
      chime: { icon: '🎐', label: 'چایم' },
      digital: { icon: '📟', label: 'دیجیتال' },
      soft: { icon: '🎵', label: 'نرم' },
      classic: { icon: '⏰', label: 'آلارم' },
      success: { icon: '✨', label: 'موفقیت' }
    };
  }

  destroy() {
    this.stopAmbient();
    if (this.audioContext) {
      try { this.audioContext.close(); } catch (e) {}
    }
  }
}

const soundManager = new SoundManager();
window.addEventListener('beforeunload', () => soundManager.destroy());
export default soundManager;