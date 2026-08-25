/**
 * ============================================================
 * دانش‌یار پرو - سرویس آیکون (Lucide)
 * ============================================================
 * جایگزین حرفه‌ای و یکپارچه برای ایموجی‌ها و آیکون‌های متنی.
 * همه‌ی آیکون‌ها از کتابخانه‌ی Lucide گرفته می‌شوند تا:
 *   - در همه‌ی پلتفرم‌ها (موبایل، دسکتاپ، وب) یکسان باشند
 *   - حس حرفه‌ای و مدرن بدهند
 *   - با تم (تاریک/روشن) سازگار باشند
 *
 * نحوه استفاده:
 *   - در کد:        createIcon('home', 20)
 *   - در template:  iconHTML('home', 20)
 *
 * @module services/IconService
 * @version 2.0.0
 */
import { getInstance as getLogger } from '@/core/Logger';
import { createElement } from 'lucide';
import type { IconNode } from 'lucide';
import {
  // ناوبری اصلی
  Home,
  FileText,
  Layers,
  HelpCircle,
  Sparkles,
  Clock,
  Target,
  Trophy,
  Award,
  Gift,
  User,
  Settings,
  Globe,
  Calculator,
  BookOpen,
  // تم
  Moon,
  Sun,
  // اکشن‌ها
  Search,
  Download,
  Upload,
  Menu,
  X,
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Share2,
  LogIn,
  LogOut,
  Eye,
  EyeOff,
  // وضعیت‌ها
  Check,
  AlertCircle,
  AlertTriangle,
  Info,
  // مالی و اعتماد
  CreditCard,
  Shield,
  // تماس و شبکه اجتماعی
  Mail,
  Phone,
  Send,
  MessageCircle,
  // انگیزشی
  Star,
  Flame,
  Zap,
  Calendar,
  TrendingUp,
  // داده و توسعه
  Database,
  RefreshCw,
  Palette,
  Code,
} from 'lucide';

const logger = getLogger().module('IconService');

/**
 * تایپ یک آیکون در Lucide (آرایه‌ای از تگ و ویژگی‌ها).
 * چون در نسخه‌ی ۱.۳۳ این تایپ خروجی داده نمی‌شود، خودمان تعریفش می‌کنیم.
 */
/**
 * نگاشت «نام قراردادی» به آیکون واقعی.
 * هر جا در پروژه به آیکون نیاز داشتیم، از نام سمت چپ استفاده می‌کنیم
 * تا اگر روزی خواستیم آیکون را عوض کنیم، فقط همین فایل تغییر کند.
 */
const ICON_MAP: Record<string, IconNode> = {
  // ناوبری اصلی
  dashboard: Home,
  home: Home,
  notes: FileText,
  note: FileText,
  flashcards: Layers,
  flashcard: Layers,
  quiz: HelpCircle,
  summarizer: Sparkles,
  summary: Sparkles,
  sparkles: Sparkles,
  pomodoro: Clock,
  clock: Clock,
  challenges: Target,
  trophy: Trophy,
  premium: Award,
  award: Award,
  invite: Gift,
  gift: Gift,
  auth: User,
  user: User,
  settings: Settings,
  translator: Globe,
  globe: Globe,
  calculator: Calculator,
  books: BookOpen,

  // تم
  moon: Moon,
  sun: Sun,

  // اکشن‌ها
  search: Search,
  download: Download,
  upload: Upload,
  menu: Menu,
  close: X,
  back: ChevronLeft,
  'chevron-left': ChevronLeft,
  add: Plus,
  plus: Plus,
  edit: Pencil,
  pencil: Pencil,
  delete: Trash2,
  trash: Trash2,
  copy: Copy,
  share: Share2,
  login: LogIn,
  logout: LogOut,
  eye: Eye,
  eyeoff: EyeOff,
  'eye-off': EyeOff,

  // وضعیت‌ها
  check: Check,
  success: Check,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,

  // مالی و اعتماد
  payment: CreditCard,
  creditcard: CreditCard,
  security: Shield,
  shield: Shield,

  // تماس و شبکه اجتماعی
  mail: Mail,
  phone: Phone,
  instagram: MessageCircle,
  telegram: Send,
  send: Send,

  // انگیزشی
  star: Star,
  flame: Flame,
  fire: Flame,
  zap: Zap,
  bolt: Zap,
  calendar: Calendar,
  trending: TrendingUp,

  // داده و توسعه
  database: Database,
  refresh: RefreshCw,
  sync: RefreshCw,
  palette: Palette,
  code: Code,
};

/**
 * ساخت یک آیکون به صورت المنت قابل افزودن به صفحه.
 *
 * @param name - نام قراردادی آیکون (مثلاً 'home')
 * @param size - اندازه به پیکسل (پیش‌فرض ۲۰)
 * @param className - کلاس‌های اضافی برای رنگ و استایل
 * @returns یک <span> که شامل <svg> آیکون است
 */
export function createIcon(
  name: string,
  size: number = 20,
  className: string = ''
): HTMLElement {
  const iconNode = ICON_MAP[name] ?? Info;

  if (!ICON_MAP[name]) {
    logger.warn(`آیکون ناشناخته «${name}» — از آیکون پیش‌فرض استفاده می‌شود`);
  }

  // ساخت خود آیکون با کتابخانه‌ی لوکاید
  const svg = createElement(iconNode, {
    size,
    strokeWidth: 2,
    class: className,
  });

  // رنگ آیکون از متن اطرافش گرفته شود (برای تطبیق با تم)
  svg.setAttribute('stroke', 'currentColor');

  const wrapper = document.createElement('span');
  wrapper.className = `inline-flex items-center justify-center flex-shrink-0 ${className}`.trim();
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.appendChild(svg);
  return wrapper;
}

/**
 * ساخت یک آیکون به صورت رشته‌ی اچ‌تی‌ام‌ال
 * (برای استفاده در جاهایی که با رشته کار می‌کنیم).
 *
 * @param name - نام قراردادی آیکون
 * @param size - اندازه به پیکسل
 * @param className - کلاس‌های اضافی
 * @returns رشته‌ی <svg> آیکون
 */
export function iconHTML(name: string, size: number = 20, className: string = ''): string {
  const iconNode = ICON_MAP[name] ?? Info;
  const svg = createElement(iconNode, {
    size,
    strokeWidth: 2,
    class: className,
  });
  svg.setAttribute('stroke', 'currentColor');
  return svg.outerHTML;
}

/**
 * دریافت فهرست همه‌ی نام آیکون‌های موجود (برای اشکال‌زدایی).
 */
export function getAvailableIcons(): string[] {
  return Object.keys(ICON_MAP);
}

// ─────────────────────────────────────────────
// ابزار توسعه: پیش‌نمایش همه‌ی آیکون‌ها
// آدرس: #/icons-preview — بعد از تأیید نهایی حذف می‌شود
// ─────────────────────────────────────────────
export function renderIconPreview(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'mx-auto max-w-3xl p-6 fade-in';

  const title = document.createElement('h1');
  title.className = 'text-2xl font-black text-slate-100 mb-6';
  title.textContent = 'پیش‌نمایش آیکون‌ها (صفحه‌ی تست)';
  container.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3';

  for (const name of Object.keys(ICON_MAP)) {
    const cell = document.createElement('div');
    cell.className = 'flex flex-col items-center gap-2 p-3 bg-slate-800 border border-slate-700 rounded-lg';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'text-primary-400';
    iconWrap.appendChild(createIcon(name, 28));

    const label = document.createElement('div');
    label.className = 'text-xs text-slate-400 text-center';
    label.textContent = name;

    cell.appendChild(iconWrap);
    cell.appendChild(label);
    grid.appendChild(cell);
  }

  container.appendChild(grid);
  return container;
}
export { ICON_MAP };