import type {
  Card,
  IncomeOccurrence,
  InstallmentOccurrence,
  Payment,
  Transaction,
  Transfer,
  TxCategory,
} from './types'

export interface LedgerEntry {
  key: string
  date: string
  kind: 'deposit' | 'payment' | 'transfer_in' | 'transfer_out' | 'tx_in' | 'tx_out'
  title: string
  /** فقط برای انتقال‌ها */
  transferId?: string
  /** واریز مثبت، پرداخت منفی */
  amount: number
}

export interface CardSummary {
  card: Card
  /** موجودی فعلی = اولیه + واریزها + انتقال‌های ورودی − پرداخت‌ها − انتقال‌های خروجی */
  balance: number
  deposits: number
  paid: number
  transfersIn: number
  transfersOut: number
  /** واریز / برداشت‌های روزانه */
  txIn: number
  txOut: number
  /** جدیدترین اول */
  entries: LedgerEntry[]
}

/**
 * موجودی هر کارت را حساب می‌کند.
 * - فقط تراکنش‌های بعد از تاریخ موجودی اولیه (start_date) و تا امروز حساب می‌شوند.
 * - واریز = نوبت‌های درآمدِ آن کارت (درآمد «تخمینی» حساب نمی‌شود).
 * - پرداخت = اقساطی که با همین کارت تیک خورده‌اند (تاریخ پرداخت = paid_on).
 */
export function summarizeCards(
  cards: Card[],
  incomes: IncomeOccurrence[],
  installments: InstallmentOccurrence[],
  payments: Payment[],
  today: string,
  transfers: Transfer[] = [],
  transactions: Transaction[] = [],
  categories: TxCategory[] = [],
): CardSummary[] {
  const catName = new Map(categories.map((c) => [c.id, c.name]))
  const nameOf = new Map(cards.map((c) => [c.id, c.name]))
  const byKey = new Map(installments.map((o) => [`${o.installmentId}|${o.date}`, o]))

  return cards.map((card) => {
    const entries: LedgerEntry[] = []

    for (const o of incomes) {
      if (o.cardId !== card.id || o.isExpected) continue
      if (o.date <= card.start_date || o.date > today) continue
      entries.push({ key: `d-${o.key}`, date: o.date, kind: 'deposit', title: o.title, amount: o.amount })
    }

    for (const p of payments) {
      if (p.card_id !== card.id || !p.paid_on) continue
      if (p.paid_on <= card.start_date || p.paid_on > today) continue
      const o = byKey.get(`${p.installment_id}|${p.due_date}`)
      if (!o) continue
      entries.push({ key: `p-${p.id}`, date: p.paid_on, kind: 'payment', title: o.title, amount: -o.amount })
    }

    for (const t of transfers) {
      if (t.date <= card.start_date || t.date > today) continue
      if (t.to_card_id === card.id) {
        entries.push({
          key: `ti-${t.id}`,
          date: t.date,
          kind: 'transfer_in',
          title: `انتقال از ${nameOf.get(t.from_card_id) ?? 'کارت حذف‌شده'}`,
          amount: t.amount,
          transferId: t.id,
        })
      } else if (t.from_card_id === card.id) {
        entries.push({
          key: `to-${t.id}`,
          date: t.date,
          kind: 'transfer_out',
          title: `انتقال به ${nameOf.get(t.to_card_id) ?? 'کارت حذف‌شده'}`,
          amount: -t.amount,
          transferId: t.id,
        })
      }
    }

    for (const t of transactions) {
      if (t.card_id !== card.id) continue
      if (t.date <= card.start_date || t.date > today) continue
      const name = catName.get(t.category_id) ?? 'بدون دسته'
      entries.push({
        key: `tx-${t.id}`,
        date: t.date,
        kind: t.kind === 'in' ? 'tx_in' : 'tx_out',
        title: t.note ? `${name} · ${t.note}` : name,
        amount: t.kind === 'in' ? t.amount : -t.amount,
      })
    }

    entries.sort((a, b) => b.date.localeCompare(a.date) || a.key.localeCompare(b.key))
    const sum = (kind: LedgerEntry['kind']) =>
      entries.filter((e) => e.kind === kind).reduce((s, e) => s + Math.abs(e.amount), 0)
    const deposits = sum('deposit')
    const paid = sum('payment')
    const transfersIn = sum('transfer_in')
    const transfersOut = sum('transfer_out')
    const txIn = sum('tx_in')
    const txOut = sum('tx_out')
    return {
      card,
      balance: card.initial_balance + deposits + transfersIn + txIn - paid - transfersOut - txOut,
      deposits,
      paid,
      transfersIn,
      transfersOut,
      txIn,
      txOut,
      entries,
    }
  })
}
