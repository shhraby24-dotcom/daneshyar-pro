# چک‌لیست‌ها

## قبل از commit

- [ ] `npx tsc --noEmit` پاس می‌شود
- [ ] `npm test` پاس می‌شود (توجه: `tests/premium.test.ts` ممکن است زیر بار timeout بدهد — ایزوله چک کن)
- [ ] هیچ secret در diff نیست: `git diff --cached | grep -iE "api[_-]?key|secret|service_role|password"`
- [ ] پیام commit با فرمت `type(scope): description` است
- [ ] `graphify update .` اجرا شده (قانون AGENTS.md بعد از هر تغییر کد)
- [ ] فقط فایل‌های مربوطه stage شده‌اند (`git status` را قبل از commit بخوان)
- [ ] `dist/`، `node_modules/`، `test_out.txt`، `reports/` commit نشده‌اند

## قبل از push

- [ ] **VPN/دسترسی GitHub برقرار است** — بارها دیده شده `Could not resolve host: github.com` در حالی که npm/PyPI سالم‌اند. تست: `git ls-remote --heads origin`
- [ ] `git fetch origin main` و بررسی واگرایی: `git rev-list --left-right --count main...origin/main`
- [ ] اگر ریموت جلوتر است، merge/rebase **قبل از** push
- [ ] همه‌ی commitهای محلی تست شده‌اند (نه فقط آخری)
- [ ] build تولیدی سالم است: `npm run build`

## قبل از release

- [ ] اسکن امنیتی: چک‌لیست `.ai/security.md` به‌طور کامل
- [ ] CHANGELOG / یادداشت نسخه به‌روز
- [ ] version bump در `package.json` (و در صورت نیاز `android/`)
- [ ] `git tag` با الگوی موجود (`v2.6.0-flashcards-zen`)
- [ ] Edge Function **دستی** در داشبورد Supabase deploy شده (`index.ts` از ریپو deploy نمی‌شود)
- [ ] `npx cap sync` اگر بیلد اندروید لازم است (دستی `android/app/src/main/assets/public/` را دست نزن)

## فرمت Commit Message

```
type(scope): description

- تغییر ۱
- تغییر ۲

Refs: #123
```

### Types
- `feat:` ویژگی جدید
- `fix:` رفع باگ
- `refactor:` بهبود کد بدون تغییر رفتار
- `docs:` مستندات
- `test:` تست‌ها
- `chore:` متفرقه (deps، CI)
- `ci:` workflow

پیام‌ها فارسی یا انگلیسی هر دو در تاریخ ریپو هست؛ **scope** را واقعی بگذار (`refactor: extract DemoDataService from main.ts`).

## نکات Merge Conflicts

- **`graphify-out/` همیشه تعارض می‌دهد** بعد از هر push، چون CI گراف را کل بازنویسی می‌کند و نسخه‌ی لوکال/سرور فرق دارد (حتی مسیر `.graphify_root` بین ویندوز و لینوکس).
- **راه درست:** فایل‌های تولیدشده را دستی merge نکن. از نسخه‌ی ریموت یک نسخه‌ی معتبر بگیر و بعد بازسازی کن:
```bash
git show origin/main:graphify-out/graph.json > graphify-out/graph.json
graphify update .
git add graphify-out/ && git commit --no-edit   # تکمیل merge
```
- اگر `graph.json` نشانگر تعارض (`<<<<<<<`) دارد، `graphify update` با خطای parse می‌شکند — اول فایل را با نسخه‌ی سالم جایگزین کن.
- دیف بزرگ `graph.json` در PR طبیعی است؛ آن را «churn» گزارش نکن.
- `[skip ci]` در پیام کامیت بات از حلقه‌ی بی‌نهایت CI ↔ گراف جلوگیری می‌کند؛ دست نزن.

## Deployment

1. `npm run build` → `npm run deploy` (gh-pages).
2. Service Worker فقط در production و با مسیر نسبی `./sw.js` ثبت می‌شود (لازمه‌ی GitHub Pages).
3. مسیرها hash-based‌اند — History API نه، در deploy هم بازنویسی مسیر لازم نیست.
4. Edge Function: کد را از `supabase/functions/ai-proxy/index.ts` کپی و **دستی** در داشبورد ذخیره کن؛ سپس با یک درخواست واقعی smoke test بگیر.

آخرین به‌روزرسانی: ۲۰۲۶-۱۱-۰۴
