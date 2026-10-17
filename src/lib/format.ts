import { toFaDigits } from './dates'

/** جداکننده‌ی هزارگان فارسی «٬» و ارقام فارسی، مستقل از ICU مرورگر */
export const fmt = (n: number) =>
  toFaDigits(Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬'))
export const toman = (n: number) => `${fmt(n)} تومان`

function trimFa(x: number): string {
  return toFaDigits(String(Math.round(x * 10) / 10).replace('.', '٫'))
}

/** «۱۲٫۵ میلیون تومان» برای نمایش خلاصه */
export function shortToman(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '−' : ''
  if (abs >= 1e9) return `${sign}${trimFa(abs / 1e9)} میلیارد تومان`
  if (abs >= 1e6) return `${sign}${trimFa(abs / 1e6)} میلیون تومان`
  if (abs >= 1e3) return `${sign}${trimFa(abs / 1e3)} هزار تومان`
  return `${sign}${toman(abs)}`
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'object' && e && 'message' in e) return String((e as { message: unknown }).message)
  return 'خطای ناشناخته'
}

/** «۶٫۵م» / «۴۰ه» برای برچسب‌های کوچک روی نمودار */
export function compactToman(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '−' : ''
  if (abs >= 1e9) return `${sign}${trimFa(abs / 1e9)}میلیارد`
  if (abs >= 1e6) return `${sign}${trimFa(abs / 1e6)}م`
  if (abs >= 1e3) return `${sign}${trimFa(abs / 1e3)}ه`
  return `${sign}${toFaDigits(abs)}`
}
