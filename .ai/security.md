# قوانین امنیتی دانش‌یار پرو

## ممنوعیت‌های مطلق ❌

1. **`innerHTML` با داده‌ی کاربر یا خروجی AI** — مگر بعد از `escapeHtml`. دلیل: XSS ذخیره‌شده کل `localStorage` (کلید BYOK، توکن Supabase، وضعیت پریمیوم) را لو می‌دهد.
2. **`eval` / `new Function` / `setTimeout('string')` / `document.write`** — ممیزی ۲۰۲۶-۱۰-۱۷ هیچ‌کدام را در `src/` نیافت؛ این صفر را صفر نگه دار.
3. **هاردکد secret** — `service_role` فقط با `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` در Edge Function (`ai-proxy/index.ts:226`). کلید `anon` در `src/config/supabase.ts` مجاز است (عمومی است) به شرط فعال بودن RLS.
4. **`Math.random()` برای شناسه‌ی مهم** — `deviceId` کلید سهمیه است؛ از `crypto.randomUUID()` استفاده کن (بدهی L5 هنوز در `AIQuizService.ts:57` باز است).
5. **حذف هدر `Authorization`** از فراخوانی‌های AI — بدون آن سرور همیشه free محاسبه می‌کند.
6. **کسر سهمیه قبل از پاسخ موفق مدل** — `deductQuota` فقط بعد از موفقیت (`index.ts:451`, `:554`).

## الگوهای امن ✅

```ts
// ✅ متن ساده
el.textContent = note.title;

// ✅ تگ + متن کاربر
el.innerHTML = `${iconHTML('trash')}<span>${escapeHtml(note.title)}</span>`;

// ❌ ناامن — عنوان یادداشت به‌عنوان HTML اجرا می‌شود
el.innerHTML = `<span>${note.title}</span>`;
```

`escapeHtml` از `@/ui/components/Modal` ایمپورت می‌شود (تنها منبع، دوباره نساز). آیکون‌ها فقط از `iconHTML()` / `createIcon()` که whitelist دارند.

## XSS Prevention

- **تاریخچه:** H1 (escapeHtml شکسته، جایگزینی no-op) و H2 (route/error بدون escape در `Router.ts`) در کامیت `7e537e1` رفع شدند. الان بدنه‌ی `escapeHtml` صحیح است (`&amp;` `&lt;` `&gt;` `&quot;` `&#39;`) و `Router.ts:22` آن را ایمپورت می‌کند.
- **قانون طلایی Router:** Router فقط **کلید** param را پاک‌سازی می‌کند (`Router.ts:459`)؛ **مقدار** خام می‌ماند ⇒ هر param از hash که به DOM می‌رود را خودت `escapeHtml` کن.
- **مودال:** `body.innerHTML = escapeHtml(content)` — اگر محتوا نیاز به HTML ندارد، `textContent` بهتر است.
- **تست رگرسیون:** برای هر تابع escape جدید، تست `<img src=x onerror=1>` بنویس.

## Input Validation

مرز اعتبارسنجی = Edge Function، نه کلاینت:

```ts
const deviceId = String(body.deviceId ?? "").trim();
if (!/^[a-zA-Z0-9-]{8,64}$/.test(deviceId)) return json({ ok:false, error:"deviceId نامعتبر" }, 400);
const text = String(body.text ?? "").slice(0, 6000);
```
- `task` فقط از whitelist (`quiz|summary|difficulty|insight`).
- سوالات مدل با `validateQuestion()` سمت سرور تأیید می‌شوند؛ خروجی مدل هرگز مستقیم رندر نشود.
- `importData`: اعتبارسنجی ساختار قبل از هر transaction.

## CORS و CSP

- CORS الان `Access-Control-Allow-Origin: "*"` است (`index.ts:8`) — ریسک باز H3. تا افزودن rate-limit per-IP (هدر `x-forwarded-for`) روی آن حساب باز نکن.
- **CSP وجود ندارد** (یافته M4): `index.html` متای CSP ندارد و GitHub Pages هدر نمی‌دهد ⇒ هر XSS آینده = دسترسی کامل. اگر CSP اضافه شد: `script-src 'self'` و هیچ‌گاه `unsafe-inline` برای script.

## چک‌لیست امنیتی قبل از commit

- [ ] هیچ `innerHTML` تازه‌ای بدون `escapeHtml`/`textContent` اضافه نشده
- [ ] هیچ `eval`/`new Function`/`document.write` اضافه نشده
- [ ] هیچ کلید/توکن در diff نیست (`git diff | grep -iE "api[_-]?key|secret|service_role"`)
- [ ] هر ورودی جدید در Edge Function هم اعتبارسنجی شده (نه فقط کلاینت)
- [ ] `Authorization` در فراخوانی‌های AI دست‌نخورده باقی مانده
- [ ] سهمیه بعد از موفقیت کسر می‌شود

آخرین به‌روزرسانی: ۲۰۲۶-۱۱-۰۴
