import { describe, it, expect } from 'vitest';
import { getSummarizer } from '@/services/Summarizer';

const TEXT = 'فتوسنتز فرآیندی است که در آن گیاهان نور خورشید را به انرژی شیمیایی تبدیل می‌کنند. این فرآیند در کلروپلاست انجام می‌شود. کلروفیل رنگدانه‌ای است که نور را جذب می‌کند. بنابراین فتوسنتز برای تولید اکسیژن ضروری است. گیاهان با فتوسنتز قند می‌سازند. فتوسنتز یکی از مهم‌ترین فرآیندهای زیستی است.';

describe('Summarizer', () => {
  it('کلیدواژه‌ی اصلی را پیدا می‌کند', () => {
    expect(getSummarizer().extractKeywords(TEXT, 5)).toContain('فتوسنتز');
  });
  it('خلاصه از متن اصلی کوتاه‌تر یا برابر است', () => {
    const r = getSummarizer().summarize(TEXT, { level: 'short' });
    expect(r.sentenceCount).toBeLessThanOrEqual(r.totalSentences);
    expect(r.sentenceCount).toBeGreaterThanOrEqual(3);
  });
});