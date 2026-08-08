import { describe, it, expect } from 'vitest';
import { getQuizGenerator } from '@/services/QuizGenerator';

const TEXT = 'فتوسنتز فرآیندی است که در آن گیاهان نور خورشید را به انرژی شیمیایی تبدیل می‌کنند. این فرآیند مهم در کلروپلاست سلول‌های گیاهی انجام می‌شود. کلروفیل رنگدانه‌ای سبز است که نور خورشید را جذب می‌کند. بنابراین فتوسنتز نقش کلیدی در تولید اکسیژن جو زمین دارد. گیاهان با استفاده از فتوسنتز قند و گلوکز می‌سازند. فتوسنتز یکی از مهم‌ترین فرآیندهای زیستی کره زمین است.';

describe('QuizGenerator', () => {
  it('سوال تولید می‌کند', () => {
    const r = getQuizGenerator().generate(TEXT, { count: 3, types: ['mc', 'fill', 'tf'] });
    expect(r.questions.length).toBeGreaterThan(0);
    expect(r.questions.length).toBeLessThanOrEqual(3);
  });
  it('سوال mc چهار گزینه و ایندکس معتبر دارد', () => {
    const r = getQuizGenerator().generate(TEXT, { count: 5, types: ['mc'] });
    const mc = r.questions.find((q) => q.type === 'mc');
    if (mc) {
      expect(mc.options?.length).toBe(4);
      expect(mc.correctIndex ?? -1).toBeGreaterThanOrEqual(0);
    }
  });
});