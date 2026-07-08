/**
 * دانش‌یار پرو - View آزمون‌ساز هوشمند
 * سه فاز: تنظیمات، آزمون، نتایج با تحلیل نقاط ضعف
 * @module ui/views/QuizView
 */

import state from '../../core/State.js';
import router from '../router.js';
import LoggerModule from '../../core/Logger.js';
import EventBusModule from '../../core/EventBus.js';
import quizGenerator from '../../services/QuizGenerator.js';
import soundManager from '../../services/SoundManager.js';
import toast from '../components/Toast.js';
import modal from '../components/Modal.js';

const logger = LoggerModule.getInstance().module('QuizView');

// ============================================================
// State داخلی آزمون
// ============================================================
const quizState = {
  phase: 'setup',          // 'setup', 'quiz', 'results'
  selectedNoteIds: [],
  settings: {
    count: 10,
    types: ['mc', 'fill', 'tf'],
    forExam: false,
    timeLimit: 0,          // 0 = بدون محدودیت
    negativeMarking: false
  },
  quiz: null,              // آزمون فعلی
  answers: {},             // پاسخ‌های کاربر
  currentQuestion: 0,
  startTime: null,
  timer: null,
  timeLeft: 0,
  analysis: null,
  container: null,         // مرجع container
  uiUpdateFn: null
};

// ============================================================
// اطلاعات انواع سوالات
// ============================================================
const QUESTION_TYPE_INFO = {
  mc: { icon: '📝', label: 'چندگزینه‌ای', color: 'primary' },
  fill: { icon: '✏️', label: 'جاخالی', color: 'accent' },
  tf: { icon: '✅', label: 'درست/غلط', color: 'green' }
};

// ============================================================
// ساخت View اصلی
// ============================================================
export function createQuizView() {
  logger.info('رندر آزمون‌ساز');

  const container = document.createElement('div');
  container.className = 'fade-in max-w-5xl mx-auto p-2 md:p-4';
  quizState.container = container;
  quizState.uiUpdateFn = renderCurrentPhase;

  // بارگذاری تنظیمات از state برنامه
  const appSettings = state.get('settings');
  quizState.settings.count = appSettings.defaultQuizCount || 10;
  quizState.settings.negativeMarking = appSettings.negativeMarking || false;

  renderCurrentPhase();

  container.addEventListener('DOMNodeRemoved', () => {
    if (quizState.timer) {
      clearInterval(quizState.timer);
      quizState.timer = null;
    }
    quizState.uiUpdateFn = null;
  }, { once: true });

  return container;
}

// ============================================================
// رندر فاز فعلی
// ============================================================
function renderCurrentPhase() {
  const container = quizState.container;
  if (!container) return;

  container.innerHTML = '';

  switch (quizState.phase) {
    case 'setup':
      container.appendChild(renderSetupPhase());
      break;
    case 'quiz':
      container.appendChild(renderQuizPhase());
      break;
    case 'results':
      container.appendChild(renderResultsPhase());
      break;
  }
}

// ============================================================
// فاز ۱: تنظیمات آزمون
// ============================================================
function renderSetupPhase() {
  const wrapper = document.createElement('div');
  wrapper.className = 'space-y-6';

  // Header
  wrapper.appendChild(createQuizHeader());

  // انتخاب یادداشت‌ها
  wrapper.appendChild(createNoteSelector());

  // تنظیمات آزمون
  wrapper.appendChild(createQuizSettings());

  // دکمه شروع
  wrapper.appendChild(createStartButton());

  return wrapper;
}

function createQuizHeader() {
  const header = document.createElement('div');
  header.className = 'text-center space-y-2';
  
  const history = state.get('quizHistory') || [];
  const totalQuizzes = history.length;
  const avgScore = history.length > 0 
    ? Math.round(history.reduce((sum, q) => sum + (q.percentage || 0), 0) / history.length)
    : 0;

  header.innerHTML = `
    <div class="inline-block">
      <span class="text-7xl">📝</span>
    </div>
    <h1 class="text-4xl font-black bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 bg-clip-text text-transparent">
      آزمون‌ساز هوشمند
    </h1>
    <p class="text-slate-400 max-w-2xl mx-auto">
      از یادداشت‌های خود آزمون بسازید و دانش خود را بسنجید
    </p>
    
    ${totalQuizzes > 0 ? `
      <div class="flex items-center justify-center gap-4 mt-4 flex-wrap">
        <div class="bg-primary-500/10 border border-primary-500/30 px-4 py-2 rounded-lg">
          <span class="text-xs text-slate-400">کل آزمون‌ها:</span>
          <span class="text-primary-400 font-bold mr-2">${totalQuizzes}</span>
        </div>
        <div class="bg-accent-500/10 border border-accent-500/30 px-4 py-2 rounded-lg">
          <span class="text-xs text-slate-400">میانگین نمره:</span>
          <span class="text-accent-400 font-bold mr-2">${avgScore}٪</span>
        </div>
      </div>
    ` : ''}
  `;
  return header;
}

function createNoteSelector() {
  const notes = state.get('notes') || [];
  const section = document.createElement('div');
  section.className = 'bg-slate-800 border border-slate-700 rounded-xl p-5';

  section.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="text-2xl">📚</span>
        <h3 class="font-bold text-slate-100">انتخاب یادداشت‌ها</h3>
      </div>
      <button id="select-all-notes" class="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors">
        انتخاب همه
      </button>
    </div>
  `;

  if (notes.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'text-center py-12';
    empty.innerHTML = `
      <div class="text-5xl mb-3 opacity-50">📝</div>
      <p class="text-slate-400 mb-4">هنوز یادداشتی ندارید!</p>
      <button onclick="location.hash='#/notes'" class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition-colors">
        ➕ ایجاد اولین یادداشت
      </button>
    `;
    section.appendChild(empty);
    return section;
  }

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto no-scrollbar';
  grid.id = 'notes-grid';

  notes.forEach(note => {
    const isSelected = quizState.selectedNoteIds.includes(note.id);
    const card = document.createElement('button');
    card.className = `note-select-btn p-3 rounded-lg border text-right transition-all ${
      isSelected 
        ? 'bg-primary-500/20 border-primary-500 ring-2 ring-primary-500/50' 
        : 'bg-slate-900/50 border-slate-700 hover:bg-slate-900 hover:border-slate-600'
    }`;
    card.dataset.noteId = note.id;
    
    const preview = note.content 
      ? note.content.substring(0, 60) + (note.content.length > 60 ? '...' : '')
      : 'بدون محتوا';

    card.innerHTML = `
      <div class="flex items-start gap-2">
        <div class="flex-shrink-0 w-5 h-5 rounded border-2 ${
          isSelected ? 'bg-primary-500 border-primary-500' : 'border-slate-600'
        } flex items-center justify-center">
          ${isSelected ? '<span class="text-white text-xs">✓</span>' : ''}
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-slate-100 truncate">${escapeHtml(note.title || 'بدون عنوان')}</div>
          <div class="text-xs text-slate-500 mt-1 line-clamp-2">${escapeHtml(preview)}</div>
          <div class="flex items-center gap-2 mt-2 text-xs text-slate-500">
            <span class="bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded">${note.category || 'سایر'}</span>
            <span>${note.wordCount || 0} کلمه</span>
          </div>
        </div>
      </div>
    `;

    card.addEventListener('click', () => toggleNoteSelection(note.id));
    grid.appendChild(card);
  });

  section.appendChild(grid);

  // شمارنده انتخاب شده
  const counter = document.createElement('div');
  counter.id = 'notes-counter';
  counter.className = 'mt-3 text-xs text-slate-400';
  counter.textContent = `${quizState.selectedNoteIds.length} یادداشت انتخاب شده`;
  section.appendChild(counter);

  setTimeout(() => {
    document.getElementById('select-all-notes')?.addEventListener('click', selectAllNotes);
  }, 0);

  return section;
}

function toggleNoteSelection(noteId) {
  const index = quizState.selectedNoteIds.indexOf(noteId);
  if (index > -1) {
    quizState.selectedNoteIds.splice(index, 1);
  } else {
    quizState.selectedNoteIds.push(noteId);
  }
  updateNoteCardsUI();
}

function selectAllNotes() {
  const notes = state.get('notes') || [];
  if (quizState.selectedNoteIds.length === notes.length) {
    quizState.selectedNoteIds = [];
  } else {
    quizState.selectedNoteIds = notes.map(n => n.id);
  }
  updateNoteCardsUI();
}

function updateNoteCardsUI() {
  document.querySelectorAll('.note-select-btn').forEach(card => {
    const noteId = card.dataset.noteId;
    const isSelected = quizState.selectedNoteIds.includes(noteId);
    
    card.className = `note-select-btn p-3 rounded-lg border text-right transition-all ${
      isSelected 
        ? 'bg-primary-500/20 border-primary-500 ring-2 ring-primary-500/50' 
        : 'bg-slate-900/50 border-slate-700 hover:bg-slate-900 hover:border-slate-600'
    }`;
    
    const check = card.querySelector('.w-5');
    if (check) {
      check.className = `flex-shrink-0 w-5 h-5 rounded border-2 ${
        isSelected ? 'bg-primary-500 border-primary-500' : 'border-slate-600'
      } flex items-center justify-center`;
      check.innerHTML = isSelected ? '<span class="text-white text-xs">✓</span>' : '';
    }
  });

  const counter = document.getElementById('notes-counter');
  if (counter) {
    counter.textContent = `${quizState.selectedNoteIds.length} یادداشت انتخاب شده`;
  }
}

function createQuizSettings() {
  const section = document.createElement('div');
  section.className = 'bg-slate-800 border border-slate-700 rounded-xl p-5';

  section.innerHTML = `
    <div class="flex items-center gap-2 mb-4">
      <span class="text-2xl">⚙️</span>
      <h3 class="font-bold text-slate-100">تنظیمات آزمون</h3>
    </div>
    
    <div class="space-y-4">
      <!-- تعداد سوالات -->
      <div>
        <label class="text-sm text-slate-300 mb-2 flex justify-between">
          <span>📊 تعداد سوالات</span>
          <span class="text-primary-400 font-bold" id="quiz-count-label">${quizState.settings.count}</span>
        </label>
        <input type="range" id="quiz-count-range" min="3" max="30" step="1" value="${quizState.settings.count}" class="w-full accent-primary-500">
        <div class="flex justify-between text-xs text-slate-500 mt-1">
          <span>۳</span><span>۳۰</span>
        </div>
      </div>
      
      <!-- زمان آزمون -->
      <div>
        <label class="text-sm text-slate-300 mb-2 flex justify-between">
          <span>⏱️ زمان آزمون (دقیقه)</span>
          <span class="text-accent-400 font-bold" id="quiz-time-label">${quizState.settings.timeLimit === 0 ? 'بدون محدودیت' : quizState.settings.timeLimit}</span>
        </label>
        <input type="range" id="quiz-time-range" min="0" max="60" step="5" value="${quizState.settings.timeLimit}" class="w-full accent-accent-500">
        <div class="flex justify-between text-xs text-slate-500 mt-1">
          <span>نامحدود</span><span>۶۰ دقیقه</span>
        </div>
      </div>
      
      <!-- انواع سوالات -->
      <div>
        <label class="text-sm text-slate-300 mb-2 block">🎯 انواع سوالات</label>
        <div class="grid grid-cols-3 gap-2">
          ${Object.entries(QUESTION_TYPE_INFO).map(([type, info]) => {
            const isChecked = quizState.settings.types.includes(type);
            return `
              <button data-type="${type}" class="type-btn ${isChecked ? `bg-${info.color}-500/20 border-${info.color}-500 ring-1 ring-${info.color}-500/50` : 'bg-slate-900/50 border-slate-700 hover:bg-slate-900'} border p-3 rounded-lg text-center transition-all">
                <div class="text-2xl mb-1">${info.icon}</div>
                <div class="text-xs font-medium ${isChecked ? `text-${info.color}-300` : 'text-slate-300'}">${info.label}</div>
              </button>
            `;
          }).join('')}
        </div>
      </div>
      
      <!-- گزینه‌های اضافی -->
      <div class="space-y-2 pt-2 border-t border-slate-700">
        <label class="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-900/50 rounded-lg transition-colors">
          <input type="checkbox" id="negative-marking" ${quizState.settings.negativeMarking ? 'checked' : ''} class="w-4 h-4 accent-primary-500">
          <div class="flex-1">
            <div class="text-sm text-slate-200">نمره منفی</div>
            <div class="text-xs text-slate-500">هر ۳ پاسخ غلط = ۱ صحیح کسر می‌شود</div>
          </div>
        </label>
        <label class="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-900/50 rounded-lg transition-colors">
          <input type="checkbox" id="for-exam" ${quizState.settings.forExam ? 'checked' : ''} class="w-4 h-4 accent-primary-500">
          <div class="flex-1">
            <div class="text-sm text-slate-200">🎓 حالت کنکوری</div>
            <div class="text-xs text-slate-500">سوالات سخت‌تر و تحلیل عمیق‌تر</div>
          </div>
        </label>
      </div>
    </div>
  `;

  setTimeout(() => bindSettingsEvents(), 0);
  return section;
}

function bindSettingsEvents() {
  // Count range
  const countRange = document.getElementById('quiz-count-range');
  const countLabel = document.getElementById('quiz-count-label');
  if (countRange && countLabel) {
    countRange.addEventListener('input', () => {
      quizState.settings.count = parseInt(countRange.value);
      countLabel.textContent = countRange.value;
    });
  }

  // Time range
  const timeRange = document.getElementById('quiz-time-range');
  const timeLabel = document.getElementById('quiz-time-label');
  if (timeRange && timeLabel) {
    timeRange.addEventListener('input', () => {
      const val = parseInt(timeRange.value);
      quizState.settings.timeLimit = val;
      timeLabel.textContent = val === 0 ? 'بدون محدودیت' : val;
    });
  }

  // Type buttons
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const idx = quizState.settings.types.indexOf(type);
      if (idx > -1) {
        if (quizState.settings.types.length === 1) {
          toast.warning('حداقل یک نوع سوال باید انتخاب شود');
          return;
        }
        quizState.settings.types.splice(idx, 1);
      } else {
        quizState.settings.types.push(type);
      }
      updateTypeButtonsUI();
    });
  });

  // Checkboxes
  document.getElementById('negative-marking')?.addEventListener('change', (e) => {
    quizState.settings.negativeMarking = e.target.checked;
  });
  document.getElementById('for-exam')?.addEventListener('change', (e) => {
    quizState.settings.forExam = e.target.checked;
  });
}

function updateTypeButtonsUI() {
  document.querySelectorAll('.type-btn').forEach(btn => {
    const type = btn.dataset.type;
    const info = QUESTION_TYPE_INFO[type];
    const isChecked = quizState.settings.types.includes(type);
    
    btn.className = `type-btn ${isChecked ? `bg-${info.color}-500/20 border-${info.color}-500 ring-1 ring-${info.color}-500/50` : 'bg-slate-900/50 border-slate-700 hover:bg-slate-900'} border p-3 rounded-lg text-center transition-all`;
    
    const label = btn.querySelector('.text-xs');
    if (label) {
      label.className = `text-xs font-medium ${isChecked ? `text-${info.color}-300` : 'text-slate-300'}`;
    }
  });
}

function createStartButton() {
  const btn = document.createElement('button');
  btn.id = 'start-quiz-btn';
  btn.className = 'w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all transform hover:scale-[1.02]';
  btn.innerHTML = `
    <div class="flex items-center justify-center gap-3">
      <span class="text-2xl">🚀</span>
      <span>شروع آزمون</span>
    </div>
  `;
  btn.addEventListener('click', startQuiz);
  return btn;
}

// ============================================================
// شروع آزمون
// ============================================================
async function startQuiz() {
  // اعتبارسنجی
  if (quizState.selectedNoteIds.length === 0) {
    toast.warning('لطفاً حداقل یک یادداشت انتخاب کنید');
    return;
  }

  const notes = state.get('notes').filter(n => quizState.selectedNoteIds.includes(n.id));
  const totalWords = notes.reduce((sum, n) => sum + (n.wordCount || 0), 0);

  if (totalWords < 100) {
    toast.warning('محتوای یادداشت‌های انتخاب شده برای ساخت آزمون کافی نیست (حداقل ۱۰۰ کلمه)');
    return;
  }

  // نمایش loading
  const closeLoading = modal.loading('در حال ساخت آزمون هوشمند...');

  try {
    // ترکیب محتوای یادداشت‌ها
    const combinedText = notes.map(n => 
      `# ${n.title || 'بدون عنوان'}\n\n${n.content}`
    ).join('\n\n---\n\n');

    // تولید آزمون
    const quizData = quizGenerator.generate(combinedText, {
      count: quizState.settings.count,
      types: quizState.settings.types,
      forExam: quizState.settings.forExam
    });

    if (!quizData.questions || quizData.questions.length === 0) {
      throw new Error('نتوانستیم از این متن سوال بسازیم. متن بیشتری اضافه کنید.');
    }

    // ذخیره در state
    quizState.quiz = {
      id: Date.now().toString(36),
      title: `آزمون ${new Date().toLocaleDateString('fa-IR')}`,
      questions: quizData.questions,
      createdAt: new Date().toISOString(),
      settings: { ...quizState.settings }
    };
    quizState.answers = {};
    quizState.currentQuestion = 0;
    quizState.timeLeft = quizState.settings.timeLimit * 60;
    quizState.startTime = Date.now();

    closeLoading();

    // تغییر به فاز quiz
    quizState.phase = 'quiz';
    renderCurrentPhase();

    // شروع تایمر اگر نیاز است
    if (quizState.settings.timeLimit > 0) {
      startQuizTimer();
    }

    toast.success(`${quizData.questions.length} سوال آماده شد`, 'آزمون شروع شد');
  } catch (error) {
    closeLoading();
    logger.error('خطا در ساخت آزمون', error);
    toast.error('خطا در ساخت آزمون: ' + error.message);
  }
}

function startQuizTimer() {
  if (quizState.timer) clearInterval(quizState.timer);
  
  quizState.timer = setInterval(() => {
    quizState.timeLeft--;
    updateQuizTimerUI();

    // هشدار زمان کم
    if (quizState.timeLeft === 60) {
      toast.warning('فقط ۱ دقیقه تا پایان آزمون!', '⏰');
    } else if (quizState.timeLeft === 10) {
      soundManager.playNotification('digital');
    }

    // پایان زمان
    if (quizState.timeLeft <= 0) {
      finishQuiz(true);
    }
  }, 1000);
}

function updateQuizTimerUI() {
  const timerEl = document.getElementById('quiz-timer');
  if (!timerEl) return;

  const minutes = Math.floor(quizState.timeLeft / 60);
  const seconds = quizState.timeLeft % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  timerEl.textContent = timeStr;
  
  // تغییر رنگ در زمان کم
  if (quizState.timeLeft <= 60) {
    timerEl.classList.add('text-red-400');
    timerEl.classList.remove('text-accent-400');
  }

  document.title = `${timeStr} - آزمون | دانش‌یار پرو`;
}

// ============================================================
// فاز ۲: انجام آزمون
// ============================================================
function renderQuizPhase() {
  const wrapper = document.createElement('div');
  wrapper.className = 'space-y-4';

  // Top bar با progress و timer
  wrapper.appendChild(createQuizTopBar());

  // سوال فعلی
  wrapper.appendChild(createQuestionCard());

  // Navigation buttons
  wrapper.appendChild(createQuizNavigation());

  // Question navigator (پایین)
  wrapper.appendChild(createQuestionNavigator());

  return wrapper;
}

function createQuizTopBar() {
  const total = quizState.quiz.questions.length;
  const answered = Object.keys(quizState.answers).length;
  const progress = (answered / total) * 100;

  const bar = document.createElement('div');
  bar.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4';
  bar.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-3">
        <span class="text-2xl">📝</span>
        <div>
          <div class="font-bold text-slate-100">${quizState.quiz.title}</div>
          <div class="text-xs text-slate-400">${answered} از ${total} سوال پاسخ داده شده</div>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        ${quizState.settings.timeLimit > 0 ? `
          <div class="flex items-center gap-2 bg-accent-500/10 border border-accent-500/30 px-3 py-1.5 rounded-lg">
            <span class="text-lg">⏱️</span>
            <span id="quiz-timer" class="font-bold text-accent-400 tabular-nums">
              ${String(Math.floor(quizState.timeLeft / 60)).padStart(2, '0')}:${String(quizState.timeLeft % 60).padStart(2, '0')}
            </span>
          </div>
        ` : ''}
        <button id="finish-quiz-btn" class="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
          🏁 پایان
        </button>
      </div>
    </div>
    
    <div class="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
      <div class="bg-gradient-to-r from-primary-500 to-accent-500 h-full rounded-full transition-all duration-500" style="width: ${progress}%"></div>
    </div>
  `;

  setTimeout(() => {
    document.getElementById('finish-quiz-btn')?.addEventListener('click', confirmFinishQuiz);
  }, 0);

  return bar;
}

function createQuestionCard() {
  const question = quizState.quiz.questions[quizState.currentQuestion];
  const typeInfo = QUESTION_TYPE_INFO[question.type] || QUESTION_TYPE_INFO.mc;
  const currentAnswer = quizState.answers[quizState.currentQuestion];

  const card = document.createElement('div');
  card.className = 'bg-slate-800 border border-slate-700 rounded-xl overflow-hidden';
  
  card.innerHTML = `
    <div class="p-4 border-b border-slate-700 bg-gradient-to-l from-${typeInfo.color}-500/10 to-transparent flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xl">${typeInfo.icon}</span>
        <span class="text-sm font-bold text-slate-100">سوال ${quizState.currentQuestion + 1} از ${quizState.quiz.questions.length}</span>
        <span class="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">${typeInfo.label}</span>
      </div>
      <div class="flex items-center gap-1">
        ${renderDifficultyStars(question.difficulty || 2)}
      </div>
    </div>
    
    <div class="p-6">
      <div class="text-slate-100 leading-relaxed mb-6 text-base">
        ${escapeHtml(question.question)}
      </div>
      
      <div id="answer-area" class="space-y-3">
        ${renderAnswerInput(question, currentAnswer)}
      </div>
    </div>
  `;

  setTimeout(() => bindAnswerEvents(question), 0);
  return card;
}

function renderDifficultyStars(level) {
  const maxLevel = 4;
  let html = '';
  for (let i = 1; i <= maxLevel; i++) {
    html += `<span class="${i <= level ? 'text-accent-400' : 'text-slate-600'}">★</span>`;
  }
  return html;
}

function renderAnswerInput(question, currentAnswer) {
  switch (question.type) {
    case 'mc':
    case 'tf':
      return renderMultipleChoiceInput(question, currentAnswer);
    case 'fill':
      return renderFillBlankInput(question, currentAnswer);
    default:
      return '<p class="text-slate-400">نوع سوال پشتیبانی نمی‌شود</p>';
  }
}

function renderMultipleChoiceInput(question, currentAnswer) {
  const options = question.options || [];
  const letters = ['الف', 'ب', 'ج', 'د'];
  
  return options.map((opt, idx) => {
    const isSelected = currentAnswer === idx;
    return `
      <button data-option="${idx}" class="quiz-option w-full ${isSelected ? 'bg-primary-500/20 border-primary-500 ring-2 ring-primary-500/50' : 'bg-slate-900/50 border-slate-700 hover:bg-slate-900 hover:border-slate-600'} border p-4 rounded-lg text-right transition-all">
        <div class="flex items-center gap-3">
          <div class="flex-shrink-0 w-8 h-8 rounded-full ${isSelected ? 'bg-primary-500 text-white' : 'bg-slate-700 text-slate-300'} flex items-center justify-center text-sm font-bold">
            ${letters[idx]}
          </div>
          <span class="flex-1 text-sm ${isSelected ? 'text-primary-100' : 'text-slate-200'}">${escapeHtml(opt)}</span>
        </div>
      </button>
    `;
  }).join('');
}

function renderFillBlankInput(question, currentAnswer) {
  return `
    <input type="text" 
           id="fill-answer-input"
           class="input w-full text-lg"
           placeholder="پاسخ خود را بنویسید..."
           value="${currentAnswer ? escapeHtml(currentAnswer) : ''}"
           autocomplete="off">
    <p class="text-xs text-slate-500 mt-2">
      💡 پاسخ را به صورت ساده بنویسید. اعراب‌گذاری لازم نیست.
    </p>
  `;
}

function bindAnswerEvents(question) {
  if (question.type === 'mc' || question.type === 'tf') {
    document.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const optionIdx = parseInt(btn.dataset.option);
        quizState.answers[quizState.currentQuestion] = optionIdx;
        updateAnswerUI(question);
        updateProgressUI();
      });
    });
  } else if (question.type === 'fill') {
    const input = document.getElementById('fill-answer-input');
    if (input) {
      input.addEventListener('input', () => {
        const val = input.value.trim();
        if (val) {
          quizState.answers[quizState.currentQuestion] = val;
        } else {
          delete quizState.answers[quizState.currentQuestion];
        }
        updateProgressUI();
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          goToNextQuestion();
        }
      });
      setTimeout(() => input.focus(), 100);
    }
  }
}

function updateAnswerUI(question) {
  const currentAnswer = quizState.answers[quizState.currentQuestion];
  document.querySelectorAll('.quiz-option').forEach(btn => {
    const idx = parseInt(btn.dataset.option);
    const isSelected = currentAnswer === idx;
    btn.className = `quiz-option w-full ${isSelected ? 'bg-primary-500/20 border-primary-500 ring-2 ring-primary-500/50' : 'bg-slate-900/50 border-slate-700 hover:bg-slate-900 hover:border-slate-600'} border p-4 rounded-lg text-right transition-all`;
    
    const letter = btn.querySelector('.w-8');
    if (letter) {
      letter.className = `flex-shrink-0 w-8 h-8 rounded-full ${isSelected ? 'bg-primary-500 text-white' : 'bg-slate-700 text-slate-300'} flex items-center justify-center text-sm font-bold`;
    }
  });
}

function updateProgressUI() {
  const total = quizState.quiz.questions.length;
  const answered = Object.keys(quizState.answers).length;
  const progress = (answered / total) * 100;
  
  const progressBar = quizState.container?.querySelector('.bg-gradient-to-r.from-primary-500');
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }
  
  const counter = quizState.container?.querySelector('.text-xs.text-slate-400');
  if (counter) {
    counter.textContent = `${answered} از ${total} سوال پاسخ داده شده`;
  }

  // به‌روزرسانی navigator
  updateQuestionNavigator();
}

function createQuizNavigation() {
  const nav = document.createElement('div');
  nav.className = 'flex items-center justify-between gap-3';
  
  nav.innerHTML = `
    <button id="prev-question-btn" class="bg-slate-700 hover:bg-slate-600 text-slate-100 px-5 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed" ${quizState.currentQuestion === 0 ? 'disabled' : ''}>
      ← قبلی
    </button>
    
    <div class="text-sm text-slate-400">
      ${quizState.currentQuestion + 1} / ${quizState.quiz.questions.length}
    </div>
    
    <button id="next-question-btn" class="bg-primary-600 hover:bg-primary-700 text-white px-5 py-3 rounded-lg font-medium transition-colors">
      ${quizState.currentQuestion === quizState.quiz.questions.length - 1 ? '🏁 پایان' : 'بعدی →'}
    </button>
  `;

  setTimeout(() => {
    document.getElementById('prev-question-btn')?.addEventListener('click', goToPrevQuestion);
    document.getElementById('next-question-btn')?.addEventListener('click', () => {
      if (quizState.currentQuestion === quizState.quiz.questions.length - 1) {
        confirmFinishQuiz();
      } else {
        goToNextQuestion();
      }
    });
  }, 0);

  return nav;
}

function createQuestionNavigator() {
  const nav = document.createElement('div');
  nav.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4';
  nav.id = 'question-navigator';
  
  nav.innerHTML = `
    <div class="flex items-center gap-2 mb-3">
      <span class="text-lg">🧭</span>
      <span class="text-sm font-bold text-slate-100">ناوبری سوالات</span>
    </div>
    <div class="flex flex-wrap gap-2" id="navigator-buttons">
      ${renderNavigatorButtons()}
    </div>
    <div class="flex items-center gap-4 mt-4 pt-3 border-t border-slate-700 text-xs text-slate-400">
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded bg-primary-500"></div>
        <span>پاسخ داده شده</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded bg-slate-700"></div>
        <span>بدون پاسخ</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded ring-2 ring-accent-500"></div>
        <span>فعلی</span>
      </div>
    </div>
  `;

  setTimeout(() => bindNavigatorEvents(), 0);
  return nav;
}

function renderNavigatorButtons() {
  return quizState.quiz.questions.map((_, idx) => {
    const isAnswered = quizState.answers[idx] !== undefined;
    const isCurrent = idx === quizState.currentQuestion;
    
    return `
      <button data-q-idx="${idx}" class="nav-q-btn w-9 h-9 rounded text-sm font-bold transition-all ${
        isCurrent ? 'ring-2 ring-accent-500' : ''
      } ${isAnswered ? 'bg-primary-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}">
        ${idx + 1}
      </button>
    `;
  }).join('');
}

function updateQuestionNavigator() {
  const nav = document.getElementById('navigator-buttons');
  if (!nav) return;
  nav.innerHTML = renderNavigatorButtons();
  bindNavigatorEvents();
}

function bindNavigatorEvents() {
  document.querySelectorAll('.nav-q-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.qIdx);
      quizState.currentQuestion = idx;
      renderCurrentPhase();
    });
  });
}

function goToNextQuestion() {
  if (quizState.currentQuestion < quizState.quiz.questions.length - 1) {
    quizState.currentQuestion++;
    renderCurrentPhase();
  }
}

function goToPrevQuestion() {
  if (quizState.currentQuestion > 0) {
    quizState.currentQuestion--;
    renderCurrentPhase();
  }
}

async function confirmFinishQuiz() {
  const answered = Object.keys(quizState.answers).length;
  const total = quizState.quiz.questions.length;
  const unanswered = total - answered;

  let message = `آیا از پایان آزمون مطمئن هستید؟`;
  if (unanswered > 0) {
    message += `\n\n⚠️ ${unanswered} سوال بدون پاسخ مانده است.`;
  }

  const confirmed = await modal.confirm(
    '🏁 پایان آزمون',
    message,
    { confirmText: 'بله، پایان بده', icon: 'warning' }
  );

  if (confirmed) {
    finishQuiz(false);
  }
}

function finishQuiz(timeExpired) {
  if (quizState.timer) {
    clearInterval(quizState.timer);
    quizState.timer = null;
  }

  document.title = 'دانش‌یار پرو';

  if (timeExpired) {
    soundManager.playNotification('classic');
    toast.warning('زمان آزمون به پایان رسید', '⏰');
  }

  // تحلیل نتایج
  quizState.analysis = quizGenerator.analyzeResults(quizState.quiz, quizState.answers);
  quizState.analysis.timeSpent = Math.floor((Date.now() - quizState.startTime) / 1000);

  // ذخیره در تاریخچه
  const historyEntry = {
    id: quizState.quiz.id,
    title: quizState.quiz.title,
    date: new Date().toISOString(),
    totalQuestions: quizState.analysis.totalQuestions,
    correct: quizState.analysis.correct,
    wrong: quizState.analysis.wrong,
    unanswered: quizState.analysis.unanswered,
    percentage: quizState.analysis.percentage,
    timeSpent: quizState.analysis.timeSpent,
    negativeMarking: quizState.settings.negativeMarking,
    settings: quizState.quiz.settings
  };
  state.addQuizResult(historyEntry);

  // تغییر به فاز نتایج
  quizState.phase = 'results';
  renderCurrentPhase();
}

// ============================================================
// فاز ۳: نتایج آزمون
// ============================================================
function renderResultsPhase() {
  const wrapper = document.createElement('div');
  wrapper.className = 'space-y-6';

  wrapper.appendChild(createResultsHeader());
  wrapper.appendChild(createScoreCard());
  wrapper.appendChild(createStatsGrid());
  wrapper.appendChild(createWeaknessAnalysis());
  wrapper.appendChild(createRecommendationsCard());
  wrapper.appendChild(createResultsActions());

  return wrapper;
}

function createResultsHeader() {
  const percentage = quizState.analysis.percentage;
  let icon, title, message, color;

  if (percentage >= 90) {
    icon = '🏆'; title = 'عالی!'; message = 'تسلط شما فوق‌العاده است'; color = 'green';
  } else if (percentage >= 70) {
    icon = '🎉'; title = 'خوب!'; message = 'عملکرد قابل قبولی داشتید'; color = 'primary';
  } else if (percentage >= 50) {
    icon = '📊'; title = 'قابل بهبود'; message = 'نیاز به مرور بیشتر دارید'; color = 'accent';
  } else {
    icon = '💪'; title = 'تلاش بیشتری لازم است'; message = 'ناامید نشوید، با تمرین بهتر می‌شوید'; color = 'red';
  }

  const header = document.createElement('div');
  header.className = 'text-center py-8 space-y-3';
  header.innerHTML = `
    <div class="text-8xl mb-4">${icon}</div>
    <h1 class="text-4xl font-black text-${color}-400">${title}</h1>
    <p class="text-slate-400">${message}</p>
    <div class="text-6xl font-black bg-gradient-to-r from-${color}-400 to-primary-400 bg-clip-text text-transparent">
      ${percentage}٪
    </div>
  `;
  return header;
}

function createScoreCard() {
  const a = quizState.analysis;
  const timeMinutes = Math.floor(a.timeSpent / 60);
  const timeSeconds = a.timeSpent % 60;

  const card = document.createElement('div');
  card.className = 'bg-slate-800 border border-slate-700 rounded-xl p-6';
  card.innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
        <div class="text-3xl mb-1">✅</div>
        <div class="text-2xl font-bold text-green-400">${a.correct}</div>
        <div class="text-xs text-slate-400 mt-1">صحیح</div>
      </div>
      <div class="text-center p-4 bg-red-500/10 rounded-lg border border-red-500/20">
        <div class="text-3xl mb-1">❌</div>
        <div class="text-2xl font-bold text-red-400">${a.wrong}</div>
        <div class="text-xs text-slate-400 mt-1">غلط</div>
      </div>
      <div class="text-center p-4 bg-slate-500/10 rounded-lg border border-slate-500/20">
        <div class="text-3xl mb-1">⭕</div>
        <div class="text-2xl font-bold text-slate-400">${a.unanswered}</div>
        <div class="text-xs text-slate-400 mt-1">بدون پاسخ</div>
      </div>
      <div class="text-center p-4 bg-accent-500/10 rounded-lg border border-accent-500/20">
        <div class="text-3xl mb-1">⏱️</div>
        <div class="text-2xl font-bold text-accent-400">${timeMinutes}:${String(timeSeconds).padStart(2, '0')}</div>
        <div class="text-xs text-slate-400 mt-1">زمان صرف شده</div>
      </div>
    </div>
  `;
  return card;
}

function createStatsGrid() {
  const a = quizState.analysis;
  const card = document.createElement('div');
  card.className = 'bg-slate-800 border border-slate-700 rounded-xl p-6';

  // عملکرد بر اساس نوع سوال
  const byTypeHtml = Object.entries(a.byType || {}).map(([type, data]) => {
    const info = QUESTION_TYPE_INFO[type] || { icon: '❓', label: type };
    const percent = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
    return `
      <div class="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
        <div class="flex items-center gap-2">
          <span class="text-xl">${info.icon}</span>
          <span class="text-sm font-medium text-slate-200">${info.label}</span>
        </div>
        <div class="text-left">
          <div class="text-sm font-bold ${percent >= 70 ? 'text-green-400' : percent >= 50 ? 'text-accent-400' : 'text-red-400'}">${percent}٪</div>
          <div class="text-xs text-slate-500">${data.correct}/${data.total}</div>
        </div>
      </div>
    `;
  }).join('');

  card.innerHTML = `
    <div class="flex items-center gap-2 mb-4">
      <span class="text-2xl">📊</span>
      <h3 class="font-bold text-slate-100">عملکرد بر اساس نوع سوال</h3>
    </div>
    <div class="space-y-2">
      ${byTypeHtml || '<p class="text-slate-500 text-center py-4">داده‌ای موجود نیست</p>'}
    </div>
  `;

  return card;
}

function createWeaknessAnalysis() {
  const a = quizState.analysis;
  const card = document.createElement('div');
  card.className = 'bg-slate-800 border border-slate-700 rounded-xl p-6';

  // مفاهیم ضعیف
  const weakConcepts = Object.entries(a.byConcept || {})
    .filter(([_, data]) => data.total >= 1 && (data.correct / data.total) < 0.6)
    .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
    .slice(0, 5);

  // سوالات غلط
  const allWrongQuestions = [];
  Object.entries(a.byConcept || {}).forEach(([concept, data]) => {
    if (data.wrong && data.wrong.length > 0) {
      data.wrong.forEach(w => allWrongQuestions.push({ concept, ...w }));
    }
  });

  card.innerHTML = `
    <div class="flex items-center gap-2 mb-4">
      <span class="text-2xl">🎯</span>
      <h3 class="font-bold text-slate-100">تحلیل نقاط ضعف</h3>
    </div>
    
    ${weakConcepts.length > 0 ? `
      <div class="mb-4">
        <h4 class="text-sm font-semibold text-slate-300 mb-2">مفاهیم نیازمند مرور:</h4>
        <div class="flex flex-wrap gap-2">
          ${weakConcepts.map(([concept, data]) => {
            const percent = Math.round((data.correct / data.total) * 100);
            return `
              <div class="bg-red-500/10 border border-red-500/30 px-3 py-2 rounded-lg">
                <div class="text-sm font-medium text-red-300">${escapeHtml(concept)}</div>
                <div class="text-xs text-red-400">${percent}٪ موفقیت</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : `
      <div class="text-center py-4 bg-green-500/10 border border-green-500/30 rounded-lg">
        <div class="text-3xl mb-2">🎉</div>
        <p class="text-green-300 text-sm">هیچ نقطه ضعف قابل توجهی یافت نشد!</p>
      </div>
    `}
    
    ${allWrongQuestions.length > 0 ? `
      <div class="mt-4 pt-4 border-t border-slate-700">
        <h4 class="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
          <span>📝</span>
          <span>مرور سوالات غلط (${allWrongQuestions.length})</span>
        </h4>
        <div class="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
          ${allWrongQuestions.slice(0, 5).map((q, idx) => `
            <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
              <div class="text-xs text-slate-500 mb-1">سوال ${idx + 1} - ${escapeHtml(q.concept)}</div>
              <div class="text-sm text-slate-200 mb-2">${escapeHtml(q.question)}</div>
              <div class="flex items-center gap-2 text-xs">
                <span class="text-red-400">❌ پاسخ شما: ${escapeHtml(String(q.userAnswer))}</span>
                <span class="text-slate-500">|</span>
                <span class="text-green-400">✅ صحیح: ${escapeHtml(q.correctAnswer)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;

  return card;
}

function createRecommendationsCard() {
  const a = quizState.analysis;
  const card = document.createElement('div');
  card.className = 'bg-gradient-to-l from-primary-500/10 to-accent-500/10 border border-primary-500/30 rounded-xl p-6';

  const recommendations = a.recommendations || [];

  card.innerHTML = `
    <div class="flex items-center gap-2 mb-4">
      <span class="text-2xl">💡</span>
      <h3 class="font-bold text-slate-100">پیشنهادات</h3>
    </div>
    
    ${recommendations.length > 0 ? `
      <div class="space-y-3">
        ${recommendations.map(rec => `
          <div class="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
            <span class="text-xl">${rec.icon}</span>
            <p class="text-sm text-slate-200 leading-relaxed">${escapeHtml(rec.message)}</p>
          </div>
        `).join('')}
      </div>
    ` : `
      <p class="text-slate-400 text-center py-4">پیشنهاد خاصی وجود ندارد</p>
    `}
  `;

  return card;
}

function createResultsActions() {
  const actions = document.createElement('div');
  actions.className = 'grid grid-cols-1 md:grid-cols-3 gap-3';

  // دکمه شروع مجدد
  const retryBtn = document.createElement('button');
  retryBtn.className = 'bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-xl font-bold transition-all transform hover:scale-[1.02]';
  retryBtn.innerHTML = `
    <div class="flex items-center justify-center gap-2">
      <span class="text-xl">🔄</span>
      <span>آزمون جدید</span>
    </div>
  `;
  retryBtn.addEventListener('click', () => {
    quizState.phase = 'setup';
    quizState.quiz = null;
    quizState.answers = {};
    quizState.analysis = null;
    renderCurrentPhase();
  });

  // دکمه مرور فلش‌کارت
  const flashcardBtn = document.createElement('button');
  flashcardBtn.className = 'bg-accent-500 hover:bg-accent-600 text-white py-4 rounded-xl font-bold transition-all transform hover:scale-[1.02]';
  flashcardBtn.innerHTML = `
    <div class="flex items-center justify-center gap-2">
      <span class="text-xl">🃏</span>
      <span>مرور با فلش‌کارت</span>
    </div>
  `;
  flashcardBtn.addEventListener('click', () => {
    router.navigate('flashcards');
  });

  // دکمه بازگشت
  const backBtn = document.createElement('button');
  backBtn.className = 'bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-xl font-bold transition-all transform hover:scale-[1.02]';
  backBtn.innerHTML = `
    <div class="flex items-center justify-center gap-2">
      <span class="text-xl">🏠</span>
      <span>داشبورد</span>
    </div>
  `;
  backBtn.addEventListener('click', () => {
    router.navigate('dashboard');
  });

  actions.appendChild(retryBtn);
  actions.appendChild(flashcardBtn);
  actions.appendChild(backBtn);

  return actions;
}

// ============================================================
// Utility Functions
// ============================================================
function escapeHtml(text) {
  if (!text && text !== 0) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

export default createQuizView;