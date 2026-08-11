/**
 * ============================================================
 * دانش‌یار پرو - SummarizerView v2 (معلم خصوصی هوشمند)
 * ============================================================
 * 🤖 خلاصه AI تطبیقی (خودمانی + ساختار + تشبیه + قلاب + خودآزمایی)
 * 📜 کارت «عیناً از متن» برای بخش‌های اصیل (ادبی/فرمول/تعریف)
 * 📟 fallback آفلاین (هرگز نمی‌شکند)
 * 🐞 فیکس باگ جهت آمار (dir=ltr)
 * 🔗 حلقه‌های طلایی: فلش‌کارت / یادداشت / کپی
 * @module ui/views/SummarizerView
 * @version 2.0.0
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getDatabase, type DbNote } from '@/core/Database';
import { getSummarizer, type SummarizeResult, type SummaryLevel } from '@/services/Summarizer';
import { getAISummary, type AISummaryResult } from '@/services/AISummaryService';
import { getRemainingQuota, getTier } from '@/services/AIQuizService';
import { getSRS } from '@/services/SRS';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '@/ui/components/Button';
import { createTextarea, createFormGroup } from '@/ui/components/Input';
import { getModal } from '@/ui/components/Modal';
import { getToast } from '@/ui/components/Toast';
import { createEmptyState, createSectionHeader } from '@/ui/components/Card';
import { toPersianDigits } from '@/utils/dateFormatter';
import { checkAIQuota } from '@/services/QuotaGate';
import { showPaywall } from '@/ui/components/PaywallModal';

const logger = getLogger().module('SummarizerView');
const summarizer = getSummarizer();
const srs = getSRS();

const LEVELS: { value: SummaryLevel; label: string; icon: string }[] = [
  { value: 'short', label: 'کوتاه', icon: '⚡' },
  { value: 'medium', label: 'متوسط', icon: '📄' },
  { value: 'long', label: 'کامل', icon: '📚' },
];

type ViewResult =
  | { kind: 'ai'; data: AISummaryResult }
  | { kind: 'offline'; data: SummarizeResult };

// ============================================================
// Helpers
// ============================================================
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function pickKeyword(sentence: string): string | null {
  const first = summarizer.extractKeywords(sentence, 1)[0];
  if (first && sentence.includes(first)) return first;
  const words = sentence.split(/\s+/).filter((w) => w.length >= 3);
  if (words.length === 0) return null;
  return words.reduce((a, b) => (b.length > a.length ? b : a));
}
function aiWordCount(d: AISummaryResult): number {
  let t = d.simple_summary + ' ' + d.sections.map((s) => s.points.join(' ')).join(' ');
  return countWords(t);
}

// ============================================================
// View اصلی
// ============================================================
export async function createSummarizerView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر خلاصه‌ساز v2');
  const container = document.createElement('div');
  container.className = 'mx-auto max-w-3xl space-y-6';

  let notes: DbNote[] = await getDatabase().getNotes();
  const st = {
    mode: 'note' as 'note' | 'text',
    selectedNoteId: null as string | null,
    customText: '',
    level: 'medium' as SummaryLevel,
    forExam: false,
    useAI: true,
    result: null as ViewResult | null,
    sourceTitle: '',
    sourceWords: 0,
  };

  const render = (): void => {
    container.innerHTML = '';
    container.appendChild(renderHeader());
    container.appendChild(renderInputCard());
    container.appendChild(renderOptionsCard());
    const gen = createButton({
      label: '✨ ساخت خلاصه',
      variant: BUTTON_VARIANTS.ACCENT,
      size: BUTTON_SIZES.LG,
      onClick: () => { void generate(); },
    });
    gen.classList.add('w-full');
    container.appendChild(gen);
    if (st.result) container.appendChild(renderResults(st.result));
  };

  function renderHeader(): HTMLElement {
    const h = document.createElement('div');
    h.className = 'text-center space-y-2';
    const em = document.createElement('div'); em.className = 'text-6xl'; em.textContent = '✨';
    const t = document.createElement('h1'); t.className = 'text-3xl font-black text-slate-100'; t.textContent = 'خلاصه‌ساز هوشمند';
    const s = document.createElement('p'); s.className = 'text-sm text-slate-400';
    s.textContent = 'متن را به زبان ساده، ساختاریافته و قابل‌حفظ تبدیل کن';
    h.appendChild(em); h.appendChild(t); h.appendChild(s);
    return h;
  }

  function renderInputCard(): HTMLElement {
    const box = document.createElement('div');
    box.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-4';
    box.appendChild(createSectionHeader({ title: 'منبع متن', icon: '📥' }));

    const modeRow = document.createElement('div');
    modeRow.className = 'grid grid-cols-2 gap-2';
    ([{ v: 'note', l: '📚 از یادداشت‌ها' }, { v: 'text', l: '✍️ متن دلخواه' }] as { v: 'note' | 'text'; l: string }[]).forEach((m) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `border rounded-lg p-3 text-sm font-medium transition-all ${st.mode === m.v ? 'bg-primary-500/20 border-primary-500 text-primary-300' : 'bg-slate-900/50 border-slate-700 text-slate-400'}`;
      b.textContent = m.l;
      b.addEventListener('click', () => { st.mode = m.v; render(); });
      modeRow.appendChild(b);
    });
    box.appendChild(modeRow);

    if (st.mode === 'note') {
      if (notes.length === 0) {
        box.appendChild(createEmptyState({ icon: '📝', title: 'یادداشتی نداری', message: 'یک یادداشت بساز یا از متن دلخواه استفاده کن.' }));
      } else {
        const list = document.createElement('div');
        list.className = 'grid grid-cols-1 gap-2 max-h-64 overflow-y-auto no-scrollbar';
        notes.forEach((n) => {
          const sel = st.selectedNoteId === n.id;
          const c = document.createElement('button');
          c.type = 'button';
          c.className = `p-3 rounded-lg border text-start transition-all ${sel ? 'bg-primary-500/20 border-primary-500 ring-1 ring-primary-500/50' : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'}`;
          const t = document.createElement('div'); t.className = 'text-sm font-medium text-slate-100 line-clamp-1'; t.textContent = n.title || 'بدون عنوان';
          const d = document.createElement('div'); d.className = 'text-xs text-slate-500 mt-1'; d.textContent = `${toPersianDigits(String(n.wordCount ?? 0))} کلمه`;
          c.appendChild(t); c.appendChild(d);
          c.addEventListener('click', () => { st.selectedNoteId = n.id; render(); });
          list.appendChild(c);
        });
        box.appendChild(list);
      }
    } else {
      const ta = createTextarea({ id: 'sum-text', placeholder: 'متن خود را اینجا بچسبانید...', value: st.customText, rows: 8 });
      const wcEl = document.createElement('div');
      wcEl.className = 'text-xs text-slate-500 mt-1';
      wcEl.textContent = `${toPersianDigits(String(countWords(st.customText)))} کلمه`;
      ta.addEventListener('input', () => { st.customText = ta.value; wcEl.textContent = `${toPersianDigits(String(countWords(st.customText)))} کلمه`; });
      box.appendChild(createFormGroup({ label: 'متن', input: ta }));
      box.appendChild(wcEl);
    }
    return box;
  }

  function renderOptionsCard(): HTMLElement {
    const box = document.createElement('div');
    box.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-4';
    box.appendChild(createSectionHeader({ title: 'تنظیمات خلاصه', icon: '⚙️' }));

    const levelRow = document.createElement('div');
    levelRow.className = 'grid grid-cols-3 gap-2';
    LEVELS.forEach((lv) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `border rounded-lg p-3 text-center transition-all ${st.level === lv.value ? 'bg-accent-500/20 border-accent-500 text-accent-300' : 'bg-slate-900/50 border-slate-700 text-slate-400'}`;
      const ic = document.createElement('div'); ic.className = 'text-2xl'; ic.textContent = lv.icon;
      const lb = document.createElement('div'); lb.className = 'text-xs mt-1'; lb.textContent = lv.label;
      b.appendChild(ic); b.appendChild(lb);
      b.addEventListener('click', () => { st.level = lv.value; render(); });
      levelRow.appendChild(b);
    });
    box.appendChild(levelRow);

    const mkToggle = (label: string, desc: string, get: () => boolean, set: (v: boolean) => void): HTMLElement => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-900/50 text-start';
      const kb = document.createElement('div');
      kb.className = `w-10 h-6 rounded-full relative transition-colors flex-shrink-0 ${get() ? 'bg-primary-500' : 'bg-slate-700'}`;
      const kn = document.createElement('div');
      kn.className = `absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${get() ? 'start-5' : 'start-0.5'}`;
      kb.appendChild(kn);
      const txt = document.createElement('div'); txt.className = 'flex-1';
      const l = document.createElement('div'); l.className = 'text-sm text-slate-200'; l.textContent = label;
      const d = document.createElement('div'); d.className = 'text-xs text-slate-500'; d.textContent = desc;
      txt.appendChild(l); txt.appendChild(d);
      row.appendChild(kb); row.appendChild(txt);
      row.addEventListener('click', () => { set(!get()); render(); });
      return row;
    };

    box.appendChild(mkToggle('🎓 حالت کنکوری', 'تمرکز بر تعاریف، اعداد و فرمول‌ها', () => st.forExam, (v) => { st.forExam = v; }));

    const quota = getRemainingQuota();
    const aiDesc = quota > 0
      ? `سهمیه امروز: ${toPersianDigits(String(quota))} (${getTier()})`
      : 'سهمیه تمام شد — برای AI پریمیوم شو 💎';
    box.appendChild(mkToggle('🤖 خلاصه‌سازی با AI', aiDesc, () => st.useAI, (v) => {
      if (v && quota <= 0) {
        showPaywall('summarizer', () => { st.useAI = false; render(); });
        return;
      }
      st.useAI = v;
    }));
    return box;
  }

  async function generate(): Promise<void> {
    let text = ''; let title = 'متن دلخواه';
    if (st.mode === 'note') {
      const n = notes.find((x) => x.id === st.selectedNoteId);
      if (!n) { getToast().warning('یک یادداشت انتخاب کن'); return; }
      text = n.content || ''; title = n.title || 'یادداشت';
    } else text = st.customText;

    const words = countWords(text);
    if (words < 50) { getToast().warning(`متن کافی نیست (حداقل ۵۰ کلمه — فعلی: ${toPersianDigits(String(words))})`); return; }
      // ⬇️ QuotaGate برای edge case
    if (st.useAI) {
      const q = getRemainingQuota();
      if (q <= 0) {
        showPaywall('summarizer', () => { st.useAI = false; render(); });
        return;
      }
    }
    // ⬇️ QuotaGate: اگر سهمیه AI نیست، paywall نشان بده
    if (st.useAI) {
      const quota = checkAIQuota();
      if (!quota.allowed) {
        showPaywall('summarizer', () => {
          st.useAI = false;
          void generate(); // ادامه با آفلاین
        });
        return;
      }
    }
    const close = getModal().loading('در حال خلاصه‌سازی...');
    try {
      let res: ViewResult | null = null;
      if (st.useAI && getRemainingQuota() > 0) {
        try {
          const ai = await getAISummary(text, { level: st.level, forExam: st.forExam });
          res = { kind: 'ai', data: ai };
        } catch { res = null; }
      }
      if (!res) {
        const off = summarizer.summarize(text, { level: st.level, forExam: st.forExam });
        res = { kind: 'offline', data: off };
      }
      st.result = res; st.sourceTitle = title; st.sourceWords = words;
      void getDatabase().logStudySession('summarize', { words, level: st.level, engine: res.kind });
      render();
      getToast().success(
        res.kind === 'ai'
          ? (res.data.engine === 'cache' ? 'خلاصه از حافظه آمد 💾' : 'خلاصهٔ هوشمند آماده شد 🤖')
          : 'خلاصهٔ آفلاین آماده شد 📟'
      );
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (e) {
      logger.error('خطا در خلاصه‌سازی', e);
      getToast().error('خطا در خلاصه‌سازی: متن مناسب نیست');
    } finally {
      close();
    }
  }

  // ── StatsBar (با فیکس جهت) ──
  function renderStats(res: ViewResult): HTMLElement {
    const original = st.sourceWords;
    let summaryWords = 0; let unit = 'کلمه'; let origCount = original; let sumCount = 0;
    if (res.kind === 'offline') {
      unit = 'جمله'; origCount = res.data.totalSentences; sumCount = res.data.sentenceCount;
      summaryWords = countWords(res.data.summary);
    } else {
      summaryWords = aiWordCount(res.data); sumCount = summaryWords;
    }
    const compress = origCount > 0 ? Math.max(0, Math.round((1 - sumCount / origCount) * 100)) : 0;
    const savedMin = Math.max(1, Math.round((original - summaryWords) / 150));

    const stats = document.createElement('div');
    stats.className = 'grid grid-cols-3 gap-3';
    const mk = (v: string, l: string, c: string, ltr = false): void => {
      const b = document.createElement('div'); b.className = 'bg-slate-800 border border-slate-700 rounded-xl p-3 text-center';
      const val = document.createElement('div'); val.className = `text-lg font-bold ${c}`;
      if (ltr) val.dir = 'ltr';
      val.textContent = v;
      const lb = document.createElement('div'); lb.className = 'text-xs text-slate-400'; lb.textContent = l;
      b.appendChild(val); b.appendChild(lb); stats.appendChild(b);
    };
    mk(`${toPersianDigits(String(origCount))}→${toPersianDigits(String(sumCount))}`, unit, 'text-primary-400', true);
    mk(`~${toPersianDigits(String(compress))}٪`, 'کوتاه‌تر', 'text-accent-400');
    mk(`⚡ ${toPersianDigits(String(savedMin))} دقیقه`, 'صرفه‌جویی', 'text-green-400');
    return stats;
  }

  function renderResults(res: ViewResult): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'space-y-5';

    // badge موتور
    const badge = document.createElement('div');
    badge.className = 'text-center';
    const b = document.createElement('span');
    b.className = 'inline-block text-xs bg-slate-800 border border-slate-700 rounded-full px-3 py-1 text-slate-400';
    b.textContent = res.kind === 'ai'
      ? (res.data.engine === 'cache' ? '💾 از حافظه' : `🤖 AI (${res.data.engine}) · ${res.data.domain}`)
      : '📟 آفلاین';
    badge.appendChild(b);
    wrap.appendChild(badge);

    wrap.appendChild(renderStats(res));

    if (res.kind === 'ai') {
      const d = res.data;
      // خلاصه خودمانی
      const sumBox = document.createElement('div');
      sumBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-5';
      sumBox.appendChild(createSectionHeader({ title: `🗣️ خلاصهٔ خودمانی «${st.sourceTitle}»`, icon: '' }));
      const p = document.createElement('p');
      p.className = 'text-sm leading-relaxed text-slate-200 whitespace-pre-wrap';
      p.textContent = d.simple_summary;
      sumBox.appendChild(p);
      wrap.appendChild(sumBox);

      // سرفصل‌ها
      if (d.sections.length > 0) {
        const secBox = document.createElement('div');
        secBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4';
        secBox.appendChild(createSectionHeader({ title: '🗂️ دسته‌بندی مطالب', icon: '' }));
        d.sections.forEach((s) => {
          const h = document.createElement('h4'); h.className = 'text-sm font-bold text-accent-300'; h.textContent = s.title;
          secBox.appendChild(h);
          const ul = document.createElement('ul'); ul.className = 'space-y-1 list-inside list-disc';
          s.points.forEach((pt) => {
            const li = document.createElement('li'); li.className = 'text-sm text-slate-200 leading-relaxed'; li.textContent = pt;
            ul.appendChild(li);
          });
          secBox.appendChild(ul);
        });
        wrap.appendChild(secBox);
      }

      // عیناً از متن
      if (d.preserved.length > 0) {
        const prBox = document.createElement('div');
        prBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-5';
        prBox.appendChild(createSectionHeader({ title: '📜 عیناً از متن (دست‌نخورده)', icon: '' }));
        d.preserved.forEach((pr) => {
          const q = document.createElement('blockquote');
          q.className = 'border-s-2 border-primary-500 ps-3 my-2 text-sm text-slate-200';
          q.textContent = pr.text;
          const why = document.createElement('div'); why.className = 'text-xs text-slate-500 mt-1'; why.textContent = pr.why;
          prBox.appendChild(q); prBox.appendChild(why);
        });
        wrap.appendChild(prBox);
      }

      // تشبیه
      if (d.analogy) {
        const anBox = document.createElement('div');
        anBox.className = 'bg-accent-500/10 border border-accent-500/30 rounded-xl p-4';
        anBox.appendChild(createSectionHeader({ title: 'تشبیه برای یادگیری', icon: '💡' }));
        const t = document.createElement('p'); t.className = 'text-sm text-slate-200 leading-relaxed'; t.textContent = d.analogy;
        anBox.appendChild(t);
        wrap.appendChild(anBox);
      }

      // قلاب حافظه
      if (d.mnemonic) {
        const mnBox = document.createElement('div');
        mnBox.className = 'bg-primary-500/10 border border-primary-500/30 rounded-xl p-4';
        mnBox.appendChild(createSectionHeader({ title: 'قلاب حافظه', icon: '🧠' }));
        const t = document.createElement('p'); t.className = 'text-sm text-slate-200 leading-relaxed'; t.textContent = d.mnemonic;
        mnBox.appendChild(t);
        wrap.appendChild(mnBox);
      }

      // خودآزمایی تعاملی
      if (d.self_test.length > 0) {
        const stBox = document.createElement('div');
        stBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-2';
        stBox.appendChild(createSectionHeader({ title: '❓ خودآزمایی (ضربه بزن تا جواب را ببینی)', icon: '' }));
        d.self_test.forEach((t) => {
          const item = document.createElement('button');
          item.type = 'button';
          item.className = 'w-full text-start p-3 rounded-lg bg-slate-900/50 border border-slate-700 hover:border-slate-600 transition-all';
          const q = document.createElement('div'); q.className = 'text-sm text-slate-200'; q.textContent = t.q;
          const a = document.createElement('div'); a.className = 'text-sm text-green-300 mt-2 hidden'; a.textContent = '✅ ' + t.a;
          item.appendChild(q); item.appendChild(a);
          item.addEventListener('click', () => a.classList.toggle('hidden'));
          stBox.appendChild(item);
        });
        wrap.appendChild(stBox);
      }

      // کلیدواژه‌ها
      if (d.keywords.length > 0) {
        const kwBox = document.createElement('div');
        kwBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-5';
        kwBox.appendChild(createSectionHeader({ title: 'کلیدواژه‌ها', icon: '🏷️' }));
        const row = document.createElement('div'); row.className = 'flex flex-wrap gap-2';
        d.keywords.forEach((k) => {
          const chip = document.createElement('span');
          chip.className = 'rounded-full bg-primary-500/15 text-primary-300 px-3 py-1 text-xs';
          chip.textContent = `#${k}`;
          row.appendChild(chip);
        });
        kwBox.appendChild(row);
        wrap.appendChild(kwBox);
      }

      wrap.appendChild(renderActions(res));
    } else {
      // آفلاین
      const off = res.data;
      const sumBox = document.createElement('div');
      sumBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-5';
      sumBox.appendChild(createSectionHeader({ title: `خلاصهٔ «${st.sourceTitle}»`, icon: '📄' }));
      const p = document.createElement('p');
      p.className = 'text-sm leading-relaxed text-slate-200 whitespace-pre-wrap';
      p.textContent = off.summary;
      sumBox.appendChild(p);
      wrap.appendChild(sumBox);

      if (off.keyPoints.length > 0) {
        const kpBox = document.createElement('div');
        kpBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-5';
        kpBox.appendChild(createSectionHeader({ title: 'نکات کلیدی', icon: '🔑' }));
        const ol = document.createElement('ol'); ol.className = 'space-y-2 list-decimal list-inside';
        off.keyPoints.forEach((pt) => {
          const li = document.createElement('li'); li.className = 'text-sm text-slate-200 leading-relaxed'; li.textContent = pt;
          ol.appendChild(li);
        });
        kpBox.appendChild(ol);
        wrap.appendChild(kpBox);
      }
      wrap.appendChild(renderActions(res));
    }
    return wrap;
  }

  // ── حلقه‌های طلایی ──
  function renderActions(res: ViewResult): HTMLElement {
    const actions = document.createElement('div');
    actions.className = 'grid grid-cols-1 sm:grid-cols-3 gap-3';

    const cardPairs: { front: string; back: string }[] = [];
    if (res.kind === 'ai') {
      res.data.self_test.forEach((t) => cardPairs.push({ front: t.q, back: t.a }));
      res.data.sections.forEach((s) => s.points.forEach((p) => {
        const kw = pickKeyword(p);
        if (kw) cardPairs.push({ front: p.replace(kw, '______'), back: kw });
      }));
    } else {
      res.data.keyPoints.forEach((p) => {
        const kw = pickKeyword(p);
        if (kw) cardPairs.push({ front: p.replace(kw, '______'), back: kw });
      });
    }

    actions.appendChild(createButton({
      label: `🃏 ${toPersianDigits(String(cardPairs.length))} فلش‌کارت`,
      variant: BUTTON_VARIANTS.ACCENT,
      onClick: async () => {
        if (cardPairs.length === 0) { getToast().warning('موردی برای تبدیل نیست'); return; }
        const close = getModal().loading('در حال ساخت فلش‌کارت...');
        try {
          for (const c of cardPairs) {
            const card = srs.createCard({ front: c.front, back: c.back, topic: st.sourceTitle, conceptType: 'default' });
            await getDatabase().addFlashcard(card as never);
          }
          getToast().success(`${toPersianDigits(String(cardPairs.length))} فلش‌کارت ساخته شد 🃏`);
        } catch { getToast().error('خطا در ساخت فلش‌کارت'); }
        finally { close(); }
      },
    }));

    actions.appendChild(createButton({
      label: '💾 ذخیره به‌عنوان یادداشت',
      variant: BUTTON_VARIANTS.PRIMARY,
      onClick: async () => {
        const content = buildNoteContent(res);
        await getDatabase().addNote({
          id: genId(),
          title: `خلاصه: ${st.sourceTitle}`,
          category: 'سایر',
          content,
          tags: ['خلاصه'],
          wordCount: countWords(content),
          pinned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        getToast().success('به‌عنوان یادداشت ذخیره شد 📚');
      },
    }));

    actions.appendChild(createButton({
      label: '📋 کپی خلاصه',
      variant: BUTTON_VARIANTS.SECONDARY,
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(buildNoteContent(res));
          getToast().success('کپی شد 📋');
        } catch { getToast().error('کپی در این مرورگر ممکن نشد'); }
      },
    }));
    return actions;
  }

  function buildNoteContent(res: ViewResult): string {
    if (res.kind === 'ai') {
      const d = res.data;
      let out = `# خلاصهٔ ${st.sourceTitle}\n\n${d.simple_summary}\n`;
      d.sections.forEach((s) => {
        out += `\n## ${s.title}\n${s.points.map((p) => `- ${p}`).join('\n')}\n`;
      });
      if (d.preserved.length > 0) out += `\n## عیناً از متن\n${d.preserved.map((p) => `> ${p.text}`).join('\n')}\n`;
      if (d.mnemonic) out += `\n🧠 قلاب حافظه: ${d.mnemonic}\n`;
      return out;
    }
    const off = res.data;
    return `# خلاصهٔ ${st.sourceTitle}\n\n${off.summary}\n\n## نکات کلیدی\n${off.keyPoints.map((p) => `- ${p}`).join('\n')}`;
  }

  render();
  return container;
}

export default createSummarizerView;