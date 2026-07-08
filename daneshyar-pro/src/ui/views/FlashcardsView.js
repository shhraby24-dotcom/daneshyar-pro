/**
 * دانش‌یار پرو - View فلش‌کارت SRS
 * سیستم مرور با الگوریتم SM-2 (مانند Anki)
 * @module ui/views/FlashcardsView
 */

import state from '../../core/State.js';
import router from '../router.js';
import LoggerModule from '../../core/Logger.js';
import EventBusModule from '../../core/EventBus.js';
import srs from '../../services/SRS.js';
import toast from '../components/Toast.js';
import modal from '../components/Modal.js';

const logger = LoggerModule.getInstance().module('FlashcardsView');

// ============================================================
// State داخلی
// ============================================================
const fcState = {
  phase: 'dashboard',       // 'dashboard', 'review', 'manage'
  reviewQueue: [],          // کارت‌های در صف مرور
  currentIndex: 0,
  isFlipped: false,
  sessionStats: {
    reviewed: 0,
    correct: 0,
    wrong: 0,
    startTime: null
  },
  container: null,
  filter: 'due'             // 'due', 'new', 'all'
};

// ============================================================
// ساخت View اصلی
// ============================================================
export function createFlashcardsView() {
  logger.info('رندر فلش‌کارت');

  const container = document.createElement('div');
  container.className = 'fade-in max-w-5xl mx-auto p-2 md:p-4';
  fcState.container = container;

  renderCurrentPhase();

  return container;
}

function renderCurrentPhase() {
  const container = fcState.container;
  if (!container) return;

  container.innerHTML = '';

  switch (fcState.phase) {
    case 'dashboard':
      container.appendChild(renderDashboard());
      break;
    case 'review':
      container.appendChild(renderReview());
      break;
    case 'manage':
      container.appendChild(renderManage());
      break;
  }
}

// ============================================================
// فاز ۱: داشبورد فلش‌کارت‌ها
// ============================================================
function renderDashboard() {
  const wrapper = document.createElement('div');
  wrapper.className = 'space-y-6';

  wrapper.appendChild(createHeader());
  wrapper.appendChild(createStatsGrid());
  wrapper.appendChild(createForecastChart());
  wrapper.appendChild(createQuickActions());
  wrapper.appendChild(createRecentCards());

  return wrapper;
}

function createHeader() {
  const flashcards = state.get('flashcards') || [];
  const due = srs.getDueCards(flashcards);
  const newCards = srs.getNewCards(flashcards);

  const header = document.createElement('div');
  header.className = 'text-center space-y-2';
  header.innerHTML = `
    <div class="inline-block">
      <span class="text-7xl">🃏</span>
    </div>
    <h1 class="text-4xl font-black bg-gradient-to-r from-accent-400 via-primary-400 to-accent-400 bg-clip-text text-transparent">
      فلش‌کارت هوشمند
    </h1>
    <p class="text-slate-400 max-w-2xl mx-auto">
      مرور با الگوریتم SM-2 برای بهینه‌سازی حافظه بلندمدت
    </p>
    
    ${flashcards.length > 0 ? `
      <div class="flex items-center justify-center gap-3 mt-4 flex-wrap">
        <div class="bg-red-500/10 border border-red-500/30 px-4 py-2 rounded-lg flex items-center gap-2">
          <span class="text-xl">🔥</span>
          <div class="text-right">
            <div class="text-xs text-slate-400">آماده مرور</div>
            <div class="text-red-400 font-bold">${due.length} کارت</div>
          </div>
        </div>
        <div class="bg-blue-500/10 border border-blue-500/30 px-4 py-2 rounded-lg flex items-center gap-2">
          <span class="text-xl">🆕</span>
          <div class="text-right">
            <div class="text-xs text-slate-400">کارت‌های جدید</div>
            <div class="text-blue-400 font-bold">${newCards.length} کارت</div>
          </div>
        </div>
        <div class="bg-slate-500/10 border border-slate-500/30 px-4 py-2 rounded-lg flex items-center gap-2">
          <span class="text-xl">📚</span>
          <div class="text-right">
            <div class="text-xs text-slate-400">کل کارت‌ها</div>
            <div class="text-slate-300 font-bold">${flashcards.length} کارت</div>
          </div>
        </div>
      </div>
    ` : ''}
  `;
  return header;
}

function createStatsGrid() {
  const flashcards = state.get('flashcards') || [];
  const stats = srs.getStats(flashcards);

  const section = document.createElement('div');
  section.className = 'bg-slate-800 border border-slate-700 rounded-xl p-5';

  section.innerHTML = `
    <div class="flex items-center gap-2 mb-4">
      <span class="text-2xl">📊</span>
      <h3 class="font-bold text-slate-100">آمار مرور</h3>
    </div>
    
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="bg-slate-900/50 rounded-lg p-3 text-center">
        <div class="text-xs text-slate-400 mb-1">مرور امروز</div>
        <div class="text-2xl font-bold text-primary-400">${stats.reviewedToday}</div>
      </div>
      <div class="bg-slate-900/50 rounded-lg p-3 text-center">
        <div class="text-xs text-slate-400 mb-1">نرخ یادآوری</div>
        <div class="text-2xl font-bold text-green-400">${stats.retentionRate}%</div>
      </div>
      <div class="bg-slate-900/50 rounded-lg p-3 text-center">
        <div class="text-xs text-slate-400 mb-1">میانگین فاصله</div>
        <div class="text-2xl font-bold text-accent-400">${stats.averageInterval} روز</div>
      </div>
      <div class="bg-slate-900/50 rounded-lg p-3 text-center">
        <div class="text-xs text-slate-400 mb-1">کارت‌های بالغ</div>
        <div class="text-2xl font-bold text-purple-400">${stats.maturity}%</div>
      </div>
    </div>
  `;

  return section;
}

function createForecastChart() {
  const flashcards = state.get('flashcards') || [];
  const stats = srs.getStats(flashcards);
  const forecast = stats.forecast || [];

  const section = document.createElement('div');
  section.className = 'bg-slate-800 border border-slate-700 rounded-xl p-5';

  const maxCount = Math.max(...forecast.map(f => f.count), 1);

  section.innerHTML = `
    <div class="flex items-center gap-2 mb-4">
      <span class="text-2xl">📅</span>
      <h3 class="font-bold text-slate-100">پیش‌بینی ۷ روز آینده</h3>
    </div>
    
    ${forecast.length === 0 ? `
      <div class="text-center py-6 text-slate-500 text-sm">
        هنوز کارتی برای پیش‌بینی وجود ندارد
      </div>
    ` : `
      <div class="space-y-2">
        ${forecast.map((day, idx) => {
          const date = new Date(day.date);
          const dayName = idx === 0 ? 'امروز' : date.toLocaleDateString('fa-IR', { weekday: 'short' });
          const percent = (day.count / maxCount) * 100;
          
          return `
            <div class="flex items-center gap-3">
              <div class="w-16 text-xs text-slate-400">${dayName}</div>
              <div class="flex-1 bg-slate-900/50 rounded-full h-6 overflow-hidden relative">
                <div class="bg-gradient-to-l from-primary-500 to-accent-500 h-full transition-all duration-500" 
                     style="width: ${percent}%"></div>
                <div class="absolute inset-0 flex items-center justify-center text-xs font-bold ${day.count > 0 ? 'text-white' : 'text-slate-500'}">
                  ${day.count} کارت
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `}
  `;

  return section;
}

function createQuickActions() {
  const flashcards = state.get('flashcards') || [];
  const due = srs.getDueCards(flashcards);

  const section = document.createElement('div');
  section.className = 'space-y-3';

  // دکمه شروع مرور
  if (due.length > 0) {
    const startBtn = document.createElement('button');
    startBtn.className = 'w-full bg-gradient-to-r from-red-500 via-orange-500 to-accent-500 hover:opacity-90 text-white py-5 rounded-xl font-bold text-lg shadow-xl transition-all transform hover:scale-[1.02] pulse-ring';
    startBtn.innerHTML = `
      <div class="flex items-center justify-center gap-3">
        <span class="text-3xl">▶️</span>
        <div class="text-right">
          <div>شروع مرور (${due.length} کارت آماده)</div>
          <div class="text-xs opacity-80 font-normal mt-1">زمان تخمینی: ${Math.ceil(due.length * 10 / 60)} دقیقه</div>
        </div>
      </div>
    `;
    startBtn.addEventListener('click', () => startReview('due'));
    section.appendChild(startBtn);
  }

  // Grid دکمه‌های دیگر
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-2 md:grid-cols-3 gap-3';

  const actions = [
    {
      icon: '➕',
      title: 'افزودن کارت',
      desc: 'ساخت فلش‌کارت جدید',
      color: 'primary',
      onClick: () => openAddCardModal()
    },
    {
      icon: '📋',
      title: 'مدیریت کارت‌ها',
      desc: 'مشاهده و ویرایش همه',
      color: 'accent',
      onClick: () => {
        fcState.phase = 'manage';
        renderCurrentPhase();
      }
    },
    {
      icon: '🆕',
      title: 'مرور کارت‌های جدید',
      desc: `${srs.getNewCards(flashcards).length} کارت`,
      color: 'blue',
      onClick: () => startReview('new')
    }
  ];

  actions.forEach(action => {
    const btn = document.createElement('button');
    btn.className = `bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-${action.color}-500/50 rounded-xl p-4 text-right transition-all group`;
    btn.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="text-3xl group-hover:scale-110 transition-transform">${action.icon}</span>
        <div class="flex-1">
          <div class="font-bold text-slate-100">${action.title}</div>
          <div class="text-xs text-slate-500">${action.desc}</div>
        </div>
      </div>
    `;
    btn.addEventListener('click', action.onClick);
    grid.appendChild(btn);
  });

  section.appendChild(grid);
  return section;
}

function createRecentCards() {
  const flashcards = state.get('flashcards') || [];
  const recent = [...flashcards].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  ).slice(0, 5);

  if (recent.length === 0) return document.createElement('div');

  const section = document.createElement('div');
  section.className = 'bg-slate-800 border border-slate-700 rounded-xl p-5';

  section.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="text-2xl">🕐</span>
        <h3 class="font-bold text-slate-100">کارت‌های اخیر</h3>
      </div>
    </div>
    
    <div class="space-y-2">
      ${recent.map(card => {
        const status = getCardStatus(card);
        return `
          <div class="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg">
            <div class="flex-shrink-0 text-xl">${status.icon}</div>
            <div class="flex-1 min-w-0">
              <div class="text-sm text-slate-200 truncate">${escapeHtml(card.front.substring(0, 60))}</div>
              <div class="text-xs text-slate-500 mt-1">${escapeHtml(card.back.substring(0, 40))}</div>
            </div>
            <div class="flex-shrink-0">
              <span class="text-xs ${status.colorClass} px-2 py-1 rounded">${status.label}</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  return section;
}

function getCardStatus(card) {
  const now = new Date();
  const next = new Date(card.nextReview);
  
  if (!card.lastReview) {
    return { icon: '🆕', label: 'جدید', colorClass: 'bg-blue-500/20 text-blue-300' };
  }
  if (next <= now) {
    return { icon: '🔥', label: 'آماده مرور', colorClass: 'bg-red-500/20 text-red-300' };
  }
  if (card.interval >= 21) {
    return { icon: '🌟', label: 'بالغ', colorClass: 'bg-purple-500/20 text-purple-300' };
  }
  return { icon: '📚', label: 'در حال یادگیری', colorClass: 'bg-accent-500/20 text-accent-300' };
}

// ============================================================
// فاز ۲: مرور کارت‌ها
// ============================================================
function startReview(filter) {
  const flashcards = state.get('flashcards') || [];
  let queue = [];

  if (filter === 'due') {
    queue = srs.getDueCards(flashcards);
  } else if (filter === 'new') {
    queue = srs.getNewCards(flashcards);
  } else {
    queue = [...flashcards];
  }

  if (queue.length === 0) {
    toast.info('کارتی برای مرور وجود ندارد');
    return;
  }

  fcState.reviewQueue = queue;
  fcState.currentIndex = 0;
  fcState.isFlipped = false;
  fcState.sessionStats = {
    reviewed: 0,
    correct: 0,
    wrong: 0,
    startTime: Date.now()
  };
  fcState.phase = 'review';
  renderCurrentPhase();
}

function renderReview() {
  if (fcState.currentIndex >= fcState.reviewQueue.length) {
    // اتمام مرور
    return renderReviewComplete();
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'space-y-4 max-w-2xl mx-auto';

  wrapper.appendChild(createReviewTopBar());
  wrapper.appendChild(createFlipCard());
  wrapper.appendChild(createRatingButtons());
  wrapper.appendChild(createReviewActions());

  return wrapper;
}

function createReviewTopBar() {
  const total = fcState.reviewQueue.length;
  const current = fcState.currentIndex + 1;
  const progress = (fcState.currentIndex / total) * 100;

  const bar = document.createElement('div');
  bar.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4';
  bar.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-3">
        <button id="exit-review-btn" class="text-slate-400 hover:text-slate-200 transition-colors">
          ← خروج
        </button>
        <span class="text-sm text-slate-400">کارت ${current} از ${total}</span>
      </div>
      <div class="flex items-center gap-3 text-xs">
        <span class="text-green-400">✅ ${fcState.sessionStats.correct}</span>
        <span class="text-red-400">❌ ${fcState.sessionStats.wrong}</span>
      </div>
    </div>
    <div class="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
      <div class="bg-gradient-to-l from-accent-500 to-primary-500 h-full rounded-full transition-all duration-500"
           style="width: ${progress}%"></div>
    </div>
  `;

  setTimeout(() => {
    document.getElementById('exit-review-btn')?.addEventListener('click', async () => {
      const confirmed = await modal.confirm(
        'خروج از مرور',
        'آیا از خروج مطمئن هستید؟ پیشرفت شما ذخیره می‌شود.',
        { confirmText: 'بله، خارج شو' }
      );
      if (confirmed) {
        fcState.phase = 'dashboard';
        renderCurrentPhase();
      }
    });
  }, 0);

  return bar;
}

function createFlipCard() {
  const card = fcState.reviewQueue[fcState.currentIndex];
  const isFlipped = fcState.isFlipped;

  const cardEl = document.createElement('div');
  cardEl.className = 'flashcard-container cursor-pointer';
  cardEl.style.cssText = 'perspective: 1500px; height: 400px;';
  
  cardEl.innerHTML = `
    <div class="flashcard-inner relative w-full h-full transition-transform duration-700" 
         style="transform-style: preserve-3d; ${isFlipped ? 'transform: rotateY(180deg);' : ''}">
      
      <!-- Front -->
      <div class="absolute inset-0 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-2xl"
           style="backface-visibility: hidden; background: linear-gradient(135deg, #6366f1, #4f46e5); color: white;">
        <div class="text-xs opacity-70 mb-4 tracking-wider">سوال</div>
        <div class="text-2xl font-bold leading-relaxed whitespace-pre-wrap">${escapeHtml(card.front)}</div>
        <div class="absolute bottom-6 text-sm opacity-60">
          برای دیدن پاسخ کلیک کنید
        </div>
      </div>
      
      <!-- Back -->
      <div class="absolute inset-0 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-2xl"
           style="backface-visibility: hidden; transform: rotateY(180deg); background: linear-gradient(135deg, #f59e0b, #d97706); color: white;">
        <div class="text-xs opacity-70 mb-4 tracking-wider">پاسخ</div>
        <div class="text-xl leading-relaxed whitespace-pre-wrap">${escapeHtml(card.back)}</div>
      </div>
    </div>
  `;

  cardEl.addEventListener('click', () => {
    fcState.isFlipped = !fcState.isFlipped;
    renderCurrentPhase();
  });

  return cardEl;
}

function createRatingButtons() {
  if (!fcState.isFlipped) {
    const placeholder = document.createElement('div');
    placeholder.className = 'text-center py-4 text-slate-500 text-sm';
    placeholder.textContent = 'ابتدا روی کارت کلیک کنید تا پاسخ را ببینید';
    return placeholder;
  }

  const container = document.createElement('div');
  container.className = 'grid grid-cols-3 gap-3';

  const ratings = [
    { 
      quality: 1, 
      label: 'نمی‌دانم', 
      icon: '❌', 
      color: 'red',
      desc: 'فراموش کرده‌ام'
    },
    { 
      quality: 3, 
      label: 'سخت', 
      icon: '😓', 
      color: 'orange',
      desc: 'با تلاش زیاد'
    },
    { 
      quality: 5, 
      label: 'آسان', 
      icon: '✅', 
      color: 'green',
      desc: 'به راحتی'
    }
  ];

  ratings.forEach(rating => {
    const btn = document.createElement('button');
    btn.className = `bg-${rating.color}-500/20 hover:bg-${rating.color}-500/30 border-2 border-${rating.color}-500/50 hover:border-${rating.color}-500 rounded-xl p-4 transition-all transform hover:scale-105`;
    btn.innerHTML = `
      <div class="text-3xl mb-2">${rating.icon}</div>
      <div class="font-bold text-${rating.color}-300">${rating.label}</div>
      <div class="text-xs text-slate-400 mt-1">${rating.desc}</div>
    `;
    btn.addEventListener('click', () => rateCard(rating.quality));
    container.appendChild(btn);
  });

  return container;
}

function createReviewActions() {
  const actions = document.createElement('div');
  actions.className = 'flex gap-2';

  const skipBtn = document.createElement('button');
  skipBtn.className = 'flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 rounded-lg text-sm font-medium transition-colors';
  skipBtn.innerHTML = '⏭️ رد کردن';
  skipBtn.addEventListener('click', () => {
    fcState.currentIndex++;
    fcState.isFlipped = false;
    renderCurrentPhase();
  });

  actions.appendChild(skipBtn);
  return actions;
}

function rateCard(quality) {
  const card = fcState.reviewQueue[fcState.currentIndex];
  
  // به‌روزرسانی با الگوریتم SM-2
  const updatedCard = srs.schedule(card, quality);
  state.updateFlashcard(card.id, updatedCard);

  // به‌روزرسانی آمار
  fcState.sessionStats.reviewed++;
  if (quality >= 3) {
    fcState.sessionStats.correct++;
  } else {
    fcState.sessionStats.wrong++;
  }

  // رفتن به کارت بعدی
  fcState.currentIndex++;
  fcState.isFlipped = false;
  renderCurrentPhase();
}

function renderReviewComplete() {
  const stats = fcState.sessionStats;
  const timeSpent = Math.floor((Date.now() - stats.startTime) / 1000);
  const minutes = Math.floor(timeSpent / 60);
  const seconds = timeSpent % 60;
  const accuracy = stats.reviewed > 0 
    ? Math.round((stats.correct / stats.reviewed) * 100)
    : 0;

  let icon, title, message;
  if (accuracy >= 90) {
    icon = '🏆'; title = 'عالی!'; message = 'تسلط فوق‌العاده‌ای داری';
  } else if (accuracy >= 70) {
    icon = '🎉'; title = 'خوب بود!'; message = 'عملکرد خوبی داشتی';
  } else if (accuracy >= 50) {
    icon = '📚'; title = 'قابل قبول'; message = 'ادامه بده، بهتر می‌شی';
  } else {
    icon = '💪'; title = 'تلاش کن!'; message = 'مرور منظم کلید موفقیت است';
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'max-w-2xl mx-auto space-y-6';

  wrapper.innerHTML = `
    <div class="text-center py-8 space-y-3">
      <div class="text-8xl mb-4">${icon}</div>
      <h1 class="text-4xl font-black text-slate-100">${title}</h1>
      <p class="text-slate-400">${message}</p>
    </div>
    
    <div class="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <h3 class="font-bold text-slate-100 mb-4 flex items-center gap-2">
        <span>📊</span>
        <span>آمار این جلسه</span>
      </h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="text-center p-3 bg-slate-900/50 rounded-lg">
          <div class="text-2xl mb-1">📖</div>
          <div class="text-xl font-bold text-primary-400">${stats.reviewed}</div>
          <div class="text-xs text-slate-400">کارت مرور شده</div>
        </div>
        <div class="text-center p-3 bg-slate-900/50 rounded-lg">
          <div class="text-2xl mb-1">✅</div>
          <div class="text-xl font-bold text-green-400">${stats.correct}</div>
          <div class="text-xs text-slate-400">صحیح</div>
        </div>
        <div class="text-center p-3 bg-slate-900/50 rounded-lg">
          <div class="text-2xl mb-1">🎯</div>
          <div class="text-xl font-bold text-accent-400">${accuracy}%</div>
          <div class="text-xs text-slate-400">دقت</div>
        </div>
        <div class="text-center p-3 bg-slate-900/50 rounded-lg">
          <div class="text-2xl mb-1">⏱️</div>
          <div class="text-xl font-bold text-blue-400">${minutes}:${String(seconds).padStart(2, '0')}</div>
          <div class="text-xs text-slate-400">زمان</div>
        </div>
      </div>
    </div>
    
    <div class="grid grid-cols-2 gap-3">
      <button id="back-to-dashboard" class="bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-xl font-bold transition-all transform hover:scale-[1.02]">
        🏠 بازگشت به داشبورد
      </button>
      <button id="manage-cards-btn" class="bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-xl font-bold transition-all transform hover:scale-[1.02]">
        📋 مدیریت کارت‌ها
      </button>
    </div>
  `;

  setTimeout(() => {
    document.getElementById('back-to-dashboard')?.addEventListener('click', () => {
      fcState.phase = 'dashboard';
      renderCurrentPhase();
    });
    document.getElementById('manage-cards-btn')?.addEventListener('click', () => {
      fcState.phase = 'manage';
      renderCurrentPhase();
    });
  }, 0);

  return wrapper;
}

// ============================================================
// فاز ۳: مدیریت کارت‌ها
// ============================================================
function renderManage() {
  const wrapper = document.createElement('div');
  wrapper.className = 'space-y-4';

  // Header با دکمه بازگشت
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between';
  header.innerHTML = `
    <div class="flex items-center gap-3">
      <button id="back-btn" class="bg-slate-700 hover:bg-slate-600 text-slate-100 px-4 py-2 rounded-lg transition-colors">
        ← بازگشت
      </button>
      <h2 class="text-2xl font-bold text-slate-100">مدیریت کارت‌ها</h2>
    </div>
    <button id="add-card-btn" class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
      <span>➕</span>
      <span>کارت جدید</span>
    </button>
  `;
  wrapper.appendChild(header);

  // جستجو و فیلتر
  const toolbar = document.createElement('div');
  toolbar.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row gap-3';
  toolbar.innerHTML = `
    <input type="text" id="search-cards" placeholder="جستجو در کارت‌ها..." 
           class="input flex-1">
    <select id="filter-cards" class="select md:w-48">
      <option value="all">همه کارت‌ها</option>
      <option value="due">آماده مرور</option>
      <option value="new">کارت‌های جدید</option>
      <option value="mature">کارت‌های بالغ</option>
    </select>
  `;
  wrapper.appendChild(toolbar);

  // لیست کارت‌ها
  const list = document.createElement('div');
  list.id = 'cards-list';
  list.className = 'space-y-2';
  wrapper.appendChild(list);

  setTimeout(() => {
    document.getElementById('back-btn')?.addEventListener('click', () => {
      fcState.phase = 'dashboard';
      renderCurrentPhase();
    });
    document.getElementById('add-card-btn')?.addEventListener('click', () => openAddCardModal());

    const searchInput = document.getElementById('search-cards');
    const filterSelect = document.getElementById('filter-cards');
    
    const render = () => renderCardsList(
      searchInput.value,
      filterSelect.value
    );
    
    searchInput?.addEventListener('input', render);
    filterSelect?.addEventListener('change', render);
    
    render();
  }, 0);

  return wrapper;
}

function renderCardsList(searchQuery = '', filter = 'all') {
  const list = document.getElementById('cards-list');
  if (!list) return;

  let cards = state.get('flashcards') || [];

  // فیلتر
  if (filter === 'due') cards = srs.getDueCards(cards);
  else if (filter === 'new') cards = srs.getNewCards(cards);
  else if (filter === 'mature') cards = cards.filter(c => c.interval >= 21);

  // جستجو
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    cards = cards.filter(c => 
      c.front.toLowerCase().includes(q) || 
      c.back.toLowerCase().includes(q)
    );
  }

  // مرتب‌سازی بر اساس تاریخ ایجاد
  cards.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  list.innerHTML = '';

  if (cards.length === 0) {
    list.innerHTML = `
      <div class="text-center py-12 text-slate-500">
        <div class="text-5xl mb-3 opacity-50">🔍</div>
        <p>کارتی یافت نشد</p>
      </div>
    `;
    return;
  }

  cards.forEach(card => {
    const status = getCardStatus(card);
    const nextReview = new Date(card.nextReview);
    const nextStr = nextReview.toLocaleDateString('fa-IR');

    const item = document.createElement('div');
    item.className = 'bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors';
    item.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-2 flex-wrap">
            <span class="text-xs ${status.colorClass} px-2 py-0.5 rounded">${status.label}</span>
            <span class="text-xs text-slate-500">مرور بعدی: ${nextStr}</span>
            ${card.interval > 0 ? `<span class="text-xs text-slate-500">فاصله: ${card.interval} روز</span>` : ''}
          </div>
          <div class="text-sm text-slate-200 mb-1 line-clamp-1">
            <strong>Q:</strong> ${escapeHtml(card.front)}
          </div>
          <div class="text-xs text-slate-400 line-clamp-1">
            <strong>A:</strong> ${escapeHtml(card.back)}
          </div>
        </div>
        <div class="flex gap-1 flex-shrink-0">
          <button class="edit-btn p-2 hover:bg-slate-700 rounded transition-colors" title="ویرایش">
            ✏️
          </button>
          <button class="delete-btn p-2 hover:bg-red-900/30 rounded transition-colors" title="حذف">
            🗑️
          </button>
        </div>
      </div>
    `;

    item.querySelector('.edit-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditCardModal(card);
    });

    item.querySelector('.delete-btn')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const confirmed = await modal.confirm(
        'حذف کارت',
        'آیا از حذف این فلش‌کارت مطمئن هستید؟',
        { dangerMode: true, confirmText: 'حذف' }
      );
      if (confirmed) {
        state.deleteFlashcard(card.id);
        toast.success('کارت حذف شد');
        renderCardsList(searchQuery, filter);
      }
    });

    list.appendChild(item);
  });
}

// ============================================================
// Modal افزودن/ویرایش کارت
// ============================================================
function openAddCardModal() {
  openCardModal();
}

function openEditCardModal(card) {
  openCardModal(card);
}

function openCardModal(card = null) {
  const isEdit = !!card;
  
  const content = document.createElement('div');
  content.className = 'space-y-4';

  content.innerHTML = `
    <div>
      <label class="text-sm text-slate-300 mb-2 block">سوال (جلوی کارت)</label>
      <textarea id="card-front" class="textarea w-full" rows="3" 
                placeholder="سوال یا مفهوم را بنویسید...">${card ? escapeHtml(card.front) : ''}</textarea>
    </div>
    
    <div>
      <label class="text-sm text-slate-300 mb-2 block">پاسخ (پشت کارت)</label>
      <textarea id="card-back" class="textarea w-full" rows="3"
                placeholder="پاسخ یا تعریف را بنویسید...">${card ? escapeHtml(card.back) : ''}</textarea>
    </div>
    
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-sm text-slate-300 mb-2 block">موضوع</label>
        <input type="text" id="card-topic" class="input w-full" 
               placeholder="مثلاً: ریاضی"
               value="${card ? escapeHtml(card.topic || '') : ''}">
      </div>
      <div>
        <label class="text-sm text-slate-300 mb-2 block">نوع مفهوم</label>
        <select id="card-concept-type" class="select w-full">
          <option value="definition" ${card?.conceptType === 'definition' ? 'selected' : ''}>تعریف</option>
          <option value="formula" ${card?.conceptType === 'formula' ? 'selected' : ''}>فرمول</option>
          <option value="math" ${card?.conceptType === 'math' ? 'selected' : ''}>ریاضی</option>
          <option value="concept" ${card?.conceptType === 'concept' ? 'selected' : ''}>مفهوم</option>
          <option value="fact" ${card?.conceptType === 'fact' ? 'selected' : ''}>حقیقت</option>
        </select>
      </div>
    </div>
    
    <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-xs text-slate-400">
      <div class="flex gap-2">
        <span>💡</span>
        <div>
          <strong class="text-slate-300">نکته:</strong>
          سوالات کوتاه و متمرکز بسازید. از Markdown برای فرمول‌ها استفاده کنید.
        </div>
      </div>
    </div>
  `;

  modal.open({
    title: isEdit ? '✏️ ویرایش کارت' : '➕ افزودن کارت جدید',
    content,
    size: 'lg',
    buttons: [
      {
        label: 'انصراف',
        type: 'ghost',
        onClick: () => modal.close()
      },
      {
        label: isEdit ? '💾 ذخیره تغییرات' : '➕ افزودن کارت',
        type: 'primary',
        onClick: () => {
          const front = document.getElementById('card-front').value.trim();
          const back = document.getElementById('card-back').value.trim();
          const topic = document.getElementById('card-topic').value.trim();
          const conceptType = document.getElementById('card-concept-type').value;

          if (!front || !back) {
            toast.warning('سوال و پاسخ الزامی است');
            return;
          }

          if (isEdit) {
            state.updateFlashcard(card.id, {
              front, back, topic, conceptType
            });
            toast.success('کارت به‌روزرسانی شد');
          } else {
            const newCard = srs.createCard({
              front, back, topic, conceptType
            });
            state.addFlashcard(newCard);
            toast.success('کارت جدید اضافه شد');
          }

          modal.close();
          
          // رفرش view
          setTimeout(() => renderCurrentPhase(), 200);
        }
      }
    ]
  });

  setTimeout(() => {
    document.getElementById('card-front')?.focus();
  }, 200);
}

// ============================================================
// Utility Functions
// ============================================================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export default createFlashcardsView;