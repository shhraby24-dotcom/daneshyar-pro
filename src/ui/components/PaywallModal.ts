/**
 * دانش‌یار پرو - مودال Paywall (نمایش در لحظه نیاز)
 * با گزینه «ادامه آفلاین» برای حفظ ارزش اپ
 * @module ui/components/PaywallModal
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getRouter } from '@/core/Router';
import { createButton, BUTTON_VARIANTS } from '@/ui/components/Button';

const logger = getLogger().module('PaywallModal');
let overlayEl: HTMLElement | null = null;

/**
 * نمایش مودال paywall
 * @param context - 'quiz' | 'summarizer' (برای لاگ)
 * @param onOffline - callback برای ادامه با حالت آفلاین
 */
export function showPaywall(context: string, onOffline?: () => void): void {
  if (overlayEl) return;
  logger.info('نمایش paywall', { context });

  overlayEl = document.createElement('div');
  overlayEl.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4';

  const card = document.createElement('div');
  card.className = 'bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 fade-in';

  const header = document.createElement('div');
  header.className = 'text-center space-y-2';
  header.innerHTML = '<div class="text-5xl">💎</div><h2 class="text-2xl font-black text-slate-100">سهمیه رایگان امروز تموم شد!</h2><p class="text-slate-400 text-sm">با پریمیوم، بدون محدودیت ادامه بده</p>';
  card.appendChild(header);

  const benefits = document.createElement('div');
  benefits.className = 'space-y-2 text-sm';
  for (const text of ['🤖 سهمیه نامحدود AI (۱۰۰ آزمون در روز)', '🔄 همگام‌سازی بین دستگاه‌ها', '💜 پشتیبانی اولویت‌دار']) {
    const item = document.createElement('div');
    item.className = 'flex items-center gap-2 text-slate-300';
    item.textContent = text;
    benefits.appendChild(item);
  }
  card.appendChild(benefits);

  const btnWrap = document.createElement('div');
  btnWrap.className = 'space-y-2';

  const primaryBtn = createButton({
    label: '💎 مشاهده پلن‌های پریمیوم',
    variant: BUTTON_VARIANTS.PRIMARY,
    onClick: () => { hidePaywall(); getRouter().navigate('premium'); },
  });
  primaryBtn.classList.add('w-full');
  btnWrap.appendChild(primaryBtn);

  if (onOffline) {
    const offlineBtn = createButton({
      label: '📟 ادامه با حالت آفلاین',
      variant: BUTTON_VARIANTS.SECONDARY,
      onClick: () => { hidePaywall(); onOffline(); },
    });
    offlineBtn.classList.add('w-full');
    btnWrap.appendChild(offlineBtn);
  }

  const ghostBtn = createButton({
    label: 'فعلاً نه، بعداً',
    variant: BUTTON_VARIANTS.GHOST,
    onClick: () => { hidePaywall(); },
  });
  ghostBtn.classList.add('w-full');
  btnWrap.appendChild(ghostBtn);

  card.appendChild(btnWrap);
  overlayEl.appendChild(card);
  document.body.appendChild(overlayEl);
}

export function hidePaywall(): void {
  if (overlayEl) { overlayEl.remove(); overlayEl = null; }
}