# تحلیل Community C1 برای Refactor

## خلاصه

⚠️ **فرض مأموریت منسوخ است.** در گراف فعلی (بازسازی ۲۰۲۶-۱۱-۰۴ پس از refactor پومودورو، **۱۵۲۸ نود / ۱۱۴ community**):

| ادعای مأموریت | واقعیت `graph.json` |
|---|---|
| C1 = mega community، ۵۴ نود، cohesion ۰.۰۷ | **C1 = فقط `src/services/SoundManager.ts`، ۴۲ نود، cohesion ۰.۹۸** |
| شامل AI + Auth + Payment + Sync | این سرویس‌ها در **۷ community جدا** پخش‌اند (جدول پایین) |

- **نتیجه‌ی فوری: برای C1 «refactor لازم نیست»** — با انسجام ۰.۹۸ یکی از منسجم‌ترین خوشه‌های پروژه است.
- mega community واقعی امروز **C13** است: ۱۰۵ نود، cohesion ۰.۵۱ — و محتوایش **UI** است، نه سرویس‌های AI/Auth.

## تحلیل وابستگی‌ها

Community هر سرویس (اندازه + انسجام از `graph.json`):

| فایل | Community | نود خوشه | Cohesion | Imports → | Imported by ← |
|---|---|---|---|---|---|
| `AISummaryService.ts` | C6 | ۱۶ | ۰.۶۵ | AuthService, Logger, Summarizer | SummarizerView |
| `AIQuizService.ts` | C52 | ۲۰ | ۰.۵۶ | AuthService, Logger, QuizGenerator | QuizView, QuotaGate, SettingsView, SummarizerView |
| `AIFlashcardService.ts` | C108 | ۹ | ۰.۳۰ | AuthService, Logger, SRS | FlashcardsView |
| `AuthService.ts` | C95 | ۱۸ | ۰.۳۵ | Logger, supabase.ts | **۱۰ فایل** (همه‌ی AIها، Payment, Referral, Sync, Subscription, AuthView, PremiumView, SettingsView) |
| `config/supabase.ts` | C95 | ۱۸ | ۰.۳۵ | — | AuthService, SyncService |
| `AuthView.ts` | C95 | ۱۸ | ۰.۳۵ | ۱۱ فایل از جمله AuthService, ReferralService, SubscriptionService, SyncService, Router | main.ts |
| `PaymentService.ts` | C3 | ۱۹ | ۰.۳۶ | AuthService, Logger, Premium | PremiumView |
| `ReferralService.ts` | C3 | ۱۹ | ۰.۳۶ | AuthService, Logger | AuthView, FlashcardsView, InviteView, main.ts |
| `SyncService.ts` | C94 | ۱۸ | ۰.۴۱ | AuthService, Database, Logger, supabase.ts | AuthView, SettingsView, main.ts |
| `Premium.ts` | C10 | ۲۶ | ۰.۴۸ | Logger | ۱۲ فایل (تقریباً همه‌ی viewها + main + تست) |
| `SubscriptionService.ts` | C10 | ۲۶ | ۰.۴۸ | AuthService, Logger, Premium, TrialService | AuthView, PremiumView, SettingsView, main.ts |
| `TrialService.ts` | C10 | ۲۶ | ۰.۴۸ | Logger, Premium | SubscriptionService, main.ts, premium.test.ts |
| `QuotaGate.ts` | C13 | ۱۰۵ | ۰.۵۱ | AIQuizService | QuizView, SummarizerView |

**آیا واقعاً وابسته‌اند یا فقط co-occur؟**
- **وابستگی واقعی:** هر سرویس AI/Payment/Sync → `AuthService` (برای کلاینت و نشست). این تنها کوپلینگ واقعی و مشروع است.
- **فقط co-occur:** بقیه‌ی چسبندگی از `Logger` می‌آید که **همه** استفاده می‌کنند (singleton سراسری). این ابزار clustering را گمراه می‌کند.
- **تنها hub واقعی:** `AuthService` با **۱۰ واردکننده** — این معماری است، نه بوی کد؛ ولی بزرگ‌ترین گلوگاه هم همین است.

## پیشنهاد ساختار جدید

### Community پیشنهادی ۱: AI Services — **توصیه: ادغام نشود**
- فایل‌ها: `AIQuizService`, `AISummaryService`, `AIFlashcardService`, `QuotaGate`
- Cohesion فعلی مجموع: ۰.۳۰–۰.۶۵ — هر کدام خوشه‌ی مستقل خودش را دارد
- دلیل: هیچ یالی بین سه سرویس AI نیست (فقط هر سه به AuthService وصل‌اند) ⇒ ادغام مصنوعی، بدون سود

### Community پیشنهادی ۲: Auth — **توصیه: تنها refactor با ارزش واقعی**
- فایل‌ها: `AuthService` + `AuthView` + `config/supabase.ts` (الان C95، cohesion ۰.۳۵)
- مشکل: `AuthService` سه مسئولیت دارد — ساخت کلاینت، عملیات auth، و re-export نوع
- پیشنهاد: جدا کردن `supabaseClient.ts` (factory) از `AuthService.ts` (signUp/signIn/getSession/onAuthChange). اثر: hub از ۱۰ واردکننده به ۲ hub کوچک‌تر تقسیم می‌شود
- Cohesion تخمینی: ۰.۳۵ → بالای ۰.۶

### Community پیشنهادی ۳: Billing (الان C10، ۰.۴۸)
- فایل‌ها: `Premium`, `SubscriptionService`, `TrialService` — از قبل منسجم و درست است
- Cohesion: ۰.۴۸ کافی است؛ `Premium` را همه‌ی viewها می‌خوانند ⇒ عدد پایین طبیعی است

### Community پیشنهادی ۴: Payment/Referral (الان C3، ۰.۳۶)
- `PaymentService` + `ReferralService` هر دو فقط `AuthService` مشترک دارند؛ ارتباط منطقی‌شان ضعیف است
- Cohesion قابل قبول؛ شکستن آن سود عملی ندارد

### Community پیشنهادی ۵: Sync (الان C94، ۰.۴۱)
- `SyncService` مستقل و منسجم است؛ فقط به `AuthService`/`Database` وابسته

### Community پیشنهادی ۶: Supabase Config — **انجام نشود**
- `config/supabase.ts` فقط دو ثابت export می‌کند و فقط ۲ واردکننده دارد؛ خوشه‌ی مستقل ساختن برای ۲ ثابت، نویز است

## ریسک‌ها

۱. **شکستن `AuthService`** — ۱۰ فایل واردکننده؛ اگر API تغییر کند، کل مسیر auth/AI/payment می‌شکند. احتمال: متوسط، تأثیر: بالا. Mitigation: فقط *جدا کردن فایل* بدون تغییر سطح API (`export { getSupabaseClient } from './supabaseClient'`).
۲. **شماره‌گذاری ناپایدار communityها** — در همین بازسازی، C1 معنی‌اش عوض شد (SoundManager). Mitigation: هیچ تصمیمی را به شماره گره نزن؛ به فایل‌ها گره بزن.
۳. **رانش انسجام پس از هر rebuild** — اعداد ±۰.۱ نوسان دارند. Mitigation: فقط روند را ببین، نه رقم دقیق.
۴. **`Premium` به‌عنوان hub ۱۲-واردکننده‌ای** — هر refactor جدی روی پریمیوم، سطح تماس بزرگی دارد؛ با تست `tests/premium.test.ts` محافظت می‌شود.

## توصیه

**برای C1: refactor لازم نیست** (cohesion ۰.۹۸). برای خوشه‌ی سرویس‌هایی که مأموریت فرض کرده بود mega باشند: آن‌ها **همین حالا** به ۷ خوشه شکسته‌اند و ادغام یا شکستن بیشتر سودی ندارد.

تنها کار با ارزش واقعی: **جدا کردن ساخت کلاینت Supabase از `AuthService`** (`C95`، cohesion ۰.۳۵، hub با ۱۰ واردکننده). این refactor کوچک، سطح تماس را کم می‌کند و انسجام خوشه را بالا می‌برد.

## قدم‌های بعدی

۱. اگر refactor auth انجام شد: ایجاد `src/services/supabaseClient.ts`، انتقال `getClient()` و re-exportها، بدون تغییر هیچ امضای عمومی.
۲. اجرای `graphify update .` و مقایسه‌ی cohesion خوشه‌ی Auth (target: > ۰.۵).
۳. C13 (۱۰۵ نود، UI) را در اولویت **پایین** بگذار — شکستن viewpoint یک خوشه‌ی UI خالص سود معماری ندارد.
۴. برای بهبود واقعی: `bootstrapServices()` در `main.ts` (بند C32 در `.ai/hack.md`) — ارزشمندتر از هر community split.

تحلیل‌گر: ZCode | تاریخ: ۲۰۲۶-۱۱-۰۴
