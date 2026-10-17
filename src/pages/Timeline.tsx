import { useState } from 'react'
import { Link } from 'react-router-dom'
import { InstallmentRow } from '../components/InstallmentRow'
import { Badge, Button, Card, EmptyState, ProgressBar } from '../components/ui'
import { diffDays, formatJalali, toFaDigits } from '../lib/dates'
import { useData } from '../lib/data'
import { shortToman, toman } from '../lib/format'

export default function Timeline() {
  const { plan, today, togglePaid, loading } = useData()
  const [shown, setShown] = useState(4)

  if (!loading && plan.windows.length === 0) {
    return (
      <EmptyState
        title="بازه‌ای وجود ندارد"
        text="هر درآمد یک بازه می‌سازد: از تاریخ آن درآمد تا درآمد بعدی. اول یک درآمد ثبت کن."
      >
        <Link to="/incomes">
          <Button>ثبت درآمد</Button>
        </Link>
      </EmptyState>
    )
  }

  const upcoming = plan.windows.filter((w) => w.state !== 'past')
  const past = plan.windows.filter((w) => w.state === 'past').reverse()

  const renderWindow = (w: (typeof plan.windows)[number], dim = false) => {
    const days = diffDays(w.start, w.end)
    const ratio = w.available > 0 ? w.total / w.available : 1
    return (
      <Card
        key={w.start}
        className={`anim-rise p-5 ${w.state === 'current' ? 'ring-2 ring-brand/40' : ''} ${dim ? 'opacity-75' : ''}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold">
                {formatJalali(w.start, { year: false })} ← {w.endIsEstimated ? 'حدود ' : ''}
                {formatJalali(w.end, { year: false })}
              </h2>
              {w.state === 'current' && <Badge tone="brand">بازه‌ی جاری</Badge>}
              {w.isExpected && <Badge tone="warn">پیش‌بینی</Badge>}
            </div>
            <p className="mt-1 text-xs text-muted">
              {toFaDigits(days)} روز · {w.incomes.map((o) => o.title).join(' + ')}
            </p>
          </div>
          <div className="text-end">
            <div className="text-[11px] text-muted">درآمد</div>
            <div className="tnum font-bold">{shortToman(w.incomeTotal)}</div>
            {w.carryIn !== 0 && (
              <div className={`mt-0.5 text-[11px] font-semibold ${w.carryIn > 0 ? 'text-ok' : 'text-bad'}`}>
                {w.carryIn > 0 ? '+' : '−'} {shortToman(Math.abs(w.carryIn))} از قبل
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <ProgressBar value={ratio} tone={w.shortfall > 0 ? 'bad' : 'brand'} />
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-muted">اقساط: {shortToman(w.total)}</span>
            {w.shortfall > 0 ? (
              <span className="font-semibold text-bad">کسری {toman(w.shortfall)}</span>
            ) : (
              <span className="font-semibold text-ok">مازاد {toman(w.balance)} ← بازه‌ی بعد</span>
            )}
          </div>
        </div>

        {w.items.length > 0 ? (
          <div className="mt-3 divide-y divide-line border-t border-line">
            {w.items.map((it) => (
              <InstallmentRow
                key={it.key}
                item={it}
                today={today}
                coverage={it.coverage}
                coveredAmount={it.coveredAmount}
                onToggle={(paid) => void togglePaid(it, paid)}
              />
            ))}
          </div>
        ) : (
          <p className="mt-3 border-t border-line pt-4 text-center text-sm text-muted">قسطی در این بازه نیست.</p>
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">بازه‌ها</h1>
        <p className="mt-1 text-sm leading-7 text-muted">
          هر درآمد تا درآمد بعدی یک بازه است؛ اقساطِ سررسیدشده در آن بازه از همان درآمد پوشش داده می‌شود.
        </p>
      </div>

      {upcoming.slice(0, shown).map((w) => renderWindow(w))}
      {upcoming.length > shown && (
        <Button variant="soft" className="w-full" onClick={() => setShown((n) => n + 4)}>
          نمایش بازه‌های بیشتر ({toFaDigits(upcoming.length - shown)})
        </Button>
      )}

      {past.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none rounded-2xl px-2 py-3 text-sm font-semibold text-muted hover:text-text">
            بازه‌های گذشته ({toFaDigits(past.length)}) ▾
          </summary>
          <div className="mt-2 space-y-5">{past.map((w) => renderWindow(w, true))}</div>
        </details>
      )}
    </div>
  )
}
