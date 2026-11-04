# Graph Report - daneshyar-pro  (2026-11-03)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1472 nodes · 3200 edges · 94 communities (65 shown, 29 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e04cc652`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AIQuizService.ts
- SoundManager
- PomodoroView.ts
- SyncService.ts
- package.json
- DashboardView.ts
- AISummaryService.ts
- NotesView.ts
- EventBus
- FlashcardsView.ts
- PremiumView.ts
- StateManager
- iconHTML
- SummarizerView.ts
- toPersianDigits
- DatabaseService
- Button.ts
- Layout
- QuizView.ts
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
- ChallengesView.ts
- ModalManager
- ToastManager
- getInstance
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
- Logger.ts
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
- DaneshyarDB
- Flashcard
- Note
- ValidationError
- CLAUDE.md
- .claude/CLAUDE.md
- api.ts

## God Nodes (most connected - your core abstractions)
1. `iconHTML()` - 80 edges
2. `toPersianDigits()` - 76 edges
3. `createIcon()` - 65 edges
4. `createButton()` - 54 edges
5. `getInstance()` - 49 edges
6. `getToast()` - 49 edges
7. `getDatabase()` - 45 edges
8. `SoundManager` - 43 edges
9. `DatabaseService` - 43 edges
10. `getRouter()` - 40 edges

## Surprising Connections (you probably didn't know these)
- `الگوهای کدنویسی` --references--> `activatePremium()`  [INFERRED]
  AGENTS.md → src/services/Premium.ts
- `معماری` --references--> `Router`  [INFERRED]
  AGENTS.md → src/core/Router.ts
- `معماری` --references--> `Logger`  [INFERRED]
  AGENTS.md → src/core/Logger.ts
- `معماری` --references--> `registerViews()`  [INFERRED]
  AGENTS.md → src/main.ts
- `ممنوعیت‌ها` --references--> `escapeHtml()`  [INFERRED]
  AGENTS.md → src/ui/components/Modal.ts

## Import Cycles
- None detected.

## Communities (94 total, 29 thin omitted)

### Community 0 - "AIQuizService.ts"
Cohesion: 0.05
Nodes (30): AI_TIMEOUT_MS, AIQuizService, AIResult, AITier, cacheKey(), GenerateHooks, getAIQuizService(), getOrCreateDeviceId() (+22 more)

### Community 1 - "SoundManager"
Cohesion: 0.07
Nodes (14): getStorage(), AmbientNodes, AmbientResult, AmbientSoundId, AmbientSoundInfo, CustomSound, getSoundManager(), logger (+6 more)

### Community 2 - "PomodoroView.ts"
Cohesion: 0.07
Nodes (22): FocusAudioService, FocusTrack, getFocusAudio(), TRACKS, DEFAULTS, FocusTarget, getPomodoroService(), Listener (+14 more)

### Community 3 - "SyncService.ts"
Cohesion: 0.08
Nodes (42): SUPABASE_ANON_KEY, SUPABASE_ENABLED, SUPABASE_URL, DifficultyResult, estimateCardDifficulty(), getOrCreateDeviceId(), getWeakTopicInsight(), heuristicDifficulty() (+34 more)

### Community 4 - "package.json"
Cohesion: 0.05
Nodes (43): config, dependencies, @capacitor/android@^8.5.0, @capacitor/cli@^8.5.0, @capacitor/core@^8.5.0, dexie@^4.4.4, lottie-web@^5.13.0, lucide@^1.33.0 (+35 more)

### Community 5 - "DashboardView.ts"
Cohesion: 0.06
Nodes (37): getChallengesWithStatus(), ConceptType, CONTENT_MULTIPLIERS, CreateCardData, EfficiencyAnalysis, Flashcard, ForecastEntry, getSRS() (+29 more)

### Community 6 - "AISummaryService.ts"
Cohesion: 0.08
Nodes (27): AIPreserved, AISelfTest, AISummary, AISummaryOptions, AISummaryResult, AISummarySection, cacheKey(), getAISummary() (+19 more)

### Community 7 - "NotesView.ts"
Cohesion: 0.07
Nodes (38): CheckboxOptions, createInput(), createPasswordInput(), createSearchInput(), FormGroupOptions, InputOptions, PasswordInputOptions, RadioOptions (+30 more)

### Community 8 - "EventBus"
Cohesion: 0.07
Nodes (9): AGENTS.md — دانش‌یار پرو, AI و Supabase, graphify, الگوهای کدنویسی, دستورها (تأییدشده), معماری, گردش کار, EventBus (+1 more)

### Community 9 - "FlashcardsView.ts"
Cohesion: 0.13
Nodes (35): getDatabase(), getToast(), addXP(), burstConfetti(), CONCEPT_STYLES, CONCEPT_TYPES, createFlashcardsView(), buildQueue() (+27 more)

### Community 10 - "PremiumView.ts"
Cohesion: 0.13
Nodes (32): activatePremium(), deactivatePremium(), formatToman(), getPremiumDaysLeft(), getPremiumExpiry(), getPremiumPlan(), isPremium(), logger (+24 more)

### Community 12 - "iconHTML"
Cohesion: 0.15
Nodes (33): getRouter(), isSupabaseEnabled(), createIcon(), iconHTML(), createButton(), createFormGroup(), buildForm(), buildLoggedIn() (+25 more)

### Community 13 - "SummarizerView.ts"
Cohesion: 0.13
Nodes (32): getRemainingQuota(), getTier(), checkAIQuota(), getQuotaInfo(), QuotaCheckResult, BUTTON_VARIANTS, createEmptyState(), createTextarea() (+24 more)

### Community 14 - "toPersianDigits"
Cohesion: 0.15
Nodes (33): saveUserKeys(), getCurrentUser(), signOut(), getLastSync(), isSyncAvailable(), onSyncStatus(), createChevron(), createSection() (+25 more)

### Community 16 - "Button.ts"
Cohesion: 0.07
Nodes (27): ButtonGroupOptions, ButtonOptions, ButtonSize, ButtonVariant, createButtonGroup(), ICON_SIZE_CLASSES, IconButtonOptions, logger (+19 more)

### Community 17 - "Layout"
Cohesion: 0.14
Nodes (8): appendHighlighted(), openSearchPalette(), addItem(), group(), move(), paint(), run(), Layout

### Community 18 - "QuizView.ts"
Cohesion: 0.14
Nodes (28): getState(), friendlyAIError(), getModal(), addXP(), ai, burstConfetti(), correctAnswerText(), createQuizView() (+20 more)

### Community 19 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, baseUrl, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleDetection (+19 more)

### Community 20 - "dateFormatter.ts"
Cohesion: 0.15
Nodes (23): AR_DIGITS, DateInput, FA_DIGITS, faNum(), formatCountdown(), formatDateTime(), formatDuration(), formatPersianDate() (+15 more)

### Community 23 - "steps"
Cohesion: 0.09
Nodes (22): runs-on, steps, COMMIT_MSG, JOB_STATUS, RUN_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, jobs (+14 more)

### Community 24 - "Errors.ts"
Cohesion: 0.11
Nodes (20): AIServiceErrorOptions, AppErrorOptions, ERROR_CATEGORIES, ERROR_CODES, ERROR_SEVERITY, ErrorCategory, ErrorCode, errorHandler (+12 more)

### Community 25 - "steps"
Cohesion: 0.10
Nodes (20): jobs, update-graph, name, on, push, schedule, workflow_dispatch, permissions (+12 more)

### Community 26 - "📋 تصمیمات فنی پروژه دانش‌یار پرو"
Cohesion: 0.10
Nodes (20): [1405/06] بسته‌ی سخت‌سازی قبل از دمو, [1405/06] لندینگ نهایی, تصمیم: Rate Limiting به جای Daily Quota, تصمیم: شعله‌ی Streak با Lottie, تصمیم ۱: Vite به جای Webpack, تصمیم ۱: امنیت اشتراک با Edge Function, تصمیم ۱۰: Capacitor به جای Electron (برای Mobile), تصمیم ۲: TypeScript با strict mode (+12 more)

### Community 28 - "EventBus.ts"
Cohesion: 0.11
Nodes (15): EventBusOptions, EventBusStats, EventCallback, EventObject, EVENTS, HistoryFilter, Listener, logger (+7 more)

### Community 29 - "LandingView.ts"
Cohesion: 0.19
Nodes (17): buildDashScreen(), buildFocusScreen(), buildQuizScreen(), buildReviewScreen(), createCurveDemo(), createFlashDemo(), createLandingView(), createLiveFlame() (+9 more)

### Community 30 - "State.ts"
Cohesion: 0.11
Nodes (14): AppInfo, AppState, DEFAULT_STATE, eventBus, logger, LS_KEYS, PERSIST_KEYS, QuizResult (+6 more)

### Community 31 - "AppError"
Cohesion: 0.11
Nodes (7): AIServiceError, AppError, NetworkError, NotFoundError, PermissionError, StorageError, TimeoutError

### Community 32 - "main.ts"
Cohesion: 0.18
Nodes (14): getInstance(), bootstrap(), logger, router, showFatalError(), state, storage, ViewParams (+6 more)

### Community 34 - "Toast.ts"
Cohesion: 0.12
Nodes (12): eventBus, logger, TOAST_TYPES, ToastData, ToastOptions, ToastType, ToastTypeConfig, BOTTOM_NAV_ITEMS (+4 more)

### Community 35 - "Database.ts"
Cohesion: 0.19
Nodes (12): Achievement, DbFlashcard, DbNote, DbQuizResult, DbStats, DbStudySession, logger, LS_KEYS (+4 more)

### Community 37 - "Router.ts"
Cohesion: 0.14
Nodes (12): AfterEachHook, BeforeEachHook, DEFAULT_ROUTES, eventBus, logger, NavigateOptions, NavigationEvent, RouteConfig (+4 more)

### Community 38 - "ChallengesView.ts"
Cohesion: 0.18
Nodes (10): Challenge, ChallengeCategory, CHALLENGES, ChallengeStatus, logger, longestConsecutiveStudyDays(), BUTTON_SIZES, CATEGORY_META (+2 more)

### Community 41 - "getInstance"
Cohesion: 0.23
Nodes (9): اقدامات refactor (به ترتیب اولویت), getInstance(), createComingSoonView(), registerViews(), purgeDemoData(), seedDemoData(), ICON_MAP, logger (+1 more)

### Community 43 - "Modal.ts"
Cohesion: 0.17
Nodes (10): ActiveModal, ConfirmOptions, eventBus, logger, ModalButton, ModalButtonType, ModalOptions, ModalSize (+2 more)

### Community 44 - "پرامپت: ممیزی امنیتی (Security Audit)"
Cohesion: 0.18
Nodes (10): [Low] <عنوان>, [Medium] <عنوان>, خروجی, روش کار, محدوده‌ی اسکن (فقط همین‌ها), موارد بررسی‌شده و سالم, نقش, هدف (+2 more)

### Community 45 - "LegalView.ts"
Cohesion: 0.29
Nodes (8): DOCS, getLegalDoc(), getLegalDocs(), LegalDoc, LegalDocId, LegalSection, createLegalView(), logger

### Community 46 - "پرامپت: بازبینی کد (Code Review)"
Cohesion: 0.22
Nodes (8): تست‌ها, جمع‌بندی و اقدام بعدی, خروجی, دامنه‌ی بازبینی, نقش, نکات مثبت (اختیاری و کوتاه), هدف, پرامپت: بازبینی کد (Code Review)

### Community 47 - "پرامپت: تولید پیام Commit هوشمند (Smart Commit)"
Cohesion: 0.22
Nodes (8): روش کار, قالب پیام, قوانین سخت, نقش, نمونه‌ها, هدف, ورودی, پرامپت: تولید پیام Commit هوشمند (Smart Commit)

### Community 49 - "🎯 MASTER PLAN — دانش‌یار پرو"
Cohesion: 0.25
Nodes (7): GitHub Actions (فعال), 🎯 MASTER PLAN — دانش‌یار پرو, 🔄 اتوماسیون, اتوماسیون‌های آینده, 📞 اطلاعات تماس اضطراری, اگر مشکلی پیش آمد, فایل‌های مهم

### Community 50 - "🚨 مشکلات اصلی (به ترتیب اولویت)"
Cohesion: 0.25
Nodes (8): اولویت ۱: اتصال و VPN, اولویت ۲: وابستگی به کاربر, اولویت ۳: فراموشی AI, اولویت ۴: چارچوب ایجنت‌ها, اولویت ۵: مغز دوم, اولویت ۶: Drift کد و Production, اولویت ۷: تست و Quality, 🚨 مشکلات اصلی (به ترتیب اولویت)

### Community 51 - "پرامپت: اسکن TODO/FIXME (Todo Scan)"
Cohesion: 0.25
Nodes (7): خروجی, دامنه, روش کار, قوانین سخت, نقش, هدف, پرامپت: اسکن TODO/FIXME (Todo Scan)

### Community 52 - "Logger.ts"
Cohesion: 0.25
Nodes (6): LOG_COLORS, LOG_LEVELS, LogColor, LogEntry, LoggerOptions, LogLevel

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
Cohesion: 0.40
Nodes (4): ممنوعیت‌ها, محورهای بازبینی, آنچه باید بررسی شود, escapeHtml()

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

## Knowledge Gaps
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getInstance()` connect `getInstance` to `AIQuizService.ts`, `SoundManager`, `PomodoroView.ts`, `SyncService.ts`, `DashboardView.ts`, `AISummaryService.ts`, `NotesView.ts`, `FlashcardsView.ts`, `PremiumView.ts`, `iconHTML`, `SummarizerView.ts`, `toPersianDigits`, `Button.ts`, `QuizView.ts`, `Logger`, `Errors.ts`, `EventBus.ts`, `LandingView.ts`, `State.ts`, `main.ts`, `Toast.ts`, `Database.ts`, `Router.ts`, `ChallengesView.ts`, `Modal.ts`, `LegalView.ts`, `Logger.ts`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Should `AIQuizService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0546448087431694 - nodes in this community are weakly interconnected._
- **Why does `اقدامات refactor (به ترتیب اولویت)` connect `getInstance` to `🔍 تحلیل گراف (Graphify)`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Should `SoundManager` be split into smaller, more focused modules?**
  _Cohesion score 0.06578947368421052 - nodes in this community are weakly interconnected._
- **Why does `🔍 تحلیل گراف (Graphify)` connect `🔍 تحلیل گراف (Graphify)` to `🎯 MASTER PLAN — دانش‌یار پرو`, `getInstance`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Should `PomodoroView.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07197763801537387 - nodes in this community are weakly interconnected._
- **Should `SyncService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07755102040816327 - nodes in this community are weakly interconnected._