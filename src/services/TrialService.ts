/**
 * دانش‌یار پرو - سرویس Trial (۷ روز دسترسی آزمایشی رایگان)
 * Trial یک entitlement جداگانه است و با اشتراک پولی تفاوت دارد
 * @module services/TrialService
 */
import { activateEntitlement, deactivateEntitlement, isTrialEntitlementActive, getTrialDaysLeft, getTrialPlan } from '@/services/Premium';
import { getInstance as getLogger } from '@/core/Logger';

const logger = getLogger().module('TrialService');

const TRIAL_START_LS = 'daneshyar_trial_start';
export const TRIAL_DAYS = 7;

/**
 * Check if user has already used trial
 */
export function hasUsedTrial(): boolean {
  try { return localStorage.getItem(TRIAL_START_LS) !== null; } catch { return false; }
}

/**
 * Start trial entitlement (NOT paid subscription)
 * This only activates local trial entitlement, not a paid subscription
 */
export function startTrial(): void {
  if (hasUsedTrial()) return;
  try { 
    localStorage.setItem(TRIAL_START_LS, new Date().toISOString()); 
  } catch { return; }
  activateEntitlement('trial', 'trial', TRIAL_DAYS);
  logger.info('Trial entitlement activated for ' + TRIAL_DAYS + ' days');
}

/**
 * Check if trial entitlement is currently active
 */
export function isTrialActive(): boolean {
  return isTrialEntitlementActive();
}

/**
 * Get remaining days of trial entitlement
 */
export function getTrialDaysRemaining(): number {
  return getTrialDaysLeft();
}

/**
 * Check trial expiry and deactivate if expired
 */
export function checkTrialExpiry(): void {
  if (hasUsedTrial() && !isTrialActive() && getTrialPlan() === 'trial') {
    deactivateEntitlement('trial');
    logger.info('Trial entitlement expired, deactivated');
  }
}