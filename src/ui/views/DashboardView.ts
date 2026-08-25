/**
 * ============================================================
 * دانش‌یار پرو - Dashboard (ویترین برنامه)
 * ============================================================
 * ✅ بدون ایموجی — آیکون‌های یکپارچه Lucide
 * 🔥 شعله‌ی Streak با انیمیشن Lottie (حرفه‌ای، طراح‌ساخته)
 * 🎯 «مأموریت امروز» — همیشه می‌گوید چه کار کنی
 * 🗺️ نقشه حرارتی ۱۲۰ روزه — سند تعهد
 * 📊 آمار در grid منظم با شمارش متحرک
 * 🔒 کاملاً XSS-safe (فقط textContent / iconHTML trusted)
 * @module ui/views/DashboardView
 * @version 3.0.0
 */
import { getRouter } from '@/core/Router';
import { getInstance as getLogger } from '@/core/Logger';
import { getDatabase, type DbStats, type DbNote } from '@/core/Database';
import { getStreakService, type StreakStats, type HeatmapDay } from '@/services/StreakService';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '@/ui/components/Button';
import { createCard, createSectionHeader, createEmptyState } from '@/ui/components/Card';
import { formatPersianDate, formatPersianDateShort, toPersianDigits } from '@/utils/dateFormatter';
import { getChallengesWithStatus } from '@/services/RewardEngine';
import { createIcon, iconHTML } from '@/services/IconService';
import lottie from 'lottie-web';
import flameAnim from '@/assets/flame.json';

const logger = getLogger().module('DashboardView');

// ============================================================
// ثابت‌ها
// ============================================================
const HEATMAP_COLORS = [
  'bg-slate-700/40',
  'bg-accent-500/25',
  'bg-accent-500/45',
  'bg-accent-500/65',
  'bg-accent-500',
];

const QUICK_ACTIONS = [
  { route: 'notes', icon: 'notes', label: 'یادداشت جدید' },
  { route: 'summarizer', icon: 'sparkles', label: 'خلاصه‌سازی' },
  { route: 'quiz', icon: 'quiz', label: 'آزمون جدید' },
  { route: 'flashcards', icon: 'flashcards', label: 'مرور فلش‌کارت' },
  { route: 'pomodoro', icon: 'pomodoro', label: 'پومودورو' },
  { route: 'settings', icon: 'settings', label: 'تنظیمات' },
];

// ============================================================
// توابع کمکی
// ============================================================
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'شب بخیر';
  if (hour < 12) return 'صبح بخیر';
  if (hour < 17) return 'ظهر بخیر';
  if (hour < 21) return 'عصر بخیر';
  return 'شب بخیر';
}

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

/**
 * شعله‌ی Streak با Lottie — نسخه‌ی بهینه‌شده از نظر عملکرد
 * ✅ رفع فلیکر/سیاهی اولیه (پخش فقط بعد از load)
 * ✅ رفع سنگینی روی گوشی ضعیف (محدودکردن پیکسل‌ریتیو + توقف هوشمند)
 * ✅ رفع خط سفید دور آتش (بدون فیلتر brightness روی canvas)
 * ✅ بدون نشت حافظه (پاک‌سازی کامل هنگام حذف)
 */
function createStreakFlame(stats: StreakStats | null): HTMLElement {
  const alive = !!stats && stats.currentStreak > 0;
  const surge = alive && !!stats?.studiedToday;

  const wrap = document.createElement('div');
  wrap.className = 'streak-flame' + (alive ? '' : ' cold') + (surge ? ' surge' : '');

  const holder = document.createElement('div');
  holder.className = 'flame-canvas'; // از CSS بخش ۳۹ استفاده می‌کند
  wrap.appendChild(holder);

  // رندر SVG (سبک‌تر از canvas روی گوشی ضعیف، بدون فلیکر/سیاهی WASM)
  const anim = lottie.loadAnimation({
    container: holder,
    renderer: 'svg',
    loop: true,
    autoplay: false,          // ⬅️ نه قبل از آماده‌شدن (رفع فلیکر)
    animationData: flameAnim, // ⬅️ JSON باندل‌شده (آفلاین سالم)
  });

  // شروع فقط بعد از آماده‌شدن اولین فریم
  anim.addEventListener('DOMLoaded', () => {
    if (!alive) { anim.goToAndStop(0, true); return; } // حالت خاموش: فریم ثابت
    if (surge) {
      anim.setSpeed(2); // 🪵 هیزم تازه: موقتاً پرانرژی‌تر
      setTimeout(() => anim.setSpeed(1), 1200);
    }
    anim.play();
  });

  // توقف وقتی خارج از صفحه یا تب مخفی (باتری + عملکرد)
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting && !document.hidden && alive) anim.play();
        else anim.pause();
      }
    },
    { threshold: 0.1 }
  );
  io.observe(wrap);

  const onVis = (): void => {
    if (document.hidden) anim.pause();
    else if (wrap.isConnected && alive) anim.play();
  };
  document.addEventListener('visibilitychange', onVis);
  // ⚡ هنگام اسکرول، رندر متوقف تا صفحه روان بماند؛ بعد از توقف اسکرول، ادامه
  let scrollTimer: number | undefined;
  const onScroll = (): void => {
    anim.pause();
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      if (!document.hidden && wrap.isConnected && alive) anim.play();
    }, 200);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  // پاک‌سازی کامل هنگام حذف (جلوگیری از نشت حافظه)
  const mo = new MutationObserver(() => {
    if (!wrap.isConnected) {
      io.disconnect();
      mo.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(scrollTimer);
      document.removeEventListener('visibilitychange', onVis);
      anim.destroy();
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  return wrap;
}

// ============================================================
// بخش ۱: شعله‌ی Streak (قهرمان صفحه)
// ============================================================
function createFlameHero(stats: StreakStats): HTMLElement {
  const hero = document.createElement('div');
  hero.className =
    'reveal relative overflow-hidden rounded-2xl border border-accent-500/30 ' +
    'bg-gradient-to-br from-accent-500/15 via-slate-800 to-slate-800 p-6 lg:p-8';

  const glow = document.createElement('div');
  glow.className = 'absolute -top-24 -start-24 w-72 h-72 rounded-full bg-accent-500/20 blur-3xl pointer-events-none';
  hero.appendChild(glow);

  const inner = document.createElement('div');
  inner.className =
    'relative flex flex-col items-center gap-4 text-center ' +
    'sm:flex-row sm:items-center sm:gap-8 sm:text-start';
  inner.appendChild(createStreakFlame(stats));

  const info = document.createElement('div');
  info.className = 'flex-1 min-w-0';

  const topRow = document.createElement('div');
  topRow.className = 'mb-3 flex items-center justify-between gap-2';
  const greeting = document.createElement('p');
  greeting.className = 'text-sm text-slate-300';
  greeting.textContent = `${getGreeting()}!`;
  const date = document.createElement('p');
  date.className = 'text-xs text-slate-500';
  date.textContent = formatPersianDate(new Date());
  topRow.appendChild(greeting);
  topRow.appendChild(date);
  info.appendChild(topRow);

  const numRow = document.createElement('div');
  numRow.className = 'mb-4 flex items-end justify-center gap-3 sm:justify-start';
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
  record.className = 'flex items-center gap-1 text-xs text-slate-400';
  record.innerHTML =
    stats.isNewRecord && stats.currentStreak > 0
      ? `${iconHTML('trophy', 14)} <span>رکورد جدید!</span>`
      : `${iconHTML('trophy', 14)} <span>رکورد: ${toPersianDigits(String(stats.longestStreak))} روز</span>`;
  labelWrap.appendChild(label);
  labelWrap.appendChild(record);
  numRow.appendChild(bigNum);
  numRow.appendChild(labelWrap);
  info.appendChild(numRow);

  if (stats.nextMilestone) {
    const pct = Math.min(Math.round((stats.currentStreak / stats.nextMilestone.target) * 100), 100);
    const progress = document.createElement('div');
    progress.className = 'mb-3';
    const pRow = document.createElement('div');
    pRow.className = 'mb-1.5 flex items-center justify-between text-xs';
    const pLabel = document.createElement('span');
    pLabel.className = 'flex items-center gap-1 text-slate-400';
    pLabel.innerHTML = `${iconHTML('target', 14)} <span>${toPersianDigits(String(stats.nextMilestone.remaining))} روز تا ${toPersianDigits(String(stats.nextMilestone.target))} روز</span>`;
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
// بخش ۲: مأموریت امروز
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
  icon.className = 'flex items-center text-accent-400';
  icon.appendChild(createIcon(dueCount > 0 ? 'flashcards' : 'check', 24));
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
        iconHtml: iconHTML('flashcards', 18),
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
        iconHtml: iconHTML('quiz', 18),
        onClick: () => void getRouter().navigate('quiz'),
      })
    );
    btnGroup.appendChild(
      createButton({
        label: 'یادداشت جدید',
        variant: BUTTON_VARIANTS.GHOST,
        iconHtml: iconHTML('notes', 18),
        onClick: () => void getRouter().navigate('notes'),
      })
    );
    inner.appendChild(btnGroup);
  }

  mission.appendChild(inner);
  return mission;
}

// ============================================================
// بخش ۳: سفر تو (آمار grid منظم + نقشه حرارتی)
// ============================================================
function createJourney(streakStats: StreakStats, dbStats: DbStats, heatmap: HeatmapDay[]): HTMLElement {
  const section = document.createElement('div');
  section.className = 'reveal reveal-2';
  section.appendChild(
    createSectionHeader({ title: 'سفر تو', subtitle: 'نگاهی به مسیر یادگیری‌ات' })
  );

  const card = createCard({ padding: 'lg' });

  const statsBar = document.createElement('div');
  statsBar.className = 'stats-grid mb-6 border-b border-slate-700 pb-6';
  const statItems: Array<{ icon: string; value: number; label: string; suffix?: string }> = [
    { icon: 'books', value: dbStats.totalNotes, label: 'یادداشت' },
    { icon: 'flashcards', value: dbStats.totalFlashcards, label: 'فلش‌کارت' },
    { icon: 'quiz', value: dbStats.totalQuizzes, label: 'آزمون' },
    { icon: 'check', value: dbStats.averageScore, label: 'میانگین نمره', suffix: '٪' },
    { icon: 'calendar', value: streakStats.totalStudyDays, label: 'روز مطالعه' },
  ];
  statItems.forEach((item) => {
    const el = document.createElement('div');
    el.className = 'flex flex-col items-center gap-1 text-center';
    const iconEl = document.createElement('span');
    iconEl.className = 'mb-1 flex items-center text-primary-400';
    iconEl.appendChild(createIcon(item.icon, 22));
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

  const heatmapHeader = document.createElement('div');
  heatmapHeader.className = 'mb-3 flex items-center justify-between';
  const heatmapTitle = document.createElement('div');
  heatmapTitle.className = 'flex items-center gap-1.5 text-sm font-bold text-slate-200';
  heatmapTitle.innerHTML = `${iconHTML('calendar', 16)} <span>نقشه فعالیت — ۱۲۰ روز اخیر</span>`;
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
// بخش ۴: دسترسی سریع (چیپ)
// ============================================================
function createQuickActions(): HTMLElement {
  const section = document.createElement('div');
  section.className = 'reveal reveal-3';
  section.appendChild(createSectionHeader({ title: 'دسترسی سریع' }));

  const chips = document.createElement('div');
  chips.className = 'flex gap-3 overflow-x-auto pb-2';
  QUICK_ACTIONS.forEach((action) => {
    const chip = document.createElement('button');
    chip.className =
      'group flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-slate-600 ' +
      'bg-slate-800 px-5 py-3 transition-all hover:-translate-y-0.5 hover:border-accent-500/50 hover:bg-slate-700';
    const icon = document.createElement('span');
    icon.className = 'flex items-center text-primary-400 transition-transform group-hover:scale-110';
    icon.appendChild(createIcon(action.icon, 18));
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
// بخش ۵: یادداشت‌های اخیر
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
  section.appendChild(createSectionHeader({ title: 'یادداشت‌های اخیر', action: viewAllBtn }));

  if (notes.length === 0) {
    section.appendChild(
      createEmptyState({
        icon: '',
        title: 'هنوز یادداشتی نداری',
        message: 'اولین یادداشتت را بساز و شروع به یادگیری کن!',
        actionLabel: 'ساخت اولین یادداشت',
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
    arrow.className = 'flex items-center text-slate-500 transition-all group-hover:-translate-x-1 group-hover:text-accent-400';
    arrow.innerHTML = iconHTML('back', 16);
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
// حالت کاربر جدید
// ============================================================
function createOnboarding(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'mx-auto max-w-3xl space-y-8';

  const hero = document.createElement('div');
  hero.className =
    'reveal relative overflow-hidden rounded-2xl border border-accent-500/30 ' +
    'bg-gradient-to-br from-accent-500/15 via-slate-800 to-slate-800 p-8 lg:p-10';
  const glow = document.createElement('div');
  glow.className = 'absolute -top-24 -end-24 w-72 h-72 rounded-full bg-accent-500/20 blur-3xl pointer-events-none';
  hero.appendChild(glow);

  const heroInner = document.createElement('div');
  heroInner.className = 'relative flex flex-col items-center gap-5 text-center sm:flex-row sm:text-start sm:gap-6';
  heroInner.appendChild(createStreakFlame(null));

  const heroText = document.createElement('div');
  const heroTitle = document.createElement('h1');
  heroTitle.className = 'mb-3 text-3xl font-black text-slate-100 lg:text-4xl';
  heroTitle.textContent = 'سفرت را شروع کن!';
  const heroDesc = document.createElement('p');
  heroDesc.className = 'leading-relaxed text-slate-300';
  heroDesc.textContent =
    'به دانش‌یار خوش آمدی! اینجا جایی است که متن‌هایت به دانش ماندگار تبدیل می‌شوند. با سه قدم ساده شروع کن:';
  heroText.appendChild(heroTitle);
  heroText.appendChild(heroDesc);
  heroInner.appendChild(heroText);
  hero.appendChild(heroInner);
  container.appendChild(hero);

  const steps = [
    { num: '۱', icon: 'notes', title: 'اولین یادداشتت را بساز', desc: 'جزوه یا متن درسی‌ات را اضافه کن', route: 'notes' },
    { num: '۲', icon: 'flashcards', title: 'فلش‌کارت بساز', desc: 'از یادداشتت، کارت‌های مرور بساز', route: 'flashcards' },
    { num: '۳', icon: 'flame', title: 'مرور روزانه را شروع کن', desc: 'با مرور هر روز، شعله‌ات را روشن نگه دار', route: 'flashcards' },
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
    iconEl.className = 'flex flex-shrink-0 items-center text-primary-400 transition-transform group-hover:scale-110';
    iconEl.appendChild(createIcon(step.icon, 28));
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
    arrow.className = 'flex items-center text-xl text-slate-500 transition-all group-hover:-translate-x-1 group-hover:text-accent-400';
    arrow.innerHTML = iconHTML('back', 20);
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
// بخش ۶: چالش‌های فعال
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
  title.className = 'flex items-center gap-2 font-bold text-slate-100 text-base';
  title.innerHTML = `${iconHTML('target', 18)} <span>چالش‌های فعال</span>`;
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
    icon.className = 'flex flex-shrink-0 items-center text-primary-400';
    icon.appendChild(createIcon('trophy', 22));
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
    lbl.className = 'flex items-center gap-1 text-xs text-slate-500';
    lbl.innerHTML = `${iconHTML('award', 12)} <span>روز</span>`;
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

// ============================================================
// View اصلی
// ============================================================
export async function createDashboardView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر داشبورد');
  const [streakStats, dbStats, heatmap, allNotes] = await Promise.all([
    getStreakService().getStreakStats(),
    getDatabase().getStats(),
    getStreakService().getHeatmap(120),
    getDatabase().getNotes(),
  ]);

  const container = document.createElement('div');
  container.className = 'mx-auto max-w-5xl space-y-8';

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
    const challengesWidget = await createChallengesWidget();
    if (challengesWidget) container.appendChild(challengesWidget);
  }

  return container;
}

export default createDashboardView;