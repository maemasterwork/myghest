import { describe, expect, it } from 'vitest'
import { addJalaliMonths, isoToJalali, jalaliToIso } from './dates'
import { buildPlan } from './allocation'
import { expandIncomes, expandInstallments } from './recurrence'
import type { Income, Installment, Payment } from './types'

const inc = (over: Partial<Income> & Pick<Income, 'id' | 'date' | 'amount'>): Income => ({
  title: 'درآمد',
  is_expected: false,
  recurrence: 'none',
  repeat_count: null,
  card_id: null,
  ...over,
})
const ins = (
  over: Partial<Installment> & Pick<Installment, 'id' | 'start_date' | 'amount'>,
): Installment => ({
  title: 'قسط',
  recurrence: 'none',
  repeat_count: 1,
  ...over,
})

describe('تاریخ شمسی', () => {
  it('تبدیل رفت‌وبرگشت', () => {
    const iso = jalaliToIso(1405, 7, 23)
    expect(isoToJalali(iso)).toEqual({ jy: 1405, jm: 7, jd: 23 })
  })

  it('روز ۳۱ در ماه‌های ۳۰ روزه کوتاه می‌شود و دوباره به ۳۱ برمی‌گردد', () => {
    const start = jalaliToIso(1405, 6, 31) // ۳۱ شهریور
    const mehr = addJalaliMonths(start, 1, 31)
    expect(isoToJalali(mehr)).toEqual({ jy: 1405, jm: 7, jd: 30 })
    const dey = addJalaliMonths(start, 4, 31) // دی ۳۰ روز
    expect(isoToJalali(dey)).toEqual({ jy: 1405, jm: 10, jd: 30 })
  })

  it('عبور از پایان سال', () => {
    const start = jalaliToIso(1405, 11, 15)
    expect(isoToJalali(addJalaliMonths(start, 2))).toEqual({ jy: 1406, jm: 1, jd: 15 })
  })
})

describe('باز کردن تکرارها', () => {
  it('قسط ماهانه به تعداد مشخص ساخته می‌شود و پرداخت‌شده‌ها علامت می‌خورند', () => {
    const start = jalaliToIso(1405, 7, 5)
    const list = [ins({ id: 'a', start_date: start, amount: 100, recurrence: 'monthly', repeat_count: 4 })]
    const secondDue = addJalaliMonths(start, 1, 5)
    const payments: Payment[] = [{ id: 'p', installment_id: 'a', due_date: secondDue, card_id: null, paid_on: null }]
    const occ = expandInstallments(list, payments)
    expect(occ).toHaveLength(4)
    expect(occ.map((o) => o.paid)).toEqual([false, true, false, false])
    expect(occ[3].index).toBe(3)
  })

  it('درآمد ماهانه بی‌پایان تا افق باز می‌شود', () => {
    const start = jalaliToIso(1405, 1, 1)
    const horizon = jalaliToIso(1405, 6, 15)
    const occ = expandIncomes([inc({ id: 'i', date: start, amount: 10, recurrence: 'monthly' })], horizon)
    expect(occ).toHaveLength(6) // فروردین تا شهریور
  })
})

describe('تخصیص درآمد به بازه‌ها', () => {
  const d = (jm: number, jd: number) => jalaliToIso(1405, jm, jd)

  it('اقساط بین دو درآمد روی درآمد اول می‌نشینند', () => {
    const incomes = expandIncomes(
      [inc({ id: 'a', date: d(7, 1), amount: 30 }), inc({ id: 'b', date: d(8, 1), amount: 50 })],
      d(12, 29),
    )
    const installments = expandInstallments(
      [
        ins({ id: 'x', start_date: d(7, 5), amount: 10 }),
        ins({ id: 'y', start_date: d(7, 20), amount: 15 }),
        ins({ id: 'z', start_date: d(8, 1), amount: 7 }), // روز درآمد دوم ← بازه‌ی دوم
      ],
      [],
    )
    const plan = buildPlan(incomes, installments, d(7, 10))
    expect(plan.windows).toHaveLength(2)
    const [w1, w2] = plan.windows
    expect(w1.total).toBe(25)
    expect(w1.balance).toBe(5)
    expect(w1.shortfall).toBe(0)
    expect(w2.total).toBe(7)
    expect(w2.endIsEstimated).toBe(true)
    expect(plan.focus).toBe(w1)
    expect(plan.next).toBe(w2)
    expect(w1.state).toBe('current')
    expect(w2.state).toBe('future')
  })

  it('کسری و پوشش جزئی محاسبه می‌شود', () => {
    const incomes = expandIncomes([inc({ id: 'a', date: d(7, 1), amount: 20 })], d(12, 29))
    const installments = expandInstallments(
      [
        ins({ id: 'x', start_date: d(7, 3), amount: 15 }),
        ins({ id: 'y', start_date: d(7, 9), amount: 15 }),
        ins({ id: 'z', start_date: d(7, 12), amount: 15 }),
      ],
      [],
    )
    const [w] = buildPlan(incomes, installments, d(7, 2)).windows
    expect(w.shortfall).toBe(25)
    expect(w.items.map((i) => i.coverage)).toEqual(['covered', 'partial', 'uncovered'])
    expect(w.items[1].coveredAmount).toBe(5)
  })

  it('پرداخت‌شده‌ها از «باید کنار بگذاری» کم می‌شوند', () => {
    const incomes = expandIncomes([inc({ id: 'a', date: d(7, 1), amount: 100 })], d(12, 29))
    const list = [ins({ id: 'x', start_date: d(7, 5), amount: 10, recurrence: 'monthly', repeat_count: 3 })]
    const payments: Payment[] = [{ id: 'p', installment_id: 'x', due_date: d(7, 5), card_id: null, paid_on: null }]
    const [w] = buildPlan(incomes, expandInstallments(list, payments), d(7, 6)).windows
    expect(w.total).toBe(10)
    expect(w.paid).toBe(10)
    expect(w.unpaid).toBe(0)
  })

  it('درآمدهای هم‌روز جمع می‌شوند', () => {
    const incomes = expandIncomes(
      [inc({ id: 'a', date: d(7, 1), amount: 10 }), inc({ id: 'b', date: d(7, 1), amount: 25 })],
      d(12, 29),
    )
    const plan = buildPlan(incomes, [], d(7, 2))
    expect(plan.windows).toHaveLength(1)
    expect(plan.windows[0].incomeTotal).toBe(35)
  })

  it('اقساط عقب‌افتاده و قبل از اولین درآمد گزارش می‌شوند', () => {
    const incomes = expandIncomes([inc({ id: 'a', date: d(7, 10), amount: 100 })], d(12, 29))
    const installments = expandInstallments([ins({ id: 'x', start_date: d(7, 2), amount: 9 })], [])
    const plan = buildPlan(incomes, installments, d(7, 15))
    expect(plan.beforeFirst).toHaveLength(1)
    expect(plan.overdue).toHaveLength(1)
    expect(plan.overdueTotal).toBe(9)
  })

  it('اگر هنوز درآمدی شروع نشده، اولین بازه‌ی آینده فوکوس است', () => {
    const incomes = expandIncomes([inc({ id: 'a', date: d(8, 1), amount: 100 })], d(12, 29))
    const plan = buildPlan(incomes, [], d(7, 1))
    expect(plan.focus?.state).toBe('future')
  })

  it('بدون درآمد: پلن خالی', () => {
    const plan = buildPlan([], [], d(7, 1))
    expect(plan.focus).toBeNull()
    expect(plan.windows).toHaveLength(0)
  })

  it('باقی‌مانده‌ی بازه‌ی قبل به بازه‌ی بعد منتقل می‌شود', () => {
    // حقوق ۱۰۰ در ۱۵ هر ماه؛ قسط ۳۰ در ۲۰ هر ماه
    const incomes = expandIncomes(
      [inc({ id: 'a', date: d(7, 15), amount: 100, recurrence: 'monthly' })],
      d(11, 29),
    )
    const installments = expandInstallments(
      [ins({ id: 'x', start_date: d(7, 20), amount: 30, recurrence: 'monthly', repeat_count: 10 })],
      [],
    )
    const plan = buildPlan(incomes, installments, d(7, 16))
    const [w1, w2, w3] = plan.windows
    expect(w1.carryIn).toBe(0)
    expect(w1.balance).toBe(70)
    expect(w2.carryIn).toBe(70)
    expect(w2.available).toBe(170)
    expect(w2.balance).toBe(140)
    expect(w3.carryIn).toBe(140)
    // لازم نیست از درآمد جدید چیزی کنار گذاشته شود چون باقی‌مانده‌ی قبلی کافی است
    expect(w2.setAside).toBe(0)
  })

  it('کسری هم به بازه‌ی بعد منتقل می‌شود و روی مبلغ لازم اضافه می‌شود', () => {
    const incomes = expandIncomes(
      [inc({ id: 'a', date: d(7, 1), amount: 10 }), inc({ id: 'b', date: d(8, 1), amount: 50 })],
      d(12, 29),
    )
    const installments = expandInstallments(
      [
        ins({ id: 'x', start_date: d(7, 5), amount: 25 }),
        ins({ id: 'y', start_date: d(8, 5), amount: 20 }),
      ],
      [],
    )
    const [w1, w2] = buildPlan(incomes, installments, d(7, 2)).windows
    expect(w1.balance).toBe(-15)
    expect(w2.carryIn).toBe(-15)
    expect(w2.setAside).toBe(35) // ۲۰ قسط + ۱۵ کسری قبلی
    expect(w2.balance).toBe(15)
  })

  it('باقی‌مانده‌ی اولیه به اولین بازه اضافه می‌شود', () => {
    const incomes = expandIncomes([inc({ id: 'a', date: d(7, 1), amount: 20 })], d(12, 29))
    const installments = expandInstallments([ins({ id: 'x', start_date: d(7, 5), amount: 30 })], [])
    const [w] = buildPlan(incomes, installments, d(7, 2), 25).windows
    expect(w.carryIn).toBe(25)
    expect(w.available).toBe(45)
    expect(w.setAside).toBe(5)
    expect(w.balance).toBe(15)
  })
})
