/**
 * ============================================================
 * دانش‌یار پرو - سرویس Streak (موتور Retention)
 * ============================================================
 *
 * قدرتمندترین مکانیک retention — الهام از Duolingo
 *
 * ✅ منطق Grace: streak تا پایان امروز نمی‌شکند (جزئیات حیاتی!)
 * ✅ رکورد تاریخی (longest streak) برای انگیزه شکستن
 * ✅ مایلستون‌ها با جشن‌های شخصیت‌دار (۳ تا ۳۶۵ روز)
 * ✅ نقشه حرارتی (heatmap) برای سند تعهد
 * ✅ پیام‌های انگیزشی که با وضعیت کاربر تغییر می‌کند
 * ✅ آماده برای Streak Freeze (محصول premium ماه ۴)
 *
 * @module services/StreakService
 * @version 1.0.0-beta.1
 */

import { getDatabase, type DatabaseService } from '@/core/Database';
import { getInstance as getLogger } from '@/core/Logger';
import { getInstance as getEventBus } from '@/core/EventBus';
import { getToast } from '@/ui/components/Toast';
import { toPersianDigits } from '@/utils/dateFormatter';

const logger = getLogger().module('Streak');
const eventBus = getEventBus();

// ============================================================
// Types
// ============================================================

/**
 * مایلستون‌های streak (روزهای متوالی)
 */
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 180, 365] as const;

/**
 * نوع مایلستون
 */
export type Milestone = (typeof STREAK_MILESTONES)[number];

/**
 * یک روز در نقشه حرارتی
 */
export interface HeatmapDay {
  iso: string;
  dateLabel: string;
  count: number;
  studied: boolean;
}

/**
 * یک جشن مایلستون
 */
export interface MilestoneCelebration {
  milestone: number;
  title: string;
  message: string;
  isNewRecord: boolean;
}

/**
 * آمار کامل streak (برای داشبورد)
 */
export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  studiedToday: boolean;
  totalStudyDays: number;
  nextMilestone: { target: number; remaining: number } | null;
  isNewRecord: boolean;
  isStreakAlive: boolean;
  statusMessage: string;
}

// ============================================================
// پیام‌های مایلستون — هر کدام شخصیت خودش را دارد
// ============================================================

const MILESTONE_MESSAGES: Record<Milestone, { title: string; message: string }> = {
  3: { title: '🔥 ۳ روز متوالی!', message: 'شروع فوق‌العاده! جرقه‌ات روشن شد — ادامه بده.' },
  7: { title: '🔥 یک هفته کامل!', message: '۷ روز پشت سر هم! داری یک عادت واقعی می‌سازی.' },
  14: { title: '🔥 ۱۴ روز!', message: 'دو هفته متوالی! تعهدت دیگه شوخی نیست.' },
  30: { title: '🔥 یک ماه کامل!', message: '۳۰ روز! تو رسماً هر روز یاد می‌گیری. افتخارآمیزه!' },
  60: { title: '🔥 ۶۰ روز!', message: 'دو ماه پشت سر هم! باورنکردنیه.' },
  100: { title: '🏆 ۱۰۰ روز!', message: 'صد روز متوالی! تو الان در لیگ بزرگان هستی.' },
  180: { title: '🏆 ۱۸۰ روز!', message: 'نصف سال! این دیگه یک شاهکاره.' },
  365: { title: '👑 ۳۶۵ روز!', message: 'یک سال کامل، هر روز! تو یک افسانه‌ای. 👑' },
};

// ============================================================
// StreakService
// ============================================================

/**
 * کلاس سرویس Streak
 */
export class StreakService {
  private db: DatabaseService;

  constructor() {
    this.db = getDatabase();
    logger.debug('StreakService initialized');
  }

  // ============================================================
  // محاسبات اصلی
  // ============================================================

  /**
   * زنجیره فعلی (روزهای متوالی تا امروز)
   *
   * ⭐ منطق Grace (حیاتی!): اگر کاربر امروز هنوز درس نخوانده،
   * streak از دیروز شمارش می‌شود — چون امروز هنوز تمام نشده.
   * این باعث می‌شود کاربر صبح که اپ را باز می‌کند streak را صفر نبیند
   * و ناامید نشود. (درس بزرگ Duolingo!)
   */
  async getCurrentStreak(): Promise<number> {
    const days = await this.db.getUniqueStudyDays();
    if (days.size === 0) return 0;

    let streak = 0;
    const checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    // Grace: اگر امروز درس نخوانده، از دیروز شروع کن
    if (!days.has(checkDate.toDateString())) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // شمارش رو به عقب تا وقتی روزها متوالی هستند
    while (days.has(checkDate.toDateString())) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  }

  /**
   * رکورد تاریخی (بیشترین روزهای متوالی) — برای انگیزه شکستن
   */
  async getLongestStreak(): Promise<number> {
    const days = await this.db.getUniqueStudyDays();
    if (days.size === 0) return 0;

    const sortedDays = Array.from(days)
      .map((ds) => {
        const d = new Date(ds);
        d.setHours(0, 0, 0, 0);
        return d;
      })
      .sort((a, b) => a.getTime() - b.getTime());

    let longest = 1;
    let current = 1;

    for (let i = 1; i < sortedDays.length; i++) {
      const prevDay = sortedDays[i - 1];
      const currDay = sortedDays[i];
      if (!prevDay || !currDay) continue;

      const nextOfPrev = new Date(prevDay);
      nextOfPrev.setDate(nextOfPrev.getDate() + 1);

      // آیا currDay دقیقاً یک روز بعد از prevDay است؟ (DST-safe)
      if (nextOfPrev.toDateString() === currDay.toDateString()) {
        current++;
        if (current > longest) longest = current;
      } else {
        current = 1;
      }
    }

    return longest;
  }

  /**
   * آیا امروز درس خوانده؟
   */
  async hasStudiedToday(): Promise<boolean> {
    const days = await this.db.getUniqueStudyDays();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return days.has(today.toDateString());
  }

  // ============================================================
  // نقشه حرارتی (Heatmap)
  // ============================================================

  /**
   * داده نقشه حرارتی (N روز اخیر) — برای visualization
   * مثل GitHub/Anki: سند تعهد کاربر
   */
  async getHeatmap(days = 120): Promise<HeatmapDay[]> {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const sessions = await this.db.getSessionsByDateRange(
      start.toISOString(),
      end.toISOString()
    );

    // شمارش جلسات در هر روز
    const countMap = new Map<string, number>();
    for (const s of sessions) {
      const d = new Date(s.date);
      d.setHours(0, 0, 0, 0);
      const key = d.toDateString();
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    }

    // ساخت آرایه همه روزها (حتی روزهای خالی)
    const result: HeatmapDay[] = [];
    const cursor = new Date(start);
    for (let i = 0; i < days; i++) {
      const key = cursor.toDateString();
      const count = countMap.get(key) ?? 0;
      result.push({
        iso: cursor.toISOString(),
        dateLabel: key,
        count,
        studied: count > 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }

  // ============================================================
  // مایلستون‌ها و جشن
  // ============================================================

  /**
   * مایلستون بعدی (اثر گرادیان هدف — "۲ روز مانده به ۱۴ روز!")
   */
  getNextMilestone(streak: number): { target: number; remaining: number } | null {
    const next = STREAK_MILESTONES.find((m) => m > streak);
    if (next === undefined) return null;
    return { target: next, remaining: next - streak };
  }

  /**
   * بررسی مایلستون‌ها و جشن گرفتن آن‌هایی که تازه رسیده‌اند
   * (idempotent — هر مایلستون فقط یک بار جشن گرفته می‌شود)
   * @returns لیست جشن‌های جدید
   */
  async checkAndCelebrate(): Promise<MilestoneCelebration[]> {
    const streak = await this.getCurrentStreak();
    const longest = await this.getLongestStreak();
    const celebrations: MilestoneCelebration[] = [];

    for (const m of STREAK_MILESTONES) {
      if (streak >= m) {
        const newlyUnlocked = await this.db.unlockAchievement(`streak_${m}`);
        if (newlyUnlocked) {
          const info = MILESTONE_MESSAGES[m];
          celebrations.push({
            milestone: m,
            title: info.title,
            message: info.message,
            isNewRecord: streak >= longest,
          });
        }
      }
    }

    // جشن بالاترین مایلستون جدید
    const highest = celebrations[celebrations.length - 1];
    if (highest) {
      this._celebrate(highest, streak);
    }

    return celebrations;
  }

  /**
   * نمایش جشن (toast ویژه + event برای celebration بزرگ‌تر در UI)
   */
  private _celebrate(celebration: MilestoneCelebration, streak: number): void {
    // Toast ویژه (طولانی‌تر از معمول — لحظه مهم است!)
    getToast().success(celebration.message, celebration.title, 8000);

    // انتشار event برای celebration بزرگ‌تر (confetti، modal و...)
    eventBus.emit('streak:milestone', {
      milestone: celebration.milestone,
      streak,
      isNewRecord: celebration.isNewRecord,
    });

    logger.info('🎉 مایلستون streak جشن گرفته شد', {
      milestone: celebration.milestone,
      streak,
    });
  }

  // ============================================================
  // آمار کامل (برای داشبورد)
  // ============================================================

  /**
   * بسته کامل آمار streak — همه چیزی که داشبورد نیاز دارد
   */
  async getStreakStats(): Promise<StreakStats> {
    const [currentStreak, longestStreak, studiedToday, days] = await Promise.all([
      this.getCurrentStreak(),
      this.getLongestStreak(),
      this.hasStudiedToday(),
      this.db.getUniqueStudyDays(),
    ]);

    const nextMilestone = this.getNextMilestone(currentStreak);
    const isNewRecord = currentStreak > 0 && currentStreak >= longestStreak;

    return {
      currentStreak,
      longestStreak,
      studiedToday,
      totalStudyDays: days.size,
      nextMilestone,
      isNewRecord,
      isStreakAlive: currentStreak > 0,
      statusMessage: this._getStatusMessage(studiedToday, currentStreak),
    };
  }

  /**
   * پیام انگیزشی — با وضعیت واقعی کاربر تغییر می‌کند
   */
  private _getStatusMessage(studiedToday: boolean, currentStreak: number): string {
    const fa = toPersianDigits(String(currentStreak));
    if (currentStreak === 0) {
      return '🌱 از امروز شروع کن — یک قدم کوچک کافیه!';
    }
    if (studiedToday) {
      return `🔥 ${fa} روز متوالی — امروز هم درخشیدی!`;
    }
    return `⚠️ زنجیره‌ات ${fa} روزه است — امروز هم درس بخون تا نشکنه!`;
  }

  // ============================================================
  // Streak Freeze (محصول Premium — ماه ۴)
  // ============================================================

  /**
   * تعداد freezeهای موجود (ویژگی premium)
   *
   * 📌 این همان محصولی است که Duolingo می‌فروشد!
   * در ماه ۴ که premium اضافه شد، این متد تعداد freezeهای کاربر را
   * برمی‌گرداند و getCurrentStreak روزهای freeze شده را به عنوان
   * روز مطالعه می‌شمارد.
   */
  async getAvailableFreezes(): Promise<number> {
    // TODO (ماه ۴ - Freemium): خواندن از تنظیمات premium
    return 0;
  }
}

// ============================================================
// Singleton
// ============================================================

let streakInstance: StreakService | null = null;

/**
 * دریافت نمونه singleton از StreakService
 */
export function getStreakService(): StreakService {
  if (!streakInstance) {
    streakInstance = new StreakService();
  }
  return streakInstance;
}

/**
 * ریست کردن نمونه singleton (فقط برای تست)
 */
export function resetStreakService(): void {
  streakInstance = null;
}

/**
 * Export پیش‌فرض
 */
export default getStreakService();