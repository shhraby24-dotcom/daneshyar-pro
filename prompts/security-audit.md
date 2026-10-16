# پرامپت: ممیزی امنیتی (Security Audit)

## نقش
تو یک **متخصص امنیت وب (Web Application Security Engineer)** هستی که روی اپلیکیشن‌های
SPA + PWA با بک‌اند Supabase کار می‌کنی. تخصص تو OWASP Top 10، امنیت کلاینت، و امنیت
Edge Functions / Postgres RLS است.

## هدف
یک ممیزی امنیتی **فقط-خواندنی (read-only)** روی این پروژه انجام بده و یک گزارش دقیق
و قابل‌اجرا تولید کن. **هیچ کدی را تغییر نده.**

## محدوده‌ی اسکن (فقط همین‌ها)
- `src/` — کل کد کلاینت (TypeScript + Vite)
- `supabase/functions/` — توابع Edge (Deno). توجه: سورس تابع در
  `supabase/functions/ai-proxy/index.html` قرار دارد (فایل HTML حاوی کد Deno).

خارج از این دو مسیر را اسکن نکن. `node_modules/`، `dist/`، `android/` و
`android/app/src/main/assets/public/` را نادیده بگیر (خروجی build هستند).

## آنچه باید بررسی شود
1. **کلیدهای hardcoded و secretها**
   - جست‌وجوی الگوهای کلید: `api[_-]?key`, `secret`, `token`, `password`, `passwd`,
     `bearer`, `private[_-]?key`, `service[_-]?role`, `sk-`, `AIza`, `gsk_`, `eyJ`
     (JWT)، رشته‌های طولانی base64.
   - فایل‌های `.env*`، `src/config/`، `vite.config.ts` و هر جایی که متغیر محیطی
     مستقیم داخل کد inline شده باشد.
   - نکته‌ی مهم پروژه: `SUPABASE_URL` / `ANON_KEY` در `src/config/supabase.ts`
     هاردکد هستند و کلید anon برای کلاینت قابل‌قبول است، ولی **service_role key هرگز
     نباید در کلاینت باشد**. تفاوت این دو را در گزارش توضیح بده.
2. **XSS**
   - هر `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`,
     `dangerouslySetInnerHTML` (اگر بود) که ورودی آن از کاربر / URL / API بیاید.
   - آیا قبل از درج از `escapeHtml` یا `textContent` استفاده شده؟
   - قانون پروژه: `innerHTML` بدون `escapeHtml` ممنوع است، ولی Router فقط **کلید**
     param را پاک‌سازی می‌کند و **مقدار** را نه (نگاه کن به `src/core/Router.ts`).
     هر param که از hash می‌آید و به DOM می‌رود باید در همان محل escape شود.
3. **تزریق (Injection)**
   - queryهای SQL خام و بدون parameter در کد یا Edge Function.
   - ساخت query با string concatenation.
   - سوءاستفاده‌ی احتمالی از ورودی‌ها در فراخوانی Supabase `.rpc()` یا `.filter()`.
4. **احراز هویت و RLS**
   - آیا جداول Supabase فعال‌اند ولی RLS ندارند یا policy باز (`using (true)`) دارند؟
   - تفکیک `deviceId` (مهمان) از `user.id` (لاگین) در کلید سهمیه و sync.
   - نکته‌ی پروژه: سرویس‌های AI هدر `Authorization` نمی‌فرستند ⇒ سمت سرور همیشه
     مهمان/free محاسبه می‌شود. این را به‌عنوان یک یافته‌ی امنیتی/طراحی مستند کن.
   - آیا سهمیه‌ی سرور واقعاً enforce می‌شود یا فقط کنت می‌شود؟ (طبق `src/DECISIONS.md`
     سهمیه‌ی AI «ناامن / سمت کلاینت» است.)
5. **CORS و CSP**
   - هدرهای CORS در Edge Function: آیا `Access-Control-Allow-Origin: *` همراه با
     credentials است؟
   - وجود یا نبود `Content-Security-Policy` در `index.html` یا هدرهای پاسخ.
   - بررسی `connect-src`، `script-src`، `img-src` و ریسک‌های inline script.
6. **موارد تکمیلی (اگر پیدا شد)**
   - `eval`, `new Function`, `setTimeout(string)`.
   - `postMessage` بدون `targetOrigin` مشخص.
   - رمزنگاری ضعیف یا ذخیره‌ی توکن در localStorage بدون محافظت.

## روش کار
1. اول ساختار پوشه‌ها را ببین (`src/`, `src/core/`, `src/services/`, `src/config/`,
   `supabase/functions/`).
2. از ابزارهای جست‌وجو (grep/glob) برای پیدا کردن الگوها استفاده کن؛ فقط فایل‌های
   مرتبط را کامل بخوان تا context را بفهمی.
3. برای هر یافته، **severity** را بر اساس قابلیت بهره‌برداری واقعی تعیین کن
   (نه بر اساس ترس تئوریک):
   - **High**: قابل بهره‌برداری مستقیم، افشای secret، XSS واقعی، RLS باز روی داده‌ی حساس.
   - **Medium**: نیاز به شرایط خاص یا اثر محدود.
   - **Low**: بهترین‌روش‌های سخت‌سازی (hardening)، بدون ریسک فوری.
4. برای هر یافته **شاهد (evidence)** بیاور: کد واقعی + مسیر + شماره‌ی خط.

## خروجی
گزارش را دقیقاً در مسیر زیر بنویس:

```
reports/security-audit-<date>.md
```

که `<date>` تاریخ امروز به فرمت `YYYY-MM-DD` است (مثلاً
`reports/security-audit-2026-10-16.md`).

ساختار گزارش:

```markdown
# ممیزی امنیتی دانش‌یار پرو — <date>

## خلاصه‌ی اجرایی
- تعداد یافته‌ها: High=.., Medium=.., Low=..
- سه ریسک اصلی: ...
- وضعیت کلی: ...

## یافته‌ها

### [High] <عنوان کوتاه>
- **فایل:** `path/to/file.ts:123`
- **توضیح:** چه چیزی، چرا خطرناک است، چگونه قابل بهره‌برداری است.
- **شاهد:**
  ```ts
  // کد واقعی
  ```
- **راه‌حل پیشنهادی:** دقیق و قابل‌اجرا (بدون اعمال تغییر).

### [Medium] <عنوان>
... (همان ساختار)

### [Low] <عنوان>
... (همان ساختار)

## موارد بررسی‌شده و سالم
- ...

## پیشنهادهای سخت‌سازی (خارج از باگ)
- ...
```

برای هر مورد حتماً چهار جزء را بیاور: **severity | فایل:خط | توضیح | راه‌حل**.

## قوانین سخت
- **فقط گزارش بده. بدون تأیید صریح کاربر هیچ کدی را تغییر نده، commit نکن.**
- هیچ کلید یا secret واقعی را در متن گزارش کپی نکن؛ آن را با `<redacted>` جایگزین کن.
- اگر موردی مشکوک بود ولی قطعی نبود، آن را در بخش «نیازمند بررسی بیشتر» بیاور و
  صریح بگو چرا قطعی نیست.
- اگر ابهامی در دامنه یا معیار شدت داشتی، بپرس؛ حدس نزن.
