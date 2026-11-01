# Graph Report - daneshyar-pro  (2026-11-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1289 nodes · 3009 edges · 66 communities (36 shown, 30 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `518faa11`
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
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 52
- Community 54
- Community 55
- Community 56
- Community 57

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
- `registerViews()` --indirect_call--> `createAuthView()`  [INFERRED]
  src/main.ts → src/ui/views/AuthView.ts
- `longestConsecutiveStudyDays()` --calls--> `getDatabase()`  [EXTRACTED]
  src/services/RewardEngine.ts → src/core/Database.ts
- `registerViews()` --indirect_call--> `createDashboardView()`  [INFERRED]
  src/main.ts → src/ui/views/DashboardView.ts
- `registerViews()` --indirect_call--> `createLandingView()`  [INFERRED]
  src/main.ts → src/ui/views/LandingView.ts
- `purgeDemoData()` --calls--> `getDatabase()`  [EXTRACTED]
  src/main.ts → src/core/Database.ts

## Import Cycles
- None detected.

## Communities (66 total, 30 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (33): AfterEachHook, BeforeEachHook, DEFAULT_ROUTES, eventBus, logger, NavigateOptions, NavigationEvent, RouteConfig (+25 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (46): SUPABASE_ANON_KEY, SUPABASE_ENABLED, SUPABASE_URL, DifficultyResult, estimateCardDifficulty(), getOrCreateDeviceId(), getWeakTopicInsight(), heuristicDifficulty() (+38 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (43): config, dependencies, @capacitor/android@^8.5.0, @capacitor/cli@^8.5.0, @capacitor/core@^8.5.0, dexie@^4.4.4, lottie-web@^5.13.0, lucide@^1.33.0 (+35 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (27): AIPreserved, AISelfTest, AISummary, AISummaryOptions, AISummaryResult, AISummarySection, cacheKey(), getAISummary() (+19 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (35): DOCS, getLegalDoc(), getLegalDocs(), LegalDoc, LegalDocId, LegalSection, ButtonGroupOptions, ButtonOptions (+27 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (16): ConceptType, CONTENT_MULTIPLIERS, CreateCardData, EfficiencyAnalysis, Flashcard, ForecastEntry, getSRS(), logger (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (36): getDatabase(), createIcon(), iconHTML(), getReferralLink(), createButton(), getToast(), buildLoggedIn(), createChallengeCard() (+28 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (35): getRemainingQuota(), getTier(), checkAIQuota(), getQuotaInfo(), QuotaCheckResult, BUTTON_VARIANTS, createEmptyState(), createFormGroup() (+27 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (29): AI_TIMEOUT_MS, AIQuizService, AIResult, AITier, cacheKey(), GenerateHooks, getAIQuizService(), getOrCreateDeviceId() (+21 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (25): EventBusOptions, EventBusStats, EventCallback, EventObject, getInstance(), HistoryFilter, Listener, logger (+17 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (30): getState(), friendlyAIError(), getModal(), addXP(), ai, burstConfetti(), correctAnswerText(), createQuizView() (+22 more)

### Community 14 - "Community 14"
Cohesion: 0.16
Nodes (29): getRouter(), saveUserKeys(), getLastSync(), isSyncAvailable(), onSyncStatus(), buildFooter(), createChevron(), createSection() (+21 more)

### Community 15 - "Community 15"
Cohesion: 0.14
Nodes (28): addXP(), burstConfetti(), CONCEPT_STYLES, CONCEPT_TYPES, createFlashcardsView(), buildQueue(), closeReviewOverlay(), confirmExit() (+20 more)

### Community 16 - "Community 16"
Cohesion: 0.10
Nodes (20): getInstance(), LOG_COLORS, LOG_LEVELS, LogColor, LogEntry, LoggerOptions, LogLevel, ICON_MAP (+12 more)

### Community 17 - "Community 17"
Cohesion: 0.10
Nodes (12): ActiveModal, ConfirmOptions, escapeHtml(), eventBus, logger, ModalButton, ModalButtonType, ModalManager (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, baseUrl, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleDetection (+19 more)

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (26): appendHighlighted(), appendInline(), applyFilter(), applyMarkdown(), CATEGORIES, CATEGORY_STYLES, clearDraft(), countWords() (+18 more)

### Community 21 - "Community 21"
Cohesion: 0.15
Nodes (23): AR_DIGITS, DateInput, FA_DIGITS, faNum(), formatCountdown(), formatDateTime(), formatDuration(), formatPersianDate() (+15 more)

### Community 24 - "Community 24"
Cohesion: 0.13
Nodes (21): eventBus, getStreakService(), HeatmapDay, logger, Milestone, MILESTONE_MESSAGES, MilestoneCelebration, STREAK_MILESTONES (+13 more)

### Community 25 - "Community 25"
Cohesion: 0.09
Nodes (22): runs-on, steps, COMMIT_MSG, JOB_STATUS, RUN_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, jobs (+14 more)

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (20): AIServiceErrorOptions, AppErrorOptions, ERROR_CATEGORIES, ERROR_CODES, ERROR_SEVERITY, ErrorCategory, ErrorCode, errorHandler (+12 more)

### Community 28 - "Community 28"
Cohesion: 0.10
Nodes (20): jobs, update-graph, name, on, push, schedule, workflow_dispatch, permissions (+12 more)

### Community 29 - "Community 29"
Cohesion: 0.23
Nodes (18): activatePremium(), deactivatePremium(), getPremiumPlan(), isPremium(), tryPromo(), getSubscriptionInfo(), loadSubscription(), logger (+10 more)

### Community 31 - "Community 31"
Cohesion: 0.20
Nodes (16): buildDashScreen(), buildFocusScreen(), buildQuizScreen(), buildReviewScreen(), createFlashDemo(), createLandingView(), createLiveFlame(), createShowcase() (+8 more)

### Community 32 - "Community 32"
Cohesion: 0.11
Nodes (7): AIServiceError, AppError, NetworkError, NotFoundError, PermissionError, StorageError, TimeoutError

### Community 33 - "Community 33"
Cohesion: 0.16
Nodes (13): Achievement, DbFlashcard, DbNote, DbQuizResult, DbStats, DbStudySession, logger, LS_KEYS (+5 more)

### Community 35 - "Community 35"
Cohesion: 0.17
Nodes (15): formatToman(), getPremiumDaysLeft(), getPremiumExpiry(), logger, monthlyEquivalent(), PLANS, savingsPercent(), BUTTON_SIZES (+7 more)

### Community 36 - "Community 36"
Cohesion: 0.12
Nodes (13): AppInfo, AppState, DEFAULT_STATE, eventBus, logger, LS_KEYS, PERSIST_KEYS, SetOptions (+5 more)

### Community 37 - "Community 37"
Cohesion: 0.14
Nodes (12): CheckboxOptions, createInput(), createPasswordInput(), createSearchInput(), FormGroupOptions, InputOptions, PasswordInputOptions, RadioOptions (+4 more)

### Community 38 - "Community 38"
Cohesion: 0.18
Nodes (13): bootstrap(), createComingSoonView(), logger, purgeDemoData(), registerViews(), router, seedDemoData(), showFatalError() (+5 more)

### Community 41 - "Community 41"
Cohesion: 0.14
Nodes (12): AmbientNodes, AmbientResult, AmbientSoundId, AmbientSoundInfo, CustomSound, getSoundManager(), logger, NotificationSoundId (+4 more)

### Community 45 - "Community 45"
Cohesion: 0.18
Nodes (8): EVENTS, eventBus, getStorage(), logger, LS_KEYS, LSKey, StorageOptions, StorageStats

### Community 47 - "Community 47"
Cohesion: 0.29
Nodes (6): AI_CONFIG, AI_KEYS_LS, AI_LIMITS, AI_USAGE_LS, AITier, PREMIUM_LS

### Community 48 - "Community 48"
Cohesion: 0.48
Nodes (7): appendHighlighted(), openSearchPalette(), addItem(), group(), move(), paint(), run()

### Community 49 - "Community 49"
Cohesion: 0.53
Nodes (4): sanitize_message(), smart-commit.sh script, show_message(), strip_ansi()

### Community 52 - "Community 52"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, imports, @supabase/supabase-js

## Knowledge Gaps
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getInstance()` connect `Community 16` to `Community 0`, `Community 1`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 11`, `Community 13`, `Community 14`, `Community 15`, `Community 17`, `Community 20`, `Community 22`, `Community 24`, `Community 26`, `Community 29`, `Community 31`, `Community 33`, `Community 35`, `Community 36`, `Community 38`, `Community 41`, `Community 45`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06397306397306397 - nodes in this community are weakly interconnected._
- **Why does `SoundManager` connect `Community 5` to `Community 41`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07826694619147449 - nodes in this community are weakly interconnected._
- **Why does `iconHTML()` connect `Community 7` to `Community 0`, `Community 33`, `Community 1`, `Community 35`, `Community 37`, `Community 8`, `Community 43`, `Community 11`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 48`, `Community 20`, `Community 24`, `Community 27`, `Community 31`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05442176870748299 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.0753045404208195 - nodes in this community are weakly interconnected._