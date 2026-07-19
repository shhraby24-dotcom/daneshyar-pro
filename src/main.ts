/**
 * دانش‌یار پرو - نقطه شروع برنامه
 * @module main
 */

import './style.css';
import { getInstance as getLogger } from '@/core/Logger';
import { getInstance as getEventBus, EVENTS } from '@/core/EventBus';

// مقداردهی اولیه Logger
const logger = getLogger({ level: 'DEBUG' });
logger.info('🚀 دانش‌یار پرو در حال راه‌اندازی...');

// مقداردهی اولیه EventBus
const eventBus = getEventBus({ debug: true });

// تست ۱: ثبت listener ساده
logger.info('📝 تست ۱: ثبت listener ساده');
const subId1 = eventBus.on(EVENTS.NOTE_CREATED, (data) => {
  logger.info('📌 یادداشت جدید دریافت شد', data);
});

// تست ۲: ثبت listener با wildcard
logger.info('📝 تست ۲: ثبت listener با wildcard');
eventBus.on('note:*', (data, event) => {
  logger.info(`🌟 رویداد ${event.name} دریافت شد (wildcard)`);
});

// تست ۳: انتشار رویداد
logger.info('📝 تست ۳: انتشار رویداد');
eventBus.emit(EVENTS.NOTE_CREATED, {
  id: '123',
  title: 'یادداشت تست',
  content: 'محتوای تست',
});

// تست ۴: once
logger.info('📝 تست ۴: once');
eventBus.once(EVENTS.QUIZ_STARTED, () => {
  logger.info('🎯 آزمون شروع شد (فقط یک بار)');
});

eventBus.emit(EVENTS.QUIZ_STARTED, { quizId: 'q1' });
eventBus.emit(EVENTS.QUIZ_STARTED, { quizId: 'q2' }); // این بار فراخوانی نمی‌شود

// تست ۵: ماژول‌های مختلف
logger.info('📝 تست ۵: ماژول‌های مختلف');
const notesBus = eventBus.module('NotesFeature');
const quizBus = eventBus.module('QuizFeature');

notesBus.emit(EVENTS.NOTE_UPDATED, { id: '123' });
quizBus.emit(EVENTS.QUIZ_COMPLETED, { score: 95 });

// تست ۶: آمار
logger.info('📊 آمار EventBus:', eventBus.getStats());

// تست ۷: تاریخچه
logger.info('📜 تاریخچه ۳ رویداد آخر:', eventBus.getHistory({ limit: 3 }));

logger.info('✅ EventBus با موفقیت تست شد!');
console.log('');
console.log('🎉 همه تست‌ها در تب Console قابل مشاهده هستند');