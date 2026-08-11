/**
 * ============================================================
 * دانش‌یار پرو - QuizView (موبایل-اول، AI + آفلاین، دوپامین‌محور)
 * ============================================================
 * سه فاز: Setup → Play → Results
 * زنجیره: Gemini → Groq → محلی (همیشه کار می‌کند)
 * حلقه طلایی: غلط‌ها → فلش‌کارت → SRS
 * DOM امن (textContent)، state محلی (closure)، cleanup کامل
 * @module ui/views/QuizView
 * @version 3.0.0
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getDatabase, type DbNote, type DbFlashcard } from '@/core/Database';
import { getQuizGenerator, type Question, type QuestionType } from '@/services/QuizGenerator';
import { getAIQuizService, getRemainingQuota, getTier } from '@/services/AIQuizService';
import { getSRS } from '@/services/SRS';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '@/ui/components/Button';
import { getModal } from '@/ui/components/Modal';
import { getToast } from '@/ui/components/Toast';
import { createEmptyState, createSectionHeader } from '@/ui/components/Card';
import { toPersianDigits } from '@/utils/dateFormatter';
import { checkAIQuota } from '@/services/QuotaGate';
import { showPaywall } from '@/ui/components/PaywallModal';

const logger = getLogger().module('QuizView');
const generator = getQuizGenerator();
const ai = getAIQuizService();
const srs = getSRS();

// ============================================================
// Constants
// ============================================================
const PERSIAN_LETTERS = ['الف', 'ب', 'ج', 'د', 'ه', 'و'];

interface TypeInfo { icon: string; label: string; active: string; }
const TYPE_INFO: Partial<Record<QuestionType, TypeInfo>> = {
  mc:   { icon: '📝', label: 'چندگزینه‌ای', active: 'bg-primary-500/20 border-primary-500 text-primary-300' },
  fill: { icon: '✏️', label: 'جاخالی',      active: 'bg-accent-500/20 border-accent-500 text-accent-300' },
  tf:   { icon: '✅', label: 'درست/غلط',    active: 'bg-green-500/20 border-green-500 text-green-300' },
};
const DEFAULT_TYPE_INFO: TypeInfo = { icon: '❓', label: 'سوال', active: 'bg-primary-500/20 border-primary-500 text-primary-300' };
const typeInfo = (t: QuestionType): TypeInfo => TYPE_INFO[t] ?? DEFAULT_TYPE_INFO;

// ============================================================
// Helpers
// ============================================================
const formatTime = (s: number): string => {
  if (s < 0) s = 0;
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

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

// ============================================================
// Main View
// ============================================================
export async function createQuizView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر آزمون‌ساز');
  const container = document.createElement('div');
  container.className = 'mx-auto max-w-3xl space-y-6';

  // ── state محلی (closure، نه module-level) ──
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
    combo: 0,
    xpSession: 0,
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

  // ============================================================
  // SETUP PHASE
  // ============================================================
  function renderSetup(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'space-y-5';

    // ── Header + آمار تاریخی ──
    const header = document.createElement('div');
    header.className = 'text-center space-y-2';
    const emoji = document.createElement('div');
    emoji.className = 'text-6xl';
    emoji.textContent = '📝';
    const h1 = document.createElement('h1');
    h1.className = 'text-3xl font-black text-slate-100';
    h1.textContent = 'آزمون‌ساز هوشمند';
    const sub = document.createElement('p');
    sub.className = 'text-sm text-slate-400';
    sub.textContent = 'از یادداشت‌هایت آزمون بساز و دانش‌ات را بسنج';
    header.appendChild(emoji);
    header.appendChild(h1);
    header.appendChild(sub);

    // آمار (async)
    void getDatabase().getQuizHistory().then((hist) => {
      if (hist.length === 0) return;
      const avg = Math.round(hist.reduce((s, q) => s + ((q as unknown as { percentage: number }).percentage || 0), 0) / hist.length);
      const row = document.createElement('div');
      row.className = 'flex justify-center gap-3 flex-wrap mt-3';
      const a = document.createElement('span');
      a.className = 'text-xs bg-primary-500/10 text-primary-300 px-3 py-1 rounded-lg';
      a.textContent = `کل: ${toPersianDigits(String(hist.length))}`;
      const b = document.createElement('span');
      b.className = 'text-xs bg-accent-500/10 text-accent-300 px-3 py-1 rounded-lg';
      b.textContent = `میانگین: ${toPersianDigits(String(avg))}٪`;
      row.appendChild(a);
      row.appendChild(b);
      header.appendChild(row);
    });
    wrap.appendChild(header);

    // ── انتخاب یادداشت‌ها ──
    const noteBox = document.createElement('div');
    noteBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4';
    noteBox.appendChild(createSectionHeader({ title: 'انتخاب یادداشت‌ها', icon: '📚' }));

    if (notes.length === 0) {
      noteBox.appendChild(createEmptyState({
        icon: '📝', title: 'یادداشتی نداری',
        message: 'اول یک یادداشت بساز.',
      }));
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
        card.appendChild(title);
        card.appendChild(meta);
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
        variant: BUTTON_VARIANTS.GHOST,
        size: BUTTON_SIZES.SM,
        onClick: () => {
          st.selectedIds = st.selectedIds.length === notes.length ? [] : notes.map((n) => n.id);
          render();
        },
      });
      selAll.classList.add('mt-2');
      noteBox.appendChild(selAll);
    }
    wrap.appendChild(noteBox);

    // ── تنظیمات ──
    const setBox = document.createElement('div');
    setBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-4';
    setBox.appendChild(createSectionHeader({ title: 'تنظیمات آزمون', icon: '⚙️' }));

    // تعداد
    const countRow = document.createElement('div');
    countRow.className = 'flex items-center justify-between gap-3';
    const cLabel = document.createElement('span');
    cLabel.className = 'text-sm text-slate-300';
    cLabel.textContent = 'تعداد سوالات';
    const cVal = document.createElement('span');
    cVal.className = 'font-bold text-primary-400 min-w-[2.5rem] text-center';
    cVal.textContent = toPersianDigits(String(st.settings.count));
    const cBtns = document.createElement('div');
    cBtns.className = 'flex items-center gap-2';
    const minus = createButton({ label: '−', variant: BUTTON_VARIANTS.SECONDARY, size: BUTTON_SIZES.SM,
      onClick: () => { st.settings.count = Math.max(3, st.settings.count - 1); cVal.textContent = toPersianDigits(String(st.settings.count)); } });
    const plus = createButton({ label: '+', variant: BUTTON_VARIANTS.SECONDARY, size: BUTTON_SIZES.SM,
      onClick: () => { st.settings.count = Math.min(30, st.settings.count + 1); cVal.textContent = toPersianDigits(String(st.settings.count)); } });
    cBtns.appendChild(minus);
    cBtns.appendChild(cVal);
    cBtns.appendChild(plus);
    countRow.appendChild(cLabel);
    countRow.appendChild(cBtns);
    setBox.appendChild(countRow);

    // انواع سوال (چیپ)
    const typeRow = document.createElement('div');
    typeRow.className = 'grid grid-cols-3 gap-2';
    (Object.keys(TYPE_INFO) as QuestionType[]).forEach((t) => {
      const on = st.settings.types.includes(t);
      const info = TYPE_INFO[t]!;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `border rounded-lg p-3 text-center transition-all ${on ? info.active : 'bg-slate-900/50 border-slate-700 text-slate-400'}`;
      const ic = document.createElement('div'); ic.className = 'text-2xl'; ic.textContent = info.icon;
      const lb = document.createElement('div'); lb.className = 'text-xs mt-1'; lb.textContent = info.label;
      chip.appendChild(ic); chip.appendChild(lb);
      chip.addEventListener('click', () => {
        const i = st.settings.types.indexOf(t);
        if (i > -1) { if (st.settings.types.length > 1) st.settings.types.splice(i, 1); }
        else st.settings.types.push(t);
        render();
      });
      typeRow.appendChild(chip);
    });
    setBox.appendChild(typeRow);

    // زمان
    const timeRow = document.createElement('div');
    timeRow.className = 'flex items-center justify-between gap-3';
    const tLabel = document.createElement('span');
    tLabel.className = 'text-sm text-slate-300';
    tLabel.textContent = '⏱️ زمان (دقیقه)';
    const tBtns = document.createElement('div');
    tBtns.className = 'flex items-center gap-2';
    const tVal = document.createElement('span');
    tVal.className = 'font-bold text-accent-400 min-w-[4rem] text-center';
    tVal.textContent = st.settings.timeLimit === 0 ? 'نامحدود' : toPersianDigits(String(st.settings.timeLimit));
    const tMinus = createButton({ label: '−', variant: BUTTON_VARIANTS.SECONDARY, size: BUTTON_SIZES.SM,
      onClick: () => { st.settings.timeLimit = Math.max(0, st.settings.timeLimit - 5); tVal.textContent = st.settings.timeLimit === 0 ? 'نامحدود' : toPersianDigits(String(st.settings.timeLimit)); } });
    const tPlus = createButton({ label: '+', variant: BUTTON_VARIANTS.SECONDARY, size: BUTTON_SIZES.SM,
      onClick: () => { st.settings.timeLimit = Math.min(60, st.settings.timeLimit + 5); tVal.textContent = st.settings.timeLimit === 0 ? 'نامحدود' : toPersianDigits(String(st.settings.timeLimit)); } });
    tBtns.appendChild(tMinus);
    tBtns.appendChild(tVal);
    tBtns.appendChild(tPlus);
    timeRow.appendChild(tLabel);
    timeRow.appendChild(tBtns);
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

    // AI toggle + quota
    const quota = getRemainingQuota();
    const tier = getTier();
    const aiDesc = quota > 0
      ? `سهمیه امروز: ${toPersianDigits(String(quota))} (${tier})`
      : 'سهمیه تمام شد — برای AI پریمیوم شو 💎';
    setBox.appendChild(mkToggle(
      `🤖 تولید با هوش مصنوعی`,
      aiDesc,
      () => st.settings.useAI,
      (v) => {
        if (v && quota <= 0) {
          showPaywall('quiz', () => { st.settings.useAI = false; render(); });
          return;
        }
        st.settings.useAI = v;
      },
    ));

    wrap.appendChild(setBox);

    // ── دکمه شروع ──
    const start = createButton({
      label: '🚀 شروع آزمون',
      variant: BUTTON_VARIANTS.ACCENT,
      size: BUTTON_SIZES.LG,
      onClick: () => { void startQuiz(); },
    });
    start.classList.add('w-full');
    wrap.appendChild(start);
    return wrap;
  }

  // ============================================================
  // START QUIZ
  // ============================================================
  async function startQuiz(): Promise<void> {
    if (st.selectedIds.length === 0) {
      getToast().warning('حداقل یک یادداشت انتخاب کن');
      return;
    }
    const sel = notes.filter((n) => st.selectedIds.includes(n.id));
    const totalWords = sel.reduce((s, n) => s + (n.wordCount ?? 0), 0);
    if (totalWords < 100) {
      getToast().warning(`حداقل ۱۰۰ کلمه لازم است (فعلی: ${toPersianDigits(String(totalWords))})`);
      return;
    }
        // ⬇️ QuotaGate برای edge case
    if (st.settings.useAI) {
      const q = getRemainingQuota();
      if (q <= 0) {
        showPaywall('quiz', () => { st.settings.useAI = false; render(); });
        return;
      }
    }
      // ⬇️ QuotaGate: اگر سهمیه AI نیست، paywall نشان بده
    if (st.settings.useAI) {
      const quota = checkAIQuota();
      if (!quota.allowed) {
        showPaywall('quiz', () => {
          st.settings.useAI = false;
          void startQuiz(); // ادامه با آفلاین
        });
        return;
      }
    }
    const close = getModal().loading('در حال ساخت آزمون...');
    const text = sel.map((n) => `# ${n.title}\n\n${n.content}`).join('\n\n---\n\n');

    try {
      let questions: Question[] = [];
      st.engine = 'local';

      // ۱) تلاش با AI
      if (st.settings.useAI && getRemainingQuota() > 0) {
        try {
          const r = await ai.generate(text, {
            count: st.settings.count,
            types: st.settings.types,
            forExam: st.settings.forExam,
          });
          questions = r.questions;
          st.engine = 'ai';
        } catch (e) {
          logger.warn('AI شکست، رفتن به محلی', e);
        }
      }
      // ۲) Fallback به محلی
      if (questions.length === 0) {
        try {
          questions = generator.generate(text, {
            count: st.settings.count,
            types: st.settings.types,
            forExam: st.settings.forExam,
          }).questions;
          st.engine = 'local';
        } catch (e) {
          logger.error('تولید محلی شکست', e);
          throw new Error('نتوانستیم از این متن سوال بسازیم');
        }
      }
      if (questions.length === 0) throw new Error('سوالی ساخته نشد');

      st.questions = questions;
      st.answers = {};
      st.current = 0;
      st.startTime = Date.now();
      st.timeLeft = st.settings.timeLimit * 60;
      st.analysis = null;
      st.combo = 0;
      st.xpSession = 0;
      close();
      getToast().success(
        st.engine === 'ai' ? `🤖 ${toPersianDigits(String(questions.length))} سوال AI آماده شد`
                         : `📟 ${toPersianDigits(String(questions.length))} سوال آفلاین آماده شد`,
      );
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
  // PLAY PHASE
  // ============================================================
  function renderPlay(): HTMLElement {
    if (st.current >= st.questions.length) { finish(false); return document.createElement('div'); }
    const q = st.questions[st.current];
    if (!q) { finish(false); return document.createElement('div'); }

    const wrap = document.createElement('div');
    wrap.className = 'space-y-4';

    // ── Top bar ──
    const top = document.createElement('div');
    top.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4';

    const topRow = document.createElement('div');
    topRow.className = 'flex items-center justify-between mb-3 gap-2 flex-wrap';

    const left = document.createElement('div');
    left.className = 'flex items-center gap-2';
    const exit = createButton({
      label: 'خروج',
      variant: BUTTON_VARIANTS.GHOST,
      size: BUTTON_SIZES.SM,
      onClick: async () => {
        const ok = await getModal().confirm('خروج از آزمون', 'پیشرفت ذخیره نمی‌شود.', { confirmText: 'خروج' });
        if (ok) { stopTimer(); st.phase = 'setup'; render(); }
      },
    });
    const pos = document.createElement('span');
    pos.className = 'text-xs text-slate-400';
    pos.textContent = `سوال ${toPersianDigits(String(st.current + 1))} از ${toPersianDigits(String(st.questions.length))}`;
    left.appendChild(exit);
    left.appendChild(pos);

    const right = document.createElement('div');
    right.className = 'flex items-center gap-2';
    if (st.settings.timeLimit > 0) {
      const tb = document.createElement('span');
      tb.id = 'quiz-timer';
      tb.className = `font-bold tabular-nums ${st.timeLeft <= 60 ? 'text-red-400' : 'text-accent-400'}`;
      tb.textContent = formatTime(st.timeLeft);
      right.appendChild(tb);
    }
    const fin = createButton({
      label: '🏁 پایان',
      variant: BUTTON_VARIANTS.DANGER,
      size: BUTTON_SIZES.SM,
      onClick: () => { void confirmFinish(); },
    });
    right.appendChild(fin);

    topRow.appendChild(left);
    topRow.appendChild(right);
    top.appendChild(topRow);

    // Progress bar
    const bar = document.createElement('div');
    bar.className = 'h-2 bg-slate-900 rounded-full overflow-hidden';
    const fill = document.createElement('div');
    fill.className = 'h-full bg-gradient-to-l from-accent-500 to-primary-500 transition-all duration-500';
    fill.style.width = `${(Object.keys(st.answers).length / st.questions.length) * 100}%`;
    bar.appendChild(fill);
    top.appendChild(bar);

    const answeredCount = document.createElement('div');
    answeredCount.className = 'text-xs text-slate-400 mt-2';
    answeredCount.textContent = `${toPersianDigits(String(Object.keys(st.answers).length))} پاسخ‌داده از ${toPersianDigits(String(st.questions.length))}`;
    top.appendChild(answeredCount);
    wrap.appendChild(top);

    // ── Question card ──
    const card = document.createElement('div');
    card.className = 'bg-slate-800 border border-slate-700 rounded-xl p-5';

    const qHead = document.createElement('div');
    qHead.className = 'flex items-center gap-2 mb-4 text-xs text-slate-400 flex-wrap';
    const ti = typeInfo(q.type);
    qHead.textContent = `${ti.icon} ${ti.label} • سختی ${'★'.repeat(Math.max(1, Math.min(4, q.difficulty ?? 2)))}`;
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
        let cls = 'w-full border p-4 rounded-lg text-start transition-all flex items-center gap-3 ';
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
        btn.appendChild(letter);
        btn.appendChild(tx);
        if (!locked) {
          btn.addEventListener('click', () => { st.answers[st.current] = idx; render(); });
        }
        opts.appendChild(btn);
      });
      card.appendChild(opts);
    } else {
      // fill
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
        if (e.key === 'Enter' && st.current < st.questions.length - 1) {
          e.preventDefault();
          st.current++;
          render();
        }
      });
      card.appendChild(input);
    }

    // Feedback در حالت تمرین (نه کنکوری)
    if (locked && answered !== undefined && q.explanation) {
      const ex = document.createElement('div');
      const wasCorrect = isCorrect(q, answered);
      ex.className = `mt-4 p-3 rounded-lg text-xs ${wasCorrect ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`;
      ex.textContent = `${wasCorrect ? '✅' : '❌'} ${q.explanation}`;
      card.appendChild(ex);
    }
    wrap.appendChild(card);

    // ── Navigation ──
    const nav = document.createElement('div');
    nav.className = 'flex items-center justify-between gap-3';
    const prev = createButton({
      label: '→ قبلی',
      variant: BUTTON_VARIANTS.SECONDARY,
      onClick: () => { if (st.current > 0) { st.current--; render(); } },
    });
    if (st.current === 0) prev.disabled = true;
    const nextLabel = st.current === st.questions.length - 1 ? '🏁 پایان' : 'بعدی ←';
    const next = createButton({
      label: nextLabel,
      variant: BUTTON_VARIANTS.PRIMARY,
      onClick: () => {
        if (st.current === st.questions.length - 1) void confirmFinish();
        else { st.current++; render(); }
      },
    });
    nav.appendChild(prev);
    nav.appendChild(next);
    wrap.appendChild(nav);

    // ── Question dots navigator ──
    const dots = document.createElement('div');
    dots.className = 'flex flex-wrap gap-2 justify-center pt-2';
    st.questions.forEach((_, idx) => {
      const d = document.createElement('button');
      d.type = 'button';
      const isA = st.answers[idx] !== undefined;
      d.className = `w-9 h-9 rounded text-sm font-bold transition-all ${
        idx === st.current ? 'ring-2 ring-accent-500' : ''
      } ${isA ? 'bg-primary-500 text-white' : 'bg-slate-700 text-slate-300'}`;
      d.textContent = toPersianDigits(String(idx + 1));
      d.addEventListener('click', () => { st.current = idx; render(); });
      dots.appendChild(d);
    });
    wrap.appendChild(dots);

    return wrap;
  }

  async function confirmFinish(): Promise<void> {
    const unanswered = st.questions.length - Object.keys(st.answers).length;
    let msg = 'آیا از پایان آزمون مطمئنی؟';
    if (unanswered > 0) msg += `\n\n⚠️ ${toPersianDigits(String(unanswered))} سوال بی‌پاسخ مانده.`;
    const ok = await getModal().confirm('🏁 پایان آزمون', msg, { confirmText: 'بله، پایان' });
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

    // ذخیره در DB
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
  // RESULTS PHASE
  // ============================================================
  function renderResults(): HTMLElement {
    const a = st.analysis;
    const wrap = document.createElement('div');
    wrap.className = 'space-y-5';
    if (!a) return wrap;

    // ── Header ──
    const head = document.createElement('div');
    head.className = 'text-center py-6 space-y-2';
    const icon = document.createElement('div');
    icon.className = 'text-7xl';
    icon.textContent = a.percentage >= 90 ? '🏆' : a.percentage >= 70 ? '🎉' : a.percentage >= 50 ? '📚' : '💪';
    const pct = document.createElement('div');
    pct.className = 'text-6xl font-black text-primary-400';
    pct.textContent = `${toPersianDigits(String(a.percentage))}٪`;
    const msg = document.createElement('p');
    msg.className = 'text-slate-400';
    msg.textContent = a.percentage >= 90 ? 'تسلط فوق‌العاده!' : a.percentage >= 70 ? 'عملکرد خوب!' : a.percentage >= 50 ? 'قابل قبول، ادامه بده' : 'نیاز به مرور بیشتر';
    if (a.timeExpired) {
      const te = document.createElement('p');
      te.className = 'text-red-400 text-sm mt-2';
      te.textContent = '⏰ زمان به پایان رسید';
      head.appendChild(icon); head.appendChild(pct); head.appendChild(msg); head.appendChild(te);
    } else {
      head.appendChild(icon); head.appendChild(pct); head.appendChild(msg);
    }
    wrap.appendChild(head);

    // ── Stats grid ──
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
      const v = document.createElement('div');
      v.className = `text-xl font-bold ${s.c}`;
      v.textContent = s.v;
      const l = document.createElement('div');
      l.className = 'text-xs text-slate-400';
      l.textContent = s.l;
      b.appendChild(v);
      b.appendChild(l);
      score.appendChild(b);
    });
    wrap.appendChild(score);

    // ── تحلیل نقاط ضعف ──
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
      wBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4';
      wBox.appendChild(createSectionHeader({ title: '🎯 مفاهیم نیازمند مرور', icon: '' }));
      weakList.forEach((w) => {
        const r = document.createElement('div');
        r.className = 'flex justify-between items-center text-sm p-2 bg-slate-900/50 rounded-lg mb-2';
        const n = document.createElement('span');
        n.className = 'text-slate-200';
        n.textContent = w.c;
        const p = document.createElement('span');
        p.className = 'text-red-400 font-bold';
        p.textContent = `${toPersianDigits(String(w.pct))}٪`;
        r.appendChild(n);
        r.appendChild(p);
        wBox.appendChild(r);
      });
      wrap.appendChild(wBox);
    }

    // ── حلقه طلایی: تبدیل غلط‌ها به فلش‌کارت ──
    const wrongQs = st.questions.filter((q, idx) => st.answers[idx] !== undefined && !isCorrect(q, st.answers[idx]));
    if (wrongQs.length > 0) {
      const golden = document.createElement('div');
      golden.className = 'bg-gradient-to-br from-accent-500/10 to-primary-500/10 border border-accent-500/30 rounded-xl p-4';
      golden.appendChild(createSectionHeader({ title: '🔥 از اشتباهاتت یاد بگیر!', icon: '' }));
      const desc = document.createElement('p');
      desc.className = 'text-sm text-slate-300 mb-3';
      desc.textContent = `سوالات غلط را به فلش‌کارت تبدیل کن تا با الگوریتم SRS هرگز فراموش نکنی`;
      golden.appendChild(desc);
      const btn = createButton({
        label: `🃏 تبدیل ${toPersianDigits(String(wrongQs.length))} غلط به فلش‌کارت`,
        variant: BUTTON_VARIANTS.ACCENT,
        onClick: async () => {
          const close = getModal().loading('در حال تبدیل...');
          try {
            for (const q of wrongQs) {
              const card = srs.createCard({
                front: q.question.replace('______', '؟'),
                back: correctAnswerText(q),
                topic: q.concept !== 'general' && q.concept !== 'عمومی' ? q.concept : undefined,
              });
              await getDatabase().addFlashcard(card as unknown as DbFlashcard);
            }
            getToast().success(`${toPersianDigits(String(wrongQs.length))} فلش‌کارت ساخته شد 🃏`);
            btn.disabled = true;
            btn.textContent = '✓ تبدیل شد — برو مرور کن!';
          } catch (e) {
            getToast().error('خطا در تبدیل');
          } finally {
            close();
          }
        },
      });
      btn.classList.add('w-full');
      golden.appendChild(btn);
      wrap.appendChild(golden);
    }

    // ── Action buttons ──
    const actions = document.createElement('div');
    actions.className = 'grid grid-cols-1 sm:grid-cols-3 gap-3';
    actions.appendChild(createButton({
      label: '🔄 آزمون جدید',
      variant: BUTTON_VARIANTS.PRIMARY,
      onClick: () => {
        st.phase = 'setup';
        st.questions = [];
        st.answers = {};
        st.analysis = null;
        render();
      },
    }));
    actions.appendChild(createButton({
      label: '🃏 فلش‌کارت‌ها',
      variant: BUTTON_VARIANTS.ACCENT,
      onClick: () => { window.location.hash = '#/flashcards'; },
    }));
    actions.appendChild(createButton({
      label: '🏠 داشبورد',
      variant: BUTTON_VARIANTS.SECONDARY,
      onClick: () => { window.location.hash = '#/dashboard'; },
    }));
    wrap.appendChild(actions);
    return wrap;
  }

  // ── initial render ──
  render();

  // ── cleanup هنگام خروج از view ──
  const observer = new MutationObserver(() => {
    if (!document.body.contains(container)) {
      stopTimer();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return container;
}

export default createQuizView;