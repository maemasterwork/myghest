import * as jalaali from 'jalaali-js'

export const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

export const pad = (n: number) => String(n).padStart(2, '0')

export function toFaDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => FA_DIGITS[Number(d)])
}

/** تبدیل ارقام فارسی/عربی به لاتین */
export function fromFaDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
}

export function isoFromParts(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`
}

export function parseIso(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}

/** تاریخ امروز به وقت محلی دستگاه (ISO) */
export function todayIso(now: Date = new Date()): string {
  return isoFromParts(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

const DAY_MS = 86_400_000

function utcMs(iso: string): number {
  const { y, m, d } = parseIso(iso)
  return Date.UTC(y, m - 1, d)
}

export function addDays(iso: string, days: number): string {
  const dt = new Date(utcMs(iso) + days * DAY_MS)
  return isoFromParts(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

/** تعداد روز از a تا b (b - a) */
export function diffDays(a: string, b: string): number {
  return Math.round((utcMs(b) - utcMs(a)) / DAY_MS)
}

export interface JalaliParts {
  jy: number
  jm: number
  jd: number
}

export function isoToJalali(iso: string): JalaliParts {
  const { y, m, d } = parseIso(iso)
  const { jy, jm, jd } = jalaali.toJalaali(y, m, d)
  return { jy, jm, jd }
}

export function jalaliMonthLength(jy: number, jm: number): number {
  return jalaali.jalaaliMonthLength(jy, jm)
}

/** تاریخ شمسی → ISO میلادی؛ روز در صورت نیاز به آخر ماه کوتاه می‌شود */
export function jalaliToIso(jy: number, jm: number, jd: number): string {
  const day = Math.min(jd, jalaliMonthLength(jy, jm))
  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, day)
  return isoFromParts(gy, gm, gd)
}

/**
 * افزودن ماه شمسی. روزِ «لنگر» حفظ می‌شود و در ماه‌های کوتاه‌تر
 * به آخرین روز همان ماه می‌رسد (مثلاً ۳۱ ← ۳۰ مهر).
 */
export function addJalaliMonths(iso: string, months: number, anchorDay?: number): string {
  const { jy, jm, jd } = isoToJalali(iso)
  const total = jy * 12 + (jm - 1) + months
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return jalaliToIso(ny, nm, anchorDay ?? jd)
}

export function formatJalali(iso: string, opts: { year?: boolean } = {}): string {
  const { jy, jm, jd } = isoToJalali(iso)
  const base = `${toFaDigits(jd)} ${JALALI_MONTHS[jm - 1]}`
  return opts.year === false ? base : `${base} ${toFaDigits(jy)}`
}

/** «۳ روز دیگر» / «امروز» / «۲ روز پیش» */
export function relativeDays(iso: string, today: string): string {
  const n = diffDays(today, iso)
  if (n === 0) return 'امروز'
  if (n === 1) return 'فردا'
  if (n === -1) return 'دیروز'
  return n > 0 ? `${toFaDigits(n)} روز دیگر` : `${toFaDigits(-n)} روز پیش`
}
