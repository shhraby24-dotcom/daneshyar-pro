/**
 * دانش‌یار پرو - View داشبورد
 * صفحه اصلی برنامه با آمار و دسترسی سریع به قابلیت‌ها
 * @module ui/views/DashboardView
 */

import state from '../../core/State.js';
import router from '../router.js';
import LoggerModule from '../../core/Logger.js';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '../components/Button.js';

const logger = LoggerModule.getInstance().module('DashboardView');

/**
 * کارت‌های دسترسی سریع
 */
const QUICK_ACTIONS = [
  {
    route: 'notes',
    icon: '📝',
    title: 'یادداشت جدید',
    description: 'ایجاد یادداشت یا جزوه',
    color: 'from-blue-500 to-blue-600'
  },
  {
    route: 'summarizer',
    icon: '✨',
    title: 'خلاصه‌سازی',
    description: 'تبدیل متن طولانی به خلاصه',
    color: 'from-purple-500 to-purple-600'
  },
  {
    route: 'quiz',
    icon: '📋',
    title: 'آزمون جدید',
    description: 'ساخت آزمون از یادداشت‌ها',
    color: 'from-green-500 to-green-600'
  },
  {
    route: 'flashcards',
    icon: '🃏',
    title: 'مرور فلش‌کارت',
    description: 'مرور با الگوریتم SM-2',
    color: 'from-orange-500 to-orange-600'
  },
  {
    route: 'pomodoro',
    icon: '⏱️',
    title: 'شروع پومودورو',
    description: 'تکنیک مدیریت زمان',
    color: 'from-red-500 to-red-600'
  },
  {
    route: 'translator',
    icon: '🌐',
    title: 'مترجم',
    description: 'ترجمه متن به فارسی',
    color: 'from-teal-500 to-teal-600'
  }
];

/**
 * ساخت View داشبورد
 * @returns {HTMLElement}
 */
export function createDashboardView() {
  logger.info('رندر داشبورد');

  const container = document.createElement('div');
  container.className = 'space-y-8 fade-in';

  // Header
  const header = createHeader();
  container.appendChild(header);

  // Stats Cards
  const stats = createStatsSection();
  container.appendChild(stats);

  // Quick Actions
  const quickActions = createQuickActionsSection();
  container.appendChild(quickActions);

  // Two Column Layout
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 lg:grid-cols-2 gap-6';

  // SRS Status
  const srsSection = createSRSSection();
  grid.appendChild(srsSection);

  // Recent Notes
  const recentSection = createRecentNotesSection();
  grid.appendChild(recentSection);

  container.appendChild(grid);

  // Performance Chart (placeholder for future)
  const performanceSection = createPerformanceSection();
  container.appendChild(performanceSection);

  return container;
}

/**
 * ساخت Header داشبورد
 * @private
 */
function createHeader() {
  const header = document.createElement('div');
  header.className = 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4';

  const now = new Date();
  const hour = now.getHours();
  let greeting = 'سلام';
  if (hour < 12) greeting = 'صبح بخیر';
  else if (hour < 17) greeting = 'ظهر بخیر';
  else if (hour < 21) greeting = 'عصر بخیر';
  else greeting = 'شب بخیر';

  const dateStr = now.toLocaleDateString('fa-IR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  header.innerHTML = `
    <div>
      <h1 class="text-3xl font-bold text-slate-100 mb-1">${greeting} 👋</h1>
      <p class="text-slate-400">${dateStr}</p>
    </div>
  `;

  const stats = state.get('stats');
  const streak = stats.studyStreak || 0;

  if (streak > 0) {
    const streakBadge = document.createElement('div');
    streakBadge.className = 'flex items-center gap-2 bg-accent-500/10 border border-accent-500/30 text-accent-400 px-4 py-2 rounded-lg';
    streakBadge.innerHTML = `
      <span class="text-2xl">🔥</span>
      <div>
        <div class="font-bold">${streak} روز</div>
        <div class="text-xs opacity-75">زنجیره مطالعه</div>
      </div>
    `;
    header.appendChild(streakBadge);
  }

  return header;
}

/**
 * ساخت بخش آمار
 * @private
 */
function createStatsSection() {
  const stats = state.get('stats');
  
  const statsData = [
    {
      label: 'یادداشت‌ها',
      value: stats.totalNotes || 0,
      icon: '📚',
      color: 'primary',
      bgGradient: 'from-primary-500/20 to-primary-600/10'
    },
    {
      label: 'فلش‌کارت‌ها',
      value: stats.totalFlashcards || 0,
      icon: '🃏',
      color: 'accent',
      bgGradient: 'from-accent-500/20 to-accent-600/10'
    },
    {
      label: 'آزمون‌ها',
      value: stats.totalQuizzes || 0,
      icon: '📝',
      color: 'green',
      bgGradient: 'from-green-500/20 to-green-600/10'
    },
    {
      label: 'میانگین نمره',
      value: `${stats.averageScore || 0}٪`,
      icon: '📊',
      color: 'purple',
      bgGradient: 'from-purple-500/20 to-purple-600/10'
    }
  ];

  const container = document.createElement('div');
  container.className = 'grid grid-cols-2 lg:grid-cols-4 gap-4';

  statsData.forEach(stat => {
    const card = document.createElement('div');
    card.className = `
      bg-gradient-to-br ${stat.bgGradient}
      border border-slate-700 rounded-xl p-5
      hover:border-slate-600 transition-all
      cursor-pointer
    `;

    card.innerHTML = `
      <div class="flex items-start justify-between mb-3">
        <span class="text-3xl">${stat.icon}</span>
      </div>
      <div class="text-2xl font-bold text-slate-100 mb-1">${stat.value}</div>
      <div class="text-sm text-slate-400">${stat.label}</div>
    `;

    container.appendChild(card);
  });

  return container;
}

/**
 * ساخت بخش دسترسی سریع
 * @private
 */
function createQuickActionsSection() {
  const section = document.createElement('div');

  section.innerHTML = `
    <h2 class="text-xl font-bold text-slate-100 mb-4">دسترسی سریع</h2>
  `;

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3';

  QUICK_ACTIONS.forEach(action => {
    const card = document.createElement('button');
    card.className = `
      group relative overflow-hidden
      bg-slate-800 hover:bg-slate-700
      border border-slate-700 hover:border-slate-600
      rounded-xl p-4
      transition-all duration-200
      text-right
    `;

    card.innerHTML = `
      <div class="relative z-10">
        <div class="w-12 h-12 rounded-lg bg-gradient-to-br ${action.color} 
                    flex items-center justify-center text-2xl mb-3
                    group-hover:scale-110 transition-transform">
          ${action.icon}
        </div>
        <div class="font-semibold text-slate-100 text-sm mb-1">${action.title}</div>
        <div class="text-xs text-slate-400">${action.description}</div>
      </div>
    `;

    card.addEventListener('click', () => {
      router.navigate(action.route);
    });

    grid.appendChild(card);
  });

  section.appendChild(grid);
  return section;
}

/**
 * ساخت بخش وضعیت SRS
 * @private
 */
function createSRSSection() {
  const section = document.createElement('div');
  section.className = 'bg-slate-800 border border-slate-700 rounded-xl p-6';

  const flashcards = state.get('flashcards') || [];
  const now = new Date();
  
  const dueCards = flashcards.filter(f => new Date(f.nextReview) <= now);
  const dueToday = flashcards.filter(f => {
    const reviewDate = new Date(f.nextReview);
    return reviewDate.toDateString() === now.toDateString();
  });

  section.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="text-2xl">🃏</span>
        <h2 class="text-lg font-bold text-slate-100">مرور فلش‌کارت</h2>
      </div>
      <span class="text-xs text-slate-400">الگوریتم SM-2</span>
    </div>
  `;

  const statsContainer = document.createElement('div');
  statsContainer.className = 'grid grid-cols-2 gap-4 mb-4';

  // کارت آماده مرور
  const dueCard = document.createElement('div');
  dueCard.className = 'bg-slate-900 rounded-lg p-4';
  dueCard.innerHTML = `
    <div class="text-xs text-slate-400 mb-1">آماده مرور</div>
    <div class="text-2xl font-bold text-accent-400">${dueCards.length}</div>
    <div class="text-xs text-slate-500">کارت</div>
  `;
  statsContainer.appendChild(dueCard);

  // کارت امروز
  const todayCard = document.createElement('div');
  todayCard.className = 'bg-slate-900 rounded-lg p-4';
  todayCard.innerHTML = `
    <div class="text-xs text-slate-400 mb-1">مرور امروز</div>
    <div class="text-2xl font-bold text-green-400">${dueToday.length}</div>
    <div class="text-xs text-slate-500">کارت</div>
  `;
  statsContainer.appendChild(todayCard);

  section.appendChild(statsContainer);

  // دکمه شروع مرور
  if (dueCards.length > 0) {
    const startBtn = createButton({
      label: `شروع مرور (${dueCards.length} کارت)`,
      variant: BUTTON_VARIANTS.ACCENT,
      size: BUTTON_SIZES.MD,
      fullWidth: true,
      icon: '▶️',
      onClick: () => router.navigate('flashcards')
    });
    section.appendChild(startBtn);
  } else {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'text-center py-4';
    emptyMsg.innerHTML = `
      <div class="text-4xl mb-2">🎉</div>
      <p class="text-slate-400 text-sm">همه فلش‌کارت‌ها مرور شده‌اند!</p>
    `;
    section.appendChild(emptyMsg);
  }

  return section;
}

/**
 * ساخت بخش یادداشت‌های اخیر
 * @private
 */
function createRecentNotesSection() {
  const section = document.createElement('div');
  section.className = 'bg-slate-800 border border-slate-700 rounded-xl p-6';

  section.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="text-2xl">📚</span>
        <h2 class="text-lg font-bold text-slate-100">یادداشت‌های اخیر</h2>
      </div>
    </div>
  `;

  const notes = state.get('notes') || [];
  const recentNotes = notes.slice(0, 5);

  if (recentNotes.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'text-center py-8';
    emptyState.innerHTML = `
      <div class="text-5xl mb-3 opacity-50">📝</div>
      <p class="text-slate-400 mb-4">هنوز یادداشتی ندارید</p>
    `;

    const createBtn = createButton({
      label: 'ایجاد اولین یادداشت',
      variant: BUTTON_VARIANTS.PRIMARY,
      size: BUTTON_SIZES.MD,
      icon: '➕',
      onClick: () => router.navigate('notes')
    });
    emptyState.appendChild(createBtn);
    section.appendChild(emptyState);
  } else {
    const list = document.createElement('div');
    list.className = 'space-y-2';

    recentNotes.forEach(note => {
      const item = document.createElement('button');
      item.className = `
        w-full text-right p-3 rounded-lg
        bg-slate-900 hover:bg-slate-700
        transition-colors
        group
      `;

      const preview = note.content 
        ? note.content.substring(0, 80) + (note.content.length > 80 ? '...' : '')
        : 'بدون محتوا';

      const date = new Date(note.createdAt || note.updatedAt || Date.now())
        .toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });

      item.innerHTML = `
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="font-medium text-slate-100 truncate mb-1">
              ${note.title || 'بدون عنوان'}
            </div>
            <div class="text-xs text-slate-400 line-clamp-1">${preview}</div>
          </div>
          <div class="flex flex-col items-end flex-shrink-0">
            <span class="text-xs text-slate-500">${date}</span>
            <span class="text-slate-500 group-hover:text-slate-300 transition-colors">←</span>
          </div>
        </div>
      `;

      item.addEventListener('click', () => {
        router.navigate('notes', { id: note.id });
      });

      list.appendChild(item);
    });

    section.appendChild(list);

    // دکمه مشاهده همه
    if (notes.length > 5) {
      const viewAllBtn = createButton({
        label: 'مشاهده همه یادداشت‌ها',
        variant: BUTTON_VARIANTS.GHOST,
        size: BUTTON_SIZES.SM,
        fullWidth: true,
        className: 'mt-3',
        onClick: () => router.navigate('notes')
      });
      section.appendChild(viewAllBtn);
    }
  }

  return section;
}

/**
 * ساخت بخش عملکرد (placeholder)
 * @private
 */
function createPerformanceSection() {
  const section = document.createElement('div');
  section.className = 'bg-slate-800 border border-slate-700 rounded-xl p-6';

  section.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="text-2xl">📈</span>
        <h2 class="text-lg font-bold text-slate-100">عملکرد شما</h2>
      </div>
    </div>
    <div class="text-center py-8">
      <div class="text-4xl mb-2 opacity-50">📊</div>
      <p class="text-slate-400 text-sm mb-3">
        نمودارهای عملکرد و نقشه فعالیت در فازهای بعدی اضافه خواهند شد
      </p>
      <div class="inline-block text-xs text-slate-500 bg-slate-900 px-3 py-1 rounded">
        به‌زودی
      </div>
    </div>
  `;

  return section;
}

export default createDashboardView;