/**
 * ============================================================
 * دانش‌یار پرو - NotesView (نسخه‌ی ۵ — «حسِ Bear، هویتِ دانش‌یار»)
 * ============================================================
 * 🌙 تاریکِ آرام و تایپوگرافی‌محور (اصل خونسردی رنگ‌ها در دارک‌مود)
 * 🎨 بنفش=اکشن · طلایی=پین/ارزش · رنگ دسته=لهجه‌ی ظریف (نوار ۳px + نقطه)
 * 📖 حالت مطالعه‌ی تمام‌صفحه (Zen): نوار محوشونده + swipe پایین + ESC
 * 🃏 اکشن‌ها در پانوشتِ جدا (هرگز روی متن نیستند)
 * 🔍 جستجو با تراز inline تضمینی
 * 💰 چیپ ظریف upsell برای کاربر رایگان (پول‌سازی غیرمزاحم)
 * 🔒 Markdown امن · XSS-safe · فقط کلاس‌های Tailwind کامل و ثابت
 * @module ui/views/NotesView
 * @version 5.0.0
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getDatabase, type DbNote } from '@/core/Database';
import { getRouter } from '@/core/Router';
import { isPremium } from '@/services/Premium';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '@/ui/components/Button';
import { createInput, createTextarea, createFormGroup } from '@/ui/components/Input';
import { getModal } from '@/ui/components/Modal';
import { getToast } from '@/ui/components/Toast';
import { formatPersianDateShort, toPersianDigits } from '@/utils/dateFormatter';
import { createIcon, iconHTML } from '@/services/IconService';

const logger = getLogger().module('NotesView');

// ============================================================
// ثابت‌ها (همه‌ی کلاس‌های رنگی = رشته‌ی کامل و ثابت برای Tailwind v4)
// ============================================================
const CATEGORIES = [
  'ریاضی', 'فیزیک', 'شیمی', 'زیست‌شناسی', 'ادبیات', 'زبان',
  'تاریخ', 'جغرافیا', 'کامپیوتر', 'فلسفه', 'سایر',
];
/** لهجه‌ی ظریف دسته: نوار باریک + چیپ کم‌رنگ + هاله‌ی رینگ */
const CATEGORY_STYLES: Record<string, { bar: string; chip: string; ring: string }> = {
  'ریاضی': { bar: 'bg-sky-500', chip: 'bg-sky-500/10 text-sky-300', ring: 'ring-sky-400/60' },
  'فیزیک': { bar: 'bg-violet-500', chip: 'bg-violet-500/10 text-violet-300', ring: 'ring-violet-400/60' },
  'شیمی': { bar: 'bg-green-500', chip: 'bg-green-500/10 text-green-300', ring: 'ring-green-400/60' },
  'زیست‌شناسی': { bar: 'bg-lime-500', chip: 'bg-lime-500/10 text-lime-300', ring: 'ring-lime-400/60' },
  'ادبیات': { bar: 'bg-rose-500', chip: 'bg-rose-500/10 text-rose-300', ring: 'ring-rose-400/60' },
  'زبان': { bar: 'bg-amber-500', chip: 'bg-amber-500/10 text-amber-300', ring: 'ring-amber-400/60' },
  'تاریخ': { bar: 'bg-orange-500', chip: 'bg-orange-500/10 text-orange-300', ring: 'ring-orange-400/60' },
  'جغرافیا': { bar: 'bg-teal-500', chip: 'bg-teal-500/10 text-teal-300', ring: 'ring-teal-400/60' },
  'کامپیوتر': { bar: 'bg-cyan-500', chip: 'bg-cyan-500/10 text-cyan-300', ring: 'ring-cyan-400/60' },
  'فلسفه': { bar: 'bg-fuchsia-500', chip: 'bg-fuchsia-500/10 text-fuchsia-300', ring: 'ring-fuchsia-400/60' },
  'سایر': { bar: 'bg-slate-600', chip: 'bg-slate-500/10 text-slate-300', ring: 'ring-slate-400/60' },
};
const DEFAULT_STYLE = { bar: 'bg-slate-600', chip: 'bg-slate-500/10 text-slate-300', ring: 'ring-slate-400/60' };
const DRAFT_KEY = 'daneshyar_note_draft';
const UPSELL_KEY = 'daneshyar_notes_upsell_dismissed';

interface NotesFilter { category: string; sort: string; query: string; tag: string | null; }
interface NoteCallbacks {
  onView: (id: string) => void; onEdit: (id: string) => void;
  onPin: (id: string) => void; onDelete: (id: string) => void; onNew: () => void;
}

// ============================================================
// توابع کمکی خالص
// ============================================================
function getCategoryStyle(c?: string): { bar: string; chip: string; ring: string } {
  return CATEGORY_STYLES[c ?? 'سایر'] ?? DEFAULT_STYLE;
}
function genId(): string { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function countWords(t: string): number { return t.trim().split(/\s+/).filter(Boolean).length; }
function stripMarkdown(t: string): string {
  return t.replace(/^#{1,3}\s+/gm, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1').replace(/^[-*]\s+/gm, '').replace(/\s+/g, ' ').trim();
}
function parseTags(input: string): string[] {
  return input.split(/[,،]/).map((t) => t.trim()).filter(Boolean).filter((t, i, a) => a.indexOf(t) === i);
}

// ============================================================
// رندر امن Markdown
// ============================================================
function appendInline(el: HTMLElement, text: string): void {
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) el.appendChild(document.createTextNode(text.slice(last, m.index)));
    const tok = m[0];
    if (tok.startsWith('**')) { const s = document.createElement('strong'); s.className = 'font-bold text-primary-300'; s.textContent = tok.slice(2, -2); el.appendChild(s); }
    else if (tok.startsWith('`')) { const c = document.createElement('code'); c.className = 'rounded bg-slate-800 px-1.5 py-0.5 text-sm text-accent-300'; c.textContent = tok.slice(1, -1); el.appendChild(c); }
    else { const em = document.createElement('em'); em.textContent = tok.slice(1, -1); el.appendChild(em); }
    last = m.index + tok.length;
  }
  if (last < text.length) el.appendChild(document.createTextNode(text.slice(last)));
}
function renderSafeMarkdown(text: string): HTMLElement {
  const box = document.createElement('div');
  box.className = 'space-y-4 text-base leading-loose text-slate-200';
  let list: HTMLUListElement | null = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) { list = null; continue; }
    const h3 = line.match(/^###\s+(.*)/); const h2 = line.match(/^##\s+(.*)/); const h1 = line.match(/^#\s+(.*)/);
    const li = line.match(/^[-*]\s+(.*)/);
    if (h3) { list = null; const e = document.createElement('h3'); e.className = 'mt-4 text-lg font-bold text-slate-100'; e.textContent = h3[1] ?? ''; box.appendChild(e); continue; }
    if (h2) { list = null; const e = document.createElement('h2'); e.className = 'mt-5 text-xl font-bold text-slate-100'; e.textContent = h2[1] ?? ''; box.appendChild(e); continue; }
    if (h1) { list = null; const e = document.createElement('h1'); e.className = 'mt-6 text-2xl font-black text-slate-100'; e.textContent = h1[1] ?? ''; box.appendChild(e); continue; }
    if (li) {
      if (!list) { list = document.createElement('ul'); list.className = 'list-inside list-disc space-y-1'; box.appendChild(list); }
      const l = document.createElement('li'); appendInline(l, li[1] ?? ''); list.appendChild(l); continue;
    }
    list = null; const p = document.createElement('p'); appendInline(p, line); box.appendChild(p);
  }
  return box;
}
function appendHighlighted(el: HTMLElement, text: string, query: string): void {
  const q = query.trim().toLowerCase();
  if (!q) { el.textContent = text; return; }
  const lower = text.toLowerCase();
  let last = 0; let idx = lower.indexOf(q);
  while (idx !== -1) {
    if (idx > last) el.appendChild(document.createTextNode(text.slice(last, idx)));
    const mark = document.createElement('mark');
    mark.className = 'rounded bg-accent-500/30 px-0.5 text-accent-200';
    mark.textContent = text.slice(idx, idx + q.length);
    el.appendChild(mark);
    last = idx + q.length; idx = lower.indexOf(q, last);
  }
  if (last < text.length) el.appendChild(document.createTextNode(text.slice(last)));
}

// ============================================================
// پیش‌نویس خودکار
// ============================================================
interface Draft { title: string; content: string; category: string; tags: string; }
function isAutoSaveEnabled(): boolean {
  try { const r = localStorage.getItem('daneshyar_settings'); if (!r) return true; return (JSON.parse(r) as { autoSaveDraft?: boolean }).autoSaveDraft !== false; } catch { return true; }
}
function saveDraft(d: Draft): void { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* ignore */ } }
function loadDraft(): Draft | null { try { const r = localStorage.getItem(DRAFT_KEY); return r ? (JSON.parse(r) as Draft) : null; } catch { return null; } }
function clearDraft(): void { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } }

// ============================================================
// فیلتر/مرتب‌سازی
// ============================================================
function applyFilter(notes: DbNote[], f: NotesFilter): DbNote[] {
  let r = [...notes];
  if (f.category !== 'all') r = r.filter((n) => (n.category || 'سایر') === f.category);
  if (f.tag) r = r.filter((n) => (n.tags ?? []).includes(f.tag as string));
  if (f.query.trim()) {
    const q = f.query.trim().toLowerCase();
    r = r.filter((n) => (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q) || (n.tags ?? []).some((t) => t.toLowerCase().includes(q)));
  }
  switch (f.sort) {
    case 'oldest': r.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
    case 'title': r.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'fa')); break;
    case 'words': r.sort((a, b) => (b.wordCount ?? 0) - (a.wordCount ?? 0)); break;
    default: r.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
  return r;
}

// ============================================================
// اجزای خودکفا
// ============================================================
function buildEmpty(icon: string, title: string, msg: string, actionLabel?: string, onAction?: () => void): HTMLElement {
  const c = document.createElement('div');
  c.className = 'flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border border-dashed border-slate-700 bg-slate-800/40';
  const iw = document.createElement('div');
  iw.className = 'w-20 h-20 rounded-2xl bg-primary-500/15 text-primary-300 flex items-center justify-center mb-6';
  iw.appendChild(createIcon(icon, 40));
  c.appendChild(iw);
  const t = document.createElement('h3'); t.className = 'text-xl font-black text-slate-100 mb-2'; t.textContent = title; c.appendChild(t);
  const m = document.createElement('p'); m.className = 'text-sm text-slate-400 max-w-sm leading-relaxed mb-6'; m.textContent = msg; c.appendChild(m);
  if (actionLabel && onAction) c.appendChild(createButton({ label: actionLabel, iconHtml: iconHTML('add', 16), variant: BUTTON_VARIANTS.PRIMARY, onClick: onAction }));
  return c;
}

/** جستجو با تراز inline تضمینی (بدون تداخل کلاس) */
function createNotesSearch(onSearch: (q: string) => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.position = 'relative';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'جستجو در عنوان، محتوا و تگ‌ها...';
  input.className = 'input';
  input.style.paddingInlineStart = '46px';
  input.style.paddingInlineEnd = '44px';
  const icon = createIcon('search', 18, 'text-slate-400');
  icon.style.position = 'absolute';
  icon.style.insetInlineStart = '14px';
  icon.style.top = '50%';
  icon.style.transform = 'translateY(-50%)';
  icon.style.display = 'flex';
  icon.style.pointerEvents = 'none';
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'text-slate-400 hover:text-slate-200 transition-all duration-200 opacity-0 pointer-events-none flex items-center justify-center w-7 h-7 rounded-full hover:bg-slate-700';
  clearBtn.innerHTML = iconHTML('close', 15);
  clearBtn.style.position = 'absolute';
  clearBtn.style.insetInlineEnd = '10px';
  clearBtn.style.top = '50%';
  clearBtn.style.transform = 'translateY(-50%)';
  clearBtn.setAttribute('aria-label', 'پاک کردن');
  let timer: ReturnType<typeof setTimeout> | null = null;
  input.addEventListener('input', () => {
    if (input.value) clearBtn.classList.remove('opacity-0', 'pointer-events-none');
    else clearBtn.classList.add('opacity-0', 'pointer-events-none');
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => { if (document.body.contains(input)) onSearch(input.value); }, 300);
  });
  clearBtn.addEventListener('click', () => { input.value = ''; clearBtn.classList.add('opacity-0', 'pointer-events-none'); input.focus(); onSearch(''); });
  wrap.appendChild(input); wrap.appendChild(icon); wrap.appendChild(clearBtn);
  return wrap;
}

/** دکمه‌ی اکشن کوچک و آرام (پانوشت کارت) */
function makeActionBtn(icon: string, title: string, onClick: () => void, danger = false): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = `flex items-center justify-center w-9 h-9 rounded-md text-slate-400 transition-colors ${
    danger ? 'hover:text-red-400 hover:bg-red-500/10' : 'hover:text-slate-100 hover:bg-slate-700'
  }`;
  btn.innerHTML = iconHTML(icon, 15);
  btn.title = title;
  btn.setAttribute('aria-label', title);
  btn.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
  return btn;
}

// ============================================================
// کارت یادداشت (نوار لهجه + پانوشتِ جدا)
// ============================================================
function createNoteCard(note: DbNote, query: string, cb: NoteCallbacks): HTMLElement {
  const style = getCategoryStyle(note.category);
  const card = document.createElement('div');
  card.className = [
    'group relative cursor-pointer rounded-xl border border-slate-700 bg-slate-800 p-4 ps-5 overflow-hidden',
    'transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-500 hover:shadow-xl',
    note.pinned ? 'ring-1 ring-accent-500/50' : '',
  ].filter(Boolean).join(' ');

  const bar = document.createElement('span');
  bar.className = `absolute inset-y-0 start-0 w-1 rounded-s ${style.bar}`;
  card.appendChild(bar);

  const titleRow = document.createElement('div');
  titleRow.className = 'mb-2 flex items-center gap-1.5';
  if (note.pinned) {
    const pin = document.createElement('span');
    pin.className = 'flex flex-shrink-0 items-center text-accent-400';
    pin.innerHTML = iconHTML('pin', 14);
    titleRow.appendChild(pin);
  }
  const title = document.createElement('h3');
  title.className = 'font-bold text-slate-100 line-clamp-1';
  title.textContent = note.title || 'بدون عنوان';
  titleRow.appendChild(title);
  card.appendChild(titleRow);

  const preview = document.createElement('p');
  preview.className = 'mb-3 text-sm leading-relaxed text-slate-400 line-clamp-3';
  const plain = stripMarkdown(note.content || '');
  appendHighlighted(preview, plain.length > 150 ? plain.substring(0, 150) + '…' : plain || 'بدون محتوا', query);
  card.appendChild(preview);

  if (note.tags && note.tags.length > 0) {
    const tagsRow = document.createElement('div');
    tagsRow.className = 'mb-3 flex flex-wrap gap-1.5';
    note.tags.slice(0, 4).forEach((t) => {
      const chip = document.createElement('span');
      chip.className = 'rounded-full bg-slate-700/60 px-2 py-0.5 text-xs text-slate-300';
      chip.textContent = `#${t}`;
      tagsRow.appendChild(chip);
    });
    card.appendChild(tagsRow);
  }

  // ── پانوشت: متا + اکشن‌ها — با جداکننده، هرگز روی متن نیستند ──
  const footer = document.createElement('div');
  footer.className = 'flex items-center justify-between gap-2 border-t border-slate-700/60 pt-2.5';
  const meta = document.createElement('div');
  meta.className = 'flex items-center gap-2 text-xs min-w-0';
  const catChip = document.createElement('span');
  catChip.className = `rounded-full px-2 py-0.5 ${style.chip}`;
  catChip.textContent = note.category || 'سایر';
  const words = document.createElement('span');
  words.className = 'text-slate-500 whitespace-nowrap';
  words.textContent = `${toPersianDigits(String(note.wordCount ?? 0))} کلمه`;
  const date = document.createElement('span');
  date.className = 'text-slate-500 hidden sm:inline whitespace-nowrap';
  date.textContent = formatPersianDateShort(new Date(note.updatedAt || note.createdAt));
  meta.appendChild(catChip); meta.appendChild(words); meta.appendChild(date);
  const actions = document.createElement('div');
  actions.className = 'flex items-center gap-0.5 flex-shrink-0';
  actions.appendChild(makeActionBtn('eye', 'مطالعه', () => cb.onView(note.id)));
  actions.appendChild(makeActionBtn('edit', 'ویرایش', () => cb.onEdit(note.id)));
  actions.appendChild(makeActionBtn('pin', note.pinned ? 'حذف پین' : 'پین کردن', () => cb.onPin(note.id)));
  actions.appendChild(makeActionBtn('trash', 'حذف', () => cb.onDelete(note.id), true));
  footer.appendChild(meta); footer.appendChild(actions);
  card.appendChild(footer);

  card.addEventListener('click', () => cb.onView(note.id));
  return card;
}

function renderPinned(container: HTMLElement, pinned: DbNote[], query: string, cb: NoteCallbacks): void {
  container.innerHTML = '';
  if (pinned.length === 0) return;
  const section = document.createElement('div');
  const label = document.createElement('div');
  label.className = 'mb-3 flex items-center gap-2 text-sm font-bold text-accent-400';
  label.appendChild(createIcon('pin', 16));
  const lt = document.createElement('span'); lt.textContent = 'سنجاق‌شده‌ها';
  label.appendChild(lt);
  section.appendChild(label);
  const scroll = document.createElement('div');
  scroll.className = 'flex gap-4 overflow-x-auto pb-2 no-scrollbar';
  pinned.forEach((n) => { const c = createNoteCard(n, query, cb); c.style.width = '260px'; c.style.flexShrink = '0'; scroll.appendChild(c); });
  section.appendChild(scroll);
  container.appendChild(section);
}
function renderTags(container: HTMLElement, allNotes: DbNote[], activeTag: string | null, onTagClick: (t: string | null) => void): void {
  container.innerHTML = '';
  const tagSet = new Set<string>();
  allNotes.forEach((n) => (n.tags ?? []).forEach((t) => tagSet.add(t)));
  if (tagSet.size === 0) return;
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-wrap items-center gap-2';
  const label = document.createElement('span');
  label.className = 'flex items-center gap-1 text-xs text-slate-500';
  label.appendChild(createIcon('tag', 14));
  const lt = document.createElement('span'); lt.textContent = 'تگ‌ها:';
  label.appendChild(lt);
  wrap.appendChild(label);
  Array.from(tagSet).forEach((tag) => {
    const chip = document.createElement('button');
    const active = activeTag === tag;
    chip.className = `rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
      active ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' : 'bg-slate-700/60 text-slate-300 hover:bg-slate-600'
    }`;
    chip.textContent = `#${tag}`;
    chip.addEventListener('click', () => onTagClick(active ? null : tag));
    wrap.appendChild(chip);
  });
  if (activeTag) {
    const clear = document.createElement('button');
    clear.className = 'flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200';
    clear.appendChild(createIcon('close', 12));
    const ct = document.createElement('span'); ct.textContent = 'پاک کردن';
    clear.appendChild(ct);
    clear.addEventListener('click', () => onTagClick(null));
    wrap.appendChild(clear);
  }
  container.appendChild(wrap);
}
function renderGrid(container: HTMLElement, notes: DbNote[], query: string, cb: NoteCallbacks): void {
  container.className = 'notes-masonry';
  notes.forEach((n, i) => {
    const c = createNoteCard(n, query, cb);
    c.classList.add('note-reveal');
    c.style.animationDelay = `${Math.min(i * 40, 400)}ms`;
    container.appendChild(c);
  });
}

// ============================================================
// نوار ابزار Markdown (ویرایشگر)
// ============================================================
function applyMarkdown(ta: HTMLTextAreaElement, type: string): void {
  const s = ta.selectionStart ?? 0; const e = ta.selectionEnd ?? 0;
  const sel = ta.value.slice(s, e) || 'متن';
  let ins = '';
  switch (type) {
    case 'bold': ins = `**${sel}**`; break;
    case 'italic': ins = `*${sel}*`; break;
    case 'code': ins = `\`${sel}\``; break;
    case 'h': ins = `\n# ${sel}`; break;
    case 'list': ins = `\n- ${sel}`; break;
  }
  ta.value = ta.value.slice(0, s) + ins + ta.value.slice(e);
  ta.focus();
  ta.dispatchEvent(new Event('input'));
}
function createMdToolbar(ta: HTMLTextAreaElement): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'flex flex-wrap gap-1.5';
  [{ t: 'B', type: 'bold', title: 'بولد' }, { t: 'I', type: 'italic', title: 'ایتالیک' }, { t: '</>', type: 'code', title: 'کد' }, { t: 'H', type: 'h', title: 'عنوان' }, { t: '•', type: 'list', title: 'لیست' }].forEach((it) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'min-w-9 h-9 px-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-300 text-sm font-bold hover:bg-slate-700 transition-colors';
    b.textContent = it.t; b.title = it.title;
    b.addEventListener('click', () => applyMarkdown(ta, it.type));
    bar.appendChild(b);
  });
  return bar;
}

// ============================================================
// View اصلی
// ============================================================
export async function createNotesView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  const pending = sessionStorage.getItem('pendingOpenNote');
  if (pending) { sessionStorage.removeItem('pendingOpenNote'); setTimeout(() => openZenById(pending), 250); }
  logger.info('رندر یادداشت‌ها (v5)');
  const container = document.createElement('div');
  container.className = 'mx-auto max-w-6xl space-y-5 pb-24 lg:pb-6';

  let notes: DbNote[] = await getDatabase().getNotes();
  const filter: NotesFilter = { category: 'all', sort: 'newest', query: '', tag: null };

  // ── هدر آرام + هیرلاین برند ──
  const header = document.createElement('div');
  header.className = 'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between';
  const titleWrap = document.createElement('div');
  const titleRow = document.createElement('div');
  titleRow.className = 'flex items-center gap-3';
  const headIcon = document.createElement('div');
  headIcon.className = 'w-12 h-12 rounded-xl bg-primary-500/15 text-primary-300 flex items-center justify-center';
  headIcon.appendChild(createIcon('notes', 26));
  titleRow.appendChild(headIcon);
  const h1 = document.createElement('h1');
  h1.className = 'text-2xl sm:text-3xl font-black text-slate-100';
  h1.textContent = 'یادداشت‌ها';
  titleRow.appendChild(h1);
  titleWrap.appendChild(titleRow);
  const statsLine = document.createElement('p');
  statsLine.className = 'mt-2 text-sm text-slate-400';
  titleWrap.appendChild(statsLine);
  const newBtn = createButton({ label: 'یادداشت جدید', variant: BUTTON_VARIANTS.PRIMARY, size: BUTTON_SIZES.LG, iconHtml: iconHTML('add', 18), onClick: () => openNoteEditor(null) });
  newBtn.classList.add('lg-only');
  header.appendChild(titleWrap); header.appendChild(newBtn);
  container.appendChild(header);

  // ── FAB موبایل ──
  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'fab below-lg-only scale-in';
  fab.setAttribute('aria-label', 'یادداشت جدید');
  fab.innerHTML = iconHTML('add', 24);
  fab.addEventListener('click', () => openNoteEditor(null));
  container.appendChild(fab);

  // ── چیپ ظریف upsell (فقط کاربر رایگان، حداکثر روزی یک‌بار) ──
  if (!isPremium()) {
    const today = new Date().toDateString();
    let dismissed = false;
    try { dismissed = localStorage.getItem(UPSELL_KEY) === today; } catch { /* ignore */ }
    if (!dismissed) {
      const upsell = document.createElement('div');
      upsell.className = 'flex items-center gap-3 rounded-xl border border-accent-500/30 bg-accent-500/10 px-4 py-3';
      upsell.appendChild(createIcon('sparkles', 20, 'text-accent-400 flex-shrink-0'));
      const ut = document.createElement('div');
      ut.className = 'flex-1 text-sm text-slate-200';
      ut.textContent = 'با پریمیوم: یادداشت و هوش مصنوعی نامحدود';
      upsell.appendChild(ut);
      const go = document.createElement('button');
      go.type = 'button';
      go.className = 'text-xs font-bold text-accent-300 hover:text-accent-200 whitespace-nowrap';
      go.textContent = 'مشاهده';
      go.addEventListener('click', () => { void getRouter().navigate('premium'); });
      upsell.appendChild(go);
      const dismiss = document.createElement('button');
      dismiss.type = 'button';
      dismiss.className = 'flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:text-slate-200 flex-shrink-0';
      dismiss.innerHTML = iconHTML('close', 14);
      dismiss.setAttribute('aria-label', 'بستن');
      dismiss.addEventListener('click', () => { try { localStorage.setItem(UPSELL_KEY, today); } catch { /* ignore */ } upsell.remove(); });
      upsell.appendChild(dismiss);
      container.appendChild(upsell);
    }
  }

  // ── نوار فرمان ──
  const commandBar = document.createElement('div');
  commandBar.className = 'space-y-3';
  commandBar.appendChild(createNotesSearch((q) => { filter.query = q; render(); }));

  const catRow = document.createElement('div');
  catRow.className = 'flex gap-2 overflow-x-auto pb-1 no-scrollbar';
    const paintCatFilter = (): void => {
    catRow.innerHTML = '';
    const mk = (value: string, label: string): void => {
      const active = filter.category === value;
      const st = getCategoryStyle(value === 'all' ? undefined : value);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = active
        ? `flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold border border-transparent ${value === 'all' ? 'bg-primary-500/15 text-primary-300' : st.chip}`
        : 'flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700';
      const lb = document.createElement('span');
      lb.className = 'whitespace-nowrap';
      lb.textContent = label;
      chip.appendChild(lb);
      chip.addEventListener('click', () => { filter.category = value; paintCatFilter(); render(); });
      catRow.appendChild(chip);
    };
    mk('all', 'همه');
    CATEGORIES.forEach((c) => mk(c, c));
  };
  paintCatFilter();
  commandBar.appendChild(catRow);

  const sortRow = document.createElement('div');
  sortRow.className = 'flex gap-2 overflow-x-auto pb-1 no-scrollbar';
  const paintSort = (): void => {
    sortRow.innerHTML = '';
    const sortLabel = document.createElement('span');
    sortLabel.className = 'flex-shrink-0 flex items-center text-xs text-slate-500';
    sortLabel.textContent = 'مرتب‌سازی:';
    sortRow.appendChild(sortLabel);
    [{ v: 'newest', l: 'جدیدترین' }, { v: 'oldest', l: 'قدیمی‌ترین' }, { v: 'title', l: 'عنوان' }, { v: 'words', l: 'پرکلمه‌ترین' }].forEach((o) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = filter.sort === o.v
        ? 'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border border-transparent bg-primary-500/15 text-primary-300'
        : 'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700';
      chip.textContent = o.l;
      chip.addEventListener('click', () => { filter.sort = o.v; paintSort(); render(); });
      sortRow.appendChild(chip);
    });
  };
  paintSort();
  commandBar.appendChild(sortRow);
  container.appendChild(commandBar);

  const pinnedWrap = document.createElement('div');
  const tagWrap = document.createElement('div');
  const grid = document.createElement('div');
  container.appendChild(pinnedWrap); container.appendChild(tagWrap); container.appendChild(grid);

  const cb: NoteCallbacks = {
    onView: (id) => openZenById(id),
    onEdit: (id) => openNoteEditor(id),
    onPin: (id) => { void togglePin(id); },
    onDelete: (id) => { void deleteNote(id); },
    onNew: () => openNoteEditor(null),
  };
  const refresh = async (): Promise<void> => { notes = await getDatabase().getNotes(); render(); };

  const render = (): void => {
    const totalWords = notes.reduce((s, n) => s + (n.wordCount ?? 0), 0);
    statsLine.textContent = `${toPersianDigits(String(notes.length))} یادداشت • ${toPersianDigits(String(totalWords))} کلمه`;
    const filtered = applyFilter(notes, filter);
    renderPinned(pinnedWrap, filtered.filter((n) => n.pinned), filter.query, cb);
    renderTags(tagWrap, notes, filter.tag, (t) => { filter.tag = t; render(); });
    grid.className = ''; grid.innerHTML = '';
    if (notes.length === 0) grid.appendChild(buildEmpty('notes', 'هنوز یادداشتی نداری', 'اولین یادداشتت را بساز و شروع به یادگیری کن!', 'ساخت اولین یادداشت', () => openNoteEditor(null)));
    else if (filtered.length === 0) grid.appendChild(buildEmpty('search', 'یادداشتی یافت نشد', 'فیلترها را تغییر دهید یا جستجوی دیگری انجام دهید.'));
    else renderGrid(grid, filtered.filter((n) => !n.pinned), filter.query, cb);
  };

  // ── حالت مطالعه‌ی تمام‌صفحه (Zen) ──
  function openZenById(noteId: string): void {
    const note = notes.find((n) => n.id === noteId);
    if (!note) { getToast().error('یادداشت یافت نشد'); return; }
    openZen(note);
  }
  function openZen(note: DbNote): void {
    const st = getCategoryStyle(note.category);
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[80] bg-slate-900 overflow-y-auto';
    overlay.style.overscrollBehavior = 'contain';

    // نوار باریک محوشونده
    const bar = document.createElement('div');
    bar.className = 'fixed top-0 inset-x-0 z-10 flex items-center justify-start gap-2 px-3 py-2 bg-slate-900/85 backdrop-blur border-b border-slate-800 transition-all duration-300';
    const mkBarBtn = (icon: string, label: string, onClick: () => void): HTMLButtonElement => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'min-w-11 min-h-11 flex items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors';
      b.innerHTML = iconHTML(icon, 20);
      b.title = label;
      b.setAttribute('aria-label', label);
      b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
      return b;
    };
    const barCluster = document.createElement('div');
    barCluster.className = 'flex items-center gap-1';
    barCluster.appendChild(mkBarBtn('back', 'بازگشت', () => close()));
    barCluster.appendChild(mkBarBtn('pin', note.pinned ? 'حذف پین' : 'پین', () => { void togglePin(note.id); close(); }));
    barCluster.appendChild(mkBarBtn('edit', 'ویرایش', () => { close(); setTimeout(() => openNoteEditor(note.id), 150); }));
    bar.appendChild(barCluster);
    overlay.appendChild(bar);

    // مقاله‌ی خلوت
    const article = document.createElement('article');
    article.className = 'mx-auto max-w-prose px-5 pt-20 pb-28';
    const t = document.createElement('h1');
    t.className = 'mb-4 text-2xl sm:text-3xl font-black text-slate-100 leading-relaxed';
    t.textContent = note.title || 'بدون عنوان';
    article.appendChild(t);
    const meta = document.createElement('div');
    meta.className = 'mb-8 flex flex-wrap items-center gap-2 text-xs text-slate-500';
    const catChip = document.createElement('span');
    catChip.className = `rounded-full px-2 py-0.5 ${st.chip}`;
    catChip.textContent = note.category || 'سایر';
    meta.appendChild(catChip);
    const w = document.createElement('span');
    w.textContent = `${toPersianDigits(String(note.wordCount ?? 0))} کلمه`;
    meta.appendChild(w);
    const d = document.createElement('span');
    d.textContent = formatPersianDateShort(new Date(note.updatedAt || note.createdAt));
    meta.appendChild(d);
    article.appendChild(meta);
    article.appendChild(renderSafeMarkdown(note.content || ''));
    overlay.appendChild(article);

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // نمایش/مخفی‌شدن نوار
    let hideTimer: number | undefined;
    const hideBar = (): void => { bar.style.transform = 'translateY(-100%)'; bar.style.opacity = '0'; };
    const showBar = (): void => {
      bar.style.transform = ''; bar.style.opacity = '1';
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(hideBar, 3000);
    };
    article.addEventListener('click', showBar);

    // swipe پایین برای خروج (وقتی بالای صفحه‌ای)
    let startY = 0; let curY = 0;
    overlay.addEventListener('touchstart', (e) => { startY = e.touches[0]?.clientY ?? 0; curY = startY; }, { passive: true });
    overlay.addEventListener('touchmove', (e) => { curY = e.touches[0]?.clientY ?? 0; }, { passive: true });
    overlay.addEventListener('touchend', () => { if (curY - startY > 100 && overlay.scrollTop <= 0) close(); });

    // ESC در دسکتاپ
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);

    function close(): void {
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(hideTimer);
      document.body.style.overflow = '';
      overlay.remove();
    }

    showBar();
  }

  // ── ویرایشگر ──
  function openNoteEditor(noteId: string | null): void {
    const isEdit = noteId !== null;
    const existing = isEdit ? notes.find((n) => n.id === noteId) : undefined;
    const content = document.createElement('div');
    content.className = 'space-y-4';

    const titleInput = createInput({ id: 'note-title', placeholder: 'عنوان یادداشت...', value: existing?.title ?? '' });
    content.appendChild(createFormGroup({ label: 'عنوان', input: titleInput, required: true }));

    let selectedCategory = existing?.category || 'سایر';
    const catWrap = document.createElement('div');
    catWrap.className = 'flex flex-wrap gap-2';
    const edChips = new Map<string, HTMLButtonElement>();
    const paintEd = (): void => {
      CATEGORIES.forEach((c) => {
        const el = edChips.get(c); if (!el) return;
        const s = getCategoryStyle(c);
        el.className = c === selectedCategory
          ? `px-4 py-2 rounded-full text-sm font-medium border border-transparent ring-2 ${s.ring} ${s.chip}`
          : 'px-4 py-2 rounded-full text-sm font-medium border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700';
      });
    };
    CATEGORIES.forEach((c) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.textContent = c;
      chip.addEventListener('click', () => { selectedCategory = c; paintEd(); catWrap.dispatchEvent(new Event('change')); });
      edChips.set(c, chip);
      catWrap.appendChild(chip);
    });
    paintEd();
    content.appendChild(createFormGroup({ label: 'دسته‌بندی', input: catWrap }));

    const tagsInput = createInput({ id: 'note-tags', placeholder: 'ریاضی، فصل ۱، مهم (با ویرگول جدا کنید)', value: (existing?.tags ?? []).join('، ') });
    content.appendChild(createFormGroup({ label: 'تگ‌ها', input: tagsInput, helpText: 'تگ‌ها را با ویرگول (،) جدا کنید' }));
    const tagsPreview = document.createElement('div');
    tagsPreview.className = 'flex flex-wrap gap-1.5';
    content.appendChild(tagsPreview);
    const updateTags = (): void => { tagsPreview.innerHTML = ''; parseTags(tagsInput.value).forEach((t) => { const c = document.createElement('span'); c.className = 'rounded-full bg-primary-500/15 px-2 py-0.5 text-xs text-primary-300'; c.textContent = `#${t}`; tagsPreview.appendChild(c); }); };
    tagsInput.addEventListener('input', updateTags); updateTags();

    const contentTextarea = createTextarea({ id: 'note-content', placeholder: 'متن یادداشت... (Markdown پشتیبانی می‌شود)', value: existing?.content ?? '', rows: 12 });
    content.appendChild(createFormGroup({ label: 'محتوا', input: contentTextarea, required: true }));
    content.appendChild(createMdToolbar(contentTextarea));
    const wcEl = document.createElement('div');
    wcEl.className = 'text-xs text-slate-500';
    content.appendChild(wcEl);
    const updateWc = (): void => { wcEl.textContent = `${toPersianDigits(String(countWords(contentTextarea.value)))} کلمه`; };
    contentTextarea.addEventListener('input', updateWc); updateWc();

    const autoSave = !isEdit && isAutoSaveEnabled();
    if (autoSave) {
      const draft = loadDraft();
      if (draft && (draft.title || draft.content)) {
        titleInput.value = draft.title; selectedCategory = draft.category ?? 'سایر'; paintEd();
        tagsInput.value = draft.tags; contentTextarea.value = draft.content; updateTags(); updateWc();
        getToast().success('پیش‌نویس ذخیره‌شده بازیابی شد');
      }
      let t: number | undefined;
      const schedule = (): void => { window.clearTimeout(t); t = window.setTimeout(() => saveDraft({ title: titleInput.value, content: contentTextarea.value, category: selectedCategory, tags: tagsInput.value }), 800); };
      titleInput.addEventListener('input', schedule); contentTextarea.addEventListener('input', schedule); tagsInput.addEventListener('input', schedule); catWrap.addEventListener('change', schedule);
    }

    getModal().open({
      title: isEdit ? 'ویرایش یادداشت' : 'یادداشت جدید', content, size: '3xl',
      buttons: [
        { label: 'انصراف', type: 'ghost', onClick: () => getModal().close() },
        {
          label: isEdit ? 'ذخیره تغییرات' : 'ایجاد یادداشت', type: 'primary',
          onClick: async () => {
            const title = titleInput.value.trim(); const body = contentTextarea.value.trim();
            if (!title) { getToast().warning('لطفاً عنوان را وارد کنید'); titleInput.focus(); return; }
            if (!body) { getToast().warning('لطفاً محتوا را وارد کنید'); contentTextarea.focus(); return; }
            const now = new Date().toISOString(); const tags = parseTags(tagsInput.value); const wc = countWords(body);
            if (isEdit && noteId) { await getDatabase().updateNote(noteId, { title, category: selectedCategory, content: body, tags, wordCount: wc, updatedAt: now }); getToast().success('یادداشت به‌روزرسانی شد'); }
            else { await getDatabase().addNote({ id: genId(), title, category: selectedCategory, content: body, tags, wordCount: wc, pinned: false, createdAt: now, updatedAt: now }); getToast().success('یادداشت ایجاد شد'); }
            clearDraft(); getModal().close(); await refresh();
          },
        },
      ],
    });
    setTimeout(() => titleInput.focus(), 100);
  }

  async function togglePin(id: string): Promise<void> {
    const n = notes.find((x) => x.id === id); if (!n) return;
    await getDatabase().updateNote(id, { pinned: !n.pinned });
    getToast().success(n.pinned ? 'پین حذف شد' : 'یادداشت پین شد');
    await refresh();
  }
  async function deleteNote(id: string): Promise<void> {
    const n = notes.find((x) => x.id === id); if (!n) return;
    const ok = await getModal().confirm('حذف یادداشت', `آیا از حذف «${n.title}» مطمئن هستید؟ این عمل قابل بازگشت نیست.`, { dangerMode: true, confirmText: 'حذف' });
    if (ok) { await getDatabase().deleteNote(id); getToast().success('یادداشت حذف شد'); await refresh(); }
  }

  render();
  return container;
}

export default createNotesView;