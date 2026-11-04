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

اندازه‌گیری ۲۰۲۶-۱۱-۰۴ (۱۴۷۱ نود / ۳۱۹۷ یال / ۱۰۱ community، معیار: سهم یال درونی از کل یال‌های عضو):

- **C37 — cohesion 0.22؛ ۱۶ نود:** `bootstrap()` + `DemoDataService` + `TrialService` + `Layout`. بعد از استخراج DemoDataService هنوز composition root است. قدم بعدی: متمرکزکردن سیم‌کشی سرویس‌ها در `bootstrapServices()` تا `main.ts` فقط orchestrator بماند.
- **C28 — 0.12؛ ۱۳ نود:** حول `getRouter()`. جداکردن قراردادهای تایپ روتر از رانتایم، یا قطع import مستقیم سرویس‌ها به روتر (ایونت از `EventBus`) این را می‌شکند.
- **C69 — 0.11؛ ۱۱ نود:** ضعیف‌ترین فعلی؛ نودهای پراکنده‌ی بدون همسایگی. با `graphify explain "<node>"` ببین کدام‌اند؛ معمولاً متادیتا/type هستند، نه ماژول.
- **الگوی تکرارشونده:** هر communityای که حول یک **singleton پرمصرف** (Logger, iconHTML, getDatabase) ساخته شود کم‌انسجام است — این artifact الگوی singleton است، نه بوی معماری. برای همین Cهای UI-kit را نشکن.

## کارهای در حال انجام

- فاز ۱ تمام؛ گراف با اتوماسیون GitHub Actions (`graphify-update.yml`) خودکار به‌روز می‌شود.
- فایل‌های Rule در `.ai/` تازه اضافه شده‌اند (همین مجموعه).

## Workaround های فعلی

1. **`escapeHtml` قبلاً شکسته بود** (no-op) — در `7e537e1` اصلاح شد. تا وقتی تست رگرسیون ندارد، در هر تغییر `Modal.ts` دوباره چشمی چک کن.
2. **`deviceId` با `Math.random`** ساخته می‌شود (`AIQuizService.ts:57`) — بدهی L5. `crypto.randomUUID()` جایگزین امن است و regex سرور قبولش می‌کند.
3. **CORS باز `*`** روی ai-proxy — تا افزودن rate-limit per-IP، سهمیه‌ی مهمان با چرخاندن deviceId دور زدنی است.
4. **پریمیوم آفلاین** با `daneshyar_premium=1` قابل دست‌کاری است — پذیرفته‌شده؛ گیت واقعی `subscriptions` سمت سرور است.
5. **merge تعارض‌دار `graphify-out/`** بعد از هر push: فایل‌ها تولیدشده‌اند؛ به‌جای merge دستی، `graphify update .` بزن (به `.ai/checklist.md` نگاه کن).

آخرین به‌روزرسانی: ۲۰۲۶-۱۱-۰۴
