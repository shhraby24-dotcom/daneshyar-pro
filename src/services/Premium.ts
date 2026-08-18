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
  months: number;
  badge?: string;
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  { id: 'monthly', label: 'ماهانه', priceToman: 99000, period: 'ماه', months: 1 },
  { id: 'term', label: 'ترمیک', priceToman: 320000, period: 'ترم (۴ ماه)', months: 4, badge: '📚 ویژه ترم' },
  { id: 'yearly', label: 'سالانه', priceToman: 890000, period: 'سال', months: 12, badge: '🎁 ۳ ماه رایگان', highlight: true },
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

export function activatePremium(planId: string, customDays?: number): void {
  const plan = PLANS.find((p) => p.id === planId);
  const days = customDays ?? (plan ? plan.months * 30 : 30);
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

/** تاریخ انقضای پریمیوم (برای نمایش در تنظیمات) */
export function getPremiumExpiry(): string | null {
  try {
    return localStorage.getItem(EXPIRY_LS);
  } catch {
    return null;
  }
}

/** روزهای باقی‌مانده پریمیوم */
export function getPremiumDaysLeft(): number {
  const exp = getPremiumExpiry();
  if (!exp) return 0;
  const diff = new Date(exp).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
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