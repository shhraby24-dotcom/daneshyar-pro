/**
 * دانش‌یار پرو - سرویس پریمیوم
 * @module services/Premium
 */
import { getInstance as getLogger } from '@/core/Logger';
const logger = getLogger().module('Premium');

const PREMIUM_LS = 'daneshyar_premium';
const PLAN_LS = 'daneshyar_premium_plan';
const EXPIRY_LS = 'daneshyar_premium_exp';

export interface Plan {
  id: string;
  label: string;
  priceToman: number;
  period: string;
  badge?: string;
}

export const PLANS: Plan[] = [
  { id: 'monthly', label: 'ماهانه', priceToman: 99000, period: 'ماه' },
  { id: 'yearly', label: 'سالانه', priceToman: 890000, period: 'سال', badge: '💎 ۲۵٪ تخفیف' },
];

export function isPremium(): boolean {
  try {
    if (localStorage.getItem(PREMIUM_LS) !== '1') return false;
    const exp = localStorage.getItem(EXPIRY_LS);
    if (exp && new Date(exp) < new Date()) { deactivatePremium(); return false; }
    return true;
  } catch { return false; }
}

export function getPremiumPlan(): string | null {
  return localStorage.getItem(PLAN_LS);
}

export function activatePremium(planId: string): void {
  const days = planId === 'yearly' ? 365 : 30;
  const exp = new Date(Date.now() + days * 86400000).toISOString();
  localStorage.setItem(PREMIUM_LS, '1');
  localStorage.setItem(PLAN_LS, planId);
  localStorage.setItem(EXPIRY_LS, exp);
  logger.info('💎 پریمیوم فعال شد', { planId, exp });
}

export function deactivatePremium(): void {
  localStorage.removeItem(PREMIUM_LS);
  localStorage.removeItem(PLAN_LS);
  localStorage.removeItem(EXPIRY_LS);
}

const PROMO_CODES: Record<string, string> = {
  'DANESHYAR-PRO': 'yearly',
  'BETA-TESTER': 'yearly',
  'LAUNCH1405': 'monthly',
};

export function tryPromo(code: string): boolean {
  const planId = PROMO_CODES[code.trim().toUpperCase()];
  if (!planId) return false;
  activatePremium(planId);
  return true;
}

export function formatToman(n: number): string {
  return n.toLocaleString('fa-IR') + ' تومان';
}