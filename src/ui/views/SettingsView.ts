/**
 * ============================================================
 * دانش‌یار پرو - SettingsView v2 (به سبک Settings اپل)
 * ============================================================
 * 🎨 انتخابگر تم کارتی (مقیاس‌پذیر برای تم‌های آینده)
 * 🔧 سوییچ‌های سالم (repaint داخلی — باگ knob رفع شد)
 * 🤖 کلیدهای AI + سهمیه · 📝 رفتار یادداشت · 💾 پشتیبان + آمار داده
 * @module ui/views/SettingsView
 * @version 2.0.0
 */
import { getInstance as getLogger } from '@/core/Logger';
import { getState } from '@/core/State';
import { getDatabase } from '@/core/Database';
import { saveUserKeys, getRemainingQuota, getTier } from '@/services/AIQuizService';
import { AI_KEYS_LS } from '@/config/ai';
import { createButton, BUTTON_VARIANTS, BUTTON_SIZES } from '@/ui/components/Button';
import { getModal } from '@/ui/components/Modal';
import { getToast } from '@/ui/components/Toast';
import { toPersianDigits } from '@/utils/dateFormatter';

const logger = getLogger().module('SettingsView');
const SETTINGS_LS = 'daneshyar_settings';

/** تم‌ها — برای افزودن تم جدید فقط یک آیتم اضافه کن */
type ThemeId = 'dark' | 'light';
const THEMES: { id: ThemeId; icon: string; label: string; desc: string }[] = [
  { id: 'dark', icon: '🌙', label: 'تاریک', desc: 'مناسب شب و مطالعه طولانی' },
  { id: 'light', icon: '☀️', label: 'روشن', desc: 'مناسب روز و محیط پرنور' },
];

function readAppSettings(): { autoSaveDraft?: boolean } {
  try {
    const raw = localStorage.getItem(SETTINGS_LS);
    return raw ? (JSON.parse(raw) as { autoSaveDraft?: boolean }) : {};
  } catch { return {}; }
}
function writeAppSettings(patch: Record<string, unknown>): void {
  try {
    const cur = readAppSettings() as Record<string, unknown>;
    localStorage.setItem(SETTINGS_LS, JSON.stringify({ ...cur, ...patch }));
  } catch { /* ignore */ }
}
function readStoredKeys(): { gemini: string; groq: string } {
  try {
    const raw = localStorage.getItem(AI_KEYS_LS);
    if (raw) {
      const d = JSON.parse(raw) as { gemini?: string; groq?: string };
      return { gemini: d.gemini ?? '', groq: d.groq ?? '' };
    }
  } catch { /* ignore */ }
  return { gemini: '', groq: '' };
}

// ============================================================
// کامپوننت‌های پایه
// ============================================================
/** سوییچ سالم با repaint داخلی (رفع باگ knob ثابت) */
function createSwitch(initial: boolean, onChange: (v: boolean) => void): HTMLElement {
  let on = initial;
  const box = document.createElement('button');
  box.type = 'button';
  box.className = 'w-12 h-7 rounded-full relative transition-colors flex-shrink-0';
  const knob = document.createElement('div');
  knob.className = 'absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all';
  box.appendChild(knob);
  const paint = (): void => {
    box.classList.toggle('bg-primary-500', on);
    box.classList.toggle('bg-slate-700', !on);
    knob.classList.toggle('start-6', on);
    knob.classList.toggle('start-0.5', !on);
  };
  paint();
  box.addEventListener('click', () => { on = !on; paint(); onChange(on); });
  return box;
}

/** ردیف به سبک iOS: آیکن رنگی + عنوان + کنترل */
function row(o: { icon: string; bg: string; title: string; desc?: string; control: HTMLElement }): HTMLElement {
  const r = document.createElement('div');
  r.className = 'ios-list-row';
  const badge = document.createElement('div');
  badge.className = `w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${o.bg}`;
  badge.textContent = o.icon;
  const txt = document.createElement('div');
  txt.className = 'flex-1 min-w-0';
  const t = document.createElement('div');
  t.className = 'text-sm text-slate-200';
  t.textContent = o.title;
  txt.appendChild(t);
  if (o.desc) {
    const d = document.createElement('div');
    d.className = 'text-xs text-slate-500 mt-0.5';
    d.textContent = o.desc;
    txt.appendChild(d);
  }
  r.appendChild(badge);
  r.appendChild(txt);
  r.appendChild(o.control);
  return r;
}

function section(icon: string, title: string, body: HTMLElement): HTMLElement {
  const box = document.createElement('div');
  box.className = 'bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3';
  const h = document.createElement('div');
  h.className = 'flex items-center gap-2';
  const ic = document.createElement('span'); ic.className = 'text-xl'; ic.textContent = icon;
  const tt = document.createElement('h3'); tt.className = 'font-bold text-slate-100'; tt.textContent = title;
  h.appendChild(ic); h.appendChild(tt);
  box.appendChild(h);
  box.appendChild(body);
  return box;
}

// ============================================================
// View اصلی
// ============================================================
export async function createSettingsView(_params: Record<string, unknown> = {}): Promise<HTMLElement> {
  logger.info('رندر تنظیمات v2');
  const container = document.createElement('div');
  container.className = 'mx-auto max-w-2xl space-y-6';
  const state = getState();
  const getSettings = (): Record<string, unknown> => (state.getSettings() as Record<string, unknown>) ?? {};

  const render = (): void => {
    container.innerHTML = '';
    container.appendChild(build());
  };

  function build(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'space-y-5';

    const header = document.createElement('div');
    header.className = 'text-center space-y-2';
    const em = document.createElement('div'); em.className = 'text-6xl'; em.textContent = '⚙️';
    const t = document.createElement('h1'); t.className = 'text-3xl font-black text-slate-100'; t.textContent = 'تنظیمات';
    header.appendChild(em); header.appendChild(t);
    wrap.appendChild(header);

    wrap.appendChild(section('🎨', 'ظاهر', buildAppearance()));
    wrap.appendChild(section('📝', 'یادداشت‌ها', buildNotes()));
    wrap.appendChild(section('🤖', 'هوش مصنوعی', buildAI()));
    wrap.appendChild(section('💾', 'داده‌ها و پشتیبان', buildData()));
    wrap.appendChild(section('ℹ️', 'درباره', buildAbout()));
    return wrap;
  }

  // ── ظاهر: انتخابگر تم کارتی ──
  function buildAppearance(): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-2 gap-3';
    const current = String(getSettings().theme ?? 'dark');
    THEMES.forEach((th) => {
      const active = current === th.id;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `border rounded-xl p-4 text-center transition-all ${
        active ? 'bg-primary-500/20 border-primary-500 ring-1 ring-primary-500/50' : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
      }`;
      const ic = document.createElement('div'); ic.className = 'text-3xl mb-2'; ic.textContent = th.icon;
      const lb = document.createElement('div'); lb.className = 'text-sm font-bold text-slate-100'; lb.textContent = th.label;
      const ds = document.createElement('div'); ds.className = 'text-xs text-slate-500 mt-1'; ds.textContent = th.desc;
      const chk = document.createElement('div'); chk.className = `mt-2 text-xs ${active ? 'text-primary-300' : 'text-transparent'}`; chk.textContent = '✓ انتخاب شده';
      card.appendChild(ic); card.appendChild(lb); card.appendChild(ds); card.appendChild(chk);
      card.addEventListener('click', () => {
        state.updateSettings({ theme: th.id });
        getToast().success(th.id === 'dark' ? 'حالت تاریک فعال شد 🌙' : 'حالت روشن فعال شد ☀️');
        render();
      });
      grid.appendChild(card);
    });
    return grid;
  }

  // ── یادداشت‌ها ──
  function buildNotes(): HTMLElement {
    const g = document.createElement('div');
    g.className = 'ios-grouped';
    g.appendChild(row({
      icon: '📝', bg: 'bg-primary-500/20',
      title: 'ذخیره خودکار پیش‌نویس',
      desc: 'اگر ناگهانی ببندی، متن‌ات بازیابی می‌شود',
      control: createSwitch(readAppSettings().autoSaveDraft !== false, (v) => {
        writeAppSettings({ autoSaveDraft: v });
        getToast().success(v ? 'ذخیره خودکار فعال شد' : 'ذخیره خودکار غیرفعال شد');
      }),
    }));
    return g;
  }

  // ── هوش مصنوعی ──
  function buildAI(): HTMLElement {
    const box = document.createElement('div');
    box.className = 'space-y-3';
    const quota = document.createElement('div');
    quota.className = 'text-xs bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-slate-400';
    quota.textContent = `سطح فعلی: ${getTier()} · سهمیه امروز: ${toPersianDigits(String(getRemainingQuota()))}`;
    box.appendChild(quota);

    const keys = readStoredKeys();
    const gInput = document.createElement('input');
    gInput.type = 'text'; gInput.className = 'input w-full'; gInput.dir = 'ltr';
    gInput.placeholder = 'Gemini API Key (AIza...)'; gInput.value = keys.gemini;
    const qInput = document.createElement('input');
    qInput.type = 'text'; qInput.className = 'input w-full'; qInput.dir = 'ltr';
    qInput.placeholder = 'Groq API Key (gsk_...)'; qInput.value = keys.groq;
    const gl = document.createElement('label'); gl.className = 'text-xs text-slate-400'; gl.textContent = 'کلید Gemini';
    const ql = document.createElement('label'); ql.className = 'text-xs text-slate-400'; ql.textContent = 'کلید Groq (پشتیبان)';
    box.appendChild(gl); box.appendChild(gInput);
    box.appendChild(ql); box.appendChild(qInput);

    const save = createButton({
      label: '💾 ذخیره کلیدها', variant: BUTTON_VARIANTS.PRIMARY, size: BUTTON_SIZES.SM,
      onClick: () => {
        saveUserKeys(gInput.value.trim(), qInput.value.trim());
        getToast().success('کلیدها ذخیره شد 🤖');
        render();
      },
    });
    box.appendChild(save);
    const note = document.createElement('p');
    note.className = 'text-xs text-slate-500';
    note.textContent = 'کلیدها فقط روی دستگاه شما می‌مانند. بدون کلید، از کلید توسعه‌دهنده (سهمیه محدود) یا حالت آفلاین استفاده می‌شود.';
    box.appendChild(note);
    return box;
  }

  // ── داده‌ها ──
  function buildData(): HTMLElement {
    const box = document.createElement('div');
    box.className = 'space-y-3';
    const statsLine = document.createElement('div');
    statsLine.className = 'text-xs bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-slate-400';
    statsLine.textContent = 'در حال محاسبه...';
    void getDatabase().getStats().then((s) => {
      statsLine.textContent = `${toPersianDigits(String(s.totalNotes))} یادداشت • ${toPersianDigits(String(s.totalFlashcards))} فلش‌کارت • ${toPersianDigits(String(s.totalQuizzes))} آزمون`;
    });
    box.appendChild(statsLine);

    const btns = document.createElement('div');
    btns.className = 'grid grid-cols-2 gap-3';
    btns.appendChild(createButton({
      label: '📥 خروجی (JSON)', variant: BUTTON_VARIANTS.SECONDARY,
      onClick: async () => {
        try {
          const json = await getDatabase().exportData();
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `daneshyar-backup-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
          getToast().success('فایل پشتیبان دانلود شد 💾');
        } catch { getToast().error('خطا در خروجی'); }
      },
    }));
    btns.appendChild(createButton({
      label: '📤 بازیابی', variant: BUTTON_VARIANTS.GHOST,
      onClick: async () => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'application/json';
        input.addEventListener('change', async () => {
          const f = input.files?.[0];
          if (!f) return;
          const ok = await getModal().confirm('بازیابی داده‌ها', 'داده‌های فعلی با فایل پشتیبان جایگزین می‌شوند. ادامه می‌دهی؟', { confirmText: 'بازیابی' });
          if (!ok) return;
          try {
            const text = await f.text();
            await getDatabase().importData(text);
            getToast().success('داده‌ها بازیابی شد ✅');
          } catch { getToast().error('فایل پشتیبان نامعتبر است'); }
        });
        input.click();
      },
    }));
    box.appendChild(btns);
    return box;
  }

  // ── درباره ─
  function buildAbout(): HTMLElement {
    const g = document.createElement('div');
    g.className = 'ios-grouped';
    g.appendChild(row({ icon: '🎓', bg: 'bg-accent-500/20', title: 'دانش‌یار پرو', desc: `نسخه ${toPersianDigits('1.0.0-beta.1')} · دستیار مطالعه‌ی هوشمند`, control: document.createElement('span') }));
    return g;
  }

  render();
  return container;
}

export default createSettingsView;