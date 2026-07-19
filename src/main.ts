/**
 * دانش‌یار پرو - نقطه شروع برنامه
 * @module main
 */

import './style.css'
import { getInstance } from '@/core/Logger'

// مقداردهی اولیه Logger
const logger = getInstance({
  level: 'DEBUG',
  showTimestamp: true,
  persistToStorage: false,
})

logger.info('🚀 دانش‌یار پرو در حال راه‌اندازی...')
logger.debug('زیرساخت حرفه‌ای آماده است', {
  vite: true,
  typescript: true,
  tailwind: true,
})

// تست ماژول‌های مختلف
const notesLogger = logger.module('Notes')
const quizLogger = logger.module('Quiz')

notesLogger.info('یادداشت جدید ایجاد شد', { id: 1, title: 'تست' })
quizLogger.warn('زمان آزمون رو به اتمام است', { timeLeft: 60 })

logger.error('یک خطای تست', new Error('خطای نمونه'))
logger.fatal('این یک خطای بحرانی است')

console.log('')
console.log('✅ Logger با موفقیت تست شد!')
console.log('📦 در تب Console همه سطوح لاگ را می‌بینید')