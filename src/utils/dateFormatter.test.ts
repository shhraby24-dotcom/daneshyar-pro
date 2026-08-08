import { describe, it, expect } from 'vitest';
import { toPersianDigits } from '@/utils/dateFormatter';

describe('dateFormatter', () => {
  it('اعداد را فارسی می‌کند', () => {
    expect(toPersianDigits('123')).toBe('۱۲۳');
  });
});