import { addJalaliMonths, isoToJalali } from './dates'
import type {
  Income,
  IncomeOccurrence,
  Installment,
  InstallmentOccurrence,
  Payment,
} from './types'

const SAFETY_CAP = 600

/**
 * درآمدها را به نوبت‌های واقعی باز می‌کند.
 * درآمد ماهانه هر ماه شمسی در همان روزِ شروع تکرار می‌شود، تا `horizonEnd`
 * (یا تا `repeat_count` نوبت اگر مشخص باشد).
 */
export function expandIncomes(incomes: Income[], horizonEnd: string): IncomeOccurrence[] {
  const out: IncomeOccurrence[] = []
  for (const inc of incomes) {
    if (inc.recurrence === 'none') {
      out.push({
        key: `${inc.id}#0`,
        incomeId: inc.id,
        title: inc.title,
        amount: inc.amount,
        date: inc.date,
        isExpected: inc.is_expected,
        cardId: inc.card_id ?? null,
        recurring: false,
        index: 0,
      })
      continue
    }
    const anchor = isoToJalali(inc.date).jd
    for (let i = 0; i < SAFETY_CAP; i++) {
      if (inc.repeat_count !== null && i >= inc.repeat_count) break
      const date = addJalaliMonths(inc.date, i, anchor)
      if (i > 0 && date > horizonEnd) break
      out.push({
        key: `${inc.id}#${i}`,
        incomeId: inc.id,
        title: inc.title,
        amount: inc.amount,
        date,
        isExpected: inc.is_expected,
        cardId: inc.card_id ?? null,
        recurring: true,
        index: i,
      })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key))
}

/** اقساط را به سررسیدهای ماهانه باز می‌کند و وضعیت پرداخت را روی هر کدام می‌گذارد. */
export function expandInstallments(
  installments: Installment[],
  payments: Payment[],
): InstallmentOccurrence[] {
  const paid = new Set(payments.map((p) => `${p.installment_id}|${p.due_date}`))
  const out: InstallmentOccurrence[] = []
  for (const ins of installments) {
    const total = ins.recurrence === 'none' ? 1 : Math.max(1, ins.repeat_count)
    const anchor = isoToJalali(ins.start_date).jd
    for (let i = 0; i < total; i++) {
      const date = i === 0 ? ins.start_date : addJalaliMonths(ins.start_date, i, anchor)
      out.push({
        key: `${ins.id}#${i}`,
        installmentId: ins.id,
        title: ins.title,
        amount: ins.amount,
        date,
        index: i,
        total,
        paid: paid.has(`${ins.id}|${date}`),
      })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key))
}
