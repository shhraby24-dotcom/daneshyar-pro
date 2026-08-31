/**
 * ============================================================
 * دانش‌یار پرو - QuizView (نسخه‌ی ۴ — تمیز و یکپارچه)
 * ============================================================
 * 🎨 بدون ایموجی — آیکون‌های Lucide · بدون خط کهکشانی
 * 🤖 چیپ شفاف موتور: AI آماده / سهمیه تمام / آفلاین
 * 📱 فاز آزمون: نوار چسبان پایین (ناحیه‌ی شست) + تایمر طلایی
 * 🏆 نتیجه: کانفتی ≥۹۰٪ + XP یکپارچه (+۵ به ازای هر درست)
 * 🔥 حلقه‌ی طلایی: غلط‌ها → فلش‌کارت (با حذف تکراری‌ها)
 * 🧠 منطق: زنجیره AI→آفلاین، نمره‌ی منفی، حالت کنکوری، تایمر
 * @module ui/views/QuizView
 * @version 4.0.0
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getDatabase, type DbNote, type DbFlashcard } from '@/core/Database';
import { getRouter } from '@/core/Router';
import { getQuizGenerator, type Question, type QuestionType } from '@/services/QuizGenerator';
import { getAIQuizService, getRemainingQuota, getTier } from '@/services/AIQuizService';
import { getSRS } from '@/services/SRS';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '@/ui/components/Button';
import { getModal } from '@/ui/components/Modal';
import { getToast } from '@/ui/components/Toast';
import { createEmptyState } from '@/ui/components/Card';
import { toPersianDigits } from '@/utils/dateFormatter';
import { checkAIQuota } from '@/services/QuotaGate';
import { showPaywall } from '@/ui/components/PaywallModal';
import { createIcon, iconHTML } from '@/services/IconService';

const logger = getLogger().module('QuizView');
const generator = getQuizGenerator();
const ai = getAIQuizService();
const srs = getSRS();

// ============================================================
// ثابت‌ها
// ============================================================
const PERSIAN_LETTERS = ['الف', 'ب', 'ج', 'د', 'ه', 'و'];
const XP_KEY = 'daneshyar_xp';
const XP_PER_CORRECT = 5;

interface TypeInfo { icon: string; label: string; chip: string; ring: string; dot: string; }
const TYPE_INFO: Partial<Record<QuestionType, TypeInfo>> = {
  mc: { icon: 'notes', label: 'چندگزینه‌ای', chip: 'bg-primary-500/10 text-primary-300', ring: 'ring-primary-400/60', dot: 'bg-primary-400' },
  fill: { icon: 'edit', label: 'جاخالی', chip: 'bg-accent-500/10 text-accent-300', ring: 'ring-accent-400/60', dot: 'bg-accent-400' },
  tf: { icon: 'check', label: 'درست/غلط', chip: 'bg-green-500/10 text-green-300', ring: 'ring-green-400/60', dot: 'bg-green-400' },
};
const DEFAULT_TYPE_INFO: TypeInfo = { icon: 'quiz', label: 'سوال', chip: 'bg-primary-500/10 text-primary-300', ring: 'ring-primary-400/60', dot: 'bg-primary-400' };
const typeInfo = (t: QuestionType): TypeInfo => TYPE_INFO[t] ?? DEFAULT_TYPE_INFO;

// ============================================================
// توابع کمکی
// ============================================================
const formatTime = (s: number): string => {
  if (s < 0) s = 0;
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
function getXP(): number { try { return parseInt(localStorage.getItem(XP_KEY) || '0', 10) || 0; } catch { return 0; } }
function addXP(n: number): number { const x = getXP() + n; try { localStorage.setItem(XP_KEY, String(x)); } catch { /* ignore */ } return x; }

function isCorrect(q: Question, a: number | string | null | undefined): boolean {
  if (a === undefined || a === null || a === '') return false;
  if (q.type === 'mc' || q.type === 'tf') return a === q.correctIndex;
  const norm = String(a).trim().toLowerCase();
  const acc = (q.acceptableAnswers ?? (q.answer ? [q.answer] : [])) as string[];
  return acc.some((x: string) =>
    x.trim().toLowerCase() === norm ||
    x.replace(/\s+/g, '') === norm.replace(/\s+/g, '')
  );
}
function correctAnswerText(q: Question): string {
  if (q.options && q.correctIndex !== undefined) return q.options[q.correctIndex] ?? q.answer ?? '';
  return q.answer ?? '';
}

/** هدر بخش — بدون خط کهکشانی */
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

// ============================================================
// View اصلی
// ============================================================
export async function createQuizView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر آزمون‌ساز v4');
  const container = document.createElement('div');
  container.className = 'mx-auto max-w-3xl space-y-6';

  let notes: DbNote[] = await getDatabase().getNotes();
  const st = {
    phase: 'setup' as 'setup' | 'play' | 'results',
    selectedIds: [] as string[],
    settings: {
      count: 10,
      types: ['mc', 'fill', 'tf'] as QuestionType[],
      forExam: false,
      timeLimit: 0,
      negativeMarking: false,
      useAI: true,
    },
    questions: [] as Question[],
    answers: {} as Record<number, number | string>,
    current: 0,
    startTime: 0,
    timeLeft: 0,
    timer: null as number | null,
    engine: 'local' as 'ai' | 'local',
    xpGained: 0,
    analysis: null as null | {
      correct: number; wrong: number; unanswered: number;
      total: number; percentage: number; timeSpent: number;
      timeExpired: boolean;
    },
  };

  const stopTimer = (): void => { if (st.timer) { clearInterval(st.timer); st.timer = null; } };
  const render = (): void => {
    container.innerHTML = '';
    if (st.phase === 'setup') container.appendChild(renderSetup());
    else if (st.phase === 'play') container.appendChild(renderPlay());
    else container.appendChild(renderResults());
  };

  // ── چیپ شفاف موتور AI ──
  function engineBadge(compact = false): HTMLElement {
    const quota = getRemainingQuota();
    const chip = document.createElement('span');
    if (st.settings.useAI && quota > 0) {
      chip.className = 'flex items-center gap-1 rounded-full bg-accent-500/10 text-accent-300 px-2.5 py-1 text-xs font-bold';
      chip.innerHTML = iconHTML('sparkles', 13);
      const t = document.createElement('span');
      t.textContent = compact ? 'AI' : `AI آماده · سهمیه ${toPersianDigits(String(quota))}`;
      chip.appendChild(t);
    } else if (st.settings.useAI) {
      chip.className = 'flex items-center gap-1 rounded-full bg-slate-700/50 text-slate-300 px-2.5 py-1 text-xs font-bold';
      chip.innerHTML = iconHTML('award', 13);
      const t = document.createElement('span');
      t.textContent = compact ? 'سهمیه' : 'سهمیه‌ی AI تمام شد — کلید یا پریمیوم';
      chip.appendChild(t);
    } else {
      chip.className = 'flex items-center gap-1 rounded-full bg-slate-700/50 text-slate-300 px-2.5 py-1 text-xs font-bold';
      chip.innerHTML = iconHTML('zap', 13);
      const t = document.createElement('span');
      t.textContent = compact ? 'آفلاین' : 'حالت آفلاین (بدون AI)';
      chip.appendChild(t);
    }
    return chip;
  }

  // ============================================================
  // فاز Setup
  // ============================================================
  function renderSetup(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'space-y-5';

    // هدر یکپارچه (بدون خط کهکشانی)
    const header = document.createElement('div');
    const titleRow = document.createElement('div');
    titleRow.className = 'flex items-center gap-3';
    const headIcon = document.createElement('div');
    headIcon.className = 'w-12 h-12 rounded-xl bg-primary-500/15 text-primary-300 flex items-center justify-center';
    headIcon.appendChild(createIcon('quiz', 26));
    titleRow.appendChild(headIcon);
    const h1 = document.createElement('h1');
    h1.className = 'text-2xl sm:text-3xl font-black text-slate-100';
    h1.textContent = 'آزمون‌ساز هوشمند';
    titleRow.appendChild(h1);
    header.appendChild(titleRow);
    const subRow = document.createElement('div');
    subRow.className = 'mt-2 flex items-center gap-2 flex-wrap';
    const sub = document.createElement('p');
    sub.className = 'text-sm text-slate-400';
    sub.textContent = 'از یادداشت‌هایت آزمون بساز و دانش‌ات را بسنج';
    subRow.appendChild(sub);
    subRow.appendChild(engineBadge());
    header.appendChild(subRow);
    void getDatabase().getQuizHistory().then((hist) => {
      if (hist.length === 0) return;
      const avg = Math.round(hist.reduce((s, q) => s + ((q as unknown as { percentage: number }).percentage || 0), 0) / hist.length);
      const row = document.createElement('div');
      row.className = 'flex gap-2 flex-wrap mt-3';
      const a = document.createElement('span');
      a.className = 'text-xs bg-primary-500/10 text-primary-300 px-3 py-1 rounded-full';
      a.textContent = `کل آزمون‌ها: ${toPersianDigits(String(hist.length))}`;
      const b = document.createElement('span');
      b.className = 'text-xs bg-accent-500/10 text-accent-300 px-3 py-1 rounded-full';
      b.textContent = `میانگین: ${toPersianDigits(String(avg))}٪`;
      row.appendChild(a); row.appendChild(b);
      header.appendChild(row);
    });
    wrap.appendChild(header);

    // انتخاب یادداشت‌ها
    const noteBox = document.createElement('div');
    noteBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3';
    noteBox.appendChild(sectionHead('انتخاب یادداشت‌ها', 'notes'));
    if (notes.length === 0) {
      noteBox.appendChild(createEmptyState({ icon: 'notes', title: 'یادداشتی نداری', message: 'اول یک یادداشت بساز تا از آن آزمون بگیری.' }));
    } else {
      const grid = document.createElement('div');
      grid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto no-scrollbar';
      notes.forEach((n) => {
        const sel = st.selectedIds.includes(n.id);
        const card = document.createElement('button');
        card.type = 'button';
        card.className = `p-3 rounded-lg border text-start transition-all ${
          sel ? 'bg-primary-500/20 border-primary-500 ring-1 ring-primary-500/50' : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
        }`;
        const title = document.createElement('div');
        title.className = 'text-sm font-medium text-slate-100 line-clamp-1';
        title.textContent = n.title || 'بدون عنوان';
        const meta = document.createElement('div');
        meta.className = 'text-xs text-slate-500 mt-1';
        meta.textContent = `${n.category || 'سایر'} • ${toPersianDigits(String(n.wordCount ?? 0))} کلمه`;
        card.appendChild(title); card.appendChild(meta);
        card.addEventListener('click', () => {
          const i = st.selectedIds.indexOf(n.id);
          if (i > -1) st.selectedIds.splice(i, 1);
          else st.selectedIds.push(n.id);
          render();
        });
        grid.appendChild(card);
      });
      noteBox.appendChild(grid);
      const selAll = createButton({
        label: st.selectedIds.length === notes.length ? 'لغو انتخاب همه' : 'انتخاب همه',
        variant: BUTTON_VARIANTS.GHOST, size: BUTTON_SIZES.SM,
        onClick: () => { st.selectedIds = st.selectedIds.length === notes.length ? [] : notes.map((n) => n.id); render(); },
      });
      noteBox.appendChild(selAll);
    }
    wrap.appendChild(noteBox);

    // تنظیمات
    const setBox = document.createElement('div');
    setBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-4';
    setBox.appendChild(sectionHead('تنظیمات آزمون', 'settings'));

    // تعداد
    const countRow = document.createElement('div');
    countRow.className = 'flex items-center justify-between gap-3';
    const cLabel = document.createElement('span');
    cLabel.className = 'text-sm text-slate-300';
    cLabel.textContent = 'تعداد سوالات';
    const cBtns = document.createElement('div');
    cBtns.className = 'flex items-center gap-2';
    const cVal = document.createElement('span');
    cVal.className = 'font-bold text-primary-400 min-w-[2.5rem] text-center';
    cVal.textContent = toPersianDigits(String(st.settings.count));
    cBtns.appendChild(createButton({ label: '−', variant: BUTTON_VARIANTS.SECONDARY, size: BUTTON_SIZES.SM, onClick: () => { st.settings.count = Math.max(3, st.settings.count - 1); cVal.textContent = toPersianDigits(String(st.settings.count)); } }));
    cBtns.appendChild(cVal);
    cBtns.appendChild(createButton({ label: '+', variant: BUTTON_VARIANTS.SECONDARY, size: BUTTON_SIZES.SM, onClick: () => { st.settings.count = Math.min(30, st.settings.count + 1); cVal.textContent = toPersianDigits(String(st.settings.count)); } }));
    countRow.appendChild(cLabel); countRow.appendChild(cBtns);
    setBox.appendChild(countRow);

    // انواع سوال — چیپ‌های رنگی با آیکون
    const typeRow = document.createElement('div');
    typeRow.className = 'grid grid-cols-3 gap-2';
    const typeChips = new Map<QuestionType, HTMLButtonElement>();
    const paintTypes = (): void => {
      (Object.keys(TYPE_INFO) as QuestionType[]).forEach((t) => {
        const el = typeChips.get(t); if (!el) return;
        const info = typeInfo(t);
        const on = st.settings.types.includes(t);
        el.innerHTML = '';
        if (on) {
          el.className = `border border-transparent ring-2 ${info.ring} ${info.chip} rounded-xl p-3 text-center transition-all`;
          const ic = document.createElement('div'); ic.className = 'flex justify-center mb-1'; ic.innerHTML = iconHTML(info.icon, 20);
          const lb = document.createElement('div'); lb.className = 'text-xs font-bold'; lb.textContent = info.label;
          el.appendChild(ic); el.appendChild(lb);
        } else {
          el.className = 'bg-slate-900/50 border border-slate-700 text-slate-400 rounded-xl p-3 text-center transition-all hover:bg-slate-900';
          const ic = document.createElement('div'); ic.className = 'flex justify-center mb-1 text-slate-500'; ic.innerHTML = iconHTML(info.icon, 20);
          const lb = document.createElement('div'); lb.className = 'text-xs'; lb.textContent = info.label;
          el.appendChild(ic); el.appendChild(lb);
        }
      });
    };
    (Object.keys(TYPE_INFO) as QuestionType[]).forEach((t) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.addEventListener('click', () => {
        const i = st.settings.types.indexOf(t);
        if (i > -1) { if (st.settings.types.length > 1) st.settings.types.splice(i, 1); }
        else st.settings.types.push(t);
        paintTypes();
      });
      typeChips.set(t, chip);
      typeRow.appendChild(chip);
    });
    paintTypes();
    setBox.appendChild(typeRow);

    // زمان
    const timeRow = document.createElement('div');
    timeRow.className = 'flex items-center justify-between gap-3';
    const tLabel = document.createElement('span');
    tLabel.className = 'flex items-center gap-1.5 text-sm text-slate-300';
    tLabel.innerHTML = iconHTML('clock', 15);
    const tl = document.createElement('span'); tl.textContent = 'زمان (دقیقه)';
    tLabel.appendChild(tl);
    const tBtns = document.createElement('div');
    tBtns.className = 'flex items-center gap-2';
    const tVal = document.createElement('span');
    tVal.className = 'font-bold text-accent-400 min-w-[4rem] text-center';
    tVal.textContent = st.settings.timeLimit === 0 ? 'نامحدود' : toPersianDigits(String(st.settings.timeLimit));
    tBtns.appendChild(createButton({ label: '−', variant: BUTTON_VARIANTS.SECONDARY, size: BUTTON_SIZES.SM, onClick: () => { st.settings.timeLimit = Math.max(0, st.settings.timeLimit - 5); tVal.textContent = st.settings.timeLimit === 0 ? 'نامحدود' : toPersianDigits(String(st.settings.timeLimit)); } }));
    tBtns.appendChild(tVal);
    tBtns.appendChild(createButton({ label: '+', variant: BUTTON_VARIANTS.SECONDARY, size: BUTTON_SIZES.SM, onClick: () => { st.settings.timeLimit = Math.min(60, st.settings.timeLimit + 5); tVal.textContent = st.settings.timeLimit === 0 ? 'نامحدود' : toPersianDigits(String(st.settings.timeLimit)); } }));
    timeRow.appendChild(tLabel); timeRow.appendChild(tBtns);
    setBox.appendChild(timeRow);

    // سوییچ‌ها
    const mkToggle = (label: string, desc: string, get: () => boolean, set: (v: boolean) => void): HTMLElement => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-900/50 text-start';
      const box = document.createElement('div');
      box.className = `w-10 h-6 rounded-full relative transition-colors flex-shrink-0 ${get() ? 'bg-primary-500' : 'bg-slate-700'}`;
      const knob = document.createElement('div');
      knob.className = `absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${get() ? 'start-5' : 'start-0.5'}`;
      box.appendChild(knob);
      const txt = document.createElement('div');
      txt.className = 'flex-1';
      const l = document.createElement('div'); l.className = 'text-sm text-slate-200'; l.textContent = label;
      const d = document.createElement('div'); d.className = 'text-xs text-slate-500'; d.textContent = desc;
      txt.appendChild(l); txt.appendChild(d);
      row.appendChild(box); row.appendChild(txt);
      row.addEventListener('click', () => { set(!get()); render(); });
      return row;
    };
    setBox.appendChild(mkToggle('نمره منفی', 'هر ۳ غلط = ۱ کسر', () => st.settings.negativeMarking, (v) => { st.settings.negativeMarking = v; }));
    setBox.appendChild(mkToggle('حالت کنکوری', 'بازخورد در پایان + سوالات سخت‌تر', () => st.settings.forExam, (v) => { st.settings.forExam = v; }));
    const quota = getRemainingQuota();
    setBox.appendChild(mkToggle(
      'تولید با هوش مصنوعی',
      quota > 0 ? `سهمیه امروز: ${toPersianDigits(String(quota))} (${getTier()})` : 'سهمیه تمام شد — برای AI پریمیوم شو',
      () => st.settings.useAI,
      (v) => {
        if (v && quota <= 0) { showPaywall('quiz', () => { st.settings.useAI = false; render(); }); return; }
        st.settings.useAI = v;
      },
    ));
    wrap.appendChild(setBox);

    // CTA طلایی
    const start = document.createElement('button');
    start.type = 'button';
    start.className = 'w-full min-h-14 rounded-xl bg-gradient-to-l from-accent-400 to-accent-500 text-slate-900 font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-accent-500/25 active:scale-[.98] transition';
    start.innerHTML = iconHTML('play', 20);
    const st1 = document.createElement('span'); st1.textContent = 'شروع آزمون';
    start.appendChild(st1);
    start.addEventListener('click', () => { void startQuiz(); });
    wrap.appendChild(start);
    return wrap;
  }

  // ============================================================
  // شروع آزمون (تک‌چک سهمیه)
  // ============================================================
  async function startQuiz(): Promise<void> {
    if (st.selectedIds.length === 0) { getToast().warning('حداقل یک یادداشت انتخاب کن'); return; }
    const sel = notes.filter((n) => st.selectedIds.includes(n.id));
    const totalWords = sel.reduce((s, n) => s + (n.wordCount ?? 0), 0);
    if (totalWords < 100) { getToast().warning(`حداقل ۱۰۰ کلمه لازم است (فعلی: ${toPersianDigits(String(totalWords))})`); return; }

    if (st.settings.useAI) {
      const quota = checkAIQuota();
      if (!quota.allowed) {
        showPaywall('quiz', () => { st.settings.useAI = false; void startQuiz(); });
        return;
      }
    }

    const close = getModal().loading('در حال ساخت آزمون...');
    const text = sel.map((n) => `# ${n.title}\n\n${n.content}`).join('\n\n---\n\n');
    try {
      let questions: Question[] = [];
      st.engine = 'local';
      if (st.settings.useAI && getRemainingQuota() > 0) {
        try {
          const r = await ai.generate(text, { count: st.settings.count, types: st.settings.types, forExam: st.settings.forExam });
          questions = r.questions;
          st.engine = 'ai';
        } catch (e) { logger.warn('AI شکست، رفتن به محلی', e); }
      }
      if (questions.length === 0) {
        questions = generator.generate(text, { count: st.settings.count, types: st.settings.types, forExam: st.settings.forExam }).questions;
        st.engine = 'local';
      }
      if (questions.length === 0) throw new Error('سوالی ساخته نشد');
      st.questions = questions;
      st.answers = {};
      st.current = 0;
      st.startTime = Date.now();
      st.timeLeft = st.settings.timeLimit * 60;
      st.analysis = null;
      st.xpGained = 0;
      close();
      getToast().success(st.engine === 'ai'
        ? `${toPersianDigits(String(questions.length))} سوال AI آماده شد`
        : `${toPersianDigits(String(questions.length))} سوال آفلاین آماده شد`);
      st.phase = 'play';
      render();
      startTimer();
    } catch (e) {
      close();
      getToast().error('خطا در ساخت آزمون: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  function startTimer(): void {
    stopTimer();
    if (st.settings.timeLimit === 0) return;
    st.timer = window.setInterval(() => {
      st.timeLeft--;
      const el = document.getElementById('quiz-timer');
      if (el) el.textContent = formatTime(st.timeLeft);
      if (st.timeLeft === 60) getToast().warning('فقط ۱ دقیقه مانده!');
      if (st.timeLeft <= 10 && st.timeLeft > 0) getToast().warning(`${toPersianDigits(String(st.timeLeft))} ثانیه!`);
      if (st.timeLeft <= 0) { stopTimer(); finish(true); }
    }, 1000);
  }

  // ============================================================
  // فاز Play
  // ============================================================
  function renderPlay(): HTMLElement {
    if (st.current >= st.questions.length) { finish(false); return document.createElement('div'); }
    const q = st.questions[st.current];
    if (!q) { finish(false); return document.createElement('div'); }
    const wrap = document.createElement('div');
    wrap.className = 'space-y-4 pb-2';

    // HUD
    const top = document.createElement('div');
    top.className = 'bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl p-3';
    const topRow = document.createElement('div');
    topRow.className = 'flex items-center justify-between gap-2 mb-2';
    const left = document.createElement('div');
    left.className = 'flex items-center gap-2';
    const exit = document.createElement('button');
    exit.type = 'button';
    exit.className = 'min-w-11 min-h-11 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-100';
    exit.innerHTML = iconHTML('close', 18);
    exit.setAttribute('aria-label', 'خروج');
    exit.addEventListener('click', async () => {
      const ok = await getModal().confirm('خروج از آزمون', 'پیشرفت ذخیره نمی‌شود.', { confirmText: 'خروج' });
      if (ok) { stopTimer(); st.phase = 'setup'; render(); }
    });
    left.appendChild(exit);
    const pos = document.createElement('span');
    pos.className = 'text-xs text-slate-400';
    pos.textContent = `سوال ${toPersianDigits(String(st.current + 1))} از ${toPersianDigits(String(st.questions.length))}`;
    left.appendChild(pos);
    const right = document.createElement('div');
    right.className = 'flex items-center gap-2';
    if (st.settings.timeLimit > 0) {
      const tb = document.createElement('span');
      tb.id = 'quiz-timer';
      tb.className = `flex items-center gap-1 font-bold tabular-nums ${st.timeLeft <= 60 ? 'text-red-400' : 'text-accent-400'}`;
      tb.innerHTML = iconHTML('clock', 14);
      const tt = document.createElement('span'); tt.textContent = formatTime(st.timeLeft);
      tb.appendChild(tt);
      right.appendChild(tb);
    }
    right.appendChild(engineBadge(true));
    topRow.appendChild(left); topRow.appendChild(right);
    top.appendChild(topRow);
    const bar = document.createElement('div');
    bar.className = 'h-1.5 bg-slate-900 rounded-full overflow-hidden';
    const fill = document.createElement('div');
    fill.className = 'h-full bg-gradient-to-l from-accent-400 to-primary-500 transition-all duration-500';
    fill.style.width = `${(Object.keys(st.answers).length / st.questions.length) * 100}%`;
    bar.appendChild(fill);
    top.appendChild(bar);
    wrap.appendChild(top);

    // کارت سوال
    const card = document.createElement('div');
    card.className = 'bg-slate-800 border border-slate-700 rounded-xl p-5';
    const qHead = document.createElement('div');
    qHead.className = 'flex items-center gap-2 mb-4 text-xs text-slate-400 flex-wrap';
    const ti = typeInfo(q.type);
    const tiChip = document.createElement('span');
    tiChip.className = `flex items-center gap-1 rounded-full px-2 py-0.5 ${ti.chip}`;
    tiChip.innerHTML = iconHTML(ti.icon, 12);
    const tiT = document.createElement('span'); tiT.textContent = ti.label;
    tiChip.appendChild(tiT);
    qHead.appendChild(tiChip);
    const stars = document.createElement('span');
    stars.className = 'text-accent-400';
    stars.textContent = '★'.repeat(Math.max(1, Math.min(4, q.difficulty ?? 2)));
    qHead.appendChild(stars);
    card.appendChild(qHead);
    const qText = document.createElement('div');
    qText.className = 'text-base text-slate-100 leading-relaxed mb-5 whitespace-pre-wrap';
    qText.textContent = q.question;
    card.appendChild(qText);

    const answered = st.answers[st.current];
    const locked = st.settings.forExam ? false : answered !== undefined;
    if (q.type === 'mc' || q.type === 'tf') {
      const opts = document.createElement('div');
      opts.className = 'space-y-2';
      ((q.options ?? []) as string[]).forEach((opt: string, idx: number) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        let cls = 'w-full border p-4 rounded-lg text-start transition-all flex items-center gap-3 min-h-14 ';
        if (locked) {
          if (idx === q.correctIndex) cls += 'bg-green-500/20 border-green-500';
          else if (answered === idx) cls += 'bg-red-500/20 border-red-500';
          else cls += 'bg-slate-900/50 border-slate-700 opacity-60';
        } else {
          cls += answered === idx
            ? 'bg-primary-500/20 border-primary-500 ring-1 ring-primary-500/50'
            : 'bg-slate-900/50 border-slate-700 hover:bg-slate-900';
        }
        btn.className = cls;
        const letter = document.createElement('div');
        letter.className = 'w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold flex-shrink-0';
        letter.textContent = PERSIAN_LETTERS[idx] ?? String(idx + 1);
        const tx = document.createElement('span');
        tx.className = 'text-sm flex-1';
        tx.textContent = opt;
        btn.appendChild(letter); btn.appendChild(tx);
        if (!locked) btn.addEventListener('click', () => { st.answers[st.current] = idx; render(); });
        opts.appendChild(btn);
      });
      card.appendChild(opts);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'input w-full text-base';
      input.placeholder = 'پاسخ...';
      input.value = typeof answered === 'string' ? answered : '';
      input.disabled = locked;
      input.addEventListener('input', () => {
        const v = input.value.trim();
        if (v) st.answers[st.current] = v;
        else delete st.answers[st.current];
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && st.current < st.questions.length - 1) { e.preventDefault(); st.current++; render(); }
      });
      card.appendChild(input);
    }
    if (locked && answered !== undefined && q.explanation) {
      const wasCorrect = isCorrect(q, answered);
      const ex = document.createElement('div');
      ex.className = `mt-4 p-3 rounded-lg text-xs flex items-start gap-2 ${wasCorrect ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`;
      const exIc = document.createElement('span');
      exIc.className = 'flex flex-shrink-0 mt-0.5';
      exIc.innerHTML = iconHTML(wasCorrect ? 'check' : 'close', 14);
      const exT = document.createElement('span');
      exT.textContent = q.explanation;
      ex.appendChild(exIc); ex.appendChild(exT);
      card.appendChild(ex);
    }
    wrap.appendChild(card);

    // ناوبری نقطه‌ای
    const dots = document.createElement('div');
    dots.className = 'flex flex-wrap gap-2 justify-center pt-1';
    st.questions.forEach((_, idx) => {
      const d = document.createElement('button');
      d.type = 'button';
      const isA = st.answers[idx] !== undefined;
      d.className = `w-9 h-9 rounded-lg text-sm font-bold transition-all ${
        idx === st.current ? 'ring-2 ring-accent-400' : ''
      } ${isA ? 'bg-primary-500 text-white' : 'bg-slate-700 text-slate-300'}`;
      d.textContent = toPersianDigits(String(idx + 1));
      d.addEventListener('click', () => { st.current = idx; render(); });
      dots.appendChild(d);
    });
    wrap.appendChild(dots);

    // نوار چسبان پایین (ناحیه‌ی شست)
    const nav = document.createElement('div');
    nav.className = 'sticky bottom-3 z-10 grid grid-cols-3 gap-2 rounded-2xl bg-slate-900/90 backdrop-blur p-2 border border-slate-700';
    const prev = createButton({ label: 'قبلی', variant: BUTTON_VARIANTS.SECONDARY, onClick: () => { if (st.current > 0) { st.current--; render(); } } });
    if (st.current === 0) prev.disabled = true;
    const isLast = st.current === st.questions.length - 1;
    const next = createButton({
      label: isLast ? 'پایان' : 'بعدی',
      variant: isLast ? BUTTON_VARIANTS.DANGER : BUTTON_VARIANTS.PRIMARY,
      onClick: () => { if (isLast) void confirmFinish(); else { st.current++; render(); } },
    });
    const finishBtn = createButton({ label: 'پایان آزمون', variant: BUTTON_VARIANTS.GHOST, onClick: () => { void confirmFinish(); } });
    nav.appendChild(prev);
    nav.appendChild(next);
    nav.appendChild(isLast ? document.createElement('span') : finishBtn);
    wrap.appendChild(nav);
    return wrap;
  }

  async function confirmFinish(): Promise<void> {
    const unanswered = st.questions.length - Object.keys(st.answers).length;
    let msg = 'آیا از پایان آزمون مطمئنی؟';
    if (unanswered > 0) msg += `\n\n${toPersianDigits(String(unanswered))} سوال بی‌پاسخ مانده.`;
    const ok = await getModal().confirm('پایان آزمون', msg, { confirmText: 'بله، پایان' });
    if (ok) finish(false);
  }

  function finish(timeExpired: boolean): void {
    stopTimer();
    let correct = 0, wrong = 0, unanswered = 0;
    st.questions.forEach((q, idx) => {
      const a = st.answers[idx];
      if (a === undefined) unanswered++;
      else if (isCorrect(q, a)) correct++;
      else wrong++;
    });
    const total = st.questions.length;
    let score = correct;
    if (st.settings.negativeMarking) score = Math.max(0, correct - Math.floor(wrong / 3));
    const percentage = Math.round((score / total) * 100);
    const timeSpent = Math.floor((Date.now() - st.startTime) / 1000);
    st.analysis = { correct, wrong, unanswered, total, percentage, timeSpent, timeExpired };
    st.xpGained = correct * XP_PER_CORRECT;
    if (st.xpGained > 0) addXP(st.xpGained);
    void getDatabase().addQuizResult({
      id: Date.now().toString(36),
      title: `آزمون ${new Date().toLocaleDateString('fa-IR')}`,
      date: new Date().toISOString(),
      totalQuestions: total,
      correct, wrong, unanswered,
      percentage,
      timeSpent,
    } as never);
    void getDatabase().logStudySession('quiz', { percentage });
    st.phase = 'results';
    render();
  }

  // ============================================================
  // فاز Results
  // ============================================================
  function renderResults(): HTMLElement {
    const a = st.analysis;
    const wrap = document.createElement('div');
    wrap.className = 'space-y-5';
    if (!a) return wrap;
    if (a.percentage >= 90) burstConfetti();

    const head = document.createElement('div');
    head.className = 'text-center py-6 space-y-2';
    const iconWrap = document.createElement('div');
    iconWrap.className = 'flex justify-center text-accent-400';
    iconWrap.appendChild(createIcon(a.percentage >= 90 ? 'trophy' : a.percentage >= 70 ? 'sparkles' : a.percentage >= 50 ? 'books' : 'zap', 64));
    head.appendChild(iconWrap);
    const pct = document.createElement('div');
    pct.className = 'text-6xl font-black text-primary-400';
    pct.textContent = `${toPersianDigits(String(a.percentage))}٪`;
    head.appendChild(pct);
    const msg = document.createElement('p');
    msg.className = 'text-slate-400';
    msg.textContent = a.percentage >= 90 ? 'تسلط فوق‌العاده!' : a.percentage >= 70 ? 'عملکرد خوب!' : a.percentage >= 50 ? 'قابل قبول، ادامه بده' : 'نیاز به مرور بیشتر';
    head.appendChild(msg);
    if (st.xpGained > 0) {
      const xp = document.createElement('p');
      xp.className = 'text-accent-400 font-bold text-lg';
      xp.textContent = `+${toPersianDigits(String(st.xpGained))} XP گرفتی!`;
      head.appendChild(xp);
    }
    if (a.timeExpired) {
      const te = document.createElement('p');
      te.className = 'text-red-400 text-sm flex items-center justify-center gap-1';
      te.innerHTML = iconHTML('clock', 14);
      const tet = document.createElement('span'); tet.textContent = 'زمان به پایان رسید';
      te.appendChild(tet);
      head.appendChild(te);
    }
    wrap.appendChild(head);

    const score = document.createElement('div');
    score.className = 'grid grid-cols-2 sm:grid-cols-4 gap-3';
    [
      { v: toPersianDigits(String(a.correct)), l: 'صحیح', c: 'text-green-400' },
      { v: toPersianDigits(String(a.wrong)), l: 'غلط', c: 'text-red-400' },
      { v: toPersianDigits(String(a.unanswered)), l: 'بی‌پاسخ', c: 'text-slate-400' },
      { v: formatTime(a.timeSpent), l: 'زمان', c: 'text-accent-400' },
    ].forEach((s) => {
      const b = document.createElement('div');
      b.className = 'bg-slate-800 border border-slate-700 rounded-xl p-3 text-center';
      const v = document.createElement('div'); v.className = `text-xl font-bold ${s.c}`; v.textContent = s.v;
      const l = document.createElement('div'); l.className = 'text-xs text-slate-400'; l.textContent = s.l;
      b.appendChild(v); b.appendChild(l);
      score.appendChild(b);
    });
    wrap.appendChild(score);

    // مفاهیم ضعیف
    const weak = new Map<string, { total: number; wrong: number }>();
    st.questions.forEach((q, idx) => {
      const c = q.concept || 'عمومی';
      const e = weak.get(c) ?? { total: 0, wrong: 0 };
      e.total++;
      if (st.answers[idx] !== undefined && !isCorrect(q, st.answers[idx])) e.wrong++;
      weak.set(c, e);
    });
    const weakList = [...weak.entries()]
      .map(([c, e]) => ({ c, pct: e.total > 0 ? Math.round(((e.total - e.wrong) / e.total) * 100) : 100 }))
      .filter((x) => x.pct < 60 && x.c !== 'general' && x.c !== 'عمومی')
      .slice(0, 4);
    if (weakList.length > 0) {
      const wBox = document.createElement('div');
      wBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3';
      wBox.appendChild(sectionHead('مفاهیم نیازمند مرور', 'target'));
      weakList.forEach((w) => {
        const r = document.createElement('div');
        r.className = 'space-y-1';
        const row = document.createElement('div');
        row.className = 'flex justify-between items-center text-sm';
        const n = document.createElement('span'); n.className = 'text-slate-200'; n.textContent = w.c;
        const p = document.createElement('span'); p.className = 'text-red-400 font-bold'; p.textContent = `${toPersianDigits(String(w.pct))}٪`;
        row.appendChild(n); row.appendChild(p);
        const track = document.createElement('div');
        track.className = 'h-1.5 bg-slate-900 rounded-full overflow-hidden';
        const f = document.createElement('div');
        f.className = 'h-full bg-red-500/70 rounded-full';
        f.style.width = `${w.pct}%`;
        track.appendChild(f);
        r.appendChild(row); r.appendChild(track);
        wBox.appendChild(r);
      });
      wrap.appendChild(wBox);
    }

    // حلقه‌ی طلایی (با حذف تکراری‌ها)
    const wrongQs = st.questions.filter((q, idx) => st.answers[idx] !== undefined && !isCorrect(q, st.answers[idx]));
    if (wrongQs.length > 0) {
      const golden = document.createElement('div');
      golden.className = 'bg-gradient-to-br from-accent-500/10 to-primary-500/10 border border-accent-500/30 rounded-xl p-4 space-y-3';
      golden.appendChild(sectionHead('از اشتباهاتت یاد بگیر!', 'flame'));
      const desc = document.createElement('p');
      desc.className = 'text-sm text-slate-300';
      desc.textContent = 'سوالات غلط را به فلش‌کارت تبدیل کن تا با الگوریتم SRS هرگز فراموش نکنی.';
      golden.appendChild(desc);
      const btn = createButton({
        label: `تبدیل ${toPersianDigits(String(wrongQs.length))} غلط به فلش‌کارت`,
        variant: BUTTON_VARIANTS.ACCENT,
        iconHtml: iconHTML('flashcards', 16),
        onClick: async () => {
          const close = getModal().loading('در حال تبدیل...');
          try {
            const existing = await getDatabase().getFlashcards();
            const fronts = new Set(existing.map((c) => c.front));
            let added = 0; let skipped = 0;
            for (const q of wrongQs) {
              const front = q.question.replace('______', '؟');
              if (fronts.has(front)) { skipped++; continue; }
              fronts.add(front);
              const card = srs.createCard({
                front,
                back: correctAnswerText(q),
                topic: q.concept !== 'general' && q.concept !== 'عمومی' ? q.concept : undefined,
              });
              await getDatabase().addFlashcard(card as unknown as DbFlashcard);
              added++;
            }
            getToast().success(skipped > 0
              ? `${toPersianDigits(String(added))} فلش‌کارت ساخته شد (${toPersianDigits(String(skipped))} تکراری بود)`
              : `${toPersianDigits(String(added))} فلش‌کارت ساخته شد`);
            btn.disabled = true;
            btn.textContent = 'تبدیل شد — برو مرور کن!';
          } catch { getToast().error('خطا در تبدیل'); }
          finally { close(); }
        },
      });
      btn.classList.add('w-full');
      golden.appendChild(btn);
      wrap.appendChild(golden);
    }

    // اکشن‌ها
    const actions = document.createElement('div');
    actions.className = 'grid grid-cols-1 sm:grid-cols-3 gap-3';
    actions.appendChild(createButton({
      label: 'آزمون جدید', variant: BUTTON_VARIANTS.PRIMARY, iconHtml: iconHTML('refresh', 16),
      onClick: () => { st.phase = 'setup'; st.questions = []; st.answers = {}; st.analysis = null; render(); },
    }));
    actions.appendChild(createButton({
      label: 'فلش‌کارت‌ها', variant: BUTTON_VARIANTS.ACCENT, iconHtml: iconHTML('flashcards', 16),
      onClick: () => { void getRouter().navigate('flashcards'); },
    }));
    actions.appendChild(createButton({
      label: 'داشبورد', variant: BUTTON_VARIANTS.SECONDARY, iconHtml: iconHTML('home', 16),
      onClick: () => { void getRouter().navigate('dashboard'); },
    }));
    wrap.appendChild(actions);
    return wrap;
  }

  render();

  // cleanup هنگام خروج از view
  const observer = new MutationObserver(() => {
    if (!document.body.contains(container)) { stopTimer(); observer.disconnect(); }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return container;
}

export default createQuizView;