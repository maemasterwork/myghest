import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TransferModal } from '../components/Forms'
import { Icon } from '../components/Icon'
import { Button, Card, EmptyState, ProgressBar } from '../components/ui'
import { AUTO_META, buildAutoEntries, categoryBreakdown, groupByDay, inRange, monthBounds, totals, type AutoEntry } from '../lib/daily'
import { formatJalali, isoToJalali, JALALI_MONTHS, toFaDigits } from '../lib/dates'
import { useData } from '../lib/data'
import { fmt, shortToman } from '../lib/format'
import type { Transaction } from '../lib/types'

export default function Daily() {
  const {
    loading, today, categories, transactions, cards, pendingDays, openTx, setPromptOpen, deleteTransaction,
    incomeOccurrences, installmentOccurrences, payments, transfers, saveTransfer, deleteTransfer,
  } = useData()
  const [transferOpen, setTransferOpen] = useState(false)
  const t = isoToJalali(today)
  const [ym, setYm] = useState({ jy: t.jy, jm: t.jm })

  const { start, end } = monthBounds(ym.jy, ym.jm)
  const monthTx = useMemo(() => inRange(transactions, start, end), [transactions, start, end])
  const autos = useMemo(
    () =>
      buildAutoEntries(incomeOccurrences, installmentOccurrences, payments, transfers, cards, today).filter(
        (a) => a.date >= start && a.date < end,
      ),
    [incomeOccurrences, installmentOccurrences, payments, transfers, cards, today, start, end],
  )
  const man = totals(monthTx)
  const autoIn = autos.filter((a) => a.kind === 'income').reduce((s, a) => s + a.amount, 0)
  const autoInst = autos.filter((a) => a.kind === 'installment').reduce((s, a) => s + a.amount, 0)
  const sum = { in: man.in + autoIn, out: man.out + autoInst, net: man.net + autoIn - autoInst }
  const days = useMemo(() => {
    const m = new Map<string, { date: string; items: Transaction[]; autos: AutoEntry[]; inTotal: number; outTotal: number }>()
    const get = (date: string) => {
      let d = m.get(date)
      if (!d) m.set(date, (d = { date, items: [], autos: [], inTotal: 0, outTotal: 0 }))
      return d
    }
    for (const g of groupByDay(monthTx)) {
      const d = get(g.date)
      d.items = g.items
      d.inTotal += g.inTotal
      d.outTotal += g.outTotal
    }
    for (const a of autos) {
      const d = get(a.date)
      d.autos.push(a)
      if (a.kind === 'income') d.inTotal += a.amount
      if (a.kind === 'installment') d.outTotal += a.amount
    }
    return [...m.values()].sort((a, b) => b.date.localeCompare(a.date))
  }, [monthTx, autos])
  const breakdown = useMemo(() => {
    const list = categoryBreakdown(monthTx, categories, 'out').map((b) => ({ ...b, total: b.total }))
    if (autoInst > 0) list.push({ categoryId: 'auto-inst', name: AUTO_META.installment.category, color: AUTO_META.installment.color, total: autoInst, share: 0, count: 0 })
    const all = list.reduce((s, b) => s + b.total, 0)
    return list.map((b) => ({ ...b, share: all ? b.total / all : 0 })).sort((a, b) => b.total - a.total)
  }, [monthTx, categories, autoInst])
  const catById = new Map(categories.map((c) => [c.id, c]))
  const cardById = new Map(cards.map((c) => [c.id, c]))

  const shift = (n: number) =>
    setYm(({ jy, jm }) => {
      const m = jm + n
      return m < 1 ? { jy: jy - 1, jm: 12 } : m > 12 ? { jy: jy + 1, jm: 1 } : { jy, jm: m }
    })

  if (loading) return <div className="py-24 text-center text-muted">در حال بارگذاری…</div>

  const autoRow = (a: AutoEntry) => {
    const meta = AUTO_META[a.kind]
    const sign = a.kind === 'income' ? '+' : a.kind === 'installment' ? '−' : ''
    return (
      <div key={a.key} className="flex items-center gap-3 px-4 py-3">
        <span className="size-3 shrink-0 rounded-full" style={{ background: meta.color }} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">
            {meta.category}
            <span className="ms-2 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">خودکار</span>
          </div>
          <div className="truncate text-xs text-muted">{[a.title, a.cardLabel].filter(Boolean).join(' · ')}</div>
        </div>
        <span
          className={`tnum font-bold ${a.kind === 'income' ? 'text-ok' : a.kind === 'installment' ? 'text-bad' : 'text-muted'}`}
        >
          {sign}
          {fmt(a.amount)}
        </span>
        {a.kind === 'transfer' && (
          <button
            aria-label="حذف انتقال"
            className="p-1.5 text-muted hover:text-bad"
            onClick={() => confirm('این انتقال حذف شود؟') && void deleteTransfer(a.key.slice(3))}
          >
            <Icon name="trash" size={17} />
          </button>
        )}
      </div>
    )
  }

  const row = (x: Transaction) => {
    const c = catById.get(x.category_id)
    return (
      <div key={x.id} className="flex items-center gap-3 px-4 py-3">
        <span className="size-3 shrink-0 rounded-full" style={{ background: c?.color ?? '#999' }} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{c?.name ?? 'دسته‌ی حذف‌شده'}</div>
          {(x.note || (x.card_id && cardById.get(x.card_id))) && (
            <div className="truncate text-xs text-muted">
              {[cardById.get(x.card_id ?? '')?.name, x.note].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <span className={`tnum font-bold ${x.kind === 'in' ? 'text-ok' : 'text-bad'}`}>
          {x.kind === 'in' ? '+' : '−'}
          {fmt(x.amount)}
        </span>
        <button aria-label="ویرایش تراکنش" className="p-1.5 text-muted hover:text-text" onClick={() => openTx({ initial: x })}>
          <Icon name="edit" size={17} />
        </button>
        <button
          aria-label="حذف تراکنش"
          className="p-1.5 text-muted hover:text-bad"
          onClick={() => confirm('این تراکنش حذف شود؟') && void deleteTransaction(x.id)}
        >
          <Icon name="trash" size={17} />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">تراکنش‌های روزانه</h1>
        <div className="flex gap-2">
          {cards.length >= 2 && (
            <Button variant="soft" className="h-10 px-4" onClick={() => setTransferOpen(true)}>
              <Icon name="swap" size={17} />
              انتقال
            </Button>
          )}
          <Link to="/categories">
            <Button variant="soft" className="h-10 px-4">
              دسته‌ها
            </Button>
          </Link>
          <Button className="h-10 px-4" onClick={() => openTx()}>
            <Icon name="plus" size={17} />
            تراکنش
          </Button>
        </div>
      </div>

      {categories.length === 0 && (
        <EmptyState title="اول دسته بساز" text="برای ثبت تراکنش باید دسته‌ها از قبل تعریف شده باشند.">
          <Link to="/categories">
            <Button>تعریف دسته‌ها</Button>
          </Link>
        </EmptyState>
      )}

      {pendingDays.length > 0 && categories.length > 0 && (
        <button
          onClick={() => setPromptOpen(true)}
          className="w-full rounded-2xl bg-brand-soft px-4 py-3 text-start text-sm font-semibold text-brand"
        >
          {toFaDigits(pendingDays.length)} روز بدون ثبت تراکنش داری — برای ثبت یا تأیید بزن
        </button>
      )}

      <div className="flex items-center justify-between rounded-2xl bg-surface-2 p-1.5">
        <button aria-label="ماه قبل" className="grid size-10 place-items-center rounded-xl hover:bg-surface" onClick={() => shift(-1)}>
          <Icon name="chev" size={18} className="-scale-x-100" />
        </button>
        <span className="font-bold">
          {JALALI_MONTHS[ym.jm - 1]} {toFaDigits(ym.jy)}
        </span>
        <button aria-label="ماه بعد" className="grid size-10 place-items-center rounded-xl hover:bg-surface" onClick={() => shift(1)}>
          <Icon name="chev" size={18} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Card className="p-3">
          <div className="text-xs text-muted">واریز</div>
          <div className="tnum mt-1 text-sm font-bold text-ok">{shortToman(sum.in)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted">برداشت</div>
          <div className="tnum mt-1 text-sm font-bold text-bad">{shortToman(sum.out)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted">خالص</div>
          <div className={`tnum mt-1 text-sm font-bold ${sum.net >= 0 ? 'text-ok' : 'text-bad'}`}>{shortToman(sum.net)}</div>
        </Card>
      </div>

      {breakdown.length > 0 && (
        <Card className="space-y-3 p-4">
          <h2 className="text-sm font-bold">برداشت به تفکیک دسته (با اقساط)</h2>
          {breakdown.map((b) => (
            <div key={b.categoryId}>
              <div className="mb-1 flex justify-between text-[13px]">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: b.color }} />
                  {b.name}
                </span>
                <span className="tnum text-muted">{shortToman(b.total)}</span>
              </div>
              <ProgressBar value={b.share} />
            </div>
          ))}
        </Card>
      )}

      {days.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">در این ماه تراکنشی ثبت نشده.</p>
      ) : (
        days.map((d) => (
          <section key={d.date}>
            <div className="mb-2 flex justify-between px-1 text-[13px] font-bold text-muted">
              <span>{formatJalali(d.date)}</span>
              <span className="tnum">
                {d.outTotal > 0 && <>−{fmt(d.outTotal)} </>}
                {d.inTotal > 0 && <>+{fmt(d.inTotal)}</>}
              </span>
            </div>
            <Card className="divide-y divide-line">{d.autos.map(autoRow)}{d.items.map(row)}</Card>
          </section>
        ))
      )}

      <p className="text-xs leading-6 text-muted">
        درآمدهای برنامه‌ریزی‌شده (حقوق و…) را در صفحه‌ی «درآمدها» ثبت کن تا در بازه‌ها حساب شوند؛ اینجا برای واریز و برداشت‌های روزمره است. درآمدهای دریافت‌شده، اقساط پرداخت‌شده و انتقال‌های بین کارت‌ها هم خودکار و با برچسب «خودکار» نمایش داده می‌شوند (انتقال‌ها در جمع‌ها حساب نمی‌شوند). با دکمه‌ی «انتقال» بالای صفحه می‌توانی از همین‌جا بین کارت‌ها انتقال ثبت کنی.
      </p>
      {transferOpen && <TransferModal onClose={() => setTransferOpen(false)} onSave={saveTransfer} />}
    </div>
  )
}
