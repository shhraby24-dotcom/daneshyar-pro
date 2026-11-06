import { describe, it, expect } from 'vitest';
import { isTempEmail, getBlacklistedDomains, BLACKLIST_SIZE } from './tempEmailBlacklist';

describe('tempEmailBlacklist', () => {
  it('حداقل ۱۰۰ دامنه دارد', () => {
    expect(BLACKLIST_SIZE).toBeGreaterThanOrEqual(100);
    expect(getBlacklistedDomains().length).toBeGreaterThanOrEqual(100);
  });

  it('دامنه‌های معروف را مسدود می‌کند', () => {
    expect(isTempEmail('a@mailinator.com')).toBe(true);
    expect(isTempEmail('a@10minutemail.com')).toBe(true);
    expect(isTempEmail('a@yopmail.com')).toBe(true);
    expect(isTempEmail('a@guerrillamail.com')).toBe(true);
    expect(isTempEmail('a@trashmail.com')).toBe(true);
  });

  it('به حروف بزرگ/کوچک حساس نیست', () => {
    expect(isTempEmail('A@MAILINATOR.COM')).toBe(true);
    expect(isTempEmail('a@Mailinator.Com')).toBe(true);
  });

  it('زیردامنه را هم مسدود می‌کند', () => {
    expect(isTempEmail('a@sub.mailinator.com')).toBe(true);
  });

  it('ایمیل‌های عادی را رد نمی‌کند', () => {
    expect(isTempEmail('user@gmail.com')).toBe(false);
    expect(isTempEmail('user@yahoo.com')).toBe(false);
    expect(isTempEmail('user@daneshyar.app')).toBe(false);
    // دامنه‌ای که فقط شبیه است
    expect(isTempEmail('a@mailinatorx.com')).toBe(false);
    expect(isTempEmail('a@mailinator.com.evil.io')).toBe(false);
  });

  it('ورودی نامعتبر را امن برمی‌گرداند', () => {
    expect(isTempEmail('')).toBe(false);
    expect(isTempEmail('no-at-sign')).toBe(false);
    expect(isTempEmail('@mailinator.com')).toBe(false);
    expect(isTempEmail('a@')).toBe(false);
  });

  it('لیست برگشتی کپی است (قابل تغییر توسط caller نیست)', () => {
    const list = getBlacklistedDomains();
    list.push('evil.test');
    expect(getBlacklistedDomains()).not.toContain('evil.test');
  });
});
