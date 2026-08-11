/**
 * دانش‌یار پرو - سرویس Trial (۷ روز پریمیوم رایگان)
 * @module services/TrialService
 */
import { activatePremium, deactivatePremium, isPremium, getPremiumPlan } from '@/services/Premium';
import { getInstance as getLogger } from '@/core/Logger';

const logger = getLogger().module('TrialService');

const TRIAL_START_LS = 'daneshyar_trial_start';
export const TRIAL_DAYS = 7;

export function hasUsedTrial(): boolean {
  try { return localStorage.getItem(TRIAL_START_LS) !== null; } catch { return false; }
}

export function startTrial(): void {
  if (hasUsedTrial()) return;
  try { localStorage.setItem(TRIAL_START_LS, new Date().toISOString()); } catch { return; }
  activatePremium('trial', TRIAL_DAYS);
  logger.info(`🎁 trial ${TRIAL_DAYS} روزه فعال شد`);
}

export function isTrialActive(): boolean {
  const start = localStorage.getItem(TRIAL_START_LS);
  if (!start) return false;
  const elapsed = Date.now() - new Date(start).getTime();
  return elapsed < TRIAL_DAYS * 86400000;
}

export function getTrialDaysLeft(): number {
  const start = localStorage.getItem(TRIAL_START_LS);
  if (!start) return 0;
  const elapsed = Date.now() - new Date(start).getTime();
  return Math.max(0, Math.ceil((TRIAL_DAYS * 86400000 - elapsed) / 86400000));
}

export function checkTrialExpiry(): void {
  if (hasUsedTrial() && !isTrialActive() && isPremium() && getPremiumPlan() === 'trial') {
    deactivatePremium();
    logger.info('trial تمام شد، پریمیوم غیرفعال شد');
  }
}