# احراز هویت و سهمیه

## سطوح کاربر

| سطح | تشخیص | کلید سهمیه | سقف روزانه |
|---|---|---|---|
| مهمان | بدون هدر `Authorization` | `deviceId` (`daneshyar_device_id`) | ۳ (سرور) |
| وارد شده | JWT معتبر Supabase | `user.id` | ۳ مگر اشتراک فعال |
| BYOK | کلید شخصی در `daneshyar_ai_keys` | — | ۲۰ (فقط کلاینت) |
| پریمیوم | `subscriptions.expires_at > now` | `user.id` | ۱۰۰ |

اعداد سرور: `FREE_LIMIT=3`، `PREMIUM_LIMIT=100`، `RATE_LIMIT_MS=6000` (`supabase/functions/ai-proxy/index.ts:23-25`).اعداد کلاینت (فقط برای نمایش): `TIER_LIMITS = { free:3, byok:20, premium:100 }` در `AIQuizService.ts:34`. **منبع حقیقت سرور است**؛ عدد کلاینت را با `syncRemaining(remaining)` از پاسخ سرور بازنویسی کن، هرگز دستی نشمار.

## جریان احراز هویت

```ts
// src/services/AuthService.ts:17-23 — تک کلاینت، تنها نقطه‌ی ساخت
client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
```
- همه‌ی سرویس‌ها (Sync, Referral, Payment, AI) باید از `getSupabaseClient()` بگیرند — **هرگز `createClient` جدیدی در سرویس نساز** (دو کلاینت = دو نشست و توکن ناهم‌زمان).
- `persistSession: true` یعنی توکن در localStorage است ⇒ امنیتش به XSS بند است (به `.ai/security.md` نگاه کن).
- refresh توکن خودکار است؛ کد دستی برای refresh ننویس.

## سیستم سهمیه

```ts
// index.ts:232-240 — تعیین کلید سهمیه
const authHeader = req.headers.get("Authorization");
if (authHeader) {
  const { data: { user } } = await anon.auth.getUser();
  if (user) quotaKey = user.id;   // ← سوییچ از deviceId به user.id
}
```
- رکورد در جدول `ai_usage` با کلید `(device_id, usage_date)`.
- **ضد چرخاندن deviceId:** هر `user_id` در روز حداکثر **۵** دستگاه (`MAX_DEVICES_PER_USER=5`)؛ مارکرها با پیشوند `dev:` در همان جدول ثبت می‌شوند.
- race شناخته‌شده (M3): خواندن/نوشتن غیراتمیک است ⇒ راه‌حل درست RPC اتمیک `increment_ai_usage` است، نه شمارش در JS.
- rate-limit ۶ ثانیه‌ای **per quotaKey** است، نه per-IP (H3 باز).

## نکات مهم

**`activatePremium` افزایشی است، هرگز جایگزینی:**

```ts
// src/services/Premium.ts:46-59
baseMs = currentExpMs > Date.now() ? currentExpMs : Date.now();  // مبنا = max(انقضا, اکنون)
const exp = new Date(baseMs + days * 86400000).toISOString();
```
جایگزینی = سوزاندن روزهای باقی‌مانده‌ی کاربر. با `tests/premium.test.ts` و کامیت `ab27991` گارد شده — این تست را حذف یا شل نکن.

- **۵ دستگاه:** سقف سخت‌گیرانه‌ی سرور برای هر `user.id`؛ اگر کاربر دستگاه عوض کند سهمیه‌اش اشتراکی است نه مضاعف.
- **تفکیک کلید:** مهمان = `deviceId`، لاگین = `user.id`. هر قابلیت جدید سهمیه‌دار باید همین تفکیک را رعایت کند.
- **پریمیوم آفلاین قابل جعل است** (`daneshyar_premium=1`) — پذیرفته‌شده برای PWA آفلاین؛ گیت‌های سرور (`subscriptions`) تنها مرجع واقعی‌اند.
- `TrialService` کلیدهای `daneshyar_trial_start` را نگه می‌دارد؛ سقف و انقضا را در `checkTrialExpiry()` ببین.
- `QuotaGate.checkAIQuota()` پیش‌بررسی UI است، نه enforce.

آخرین به‌روزرسانی: ۲۰۲۶-۱۱-۰۴
