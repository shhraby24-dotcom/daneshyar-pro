# ساختار داده

## Dexie (IndexedDB)

نام دیتابیس: `daneshyar-pro` — کلاس `DaneshyarDB` در `src/core/Database.ts:95`.

```ts
// Database.ts:96-102 — نسخه‌ی فعلی ۱
this.version(1).stores({
  notes: 'id, createdAt, updatedAt, category, *tags',
  flashcards: 'id, deck, nextReview, createdAt, *tags',
  quizHistory: 'id, date, percentage',
  studySessions: 'id, date, type',
  achievements: 'id, unlockedAt',
});
```

دسترسی همیشه با `getDatabase()` (singleton)؛ `db.init()` را قبل از اولین query صدا بزن.

### افزودن جدول جدید

```ts
// نسخه‌ی بعدی = N+1، نه تغییر نسخه‌ی قبلی
this.version(2).stores({
  notes: 'id, createdAt, updatedAt, category, *tags',   // ← همه‌ی جداول قبلی را تکرار کن
  flashcards: 'id, deck, nextReview, createdAt, *tags',
  quizHistory: 'id, date, percentage',
  studySessions: 'id, date, type',
  achievements: 'id, unlockedAt',
  reviews: 'id, cardId, reviewedAt',                    // ← جدید
});
```
قواعد: (۱) نسخه‌ی قبلی را دست نزن، فقط block جدید بنویس؛ (۲) جداول قدیمی را در block جدید **تکرار** کن وگرنه Dexie حذفشان می‌کند؛ (۳) فقط فیلدهای query را ایندکس کن.

### Migration
- Dexie upgrade را اجرا می‌کند، اما **پر کردن داده** دستی است:
```ts
this.version(2).stores({ /* ... */ }).upgrade(async (tx) => {
  await tx.table('reviews').toCollection().modify((r) => { r.synced ??= false; });
});
```
- `MIGRATION_FLAG = 'daneshyar_idb_migrated'` (`Database.ts:74`) مهاجرت localStorage → Dexie را یک‌بار اجرا می‌کند (`:138` بررسی، `:187` ست). برای مهاجرت جدید، **flag جدا** بساز؛ flag موجود را دوباره استفاده نکن.
- مهاجرت را برگشت‌پذیر بنویس؛ قبل از `delete`/`clear` بکاپ بگیر.
## Supabase

جدول‌های استفاده‌شده: `ai_usage`، `subscriptions`، `profiles` (+ جدول‌های sync).

| جدول | کلید/نکته |
|---|---|
| `ai_usage` | `(device_id, usage_date)` — شمارش سهمیه AI |
| `subscriptions` | `user_id`، `expires_at` — منبع حقیقت پریمیوم |
| `profiles` | `user_id` — کد دعوت و referral |

- **RLS اجباری** برای همه‌ی جداول؛ کلید `anon` عمومی است و امنیت فقط از policy می‌آید. policy باز (`using (true)`) = نشت داده‌ی همه‌ی کاربران.
- `service_role` هرگز در کلاینت؛ فقط `Deno.env` در Edge Function.
- schema فقط در داشبورد Supabase — ریپو آینه‌ی آن نیست.

## localStorage Keys

پایدار (State): `daneshyar_settings` `daneshyar_theme` `daneshyar_onboarding` `daneshyar_draft` `daneshyar_notes` `daneshyar_flashcards` `daneshyar_quiz_history` `daneshyar_study_sessions`

AI و سهمیه: `daneshyar_ai_keys` `daneshyar_ai_usage` `daneshyar_ai_quiz_cache` `daneshyar_ai_summary_cache` `daneshyar_device_id`

پریمیوم و تریال: `daneshyar_premium` `daneshyar_premium_exp` `daneshyar_premium_plan` `daneshyar_trial_start`

همگام‌سازی: `daneshyar_last_sync` `daneshyar_sync_snapshot` `daneshyar_idb_migrated`

UI و متفرقه: `daneshyar_xp` `daneshyar_pending_ref` `daneshyar_pomodoro_v` `daneshyar_custom_sounds` `daneshyar_note_draft` `daneshyar_card_draft` `daneshyar_logs` `daneshyar_dash_upsell_dismissed` `daneshyar_notes_upsell_dismissed`

قانون: هر کلید جدید پیشوند `daneshyar_` داشته باشد و در همین فهرست ثبت شود.

## Sync

`SyncService`: استراتژی **LWW** (Last-Write-Wins) روی `updatedAt`، فقط برای کاربر لاگین.
- `syncAll()` در `bootstrap()` صدا زده می‌شود (`main.ts`).
- وضعیت برای UI: `onSyncStatus()` / `isSyncAvailable()` / `getLastSync()`.
- هر نوشتن محلی، ابتدا Dexie بعد صف sync؛ هرگز منتظر شبکه نمان.
- تعارض: نسخه‌ی با `updatedAt` بزرگ‌تر برنده است ⇒ timestamp را همیشه `ISOString` بگذار.

آخرین به‌روزرسانی: ۲۰۲۶-۱۱-۰۴
