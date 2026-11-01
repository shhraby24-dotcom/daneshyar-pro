# Graph Report - daneshyar-pro  (2026-11-01)

## Corpus Check
- 103 files · ~98,233 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 21 file(s) not represented in the graph (top: .xml 10, (none) 3, .properties 2)

## Summary
- 1471 nodes · 3197 edges · 101 communities (70 shown, 31 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4305f19a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- IconService.ts
- getSupabaseClient
- package.json
- AISummaryService.ts
- LandingView.ts
- SoundManager
- DashboardView.ts
- createIcon
- iconHTML
- StateManager
- AIQuizService.ts
- Toast.ts
- DatabaseService
- toPersianDigits
- SettingsView.ts
- FlashcardsView.ts
- ChallengesView.ts
- ModalManager
- compilerOptions
- 📋 تصمیمات فنی پروژه دانش‌یار پرو
- NotesView.ts
- dateFormatter.ts
- Logger
- Router
- StreakService.ts
- steps
- Errors.ts
- Layout
- steps
- Premium.ts
- EventBus
- Card.ts
- AppError
- Database.ts
- ErrorHandler
- PremiumView.ts
- State.ts
- PomodoroService
- main.ts
- StreakService
- AuthView.ts
- SyncService.ts
- ToastManager
- FocusAudioService
- ExampleInstrumentedTest.java
- EventBus.ts
- index.ts
- ai.ts
- Router.ts
- smart-commit.sh
- DaneshyarDB
- deno.json
- MainActivity.java
- Note
- ValidationError
- api.ts
- createButton
- Modal.ts
- پرامپت: ممیزی امنیتی (Security Audit)
- Logger.ts
- پرامپت: بازبینی کد (Code Review)
- پرامپت: تولید پیام Commit هوشمند (Smart Commit)
- 🎯 MASTER PLAN — دانش‌یار پرو
- 🚨 مشکلات اصلی (به ترتیب اولویت)
- پرامپت: اسکن TODO/FIXME (Todo Scan)
- CONTEXT.md
- پرامپت: تولید Changelog
- Layout.ts
- ۶ آبان ۱۴۰۵ (۲۸ اکتبر ۲۰۲۶)
- MEMORY.md
- هفته ۱ (۶ آبان ۱۴۰۵ - ۱۲ آبان ۱۴۰۵)
- escapeHtml
- 🤖 ایجنت‌ها و نقش‌ها
- 🔐 امنیت (همیشه فعال)
- 🎯 اهداف اصلی
- 🎯 فازهای اجرایی
- 📋 چک‌لیست روزانه
- RULES.md
- ISSUES.md
- 📚 منابع و ابزار
- 📊 وضعیت فعلی پروژه
- 🎓 قوانین طلایی
- 🎯 موفقیت چگونه تعریف می‌شود؟
- 📈 سیستم گزارش‌دهی
- 🔍 تحلیل گراف (Graphify)
- 🔄 تاریخچه به‌روزرسانی‌ها
- Flashcard
- CLAUDE.md
- .claude/CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `iconHTML()` - 80 edges
2. `toPersianDigits()` - 76 edges
3. `createIcon()` - 65 edges
4. `createButton()` - 54 edges
5. `getInstance()` - 49 edges
6. `getToast()` - 49 edges
7. `getDatabase()` - 45 edges
8. `DatabaseService` - 43 edges
9. `SoundManager` - 43 edges
10. `getRouter()` - 40 edges

## Surprising Connections (you probably didn't know these)
- `الگوهای کدنویسی` --references--> `activatePremium()`  [INFERRED]
  AGENTS.md → src/services/Premium.ts
- `معماری` --references--> `Logger`  [INFERRED]
  AGENTS.md → src/core/Logger.ts
- `معماری` --references--> `Router`  [INFERRED]
  AGENTS.md → src/core/Router.ts
- `معماری` --references--> `registerViews()`  [INFERRED]
  AGENTS.md → src/main.ts
- `اقدامات refactor (به ترتیب اولویت)` --references--> `seedDemoData()`  [INFERRED]
  .ai/MASTER-PLAN.md → src/services/DemoDataService.ts

## Import Cycles
- None detected.

## Communities (101 total, 31 thin omitted)

### Community 0 - "IconService.ts"
Cohesion: 0.11
Nodes (20): FocusTrack, getFocusAudio(), TRACKS, logger, renderIconPreview(), DEFAULTS, FocusTarget, getPomodoroService() (+12 more)

### Community 1 - "getSupabaseClient"
Cohesion: 0.20
Nodes (15): getSession(), getSupabaseClient(), logger, PaymentResult, requestPayment(), Plan, clearPendingRef(), getMyReferralCode() (+7 more)

### Community 2 - "package.json"
Cohesion: 0.05
Nodes (43): config, dependencies, @capacitor/android@^8.5.0, @capacitor/cli@^8.5.0, @capacitor/core@^8.5.0, dexie@^4.4.4, lottie-web@^5.13.0, lucide@^1.33.0 (+35 more)

### Community 3 - "AISummaryService.ts"
Cohesion: 0.08
Nodes (27): AIPreserved, AISelfTest, AISummary, AISummaryOptions, AISummaryResult, AISummarySection, cacheKey(), getAISummary() (+19 more)

### Community 4 - "LandingView.ts"
Cohesion: 0.07
Nodes (36): DOCS, getLegalDoc(), getLegalDocs(), LegalDoc, LegalDocId, LegalSection, BUTTON_SIZES, ButtonGroupOptions (+28 more)

### Community 5 - "SoundManager"
Cohesion: 0.07
Nodes (14): getStorage(), AmbientNodes, AmbientResult, AmbientSoundId, AmbientSoundInfo, CustomSound, getSoundManager(), logger (+6 more)

### Community 6 - "DashboardView.ts"
Cohesion: 0.05
Nodes (36): DifficultyResult, estimateCardDifficulty(), getOrCreateDeviceId(), getWeakTopicInsight(), heuristicDifficulty(), logger, parseScore(), ConceptType (+28 more)

### Community 7 - "createIcon"
Cohesion: 0.22
Nodes (16): createIcon(), createFormGroup(), getModal(), getToast(), buildEmpty(), createNotesSearch(), createNotesView(), deleteNote() (+8 more)

### Community 8 - "iconHTML"
Cohesion: 0.19
Nodes (21): iconHTML(), createTextarea(), aiWordCount(), countWords(), createSummarizerView(), buildNoteContent(), engineBadge(), renderActions() (+13 more)

### Community 10 - "AIQuizService.ts"
Cohesion: 0.05
Nodes (30): AI_TIMEOUT_MS, AIQuizService, AIResult, AITier, cacheKey(), GenerateHooks, getAIQuizService(), getOrCreateDeviceId() (+22 more)

### Community 11 - "Toast.ts"
Cohesion: 0.16
Nodes (11): getInstance(), debouncedCheck(), logger, startAutoRewardWatcher(), eventBus, logger, TOAST_TYPES, ToastData (+3 more)

### Community 13 - "toPersianDigits"
Cohesion: 0.13
Nodes (35): getState(), friendlyAIError(), getRemainingQuota(), getTier(), checkAIQuota(), getQuotaInfo(), QuotaCheckResult, buildStatus() (+27 more)

### Community 14 - "SettingsView.ts"
Cohesion: 0.14
Nodes (32): saveUserKeys(), signOut(), getLastSync(), isSyncAvailable(), onSyncStatus(), createChevron(), createSection(), createSegmented() (+24 more)

### Community 15 - "FlashcardsView.ts"
Cohesion: 0.12
Nodes (35): getDatabase(), getReferralLink(), createEmptyState(), addXP(), burstConfetti(), CONCEPT_STYLES, CONCEPT_TYPES, createFlashcardsView() (+27 more)

### Community 16 - "ChallengesView.ts"
Cohesion: 0.17
Nodes (12): Challenge, ChallengeCategory, CHALLENGES, ChallengeStatus, checkAndReward(), getChallengesWithStatus(), logger, longestConsecutiveStudyDays() (+4 more)

### Community 18 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, baseUrl, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleDetection (+19 more)

### Community 19 - "📋 تصمیمات فنی پروژه دانش‌یار پرو"
Cohesion: 0.10
Nodes (20): [1405/06] بسته‌ی سخت‌سازی قبل از دمو, [1405/06] لندینگ نهایی, تصمیم: Rate Limiting به جای Daily Quota, تصمیم: شعله‌ی Streak با Lottie, تصمیم ۱: Vite به جای Webpack, تصمیم ۱: امنیت اشتراک با Edge Function, تصمیم ۱۰: Capacitor به جای Electron (برای Mobile), تصمیم ۲: TypeScript با strict mode (+12 more)

### Community 20 - "NotesView.ts"
Cohesion: 0.07
Nodes (38): CheckboxOptions, createInput(), createPasswordInput(), createSearchInput(), FormGroupOptions, InputOptions, PasswordInputOptions, RadioOptions (+30 more)

### Community 21 - "dateFormatter.ts"
Cohesion: 0.15
Nodes (23): AR_DIGITS, DateInput, FA_DIGITS, faNum(), formatCountdown(), formatDateTime(), formatDuration(), formatPersianDate() (+15 more)

### Community 24 - "StreakService.ts"
Cohesion: 0.20
Nodes (8): eventBus, HeatmapDay, logger, Milestone, MILESTONE_MESSAGES, MilestoneCelebration, STREAK_MILESTONES, StreakStats

### Community 25 - "steps"
Cohesion: 0.09
Nodes (22): runs-on, steps, COMMIT_MSG, JOB_STATUS, RUN_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, jobs (+14 more)

### Community 26 - "Errors.ts"
Cohesion: 0.12
Nodes (19): AIServiceErrorOptions, AppErrorOptions, ERROR_CATEGORIES, ERROR_CODES, ERROR_SEVERITY, ErrorCategory, ErrorCode, ErrorListener (+11 more)

### Community 27 - "Layout"
Cohesion: 0.14
Nodes (8): appendHighlighted(), openSearchPalette(), addItem(), group(), move(), paint(), run(), Layout

### Community 28 - "steps"
Cohesion: 0.10
Nodes (20): jobs, update-graph, name, on, push, schedule, workflow_dispatch, permissions (+12 more)

### Community 29 - "Premium.ts"
Cohesion: 0.22
Nodes (19): activatePremium(), deactivatePremium(), getPremiumDaysLeft(), getPremiumExpiry(), getPremiumPlan(), isPremium(), logger, tryPromo() (+11 more)

### Community 30 - "EventBus"
Cohesion: 0.07
Nodes (9): AGENTS.md — دانش‌یار پرو, AI و Supabase, graphify, الگوهای کدنویسی, دستورها (تأییدشده), معماری, گردش کار, EventBus (+1 more)

### Community 31 - "Card.ts"
Cohesion: 0.11
Nodes (18): ICON_MAP, animateValue(), appendIconSmart(), CARD_PADDINGS, CARD_VARIANTS, CardOptions, CardPadding, CardVariant (+10 more)

### Community 32 - "AppError"
Cohesion: 0.11
Nodes (7): AIServiceError, AppError, NetworkError, NotFoundError, PermissionError, StorageError, TimeoutError

### Community 33 - "Database.ts"
Cohesion: 0.19
Nodes (12): Achievement, DbFlashcard, DbNote, DbQuizResult, DbStats, logger, LS_KEYS, SyncStatus (+4 more)

### Community 35 - "PremiumView.ts"
Cohesion: 0.14
Nodes (18): formatToman(), monthlyEquivalent(), PLANS, savingsPercent(), BENEFITS, COMPARISON, createPremiumView(), buildBenefits() (+10 more)

### Community 36 - "State.ts"
Cohesion: 0.12
Nodes (13): AppInfo, AppState, DEFAULT_STATE, eventBus, logger, LS_KEYS, PERSIST_KEYS, SetOptions (+5 more)

### Community 37 - "PomodoroService"
Cohesion: 0.24
Nodes (3): playChime(), PomodoroService, vibrate()

### Community 38 - "main.ts"
Cohesion: 0.20
Nodes (14): اقدامات refactor (به ترتیب اولویت), bootstrap(), createComingSoonView(), logger, registerViews(), router, showFatalError(), state (+6 more)

### Community 40 - "AuthView.ts"
Cohesion: 0.24
Nodes (12): SUPABASE_ANON_KEY, SUPABASE_ENABLED, SUPABASE_URL, getClient(), getCurrentUser(), isSupabaseEnabled(), logger, onAuthChange() (+4 more)

### Community 41 - "SyncService.ts"
Cohesion: 0.21
Nodes (12): DbStudySession, getSnapshot(), listeners, logger, propagateDeletes(), pullTable(), pushTable(), saveSnapshot() (+4 more)

### Community 45 - "EventBus.ts"
Cohesion: 0.11
Nodes (15): EventBusOptions, EventBusStats, EventCallback, EventObject, EVENTS, HistoryFilter, Listener, logger (+7 more)

### Community 47 - "ai.ts"
Cohesion: 0.29
Nodes (6): AI_CONFIG, AI_KEYS_LS, AI_LIMITS, AI_USAGE_LS, AITier, PREMIUM_LS

### Community 48 - "Router.ts"
Cohesion: 0.14
Nodes (12): AfterEachHook, BeforeEachHook, DEFAULT_ROUTES, eventBus, logger, NavigateOptions, NavigationEvent, RouteConfig (+4 more)

### Community 49 - "smart-commit.sh"
Cohesion: 0.53
Nodes (4): sanitize_message(), smart-commit.sh script, show_message(), strip_ansi()

### Community 52 - "deno.json"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, imports, @supabase/supabase-js

### Community 66 - "createButton"
Cohesion: 0.28
Nodes (11): getRouter(), BUTTON_VARIANTS, createButton(), hidePaywall(), logger, showPaywall(), buildForm(), buildLoggedIn() (+3 more)

### Community 67 - "Modal.ts"
Cohesion: 0.17
Nodes (10): ActiveModal, ConfirmOptions, eventBus, logger, ModalButton, ModalButtonType, ModalOptions, ModalSize (+2 more)

### Community 68 - "پرامپت: ممیزی امنیتی (Security Audit)"
Cohesion: 0.18
Nodes (10): [Low] <عنوان>, [Medium] <عنوان>, خروجی, روش کار, محدوده‌ی اسکن (فقط همین‌ها), موارد بررسی‌شده و سالم, نقش, هدف (+2 more)

### Community 69 - "Logger.ts"
Cohesion: 0.22
Nodes (8): getInstance(), LOG_COLORS, LOG_LEVELS, LogColor, LogEntry, LoggerOptions, LogLevel, seedDemoData()

### Community 70 - "پرامپت: بازبینی کد (Code Review)"
Cohesion: 0.22
Nodes (8): تست‌ها, جمع‌بندی و اقدام بعدی, خروجی, دامنه‌ی بازبینی, نقش, نکات مثبت (اختیاری و کوتاه), هدف, پرامپت: بازبینی کد (Code Review)

### Community 71 - "پرامپت: تولید پیام Commit هوشمند (Smart Commit)"
Cohesion: 0.22
Nodes (8): روش کار, قالب پیام, قوانین سخت, نقش, نمونه‌ها, هدف, ورودی, پرامپت: تولید پیام Commit هوشمند (Smart Commit)

### Community 72 - "🎯 MASTER PLAN — دانش‌یار پرو"
Cohesion: 0.25
Nodes (7): GitHub Actions (فعال), 🎯 MASTER PLAN — دانش‌یار پرو, 🔄 اتوماسیون, اتوماسیون‌های آینده, 📞 اطلاعات تماس اضطراری, اگر مشکلی پیش آمد, فایل‌های مهم

### Community 73 - "🚨 مشکلات اصلی (به ترتیب اولویت)"
Cohesion: 0.25
Nodes (8): اولویت ۱: اتصال و VPN, اولویت ۲: وابستگی به کاربر, اولویت ۳: فراموشی AI, اولویت ۴: چارچوب ایجنت‌ها, اولویت ۵: مغز دوم, اولویت ۶: Drift کد و Production, اولویت ۷: تست و Quality, 🚨 مشکلات اصلی (به ترتیب اولویت)

### Community 74 - "پرامپت: اسکن TODO/FIXME (Todo Scan)"
Cohesion: 0.25
Nodes (7): خروجی, دامنه, روش کار, قوانین سخت, نقش, هدف, پرامپت: اسکن TODO/FIXME (Todo Scan)

### Community 75 - "CONTEXT.md"
Cohesion: 0.29
Nodes (6): اطلاعات پایه, فایل‌های کلیدی, مسیرهای اصلی, معماری فنی, وابستگی‌های اصلی, وضعیت فعلی

### Community 76 - "پرامپت: تولید Changelog"
Cohesion: 0.29
Nodes (6): خروجی, روش کار, قوانین سخت, نقش, هدف, پرامپت: تولید Changelog

### Community 77 - "Layout.ts"
Cohesion: 0.29
Nodes (5): BOTTOM_NAV_ITEMS, logger, MORE_ITEMS, NAV_ITEMS, NavItem

### Community 78 - "۶ آبان ۱۴۰۵ (۲۸ اکتبر ۲۰۲۶)"
Cohesion: 0.33
Nodes (5): مشکلات, کارهای انجام‌شده, کارهای فردا, یادداشت‌ها, ۶ آبان ۱۴۰۵ (۲۸ اکتبر ۲۰۲۶)

### Community 79 - "MEMORY.md"
Cohesion: 0.33
Nodes (5): تصمیمات مهم, راه‌حل اتصال, وضعیت فعلی, کارهای انجام‌شده, کارهای در حال انجام

### Community 80 - "هفته ۱ (۶ آبان ۱۴۰۵ - ۱۲ آبان ۱۴۰۵)"
Cohesion: 0.33
Nodes (5): دستاوردها, مشکلات باز, مشکلات حل‌شده, هفته ۱ (۶ آبان ۱۴۰۵ - ۱۲ آبان ۱۴۰۵), کارهای هفته بعد

### Community 81 - "escapeHtml"
Cohesion: 0.40
Nodes (4): ممنوعیت‌ها, محورهای بازبینی, آنچه باید بررسی شود, escapeHtml()

### Community 82 - "🤖 ایجنت‌ها و نقش‌ها"
Cohesion: 0.40
Nodes (5): Claude Chat, OpenCode, Qwen (این چت), ZCode, 🤖 ایجنت‌ها و نقش‌ها

### Community 83 - "🔐 امنیت (همیشه فعال)"
Cohesion: 0.40
Nodes (5): اقدامات امنیتی منظم, 🔐 امنیت (همیشه فعال), قوانین غیرقابل مذاکره, مشکلات امنیتی باقیمانده, مشکلات امنیتی رفع شده

### Community 84 - "🎯 اهداف اصلی"
Cohesion: 0.40
Nodes (5): 🎯 اهداف اصلی, هدف ۱: کاهش وابستگی به کاربر, هدف ۲: جلوگیری از فراموشی AI, هدف ۳: امنیت همیشگی, هدف ۴: کیفیت کد

### Community 85 - "🎯 فازهای اجرایی"
Cohesion: 0.40
Nodes (5): فاز ۱: آماده‌سازی پایه ✅ (تکمیل شده), فاز ۲: حل مشکل اتصال 🟡 (در حال انجام), فاز ۳: سیستم مغز دوم 🟡 (در حال انجام), فاز ۴: چارچوب ایجنت‌ها + کاهش وابستگی ⏳ (آینده), 🎯 فازهای اجرایی

### Community 86 - "📋 چک‌لیست روزانه"
Cohesion: 0.40
Nodes (5): هر commit, هر release, هر روز (۵ دقیقه), هر هفته (۱۵ دقیقه - جمعه), 📋 چک‌لیست روزانه

### Community 87 - "RULES.md"
Cohesion: 0.40
Nodes (4): دسترسی به فایل‌ها, قوانین غیرقابل مذاکره, نقش‌ها, گزارش‌دهی

### Community 88 - "ISSUES.md"
Cohesion: 0.50
Nodes (3): اولویت بالا 🔴, اولویت متوسط 🟡, اولویت پایین 🟢

### Community 89 - "📚 منابع و ابزار"
Cohesion: 0.50
Nodes (4): ابزارهای آینده, ابزارهای غیرفعال, ابزارهای فعال, 📚 منابع و ابزار

### Community 90 - "📊 وضعیت فعلی پروژه"
Cohesion: 0.50
Nodes (4): اطلاعات پایه, معماری فنی, وضعیت فعلی, 📊 وضعیت فعلی پروژه

### Community 91 - "🎓 قوانین طلایی"
Cohesion: 0.50
Nodes (4): برای ایجنت‌ها, برای من (Qwen), برای کاربر, 🎓 قوانین طلایی

### Community 92 - "🎯 موفقیت چگونه تعریف می‌شود؟"
Cohesion: 0.50
Nodes (4): بلندمدت (۶ ماه), 🎯 موفقیت چگونه تعریف می‌شود؟, میان‌مدت (۳ ماه), کوتاه‌مدت (۱ ماه)

### Community 93 - "📈 سیستم گزارش‌دهی"
Cohesion: 0.50
Nodes (4): 📈 سیستم گزارش‌دهی, گزارش روزانه (هر روز), گزارش فوری (در صورت نیاز), گزارش هفتگی (هر جمعه)

### Community 95 - "🔍 تحلیل گراف (Graphify)"
Cohesion: 0.67
Nodes (3): Community های ضعیف (نیاز به refactor), 🔍 تحلیل گراف (Graphify), وضعیت فعلی

### Community 96 - "🔄 تاریخچه به‌روزرسانی‌ها"
Cohesion: 0.67
Nodes (3): 🔄 تاریخچه به‌روزرسانی‌ها, ۱۰ آبان ۱۴۰۵ (۱ نوامبر ۲۰۲۶), ۶ آبان ۱۴۰۵ (۲۸ اکتبر ۲۰۲۶)

## Knowledge Gaps
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getInstance()` connect `Logger.ts` to `IconService.ts`, `getSupabaseClient`, `AISummaryService.ts`, `LandingView.ts`, `SoundManager`, `DashboardView.ts`, `iconHTML`, `AIQuizService.ts`, `Toast.ts`, `toPersianDigits`, `SettingsView.ts`, `FlashcardsView.ts`, `ChallengesView.ts`, `NotesView.ts`, `Logger`, `StreakService.ts`, `Errors.ts`, `Premium.ts`, `Database.ts`, `PremiumView.ts`, `State.ts`, `main.ts`, `AuthView.ts`, `SyncService.ts`, `EventBus.ts`, `Router.ts`, `createButton`, `Modal.ts`, `Layout.ts`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Should `IconService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11333333333333333 - nodes in this community are weakly interconnected._
- **Why does `🎯 MASTER PLAN — دانش‌یار پرو` connect `🎯 MASTER PLAN — دانش‌یار پرو` to `🔄 تاریخچه به‌روزرسانی‌ها`, `🚨 مشکلات اصلی (به ترتیب اولویت)`, `🤖 ایجنت‌ها و نقش‌ها`, `🔐 امنیت (همیشه فعال)`, `🎯 اهداف اصلی`, `🎯 فازهای اجرایی`, `📋 چک‌لیست روزانه`, `📚 منابع و ابزار`, `📊 وضعیت فعلی پروژه`, `🎓 قوانین طلایی`, `🎯 موفقیت چگونه تعریف می‌شود؟`, `📈 سیستم گزارش‌دهی`, `🔍 تحلیل گراف (Graphify)`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05442176870748299 - nodes in this community are weakly interconnected._
- **Why does `اقدامات refactor (به ترتیب اولویت)` connect `main.ts` to `Logger.ts`, `🔍 تحلیل گراف (Graphify)`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Should `AISummaryService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0753045404208195 - nodes in this community are weakly interconnected._
- **Should `LandingView.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07200929152148665 - nodes in this community are weakly interconnected._