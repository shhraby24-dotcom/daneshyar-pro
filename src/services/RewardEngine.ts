/**
 * دانش‌یار پرو - موتور پاداش (v3: چالش‌های بیشتر + نشان‌های پلکانی نگهبان شعله)
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
  icon: string; // نام آیکون Lucide
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

// ============================================================
// helper: بیشترین زنجیره‌ی روزهای متوالی مطالعه
// ============================================================
const DAY_MS = 86400000;
async function longestConsecutiveStudyDays(): Promise<number> {
  const unique = await getDatabase().getUniqueStudyDays();
  const list = Array.from(unique);
  if (list.length === 0) return 0;
  const times = list
    .map((d) => new Date(d).getTime())
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);
  let best = 1;
  let run = 1;
  for (let i = 1; i < times.length; i++) {
    const prev = times[i - 1];
    const curr = times[i];
    if (prev === undefined || curr === undefined) continue;
    if (curr - prev === DAY_MS) run += 1;
    else if (curr !== prev) run = 1;
    if (run > best) best = run;
  }
  return best;
}

// ============================================================
// چالش‌ها
// ============================================================
const CHALLENGES: Challenge[] = [
  // ── روزانه ──
  { id: 'first_summary', title: 'اولین خلاصه', description: 'اولین خلاصه‌ی خود را بساز', icon: 'sparkles', category: 'daily', rewardDays: 1, target: 1,
    getCurrent: async () => (await getDatabase().getStudySessions()).filter((s) => s.type === 'summarize').length,
    ctaRoute: 'summarizer', ctaLabel: 'ساخت خلاصه' },
  { id: 'first_note', title: 'اولین یادداشت', description: 'اولین یادداشتت را بساز', icon: 'notes', category: 'daily', rewardDays: 1, target: 1,
    getCurrent: async () => (await getDatabase().getNotes()).length,
    ctaRoute: 'notes', ctaLabel: 'ساخت یادداشت' },
  { id: 'first_quiz', title: 'اولین آزمون', description: 'اولین آزمونت را بساز', icon: 'quiz', category: 'daily', rewardDays: 1, target: 1,
    getCurrent: async () => (await getDatabase().getQuizHistory()).length,
    ctaRoute: 'quiz', ctaLabel: 'ساخت آزمون' },

  // ── هفتگی ──
  { id: 'streak_7', title: 'قهرمان هفته', description: '۷ روز متوالی تمرین کن', icon: 'flame', category: 'weekly', rewardDays: 3, target: 7,
    getCurrent: longestConsecutiveStudyDays,
    ctaRoute: 'dashboard', ctaLabel: 'شروع مطالعه' },
  { id: 'note_writer', title: 'نویسنده‌ی فعال', description: '۵ یادداشت بساز', icon: 'books', category: 'weekly', rewardDays: 2, target: 5,
    getCurrent: async () => (await getDatabase().getNotes()).length,
    ctaRoute: 'notes', ctaLabel: 'ساخت یادداشت' },
  { id: 'card_week', title: 'کارخانه کارت', description: '۲۵ فلش‌کارت بساز', icon: 'flashcards', category: 'weekly', rewardDays: 3, target: 25,
    getCurrent: async () => (await getDatabase().getFlashcards()).length,
    ctaRoute: 'flashcards', ctaLabel: 'ساخت فلش‌کارت' },

  // ── دستاورد ──
  { id: 'flashcard_50', title: 'کلکسیونر کارت', description: '۵۰ فلش‌کارت بساز', icon: 'flashcards', category: 'achievement', rewardDays: 4, target: 50,
    getCurrent: async () => (await getDatabase().getFlashcards()).length,
    ctaRoute: 'flashcards', ctaLabel: 'ساخت فلش‌کارت' },
  { id: 'quiz_master', title: 'استاد آزمون', description: '۱۰ آزمون بساز (AI یا آفلاین)', icon: 'quiz', category: 'achievement', rewardDays: 5, target: 10,
    getCurrent: async () => (await getDatabase().getQuizHistory()).length,
    ctaRoute: 'quiz', ctaLabel: 'ساخت آزمون' },
  { id: 'high_scorer', title: 'نمره‌آور', description: '۳ آزمون با نمره بالای ۸۰٪', icon: 'trophy', category: 'achievement', rewardDays: 5, target: 3,
    getCurrent: async () => (await getDatabase().getQuizHistory()).filter((q) => ((q as { percentage?: number }).percentage ?? 0) >= 80).length,
    ctaRoute: 'quiz', ctaLabel: 'ساخت آزمون' },

  // ── نشان‌های پلکانی نگهبان شعله ──
  { id: 'guardian_30', title: 'نگهبان شعله · برنز', description: '۳۰ روز متوالی تمرین کن', icon: 'flame', category: 'achievement', rewardDays: 3, target: 30,
    getCurrent: longestConsecutiveStudyDays, ctaRoute: 'dashboard', ctaLabel: 'شروع مطالعه' },
  { id: 'guardian_60', title: 'نگهبان شعله · نقره', description: '۶۰ روز متوالی تمرین کن', icon: 'flame', category: 'achievement', rewardDays: 5, target: 60,
    getCurrent: longestConsecutiveStudyDays, ctaRoute: 'dashboard', ctaLabel: 'شروع مطالعه' },
  { id: 'guardian_90', title: 'نگهبان شعله · طلا', description: '۹۰ روز متوالی تمرین کن', icon: 'flame', category: 'achievement', rewardDays: 7, target: 90,
    getCurrent: longestConsecutiveStudyDays, ctaRoute: 'dashboard', ctaLabel: 'شروع مطالعه' },
  { id: 'guardian_180', title: 'نگهبان شعله · الماس', description: '۱۸۰ روز متوالی تمرین کن', icon: 'shield', category: 'achievement', rewardDays: 14, target: 180,
    getCurrent: longestConsecutiveStudyDays, ctaRoute: 'dashboard', ctaLabel: 'شروع مطالعه' },
  // TODO: تخفیف اشتراک برای این نشان، در فاز پولیش به Premium متصل می‌شود
  { id: 'guardian_365', title: 'نگهبان شعله · افسانه', description: '۱ سال متوالی تمرین کن + تخفیف ویژه', icon: 'award', category: 'achievement', rewardDays: 30, target: 365,
    getCurrent: longestConsecutiveStudyDays, ctaRoute: 'dashboard', ctaLabel: 'شروع مطالعه' },
];

// ============================================================
// API
// ============================================================
export async function getChallengesWithStatus(): Promise<ChallengeStatus[]> {
  const db = getDatabase();
  const result: ChallengeStatus[] = [];
  for (const challenge of CHALLENGES) {
    const completed = await db.hasAchievement(challenge.id);
    let current = 0;
    try { current = await challenge.getCurrent(); } catch { /* ignore */ }
    const progress = completed ? 100 : Math.min(100, Math.round((current / challenge.target) * 100));
    result.push({ ...challenge, current, progress, completed });
  }
  return result.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return b.progress - a.progress;
  });
}

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
        unlocked.push({ ...challenge, current, progress: 100, completed: true });
        logger.info(`چالش تکمیل شد: ${challenge.title}`, { rewardDays: challenge.rewardDays });
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