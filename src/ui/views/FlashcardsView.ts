/**
 * دانش‌یار پرو - FlashcardsView v3 (هوشمند، دوپامین‌محور، موبایل-اول)
 * ️ تایپ کاری = SRSCard؛ فقط در مرز دیتابیس cast می‌زنیم
 * @module ui/views/FlashcardsView
 * @version 3.0.1
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getDatabase, type DbFlashcard } from '@/core/Database';
import { getSRS, QUALITY_LEVELS, type Flashcard as SRSCard, type ConceptType } from '@/services/SRS';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '@/ui/components/Button';
import { createInput, createTextarea, createFormGroup, createSearchInput } from '@/ui/components/Input';
import { getModal } from '@/ui/components/Modal';
import { getToast } from '@/ui/components/Toast';
import { createEmptyState, createSectionHeader } from '@/ui/components/Card';
import { toPersianDigits } from '@/utils/dateFormatter';

const logger = getLogger().module('FlashcardsView');
const srs = getSRS();

type Phase = 'dashboard' | 'review' | 'manage';
type ReviewMode = 'due' | 'new' | 'hard' | 'all';

const DRAFT_KEY = 'daneshyar_card_draft';
const XP_KEY = 'daneshyar_xp';
const DAILY_GOAL = 20;

const CONCEPT_TYPES: { value: ConceptType; label: string }[] = [
  { value: 'definition', label: 'تعریف' },
  { value: 'formula', label: 'فرمول' },
  { value: 'math', label: 'ریاضی' },
  { value: 'concept', label: 'مفهوم' },
  { value: 'fact', label: 'حقیقت' },
  { value: 'default', label: 'پیش‌فرض' },
];

const RATINGS = [
  { quality: QUALITY_LEVELS.INCORRECT, label: 'نمی‌دانم', icon: '❌', xp: 2,
    cls: 'bg-red-500/15 border-red-500/50 text-red-300 hover:bg-red-500/25' },
  { quality: QUALITY_LEVELS.CORRECT_HARD, label: 'سخت', icon: '😓', xp: 5,
    cls: 'bg-orange-500/15 border-orange-500/50 text-orange-300 hover:bg-orange-500/25' },
  { quality: QUALITY_LEVELS.PERFECT, label: 'آسان', icon: '✅', xp: 10,
    cls: 'bg-green-500/15 border-green-500/50 text-green-300 hover:bg-green-500/25' },
];

function getXP(): number {
  try { return parseInt(localStorage.getItem(XP_KEY) || '0', 10) || 0; } catch { return 0; }
}
function addXP(n: number): number {
  const x = getXP() + n;
  try { localStorage.setItem(XP_KEY, String(x)); } catch { /* ignore */ }
  return x;
}
const levelOf = (xp: number): number => Math.floor(xp / 100) + 1;

function getCardStatus(card: SRSCard): { icon: string; label: string; chip: string } {
  const now = new Date();
  if (!card.lastReview) return { icon: '🆕', label: 'جدید', chip: 'bg-blue-500/15 text-blue-300' };
  if (new Date(card.nextReview) <= now) return { icon: '🔥', label: 'آماده مرور', chip: 'bg-red-500/15 text-red-300' };
  if (card.interval >= 21) return { icon: '🌟', label: 'بالغ', chip: 'bg-purple-500/15 text-purple-300' };
  return { icon: '📚', label: 'یادگیری', chip: 'bg-accent-500/15 text-accent-300' };
}

function createMicButton(onText: (t: string) => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mic-btn';
  btn.setAttribute('aria-label', 'تایپ صوتی');
  btn.textContent = '🎤';
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
      rec.onresult = (e) => { const r = e.results[0]; if (r) onText(r[0].transcript); };
      rec.onend = () => btn.classList.remove('recording');
      rec.onerror = () => { btn.classList.remove('recording'); getToast().warning('خطا در ضبط صدا'); };
      rec.start();
      getToast().info('در حال گوش دادن... صحبت کن 🎤');
    } catch { getToast().warning('تایپ صوتی در دسترس نیست'); }
  });
  return btn;
}

export async function createFlashcardsView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر فلش‌کارت v3');
  const container = document.createElement('div');
  container.className = 'mx-auto max-w-3xl space-y-6';

  let cards: SRSCard[] = (await getDatabase().getFlashcards()) as unknown as SRSCard[];
  let phase: Phase = 'dashboard';
  let reviewQueue: SRSCard[] = [];
  let reviewMode: ReviewMode = 'due';
  let currentIndex = 0;
  let isFlipped = false;
  let combo = 0;
  let sessionStats = { reviewed: 0, correct: 0, wrong: 0, xp: 0, startTime: 0 };

  const refresh = async (): Promise<void> => {
    cards = (await getDatabase().getFlashcards()) as unknown as SRSCard[];
  };

  const render = (): void => {
    container.innerHTML = '';
    if (phase === 'dashboard') container.appendChild(renderDashboard());
    else if (phase === 'review') container.appendChild(renderReview());
    else container.appendChild(renderManage());
  };

  function buildQueue(mode: ReviewMode): SRSCard[] {
    if (mode === 'due') return srs.getDueCards(cards);
    if (mode === 'new') return srs.getNewCards(cards);
    if (mode === 'hard')
      return cards.filter((c) => (c.lapses ?? 0) > 0 || (c.ease ?? 2.5) < 2)
        .sort((a, b) => (b.lapses ?? 0) - (a.lapses ?? 0));
    return [...cards].sort(() => Math.random() - 0.5);
  }
  function smartMode(): ReviewMode {
    if (buildQueue('due').length > 0) return 'due';
    if (buildQueue('new').length > 0) return 'new';
    if (buildQueue('hard').length > 0) return 'hard';
    return 'all';
  }
  function startReview(mode: ReviewMode): void {
    const q = buildQueue(mode);
    if (q.length === 0) { getToast().info('کارتی برای این حالت نیست'); return; }
    reviewMode = mode; reviewQueue = q; currentIndex = 0; isFlipped = false; combo = 0;
    sessionStats = { reviewed: 0, correct: 0, wrong: 0, xp: 0, startTime: Date.now() };
    phase = 'review'; render();
  }

  // ── داشبورد ──
  function renderDashboard(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'space-y-6';
    const stats = srs.getStats(cards);
    const xp = getXP(); const level = levelOf(xp);

    const header = document.createElement('div');
    header.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4';
    const hRow = document.createElement('div'); hRow.className = 'flex items-center justify-between gap-3 flex-wrap';
    const lvl = document.createElement('div'); lvl.className = 'flex items-center gap-3';
    const badge = document.createElement('div');
    badge.className = 'w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-lg font-black text-white';
    badge.textContent = toPersianDigits(String(level));
    const lvlTxt = document.createElement('div');
    const t1 = document.createElement('div'); t1.className = 'font-bold text-slate-100'; t1.textContent = `سطح ${toPersianDigits(String(level))}`;
    const t2 = document.createElement('div'); t2.className = 'text-xs text-slate-400'; t2.textContent = `${toPersianDigits(String(xp % 100))}/۱۰۰ XP`;
    lvlTxt.appendChild(t1); lvlTxt.appendChild(t2);
    lvl.appendChild(badge); lvl.appendChild(lvlTxt);
    const goal = document.createElement('div'); goal.className = 'text-end';
    const g1 = document.createElement('div'); g1.className = 'text-xs text-slate-400'; g1.textContent = 'هدف روزانه';
    const g2 = document.createElement('div'); g2.className = 'font-bold text-accent-400';
    g2.textContent = `${toPersianDigits(String(Math.min(stats.reviewedToday, DAILY_GOAL)))}/${toPersianDigits(String(DAILY_GOAL))} مرور`;
    goal.appendChild(g1); goal.appendChild(g2);
    hRow.appendChild(lvl); hRow.appendChild(goal);
    header.appendChild(hRow);
    const goalBar = document.createElement('div'); goalBar.className = 'mt-3 h-2 bg-slate-900 rounded-full overflow-hidden';
    const goalFill = document.createElement('div'); goalFill.className = 'h-full bg-gradient-to-l from-accent-500 to-green-500';
    goalFill.style.width = `${Math.min((stats.reviewedToday / DAILY_GOAL) * 100, 100)}%`;
    goalBar.appendChild(goalFill); header.appendChild(goalBar);
    wrap.appendChild(header);

    const mode = smartMode();
    const modeLabels: Record<ReviewMode, string> = { due: 'مرور هوشمند', new: 'کارت‌های جدید', hard: 'کارت‌های سخت', all: 'تمرین آزاد' };
    const queueCount = buildQueue(mode).length;
    const cta = createButton({
      label: queueCount > 0 ? `▶️ ${modeLabels[mode]} (${toPersianDigits(String(queueCount))} کارت)` : '➕ ساخت اولین کارت',
      variant: BUTTON_VARIANTS.ACCENT, size: BUTTON_SIZES.LG,
      onClick: () => { if (queueCount > 0) startReview(mode); else openCardModal(null); },
    });
    cta.classList.add('w-full');
    wrap.appendChild(cta);

    const modeRow = document.createElement('div'); modeRow.className = 'chip-row';
    (Object.keys(modeLabels) as ReviewMode[]).forEach((m) => {
      const c = buildQueue(m).length;
      const chip = document.createElement('button'); chip.type = 'button';
      chip.className = 'cat-chip' + (m === mode ? ' active' : '');
      chip.textContent = `${modeLabels[m]} (${toPersianDigits(String(c))})`;
      chip.addEventListener('click', () => startReview(m));
      modeRow.appendChild(chip);
    });
    wrap.appendChild(modeRow);

    const weekBox = document.createElement('div'); weekBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4';
    weekBox.appendChild(createSectionHeader({ title: 'پیشرفت این هفته', icon: '📈' }));
    void (async () => {
      const sessions = await getDatabase().getStudySessions();
      const days: { label: string; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
        const next = new Date(d); next.setDate(d.getDate() + 1);
        const count = sessions.filter((s) => s.type === 'flashcard' && new Date(s.date) >= d && new Date(s.date) < next).length;
        days.push({ label: i === 0 ? 'امروز' : d.toLocaleDateString('fa-IR', { weekday: 'short' }), count });
      }
      const max = Math.max(...days.map((x) => x.count), 1);
      const bars = document.createElement('div'); bars.className = 'flex items-end justify-between gap-2 h-24';
      days.forEach((d) => {
        const col = document.createElement('div'); col.className = 'flex-1 flex flex-col items-center gap-1';
        const bar = document.createElement('div'); bar.className = 'w-full rounded-t bg-gradient-to-t from-primary-600 to-accent-500';
        bar.style.height = `${Math.max((d.count / max) * 100, 4)}%`;
        const lb = document.createElement('div'); lb.className = 'text-[10px] text-slate-500'; lb.textContent = d.label;
        col.appendChild(bar); col.appendChild(lb); bars.appendChild(col);
      });
      weekBox.appendChild(bars);
    })();
    wrap.appendChild(weekBox);

    const hard = buildQueue('hard').slice(0, 4);
    if (hard.length > 0) {
      const hardBox = document.createElement('div'); hardBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4';
      hardBox.appendChild(createSectionHeader({ title: 'کارت‌های سخت تو', icon: '💪' }));
      hard.forEach((c) => {
        const row = document.createElement('div'); row.className = 'flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg mb-2';
        const q = document.createElement('div'); q.className = 'flex-1 text-sm text-slate-200 line-clamp-1'; q.textContent = c.front;
        const laps = document.createElement('span'); laps.className = 'text-xs text-red-400';
        laps.textContent = `${toPersianDigits(String(c.lapses ?? 0))} بار فراموشی`;
        row.appendChild(q); row.appendChild(laps); hardBox.appendChild(row);
      });
      hardBox.appendChild(createButton({ label: 'مرور کارت‌های سخت', variant: BUTTON_VARIANTS.DANGER, size: BUTTON_SIZES.SM, onClick: () => startReview('hard') }));
      wrap.appendChild(hardBox);
    }

    const actions = document.createElement('div'); actions.className = 'grid grid-cols-2 gap-3';
    actions.appendChild(createButton({ label: 'مدیریت کارت‌ها', variant: BUTTON_VARIANTS.SECONDARY, icon: '📋', onClick: () => { phase = 'manage'; render(); } }));
    actions.appendChild(createButton({ label: 'کارت جدید', variant: BUTTON_VARIANTS.PRIMARY, icon: '➕', onClick: () => openCardModal(null) }));
    wrap.appendChild(actions);

    if (cards.length === 0) {
      wrap.appendChild(createEmptyState({ icon: '🃏', title: 'هنوز کارتی نداری', message: 'ساخت کارت از هر چیزی آسان‌تر است — حتی با صدا!', actionLabel: '➕ ساخت اولین کارت', onAction: () => openCardModal(null) }));
    }
    return wrap;
  }

  // ── مرور ──
  function renderReview(): HTMLElement {
    if (currentIndex >= reviewQueue.length) return renderReviewComplete();
    const card = reviewQueue[currentIndex];
    if (!card) return renderReviewComplete();
    const wrap = document.createElement('div'); wrap.className = 'space-y-4 max-w-2xl mx-auto';

    const top = document.createElement('div'); top.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4';
    const topRow = document.createElement('div'); topRow.className = 'flex items-center justify-between mb-3';
    const exitBtn = createButton({ label: 'خروج', variant: BUTTON_VARIANTS.GHOST, size: BUTTON_SIZES.SM, onClick: async () => {
      const ok = await getModal().confirm('خروج از مرور', 'پیشرفت این جلسه ذخیره شد.', { confirmText: 'خروج' });
      if (ok) { phase = 'dashboard'; render(); }
    } });
    const pos = document.createElement('span'); pos.className = 'text-sm text-slate-400';
    pos.textContent = `کارت ${toPersianDigits(String(currentIndex + 1))} از ${toPersianDigits(String(reviewQueue.length))}`;
    const comboEl = document.createElement('span'); comboEl.className = 'text-sm font-bold text-accent-400';
    comboEl.textContent = combo > 1 ? `🔥 کمبو ×${toPersianDigits(String(combo))}` : '';
    topRow.appendChild(exitBtn); topRow.appendChild(pos); topRow.appendChild(comboEl); top.appendChild(topRow);
    const bar = document.createElement('div'); bar.className = 'h-2 bg-slate-900 rounded-full overflow-hidden';
    const fill = document.createElement('div'); fill.className = 'h-full bg-gradient-to-l from-accent-500 to-primary-500 transition-all duration-500';
    fill.style.width = `${(currentIndex / reviewQueue.length) * 100}%`;
    bar.appendChild(fill); top.appendChild(bar);
    wrap.appendChild(top);

    const card3d = document.createElement('div'); card3d.className = 'flashcard-3d cursor-pointer'; card3d.style.height = '300px';
    const inner = document.createElement('div'); inner.className = 'flashcard-inner' + (isFlipped ? ' flipped' : '');
    const front = document.createElement('div');
    front.className = 'flashcard-face flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-primary-500 to-primary-600 text-white';
    const fT = document.createElement('div'); fT.className = 'text-xl font-bold leading-relaxed whitespace-pre-wrap'; fT.textContent = card.front;
    const fH = document.createElement('div'); fH.className = 'absolute bottom-4 text-sm opacity-60'; fH.textContent = 'ضربه بزن تا پاسخ را ببینی';
    front.appendChild(fT); front.appendChild(fH);
    const back = document.createElement('div');
    back.className = 'flashcard-face flashcard-back flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-accent-500 to-accent-600 text-white';
    const bT = document.createElement('div'); bT.className = 'text-lg leading-relaxed whitespace-pre-wrap'; bT.textContent = card.back;
    back.appendChild(bT);
    inner.appendChild(front); inner.appendChild(back); card3d.appendChild(inner);
    wrap.appendChild(card3d);

    const ratingWrap = document.createElement('div');
    ratingWrap.className = 'grid grid-cols-3 gap-3' + (isFlipped ? '' : ' hidden');
    RATINGS.forEach((r) => {
      const btn = document.createElement('button');
      btn.className = `border-2 rounded-xl p-4 text-center transition-all ${r.cls}`;
      const ic = document.createElement('div'); ic.className = 'text-2xl mb-1'; ic.textContent = r.icon;
      const lb = document.createElement('div'); lb.className = 'font-bold'; lb.textContent = r.label;
      const xpEl = document.createElement('div'); xpEl.className = 'text-xs opacity-70 mt-1'; xpEl.textContent = `+${toPersianDigits(String(r.xp))} XP`;
      btn.appendChild(ic); btn.appendChild(lb); btn.appendChild(xpEl);
      btn.addEventListener('click', () => rateCard(r.quality, r.xp));
      ratingWrap.appendChild(btn);
    });
    wrap.appendChild(ratingWrap);

    const hint = document.createElement('p');
    hint.className = 'text-center text-sm text-slate-500' + (isFlipped ? ' hidden' : '');
    hint.textContent = 'اول روی کارت ضربه بزن';
    wrap.appendChild(hint);

    card3d.addEventListener('click', () => {
      isFlipped = !isFlipped;
      inner.classList.toggle('flipped', isFlipped);
      ratingWrap.classList.toggle('hidden', !isFlipped);
      hint.classList.toggle('hidden', isFlipped);
    });
    return wrap;
  }

  async function rateCard(quality: number, xpBase: number): Promise<void> {
    const card = reviewQueue[currentIndex];
    if (!card) return;
    const isPractice = reviewMode === 'all' && new Date(card.nextReview) > new Date() && !!card.lastReview;
    if (!isPractice || quality < 3) {
      const updated = srs.schedule(card, quality);
      await getDatabase().updateFlashcard(card.id, updated as unknown as Partial<DbFlashcard>);
    }
    await getDatabase().logStudySession('flashcard', { cardId: card.id, quality });
    combo = quality >= 3 ? combo + 1 : 0;
    const gained = xpBase + (combo > 1 ? combo : 0);
    addXP(gained);
    sessionStats.reviewed++; sessionStats.xp += gained;
    if (quality >= 3) sessionStats.correct++; else sessionStats.wrong++;
    currentIndex++; isFlipped = false;
    await refresh();
    render();
  }

  function renderReviewComplete(): HTMLElement {
    const acc = sessionStats.reviewed > 0 ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100) : 0;
    const wrap = document.createElement('div'); wrap.className = 'text-center space-y-6 py-8';
    const icon = document.createElement('div'); icon.className = 'text-7xl';
    icon.textContent = acc >= 90 ? '🏆' : acc >= 70 ? '🎉' : acc >= 50 ? '📚' : '💪';
    const title = document.createElement('h1'); title.className = 'text-3xl font-black text-slate-100';
    title.textContent = acc >= 90 ? 'فوق‌العاده!' : acc >= 70 ? 'عالی بود!' : 'ادامه بده!';
    const xpLine = document.createElement('p'); xpLine.className = 'text-accent-400 font-bold text-xl';
    xpLine.textContent = `+${toPersianDigits(String(sessionStats.xp))} XP گرفتی!`;
    const stats = document.createElement('div'); stats.className = 'grid grid-cols-3 gap-3 max-w-md mx-auto';
    [
      { v: toPersianDigits(String(sessionStats.reviewed)), l: 'مرور' },
      { v: `${toPersianDigits(String(acc))}٪`, l: 'دقت' },
      { v: toPersianDigits(String(levelOf(getXP()))), l: 'سطح' },
    ].forEach((s) => {
      const b = document.createElement('div'); b.className = 'bg-slate-800 border border-slate-700 rounded-xl p-3';
      const v = document.createElement('div'); v.className = 'text-xl font-bold text-primary-400'; v.textContent = s.v;
      const l = document.createElement('div'); l.className = 'text-xs text-slate-400'; l.textContent = s.l;
      b.appendChild(v); b.appendChild(l); stats.appendChild(b);
    });
    const btnRow = document.createElement('div'); btnRow.className = 'flex gap-3 justify-center';
    btnRow.appendChild(createButton({ label: '▶️ یک دور دیگر', variant: BUTTON_VARIANTS.ACCENT, icon: '🔁', onClick: () => startReview(smartMode()) }));
    btnRow.appendChild(createButton({ label: 'بازگشت', variant: BUTTON_VARIANTS.SECONDARY, icon: '🏠', onClick: () => { phase = 'dashboard'; render(); } }));
    wrap.appendChild(icon); wrap.appendChild(title); wrap.appendChild(xpLine); wrap.appendChild(stats); wrap.appendChild(btnRow);
    return wrap;
  }

  // ── مدیریت ─
  function renderManage(): HTMLElement {
    const wrap = document.createElement('div'); wrap.className = 'space-y-4';
    const header = document.createElement('div'); header.className = 'flex items-center justify-between';
    header.appendChild(createButton({ label: 'بازگشت', variant: BUTTON_VARIANTS.GHOST, icon: '←', onClick: () => { phase = 'dashboard'; render(); } }));
    header.appendChild(createButton({ label: 'کارت جدید', variant: BUTTON_VARIANTS.PRIMARY, icon: '➕', onClick: () => openCardModal(null) }));
    wrap.appendChild(header);

    let status = 'all'; let query = ''; let topic = 'all';
    const searchWrap = document.createElement('div');
    searchWrap.appendChild(createSearchInput({ placeholder: 'جستجو در کارت‌ها...', onSearch: (q) => { query = q; renderList(); } }));
    wrap.appendChild(searchWrap);

    const statusRow = document.createElement('div'); statusRow.className = 'chip-row';
    [{ v: 'all', l: 'همه' }, { v: 'due', l: 'آماده مرور' }, { v: 'new', l: 'جدید' }, { v: 'hard', l: 'سخت' }, { v: 'mature', l: 'بالغ' }].forEach((f) => {
      const chip = document.createElement('button'); chip.type = 'button';
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
    if (topics.length > 1) {
      const topicRow = document.createElement('div'); topicRow.className = 'chip-row';
      ['all', ...topics].forEach((t) => {
        const chip = document.createElement('button'); chip.type = 'button';
        chip.className = 'cat-chip' + (t === topic ? ' active' : '');
        chip.textContent = t === 'all' ? 'همه موضوع‌ها' : t;
        chip.addEventListener('click', () => {
          topic = t;
          topicRow.querySelectorAll<HTMLElement>('.cat-chip').forEach((el) => el.classList.toggle('active', el === chip));
          renderList();
        });
        topicRow.appendChild(chip);
      });
      wrap.appendChild(topicRow);
    }

    const list = document.createElement('div'); list.className = 'space-y-2';
    wrap.appendChild(list);

    function renderList(): void {
      list.innerHTML = '';
      let result = [...cards];
      if (status === 'due') result = srs.getDueCards(result);
      else if (status === 'new') result = srs.getNewCards(result);
      else if (status === 'hard') result = result.filter((c) => (c.lapses ?? 0) > 0 || (c.ease ?? 2.5) < 2);
      else if (status === 'mature') result = result.filter((c) => c.interval >= 21);
      if (topic !== 'all') result = result.filter((c) => (c.topic || 'general') === topic);
      if (query.trim()) { const q = query.toLowerCase(); result = result.filter((c) => c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q)); }
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (result.length === 0) { list.appendChild(createEmptyState({ icon: '🔍', title: 'کارتی یافت نشد', message: 'فیلتر یا جستجو را تغییر دهید.' })); return; }
      result.forEach((card) => {
        const st = getCardStatus(card);
        const item = document.createElement('div'); item.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4';
        const top = document.createElement('div'); top.className = 'flex items-center gap-2 mb-2 flex-wrap';
        const chip = document.createElement('span'); chip.className = `text-xs px-2 py-0.5 rounded ${st.chip}`; chip.textContent = `${st.icon} ${st.label}`;
        const tp = document.createElement('span'); tp.className = 'text-xs text-slate-500'; tp.textContent = card.topic || 'general';
        top.appendChild(chip); top.appendChild(tp);
        const q = document.createElement('div'); q.className = 'text-sm text-slate-200 line-clamp-1'; q.textContent = card.front;
        const a = document.createElement('div'); a.className = 'text-xs text-slate-400 line-clamp-1'; a.textContent = card.back;
        const btns = document.createElement('div'); btns.className = 'flex gap-2 mt-3';
        btns.appendChild(createButton({ label: 'ویرایش', variant: BUTTON_VARIANTS.SECONDARY, size: BUTTON_SIZES.SM, icon: '✏️', onClick: () => openCardModal(card) }));
        btns.appendChild(createButton({ label: 'حذف', variant: BUTTON_VARIANTS.DANGER, size: BUTTON_SIZES.SM, icon: '🗑️', onClick: async () => {
          const ok = await getModal().confirm('حذف کارت', 'این عمل قابل بازگشت نیست.', { dangerMode: true, confirmText: 'حذف' });
          if (ok) { await getDatabase().deleteFlashcard(card.id); getToast().success('کارت حذف شد'); await refresh(); render(); }
        } }));
        item.appendChild(top); item.appendChild(q); item.appendChild(a); item.appendChild(btns);
        list.appendChild(item);
      });
    }
    renderList();
    return wrap;
  }

  // ── مودال ساخت/ویرایش + پیش‌نویس هوشمند + تایپ صوتی + دسته‌ای ──
  function openCardModal(card: SRSCard | null): void {
    const isEdit = card !== null;
    const content = document.createElement('div'); content.className = 'space-y-4';
    const draft = { front: '', back: '', topic: '', concept: 'default' as ConceptType, batch: false, batchText: '' };
    let intentional = false;

    if (!isEdit) {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const d = JSON.parse(raw) as typeof draft;
          Object.assign(draft, d);
          if (draft.front || draft.back || draft.batchText) getToast().success('پیش‌نویس بازیابی شد 📝');
        }
      } catch { /* ignore */ }
    }

    const batchToggle = document.createElement('button'); batchToggle.type = 'button';
    batchToggle.className = 'cat-chip' + (draft.batch ? ' active' : '');
    batchToggle.textContent = '⚡ حالت دسته‌ای (هر خط: سوال | پاسخ)';
    content.appendChild(batchToggle);

    const batchArea = document.createElement('div'); batchArea.className = draft.batch ? '' : 'hidden';
    const batchInput = createTextarea({ id: 'card-batch', placeholder: 'پایتخت فرانسه؟ | پاریس\nمشتق x²؟ | 2x', value: draft.batchText, rows: 5 });
    const batchMic = createMicButton((t) => { batchInput.value += (batchInput.value ? '\n' : '') + t; batchInput.dispatchEvent(new Event('input')); });
    const batchRow = document.createElement('div'); batchRow.className = 'flex gap-2 items-start';
    const batchWrap = document.createElement('div'); batchWrap.className = 'flex-1'; batchWrap.appendChild(batchInput);
    batchRow.appendChild(batchWrap); batchRow.appendChild(batchMic);
    batchArea.appendChild(batchRow);
    content.appendChild(batchArea);

    const singleArea = document.createElement('div'); singleArea.className = 'space-y-4' + (draft.batch ? ' hidden' : '');
    const frontInput = createTextarea({ id: 'card-front', placeholder: 'سوال یا مفهوم...', value: isEdit ? card?.front ?? '' : draft.front, rows: 3 });
    const frontMic = createMicButton((t) => { frontInput.value += (frontInput.value ? ' ' : '') + t; frontInput.dispatchEvent(new Event('input')); });
    const frontRow = document.createElement('div'); frontRow.className = 'flex gap-2 items-start';
    const frontWrap = document.createElement('div'); frontWrap.className = 'flex-1';
    frontWrap.appendChild(createFormGroup({ label: 'سوال (جلوی کارت)', input: frontInput, required: true }));
    frontRow.appendChild(frontWrap); frontRow.appendChild(frontMic);
    singleArea.appendChild(frontRow);

    const backInput = createTextarea({ id: 'card-back', placeholder: 'پاسخ...', value: isEdit ? card?.back ?? '' : draft.back, rows: 3 });
    const backMic = createMicButton((t) => { backInput.value += (backInput.value ? ' ' : '') + t; backInput.dispatchEvent(new Event('input')); });
    const backRow = document.createElement('div'); backRow.className = 'flex gap-2 items-start';
    const backWrap = document.createElement('div'); backWrap.className = 'flex-1';
    backWrap.appendChild(createFormGroup({ label: 'پاسخ (پشت کارت)', input: backInput, required: true }));
    backRow.appendChild(backWrap); backRow.appendChild(backMic);
    singleArea.appendChild(backRow);
    content.appendChild(singleArea);

    const topicInput = createInput({ id: 'card-topic', placeholder: 'مثلاً: ریاضی', value: isEdit ? card?.topic ?? '' : draft.topic });
    content.appendChild(createFormGroup({ label: 'موضوع', input: topicInput }));

    let selectedType: ConceptType = isEdit ? card?.conceptType ?? 'default' : draft.concept;
    const typeWrap = document.createElement('div'); typeWrap.className = 'flex flex-wrap gap-2';
    CONCEPT_TYPES.forEach((t) => {
      const chip = document.createElement('button'); chip.type = 'button';
      chip.className = 'cat-chip' + (t.value === selectedType ? ' active' : '');
      chip.textContent = t.label;
      chip.addEventListener('click', () => {
        selectedType = t.value;
        typeWrap.querySelectorAll<HTMLElement>('.cat-chip').forEach((el) => el.classList.toggle('active', el === chip));
        syncDraft();
      });
      typeWrap.appendChild(chip);
    });
    content.appendChild(createFormGroup({ label: 'نوع مفهوم', input: typeWrap }));

    batchToggle.addEventListener('click', () => {
      draft.batch = !draft.batch;
      batchToggle.classList.toggle('active', draft.batch);
      batchArea.classList.toggle('hidden', !draft.batch);
      singleArea.classList.toggle('hidden', draft.batch);
      syncDraft();
    });

    const saveDraftNow = (): void => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* ignore */ } };
    const clearDraft = (): void => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } };
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
      title: isEdit ? '✏️ ویرایش کارت' : '➕ کارت جدید',
      content, size: 'lg',
      onClose: () => {
        window.removeEventListener('beforeunload', onUnload);
        document.removeEventListener('visibilitychange', onUnload);
        if (!intentional && !isEdit) saveDraftNow();
      },
      buttons: [
        { label: 'انصراف', type: 'ghost', onClick: () => { intentional = true; if (!isEdit) clearDraft(); getModal().close(); } },
        { label: isEdit ? 'ذخیره' : 'افزودن', type: 'primary', onClick: async () => {
          if (draft.batch) {
            const lines = batchInput.value.split('\n').map((l) => l.trim()).filter(Boolean);
            const pairs = lines
              .map((l) => l.split('|').map((s) => s.trim()))
              .filter((p): p is [string, string] => !!p[0] && !!p[1]);
            if (pairs.length === 0) { getToast().warning('حداقل یک خط «سوال | پاسخ» بنویس'); return; }
            for (const [f, b] of pairs) {
              const nc = srs.createCard({ front: f, back: b, topic: topicInput.value.trim(), conceptType: selectedType });
              await getDatabase().addFlashcard(nc as unknown as DbFlashcard);
            }
            getToast().success(`${toPersianDigits(String(pairs.length))} کارت ساخته شد 🎉`);
          } else {
            const front = frontInput.value.trim(); const back = backInput.value.trim();
            if (!front || !back) { getToast().warning('سوال و پاسخ الزامی است'); return; }
            if (isEdit && card) {
              await getDatabase().updateFlashcard(card.id, { front, back, topic: topicInput.value.trim(), conceptType: selectedType } as unknown as Partial<DbFlashcard>);
              getToast().success('کارت به‌روزرسانی شد');
            } else {
              const nc = srs.createCard({ front, back, topic: topicInput.value.trim(), conceptType: selectedType });
              await getDatabase().addFlashcard(nc as unknown as DbFlashcard);
              getToast().success('کارت اضافه شد 🎉');
            }
          }
          intentional = true; if (!isEdit) clearDraft();
          getModal().close(); await refresh(); render();
        } },
      ],
    });
  }

  render();
  return container;
}

export default createFlashcardsView;