# DNA پروژه دانش‌یار پرو

## اطلاعات پایه
- نام: دانش‌یار پرو
- نوع: Study App | Freemium | Mobile-first
- تیم: Solo Dev + AI
- شروع: تیر ۱۴۰۵
- هدف: v1.0 تا دی ۱۴۰۵

## معماری فنی
- Frontend: Vite + TypeScript + Tailwind v4
- Backend: Supabase (Edge Functions)
- Database: Dexie (IndexedDB) + Supabase
- AI: Gemini API (از طریق Edge Function)
- Mobile: Capacitor (Android)

## فایل‌های کلیدی
- src/main.ts: Entry point
- src/core/Router.ts: Routing (hash-based)
- src/core/Database.ts: Dexie + migrations
- src/services/AIQuizService.ts: AI integration
- supabase/functions/ai-proxy/index.ts: Edge Function

## مسیرهای اصلی
- / : Dashboard
- /notes : یادداشت‌ها
- /flashcards : فلش‌کارت‌ها
- /quiz : آزمون‌ساز AI
- /settings : تنظیمات

## وابستگی‌های اصلی
- @capacitor/android: ^8.5.0
- @supabase/supabase-js: ^2.112.2
- dexie: ^4.4.4
- vite: ^6.3.5

## وضعیت فعلی
- فاز: آماده‌سازی چارچوب
- مشکلات اصلی: اتصال، وابستگی به کاربر
