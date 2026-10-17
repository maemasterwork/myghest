import { addDays, addJalaliMonths, jalaliToIso } from './dates'
import type {
  Card,
  IncomeOccurrence,
  InstallmentOccurrence,
  Payment,
  Transaction,
  Transfer,
  TxCategory,
  TxKind,
} from './types'

/** ابتدای ماه شمسی (شامل) تا ابتدای ماه بعد (غیرشامل) */
export function monthBounds(jy: number, jm: number): { start: string; end: string } {
  const start = jalaliToIso(jy, jm, 1)
  return { start, end: addJalaliMonths(start, 1, 1) }
}

export function inRange(txs: Transaction[], start: string, end: string): Transaction[] {
  return txs.filter((t) => t.date >= start && t.date < end)
}

export interface DaySummary {
  date: string
  items: Transaction[]
  inTotal: number
  outTotal: number
}

/** تراکنش‌ها را بر اساس روز دسته می‌کند؛ جدیدترین روز اول */
export function groupByDay(txs: Transaction[]): DaySummary[] {
  const m = new Map<string, Transaction[]>()
  for (const t of txs) {
    const arr = m.get(t.date)
    if (arr) arr.push(t)
    else m.set(t.date, [t])
  }
  return [...m.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({
      date,
      items,
      inTotal: items.filter((t) => t.kind === 'in').reduce((s, t) => s + t.amount, 0),
      outTotal: items.filter((t) => t.kind === 'out').reduce((s, t) => s + t.amount, 0),
    }))
}

export function totals(txs: Transaction[]): { in: number; out: number; net: number } {
  const i = txs.filter((t) => t.kind === 'in').reduce((s, t) => s + t.amount, 0)
  const o = txs.filter((t) => t.kind === 'out').reduce((s, t) => s + t.amount, 0)
  return { in: i, out: o, net: i - o }
}

export interface CategoryShare {
  categoryId: string
  name: string
  color: string
  total: number
  /** سهم از کل (۰ تا ۱) */
  share: number
  count: number
}

export function categoryBreakdown(
  txs: Transaction[],
  categories: TxCategory[],
  kind: TxKind,
): CategoryShare[] {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const acc = new Map<string, { total: number; count: number }>()
  for (const t of txs) {
    if (t.kind !== kind) continue
    const cur = acc.get(t.category_id) ?? { total: 0, count: 0 }
    cur.total += t.amount
    cur.count += 1
    acc.set(t.category_id, cur)
  }
  const sum = [...acc.values()].reduce((s, v) => s + v.total, 0)
  return [...acc.entries()]
    .map(([id, v]) => {
      const c = byId.get(id)
      return {
        categoryId: id,
        name: c?.name ?? 'بدون دسته',
        color: c?.color ?? '#94a3b8',
        total: v.total,
        share: sum > 0 ? v.total / sum : 0,
        count: v.count,
      }
    })
    .sort((a, b) => b.total - a.total)
}

export const isDayDone = (date: string, txs: Transaction[], checkins: string[]): boolean =>
  checkins.includes(date) || txs.some((t) => t.date === date)

/**
 * روزهایی که هنوز «بسته» نشده‌اند (نه تراکنشی دارند و نه «تراکنشی نداشتم» زده شده)؛ جدیدترین اول.
 * - اگر هنوز هیچ ثبتی نیست، فقط امروز.
 * - وگرنه از اولین روزی که ثبت کرده تا امروز (حداکثر `maxBack` روز اخیر).
 */
export function pendingDays(
  today: string,
  txs: Transaction[],
  checkins: string[],
  maxBack = 7,
): string[] {
  const touched = [...txs.map((t) => t.date), ...checkins].filter((d) => d <= today).sort()
  const first = touched[0]
  const out: string[] = []
  for (let i = 0; i < maxBack; i++) {
    const d = addDays(today, -i)
    if (first !== undefined && d < first) break
    if (!isDayDone(d, txs, checkins)) out.push(d)
    if (first === undefined) break // بدون هیچ سابقه‌ای فقط امروز
  }
  return out
}

/* ---------- ردیف‌های خودکار: درآمد، قسط پرداخت‌شده، انتقال بین کارت‌ها ---------- */

export type AutoKind = 'income' | 'installment' | 'transfer'

export interface AutoEntry {
  key: string
  kind: AutoKind
  date: string
  amount: number
  /** نام دسته‌ی نمایشی */
  category: string
  title: string
  /** کارت (یا «از ← به» برای انتقال) */
  cardLabel: string | null
}

export const AUTO_META: Record<AutoKind, { category: string; color: string }> = {
  income: { category: 'درآمد', color: '#0f9d74' },
  installment: { category: 'اقساط', color: '#5b5bf0' },
  transfer: { category: 'انتقال بین کارت‌ها', color: '#0ea5e9' },
}

export function buildAutoEntries(
  incomes: IncomeOccurrence[],
  installments: InstallmentOccurrence[],
  payments: Payment[],
  transfers: Transfer[],
  cards: Card[],
  today: string,
): AutoEntry[] {
  const cardName = new Map(cards.map((c) => [c.id, c.name]))
  const out: AutoEntry[] = []
  for (const o of incomes) {
    if (o.isExpected || o.date > today) continue
    out.push({
      key: `in-${o.key}`,
      kind: 'income',
      date: o.date,
      amount: o.amount,
      category: AUTO_META.income.category,
      title: o.title,
      cardLabel: o.cardId ? (cardName.get(o.cardId) ?? null) : null,
    })
  }
  for (const o of installments) {
    if (!o.paid) continue
    const p = payments.find((x) => x.installment_id === o.installmentId && x.due_date === o.date)
    const date = p?.paid_on ?? o.date
    if (date > today) continue
    out.push({
      key: `inst-${o.key}`,
      kind: 'installment',
      date,
      amount: o.amount,
      category: AUTO_META.installment.category,
      title: o.title,
      cardLabel: p?.card_id ? (cardName.get(p.card_id) ?? null) : null,
    })
  }
  for (const t of transfers) {
    if (t.date > today) continue
    out.push({
      key: `tr-${t.id}`,
      kind: 'transfer',
      date: t.date,
      amount: t.amount,
      category: AUTO_META.transfer.category,
      title: t.note || 'انتقال',
      cardLabel: `${cardName.get(t.from_card_id) ?? '؟'} ← ${cardName.get(t.to_card_id) ?? '؟'}`,
    })
  }
  return out
}
