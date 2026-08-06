/**
 * ============================================================
 * دانش‌یار پرو - جستجوی سراسری (Command Palette)
 * ============================================================
 * 🔍 جستجوی زنده در یادداشت‌ها + فلش‌کارت‌ها + آزمون‌ها
 * ⌨️ ناوبری کیبورد (↑↓ / Enter / Esc) + هایلایت امن
 * 💎 ردیف پریمیوم «جستجوی معنایی AI» (قلاب پول‌سازی)
 * @module ui/components/GlobalSearch
 * @version 1.0.0
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getDatabase, type DbNote, type DbFlashcard, type DbQuizResult } from '@/core/Database';
import { getRouter } from '@/core/Router';
import { toPersianDigits } from '@/utils/dateFormatter';

const logger = getLogger().module('GlobalSearch');

interface Data { notes: DbNote[]; cards: DbFlashcard[]; quizzes: DbQuizResult[]; }

let overlay: HTMLElement | null = null;

/** هایلایت امن (بدون innerHTML روی داده کاربر) */
function appendHighlighted(el: HTMLElement, text: string, query: string): void {
  const q = query.trim().toLowerCase();
  if (!q) { el.textContent = text; return; }
  const lower = text.toLowerCase();
  let last = 0;
  let idx = lower.indexOf(q);
  while (idx !== -1) {
    if (idx > last) el.appendChild(document.createTextNode(text.slice(last, idx)));
    const mark = document.createElement('mark');
    mark.className = 'search-mark';
    mark.textContent = text.slice(idx, idx + q.length);
    el.appendChild(mark);
    last = idx + q.length;
    idx = lower.indexOf(q, last);
  }
  if (last < text.length) el.appendChild(document.createTextNode(text.slice(last)));
}

export function openSearchPalette(): void {
  if (overlay) return;
  const router = getRouter();

  overlay = document.createElement('div');
  overlay.className = 'search-overlay';
  overlay.innerHTML = `
    <div class="search-panel" role="dialog" aria-modal="true" aria-label="جستجوی سراسری">
      <div class="search-head">
        <span class="search-head-icon">🔍</span>
        <input id="search-input" class="search-input" placeholder="جستجو در یادداشت‌ها، فلش‌کارت‌ها و آزمون‌ها..." autocomplete="off" />
        <button id="search-close" class="search-close" aria-label="بستن">✕</button>
      </div>
      <div id="search-results" class="search-results"></div>
      <div class="search-foot">
        <span>↑↓ حرکت</span><span>↵ باز کردن</span><span>Esc بستن</span>
        <span class="search-premium">💎 جستجوی معنایی AI — به‌زودی</span>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const input = overlay.querySelector<HTMLInputElement>('#search-input')!;
  const resultsEl = overlay.querySelector<HTMLElement>('#search-results')!;
  const closeBtn = overlay.querySelector<HTMLElement>('#search-close')!;

  let data: Data = { notes: [], cards: [], quizzes: [] };
  let loaded = false;
  let flat: Array<{ el: HTMLElement; select: () => void }> = [];
  let selected = -1;

  const close = (): void => { if (overlay) { overlay.remove(); overlay = null; } };

  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
  closeBtn.addEventListener('click', close);

  // بارگذاری یک‌باره‌ی داده‌ها
  void (async () => {
    const [notes, cards, quizzes] = await Promise.all([
      getDatabase().getNotes(),
      getDatabase().getFlashcards(),
      getDatabase().getQuizHistory(),
    ]);
    data = { notes, cards, quizzes };
    loaded = true;
    run(input.value);
  })();

  let debounce: number | undefined;
  input.addEventListener('input', () => {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(() => run(input.value), 120);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); const f = flat[selected]; if (f) f.select(); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });

  function move(d: number): void {
    if (flat.length === 0) return;
    selected = (selected + d + flat.length) % flat.length;
    paint();
  }
  function paint(): void {
    flat.forEach((f, i) => f.el.classList.toggle('selected', i === selected));
    const cur = flat[selected];
    if (cur) cur.el.scrollIntoView({ block: 'nearest' });
  }

  function group(title: string): HTMLElement {
    const g = document.createElement('div');
    const h = document.createElement('div');
    h.className = 'search-group-title';
    h.textContent = title;
    g.appendChild(h);
    resultsEl.appendChild(g);
    return g;
  }

  function addItem(g: HTMLElement, icon: string, title: string, snippet: string, meta: string, select: () => void): void {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'search-item';
    const ic = document.createElement('span'); ic.className = 'search-item-icon'; ic.textContent = icon;
    const body = document.createElement('div'); body.className = 'search-item-body';
    const t = document.createElement('div'); t.className = 'search-item-title'; appendHighlighted(t, title, input.value);
    const s = document.createElement('div'); s.className = 'search-item-snippet'; appendHighlighted(s, snippet, input.value);
    body.appendChild(t); body.appendChild(s);
    const m = document.createElement('span'); m.className = 'search-item-meta'; m.textContent = meta;
    btn.appendChild(ic); btn.appendChild(body); btn.appendChild(m);
    btn.addEventListener('click', select);
    flat.push({ el: btn, select });
    g.appendChild(btn);
  }

  function run(q: string): void {
    resultsEl.innerHTML = '';
    flat = [];
    selected = -1;
    if (!loaded) { resultsEl.innerHTML = '<div class="search-empty">در حال بارگذاری...</div>'; return; }
    const query = q.trim();
    if (!query) {
      resultsEl.innerHTML = '<div class="search-empty">برای جستجو تایپ کن...<br><span class="search-empty-hint">جستجو در یادداشت‌ها، فلش‌کارت‌ها و آزمون‌ها</span></div>';
      return;
    }
    const ql = query.toLowerCase();

    const notes = data.notes.filter((n) =>
      (n.title || '').toLowerCase().includes(ql) ||
      (n.content || '').toLowerCase().includes(ql) ||
      (n.tags ?? []).some((t) => t.toLowerCase().includes(ql))
    ).slice(0, 6);
    const cards = data.cards.filter((c) =>
      (c.front || '').toLowerCase().includes(ql) || (c.back || '').toLowerCase().includes(ql)
    ).slice(0, 6);
    const quizzes = data.quizzes.filter((x) => (x.title || '').toLowerCase().includes(ql)).slice(0, 4);

    if (notes.length === 0 && cards.length === 0 && quizzes.length === 0) {
      resultsEl.innerHTML = '<div class="search-empty">😕 نتیجه‌ای یافت نشد</div>';
      return;
    }

    if (notes.length > 0) {
      const g = group('📚 یادداشت‌ها');
      notes.forEach((n) => addItem(g, '📝', n.title || 'بدون عنوان', (n.content || '').slice(0, 80), n.category || 'سایر', () => {
        sessionStorage.setItem('pendingOpenNote', n.id);
        router.navigate('notes');
        close();
      }));
    }
    if (cards.length > 0) {
      const g = group('🃏 فلش‌کارت‌ها');
      cards.forEach((c) => addItem(g, '🃏', c.front, c.back, c.deck || '', () => { router.navigate('flashcards'); close(); }));
    }
    if (quizzes.length > 0) {
      const g = group('📊 آزمون‌ها');
      quizzes.forEach((x) => addItem(g, '📊', x.title || 'آزمون', `نمره: ${toPersianDigits(String(x.percentage ?? 0))}٪`, '', () => { router.navigate('quiz'); close(); }));
    }
    selected = 0;
    paint();
  }

  input.focus();
  logger.debug('پالت جستجو باز شد');
}