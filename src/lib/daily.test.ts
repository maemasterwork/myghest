import { describe, expect, it } from 'vitest'
import { summarizeCards } from './cards'
import { categoryBreakdown, groupByDay, monthBounds, pendingDays, totals } from './daily'
import { addDays, jalaliToIso } from './dates'
import type { Card, Transaction, TxCategory } from './types'

const d = (jm: number, jd: number) => jalaliToIso(1405, jm, jd)
const tx = (over: Partial<Transaction> & Pick<Transaction, 'id' | 'date' | 'amount'>): Transaction => ({
  kind: 'out',
  category_id: 'food',
  card_id: null,
  note: null,
  ...over,
})
const cats: TxCategory[] = [
  { id: 'food', name: 'خوراک', kind: 'out', color: '#d97706', archived: false },
  { id: 'fuel', name: 'حمل‌ونقل', kind: 'out', color: '#0ea5e9', archived: false },
  { id: 'gift', name: 'هدیه', kind: 'in', color: '#0f9d74', archived: false },
]

describe('تراکنش‌های روزانه', () => {
  it('جمع‌ها و گروه‌بندی روزانه', () => {
    const txs = [
      tx({ id: '1', date: d(7, 10), amount: 50 }),
      tx({ id: '2', date: d(7, 10), amount: 20, kind: 'in', category_id: 'gift' }),
      tx({ id: '3', date: d(7, 12), amount: 30, category_id: 'fuel' }),
    ]
    expect(totals(txs)).toEqual({ in: 20, out: 80, net: -60 })
    const days = groupByDay(txs)
    expect(days.map((x) => x.date)).toEqual([d(7, 12), d(7, 10)])
    expect(days[1].inTotal).toBe(20)
    expect(days[1].outTotal).toBe(50)
  })

  it('سهم دسته‌ها در برداشت‌ها', () => {
    const txs = [
      tx({ id: '1', date: d(7, 10), amount: 75 }),
      tx({ id: '2', date: d(7, 11), amount: 25, category_id: 'fuel' }),
      tx({ id: '3', date: d(7, 11), amount: 999, kind: 'in', category_id: 'gift' }),
    ]
    const b = categoryBreakdown(txs, cats, 'out')
    expect(b.map((x) => x.name)).toEqual(['خوراک', 'حمل‌ونقل'])
    expect(b[0].share).toBeCloseTo(0.75)
    expect(b[1].count).toBe(1)
  })

  it('محدوده‌ی ماه شمسی', () => {
    const { start, end } = monthBounds(1405, 7)
    expect(start).toBe(d(7, 1))
    expect(end).toBe(d(8, 1))
  })

  it('روز اول: فقط امروز نیاز به ثبت دارد', () => {
    expect(pendingDays(d(7, 25), [], [])).toEqual([d(7, 25)])
  })

  it('روزهای خالی بعد از اولین ثبت، تا امروز مانده‌اند؛ «تراکنشی نداشتم» روز را می‌بندد', () => {
    const today = d(7, 25)
    const txs = [tx({ id: '1', date: d(7, 22), amount: 5 })]
    // ۲۲ ثبت شده؛ ۲۳، ۲۴، ۲۵ باز است
    expect(pendingDays(today, txs, [])).toEqual([d(7, 25), d(7, 24), d(7, 23)])
    expect(pendingDays(today, txs, [d(7, 24)])).toEqual([d(7, 25), d(7, 23)])
    expect(pendingDays(today, txs, [d(7, 23), d(7, 24), d(7, 25)])).toEqual([])
  })

  it('حداکثر هفت روز اخیر', () => {
    const today = d(7, 25)
    const txs = [tx({ id: '1', date: addDays(today, -20), amount: 5 })]
    expect(pendingDays(today, txs, [])).toHaveLength(7)
  })
})

describe('موجودی کارت با تراکنش روزانه', () => {
  const card: Card = {
    id: 'c1',
    name: 'کارت',
    bank: null,
    color: '#5b5bf0',
    initial_balance: 1000,
    start_date: d(7, 1),
  }

  it('واریز و برداشت کارت را تغییر می‌دهد (فقط بعد از تاریخ اولیه و تا امروز)', () => {
    const txs = [
      tx({ id: '1', date: d(7, 5), amount: 200, card_id: 'c1' }),
      tx({ id: '2', date: d(7, 6), amount: 50, kind: 'in', category_id: 'gift', card_id: 'c1' }),
      tx({ id: '3', date: d(7, 1), amount: 999, card_id: 'c1' }), // هم‌روز با تاریخ اولیه
      tx({ id: '4', date: d(8, 1), amount: 999, card_id: 'c1' }), // آینده
      tx({ id: '5', date: d(7, 7), amount: 999, card_id: null }), // بدون کارت
    ]
    const [s] = summarizeCards([card], [], [], [], d(7, 25), [], txs, cats)
    expect(s.txOut).toBe(200)
    expect(s.txIn).toBe(50)
    expect(s.balance).toBe(1000 - 200 + 50)
    expect(s.entries.map((e) => e.title)).toContain('خوراک')
  })
})

import { buildAutoEntries } from './daily'
describe('buildAutoEntries', () => {
  it('درآمد دریافت‌شده، قسط پرداخت‌شده و انتقال را برمی‌گرداند و تخمینی/آینده را نه', () => {
    const card = { id: 'c1', name: 'الف', bank: null, color: '#000', initial_balance: 0, start_date: '2026-01-01' }
    const card2 = { ...card, id: 'c2', name: 'ب' }
    const inc = (key: string, date: string, isExpected = false) => ({
      key, incomeId: key, title: 'حقوق', amount: 100, date, isExpected, cardId: 'c1', recurring: false, index: 0,
    })
    const r = buildAutoEntries(
      [inc('a', '2026-10-01'), inc('b', '2026-10-02', true), inc('c', '2026-11-01')],
      [
        { key: 'i1', installmentId: 'x', title: 'وام', amount: 40, date: '2026-10-05', index: 0, total: 1, paid: true },
        { key: 'i2', installmentId: 'y', title: 'وام۲', amount: 40, date: '2026-10-06', index: 0, total: 1, paid: false },
      ],
      [{ id: 'p', installment_id: 'x', due_date: '2026-10-05', card_id: 'c2', paid_on: '2026-10-07' }],
      [{ id: 't', from_card_id: 'c1', to_card_id: 'c2', amount: 10, date: '2026-10-08', note: null }],
      [card, card2],
      '2026-10-16',
    )
    expect(r.map((e) => e.kind).sort()).toEqual(['income', 'installment', 'transfer'])
    expect(r.find((e) => e.kind === 'installment')).toMatchObject({ date: '2026-10-07', cardLabel: 'ب' })
    expect(r.find((e) => e.kind === 'transfer')?.cardLabel).toBe('الف ← ب')
  })
})
