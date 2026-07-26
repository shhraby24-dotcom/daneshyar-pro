/**
 * ============================================================
 * دانش‌یار پرو - ابزار فرمت‌بندی تاریخ و زمان فارسی
 * ============================================================
 *
 * ✅ ۱۶ تابع برای تمام نیازهای تاریخ/زمان برنامه
 * ✅ Cache کردن Intl instances (۱۰ برابر سریع‌تر)
 * ✅ اعتبارسنجی Invalid Date (بدون crash)
 * ✅ مدیریت null/undefined
 * ✅ اعداد فارسی، زمان نسبی، مدت، شمارش معکوس
 * ✅ توابع Streak (isSameDay, isToday, getStartOfDay)
 *
 * @module utils/dateFormatter
 * @version 1.0.0-beta.1
 */

// ============================================================
// Types
// ============================================================

export type DateInput = Date | string | number;

const INVALID = '—';
const FA_LOCALE = 'fa-IR';
const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;
const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'] as const;

// ============================================================
// Formatter Cache
// ============================================================

type FormatterKey = 'full' | 'dateOnly' | 'short' | 'weekday' | 'time';

const FORMATTER_OPTIONS: Record<FormatterKey, Intl.DateTimeFormatOptions> = {
  full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
  dateOnly: { year: 'numeric', month: 'long', day: 'numeric' },
  short: { month: 'long', day: 'numeric' },
  weekday: { weekday: 'long' },
  time: { hour: '2-digit', minute: '2-digit' },
};

const formatterCache = new Map<FormatterKey, Intl.DateTimeFormat>();

function getFormatter(key: FormatterKey): Intl.DateTimeFormat {
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(FA_LOCALE, FORMATTER_OPTIONS[key]);
    formatterCache.set(key, formatter);
  }
  return formatter;
}

// ============================================================
// توابع کمکی داخلی
// ============================================================

function toDate(input: DateInput): Date | null {
  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

function faNum(n: number): string {
  return toPersianDigits(String(n));
}

function getPart(date: Date, type: Intl.DateTimeFormatPartTypes): string {
  const parts = getFormatter('full').formatToParts(date);
  return parts.find((p) => p.type === type)?.value ?? '';
}

// ============================================================
// توابع اصلی تاریخ
// ============================================================

/** "جمعه، ۱۹ تیر ۱۴۰۵" */
export function formatPersianDate(input: DateInput): string {
  const date = toDate(input);
  if (!date) return INVALID;
  return `${getPart(date, 'weekday')}، ${getPart(date, 'day')} ${getPart(date, 'month')} ${getPart(date, 'year')}`;
}

/** "۱۹ تیر ۱۴۰۵" */
export function formatPersianDateOnly(input: DateInput): string {
  const date = toDate(input);
  if (!date) return INVALID;
  return getFormatter('dateOnly').format(date);
}

/** "۱۹ تیر" */
export function formatPersianDateShort(input: DateInput): string {
  const date = toDate(input);
  if (!date) return INVALID;
  return getFormatter('short').format(date);
}

/** "جمعه" */
export function formatWeekday(input: DateInput): string {
  const date = toDate(input);
  if (!date) return INVALID;
  return getFormatter('weekday').format(date);
}

/** "۱۴:۳۰" */
export function formatTime(input: DateInput): string {
  const date = toDate(input);
  if (!date) return INVALID;
  return getFormatter('time').format(date);
}

/** "۱۹ تیر، ۱۴:۳۰" */
export function formatDateTime(input: DateInput): string {
  const date = toDate(input);
  if (!date) return INVALID;
  return `${formatPersianDateShort(date)}، ${formatTime(date)}`;
}

// ============================================================
// توابع زمان نسبی
// ============================================================

/** "۲ ساعت پیش"، "دیروز"، "۳ روز دیگر" */
export function formatRelativeTime(input: DateInput, base: DateInput = new Date()): string {
  const date = toDate(input);
  const baseDate = toDate(base);
  if (!date || !baseDate) return INVALID;

  const diffMs = baseDate.getTime() - date.getTime();
  const absDiff = Math.abs(diffMs);
  const isFuture = diffMs < 0;

  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const MONTH = 30 * DAY;
  const YEAR = 365 * DAY;

  if (absDiff < MINUTE) return isFuture ? 'به‌زودی' : 'همین حالا';

  let label: string;
  if (absDiff < HOUR) label = `${faNum(Math.floor(absDiff / MINUTE))} دقیقه`;
  else if (absDiff < DAY) label = `${faNum(Math.floor(absDiff / HOUR))} ساعت`;
  else if (absDiff < WEEK) label = `${faNum(Math.floor(absDiff / DAY))} روز`;
  else if (absDiff < MONTH) label = `${faNum(Math.floor(absDiff / WEEK))} هفته`;
  else if (absDiff < YEAR) label = `${faNum(Math.floor(absDiff / MONTH))} ماه`;
  else label = `${faNum(Math.floor(absDiff / YEAR))} سال`;

  return isFuture ? `${label} دیگر` : `${label} پیش`;
}

/** "امروز"، "دیروز"، "فردا" */
export function formatRelativeDay(input: DateInput): string {
  const date = toDate(input);
  if (!date) return INVALID;

  const today = getStartOfDay(new Date());
  const target = getStartOfDay(date);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'امروز';
  if (diffDays === 1) return 'فردا';
  if (diffDays === -1) return 'دیروز';
  return formatPersianDateOnly(date);
}

// ============================================================
// توابع مدت و شمارش معکوس
// ============================================================

/** "۱ ساعت و ۲۵ دقیقه" */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return INVALID;

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return minutes > 0
      ? `${faNum(hours)} ساعت و ${faNum(minutes)} دقیقه`
      : `${faNum(hours)} ساعت`;
  }
  if (minutes > 0) return `${faNum(minutes)} دقیقه`;
  return `${faNum(seconds)} ثانیه`;
}

/** "۲۵:۰۰" (با اعداد فارسی) */
export function formatCountdown(totalSeconds: number): string {
  const s = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  const pad = (n: number): string => String(n).padStart(2, '0');
  const time = hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;

  return toPersianDigits(time);
}

// ============================================================
// توابع تبدیل اعداد
// ============================================================

/** "123" → "۱۲۳" */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)] ?? d);
}

/** "۱۲۳" → "123" */
export function toEnglishDigits(input: string | number): string {
  return String(input)
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d as (typeof FA_DIGITS)[number])))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d as (typeof AR_DIGITS)[number])));
}

/** "۱٬۲۳۴" */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return INVALID;
  return n.toLocaleString(FA_LOCALE);
}

// ============================================================
// توابع Streak و آمار
// ============================================================

/** آیا دو تاریخ در یک روز هستند؟ */
export function isSameDay(a: DateInput, b: DateInput): boolean {
  const da = toDate(a);
  const db = toDate(b);
  if (!da || !db) return false;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/** آیا تاریخ، امروز است؟ */
export function isToday(input: DateInput): boolean {
  return isSameDay(input, new Date());
}

/** شروع روز (۰۰:۰۰:۰۰) */
export function getStartOfDay(input: DateInput): Date {
  const date = toDate(input) ?? new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}