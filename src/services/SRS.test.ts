import { describe, it, expect } from 'vitest';
import { getSRS, type Flashcard } from '@/services/SRS';

const baseCard = (): Flashcard => ({
  id: 't1', front: 'f', back: 'b', topic: 'general', conceptType: 'default',
  createdAt: new Date().toISOString(), ease: 2.5, interval: 0, repetitions: 0,
  lapses: 0, nextReview: new Date().toISOString(), lastReview: null, lastQuality: null, totalReviews: 0,
});

describe('SRS (SM-2)', () => {
  it('پاسخ غلط کارت را ریست می‌کند', () => {
    const out = getSRS().schedule({ ...baseCard(), repetitions: 3, interval: 10 }, 1);
    expect(out.repetitions).toBe(0);
    expect(out.interval).toBe(1);
    expect(out.lapses).toBe(1);
  });
  it('پاسخ عالی فاصله را افزایش می‌دهد', () => {
    const out = getSRS().schedule({ ...baseCard(), repetitions: 2, interval: 6 }, 5);
    expect(out.interval).toBeGreaterThan(6);
    expect(out.repetitions).toBe(3);
  });
  it('ease از حداقل کمتر نمی‌شود', () => {
    let c = baseCard();
    for (let i = 0; i < 10; i++) c = getSRS().schedule(c, 0);
    expect(c.ease).toBeGreaterThanOrEqual(1.3);
  });
  it('getDueCards فقط سررسیدها را برمی‌گرداند', () => {
    const due = { ...baseCard(), nextReview: new Date(Date.now() - 1000).toISOString() };
    const future = { ...baseCard(), nextReview: new Date(Date.now() + 86400000).toISOString() };
    expect(getSRS().getDueCards([due, future])).toHaveLength(1);
  });
});