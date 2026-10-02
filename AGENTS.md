# AGENTS.md — دانش‌یار پرو

دانش‌یار پرو: اپ PWA/آندروید فارسی (Vite + TS + Tailwind v4 + Dexie + Supabase). UI، کامنت‌ها و پیام‌های commit فارسی‌اند؛ با همان زبان ادامه بده.

## دستورها (تأییدشده)

```bash
npm run dev      # dev server با پروکسی Gemini/Groq
npm run build    # tsc && vite build  → این تنها typecheck است
npm test         # vitest run (همه تست‌ها)
npx tsc --noEmit # typecheck تنها، بدون build
npx vitest run tests/premium.test.ts   # یک فایل تست
npm run deploy   # gh-pages -d dist
```

- **هیچ lint / formatter / pre-commit hook وجود ندارد** — دنبالش نگرد.
- ترتیب CI: `npm ci` → `npm run build` → `vitest run --passWithNoTests`، بعد نوتیفیکیشن تلگرام. پس build و تست باید هر دو پاس شوند.
- `tests/` داخل `tsconfig.include` نیست ⇒ **تست‌ها typecheck نمی‌شوند**. اگر سرویس را عوض کردی، تست را دستی چک کن.
- یک تست روی `main` **همین الان قرمز است**: `src/services/SRS.test.ts` → «پاسخ غلط کارت را ریست می‌کند» انتظار `repetitions === 0` دارد ولی SRS v2 (`src/services/SRS.ts:113`) به‌جای ریست، relearn درون‌روزی می‌کند. تست قدیمی است، نه باگ کد. قبل از «رفع» تست، مطمئن شو کدام‌ طرف stale است.

## معماری

- Entry: `src/main.ts` → bootstrap، رجیستر viewها، seed دمو. `DashboardView` و `AuthView` eager؛ بقیه lazy با `import()`.
- Routing: hash-based (`#/quiz?x=1`) — چون روی GitHub Pages زیر subpath و داخل WebView است. **از History API استفاده نکن.**
- قرارداد view: هر view یک `export async function create<Name>View(params): Promise<HTMLElement>` دارد و یک بار در `registerViews()` در `src/main.ts:126` ثبت می‌شود. برای افزودن صفحه‌ی جدید هر دو را با هم اضافه کن.
- `#/landing` استثناست: standalone بدون Layout و بدون Router (`src/main.ts:77`).
- Core = singleton: `Logger`, `EventBus`, `Storage`, `State`, `Router`, `Database`, `Errors` — با `getX()` بگیر، `new` نکن. ارتباط بین ماژول‌ها از راه `EventBus.EVENTS` (کلیدهای `foo:bar`)، نه import مستقیم.
- داده‌ی اصلی در Dexie (`src/core/Database.ts`) به‌علاوه‌ی localStorage. **افزودن جدول = `this.version(N).stores({...})` با N بعدی**؛ migration را دستی بنویس و `MIGRATION_FLAG` را در نظر بگیر.
- فقط alias `@/` واقعی است (→ `src/`). `tsconfig` aliasهای `@core/*`, `@services/*` و… را هم تعریف می‌کند ولی **Vite و Vitest ندارند** ⇒ در runtime می‌شکند. از `@/...` استفاده کن.
- Service Worker فقط در production ثبت می‌شود و با مسیر نسبی (`./sw.js`) — برای GitHub Pages لازم است.

## AI و Supabase

- سورس Edge Function در ریپو **`supabase/functions/ai-proxy/index.html`** است (فایل HTML حاوی کد Deno). هر تغییری آنجا باید دستی در داشبورد Supabase هم اعمال شود؛ repo جایگزین deploy نیست.
- کلاینت فقط `deviceId` می‌فرستد؛ **هیچ‌کدام از سرویس‌های AI هدر `Authorization` را نمی‌فرستند**. یعنی سمت سرور همیشه مهمان/free محاسبه می‌شود، حتی برای کاربر لاگین‌کرده و پریمیوم. اگر روی «سهمیه‌ی user.id» کار می‌کنی، اول این شکاف را ببین.
- در خود تابع هم `used` همیشه `0` است و قبل از فراخوانی مدل چک نمی‌شود ⇒ سهمیه‌ی سرور عملاً enforce نمی‌شود (فقط کنتش می‌شود). طبق `src/DECISIONS.md` سهمیه‌ی AI هنوز «ناامن / سمت کلاینت» است.
- AI کلاینت: کش روزانه (`daneshyar_ai_quiz_cache`) یعنی درخواست تکراری همان متن، آنی و بدون مصرف سهمیه برمی‌گردد. timeout کلاینت ۱۲۰ ثانیه (`AI_TIMEOUT_MS`).
- کلیدها: `VITE_GEMINI_KEY` / `VITE_GROQ_KEY` فقط برای dev؛ مسیر اصلی BYOK است. `SUPABASE_URL`/`ANON_KEY` در `src/config/supabase.ts` هاردکد است و `.env` در ریپو نیست.

## گردش کار

- هر بخش = ۱۰-۱۴ روز تقویمی؛ هر ماه ۱ هفته Buffer.
- Done = کاربر واقعاً استفاده کند، بدون crash (تست پاس ≠ done).
- هر روز `git commit`، پایان هر بخش `git tag` (الگوی فعلی: `v1.4.0-referral`, `v2.6.0-flashcards-zen`).
- هر تصمیم فنی → `src/DECISIONS.md` (توجه: داخل `src/` است، نه ریشه).
- `test_out.txt` در ریشه، آرتیفکت خالی و untracked است؛ commit نکن.

## الگوهای کدنویسی

- `activatePremium` باید **افزایشی** باشد نه جایگزینی: مبنا = `max(expiry موجود, now)`. جایگزینی یعنی از دست دادن روزهای پریمیوم کاربر — با `tests/premium.test.ts` و کامیت `ab27991`_guard شده.
- سهمیه فقط **بعد از موفقیت** کسر شود (کلاینت از `remaining` سرور sync می‌کند، نه از شمارش دستی).
- `deviceId` برای مهمان، `user.id` برای لاگین — کلید سهمیه و sync باید این تفکیک را رعایت کند.
- Router فقط **کلید** param را پاک‌سازی می‌کند (`src/core/Router.ts:459`)؛ **مقدار** param پاک‌سازی نمی‌شود ⇒ هر param از hash که در DOM می‌رود، خودت escape کن.

## ممنوعیت‌ها

- `innerHTML` بدون `escapeHtml` ممنوع — پروژه innerHTML زیاد دارد، پس این قانون واقعاً زیر سؤال می‌رود. `textContent` یا ساخت DOM امن‌تر است.
- کسر سهمیه قبل از موفقیت ممنوع.
- `Math.random` برای شناسه‌های مهم ممنوع (فقط برای fuzz/jitter بی‌اهمیت مثل `SRS.ts:145` مجاز).
- تغییر `android/app/src/main/assets/public/` دستی ممنوع؛ خروجی build است. `npx cap sync` بزن (اسکریپت npm برایش وجود ندارد).
- `dist/` و `node_modules/` را commit نکن (`.gitignore` هستند).