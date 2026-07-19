/**
 * دانش‌یار پرو - نقطه شروع برنامه
 * @module main
 */

import './style.css';
import { getInstance as getLogger } from '@/core/Logger';
import { getStorage, LS_KEYS } from '@/core/Storage';
import { getState } from '@/core/State';

// مقداردهی اولیه Logger
const logger = getLogger({ level: 'DEBUG' });
logger.info('🚀 دانش‌یار پرو در حال راه‌اندازی...');

// مقداردهی اولیه Storage
const storage = getStorage();

// مقداردهی اولیه State
const state = getState();

// تابع اصلی
async function main() {
  try {
    // ============================================
    // تست ۱: Storage - ذخیره و خواندن
    // ============================================
    logger.info('📦 تست ۱: Storage - ذخیره و خواندن');

    const testSettings = {
      theme: 'dark',
      language: 'fa',
      fontSize: 16,
    };

    storage.setLocal(LS_KEYS.SETTINGS, testSettings);
    const loadedSettings = storage.getLocal(LS_KEYS.SETTINGS);
    logger.info('تنظیمات ذخیره و خوانده شد', { loadedSettings });

    // ============================================
    // تست ۲: Storage - آمار
    // ============================================
    logger.info('📊 تست ۲: آمار Storage');
    const stats = storage.getStats();
    logger.info('آمار Storage', stats);

    // ============================================
    // تست ۳: State با Storage واقعی
    // ============================================
    logger.info('🔄 تست ۳: State با Storage واقعی');
    await state.load();
    logger.info('State بارگذاری شد', { ready: state.isReady() });

    // اضافه کردن یک یادداشت
    state.addNote({
      id: 'test-' + Date.now(),
      title: 'یادداشت تست Storage',
      content: 'این یادداشت با Storage واقعی ذخیره می‌شود',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    logger.info('✅ یادداشت اضافه شد', { count: state.getNotes().length });

    // ============================================
    // تست ۴: بررسی persist
    // ============================================
    logger.info('💾 تست ۴: بررسی persist');
    await state.persistAll();
    logger.info('Persist کامل شد');

    // بررسی localStorage
    const savedNotes = storage.getLocal(LS_KEYS.NOTES);
    logger.info('یادداشت‌ها در localStorage', {
      count: Array.isArray(savedNotes) ? savedNotes.length : 0,
    });

    logger.info('✅ همه تست‌های Storage موفق بودند!');
    console.log('');
    console.log('🎉 Storage با موفقیت تست شد!');
    console.log('📦 داده‌ها در localStorage ذخیره شده‌اند');
    console.log('🔄 صفحه را refresh کن - داده‌ها باید باقی بمانند');
  } catch (error) {
    logger.error('خطا در تست Storage', error);
  }
}

// اجرای برنامه
main();