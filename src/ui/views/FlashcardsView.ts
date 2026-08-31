/**
 * ============================================================
 * دانش‌یار پرو - FlashcardsView (نسخه‌ی ۶.)
 * ============================================================
 * ✅ بدون خط کهکشانی زیر عنوان‌ها (هدرهای سفارشی)
 * 🎖️ بج لول بازطراحی‌شده + نوار XP
 * 📊 نمودار هفته با ترک دیده‌بان + حالت خالیِ دوستانه
 * 🎨 چیپ‌های نوع مفهوم با رنگ‌های هماهنگ برند
 * 🔍 جستجوی مدیریت با تراز inline تضمینی
 * 🎮 مرور تمام‌صفحه + سوایپ + ویبره + سقف ۱۰۰ + کارنامه + AI
 * @module ui/views/FlashcardsView
 * @version 6.1.0
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getDatabase, type DbFlashcard } from '@/core/Database';
import { getSRS, QUALITY_LEVELS, type Flashcard as SRSCard, type ConceptType } from '@/services/SRS';
import { estimateCardDifficulty, getWeakTopicInsight, heuristicDifficulty } from '@/services/AIFlashcardService';
import { isPremium } from '@/services/Premium';
import { getReferralLink } from '@/services/ReferralService';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '@/ui/components/Button';
import { createInput, createTextarea, createFormGroup } from '@/ui/components/Input';
import { getModal } from '@/ui/components/Modal';
import { getToast } from '@/ui/components/Toast';
import { createEmptyState } from '@/ui/components/Card';
import { toPersianDigits } from '@/utils/dateFormatter';
import { createIcon, iconHTML } from '@/services/IconService';

const logger = getLogger().module('FlashcardsView');
const srs = getSRS();

type Phase = 'dashboard' | 'manage' | 'cap';
type ReviewMode = 'due' | 'new' | 'hard' | 'all';
const DRAFT_KEY = 'daneshyar_card_draft';
const XP_KEY = 'daneshyar_xp';
const DAILY_GOAL = 20;
const FREE_DAILY_CAP = 100;
const GOLD = '#fbbf24';

const CONCEPT_TYPES: { value: ConceptType; label: string }[] = [
  { value: 'definition', label: 'تعریف' },
  { value: 'formula', label: 'فرمول' },
  { value: 'math', label: 'ریاضی' },
  { value: 'concept', label: 'مفهوم' },
  { value: 'fact', label: 'حقیقت' },
  { value: 'default', label: 'پیش‌فرض' },
];
/** رنگ‌های هماهنگ برند برای هر نوع مفهوم */
const CONCEPT_STYLES: Record<ConceptType, { chip: string; ring: string; dot: string }> = {
  definition: { chip: 'bg-primary-500/10 text-primary-300', ring: 'ring-primary-400/60', dot: 'bg-primary-400' },
  formula: { chip: 'bg-accent-500/10 text-accent-300', ring: 'ring-accent-400/60', dot: 'bg-accent-400' },
  math: { chip: 'bg-sky-500/10 text-sky-300', ring: 'ring-sky-400/60', dot: 'bg-sky-400' },
  concept: { chip: 'bg-violet-500/10 text-violet-300', ring: 'ring-violet-400/60', dot: 'bg-violet-400' },
  fact: { chip: 'bg-teal-500/10 text-teal-300', ring: 'ring-teal-400/60', dot: 'bg-teal-400' },
  default: { chip: 'bg-slate-500/10 text-slate-300', ring: 'ring-slate-400/60', dot: 'bg-slate-400' },
};

const RATINGS = [
  { quality: QUALITY_LEVELS.INCORRECT, label: 'نمی‌دانم', icon: 'close', xp: 2, dir: 'left' as const,
    cls: 'bg-red-500/15 border-red-500/50 text-red-300 hover:bg-red-500/25' },
  { quality: QUALITY_LEVELS.CORRECT_HARD, label: 'سخت', icon: 'refresh', xp: 5, dir: 'up' as const,
    cls: 'bg-orange-500/15 border-orange-500/50 text-orange-300 hover:bg-orange-500/25' },
  { quality: QUALITY_LEVELS.PERFECT, label: 'آسان', icon: 'check', xp: 10, dir: 'right' as const,
    cls: 'bg-green-500/15 border-green-500/50 text-green-300 hover:bg-green-500/25' },
];

function getXP(): number { try { return parseInt(localStorage.getItem(XP_KEY) || '0', 10) || 0; } catch { return 0; } }
function addXP(n: number): number { const x = getXP() + n; try { localStorage.setItem(XP_KEY, String(x)); } catch { /* ignore */ } return x; }
const levelOf = (xp: number): number => Math.floor(xp / 100) + 1;

function getCardStatus(card: SRSCard): { icon: string; label: string; chip: string } {
  const now = new Date();
  if (card.relearnStep != null) return { icon: 'refresh', label: 'یادگیری مجدد', chip: 'bg-orange-500/15 text-orange-300' };
  if (!card.lastReview) return { icon: 'sparkles', label: 'جدید', chip: 'bg-blue-500/15 text-blue-300' };
  if (new Date(card.nextReview) <= now) return { icon: 'flame', label: 'آماده مرور', chip: 'bg-red-500/15 text-red-300' };
  if (card.mature || card.interval >= 21) return { icon: 'star', label: 'بالغ', chip: 'bg-purple-500/15 text-purple-300' };
  return { icon: 'books', label: 'یادگیری', chip: 'bg-accent-500/15 text-accent-300' };
}

async function currentStreak(): Promise<number> {
  const days = await getDatabase().getUniqueStudyDays();
  const set = new Set(Array.from(days).map((d) => new Date(d).toDateString()));
  let streak = 0;
  const cursor = new Date();
  if (!set.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (set.has(cursor.toDateString())) { streak++; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}

/** هدر بخش بدون خط کهکشانی */
function sectionHead(title: string, icon: string): HTMLElement {
  const h = document.createElement('div');
  h.className = 'flex items-center gap-2';
  h.appendChild(createIcon(icon, 18, 'text-primary-400'));
  const t = document.createElement('h3');
  t.className = 'font-bold text-slate-100';
  t.textContent = title;
  h.appendChild(t);
  return h;
}

/** جستجوی مدیریت با تراز inline تضمینی */
function createManageSearch(onSearch: (q: string) => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.position = 'relative';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'جستجو در کارت‌ها...';
  input.className = 'input';
  input.style.paddingInlineStart = '46px';
  input.style.paddingInlineEnd = '16px';
  const icon = createIcon('search', 18, 'text-slate-400');
  icon.style.position = 'absolute';
  icon.style.insetInlineStart = '14px';
  icon.style.top = '50%';
  icon.style.transform = 'translateY(-50%)';
  icon.style.display = 'flex';
  icon.style.pointerEvents = 'none';
  let timer: ReturnType<typeof setTimeout> | null = null;
  input.addEventListener('input', () => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => onSearch(input.value), 250);
  });
  wrap.appendChild(input);
  wrap.appendChild(icon);
  return wrap;
}

function burstConfetti(): void {
  const c = document.createElement('div');
  c.style.cssText = 'position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:90;';
  const colors = ['#6366f1', '#fbbf24', '#10b981', '#f472b6', '#38bdf8'];
  for (let i = 0; i < 24; i++) {
    const p = document.createElement('span');
    const color = colors[i % colors.length] ?? '#fbbf24';
    p.style.cssText = `position:absolute;top:-14px;width:8px;height:12px;border-radius:2px;background:${color};left:${Math.random() * 100}%;`;
    c.appendChild(p);
    p.animate(
      [{ transform: 'translateY(0) rotate(0deg)', opacity: 1 }, { transform: `translateY(105vh) rotate(${540 + Math.random() * 360}deg)`, opacity: 0.9 }],
      { duration: 1400 + Math.random() * 600, delay: Math.random() * 400, easing: 'ease-in', fill: 'forwards' }
    );
  }
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 2400);
}

function createMicButton(onText: (t: string) => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mic-btn flex items-center justify-center';
  btn.setAttribute('aria-label', 'تایپ صوتی');
  btn.innerHTML = iconHTML('mic', 18);
  btn.addEventListener('click', () => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    const SR = (w.SpeechRecognition || w.webkitSpeechRecognition) as (new () => {
      lang: string; interimResults: boolean;
      onresult: (e: { results: ArrayLike<{ 0: { transcript: string } }> }) => void;
      onend: () => void; onerror: () => void; start: () => void;
    }) | undefined;
    if (!SR) { getToast().info('تایپ صوتی در این مرورگر پشتیبانی نمی‌شود'); return; }
    try {
      const rec = new SR();
      rec.lang = 'fa-IR';
      rec.interimResults = false;
      btn.classList.add('recording');
      rec.onresult = (e) => { const r = e.results[0]; if (r) onText(r[0]?.transcript ?? ''); };
      rec.onend = () => btn.classList.remove('recording');
      rec.onerror = () => { btn.classList.remove('recording'); getToast().warning('خطا در ضبط صدا'); };
      rec.start();
      getToast().info('در حال گوش دادن... صحبت کن');
    } catch { getToast().warning('تایپ صوتی در دسترس نیست'); }
  });
  return btn;
}

export async function createFlashcardsView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر فلش‌کارت v6.1');
  const container = document.createElement('div');
  container.className = 'mx-auto max-w-3xl space-y-6';

  let cards: SRSCard[] = (await getDatabase().getFlashcards()) as unknown as SRSCard[];
  let phase: Phase = 'dashboard';
  let reviewQueue: SRSCard[] = [];
  let reviewMode: ReviewMode = 'due';
  let practiceOnly = false;
  let currentIndex = 0;
  let isFlipped = false;
  let combo = 0;
  let rating = false;
  let reviewOverlay: HTMLElement | null = null;
  let currentCardEl: HTMLElement | null = null;
  let flipUI: (() => void) | null = null;
  let sessionStats = { reviewed: 0, correct: 0, wrong: 0, xp: 0, startTime: 0, startLevel: 1 };
  let lapsesByTopic = new Map<string, number>();

  const refresh = async (): Promise<void> => { cards = (await getDatabase().getFlashcards()) as unknown as SRSCard[]; };
  const capNow = (): boolean => !isPremium() && srs.getStats(cards).reviewedToday >= FREE_DAILY_CAP;

  const render = (): void => {
    container.innerHTML = '';
    if (phase === 'dashboard') container.appendChild(renderDashboard());
    else if (phase === 'cap') container.appendChild(renderCap());
    else container.appendChild(renderManage());
  };

  function buildQueue(mode: ReviewMode): SRSCard[] {
    if (mode === 'due') return srs.buildSmartQueue(cards, { newLimit: 0, dueCap: 100 });
    if (mode === 'new') return srs.getNewCards(cards);
    if (mode === 'hard') return cards.filter((c) => srs.isWeak(c)).sort((a, b) => (b.lapses ?? 0) - (a.lapses ?? 0));
    return [...cards].sort(() => Math.random() - 0.5);
  }
  function smartMode(): ReviewMode {
    if (buildQueue('due').length > 0) return 'due';
    if (buildQueue('new').length > 0) return 'new';
    if (buildQueue('hard').length > 0) return 'hard';
    return 'all';
  }
  function startReview(mode: ReviewMode, practice = false): void {
    if (!practice && capNow()) { phase = 'cap'; render(); return; }
    const q = buildQueue(mode);
    if (q.length === 0) { getToast().info('کارتی برای این حالت نیست'); return; }
    reviewMode = mode; practiceOnly = practice; reviewQueue = q; currentIndex = 0; isFlipped = false; combo = 0;
    sessionStats = { reviewed: 0, correct: 0, wrong: 0, xp: 0, startTime: Date.now(), startLevel: levelOf(getXP()) };
    lapsesByTopic = new Map<string, number>();
    openReviewOverlay();
  }

  function openReviewOverlay(): void {
    closeReviewOverlay();
    reviewOverlay = document.createElement('div');
    reviewOverlay.className = 'fixed inset-0 z-[75] bg-slate-900 overflow-y-auto';
    reviewOverlay.style.overscrollBehavior = 'contain';
    document.body.appendChild(reviewOverlay);
    document.body.style.overflow = 'hidden';
    renderReviewFrame();
  }
  function closeReviewOverlay(): void {
    if (reviewOverlay) { reviewOverlay.remove(); reviewOverlay = null; }
    document.body.style.overflow = '';
    currentCardEl = null; flipUI = null;
  }
  async function confirmExit(): Promise<void> {
    const ok = await getModal().confirm('خروج از مرور', 'پیشرفت این جلسه ذخیره شد.', { confirmText: 'خروج' });
    if (ok) { closeReviewOverlay(); phase = 'dashboard'; render(); }
  }

  document.addEventListener('keydown', (e) => {
    if (!reviewOverlay) return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    if (e.key === 'Escape') { void confirmExit(); return; }
    if (currentIndex >= reviewQueue.length) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (flipUI) flipUI(); }
    else if (e.key === '1' && isFlipped) void rateCard(QUALITY_LEVELS.INCORRECT, 2, 'left');
    else if (e.key === '2' && isFlipped) void rateCard(QUALITY_LEVELS.CORRECT_HARD, 5, 'up');
    else if (e.key === '3' && isFlipped) void rateCard(QUALITY_LEVELS.PERFECT, 10, 'right');
  });

  // ── داشبورد ──
  function renderDashboard(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'space-y-6';
    const stats = srs.getStats(cards);
    const xp = getXP(); const level = levelOf(xp);

    // هدر (بدون خط کهکشانی)
    const header = document.createElement('div');
    const titleRow = document.createElement('div');
    titleRow.className = 'flex items-center gap-3';
    const headIcon = document.createElement('div');
    headIcon.className = 'w-12 h-12 rounded-xl bg-primary-500/15 text-primary-300 flex items-center justify-center';
    headIcon.appendChild(createIcon('flashcards', 26));
    titleRow.appendChild(headIcon);
    const h1 = document.createElement('h1');
    h1.className = 'text-2xl sm:text-3xl font-black text-slate-100';
    h1.textContent = 'فلش‌کارت‌ها';
    titleRow.appendChild(h1);
    header.appendChild(titleRow);
    const statsLine = document.createElement('p');
    statsLine.className = 'mt-2 text-sm text-slate-400';
    statsLine.textContent = `${toPersianDigits(String(stats.total))} کارت • ${toPersianDigits(String(stats.due))} آماده مرور • ${toPersianDigits(String(stats.maturity))}٪ بالغ`;
    header.appendChild(statsLine);
    wrap.appendChild(header);

    // کارت امروز: حلقه‌ی هدف + لول بازطراحی‌شده + استریک
    const todayCard = document.createElement('div');
    todayCard.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4';
    const tRow = document.createElement('div');
    tRow.className = 'flex items-center gap-4';
    // حلقه‌ی SVG هدف
    const p = Math.min(stats.reviewedToday / DAILY_GOAL, 1);
    const R = 30; const C = 2 * Math.PI * R;
    const ring = document.createElement('div');
    ring.className = 'relative flex-shrink-0';
    ring.innerHTML = `<svg width="76" height="76" viewBox="0 0 76 76"><circle cx="38" cy="38" r="${R}" fill="none" stroke="#334155" stroke-width="7"/><circle cx="38" cy="38" r="${R}" fill="none" stroke="${GOLD}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p)}" transform="rotate(-90 38 38)"/></svg>`;
    const ringTxt = document.createElement('div');
    ringTxt.className = 'absolute inset-0 flex items-center justify-center text-sm font-black text-slate-100';
    ringTxt.textContent = `${toPersianDigits(String(Math.min(stats.reviewedToday, DAILY_GOAL)))}/${toPersianDigits(String(DAILY_GOAL))}`;
    ring.appendChild(ringTxt);
    tRow.appendChild(ring);
    // لول بازطراحی‌شده
    const midCol = document.createElement('div');
    midCol.className = 'flex-1 min-w-0 space-y-2';
    const lvlRow = document.createElement('div');
    lvlRow.className = 'flex items-center gap-3';
    const badge = document.createElement('div');
    badge.className = 'relative w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-lg font-black text-white ring-4 ring-primary-500/25 shadow-lg shadow-primary-500/30 flex-shrink-0';
    badge.textContent = toPersianDigits(String(level));
    const dot = document.createElement('span');
    dot.className = 'absolute -top-0.5 -end-0.5 w-4 h-4 rounded-full bg-accent-400 border-2 border-slate-800';
    badge.appendChild(dot);
    lvlRow.appendChild(badge);
    const txts = document.createElement('div');
    txts.className = 'flex-1 min-w-0 space-y-1';
    const t1 = document.createElement('div');
    t1.className = 'font-bold text-slate-100';
    t1.textContent = `سطح ${toPersianDigits(String(level))}`;
    txts.appendChild(t1);
    const xpBar = document.createElement('div');
    xpBar.className = 'h-1.5 w-full max-w-[160px] bg-slate-900 rounded-full overflow-hidden';
    const xpFill = document.createElement('div');
    xpFill.className = 'h-full bg-gradient-to-l from-primary-400 to-primary-500';
    xpFill.style.width = `${xp % 100}%`;
    xpBar.appendChild(xpFill);
    txts.appendChild(xpBar);
    const t2 = document.createElement('div');
    t2.className = 'text-[11px] text-slate-400';
    t2.textContent = `${toPersianDigits(String(xp % 100))}/۱۰۰ XP تا سطح بعد`;
    txts.appendChild(t2);
    lvlRow.appendChild(txts);
    midCol.appendChild(lvlRow);
    const streakLine = document.createElement('div');
    streakLine.className = 'flex items-center gap-1.5 text-sm text-slate-300';
    void currentStreak().then((st) => {
      streakLine.innerHTML = '';
      streakLine.appendChild(createIcon('flame', 16, st > 0 ? 'text-accent-400' : 'text-slate-500'));
      const s = document.createElement('span');
      s.textContent = st > 0 ? `${toPersianDigits(String(st))} روز پشت‌سرهم — عالی ادامه بده!` : 'امروز یک شروع تازه است!';
      streakLine.appendChild(s);
    });
    midCol.appendChild(streakLine);
    tRow.appendChild(midCol);
    todayCard.appendChild(tRow);
    // متر سقف رایگان
    if (!isPremium()) {
      const cap = document.createElement('div');
      cap.className = 'mt-3 flex items-center gap-2 text-xs text-slate-500';
      cap.appendChild(createIcon('award', 14, 'text-accent-400'));
      const ct = document.createElement('span');
      ct.className = 'flex-1';
      ct.textContent = `مرور برنامه‌ریزی‌شده امروز: ${toPersianDigits(String(Math.min(stats.reviewedToday, FREE_DAILY_CAP)))}/${toPersianDigits(String(FREE_DAILY_CAP))}`;
      cap.appendChild(ct);
      const up = document.createElement('button');
      up.type = 'button';
      up.className = 'font-bold text-accent-300 hover:text-accent-200';
      up.textContent = 'پریمیوم';
      up.addEventListener('click', () => { void import('@/core/Router').then((m) => m.getRouter().navigate('premium')); });
      cap.appendChild(up);
      todayCard.appendChild(cap);
    }
    wrap.appendChild(todayCard);

    // CTA طلایی
    const mode = smartMode();
    const modeLabels: Record<ReviewMode, string> = { due: 'مرور هوشمند', new: 'کارت‌های جدید', hard: 'کارت‌های سخت', all: 'تمرین آزاد' };
    const queueCount = buildQueue(mode).length;
    const cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'w-full min-h-14 rounded-xl bg-gradient-to-l from-accent-400 to-accent-500 text-slate-900 font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-accent-500/25 active:scale-[.98] transition';
    cta.innerHTML = iconHTML(queueCount > 0 ? 'play' : 'add', 20);
    const ctaT = document.createElement('span');
    ctaT.textContent = queueCount > 0 ? `${modeLabels[mode]} (${toPersianDigits(String(queueCount))} کارت)` : 'ساخت اولین کارت';
    cta.appendChild(ctaT);
    cta.addEventListener('click', () => { if (queueCount > 0) startReview(mode); else openCardModal(null); });
    wrap.appendChild(cta);

    const modeRow = document.createElement('div');
    modeRow.className = 'chip-row';
    (Object.keys(modeLabels) as ReviewMode[]).forEach((m) => {
      const c = buildQueue(m).length;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'cat-chip' + (m === mode ? ' active' : '');
      chip.textContent = `${modeLabels[m]} (${toPersianDigits(String(c))})`;
      chip.addEventListener('click', () => startReview(m));
      modeRow.appendChild(chip);
    });
    wrap.appendChild(modeRow);

    // سه مینی‌آمار
    const mini = document.createElement('div');
    mini.className = 'grid grid-cols-3 gap-2';
    [
      { v: `${toPersianDigits(String(stats.retentionRate))}٪`, l: 'یادآوری' },
      { v: `${toPersianDigits(String(stats.maturity))}٪`, l: 'بالغ' },
      { v: toPersianDigits(String(buildQueue('hard').length)), l: 'کارت سخت' },
    ].forEach((s) => {
      const b = document.createElement('div');
      b.className = 'bg-slate-800 border border-slate-700 rounded-xl p-3 text-center';
      const v = document.createElement('div'); v.className = 'text-lg font-black text-primary-300'; v.textContent = s.v;
      const l = document.createElement('div'); l.className = 'text-xs text-slate-400 mt-1'; l.textContent = s.l;
      b.appendChild(v); b.appendChild(l);
      mini.appendChild(b);
    });
    wrap.appendChild(mini);

    // پیشرفت هفته (با ترک دیده‌بان + حالت خالی)
    const weekBox = document.createElement('div');
    weekBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3';
    const weekHead = document.createElement('div');
    weekHead.className = 'flex items-center justify-between';
    weekHead.appendChild(sectionHead('پیشرفت این هفته', 'trending'));
    weekHead.appendChild(createButton({ label: 'کارنامه', variant: BUTTON_VARIANTS.GHOST, size: BUTTON_SIZES.SM, iconHtml: iconHTML('share', 14), onClick: () => { void shareReport(level, stats.total, stats.reviewedToday); } }));
    weekBox.appendChild(weekHead);
    void (async () => {
      const sessions = await getDatabase().getStudySessions();
      const days: { label: string; count: number; today: boolean }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
        const next = new Date(d); next.setDate(next.getDate() + 1);
        const count = sessions.filter((s) => (s.type === 'flashcard' || s.type === 'flashcards') && new Date(s.date) >= d && new Date(s.date) < next).length;
        days.push({ label: i === 0 ? 'امروز' : d.toLocaleDateString('fa-IR', { weekday: 'short' }), count, today: i === 0 });
      }
      const totalWeek = days.reduce((s, d) => s + d.count, 0);
      if (totalWeek === 0) {
        const hint = document.createElement('p');
        hint.className = 'text-xs text-slate-500';
        hint.textContent = 'این نمودار با اولین مرورهای هفته روشن می‌شود!';
        weekBox.appendChild(hint);
      }
      const max = Math.max(...days.map((x) => x.count), 1);
      const bars = document.createElement('div');
      bars.className = 'flex items-end justify-between gap-2';
      days.forEach((d) => {
        const col = document.createElement('div'); col.className = 'flex-1 flex flex-col items-center gap-1';
        const track = document.createElement('div');
        track.className = 'w-full h-20 bg-slate-700/30 rounded-md overflow-hidden flex items-end';
        const fillDiv = document.createElement('div');
        fillDiv.className = `w-full rounded-t ${d.today ? 'bg-accent-400' : 'bg-primary-500/80'}`;
        fillDiv.style.height = `${Math.max((d.count / max) * 100, d.count > 0 ? 8 : 2)}%`;
        track.appendChild(fillDiv);
        const lb = document.createElement('div'); lb.className = 'text-[10px] text-slate-500'; lb.textContent = d.label;
        col.appendChild(track); col.appendChild(lb); bars.appendChild(col);
      });
      weekBox.appendChild(bars);
    })();
    wrap.appendChild(weekBox);

    // کارت‌های سخت (بدون خط کهکشانی)
    const hard = buildQueue('hard').slice(0, 4);
    if (hard.length > 0) {
      const hardBox = document.createElement('div');
      hardBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3';
      hardBox.appendChild(sectionHead('کارت‌های سخت تو', 'zap'));
      hard.forEach((c) => {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg';
        const q = document.createElement('div'); q.className = 'flex-1 text-sm text-slate-200 line-clamp-1'; q.textContent = c.front;
        const laps = document.createElement('span'); laps.className = 'text-xs text-red-400 whitespace-nowrap';
        laps.textContent = `${toPersianDigits(String(c.lapses ?? 0))} بار فراموشی`;
        row.appendChild(q); row.appendChild(laps);
        hardBox.appendChild(row);
      });
      hardBox.appendChild(createButton({ label: 'مرور کارت‌های سخت', variant: BUTTON_VARIANTS.DANGER, size: BUTTON_SIZES.SM, onClick: () => startReview('hard') }));
      wrap.appendChild(hardBox);
    }

    const actions = document.createElement('div');
    actions.className = 'grid grid-cols-2 gap-3';
    actions.appendChild(createButton({ label: 'مدیریت کارت‌ها', variant: BUTTON_VARIANTS.SECONDARY, iconHtml: iconHTML('layers', 16), onClick: () => { phase = 'manage'; render(); } }));
    actions.appendChild(createButton({ label: 'کارت جدید', variant: BUTTON_VARIANTS.PRIMARY, iconHtml: iconHTML('add', 16), onClick: () => openCardModal(null) }));
    wrap.appendChild(actions);

    if (cards.length === 0) {
      wrap.appendChild(createEmptyState({ icon: 'flashcards', title: 'هنوز کارتی نداری', message: 'ساخت کارت از هر چیزی آسان‌تر است — حتی با صدا!', actionLabel: 'ساخت اولین کارت', onAction: () => openCardModal(null) }));
    }
    return wrap;
  }

  async function shareReport(level: number, total: number, today: number): Promise<void> {
    const link = await getReferralLink();
    const text = `کارنامه‌ی من در دانش‌یار پرو 📚\nسطح ${toPersianDigits(String(level))} • ${toPersianDigits(String(total))} کارت • ${toPersianDigits(String(today))} مرور امروز\nتو هم رایگان شروع کن: ${link ?? ''}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'دانش‌یار پرو', text }); return; } catch { /* cancelled */ }
    }
    try { await navigator.clipboard.writeText(text); getToast().success('کارنامه کپی شد؛ بفرست برای دوستت'); } catch { getToast().error('کپی ممکن نشد'); }
  }

  function renderCap(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'text-center space-y-6 py-10 max-w-md mx-auto';
    const iw = document.createElement('div');
    iw.className = 'flex justify-center text-accent-400';
    iw.appendChild(createIcon('award', 64));
    wrap.appendChild(iw);
    const t = document.createElement('h1');
    t.className = 'text-2xl font-black text-slate-100';
    t.textContent = 'سهم امروزت کامل شد!';
    wrap.appendChild(t);
    const p = document.createElement('p');
    p.className = 'text-sm text-slate-400 leading-relaxed';
    p.textContent = `نسخه‌ی رایگان تا ${toPersianDigits(String(FREE_DAILY_CAP))} مرور برنامه‌ریزی‌شده در روز اجازه دارد. با پریمیوم بدون محدودیت مرور کن — یا همین حالا در حالت تمرین ادامه بده.`;
    wrap.appendChild(p);
    const btns = document.createElement('div');
    btns.className = 'flex flex-col gap-3';
    btns.appendChild(createButton({ label: 'ارتقا به پریمیوم', variant: BUTTON_VARIANTS.ACCENT, iconHtml: iconHTML('award', 16), onClick: () => { void import('@/core/Router').then((m) => m.getRouter().navigate('premium')); } }));
    btns.appendChild(createButton({ label: 'ادامه در حالت تمرین (رایگان)', variant: BUTTON_VARIANTS.SECONDARY, iconHtml: iconHTML('refresh', 16), onClick: () => startReview(smartMode(), true) }));
    wrap.appendChild(btns);
    return wrap;
  }

  // ── قاب مرور ──
  function renderReviewFrame(): void {
    if (!reviewOverlay) return;
    reviewOverlay.innerHTML = '';
    if (currentIndex >= reviewQueue.length) { reviewOverlay.appendChild(renderReviewComplete()); return; }
    const card = reviewQueue[currentIndex];
    if (!card) { reviewOverlay.appendChild(renderReviewComplete()); return; }
    const wrap = document.createElement('div');
    wrap.className = 'mx-auto max-w-2xl px-3 pt-3 pb-28 space-y-4';

    const hud = document.createElement('div');
    hud.className = 'bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl p-3';
    const hudRow = document.createElement('div');
    hudRow.className = 'flex items-center justify-between gap-2 mb-2';
    const exitBtn = document.createElement('button');
    exitBtn.type = 'button';
    exitBtn.className = 'min-w-11 min-h-11 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-100';
    exitBtn.innerHTML = iconHTML('close', 18);
    exitBtn.setAttribute('aria-label', 'خروج');
    exitBtn.addEventListener('click', () => { void confirmExit(); });
    hudRow.appendChild(exitBtn);
    const mid = document.createElement('div');
    mid.className = 'flex items-center gap-2';
    const pos = document.createElement('span');
    pos.className = 'text-xs text-slate-400';
    pos.textContent = `${toPersianDigits(String(currentIndex + 1))}/${toPersianDigits(String(reviewQueue.length))}`;
    mid.appendChild(pos);
    if (practiceOnly) {
      const pr = document.createElement('span');
      pr.className = 'text-xs text-slate-400 bg-slate-700/50 rounded-full px-2 py-0.5';
      pr.textContent = 'تمرین';
      mid.appendChild(pr);
    }
    if (card.relearnStep != null) {
      const rl = document.createElement('span');
      rl.className = 'flex items-center gap-1 text-xs text-orange-300 bg-orange-500/10 rounded-full px-2 py-0.5';
      rl.innerHTML = iconHTML('refresh', 12);
      const rt = document.createElement('span'); rt.textContent = 'یادگیری مجدد';
      rl.appendChild(rt);
      mid.appendChild(rl);
    }
    hudRow.appendChild(mid);
    const right = document.createElement('div');
    right.className = 'flex items-center gap-2';
    if (combo > 1) {
      const cb = document.createElement('span');
      cb.className = 'flex items-center gap-1 text-sm font-bold text-accent-400';
      cb.innerHTML = iconHTML('flame', 14);
      const ct = document.createElement('span'); ct.textContent = `×${toPersianDigits(String(combo))}`;
      cb.appendChild(ct);
      right.appendChild(cb);
    }
    const xpPill = document.createElement('span');
    xpPill.className = 'text-xs font-bold text-primary-300 bg-primary-500/10 rounded-full px-2 py-0.5';
    xpPill.textContent = `+${toPersianDigits(String(sessionStats.xp))} XP`;
    right.appendChild(xpPill);
    hudRow.appendChild(right);
    hud.appendChild(hudRow);
    const bar = document.createElement('div');
    bar.className = 'h-1.5 bg-slate-900 rounded-full overflow-hidden';
    const fill = document.createElement('div');
    fill.className = 'h-full bg-gradient-to-l from-accent-400 to-primary-500 transition-all duration-500';
    fill.style.width = `${(currentIndex / reviewQueue.length) * 100}%`;
    bar.appendChild(fill);
    hud.appendChild(bar);
    wrap.appendChild(hud);

    const stage = document.createElement('div');
    stage.className = 'relative';
    const mkHint = (type: 'easy' | 'wrong' | 'hard', label: string): HTMLElement => {
      const h = document.createElement('div');
      h.textContent = label;
      h.style.cssText = 'position:absolute;display:flex;align-items:center;justify-content:center;padding:.5rem .9rem;border-radius:9999px;font-size:.8rem;font-weight:800;opacity:0;pointer-events:none;z-index:5;';
      if (type === 'easy') h.style.cssText += 'right:8px;top:50%;transform:translateY(-50%);background:rgba(16,185,129,.2);color:#6ee7b7;border:1px solid rgba(16,185,129,.5);';
      if (type === 'wrong') h.style.cssText += 'left:8px;top:50%;transform:translateY(-50%);background:rgba(239,68,68,.2);color:#fca5a5;border:1px solid rgba(239,68,68,.5);';
      if (type === 'hard') h.style.cssText += 'left:50%;top:8px;transform:translateX(-50%);background:rgba(245,158,11,.2);color:#fcd34d;border:1px solid rgba(245,158,11,.5);';
      stage.appendChild(h);
      return h;
    };
    const hintEasy = mkHint('easy', 'آسان');
    const hintWrong = mkHint('wrong', 'نمی‌دانم');
    const hintHard = mkHint('hard', 'سخت');

    const card3d = document.createElement('div');
    card3d.className = 'flashcard-3d cursor-pointer';
    card3d.style.height = '320px';
    if (combo >= 3) {
      card3d.style.boxShadow = '0 0 0 2px rgba(251,191,36,.55), 0 0 24px rgba(251,191,36,.3)';
      card3d.style.borderRadius = '1rem';
    }
    const inner = document.createElement('div');
    inner.className = 'flashcard-inner' + (isFlipped ? ' flipped' : '');
    const front = document.createElement('div');
    front.className = 'flashcard-face flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-primary-500 to-primary-600 text-white';
    const fT = document.createElement('div'); fT.className = 'text-xl font-bold leading-relaxed whitespace-pre-wrap'; fT.textContent = card.front;
    const fH = document.createElement('div'); fH.className = 'absolute bottom-4 text-sm opacity-60'; fH.textContent = 'ضربه بزن تا پاسخ را ببینی';
    front.appendChild(fT); front.appendChild(fH);
    const back = document.createElement('div');
    back.className = 'flashcard-face flashcard-back flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-accent-300 to-accent-500 text-slate-900';
    const bT = document.createElement('div'); bT.className = 'text-lg font-medium leading-relaxed whitespace-pre-wrap'; bT.textContent = card.back;
    back.appendChild(bT);
    inner.appendChild(front); inner.appendChild(back);
    card3d.appendChild(inner);
    stage.appendChild(card3d);
    wrap.appendChild(stage);
    currentCardEl = card3d;

    const legend = document.createElement('p');
    legend.className = 'text-center text-xs text-slate-600';
    legend.textContent = isFlipped ? 'سوایپ → آسان · ← نمی‌دانم · ↑ سخت' : 'ضربه = چرخش کارت';
    wrap.appendChild(legend);

    flipUI = (): void => {
      isFlipped = !isFlipped;
      inner.classList.toggle('flipped', isFlipped);
      legend.textContent = isFlipped ? 'سوایپ → آسان · ← نمی‌دانم · ↑ سخت' : 'ضربه = چرخش کارت';
    };
    let suppressClick = false;
    card3d.addEventListener('click', () => { if (suppressClick) { suppressClick = false; return; } if (flipUI) flipUI(); });

    let sx = 0; let sy = 0; let dx = 0; let dy = 0; let dragging = false;
    card3d.addEventListener('touchstart', (e) => {
      if (!isFlipped) return;
      dragging = true;
      sx = e.touches[0]?.clientX ?? 0; sy = e.touches[0]?.clientY ?? 0; dx = 0; dy = 0;
      card3d.style.transition = 'none';
    }, { passive: true });
    card3d.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      dx = (e.touches[0]?.clientX ?? 0) - sx;
      dy = (e.touches[0]?.clientY ?? 0) - sy;
      card3d.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.05}deg)`;
      hintEasy.style.opacity = dx > 0 ? String(Math.min(dx / 90, 1)) : '0';
      hintWrong.style.opacity = dx < 0 ? String(Math.min(-dx / 90, 1)) : '0';
      hintHard.style.opacity = dy < 0 && Math.abs(dy) > Math.abs(dx) ? String(Math.min(-dy / 90, 1)) : '0';
    }, { passive: true });
    card3d.addEventListener('touchend', () => {
      if (!dragging) return;
      dragging = false;
      card3d.style.transition = '';
      card3d.style.transform = '';
      hintEasy.style.opacity = '0'; hintWrong.style.opacity = '0'; hintHard.style.opacity = '0';
      if (Math.abs(dx) > 90 || (dy < -90 && Math.abs(dy) > Math.abs(dx))) suppressClick = true;
      if (dx > 90) void rateCard(QUALITY_LEVELS.PERFECT, 10, 'right');
      else if (dx < -90) void rateCard(QUALITY_LEVELS.INCORRECT, 2, 'left');
      else if (dy < -90 && Math.abs(dy) > Math.abs(dx)) void rateCard(QUALITY_LEVELS.CORRECT_HARD, 5, 'up');
    });

    const ratingWrap = document.createElement('div');
    ratingWrap.className = 'fixed bottom-3 inset-x-3 z-10 mx-auto max-w-2xl grid grid-cols-3 gap-2 rounded-2xl bg-slate-900/90 backdrop-blur p-2 border border-slate-700' + (isFlipped ? '' : ' hidden');
    RATINGS.forEach((r) => {
      const btn = document.createElement('button');
      btn.className = `border-2 rounded-xl p-3 text-center transition-all min-h-14 ${r.cls}`;
      const ic = document.createElement('div');
      ic.className = 'flex justify-center mb-1';
      ic.innerHTML = iconHTML(r.icon, 20);
      const lb = document.createElement('div'); lb.className = 'font-bold text-sm'; lb.textContent = r.label;
      btn.appendChild(ic); btn.appendChild(lb);
      btn.addEventListener('click', () => { void rateCard(r.quality, r.xp, r.dir); });
      ratingWrap.appendChild(btn);
    });
    const origFlip = flipUI;
    flipUI = (): void => { origFlip(); ratingWrap.classList.toggle('hidden', !isFlipped); };

    reviewOverlay.appendChild(wrap);
    reviewOverlay.appendChild(ratingWrap);
  }

  async function rateCard(quality: number, xpBase: number, dir: 'left' | 'right' | 'up'): Promise<void> {
    const card = reviewQueue[currentIndex];
    if (!card || rating) return;
    rating = true;
    if (currentCardEl) {
      const tx = dir === 'right' ? 340 : dir === 'left' ? -340 : 0;
      const ty = dir === 'up' ? -340 : 0;
      currentCardEl.animate(
        [{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: `translate(${tx}px, ${ty}px) rotate(${tx * 0.05}deg)`, opacity: 0 }],
        { duration: 220, easing: 'ease-in' }
      );
      navigator.vibrate?.(15);
      await new Promise((r) => setTimeout(r, 200));
    }
    const isPractice = practiceOnly || (reviewMode === 'all' && new Date(card.nextReview) > new Date() && !!card.lastReview);
    if (!practiceOnly && (!isPractice || quality < 3)) {
      const updated = srs.schedule(card, quality);
      await getDatabase().updateFlashcard(card.id, updated as unknown as Partial<DbFlashcard>);
    }
    await getDatabase().logStudySession('flashcard', { cardId: card.id, quality });
    if (quality < 3) lapsesByTopic.set(card.topic || 'general', (lapsesByTopic.get(card.topic || 'general') ?? 0) + 1);
    combo = quality >= 3 ? combo + 1 : 0;
    const gained = xpBase + (combo > 1 ? combo : 0);
    addXP(gained);
    sessionStats.reviewed++; sessionStats.xp += gained;
    if (quality >= 3) sessionStats.correct++; else sessionStats.wrong++;
    currentIndex++; isFlipped = false;
    await refresh();
    rating = false;
    renderReviewFrame();
  }

  function renderReviewComplete(): HTMLElement {
    const acc = sessionStats.reviewed > 0 ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100) : 0;
    const st = srs.getStats(cards);
    const goalDone = st.reviewedToday >= DAILY_GOAL;
    if (goalDone) burstConfetti();
    const nowLevel = levelOf(getXP());
    const leveledUp = nowLevel > sessionStats.startLevel;

    const wrap = document.createElement('div');
    wrap.className = 'text-center space-y-6 py-10 px-4';
    const iconWrap = document.createElement('div');
    iconWrap.className = 'flex justify-center text-accent-400';
    iconWrap.appendChild(createIcon(acc >= 90 ? 'trophy' : acc >= 70 ? 'sparkles' : acc >= 50 ? 'books' : 'zap', 64));
    wrap.appendChild(iconWrap);
    const title = document.createElement('h1');
    title.className = 'text-3xl font-black text-slate-100';
    title.textContent = goalDone ? 'هدف روزانه کامل شد!' : acc >= 90 ? 'فوق‌العاده!' : acc >= 70 ? 'عالی بود!' : 'ادامه بده!';
    wrap.appendChild(title);
    const xpLine = document.createElement('p');
    xpLine.className = 'text-accent-400 font-bold text-xl';
    xpLine.textContent = `+${toPersianDigits(String(sessionStats.xp))} XP گرفتی!`;
    wrap.appendChild(xpLine);
    if (leveledUp) {
      const lv = document.createElement('p');
      lv.className = 'text-primary-300 font-bold';
      lv.textContent = `لول‌آپ! حالا سطح ${toPersianDigits(String(nowLevel))} هستی`;
      wrap.appendChild(lv);
    }

    const stats = document.createElement('div');
    stats.className = 'grid grid-cols-3 gap-3 max-w-md mx-auto';
    [
      { v: toPersianDigits(String(sessionStats.reviewed)), l: 'مرور' },
      { v: `${toPersianDigits(String(acc))}٪`, l: 'دقت' },
      { v: toPersianDigits(String(nowLevel)), l: 'سطح' },
    ].forEach((s) => {
      const b = document.createElement('div'); b.className = 'bg-slate-800 border border-slate-700 rounded-xl p-3';
      const v = document.createElement('div'); v.className = 'text-xl font-bold text-primary-400'; v.textContent = s.v;
      const l = document.createElement('div'); l.className = 'text-xs text-slate-400'; l.textContent = s.l;
      b.appendChild(v); b.appendChild(l);
      stats.appendChild(b);
    });
    wrap.appendChild(stats);

    const insightBox = document.createElement('div');
    insightBox.className = 'max-w-md mx-auto bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-start space-y-2';
    const ih = document.createElement('div');
    ih.className = 'flex items-center gap-2 text-sm font-bold text-primary-300';
    ih.innerHTML = iconHTML('sparkles', 16);
    const iht = document.createElement('span'); iht.textContent = 'تحلیل هوشمند جلسه';
    ih.appendChild(iht);
    insightBox.appendChild(ih);
    const it = document.createElement('p');
    it.className = 'text-sm text-slate-300 leading-relaxed';
    it.textContent = 'در حال تحلیل...';
    insightBox.appendChild(it);
    wrap.appendChild(insightBox);
    const weakTopics = Array.from(lapsesByTopic.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    void (async () => {
      if (sessionStats.wrong === 0) { it.textContent = 'بدون خطا! این یعنی کارت‌ها به حافظه‌ی بلندمدت رسیده‌اند.'; return; }
      const ai = await getWeakTopicInsight(weakTopics);
      if (ai) { it.textContent = ai; return; }
      const top = weakTopics[0];
      it.textContent = top
        ? `بیشترین خطاها در «${top.topic}» بود؛ یک مرور کوتاهِ همان امروز، بیشترین اثر را دارد.`
        : 'چند خطا داشتی؛ مرور همان روزِ کارت‌های سخت، جلوی فراموشی را می‌گیرد.';
    })();

    const btnRow = document.createElement('div');
    btnRow.className = 'flex gap-3 justify-center';
    btnRow.appendChild(createButton({ label: 'یک دور دیگر', variant: BUTTON_VARIANTS.ACCENT, iconHtml: iconHTML('refresh', 16), onClick: () => { closeReviewOverlay(); startReview(smartMode()); } }));
    btnRow.appendChild(createButton({ label: 'بازگشت', variant: BUTTON_VARIANTS.SECONDARY, iconHtml: iconHTML('home', 16), onClick: () => { closeReviewOverlay(); phase = 'dashboard'; render(); } }));
    wrap.appendChild(btnRow);
    return wrap;
  }

  // ── مدیریت ──
  function renderManage(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'space-y-4';
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between';
    header.appendChild(createButton({ label: 'بازگشت', variant: BUTTON_VARIANTS.GHOST, iconHtml: iconHTML('back', 16), onClick: () => { phase = 'dashboard'; render(); } }));
    header.appendChild(createButton({ label: 'کارت جدید', variant: BUTTON_VARIANTS.PRIMARY, iconHtml: iconHTML('add', 16), onClick: () => openCardModal(null) }));
    wrap.appendChild(header);

    let status = 'all'; let query = ''; let topic = 'all';
    wrap.appendChild(createManageSearch((q) => { query = q; renderList(); }));

    const statusRow = document.createElement('div');
    statusRow.className = 'chip-row';
    [{ v: 'all', l: 'همه' }, { v: 'due', l: 'آماده مرور' }, { v: 'new', l: 'جدید' }, { v: 'hard', l: 'سخت' }, { v: 'mature', l: 'بالغ' }].forEach((f) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'cat-chip' + (f.v === status ? ' active' : '');
      chip.textContent = f.l;
      chip.addEventListener('click', () => {
        status = f.v;
        statusRow.querySelectorAll<HTMLElement>('.cat-chip').forEach((el) => el.classList.toggle('active', el === chip));
        renderList();
      });
      statusRow.appendChild(chip);
    });
    wrap.appendChild(statusRow);

    const topics = Array.from(new Set(cards.map((c) => c.topic || 'general')));
    let topicRow: HTMLElement | null = null;
    if (topics.length > 1) {
      topicRow = document.createElement('div');
      topicRow.className = 'chip-row';
      ['all', ...topics].forEach((t) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'cat-chip' + (t === topic ? ' active' : '');
        chip.textContent = t === 'all' ? 'همه موضوع‌ها' : t;
        chip.addEventListener('click', () => {
          topic = t;
          topicRow?.querySelectorAll<HTMLElement>('.cat-chip').forEach((el) => el.classList.toggle('active', el === chip));
          renderList();
        });
        topicRow?.appendChild(chip);
      });
      wrap.appendChild(topicRow);
    }

    const list = document.createElement('div');
    list.className = 'space-y-2';
    wrap.appendChild(list);

    function renderList(): void {
      list.innerHTML = '';
      let result = [...cards];
      if (status === 'due') result = srs.getDueCards(result);
      else if (status === 'new') result = srs.getNewCards(result);
      else if (status === 'hard') result = result.filter((c) => srs.isWeak(c));
      else if (status === 'mature') result = result.filter((c) => c.mature || c.interval >= 21);
      if (topic !== 'all') result = result.filter((c) => (c.topic || 'general') === topic);
      if (query.trim()) { const q = query.toLowerCase(); result = result.filter((c) => c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q)); }
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (result.length === 0) { list.appendChild(createEmptyState({ icon: 'search', title: 'کارتی یافت نشد', message: 'فیلتر یا جستجو را تغییر دهید.' })); return; }
      result.forEach((card) => {
        const st = getCardStatus(card);
        const item = document.createElement('div');
        item.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4';
        const top = document.createElement('div');
        top.className = 'flex items-center gap-2 mb-2 flex-wrap';
        const chip = document.createElement('span');
        chip.className = `text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${st.chip}`;
        chip.innerHTML = iconHTML(st.icon, 12);
        const sl = document.createElement('span'); sl.textContent = st.label;
        chip.appendChild(sl);
        const tp = document.createElement('span'); tp.className = 'text-xs text-slate-500'; tp.textContent = card.topic || 'general';
        top.appendChild(chip); top.appendChild(tp);
        const q = document.createElement('div'); q.className = 'text-sm text-slate-200 line-clamp-1'; q.textContent = card.front;
        const a = document.createElement('div'); a.className = 'text-xs text-slate-400 line-clamp-1'; a.textContent = card.back;
        const dueLine = document.createElement('div');
        dueLine.className = 'text-[11px] text-slate-500 mt-1';
        dueLine.textContent = card.lastReview ? srs.predictOptimalTime(card).message : 'هرگز مرور نشده';
        const btns = document.createElement('div');
        btns.className = 'flex gap-2 mt-3';
        btns.appendChild(createButton({ label: 'ویرایش', variant: BUTTON_VARIANTS.SECONDARY, size: BUTTON_SIZES.SM, iconHtml: iconHTML('edit', 14), onClick: () => openCardModal(card) }));
        btns.appendChild(createButton({ label: 'حذف', variant: BUTTON_VARIANTS.DANGER, size: BUTTON_SIZES.SM, iconHtml: iconHTML('trash', 14), onClick: async () => {
          const ok = await getModal().confirm('حذف کارت', 'این عمل قابل بازگشت نیست.', { dangerMode: true, confirmText: 'حذف' });
          if (ok) { await getDatabase().deleteFlashcard(card.id); getToast().success('کارت حذف شد'); await refresh(); render(); }
        } }));
        item.appendChild(top); item.appendChild(q); item.appendChild(a); item.appendChild(dueLine); item.appendChild(btns);
        list.appendChild(item);
      });
    }
    renderList();
    return wrap;
  }

  // ── ویرایشگر (بدون پیش‌نمایش بی‌مصرف + چیپ‌های رنگی مفهوم) ──
  function openCardModal(card: SRSCard | null): void {
    const isEdit = card !== null;
    const content = document.createElement('div');
    content.className = 'space-y-4';
    const draft = { front: '', back: '', topic: '', concept: 'default' as ConceptType, batch: false, batchText: '' };
    let intentional = false;
    if (!isEdit) {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const d = JSON.parse(raw) as typeof draft;
          Object.assign(draft, d);
          if (draft.front || draft.back || draft.batchText) getToast().success('پیش‌نویس بازیابی شد');
        }
      } catch { /* ignore */ }
    }

    const batchToggle = document.createElement('button');
    batchToggle.type = 'button';
    batchToggle.className = 'cat-chip inline-flex items-center gap-1.5' + (draft.batch ? ' active' : '');
    batchToggle.innerHTML = iconHTML('zap', 14);
    const btT = document.createElement('span'); btT.textContent = 'حالت دسته‌ای (هر خط: سوال | پاسخ)';
    batchToggle.appendChild(btT);
    content.appendChild(batchToggle);

    const batchArea = document.createElement('div');
    batchArea.className = draft.batch ? '' : 'hidden';
    const batchInput = createTextarea({ id: 'card-batch', placeholder: 'پایتخت فرانسه؟ | پاریس\nمشتق x²؟ | 2x', value: draft.batchText, rows: 5 });
    const batchMic = createMicButton((t) => { batchInput.value += (batchInput.value ? '\n' : '') + t; batchInput.dispatchEvent(new Event('input')); });
    const batchRow = document.createElement('div');
    batchRow.className = 'flex gap-2 items-start';
    const batchWrap = document.createElement('div');
    batchWrap.className = 'flex-1';
    batchWrap.appendChild(batchInput);
    batchRow.appendChild(batchWrap); batchRow.appendChild(batchMic);
    batchArea.appendChild(batchRow);
    content.appendChild(batchArea);

    const singleArea = document.createElement('div');
    singleArea.className = 'space-y-4' + (draft.batch ? ' hidden' : '');
    const frontInput = createTextarea({ id: 'card-front', placeholder: 'سوال یا مفهوم...', value: isEdit ? card?.front ?? '' : draft.front, rows: 3 });
    const frontMic = createMicButton((t) => { frontInput.value += (frontInput.value ? ' ' : '') + t; frontInput.dispatchEvent(new Event('input')); });
    const frontRow = document.createElement('div');
    frontRow.className = 'flex gap-2 items-start';
    const frontWrap = document.createElement('div');
    frontWrap.className = 'flex-1';
    frontWrap.appendChild(createFormGroup({ label: 'سوال (جلوی کارت)', input: frontInput, required: true }));
    frontRow.appendChild(frontWrap); frontRow.appendChild(frontMic);
    singleArea.appendChild(frontRow);
    const backInput = createTextarea({ id: 'card-back', placeholder: 'پاسخ...', value: isEdit ? card?.back ?? '' : draft.back, rows: 3 });
    const backMic = createMicButton((t) => { backInput.value += (backInput.value ? ' ' : '') + t; backInput.dispatchEvent(new Event('input')); });
    const backRow = document.createElement('div');
    backRow.className = 'flex gap-2 items-start';
    const backWrap = document.createElement('div');
    backWrap.className = 'flex-1';
    backWrap.appendChild(createFormGroup({ label: 'پاسخ (پشت کارت)', input: backInput, required: true }));
    backRow.appendChild(backWrap); backRow.appendChild(backMic);
    singleArea.appendChild(backRow);
    content.appendChild(singleArea);

    const topicInput = createInput({ id: 'card-topic', placeholder: 'مثلاً: ریاضی', value: isEdit ? card?.topic ?? '' : draft.topic });
    content.appendChild(createFormGroup({ label: 'موضوع', input: topicInput }));

    let selectedType: ConceptType = isEdit ? card?.conceptType ?? 'default' : draft.concept;
    const typeWrap = document.createElement('div');
    typeWrap.className = 'flex flex-wrap gap-2';
    const typeChips = new Map<ConceptType, HTMLButtonElement>();
    const paintType = (): void => {
      CONCEPT_TYPES.forEach((t) => {
        const el = typeChips.get(t.value); if (!el) return;
        const s = CONCEPT_STYLES[t.value];
        if (t.value === selectedType) {
          el.querySelector('.cdot')?.remove();
          el.className = `px-4 py-2 rounded-full text-sm font-bold border border-transparent ring-2 ${s.ring} ${s.chip}`;
        } else {
          el.className = 'px-4 py-2 rounded-full text-sm font-medium border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center gap-1.5';
          if (!el.querySelector('.cdot')) {
            const d = document.createElement('span');
            d.className = `cdot w-2 h-2 rounded-full ${s.dot}`;
            el.prepend(d);
          }
        }
      });
    };
    CONCEPT_TYPES.forEach((t) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.textContent = t.label;
      chip.addEventListener('click', () => {
        selectedType = t.value;
        paintType();
        syncDraft();
      });
      typeChips.set(t.value, chip);
      typeWrap.appendChild(chip);
    });
    paintType();
    content.appendChild(createFormGroup({ label: 'نوع مفهوم', input: typeWrap }));

    batchToggle.addEventListener('click', () => {
      draft.batch = !draft.batch;
      batchToggle.classList.toggle('active', draft.batch);
      batchArea.classList.toggle('hidden', !draft.batch);
      singleArea.classList.toggle('hidden', draft.batch);
      syncDraft();
    });

    const saveDraftNow = (): void => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* ignore */ } };
    const clearDraftNow = (): void => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } };
    function syncDraft(): void {
      if (isEdit) return;
      draft.front = frontInput.value; draft.back = backInput.value;
      draft.topic = topicInput.value; draft.concept = selectedType; draft.batchText = batchInput.value;
      saveDraftNow();
    }
    [frontInput, backInput, topicInput, batchInput].forEach((el) => el.addEventListener('input', syncDraft));
    const onUnload = (): void => { if (!intentional && !isEdit) saveDraftNow(); };
    window.addEventListener('beforeunload', onUnload);
    document.addEventListener('visibilitychange', onUnload);

    getModal().open({
      title: isEdit ? 'ویرایش کارت' : 'کارت جدید',
      content, size: 'lg',
      onClose: () => {
        window.removeEventListener('beforeunload', onUnload);
        document.removeEventListener('visibilitychange', onUnload);
        if (!intentional && !isEdit) saveDraftNow();
      },
      buttons: [
        { label: 'انصراف', type: 'ghost', onClick: () => { intentional = true; if (!isEdit) clearDraftNow(); getModal().close(); } },
        {
          label: isEdit ? 'ذخیره' : 'افزودن', type: 'primary',
          onClick: async () => {
            if (draft.batch) {
              const lines = batchInput.value.split('\n').map((l) => l.trim()).filter(Boolean);
              const pairs = lines.map((l) => l.split('|').map((s) => s.trim())).filter((p): p is [string, string] => !!p[0] && !!p[1]);
              if (pairs.length === 0) { getToast().warning('حداقل یک خط «سوال | پاسخ» بنویس'); return; }
              for (const [f, b] of pairs) {
                const nc = srs.createCard({ front: f, back: b, topic: topicInput.value.trim(), conceptType: selectedType, difficulty: heuristicDifficulty(f, b, selectedType) });
                await getDatabase().addFlashcard(nc as unknown as DbFlashcard);
              }
              getToast().success(`${toPersianDigits(String(pairs.length))} کارت ساخته شد`);
            } else {
              const front = frontInput.value.trim(); const back = backInput.value.trim();
              if (!front || !back) { getToast().warning('سوال و پاسخ الزامی است'); return; }
              if (isEdit && card) {
                await getDatabase().updateFlashcard(card.id, { front, back, topic: topicInput.value.trim(), conceptType: selectedType } as unknown as Partial<DbFlashcard>);
                getToast().success('کارت به‌روزرسانی شد');
              } else {
                const diff = await estimateCardDifficulty(front, back, selectedType);
                const nc = srs.createCard({ front, back, topic: topicInput.value.trim(), conceptType: selectedType, difficulty: diff.difficulty });
                await getDatabase().addFlashcard(nc as unknown as DbFlashcard);
                getToast().success(diff.engine === 'heuristic' ? 'کارت اضافه شد' : `کارت اضافه شد (سختی AI: ${toPersianDigits(String(Math.round(diff.difficulty * 100)))}٪)`);
              }
            }
            intentional = true; if (!isEdit) clearDraftNow();
            getModal().close(); await refresh(); render();
          },
        },
      ],
    });
  }

  render();
  return container;
}

export default createFlashcardsView;