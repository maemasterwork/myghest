import { describe, expect, it } from 'vitest'
import { summarizeCards } from './cards'
import { jalaliToIso } from './dates'
import { expandIncomes, expandInstallments } from './recurrence'
import type { Card, Income, Installment, Payment, Transfer } from './types'

const d = (jm: number, jd: number) => jalaliToIso(1405, jm, jd)

const card = (over: Partial<Card> & Pick<Card, 'id'>): Card => ({
  name: 'کارت',
  bank: null,
  color: '#5b5bf0',
  initial_balance: 0,
  start_date: d(7, 1),
  ...over,
})

const income = (over: Partial<Income> & Pick<Income, 'id' | 'date' | 'amount'>): Income => ({
  title: 'حقوق',
  is_expected: false,
  recurrence: 'none',
  repeat_count: null,
  card_id: null,
  ...over,
})

const inst: Installment = {
  id: 'x',
  title: 'وام',
  amount: 30,
  start_date: d(7, 20),
  recurrence: 'monthly',
  repeat_count: 5,
}

describe('موجودی کارت‌ها', () => {
  it('موجودی اولیه + واریزها − پرداخت‌ها', () => {
    const cards = [card({ id: 'c1', initial_balance: 50 }), card({ id: 'c2', initial_balance: 10 })]
    const incomes = expandIncomes(
      [income({ id: 'a', date: d(7, 15), amount: 100, recurrence: 'monthly', card_id: 'c1' })],
      d(12, 29),
    )
    const occ = expandInstallments([inst], [])
    const payments: Payment[] = [
      { id: 'p1', installment_id: 'x', due_date: d(7, 20), card_id: 'c1', paid_on: d(7, 20) },
    ]
    // امروز: ۲۵ مهر → فقط واریز ۱۵ مهر و پرداخت ۲۰ مهر
    const [s1, s2] = summarizeCards(cards, incomes, expandInstallments([inst], payments), payments, d(7, 25))
    expect(occ.length).toBe(5)
    expect(s1.deposits).toBe(100)
    expect(s1.paid).toBe(30)
    expect(s1.balance).toBe(50 + 100 - 30)
    expect(s2.balance).toBe(10)
  })

  it('واریز ماه بعد هنوز حساب نمی‌شود و بعد از رسیدن تاریخ اضافه می‌شود', () => {
    const cards = [card({ id: 'c1' })]
    const incomes = expandIncomes(
      [income({ id: 'a', date: d(7, 15), amount: 100, recurrence: 'monthly', card_id: 'c1' })],
      d(12, 29),
    )
    const before = summarizeCards(cards, incomes, [], [], d(8, 14))[0]
    const after = summarizeCards(cards, incomes, [], [], d(8, 15))[0]
    expect(before.balance).toBe(100)
    expect(after.balance).toBe(200)
  })

  it('تراکنش‌های قبل یا هم‌روز با تاریخ موجودی اولیه حساب نمی‌شوند', () => {
    const cards = [card({ id: 'c1', initial_balance: 40, start_date: d(7, 15) })]
    const incomes = expandIncomes([income({ id: 'a', date: d(7, 15), amount: 100, card_id: 'c1' })], d(12, 29))
    const payments: Payment[] = [
      { id: 'p', installment_id: 'x', due_date: d(7, 20), card_id: 'c1', paid_on: d(7, 10) },
    ]
    const [s] = summarizeCards(cards, incomes, expandInstallments([inst], payments), payments, d(7, 25))
    expect(s.balance).toBe(40)
    expect(s.entries).toHaveLength(0)
  })

  it('درآمد تخمینی، درآمد بدون کارت و پرداخت بدون کارت روی موجودی اثر ندارند', () => {
    const cards = [card({ id: 'c1' })]
    const incomes = expandIncomes(
      [
        income({ id: 'a', date: d(7, 5), amount: 100, card_id: 'c1', is_expected: true }),
        income({ id: 'b', date: d(7, 6), amount: 70, card_id: null }),
      ],
      d(12, 29),
    )
    const payments: Payment[] = [
      { id: 'p', installment_id: 'x', due_date: d(7, 20), card_id: null, paid_on: d(7, 20) },
    ]
    const [s] = summarizeCards(cards, incomes, expandInstallments([inst], payments), payments, d(7, 25))
    expect(s.balance).toBe(0)
  })

  it('برداشتن تیک پرداخت، موجودی را برمی‌گرداند', () => {
    const cards = [card({ id: 'c1', initial_balance: 100 })]
    const payments: Payment[] = [
      { id: 'p', installment_id: 'x', due_date: d(7, 20), card_id: 'c1', paid_on: d(7, 21) },
    ]
    const withPay = summarizeCards(cards, [], expandInstallments([inst], payments), payments, d(7, 25))[0]
    const without = summarizeCards(cards, [], expandInstallments([inst], []), [], d(7, 25))[0]
    expect(withPay.balance).toBe(70)
    expect(without.balance).toBe(100)
  })

  describe('انتقال بین کارت‌ها', () => {
    const t = (over: Partial<Transfer> & Pick<Transfer, 'id' | 'amount' | 'date'>): Transfer => ({
      from_card_id: 'c1',
      to_card_id: 'c2',
      note: null,
      ...over,
    })

    it('از مبدأ کم و به مقصد اضافه می‌شود و مجموع ثابت می‌ماند', () => {
      const cards = [card({ id: 'c1', initial_balance: 100 }), card({ id: 'c2', initial_balance: 20 })]
      const [a, b] = summarizeCards(cards, [], [], [], d(7, 25), [t({ id: 't1', amount: 30, date: d(7, 10) })])
      expect(a.balance).toBe(70)
      expect(b.balance).toBe(50)
      expect(a.balance + b.balance).toBe(120)
      expect(a.transfersOut).toBe(30)
      expect(b.transfersIn).toBe(30)
      expect(a.entries[0].title).toContain('انتقال به')
      expect(b.entries[0].title).toContain('انتقال از')
    })

    it('انتقال آینده یا قبل از تاریخ موجودی اولیه حساب نمی‌شود', () => {
      const cards = [
        card({ id: 'c1', initial_balance: 100, start_date: d(7, 5) }),
        card({ id: 'c2', initial_balance: 20, start_date: d(7, 5) }),
      ]
      const transfers = [
        t({ id: 'old', amount: 10, date: d(7, 5) }), // هم‌روز با موجودی اولیه ← حساب نمی‌شود
        t({ id: 'future', amount: 15, date: d(8, 1) }), // آینده
      ]
      const [a, b] = summarizeCards(cards, [], [], [], d(7, 25), transfers)
      expect(a.balance).toBe(100)
      expect(b.balance).toBe(20)
    })

    it('انتقال رفت‌وبرگشتی و موجودی منفی مجاز است', () => {
      const cards = [card({ id: 'c1', initial_balance: 10 }), card({ id: 'c2' })]
      const transfers = [
        t({ id: 'a', amount: 40, date: d(7, 10) }),
        t({ id: 'b', amount: 5, date: d(7, 12), from_card_id: 'c2', to_card_id: 'c1' }),
      ]
      const [a, b] = summarizeCards(cards, [], [], [], d(7, 25), transfers)
      expect(a.balance).toBe(10 - 40 + 5)
      expect(b.balance).toBe(40 - 5)
    })
  })
})
