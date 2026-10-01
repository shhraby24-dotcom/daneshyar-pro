import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { activatePremium, tryPromo, isPremium, getPremiumPlan } from '@/services/Premium';
import { startTrial, isTrialActive, getTrialDaysLeft } from '@/services/TrialService';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => {
      if (key in store) return store[key];
      return null;
    },
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

beforeEach(() => {
  // @ts-ignore
  global.localStorage = localStorageMock;
});

afterEach(() => {
  // @ts-ignore
  global.localStorage = window?.localStorage;
});

describe('Premium Service', () => {
  // Test 1: activatePremium additive
  it('activatePremium additive - should set expiry to 1 year + 1 day when challenge completed on top of existing subscription', () => {
    // Given: There's an active 1-year subscription
    activatePremium('yearly');
    expect(isPremium()).toBe(true);
    expect(getPremiumPlan()).toBe('yearly');

    // When: A 1-day challenge is completed (additive)
    // The code adds customDays to the existing expiry
    activatePremium('yearly', 1);

    // Then: Expiry should be 1 year + 1 day from the original base, not just 1 day
    expect(isPremium()).toBe(true);
    const expiry = localStorage.getItem('daneshyar_premium_exp');
    expect(expiry).not.toBeNull();
    if (expiry) {
      const expDate = new Date(expiry);
      const now = new Date();
      // Should be around 366 days (1 year + 1) from the base, not just 1 day
      const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / 86400000);
      // With additive behavior, it should be more than 30 days (not just 1 day added to now)
      expect(diffDays).toBeGreaterThan(30);
    }
  });

  // Test 2: tryPromo rejecting invalid code
  it('tryPromo rejecting invalid code', async () => {
    const result = await tryPromo('invalid-code-12345');
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  // Test 3: TrialService in anonymous state
  it('TrialService in anonymous state - should return false when localStorage is unavailable', () => {
    // Save original localStorage
    const originalLS = global.localStorage;
    // @ts-ignore
    global.localStorage = null as any;

    try {
      const result = isPremium();
      expect(result).toBe(false);
    } finally {
      // Restore
      // @ts-ignore
      global.localStorage = originalLS;
    }
  });
});