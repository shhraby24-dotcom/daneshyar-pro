# Graph Report - daneshyar-pro  (2026-11-09)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1631 nodes · 3490 edges · 104 communities (75 shown, 29 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 77 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cf57cbd7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AIQuizService.ts
- NotesView.ts
- SoundManager
- package.json
- DashboardView.ts
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
- ExampleInstrumentedTest.java
- CONTEXT.md
- پرامپت: تولید Changelog
- ai.ts
- ۱۰ آبان ۱۴۰۵ (۱ نوامبر ۲۰۲۶)
- MEMORY.md
- تحلیل وابستگی Pomodoro به Router
- index.ts
- پرامپت: اسکن TODO/FIXME (Todo Scan)
- 🤖 ایجنت‌ها و نقش‌ها
- 🔐 امنیت (همیشه فعال)
- پرامپت: بازبینی کد (Code Review)
- پرامپت: تولید پیام Commit هوشمند (Smart Commit)
- 📋 چک‌لیست روزانه
- RULES.md
- deploy-ai-proxy.ps1
- deno.json
- پرامپت: تولید Changelog
- ai.ts
- ۱۰ آبان ۱۴۰۵ (۱ نوامبر ۲۰۲۶)
- فاز A: زیرساخت حیاتی (هفته ۱)
- MEMORY.md
- 📈 سیستم گزارش‌دهی
- gradlew
- 🔍 تحلیل گراف (Graphify)
- 🔄 تاریخچه به‌روزرسانی‌ها
- ۴. قوانین سخت‌گیرانه
- ۲. اهداف اصلی
- RULES.md
- getDatabase
- CLAUDE.md
- ISSUES.md
- ۱۱. معیارهای موفقیت
- app/build.gradle
- capacitor.build.gradle
- capacitor.settings.gradle
- settings.gradle
- variables.gradle
- sw.js
- vite-env.d.ts
- capacitor.build.gradle
- android/build.gradle

## God Nodes (most connected - your core abstractions)
1. `iconHTML()` - 86 edges
2. `toPersianDigits()` - 76 edges
3. `createIcon()` - 67 edges
4. `createButton()` - 57 edges
5. `getToast()` - 53 edges
6. `getInstance()` - 50 edges
7. `getDatabase()` - 46 edges
8. `SoundManager` - 43 edges
9. `DatabaseService` - 43 edges
10. `getRouter()` - 38 edges

## Surprising Connections (you probably didn't know these)
- `الگوهای کدنویسی` --references--> `activatePremium()`  [INFERRED]
  AGENTS.md → src/services/Premium.ts
- `قدم‌های بعدی` --references--> `getClient()`  [INFERRED]
  .ai/reports/c1-analysis.md → src/services/AuthService.ts
- `ممنوعیت‌ها` --references--> `escapeHtml()`  [INFERRED]
  AGENTS.md → src/ui/components/Modal.ts
- `Workaround های فعلی` --references--> `escapeHtml()`  [INFERRED]
  .ai/hack.md → src/ui/components/Modal.ts
- `معماری` --references--> `Router`  [INFERRED]
  AGENTS.md → src/core/Router.ts

## Import Cycles
- None detected.

## Communities (104 total, 29 thin omitted)

### Community 0 - "AIQuizService.ts"
Cohesion: 0.05
Nodes (65): احراز هویت و سهمیه, جریان احراز هویت, سطوح کاربر, سیستم سهمیه, DifficultyResult, estimateCardDifficulty(), getOrCreateDeviceId(), getWeakTopicInsight() (+57 more)

### Community 1 - "NotesView.ts"
Cohesion: 0.06
Nodes (57): appendHighlighted(), appendInline(), applyFilter(), applyMarkdown(), CATEGORIES, CATEGORY_STYLES, clearDraft(), countWords() (+49 more)

### Community 2 - "SoundManager"
Cohesion: 0.05
Nodes (24): Community های ضعیف گراف, Debt فنی و Workaround ها, Edge Function drift, P1 (بحرانی), P2 (مهم), P3 (کم), TODO های مهم, Workaround های فعلی (+16 more)

### Community 3 - "package.json"
Cohesion: 0.05
Nodes (43): config, dependencies, @capacitor/android@^8.5.0, @capacitor/cli@^8.5.0, @capacitor/core@^8.5.0, dexie@^4.4.4, lottie-web@^5.13.0, lucide@^1.33.0 (+35 more)

### Community 4 - "DashboardView.ts"
Cohesion: 0.06
Nodes (40): DOCS, getLegalDoc(), getLegalDocs(), LegalDoc, LegalDocId, LegalSection, eventBus, getStreakService() (+32 more)

### Community 5 - "iconHTML"
Cohesion: 0.09
Nodes (33): SUPABASE_ANON_KEY, SUPABASE_ENABLED, SUPABASE_URL, BLACKLIST, BLACKLIST_SIZE, getBlacklistedDomains(), isTempEmail(), normalizeDomain() (+25 more)

### Community 6 - "PremiumView.ts"
Cohesion: 0.08
Nodes (27): AIPreserved, AISelfTest, AISummary, AISummaryOptions, AISummaryResult, AISummarySection, cacheKey(), getAISummary() (+19 more)

### Community 8 - "toPersianDigits"
Cohesion: 0.07
Nodes (20): eventBus, getStorage(), logger, LS_KEYS, LSKey, Storage, StorageOptions, StorageStats (+12 more)

### Community 11 - "StateManager"
Cohesion: 0.14
Nodes (8): appendHighlighted(), openSearchPalette(), addItem(), group(), move(), paint(), run(), Layout

### Community 12 - "Layout"
Cohesion: 0.11
Nodes (22): getInstance(), getState(), bootstrap(), createComingSoonView(), logger, registerViews(), router, showFatalError() (+14 more)

### Community 13 - "StateManager"
Cohesion: 0.16
Nodes (27): getRouter(), SyncUIStatus, buildFooter(), createChevron(), createSection(), createSegmented(), createSettingsRow(), createSettingsView() (+19 more)

### Community 14 - "DatabaseService"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, baseUrl, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleDetection (+19 more)

### Community 15 - "DatabaseService"
Cohesion: 0.11
Nodes (22): EVENTS, FocusTrack, getFocusAudio(), TRACKS, ICON_MAP, logger, renderIconPreview(), DEFAULTS (+14 more)

### Community 18 - "main.ts"
Cohesion: 0.09
Nodes (22): runs-on, steps, COMMIT_MSG, JOB_STATUS, RUN_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, jobs (+14 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (20): AIServiceErrorOptions, AppErrorOptions, ERROR_CATEGORIES, ERROR_CODES, ERROR_SEVERITY, ErrorCategory, ErrorCode, errorHandler (+12 more)

### Community 20 - "dateFormatter.ts"
Cohesion: 0.23
Nodes (22): createIcon(), iconHTML(), createButton(), getToast(), buildVerify(), openCardModal(), renderManage(), renderList() (+14 more)

### Community 21 - "Logger"
Cohesion: 0.22
Nodes (19): نکات مهم, activatePremium(), deactivatePremium(), getPremiumPlan(), isPremium(), tryPromo(), getSubscriptionInfo(), loadSubscription() (+11 more)

### Community 22 - "Router"
Cohesion: 0.21
Nodes (4): تحلیل ensurePill, playChime(), PomodoroService, vibrate()

### Community 23 - "steps"
Cohesion: 0.18
Nodes (21): getAuthStore(), isSupabaseEnabled(), createFormGroup(), afterLogin(), buildCloudNote(), buildCredentialsForm(), buildDivider(), buildForgot() (+13 more)

### Community 24 - "Errors.ts"
Cohesion: 0.14
Nodes (19): getInstance(), logger, PaymentResult, requestPayment(), formatToman(), getPremiumDaysLeft(), getPremiumExpiry(), logger (+11 more)

### Community 25 - "steps"
Cohesion: 0.14
Nodes (19): Community پیشنهادی ۱: AI Services — **توصیه: ادغام نشود**, AI_TIMEOUT_MS, AIQuizService, AIResult, AITier, cacheKey(), GenerateHooks, getAIQuizService() (+11 more)

### Community 26 - "📋 تصمیمات فنی پروژه دانش‌یار پرو"
Cohesion: 0.14
Nodes (3): تغییرات اعمال‌شده, ریسک‌ها و Mitigation, EventBus

### Community 27 - "SpacedRepetitionSystem"
Cohesion: 0.10
Nodes (20): jobs, update-graph, name, on, push, schedule, workflow_dispatch, permissions (+12 more)

### Community 28 - "Card.ts"
Cohesion: 0.10
Nodes (20): jobs, security-scan, name, on, schedule, workflow_dispatch, permissions, contents (+12 more)

### Community 29 - "LandingView.ts"
Cohesion: 0.10
Nodes (20): [1405/06] بسته‌ی سخت‌سازی قبل از دمو, [1405/06] لندینگ نهایی, تصمیم: Rate Limiting به جای Daily Quota, تصمیم: شعله‌ی Streak با Lottie, تصمیم ۱: Vite به جای Webpack, تصمیم ۱: امنیت اشتراک با Edge Function, تصمیم ۱۰: Capacitor به جای Electron (برای Mobile), تصمیم ۲: TypeScript با strict mode (+12 more)

### Community 31 - "AppError"
Cohesion: 0.10
Nodes (16): LOG_COLORS, LOG_LEVELS, LogColor, LogEntry, LoggerOptions, LogLevel, ActiveModal, ConfirmOptions (+8 more)

### Community 32 - "main.ts"
Cohesion: 0.12
Nodes (17): animateValue(), appendIconSmart(), CARD_PADDINGS, CARD_VARIANTS, CardOptions, CardPadding, CardVariant, createFlashcard() (+9 more)

### Community 33 - "ErrorHandler"
Cohesion: 0.19
Nodes (17): buildDashScreen(), buildFocusScreen(), buildQuizScreen(), buildReviewScreen(), createCurveDemo(), createFlashDemo(), createLandingView(), createLiveFlame() (+9 more)

### Community 34 - "Toast.ts"
Cohesion: 0.11
Nodes (15): EventBusOptions, EventBusStats, EventCallback, EventObject, HistoryFilter, Listener, logger, SubscriptionOptions (+7 more)

### Community 35 - "Database.ts"
Cohesion: 0.13
Nodes (17): BUTTON_VARIANTS, hidePaywall(), logger, showPaywall(), addXP(), ai, burstConfetti(), correctAnswerText() (+9 more)

### Community 36 - "StreakService"
Cohesion: 0.19
Nodes (16): Sync, DbStudySession, getLastSync(), getSnapshot(), isSyncAvailable(), listeners, logger, onSyncStatus() (+8 more)

### Community 37 - "Router.ts"
Cohesion: 0.11
Nodes (14): AppInfo, AppState, DEFAULT_STATE, eventBus, logger, LS_KEYS, PERSIST_KEYS, QuizResult (+6 more)

### Community 38 - "SummarizerView.ts"
Cohesion: 0.11
Nodes (7): AIServiceError, AppError, NetworkError, NotFoundError, PermissionError, StorageError, TimeoutError

### Community 39 - "ModalManager"
Cohesion: 0.17
Nodes (17): createEmptyState(), createTextarea(), aiWordCount(), countWords(), buildNoteContent(), renderActions(), renderInputCard(), renderResults() (+9 more)

### Community 41 - "ModalManager"
Cohesion: 0.34
Nodes (16): friendlyAIError(), getModal(), createQuizView(), confirmFinish(), engineBadge(), finish(), renderPlay(), renderResults() (+8 more)

### Community 42 - "ExampleInstrumentedTest.java"
Cohesion: 0.17
Nodes (12): Challenge, ChallengeCategory, CHALLENGES, ChallengeStatus, getChallengesWithStatus(), logger, longestConsecutiveStudyDays(), CATEGORY_META (+4 more)

### Community 43 - "Modal.ts"
Cohesion: 0.14
Nodes (12): CheckboxOptions, createInput(), createPasswordInput(), createSearchInput(), FormGroupOptions, InputOptions, PasswordInputOptions, RadioOptions (+4 more)

### Community 44 - "پرامپت: ممیزی امنیتی (Security Audit)"
Cohesion: 0.14
Nodes (12): AnalysisResult, DIFFICULTY_LEVELS, DifficultyLevel, GenerateOptions, getQuizGenerator(), logger, QUESTION_TYPES, QuizHistoryEntry (+4 more)

### Community 45 - "LegalView.ts"
Cohesion: 0.21
Nodes (11): Achievement, DbFlashcard, DbNote, DbQuizResult, DbStats, logger, LS_KEYS, SyncStatus (+3 more)

### Community 46 - "پرامپت: بازبینی کد (Code Review)"
Cohesion: 0.14
Nodes (12): AfterEachHook, BeforeEachHook, DEFAULT_ROUTES, eventBus, logger, NavigateOptions, NavigationEvent, RouteConfig (+4 more)

### Community 50 - "🚨 مشکلات اصلی (به ترتیب اولویت)"
Cohesion: 0.15
Nodes (12): Claude Chat — ایجنت دیپلوی, OpenCode — ایجنت جایگزین, Qwen — مدیر پروژه, ZCode — ایجنت کدنویسی, اتوماسیون‌ها, قوانین کلی برای همه ایجنت‌ها, مدل‌های مورد استفاده, نقش‌ها (+4 more)

### Community 53 - "CONTEXT.md"
Cohesion: 0.24
Nodes (9): CORS و CSP, XSS Prevention, الگوهای امن ✅, قوانین امنیتی دانش‌یار پرو, ممنوعیت‌های مطلق ❌, چک‌لیست امنیتی قبل از commit, محورهای بازبینی, آنچه باید بررسی شود (+1 more)

### Community 54 - "پرامپت: تولید Changelog"
Cohesion: 0.18
Nodes (10): [Low] <عنوان>, [Medium] <عنوان>, خروجی, روش کار, محدوده‌ی اسکن (فقط همین‌ها), موارد بررسی‌شده و سالم, نقش, هدف (+2 more)

### Community 55 - "ai.ts"
Cohesion: 0.42
Nodes (10): getRemainingQuota(), getTier(), checkAIQuota(), getQuotaInfo(), QuotaCheckResult, createSummarizerView(), engineBadge(), generate() (+2 more)

### Community 56 - "۱۰ آبان ۱۴۰۵ (۱ نوامبر ۲۰۲۶)"
Cohesion: 0.20
Nodes (7): Dexie (IndexedDB), localStorage Keys, Migration, Supabase, افزودن جدول جدید, ساختار داده, DaneshyarDB

### Community 57 - "MEMORY.md"
Cohesion: 0.20
Nodes (10): روز ۱-۲: صفحه فرود و مستندات قانونی, روز ۱-۳: ادغام هوش مصنوعی, روز ۳: ساخت و توزیع, روز ۴-۵: بهبود تجربه کاربری هوش مصنوعی, روز ۴-۵: بهبود نهایی رابط کاربری, روز ۶-۷: تست و بافر, روز ۶-۷: لانچ و نظارت, فاز C: ویژگی‌های هوش مصنوعی (هفته ۳) (+2 more)

### Community 58 - "تحلیل وابستگی Pomodoro به Router"
Cohesion: 0.20
Nodes (9): Event 1: `EVENTS.UI_NAVIGATE` (موجود، بدون تغییر), Event 2: `router:navigated` (موجود، رشته‌ی خام در `Router.ts:341`), Event 3: `EVENTS.POMODORO_COMPLETED` (موجود، زنده‌سازی), Event های پیشنهادی, تحلیل وابستگی Pomodoro به Router, توصیه نهایی, جدول فراخوانی‌های Router, خلاصه اجرایی (+1 more)

### Community 59 - "index.ts"
Cohesion: 0.20
Nodes (4): Input Validation, corsHeaders, FALLBACK_MODELS, validateQuestion()

### Community 60 - "پرامپت: اسکن TODO/FIXME (Todo Scan)"
Cohesion: 0.22
Nodes (8): AGENTS.md — دانش‌یار پرو, AI و Supabase, graphify, الگوهای کدنویسی, دستورها (تأییدشده), معماری, ممنوعیت‌ها, گردش کار

### Community 61 - "🤖 ایجنت‌ها و نقش‌ها"
Cohesion: 0.22
Nodes (8): Deployment, Types, فرمت Commit Message, قبل از commit, قبل از push, قبل از release, نکات Merge Conflicts, چک‌لیست‌ها

### Community 62 - "🔐 امنیت (همیشه فعال)"
Cohesion: 0.22
Nodes (8): ابزارها, فایل‌های مستندسازی, پلن جامع دانش‌یار پرو, ۱۲. منابع و فایل‌های مهم, ۱۳. قدم بعدی, ۷. مدل‌های هوش مصنوعی مورد استفاده, ۸. اتوماسیون‌ها, ۹. زمان‌بندی کلی

### Community 63 - "پرامپت: بازبینی کد (Code Review)"
Cohesion: 0.22
Nodes (8): تست‌ها, جمع‌بندی و اقدام بعدی, خروجی, دامنه‌ی بازبینی, نقش, نکات مثبت (اختیاری و کوتاه), هدف, پرامپت: بازبینی کد (Code Review)

### Community 64 - "پرامپت: تولید پیام Commit هوشمند (Smart Commit)"
Cohesion: 0.22
Nodes (8): روش کار, قالب پیام, قوانین سخت, نقش, نمونه‌ها, هدف, ورودی, پرامپت: تولید پیام Commit هوشمند (Smart Commit)

### Community 65 - "📋 چک‌لیست روزانه"
Cohesion: 0.25
Nodes (8): روز ۱: سرویس پرداخت کارت به کارت, روز ۲: ذخیره و تحلیل رسید, روز ۳: ربات تلگرام برای تأیید, روز ۴: سیستم ضد کلاهبرداری, روز ۵: اشتراک پریمیوم و محدودیت‌ها, روز ۶: رابط کاربری پرداخت, روز ۷: سیستم دونیت + تست نهایی, فاز B: درآمد و ضد کلاهبرداری (هفته ۲)

### Community 66 - "RULES.md"
Cohesion: 0.25
Nodes (7): خروجی, دامنه, روش کار, قوانین سخت, نقش, هدف, پرامپت: اسکن TODO/FIXME (Todo Scan)

### Community 67 - "deploy-ai-proxy.ps1"
Cohesion: 0.29
Nodes (6): اطلاعات پایه, فایل‌های کلیدی, مسیرهای اصلی, معماری فنی, وابستگی‌های اصلی, وضعیت فعلی

### Community 68 - "deno.json"
Cohesion: 0.29
Nodes (6): بعد از Refactor, خلاصه, درس‌های آموخته‌شده, قبل از Refactor, نتیجه, گزارش موفقیت EventBus Refactor

### Community 69 - "پرامپت: تولید Changelog"
Cohesion: 0.29
Nodes (6): خروجی, روش کار, قوانین سخت, نقش, هدف, پرامپت: تولید Changelog

### Community 70 - "ai.ts"
Cohesion: 0.29
Nodes (6): AI_CONFIG, AI_KEYS_LS, AI_LIMITS, AI_USAGE_LS, AITier, PREMIUM_LS

### Community 71 - "۱۰ آبان ۱۴۰۵ (۱ نوامبر ۲۰۲۶)"
Cohesion: 0.33
Nodes (5): مشکلات, کارهای انجام‌شده, کارهای فردا, یادداشت‌های مهم, ۱۰ آبان ۱۴۰۵ (۱ نوامبر ۲۰۲۶)

### Community 72 - "فاز A: زیرساخت حیاتی (هفته ۱)"
Cohesion: 0.33
Nodes (6): روز ۱-۲: احراز هویت, روز ۳: امنیت داده‌ها, روز ۴-۵: همگام‌سازی داده‌ها, روز ۶: تأیید نهایی تابع سروری, روز ۷: بافر و رفع مشکلات, فاز A: زیرساخت حیاتی (هفته ۱)

### Community 73 - "MEMORY.md"
Cohesion: 0.33
Nodes (5): تصمیمات مهم, راه‌حل اتصال, وضعیت فعلی, کارهای انجام‌شده, کارهای در حال انجام

### Community 74 - "📈 سیستم گزارش‌دهی"
Cohesion: 0.33
Nodes (5): دستاوردها, مشکلات باز, مشکلات حل‌شده, هفته ۱ (۶ آبان ۱۴۰۵ - ۱۲ آبان ۱۴۰۵), کارهای هفته بعد

### Community 75 - "gradlew"
Cohesion: 0.53
Nodes (4): sanitize_message(), smart-commit.sh script, show_message(), strip_ansi()

### Community 76 - "🔍 تحلیل گراف (Graphify)"
Cohesion: 0.40
Nodes (5): ایجنت دیپلوی, ایجنت کدنویسی, مدیریت پروژه, کاربر (صاحب پروژه), ۶. نقش‌ها

### Community 77 - "🔄 تاریخچه به‌روزرسانی‌ها"
Cohesion: 0.40
Nodes (5): ریسک ۱: حساب‌های فیک, ریسک ۲: جعل رسید, ریسک ۳: سوءاستفاده از اشتراک ۷ روزه, ریسک ۴: وابستگی زیاد به توسعه‌دهنده, ۵. ریسک‌ها و راه‌حل‌ها

### Community 78 - "۴. قوانین سخت‌گیرانه"
Cohesion: 0.40
Nodes (5): قوانین امنیتی, قوانین توزیع, قوانین ضد کلاهبرداری, قوانین غیرقابل مذاکره, ۴. قوانین سخت‌گیرانه

### Community 79 - "۲. اهداف اصلی"
Cohesion: 0.40
Nodes (5): هدف ۱: نسخه واقعی با کاربر واقعی, هدف ۲: درآمد واقعی و پایدار, هدف ۳: جلوگیری از سوءاستفاده, هدف ۴: رضایت کاربر, ۲. اهداف اصلی

### Community 80 - "RULES.md"
Cohesion: 0.40
Nodes (4): دسترسی به فایل‌ها, قوانین غیرقابل مذاکره, نقش‌ها, گزارش‌دهی

### Community 82 - "getDatabase"
Cohesion: 0.60
Nodes (4): getDatabase(), purgeDemoData(), seedDemoData(), currentStreak()

### Community 83 - "CLAUDE.md"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, imports, @supabase/supabase-js

### Community 84 - "ISSUES.md"
Cohesion: 0.50
Nodes (3): اولویت بالا 🔴, اولویت متوسط 🟡, اولویت پایین 🟢

### Community 85 - "۱۱. معیارهای موفقیت"
Cohesion: 0.50
Nodes (4): بلندمدت (۴ هفته), میان‌مدت (۲ هفته), کوتاه‌مدت (۱ هفته), ۱۱. معیارهای موفقیت

### Community 86 - "app/build.gradle"
Cohesion: 0.50
Nodes (4): معماری فنی, وضعیت فعلی, پروژه, ۱. اطلاعات پایه

### Community 87 - "capacitor.build.gradle"
Cohesion: 0.50
Nodes (4): ۱۰ آبان ۱۴۰۵ (۱ نوامبر ۲۰۲۶), ۱۰. تاریخچه به‌روزرسانی‌ها, ۱۵ آبان ۱۴۰۵ (۶ نوامبر ۲۰۲۶), ۶ آبان ۱۴۰۵ (۲۸ اکتبر ۲۰۲۶)

## Knowledge Gaps
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getInstance()` connect `Errors.ts` to `AIQuizService.ts`, `NotesView.ts`, `SoundManager`, `DashboardView.ts`, `iconHTML`, `PremiumView.ts`, `toPersianDigits`, `Layout`, `StateManager`, `DatabaseService`, `compilerOptions`, `Logger`, `steps`, `steps`, `AppError`, `ErrorHandler`, `Toast.ts`, `Database.ts`, `StreakService`, `Router.ts`, `ModalManager`, `ExampleInstrumentedTest.java`, `پرامپت: ممیزی امنیتی (Security Audit)`, `LegalView.ts`, `پرامپت: بازبینی کد (Code Review)`, `getDatabase`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Should `AIQuizService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05146242132543503 - nodes in this community are weakly interconnected._
- **Why does `Logger` connect `SoundManager` to `Errors.ts`, `پرامپت: اسکن TODO/FIXME (Todo Scan)`, `AppError`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Should `NotesView.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.061343204653622425 - nodes in this community are weakly interconnected._
- **Why does `StateManager` connect `createIcon` to `Layout`, `Router.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `SoundManager` be split into smaller, more focused modules?**
  _Cohesion score 0.05411764705882353 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05442176870748299 - nodes in this community are weakly interconnected._