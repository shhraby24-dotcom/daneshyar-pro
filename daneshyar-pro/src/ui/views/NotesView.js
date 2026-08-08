/**
 * دانش‌یار پرو - View یادداشت‌ها
 * مدیریت کامل یادداشت‌ها با قابلیت CRUD، جستجو و Markdown
 * @module ui/views/NotesView
 */

import state from '../../core/State.js';
import router from '../router.js';
import LoggerModule from '../../core/Logger.js';
import EventBusModule, { EVENTS } from '../../core/EventBus.js';
import { createButton, createIconButton, BUTTON_VARIANTS, BUTTON_SIZES } from '../components/Button.js';
import { createInput, createTextarea, createSelect, createFormGroup, createSearchInput } from '../components/Input.js';
import modal from '../components/Modal.js';
import toast from '../components/Toast.js';

const logger = LoggerModule.getInstance().module('NotesView');
const eventBus = EventBusModule.getInstance();

/**
 * دسته‌بندی‌های موجود
 */
const CATEGORIES = [
  'ریاضی', 'فیزیک', 'شیمی', 'زیست‌شناسی',
  'ادبیات', 'زبان', 'تاریخ', 'جغرافیا',
  'کامپیوتر', 'فلسفه', 'سایر'
];

/**
 * ساخت View یادداشت‌ها
 * @returns {HTMLElement}
 */
export function createNotesView() {
  logger.info('رندر یادداشت‌ها');

  const container = document.createElement('div');
  container.className = 'space-y-6 fade-in';

  // Header
  const header = createHeader();
  container.appendChild(header);

  // Toolbar (جستجو + فیلتر + دکمه جدید)
  const toolbar = createToolbar(container);
  container.appendChild(toolbar);

  // لیست یادداشت‌ها
  const notesList = document.createElement('div');
  notesList.id = 'notes-list';
  notesList.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
  container.appendChild(notesList);

  // رندر اولیه
  renderNotesList(notesList);

  // گوش دادن به تغییرات یادداشت‌ها
  const unsubscribe = state.subscribe('notes', () => {
    renderNotesList(notesList, getCurrentFilter());
  });

  // Cleanup هنگام خروج از view
  container.addEventListener('DOMNodeRemoved', () => {
    unsubscribe();
  }, { once: true });

  return container;
}

/**
 * Header صفحه یادداشت‌ها
 */
function createHeader() {
  const header = document.createElement('div');
  header.className = 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4';

  const notes = state.get('notes') || [];
  const totalWords = notes.reduce((sum, n) => sum + (n.wordCount || 0), 0);

  header.innerHTML = `
    <div>
      <h1 class="text-3xl font-bold text-slate-100 mb-1">یادداشت‌ها 📚</h1>
      <p class="text-slate-400 text-sm">
        ${notes.length} یادداشت • ${totalWords.toLocaleString('fa-IR')} کلمه
      </p>
    </div>
  `;

  const createBtn = createButton({
    label: 'یادداشت جدید',
    variant: BUTTON_VARIANTS.PRIMARY,
    icon: '➕',
    onClick: () => openNoteEditor()
  });
  header.appendChild(createBtn);

  return header;
}

/**
 * Toolbar (جستجو و فیلتر)
 */
function createToolbar(container) {
  const toolbar = document.createElement('div');
  toolbar.className = 'flex flex-col sm:flex-row gap-3';

  // جستجو
  const searchWrapper = document.createElement('div');
  searchWrapper.className = 'flex-1';
  const searchInput = createSearchInput({
    placeholder: 'جستجو در عنوان و محتوای یادداشت‌ها...',
    onSearch: (query) => {
      const list = container.querySelector('#notes-list');
      if (list) renderNotesList(list, { ...getCurrentFilter(), query });
    }
  });
  searchWrapper.appendChild(searchInput);
  toolbar.appendChild(searchWrapper);

  // فیلتر دسته‌بندی
  const filterSelect = createSelect({
    options: [
      { value: 'all', label: 'همه دسته‌ها' },
      ...CATEGORIES.map(c => ({ value: c, label: c }))
    ],
    value: 'all',
    onChange: (e) => {
      const list = container.querySelector('#notes-list');
      if (list) renderNotesList(list, { ...getCurrentFilter(), category: e.target.value });
    }
  });
  filterSelect.className += ' sm:w-48';
  toolbar.appendChild(filterSelect);

  // مرتب‌سازی
  const sortSelect = createSelect({
    options: [
      { value: 'newest', label: 'جدیدترین' },
      { value: 'oldest', label: 'قدیمی‌ترین' },
      { value: 'title', label: 'عنوان (الفبا)' },
      { value: 'words', label: 'تعداد کلمات' }
    ],
    value: 'newest',
    onChange: (e) => {
      const list = container.querySelector('#notes-list');
      if (list) renderNotesList(list, { ...getCurrentFilter(), sort: e.target.value });
    }
  });
  sortSelect.className += ' sm:w-40';
  toolbar.appendChild(sortSelect);

  // ذخیره فیلتر فعلی
  window._notesFilter = { category: 'all', sort: 'newest', query: '' };

  return toolbar;
}

/**
 * دریافت فیلتر فعلی
 */
function getCurrentFilter() {
  return window._notesFilter || { category: 'all', sort: 'newest', query: '' };
}

/**
 * رندر لیست یادداشت‌ها
 */
function renderNotesList(container, filter = null) {
  if (!filter) filter = getCurrentFilter();
  
  // ذخیره فیلتر
  window._notesFilter = filter;

  let notes = [...(state.get('notes') || [])];

  // فیلتر دسته‌بندی
  if (filter.category && filter.category !== 'all') {
    notes = notes.filter(n => n.category === filter.category);
  }

  // فیلتر جستجو
  if (filter.query && filter.query.trim()) {
    const query = filter.query.toLowerCase().trim();
    notes = notes.filter(n => 
      (n.title || '').toLowerCase().includes(query) ||
      (n.content || '').toLowerCase().includes(query)
    );
  }

  // مرتب‌سازی
  switch (filter.sort) {
    case 'oldest':
      notes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case 'title':
      notes.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'fa'));
      break;
    case 'words':
      notes.sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0));
      break;
    case 'newest':
    default:
      notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // پین‌شده‌ها اول
  notes.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  // پاک کردن container
  container.innerHTML = '';

  if (notes.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'col-span-full text-center py-16';
    
    if (filter.query || filter.category !== 'all') {
      empty.innerHTML = `
        <div class="text-5xl mb-3 opacity-50">🔍</div>
        <p class="text-slate-400 mb-1">یادداشتی یافت نشد</p>
        <p class="text-slate-500 text-sm">فیلترها را تغییر دهید یا جستجوی دیگری انجام دهید</p>
      `;
    } else {
      empty.innerHTML = `
        <div class="text-5xl mb-3 opacity-50">📝</div>
        <p class="text-slate-400 mb-4">هنوز یادداشتی ندارید</p>
      `;
      const createBtn = createButton({
        label: 'ایجاد اولین یادداشت',
        variant: BUTTON_VARIANTS.PRIMARY,
        icon: '➕',
        onClick: () => openNoteEditor()
      });
      empty.appendChild(createBtn);
    }
    container.appendChild(empty);
    return;
  }

  // رندر یادداشت‌ها
  notes.forEach(note => {
    container.appendChild(createNoteCard(note));
  });
}

/**
 * ساخت کارت یادداشت
 */
function createNoteCard(note) {
  const card = document.createElement('div');
  card.className = `
    bg-slate-800 border border-slate-700 rounded-xl p-5
    hover:border-slate-600 hover:shadow-lg
    transition-all duration-200 cursor-pointer
    group relative
    ${note.pinned ? 'ring-2 ring-accent-500/50' : ''}
  `;

  const preview = note.content 
    ? note.content.substring(0, 120) + (note.content.length > 120 ? '...' : '')
    : 'بدون محتوا';

  const date = new Date(note.createdAt).toLocaleDateString('fa-IR', {
    year: 'numeric', month: 'short', day: 'numeric'
  });

  card.innerHTML = `
    ${note.pinned ? `
      <div class="absolute top-3 left-3">
        <span class="text-accent-400 text-sm" title="پین شده">📌</span>
      </div>
    ` : ''}
    
    <div class="flex items-start justify-between gap-2 mb-3">
      <h3 class="font-bold text-slate-100 line-clamp-1 flex-1 ${note.pinned ? 'pl-6' : ''}">
        ${note.title || 'بدون عنوان'}
      </h3>
    </div>
    
    <p class="text-sm text-slate-400 line-clamp-3 mb-4 leading-relaxed">
      ${preview}
    </p>
    
    <div class="flex items-center justify-between text-xs">
      <div class="flex items-center gap-2">
        <span class="bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded">
          ${note.category || 'سایر'}
        </span>
        <span class="text-slate-500">${note.wordCount || 0} کلمه</span>
      </div>
      <span class="text-slate-500">${date}</span>
    </div>
    
    <!-- دکمه‌های اکشن (نمایش هنگام hover) -->
    <div class="absolute top-3 left-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${note.pinned ? 'top-9' : ''}">
      <button class="action-edit p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors" title="ویرایش">✏️</button>
      <button class="action-pin p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors" title="${note.pinned ? 'حذف پین' : 'پین کردن'}">
        ${note.pinned ? '📌' : '📍'}
      </button>
      <button class="action-delete p-1.5 bg-red-900/50 hover:bg-red-800 rounded text-sm transition-colors" title="حذف">🗑️</button>
    </div>
  `;

  // کلیک روی کارت → مشاهده یادداشت
  card.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    viewNote(note.id);
  });

  // دکمه ویرایش
  card.querySelector('.action-edit')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openNoteEditor(note.id);
  });

  // دکمه پین
  card.querySelector('.action-pin')?.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePin(note.id);
  });

  // دکمه حذف
  card.querySelector('.action-delete')?.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteNote(note.id);
  });

  return card;
}

/**
 * باز کردن ویرایشگر یادداشت
 */
function openNoteEditor(noteId = null) {
  const isEdit = !!noteId;
  const note = isEdit ? state.getNote(noteId) : null;

  const content = document.createElement('div');
  content.className = 'space-y-4';

  // Title
  const titleInput = createInput({
    id: 'note-title',
    placeholder: 'عنوان یادداشت...',
    value: note?.title || ''
  });
  content.appendChild(createFormGroup({
    label: 'عنوان',
    input: titleInput,
    required: true
  }));

  // Category
  const categorySelect = createSelect({
    id: 'note-category',
    options: CATEGORIES.map(c => ({ value: c, label: c })),
    value: note?.category || CATEGORIES[0]
  });
  content.appendChild(createFormGroup({
    label: 'دسته‌بندی',
    input: categorySelect
  }));

  // Content
  const contentTextarea = createTextarea({
    id: 'note-content',
    placeholder: 'متن یادداشت را اینجا بنویسید... (از Markdown پشتیبانی می‌شود)',
    value: note?.content || '',
    rows: 10
  });
  content.appendChild(createFormGroup({
    label: 'محتوا',
    input: contentTextarea,
    helpText: 'از **bold**، *italic*، # heading و - list پشتیبانی می‌شود',
    required: true
  }));

  modal.open({
    title: isEdit ? 'ویرایش یادداشت' : 'یادداشت جدید',
    content,
    size: '2xl',
    buttons: [
      {
        label: 'انصراف',
        type: 'ghost',
        onClick: () => modal.close()
      },
      {
        label: isEdit ? 'ذخیره تغییرات' : 'ایجاد یادداشت',
        type: 'primary',
        onClick: () => {
          const title = titleInput.value.trim();
          const category = categorySelect.value;
          const noteContent = contentTextarea.value.trim();

          if (!title) {
            toast.warning('لطفاً عنوان را وارد کنید');
            titleInput.focus();
            return;
          }
          if (!noteContent) {
            toast.warning('لطفاً محتوا را وارد کنید');
            contentTextarea.focus();
            return;
          }

          const wordCount = noteContent.trim().split(/\s+/).filter(Boolean).length;

          if (isEdit) {
            state.updateNote(noteId, {
              title,
              category,
              content: noteContent,
              wordCount,
              updatedAt: new Date().toISOString()
            });
            toast.success('یادداشت به‌روزرسانی شد');
          } else {
            const newNote = {
              id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
              title,
              category,
              content: noteContent,
              wordCount,
              pinned: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            state.addNote(newNote);
            toast.success('یادداشت ایجاد شد');
          }

          modal.close();
        }
      }
    ]
  });

  setTimeout(() => titleInput.focus(), 100);
}

/**
 * مشاهده یادداشت
 */
function viewNote(noteId) {
  const note = state.getNote(noteId);
  if (!note) {
    toast.error('یادداشت یافت نشد');
    return;
  }

  const content = document.createElement('div');

  // Metadata
  const meta = document.createElement('div');
  meta.className = 'flex items-center gap-3 text-xs text-slate-400 mb-4 pb-4 border-b border-slate-700';
  meta.innerHTML = `
    <span class="bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded">${note.category}</span>
    <span>${note.wordCount} کلمه</span>
    <span>ایجاد: ${new Date(note.createdAt).toLocaleDateString('fa-IR')}</span>
    ${note.updatedAt !== note.createdAt ? `<span>ویرایش: ${new Date(note.updatedAt).toLocaleDateString('fa-IR')}</span>` : ''}
  `;
  content.appendChild(meta);

  // Content with Markdown (simplified)
  const body = document.createElement('div');
  body.className = 'prose prose-invert max-w-none leading-relaxed';
  body.innerHTML = renderMarkdown(note.content);
  content.appendChild(body);

  modal.open({
    title: note.title,
    content,
    size: '3xl',
    buttons: [
      {
        label: 'بستن',
        type: 'ghost',
        onClick: () => modal.close()
      },
      {
        label: 'ویرایش',
        type: 'primary',
        onClick: () => {
          modal.close();
          setTimeout(() => openNoteEditor(noteId), 200);
        }
      }
    ]
  });
}

/**
 * رندر ساده Markdown
 */
function renderMarkdown(text) {
  if (!text) return '';
  
  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-5 mb-2">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-6 mb-3">$1</h1>')
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-primary-300">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code
    .replace(/`(.+?)`/g, '<code class="bg-slate-900 px-1.5 py-0.5 rounded text-sm text-accent-300">$1</code>')
    // Lists
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/\n/g, '<br>');

  // Wrap in paragraph if not already
  if (!html.startsWith('<')) {
    html = '<p class="mb-3">' + html + '</p>';
  }

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li[^>]*>.*?<\/li>)+/g, (match) => {
    return `<ul class="list-disc mb-3 space-y-1">${match}</ul>`;
  });

  return html;
}

/**
 * تغییر وضعیت پین
 */
function togglePin(noteId) {
  const note = state.getNote(noteId);
  if (!note) return;

  state.updateNote(noteId, { pinned: !note.pinned });
  toast.success(note.pinned ? 'پین حذف شد' : 'یادداشت پین شد');
}

/**
 * حذف یادداشت
 */
async function deleteNote(noteId) {
  const note = state.getNote(noteId);
  if (!note) return;

  const confirmed = await modal.confirm(
    'حذف یادداشت',
    `آیا از حذف "${note.title}" مطمئن هستید؟ این عمل قابل بازگشت نیست.`,
    { dangerMode: true, confirmText: 'حذف' }
  );

  if (confirmed) {
    state.deleteNote(noteId);
    toast.success('یادداشت حذف شد');
  }
}

export default createNotesView;