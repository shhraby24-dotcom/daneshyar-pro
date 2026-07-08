/**
 * دانش‌یار پرو - View پومودورو حرفه‌ای
 * الهام‌گرفته از My Little Pomodoro
 * @module ui/views/PomodoroView
 */

import state from '../../core/State.js';
import LoggerModule from '../../core/Logger.js';
import EventBusModule from '../../core/EventBus.js';
import soundManager from '../../services/SoundManager.js';
import toast from '../components/Toast.js';
import modal from '../components/Modal.js';

const logger = LoggerModule.getInstance().module('PomodoroView');

// ============================================================
// State سراسری پومودورو (در سطح ماژول - پس با تغییر view حفظ می‌شود)
// ============================================================
const pomodoroState = {
  phase: 'work',
  timeLeft: 25 * 60,
  running: false,
  cycles: 0,
  timer: null,
  lastTick: null,
  startedAt: null,
  uiUpdateFn: null,
  settings: loadSettings()
};

// ============================================================
// جملات انگیزشی
// ============================================================
const MOTIVATIONAL_QUOTES = [
  "هر دقیقه تمرکز، یک قدم به جلوست",
  "موفقیت نتیجه تلاش مستمر است",
  "تمرکز امروز، موفقیت فرداست",
  "کوچک شروع کن، بزرگ ادامه بده",
  "هر پومودورو یک پیروزی است",
  "تو قوی‌تر از چیزی هستی که فکر می‌کنی",
  "پیشرفت بهتر از کمال است",
  "امروز بهتر از دیروز باش",
  "ذهن متمرکز، ذهن قدرتمند است",
  "ثبات مهم‌تر از سرعت است",
  "به خودت ایمان داشته باش",
  "سخت‌کوشی شکست را شکست می‌دهد"
];

// ============================================================
// اطلاعات هر فاز
// ============================================================
const PHASE_INFO = {
  work: {
    label: 'تمرکز عمیق',
    icon: '🎯',
    color: '#ef4444',
    gradient: 'from-red-500 via-orange-500 to-yellow-500',
    message: 'وقت تمرکز کامل است!'
  },
  short: {
    label: 'استراحت کوتاه',
    icon: '☕',
    color: '#10b981',
    gradient: 'from-green-500 via-emerald-500 to-teal-500',
    message: 'یه استراحت کوتاه داشته باش'
  },
  long: {
    label: 'استراحت بلند',
    icon: '🌴',
    color: '#3b82f6',
    gradient: 'from-blue-500 via-indigo-500 to-purple-500',
    message: 'استراحت کامل و تجدید قوا'
  }
};

// محیط دایره SVG (r=120)
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 120;

// ============================================================
// توابع تنظیمات
// ============================================================
function loadSettings() {
  const saved = localStorage.getItem('pomodoro_settings');
  return saved ? JSON.parse(saved) : {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    cyclesBeforeLongBreak: 4,
    autoStartBreaks: false,
    autoStartPomodoros: false,
    dailyGoal: 8
  };
}

function saveSettings() {
  localStorage.setItem('pomodoro_settings', JSON.stringify(pomodoroState.settings));
}

function getPhaseDurations() {
  return {
    work: pomodoroState.settings.workDuration * 60,
    short: pomodoroState.settings.shortBreakDuration * 60,
    long: pomodoroState.settings.longBreakDuration * 60
  };
}

// ============================================================
// ساخت View اصلی
// ============================================================
export function createPomodoroView() {
  logger.info('رندر پومودورو حرفه‌ای');

  const container = document.createElement('div');
  container.className = 'space-y-6 fade-in max-w-6xl mx-auto p-2 md:p-4';

  // Header
  container.appendChild(createHeader());

  // Grid اصلی (1 ستون در موبایل، 3 ستون در دسکتاپ)
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 lg:grid-cols-3 gap-6';

  grid.appendChild(createTimerColumn());
  grid.appendChild(createControlsColumn());
  grid.appendChild(createStatsColumn());

  container.appendChild(grid);

  // ثبت تابع UI update
  pomodoroState.uiUpdateFn = updateTimerUI;
  updateTimerUI();

  // شروع ambient sound اگر از قبل تنظیم شده
  const soundSettings = soundManager.getSettings();
  if (soundSettings.ambientSound) {
    soundManager.startAmbient(soundSettings.ambientSound);
  }

  // cleanup هنگام خروج از view
  container.addEventListener('DOMNodeRemoved', () => {
    pomodoroState.uiUpdateFn = null;
    soundManager.stopAmbient();
  }, { once: true });

  return container;
}

// ============================================================
// Header
// ============================================================
function createHeader() {
  const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
  const today = new Date().toLocaleDateString('fa-IR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const header = document.createElement('div');
  header.className = 'text-center space-y-2';
  header.innerHTML = `
    <div class="inline-block">
      <span class="text-7xl">⏱️</span>
    </div>
    <h1 class="text-4xl font-black bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 bg-clip-text text-transparent">
      پومودورو حرفه‌ای
    </h1>
    <p class="text-slate-400 text-sm">${today}</p>
    <div class="mt-4 p-4 bg-gradient-to-r from-primary-500/10 via-accent-500/10 to-primary-500/10 border border-primary-500/20 rounded-xl max-w-2xl mx-auto">
      <p class="text-slate-300 italic">"${quote}"</p>
    </div>
  `;
  return header;
}

// ============================================================
// ستون تایمر (چپ)
// ============================================================
function createTimerColumn() {
  const column = document.createElement('div');
  column.className = 'space-y-4';

  const phase = PHASE_INFO[pomodoroState.phase];

  const timerCard = document.createElement('div');
  timerCard.className = 'bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl';
  timerCard.innerHTML = `
    <div id="pomo-phase-header" class="p-6 bg-gradient-to-r ${phase.gradient} text-white text-center relative overflow-hidden">
      <div class="absolute inset-0 bg-black/10"></div>
      <div class="relative z-10">
        <div class="text-5xl mb-2">${phase.icon}</div>
        <h2 id="pomo-phase-label" class="text-2xl font-bold">${phase.label}</h2>
        <p class="text-sm opacity-90 mt-1">${phase.message}</p>
      </div>
    </div>

    <div class="p-8 flex justify-center items-center bg-gradient-to-b from-slate-800 to-slate-900">
      <div class="relative" style="width: 320px; height: 320px;">
        <svg width="320" height="320" style="transform: rotate(-90deg);" class="drop-shadow-2xl">
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:${phase.color};stop-opacity:1" />
              <stop offset="100%" style="stop-color:${phase.color};stop-opacity:0.6" />
            </linearGradient>
          </defs>

          <circle cx="160" cy="160" r="120" fill="none" stroke="#1e293b" stroke-width="16"/>
          <circle cx="160" cy="160" r="120" fill="none" stroke="#334155" stroke-width="2" opacity="0.3"/>

          <circle
            id="pomo-progress"
            cx="160" cy="160" r="120"
            fill="none"
            stroke="url(#progressGradient)"
            stroke-width="16"
            stroke-linecap="round"
            stroke-dasharray="${CIRCLE_CIRCUMFERENCE}"
            stroke-dashoffset="0"
            style="transition: stroke-dashoffset 1s linear; filter: drop-shadow(0 0 10px ${phase.color}40);"
          />
        </svg>

        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <div id="pomo-time" class="text-7xl font-black text-slate-100 tabular-nums tracking-tight" style="font-variant-numeric: tabular-nums;">
            25:00
          </div>
          <div id="pomo-phase-small" class="text-base text-slate-400 mt-2 font-medium">
            ${phase.label}
          </div>
          <div class="mt-4 flex items-center gap-2">
            <span class="text-xs text-slate-500">دور</span>
            <div class="flex gap-1" id="pomo-cycles-dots">
              ${renderCycleDots()}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="p-6 space-y-3 bg-slate-900/50">
      <div class="flex gap-3">
        <button id="pomo-start-btn" class="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
          ▶️ شروع تمرکز
        </button>
        <button id="pomo-reset-btn" class="bg-slate-700 hover:bg-slate-600 text-slate-100 px-6 py-4 rounded-xl font-medium transition-all hover:scale-105">
          🔄
        </button>
      </div>
    </div>
  `;

  column.appendChild(timerCard);

  setTimeout(() => {
    document.getElementById('pomo-start-btn')?.addEventListener('click', toggleTimer);
    document.getElementById('pomo-reset-btn')?.addEventListener('click', resetTimer);
  }, 0);

  return column;
}

function renderCycleDots() {
  const count = pomodoroState.settings.cyclesBeforeLongBreak;
  const filled = pomodoroState.cycles % count;
  return Array(count).fill(0).map((_, i) => `
    <div class="w-2.5 h-2.5 rounded-full ${i < filled ? 'bg-primary-500' : 'bg-slate-600'} transition-colors"></div>
  `).join('');
}

// ============================================================
// ستون کنترل‌ها (وسط)
// ============================================================
function createControlsColumn() {
  const column = document.createElement('div');
  column.className = 'space-y-4';

  // انتخاب فاز
  const phaseCard = document.createElement('div');
  phaseCard.className = 'bg-slate-800 border border-slate-700 rounded-xl p-5';
  phaseCard.innerHTML = `
    <div class="flex items-center gap-2 mb-4">
      <span class="text-2xl">🎛️</span>
      <h3 class="font-bold text-slate-100">انتخاب فاز</h3>
    </div>
    <div class="space-y-2" id="phase-buttons">
      ${renderPhaseButtons()}
    </div>
  `;
  column.appendChild(phaseCard);

  // Ambient Sounds
  const ambientCard = document.createElement('div');
  ambientCard.className = 'bg-slate-800 border border-slate-700 rounded-xl p-5';
  ambientCard.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="text-2xl">🎵</span>
        <h3 class="font-bold text-slate-100">صداهای محیطی</h3>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-2" id="ambient-sounds-grid">
      ${createAmbientSoundButtons()}
    </div>
    <div class="mt-4 pt-4 border-t border-slate-700">
      <label class="text-xs text-slate-400 mb-2 block">حجم صدا</label>
      <input type="range" id="ambient-volume" min="0" max="100" value="${soundManager.getSettings().ambientVolume * 100}"
             class="w-full accent-primary-500">
    </div>
  `;
  column.appendChild(ambientCard);

  // دکمه تنظیمات صدا
  const soundSettingsBtn = document.createElement('button');
  soundSettingsBtn.className = 'w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-4 text-right transition-all group';
  soundSettingsBtn.innerHTML = `
    <div class="flex items-center gap-3">
      <span class="text-3xl">🔔</span>
      <div class="flex-1">
        <div class="font-bold text-slate-200">تنظیمات صدای اعلان</div>
        <div class="text-xs text-slate-500">انتخاب و آپلود صدا</div>
      </div>
      <span class="text-slate-600 group-hover:text-slate-400 transition-colors">←</span>
    </div>
  `;
  soundSettingsBtn.addEventListener('click', showSoundSettings);
  column.appendChild(soundSettingsBtn);

  setTimeout(() => bindControlEvents(), 0);

  return column;
}

function renderPhaseButtons() {
  const phases = [
    { id: 'work', icon: '🎯', label: 'تمرکز عمیق', duration: pomodoroState.settings.workDuration },
    { id: 'short', icon: '☕', label: 'استراحت کوتاه', duration: pomodoroState.settings.shortBreakDuration },
    { id: 'long', icon: '🌴', label: 'استراحت بلند', duration: pomodoroState.settings.longBreakDuration }
  ];

  return phases.map(p => {
    const isActive = pomodoroState.phase === p.id;
    const phaseInfo = PHASE_INFO[p.id];
    return `
      <button data-phase="${p.id}" class="pomo-phase-btn w-full ${isActive ? `bg-gradient-to-r ${phaseInfo.gradient} text-white border-0 shadow-lg` : 'bg-slate-900 hover:bg-slate-700 border border-slate-700'} p-4 rounded-lg text-right transition-all ${isActive ? '' : 'group'}">
        <div class="flex items-center gap-3">
          <span class="text-3xl">${p.icon}</span>
          <div class="flex-1">
            <div class="font-bold ${isActive ? 'text-white' : 'text-slate-200'}">${p.label}</div>
            <div class="text-xs ${isActive ? 'text-white/80' : 'text-slate-500'}">${p.duration} دقیقه</div>
          </div>
          <span class="${isActive ? 'text-white/80' : 'text-slate-600 group-hover:text-slate-400'} transition-colors">${isActive ? '✓' : '←'}</span>
        </div>
      </button>
    `;
  }).join('');
}

function createAmbientSoundButtons() {
  const sounds = [
    { id: 'rain', icon: '🌧️', label: 'باران' },
    { id: 'forest', icon: '🌲', label: 'جنگل' },
    { id: 'cafe', icon: '☕', label: 'کافه' },
    { id: 'ocean', icon: '🌊', label: 'اقیانوس' },
    { id: 'fireplace', icon: '🔥', label: 'شومینه' },
    { id: 'white', icon: '💨', label: 'نویز سفید' }
  ];

  const currentSound = soundManager.getSettings().ambientSound;

  return sounds.map(sound => {
    const isActive = currentSound === sound.id;
    return `
      <button data-sound="${sound.id}" class="ambient-sound-btn ${isActive ? 'bg-primary-500/20 border-primary-500 ring-2 ring-primary-500/50' : 'bg-slate-900 border-slate-700 hover:bg-slate-700'}
              border rounded-lg p-3 text-center transition-all">
        <div class="text-2xl mb-1">${sound.icon}</div>
        <div class="text-xs font-medium ${isActive ? 'text-primary-300' : 'text-slate-300'}">${sound.label}</div>
      </button>
    `;
  }).join('');
}

function bindControlEvents() {
  // دکمه‌های فاز
  document.querySelectorAll('.pomo-phase-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const phase = btn.dataset.phase;
      if (pomodoroState.running) {
        toast.warning('ابتدا تایمر را متوقف کنید');
        return;
      }
      setPhase(phase);
    });
  });

  // دکمه‌های ambient
  bindAmbientButtons();

  // Volume slider
  document.getElementById('ambient-volume')?.addEventListener('input', (e) => {
    soundManager.setAmbientVolume(e.target.value / 100);
  });
}

function bindAmbientButtons() {
  document.querySelectorAll('.ambient-sound-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sound = btn.dataset.sound;
      const currentSound = soundManager.getSettings().ambientSound;

      if (currentSound === sound) {
        soundManager.setAmbientSound(null);
        toast.info('صدای محیطی متوقف شد');
      } else {
        soundManager.setAmbientSound(sound);
        toast.success(`صدای ${getAmbientSoundLabel(sound)} فعال شد`);
      }
      updateAmbientButtons();
    });
  });
}

function updateAmbientButtons() {
  const grid = document.getElementById('ambient-sounds-grid');
  if (grid) {
    grid.innerHTML = createAmbientSoundButtons();
    bindAmbientButtons();
  }
}

function getAmbientSoundLabel(soundId) {
  const labels = {
    rain: 'باران', forest: 'جنگل', cafe: 'کافه',
    ocean: 'اقیانوس', fireplace: 'شومینه', white: 'نویز سفید'
  };
  return labels[soundId] || soundId;
}

// ============================================================
// ستون آمار (راست)
// ============================================================
function createStatsColumn() {
  const column = document.createElement('div');
  column.className = 'space-y-4';

  const today = new Date().toDateString();
  const sessions = (state.get('studySessions') || []).filter(
    s => s.type === 'pomodoro' && new Date(s.date).toDateString() === today
  );

  const totalMinutes = sessions.length * pomodoroState.settings.workDuration;
  const goalProgress = Math.min(100, (sessions.length / pomodoroState.settings.dailyGoal) * 100);

  // آمار امروز
  const todayCard = document.createElement('div');
  todayCard.className = 'bg-slate-800 border border-slate-700 rounded-xl p-5';
  todayCard.innerHTML = `
    <div class="flex items-center gap-2 mb-4">
      <span class="text-2xl">📊</span>
      <h3 class="font-bold text-slate-100">آمار امروز</h3>
    </div>

    <div class="space-y-3">
      <div class="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🎯</span>
          <div>
            <div class="text-xs text-slate-400">پومودورو</div>
            <div class="text-lg font-bold text-primary-400">${sessions.length}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs text-slate-500">هدف</div>
          <div class="text-sm font-bold text-slate-300">${pomodoroState.settings.dailyGoal}</div>
        </div>
      </div>

      <div class="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
        <div class="flex items-center gap-2">
          <span class="text-2xl">⏰</span>
          <div>
            <div class="text-xs text-slate-400">زمان تمرکز</div>
            <div class="text-lg font-bold text-accent-400">${totalMinutes} دقیقه</div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🔥</span>
          <div>
            <div class="text-xs text-slate-400">Streak</div>
            <div class="text-lg font-bold text-red-400">${state.getStats().studyStreak} روز</div>
          </div>
        </div>
      </div>

      <div class="mt-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs text-slate-400">پیشرفت هدف روزانه</span>
          <span class="text-xs font-bold text-primary-400">${goalProgress.toFixed(0)}%</span>
        </div>
        <div class="w-full bg-slate-900 rounded-full h-3 overflow-hidden">
          <div class="bg-gradient-to-r from-primary-500 to-accent-500 h-full rounded-full transition-all duration-500"
               style="width: ${goalProgress}%"></div>
        </div>
      </div>

      ${sessions.length === 0 ? `
        <div class="mt-4 p-3 bg-slate-900/30 border border-slate-700 border-dashed rounded-lg text-center">
          <p class="text-xs text-slate-500">
            هنوز پومودورویی امروز تکمیل نکرده‌ای. اولین تمرکزت رو شروع کن! 💪
          </p>
        </div>
      ` : sessions.length >= pomodoroState.settings.dailyGoal ? `
        <div class="mt-4 p-3 bg-gradient-to-l from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg text-center">
          <p class="text-sm font-bold text-green-400">
            🎉 هدف امروزت محقق شد!
          </p>
        </div>
      ` : ''}
    </div>
  `;
  column.appendChild(todayCard);

  // آمار کلی
  const allSessions = (state.get('studySessions') || []).filter(s => s.type === 'pomodoro');
  const totalPomodoros = allSessions.length;
  const totalHours = Math.round(totalPomodoros * pomodoroState.settings.workDuration / 60);

  const overallCard = document.createElement('div');
  overallCard.className = 'bg-slate-800 border border-slate-700 rounded-xl p-5';
  overallCard.innerHTML = `
    <div class="flex items-center gap-2 mb-4">
      <span class="text-2xl">🏆</span>
      <h3 class="font-bold text-slate-100">آمار کلی</h3>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="bg-slate-900/50 rounded-lg p-3 text-center">
        <div class="text-xl font-bold text-primary-400">${totalPomodoros}</div>
        <div class="text-xs text-slate-400 mt-1">کل پومودورو</div>
      </div>
      <div class="bg-slate-900/50 rounded-lg p-3 text-center">
        <div class="text-xl font-bold text-accent-400">${totalHours}</div>
        <div class="text-xs text-slate-400 mt-1">ساعت تمرکز</div>
      </div>
    </div>
  `;
  column.appendChild(overallCard);

  // دکمه تنظیمات
  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'w-full bg-gradient-to-l from-primary-500/20 to-accent-500/20 hover:from-primary-500/30 hover:to-accent-500/30 border border-primary-500/30 rounded-xl p-4 text-right transition-all';
  settingsBtn.innerHTML = `
    <div class="flex items-center gap-3">
      <span class="text-3xl">⚙️</span>
      <div class="flex-1">
        <div class="font-bold text-slate-100">تنظیمات پومودورو</div>
        <div class="text-xs text-slate-400">زمان‌ها و اهداف</div>
      </div>
      <span class="text-slate-400">←</span>
    </div>
  `;
  settingsBtn.addEventListener('click', showSettings);
  column.appendChild(settingsBtn);

  return column;
}

// ============================================================
// Modal تنظیمات پومودورو
// ============================================================
function showSettings() {
  const content = document.createElement('div');
  content.className = 'space-y-6';

  // زمان‌ها
  const timesSection = document.createElement('div');
  timesSection.innerHTML = `
    <h3 class="text-lg font-bold mb-4 flex items-center gap-2 text-slate-100">
      <span>⏱️</span>
      <span>زمان‌ها (دقیقه)</span>
    </h3>
    <div class="space-y-4">
      <div>
        <label class="text-sm text-slate-300 mb-2 flex justify-between">
          <span>🎯 تمرکز</span>
          <span class="text-primary-400 font-bold" id="work-label">${pomodoroState.settings.workDuration} دقیقه</span>
        </label>
        <input type="range" id="work-duration" min="15" max="60" step="5" value="${pomodoroState.settings.workDuration}" class="w-full accent-primary-500">
        <div class="flex justify-between text-xs text-slate-500 mt-1">
          <span>۱۵</span><span>۶۰</span>
        </div>
      </div>
      <div>
        <label class="text-sm text-slate-300 mb-2 flex justify-between">
          <span>☕ استراحت کوتاه</span>
          <span class="text-green-400 font-bold" id="short-label">${pomodoroState.settings.shortBreakDuration} دقیقه</span>
        </label>
        <input type="range" id="short-break-duration" min="3" max="15" step="1" value="${pomodoroState.settings.shortBreakDuration}" class="w-full accent-green-500">
        <div class="flex justify-between text-xs text-slate-500 mt-1">
          <span>۳</span><span>۱۵</span>
        </div>
      </div>
      <div>
        <label class="text-sm text-slate-300 mb-2 flex justify-between">
          <span>🌴 استراحت بلند</span>
          <span class="text-blue-400 font-bold" id="long-label">${pomodoroState.settings.longBreakDuration} دقیقه</span>
        </label>
        <input type="range" id="long-break-duration" min="15" max="45" step="5" value="${pomodoroState.settings.longBreakDuration}" class="w-full accent-blue-500">
        <div class="flex justify-between text-xs text-slate-500 mt-1">
          <span>۱۵</span><span>۴۵</span>
        </div>
      </div>
      <div>
        <label class="text-sm text-slate-300 mb-2 flex justify-between">
          <span>🔁 دور قبل از استراحت بلند</span>
          <span class="text-accent-400 font-bold" id="cycles-label">${pomodoroState.settings.cyclesBeforeLongBreak}</span>
        </label>
        <input type="range" id="cycles-before-long" min="2" max="8" step="1" value="${pomodoroState.settings.cyclesBeforeLongBreak}" class="w-full accent-accent-500">
        <div class="flex justify-between text-xs text-slate-500 mt-1">
          <span>۲</span><span>۸</span>
        </div>
      </div>
    </div>
  `;
  content.appendChild(timesSection);

  // هدف روزانه
  const goalSection = document.createElement('div');
  goalSection.innerHTML = `
    <h3 class="text-lg font-bold mb-4 flex items-center gap-2 text-slate-100">
      <span>🎯</span>
      <span>هدف روزانه</span>
    </h3>
    <div>
      <label class="text-sm text-slate-300 mb-2 flex justify-between">
        <span>تعداد پومودورو در روز</span>
        <span class="text-primary-400 font-bold" id="goal-label">${pomodoroState.settings.dailyGoal}</span>
      </label>
      <input type="range" id="daily-goal" min="1" max="20" step="1" value="${pomodoroState.settings.dailyGoal}" class="w-full accent-primary-500">
      <div class="flex justify-between text-xs text-slate-500 mt-1">
        <span>۱</span><span>۲۰</span>
      </div>
    </div>
  `;
  content.appendChild(goalSection);

  // شروع خودکار
  const autoSection = document.createElement('div');
  autoSection.innerHTML = `
    <h3 class="text-lg font-bold mb-4 flex items-center gap-2 text-slate-100">
      <span>🤖</span>
      <span>شروع خودکار</span>
    </h3>
    <div class="space-y-3">
      <label class="flex items-center gap-3 cursor-pointer p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900 transition-colors">
        <input type="checkbox" id="auto-start-breaks" ${pomodoroState.settings.autoStartBreaks ? 'checked' : ''} class="w-5 h-5 accent-primary-500">
        <div>
          <div class="text-sm font-medium text-slate-200">شروع خودکار استراحت</div>
          <div class="text-xs text-slate-500">پس از پایان تمرکز، استراحت خودکار شروع شود</div>
        </div>
      </label>
      <label class="flex items-center gap-3 cursor-pointer p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900 transition-colors">
        <input type="checkbox" id="auto-start-pomodoros" ${pomodoroState.settings.autoStartPomodoros ? 'checked' : ''} class="w-5 h-5 accent-primary-500">
        <div>
          <div class="text-sm font-medium text-slate-200">شروع خودکار تمرکز</div>
          <div class="text-xs text-slate-500">پس از پایان استراحت، تمرکز خودکار شروع شود</div>
        </div>
      </label>
    </div>
  `;
  content.appendChild(autoSection);

  modal.open({
    title: '⚙️ تنظیمات پومودورو',
    content,
    size: '2xl',
    buttons: [
      {
        label: 'انصراف',
        type: 'ghost',
        onClick: () => modal.close()
      },
      {
        label: '💾 ذخیره تنظیمات',
        type: 'primary',
        onClick: () => {
          pomodoroState.settings.workDuration = parseInt(document.getElementById('work-duration').value);
          pomodoroState.settings.shortBreakDuration = parseInt(document.getElementById('short-break-duration').value);
          pomodoroState.settings.longBreakDuration = parseInt(document.getElementById('long-break-duration').value);
          pomodoroState.settings.cyclesBeforeLongBreak = parseInt(document.getElementById('cycles-before-long').value);
          pomodoroState.settings.dailyGoal = parseInt(document.getElementById('daily-goal').value);
          pomodoroState.settings.autoStartBreaks = document.getElementById('auto-start-breaks').checked;
          pomodoroState.settings.autoStartPomodoros = document.getElementById('auto-start-pomodoros').checked;

          saveSettings();

          if (!pomodoroState.running) {
            pomodoroState.timeLeft = getPhaseDurations()[pomodoroState.phase];
          }

          updateTimerUI();
          toast.success('تنظیمات ذخیره شد');
          modal.close();

          // رندر مجدد صفحه برای اعمال تغییرات
          setTimeout(() => {
            EventBusModule.getInstance().emit('ui:navigate', { route: 'pomodoro' });
          }, 300);
        }
      }
    ]
  });

  // به‌روزرسانی label ها هنگام تغییر range
  const rangeBindings = [
    { id: 'work-duration', label: 'work-label', suffix: ' دقیقه' },
    { id: 'short-break-duration', label: 'short-label', suffix: ' دقیقه' },
    { id: 'long-break-duration', label: 'long-label', suffix: ' دقیقه' },
    { id: 'cycles-before-long', label: 'cycles-label', suffix: '' },
    { id: 'daily-goal', label: 'goal-label', suffix: '' }
  ];

  rangeBindings.forEach(({ id, label, suffix }) => {
    const input = document.getElementById(id);
    const labelEl = document.getElementById(label);
    if (input && labelEl) {
      input.addEventListener('input', () => {
        labelEl.textContent = input.value + suffix;
      });
    }
  });
}

// ============================================================
// Modal تنظیمات صدا
// ============================================================
function showSoundSettings() {
  const soundSettings = soundManager.getSettings();
  const availableSounds = soundManager.getAvailableSounds();

  const content = document.createElement('div');
  content.className = 'space-y-6';

  // صدای اعلان
  const notifSection = document.createElement('div');
  notifSection.innerHTML = `
    <h3 class="text-lg font-bold mb-4 flex items-center gap-2 text-slate-100">
      <span>🔔</span>
      <span>صدای اعلان (پایان تایمر)</span>
    </h3>
    <div class="space-y-2 mb-4" id="notification-sounds-list">
      ${renderNotificationSounds(availableSounds, soundSettings)}
    </div>
    <div>
      <label class="text-sm text-slate-300 mb-2 flex justify-between">
        <span>حجم صدای اعلان</span>
        <span class="text-primary-400 font-bold" id="notif-vol-label">${Math.round(soundSettings.notificationVolume * 100)}%</span>
      </label>
      <input type="range" id="notification-volume" min="0" max="100" value="${soundSettings.notificationVolume * 100}" class="w-full accent-primary-500">
    </div>
  `;
  content.appendChild(notifSection);

  // صداهای سفارشی
  const customSection = document.createElement('div');
  customSection.innerHTML = `
    <h3 class="text-lg font-bold mb-4 flex items-center gap-2 text-slate-100">
      <span>🎵</span>
      <span>صداهای سفارشی</span>
    </h3>
    <div class="space-y-2 mb-4" id="custom-sounds-list">
      ${availableSounds.custom.length === 0 ? `
        <div class="text-center py-6 text-slate-500 text-sm bg-slate-900/30 rounded-lg border border-slate-700 border-dashed">
          هنوز صدای سفارشی اضافه نکرده‌ای
        </div>
      ` : availableSounds.custom.map(s => `
        <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-3 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <span class="text-xl">🎵</span>
            <span class="text-sm text-slate-200 truncate">${s.name}</span>
            <span class="text-xs ${s.type === 'url' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'} px-2 py-0.5 rounded">
              ${s.type === 'url' ? 'URL' : 'فایل'}
            </span>
          </div>
          <div class="flex gap-1">
            <button data-use-custom="${s.id}" class="text-xs bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 px-2 py-1 rounded transition-colors">
              انتخاب
            </button>
            <button data-test-custom="${s.id}" class="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-1 rounded transition-colors">
              تست
            </button>
            <button data-remove-custom="${s.id}" class="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-1 rounded transition-colors">
              ✕
            </button>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="grid grid-cols-2 gap-2">
      <button id="add-sound-url" class="bg-slate-700 hover:bg-slate-600 text-slate-100 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
        <span>🔗</span>
        <span>افزودن از URL</span>
      </button>
      <button id="add-sound-file" class="bg-slate-700 hover:bg-slate-600 text-slate-100 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
        <span>📁</span>
        <span>آپلود از کامپیوتر</span>
      </button>
    </div>
  `;
  content.appendChild(customSection);

  modal.open({
    title: '🔔 تنظیمات صدای اعلان',
    content,
    size: '2xl',
    buttons: [
      {
        label: 'بستن',
        type: 'primary',
        onClick: () => modal.close()
      }
    ]
  });

  bindSoundSettingsEvents();
}

function renderNotificationSounds(available, current) {
  const builtInSounds = [
    { id: 'bell', icon: '🔔', label: 'زنگ کلاسیک' },
    { id: 'chime', icon: '🎐', label: 'چایم' },
    { id: 'digital', icon: '📟', label: 'دیجیتال' },
    { id: 'soft', icon: '🎵', label: 'نرم و ملایم' }
  ];

  return builtInSounds.map(s => {
    const isActive = current.notificationSound === s.id;
    return `
      <button data-notification-sound="${s.id}" class="w-full ${isActive ? 'bg-primary-500/20 border-primary-500' : 'bg-slate-900/50 border-slate-700 hover:bg-slate-900'}
              border rounded-lg p-3 text-right transition-all flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-2xl">${s.icon}</span>
          <span class="${isActive ? 'text-primary-300 font-bold' : 'text-slate-200'}">${s.label}</span>
          ${isActive ? '<span class="text-xs bg-primary-500 text-white px-2 py-0.5 rounded">فعال</span>' : ''}
        </div>
        <button class="test-sound-btn text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded transition-colors" data-test="${s.id}">
          ▶️ تست
        </button>
      </button>
    `;
  }).join('');
}

function bindSoundSettingsEvents() {
  // صداهای پیش‌فرض
  document.querySelectorAll('[data-notification-sound]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (e.target.classList.contains('test-sound-btn')) return;
      soundManager.setNotificationSound(btn.dataset.notificationSound);
      toast.success('صدای اعلان تغییر کرد');
      showSoundSettings();
    });
  });

  // دکمه‌های تست
  document.querySelectorAll('.test-sound-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      soundManager.testSound(btn.dataset.test);
    });
  });

  // Volume
  const volInput = document.getElementById('notification-volume');
  const volLabel = document.getElementById('notif-vol-label');
  if (volInput && volLabel) {
    volInput.addEventListener('input', () => {
      soundManager.setNotificationVolume(volInput.value / 100);
      volLabel.textContent = volInput.value + '%';
    });
  }

  // افزودن از URL
  document.getElementById('add-sound-url')?.addEventListener('click', async () => {
    modal.close();
    setTimeout(async () => {
      const url = prompt('🔗 URL فایل صوتی را وارد کنید:\n(مثلاً: https://example.com/sound.mp3)');
      if (!url) return;
      const name = prompt('نام این صدا:');
      if (!name) return;
      try {
        soundManager.addCustomSoundFromUrl(name, url);
        toast.success(`صدای "${name}" اضافه شد`);
      } catch (e) {
        toast.error('خطا در افزودن صدا');
      }
    }, 300);
  });

  // افزودن از فایل
  document.getElementById('add-sound-file')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        toast.warning('حجم فایل بیشتر از ۵ مگابایت است');
        return;
      }

      const name = prompt('نام این صدا:', file.name.replace(/\.[^/.]+$/, ''));
      if (!name) return;

      try {
        await soundManager.addCustomSoundFromFile(name, file);
        toast.success(`صدای "${name}" اضافه شد`);
        showSoundSettings();
      } catch (e) {
        toast.error('خطا در آپلود صدا');
      }
    };
    input.click();
  });

  // حذف صدای سفارشی
  document.querySelectorAll('[data-remove-custom]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('آیا از حذف این صدا مطمئن هستید؟')) {
        soundManager.removeCustomSound(btn.dataset.removeCustom);
        toast.success('صدا حذف شد');
        showSoundSettings();
      }
    });
  });

  // تست صدای سفارشی
  document.querySelectorAll('[data-test-custom]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sound = soundManager.getAvailableSounds().custom.find(s => s.id === btn.dataset.testCustom);
      if (sound) {
        soundManager.playCustomSound(sound.name);
      }
    });
  });

  // انتخاب صدای سفارشی به عنوان اعلان
  document.querySelectorAll('[data-use-custom]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sound = soundManager.getAvailableSounds().custom.find(s => s.id === btn.dataset.useCustom);
      if (sound) {
        soundManager.setNotificationSound(sound.name);
        toast.success(`صدای "${sound.name}" به عنوان اعلان انتخاب شد`);
        showSoundSettings();
      }
    });
  });
}

// ============================================================
// توابع کنترل تایمر
// ============================================================
function setPhase(phase) {
  if (pomodoroState.phase === phase && !pomodoroState.running) {
    updateTimerUI();
    return;
  }

  pomodoroState.phase = phase;
  pomodoroState.timeLeft = getPhaseDurations()[phase];
  pomodoroState.running = false;
  pomodoroState.startedAt = null;

  if (pomodoroState.timer) {
    clearInterval(pomodoroState.timer);
    pomodoroState.timer = null;
  }

  updateTimerUI();
  logger.info('فاز تغییر کرد', { phase });
}

function toggleTimer() {
  if (pomodoroState.running) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  if (pomodoroState.running) return;

  pomodoroState.running = true;
  pomodoroState.lastTick = Date.now();

  if (!pomodoroState.startedAt) {
    pomodoroState.startedAt = Date.now();
  }

  pomodoroState.timer = setInterval(tick, 1000);
  updateTimerUI();

  EventBusModule.getInstance().emit('pomodoro:started', {
    phase: pomodoroState.phase
  });

  logger.info('تایمر شروع شد', { phase: pomodoroState.phase });
}

function pauseTimer() {
  if (!pomodoroState.running) return;

  pomodoroState.running = false;

  if (pomodoroState.timer) {
    clearInterval(pomodoroState.timer);
    pomodoroState.timer = null;
  }

  updateTimerUI();
  logger.info('تایمر متوقف شد');
}

function resetTimer() {
  pomodoroState.running = false;
  pomodoroState.timeLeft = getPhaseDurations()[pomodoroState.phase];
  pomodoroState.startedAt = null;

  if (pomodoroState.timer) {
    clearInterval(pomodoroState.timer);
    pomodoroState.timer = null;
  }

  updateTimerUI();
  logger.info('تایمر ریست شد');
}

function tick() {
  if (!pomodoroState.running) return;

  const now = Date.now();
  const elapsed = Math.floor((now - pomodoroState.lastTick) / 1000);

  if (elapsed >= 1) {
    pomodoroState.timeLeft = Math.max(0, pomodoroState.timeLeft - elapsed);
    pomodoroState.lastTick = now;

    if (pomodoroState.uiUpdateFn) {
      pomodoroState.uiUpdateFn();
    }

    if (pomodoroState.timeLeft <= 0) {
      onTimerComplete();
    }
  }
}

function onTimerComplete() {
  pauseTimer();
  soundManager.playNotification();

  if (pomodoroState.phase === 'work') {
    pomodoroState.cycles++;

    state.logStudySession('pomodoro', {
      duration: pomodoroState.settings.workDuration * 60,
      phase: 'work'
    });

    toast.success(
      `پومودورو تکمیل شد! (${pomodoroState.cycles} دور)`,
      '🎉 آفرین!'
    );

    const nextPhase = pomodoroState.cycles % pomodoroState.settings.cyclesBeforeLongBreak === 0 ? 'long' : 'short';

    if (pomodoroState.settings.autoStartBreaks) {
      setTimeout(() => {
        setPhase(nextPhase);
        setTimeout(startTimer, 500);
      }, 1500);
    } else {
      setTimeout(() => {
        modal.confirm(
          '🎉 پومودورو تمام شد!',
          `آیا می‌خواهی به ${PHASE_INFO[nextPhase].label} بروی؟`,
          { confirmText: 'بله، ادامه بده' }
        ).then(confirmed => {
          if (confirmed) {
            setPhase(nextPhase);
            setTimeout(startTimer, 300);
          }
        });
      }, 1000);
    }
  } else {
    toast.info('استراحت تمام شد!', '☕ وقت کاره!');

    if (pomodoroState.settings.autoStartPomodoros) {
      setTimeout(() => {
        setPhase('work');
        setTimeout(startTimer, 500);
      }, 1500);
    } else {
      setTimeout(() => {
        modal.confirm(
          '☕ استراحت تمام شد',
          'آماده برای تمرکز بعدی هستی؟',
          { confirmText: 'بله، شروع کن' }
        ).then(confirmed => {
          if (confirmed) {
            setPhase('work');
            setTimeout(startTimer, 300);
          }
        });
      }, 1000);
    }
  }

  EventBusModule.getInstance().emit('pomodoro:completed', {
    phase: pomodoroState.phase,
    cycles: pomodoroState.cycles
  });
}

// ============================================================
// به‌روزرسانی UI تایمر
// ============================================================
function updateTimerUI() {
  const timeEl = document.getElementById('pomo-time');
  const progressEl = document.getElementById('pomo-progress');
  const startBtn = document.getElementById('pomo-start-btn');
  const phaseLabelEl = document.getElementById('pomo-phase-label');
  const phaseSmallEl = document.getElementById('pomo-phase-small');
  const phaseHeaderEl = document.getElementById('pomo-phase-header');
  const cyclesDotsEl = document.getElementById('pomo-cycles-dots');

  if (!timeEl) return;

  const phase = PHASE_INFO[pomodoroState.phase];
  const totalSeconds = getPhaseDurations()[pomodoroState.phase];
  const progress = 1 - (pomodoroState.timeLeft / totalSeconds);

  // زمان
  const minutes = Math.floor(pomodoroState.timeLeft / 60);
  const seconds = pomodoroState.timeLeft % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  timeEl.textContent = timeStr;

  // عنوان تب
  document.title = pomodoroState.running
    ? `${timeStr} - ${phase.label} | دانش‌یار پرو`
    : 'دانش‌یار پرو';

  // Progress circle
  if (progressEl) {
    const offset = CIRCLE_CIRCUMFERENCE * (1 - progress);
    progressEl.style.strokeDashoffset = offset;
  }

  // دکمه start/pause
  if (startBtn) {
    if (pomodoroState.running) {
      startBtn.innerHTML = '⏸️ توقف';
      startBtn.className = 'flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105';
    } else {
      startBtn.innerHTML = '▶️ شروع تمرکز';
      startBtn.className = 'flex-1 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105';
    }
  }

  // Phase label
  if (phaseLabelEl) phaseLabelEl.textContent = phase.label;
  if (phaseSmallEl) phaseSmallEl.textContent = phase.label;

  // Phase header gradient
  if (phaseHeaderEl) {
    phaseHeaderEl.className = `p-6 bg-gradient-to-r ${phase.gradient} text-white text-center relative overflow-hidden`;
  }

  // Cycle dots
  if (cyclesDotsEl) {
    cyclesDotsEl.innerHTML = renderCycleDots();
  }

  // دکمه‌های فاز
  const phaseButtons = document.getElementById('phase-buttons');
  if (phaseButtons) {
    phaseButtons.innerHTML = renderPhaseButtons();
    phaseButtons.querySelectorAll('.pomo-phase-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const phase = btn.dataset.phase;
        if (pomodoroState.running) {
          toast.warning('ابتدا تایمر را متوقف کنید');
          return;
        }
        setPhase(phase);
      });
    });
  }
}

export default createPomodoroView;