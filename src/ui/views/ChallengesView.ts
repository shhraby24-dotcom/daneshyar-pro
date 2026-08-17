/**
 * دانش‌یار پرو - صفحه چالش‌ها (Mobile-First)
 * @module ui/views/ChallengesView
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getRouter } from '@/core/Router';
import {
  getChallengesWithStatus,
  type ChallengeCategory,
  type ChallengeStatus,
} from '@/services/RewardEngine';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '@/ui/components/Button';
import { toPersianDigits } from '@/utils/dateFormatter';

const logger = getLogger().module('ChallengesView');

const CATEGORIES: { id: ChallengeCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'همه', icon: '🎯' },
  { id: 'daily', label: 'روزانه', icon: '⚡' },
  { id: 'weekly', label: 'هفتگی', icon: '📅' },
  { id: 'achievement', label: 'دستاورد', icon: '🏆' },
];

export async function createChallengesView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر ChallengesView (mobile-first)');
  const container = document.createElement('div');
  container.className = 'mx-auto max-w-2xl p-3 sm:p-4 space-y-5 fade-in';

  let filter: ChallengeCategory | 'all' = 'all';

  const render = async (): Promise<void> => {
    container.innerHTML = '';
    const all = await getChallengesWithStatus();
    const list = filter === 'all' ? all : all.filter((c) => c.category === filter);
    const completedCount = all.filter((c) => c.completed).length;
    const totalRewardDays = all.filter((c) => c.completed).reduce((s, c) => s + c.rewardDays, 0);

    // ── Header ساده (Mobile-first) ──
    const header = document.createElement('div');
    header.className = 'text-center space-y-2 py-3';
    header.innerHTML = `
      <div class="text-5xl">🎯</div>
      <h1 class="text-2xl font-black text-slate-100">چالش‌ها و پاداش‌ها</h1>
      <p class="text-sm text-slate-400">با فعالیت، روزهای پریمیوم بگیر</p>
    `;
    container.appendChild(header);

    // ── Stats ساده (عمودی روی موبایل) ──
    const stats = document.createElement('div');
    stats.className = 'grid grid-cols-3 gap-2';
    const mkStat = (icon: string, value: string, label: string, color: string): HTMLElement => {
      const s = document.createElement('div');
      s.className = 'bg-slate-800 border border-slate-700 rounded-xl p-3 text-center';
      s.innerHTML = `
        <div class="text-xl mb-1">${icon}</div>
        <div class="text-lg font-black ${color}">${value}</div>
        <div class="text-xs text-slate-400 mt-1">${label}</div>
      `;
      return s;
    };
    stats.appendChild(mkStat('🎯', toPersianDigits(String(all.length)), 'کل', 'text-slate-100'));
    stats.appendChild(mkStat('✅', toPersianDigits(String(completedCount)), 'تکمیل', 'text-green-400'));
    stats.appendChild(mkStat('💎', toPersianDigits(String(totalRewardDays)), 'روز جایزه', 'text-primary-400'));
    container.appendChild(stats);

    // ── Filter tabs (scrollable، touch-friendly) ──
    const tabs = document.createElement('div');
    tabs.className = 'flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 sm:-mx-4 sm:px-4 no-scrollbar';
    for (const cat of CATEGORIES) {
      const tab = document.createElement('button');
      tab.type = 'button';
      const active = filter === cat.id;
      tab.className = `flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all ${
        active 
          ? 'bg-primary-500/20 border-primary-500 text-primary-300 font-bold' 
          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
      }`;
      tab.innerHTML = `<span class="text-lg">${cat.icon}</span><span class="text-sm whitespace-nowrap">${cat.label}</span>`;
      tab.addEventListener('click', () => { filter = cat.id; void render(); });
      tabs.appendChild(tab);
    }
    container.appendChild(tabs);

    // ── Challenges (تک ستونه، touch-friendly) ──
    if (list.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'text-center py-12 text-slate-500';
      empty.textContent = 'چالشی در این دسته نیست';
      container.appendChild(empty);
    } else {
      const listContainer = document.createElement('div');
      listContainer.className = 'space-y-3';
      for (const ch of list) {
        listContainer.appendChild(createChallengeCard(ch));
      }
      container.appendChild(listContainer);
    }
  };

  await render();
  return container;
}

function createChallengeCard(ch: ChallengeStatus): HTMLElement {
  const card = document.createElement('div');
  const isCompleted = ch.completed;
  const isNearComplete = !isCompleted && ch.progress >= 60;
  
  card.className = `relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all ${
    isCompleted
      ? 'bg-green-500/5 border-green-500/30'
      : isNearComplete
      ? 'bg-gradient-to-br from-accent-500/10 to-primary-500/10 border-accent-500/40'
      : 'bg-slate-800 border-slate-700'
  }`;

  // ── Header: icon + title + reward ──
  const header = document.createElement('div');
  header.className = 'flex items-start gap-3 mb-3';

  const icon = document.createElement('div');
  icon.className = 'text-4xl flex-shrink-0';
  icon.textContent = ch.icon;

  const titleWrap = document.createElement('div');
  titleWrap.className = 'flex-1 min-w-0';
  const title = document.createElement('h3');
  title.className = `font-bold text-slate-100 text-base sm:text-lg ${isCompleted ? 'line-through opacity-70' : ''}`;
  title.textContent = ch.title;
  const desc = document.createElement('p');
  desc.className = 'text-xs sm:text-sm text-slate-400 mt-0.5';
  desc.textContent = ch.description;
  titleWrap.appendChild(title);
  titleWrap.appendChild(desc);

  const reward = document.createElement('div');
  reward.className = 'flex-shrink-0 flex items-center gap-1 bg-primary-500/10 border border-primary-500/30 rounded-full px-3 py-1.5';
  reward.innerHTML = `<span class="text-sm">💎</span><span class="text-xs font-bold text-primary-300">+${toPersianDigits(String(ch.rewardDays))}</span>`;

  header.appendChild(icon);
  header.appendChild(titleWrap);
  header.appendChild(reward);
  card.appendChild(header);

  // ── Progress (فقط برای تکمیل‌نشده) ──
  if (!isCompleted) {
    const progressWrap = document.createElement('div');
    progressWrap.className = 'mb-4';
    
    const progressLabel = document.createElement('div');
    progressLabel.className = 'flex justify-between text-xs sm:text-sm mb-2';
    progressLabel.innerHTML = `
      <span class="text-slate-400">${toPersianDigits(String(ch.current))} از ${toPersianDigits(String(ch.target))}</span>
      <span class="font-bold ${isNearComplete ? 'text-accent-400' : 'text-primary-400'}">${toPersianDigits(String(ch.progress))}٪</span>
    `;
    
    const bar = document.createElement('div');
    bar.className = 'h-2.5 rounded-full bg-slate-700/60 overflow-hidden';
    const fill = document.createElement('div');
    fill.className = `h-full rounded-full transition-all duration-700 ${
      isNearComplete
        ? 'bg-gradient-to-l from-accent-400 to-accent-600'
        : 'bg-gradient-to-l from-primary-400 to-primary-600'
    }`;
    fill.style.width = `${ch.progress}%`;
    bar.appendChild(fill);
    
    progressWrap.appendChild(progressLabel);
    progressWrap.appendChild(bar);
    card.appendChild(progressWrap);
  }

  // ── Footer: status + CTA ──
  const footer = document.createElement('div');
  footer.className = 'flex items-center justify-between gap-3';

  if (isCompleted) {
    const done = document.createElement('div');
    done.className = 'flex items-center gap-2 text-green-400';
    done.innerHTML = '<span class="text-lg">✅</span><span class="text-sm font-bold">تکمیل شد</span>';
    footer.appendChild(done);
  } else {
    const status = document.createElement('div');
    status.className = 'text-xs text-slate-500';
    status.textContent = isNearComplete ? '🔥 نزدیک به تکمیل!' : 'در حال پیشرفت';
    footer.appendChild(status);

    if (ch.ctaRoute && ch.ctaLabel) {
      const cta = createButton({
        label: ch.ctaLabel,
        variant: isNearComplete ? BUTTON_VARIANTS.ACCENT : BUTTON_VARIANTS.PRIMARY,
        size: BUTTON_SIZES.SM,
        onClick: () => { void getRouter().navigate(ch.ctaRoute!); },
      });
      footer.appendChild(cta);
    }
  }

  card.appendChild(footer);
  return card;
}

export default createChallengesView;