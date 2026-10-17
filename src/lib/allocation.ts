import { addJalaliMonths, addDays } from './dates'
import type { IncomeOccurrence, InstallmentOccurrence } from './types'

export type Coverage = 'covered' | 'partial' | 'uncovered'

export interface WindowItem extends InstallmentOccurrence {
  /** چه مقدار از این قسط با درآمد همین بازه پوشش داده می‌شود */
  coveredAmount: number
  coverage: Coverage
}

/** یک «بازه‌ی تعهد»: از تاریخ یک درآمد تا قبل از درآمد بعدی */
export interface Window {
  /** تاریخ شروع بازه (تاریخ درآمد) */
  start: string
  /** تاریخ پایان (درآمد بعدی)؛ خودِ این روز جزو بازه‌ی بعدی است */
  end: string
  /** اگر درآمد بعدی ثبت نشده باشد، پایان به‌صورت تخمینی (یک ماه شمسی بعد) فرض می‌شود */
  endIsEstimated: boolean
  /** درآمدهایی که در همین روز دریافت شده‌اند (ممکن است بیش از یکی باشد) */
  incomes: IncomeOccurrence[]
  incomeTotal: number
  /** باقی‌مانده (مازاد +، کسری −) از بازه‌ی قبل که به این بازه منتقل شده */
  carryIn: number
  /** درآمد این بازه + باقی‌مانده‌ی قبلی */
  available: number
  items: WindowItem[]
  /** مجموع اقساط بازه (پرداخت‌شده + پرداخت‌نشده) */
  total: number
  paid: number
  /** هنوز باید کنار گذاشته شود */
  unpaid: number
  /** (درآمد + باقی‌مانده‌ی قبلی) − کل اقساط؛ به بازه‌ی بعد منتقل می‌شود */
  balance: number
  /** از «درآمد این بازه» چقدر باید برای اقساط کنار گذاشت (بعد از کسر باقی‌مانده‌ی قبلی) */
  setAside: number
  shortfall: number
  /** آیا همه‌ی درآمدهای این بازه تخمینی هستند؟ */
  isExpected: boolean
  state: 'past' | 'current' | 'future'
}

export interface Plan {
  windows: Window[]
  /** بازه‌ای که «الان» داخل آن هستیم؛ اگر هنوز هیچ درآمدی دریافت نشده، نزدیک‌ترین بازه‌ی آینده */
  focus: Window | null
  /** بازه‌ی بعد از focus */
  next: Window | null
  /** اقساطی که قبل از اولین درآمد ثبت‌شده سررسید می‌شوند */
  beforeFirst: InstallmentOccurrence[]
  /** اقساط پرداخت‌نشده‌ی گذشته */
  overdue: InstallmentOccurrence[]
  overdueTotal: number
}

export function buildPlan(
  incomeOccurrences: IncomeOccurrence[],
  installmentOccurrences: InstallmentOccurrence[],
  today: string,
  openingBalance = 0,
): Plan {
  // درآمدهای هم‌روز را یکی می‌کنیم
  const byDate = new Map<string, IncomeOccurrence[]>()
  for (const o of incomeOccurrences) {
    const arr = byDate.get(o.date)
    if (arr) arr.push(o)
    else byDate.set(o.date, [o])
  }
  const dates = [...byDate.keys()].sort()
  const installments = [...installmentOccurrences].sort(
    (a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key),
  )

  // آخرین درآمدِ شروع‌شده → بازه‌ی جاری
  let currentIdx = -1
  dates.forEach((d, i) => {
    if (d <= today) currentIdx = i
  })

  const windows: Window[] = []
  let carry = openingBalance
  dates.forEach((start, i) => {
    const incomes = byDate.get(start)!
    const nextDate = dates[i + 1]
    const end = nextDate ?? addJalaliMonths(start, 1)
    const incomeTotal = incomes.reduce((s, o) => s + o.amount, 0)

    const carryIn = carry
    const available = incomeTotal + carryIn
    let remaining = available
    const items: WindowItem[] = installments
      .filter((it) => it.date >= start && it.date < end)
      .map((it) => {
        const coveredAmount = Math.min(it.amount, Math.max(0, remaining))
        remaining -= it.amount
        const coverage: Coverage =
          coveredAmount >= it.amount ? 'covered' : coveredAmount > 0 ? 'partial' : 'uncovered'
        return { ...it, coveredAmount, coverage }
      })

    const total = items.reduce((s, it) => s + it.amount, 0)
    const paid = items.filter((it) => it.paid).reduce((s, it) => s + it.amount, 0)
    const balance = available - total
    carry = balance
    windows.push({
      start,
      end,
      endIsEstimated: nextDate === undefined,
      incomes,
      incomeTotal,
      carryIn,
      available,
      items,
      total,
      paid,
      unpaid: total - paid,
      balance,
      setAside: Math.max(0, total - paid - carryIn),
      shortfall: Math.max(0, -balance),
      isExpected: incomes.every((o) => o.isExpected || o.date > today),
      state: i < currentIdx ? 'past' : i === currentIdx ? 'current' : 'future',
    })
  })

  const focusIdx = currentIdx >= 0 ? currentIdx : windows.length > 0 ? 0 : -1
  const focus = focusIdx >= 0 ? windows[focusIdx] : null
  const next = focusIdx >= 0 ? (windows[focusIdx + 1] ?? null) : null

  const firstStart = dates[0]
  const beforeFirst = firstStart ? installments.filter((it) => it.date < firstStart) : []
  const overdue = installments.filter((it) => !it.paid && it.date < today)

  return {
    windows,
    focus,
    next,
    beforeFirst,
    overdue,
    overdueTotal: overdue.reduce((s, it) => s + it.amount, 0),
  }
}

/** افق باز کردن درآمدهای تکرارشونده: امروز + ۱۳ ماه شمسی */
export function planHorizon(today: string): string {
  return addDays(addJalaliMonths(today, 13), 0)
}
