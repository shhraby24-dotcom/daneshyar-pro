/**
 * ============================================================
 * دانش‌یار پرو - صفحه Premium (Paywall حرفه‌ای)
 * ============================================================
 * ✅ طرح تأییدشده v3: Hero + وضعیت + پلن‌ها + مقایسه + تخفیف
 *    + اعتمادسازی + FAQ + CTA نهایی + پانوشت
 * ✅ بدون ایموجی — آیکون‌های Lucide
 * ✅ اعتماد اول، فروش دوم (ضدِ حس کلاهبرداری)
 * ✅ حفظ منطق فعلی: خرید/تریل/پرومو
 * 🔒 XSS-safe (textContent برای داده‌ی پویا، iconHTML فقط trusted)
 * @module ui/views/PremiumView
 * @version 2.0.0
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getRouter } from '@/core/Router';
import { getSession } from '@/services/AuthService';
import {
  PLANS,
  isPremium,
  tryPromo,
  formatToman,
  getPremiumPlan,
  monthlyEquivalent,
  savingsPercent,
} from '@/services/Premium';
import { getSubscriptionInfo } from '@/services/SubscriptionService';
import { toPersianDigits } from '@/utils/dateFormatter';
import { requestPayment } from '@/services/PaymentService';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '@/ui/components/Button';
import { getToast } from '@/ui/components/Toast';
import { createIcon, iconHTML } from '@/services/IconService';

const logger = getLogger().module('PremiumView');

type Plan = (typeof PLANS)[number];

// ============================================================
// ثابت‌ها
// ============================================================
/** پلن پیشنهادی: سالانه اگر بود، وگرنه highlight، وگرنه اولین */
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
  { icon: 'shield', title: 'پرداخت امن بانکی', desc: 'پرداخت فقط از درگاه رسمی انجام می‌شود؛ اطلاعات کارتت هرگز به ما نمی‌رسد.' },
  { icon: 'award', title: 'ضمانت بازگشت ۷ روزه', desc: 'اگر راضی نبودی، بدون پرسش، تمام پولت برمی‌گردد.' },
  { icon: 'user', title: 'هویت مشخص و پشتیبانی', desc: 'توسعه‌دهنده و راه‌های ارتباطی در صفحه‌ی «درباره» آمده است.' },
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
  { q: 'آیا پرداخت امن است؟', a: 'بله؛ پرداخت فقط از درگاه رسمی بانکی (زرین‌پال) انجام می‌شود و اطلاعات کارت تو هرگز به ما نمی‌رسد.' },
  { q: 'اگر پول دادم و پریمیوم فعال نشد چه؟', a: 'فعال‌سازی به‌صورت خودکار و در چند دقیقه انجام می‌شود؛ اگر نشد، پشتیبانی یا بازگشت وجه کامل انجام می‌دهیم.' },
  { q: 'اگر راضی نبودم چه؟', a: 'تا ۷ روز، بدون هیچ سوالی، تمام مبلغ را برمی‌گردانیم.' },
  { q: 'بعد از پایان اشتراک چه می‌شود؟', a: 'هیچ داده‌ای حذف نمی‌شود؛ فقط امکانات پریمیوم موقتاً غیرفعال می‌شوند و هر زمان می‌توانی تمدید کنی.' },
  { q: 'آیا باید حساب بسازم؟', a: 'برای همگام‌سازی بله؛ برای استفاده‌ی محلی خیر — حالت مهمان کامل در دسترس است.' },
  { q: 'آفلاین هم کار می‌کند؟', a: 'بله؛ هسته‌ی برنامه (یادداشت، فلش‌کارت، مرور) آفلاین است. هوش مصنوعی و سینک به اینترنت نیاز دارند.' },
  { q: 'می‌توانم بعداً پلن را عوض یا لغو کنم؟', a: 'بله؛ هر زمان از صفحه‌ی تنظیمات/پریمیوم می‌توانی پلن را تغییر دهی.' },
  { q: 'چطور مطمئن شوم کلاهبرداری نیست؟', a: 'هویت توسعه‌دهنده و راه‌های ارتباطی در صفحه‌ی «درباره» آمده؛ صفحات قانونی (شرایط/حریم خصوصی/بازپرداخت) منتشر شده و پرداخت از درگاه رسمی است.' },
  { q: 'تفاوت رایگان و پریمیوم دقیقاً چیست؟', a: 'جدول مقایسه‌ی بالا را ببین؛ در یک کلام: رایگان برای شروع کافی است، پریمیوم برای یادگیری جدی و بدون محدودیت.' },
];

// ============================================================
// View اصلی
// ============================================================
export async function createPremiumView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر PremiumView');
  const container = document.createElement('div');
  container.className = 'max-w-3xl mx-auto p-4 space-y-8 fade-in';

  const buy = async (plan: Plan): Promise<void> => {
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
  };

  const render = (): void => {
    container.innerHTML = '';
    container.appendChild(buildHero());
    container.appendChild(buildStatus(buy));
    container.appendChild(buildBenefits());
    container.appendChild(buildPlans(buy));
    container.appendChild(buildComparison());
    container.appendChild(buildPromo());
    container.appendChild(buildTrust());
    container.appendChild(buildFaq());
    container.appendChild(buildFinalCta(buy));
    container.appendChild(buildFooter());
  };

  // ── ۱. Hero ──
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
      { icon: 'shield', label: 'پرداخت امن بانکی' },
      { icon: 'zap', label: 'فعال‌سازی آنی' },
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

  // ── ۲. کارت وضعیت ──
  function buildStatus(buyFn: (p: Plan) => Promise<void>): HTMLElement {
    const info = getSubscriptionInfo();
    const box = document.createElement('div');
    if (info.isPremium) {
      const plan = PLANS.find((p) => p.id === info.planId);
      box.className = 'reveal bg-green-500/10 border border-green-500/40 rounded-xl p-4 flex items-center gap-3';
      box.appendChild(createIcon('check', 24, 'text-green-400 flex-shrink-0'));
      const txt = document.createElement('div');
      txt.className = 'flex-1';
      const t = document.createElement('div');
      t.className = 'font-bold text-green-300';
      t.textContent = 'پریمیوم فعال';
      const d = document.createElement('div');
      d.className = 'text-xs text-slate-400';
      d.textContent = `پلن ${plan ? plan.label : '—'} · ${toPersianDigits(String(info.daysLeft))} روز مانده`;
      txt.appendChild(t); txt.appendChild(d);
      box.appendChild(txt);
      box.appendChild(createButton({ label: 'تمدید', variant: BUTTON_VARIANTS.SUCCESS, size: BUTTON_SIZES.SM, onClick: () => { const p = PLANS.find((x) => x.id === RECOMMENDED_ID); if (p) void buyFn(p); } }));
    } else if (info.isTrial) {
      box.className = 'reveal bg-primary-500/10 border border-primary-500/40 rounded-xl p-4 flex items-center gap-3';
      box.appendChild(createIcon('gift', 24, 'text-primary-300 flex-shrink-0'));
      const txt = document.createElement('div');
      txt.className = 'flex-1';
      const t = document.createElement('div');
      t.className = 'font-bold text-primary-300';
      t.textContent = 'دوره آزمایشی فعال';
      const d = document.createElement('div');
      d.className = 'text-xs text-slate-400';
      d.textContent = `${toPersianDigits(String(info.trialDaysLeft))} روز مانده — بعد از آن پلن مورد نظرت را بخر`;
      txt.appendChild(t); txt.appendChild(d);
      box.appendChild(txt);
      box.appendChild(createButton({ label: 'خرید', variant: BUTTON_VARIANTS.PRIMARY, size: BUTTON_SIZES.SM, onClick: () => { const p = PLANS.find((x) => x.id === RECOMMENDED_ID); if (p) void buyFn(p); } }));
    } else {
      box.className = 'reveal flex justify-center';
      const chip = document.createElement('span');
      chip.className = 'text-xs text-slate-400 bg-slate-800/60 border border-slate-700 rounded-full px-4 py-2';
      chip.textContent = 'پلن فعلی: رایگان';
      box.appendChild(chip);
    }
    return box;
  }

  // ── ۳. مزایا ──
  function buildBenefits(): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'reveal reveal-1 grid grid-cols-1 sm:grid-cols-2 gap-3';
    BENEFITS.forEach((b) => {
      const card = document.createElement('div');
      card.className = 'bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex gap-3 items-start';
      const ic = document.createElement('div');
      ic.className = 'w-10 h-10 rounded-lg bg-accent-500/15 text-accent-300 flex items-center justify-center flex-shrink-0';
      ic.appendChild(createIcon(b.icon, 20));
      const txt = document.createElement('div');
      const t = document.createElement('div');
      t.className = 'font-bold text-slate-100';
      t.textContent = b.title;
      const d = document.createElement('div');
      d.className = 'text-sm text-slate-400';
      d.textContent = b.desc;
      txt.appendChild(t); txt.appendChild(d);
      card.appendChild(ic); card.appendChild(txt);
      grid.appendChild(card);
    });
    return grid;
  }

  // ── . پلن‌ها ──
  function buildPlans(buyFn: (p: Plan) => Promise<void>): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'reveal reveal-2 grid grid-cols-1 sm:grid-cols-3 gap-4';
    for (const plan of PLANS) {
      const recommended = plan.id === RECOMMENDED_ID;
      const card = document.createElement('div');
      card.className =
        'relative flex flex-col rounded-2xl p-5 border ' +
        (recommended
          ? 'border-accent-500/60 ring-2 ring-accent-500/40 bg-gradient-to-b from-accent-500/10 to-slate-800'
          : 'border-slate-700 bg-slate-800');

      if (recommended) {
        const badge = document.createElement('div');
        badge.className = 'absolute -top-3 right-4 flex items-center gap-1 bg-accent-500 text-slate-900 text-xs px-3 py-1 rounded-full font-black';
        badge.appendChild(createIcon('star', 12));
        const bt = document.createElement('span');
        bt.textContent = 'پیشنهاد ما';
        badge.appendChild(bt);
        card.appendChild(badge);
      }

      const name = document.createElement('div');
      name.className = 'text-lg font-bold text-slate-100 mb-1';
      name.textContent = plan.label;
      card.appendChild(name);

      const price = document.createElement('div');
      price.className = 'text-3xl font-black text-slate-100 mb-1';
      price.textContent = formatToman(plan.priceToman);
      card.appendChild(price);

      const period = document.createElement('div');
      period.className = 'text-sm text-slate-500';
      period.textContent = 'به ازای هر ' + plan.period;
      card.appendChild(period);

      if (recommended) {
        const best = document.createElement('div');
        best.className = 'text-xs text-accent-300 mt-1 font-bold';
        best.textContent = 'به‌صرفه‌ترین';
        card.appendChild(best);
      }
      if (plan.id !== 'monthly') {
        const eq = document.createElement('div');
        eq.className = 'text-xs text-green-400 mt-2';
        eq.textContent = 'معادل ماهی ' + formatToman(monthlyEquivalent(plan));
        card.appendChild(eq);
        const sv = savingsPercent(plan);
        if (sv > 0) {
          const svEl = document.createElement('div');
          svEl.className = 'text-xs text-slate-500 mt-1';
          svEl.textContent = toPersianDigits(String(sv)) + '٪ صرفه‌جویی';
          card.appendChild(svEl);
        }
      }

      const isActive = isPremium() && getPremiumPlan() === plan.id;
      const btn = createButton({
        label: isActive ? 'فعال' : 'خرید این پلن',
        iconHtml: isActive ? iconHTML('check', 16) : undefined,
        variant: recommended ? BUTTON_VARIANTS.ACCENT : BUTTON_VARIANTS.SECONDARY,
        disabled: isActive,
        onClick: () => void buyFn(plan),
      });
      btn.classList.add('w-full', 'mt-4');
      card.appendChild(btn);
      wrap.appendChild(card);
    }
    return wrap;
  }

  // ── ۵. مقایسه ──
  function buildComparison(): HTMLElement {
    const card = document.createElement('div');
    card.className = 'reveal reveal-3 bg-slate-800 border border-slate-700 rounded-xl p-4';
    const title = document.createElement('div');
    title.className = 'font-bold text-slate-100 mb-3';
    title.textContent = 'مقایسه سریع';
    card.appendChild(title);

    const gridTpl = '1fr 64px 72px';
    const header = document.createElement('div');
    header.style.display = 'grid';
    header.style.gridTemplateColumns = gridTpl;
    header.className = 'text-xs text-slate-500 pb-2 border-b border-slate-700';
    const h1 = document.createElement('span'); h1.textContent = 'امکانات';
    const h2 = document.createElement('span'); h2.textContent = 'رایگان'; h2.className = 'text-center';
    const h3 = document.createElement('span'); h3.textContent = 'پریمیوم'; h3.className = 'text-center text-accent-300 font-bold';
    header.appendChild(h1); header.appendChild(h2); header.appendChild(h3);
    card.appendChild(header);

    COMPARISON.forEach((row) => {
      const r = document.createElement('div');
      r.style.display = 'grid';
      r.style.gridTemplateColumns = gridTpl;
      r.className = 'items-center py-2.5 border-b border-slate-700/50 last:border-0';
      const lbl = document.createElement('span');
      lbl.className = 'text-sm text-slate-300';
      lbl.textContent = row.label;
      const freeCell = document.createElement('span');
      freeCell.className = 'flex justify-center';
      freeCell.appendChild(createIcon(row.free ? 'check' : 'close', 16, row.free ? 'text-green-400' : 'text-slate-600'));
      const premCell = document.createElement('span');
      premCell.className = 'flex justify-center rounded-lg bg-accent-500/10 py-1';
      premCell.appendChild(createIcon(row.premium ? 'check' : 'close', 16, row.premium ? 'text-accent-300' : 'text-slate-600'));
      r.appendChild(lbl); r.appendChild(freeCell); r.appendChild(premCell);
      card.appendChild(r);
    });
    return card;
  }

  // ── ۶. کد تخفیف ──
  function buildPromo(): HTMLElement {
    const box = document.createElement('div');
    box.className = 'reveal reveal-4 bg-slate-800/60 border border-slate-700 rounded-xl p-4';
    const head = document.createElement('div');
    head.className = 'flex items-center gap-2 text-sm text-slate-400 mb-2';
    head.appendChild(createIcon('gift', 16, 'text-accent-400'));
    const ht = document.createElement('span');
    ht.textContent = 'کد تخفیف / هدیه داری؟';
    head.appendChild(ht);
    box.appendChild(head);

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'مثلاً DANESHYAR-PRO';
    input.className = 'input w-full mb-2';
    box.appendChild(input);

    const btn = createButton({
      label: 'اعمال کد',
      variant: BUTTON_VARIANTS.PRIMARY,
      onClick: () => {
        const code = input.value.trim();
        if (!code) { getToast().error('کد را وارد کن'); return; }
        if (tryPromo(code)) { getToast().success('کد اعمال شد!'); render(); }
        else { getToast().error('کد نامعتبر است'); }
      },
    });
    box.appendChild(btn);
    return box;
  }

  // ── ۷. اعتمادسازی ──
  function buildTrust(): HTMLElement {
    const card = document.createElement('div');
    card.className = 'reveal reveal-5 bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-4';
    const title = document.createElement('div');
    title.className = 'font-bold text-slate-100';
    title.textContent = 'چرا به ما اعتماد کنی؟';
    card.appendChild(title);
    TRUST_ROWS.forEach((r) => {
      const row = document.createElement('div');
      row.className = 'flex gap-3 items-start';
      const ic = document.createElement('div');
      ic.className = 'w-9 h-9 rounded-lg bg-slate-700/50 text-accent-300 flex items-center justify-center flex-shrink-0';
      ic.appendChild(createIcon(r.icon, 18));
      const txt = document.createElement('div');
      const t = document.createElement('div');
      t.className = 'text-sm font-bold text-slate-200';
      t.textContent = r.title;
      const d = document.createElement('div');
      d.className = 'text-xs text-slate-400 leading-relaxed';
      d.textContent = r.desc;
      txt.appendChild(t); txt.appendChild(d);
      row.appendChild(ic); row.appendChild(txt);
      card.appendChild(row);
    });
    return card;
  }

  // ── . FAQ آکاردئونی ──
  function buildFaq(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'reveal reveal-5 space-y-2';
    const title = document.createElement('div');
    title.className = 'font-bold text-slate-100 mb-1';
    title.textContent = 'سوالات متداول';
    wrap.appendChild(title);

    let openPanel: HTMLElement | null = null;
    let openChev: HTMLElement | null = null;

    FAQ.forEach((item) => {
      const box = document.createElement('div');
      box.className = 'bg-slate-800 border border-slate-700 rounded-xl overflow-hidden';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'w-full flex items-center justify-between gap-3 p-4 text-start';
      const q = document.createElement('span');
      q.className = 'text-sm font-bold text-slate-100';
      q.textContent = item.q;
      const chev = document.createElement('span');
      chev.className = 'flex items-center text-slate-400 flex-shrink-0';
      chev.style.transition = 'transform .3s';
      chev.innerHTML = iconHTML('chevron-left', 18);
      btn.appendChild(q); btn.appendChild(chev);

      const panel = document.createElement('div');
      panel.style.overflow = 'hidden';
      panel.style.maxHeight = '0px';
      panel.style.paddingBottom = '0px';
      panel.style.transition = 'max-height .3s ease, padding-bottom .3s ease';
      const a = document.createElement('p');
      a.className = 'px-4 text-sm text-slate-400 leading-relaxed';
      a.textContent = item.a;
      panel.appendChild(a);

      btn.addEventListener('click', () => {
        const isOpen = panel.style.maxHeight !== '0px';
        if (openPanel && openPanel !== panel) { openPanel.style.maxHeight = '0px'; openPanel.style.paddingBottom = '0px'; }
        if (openChev && openChev !== chev) openChev.style.transform = '';
        if (isOpen) {
          panel.style.maxHeight = '0px'; panel.style.paddingBottom = '0px'; chev.style.transform = '';
          openPanel = null; openChev = null;
        } else {
          panel.style.maxHeight = panel.scrollHeight + 16 + 'px';
          panel.style.paddingBottom = '16px';
          chev.style.transform = 'rotate(-90deg)';
          openPanel = panel; openChev = chev;
        }
      });

      box.appendChild(btn); box.appendChild(panel);
      wrap.appendChild(box);
    });
    return wrap;
  }

  // ── . CTA نهایی + پانوشت ──
  function buildFinalCta(buyFn: (p: Plan) => Promise<void>): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'reveal space-y-3';
    const rec = PLANS.find((p) => p.id === RECOMMENDED_ID) ?? PLANS[0];
    const btn = createButton({
      label: 'ارتقا به پریمیوم',
      iconHtml: iconHTML('award', 20),
      variant: BUTTON_VARIANTS.ACCENT,
      size: BUTTON_SIZES.LG,
      fullWidth: true,
      onClick: () => { if (rec) void buyFn(rec); },
    });
    wrap.appendChild(btn);
    const micro = document.createElement('div');
    micro.className = 'flex items-center justify-center gap-4 text-xs text-slate-500';
    ['پرداخت امن', 'فعال‌سازی آنی', 'ضمانت ۷ روزه'].forEach((m, i) => {
      const el = document.createElement('span');
      el.className = 'flex items-center gap-1';
      el.appendChild(createIcon(['shield', 'zap', 'award'][i] ?? 'shield', 12, 'text-accent-400'));
      const t = document.createElement('span'); t.textContent = m;
      el.appendChild(t);
      micro.appendChild(el);
    });
    wrap.appendChild(micro);
    return wrap;
  }

  function buildFooter(): HTMLElement {
    const foot = document.createElement('div');
    foot.className = 'text-center text-xs text-slate-500 space-y-2 pb-4';
    const v = document.createElement('div');
    v.textContent = 'نسخه ۱.۰.۰-beta.۱';
    foot.appendChild(v);
    const links = document.createElement('div');
    links.className = 'flex justify-center gap-4';
    const about = document.createElement('button');
    about.className = 'text-primary-400 hover:text-primary-300 font-bold';
    about.textContent = 'درباره ما';
    about.addEventListener('click', () => getRouter().navigate('settings'));
    const legal = document.createElement('button');
    legal.className = 'text-primary-400 hover:text-primary-300 font-bold';
    legal.textContent = 'صفحات قانونی';
    legal.addEventListener('click', () => getRouter().navigate('legal', { doc: 'terms' }));
    links.appendChild(about); links.appendChild(legal);
    foot.appendChild(links);
    return foot;
  }

  render();
  return container;
}

export default createPremiumView;