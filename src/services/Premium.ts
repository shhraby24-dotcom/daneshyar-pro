/**
 * دانش‌یار پرو - سرویس پریمیوم
 * @module services/Premium
 */
import { getInstance as getLogger } from '@/core/Logger';
const logger = getLogger().module('Premium');

// LocalStorage keys for trial and reward entitlements (NOT for paid subscriptions)
const TRIAL_LS = 'daneshyar_trial';
const REWARD_LS = 'daneshyar_reward';

export interface Plan {
  id: string;
  label: string;
  priceToman: number;
  period: string;
  months: number;
  badge?: string;
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  { id: 'monthly', label: 'ماهانه', priceToman: 99000, period: 'ماه', months: 1 },
  { id: 'term', label: 'ترمیک', priceToman: 320000, period: 'ترم (۴ ماه)', months: 4, badge: 'ویژه ترم' },
  { id: 'yearly', label: 'سالانه', priceToman: 890000, period: 'سال', months: 12, badge: '۳ ماه رایگان', highlight: true },
];

/**
 * Check if user has active PAID subscription
 * This should ONLY return true if verified from Supabase
 * localStorage is NOT a valid source for paid subscription status
 */
export function isPremium(): boolean {
  // Paid subscription status must be verified from Supabase only
  // This function now returns false by default - real status comes from SubscriptionService
  return false;
}

/**
 * Get the paid subscription plan ID
 * Returns null if no paid subscription
 */
export function getPremiumPlan(): string | null {
  // Plan should come from Supabase subscriptions table, not localStorage
  return null;
}

/**
 * Activate trial or reward entitlement (NOT paid subscription)
 * This is for local entitlements only - paid subscriptions are managed by Supabase
 */
export function activateEntitlement(type: 'trial' | 'reward', planId: string, days: number): void {
  const exp = new Date(Date.now() + days * 86400000).toISOString();
  localStorage.setItem(TRIAL_LS, type === 'trial' ? '1' : '0');
  localStorage.setItem(`${type}_plan`, planId);
  localStorage.setItem(`${type}_exp`, exp);
  logger.info(`Entitlement activated: ${type}`, { planId, exp });
}

/**
 * Deactivate trial or reward entitlement
 */
export function deactivateEntitlement(type: 'trial' | 'reward'): void {
  localStorage.removeItem(TRIAL_LS);
  localStorage.removeItem(`${type}_plan`);
  localStorage.removeItem(`${type}_exp`);
}

/**
 * Check if trial entitlement is active
 */
export function isTrialEntitlementActive(): boolean {
  try {
    if (localStorage.getItem(TRIAL_LS) !== '1') return false;
    const exp = localStorage.getItem('trial_exp');
    if (exp && new Date(exp) < new Date()) { deactivateEntitlement('trial'); return false; }
    return true;
  } catch { return false; }
}

/**
 * Check if reward entitlement is active
 */
export function isRewardEntitlementActive(): boolean {
  try {
    if (localStorage.getItem(TRIAL_LS) !== '0') return false;
    const exp = localStorage.getItem('reward_exp');
    if (exp && new Date(exp) < new Date()) { deactivateEntitlement('reward'); return false; }
    return true;
  } catch { return false; }
}

/**
 * Get trial entitlement expiry
 */
export function getTrialExpiry(): string | null {
  try {
    return localStorage.getItem('trial_exp');
  } catch {
    return null;
  }
}

/**
 * Get reward entitlement expiry
 */
export function getRewardExpiry(): string | null {
  try {
    return localStorage.getItem('reward_exp');
  } catch {
    return null;
  }
}

/**
 * Days left for trial entitlement
 */
export function getTrialDaysLeft(): number {
  const exp = getTrialExpiry();
  if (!exp) return 0;
  const diff = new Date(exp).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

/**
 * Days left for reward entitlement
 */
export function getRewardDaysLeft(): number {
  const exp = getRewardExpiry();
  if (!exp) return 0;
  const diff = new Date(exp).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

/**
 * Get the trial entitlement plan
 */
export function getTrialPlan(): string | null {
  try {
    return localStorage.getItem('trial_plan');
  } catch {
    return null;
  }
}

/**
 * Get the reward entitlement plan
 */
export function getRewardPlan(): string | null {
  try {
    return localStorage.getItem('reward_plan');
  } catch {
    return null;
  }
}

export function formatToman(n: number): string {
  return n.toLocaleString('fa-IR') + ' تومان';
}

/** معادل ماهانه یک پلن */
export function monthlyEquivalent(plan: Plan): number {
  return Math.round(plan.priceToman / plan.months);
}

/** درصد صرفه‌جویی نسبت به خرید ماهانه */
export function savingsPercent(plan: Plan): number {
  const monthly = PLANS.find((p) => p.id === 'monthly');
  if (!monthly || plan.id === 'monthly') return 0;
  const full = monthly.priceToman * plan.months;
  return Math.round(((full - plan.priceToman) / full) * 100);
}