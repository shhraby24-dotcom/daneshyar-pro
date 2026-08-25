/**
 * ============================================================
 * دانش‌یار پرو - دعوت دوستان (InviteView v2)
 * ============================================================
 * ✅ بدون ایموجی — آیکون‌های Lucide
 * ✅ پاداش دوطرفه با دو مینی‌کارت «تو / دوستت»
 * ✅ راهنمای شماره‌دار ۱-۲-۳
 * ✅ هماهنگ با مرکز مأموریت و پریمیوم
 * 🔒 XSS-safe
 * @module ui/views/InviteView
 * @version 2.0.0
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getRouter } from '@/core/Router';
import {
  getMyReferralCode,
  getReferralLink,
  getReferralStats,
  REWARD_DAYS,
} from '@/services/ReferralService';
import { createButton, BUTTON_VARIANTS } from '@/ui/components/Button';
import { getToast } from '@/ui/components/Toast';
import { toPersianDigits } from '@/utils/dateFormatter';
import { createIcon, iconHTML } from '@/services/IconService';

const logger = getLogger().module('InviteView');

export async function createInviteView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر InviteView');
  const container = document.createElement('div');
  container.className = 'mx-auto max-w-2xl p-3 sm:p-4 space-y-5 fade-in';

  // ── Hero ──
  const hero = document.createElement('div');
  hero.className = 'text-center space-y-3 py-3';
  const iconWrap = document.createElement('div');
  iconWrap.className = 'relative inline-flex';
  const halo = document.createElement('div');
  halo.className = 'absolute inset-0 scale-150 rounded-full bg-accent-500/25 blur-2xl pointer-events-none';
  iconWrap.appendChild(halo);
  iconWrap.appendChild(createIcon('gift', 56, 'relative text-accent-400'));
  hero.appendChild(iconWrap);
  const t = document.createElement('h1');
  t.className = 'text-2xl sm:text-3xl font-black text-slate-100';
  t.textContent = 'دعوت دوستان';
  hero.appendChild(t);
  const s = document.createElement('p');
  s.className = 'text-sm text-slate-400';
  s.textContent = `با هر دعوت موفق، ${toPersianDigits(String(REWARD_DAYS))} روز پریمیوم بگیر`;
  hero.appendChild(s);
  container.appendChild(hero);

  // ── پاداش دوطرفه (دو مینی‌کارت) ──
  const rewardCard = document.createElement('div');
  rewardCard.className =
    'bg-gradient-to-br from-primary-500/10 to-accent-500/10 border border-primary-500/30 rounded-2xl p-5 space-y-4';
  const rTitle = document.createElement('div');
  rTitle.className = 'flex items-center justify-center gap-2 text-lg font-bold text-slate-100';
  rTitle.appendChild(createIcon('gift', 20, 'text-accent-400'));
  const rt = document.createElement('span');
  rt.textContent = 'پاداش دوطرفه';
  rTitle.appendChild(rt);
  rewardCard.appendChild(rTitle);

  const twoCol = document.createElement('div');
  twoCol.className = 'grid grid-cols-[1fr_auto_1fr] items-center gap-2';
  const mkSide = (label: string): HTMLElement => {
    const side = document.createElement('div');
    side.className = 'bg-slate-800/70 border border-slate-700 rounded-xl p-3 text-center space-y-1';
    const ic = document.createElement('div');
    ic.className = 'flex justify-center text-primary-300';
    ic.appendChild(createIcon('user', 24));
    side.appendChild(ic);
    const who = document.createElement('div');
    who.className = 'text-sm font-bold text-slate-200';
    who.textContent = label;
    side.appendChild(who);
    const days = document.createElement('div');
    days.className = 'text-xs font-bold text-accent-300';
    days.textContent = `+${toPersianDigits(String(REWARD_DAYS))} روز`;
    side.appendChild(days);
    return side;
  };
  twoCol.appendChild(mkSide('تو'));
  const plus = document.createElement('div');
  plus.className = 'flex items-center text-slate-500';
  plus.appendChild(createIcon('plus', 20));
  twoCol.appendChild(plus);
  twoCol.appendChild(mkSide('دوستت'));
  rewardCard.appendChild(twoCol);
  container.appendChild(rewardCard);

  const code = await getMyReferralCode();
  if (!code) {
    const msg = document.createElement('div');
    msg.className = 'bg-slate-800 border border-slate-700 rounded-xl p-5 text-center space-y-3';
    const txt = document.createElement('div');
    txt.className = 'text-sm text-slate-400';
    txt.textContent = 'برای گرفتن کد دعوت، ابتدا وارد حساب شو.';
    msg.appendChild(txt);
    const loginBtn = createButton({
      label: 'ورود / ثبت‌نام',
      iconHtml: iconHTML('login', 18),
      variant: BUTTON_VARIANTS.PRIMARY,
      onClick: () => { void getRouter().navigate('auth'); },
    });
    loginBtn.classList.add('w-full');
    msg.appendChild(loginBtn);
    container.appendChild(msg);
    return container;
  }

  const link = await getReferralLink();
  const stats = await getReferralStats();

  // ── کارت کد دعوت ──
  const codeCard = document.createElement('div');
  codeCard.className = 'bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4';
  const codeLabel = document.createElement('div');
  codeLabel.className = 'text-sm text-slate-400 text-center';
  codeLabel.textContent = 'کد دعوت تو:';
  codeCard.appendChild(codeLabel);

  const codeDisplay = document.createElement('div');
  codeDisplay.className = 'bg-slate-900 border border-primary-500/40 rounded-xl p-4 text-center';
  const codeText = document.createElement('div');
  codeText.className = 'text-2xl font-black text-primary-300 tracking-widest';
  codeText.dir = 'ltr';
  codeText.textContent = code;
  codeDisplay.appendChild(codeText);
  codeCard.appendChild(codeDisplay);

  const btnRow = document.createElement('div');
  btnRow.className = 'grid grid-cols-2 gap-3';
  btnRow.appendChild(
    createButton({
      label: 'کپی لینک',
      iconHtml: iconHTML('copy', 16),
      variant: BUTTON_VARIANTS.PRIMARY,
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(link ?? '');
          getToast().success('لینک کپی شد');
        } catch {
          getToast().error('کپی ممکن نشد');
        }
      },
    })
  );
  btnRow.appendChild(
    createButton({
      label: 'اشتراک‌گذاری',
      iconHtml: iconHTML('share', 16),
      variant: BUTTON_VARIANTS.SECONDARY,
      onClick: async () => {
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'دانش‌یار پرو',
              text: `با این لینک ثبت‌نام کن و هر دو ${REWARD_DAYS} روز پریمیوم رایگان بگیریم!`,
              url: link ?? '',
            });
          } catch { /* user cancelled */ }
        } else {
          try {
            await navigator.clipboard.writeText(link ?? '');
            getToast().success('لینک کپی شد، حالا به اشتراک بگذار');
          } catch {
            getToast().error('اشتراک‌گذاری ممکن نشد');
          }
        }
      },
    })
  );
  codeCard.appendChild(btnRow);
  container.appendChild(codeCard);

  // ── کارت آمار ──
  const statsCard = document.createElement('div');
  statsCard.className = 'bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-3';
  const statsHeader = document.createElement('div');
  statsHeader.className = 'flex items-center gap-2 font-bold text-slate-100';
  statsHeader.appendChild(createIcon('trending', 18, 'text-primary-400'));
  const sh = document.createElement('span');
  sh.textContent = 'آمار دعوت‌های تو';
  statsHeader.appendChild(sh);
  statsCard.appendChild(statsHeader);

  const progressLabel = document.createElement('div');
  progressLabel.className = 'flex justify-between text-xs mb-1.5';
  const pl = document.createElement('span');
  pl.className = 'text-slate-400';
  pl.textContent = `${toPersianDigits(String(stats.count))} از ${toPersianDigits(String(stats.max))} دعوت`;
  const pr = document.createElement('span');
  pr.className = 'font-bold text-primary-400';
  pr.textContent = `${toPersianDigits(String(stats.count * REWARD_DAYS))} روز پریمیوم گرفته`;
  progressLabel.appendChild(pl);
  progressLabel.appendChild(pr);
  statsCard.appendChild(progressLabel);
  const bar = document.createElement('div');
  bar.className = 'h-2.5 rounded-full bg-slate-700/60 overflow-hidden';
  const fill = document.createElement('div');
  fill.className = 'h-full rounded-full bg-gradient-to-l from-primary-400 to-primary-600 transition-all';
  fill.style.width = `${Math.min(100, (stats.count / stats.max) * 100)}%`;
  bar.appendChild(fill);
  statsCard.appendChild(bar);
  container.appendChild(statsCard);

  // ── راهنمای شماره‌دار ──
  const guideCard = document.createElement('div');
  guideCard.className = 'bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-3';
  const guideHeader = document.createElement('div');
  guideHeader.className = 'font-bold text-slate-100';
  guideHeader.textContent = 'چطور کار می‌کنه؟';
  guideCard.appendChild(guideHeader);

  const steps = [
    { num: '۱', icon: 'send', text: 'لینک دعوتت را به دوستت بفرست' },
    { num: '۲', icon: 'edit', text: 'دوستت با لینک ثبت‌نام می‌کند' },
    { num: '۳', icon: 'gift', text: `هر دو ${toPersianDigits(String(REWARD_DAYS))} روز پریمیوم می‌گیرید` },
  ];
  steps.forEach((step) => {
    const item = document.createElement('div');
    item.className =
      'flex w-full items-center gap-4 rounded-xl border border-slate-700 ' +
      'bg-slate-800 p-4 text-start transition-all hover:border-accent-500/50 hover:bg-slate-700/50';
    const numCircle = document.createElement('div');
    numCircle.className =
      'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-accent-500/40 ' +
      'bg-accent-500/15 font-black text-accent-400';
    numCircle.textContent = step.num;
    const ic = document.createElement('span');
    ic.className = 'flex flex-shrink-0 items-center text-primary-400';
    ic.appendChild(createIcon(step.icon, 22));
    const tx = document.createElement('div');
    tx.className = 'min-w-0 flex-1 text-sm text-slate-200';
    tx.textContent = step.text;
    item.appendChild(numCircle);
    item.appendChild(ic);
    item.appendChild(tx);
    guideCard.appendChild(item);
  });
  container.appendChild(guideCard);

  return container;
}

export default createInviteView;