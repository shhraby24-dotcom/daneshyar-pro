# Graph Report - daneshyar-pro  (2026-11-06)

## Corpus Check
- 116 files · ~108,129 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 21 file(s) not represented in the graph (top: .xml 10, (none) 3, .properties 2)

## Summary
- 1630 nodes · 3487 edges · 102 communities (74 shown, 28 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 77 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `21b51d90`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AIQuizService.ts
- AuthView.ts
- SoundManager
- package.json
- Logger
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
- پلن جامع دانش‌یار پرو
- iconHTML
- پرامپت: اسکن TODO/FIXME (Todo Scan)
- 🤖 ایجنت‌ها و نقش‌ها
- 🔐 امنیت (همیشه فعال)
- PremiumView.ts
- getToast
- 📋 چک‌لیست روزانه
- RULES.md
- deploy-ai-proxy.ps1
- deno.json
- نقش‌های ایجنت‌ها در دانش‌یار پرو
- ۴. قوانین سخت‌گیرانه
- فاز D: توزیع و لانچ (هفته ۴)
- AGENTS.md — دانش‌یار پرو
- فاز B: درآمد و ضد کلاهبرداری (هفته ۲)
- 📈 سیستم گزارش‌دهی
- 🔍 تحلیل گراف (Graphify)
- 🔄 تاریخچه به‌روزرسانی‌ها
- گزارش موفقیت EventBus Refactor
- ۱. اطلاعات پایه
- فاز A: زیرساخت حیاتی (هفته ۱)
- ۶. نقش‌ها
- ۵. ریسک‌ها و راه‌حل‌ها
- ۲. اهداف اصلی
- ۱۰. تاریخچه به‌روزرسانی‌ها
- app/build.gradle
- capacitor.build.gradle
- android/build.gradle
- capacitor.settings.gradle
- settings.gradle
- variables.gradle
- sw.js
- ۱۱. معیارهای موفقیت

## God Nodes (most connected - your core abstractions)
1. `iconHTML()` - 86 edges
2. `toPersianDigits()` - 76 edges
3. `createIcon()` - 67 edges
4. `createButton()` - 57 edges
5. `getToast()` - 53 edges
6. `getInstance()` - 50 edges
7. `getDatabase()` - 46 edges
8. `DatabaseService` - 43 edges
9. `SoundManager` - 43 edges
10. `getRouter()` - 38 edges

## Surprising Connections (you probably didn't know these)
- `قدم‌های بعدی` --references--> `getClient()`  [INFERRED]
  .ai/reports/c1-analysis.md → src/services/AuthService.ts
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

## Communities (102 total, 28 thin omitted)

### Community 0 - "AIQuizService.ts"
Cohesion: 0.05
Nodes (32): Community پیشنهادی ۱: AI Services — **توصیه: ادغام نشود**, AI_TIMEOUT_MS, AIQuizService, AIResult, AITier, cacheKey(), GenerateHooks, getAIQuizService() (+24 more)

### Community 1 - "AuthView.ts"
Cohesion: 0.05
Nodes (65): احراز هویت و سهمیه, جریان احراز هویت, سطوح کاربر, سیستم سهمیه, SUPABASE_ANON_KEY, SUPABASE_ENABLED, SUPABASE_URL, BLACKLIST (+57 more)

### Community 3 - "package.json"
Cohesion: 0.05
Nodes (43): config, dependencies, @capacitor/android@^8.5.0, @capacitor/cli@^8.5.0, @capacitor/core@^8.5.0, dexie@^4.4.4, lottie-web@^5.13.0, lucide@^1.33.0 (+35 more)

### Community 4 - "Logger"
Cohesion: 0.05
Nodes (24): Community های ضعیف گراف, Debt فنی و Workaround ها, Edge Function drift, P1 (بحرانی), P2 (مهم), P3 (کم), TODO های مهم, Workaround های فعلی (+16 more)

### Community 5 - "iconHTML"
Cohesion: 0.15
Nodes (28): createEmptyState(), addXP(), burstConfetti(), CONCEPT_STYLES, CONCEPT_TYPES, createFlashcardsView(), buildQueue(), closeReviewOverlay() (+20 more)

### Community 6 - "PremiumView.ts"
Cohesion: 0.20
Nodes (22): نکات مهم, activatePremium(), deactivatePremium(), getPremiumDaysLeft(), getPremiumExpiry(), getPremiumPlan(), isPremium(), logger (+14 more)

### Community 7 - "AISummaryService.ts"
Cohesion: 0.08
Nodes (27): AIPreserved, AISelfTest, AISummary, AISummaryOptions, AISummaryResult, AISummarySection, cacheKey(), getAISummary() (+19 more)

### Community 8 - "toPersianDigits"
Cohesion: 0.16
Nodes (28): friendlyAIError(), getModal(), addXP(), ai, burstConfetti(), correctAnswerText(), createQuizView(), confirmFinish() (+20 more)

### Community 9 - "createIcon"
Cohesion: 0.08
Nodes (47): Sync, AI_CONFIG, AI_KEYS_LS, AI_LIMITS, AI_USAGE_LS, AITier, PREMIUM_LS, getLastSync() (+39 more)

### Community 10 - "PremiumView.ts"
Cohesion: 0.07
Nodes (16): ConceptType, CONTENT_MULTIPLIERS, CreateCardData, EfficiencyAnalysis, Flashcard, ForecastEntry, getSRS(), logger (+8 more)

### Community 11 - "StateManager"
Cohesion: 0.11
Nodes (29): createFormGroup(), createTextarea(), appendHighlighted(), appendInline(), applyFilter(), applyMarkdown(), CATEGORIES, CATEGORY_STYLES (+21 more)

### Community 12 - "Layout"
Cohesion: 0.14
Nodes (8): appendHighlighted(), openSearchPalette(), addItem(), group(), move(), paint(), run(), Layout

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
Cohesion: 0.11
Nodes (22): getInstance(), getState(), bootstrap(), createComingSoonView(), logger, registerViews(), router, showFatalError() (+14 more)

### Community 20 - "dateFormatter.ts"
Cohesion: 0.11
Nodes (14): AppInfo, AppState, DEFAULT_STATE, eventBus, logger, LS_KEYS, PERSIST_KEYS, QuizResult (+6 more)

### Community 21 - "Logger"
Cohesion: 0.09
Nodes (22): runs-on, steps, COMMIT_MSG, JOB_STATUS, RUN_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, jobs (+14 more)

### Community 22 - "Router"
Cohesion: 0.12
Nodes (19): AIServiceErrorOptions, AppErrorOptions, ERROR_CATEGORIES, ERROR_CODES, ERROR_SEVERITY, ErrorCategory, ErrorCode, ErrorListener (+11 more)

### Community 23 - "steps"
Cohesion: 0.10
Nodes (20): jobs, update-graph, name, on, push, schedule, workflow_dispatch, permissions (+12 more)

### Community 24 - "Errors.ts"
Cohesion: 0.10
Nodes (20): jobs, security-scan, name, on, schedule, workflow_dispatch, permissions, contents (+12 more)

### Community 25 - "steps"
Cohesion: 0.10
Nodes (20): [1405/06] بسته‌ی سخت‌سازی قبل از دمو, [1405/06] لندینگ نهایی, تصمیم: Rate Limiting به جای Daily Quota, تصمیم: شعله‌ی Streak با Lottie, تصمیم ۱: Vite به جای Webpack, تصمیم ۱: امنیت اشتراک با Edge Function, تصمیم ۱۰: Capacitor به جای Electron (برای Mobile), تصمیم ۲: TypeScript با strict mode (+12 more)

### Community 27 - "SpacedRepetitionSystem"
Cohesion: 0.14
Nodes (3): تغییرات اعمال‌شده, ریسک‌ها و Mitigation, EventBus

### Community 28 - "Card.ts"
Cohesion: 0.12
Nodes (17): animateValue(), appendIconSmart(), CARD_PADDINGS, CARD_VARIANTS, CardOptions, CardPadding, CardVariant, createFlashcard() (+9 more)

### Community 29 - "LandingView.ts"
Cohesion: 0.20
Nodes (16): buildDashScreen(), buildFocusScreen(), buildQuizScreen(), buildReviewScreen(), createCurveDemo(), createFlashDemo(), createLandingView(), createLiveFlame() (+8 more)

### Community 30 - "State.ts"
Cohesion: 0.11
Nodes (7): AIServiceError, AppError, NetworkError, NotFoundError, PermissionError, StorageError, TimeoutError

### Community 31 - "AppError"
Cohesion: 0.19
Nodes (12): Achievement, DbFlashcard, DbNote, DbQuizResult, DbStats, DbStudySession, logger, LS_KEYS (+4 more)

### Community 33 - "ErrorHandler"
Cohesion: 0.22
Nodes (7): eventBus, logger, TOAST_TYPES, ToastData, ToastOptions, ToastType, ToastTypeConfig

### Community 34 - "Toast.ts"
Cohesion: 0.11
Nodes (18): getInstance(), LOG_COLORS, LOG_LEVELS, LogColor, LogEntry, LoggerOptions, LogLevel, purgeDemoData() (+10 more)

### Community 35 - "Database.ts"
Cohesion: 0.13
Nodes (13): BUTTON_VARIANTS, ButtonGroupOptions, ButtonOptions, ButtonSize, ButtonVariant, createButtonGroup(), ICON_SIZE_CLASSES, IconButtonOptions (+5 more)

### Community 36 - "StreakService"
Cohesion: 0.13
Nodes (13): CheckboxOptions, createInput(), createPasswordInput(), createSearchInput(), FormGroupOptions, InputOptions, PasswordInputOptions, RadioOptions (+5 more)

### Community 38 - "SummarizerView.ts"
Cohesion: 0.16
Nodes (26): getRemainingQuota(), getTier(), checkAIQuota(), getQuotaInfo(), QuotaCheckResult, showPaywall(), buildAISubpage(), aiWordCount() (+18 more)

### Community 39 - "ModalManager"
Cohesion: 0.14
Nodes (12): AfterEachHook, BeforeEachHook, DEFAULT_ROUTES, eventBus, logger, NavigateOptions, NavigationEvent, RouteConfig (+4 more)

### Community 40 - "ToastManager"
Cohesion: 0.25
Nodes (14): getChallengesWithStatus(), getStreakService(), burstConfetti(), companionLine(), createDashboardView(), createStreakFlame(), DAILY_TIPS, dayTip() (+6 more)

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
Cohesion: 0.20
Nodes (12): getRouter(), DOCS, getLegalDoc(), getLegalDocs(), LegalDoc, LegalDocId, LegalSection, BUTTON_SIZES (+4 more)

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
Cohesion: 0.07
Nodes (20): eventBus, getStorage(), logger, LS_KEYS, LSKey, Storage, StorageOptions, StorageStats (+12 more)

### Community 53 - "CONTEXT.md"
Cohesion: 0.20
Nodes (8): eventBus, HeatmapDay, logger, Milestone, MILESTONE_MESSAGES, MilestoneCelebration, STREAK_MILESTONES, StreakStats

### Community 54 - "پرامپت: تولید Changelog"
Cohesion: 0.22
Nodes (8): Deployment, Types, فرمت Commit Message, قبل از commit, قبل از push, قبل از release, نکات Merge Conflicts, چک‌لیست‌ها

### Community 55 - "ai.ts"
Cohesion: 0.20
Nodes (9): Event 1: `EVENTS.UI_NAVIGATE` (موجود، بدون تغییر), Event 2: `router:navigated` (موجود، رشته‌ی خام در `Router.ts:341`), Event 3: `EVENTS.POMODORO_COMPLETED` (موجود، زنده‌سازی), Event های پیشنهادی, تحلیل وابستگی Pomodoro به Router, توصیه نهایی, جدول فراخوانی‌های Router, خلاصه اجرایی (+1 more)

### Community 56 - "۱۰ آبان ۱۴۰۵ (۱ نوامبر ۲۰۲۶)"
Cohesion: 0.22
Nodes (8): تست‌ها, جمع‌بندی و اقدام بعدی, خروجی, دامنه‌ی بازبینی, نقش, نکات مثبت (اختیاری و کوتاه), هدف, پرامپت: بازبینی کد (Code Review)

### Community 57 - "MEMORY.md"
Cohesion: 0.22
Nodes (8): روش کار, قالب پیام, قوانین سخت, نقش, نمونه‌ها, هدف, ورودی, پرامپت: تولید پیام Commit هوشمند (Smart Commit)

### Community 58 - "پلن جامع دانش‌یار پرو"
Cohesion: 0.22
Nodes (8): ابزارها, فایل‌های مستندسازی, پلن جامع دانش‌یار پرو, ۱۲. منابع و فایل‌های مهم, ۱۳. قدم بعدی, ۷. مدل‌های هوش مصنوعی مورد استفاده, ۸. اتوماسیون‌ها, ۹. زمان‌بندی کلی

### Community 59 - "iconHTML"
Cohesion: 0.17
Nodes (23): createIcon(), iconHTML(), getMyReferralCode(), getReferralLink(), getReferralStats(), createButton(), buildCredentialsForm(), buildPasswordField() (+15 more)

### Community 60 - "پرامپت: اسکن TODO/FIXME (Todo Scan)"
Cohesion: 0.25
Nodes (7): خروجی, دامنه, روش کار, قوانین سخت, نقش, هدف, پرامپت: اسکن TODO/FIXME (Todo Scan)

### Community 61 - "🤖 ایجنت‌ها و نقش‌ها"
Cohesion: 0.29
Nodes (6): اطلاعات پایه, فایل‌های کلیدی, مسیرهای اصلی, معماری فنی, وابستگی‌های اصلی, وضعیت فعلی

### Community 62 - "🔐 امنیت (همیشه فعال)"
Cohesion: 0.29
Nodes (6): خروجی, روش کار, قوانین سخت, نقش, هدف, پرامپت: تولید Changelog

### Community 63 - "PremiumView.ts"
Cohesion: 0.12
Nodes (21): logger, PaymentResult, requestPayment(), formatToman(), monthlyEquivalent(), Plan, PLANS, savingsPercent() (+13 more)

### Community 64 - "getToast"
Cohesion: 0.26
Nodes (13): getDatabase(), heuristicDifficulty(), getToast(), openCardModal(), renderList(), createMicButton(), createNotesView(), deleteNote() (+5 more)

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

### Community 69 - "نقش‌های ایجنت‌ها در دانش‌یار پرو"
Cohesion: 0.15
Nodes (12): Claude Chat — ایجنت دیپلوی, OpenCode — ایجنت جایگزین, Qwen — مدیر پروژه, ZCode — ایجنت کدنویسی, اتوماسیون‌ها, قوانین کلی برای همه ایجنت‌ها, مدل‌های مورد استفاده, نقش‌ها (+4 more)

### Community 70 - "۴. قوانین سخت‌گیرانه"
Cohesion: 0.40
Nodes (5): قوانین امنیتی, قوانین توزیع, قوانین ضد کلاهبرداری, قوانین غیرقابل مذاکره, ۴. قوانین سخت‌گیرانه

### Community 71 - "فاز D: توزیع و لانچ (هفته ۴)"
Cohesion: 0.20
Nodes (10): روز ۱-۲: صفحه فرود و مستندات قانونی, روز ۱-۳: ادغام هوش مصنوعی, روز ۳: ساخت و توزیع, روز ۴-۵: بهبود تجربه کاربری هوش مصنوعی, روز ۴-۵: بهبود نهایی رابط کاربری, روز ۶-۷: تست و بافر, روز ۶-۷: لانچ و نظارت, فاز C: ویژگی‌های هوش مصنوعی (هفته ۳) (+2 more)

### Community 72 - "AGENTS.md — دانش‌یار پرو"
Cohesion: 0.22
Nodes (8): AGENTS.md — دانش‌یار پرو, AI و Supabase, graphify, الگوهای کدنویسی, دستورها (تأییدشده), معماری, ممنوعیت‌ها, گردش کار

### Community 73 - "فاز B: درآمد و ضد کلاهبرداری (هفته ۲)"
Cohesion: 0.25
Nodes (8): روز ۱: سرویس پرداخت کارت به کارت, روز ۲: ذخیره و تحلیل رسید, روز ۳: ربات تلگرام برای تأیید, روز ۴: سیستم ضد کلاهبرداری, روز ۵: اشتراک پریمیوم و محدودیت‌ها, روز ۶: رابط کاربری پرداخت, روز ۷: سیستم دونیت + تست نهایی, فاز B: درآمد و ضد کلاهبرداری (هفته ۲)

### Community 74 - "📈 سیستم گزارش‌دهی"
Cohesion: 0.40
Nodes (4): دسترسی به فایل‌ها, قوانین غیرقابل مذاکره, نقش‌ها, گزارش‌دهی

### Community 76 - "🔍 تحلیل گراف (Graphify)"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, imports, @supabase/supabase-js

### Community 77 - "🔄 تاریخچه به‌روزرسانی‌ها"
Cohesion: 0.50
Nodes (3): اولویت بالا 🔴, اولویت متوسط 🟡, اولویت پایین 🟢

### Community 78 - "گزارش موفقیت EventBus Refactor"
Cohesion: 0.29
Nodes (6): بعد از Refactor, خلاصه, درس‌های آموخته‌شده, قبل از Refactor, نتیجه, گزارش موفقیت EventBus Refactor

### Community 79 - "۱. اطلاعات پایه"
Cohesion: 0.50
Nodes (4): معماری فنی, وضعیت فعلی, پروژه, ۱. اطلاعات پایه

### Community 80 - "فاز A: زیرساخت حیاتی (هفته ۱)"
Cohesion: 0.33
Nodes (6): روز ۱-۲: احراز هویت, روز ۳: امنیت داده‌ها, روز ۴-۵: همگام‌سازی داده‌ها, روز ۶: تأیید نهایی تابع سروری, روز ۷: بافر و رفع مشکلات, فاز A: زیرساخت حیاتی (هفته ۱)

### Community 81 - "۶. نقش‌ها"
Cohesion: 0.40
Nodes (5): ایجنت دیپلوی, ایجنت کدنویسی, مدیریت پروژه, کاربر (صاحب پروژه), ۶. نقش‌ها

### Community 82 - "۵. ریسک‌ها و راه‌حل‌ها"
Cohesion: 0.40
Nodes (5): ریسک ۱: حساب‌های فیک, ریسک ۲: جعل رسید, ریسک ۳: سوءاستفاده از اشتراک ۷ روزه, ریسک ۴: وابستگی زیاد به توسعه‌دهنده, ۵. ریسک‌ها و راه‌حل‌ها

### Community 84 - "۲. اهداف اصلی"
Cohesion: 0.40
Nodes (5): هدف ۱: نسخه واقعی با کاربر واقعی, هدف ۲: درآمد واقعی و پایدار, هدف ۳: جلوگیری از سوءاستفاده, هدف ۴: رضایت کاربر, ۲. اهداف اصلی

### Community 85 - "۱۰. تاریخچه به‌روزرسانی‌ها"
Cohesion: 0.50
Nodes (4): ۱۰ آبان ۱۴۰۵ (۱ نوامبر ۲۰۲۶), ۱۰. تاریخچه به‌روزرسانی‌ها, ۱۵ آبان ۱۴۰۵ (۶ نوامبر ۲۰۲۶), ۶ آبان ۱۴۰۵ (۲۸ اکتبر ۲۰۲۶)

### Community 101 - "۱۱. معیارهای موفقیت"
Cohesion: 0.50
Nodes (4): بلندمدت (۴ هفته), میان‌مدت (۲ هفته), کوتاه‌مدت (۱ هفته), ۱۱. معیارهای موفقیت

## Knowledge Gaps
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getInstance()` connect `Toast.ts` to `AIQuizService.ts`, `AuthView.ts`, `Logger`, `iconHTML`, `PremiumView.ts`, `AISummaryService.ts`, `toPersianDigits`, `createIcon`, `PremiumView.ts`, `StateManager`, `DatabaseService`, `main.ts`, `dateFormatter.ts`, `Router`, `LandingView.ts`, `AppError`, `ErrorHandler`, `Database.ts`, `SummarizerView.ts`, `ModalManager`, `ToastManager`, `LegalView.ts`, `index.ts`, `پرامپت: اسکن TODO/FIXME (Todo Scan)`, `Storage.ts`, `CONTEXT.md`, `iconHTML`, `PremiumView.ts`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Should `AIQuizService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05222734254992319 - nodes in this community are weakly interconnected._
- **Why does `DatabaseService` connect `DatabaseService` to `getToast`, `Modal.ts`, `🎯 MASTER PLAN — دانش‌یار پرو`, `dateFormatter.ts`, `CONTEXT.md`, `capacitor.build.gradle`, `android/build.gradle`, `AppError`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `AuthView.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05299608551641072 - nodes in this community are weakly interconnected._
- **Why does `Logger` connect `Logger` to `AGENTS.md — دانش‌یار پرو`, `Toast.ts`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `SoundManager` be split into smaller, more focused modules?**
  _Cohesion score 0.10336817653890824 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05442176870748299 - nodes in this community are weakly interconnected._