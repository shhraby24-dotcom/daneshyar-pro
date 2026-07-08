/**
 * دانش‌یار پرو - View خلاصه‌ساز هوشمند
 * تبدیل متن طولانی به خلاصه با الگوریتم TextRank
 * @module ui/views/SummarizerView
 */

import state from '../../core/State.js';
import router from '../router.js';
import LoggerModule from '../../core/Logger.js';
import summarizer from '../../services/Summarizer.js';
import srs from '../../services/SRS.js';
import quizGenerator from '../../services/QuizGenerator.js';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '../components/Button.js';
import { createTextarea, createSelect, createFormGroup } from '../components/Input.js';
import toast from '../components/Toast.js';
import modal from '../components/Modal.js';

const logger = LoggerModule.getInstance().module('SummarizerView');

/**
 * ساخت View خلاصه‌ساز
 * @returns {HTMLElement}
 */
export function createSummarizerView() {
  logger.info('رندر خلاصه‌ساز');

  const container = document.createElement('div');
  container.className = 'space-y-6 fade-in max-w-6xl mx-auto';

  // Header
  container.appendChild(createHeader());

  // Main Grid (2 columns)
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 lg:grid-cols-2 gap-6';

  // Input Column
  grid.appendChild(createInputColumn(container));

  // Output Column
  grid.appendChild(createOutputColumn());

  container.appendChild(grid);

  return container;
}

/**
 * Header صفحه
 */
function createHeader() {
  const header = document.createElement('div');
  header.innerHTML = `
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-3xl font-bold text-slate-100 mb-2 flex items-center gap-3">
          <span class="text-4xl">✨</span>
          خلاصه‌ساز هوشمند
        </h1>
        <p class="text-slate-400">
          متن یا جزوه خود را وارد کنید تا نکات کلیدی و خلاصه آن استخراج شود
        </p>
      </div>
      <div class="flex items-center gap-2 bg-primary-500/10 border border-primary-500/30 px-3 py-1.5 rounded-lg">
        <span class="text-xs text-primary-300">🔒 آفلاین</span>
        <span class="text-xs text-slate-500">•</span>
        <span class="text-xs text-slate-400">الگوریتم TextRank</span>
      </div>
    </div>
  `;
  return header;
}

/**
 * ستون ورودی
 */
function createInputColumn(rootContainer) {
  const column = document.createElement('div');
  column.className = 'space-y-4';

  // Textarea
  const textarea = createTextarea({
    id: 'summarizer-input',
    placeholder: 'متن، جزوه یا مقاله خود را اینجا وارد کنید...\n\nحداقل ۵ جمله برای نتیجه بهتر.',
    rows: 14
  });
  textarea.style.minHeight = '400px';
  textarea.style.fontSize = '14px';
  textarea.style.lineHeight = '1.8';

  const formGroup = createFormGroup({
    label: 'متن ورودی',
    input: textarea,
    helpText: 'از Markdown پشتیبانی می‌شود (عناوین، لیست‌ها و...)'
  });
  column.appendChild(formGroup);

  // Stats Bar
  const statsBar = document.createElement('div');
  statsBar.id = 'summarizer-stats';
  statsBar.className = 'flex items-center justify-between text-xs text-slate-400 px-1';
  statsBar.innerHTML = `
    <div class="flex gap-3">
      <span>کلمات: <span id="word-count" class="text-slate-200 font-medium">0</span></span>
      <span>جملات: <span id="sentence-count" class="text-slate-200 font-medium">0</span></span>
      <span>پاراگراف: <span id="paragraph-count" class="text-slate-200 font-medium">0</span></span>
    </div>
    <span id="read-time" class="text-slate-500">زمان مطالعه: 0 دقیقه</span>
  `;
  column.appendChild(statsBar);

  // Settings Row
  const settingsRow = document.createElement('div');
  settingsRow.className = 'flex gap-3 flex-wrap';

  const levelSelect = createSelect({
    id: 'summarizer-level',
    options: [
      { value: 'short', label: '🎯 خلاصه کوتاه (۱۵٪)' },
      { value: 'medium', label: '📝 خلاصه متوسط (۲۵٪)' },
      { value: 'long', label: '📖 خلاصه کامل (۴۰٪)' }
    ],
    value: 'medium'
  });
  levelSelect.className += ' flex-1 min-w-[150px]';
  settingsRow.appendChild(levelSelect);

  const examCheckbox = document.createElement('label');
  examCheckbox.className = 'flex items-center gap-2 cursor-pointer bg-slate-800 border border-slate-700 rounded-lg px-3 py-2';
  examCheckbox.innerHTML = `
    <input type="checkbox" id="for-exam" class="w-4 h-4 accent-primary-500">
    <span class="text-sm text-slate-300">🎓 حالت کنکوری</span>
  `;
  settingsRow.appendChild(examCheckbox);

  column.appendChild(settingsRow);

  // Action Buttons
  const actionsRow = document.createElement('div');
  actionsRow.className = 'flex gap-2 flex-wrap';

  const summarizeBtn = createButton({
    label: 'استخراج نکات کلیدی و خلاصه',
    variant: BUTTON_VARIANTS.PRIMARY,
    size: BUTTON_SIZES.LG,
    icon: '✨',
    fullWidth: true,
    onClick: () => handleSummarize(textarea, levelSelect.value, document.getElementById('for-exam').checked)
  });
  actionsRow.appendChild(summarizeBtn);

  column.appendChild(actionsRow);

  // Secondary Actions
  const secondaryRow = document.createElement('div');
  secondaryRow.className = 'grid grid-cols-2 gap-2';

  const makeFlashcardsBtn = createButton({
    label: 'ساخت فلش‌کارت',
    variant: BUTTON_VARIANTS.ACCENT,
    size: BUTTON_SIZES.MD,
    icon: '🃏',
    onClick: () => handleMakeFlashcards(textarea)
  });

  const makeQuizBtn = createButton({
    label: 'ساخت آزمون',
    variant: BUTTON_VARIANTS.SUCCESS,
    size: BUTTON_SIZES.MD,
    icon: '📝',
    onClick: () => handleMakeQuiz(textarea)
  });

  secondaryRow.appendChild(makeFlashcardsBtn);
  secondaryRow.appendChild(makeQuizBtn);
  column.appendChild(secondaryRow);

  // Clear Button
  const clearBtn = createButton({
    label: 'پاک کردن',
    variant: BUTTON_VARIANTS.GHOST,
    size: BUTTON_SIZES.SM,
    icon: '🗑️',
    onClick: () => {
      textarea.value = '';
      updateStats(textarea);
      document.getElementById('summarizer-output').innerHTML = '';
    }
  });
  column.appendChild(clearBtn);

  // Event: Update stats on input
  textarea.addEventListener('input', () => updateStats(textarea));

  return column;
}

/**
 * ستون خروجی
 */
function createOutputColumn() {
  const column = document.createElement('div');
  column.id = 'summarizer-output';
  column.className = 'space-y-4';

  // Placeholder state
  column.innerHTML = `
    <div class="bg-slate-800/50 border border-slate-700 border-dashed rounded-xl p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
      <div class="text-6xl mb-4 opacity-30">✨</div>
      <h3 class="text-lg font-semibold text-slate-300 mb-2">آماده خلاصه‌سازی</h3>
      <p class="text-sm text-slate-500 max-w-sm">
        متن خود را در سمت راست وارد کنید و روی دکمه "استخراج نکات کلیدی" کلیک کنید
      </p>
      <div class="mt-6 grid grid-cols-3 gap-3 text-xs text-slate-500 w-full max-w-md">
        <div class="bg-slate-900/50 rounded-lg p-3">
          <div class="text-2xl mb-1">💡</div>
          <div>نکات کلیدی</div>
        </div>
        <div class="bg-slate-900/50 rounded-lg p-3">
          <div class="text-2xl mb-1">📝</div>
          <div>خلاصه متن</div>
        </div>
        <div class="bg-slate-900/50 rounded-lg p-3">
          <div class="text-2xl mb-1">🔑</div>
          <div>کلمات کلیدی</div>
        </div>
      </div>
    </div>
  `;

  return column;
}

/**
 * به‌روزرسانی آمار متن
 */
function updateStats(textarea) {
  const text = textarea.value;
  const analysis = summarizer.analyzeStructure(text);

  const wordCount = document.getElementById('word-count');
  const sentenceCount = document.getElementById('sentence-count');
  const paragraphCount = document.getElementById('paragraph-count');
  const readTime = document.getElementById('read-time');

  if (wordCount) wordCount.textContent = analysis.wordCount.toLocaleString('fa-IR');
  if (sentenceCount) sentenceCount.textContent = analysis.sentenceCount.toLocaleString('fa-IR');
  if (paragraphCount) paragraphCount.textContent = analysis.paragraphCount.toLocaleString('fa-IR');
  if (readTime) {
    const minutes = Math.ceil(analysis.wordCount / 200);
    readTime.textContent = `زمان مطالعه: ${minutes.toLocaleString('fa-IR')} دقیقه`;
  }
}

/**
 * اجرای خلاصه‌سازی
 */
async function handleSummarize(textarea, level, forExam) {
  const text = textarea.value.trim();

  if (!text) {
    toast.warning('لطفاً متنی برای خلاصه‌سازی وارد کنید');
    return;
  }

  if (text.length < 100) {
    toast.warning('متن خیلی کوتاه است. حداقل ۱۰۰ کاراکتر لازم است.');
    return;
  }

  logger.time('summarize');
  logger.info('شروع خلاصه‌سازی', { level, forExam, length: text.length });

  try {
    const result = summarizer.summarize(text, { level, forExam });

    // نمایش نتایج
    renderResults(result, text, level, forExam);

    logger.timeEnd('summarize');
    toast.success(
      `${result.keyPoints.length} نکته کلیدی و ${result.sentenceCount} جمله خلاصه استخراج شد`,
      'خلاصه‌سازی موفق'
    );
  } catch (error) {
    logger.error('خطا در خلاصه‌سازی', error);
    toast.error('خطا در خلاصه‌سازی: ' + error.message);
  }
}

/**
 * رندر نتایج
 */
function renderResults(result, originalText, level, forExam) {
  const output = document.getElementById('summarizer-output');
  output.innerHTML = '';
  output.className = 'space-y-4 fade-in';

  // 1. Key Points Card
  if (result.keyPoints.length > 0) {
    const keyPointsCard = document.createElement('div');
    keyPointsCard.className = 'bg-slate-800 border border-slate-700 rounded-xl overflow-hidden';
    keyPointsCard.innerHTML = `
      <div class="flex items-center justify-between p-4 border-b border-slate-700 bg-gradient-to-l from-accent-500/10 to-transparent">
        <div class="flex items-center gap-2">
          <span class="text-2xl">💡</span>
          <h3 class="font-bold text-slate-100">نکات کلیدی (${result.keyPoints.length})</h3>
        </div>
        <button class="copy-btn text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded transition" data-copy="${encodeURIComponent(result.keyPoints.map((p, i) => `${i+1}. ${p}`).join('\n'))}">
          📋 کپی
        </button>
      </div>
      <div class="p-4 space-y-3" id="key-points-list">
        ${result.keyPoints.map((point, idx) => `
          <div class="flex gap-3 group">
            <div class="flex-shrink-0 w-7 h-7 rounded-full bg-accent-500/20 text-accent-400 flex items-center justify-center text-sm font-bold">
              ${idx + 1}
            </div>
            <p class="flex-1 text-sm text-slate-300 leading-relaxed pt-0.5">${escapeHtml(point)}</p>
          </div>
        `).join('')}
      </div>
    `;
    output.appendChild(keyPointsCard);
  }

  // 2. Summary Card
  if (result.summary) {
    const levelLabels = { short: 'کوتاه', medium: 'متوسط', long: 'کامل' };
    const summaryCard = document.createElement('div');
    summaryCard.className = 'bg-slate-800 border border-slate-700 rounded-xl overflow-hidden';
    summaryCard.innerHTML = `
      <div class="flex items-center justify-between p-4 border-b border-slate-700 bg-gradient-to-l from-primary-500/10 to-transparent">
        <div class="flex items-center gap-2">
          <span class="text-2xl">📝</span>
          <h3 class="font-bold text-slate-100">
            خلاصه ${levelLabels[level]}
          </h3>
          <span class="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">${result.sentenceCount} جمله</span>
          ${forExam ? '<span class="text-xs bg-accent-500/20 text-accent-300 px-2 py-0.5 rounded">🎓 کنکوری</span>' : ''}
        </div>
        <button class="copy-btn text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded transition" data-copy="${encodeURIComponent(result.summary)}">
          📋 کپی
        </button>
      </div>
      <div class="p-4">
        <p class="text-sm text-slate-300 leading-loose whitespace-pre-wrap">${escapeHtml(result.summary)}</p>
      </div>
    `;
    output.appendChild(summaryCard);
  }

  // 3. Keywords Card
  if (result.keywords && result.keywords.length > 0) {
    const keywordsCard = document.createElement('div');
    keywordsCard.className = 'bg-slate-800 border border-slate-700 rounded-xl overflow-hidden';
    keywordsCard.innerHTML = `
      <div class="flex items-center gap-2 p-4 border-b border-slate-700">
        <span class="text-2xl">🔑</span>
        <h3 class="font-bold text-slate-100">کلمات کلیدی</h3>
      </div>
      <div class="p-4 flex flex-wrap gap-2">
        ${result.keywords.map(kw => `
          <span class="bg-primary-500/20 text-primary-300 border border-primary-500/30 px-3 py-1 rounded-full text-sm">
            ${escapeHtml(kw)}
          </span>
        `).join('')}
      </div>
    `;
    output.appendChild(keywordsCard);
  }

  // 4. Save as Note Card
  const saveCard = document.createElement('div');
  saveCard.className = 'bg-gradient-to-l from-primary-500/10 to-accent-500/10 border border-primary-500/30 rounded-xl p-4';
  saveCard.innerHTML = `
    <div class="flex items-center gap-3">
      <span class="text-3xl">💾</span>
      <div class="flex-1">
        <h3 class="font-bold text-slate-100 mb-1">ذخیره به عنوان یادداشت</h3>
        <p class="text-xs text-slate-400">خلاصه و نکات کلیدی را در یادداشت‌ها ذخیره کنید</p>
      </div>
      <button id="save-as-note-btn" class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
        ذخیره
      </button>
    </div>
  `;
  output.appendChild(saveCard);

  // Bind copy buttons
  output.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = decodeURIComponent(btn.dataset.copy);
      try {
        await navigator.clipboard.writeText(text);
        toast.success('در کلیپ‌بورد کپی شد');
        const originalText = btn.textContent;
        btn.textContent = '✅ کپی شد';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 1500);
      } catch (e) {
        toast.error('خطا در کپی');
      }
    });
  });

  // Bind save button
  document.getElementById('save-as-note-btn').addEventListener('click', () => {
    saveAsNote(result, originalText, level, forExam);
  });
}

/**
 * ذخیره به عنوان یادداشت
 */
function saveAsNote(result, originalText, level, forExam) {
  const levelLabels = { short: 'کوتاه', medium: 'متوسط', long: 'کامل' };

  const content = [
    `# خلاصه ${levelLabels[level]}`,
    '',
    result.summary,
    '',
    '## نکات کلیدی',
    '',
    ...result.keyPoints.map((p, i) => `${i + 1}. ${p}`),
    '',
    '## کلمات کلیدی',
    '',
    result.keywords.join('، '),
    '',
    '---',
    '',
    '<details>',
    '<summary>متن اصلی (کلیک برای نمایش)</summary>',
    '',
    originalText,
    '',
    '</details>'
  ].join('\n');

  const newNote = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    title: `خلاصه: ${originalText.substring(0, 50)}...`,
    category: 'سایر',
    content,
    wordCount: content.split(/\s+/).filter(Boolean).length,
    pinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  state.addNote(newNote);
  toast.success('خلاصه به عنوان یادداشت ذخیره شد', 'موفق');

  // پیشنهاد رفتن به یادداشت‌ها
  setTimeout(() => {
    if (confirm('آیا می‌خواهید به صفحه یادداشت‌ها بروید؟')) {
      router.navigate('notes');
    }
  }, 500);
}

/**
 * ساخت فلش‌کارت از متن
 */
async function handleMakeFlashcards(textarea) {
  const text = textarea.value.trim();

  if (!text || text.length < 100) {
    toast.warning('متن کافی برای ساخت فلش‌کارت نیست (حداقل ۱۰۰ کاراکتر)');
    return;
  }

  try {
    const result = summarizer.summarize(text, { level: 'medium' });
    const keywords = result.keywords;

    // ساخت فلش‌کارت از key points
    const cards = result.keyPoints.map(point => {
      // پیدا کردن کلمه کلیدی در نکته
      const keyword = keywords.find(kw => point.includes(kw));
      if (keyword) {
        const question = point.replace(keyword, '______');
        return srs.createCard({
          front: `جای خالی را پر کنید:\n\n"${question}"`,
          back: keyword,
          topic: 'خلاصه',
          conceptType: 'definition'
        });
      }
      // اگر کلمه کلیدی پیدا نشد، خود نکته را به عنوان سوال استفاده کن
      return srs.createCard({
        front: `این نکته را به یاد بیاور:\n\n${point.substring(0, point.length - 20)}...`,
        back: point,
        topic: 'خلاصه',
        conceptType: 'concept'
      });
    });

    // اضافه کردن همه کارت‌ها به state
    state.addFlashcards(cards);

    toast.success(`${cards.length} فلش‌کارت ساخته شد!`, 'موفق');

    // پیشنهاد رفتن به فلش‌کارت‌ها
    setTimeout(() => {
      if (confirm('آیا می‌خواهید به صفحه فلش‌کارت‌ها بروید؟')) {
        router.navigate('flashcards');
      }
    }, 500);

  } catch (error) {
    logger.error('خطا در ساخت فلش‌کارت', error);
    toast.error('خطا: ' + error.message);
  }
}

/**
 * ساخت آزمون از متن
 */
async function handleMakeQuiz(textarea) {
  const text = textarea.value.trim();

  if (!text || text.length < 200) {
    toast.warning('متن کافی برای ساخت آزمون نیست (حداقل ۲۰۰ کاراکتر)');
    return;
  }

  try {
    const quizData = quizGenerator.generate(text, {
      count: 5,
      types: ['mc', 'fill', 'tf'],
      forExam: false
    });

    if (quizData.questions.length === 0) {
      toast.warning('نتوانستیم از این متن سوال بسازیم. متن طولانی‌تری وارد کنید.');
      return;
    }

    // ذخیره در state به عنوان quiz session موقت
    window._pendingQuiz = quizData;

    toast.success(`${quizData.questions.length} سوال ساخته شد`, 'موفق');

    setTimeout(() => {
      if (confirm('آیا می‌خواهید به صفحه آزمون بروید و شروع کنید؟')) {
        router.navigate('quiz');
      }
    }, 500);

  } catch (error) {
    logger.error('خطا در ساخت آزمون', error);
    toast.error('خطا: ' + error.message);
  }
}

/**
 * escape کردن HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export default createSummarizerView;