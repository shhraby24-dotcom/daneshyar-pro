/**
 * ============================================================
 * دانش‌یار پرو - لیست سیاه ایمیل‌های موقت
 * ============================================================
 * لایه ۲ از ۱۰ لایه دفاعی ضد کلاهبرداری (`.ai/MASTER-PLAN.md`)
 * هدف: جلوگیری از ساخت حساب انبوه با ایمیل یک‌بارمصرف.
 * @module config/tempEmailBlacklist
 * @version 1.0.0
 */

/** دامنه‌های یک‌بارمصرف/موقت — دسته‌بندی‌شده برای نگهداری راحت‌تر */
const TEMP_EMAIL_DOMAINS: readonly string[] = [
  // ── معروف‌های اصلی ──
  'mailinator.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org',
  'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'trashmail.com',
  'yopmail.com', 'yopmail.fr', 'getnada.com', 'dispostable.com',
  'mailnesia.com', 'sharklasers.com', 'throwawaymail.com', 'fakeinbox.com',
  'maildrop.cc', 'mailcatch.com', 'mintemail.com', 'spamgourmet.com',

  // ── سرویس‌های ۱۰ دقیقه‌ای ──
  '10mail.org', '10minutemail.net', '10minutemail.org', '10minutemail.co.uk',
  '10minutemail.de', '10minutemail.info', '10minutemail.us', '10minutemailbox.com',
  '20minutemail.com', '20minutemail.it', '30minutemail.com', '60minutemail.com',
  '5minutemail.net', 'minuteinbox.com', 'emailondeck.com', 'burnermail.io',

  // ── Guerrilla / Sharklasers ──
  'grr.la', 'guerrillamail.biz', 'guerrillamail.de', 'guerrillamail.info',
  'guerrillamailblock.com', 'pokemail.net', 'spam4.me', 'sharklasers.net',

  // ── Mailinator و خانواده ──
  'mailinator.net', 'mailinator.org', 'mailinator2.com', 'notmailinator.com',
  'reallymymail.com', 'safetymail.info', 'suremail.info', 'thisisnotmyrealemail.com',

  // ── YOPMail و مشابه ──
  'yopmail.net', 'yopmail.org', 'yopmail.pp.ua', 'cool.fr.nf', 'jetable.fr.nf',
  'nospam.ze.tc', 'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr', 'courriel.fr.nf',

  // ── Trashmail و سرویس‌های حذف‌شدنی ──
  'trash-mail.com', 'trash-mail.de', 'trashmail.at', 'trashmail.io',
  'trashmail.me', 'trashmail.net', 'trashmail.org', 'trashmail.ws',
  'trashymail.com', 'trashymail.net', 'mytemp.email', 'tempinbox.com',

  // ── Fake Inbox / Disposable ──
  'fake-mail.ml', 'fakemailgenerator.com', 'fakemail.fr', 'fakemail.net',
  'disposableemailaddresses.com', 'disposableinbox.com', 'dispose.it',
  'disposablemail.com', 'discardmail.com', 'discard.email', 'spamfree24.org',

  // ── MailDrop / MailCatch ──
  'mail-temp.com', 'mailexpire.com', 'mailforspam.com', 'mailfreeonline.com',
  'mailimate.com', 'mailmetrash.com', 'mailmoat.com', 'mailnator.com',

  // ── Temp Mail / Tempail ──
  'tempail.com', 'tempemail.com', 'tempemail.net', 'tempemailaddress.com',
  'tempmailaddress.com', 'tempmailbox.net', 'tempmailer.com', 'tempmailin.com',
  'tempmailo.com', 'tempmails.net', 'tempomail.fr', 'temporaryemail.net',
  'temporarymail.com', 'temporaryinbox.com', 'tempsky.com', 'tmails.net',

  // ── GetNada / Nada ──
  'nada.email', 'nadamail.com', 'getairmail.com', 'inboxalias.com',
  'inboxbear.com', 'inboxkitten.com', 'inboxes.com', 'inboxmail.life',

  // ── ایمیل‌های تست/اسپم ──
  'mailnull.com', 'spamavert.com', 'spambox.us', 'spamdecoy.net',
  'spamex.com', 'spamherelots.com', 'spamhereplease.com', 'spamify.com',
  'spammotel.com', 'spamobox.com', 'spamslicer.com', 'spamspot.com',
  'spamthis.co.uk', 'spamtrail.com', 'spamtroll.net', 'spam.la',

  // ── سرویس‌های متفرقه ──
  'emailfake.com', 'email-fake.com', 'emailgenerator.io', 'emailtemporanea.com',
  'emailtemporanea.net', 'emailtemporario.com.br', 'anonbox.net', 'anonymbox.com',
  'antireg.com', 'antireg.ru', 'binkmail.com', 'bobmail.info',
  'chammy.info', 'devnullmail.com', 'dingbone.com', 'dodgit.com',
  'e4ward.com', 'emailias.com', 'emailinfive.com', 'emailthe.net',
  'emailtmp.com', 'emailwarden.com', 'enterto.com', 'filzmail.com',
  'gishpuppy.com', 'great-host.in', 'haltospam.com', 'harakirimail.com',
  'herp.in', 'hidemail.de', 'hmamail.com', 'hostslick.com',
  'ieatspam.eu', 'ieatspam.info', 'ihateyoualot.info', 'imails.info',
  'incognitomail.com', 'incognitomail.net', 'insorg-mail.info', 'ipoo.org',
  'irish2me.com', 'jetable.com', 'jetable.net', 'jetable.org',
  'jnxjn.com', 'jourrapide.com', 'kasmail.com', 'killmail.com',
  'klassmaster.com', 'klzlk.com', 'koszmail.pl', 'kurzepost.de',
  'lookugly.com', 'lortemail.dk', 'lr78.com', 'maboard.com',
  'mailblocks.com', 'mailbucket.org', 'maildx.com', 'mailfa.tk',
  'mailfs.com', 'mailguard.me', 'mailhz.me', 'mailin8r.com',
  'mailincubator.com', 'mailismagic.com', 'mailme.ir', 'mailme.lv',
  'mailme24.com', 'mailorg.org', 'mailquack.com', 'mailrock.biz',
  'mailsac.com', 'mailscrap.com', 'mailseal.de', 'mailismagic.info',
  'mailzilla.com', 'mezimages.net', 'mfsa.ru', 'mierdamail.com',
  'mobamail.com', 'moncourrier.fr.nf', 'monemail.fr.nf', 'monmail.fr.nf',
  'muel.io', 'mycleaninbox.net', 'mymail-in.net', 'mypartyclip.de',
  'myphantomemail.com', 'mysamp.de', 'mytempemail.com', 'mytempmail.com',
  'mytrashmail.com', 'nabuma.com', 'neomailbox.com', 'nepwk.com',
  'nervmich.net', 'nervtmich.net', 'netmails.com', 'netmails.net',
  'neverbox.com', 'nice-4u.com', 'nincsmail.hu', 'nnh.com',
  'no-spam.ws', 'noblepioneer.com', 'nogmailspam.info', 'nomail.pw',
  'nomail2me.com', 'nonspam.eu', 'nonspammer.de', 'noref.in',
  'nospamfor.us', 'nospammail.net', 'nospamthanks.info', 'nothingtoseehere.ca',
  'nowmymail.com', 'nurfuerspam.de', 'objectmail.com', 'obobbo.com',
  'odnorazovoe.ru', 'oneoffemail.com', 'onewaymail.com', 'oopi.org',
  'ordinaryamerican.net', 'otherinbox.com', 'ourklips.com', 'outlawspam.com',
];

/** نرمال‌سازی دامنه: حروف کوچک و حذف نقطه‌ی انتهایی */
function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/\.$/, '');
}

const BLACKLIST = new Set<string>(TEMP_EMAIL_DOMAINS.map(normalizeDomain));

/**
 * آیا ایمیل متعلق به یک سرویس ایمیل موقت است؟
 * اگر ایمیل ساختار معتبر نداشته باشد `false` برمی‌گردد (اعتبارسنجی فرمت وظیفه‌ی caller است).
 */
export function isTempEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return false;
  const domain = normalizeDomain(email.slice(at + 1));
  if (!domain) return false;

  if (BLACKLIST.has(domain)) return true;
  // زیردامنه‌ها: foo.mailinator.com
  for (const blocked of BLACKLIST) {
    if (domain.endsWith('.' + blocked)) return true;
  }
  return false;
}

/** فهرست کامل دامنه‌های مسدود (کپی، تا caller نتواند لیست را تغییر دهد) */
export function getBlacklistedDomains(): string[] {
  return [...BLACKLIST].sort();
}

/** تعداد دامنه‌های مسدود — برای نمایش/تست */
export const BLACKLIST_SIZE = BLACKLIST.size;
