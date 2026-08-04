/**
 * ============================================================
 * دانش‌یار پرو - NotesView (کارگاه برنامه)
 * ============================================================
 *
 * جایی که کاربر هر روز برمی‌گردد و ارزش می‌سازد
 *
 * 🧱 شبکه آجری (Masonry) با ارتفاع متغیر — مثل Google Keep
 * 🎨 رنگ per دسته — ۱۱ رنگ برای اسکن بصری فوری
 * 📌 بخش پین جداگانه — اسکرول افقی با لهجه کهربایی
 * 🏷️ پشتیبانی کامل تگ‌ها — چیپ قابل کلیک + فیلتر
 * 🔍 جستجوی زنده در عنوان+محتوا+تگ با highlight
 * 🔒 رندر ۱۰۰٪ امن Markdown — ساخت DOM، صفر innerHTML
 * ✍️ ویرایشگر ارتقاءیافته — شمارش زنده + ذخیره خودکار پیش‌نویس
 * ⚡ کاملاً async با IndexedDB
 *
 * @module ui/views/NotesView
 * @version 1.0.0-beta.1
 */

import { getInstance as getLogger } from '@/core/Logger';
import { getDatabase, type DbNote } from '@/core/Database';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '@/ui/components/Button';
import { createInput, createTextarea, createFormGroup, createSearchInput } from '@/ui/components/Input';
import { getModal } from '@/ui/components/Modal';
import { getToast } from '@/ui/components/Toast';
import { createEmptyState } from '@/ui/components/Card';
import { formatPersianDateShort, toPersianDigits } from '@/utils/dateFormatter';

const logger = getLogger().module('NotesView');

// ============================================================
// ثابت‌ها
// ============================================================

const CATEGORIES = [
  'ریاضی', 'فیزیک', 'شیمی', 'زیست‌شناسی', 'ادبیات', 'زبان',
  'تاریخ', 'جغرافیا', 'کامپیوتر', 'فلسفه', 'سایر',
];

/** پالت رنگی دسته‌ها — نوار بالای کارت + چیپ */
const CATEGORY_STYLES: Record<string, { top: string; chip: string }> = {
  'ریاضی': { top: 'border-t-blue-500', chip: 'bg-blue-500/15 text-blue-300' },
  'فیزیک': { top: 'border-t-purple-500', chip: 'bg-purple-500/15 text-purple-300' },
  'شیمی': { top: 'border-t-green-500', chip: 'bg-green-500/15 text-green-300' },
  'زیست‌شناسی': { top: 'border-t-emerald-500', chip: 'bg-emerald-500/15 text-emerald-300' },
  'ادبیات': { top: 'border-t-rose-500', chip: 'bg-rose-500/15 text-rose-300' },
  'زبان': { top: 'border-t-amber-500', chip: 'bg-amber-500/15 text-amber-300' },
  'تاریخ': { top: 'border-t-orange-500', chip: 'bg-orange-500/15 text-orange-300' },
  'جغرافیا': { top: 'border-t-teal-500', chip: 'bg-teal-500/15 text-teal-300' },
  'کامپیوتر': { top: 'border-t-cyan-500', chip: 'bg-cyan-500/15 text-cyan-300' },
  'فلسفه': { top: 'border-t-violet-500', chip: 'bg-violet-500/15 text-violet-300' },
  'سایر': { top: 'border-t-slate-500', chip: 'bg-slate-500/15 text-slate-300' },
};

const DEFAULT_STYLE = { top: 'border-t-slate-500', chip: 'bg-slate-500/15 text-slate-300' };

const DRAFT_KEY = 'daneshyar_note_draft';

// ============================================================
// Types
// ============================================================

interface NotesFilter {
  category: string;
  sort: string;
  query: string;
  tag: string | null;
}

interface NoteCallbacks {
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

// ============================================================
// توابع کمکی خالص
// ============================================================

function getCategoryStyle(category?: string): { top: string; chip: string } {
  return CATEGORY_STYLES[category ?? 'سایر'] ?? DEFAULT_STYLE;
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** حذف علائم Markdown برای پیش‌نمایش تمیز */
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** پارس تگ‌ها از ورودی (با ویرگول فارسی یا انگلیسی) */
function parseTags(input: string): string[] {
  return input
    .split(/[,،]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t, i, arr) => arr.indexOf(t) === i);
}
interface ChipOption {
  value: string;
  label: string;
}

/** ردیف چیپ افقی و اسکرول‌شونده (بدون پاپ‌آپ بومی — هرگز از صفحه بیرون نمی‌زند) */
function createChipRow(
  options: ChipOption[],
  getValue: () => string,
  onChange: (value: string) => void
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'chip-row';
  options.forEach((opt) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'cat-chip' + (opt.value === getValue() ? ' active' : '');
    chip.textContent = opt.label;
    chip.addEventListener('click', () => {
      if (opt.value === getValue()) return;
      onChange(opt.value);
      row.querySelectorAll<HTMLElement>('.cat-chip').forEach((el) => {
        el.classList.toggle('active', el === chip);
      });
    });
    row.appendChild(chip);
  });
  return row;
}

// ============================================================
// رندر امن Markdown (ساخت DOM — صفر XSS)
// ============================================================

/** افزودن متن با فرمت درون‌خطی (bold/italic/code) به صورت امن */
function appendInline(el: HTMLElement, text: string): void {
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      el.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      const strong = document.createElement('strong');
      strong.className = 'font-bold text-primary-300';
      strong.textContent = token.slice(2, -2);
      el.appendChild(strong);
    } else if (token.startsWith('`') && token.endsWith('`')) {
      const code = document.createElement('code');
      code.className = 'rounded bg-slate-900 px-1.5 py-0.5 text-sm text-accent-300';
      code.textContent = token.slice(1, -1);
      el.appendChild(code);
    } else if (token.startsWith('*') && token.endsWith('*')) {
      const em = document.createElement('em');
      em.textContent = token.slice(1, -1);
      el.appendChild(em);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    el.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

/** تبدیل Markdown به DOM امن (هرگز innerHTML با داده کاربر) */
function renderSafeMarkdown(text: string): HTMLElement {
  const container = document.createElement('div');
  container.className = 'space-y-3 leading-relaxed text-slate-200';

  let currentList: HTMLUListElement | null = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();

    if (!line) {
      currentList = null;
      continue;
    }

    const h3 = line.match(/^###\s+(.*)/);
    if (h3) {
      currentList = null;
      const el = document.createElement('h3');
      el.className = 'mt-4 text-lg font-bold text-slate-100';
      el.textContent = h3[1] ?? '';
      container.appendChild(el);
      continue;
    }

    const h2 = line.match(/^##\s+(.*)/);
    if (h2) {
      currentList = null;
      const el = document.createElement('h2');
      el.className = 'mt-5 text-xl font-bold text-slate-100';
      el.textContent = h2[1] ?? '';
      container.appendChild(el);
      continue;
    }

    const h1 = line.match(/^#\s+(.*)/);
    if (h1) {
      currentList = null;
      const el = document.createElement('h1');
      el.className = 'mt-6 text-2xl font-black text-slate-100';
      el.textContent = h1[1] ?? '';
      container.appendChild(el);
      continue;
    }

    const li = line.match(/^[-*]\s+(.*)/);
    if (li) {
      if (!currentList) {
        currentList = document.createElement('ul');
        currentList.className = 'list-inside list-disc space-y-1 text-slate-200';
        container.appendChild(currentList);
      }
      const liEl = document.createElement('li');
      appendInline(liEl, li[1] ?? '');
      currentList.appendChild(liEl);
      continue;
    }

    currentList = null;
    const p = document.createElement('p');
    appendInline(p, line);
    container.appendChild(p);
  }

  return container;
}

/** افزودن متن با highlight امن برای نتایج جستجو */
function appendHighlighted(el: HTMLElement, text: string, query: string): void {
  const q = query.trim().toLowerCase();
  if (!q) {
    el.textContent = text;
    return;
  }

  const lower = text.toLowerCase();
  let lastIndex = 0;
  let idx = lower.indexOf(q);

  while (idx !== -1) {
    if (idx > lastIndex) {
      el.appendChild(document.createTextNode(text.slice(lastIndex, idx)));
    }
    const mark = document.createElement('mark');
    mark.className = 'rounded bg-accent-500/30 px-0.5 text-accent-200';
    mark.textContent = text.slice(idx, idx + q.length);
    el.appendChild(mark);
    lastIndex = idx + q.length;
    idx = lower.indexOf(q, lastIndex);
  }

  if (lastIndex < text.length) {
    el.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

// ============================================================
// ذخیره خودکار پیش‌نویس
// ============================================================

interface Draft {
  title: string;
  content: string;
  category: string;
  tags: string;
}

function isAutoSaveEnabled(): boolean {
  try {
    const raw = localStorage.getItem('daneshyar_settings');
    if (!raw) return true;
    const settings = JSON.parse(raw) as { autoSaveDraft?: boolean };
    return settings.autoSaveDraft !== false;
  } catch {
    return true;
  }
}

function saveDraft(draft: Draft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

// ============================================================
// فیلتر و مرتب‌سازی
// ============================================================

function applyFilter(notes: DbNote[], filter: NotesFilter): DbNote[] {
  let result = [...notes];

  if (filter.category !== 'all') {
    result = result.filter((n) => n.category === filter.category);
  }

  const activeTag = filter.tag;
  if (activeTag) {
    result = result.filter((n) => (n.tags ?? []).includes(activeTag));
  }

  if (filter.query.trim()) {
    const q = filter.query.trim().toLowerCase();
    result = result.filter(
      (n) =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.content || '').toLowerCase().includes(q) ||
        (n.tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  }

  switch (filter.sort) {
    case 'oldest':
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      break;
    case 'title':
      result.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'fa'));
      break;
    case 'words':
      result.sort((a, b) => (b.wordCount ?? 0) - (a.wordCount ?? 0));
      break;
    case 'newest':
    default:
      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  return result;
}

// ============================================================
// کارت یادداشت
// ============================================================

function makeActionBtn(icon: string, title: string, onClick: () => void, danger = false): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = `rounded p-1.5 text-sm transition-colors ${
    danger ? 'bg-red-900/60 hover:bg-red-800' : 'bg-slate-700 hover:bg-slate-600'
  }`;
  btn.textContent = icon;
  btn.title = title;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return btn;
}

function createNoteCard(note: DbNote, query: string, callbacks: NoteCallbacks): HTMLElement {
  const style = getCategoryStyle(note.category);

  const card = document.createElement('div');
  card.className = [
    'group relative cursor-pointer rounded-xl border border-slate-700 border-t-4 bg-slate-800 p-5',
    'transition-all duration-200 hover:-translate-y-1 hover:border-slate-500 hover:shadow-xl',
    style.top,
    note.pinned ? 'ring-1 ring-accent-500/40' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // عنوان
  const title = document.createElement('h3');
  title.className = 'mb-2 font-bold text-slate-100 line-clamp-1 pe-28 lg:pe-0';
  title.textContent = note.title || 'بدون عنوان';
  card.appendChild(title);

  // پیش‌نمایش (Markdown حذف‌شده + highlight جستجو)
  const preview = document.createElement('p');
  preview.className = 'mb-3 text-sm leading-relaxed text-slate-400 line-clamp-5';
  const plain = stripMarkdown(note.content || '');
  const previewText = plain.length > 180 ? plain.substring(0, 180) + '…' : plain;
  appendHighlighted(preview, previewText || 'بدون محتوا', query);
  card.appendChild(preview);

  // تگ‌ها
  if (note.tags && note.tags.length > 0) {
    const tagsRow = document.createElement('div');
    tagsRow.className = 'mb-3 flex flex-wrap gap-1.5';
    note.tags.forEach((t) => {
      const chip = document.createElement('span');
      chip.className = 'rounded-full bg-slate-700/60 px-2 py-0.5 text-xs text-slate-300';
      chip.textContent = `#${t}`;
      tagsRow.appendChild(chip);
    });
    card.appendChild(tagsRow);
  }

  // پانوشت: دسته + کلمات + تاریخ
  const footer = document.createElement('div');
  footer.className = 'flex items-center justify-between text-xs';
  const left = document.createElement('div');
  left.className = 'flex items-center gap-2';
  const catChip = document.createElement('span');
  catChip.className = `rounded px-2 py-0.5 ${style.chip}`;
  catChip.textContent = note.category || 'سایر';
  const words = document.createElement('span');
  words.className = 'text-slate-500';
  words.textContent = `${toPersianDigits(String(note.wordCount ?? 0))} کلمه`;
  left.appendChild(catChip);
  left.appendChild(words);
  const date = document.createElement('span');
  date.className = 'text-slate-500';
  date.textContent = formatPersianDateShort(new Date(note.updatedAt || note.createdAt));
  footer.appendChild(left);
  footer.appendChild(date);
  card.appendChild(footer);

  // اکشن‌های hover
  const actions = document.createElement('div');
  actions.className = 'absolute top-2 end-2 flex gap-1 rounded-lg bg-slate-800/90 p-1 shadow-lg transition-opacity lg:opacity-0 lg:group-hover:opacity-100';
  actions.appendChild(makeActionBtn('✏️', 'ویرایش', () => callbacks.onEdit(note.id)));
  actions.appendChild(makeActionBtn(note.pinned ? '📌' : '📍', note.pinned ? 'حذف پین' : 'پین کردن', () => callbacks.onPin(note.id)));
  actions.appendChild(makeActionBtn('🗑️', 'حذف', () => callbacks.onDelete(note.id), true));
  card.appendChild(actions);

  // کلیک → مشاهده
  card.addEventListener('click', () => callbacks.onView(note.id));

  return card;
}

// ============================================================
// بخش‌های رندر
// ============================================================

function renderPinned(container: HTMLElement, pinned: DbNote[], query: string, callbacks: NoteCallbacks): void {
  container.innerHTML = '';
  if (pinned.length === 0) return;

  const section = document.createElement('div');

  const label = document.createElement('div');
  label.className = 'mb-3 flex items-center gap-2 text-sm font-bold text-accent-400';
  label.textContent = '📌 سنجاق‌شده‌ها';
  section.appendChild(label);

  const scroll = document.createElement('div');
  scroll.className = 'flex gap-4 overflow-x-auto pb-2';

  pinned.forEach((note) => {
    const card = createNoteCard(note, query, callbacks);
    card.style.width = '260px';
    card.style.flexShrink = '0';
    scroll.appendChild(card);
  });

  section.appendChild(scroll);
  container.appendChild(section);
}

function renderTags(
  container: HTMLElement,
  allNotes: DbNote[],
  activeTag: string | null,
  onTagClick: (tag: string | null) => void
): void {
  container.innerHTML = '';

  const tagSet = new Set<string>();
  allNotes.forEach((n) => (n.tags ?? []).forEach((t) => tagSet.add(t)));
  if (tagSet.size === 0) return;

  const wrap = document.createElement('div');
  wrap.className = 'flex flex-wrap items-center gap-2';

  const label = document.createElement('span');
  label.className = 'text-xs text-slate-500';
  label.textContent = '🏷️ تگ‌ها:';
  wrap.appendChild(label);

  Array.from(tagSet).forEach((tag) => {
    const chip = document.createElement('button');
    const isActive = activeTag === tag;
    chip.className = `rounded-full px-3 py-1 text-xs font-medium transition-all ${
      isActive
        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
        : 'bg-slate-700/60 text-slate-300 hover:bg-slate-600'
    }`;
    chip.textContent = `#${tag}`;
    chip.addEventListener('click', () => onTagClick(isActive ? null : tag));
    wrap.appendChild(chip);
  });

  if (activeTag) {
    const clearBtn = document.createElement('button');
    clearBtn.className = 'rounded-full px-3 py-1 text-xs text-slate-400 transition-colors hover:text-slate-200';
    clearBtn.textContent = '✕ پاک کردن';
    clearBtn.addEventListener('click', () => onTagClick(null));
    wrap.appendChild(clearBtn);
  }

  container.appendChild(wrap);
}

function renderGrid(container: HTMLElement, notes: DbNote[], query: string, callbacks: NoteCallbacks): void {
  container.className = 'notes-masonry';
  notes.forEach((note, i) => {
    const card = createNoteCard(note, query, callbacks);
    card.classList.add('note-reveal');
    card.style.animationDelay = `${Math.min(i * 40, 400)}ms`;
    container.appendChild(card);
  });
}

// ============================================================
// View اصلی
// ============================================================

export async function createNotesView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر یادداشت‌ها');

  const container = document.createElement('div');
  container.className = 'mx-auto max-w-6xl space-y-6';

  // state محلی (نه window!)
  let notes: DbNote[] = await getDatabase().getNotes();
  const filter: NotesFilter = { category: 'all', sort: 'newest', query: '', tag: null };

  // ── هدر ──
  const header = document.createElement('div');
  header.className = 'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between';

  const titleWrap = document.createElement('div');
  const h1 = document.createElement('h1');
  h1.className = 'mb-1 text-3xl font-black text-slate-100';
  h1.textContent = 'یادداشت‌ها 📚';
  const statsLine = document.createElement('p');
  statsLine.className = 'text-sm text-slate-400';
  titleWrap.appendChild(h1);
  titleWrap.appendChild(statsLine);

  const newBtn = createButton({
    label: 'یادداشت جدید',
    variant: BUTTON_VARIANTS.PRIMARY,
    size: BUTTON_SIZES.LG,
    icon: '➕',
    onClick: () => {
      openNoteEditor(null);
    },
  });

  // روی موبایل دکمه‌ی هدر پنهان می‌شود (FAB جای آن را می‌گیرد)
  newBtn.classList.add('lg-only');
  header.appendChild(titleWrap);
  header.appendChild(newBtn);
  container.appendChild(header);

  // ── FAB: دکمه‌ی شناور «یادداشت جدید» (ناحیه‌ی شست، فقط موبایل/تبلت) ──
  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'fab below-lg-only scale-in';
  fab.setAttribute('aria-label', 'یادداشت جدید');
  fab.textContent = '+';
  fab.addEventListener('click', () => openNoteEditor(null));
  container.appendChild(fab);

  // ── نوار فرمان (جستجو + فیلتر + مرتب‌سازی — همه لمسی، بدون پاپ‌آپ بومی) ──
  const commandBar = document.createElement('div');
  commandBar.className = 'space-y-3';

  const searchWrap = document.createElement('div');
  searchWrap.appendChild(
    createSearchInput({
      placeholder: 'جستجو در عنوان، محتوا و تگ‌ها...',
      onSearch: (q) => {
        filter.query = q;
        render();
      },
    })
  );
  commandBar.appendChild(searchWrap);

  // فیلتر دسته‌بندی — چیپ‌های افقی اسکرول‌شونده
  commandBar.appendChild(
    createChipRow(
      [{ value: 'all', label: 'همه دسته‌ها' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))],
      () => filter.category,
      (v) => {
        filter.category = v;
        render();
      }
    )
  );

  // مرتب‌سازی — چیپ‌های افقی اسکرول‌شونده
  commandBar.appendChild(
    createChipRow(
      [
        { value: 'newest', label: 'جدیدترین' },
        { value: 'oldest', label: 'قدیمی‌ترین' },
        { value: 'title', label: 'عنوان (الفبا)' },
        { value: 'words', label: 'تعداد کلمات' },
      ],
      () => filter.sort,
      (v) => {
        filter.sort = v;
        render();
      }
    )
  );

  container.appendChild(commandBar);

  // ── ظرف‌ها ──
  const pinnedWrap = document.createElement('div');
  const tagWrap = document.createElement('div');
  const grid = document.createElement('div');
  container.appendChild(pinnedWrap);
  container.appendChild(tagWrap);
  container.appendChild(grid);

  // ── callbacks ──
  const callbacks: NoteCallbacks = {
    onView: (id) => viewNote(id),
    onEdit: (id) => openNoteEditor(id),
    onPin: (id) => {
      void togglePin(id);
    },
    onDelete: (id) => {
      void deleteNote(id);
    },
    onNew: () => openNoteEditor(null),
  };

  // ── refresh ──
  const refresh = async (): Promise<void> => {
    notes = await getDatabase().getNotes();
    render();
  };

  // ── render ──
  const render = (): void => {
    const totalWords = notes.reduce((sum, n) => sum + (n.wordCount ?? 0), 0);
    statsLine.textContent = `${toPersianDigits(String(notes.length))} یادداشت • ${toPersianDigits(String(totalWords))} کلمه`;

    const filtered = applyFilter(notes, filter);
    const pinned = filtered.filter((n) => n.pinned);
    const regular = filtered.filter((n) => !n.pinned);

    renderPinned(pinnedWrap, pinned, filter.query, callbacks);
    renderTags(tagWrap, notes, filter.tag, (tag) => {
      filter.tag = tag;
      render();
    });

    grid.className = '';
    grid.innerHTML = '';

    if (notes.length === 0) {
      grid.appendChild(
        createEmptyState({
          icon: '📝',
          title: 'هنوز یادداشتی نداری',
          message: 'اولین یادداشتت را بساز و شروع به یادگیری کن!',
          actionLabel: '➕ ساخت اولین یادداشت',
          onAction: () => openNoteEditor(null),
        })
      );
    } else if (filtered.length === 0) {
      grid.appendChild(
        createEmptyState({
          icon: '🔍',
          title: 'یادداشتی یافت نشد',
          message: 'فیلترها را تغییر دهید یا جستجوی دیگری انجام دهید.',
        })
      );
    } else {
      renderGrid(grid, regular, filter.query, callbacks);
    }
  };

  // ── ویرایشگر ──
  function openNoteEditor(noteId: string | null): void {
    const isEdit = noteId !== null;
    const existing = isEdit ? notes.find((n) => n.id === noteId) : undefined;

    const content = document.createElement('div');
    content.className = 'space-y-4';

    // عنوان
    const titleInput = createInput({
      id: 'note-title',
      placeholder: 'عنوان یادداشت...',
      value: existing?.title ?? '',
    });
    content.appendChild(createFormGroup({ label: 'عنوان', input: titleInput, required: true }));

    // دسته‌بندی
// Category — انتخابگر لمسی چیپی (به جای select بومی که روی گوشی می‌ریزد)
    let selectedCategory = existing?.category ?? CATEGORIES[0] ?? 'سایر';
    const catWrap = document.createElement('div');
    catWrap.className = 'flex flex-wrap gap-2';
    CATEGORIES.forEach((c) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'cat-chip' + (c === selectedCategory ? ' active' : '');
      chip.textContent = c;
      chip.addEventListener('click', () => {
        selectedCategory = c;
        catWrap.querySelectorAll<HTMLElement>('.cat-chip').forEach((el) => {
          el.classList.toggle('active', el === chip);
        });
        catWrap.dispatchEvent(new Event('change'));
      });
      catWrap.appendChild(chip);
    });
    content.appendChild(createFormGroup({ label: 'دسته‌بندی', input: catWrap }));

    // تگ‌ها
    const tagsInput = createInput({
      id: 'note-tags',
      placeholder: 'ریاضی، فصل ۱، مهم (با ویرگول جدا کنید)',
      value: (existing?.tags ?? []).join('، '),
    });
    content.appendChild(createFormGroup({ label: 'تگ‌ها', input: tagsInput, helpText: 'تگ‌ها را با ویرگول (،) جدا کنید' }));

    const tagsPreview = document.createElement('div');
    tagsPreview.className = 'flex flex-wrap gap-1.5';
    content.appendChild(tagsPreview);

    const updateTagsPreview = (): void => {
      tagsPreview.innerHTML = '';
      parseTags(tagsInput.value).forEach((t) => {
        const chip = document.createElement('span');
        chip.className = 'rounded-full bg-primary-500/15 px-2 py-0.5 text-xs text-primary-300';
        chip.textContent = `#${t}`;
        tagsPreview.appendChild(chip);
      });
    };
    tagsInput.addEventListener('input', updateTagsPreview);
    updateTagsPreview();

    // محتوا + شمارش زنده
    const contentTextarea = createTextarea({
      id: 'note-content',
      placeholder: 'متن یادداشت را اینجا بنویسید... (Markdown پشتیبانی می‌شود)',
      value: existing?.content ?? '',
      rows: 12,
    });
    content.appendChild(
      createFormGroup({
        label: 'محتوا',
        input: contentTextarea,
        helpText: 'از # عنوان، **bold**، *italic*، `code` و - لیست پشتیبانی می‌شود',
        required: true,
      })
    );

    const wordCountEl = document.createElement('div');
    wordCountEl.className = 'text-xs text-slate-500';
    content.appendChild(wordCountEl);

    const updateWordCount = (): void => {
      const wc = countWords(contentTextarea.value);
      wordCountEl.textContent = `${toPersianDigits(String(wc))} کلمه`;
    };
    contentTextarea.addEventListener('input', updateWordCount);
    updateWordCount();

    // ذخیره خودکار پیش‌نویس (فقط یادداشت جدید)
    const autoSave = !isEdit && isAutoSaveEnabled();
    if (autoSave) {
      const draft = loadDraft();
      if (draft && (draft.title || draft.content)) {
        titleInput.value = draft.title;
        selectedCategory = draft.category ?? CATEGORIES[0] ?? 'سایر';
        catWrap.querySelectorAll<HTMLElement>('.cat-chip').forEach((el) => {
          el.classList.toggle('active', el.textContent === selectedCategory);
        });
        tagsInput.value = draft.tags;
        contentTextarea.value = draft.content;
        updateTagsPreview();
        updateWordCount();
        getToast().success('پیش‌نویس ذخیره‌شده بازیابی شد 📝');
      }

      let draftTimer: number | undefined;
      const scheduleDraftSave = (): void => {
        window.clearTimeout(draftTimer);
        draftTimer = window.setTimeout(() => {
          saveDraft({
            title: titleInput.value,
            content: contentTextarea.value,
            category: selectedCategory,
            tags: tagsInput.value,
          });
        }, 800);
      };
      titleInput.addEventListener('input', scheduleDraftSave);
      contentTextarea.addEventListener('input', scheduleDraftSave);
      tagsInput.addEventListener('input', scheduleDraftSave);
      catWrap.addEventListener('change', scheduleDraftSave);
    }

    getModal().open({
      title: isEdit ? '✏️ ویرایش یادداشت' : '📝 یادداشت جدید',
      content,
      size: '3xl',
      buttons: [
        {
          label: 'انصراف',
          type: 'ghost',
          onClick: () => getModal().close(),
        },
        {
          label: isEdit ? 'ذخیره تغییرات' : 'ایجاد یادداشت',
          type: 'primary',
          onClick: async () => {
            const title = titleInput.value.trim();
            const category = selectedCategory;
            const noteContent = contentTextarea.value.trim();
            const tags = parseTags(tagsInput.value);

            if (!title) {
              getToast().warning('لطفاً عنوان را وارد کنید');
              titleInput.focus();
              return;
            }
            if (!noteContent) {
              getToast().warning('لطفاً محتوا را وارد کنید');
              contentTextarea.focus();
              return;
            }

            const wordCount = countWords(noteContent);
            const now = new Date().toISOString();

            if (isEdit && noteId) {
              await getDatabase().updateNote(noteId, {
                title,
                category,
                content: noteContent,
                tags,
                wordCount,
                updatedAt: now,
              });
              getToast().success('یادداشت به‌روزرسانی شد ✨');
            } else {
              await getDatabase().addNote({
                id: genId(),
                title,
                category,
                content: noteContent,
                tags,
                wordCount,
                pinned: false,
                createdAt: now,
                updatedAt: now,
              });
              getToast().success('یادداشت ایجاد شد 🎉');
            }

            clearDraft();
            getModal().close();
            await refresh();
          },
        },
      ],
    });

    setTimeout(() => titleInput.focus(), 100);
  }

  // ── مشاهده یادداشت ──
  function viewNote(noteId: string): void {
    const note = notes.find((n) => n.id === noteId);
    if (!note) {
      getToast().error('یادداشت یافت نشد');
      return;
    }

    const content = document.createElement('div');

    // متادیتا
    const meta = document.createElement('div');
    meta.className = 'mb-4 flex flex-wrap items-center gap-3 border-b border-slate-700 pb-4 text-xs text-slate-400';
    const style = getCategoryStyle(note.category);
    const catChip = document.createElement('span');
    catChip.className = `rounded px-2 py-0.5 ${style.chip}`;
    catChip.textContent = note.category || 'سایر';
    meta.appendChild(catChip);

    const wordsEl = document.createElement('span');
    wordsEl.textContent = `${toPersianDigits(String(note.wordCount ?? 0))} کلمه`;
    meta.appendChild(wordsEl);

    const createdEl = document.createElement('span');
    createdEl.textContent = `ایجاد: ${formatPersianDateShort(new Date(note.createdAt))}`;
    meta.appendChild(createdEl);

    if (note.updatedAt !== note.createdAt) {
      const editedEl = document.createElement('span');
      editedEl.textContent = `ویرایش: ${formatPersianDateShort(new Date(note.updatedAt))}`;
      meta.appendChild(editedEl);
    }
    content.appendChild(meta);

    // تگ‌ها
    if (note.tags && note.tags.length > 0) {
      const tagsRow = document.createElement('div');
      tagsRow.className = 'mb-4 flex flex-wrap gap-1.5';
      note.tags.forEach((t) => {
        const chip = document.createElement('span');
        chip.className = 'rounded-full bg-slate-700/60 px-2 py-0.5 text-xs text-slate-300';
        chip.textContent = `#${t}`;
        tagsRow.appendChild(chip);
      });
      content.appendChild(tagsRow);
    }

    // محتوا (Markdown امن)
    content.appendChild(renderSafeMarkdown(note.content || ''));

    getModal().open({
      title: note.title || 'بدون عنوان',
      content,
      size: '3xl',
      buttons: [
        {
          label: 'بستن',
          type: 'ghost',
          onClick: () => getModal().close(),
        },
        {
          label: '✏️ ویرایش',
          type: 'primary',
          onClick: () => {
            getModal().close();
            setTimeout(() => openNoteEditor(note.id), 200);
          },
        },
      ],
    });
  }

  // ── پین ──
  async function togglePin(noteId: string): Promise<void> {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    await getDatabase().updateNote(noteId, { pinned: !note.pinned });
    getToast().success(note.pinned ? 'پین حذف شد' : 'یادداشت پین شد 📌');
    await refresh();
  }

  // ── حذف ──
  async function deleteNote(noteId: string): Promise<void> {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    const confirmed = await getModal().confirm(
      'حذف یادداشت',
      `آیا از حذف «${note.title}» مطمئن هستید؟ این عمل قابل بازگشت نیست.`,
      { dangerMode: true, confirmText: 'حذف' }
    );
    if (confirmed) {
      await getDatabase().deleteNote(noteId);
      getToast().success('یادداشت حذف شد 🗑️');
      await refresh();
    }
  }

  // رندر اولیه
  render();

  return container;
}

export default createNotesView;