/**
 * دانش‌یار پرو - چک خودکار چالش‌ها (با polling ساده)
 * @module services/AutoRewardWatcher
 */
import { checkAndReward } from '@/services/RewardEngine';
import { getInstance as getEventBus } from '@/core/EventBus';
import { getToast } from '@/ui/components/Toast';
import { getInstance as getLogger } from '@/core/Logger';
import { toPersianDigits } from '@/utils/dateFormatter';

const logger = getLogger().module('AutoRewardWatcher');

let lastCheck = 0;
let pendingCheck: ReturnType<typeof setTimeout> | null = null;
let started = false;
let intervalId: number | null = null;

/** چک با debounce (حداقل ۲ ثانیه بین چک‌ها) */
async function debouncedCheck(): Promise<void> {
  const now = Date.now();
  if (now - lastCheck < 2000) {
    if (pendingCheck) clearTimeout(pendingCheck);
    pendingCheck = setTimeout(() => { void debouncedCheck(); }, 2000);
    return;
  }
  lastCheck = now;
  try {
    const unlocked = await checkAndReward();
    for (const ch of unlocked) {
      getToast().success(
        `چالش «${ch.title}» تکمیل شد! +${toPersianDigits(String(ch.rewardDays))} روز پریمیوم 🎉`,
        '🏆 دستاورد جدید'
      );
    }
  } catch (e) {
    logger.warn('خطا در چک خودکار چالش', e);
  }
}

/** شروع watcher — فقط یک‌بار */
export function startAutoRewardWatcher(): void {
  if (started) return;
  started = true;
  logger.info('AutoRewardWatcher شروع شد');

  // چک بعد از رویدادهای مهم EventBus
  const bus = getEventBus();
  const events = [
    'quiz:completed',
    'summary:completed',
    'note:created',
    'flashcard:created',
    'flashcard:reviewed',
    'pomodoro:completed',
    'streak:updated',
  ];
  for (const ev of events) {
    try {
      bus.on(ev, () => { void debouncedCheck(); });
    } catch { /* event وجود ندارد، نادیده بگیر */ }
  }

  // polling هر ۵ ثانیه (fallback برای رویدادهایی که publish نمی‌شوند)
  intervalId = window.setInterval(() => { void debouncedCheck(); }, 5000);

  // چک اولیه
  void debouncedCheck();
}

/** برای cleanup (اختیاری) */
export function stopAutoRewardWatcher(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  started = false;
}