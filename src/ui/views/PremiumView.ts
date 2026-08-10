/**
 * دانش‌یار پرو - صفحه Paywall
 * @module ui/views/PremiumView
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getRouter } from '@/core/Router';
import { getSession } from '@/services/AuthService';
import { PLANS, isPremium, tryPromo, formatToman, getPremiumPlan } from '@/services/Premium';
import { requestPayment } from '@/services/PaymentService';
import { createButton, BUTTON_VARIANTS } from '@/ui/components/Button';
import { getToast } from '@/ui/components/Toast';
const logger = getLogger().module('PremiumView');

const BENEFITS = [
  { icon: '🤖', title: 'سهمیه نامحدود AI', desc: 'آزمون و خلاصه‌ی بی‌پایان' },
  { icon: '🔄', title: 'همگام‌سازی ابری', desc: 'داده‌هایت روی همه‌ی دستگاه‌ها' },
  { icon: '💜', title: 'پشتیبانی اولویت‌دار', desc: 'مستقیم با تیم در تماس باش' },
  { icon: '🚀', title: 'دسترسی زودهنگام', desc: 'اولین نفر در فیچرهای جدید' },
];

export async function createPremiumView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر PremiumView');
  const container = document.createElement('div');
  container.className = 'max-w-3xl mx-auto p-4 space-y-6 fade-in';

  const render = (): void => {
    container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'text-center space-y-3 py-4';
    header.innerHTML = '<div class="text-6xl">💎</div><h1 class="text-3xl font-black text-slate-100">دانش‌یار پریمیوم</h1><p class="text-slate-400">یادگیری بی‌وقفه، بدون محدودیت</p>';
    container.appendChild(header);

    if (isPremium()) {
      const active = document.createElement('div');
      active.className = 'bg-green-500/10 border border-green-500/40 rounded-xl p-4 text-center text-green-400 font-bold';
      active.textContent = '✅ پریمیوم فعال است';
      container.appendChild(active);
    }

    const benefits = document.createElement('div');
    benefits.className = 'grid grid-cols-1 sm:grid-cols-2 gap-3';
    for (const b of BENEFITS) {
      const card = document.createElement('div');
      card.className = 'bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex gap-3 items-start';
      card.innerHTML = '<div class="text-3xl">' + b.icon + '</div><div><div class="font-bold text-slate-100">' + b.title + '</div><div class="text-sm text-slate-400">' + b.desc + '</div></div>';
      benefits.appendChild(card);
    }
    container.appendChild(benefits);

    const plansWrap = document.createElement('div');
    plansWrap.className = 'grid grid-cols-1 sm:grid-cols-2 gap-4';
    for (const plan of PLANS) {
      const card = document.createElement('div');
      card.className = 'bg-slate-800 border border-slate-700 rounded-2xl p-5 relative ' + (plan.badge ? 'ring-2 ring-primary-500' : '');
      const info = document.createElement('div');
      info.innerHTML = '<div class="text-lg font-bold text-slate-100 mb-1">' + (plan.badge ? plan.badge + ' ' : '') + plan.label + '</div><div class="text-3xl font-black text-slate-100 mb-1">' + formatToman(plan.priceToman) + '</div><div class="text-sm text-slate-500">به ازای هر ' + plan.period + '</div>';
      card.appendChild(info);

      const isActive = isPremium() && getPremiumPlan() === plan.id;
      const buyBtn = createButton({
        label: isActive ? '✅ فعال' : 'خرید این پلن',
        variant: BUTTON_VARIANTS.PRIMARY,
        onClick: async () => {
          const session = await getSession();
          if (!session?.user) {
            getToast().error('برای خرید ابتدا وارد شوید');
            getRouter().navigate('auth');
            return;
          }
          getToast().info('در حال پردازش پرداخت...', 'بتا');
          const result = await requestPayment(plan);
          if (result.ok) {
            getToast().success(result.message ?? 'پریمیوم فعال شد!');
            render();
          } else {
            getToast().error(result.error ?? 'خطا در پرداخت');
          }
        },
      });
      buyBtn.classList.add('w-full', 'mt-4');
      card.appendChild(buyBtn);
      plansWrap.appendChild(card);
    }
    container.appendChild(plansWrap);

    const promoWrap = document.createElement('div');
    promoWrap.className = 'bg-slate-800/60 border border-slate-700 rounded-xl p-4';
    promoWrap.innerHTML = '<div class="text-sm text-slate-400 mb-2">🎟️ کد تخفیف / هدیه داری؟</div>';
    const promoInput = document.createElement('input');
    promoInput.type = 'text';
    promoInput.placeholder = 'مثلاً DANESHYAR-PRO';
    promoInput.className = 'input w-full mb-2';
    promoWrap.appendChild(promoInput);
    const promoBtn = createButton({
      label: 'اعمال کد',
      variant: BUTTON_VARIANTS.PRIMARY,
      onClick: () => {
        const code = promoInput.value.trim();
        if (!code) { getToast().error('کد را وارد کن'); return; }
        if (tryPromo(code)) { getToast().success('🎉 کد اعمال شد!'); render(); }
        else { getToast().error('کد نامعتبر است'); }
      },
    });
    promoWrap.appendChild(promoBtn);
    container.appendChild(promoWrap);
  };

  render();
  return container;
}

export default createPremiumView;