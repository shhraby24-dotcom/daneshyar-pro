/**
 * دانش‌یار پرو - صفحه دعوت دوستان (mobile-first)
 * @module ui/views/InviteView
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

const logger = getLogger().module('InviteView');

export async function createInviteView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر InviteView');
  const container = document.createElement('div');
  container.className = 'mx-auto max-w-2xl p-3 sm:p-4 space-y-5 fade-in';

  const header = document.createElement('div');
  header.className = 'text-center space-y-2 py-3';
  header.innerHTML = `
    <div class="text-6xl">🎁</div>
    <h1 class="text-2xl sm:text-3xl font-black text-slate-100">دعوت دوستان</h1>
    <p class="text-sm text-slate-400">با هر دعوت موفق، ${toPersianDigits(String(REWARD_DAYS))} روز پریمیوم بگیر</p>
  `;
  container.appendChild(header);

  const rewardCard = document.createElement('div');
  rewardCard.className = 'bg-gradient-to-br from-primary-500/10 to-accent-500/10 border border-primary-500/30 rounded-2xl p-5 text-center space-y-2';
  rewardCard.innerHTML = `
    <div class="text-lg font-bold text-slate-100">🎉 پاداش دوطرفه</div>
    <div class="text-sm text-slate-300">${toPersianDigits(String(REWARD_DAYS))} روز پریمیوم برای تو + ${toPersianDigits(String(REWARD_DAYS))} روز برای دوستت</div>
  `;
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
      label: '🔑 ورود / ثبت‌نام',
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

  const copyBtn = createButton({
    label: '📋 کپی لینک',
    variant: BUTTON_VARIANTS.PRIMARY,
    onClick: async () => {
      try {
        await navigator.clipboard.writeText(link ?? '');
        getToast().success('لینک کپی شد 📋');
      } catch {
        getToast().error('کپی ممکن نشد');
      }
    },
  });
  btnRow.appendChild(copyBtn);

  const shareBtn = createButton({
    label: '📤 اشتراک‌گذاری',
    variant: BUTTON_VARIANTS.SECONDARY,
    onClick: async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'دانش‌یار پرو',
            text: 'با این لینک ثبت‌نام کن و هر دو ۳ روز پریمیوم رایگان بگیریم!',
            url: link ?? '',
          });
        } catch { /* user cancelled */ }
      } else {
        try {
          await navigator.clipboard.writeText(link ?? '');
          getToast().success('لینک کپی شد، حالا به اشتراک بگذار 📋');
        } catch {
          getToast().error('اشتراک‌گذاری ممکن نشد');
        }
      }
    },
  });
  btnRow.appendChild(shareBtn);

  codeCard.appendChild(btnRow);
  container.appendChild(codeCard);

  const statsCard = document.createElement('div');
  statsCard.className = 'bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-3';

  const statsHeader = document.createElement('div');
  statsHeader.className = 'font-bold text-slate-100';
  statsHeader.textContent = '📊 آمار دعوت‌های تو';
  statsCard.appendChild(statsHeader);

  const progressWrap = document.createElement('div');
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
  const bar = document.createElement('div');
  bar.className = 'h-2.5 rounded-full bg-slate-700/60 overflow-hidden';
  const fill = document.createElement('div');
  fill.className = 'h-full rounded-full bg-gradient-to-l from-primary-400 to-primary-600 transition-all';
  fill.style.width = `${Math.min(100, (stats.count / stats.max) * 100)}%`;
  bar.appendChild(fill);
  progressWrap.appendChild(progressLabel);
  progressWrap.appendChild(bar);
  statsCard.appendChild(progressWrap);

  container.appendChild(statsCard);

  const guideCard = document.createElement('div');
  guideCard.className = 'bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-3';
  const guideHeader = document.createElement('div');
  guideHeader.className = 'font-bold text-slate-100';
  guideHeader.textContent = '🗺️ چطور کار می‌کنه؟';
  guideCard.appendChild(guideHeader);

  const steps = [
    { icon: '🔗', text: 'لینک دعوتت را به دوستت بفرست' },
    { icon: '✍️', text: 'دوستت با لینک ثبت‌نام می‌کند' },
    { icon: '🎁', text: 'هر دو ۳ روز پریمیوم می‌گیرید' },
  ];
  for (const step of steps) {
    const item = document.createElement('div');
    item.className = 'flex items-center gap-3 p-2 bg-slate-900/50 rounded-lg';
    const ic = document.createElement('div');
    ic.className = 'text-2xl flex-shrink-0';
    ic.textContent = step.icon;
    const tx = document.createElement('div');
    tx.className = 'text-sm text-slate-200';
    tx.textContent = step.text;
    item.appendChild(ic);
    item.appendChild(tx);
    guideCard.appendChild(item);
  }
  container.appendChild(guideCard);

  return container;
}

export default createInviteView;