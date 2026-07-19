/**
 * دانش‌یار پرو - نقطه شروع برنامه
 * @module main
 */

import './style.css';
import { getInstance as getLogger } from '@/core/Logger';
import { getInstance as getEventBus, EVENTS } from '@/core/EventBus';
import { getState } from '@/core/State';

// مقداردهی اولیه Logger
const logger = getLogger({ level: 'DEBUG' });
logger.info('🚀 دانش‌یار پرو در حال راه‌اندازی...');

// مقداردهی اولیه EventBus
const eventBus = getEventBus({ debug: false });

// مقداردهی اولیه State
const state = getState();

// تابع اصلی
async function main() {
  try {
    // بارگذاری state
    logger.info('📦 در حال بارگذاری state...');
    await state.load();
    logger.info('✅ State بارگذاری شد', { ready: state.isReady() });

    // تست ۱: اضافه کردن یادداشت
    logger.info('📝 تست ۱: اضافه کردن یادداشت');
    const note = state.addNote({
      id: 'test-note-1',
      title: 'یادداشت تست',
      content: 'این یک یادداشت تست است',
      category: 'تست',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    logger.info('یادداشت اضافه شد', { id: note.id });

    // تست ۲: دریافت آمار
    logger.info('📊 تست ۲: آمار', state.getStats());

    // تست ۳: subscribe به تغییرات
    logger.info('📝 تست ۳: subscribe به تغییرات notes');
    const unsubscribe = state.subscribe('notes', (newValue, oldValue) => {
      logger.info('🔄 Notes تغییر کرد', {
        oldCount: Array.isArray(oldValue) ? oldValue.length : 0,
        newCount: Array.isArray(newValue) ? newValue.length : 0,
      });
    });

    // اضافه کردن یادداشت دوم
    state.addNote({
      id: 'test-note-2',
      title: 'یادداشت دوم',
      content: 'این یادداشت دوم است',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // تست ۴: به‌روزرسانی تنظیمات
    logger.info('⚙️ تست ۴: به‌روزرسانی تنظیمات');
    state.updateSettings({ theme: 'light', language: 'fa' });
    logger.info('تنظیمات جدید', state.getSettings());

    // تست ۵: ثبت جلسه مطالعه
    logger.info('📚 تست ۵: ثبت جلسه مطالعه');
    state.logStudySession('pomodoro', { duration: 25 });
    logger.info('آمار به‌روز شده', state.getStats());

    // cleanup
    unsubscribe();

    logger.info('✅ همه تست‌های State موفق بودند!');
    console.log('');
    console.log('🎉 State با موفقیت تست شد!');
    console.log('📦 در تب Console همه عملیات را می‌بینید');
  } catch (error) {
    logger.error('خطا در تست State', error);
  }
}

// اجرای برنامه
main();