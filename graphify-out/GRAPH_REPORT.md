# Graph Report - daneshyar-pro  (2026-10-30)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1266 nodes · 2989 edges · 62 communities (34 shown, 28 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ab6e05ed`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 46
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53

## God Nodes (most connected - your core abstractions)
1. `iconHTML()` - 80 edges
2. `toPersianDigits()` - 76 edges
3. `createIcon()` - 65 edges
4. `createButton()` - 54 edges
5. `getToast()` - 49 edges
6. `getInstance()` - 47 edges
7. `getDatabase()` - 44 edges
8. `SoundManager` - 43 edges
9. `DatabaseService` - 43 edges
10. `getRouter()` - 40 edges

## Surprising Connections (you probably didn't know these)
- `longestConsecutiveStudyDays()` --calls--> `getDatabase()`  [EXTRACTED]
  src/services/RewardEngine.ts → src/core/Database.ts
- `registerViews()` --indirect_call--> `createLandingView()`  [INFERRED]
  src/main.ts → src/ui/views/LandingView.ts
- `registerViews()` --indirect_call--> `createAuthView()`  [INFERRED]
  src/main.ts → src/ui/views/AuthView.ts
- `registerViews()` --indirect_call--> `createDashboardView()`  [INFERRED]
  src/main.ts → src/ui/views/DashboardView.ts
- `StreakService` --references--> `DatabaseService`  [EXTRACTED]
  src/services/StreakService.ts → src/core/Database.ts

## Import Cycles
- None detected.

## Communities (62 total, 28 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (120): getDatabase(), getRouter(), getState(), purgeDemoData(), seedDemoData(), friendlyAIError(), saveUserKeys(), getCurrentUser() (+112 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (34): AfterEachHook, BeforeEachHook, DEFAULT_ROUTES, eventBus, logger, NavigateOptions, NavigationEvent, RouteConfig (+26 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (14): getStorage(), AmbientNodes, AmbientResult, AmbientSoundId, AmbientSoundInfo, CustomSound, getSoundManager(), logger (+6 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (13): Router, ActiveModal, ConfirmOptions, escapeHtml(), eventBus, logger, ModalButton, ModalButtonType (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (43): SUPABASE_ANON_KEY, SUPABASE_ENABLED, SUPABASE_URL, DifficultyResult, estimateCardDifficulty(), getOrCreateDeviceId(), getWeakTopicInsight(), heuristicDifficulty() (+35 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (45): CheckboxOptions, createInput(), createPasswordInput(), createSearchInput(), FormGroupOptions, InputOptions, PasswordInputOptions, RadioOptions (+37 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (43): config, dependencies, @capacitor/android@^8.5.0, @capacitor/cli@^8.5.0, @capacitor/core@^8.5.0, dexie@^4.4.4, lottie-web@^5.13.0, lucide@^1.33.0 (+35 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (36): ConceptType, CONTENT_MULTIPLIERS, CreateCardData, EfficiencyAnalysis, Flashcard, ForecastEntry, getSRS(), logger (+28 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (36): DOCS, getLegalDoc(), getLegalDocs(), LegalDoc, LegalDocId, LegalSection, BUTTON_SIZES, ButtonGroupOptions (+28 more)

### Community 11 - "Community 11"
Cohesion: 0.14
Nodes (8): appendHighlighted(), openSearchPalette(), addItem(), group(), move(), paint(), run(), Layout

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, baseUrl, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleDetection (+19 more)

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (12): getSummarizer(), LEVEL_RATIOS, logger, PERSIAN_STOPWORDS, ScoredSentence, SIGNAL_SCORES, SIGNAL_WORDS, SignalCategory (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (23): AR_DIGITS, DateInput, FA_DIGITS, faNum(), formatCountdown(), formatDateTime(), formatDuration(), formatPersianDate() (+15 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (18): getInstance(), LOG_COLORS, LOG_LEVELS, LogColor, LogEntry, LoggerOptions, LogLevel, ICON_MAP (+10 more)

### Community 18 - "Community 18"
Cohesion: 0.21
Nodes (21): activatePremium(), deactivatePremium(), getPremiumDaysLeft(), getPremiumExpiry(), getPremiumPlan(), isPremium(), logger, tryPromo() (+13 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (22): runs-on, steps, COMMIT_MSG, JOB_STATUS, RUN_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, jobs (+14 more)

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (19): AIServiceErrorOptions, AppErrorOptions, ERROR_CATEGORIES, ERROR_CODES, ERROR_SEVERITY, ErrorCategory, ErrorCode, ErrorListener (+11 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (15): EventBusOptions, EventBusStats, EventCallback, EventObject, EVENTS, HistoryFilter, Listener, logger (+7 more)

### Community 23 - "Community 23"
Cohesion: 0.17
Nodes (16): getInstance(), bootstrap(), createComingSoonView(), logger, registerViews(), router, showFatalError(), state (+8 more)

### Community 25 - "Community 25"
Cohesion: 0.16
Nodes (17): AI_TIMEOUT_MS, AIQuizService, AIResult, AITier, cacheKey(), GenerateHooks, getAIQuizService(), getOrCreateDeviceId() (+9 more)

### Community 26 - "Community 26"
Cohesion: 0.13
Nodes (17): BUTTON_VARIANTS, hidePaywall(), logger, showPaywall(), addXP(), ai, burstConfetti(), correctAnswerText() (+9 more)

### Community 27 - "Community 27"
Cohesion: 0.11
Nodes (14): AppInfo, AppState, DEFAULT_STATE, eventBus, logger, LS_KEYS, PERSIST_KEYS, QuizResult (+6 more)

### Community 28 - "Community 28"
Cohesion: 0.11
Nodes (7): AIServiceError, AppError, NetworkError, NotFoundError, PermissionError, StorageError, TimeoutError

### Community 30 - "Community 30"
Cohesion: 0.18
Nodes (16): createTextarea(), aiWordCount(), countWords(), buildNoteContent(), renderActions(), renderInputCard(), renderResults(), renderStats() (+8 more)

### Community 31 - "Community 31"
Cohesion: 0.20
Nodes (15): AIPreserved, AISelfTest, AISummary, AISummaryOptions, AISummaryResult, AISummarySection, cacheKey(), getAISummary() (+7 more)

### Community 32 - "Community 32"
Cohesion: 0.17
Nodes (12): Challenge, ChallengeCategory, CHALLENGES, ChallengeStatus, getChallengesWithStatus(), logger, longestConsecutiveStudyDays(), CATEGORY_META (+4 more)

### Community 33 - "Community 33"
Cohesion: 0.19
Nodes (12): Achievement, DbFlashcard, DbNote, DbQuizResult, DbStats, DbStudySession, logger, LS_KEYS (+4 more)

### Community 34 - "Community 34"
Cohesion: 0.22
Nodes (14): getSession(), requestPayment(), formatToman(), monthlyEquivalent(), PLANS, savingsPercent(), BENEFITS, COMPARISON (+6 more)

### Community 35 - "Community 35"
Cohesion: 0.14
Nodes (12): AnalysisResult, DIFFICULTY_LEVELS, DifficultyLevel, GenerateOptions, getQuizGenerator(), logger, QUESTION_TYPES, QuizHistoryEntry (+4 more)

### Community 40 - "Community 40"
Cohesion: 0.42
Nodes (10): getRemainingQuota(), getTier(), checkAIQuota(), getQuotaInfo(), QuotaCheckResult, createSummarizerView(), engineBadge(), generate() (+2 more)

### Community 42 - "Community 42"
Cohesion: 0.22
Nodes (7): eventBus, logger, TOAST_TYPES, ToastData, ToastOptions, ToastType, ToastTypeConfig

### Community 43 - "Community 43"
Cohesion: 0.29
Nodes (6): AI_CONFIG, AI_KEYS_LS, AI_LIMITS, AI_USAGE_LS, AITier, PREMIUM_LS

### Community 44 - "Community 44"
Cohesion: 0.53
Nodes (4): sanitize_message(), smart-commit.sh script, show_message(), strip_ansi()

### Community 46 - "Community 46"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, imports, @supabase/supabase-js

## Knowledge Gaps
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getInstance()` connect `Community 16` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 14`, `Community 17`, `Community 18`, `Community 20`, `Community 22`, `Community 23`, `Community 25`, `Community 26`, `Community 27`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 42`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.053763440860215055 - nodes in this community are weakly interconnected._
- **Why does `iconHTML()` connect `Community 0` to `Community 1`, `Community 33`, `Community 34`, `Community 4`, `Community 5`, `Community 7`, `Community 40`, `Community 11`, `Community 16`, `Community 26`, `Community 30`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05267778753292362 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06578947368421052 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.05878084179970972 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._