# تحلیل وابستگی Pomodoro به Router

## خلاصه اجرایی

- **فراخوانی واقعی `navigate()`: ۳ مورد** در ۳ فایل (بقیه یال‌ها فقط import هستند).
- **یال‌های گراف بین این سه فایل و `Router.ts`: ۸** (۳ `calls` + ۵ `imports/imports_from/dynamic_import`).
- **امکان جایگزینی با EventBus: بله** — سازوکارش از قبل وجود دارد: `Router.ts:205` به `EVENTS.UI_NAVIGATE` گوش می‌دهد.
- **Eventهای جدید لازم: ۰** (هر ۳ رویداد پومودورو از قبل در `EventBus.ts:661-663` تعریف شده‌اند اما **هیچ‌جا emit یا listen نمی‌شوند**).
- **ریسک کلی: کم** — با یک هشدار متوسط (از دست رفتن بی‌صدای ناوبری اگر listener ثبت نشده باشد).

## جدول فراخوانی‌های Router

| فایل | خط | متد | Route | دلیل | قابل جایگزینی؟ |
|------|-----|-----|-------|------|----------------|
| `PomodoroService.ts` | ۱۵ (import) / **۱۹۳** | `navigate()` | `pomodoro` | کلیک روی مینی‌پیل شناور تایمر → بازگشت به اتاق پومودورو | ✅ بله — با `UI_NAVIGATE` |
| `FocusAudioService.ts` | ۱۱ (import) / **۱۳۹** | `navigate()` | `pomodoro` | کلیک روی پیل صدای تمرکز → رفتن به اتاق پومودورو | ✅ بله — با `UI_NAVIGATE` |
| `PomodoroView.ts` | **۲۵۱** | dynamic `import()` + `navigate()` | داینامیک: `flashcards` / `quiz` / `summarizer` / `notes` | بعد از `svc.start()` اگر `target.kind` یکی از این‌ها باشد، به نمای هدف می‌پرد | ⚠️ فنی بله، ولی **لایه‌ی view به‌طور مشروع ناوبری می‌کند** |

**وابستگی پنهان (بدون import):** هر دو سرویس برای تشخیص «داخل اتاق پومودورو هستم؟» مستقیم `window.location.hash` را می‌خوانند:
- `PomodoroService.ts:186` → `window.location.hash.includes('pomodoro')`
- `FocusAudioService.ts:133` → همان

این دو، وابستگی به **مسیریابی** است نه به ماژول Router؛ با شنیدن `router:navigated` (`Router.ts:341`) قابل حذف است.

## تحلیل ensurePill

دو پیاده‌سازی مستقل و تقریباً یکسان وجود دارد:

| مورد | `PomodoroService.ensurePill()` | `FocusAudioService.ensurePill()` |
|---|---|---|
| خطوط | ۱۸۵–۲۰۳ | ۱۳۲–۱۴۷ |
| شرط نمایش | `inRoom \|\| !active` → حذف پیل | `track === 'off' \|\| inRoom` → حذف پیل |
| جای پیل | `bottom-20` | `bottom-32` (بالاتر، تا روی هم نیفتند) |
| ناوبری | **بله**، `navigate('pomodoro')` در `:193` | **بله**، `navigate('pomodoro')` در `:139` |
| صدا زننده | `notify()` در `:112` (هر tick) | `play/pause/stop` |

- **آیا ناوبری می‌کند؟** بله، دقیقاً یک بار در هر کدام، فقط داخل handler کلیک.
- **آیا با event جایگزین می‌شود؟** بله و بدون تغییر رفتار: `getEventBus().emit(EVENTS.UI_NAVIGATE, { route: 'pomodoro' })` — Router در `:205-210` همان `navigate(route, params)` را صدا می‌زند.
- **ریسک‌ها:** (۱) پیل در هر tick بازسازی محتوا می‌کند (`innerHTML` در `:199`) پس handler فقط یک‌بار بسته می‌شود — با event هم همان‌طور می‌ماند. (۲) اگر `Router.init()` اجرا نشده باشد، event **بی‌صدا** دور ریخته می‌شود (در مقابل `navigate()` مستقیم که حداقل 404 رندر می‌کند). (۳) هر دو پیل هم‌زمان می‌توانند وجود داشته باشند (فاصله‌ی عمودی متفاوت، عمدی).

## Event های پیشنهادی

**وضعیت فعلی:** `POMODORO_STARTED` / `POMODORO_COMPLETED` / `POMODORO_TICK` در `EventBus.ts:661-663` تعریف شده‌اند اما `grep` نشان می‌دهد **هیچ emit و هیچ listener ندارند** — کد مرده.

### Event 1: `EVENTS.UI_NAVIGATE` (موجود، بدون تغییر)
- منبع emit: `PomodoroService.ts:193` و `FocusAudioService.ts:139` به‌جای `getRouter().navigate()`
- Payload: `{ route: 'pomodoro' }`
- Listener: از قبل در `Router.ts:205` ثبت شده — **هیچ listener جدیدی لازم نیست**
- جایگزین: یال‌های ۱ و ۲ جدول

### Event 2: `router:navigated` (موجود، رشته‌ی خام در `Router.ts:341`)
- Listener پیشنهادی: `PomodoroService` و `FocusAudioService` (به‌جای خواندن `location.hash`)
- Payload فعلی: `{ to, from, params }` با `to.name` = نام route
- جایگزین: دو خواندن `window.location.hash` در `:186` و `:133`

### Event 3: `EVENTS.POMODORO_COMPLETED` (موجود، زنده‌سازی)
- منبع emit: `PomodoroService.finalize()` در `:164-182` (بعد از `persist()`)
- Payload پیشنهادی: `{ mode, completed, nextMode, focusMinutes }`
- Listener: `main.ts` (فعلاً هیچ listener ندارد؛ `main.ts:34` فقط `getEventBus({ debug: false })` است)
- جایگزین: هیچ فراخوانی Routerی — ارزشش «حذف کد مرده + آماده‌سازی آنالیتیکس» است

## ریسک‌ها و Mitigation

| # | ریسک | احتمال | تأثیر | Mitigation |
|---|------|--------|-------|------------|
| ۱ | ناوبری بی‌صدا از دست برود (event قبل از `Router.init`) | متوسط | بالا | از `emitSync()` (`EventBus.ts:367`) استفاده کن یا تعداد listener را چک کن و در نبودش fallback به `navigate()` |
| ۲ | ناوبری تکراری/رندر مجدد اگر از قبل در همان route باشیم | کم | کم | در Router بررسی `to.name === from.name` اضافه شود (خارج از دامنه‌ی این refactor) |
| ۳ | کلیک پیل هنگام باز بودن مودال تأیید (`PomodoroView.ts:259` به بعد) | کم | متوسط | پیل را با `Modal` فعال، غیرفعال (`pointer-events`) کن |
| ۴ | ثبت چندباره‌ی listener در `Router.init()` و نشتی حافظه | کم | متوسط | `off()` در `destroy()` (قبلاً برای `hashchange` هم همین ریسک هست) |
| ۵ | نگاشت نام route در `PomodoroView.ts:251` (`note` → `notes`) با refactor بشکند | کم | متوسط | تست روی هر چهار `target.kind` |
| ۶ | نبود تست برای پومودورو | بالا | متوسط | تست‌های زیر افزوده شود |

**تست‌های لازم:**
1. `start()` → event `POMODORO_STARTED` با payload درست emit شود.
2. `finalize()` در حالت focus → `POMODORO_COMPLETED` + `nextMode` صحیح (`cycle % 4`).
3. کلیک پیل (mock DOM) → `UI_NAVIGATE` با `route: 'pomodoro'` emit شود و **هیچ importی از Router در سرویس نباشد**.
4. `router:navigated` به `'pomodoro'` → پیل حذف شود؛ به route دیگر → پیل برگردد.
5. عدم رگرسیون: شمارش `completedToday` و `logStudySession` بدون تغییر.

**سناریوهایی که ممکن است خراب شوند:** بوت سریع + کلیک پیل قبل از init؛ ناوبری از داخل `#/landing` (بدون Router)؛ خروج از اتاق با Back مرورگر و برنگشتن پیل.

## توصیه نهایی

**انجام بده، اما مرحله‌ای.** ارزش واقعی در حذف دو import سرویس→Router است (۲ از ۳ فراخوانی) که C0 را می‌شکند؛ یال سوم (`PomodoroView`) را **نگه دار** چون ناوبری بخشی از مسئولیت لایه‌ی view است و شکستنش سودی ندارد. با این کار `PomodoroService` و `FocusAudioService` دیگر به `@/core/Router` وابسته نمی‌شوند و فقط به `EventBus` (که خودش core است) وصل می‌مانند.

## قدم‌های بعدی

1. `PomodoroService.ts:193` و `FocusAudioService.ts:139` → `getEventBus().emitSync(EVENTS.UI_NAVIGATE, { route: 'pomodoro' })`؛ حذف import در `:15` و `:11`.
2. جایگزینی خواندن `location.hash` در `:186`/`:133` با وضعیت داخلی به‌روزشده از `router:navigated`.
3. زنده‌سازی `POMODORO_STARTED`/`POMODORO_COMPLETED` در `start()` و `finalize()` + listener در `main.ts`.
4. نوشتن ۵ تست بالا در `tests/pomodoro.test.ts`.

تحلیل‌گر: ZCode | تاریخ: ۲۰۲۶-۱۱-۰۴
