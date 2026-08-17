/**
 * دانش‌یار پرو - موتور پاداش (v2: با progress + چک خودکار)
 * @module services/RewardEngine
 */
import { getDatabase } from '@/core/Database';
import { activatePremium } from '@/services/Premium';
import { getInstance as getLogger } from '@/core/Logger';

const logger = getLogger().module('RewardEngine');

export type ChallengeCategory = 'daily' | 'weekly' | 'achievement';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: ChallengeCategory;
  rewardDays: number;
  target: number;
  getCurrent: () => Promise<number>;
  ctaRoute?: string;
  ctaLabel?: string;
}

export interface ChallengeStatus extends Challenge {
  current: number;
  progress: number; // 0..100
  completed: boolean;
}

const CHALLENGES: Challenge[] = [
  {
    id: 'streak_7',
    title: 'هفته‌ی طلایی',
    description: '۷ روز متوالی مطالعه کن',
    icon: '🔥',
    category: 'weekly',
    rewardDays: 3,
    target: 7,
    getCurrent: async () => (await getDatabase().getUniqueStudyDays()).size,
    ctaRoute: 'dashboard',
    ctaLabel: 'شروع مطالعه',
  },
  {
    id: 'quiz_master',
    title: 'استاد آزمون',
    description: '۱۰ آزمون بساز (AI یا آفلاین)',
    icon: '📝',
    category: 'achievement',
    rewardDays: 5,
    target: 10,
    getCurrent: async () => (await getDatabase().getQuizHistory()).length,
    ctaRoute: 'quiz',
    ctaLabel: 'ساخت آزمون',
  },
  {
    id: 'first_summary',
    title: 'اولین خلاصه',
    description: 'اولین خلاصه‌ی خود را بساز',
    icon: '✨',
    category: 'daily',
    rewardDays: 1,
    target: 1,
    getCurrent: async () => {
      const sessions = await getDatabase().getStudySessions();
      return sessions.filter((s) => s.type === 'summarize').length;
    },
    ctaRoute: 'summarizer',
    ctaLabel: 'ساخت خلاصه',
  },
  {
    id: 'note_writer',
    title: 'نویسنده‌ی فعال',
    description: '۵ یادداشت بساز',
    icon: '📚',
    category: 'weekly',
    rewardDays: 2,
    target: 5,
    getCurrent: async () => (await getDatabase().getNotes()).length,
    ctaRoute: 'notes',
    ctaLabel: 'ساخت یادداشت',
  },
  {
    id: 'flashcard_50',
    title: 'کلکسیونر کارت',
    description: '۵۰ فلش‌کارت بساز',
    icon: '🃏',
    category: 'achievement',
    rewardDays: 4,
    target: 50,
    getCurrent: async () => (await getDatabase().getFlashcards()).length,
    ctaRoute: 'flashcards',
    ctaLabel: 'ساخت فلش‌کارت',
  },
  {
    id: 'high_scorer',
    title: 'نمره‌آور',
    description: '۳ آزمون با نمره بالای ۸۰٪',
    icon: '🏆',
    category: 'achievement',
    rewardDays: 5,
    target: 3,
    getCurrent: async () => {
      const quizzes = await getDatabase().getQuizHistory();
      return quizzes.filter((q) => ((q as { percentage?: number }).percentage ?? 0) >= 80).length;
    },
    ctaRoute: 'quiz',
    ctaLabel: 'ساخت آزمون',
  },
];

/** وضعیت همه‌ی چالش‌ها با progress */
export async function getChallengesWithStatus(): Promise<ChallengeStatus[]> {
  const db = getDatabase();
  const result: ChallengeStatus[] = [];

  for (const challenge of CHALLENGES) {
    const completed = await db.hasAchievement(challenge.id);
    let current = 0;
    try {
      current = await challenge.getCurrent();
    } catch { /* ignore */ }
    const progress = completed ? 100 : Math.min(100, Math.round((current / challenge.target) * 100));
    result.push({ ...challenge, current, progress, completed });
  }

  // مرتب‌سازی: تکمیل‌نشده‌ها اول (بر اساس progress نزولی)، بعد تکمیل‌شده‌ها
  return result.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return b.progress - a.progress;
  });
}

/** چک و اعطای پاداش. لیست چالش‌های تازه تکمیل‌شده را برمی‌گرداند. */
export async function checkAndReward(): Promise<ChallengeStatus[]> {
  const db = getDatabase();
  const unlocked: ChallengeStatus[] = [];

  for (const challenge of CHALLENGES) {
    if (await db.hasAchievement(challenge.id)) continue;
    try {
      const current = await challenge.getCurrent();
      if (current >= challenge.target) {
        await db.unlockAchievement(challenge.id);
        activatePremium(challenge.id, challenge.rewardDays);
        const status: ChallengeStatus = {
          ...challenge,
          current,
          progress: 100,
          completed: true,
        };
        unlocked.push(status);
        logger.info(`🎁 چالش تکمیل شد: ${challenge.title}`, { rewardDays: challenge.rewardDays });
      }
    } catch (e) {
      logger.warn('خطا در چک چالش', { id: challenge.id, error: e });
    }
  }

  return unlocked;
}

export function getAllChallenges(): Challenge[] {
  return [...CHALLENGES];
}