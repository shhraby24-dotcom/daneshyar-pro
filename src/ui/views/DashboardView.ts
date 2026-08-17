/**
 * ============================================================
 * دانش‌یار پرو - Dashboard (ویترین برنامه)
 * ============================================================
 *
 * اولین صفحه‌ای که کاربر می‌بیند — باید در ۱۰ ثانیه ارزش را نشان دهد
 *
 * 🔥 شعله‌ی Streak به عنوان قهرمان صفحه (نه یک badge کوچک!)
 * 🎯 «مأموریت امروز» — همیشه می‌گوید چه کار کنی
 * 🗺️ نقشه حرارتی ۱۲۰ روزه — سند تعهد (جای placeholder قدیمی!)
 * 📊 آمار با شمارش متحرک — اعداد زنده، نه ثابت
 * 🌱 حالت ویژه کاربر جدید — نه صفرهای مرده
 * 🔒 کاملاً XSS-safe (فقط textContent)
 *
 * @module ui/views/DashboardView
 * @version 1.0.0-beta.1
 */

import { getRouter } from '@/core/Router';
import { getInstance as getLogger } from '@/core/Logger';
import { getDatabase, type DbStats, type DbNote } from '@/core/Database';
import { getStreakService, type StreakStats, type HeatmapDay } from '@/services/StreakService';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '@/ui/components/Button';
import { createCard, createSectionHeader, createEmptyState } from '@/ui/components/Card';
import { formatPersianDate, formatPersianDateShort, toPersianDigits } from '@/utils/dateFormatter';
import { getChallengesWithStatus } from '@/services/RewardEngine';

const logger = getLogger().module('DashboardView');

// ============================================================
// ثابت‌ها
// ============================================================

/** رنگ‌های نقشه حرارتی (از خاموش تا روشن) */
const HEATMAP_COLORS = [
  'bg-slate-700/40',
  'bg-accent-500/25',
  'bg-accent-500/45',
  'bg-accent-500/65',
  'bg-accent-500',
];

/** چیپ‌های دسترسی سریع */
const QUICK_ACTIONS = [
  { route: 'notes', icon: '📝', label: 'یادداشت جدید' },
  { route: 'summarizer', icon: '✨', label: 'خلاصه‌سازی' },
  { route: 'quiz', icon: '📋', label: 'آزمون جدید' },
  { route: 'flashcards', icon: '🃏', label: 'مرور فلش‌کارت' },
  { route: 'pomodoro', icon: '⏱️', label: 'پومودورو' },
  { route: 'settings', icon: '⚙️', label: 'تنظیمات' },
];

// ============================================================
// توابع کمکی
// ============================================================

/** سلام بر اساس ساعت روز */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'شب بخیر';
  if (hour < 12) return 'صبح بخیر';
  if (hour < 17) return 'ظهر بخیر';
  if (hour < 21) return 'عصر بخیر';
  return 'شب بخیر';
}

/** شمارش متحرک عدد با ارقام فارسی */
function countUp(
  el: HTMLElement,
  target: number,
  opts: { duration?: number; suffix?: string } = {}
): void {
  const { duration = 900, suffix = '' } = opts;
  const format = (n: number): string => Math.round(n).toLocaleString('fa-IR') + suffix;

  if (duration <= 0) {
    el.textContent = format(target);
    return;
  }

  const start = performance.now();
  const ease = (t: number): number => 1 - Math.pow(1 - t, 3);
  const frame = (now: number): void => {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = format(target * ease(p));
    if (p < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// ============================================================
// بخش ۱: شعله‌ی Streak (قهرمان صفحه)
// ============================================================

function createFlameHero(stats: StreakStats): HTMLElement {
  const hero = document.createElement('div');
  hero.className =
    'reveal relative overflow-hidden rounded-2xl border border-accent-500/30 ' +
    'bg-gradient-to-br from-accent-500/15 via-slate-800 to-slate-800 p-6 lg:p-8';

  // هاله‌ی نور محیطی
  const glow = document.createElement('div');
  glow.className = 'absolute -top-24 -start-24 w-72 h-72 rounded-full bg-accent-500/20 blur-3xl pointer-events-none';
  hero.appendChild(glow);

  const inner = document.createElement('div');
  inner.className = 'relative flex items-center gap-6 lg:gap-10';

  // شعله (سوسو می‌زند و می‌درخشد)
  const flame = document.createElement('div');
  flame.className = 'flame flex-shrink-0 text-7xl lg:text-8xl';
  flame.textContent = stats.currentStreak > 0 ? '🔥' : '🕯️';
  inner.appendChild(flame);

  // اطلاعات
  const info = document.createElement('div');
  info.className = 'flex-1 min-w-0';

  // سلام + تاریخ
  const topRow = document.createElement('div');
  topRow.className = 'flex items-center justify-between gap-2 mb-3';
  const greeting = document.createElement('p');
  greeting.className = 'text-sm text-slate-300';
  greeting.textContent = `${getGreeting()}! 👋`;
  const date = document.createElement('p');
  date.className = 'text-xs text-slate-500';
  date.textContent = formatPersianDate(new Date());
  topRow.appendChild(greeting);
  topRow.appendChild(date);
  info.appendChild(topRow);

  // عدد بزرگ + برچسب
  const numRow = document.createElement('div');
  numRow.className = 'flex items-end gap-3 mb-4';
  const bigNum = document.createElement('span');
  bigNum.className = 'text-6xl lg:text-7xl font-black leading-none text-accent-400';
  bigNum.textContent = '۰';
  countUp(bigNum, stats.currentStreak);
  const labelWrap = document.createElement('div');
  labelWrap.className = 'pb-2';
  const label = document.createElement('div');
  label.className = 'text-lg font-bold text-slate-100';
  label.textContent = 'روز متوالی';
  const record = document.createElement('div');
  record.className = 'text-xs text-slate-400';
  record.textContent =
    stats.isNewRecord && stats.currentStreak > 0
      ? '🏆 رکورد جدید!'
      : `رکورد: ${toPersianDigits(String(stats.longestStreak))} روز 🏆`;
  labelWrap.appendChild(label);
  labelWrap.appendChild(record);
  numRow.appendChild(bigNum);
  numRow.appendChild(labelWrap);
  info.appendChild(numRow);

  // نوار پیشرفت مایلستون
  if (stats.nextMilestone) {
    const pct = Math.min(Math.round((stats.currentStreak / stats.nextMilestone.target) * 100), 100);
    const progress = document.createElement('div');
    progress.className = 'mb-3';

    const pRow = document.createElement('div');
    pRow.className = 'flex items-center justify-between text-xs mb-1.5';
    const pLabel = document.createElement('span');
    pLabel.className = 'text-slate-400';
    pLabel.textContent = `🎯 ${toPersianDigits(String(stats.nextMilestone.remaining))} روز تا ${toPersianDigits(String(stats.nextMilestone.target))} روز`;
    const pPct = document.createElement('span');
    pPct.className = 'font-bold text-accent-400';
    pPct.textContent = `${toPersianDigits(String(pct))}٪`;
    pRow.appendChild(pLabel);
    pRow.appendChild(pPct);
    progress.appendChild(pRow);

    const bar = document.createElement('div');
    bar.className = 'h-2.5 overflow-hidden rounded-full bg-slate-700/60';
    const fill = document.createElement('div');
    fill.className = 'progress-fill h-full rounded-full bg-gradient-to-l from-accent-400 to-accent-600';
    fill.style.width = `${pct}%`;
    bar.appendChild(fill);
    progress.appendChild(bar);
    info.appendChild(progress);
  }

  // وضعیت امروز
  const status = document.createElement('p');
  status.className =
    stats.currentStreak === 0
      ? 'text-sm text-slate-300'
      : stats.studiedToday
        ? 'text-sm text-green-400'
        : 'text-sm text-amber-400';
  status.textContent = stats.statusMessage;
  info.appendChild(status);

  inner.appendChild(info);
  hero.appendChild(inner);
  return hero;
}

// ============================================================
// بخش ۲: مأموریت امروز (موتور اقدام)
// ============================================================

function createMission(dueCount: number): HTMLElement {
  const mission = document.createElement('div');
  mission.className =
    'reveal reveal-1 relative overflow-hidden rounded-2xl border border-accent-500/40 ' +
    'bg-gradient-to-l from-accent-500/10 to-slate-800 p-6';

  const glow = document.createElement('div');
  glow.className = 'absolute -bottom-16 -end-16 w-48 h-48 rounded-full bg-accent-500/10 blur-3xl pointer-events-none';
  mission.appendChild(glow);

  const inner = document.createElement('div');
  inner.className = 'relative flex flex-col gap-5 lg:flex-row lg:items-center';

  const textWrap = document.createElement('div');
  textWrap.className = 'flex-1';

  const titleRow = document.createElement('div');
  titleRow.className = 'mb-2 flex items-center gap-2';
  const icon = document.createElement('span');
  icon.className = 'text-2xl';
  icon.textContent = dueCount > 0 ? '🃏' : '🎉';
  const title = document.createElement('h2');
  title.className = 'text-xl font-bold text-slate-100';
  title.textContent =
    dueCount > 0
      ? `${toPersianDigits(String(dueCount))} فلش‌کارت منتظر مرورند`
      : 'آفرین! همه فلش‌کارت‌ها مرور شد';
  titleRow.appendChild(icon);
  titleRow.appendChild(title);
  textWrap.appendChild(titleRow);

  const desc = document.createElement('p');
  desc.className = 'text-sm text-slate-400';
  desc.textContent =
    dueCount > 0
      ? 'فقط چند دقیقه وقتت را می‌گیرد — همین حالا شروع کن!'
      : 'حالا وقتشه یک قدم دیگه برداری:';
  textWrap.appendChild(desc);

  inner.appendChild(textWrap);

  if (dueCount > 0) {
    inner.appendChild(
      createButton({
        label: `شروع مرور (${toPersianDigits(String(dueCount))} کارت)`,
        variant: BUTTON_VARIANTS.ACCENT,
        size: BUTTON_SIZES.LG,
        icon: '▶️',
      onClick: () => void getRouter().navigate('flashcards'),
      })
    );
  } else {
    const btnGroup = document.createElement('div');
    btnGroup.className = 'flex gap-3';
    btnGroup.appendChild(
      createButton({
        label: 'آزمون جدید',
        variant: BUTTON_VARIANTS.PRIMARY,
        icon: '📝',
      onClick: () => void getRouter().navigate('quiz'),
      })
    );
    btnGroup.appendChild(
      createButton({
        label: 'یادداشت جدید',
        variant: BUTTON_VARIANTS.GHOST,
        icon: '📚',
        onClick: () => void getRouter().navigate('notes'),
      })
    );
    inner.appendChild(btnGroup);
  }

  mission.appendChild(inner);
  return mission;
}

// ============================================================
// بخش ۳: سفر تو (آمار + نقشه حرارتی)
// ============================================================

function createJourney(streakStats: StreakStats, dbStats: DbStats, heatmap: HeatmapDay[]): HTMLElement {
  const section = document.createElement('div');
  section.className = 'reveal reveal-2';

  section.appendChild(
    createSectionHeader({ title: 'سفر تو', icon: '📊', subtitle: 'نگاهی به مسیر یادگیری‌ات' })
  );

  const card = createCard({ padding: 'lg' });

  // نوار آمار (اعداد زنده، نه کارت‌های تکراری)
  const statsBar = document.createElement('div');
  statsBar.className = 'mb-6 flex flex-wrap items-center gap-x-8 gap-y-4 border-b border-slate-700 pb-6';

  const statItems: Array<{ icon: string; value: number; label: string; suffix?: string }> = [
    { icon: '📚', value: dbStats.totalNotes, label: 'یادداشت' },
    { icon: '🃏', value: dbStats.totalFlashcards, label: 'فلش‌کارت' },
    { icon: '📝', value: dbStats.totalQuizzes, label: 'آزمون' },
    { icon: '✅', value: dbStats.averageScore, label: 'میانگین نمره', suffix: '٪' },
    { icon: '📅', value: streakStats.totalStudyDays, label: 'روز مطالعه' },
  ];

  statItems.forEach((item) => {
    const el = document.createElement('div');
    el.className = 'flex items-center gap-3';
    const iconEl = document.createElement('span');
    iconEl.className = 'text-2xl';
    iconEl.textContent = item.icon;
    const num = document.createElement('div');
    num.className = 'text-2xl font-black leading-none text-slate-100';
    num.textContent = '۰';
    countUp(num, item.value, { suffix: item.suffix ?? '' });
    const label = document.createElement('div');
    label.className = 'mt-1 text-xs text-slate-400';
    label.textContent = item.label;
    el.appendChild(iconEl);
    el.appendChild(num);
    el.appendChild(label);
    statsBar.appendChild(el);
  });

  card.appendChild(statsBar);

  // نقشه حرارتی
  const heatmapHeader = document.createElement('div');
  heatmapHeader.className = 'mb-3 flex items-center justify-between';
  const heatmapTitle = document.createElement('div');
  heatmapTitle.className = 'text-sm font-bold text-slate-200';
  heatmapTitle.textContent = '🗺️ نقشه فعالیت — ۱۲۰ روز اخیر';
  const legend = document.createElement('div');
  legend.className = 'flex items-center gap-1.5 text-xs text-slate-500';
  const legendLess = document.createElement('span');
  legendLess.textContent = 'کم';
  legend.appendChild(legendLess);
  HEATMAP_COLORS.forEach((color) => {
    const swatch = document.createElement('span');
    swatch.className = `h-3 w-3 rounded-sm ${color}`;
    legend.appendChild(swatch);
  });
  const legendMore = document.createElement('span');
  legendMore.textContent = 'زیاد';
  legend.appendChild(legendMore);
  heatmapHeader.appendChild(heatmapTitle);
  heatmapHeader.appendChild(legend);
  card.appendChild(heatmapHeader);

  const gridScroll = document.createElement('div');
  gridScroll.className = 'overflow-x-auto pb-2';
  const grid = document.createElement('div');
  grid.className = 'heatmap-grid';

  heatmap.forEach((day) => {
    const cell = document.createElement('div');
    const intensity = Math.min(Math.max(day.count, 0), 4);
    cell.className = `heatmap-cell ${HEATMAP_COLORS[intensity] ?? 'bg-slate-700/40'}`;
    cell.title = `${formatPersianDateShort(new Date(day.iso))} — ${toPersianDigits(String(day.count))} جلسه`;
    grid.appendChild(cell);
  });

  gridScroll.appendChild(grid);
  card.appendChild(gridScroll);

  section.appendChild(card);
  return section;
}

// ============================================================
// بخش ۴: دسترسی سریع (چیپ، نه کارت تکراری)
// ============================================================

function createQuickActions(): HTMLElement {
  const section = document.createElement('div');
  section.className = 'reveal reveal-3';
  section.appendChild(createSectionHeader({ title: 'دسترسی سریع', icon: '⚡' }));

  const chips = document.createElement('div');
  chips.className = 'flex gap-3 overflow-x-auto pb-2';

  QUICK_ACTIONS.forEach((action) => {
    const chip = document.createElement('button');
    chip.className =
      'group flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-slate-600 ' +
      'bg-slate-800 px-5 py-3 transition-all hover:-translate-y-0.5 hover:border-accent-500/50 hover:bg-slate-700';

    const icon = document.createElement('span');
    icon.className = 'text-lg transition-transform group-hover:scale-110';
    icon.textContent = action.icon;
    const label = document.createElement('span');
    label.className = 'text-sm font-medium text-slate-200';
    label.textContent = action.label;

    chip.appendChild(icon);
    chip.appendChild(label);
    chip.addEventListener('click', () => getRouter().navigate(action.route));
    chips.appendChild(chip);
  });

  section.appendChild(chips);
  return section;
}

// ============================================================
// بخش ۵: یادداشت‌های اخیر (XSS-safe)
// ============================================================

function createRecentNotes(notes: DbNote[]): HTMLElement {
  const section = document.createElement('div');
  section.className = 'reveal reveal-4';

  const viewAllBtn = createButton({
    label: 'مشاهده همه',
    variant: BUTTON_VARIANTS.GHOST,
    size: BUTTON_SIZES.SM,
    onClick: () => void getRouter().navigate('notes'),
  });
  section.appendChild(
    createSectionHeader({ title: 'یادداشت‌های اخیر', icon: '📚', action: viewAllBtn })
  );

  if (notes.length === 0) {
    section.appendChild(
      createEmptyState({
        icon: '📝',
        title: 'هنوز یادداشتی نداری',
        message: 'اولین یادداشتت را بساز و شروع به یادگیری کن!',
        actionLabel: '+ ساخت اولین یادداشت',
        onAction: () => getRouter().navigate('notes'),
      })
    );
    return section;
  }

  const list = document.createElement('div');
  list.className = 'space-y-2';

  notes.forEach((note) => {
    const item = document.createElement('button');
    item.className =
      'group w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-start ' +
      'transition-all hover:border-accent-500/40 hover:bg-slate-700/50';

    const row = document.createElement('div');
    row.className = 'flex items-start justify-between gap-3';

    const content = document.createElement('div');
    content.className = 'min-w-0 flex-1 text-start';
    const titleEl = document.createElement('div');
    titleEl.className = 'mb-1 truncate font-bold text-slate-100';
    titleEl.textContent = note.title || 'بدون عنوان';
    const previewEl = document.createElement('div');
    previewEl.className = 'truncate text-xs text-slate-400';
    previewEl.textContent = note.content ? note.content.replace(/\s+/g, ' ').substring(0, 80) : 'بدون محتوا';
    content.appendChild(titleEl);
    content.appendChild(previewEl);

    const meta = document.createElement('div');
    meta.className = 'flex flex-shrink-0 flex-col items-end gap-1';
    const dateEl = document.createElement('span');
    dateEl.className = 'text-xs text-slate-500';
    dateEl.textContent = formatPersianDateShort(new Date(note.updatedAt || note.createdAt));
    const arrow = document.createElement('span');
    arrow.className = 'text-slate-500 transition-all group-hover:-translate-x-1 group-hover:text-accent-400';
    arrow.textContent = '←';
    meta.appendChild(dateEl);
    meta.appendChild(arrow);

    row.appendChild(content);
    row.appendChild(meta);
    item.appendChild(row);
    item.addEventListener('click', () => getRouter().navigate('notes', { id: note.id }));
    list.appendChild(item);
  });

  section.appendChild(list);
  return section;
}

// ============================================================
// حالت کاربر جدید (اولین برخورد = تصمیم به ماندن)
// ============================================================

function createOnboarding(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'mx-auto max-w-3xl space-y-8';

  // خوش‌آمد (نامتقارن، با شعله)
  const hero = document.createElement('div');
  hero.className =
    'reveal relative overflow-hidden rounded-2xl border border-accent-500/30 ' +
    'bg-gradient-to-br from-accent-500/15 via-slate-800 to-slate-800 p-8 lg:p-10';

  const glow = document.createElement('div');
  glow.className = 'absolute -top-24 -end-24 w-72 h-72 rounded-full bg-accent-500/20 blur-3xl pointer-events-none';
  hero.appendChild(glow);

  const heroInner = document.createElement('div');
  heroInner.className = 'relative flex items-center gap-6';

  const flame = document.createElement('div');
  flame.className = 'flame flex-shrink-0 text-7xl lg:text-8xl';
  flame.textContent = '🔥';
  heroInner.appendChild(flame);

  const heroText = document.createElement('div');
  const heroTitle = document.createElement('h1');
  heroTitle.className = 'mb-3 text-3xl font-black text-slate-100 lg:text-4xl';
  heroTitle.textContent = 'سفرت را شروع کن!';
  const heroDesc = document.createElement('p');
  heroDesc.className = 'leading-relaxed text-slate-300';
  heroDesc.textContent =
    'به دانش‌یار خوش آمدی! 🎉 اینجا جایی است که متن‌هایت به دانش ماندگار تبدیل می‌شوند. با سه قدم ساده شروع کن:';
  heroText.appendChild(heroTitle);
  heroText.appendChild(heroDesc);
  heroInner.appendChild(heroText);

  hero.appendChild(heroInner);
  container.appendChild(hero);

  // سه قدم (مسیر عمودی، نه کارت‌های هم‌شکل)
  const steps = [
    { num: '۱', icon: '📝', title: 'اولین یادداشتت را بساز', desc: 'جزوه یا متن درسی‌ات را اضافه کن', route: 'notes' },
    { num: '۲', icon: '🃏', title: 'فلش‌کارت بساز', desc: 'از یادداشتت، کارت‌های مرور بساز', route: 'flashcards' },
    { num: '۳', icon: '🔥', title: 'مرور روزانه را شروع کن', desc: 'با مرور هر روز، شعله‌ات را روشن نگه دار', route: 'flashcards' },
  ];

  const stepsWrap = document.createElement('div');
  stepsWrap.className = 'space-y-3';

  steps.forEach((step, i) => {
    const el = document.createElement('button');
    el.className =
      `reveal reveal-${i + 1} group flex w-full items-center gap-4 rounded-xl border border-slate-700 ` +
      'bg-slate-800 p-5 text-start transition-all hover:-translate-y-0.5 hover:border-accent-500/50 hover:bg-slate-700/50';

    const numCircle = document.createElement('div');
    numCircle.className =
      'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-accent-500/40 ' +
      'bg-accent-500/15 font-black text-accent-400';
    numCircle.textContent = step.num;

    const iconEl = document.createElement('span');
    iconEl.className = 'flex-shrink-0 text-3xl transition-transform group-hover:scale-110';
    iconEl.textContent = step.icon;

    const textWrap = document.createElement('div');
    textWrap.className = 'min-w-0 flex-1';
    const titleEl = document.createElement('div');
    titleEl.className = 'mb-0.5 font-bold text-slate-100';
    titleEl.textContent = step.title;
    const descEl = document.createElement('div');
    descEl.className = 'text-xs text-slate-400';
    descEl.textContent = step.desc;
    textWrap.appendChild(titleEl);
    textWrap.appendChild(descEl);

    const arrow = document.createElement('span');
    arrow.className = 'text-xl text-slate-500 transition-all group-hover:-translate-x-1 group-hover:text-accent-400';
    arrow.textContent = '←';

    el.appendChild(numCircle);
    el.appendChild(iconEl);
    el.appendChild(textWrap);
    el.appendChild(arrow);
    el.addEventListener('click', () => getRouter().navigate(step.route));
    stepsWrap.appendChild(el);
  });

  container.appendChild(stepsWrap);
  return container;
}

// ============================================================
// View اصلی داشبورد
// ============================================================
// ============================================================
// بخش ۶: چالش‌های فعال (Growth)
// ============================================================

async function createChallengesWidget(): Promise<HTMLElement | null> {
  const activeChallenges = await getChallengesWithStatus();
  const active = activeChallenges.filter((c) => !c.completed).slice(0, 2);
  if (active.length === 0) return null;

  const widget = document.createElement('div');
  widget.className = 'reveal reveal-5 bg-slate-800 border border-slate-700 rounded-xl p-4';

  const header = document.createElement('div');
  header.className = 'flex items-center justify-between mb-3';
  const title = document.createElement('div');
  title.className = 'font-bold text-slate-100 text-base';
  title.textContent = '🎯 چالش‌های فعال';
  const viewAll = document.createElement('button');
  viewAll.className = 'text-xs text-primary-400 hover:text-primary-300 font-bold';
  viewAll.textContent = 'همه ←';
  viewAll.addEventListener('click', () => getRouter().navigate('challenges'));
  header.appendChild(title);
  header.appendChild(viewAll);
  widget.appendChild(header);

  const list = document.createElement('div');
  list.className = 'space-y-2';
  for (const ch of active) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'flex w-full items-center gap-3 p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900 text-start transition-all';
    
    const icon = document.createElement('div');
    icon.className = 'text-2xl flex-shrink-0';
    icon.textContent = ch.icon;
    
    const info = document.createElement('div');
    info.className = 'flex-1 min-w-0';
    const t = document.createElement('div');
    t.className = 'text-sm text-slate-200 font-medium';
    t.textContent = ch.title;
    const pBar = document.createElement('div');
    pBar.className = 'mt-1.5 h-1.5 rounded-full bg-slate-700 overflow-hidden';
    const pFill = document.createElement('div');
    pFill.className = 'h-full bg-primary-400 transition-all';
    pFill.style.width = `${ch.progress}%`;
    pBar.appendChild(pFill);
    info.appendChild(t);
    info.appendChild(pBar);
    
    const reward = document.createElement('div');
    reward.className = 'flex-shrink-0 text-center';
    const num = document.createElement('div');
    num.className = 'text-base font-black text-primary-400';
    num.textContent = '+' + toPersianDigits(String(ch.rewardDays));
    const lbl = document.createElement('div');
    lbl.className = 'text-xs text-slate-500';
    lbl.textContent = 'روز 💎';
    reward.appendChild(num);
    reward.appendChild(lbl);
    
    item.appendChild(icon);
    item.appendChild(info);
    item.appendChild(reward);
    item.addEventListener('click', () => getRouter().navigate('challenges'));
    list.appendChild(item);
  }
  widget.appendChild(list);
  return widget;
}
/**
 * ساخت View داشبورد
 * (async چون داده‌ها از IndexedDB می‌آیند)
 */
export async function createDashboardView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر داشبورد');

  // دریافت همه داده‌ها به صورت موازی
  const [streakStats, dbStats, heatmap, allNotes] = await Promise.all([
    getStreakService().getStreakStats(),
    getDatabase().getStats(),
    getStreakService().getHeatmap(120),
    getDatabase().getNotes(),
  ]);

  const container = document.createElement('div');
  container.className = 'mx-auto max-w-5xl space-y-8';

  // آیا کاربر جدید است؟ (هیچ محتوایی ندارد)
  const isFirstRun =
    dbStats.totalNotes === 0 && dbStats.totalFlashcards === 0 && dbStats.totalQuizzes === 0;

  if (isFirstRun) {
    container.appendChild(createOnboarding());
  } else {
    container.appendChild(createFlameHero(streakStats));
    container.appendChild(createMission(dbStats.dueFlashcards));
    container.appendChild(createJourney(streakStats, dbStats, heatmap));
    container.appendChild(createQuickActions());
    container.appendChild(createRecentNotes(allNotes.slice(0, 5)));
    // چالش‌های فعال (async — اضافه می‌شود اگر چالشی باشد)
    const challengesWidget = await createChallengesWidget();
    if (challengesWidget) container.appendChild(challengesWidget);
  }

  return container;
}

export default createDashboardView;