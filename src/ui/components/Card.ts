/**
 * ============================================================
 * دانش‌یار پرو - سیستم Card (کارت‌های رابط کاربری)
 * ============================================================
 * ✅ createCard / createStatCard / createFlashcard / createEmptyState
 * ✅ createSectionHeader / createCardGrid
 * ✅ v2: پشتیبانی هوشمند از آیکون Lucide + سازگاری عقب‌رو با ایموجی
 *    (اگر نام در ICON_MAP باشد → Lucide؛ وگرنه → متن)
 * @module ui/components/Card
 * @version 2.0.0
 */
import { createButton } from '@/ui/components/Button';
import { toPersianDigits } from '@/utils/dateFormatter';
import { createIcon, ICON_MAP } from '@/services/IconService';

// ============================================================
// Types
// ============================================================
export type CardVariant = 'default' | 'outlined' | 'elevated' | 'glass';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type StatColorScheme = 'primary' | 'accent' | 'success' | 'purple';

export interface CardOptions {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
  onClick?: ((e: MouseEvent) => void) | null;
  className?: string;
  content?: string | HTMLElement | null;
}

export interface StatCardOptions {
  icon: string;
  value: number;
  label: string;
  colorScheme?: StatColorScheme;
  trend?: { value: number; direction: 'up' | 'down' } | null;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  animate?: boolean;
  onClick?: ((e: MouseEvent) => void) | null;
}

export interface FlashcardOptions {
  front: string;
  back: string;
  frontLabel?: string;
  backLabel?: string;
  topic?: string | null;
  height?: number;
  onFlip?: ((isFlipped: boolean) => void) | null;
}

export interface EmptyStateOptions {
  icon: string;
  title: string;
  message?: string;
  actionLabel?: string | null;
  onAction?: ((e: MouseEvent) => void) | null;
  iconTint?: StatColorScheme;
}

export interface SectionHeaderOptions {
  title: string;
  subtitle?: string | null;
  icon?: string | null;
  action?: HTMLElement | null;
}

// ============================================================
// پیکربندی‌ها
// ============================================================
const CARD_VARIANTS: Record<CardVariant, string> = {
  default: 'bg-slate-800 border border-slate-700',
  outlined: 'bg-transparent border border-slate-600',
  elevated: 'bg-slate-800 border border-slate-700 shadow-lg',
  glass: 'glass border border-slate-700/50',
};

const CARD_PADDINGS: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
};

const STAT_SCHEMES: Record<
  StatColorScheme,
  { gradient: string; iconBg: string; iconText: string; orb: string }
> = {
  primary: {
    gradient: 'from-primary-500/15 via-transparent to-transparent',
    iconBg: 'bg-primary-500/15',
    iconText: 'text-primary-300',
    orb: 'bg-primary-500/25',
  },
  accent: {
    gradient: 'from-accent-500/15 via-transparent to-transparent',
    iconBg: 'bg-accent-500/15',
    iconText: 'text-accent-300',
    orb: 'bg-accent-500/25',
  },
  success: {
    gradient: 'from-green-500/15 via-transparent to-transparent',
    iconBg: 'bg-green-500/15',
    iconText: 'text-green-300',
    orb: 'bg-green-500/25',
  },
  purple: {
    gradient: 'from-purple-500/15 via-transparent to-transparent',
    iconBg: 'bg-purple-500/15',
    iconText: 'text-purple-300',
    orb: 'bg-purple-500/25',
  },
};

// ============================================================
// رندر هوشمند آیکون (Lucide یا متن/ایموجی)
// ============================================================
/**
 * اگر `icon` یک نام Lucide باشد، آیکون حرفه‌ای رندر می‌کند؛
 * وگرنه (ایموجی/متن قدیمی) همان را به‌صورت متن نشان می‌دهد.
 * ⇒ سازگاری عقب‌رو کامل، بدون شکستن ویوهای قدیمی
 */
function appendIconSmart(el: HTMLElement, icon: string, size: number): void {
  if (icon && ICON_MAP[icon]) {
    el.appendChild(createIcon(icon, size));
  } else {
    el.textContent = icon;
  }
}

// ============================================================
// شمارش متحرک (Count-Up)
// ============================================================
function animateValue(
  el: HTMLElement,
  target: number,
  opts: { duration?: number; decimals?: number; prefix?: string; suffix?: string } = {}
): void {
  const { duration = 900, decimals = 0, prefix = '', suffix = '' } = opts;
  const format = (n: number): string =>
    prefix +
    n.toLocaleString('fa-IR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) +
    suffix;
  if (duration <= 0) {
    el.textContent = format(target);
    return;
  }
  const start = performance.now();
  const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
  const frame = (now: number): void => {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = format(target * easeOutCubic(progress));
    if (progress < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function makeLabelBadge(text: string, tone: 'primary' | 'accent'): HTMLSpanElement {
  const span = document.createElement('span');
  span.className =
    tone === 'primary'
      ? 'text-xs font-bold px-2.5 py-1 rounded-full bg-primary-500/15 text-primary-300'
      : 'text-xs font-bold px-2.5 py-1 rounded-full bg-accent-500/15 text-accent-300';
  span.textContent = text;
  return span;
}

// ============================================================
// کامپوننت‌ها
// ============================================================
export function createCard(options: CardOptions = {}): HTMLElement {
  const {
    variant = 'default',
    padding = 'md',
    interactive = false,
    onClick = null,
    className = '',
    content = null,
  } = options;

  const card = document.createElement('div');
  card.className = [
    'rounded-xl',
    CARD_VARIANTS[variant] ?? CARD_VARIANTS.default,
    CARD_PADDINGS[padding] ?? CARD_PADDINGS.md,
    interactive ? 'card-interactive cursor-pointer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (content) {
    if (typeof content === 'string') {
      card.innerHTML = content;
    } else {
      card.appendChild(content);
    }
  }

  if (onClick && interactive) {
    card.addEventListener('click', onClick);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
  }
  return card;
}

export function createStatCard(options: StatCardOptions): HTMLElement {
  const {
    icon,
    value,
    label,
    colorScheme = 'primary',
    trend = null,
    prefix = '',
    suffix = '',
    decimals = 0,
    animate = true,
    onClick = null,
  } = options;

  const scheme = STAT_SCHEMES[colorScheme] ?? STAT_SCHEMES.primary;
  const card = document.createElement('div');
  card.className =
    'relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800 p-5 card-interactive';

  if (onClick) {
    card.classList.add('cursor-pointer');
    card.addEventListener('click', onClick);
  }

  const gradient = document.createElement('div');
  gradient.className = `absolute inset-0 bg-gradient-to-br ${scheme.gradient} pointer-events-none`;
  card.appendChild(gradient);

  const orb = document.createElement('div');
  orb.className = `absolute -top-10 -end-10 w-28 h-28 rounded-full ${scheme.orb} blur-2xl pointer-events-none`;
  card.appendChild(orb);

  const content = document.createElement('div');
  content.className = 'relative';

  const topRow = document.createElement('div');
  topRow.className = 'flex items-start justify-between mb-4';
  const iconBadge = document.createElement('div');
  iconBadge.className = `w-11 h-11 rounded-lg ${scheme.iconBg} ${scheme.iconText} flex items-center justify-center`;
  appendIconSmart(iconBadge, icon, 22);
  topRow.appendChild(iconBadge);

  if (trend) {
    const isUp = trend.direction === 'up';
    const trendEl = document.createElement('span');
    trendEl.className = `text-xs font-bold flex items-center gap-1 px-2 py-1 rounded-full ${
      isUp ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'
    }`;
    trendEl.textContent = `${isUp ? '↑' : '↓'} ${toPersianDigits(String(trend.value))}٪`;
    topRow.appendChild(trendEl);
  }
  content.appendChild(topRow);

  const valueEl = document.createElement('div');
  valueEl.className = 'text-3xl font-black text-slate-100 mb-1';
  content.appendChild(valueEl);

  const labelEl = document.createElement('div');
  labelEl.className = 'text-sm text-slate-400';
  labelEl.textContent = label;
  content.appendChild(labelEl);

  card.appendChild(content);

  if (animate) {
    animateValue(valueEl, value, { decimals, prefix, suffix });
  } else {
    valueEl.textContent =
      prefix +
      value.toLocaleString('fa-IR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }) +
      suffix;
  }
  return card;
}

export function createFlashcard(options: FlashcardOptions): HTMLElement {
  const {
    front,
    back,
    frontLabel = 'سوال',
    backLabel = 'پاسخ',
    topic = null,
    height = 240,
    onFlip = null,
  } = options;

  const container = document.createElement('div');
  container.className = 'flashcard-3d cursor-pointer select-none group';
  container.style.height = `${height}px`;
  container.setAttribute('role', 'button');
  container.setAttribute('tabindex', '0');
  container.setAttribute('aria-label', 'فلش‌کارت - برای چرخش کلیک کنید');

  const inner = document.createElement('div');
  inner.className = 'flashcard-inner';

  // ── روی کارت (سوال) ──
  const frontFace = document.createElement('div');
  frontFace.className = 'flashcard-face bg-slate-800 border border-slate-700';
  const frontContent = document.createElement('div');
  frontContent.className = 'relative flex flex-col h-full';

  const frontTop = document.createElement('div');
  frontTop.className = 'flex items-center justify-between px-5 pt-4';
  frontTop.appendChild(makeLabelBadge(frontLabel, 'primary'));
  if (topic) {
    const topicEl = document.createElement('span');
    topicEl.className = 'text-xs text-slate-500';
    topicEl.textContent = topic;
    frontTop.appendChild(topicEl);
  }
  frontContent.appendChild(frontTop);

  const frontMid = document.createElement('div');
  frontMid.className = 'flex-1 flex items-center justify-center px-6 text-center';
  const frontP = document.createElement('p');
  frontP.className = 'text-lg font-bold text-slate-100 leading-relaxed';
  frontP.textContent = front;
  frontMid.appendChild(frontP);
  frontContent.appendChild(frontMid);

  const frontBottom = document.createElement('div');
  frontBottom.className = 'px-5 pb-4 flex items-center justify-center gap-1.5 text-xs text-slate-500';
  const frontHint = document.createElement('span');
  frontHint.textContent = 'برای دیدن پاسخ کلیک کنید';
  frontBottom.appendChild(frontHint);
  frontBottom.appendChild(createIcon('refresh', 13));
  frontContent.appendChild(frontBottom);
  frontFace.appendChild(frontContent);

  // ── پشت کارت (پاسخ) ──
  const backFace = document.createElement('div');
  backFace.className = 'flashcard-face flashcard-back bg-slate-800 border border-accent-500/40';
  const backOverlay = document.createElement('div');
  backOverlay.className =
    'absolute inset-0 bg-gradient-to-br from-accent-500/10 via-transparent to-transparent pointer-events-none';
  backFace.appendChild(backOverlay);

  const backContent = document.createElement('div');
  backContent.className = 'relative flex flex-col h-full';
  const backTop = document.createElement('div');
  backTop.className = 'flex items-center justify-between px-5 pt-4';
  backTop.appendChild(makeLabelBadge(backLabel, 'accent'));
  if (topic) {
    const topicEl = document.createElement('span');
    topicEl.className = 'text-xs text-slate-500';
    topicEl.textContent = topic;
    backTop.appendChild(topicEl);
  }
  backContent.appendChild(backTop);

  const backMid = document.createElement('div');
  backMid.className = 'flex-1 flex items-center justify-center px-6 text-center';
  const backP = document.createElement('p');
  backP.className = 'text-xl font-black text-accent-300 leading-relaxed';
  backP.textContent = back;
  backMid.appendChild(backP);
  backContent.appendChild(backMid);

  const backBottom = document.createElement('div');
  backBottom.className = 'px-5 pb-4 flex items-center justify-center gap-1.5 text-xs text-slate-500';
  const backHint = document.createElement('span');
  backHint.textContent = 'برای بازگشت کلیک کنید';
  backBottom.appendChild(backHint);
  backBottom.appendChild(createIcon('refresh', 13));
  backContent.appendChild(backBottom);
  backFace.appendChild(backContent);

  inner.appendChild(frontFace);
  inner.appendChild(backFace);
  container.appendChild(inner);

  let flipped = false;
  const toggle = (): void => {
    flipped = !flipped;
    inner.classList.toggle('flipped', flipped);
    if (onFlip) onFlip(flipped);
  };
  container.addEventListener('click', toggle);
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  });

  return container;
}

export function createEmptyState(options: EmptyStateOptions): HTMLElement {
  const { icon, title, message = '', actionLabel = null, onAction = null, iconTint = 'primary' } = options;
  const scheme = STAT_SCHEMES[iconTint] ?? STAT_SCHEMES.primary;

  const container = document.createElement('div');
  container.className =
    'flex flex-col items-center justify-center text-center py-16 px-6 rounded-xl border border-dashed border-slate-700 bg-slate-800/40';

  const iconWrap = document.createElement('div');
  iconWrap.className = `empty-state-icon w-20 h-20 rounded-2xl ${scheme.iconBg} ${scheme.iconText} flex items-center justify-center mb-6`;
  appendIconSmart(iconWrap, icon, 40);
  container.appendChild(iconWrap);

  const titleEl = document.createElement('h3');
  titleEl.className = 'text-xl font-black text-slate-100 mb-2';
  titleEl.textContent = title;
  container.appendChild(titleEl);

  if (message) {
    const msgEl = document.createElement('p');
    msgEl.className = 'text-sm text-slate-400 max-w-sm leading-relaxed mb-6';
    msgEl.textContent = message;
    container.appendChild(msgEl);
  }

  if (actionLabel && onAction) {
    container.appendChild(createButton({ label: actionLabel, variant: 'primary', onClick: onAction }));
  }
  return container;
}

export function createSectionHeader(options: SectionHeaderOptions): HTMLElement {
  const { title, subtitle = null, icon = null, action = null } = options;

  const container = document.createElement('div');
  container.className = 'flex items-end justify-between gap-4 mb-6';

  const titleBlock = document.createElement('div');
  const titleRow = document.createElement('div');
  titleRow.className = 'flex items-center gap-3';

  if (icon) {
    const iconEl = document.createElement('span');
    iconEl.className = 'flex items-center text-2xl';
    appendIconSmart(iconEl, icon, 24);
    titleRow.appendChild(iconEl);
  }

  const h2 = document.createElement('h2');
  h2.className = 'text-2xl font-black text-slate-100';
  h2.textContent = title;
  titleRow.appendChild(h2);
  titleBlock.appendChild(titleRow);

  const underline = document.createElement('div');
  underline.className = 'mt-2 h-1 w-12 rounded-full bg-gradient-to-l from-primary-500 to-accent-500';
  titleBlock.appendChild(underline);

  if (subtitle) {
    const sub = document.createElement('p');
    sub.className = 'mt-2 text-sm text-slate-400';
    sub.textContent = subtitle;
    titleBlock.appendChild(sub);
  }

  container.appendChild(titleBlock);
  if (action) {
    container.appendChild(action);
  }
  return container;
}

export function createCardGrid(
  options: { cols?: string; gap?: string; className?: string } = {}
): HTMLElement {
  const { cols = '1 sm:grid-cols-2 lg:grid-cols-4', gap = 'gap-4', className = '' } = options;
  const grid = document.createElement('div');
  grid.className = `grid grid-cols-${cols} ${gap} ${className}`.trim();
  return grid;
}