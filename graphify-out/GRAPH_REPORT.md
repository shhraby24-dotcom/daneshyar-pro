# Graph Report - daneshyar-pro  (2026-11-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1550 nodes · 3314 edges · 101 communities (73 shown, 28 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 75 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ece0bd57`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AIQuizService.ts
- SoundManager
- SoundManager
- package.json
- package.json
- iconHTML
- PremiumView.ts
- AISummaryService.ts
- toPersianDigits
- createIcon
- PremiumView.ts
- StateManager
- Layout
- StateManager
- DatabaseService
- DatabaseService
- Button.ts
- Layout
- main.ts
- compilerOptions
- dateFormatter.ts
- Logger
- Router
- steps
- Errors.ts
- steps
- 📋 تصمیمات فنی پروژه دانش‌یار پرو
- SpacedRepetitionSystem
- Card.ts
- LandingView.ts
- State.ts
- AppError
- main.ts
- ErrorHandler
- Toast.ts
- Database.ts
- StreakService
- Router.ts
- SummarizerView.ts
- ModalManager
- ToastManager
- ModalManager
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
- Storage.ts
- CONTEXT.md
- پرامپت: تولید Changelog
- ai.ts
- ۱۰ آبان ۱۴۰۵ (۱ نوامبر ۲۰۲۶)
- MEMORY.md
- هفته ۱ (۶ آبان ۱۴۰۵ - ۱۲ آبان ۱۴۰۵)
- smart-commit.sh
- پرامپت: اسکن TODO/FIXME (Todo Scan)
- 🤖 ایجنت‌ها و نقش‌ها
- 🔐 امنیت (همیشه فعال)
- 🎯 اهداف اصلی
- 🎯 فازهای اجرایی
- 📋 چک‌لیست روزانه
- RULES.md
- deploy-ai-proxy.ps1
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
- 📊 وضعیت فعلی پروژه
- Flashcard
- Note
- ValidationError
- .claude/CLAUDE.md
- api.ts
- app/build.gradle
- capacitor.build.gradle
- android/build.gradle
- capacitor.settings.gradle
- settings.gradle
- variables.gradle
- sw.js

## God Nodes (most connected - your core abstractions)
1. `iconHTML()` - 81 edges
2. `toPersianDigits()` - 76 edges
3. `createIcon()` - 66 edges
4. `createButton()` - 54 edges
5. `getToast()` - 49 edges
6. `getInstance()` - 49 edges
7. `getDatabase()` - 46 edges
8. `SoundManager` - 43 edges
9. `DatabaseService` - 43 edges
10. `StateManager` - 37 edges

## Surprising Connections (you probably didn't know these)
- `ممنوعیت‌ها` --references--> `escapeHtml()`  [INFERRED]
  AGENTS.md → src/ui/components/Modal.ts
- `Workaround های فعلی` --references--> `escapeHtml()`  [INFERRED]
  .ai/hack.md → src/ui/components/Modal.ts
- `الگوهای کدنویسی` --references--> `activatePremium()`  [INFERRED]
  AGENTS.md → src/services/Premium.ts
- `معماری` --references--> `Router`  [INFERRED]
  AGENTS.md → src/core/Router.ts
- `Event 2: `router:navigated` (موجود، رشته‌ی خام در `Router.ts:341`)` --references--> `FocusAudioService`  [INFERRED]
  .ai/reports/pomodoro-router-analysis.md → src/services/FocusAudioService.ts

## Import Cycles
- None detected.

## Communities (101 total, 28 thin omitted)

### Community 0 - "AIQuizService.ts"
Cohesion: 0.05
Nodes (30): AI_TIMEOUT_MS, AIQuizService, AIResult, AITier, cacheKey(), GenerateHooks, getAIQuizService(), getOrCreateDeviceId() (+22 more)

### Community 1 - "SoundManager"
Cohesion: 0.08
Nodes (47): احراز هویت و سهمیه, جریان احراز هویت, سطوح کاربر, سیستم سهمیه, SUPABASE_ANON_KEY, SUPABASE_ENABLED, SUPABASE_URL, getClient() (+39 more)

### Community 2 - "SoundManager"
Cohesion: 0.07
Nodes (13): AmbientNodes, AmbientResult, AmbientSoundId, AmbientSoundInfo, CustomSound, getSoundManager(), logger, NotificationSoundId (+5 more)

### Community 3 - "package.json"
Cohesion: 0.05
Nodes (43): config, dependencies, @capacitor/android@^8.5.0, @capacitor/cli@^8.5.0, @capacitor/core@^8.5.0, dexie@^4.4.4, lottie-web@^5.13.0, lucide@^1.33.0 (+35 more)

### Community 4 - "package.json"
Cohesion: 0.07
Nodes (10): AGENTS.md — دانش‌یار پرو, AI و Supabase, graphify, الگوهای کدنویسی, دستورها (تأییدشده), معماری, ممنوعیت‌ها, گردش کار (+2 more)

### Community 5 - "iconHTML"
Cohesion: 0.10
Nodes (45): DifficultyResult, estimateCardDifficulty(), getOrCreateDeviceId(), getWeakTopicInsight(), heuristicDifficulty(), logger, parseScore(), iconHTML() (+37 more)

### Community 6 - "PremiumView.ts"
Cohesion: 0.11
Nodes (40): نکات مهم, activatePremium(), deactivatePremium(), formatToman(), getPremiumDaysLeft(), getPremiumExpiry(), getPremiumPlan(), isPremium() (+32 more)

### Community 7 - "AISummaryService.ts"
Cohesion: 0.08
Nodes (27): AIPreserved, AISelfTest, AISummary, AISummaryOptions, AISummaryResult, AISummarySection, cacheKey(), getAISummary() (+19 more)

### Community 8 - "toPersianDigits"
Cohesion: 0.13
Nodes (40): friendlyAIError(), getRemainingQuota(), getTier(), checkAIQuota(), getQuotaInfo(), QuotaCheckResult, getModal(), showPaywall() (+32 more)

### Community 9 - "createIcon"
Cohesion: 0.13
Nodes (39): Sync, saveUserKeys(), createIcon(), getLastSync(), isSyncAvailable(), onSyncStatus(), createButton(), buildEmpty() (+31 more)

### Community 10 - "PremiumView.ts"
Cohesion: 0.07
Nodes (15): CONTENT_MULTIPLIERS, CreateCardData, EfficiencyAnalysis, Flashcard, ForecastEntry, getSRS(), logger, OptimalTimePrediction (+7 more)

### Community 11 - "StateManager"
Cohesion: 0.11
Nodes (36): getDatabase(), getToast(), appendHighlighted(), appendInline(), applyFilter(), applyMarkdown(), CATEGORIES, CATEGORY_STYLES (+28 more)

### Community 12 - "Layout"
Cohesion: 0.10
Nodes (12): Community های ضعیف گراف, Debt فنی و Workaround ها, Edge Function drift, P1 (بحرانی), P2 (مهم), P3 (کم), TODO های مهم, Workaround های فعلی (+4 more)

### Community 15 - "DatabaseService"
Cohesion: 0.10
Nodes (24): EVENTS, FocusTrack, getFocusAudio(), TRACKS, ICON_MAP, logger, renderIconPreview(), DEFAULTS (+16 more)

### Community 16 - "Button.ts"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, baseUrl, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleDetection (+19 more)

### Community 17 - "Layout"
Cohesion: 0.15
Nodes (23): AR_DIGITS, DateInput, FA_DIGITS, faNum(), formatCountdown(), formatDateTime(), formatDuration(), formatPersianDate() (+15 more)

### Community 18 - "main.ts"
Cohesion: 0.15
Nodes (20): اقدامات refactor (به ترتیب اولویت), getInstance(), getInstance(), bootstrap(), createComingSoonView(), logger, registerViews(), router (+12 more)

### Community 20 - "dateFormatter.ts"
Cohesion: 0.09
Nodes (19): AppInfo, AppState, DEFAULT_STATE, eventBus, getState(), logger, LS_KEYS, PERSIST_KEYS (+11 more)

### Community 21 - "Logger"
Cohesion: 0.09
Nodes (22): runs-on, steps, COMMIT_MSG, JOB_STATUS, RUN_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, jobs (+14 more)

### Community 22 - "Router"
Cohesion: 0.11
Nodes (20): AIServiceErrorOptions, AppErrorOptions, ERROR_CATEGORIES, ERROR_CODES, ERROR_SEVERITY, ErrorCategory, ErrorCode, errorHandler (+12 more)

### Community 23 - "steps"
Cohesion: 0.10
Nodes (20): jobs, update-graph, name, on, push, schedule, workflow_dispatch, permissions (+12 more)

### Community 24 - "Errors.ts"
Cohesion: 0.10
Nodes (20): jobs, security-scan, name, on, schedule, workflow_dispatch, permissions, contents (+12 more)

### Community 25 - "steps"
Cohesion: 0.10
Nodes (20): [1405/06] بسته‌ی سخت‌سازی قبل از دمو, [1405/06] لندینگ نهایی, تصمیم: Rate Limiting به جای Daily Quota, تصمیم: شعله‌ی Streak با Lottie, تصمیم ۱: Vite به جای Webpack, تصمیم ۱: امنیت اشتراک با Edge Function, تصمیم ۱۰: Capacitor به جای Electron (برای Mobile), تصمیم ۲: TypeScript با strict mode (+12 more)

### Community 28 - "Card.ts"
Cohesion: 0.12
Nodes (17): animateValue(), appendIconSmart(), CARD_PADDINGS, CARD_VARIANTS, CardOptions, CardPadding, CardVariant, createFlashcard() (+9 more)

### Community 29 - "LandingView.ts"
Cohesion: 0.19
Nodes (17): buildDashScreen(), buildFocusScreen(), buildQuizScreen(), buildReviewScreen(), createCurveDemo(), createFlashDemo(), createLandingView(), createLiveFlame() (+9 more)

### Community 30 - "State.ts"
Cohesion: 0.11
Nodes (7): AIServiceError, AppError, NetworkError, NotFoundError, PermissionError, StorageError, TimeoutError

### Community 31 - "AppError"
Cohesion: 0.16
Nodes (13): Achievement, DbFlashcard, DbNote, DbQuizResult, DbStats, DbStudySession, logger, LS_KEYS (+5 more)

### Community 33 - "ErrorHandler"
Cohesion: 0.12
Nodes (13): LOG_COLORS, LOG_LEVELS, LogColor, LogEntry, LoggerOptions, LogLevel, eventBus, logger (+5 more)

### Community 34 - "Toast.ts"
Cohesion: 0.16
Nodes (13): Challenge, ChallengeCategory, CHALLENGES, ChallengeStatus, getChallengesWithStatus(), logger, longestConsecutiveStudyDays(), BUTTON_SIZES (+5 more)

### Community 35 - "Database.ts"
Cohesion: 0.13
Nodes (13): BUTTON_VARIANTS, ButtonGroupOptions, ButtonOptions, ButtonSize, ButtonVariant, createButtonGroup(), ICON_SIZE_CLASSES, IconButtonOptions (+5 more)

### Community 36 - "StreakService"
Cohesion: 0.14
Nodes (12): CheckboxOptions, createInput(), createPasswordInput(), createSearchInput(), FormGroupOptions, InputOptions, PasswordInputOptions, RadioOptions (+4 more)

### Community 38 - "SummarizerView.ts"
Cohesion: 0.19
Nodes (14): aiWordCount(), countWords(), buildNoteContent(), renderActions(), renderResults(), renderStats(), genId(), LEVELS (+6 more)

### Community 39 - "ModalManager"
Cohesion: 0.14
Nodes (12): AfterEachHook, BeforeEachHook, DEFAULT_ROUTES, eventBus, logger, NavigateOptions, NavigationEvent, RouteConfig (+4 more)

### Community 40 - "ToastManager"
Cohesion: 0.26
Nodes (13): getStreakService(), burstConfetti(), companionLine(), createDashboardView(), createStreakFlame(), DAILY_TIPS, dayTip(), getXP() (+5 more)

### Community 45 - "LegalView.ts"
Cohesion: 0.17
Nodes (10): ActiveModal, ConfirmOptions, eventBus, logger, ModalButton, ModalButtonType, ModalOptions, ModalSize (+2 more)

### Community 46 - "پرامپت: بازبینی کد (Code Review)"
Cohesion: 0.24
Nodes (9): CORS و CSP, XSS Prevention, الگوهای امن ✅, قوانین امنیتی دانش‌یار پرو, ممنوعیت‌های مطلق ❌, چک‌لیست امنیتی قبل از commit, محورهای بازبینی, آنچه باید بررسی شود (+1 more)

### Community 47 - "پرامپت: تولید پیام Commit هوشمند (Smart Commit)"
Cohesion: 0.18
Nodes (10): [Low] <عنوان>, [Medium] <عنوان>, خروجی, روش کار, محدوده‌ی اسکن (فقط همین‌ها), موارد بررسی‌شده و سالم, نقش, هدف (+2 more)

### Community 48 - "index.ts"
Cohesion: 0.27
Nodes (9): getRouter(), DOCS, getLegalDoc(), getLegalDocs(), LegalDoc, LegalDocId, LegalSection, createLegalView() (+1 more)

### Community 49 - "🎯 MASTER PLAN — دانش‌یار پرو"
Cohesion: 0.20
Nodes (7): Dexie (IndexedDB), localStorage Keys, Migration, Supabase, افزودن جدول جدید, ساختار داده, DaneshyarDB

### Community 50 - "🚨 مشکلات اصلی (به ترتیب اولویت)"
Cohesion: 0.20
Nodes (4): Input Validation, corsHeaders, FALLBACK_MODELS, validateQuestion()

### Community 51 - "پرامپت: اسکن TODO/FIXME (Todo Scan)"
Cohesion: 0.20
Nodes (8): EventBusOptions, EventBusStats, EventCallback, EventObject, HistoryFilter, Listener, logger, SubscriptionOptions

### Community 52 - "Storage.ts"
Cohesion: 0.20
Nodes (7): eventBus, getStorage(), logger, LS_KEYS, LSKey, StorageOptions, StorageStats

### Community 53 - "CONTEXT.md"
Cohesion: 0.20
Nodes (8): eventBus, HeatmapDay, logger, Milestone, MILESTONE_MESSAGES, MilestoneCelebration, STREAK_MILESTONES, StreakStats

### Community 54 - "پرامپت: تولید Changelog"
Cohesion: 0.22
Nodes (8): Deployment, Types, فرمت Commit Message, قبل از commit, قبل از push, قبل از release, نکات Merge Conflicts, چک‌لیست‌ها

### Community 55 - "ai.ts"
Cohesion: 0.22
Nodes (8): Event 1: `EVENTS.UI_NAVIGATE` (موجود، بدون تغییر), Event 2: `router:navigated` (موجود، رشته‌ی خام در `Router.ts:341`), Event های پیشنهادی, تحلیل وابستگی Pomodoro به Router, توصیه نهایی, جدول فراخوانی‌های Router, خلاصه اجرایی, قدم‌های بعدی

### Community 56 - "۱۰ آبان ۱۴۰۵ (۱ نوامبر ۲۰۲۶)"
Cohesion: 0.22
Nodes (8): تست‌ها, جمع‌بندی و اقدام بعدی, خروجی, دامنه‌ی بازبینی, نقش, نکات مثبت (اختیاری و کوتاه), هدف, پرامپت: بازبینی کد (Code Review)

### Community 57 - "MEMORY.md"
Cohesion: 0.22
Nodes (8): روش کار, قالب پیام, قوانین سخت, نقش, نمونه‌ها, هدف, ورودی, پرامپت: تولید پیام Commit هوشمند (Smart Commit)

### Community 58 - "هفته ۱ (۶ آبان ۱۴۰۵ - ۱۲ آبان ۱۴۰۵)"
Cohesion: 0.25
Nodes (7): GitHub Actions (فعال), 🎯 MASTER PLAN — دانش‌یار پرو, 🔄 اتوماسیون, اتوماسیون‌های آینده, 📞 اطلاعات تماس اضطراری, اگر مشکلی پیش آمد, فایل‌های مهم

### Community 59 - "smart-commit.sh"
Cohesion: 0.25
Nodes (8): اولویت ۱: اتصال و VPN, اولویت ۲: وابستگی به کاربر, اولویت ۳: فراموشی AI, اولویت ۴: چارچوب ایجنت‌ها, اولویت ۵: مغز دوم, اولویت ۶: Drift کد و Production, اولویت ۷: تست و Quality, 🚨 مشکلات اصلی (به ترتیب اولویت)

### Community 60 - "پرامپت: اسکن TODO/FIXME (Todo Scan)"
Cohesion: 0.25
Nodes (7): خروجی, دامنه, روش کار, قوانین سخت, نقش, هدف, پرامپت: اسکن TODO/FIXME (Todo Scan)

### Community 61 - "🤖 ایجنت‌ها و نقش‌ها"
Cohesion: 0.29
Nodes (6): اطلاعات پایه, فایل‌های کلیدی, مسیرهای اصلی, معماری فنی, وابستگی‌های اصلی, وضعیت فعلی

### Community 62 - "🔐 امنیت (همیشه فعال)"
Cohesion: 0.29
Nodes (6): خروجی, روش کار, قوانین سخت, نقش, هدف, پرامپت: تولید Changelog

### Community 63 - "🎯 اهداف اصلی"
Cohesion: 0.29
Nodes (6): AI_CONFIG, AI_KEYS_LS, AI_LIMITS, AI_USAGE_LS, AITier, PREMIUM_LS

### Community 64 - "🎯 فازهای اجرایی"
Cohesion: 0.48
Nodes (7): appendHighlighted(), openSearchPalette(), addItem(), group(), move(), paint(), run()

### Community 65 - "📋 چک‌لیست روزانه"
Cohesion: 0.33
Nodes (5): مشکلات, کارهای انجام‌شده, کارهای فردا, یادداشت‌های مهم, ۱۰ آبان ۱۴۰۵ (۱ نوامبر ۲۰۲۶)

### Community 66 - "RULES.md"
Cohesion: 0.33
Nodes (5): تصمیمات مهم, راه‌حل اتصال, وضعیت فعلی, کارهای انجام‌شده, کارهای در حال انجام

### Community 67 - "deploy-ai-proxy.ps1"
Cohesion: 0.33
Nodes (5): دستاوردها, مشکلات باز, مشکلات حل‌شده, هفته ۱ (۶ آبان ۱۴۰۵ - ۱۲ آبان ۱۴۰۵), کارهای هفته بعد

### Community 68 - "deno.json"
Cohesion: 0.53
Nodes (4): sanitize_message(), smart-commit.sh script, show_message(), strip_ansi()

### Community 69 - "ISSUES.md"
Cohesion: 0.40
Nodes (5): Claude Chat, OpenCode, Qwen (این چت), ZCode, 🤖 ایجنت‌ها و نقش‌ها

### Community 70 - "📚 منابع و ابزار"
Cohesion: 0.40
Nodes (5): اقدامات امنیتی منظم, 🔐 امنیت (همیشه فعال), قوانین غیرقابل مذاکره, مشکلات امنیتی باقیمانده, مشکلات امنیتی رفع شده

### Community 71 - "📊 وضعیت فعلی پروژه"
Cohesion: 0.40
Nodes (5): 🎯 اهداف اصلی, هدف ۱: کاهش وابستگی به کاربر, هدف ۲: جلوگیری از فراموشی AI, هدف ۳: امنیت همیشگی, هدف ۴: کیفیت کد

### Community 72 - "🎓 قوانین طلایی"
Cohesion: 0.40
Nodes (5): فاز ۱: آماده‌سازی پایه ✅ (تکمیل شده), فاز ۲: حل مشکل اتصال 🟡 (در حال انجام), فاز ۳: سیستم مغز دوم 🟡 (در حال انجام), فاز ۴: چارچوب ایجنت‌ها + کاهش وابستگی ⏳ (آینده), 🎯 فازهای اجرایی

### Community 73 - "🎯 موفقیت چگونه تعریف می‌شود؟"
Cohesion: 0.40
Nodes (5): هر commit, هر release, هر روز (۵ دقیقه), هر هفته (۱۵ دقیقه - جمعه), 📋 چک‌لیست روزانه

### Community 74 - "📈 سیستم گزارش‌دهی"
Cohesion: 0.40
Nodes (4): دسترسی به فایل‌ها, قوانین غیرقابل مذاکره, نقش‌ها, گزارش‌دهی

### Community 76 - "🔍 تحلیل گراف (Graphify)"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, imports, @supabase/supabase-js

### Community 77 - "🔄 تاریخچه به‌روزرسانی‌ها"
Cohesion: 0.50
Nodes (3): اولویت بالا 🔴, اولویت متوسط 🟡, اولویت پایین 🟢

### Community 78 - "MainActivity.java"
Cohesion: 0.50
Nodes (4): ابزارهای آینده, ابزارهای غیرفعال, ابزارهای فعال, 📚 منابع و ابزار

### Community 79 - "📊 وضعیت فعلی پروژه"
Cohesion: 0.50
Nodes (4): اطلاعات پایه, معماری فنی, وضعیت فعلی, 📊 وضعیت فعلی پروژه

### Community 80 - "Flashcard"
Cohesion: 0.50
Nodes (4): برای ایجنت‌ها, برای من (Qwen), برای کاربر, 🎓 قوانین طلایی

### Community 81 - "Note"
Cohesion: 0.50
Nodes (4): بلندمدت (۶ ماه), 🎯 موفقیت چگونه تعریف می‌شود؟, میان‌مدت (۳ ماه), کوتاه‌مدت (۱ ماه)

### Community 82 - "ValidationError"
Cohesion: 0.50
Nodes (4): 📈 سیستم گزارش‌دهی, گزارش روزانه (هر روز), گزارش فوری (در صورت نیاز), گزارش هفتگی (هر جمعه)

### Community 84 - ".claude/CLAUDE.md"
Cohesion: 0.67
Nodes (3): Community های ضعیف (نیاز به refactor), 🔍 تحلیل گراف (Graphify), وضعیت فعلی

### Community 85 - "api.ts"
Cohesion: 0.67
Nodes (3): 🔄 تاریخچه به‌روزرسانی‌ها, ۱۰ آبان ۱۴۰۵ (۱ نوامبر ۲۰۲۶), ۶ آبان ۱۴۰۵ (۲۸ اکتبر ۲۰۲۶)

## Knowledge Gaps
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getInstance()` connect `main.ts` to `AIQuizService.ts`, `SoundManager`, `SoundManager`, `package.json`, `iconHTML`, `PremiumView.ts`, `AISummaryService.ts`, `toPersianDigits`, `createIcon`, `PremiumView.ts`, `StateManager`, `DatabaseService`, `dateFormatter.ts`, `Router`, `LandingView.ts`, `AppError`, `ErrorHandler`, `Toast.ts`, `Database.ts`, `SummarizerView.ts`, `ModalManager`, `ToastManager`, `LegalView.ts`, `index.ts`, `پرامپت: اسکن TODO/FIXME (Todo Scan)`, `Storage.ts`, `CONTEXT.md`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Should `AIQuizService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0546448087431694 - nodes in this community are weakly interconnected._
- **Why does `اقدامات refactor (به ترتیب اولویت)` connect `main.ts` to `.claude/CLAUDE.md`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `SoundManager` be split into smaller, more focused modules?**
  _Cohesion score 0.07597402597402597 - nodes in this community are weakly interconnected._
- **Why does `🔍 تحلیل گراف (Graphify)` connect `.claude/CLAUDE.md` to `هفته ۱ (۶ آبان ۱۴۰۵ - ۱۲ آبان ۱۴۰۵)`, `main.ts`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `SoundManager` be split into smaller, more focused modules?**
  _Cohesion score 0.06753246753246753 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05442176870748299 - nodes in this community are weakly interconnected._