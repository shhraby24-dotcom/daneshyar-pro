# Debt فنی و Workaround ها

> ⚠️ شماره‌ی communityها با هر بازسازی گراف عوض می‌شود. هرجا عدد می‌بینی، تاریخ اندازه‌گیری هم بخوان.

## مشکلات شناخته‌شده

### تست‌ها
- `AGENTS.md` می‌گوید `src/services/SRS.test.ts` روی main قرمز است (انتظار `repetitions === 0` در برابر relearn درون‌روزی `SRS.ts:113`). در اجرای ۲۰۲۶-۱۱-۰۱ **پاس شد** ⇒ آن ادعا کهنه است؛ قبل از «رفع»، ببین کدام طرف stale است.
- قرمزی واقعیِ مشاهده‌شده: `tests/premium.test.ts > tryPromo rejecting invalid code` که در اجرای کامل با **timeout ۵ ثانیه** می‌افتد و ایزوله پاس می‌شود (۳.۱s) ⇒ تست فِلِکی زیر بار است، نه باگ کد. اگر مرتب تکرار شد، `testTimeout` را بالا ببر، تست را شل نکن.
- `tests/` در `tsconfig.include` نیست ⇒ تست‌ها typecheck نمی‌شوند. تغییر سرویس = بررسی دستی تست.

### Edge Function drift
- سورس واقعی: `supabase/functions/ai-proxy/index.ts` (نه `index.html` که `AGENTS.md` می‌گوید).
- `smooth-responder` و `ensure-profile` از کلاینت صدا زده می‌شوند اما **سورسی در ریپو ندارند** ⇒ ممیزی سرور ناقص است.
- تسک `promo` در `index.ts` پیاده نشده؛ نسخه‌ی deploy شده احتمالاً دارد ⇒ نسخه‌ی مستقر با ریپو یکی نیست.
- هر تغییر در `index.ts` باید **دستی** در داشبورد Supabase هم اعمال شود؛ ریپو جایگزین deploy نیست.

## TODO های مهم

### P1 (بحرانی)
- `src/core/Storage.ts:164` — خطای `QuotaExceededError` فقط لاگ می‌شود و به کاربر پیامی نمی‌رسد ⇒ **از دست رفتن بی‌صدای داده**. راه‌حل: toast هشدار + پیشنهاد پاک‌سازی.

### P2 (مهم)
- `src/core/State.ts:265` و `:791` — بارگذاری/ذخیره‌ی state روی `localStorage` به‌جای IndexedDB.
- `src/services/StreakService.ts:358` — `getAvailableFreezes()` همیشه `0`؛ قابلیت freeze پریمیوم نیمه‌تمام (پیش‌فرض امن است، کرش نمی‌دهد).

### P3 (کم)
- `src/services/RewardEngine.ts:103` — نشان `guardian_365` باید تخفیف اشتراک بدهد؛ به Premium وصل نشده.

## Community های ضعیف گراف

اندازه‌گیری ۲۰۲۶-۱۱-۰۴ بعد از refactor پومودورو (**۱۵۲۸ نود / ۳۲۹۱ یال / ۱۱۴ community**، معیار: سهم یال درونی از کل یال‌های عضو، مستقیم از `graph.json`):

- **C0 قبلی شکست** ⇒ `C2` (PomodoroService، ۲۰ نود، ۰.۷۳)، `C22` (Router، ۲۵ نود، ۰.۸۰)، `C101` (FocusAudioService، ۱۴ نود، ۰.۸۱). گزارش کامل: `.ai/reports/eventbus-refactor-success.md`
- **C14 — ۰.۱۹؛ ۱۰ نود:** `SettingsView` (۹ نود) + یک نود `Premium`.
- **C9 — ۰.۲۰؛ ۱۴ نود:** `FlashcardsView` (۱۳) + یک نود `SRS`.
- **C12 — ۰.۲۲؛ ۲۴ نود:** `PremiumView` (۱۷) + `Premium` (۳) + `ChallengesView` (۲).
- **C32 — ۰.۲۹؛ ۲۹ نود:** `main.ts` (۱۰) + `AutoRewardWatcher` (۵) + `DemoDataService` (۳) — همان composition root؛ قدم بعدی `bootstrapServices()`.
- **C45 — ۰.۲۶؛ ۱۲ نود:** `LegalService` (۷) + `LegalView` (۳) + hub artifact `getRouter()`.
- **C38 — ۰.۲۹؛ ۳۷ نود:** `Button` (۱۴) + `RewardEngine` (۹) + `Logger` (۸) — artifact سینگلتون/UI-kit.

**الگوی تکرارشونده:** سه ضعیف‌ترین (C14, C9, C12) هر کدام **یک view تنها** هستند که فقط از طریق singletonهای سراسری به بقیه وصل‌اند. این «spoke» بودن است نه کوپلینگ بد ⇒ refactor لازم نیست.
**مهم:** شماره‌گذاری `GRAPH_REPORT.md` با `graph.json` یکسان نیست (report خوشه‌های نازک را حذف و دوباره شماره‌گذاری می‌کند) — برای تصمیم‌گیری از `graph.json` استفاده کن.

## کارهای در حال انجام

- فاز ۱ تمام؛ گراف با اتوماسیون GitHub Actions (`graphify-update.yml`) خودکار به‌روز می‌شود.
- فایل‌های Rule در `.ai/` تازه اضافه شده‌اند (همین مجموعه).

## Workaround های فعلی

1. **`escapeHtml` قبلاً شکسته بود** (no-op) — در `7e537e1` اصلاح شد. تا وقتی تست رگرسیون ندارد، در هر تغییر `Modal.ts` دوباره چشمی چک کن.
2. **`deviceId` با `Math.random`** ساخته می‌شود (`AIQuizService.ts:57`) — بدهی L5. `crypto.randomUUID()` جایگزین امن است و regex سرور قبولش می‌کند.
3. **CORS باز `*`** روی ai-proxy — تا افزودن rate-limit per-IP، سهمیه‌ی مهمان با چرخاندن deviceId دور زدنی است.
4. **پریمیوم آفلاین** با `daneshyar_premium=1` قابل دست‌کاری است — پذیرفته‌شده؛ گیت واقعی `subscriptions` سمت سرور است.
5. **merge تعارض‌دار `graphify-out/`** بعد از هر push: فایل‌ها تولیدشده‌اند؛ به‌جای merge دستی، `graphify update .` بزن (به `.ai/checklist.md` نگاه کن).

آخرین به‌روزرسانی: ۲۰۲۶-۱۱-۰۴ (بعد از EventBus refactor)
