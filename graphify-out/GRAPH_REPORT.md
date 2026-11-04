# Graph Report - daneshyar-pro  (2026-11-04)

## Corpus Check
- 109 files · ~101,974 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 21 file(s) not represented in the graph (top: .xml 10, (none) 3, .properties 2)

## Summary
- 1528 nodes · 3291 edges · 114 communities (79 shown, 35 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 75 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2a617dfd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- QuizGenerator
- SoundManager
- PomodoroService
- InviteView.ts
- package.json
- SRS.ts
- AISummaryService.ts
- NotesView.ts
- EventBus
- FlashcardsView.ts
- PremiumView.ts
- StateManager
- createIcon
- iconHTML
- SettingsView.ts
- DatabaseService
- Button.ts
- Layout
- Layout.ts
- compilerOptions
- dateFormatter.ts
- Logger
- Router
- steps
- Errors.ts
- steps
- 📋 تصمیمات فنی پروژه دانش‌یار پرو
- SpacedRepetitionSystem
- EventBus.ts
- LandingView.ts
- State.ts
- AppError
- main.ts
- ErrorHandler
- Toast.ts
- Database.ts
- StreakService
- Router.ts
- Logger.ts
- ModalManager
- ToastManager
- Storage.ts
- ExampleInstrumentedTest.java
- Modal.ts
- پرامپت: ممیزی امنیتی (Security Audit)
- LegalView.ts
- پرامپت: بازبینی کد (Code Review)
- پرامپت: تولید پیام Commit هوشمند (Smart Commit)
- index.ts
- 🎯 MASTER PLAN — دانش‌یار پرو
- 🚨 مشکلات اصلی (به ترتیب اولویت)
- پرامپت: اسکن TODO/FIXME (Todo Scan)
- AIQuizService.ts
- CONTEXT.md
- پرامپت: تولید Changelog
- ai.ts
- ۱۰ آبان ۱۴۰۵ (۱ نوامبر ۲۰۲۶)
- MEMORY.md
- هفته ۱ (۶ آبان ۱۴۰۵ - ۱۲ آبان ۱۴۰۵)
- smart-commit.sh
- escapeHtml
- 🤖 ایجنت‌ها و نقش‌ها
- 🔐 امنیت (همیشه فعال)
- 🎯 اهداف اصلی
- 🎯 فازهای اجرایی
- 📋 چک‌لیست روزانه
- RULES.md
- deno.json
- ISSUES.md
- 📚 منابع و ابزار
- 📊 وضعیت فعلی پروژه
- 🎓 قوانین طلایی
- 🎯 موفقیت چگونه تعریف می‌شود؟
- 📈 سیستم گزارش‌دهی
- 🔍 تحلیل گراف (Graphify)
- 🔄 تاریخچه به‌روزرسانی‌ها
- MainActivity.java
- Dexie (IndexedDB)
- Flashcard
- Note
- ValidationError
- CLAUDE.md
- .claude/CLAUDE.md
- api.ts
- SyncService.ts
- AuthView.ts
- DashboardView.ts
- Input.ts
- PomodoroView.ts
- QuizGenerator.ts
- createNotesView
- FocusAudioService
- Summarizer.ts
- Summarizer
- تحلیل وابستگی Pomodoro به Router
- StreakService.ts
- AGENTS.md — دانش‌یار پرو
- چک‌لیست‌ها
- getSupabaseClient
- PomodoroService.ts
- openSearchPalette
- احراز هویت و سهمیه

## God Nodes (most connected - your core abstractions)
1. `iconHTML()` - 81 edges
2. `toPersianDigits()` - 76 edges
3. `createIcon()` - 66 edges
4. `createButton()` - 54 edges
5. `getInstance()` - 49 edges
6. `getToast()` - 49 edges
7. `getDatabase()` - 46 edges
8. `DatabaseService` - 43 edges
9. `SoundManager` - 43 edges
10. `getRouter()` - 37 edges

## Surprising Connections (you probably didn't know these)
- `جریان احراز هویت` --references--> `getSupabaseClient()`  [INFERRED]
  .ai/auth.md → src/services/AuthService.ts
- `الگوهای کدنویسی` --references--> `activatePremium()`  [INFERRED]
  AGENTS.md → src/services/Premium.ts
- `ممنوعیت‌ها` --references--> `escapeHtml()`  [INFERRED]
  AGENTS.md → src/ui/components/Modal.ts
- `Workaround های فعلی` --references--> `escapeHtml()`  [INFERRED]
  .ai/hack.md → src/ui/components/Modal.ts
- `Dexie (IndexedDB)` --references--> `getDatabase()`  [INFERRED]
  .ai/data.md → src/core/Database.ts

## Import Cycles
- None detected.

## Communities (114 total, 35 thin omitted)

### Community 3 - "InviteView.ts"
Cohesion: 0.19
Nodes (16): getSession(), logger, PaymentResult, requestPayment(), Plan, clearPendingRef(), getMyReferralCode(), getPendingRef() (+8 more)

### Community 4 - "package.json"
Cohesion: 0.05
Nodes (43): config, dependencies, @capacitor/android@^8.5.0, @capacitor/cli@^8.5.0, @capacitor/core@^8.5.0, dexie@^4.4.4, lottie-web@^5.13.0, lucide@^1.33.0 (+35 more)

### Community 5 - "SRS.ts"
Cohesion: 0.12
Nodes (14): ConceptType, CONTENT_MULTIPLIERS, CreateCardData, EfficiencyAnalysis, Flashcard, ForecastEntry, getSRS(), logger (+6 more)

### Community 6 - "AISummaryService.ts"
Cohesion: 0.20
Nodes (15): AIPreserved, AISelfTest, AISummary, AISummaryOptions, AISummaryResult, AISummarySection, cacheKey(), getAISummary() (+7 more)

### Community 7 - "NotesView.ts"
Cohesion: 0.13
Nodes (21): appendInline(), applyMarkdown(), buildEmpty(), CATEGORIES, CATEGORY_STYLES, clearDraft(), countWords(), createMdToolbar() (+13 more)

### Community 9 - "FlashcardsView.ts"
Cohesion: 0.14
Nodes (13): QUALITY_LEVELS, burstConfetti(), CONCEPT_STYLES, CONCEPT_TYPES, createManageSearch(), currentStreak(), getCardStatus(), logger (+5 more)

### Community 10 - "PremiumView.ts"
Cohesion: 0.20
Nodes (22): نکات مهم, activatePremium(), deactivatePremium(), getPremiumDaysLeft(), getPremiumExpiry(), getPremiumPlan(), isPremium(), logger (+14 more)

### Community 12 - "createIcon"
Cohesion: 0.16
Nodes (23): createIcon(), formatToman(), monthlyEquivalent(), savingsPercent(), createButton(), createChallengeCard(), createChallengesView(), BENEFITS (+15 more)

### Community 13 - "iconHTML"
Cohesion: 0.06
Nodes (101): getDatabase(), friendlyAIError(), getRemainingQuota(), getTier(), iconHTML(), checkAIQuota(), getQuotaInfo(), QuotaCheckResult (+93 more)

### Community 14 - "SettingsView.ts"
Cohesion: 0.31
Nodes (9): PLANS, createChevron(), buildProgressCard(), getXP(), levelOf(), logger, openXpSheet(), Phase (+1 more)

### Community 16 - "Button.ts"
Cohesion: 0.11
Nodes (18): ICON_MAP, animateValue(), appendIconSmart(), CARD_PADDINGS, CARD_VARIANTS, CardOptions, CardPadding, CardVariant (+10 more)

### Community 17 - "Layout"
Cohesion: 0.10
Nodes (12): Community های ضعیف گراف, Debt فنی و Workaround ها, Edge Function drift, P1 (بحرانی), P2 (مهم), P3 (کم), TODO های مهم, Workaround های فعلی (+4 more)

### Community 18 - "Layout.ts"
Cohesion: 0.25
Nodes (6): getState(), BOTTOM_NAV_ITEMS, logger, MORE_ITEMS, NAV_ITEMS, NavItem

### Community 19 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, baseUrl, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleDetection (+19 more)

### Community 20 - "dateFormatter.ts"
Cohesion: 0.15
Nodes (22): AR_DIGITS, DateInput, FA_DIGITS, faNum(), formatCountdown(), formatDateTime(), formatDuration(), formatPersianDate() (+14 more)

### Community 23 - "steps"
Cohesion: 0.09
Nodes (22): runs-on, steps, COMMIT_MSG, JOB_STATUS, RUN_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, jobs (+14 more)

### Community 24 - "Errors.ts"
Cohesion: 0.12
Nodes (19): AIServiceErrorOptions, AppErrorOptions, ERROR_CATEGORIES, ERROR_CODES, ERROR_SEVERITY, ErrorCategory, ErrorCode, ErrorListener (+11 more)

### Community 25 - "steps"
Cohesion: 0.10
Nodes (20): jobs, update-graph, name, on, push, schedule, workflow_dispatch, permissions (+12 more)

### Community 26 - "📋 تصمیمات فنی پروژه دانش‌یار پرو"
Cohesion: 0.10
Nodes (20): [1405/06] بسته‌ی سخت‌سازی قبل از دمو, [1405/06] لندینگ نهایی, تصمیم: Rate Limiting به جای Daily Quota, تصمیم: شعله‌ی Streak با Lottie, تصمیم ۱: Vite به جای Webpack, تصمیم ۱: امنیت اشتراک با Edge Function, تصمیم ۱۰: Capacitor به جای Electron (برای Mobile), تصمیم ۲: TypeScript با strict mode (+12 more)

### Community 28 - "EventBus.ts"
Cohesion: 0.20
Nodes (8): EventBusOptions, EventBusStats, EventCallback, EventObject, HistoryFilter, Listener, logger, SubscriptionOptions

### Community 29 - "LandingView.ts"
Cohesion: 0.21
Nodes (17): buildDashScreen(), buildFocusScreen(), buildQuizScreen(), buildReviewScreen(), createCurveDemo(), createFlashDemo(), createLandingView(), createLiveFlame() (+9 more)

### Community 30 - "State.ts"
Cohesion: 0.11
Nodes (14): AppInfo, AppState, DEFAULT_STATE, eventBus, logger, LS_KEYS, PERSIST_KEYS, QuizResult (+6 more)

### Community 31 - "AppError"
Cohesion: 0.11
Nodes (7): AIServiceError, AppError, NetworkError, NotFoundError, PermissionError, StorageError, TimeoutError

### Community 32 - "main.ts"
Cohesion: 0.13
Nodes (22): اقدامات refactor (به ترتیب اولویت), getInstance(), getInstance(), bootstrap(), createComingSoonView(), logger, registerViews(), router (+14 more)

### Community 34 - "Toast.ts"
Cohesion: 0.22
Nodes (7): eventBus, logger, TOAST_TYPES, ToastData, ToastOptions, ToastType, ToastTypeConfig

### Community 35 - "Database.ts"
Cohesion: 0.19
Nodes (12): Achievement, DbFlashcard, DbNote, DbQuizResult, DbStats, DbStudySession, logger, LS_KEYS (+4 more)

### Community 37 - "Router.ts"
Cohesion: 0.14
Nodes (12): AfterEachHook, BeforeEachHook, DEFAULT_ROUTES, eventBus, logger, NavigateOptions, NavigationEvent, RouteConfig (+4 more)

### Community 38 - "Logger.ts"
Cohesion: 0.07
Nodes (28): LOG_COLORS, LOG_LEVELS, LogColor, LogEntry, LoggerOptions, LogLevel, Challenge, ChallengeCategory (+20 more)

### Community 41 - "Storage.ts"
Cohesion: 0.07
Nodes (20): eventBus, getStorage(), logger, LS_KEYS, LSKey, Storage, StorageOptions, StorageStats (+12 more)

### Community 43 - "Modal.ts"
Cohesion: 0.17
Nodes (10): ActiveModal, ConfirmOptions, eventBus, logger, ModalButton, ModalButtonType, ModalOptions, ModalSize (+2 more)

### Community 44 - "پرامپت: ممیزی امنیتی (Security Audit)"
Cohesion: 0.18
Nodes (10): [Low] <عنوان>, [Medium] <عنوان>, خروجی, روش کار, محدوده‌ی اسکن (فقط همین‌ها), موارد بررسی‌شده و سالم, نقش, هدف (+2 more)

### Community 45 - "LegalView.ts"
Cohesion: 0.24
Nodes (10): getRouter(), DOCS, getLegalDoc(), getLegalDocs(), LegalDoc, LegalDocId, LegalSection, createLegalView() (+2 more)

### Community 46 - "پرامپت: بازبینی کد (Code Review)"
Cohesion: 0.22
Nodes (8): تست‌ها, جمع‌بندی و اقدام بعدی, خروجی, دامنه‌ی بازبینی, نقش, نکات مثبت (اختیاری و کوتاه), هدف, پرامپت: بازبینی کد (Code Review)

### Community 47 - "پرامپت: تولید پیام Commit هوشمند (Smart Commit)"
Cohesion: 0.22
Nodes (8): روش کار, قالب پیام, قوانین سخت, نقش, نمونه‌ها, هدف, ورودی, پرامپت: تولید پیام Commit هوشمند (Smart Commit)

### Community 48 - "index.ts"
Cohesion: 0.20
Nodes (4): Input Validation, corsHeaders, FALLBACK_MODELS, validateQuestion()

### Community 49 - "🎯 MASTER PLAN — دانش‌یار پرو"
Cohesion: 0.25
Nodes (7): GitHub Actions (فعال), 🎯 MASTER PLAN — دانش‌یار پرو, 🔄 اتوماسیون, اتوماسیون‌های آینده, 📞 اطلاعات تماس اضطراری, اگر مشکلی پیش آمد, فایل‌های مهم

### Community 50 - "🚨 مشکلات اصلی (به ترتیب اولویت)"
Cohesion: 0.25
Nodes (8): اولویت ۱: اتصال و VPN, اولویت ۲: وابستگی به کاربر, اولویت ۳: فراموشی AI, اولویت ۴: چارچوب ایجنت‌ها, اولویت ۵: مغز دوم, اولویت ۶: Drift کد و Production, اولویت ۷: تست و Quality, 🚨 مشکلات اصلی (به ترتیب اولویت)

### Community 51 - "پرامپت: اسکن TODO/FIXME (Todo Scan)"
Cohesion: 0.25
Nodes (7): خروجی, دامنه, روش کار, قوانین سخت, نقش, هدف, پرامپت: اسکن TODO/FIXME (Todo Scan)

### Community 52 - "AIQuizService.ts"
Cohesion: 0.15
Nodes (18): AI_TIMEOUT_MS, AIQuizService, AIResult, AITier, cacheKey(), GenerateHooks, getAIQuizService(), getOrCreateDeviceId() (+10 more)

### Community 53 - "CONTEXT.md"
Cohesion: 0.29
Nodes (6): اطلاعات پایه, فایل‌های کلیدی, مسیرهای اصلی, معماری فنی, وابستگی‌های اصلی, وضعیت فعلی

### Community 54 - "پرامپت: تولید Changelog"
Cohesion: 0.29
Nodes (6): خروجی, روش کار, قوانین سخت, نقش, هدف, پرامپت: تولید Changelog

### Community 55 - "ai.ts"
Cohesion: 0.29
Nodes (6): AI_CONFIG, AI_KEYS_LS, AI_LIMITS, AI_USAGE_LS, AITier, PREMIUM_LS

### Community 56 - "۱۰ آبان ۱۴۰۵ (۱ نوامبر ۲۰۲۶)"
Cohesion: 0.33
Nodes (5): مشکلات, کارهای انجام‌شده, کارهای فردا, یادداشت‌های مهم, ۱۰ آبان ۱۴۰۵ (۱ نوامبر ۲۰۲۶)

### Community 57 - "MEMORY.md"
Cohesion: 0.33
Nodes (5): تصمیمات مهم, راه‌حل اتصال, وضعیت فعلی, کارهای انجام‌شده, کارهای در حال انجام

### Community 58 - "هفته ۱ (۶ آبان ۱۴۰۵ - ۱۲ آبان ۱۴۰۵)"
Cohesion: 0.33
Nodes (5): دستاوردها, مشکلات باز, مشکلات حل‌شده, هفته ۱ (۶ آبان ۱۴۰۵ - ۱۲ آبان ۱۴۰۵), کارهای هفته بعد

### Community 59 - "smart-commit.sh"
Cohesion: 0.53
Nodes (4): sanitize_message(), smart-commit.sh script, show_message(), strip_ansi()

### Community 60 - "escapeHtml"
Cohesion: 0.24
Nodes (9): CORS و CSP, XSS Prevention, الگوهای امن ✅, قوانین امنیتی دانش‌یار پرو, ممنوعیت‌های مطلق ❌, چک‌لیست امنیتی قبل از commit, محورهای بازبینی, آنچه باید بررسی شود (+1 more)

### Community 61 - "🤖 ایجنت‌ها و نقش‌ها"
Cohesion: 0.40
Nodes (5): Claude Chat, OpenCode, Qwen (این چت), ZCode, 🤖 ایجنت‌ها و نقش‌ها

### Community 62 - "🔐 امنیت (همیشه فعال)"
Cohesion: 0.40
Nodes (5): اقدامات امنیتی منظم, 🔐 امنیت (همیشه فعال), قوانین غیرقابل مذاکره, مشکلات امنیتی باقیمانده, مشکلات امنیتی رفع شده

### Community 63 - "🎯 اهداف اصلی"
Cohesion: 0.40
Nodes (5): 🎯 اهداف اصلی, هدف ۱: کاهش وابستگی به کاربر, هدف ۲: جلوگیری از فراموشی AI, هدف ۳: امنیت همیشگی, هدف ۴: کیفیت کد

### Community 64 - "🎯 فازهای اجرایی"
Cohesion: 0.40
Nodes (5): فاز ۱: آماده‌سازی پایه ✅ (تکمیل شده), فاز ۲: حل مشکل اتصال 🟡 (در حال انجام), فاز ۳: سیستم مغز دوم 🟡 (در حال انجام), فاز ۴: چارچوب ایجنت‌ها + کاهش وابستگی ⏳ (آینده), 🎯 فازهای اجرایی

### Community 65 - "📋 چک‌لیست روزانه"
Cohesion: 0.40
Nodes (5): هر commit, هر release, هر روز (۵ دقیقه), هر هفته (۱۵ دقیقه - جمعه), 📋 چک‌لیست روزانه

### Community 66 - "RULES.md"
Cohesion: 0.40
Nodes (4): دسترسی به فایل‌ها, قوانین غیرقابل مذاکره, نقش‌ها, گزارش‌دهی

### Community 68 - "deno.json"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, imports, @supabase/supabase-js

### Community 69 - "ISSUES.md"
Cohesion: 0.50
Nodes (3): اولویت بالا 🔴, اولویت متوسط 🟡, اولویت پایین 🟢

### Community 70 - "📚 منابع و ابزار"
Cohesion: 0.50
Nodes (4): ابزارهای آینده, ابزارهای غیرفعال, ابزارهای فعال, 📚 منابع و ابزار

### Community 71 - "📊 وضعیت فعلی پروژه"
Cohesion: 0.50
Nodes (4): اطلاعات پایه, معماری فنی, وضعیت فعلی, 📊 وضعیت فعلی پروژه

### Community 72 - "🎓 قوانین طلایی"
Cohesion: 0.50
Nodes (4): برای ایجنت‌ها, برای من (Qwen), برای کاربر, 🎓 قوانین طلایی

### Community 73 - "🎯 موفقیت چگونه تعریف می‌شود؟"
Cohesion: 0.50
Nodes (4): بلندمدت (۶ ماه), 🎯 موفقیت چگونه تعریف می‌شود؟, میان‌مدت (۳ ماه), کوتاه‌مدت (۱ ماه)

### Community 74 - "📈 سیستم گزارش‌دهی"
Cohesion: 0.50
Nodes (4): 📈 سیستم گزارش‌دهی, گزارش روزانه (هر روز), گزارش فوری (در صورت نیاز), گزارش هفتگی (هر جمعه)

### Community 76 - "🔍 تحلیل گراف (Graphify)"
Cohesion: 0.67
Nodes (3): Community های ضعیف (نیاز به refactor), 🔍 تحلیل گراف (Graphify), وضعیت فعلی

### Community 77 - "🔄 تاریخچه به‌روزرسانی‌ها"
Cohesion: 0.67
Nodes (3): 🔄 تاریخچه به‌روزرسانی‌ها, ۱۰ آبان ۱۴۰۵ (۱ نوامبر ۲۰۲۶), ۶ آبان ۱۴۰۵ (۲۸ اکتبر ۲۰۲۶)

### Community 79 - "Dexie (IndexedDB)"
Cohesion: 0.20
Nodes (7): Dexie (IndexedDB), localStorage Keys, Migration, Supabase, افزودن جدول جدید, ساختار داده, DaneshyarDB

### Community 94 - "SyncService.ts"
Cohesion: 0.19
Nodes (16): Sync, getLastSync(), getSnapshot(), isSyncAvailable(), listeners, logger, onSyncStatus(), propagateDeletes() (+8 more)

### Community 95 - "AuthView.ts"
Cohesion: 0.24
Nodes (15): SUPABASE_ANON_KEY, SUPABASE_ENABLED, SUPABASE_URL, getClient(), getCurrentUser(), isSupabaseEnabled(), logger, onAuthChange() (+7 more)

### Community 96 - "DashboardView.ts"
Cohesion: 0.23
Nodes (14): getChallengesWithStatus(), getStreakService(), burstConfetti(), companionLine(), createDashboardView(), createStreakFlame(), DAILY_TIPS, dayTip() (+6 more)

### Community 97 - "Input.ts"
Cohesion: 0.14
Nodes (12): CheckboxOptions, createInput(), createPasswordInput(), createSearchInput(), FormGroupOptions, InputOptions, PasswordInputOptions, RadioOptions (+4 more)

### Community 98 - "PomodoroView.ts"
Cohesion: 0.18
Nodes (13): EVENTS, FocusTrack, getFocusAudio(), TRACKS, getPomodoroService(), MODE_META, PomodoroMode, audio (+5 more)

### Community 99 - "QuizGenerator.ts"
Cohesion: 0.14
Nodes (12): AnalysisResult, DIFFICULTY_LEVELS, DifficultyLevel, GenerateOptions, getQuizGenerator(), logger, QUESTION_TYPES, QuizHistoryEntry (+4 more)

### Community 100 - "createNotesView"
Cohesion: 0.20
Nodes (14): appendHighlighted(), applyFilter(), createNoteCard(), createNotesSearch(), createNotesView(), openZen(), openZenById(), togglePin() (+6 more)

### Community 102 - "Summarizer.ts"
Cohesion: 0.15
Nodes (11): getSummarizer(), LEVEL_RATIOS, logger, PERSIAN_STOPWORDS, ScoredSentence, SIGNAL_SCORES, SIGNAL_WORDS, SignalCategory (+3 more)

### Community 104 - "تحلیل وابستگی Pomodoro به Router"
Cohesion: 0.20
Nodes (9): Event 1: `EVENTS.UI_NAVIGATE` (موجود، بدون تغییر), Event 2: `router:navigated` (موجود، رشته‌ی خام در `Router.ts:341`), Event 3: `EVENTS.POMODORO_COMPLETED` (موجود، زنده‌سازی), Event های پیشنهادی, تحلیل وابستگی Pomodoro به Router, توصیه نهایی, جدول فراخوانی‌های Router, خلاصه اجرایی (+1 more)

### Community 105 - "StreakService.ts"
Cohesion: 0.20
Nodes (8): eventBus, HeatmapDay, logger, Milestone, MILESTONE_MESSAGES, MilestoneCelebration, STREAK_MILESTONES, StreakStats

### Community 106 - "AGENTS.md — دانش‌یار پرو"
Cohesion: 0.22
Nodes (8): AGENTS.md — دانش‌یار پرو, AI و Supabase, graphify, الگوهای کدنویسی, دستورها (تأییدشده), معماری, ممنوعیت‌ها, گردش کار

### Community 107 - "چک‌لیست‌ها"
Cohesion: 0.22
Nodes (8): Deployment, Types, فرمت Commit Message, قبل از commit, قبل از push, قبل از release, نکات Merge Conflicts, چک‌لیست‌ها

### Community 108 - "getSupabaseClient"
Cohesion: 0.39
Nodes (8): DifficultyResult, estimateCardDifficulty(), getOrCreateDeviceId(), getWeakTopicInsight(), heuristicDifficulty(), logger, parseScore(), getSupabaseClient()

### Community 109 - "PomodoroService.ts"
Cohesion: 0.22
Nodes (8): DEFAULTS, FocusTarget, Listener, logger, Persisted, playChime(), TargetKind, vibrate()

### Community 110 - "openSearchPalette"
Cohesion: 0.48
Nodes (7): appendHighlighted(), openSearchPalette(), addItem(), group(), move(), paint(), run()

### Community 111 - "احراز هویت و سهمیه"
Cohesion: 0.40
Nodes (4): احراز هویت و سهمیه, جریان احراز هویت, سطوح کاربر, سیستم سهمیه

## Knowledge Gaps
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getInstance()` connect `main.ts` to `InviteView.ts`, `SRS.ts`, `AISummaryService.ts`, `NotesView.ts`, `FlashcardsView.ts`, `PremiumView.ts`, `createIcon`, `iconHTML`, `SettingsView.ts`, `Layout.ts`, `Logger`, `Errors.ts`, `EventBus.ts`, `LandingView.ts`, `State.ts`, `Toast.ts`, `Database.ts`, `Router.ts`, `Logger.ts`, `Storage.ts`, `Modal.ts`, `LegalView.ts`, `AIQuizService.ts`, `SyncService.ts`, `AuthView.ts`, `DashboardView.ts`, `PomodoroView.ts`, `QuizGenerator.ts`, `Summarizer.ts`, `StreakService.ts`, `getSupabaseClient`, `PomodoroService.ts`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Should `QuizGenerator` be split into smaller, more focused modules?**
  _Cohesion score 0.14814814814814814 - nodes in this community are weakly interconnected._
- **Why does `🎯 MASTER PLAN — دانش‌یار پرو` connect `🎯 MASTER PLAN — دانش‌یار پرو` to `🎯 فازهای اجرایی`, `📋 چک‌لیست روزانه`, `📚 منابع و ابزار`, `📊 وضعیت فعلی پروژه`, `🎓 قوانین طلایی`, `🎯 موفقیت چگونه تعریف می‌شود؟`, `📈 سیستم گزارش‌دهی`, `🔍 تحلیل گراف (Graphify)`, `🔄 تاریخچه به‌روزرسانی‌ها`, `🚨 مشکلات اصلی (به ترتیب اولویت)`, `🤖 ایجنت‌ها و نقش‌ها`, `🔐 امنیت (همیشه فعال)`, `🎯 اهداف اصلی`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Should `SoundManager` be split into smaller, more focused modules?**
  _Cohesion score 0.10336817653890824 - nodes in this community are weakly interconnected._
- **Why does `اقدامات refactor (به ترتیب اولویت)` connect `main.ts` to `🔍 تحلیل گراف (Graphify)`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05442176870748299 - nodes in this community are weakly interconnected._
- **Should `SRS.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12418300653594772 - nodes in this community are weakly interconnected._