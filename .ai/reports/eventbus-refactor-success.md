# گزارش موفقیت EventBus Refactor

## خلاصه
تاریخ: ۲۰۲۶-۱۱-۰۴ | کامیت: `78ecda7`
هدف: شکستن Community C0 (cohesion 0.05) با قطع وابستگی مستقیم Pomodoro به Router

## قبل از Refactor

- Community C0 شامل: `Router` + `PomodoroService` + `FocusAudioService` + `PomodoroView`
- Cohesion: ۰.۰۵ — ضعیف‌ترین community پروژه
- ۸ یال بین Pomodoro و Router: ۳ یال `calls` + ۵ یال `imports`/`dynamic_import`
- وابستگی پنهان: `window.location.hash.includes('pomodoro')` در `ensurePill()` هر دو سرویس — وابستگی به مسیریابی بدون هیچ import
- ۳ event مرده در `EventBus.ts:661-663` (`POMODORO_STARTED/COMPLETED/TICK`) — بدون emit و بدون listener

## تغییرات اعمال‌شده

| فایل | تغییر |
|---|---|
| `src/services/PomodoroService.ts` | `getRouter().navigate('pomodoro')` → `emitSync(EVENTS.UI_NAVIGATE, { route:'pomodoro' })`؛ حذف import روتر؛ فیلد `inPomodoroRoute` + listener روی `router:navigated` |
| `src/services/FocusAudioService.ts` | همان الگو |
| `src/core/EventBus.ts` | حذف ۳ event مرده (۵ خط) |
| `src/ui/views/PomodoroView.ts` | فقط ۲ خط کامنت — ناوبری عمداً باقی ماند (مسئولیت view) |

**Mitigation ریسک بی‌صدایی:** `emitSync()` تعداد listenerهای اجراشده را برمی‌گرداند؛ اگر صفر بود، یک `setTimeout(0)` دوباره تلاش می‌کند (Router listener خود را در constructor ثبت می‌کند و `main.ts:36` آن را قبل از هر UI می‌سازد).

## بعد از Refactor

اندازه‌گیری مستقیم از `graph.json` (۱۵۲۸ نود / ۳۲۹۱ یال / ۱۱۴ community):

| Community | محتوا | نود | Cohesion |
|---|---|---|---|
| **C2** | PomodoroService | ۲۰ | **۰.۷۳** |
| **C22** | Router | ۲۵ | **۰.۸۰** |
| **C101** | FocusAudioService | ۱۴ | **۰.۸۱** |

## نتیجه

- **۱۵ برابر** بهبود انسجام (۰.۰۵ → ۰.۷۳)
- **۷۵٪** کاهش یال‌ها (۸ → ۲؛ هر دو باقی‌مانده از `PomodoroView` و عمدی)
- **۰** import از `@/core/Router` در سرویس‌ها
- همه تست‌ها پاس: `tsc --noEmit` = 0 خطا، `vitest run` = ۵ فایل / ۱۲ تست
- روش: `src/` ۴۵ خط اضافه / ۱۱ خط حذف

## درس‌های آموخته‌شده

۱. **سازوکار جداسازی از قبل وجود داشت** — `Router.ts:205` به `UI_NAVIGATE` گوش می‌داد؛ نیازی به listener جدید نبود. قبل از refactor، زیرساخت را بگرد.
۲. **`emitSync` + fallback** ریسک «ناوبری بی‌صدا» را می‌بندد؛ `emit` معمولی هیچ بازخوردی از تعداد listener نمی‌دهد.
۳. **وابستگی پنهان مهم‌تر از import بود** — `window.location.hash` در `ensurePill()` با هیچ ابزار گرافی دیده نمی‌شد.
۴. **Refactor مرحله‌ای بهتر از یکباره است** — یال `PomodoroView` عمداً دست‌نخورده ماند چون ناوبری بخشی از مسئولیت لایه‌ی view است.
۵. **شماره‌ی communityها با هر rebuild عوض می‌شود** — همیشه تاریخ اندازه‌گیری را کنار عدد بنویس.

تحلیل‌گر: ZCode | تاریخ: ۲۰۲۶-۱۱-۰۴
