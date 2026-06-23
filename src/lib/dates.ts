/**
 * أدوات التواريخ والمبالغ.
 *
 * - التواريخ تُخزَّن دائماً ميلادي بصيغة ISO (YYYY-MM-DD).
 * - العرض يدعم التبديل بين ميلادي وهجري عبر Intl (تقويم islamic-umalqura)
 *   بدون أي مكتبة خارجية، وهو نفس التقويم المعتمد رسمياً في السعودية.
 */

export type PaymentFrequency =
  | "monthly"
  | "quarterly"
  | "four_monthly"
  | "semi_annual"
  | "annual";

/** عدد الأشهر بين كل دفعة وأخرى حسب الدورية */
export const FREQUENCY_MONTHS: Record<PaymentFrequency, number> = {
  monthly: 1,
  quarterly: 3,
  four_monthly: 4,
  semi_annual: 6,
  annual: 12,
};

export const FREQUENCY_LABELS_AR: Record<PaymentFrequency, string> = {
  monthly: "شهري",
  quarterly: "كل 3 أشهر",
  four_monthly: "كل 4 أشهر",
  semi_annual: "كل 6 أشهر",
  annual: "سنوي",
};

/** يضيف عدداً من الأشهر لتاريخ، مع ضبط نهاية الشهر (مثلاً 31 يناير + شهر = 28/29 فبراير) */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  const targetMonthIndex = base.getUTCMonth() + months;
  const targetYear = base.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  // آخر يوم في الشهر الهدف لضبط الأيام الزائدة
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  return toISODate(new Date(Date.UTC(targetYear, normalizedMonth, day)));
}

export function toISODate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** الفرق بالأيام بين تاريخين (b - a) */
export function daysBetween(aISO: string, bISO: string): number {
  const a = Date.parse(aISO + "T00:00:00Z");
  const b = Date.parse(bISO + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

export interface GeneratedPayment {
  seq: number;
  due_date: string;
  amount: number;
}

/**
 * يولّد جدول الدفعات تلقائياً:
 * - يحسب عدد الدفعات من مدة العقد ÷ فترة الدورية.
 * - يوزّع القيمة الإجمالية بالتساوي، مع ضبط فروقات التقريب على آخر دفعة
 *   حتى يساوي مجموع الدفعات القيمة الإجمالية بالضبط (بالهللات).
 * - أول دفعة تستحق في تاريخ بداية العقد، ثم تتوالى حسب الدورية.
 */
export function generatePaymentSchedule(
  startDate: string,
  endDate: string,
  totalAmount: number,
  frequency: PaymentFrequency
): GeneratedPayment[] {
  const step = FREQUENCY_MONTHS[frequency];
  const totalDays = daysBetween(startDate, endDate);
  if (totalDays <= 0) return [];

  // عدد الدفعات = عدد الفترات الكاملة ضمن مدة العقد (بحد أدنى دفعة واحدة)
  const totalMonths = monthsBetween(startDate, endDate);
  const count = Math.max(1, Math.ceil(totalMonths / step));

  // التوزيع بالهللات لتفادي أخطاء الفاصلة العائمة
  const totalHalalas = Math.round(totalAmount * 100);
  const baseHalalas = Math.floor(totalHalalas / count);
  const remainder = totalHalalas - baseHalalas * count;

  const payments: GeneratedPayment[] = [];
  for (let i = 0; i < count; i++) {
    // الفرق من التقريب يُضاف للدفعة الأخيرة
    const halalas = baseHalalas + (i === count - 1 ? remainder : 0);
    payments.push({
      seq: i + 1,
      due_date: addMonths(startDate, i * step),
      amount: halalas / 100,
    });
  }
  return payments;
}

/** عدد الأشهر التقريبي بين تاريخين (يحسب الكسر) */
function monthsBetween(aISO: string, bISO: string): number {
  const [ay, am, ad] = aISO.split("-").map(Number);
  const [by, bm, bd] = bISO.split("-").map(Number);
  return (by - ay) * 12 + (bm - am) + (bd - ad) / 30;
}

/* ============ التنسيق والعرض ============ */

const arSA = "ar-SA-u-nu-latn"; // أرقام لاتينية مع عربية

/** ميلادي منسّق (YYYY-MM-DD → مثلاً 15 مارس 2026) */
export function formatGregorian(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00Z");
  return new Intl.DateTimeFormat(arSA, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** هجري منسّق عبر تقويم أم القرى */
export function formatHijri(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00Z");
  return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d) + " هـ";
}

export function formatDate(iso: string, calendar: "gregorian" | "hijri"): string {
  return calendar === "hijri" ? formatHijri(iso) : formatGregorian(iso);
}

/** مبلغ بالريال السعودي */
export function formatSAR(amount: number): string {
  return new Intl.NumberFormat("ar-SA-u-nu-latn", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** اسم الشهر الميلادي من رقمه (1-12) */
export function gregorianMonthName(month: number): string {
  const d = new Date(Date.UTC(2000, month - 1, 1));
  return new Intl.DateTimeFormat(arSA, { month: "long", timeZone: "UTC" }).format(d);
}

/* ============ تحويل هجري ↔ ميلادي للـ date picker ============ */

export const HIJRI_MONTHS_AR = [
  "محرّم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة",
  "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة",
];

export const GREGORIAN_MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export const WEEKDAYS_AR = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

export interface HijriParts {
  hy: number;
  hm: number; // 1-12
  hd: number;
}

/** ميلادي (ISO) → أجزاء هجرية عبر تقويم أم القرى */
export function gregorianToHijri(iso: string): HijriParts {
  const d = new Date(iso + "T12:00:00Z");
  const parts = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura", {
    day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC",
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return { hy: get("year"), hm: get("month"), hd: get("day") };
}

/** هجري → ميلادي (ISO) عبر التقدير ثم التصحيح يوماً بيوم */
export function hijriToISO(hy: number, hm: number, hd: number): string {
  const epoch = Date.UTC(622, 6, 19); // ~بداية التقويم الهجري ميلادياً
  const estDays = Math.round((hy - 1) * 354.367 + (hm - 1) * 29.53 + (hd - 1));
  let guess = new Date(epoch + estDays * 86_400_000);
  for (let i = 0; i < 8; i++) {
    const g = gregorianToHijri(toISODate(guess));
    const diff = (hy - g.hy) * 354.367 + (hm - g.hm) * 29.53 + (hd - g.hd);
    const adj = Math.round(diff);
    if (adj === 0) break;
    guess = new Date(guess.getTime() + adj * 86_400_000);
  }
  for (let i = 0; i < 5; i++) {
    const g = gregorianToHijri(toISODate(guess));
    if (g.hy === hy && g.hm === hm && g.hd === hd) break;
    const cmp = (g.hy - hy) || (g.hm - hm) || (g.hd - hd);
    guess = new Date(guess.getTime() + (cmp > 0 ? -1 : 1) * 86_400_000);
  }
  return toISODate(guess);
}

/** عدد أيام شهر هجري معيّن (29 أو 30) */
export function hijriMonthLength(hy: number, hm: number): number {
  const firstNext = hm === 12 ? hijriToISO(hy + 1, 1, 1) : hijriToISO(hy, hm + 1, 1);
  const first = hijriToISO(hy, hm, 1);
  return daysBetween(first, firstNext);
}

/** يوم الأسبوع (0=أحد) لتاريخ ISO */
export function weekdayOf(iso: string): number {
  return new Date(iso + "T12:00:00Z").getUTCDay();
}
