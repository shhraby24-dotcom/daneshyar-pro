/**
 * ============================================================
 * دانش‌یار پرو - SummarizerView (خلاصه‌ساز هوشمند)
 * ============================================================
 * ✨ ورودی انعطاف‌پذیر: انتخاب یادداشت یا متن دلخواه
 * 🎚️ سه سطح خلاصه + حالت کنکوری
 * 📊 نمایش ارزش آنی: فشرده‌سازی + زمان صرفه‌جویی
 * 🔗 حلقه‌های طلایی: خلاصه → فلش‌کارت / یادداشت / کپی
 * 🔒 DOM-امن (textContent)، state محلی، موبایل-اول
 * @module ui/views/SummarizerView
 * @version 1.0.0
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getDatabase, type DbNote } from '@/core/Database';
import { getSummarizer, type SummaryLevel, type SummarizeResult } from '@/services/Summarizer';
import { getSRS } from '@/services/SRS';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '@/ui/components/Button';
import { createTextarea, createFormGroup } from '@/ui/components/Input';
import { getModal } from '@/ui/components/Modal';
import { getToast } from '@/ui/components/Toast';
import { createEmptyState, createSectionHeader } from '@/ui/components/Card';
import { toPersianDigits } from '@/utils/dateFormatter';

const logger = getLogger().module('SummarizerView');
const summarizer = getSummarizer();
const srs = getSRS();

const LEVELS: { value: SummaryLevel; label: string; icon: string }[] = [
  { value: 'short', label: 'کوتاه', icon: '⚡' },
  { value: 'medium', label: 'متوسط', icon: '📄' },
  { value: 'long', label: 'کامل', icon: '📚' },
];

// ============================================================
// Helpers
// ============================================================
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
/** انتخاب مهم‌ترین کلیدواژه‌ی یک جمله (برای ساخت کارت جاخالی) */
function pickKeyword(sentence: string): string | null {
  const first = summarizer.extractKeywords(sentence, 1)[0];
  if (first && sentence.includes(first)) return first;
  const words = sentence.split(/\s+/).filter((w) => w.length >= 3);
  if (words.length === 0) return null;
  return words.reduce((a, b) => (b.length > a.length ? b : a));
}

// ============================================================
// View اصلی
// ============================================================
export async function createSummarizerView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر خلاصه‌ساز');
  const container = document.createElement('div');
  container.className = 'mx-auto max-w-3xl space-y-6';

  let notes: DbNote[] = await getDatabase().getNotes();
  const st = {
    mode: 'note' as 'note' | 'text',
    selectedNoteId: null as string | null,
    customText: '',
    level: 'medium' as SummaryLevel,
    forExam: false,
    result: null as SummarizeResult | null,
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

  // ── Header ──
  function renderHeader(): HTMLElement {
    const h = document.createElement('div');
    h.className = 'text-center space-y-2';
    const em = document.createElement('div'); em.className = 'text-6xl'; em.textContent = '✨';
    const t = document.createElement('h1'); t.className = 'text-3xl font-black text-slate-100'; t.textContent = 'خلاصه‌ساز هوشمند';
    const s = document.createElement('p'); s.className = 'text-sm text-slate-400'; s.textContent = 'متن یا یادداشتت را به خلاصه، نکات کلیدی و فلش‌کارت تبدیل کن';
    h.appendChild(em); h.appendChild(t); h.appendChild(s);
    return h;
  }

  // ── Input ─
  function renderInputCard(): HTMLElement {
    const box = document.createElement('div');
    box.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-4';
    box.appendChild(createSectionHeader({ title: 'منبع متن', icon: '📥' }));

    // سوییچ حالت
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
      ta.addEventListener('input', () => { st.customText = ta.value; wcEl.textContent = `${toPersianDigits(String(countWords(st.customText)))} کلمه`; });
      box.appendChild(createFormGroup({ label: 'متن', input: ta }));
      const wcEl = document.createElement('div');
      wcEl.className = 'text-xs text-slate-500';
      wcEl.textContent = `${toPersianDigits(String(countWords(st.customText)))} کلمه`;
      box.appendChild(wcEl);
    }
    return box;
  }

  // ── Options ──
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

    // Toggle کنکوری
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-900/50 text-start';
    const knobBox = document.createElement('div');
    knobBox.className = `w-10 h-6 rounded-full relative transition-colors flex-shrink-0 ${st.forExam ? 'bg-primary-500' : 'bg-slate-700'}`;
    const knob = document.createElement('div');
    knob.className = `absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${st.forExam ? 'start-5' : 'start-0.5'}`;
    knobBox.appendChild(knob);
    const txt = document.createElement('div'); txt.className = 'flex-1';
    const l = document.createElement('div'); l.className = 'text-sm text-slate-200'; l.textContent = '🎓 حالت کنکوری';
    const d = document.createElement('div'); d.className = 'text-xs text-slate-500'; d.textContent = 'تمرکز بر جملات مهم‌تر (تعاریف، اعداد، فرمول‌ها)';
    txt.appendChild(l); txt.appendChild(d);
    row.appendChild(knobBox); row.appendChild(txt);
    row.addEventListener('click', () => { st.forExam = !st.forExam; render(); });
    box.appendChild(row);
    return box;
  }

  // ── Generate ──
  async function generate(): Promise<void> {
    let text = '';
    let title = 'متن دلخواه';
    if (st.mode === 'note') {
      const n = notes.find((x) => x.id === st.selectedNoteId);
      if (!n) { getToast().warning('یک یادداشت انتخاب کن'); return; }
      text = n.content || '';
      title = n.title || 'یادداشت';
    } else {
      text = st.customText;
    }
    const words = countWords(text);
    if (words < 50) { getToast().warning(`متن کافی نیست (حداقل ۵۰ کلمه — فعلی: ${toPersianDigits(String(words))})`); return; }

    const close = getModal().loading('در حال خلاصه‌سازی...');
    try {
      const res = summarizer.summarize(text, { level: st.level, forExam: st.forExam });
      st.result = res;
      st.sourceTitle = title;
      st.sourceWords = words;
      void getDatabase().logStudySession('summarize', { words, level: st.level });
      render();
      getToast().success('خلاصه آماده شد ✨');
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (e) {
      logger.error('خطا در خلاصه‌سازی', e);
      getToast().error('خطا در خلاصه‌سازی: متن مناسب نیست');
    } finally {
      close();
    }
  }

  // ── Results ──
  function renderResults(res: SummarizeResult): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'space-y-5';

    // StatsBar
    const compress = res.totalSentences > 0 ? Math.round((1 - res.sentenceCount / res.totalSentences) * 100) : 0;
    const summaryWords = countWords(res.summary);
    const savedMin = Math.max(1, Math.round((st.sourceWords - summaryWords) / 150));
    const stats = document.createElement('div');
    stats.className = 'grid grid-cols-3 gap-3';
    [
      { v: `${toPersianDigits(String(res.totalSentences))}→${toPersianDigits(String(res.sentenceCount))}`, l: 'جمله', c: 'text-primary-400' },
      { v: `~${toPersianDigits(String(compress))}٪`, l: 'کوتاه‌تر', c: 'text-accent-400' },
      { v: `⚡ ${toPersianDigits(String(savedMin))} دقیقه`, l: 'صرفه‌جویی', c: 'text-green-400' },
    ].forEach((s) => {
      const b = document.createElement('div'); b.className = 'bg-slate-800 border border-slate-700 rounded-xl p-3 text-center';
      const v = document.createElement('div'); v.className = `text-lg font-bold ${s.c}`; v.textContent = s.v;
      const l = document.createElement('div'); l.className = 'text-xs text-slate-400'; l.textContent = s.l;
      b.appendChild(v); b.appendChild(l); stats.appendChild(b);
    });
    wrap.appendChild(stats);

    // SummaryCard
    const sumBox = document.createElement('div');
    sumBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-5';
    sumBox.appendChild(createSectionHeader({ title: `خلاصه‌ی «${st.sourceTitle}»`, icon: '📄' }));
    const sumText = document.createElement('p');
    sumText.className = 'text-sm leading-relaxed text-slate-200 whitespace-pre-wrap';
    sumText.textContent = res.summary;
    sumBox.appendChild(sumText);
    wrap.appendChild(sumBox);

    // KeyPoints
    if (res.keyPoints.length > 0) {
      const kpBox = document.createElement('div');
      kpBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-5';
      kpBox.appendChild(createSectionHeader({ title: 'نکات کلیدی', icon: '🔑' }));
      const ol = document.createElement('ol');
      ol.className = 'space-y-2 list-decimal list-inside';
      res.keyPoints.forEach((p) => {
        const li = document.createElement('li');
        li.className = 'text-sm text-slate-200 leading-relaxed';
        li.textContent = p;
        ol.appendChild(li);
      });
      kpBox.appendChild(ol);
      wrap.appendChild(kpBox);
    }

    // Keywords chips
    if (res.keywords.length > 0) {
      const kwBox = document.createElement('div');
      kwBox.className = 'bg-slate-800 border border-slate-700 rounded-xl p-5';
      kwBox.appendChild(createSectionHeader({ title: 'کلیدواژه‌ها', icon: '🏷️' }));
      const row = document.createElement('div');
      row.className = 'flex flex-wrap gap-2';
      res.keywords.forEach((k) => {
        const chip = document.createElement('span');
        chip.className = 'rounded-full bg-primary-500/15 text-primary-300 px-3 py-1 text-xs';
        chip.textContent = `#${k}`;
        row.appendChild(chip);
      });
      kwBox.appendChild(row);
      wrap.appendChild(kwBox);
    }

    // Actions (حلقه‌های طلایی)
    const actions = document.createElement('div');
    actions.className = 'grid grid-cols-1 sm:grid-cols-3 gap-3';
    actions.appendChild(createButton({
      label: `🃏 ${toPersianDigits(String(res.keyPoints.length))} فلش‌کارت از نکات`,
      variant: BUTTON_VARIANTS.ACCENT,
      onClick: () => { void toFlashcards(res); },
    }));
    actions.appendChild(createButton({
      label: '💾 ذخیره به‌عنوان یادداشت',
      variant: BUTTON_VARIANTS.PRIMARY,
      onClick: () => { void saveAsNote(res); },
    }));
    actions.appendChild(createButton({
      label: '📋 کپی خلاصه',
      variant: BUTTON_VARIANTS.SECONDARY,
      onClick: () => { void copySummary(res); },
    }));
    wrap.appendChild(actions);
    return wrap;
  }

  // ── Golden loop: نکات → فلش‌کارت (cloze) ──
  async function toFlashcards(res: SummarizeResult): Promise<void> {
    if (res.keyPoints.length === 0) { getToast().warning('نکته‌ای برای تبدیل نیست'); return; }
    const close = getModal().loading('در حال ساخت فلش‌کارت...');
    try {
      let count = 0;
      for (const point of res.keyPoints) {
        const kw = pickKeyword(point);
        if (!kw) continue;
        const card = srs.createCard({
          front: point.replace(kw, '______'),
          back: kw,
          topic: st.sourceTitle,
          conceptType: 'default',
        });
        await getDatabase().addFlashcard(card as never);
        count++;
      }
      getToast().success(`${toPersianDigits(String(count))} فلش‌کارت ساخته شد 🃏`);
    } catch (e) {
      logger.error('خطا در ساخت فلش‌کارت', e);
      getToast().error('خطا در ساخت فلش‌کارت');
    } finally {
      close();
    }
  }

  // ── ذخیره به‌عنوان یادداشت ──
  async function saveAsNote(res: SummarizeResult): Promise<void> {
    const now = new Date().toISOString();
    const content = `# خلاصه‌ی ${st.sourceTitle}\n\n${res.summary}\n\n## نکات کلیدی\n${res.keyPoints.map((p) => `- ${p}`).join('\n')}`;
    await getDatabase().addNote({
      id: genId(),
      title: `خلاصه: ${st.sourceTitle}`,
      category: 'سایر',
      content,
      tags: ['خلاصه'],
      wordCount: countWords(content),
      pinned: false,
      createdAt: now,
      updatedAt: now,
    });
    getToast().success('به‌عنوان یادداشت ذخیره شد 📚');
  }

  // ── کپی ──
  async function copySummary(res: SummarizeResult): Promise<void> {
    const text = res.summary + '\n\n' + res.keyPoints.map((p) => `• ${p}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      getToast().success('کپی شد 📋');
    } catch {
      getToast().error('کپی در این مرورگر ممکن نشد');
    }
  }

  render();
  return container;
}

export default createSummarizerView;