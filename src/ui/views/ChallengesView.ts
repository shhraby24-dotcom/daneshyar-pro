/**
 * ============================================================
 * دانش‌یار پرو - مرکز مأموریت (ChallengesView v2)
 * ============================================================
 * ✅ بدون ایموجی — آیکون‌های Lucide
 * ✅ بج دسته با رنگ‌بندی + چیپ پاداش طلایی
 * ✅ ۳ حالت: تکمیل‌شده / نزدیک به تکمیل / در حال پیشرفت
 * ✅ بدون تایمر ریست (تمیز و ساده)
 * 🔒 XSS-safe
 * @module ui/views/ChallengesView
 * @version 2.0.0
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getRouter } from '@/core/Router';
import { getChallengesWithStatus, type ChallengeCategory, type ChallengeStatus } from '@/services/RewardEngine';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '@/ui/components/Button';
import { toPersianDigits } from '@/utils/dateFormatter';
import { createIcon } from '@/services/IconService';

const logger = getLogger().module('ChallengesView');

const CATEGORY_META: Record<ChallengeCategory, { label: string; icon: string; badge: string }> = {
  daily: { label: 'روزانه', icon: 'zap', badge: 'bg-primary-500/15 text-primary-300' },
  weekly: { label: 'هفتگی', icon: 'calendar', badge: 'bg-accent-500/15 text-accent-300' },
  achievement: { label: 'دستاورد', icon: 'trophy', badge: 'bg-purple-500/15 text-purple-300' },
};

const TABS: { id: ChallengeCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'همه', icon: 'layers' },
  { id: 'daily', label: 'روزانه', icon: 'zap' },
  { id: 'weekly', label: 'هفتگی', icon: 'calendar' },
  { id: 'achievement', label: 'دستاورد', icon: 'trophy' },
];

export async function createChallengesView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر مرکز مأموریت');
  const container = document.createElement('div');
  container.className = 'mx-auto max-w-2xl p-3 sm:p-4 space-y-5 fade-in';
  let filter: ChallengeCategory | 'all' = 'all';

  const render = async (): Promise<void> => {
    container.innerHTML = '';
    const all = await getChallengesWithStatus();
    const list = filter === 'all' ? all : all.filter((c) => c.category === filter);
    const completedCount = all.filter((c) => c.completed).length;
    const totalRewardDays = all.filter((c) => c.completed).reduce((s, c) => s + c.rewardDays, 0);

    // ── Hero ──
    const hero = document.createElement('div');
    hero.className = 'text-center space-y-3 py-3';
    const iconWrap = document.createElement('div');
    iconWrap.className = 'relative inline-flex';
    const halo = document.createElement('div');
    halo.className = 'absolute inset-0 scale-150 rounded-full bg-accent-500/25 blur-2xl pointer-events-none';
    iconWrap.appendChild(halo);
    iconWrap.appendChild(createIcon('target', 56, 'relative text-accent-400'));
    hero.appendChild(iconWrap);
    const t = document.createElement('h1');
    t.className = 'text-2xl font-black text-slate-100';
    t.textContent = 'مرکز مأموریت';
    hero.appendChild(t);
    const s = document.createElement('p');
    s.className = 'text-sm text-slate-400';
    s.textContent = 'با فعالیت، روزهای پریمیوم و نشان‌های ویژه بگیر';
    hero.appendChild(s);
    // پیشرفت کلی
    const overall = document.createElement('div');
    overall.className = 'max-w-xs mx-auto';
    const oLabel = document.createElement('div');
    oLabel.className = 'text-xs text-slate-500 mb-1.5';
    oLabel.textContent = `${toPersianDigits(String(completedCount))} از ${toPersianDigits(String(all.length))} مأموریت انجام شده`;
    overall.appendChild(oLabel);
    const oBar = document.createElement('div');
    oBar.className = 'h-2 rounded-full bg-slate-700/60 overflow-hidden';
    const oFill = document.createElement('div');
    oFill.className = 'h-full rounded-full bg-gradient-to-l from-accent-400 to-accent-600 transition-all duration-700';
    oFill.style.width = `${all.length ? Math.round((completedCount / all.length) * 100) : 0}%`;
    oBar.appendChild(oFill);
    overall.appendChild(oBar);
    hero.appendChild(overall);
    container.appendChild(hero);

    // ── Stats ─
    const stats = document.createElement('div');
    stats.className = 'grid grid-cols-3 gap-2';
    const mkStat = (icon: string, value: string, label: string, color: string): HTMLElement => {
      const s = document.createElement('div');
      s.className = 'bg-slate-800 border border-slate-700 rounded-xl p-3 text-center';
      const ic = document.createElement('div');
      ic.className = 'flex justify-center mb-1 text-slate-400';
      ic.appendChild(createIcon(icon, 20));
      const v = document.createElement('div');
      v.className = `text-lg font-black ${color}`;
      v.textContent = value;
      const l = document.createElement('div');
      l.className = 'text-xs text-slate-400 mt-1';
      l.textContent = label;
      s.appendChild(ic); s.appendChild(v); s.appendChild(l);
      return s;
    };
    stats.appendChild(mkStat('target', toPersianDigits(String(all.length)), 'کل', 'text-slate-100'));
    stats.appendChild(mkStat('check', toPersianDigits(String(completedCount)), 'تکمیل', 'text-green-400'));
    stats.appendChild(mkStat('award', toPersianDigits(String(totalRewardDays)), 'روز جایزه', 'text-primary-400'));
    container.appendChild(stats);

    // ── Tabs ──
    const tabs = document.createElement('div');
    tabs.className = 'flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 sm:-mx-4 sm:px-4 no-scrollbar';
    for (const tab of TABS) {
      const count = tab.id === 'all' ? all.length : all.filter((c) => c.category === tab.id).length;
      const btn = document.createElement('button');
      btn.type = 'button';
      const active = filter === tab.id;
      btn.className = `flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all ${
        active ? 'bg-primary-500/20 border-primary-500 text-primary-300 font-bold' : 'bg-slate-800 border-slate-700 text-slate-400'
      }`;
      btn.appendChild(createIcon(tab.icon, 16));
      const lbl = document.createElement('span');
      lbl.className = 'text-sm whitespace-nowrap';
      lbl.textContent = `${tab.label} · ${toPersianDigits(String(count))}`;
      btn.appendChild(lbl);
      btn.addEventListener('click', () => { filter = tab.id; void render(); });
      tabs.appendChild(btn);
    }
    container.appendChild(tabs);

    // ── List ─
    if (list.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'text-center py-12 text-slate-500';
      empty.textContent = 'چالشی در این دسته نیست';
      container.appendChild(empty);
    } else {
      const listContainer = document.createElement('div');
      listContainer.className = 'space-y-3';
      for (const ch of list) listContainer.appendChild(createChallengeCard(ch));
      container.appendChild(listContainer);
    }
  };

  await render();
  return container;
}

function createChallengeCard(ch: ChallengeStatus): HTMLElement {
  const meta = CATEGORY_META[ch.category];
  const isCompleted = ch.completed;
  const isNear = !isCompleted && ch.progress >= 60;

  const card = document.createElement('div');
  card.className = `relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all ${
    isCompleted
      ? 'bg-green-500/5 border-green-500/30'
      : isNear
        ? 'bg-gradient-to-br from-accent-500/10 to-primary-500/10 border-accent-500/60'
        : 'bg-slate-800 border-slate-700'
  }`;

  // ── Header ──
  const header = document.createElement('div');
  header.className = 'flex items-start gap-3 mb-3';
  const icon = document.createElement('div');
  icon.className = `w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.badge}`;
  icon.appendChild(createIcon(ch.icon, 24));
  const titleWrap = document.createElement('div');
  titleWrap.className = 'flex-1 min-w-0';
  const catRow = document.createElement('div');
  catRow.className = 'flex items-center gap-2 mb-0.5';
  const cat = document.createElement('span');
  cat.className = `text-xs px-2 py-0.5 rounded-full ${meta.badge}`;
  cat.textContent = meta.label;
  catRow.appendChild(cat);
  if (isNear) {
    const near = document.createElement('span');
    near.className = 'flex items-center gap-1 text-xs text-accent-400 font-bold';
    near.appendChild(createIcon('flame', 12));
    const nt = document.createElement('span');
    nt.textContent = 'نزدیکه!';
    near.appendChild(nt);
    catRow.appendChild(near);
  }
  titleWrap.appendChild(catRow);
  const title = document.createElement('h3');
  title.className = `font-bold text-slate-100 text-base sm:text-lg ${isCompleted ? 'line-through opacity-70' : ''}`;
  title.textContent = ch.title;
  titleWrap.appendChild(title);
  const desc = document.createElement('p');
  desc.className = 'text-xs sm:text-sm text-slate-400 mt-0.5';
  desc.textContent = ch.description;
  titleWrap.appendChild(desc);
  const reward = document.createElement('div');
  reward.className = 'flex-shrink-0 flex items-center gap-1 bg-accent-500/10 border border-accent-500/30 rounded-full px-3 py-1.5';
  reward.appendChild(createIcon('award', 14, 'text-accent-400'));
  const rv = document.createElement('span');
  rv.className = 'text-xs font-bold text-accent-300';
  rv.textContent = '+' + toPersianDigits(String(ch.rewardDays));
  reward.appendChild(rv);
  header.appendChild(icon); header.appendChild(titleWrap); header.appendChild(reward);
  card.appendChild(header);

  // ── Progress ──
  if (!isCompleted) {
    const progressWrap = document.createElement('div');
    progressWrap.className = 'mb-4';
    const progressLabel = document.createElement('div');
    progressLabel.className = 'flex justify-between text-xs sm:text-sm mb-2';
    const cur = document.createElement('span');
    cur.className = 'text-slate-400';
    cur.textContent = `${toPersianDigits(String(ch.current))} از ${toPersianDigits(String(ch.target))}`;
    const pct = document.createElement('span');
    pct.className = `font-bold ${isNear ? 'text-accent-400' : 'text-primary-400'}`;
    pct.textContent = toPersianDigits(String(ch.progress)) + '٪';
    progressLabel.appendChild(cur); progressLabel.appendChild(pct);
    progressWrap.appendChild(progressLabel);
    const bar = document.createElement('div');
    bar.className = 'h-2.5 rounded-full bg-slate-700/60 overflow-hidden';
    const fill = document.createElement('div');
    fill.className = `h-full rounded-full transition-all duration-700 ${
      isNear ? 'bg-gradient-to-l from-accent-400 to-accent-600' : 'bg-gradient-to-l from-primary-400 to-primary-600'
    }`;
    fill.style.width = `${ch.progress}%`;
    bar.appendChild(fill);
    progressWrap.appendChild(bar);
    card.appendChild(progressWrap);
  }

  // ── Footer ──
  const footer = document.createElement('div');
  footer.className = 'flex items-center justify-between gap-3';
  if (isCompleted) {
    const done = document.createElement('div');
    done.className = 'flex items-center gap-2 text-green-400';
    done.appendChild(createIcon('check', 18));
    const dt = document.createElement('span');
    dt.className = 'text-sm font-bold';
    dt.textContent = 'تکمیل شد';
    done.appendChild(dt);
    footer.appendChild(done);
  } else {
    const status = document.createElement('div');
    status.className = 'text-xs text-slate-500';
    status.textContent = 'در حال پیشرفت';
    footer.appendChild(status);
    if (ch.ctaRoute && ch.ctaLabel) {
      footer.appendChild(
        createButton({
          label: ch.ctaLabel,
          variant: isNear ? BUTTON_VARIANTS.ACCENT : BUTTON_VARIANTS.PRIMARY,
          size: BUTTON_SIZES.SM,
          onClick: () => { void getRouter().navigate(ch.ctaRoute!); },
        })
      );
    }
  }
  card.appendChild(footer);
  return card;
}

export default createChallengesView;