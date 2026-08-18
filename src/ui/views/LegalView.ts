/**
 * دانش‌یار پرو - صفحه اسناد قانونی (موبایل-اول)
 * URL: #/legal?doc=terms یا privacy یا refund
 * @module ui/views/LegalView
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getRouter } from '@/core/Router';
import { getLegalDoc, getLegalDocs } from '@/services/LegalService';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '@/ui/components/Button';

const logger = getLogger().module('LegalView');

export async function createLegalView(params: Record<string, unknown> = {}): Promise<HTMLElement> {
  const docId = String(params.doc ?? 'terms');
  const doc = getLegalDoc(docId);
  logger.info('رندر LegalView', { docId });

  const container = document.createElement('div');
  container.className = 'mx-auto max-w-2xl p-3 sm:p-4 space-y-5 fade-in';

  if (!doc) {
    container.innerHTML = '<div class="text-center py-12 text-slate-400">سند یافت نشد</div>';
    return container;
  }

  // ── Header ──
  const header = document.createElement('div');
  header.className = 'text-center space-y-2';
  header.innerHTML = `
    <div class="text-5xl">${doc.icon}</div>
    <h1 class="text-2xl font-black text-slate-100">${doc.title}</h1>
    <p class="text-xs text-slate-500">آخرین به‌روزرسانی: ${doc.lastUpdated}</p>
  `;
  container.appendChild(header);

  // ── تب‌های اسناد دیگر (ناوبری سریع) ──
  const tabs = document.createElement('div');
  tabs.className = 'flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 no-scrollbar';
  for (const d of getLegalDocs()) {
    const tab = document.createElement('button');
    tab.type = 'button';
    const active = d.id === docId;
    tab.className = `flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm transition-all ${
      active
        ? 'bg-primary-500/20 border-primary-500 text-primary-300 font-bold'
        : 'bg-slate-800 border-slate-700 text-slate-400'
    }`;
    tab.textContent = `${d.icon} ${d.title}`;
    tab.addEventListener('click', () => {
      void getRouter().navigate('legal', { doc: d.id });
    });
    tabs.appendChild(tab);
  }
  container.appendChild(tabs);

  // ── Intro ──
  const intro = document.createElement('div');
  intro.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4';
  const introP = document.createElement('p');
  introP.className = 'text-sm text-slate-300 leading-relaxed';
  introP.textContent = doc.intro;
  intro.appendChild(introP);
  container.appendChild(intro);

  // ── Sections ──
  for (const sec of doc.sections) {
    const card = document.createElement('div');
    card.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-2';
    const title = document.createElement('h2');
    title.className = 'text-base font-bold text-slate-100';
    title.textContent = sec.title;
    const body = document.createElement('p');
    body.className = 'text-sm text-slate-300 leading-relaxed';
    body.textContent = sec.body;
    card.appendChild(title);
    card.appendChild(body);
    container.appendChild(card);
  }

  // ── دکمه برگشت ──
  const backBtn = createButton({
    label: '→ بازگشت به تنظیمات',
    variant: BUTTON_VARIANTS.GHOST,
    size: BUTTON_SIZES.MD,
    onClick: () => {
      void getRouter().navigate('settings');
    },
  });
  backBtn.classList.add('w-full');
  container.appendChild(backBtn);

  return container;
}

export default createLegalView;