/**
 * ============================================================
 * دانش‌یار پرو - DemoDataService
 * ============================================================
 * داده‌ی دموی اولیه (فقط DEV یا با ?demo=1 — تصمیم seeding با main.ts است)
 * 🌱 seedDemoData: کاشت نوت‌های نمونه در اولین اجرا (فقط وقتی دیتابیس خالی است)
 * 🧹 purgeDemoData: پاک‌سازی یک‌باره‌ی نوت‌های دموی قدیمی (روی همه‌ی دستگاه‌ها)
 * @module services/DemoDataService
 */
import { getDatabase } from '@/core/Database';
import { getInstance as getLogger } from '@/core/Logger';

// ⭐ کاشت داده‌ی دمو — فقط وقتی هیچ نوتی وجود ندارد
export async function seedDemoData(): Promise<void> {
  const db = getDatabase();
  await db.init();
  if ((await db.getNotes()).length > 0) return;
  // لاگر داخل تابع گرفته می‌شود تا singleton کانفیگ‌شده‌ی main.ts برگردد
  const logger = getLogger();
  logger.info('🌱 کاشت داده دمو...');
  const now = Date.now();
  const DAY = 86400000;
  const notes = [
    { title: 'جزوه ریاضی — مشتق', content: 'مشتق تابع y=x^n برابر است با y\'=nx^(n-1). برای توابع مرکب از قاعده زنجیره‌ای استفاده می‌کنیم.' },
    { title: 'خلاصه فصل ۳ فیزیک', content: 'قانون دوم نیوتن: F=ma. نیروی خالص وارد بر جسم برابر است با جرم ضرب در شتاب.' },
    { title: 'لغات انگلیسی — درس ۵', content: 'abundant: فراوان، benevolent: خیرخواه، candid: صریح و صادق.' },
  ];
  for (let i = 0; i < notes.length; i++) {
    const s = notes[i]!;
    await db.addNote({
      id: `demo-note-${i}`,
      title: s.title,
      content: s.content,
      createdAt: new Date(now - i * DAY).toISOString(),
      updatedAt: new Date(now - i * DAY).toISOString(),
    });
  }
}

// ⭐ پاک‌سازی یک‌باره‌ی نوت‌های دموی قدیمی (روی همه‌ی دستگاه‌ها)
export async function purgeDemoData(): Promise<void> {
  const db = getDatabase();
  await db.init();
  const notes = await db.getNotes();
  for (const n of notes) {
    if (n.id.startsWith('demo-note-')) await db.deleteNote(n.id);
  }
}
