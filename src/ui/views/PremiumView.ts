/**
 * دانش‌یار پرو - صفحه اشتراک پریمیوم
 * پرداخت دستی: کاربر رسید را ارسال می‌کند و کد فعال‌سازی دریافت می‌کند
 * @module ui/views/PremiumView
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getRouter } from '@/core/Router';
import { getSession } from '@/services/AuthService';
import {
  PLANS,
  formatToman,
  monthlyEquivalent,
  savingsPercent,
} from '@/services/Premium';
import { getCurrentSubscription, getSubscriptionInfo, isSubscriptionValid, getSubscriptionDaysLeft, getSubscriptionPlan, reloadSubscription } from '@/services/SubscriptionService';
import { redeemActivationCode } from '@/services/ActivationCodeService';
import { isTrialActive, hasUsedTrial, startTrial, getTrialDaysRemaining } from '@/services/TrialService';
import { toPersianDigits } from '@/utils/dateFormatter';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '@/ui/components/Button';
import { getToast } from '@/ui/components/Toast';
import { createIcon, iconHTML } from '@/services/IconService';

const logger = getLogger().module('PremiumView');

type Plan = (typeof PLANS)[number];

const RECOMMENDED_ID: string =
  PLANS.some((p) => p.id === 'yearly')
    ? 'yearly'
    : (PLANS.find((p) => p.highlight)?.id ?? PLANS[0]?.id ?? '');

const BENEFITS = [
  { icon: 'sparkles', title: 'سهمیه نامحدود AI', desc: 'آزمون و خلاصه‌ی بی‌پایان' },
  { icon: 'sync', title: 'همگام‌سازی ابری', desc: 'داده‌هایت روی همه‌ی دستگاه‌ها' },
  { icon: 'mail', title: 'پشتیبانی اولویت‌دار', desc: 'مستقیم با تیم در تماس باش' },
  { icon: 'zap', title: 'دسترسی زودهنگام', desc: 'اولین نفر در فیچرهای جدید' },
];

const TRUST_ROWS = [
  { icon: 'shield', title: 'پرداخت امن', desc: 'پرداخت از طریق درگاه رسمی بانکی انجام می‌شود.' },
  { icon: 'award', title: 'ضمانت ۷ روزه', desc: 'اگر راضی نبودی، بدون پرسش، تمام پولت برمی‌گردد.' },
  { icon: 'user', title: 'هویت مشخص', desc: 'توسعه‌دهنده و راه‌های ارتباطی در صفحه‌ی «درباره» آمده است.' },
  { icon: 'security', title: 'داده‌های تو مال توست', desc: 'حتی بدون خرید، داده‌هایت روی دستگاه خودت امن می‌ماند.' },
];

const COMPARISON = [
  { label: 'یادداشت و فلش‌کارت پایه', free: true, premium: true },
  { label: 'سهمیه‌ی بیشتر هوش مصنوعی', free: false, premium: true },
  { label: 'همگام‌سازی ابری بین دستگاه‌ها', free: false, premium: true },
  { label: 'آمار و نقشه‌ی فعالیت کامل', free: false, premium: true },
  { label: 'پشتیبانی اولویت‌دار', free: false, premium: true },
];

const FAQ = [
  { q: 'آیا پرداخت امن است؟', a: 'بله؛ پرداخت فقط از درگاه رسمی بانکی انجام می‌شود.' },
  { q: 'اگر پول دادم و پریمیوم فعال نشد چه؟', a: 'فعال‌سازی توسط تیم پشتیبانی پس از تأیید پرداخت انجام می‌شود.' },
  { q: 'اگر راضی نبودم چه؟', a: 'تا ۷ روز، بدون هیچ سوالی، تمام مبلغ را برمی‌گردانیم.' },
  { q: 'بعد از پایان اشتراک چه می‌شود؟', a: 'هیچ داده‌ای حذف نمی‌شود؛ فقط امکانات پریمیوم موقتاً غیرفعال می‌شوند و هر زمان می‌توانی تمدید کنی.' },
  { q: 'آیا باید حساب بسازم؟', a: 'برای همگام‌سازی بله؛ برای استفاده‌ی محلی خیر.' },
  { q: 'آفلاین هم کار می‌کند؟', a: 'بله؛ هسته‌ی برنامه آفلاین است. هوش مصنوعی و سینک به اینترنت نیاز دارند.' },
  { q: 'می‌توانم بعداً پلن را عوض کنم؟', a: 'بله؛ هر زمان می‌توانی پلن را تغییر دهی.' },
];

const SUPPORT_CONTACTS = {
  telegram: '@S_upport_Daneshyar',
  email: 'support.daneshyar.yar@gmail.com'
};

export async function createPremiumView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('Rendering PremiumView');
  const container = document.createElement('div');
  container.className = 'max-w-3xl mx-auto p-4 space-y-8 fade-in';

  const redeemCode = async (code: string): Promise<void> => {
    const session = await getSession();
    if (!session?.user) {
      getToast().error('برای فعال‌سازی کد ابتدا وارد شوید');
      getRouter().navigate('auth');
      return;
    }
    
    if (!code || code.trim().length < 4) {
      getToast().error('کد باید حداقل ۴ کاراکتر باشد');
      return;
    }
    
    getToast().info('در حال بررسی کد...');
    
    try {
      const result = await redeemActivationCode(code);
      if (result.ok) {
        getToast().success('کد با موفقیت فعال شد! اشتراک شما فعال است.');
        await reloadSubscription();
        render();
      } else {
        getToast().error(result.error || 'خطا در فعال‌سازی کد');
      }
    } catch (e) {
      logger.error('Error redeeming code', { error: e });
      getToast().error('خطای غیرمنتظره. لطفا بعدا امتحان کنید.');
    }
  };

  const render = (): void => {
    container.innerHTML = '';
    container.appendChild(buildHero());
    container.appendChild(buildStatus());
    container.appendChild(buildBenefits());
    container.appendChild(buildPlans());
    container.appendChild(buildComparison());
    container.appendChild(buildTrust());
    container.appendChild(buildFaq());
    container.appendChild(buildActivationSection());
    container.appendChild(buildFooter());
  };

  function buildHero(): HTMLElement {
    const hero = document.createElement('div');
    hero.className = 'reveal text-center space-y-4 py-4';
    const iconWrap = document.createElement('div');
    iconWrap.className = 'relative inline-flex';
    const halo = document.createElement('div');
    halo.className = 'absolute inset-0 scale-150 rounded-full bg-accent-500/25 blur-2xl pointer-events-none';
    iconWrap.appendChild(halo);
    iconWrap.appendChild(createIcon('award', 64, 'relative text-accent-400'));
    hero.appendChild(iconWrap);

    const t = document.createElement('h1');
    t.className = 'text-3xl font-black text-slate-100';
    t.textContent = 'دانش‌یار پریمیوم';
    hero.appendChild(t);
    const s = document.createElement('p');
    s.className = 'text-slate-400';
    s.textContent = 'یادگیری را یک سطح بالاتر ببر';
    hero.appendChild(s);

    const chips = document.createElement('div');
    chips.className = 'flex flex-wrap items-center justify-center gap-2';
    const chipData = [
      { icon: 'shield', label: 'پرداخت امن' },
      { icon: 'zap', label: 'فعال‌سازی توسط پشتیبانی' },
      { icon: 'award', label: 'ضمانت ۷ روزه' },
    ];
    chipData.forEach((c) => {
      const chip = document.createElement('span');
      chip.className = 'flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800 border border-slate-700 rounded-full px-3 py-1.5';
      chip.appendChild(createIcon(c.icon, 14, 'text-accent-400'));
      const lbl = document.createElement('span');
      lbl.textContent = c.label;
      chip.appendChild(lbl);
      chips.appendChild(chip);
    });
    hero.appendChild(chips);
    return hero;
  }

  function buildStatus(): HTMLElement {
    const subInfo = getSubscriptionInfo();
    const box = document.createElement('div');
    
    if (subInfo.hasPaidSubscription) {
      const planLabel = PLANS.find((p) => p.id === subInfo.planId)?.label || subInfo.planId || 'نامشخص';
      box.className = 'reveal bg-green-500/10 border border-green-500/40 rounded-xl p-4 flex items-center gap-3';
      box.appendChild(createIcon('check', 24, 'text-green-400 flex-shrink-0'));
      const txt = document.createElement('div');
      txt.className = 'flex-1';
      const t = document.createElement('div');
      t.className = 'font-bold text-green-300';
      t.textContent = 'اشتراک فعال';
      const d = document.createElement('div');
      d.className = 'text-xs text-slate-400';
      d.textContent = 'پلن ' + planLabel + ' · ' + toPersianDigits(String(subInfo.daysLeft)) + ' روز مانده';
      txt.appendChild(t);
      txt.appendChild(d);
      box.appendChild(txt);
    } else if (isTrialActive()) {
      box.className = 'reveal bg-primary-500/10 border border-primary-500/40 rounded-xl p-4 flex items-center gap-3';
      box.appendChild(createIcon('gift', 24, 'text-primary-300 flex-shrink-0'));
      const txt = document.createElement('div');
      txt.className = 'flex-1';
      const t = document.createElement('div');
      t.className = 'font-bold text-primary-300';
      t.textContent = 'دوره آزمایشی فعال';
      const d = document.createElement('div');
      d.className = 'text-xs text-slate-400';
      d.textContent = toPersianDigits(String(getTrialDaysRemaining())) + ' روز مانده';
      txt.appendChild(t);
      txt.appendChild(d);
      box.appendChild(txt);
    } else {
      box.className = 'reveal flex justify-center';
      const chip = document.createElement('span');
      chip.className = 'text-xs text-slate-400 bg-slate-800/60 border border-slate-700 rounded-full px-4 py-2';
      chip.textContent = 'اشتراک پریمیوم ندارید';
      box.appendChild(chip);
    }
    return box;
  }

  function buildBenefits(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'reveal space-y-4';
    const title = document.createElement('h2');
    title.className = 'text-xl font-bold text-slate-100';
    title.textContent = 'مزایای دانش‌یار پریمیوم';
    section.appendChild(title);
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';
    BENEFITS.forEach((b) => {
      const card = document.createElement('div');
      card.className = 'bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex gap-3';
      card.appendChild(createIcon(b.icon, 24, 'text-accent-400 flex-shrink-0'));
      const content = document.createElement('div');
      const t = document.createElement('div');
      t.className = 'font-semibold text-slate-100';
      t.textContent = b.title;
      const d = document.createElement('div');
      d.className = 'text-sm text-slate-400';
      d.textContent = b.desc;
      content.appendChild(t);
      content.appendChild(d);
      card.appendChild(content);
      grid.appendChild(card);
    });
    section.appendChild(grid);
    return section;
  }

  function buildPlans(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'reveal space-y-6';
    const title = document.createElement('h2');
    title.className = 'text-xl font-bold text-slate-100';
    title.textContent = 'پلن‌ها';
    section.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-3 gap-4';

    PLANS.forEach((plan) => {
      const card = document.createElement('div');
      card.className = 'bg-slate-800/50 border border-slate-700 rounded-xl p-6 flex flex-col';
      if (plan.highlight) {
        card.className = 'bg-slate-700/50 border-2 border-primary-500 rounded-xl p-6 flex flex-col';
      }

      const header = document.createElement('div');
      header.className = 'mb-4';
      const h = document.createElement('h3');
      h.className = 'text-lg font-bold text-slate-100';
      h.textContent = plan.label;
      header.appendChild(h);
      if (plan.badge) {
        const badge = document.createElement('span');
        badge.className = 'text-xs text-primary-300 bg-primary-500/15 rounded-full px-2 py-1';
        badge.textContent = plan.badge;
        header.appendChild(badge);
      }
      card.appendChild(header);

      const price = document.createElement('div');
      price.className = 'mb-4';
      const p = document.createElement('div');
      p.className = 'text-3xl font-black text-slate-100';
      p.textContent = formatToman(plan.priceToman);
      price.appendChild(p);
      const period = document.createElement('div');
      period.className = 'text-sm text-slate-400';
      period.textContent = plan.period;
      price.appendChild(period);
      card.appendChild(price);

      const monthlyEq = monthlyEquivalent(plan);
      const savings = savingsPercent(plan);
      if (savings > 0) {
        const save = document.createElement('div');
        save.className = 'mb-4 text-sm text-green-400';
        save.textContent = toPersianDigits(String(savings)) + '% صرفه‌جویی';
        card.appendChild(save);
      }

      const monthlyPrice = document.createElement('div');
      monthlyPrice.className = 'text-xs text-slate-500 mb-6';
      monthlyPrice.textContent = 'معادل ماهانه: ' + formatToman(monthlyEq);
      card.appendChild(monthlyPrice);

      const cta = createButton({
        label: 'انتخاب پلن',
        variant: plan.highlight ? BUTTON_VARIANTS.PRIMARY : BUTTON_VARIANTS.SECONDARY,
        size: BUTTON_SIZES.FULL,
        onClick: () => {
          const selectedPlan = PLANS.find(p => p.id === plan.id);
          if (selectedPlan) {
            showActivationInstructions(selectedPlan);
          }
        }
      });
      card.appendChild(cta);
      grid.appendChild(card);
    });

    section.appendChild(grid);
    return section;
  }

  function showActivationInstructions(plan: Plan): void {
    const priceInfo = formatToman(plan.priceToman) + ' / ' + plan.period;
    const message = `پلن ${plan.label} به مبلغ ${priceInfo} انتخاب شد.

برای فعال‌سازی:
۱. مبلغ را به روش اعلام‌شده پرداخت کنید.
۲. رسید پرداخت را به آدرس‌های زیر ارسال کنید:
   تلگرام: ${SUPPORT_CONTACTS.telegram}
   ایمیل: ${SUPPORT_CONTACTS.email}
۳. پس از تأیید، کد فعال‌سازی یک‌بارمصرف دریافت خواهید کرد.
۴. کد را در بخش «فعال‌سازی کد» وارد کنید.`;
    
    getToast().info(message, 'راهنمای پرداخت');
  }
  }

  function buildComparison(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'reveal';
    const title = document.createElement('h2');
    title.className = 'text-xl font-bold text-slate-100 mb-4';
    title.textContent = 'مقایسه‌ی رایگان و پریمیوم';
    section.appendChild(title);

    const table = document.createElement('div');
    table.className = 'bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden';

    const header = document.createElement('div');
    header.className = 'grid grid-cols-3 gap-4 p-4 border-b border-slate-700';
    const empty = document.createElement('div');
    const free = document.createElement('div');
    free.className = 'text-center font-semibold text-slate-300';
    free.textContent = 'رایگان';
    const premium = document.createElement('div');
    premium.className = 'text-center font-semibold text-slate-100';
    premium.textContent = 'پریمیوم';
    header.appendChild(empty);
    header.appendChild(free);
    header.appendChild(premium);
    table.appendChild(header);

    COMPARISON.forEach((row) => {
      const r = document.createElement('div');
      r.className = 'grid grid-cols-3 gap-4 p-3 border-b border-slate-700/50';
      const label = document.createElement('div');
      label.className = 'text-sm text-slate-400';
      label.textContent = row.label;
      r.appendChild(label);

      const freeCell = document.createElement('div');
      freeCell.className = 'text-center';
      freeCell.appendChild(createIcon(row.free ? 'check' : 'x', 18, row.free ? 'text-green-400' : 'text-red-500'));
      r.appendChild(freeCell);

      const premiumCell = document.createElement('div');
      premiumCell.className = 'text-center';
      premiumCell.appendChild(createIcon(row.premium ? 'check' : 'x', 18, row.premium ? 'text-green-400' : 'text-red-500'));
      r.appendChild(premiumCell);
      table.appendChild(r);
    });

    section.appendChild(table);
    return section;
  }

  function buildTrust(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'reveal space-y-4';
    const title = document.createElement('h2');
    title.className = 'text-xl font-bold text-slate-100';
    title.textContent = 'چرا به ما اعتماد کنید؟';
    section.appendChild(title);
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';
    TRUST_ROWS.forEach((t) => {
      const card = document.createElement('div');
      card.className = 'bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex gap-3';
      card.appendChild(createIcon(t.icon, 24, 'text-accent-400 flex-shrink-0'));
      const content = document.createElement('div');
      const ti = document.createElement('div');
      ti.className = 'font-semibold text-slate-100';
      ti.textContent = t.title;
      const de = document.createElement('div');
      de.className = 'text-sm text-slate-400';
      de.textContent = t.desc;
      content.appendChild(ti);
      content.appendChild(de);
      card.appendChild(content);
      grid.appendChild(card);
    });
    section.appendChild(grid);
    return section;
  }

  function buildFaq(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'reveal space-y-4';
    const title = document.createElement('h2');
    title.className = 'text-xl font-bold text-slate-100';
    title.textContent = 'سوال‌های متداول';
    section.appendChild(title);
    const list = document.createElement('div');
    list.className = 'space-y-3';
    FAQ.forEach((faq, index) => {
      const item = document.createElement('div');
      item.className = 'bg-slate-800/50 border border-slate-700 rounded-xl p-4';
      const q = document.createElement('div');
      q.className = 'font-semibold text-slate-100 mb-2';
      q.textContent = (index + 1) + '. ' + faq.q;
      item.appendChild(q);
      const a = document.createElement('div');
      a.className = 'text-sm text-slate-400';
      a.textContent = faq.a;
      item.appendChild(a);
      list.appendChild(item);
    });
    section.appendChild(list);
    return section;
  }

  function buildActivationSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'reveal space-y-4';
    
    const title = document.createElement('h2');
    title.className = 'text-xl font-bold text-slate-100';
    title.textContent = 'فعال‌سازی اشتراک';
    section.appendChild(title);

    const description = document.createElement('div');
    description.className = 'text-slate-400 text-sm space-y-2';
    description.innerHTML = '<p>برای فعال‌سازی اشتراک پریمیوم، مراحل زیر را دنبال کنید:</p>' +
      '<ol class="list-decimal list-inside space-y-1">' +
      '<li>پلن موردنظر خود را از بخش پلن‌ها انتخاب کنید.</li>' +
      '<li>مبلغ مربوطه را به روش اعلام‌شده پرداخت نمایید.</li>' +
      '<li>رسید پرداخت را برای تیم پشتیبانی ارسال کنید:</li>' +
      '<li>پس از تأیید پرداخت، کد فعال‌سازی یک‌بارمصرف دریافت خواهید کرد.</li>' +
      '<li>کد را در فیلد زیر وارد و دکمه فعال‌سازی را بزنید.</li>' +
      '</ol>';
    section.appendChild(description);

    const contacts = document.createElement('div');
    contacts.className = 'bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2';
    const contactsTitle = document.createElement('div');
    contactsTitle.className = 'font-semibold text-slate-300 text-sm';
    contactsTitle.textContent = 'اطلاعات تماس با پشتیبانی:';
    contacts.appendChild(contactsTitle);
    
    const telegramRow = document.createElement('div');
    telegramRow.className = 'flex items-center gap-2 text-sm';
    telegramRow.appendChild(createIcon('send', 18, 'text-slate-400'));
    const telegramLink = document.createElement('span');
    telegramLink.className = 'text-slate-300';
    telegramLink.textContent = SUPPORT_CONTACTS.telegram;
    telegramRow.appendChild(telegramLink);
    contacts.appendChild(telegramRow);

    const emailRow = document.createElement('div');
    emailRow.className = 'flex items-center gap-2 text-sm';
    emailRow.appendChild(createIcon('mail', 18, 'text-slate-400'));
    const emailLink = document.createElement('span');
    emailLink.className = 'text-slate-300';
    emailLink.textContent = SUPPORT_CONTACTS.email;
    emailRow.appendChild(emailLink);
    contacts.appendChild(emailRow);
    section.appendChild(contacts);

    const activationForm = document.createElement('div');
    activationForm.className = 'bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-4';
    
    const formTitle = document.createElement('div');
    formTitle.className = 'font-semibold text-slate-300 text-sm';
    formTitle.textContent = 'فعال‌سازی کد:';
    activationForm.appendChild(formTitle);

    const inputGroup = document.createElement('div');
    inputGroup.className = 'flex gap-2';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'activation-code-input';
    input.placeholder = 'کد فعال‌سازی را وارد کنید';
    input.className = 'flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500';
    inputGroup.appendChild(input);

    const activateBtn = createButton({
      label: 'فعال‌سازی کد',
      variant: BUTTON_VARIANTS.PRIMARY,
      size: BUTTON_SIZES.MD,
      onClick: async () => {
        const codeInput = document.getElementById('activation-code-input') as HTMLInputElement;
        const code = codeInput?.value;
        if (code) {
          await redeemCode(code);
          codeInput.value = '';
        } else {
          getToast().error('لطفاً کد را وارد کنید');
        }
      }
    });
    inputGroup.appendChild(activateBtn);
    activationForm.appendChild(inputGroup);
    
    section.appendChild(activationForm);
    return section;
  }

  function buildFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.className = 'reveal text-center text-xs text-slate-500 pt-4 border-t border-slate-700';
    footer.textContent = 'دانش‌یار پرو - اشتراک پریمیوم';
    return footer;
  }

  render();
  return container;
}