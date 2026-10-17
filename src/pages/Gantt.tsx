import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, EmptyState, Segmented } from '../components/ui'
import type { WindowItem } from '../lib/allocation'
import {
  addJalaliMonths,
  diffDays,
  formatJalali,
  isoToJalali,
  jalaliToIso,
  JALALI_MONTHS,
  toFaDigits,
} from '../lib/dates'
import { useData } from '../lib/data'
import { compactToman, toman } from '../lib/format'

type Range = '3' | '6' | '12'
const PX_PER_DAY: Record<Range, number> = { '3': 9, '6': 5.2, '12': 2.8 }
const LABEL_W = 96

interface Selected {
  title: string
  lines: string[]
}

interface Cell {
  start: string
  days: number
  label: string
  year: string | null
}

export default function Gantt() {
  const { plan, installmentOccurrences, today, loading } = useData()
  const [range, setRange] = useState<Range>('6')
  const [selected, setSelected] = useState<Selected | null>(null)

  const hasData = plan.windows.length > 0 || installmentOccurrences.length > 0

  const view = useMemo(() => {
    const candidates = [today]
    if (plan.focus) candidates.push(plan.focus.start)
    for (const o of plan.overdue) candidates.push(o.date)
    const base = candidates.sort()[0]
    const { jy, jm } = isoToJalali(base)
    const start = jalaliToIso(jy, jm, 1)
    const n = Number(range)
    const end = addJalaliMonths(start, n, 1)
    const px = PX_PER_DAY[range]

    const cells: Cell[] = []
    for (let i = 0; i < n; i++) {
      const ms = addJalaliMonths(start, i, 1)
      const me = addJalaliMonths(start, i + 1, 1)
      const p = isoToJalali(ms)
      cells.push({
        start: ms,
        days: diffDays(ms, me),
        label: JALALI_MONTHS[p.jm - 1],
        year: i === 0 || p.jm === 1 ? toFaDigits(p.jy) : null,
      })
    }
    return { start, end, px, cells, width: diffDays(start, end) * px }
  }, [range, today, plan.focus, plan.overdue])

  const coverage = useMemo(() => {
    const m = new Map<string, WindowItem>()
    for (const w of plan.windows) for (const it of w.items) m.set(it.key, it)
    return m
  }, [plan.windows])

  const rows = useMemo(() => {
    const m = new Map<string, { id: string; title: string; items: typeof installmentOccurrences }>()
    for (const o of installmentOccurrences) {
      if (o.date < view.start || o.date >= view.end) continue
      const r = m.get(o.installmentId)
      if (r) r.items.push(o)
      else m.set(o.installmentId, { id: o.installmentId, title: o.title, items: [o] })
    }
    return [...m.values()].sort((a, b) => a.items[0].date.localeCompare(b.items[0].date))
  }, [installmentOccurrences, view.start, view.end])

  if (!loading && !hasData) {
    return (
      <EmptyState title="هنوز چیزی برای نمایش نیست" text="درآمد و قسط ثبت کن تا نمودار زمانی‌شان اینجا کشیده شود.">
        <Link to="/incomes">
          <Button>ثبت درآمد</Button>
        </Link>
        <Link to="/installments">
          <Button variant="soft">ثبت قسط</Button>
        </Link>
      </EmptyState>
    )
  }

  const { start, end, px, cells, width } = view
  const x = (iso: string) => diffDays(start, iso) * px
  const todayInRange = today >= start && today < end

  const Track = ({ height, children }: { height: number; children?: ReactNode }) => (
    <div className="relative shrink-0" style={{ width, height }}>
      {cells.map((c, i) => (
        <div
          key={c.start}
          className={`absolute inset-y-0 border-e border-line ${i % 2 === 0 ? 'bg-surface-2/50' : ''}`}
          style={{ right: x(c.start), width: c.days * px }}
        />
      ))}
      {children}
      {todayInRange && (
        <div
          className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-brand/70"
          style={{ right: x(today) }}
        />
      )}
    </div>
  )

  const Row = ({ label, height, children, sub }: { label: ReactNode; height: number; children?: ReactNode; sub?: string }) => (
    <div className="flex border-t border-line">
      <div
        className="sticky start-0 z-20 flex shrink-0 flex-col justify-center border-e border-line bg-surface px-3"
        style={{ width: LABEL_W, height }}
      >
        <span className="truncate text-xs font-bold">{label}</span>
        {sub && <span className="truncate text-[10px] text-muted">{sub}</span>}
      </div>
      <Track height={height}>{children}</Track>
    </div>
  )

  const pill = (it: (typeof installmentOccurrences)[number]) => {
    const cov = coverage.get(it.key)
    const overdue = !it.paid && it.date < today
    const tone = it.paid
      ? 'bg-ok text-white dark:text-[#0e1020]'
      : overdue || cov?.coverage === 'uncovered'
        ? 'bg-bad text-white dark:text-[#0e1020]'
        : cov?.coverage === 'partial'
          ? 'bg-warn text-white dark:text-[#0e1020]'
          : 'bg-brand text-white dark:text-[#0e1020]'
    const status = it.paid
      ? 'پرداخت شده'
      : overdue
        ? 'عقب‌افتاده'
        : cov?.coverage === 'uncovered'
          ? 'پوشش داده نمی‌شود'
          : cov?.coverage === 'partial'
            ? 'پوشش ناقص'
            : 'پوشش داده می‌شود'
    return { tone, status }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">نمودار زمانی</h1>
          <p className="mt-1 text-sm text-muted">درآمدها، بازه‌ها و سررسید اقساط، روی یک محور زمان.</p>
        </div>
        <div className="w-56">
          <Segmented
            value={range}
            onChange={setRange}
            options={[
              { value: '3', label: '۳ ماه' },
              { value: '6', label: '۶ ماه' },
              { value: '12', label: '۱۲ ماه' },
            ]}
          />
        </div>
      </div>

      <Card className="anim-rise overflow-hidden">
        <div className="overflow-x-auto overscroll-x-contain">
          <div className="w-max">
            {/* سربرگ ماه‌ها */}
            <div className="flex">
              <div
                className="sticky start-0 z-20 shrink-0 border-e border-line bg-surface"
                style={{ width: LABEL_W, height: 44 }}
              />
              <div className="relative shrink-0" style={{ width, height: 44 }}>
                {cells.map((c, i) => (
                  <div
                    key={c.start}
                    className={`absolute inset-y-0 flex flex-col items-center justify-center border-e border-line ${i % 2 === 0 ? 'bg-surface-2/50' : ''}`}
                    style={{ right: x(c.start), width: c.days * px }}
                  >
                    <span className="text-xs font-bold">{c.label}</span>
                    {c.year && <span className="text-[10px] text-muted">{c.year}</span>}
                  </div>
                ))}
                {todayInRange && (
                  <>
                    <div className="absolute inset-y-0 z-10 w-0.5 bg-brand/70" style={{ right: x(today) }} />
                    <span
                      className="absolute top-0.5 z-10 translate-x-1/2 rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-bold text-white dark:text-[#0e1020]"
                      style={{ right: x(today) }}
                    >
                      امروز
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* درآمدها */}
            <Row label="درآمد" sub="تاریخ دریافت" height={62}>
              {plan.windows
                .filter((w) => w.start >= start && w.start < end)
                .map((w) => (
                  <button
                    key={w.start}
                    type="button"
                    onClick={() =>
                      setSelected({
                        title: w.incomes.map((o) => o.title).join(' + '),
                        lines: [
                          `دریافت در ${formatJalali(w.start)}`,
                          `مبلغ: ${toman(w.incomeTotal)}`,
                          ...(w.isExpected ? ['درآمد پیش‌بینی‌شده'] : []),
                        ],
                      })
                    }
                    className="absolute top-2 z-20 flex flex-col items-center gap-1"
                    style={{ right: x(w.start), transform: 'translateX(50%)' }}
                    title={`${w.incomes.map((o) => o.title).join(' + ')} · ${toman(w.incomeTotal)}`}
                  >
                    <span
                      className={`size-4 rotate-45 rounded-[4px] ${w.isExpected ? 'border-2 border-ok bg-surface' : 'bg-ok'}`}
                    />
                    <span className="tnum text-[10px] font-bold text-ok">{compactToman(w.incomeTotal)}</span>
                  </button>
                ))}
            </Row>

            {/* بازه‌ها */}
            <Row label="بازه‌ها" sub="مازاد / کسری" height={56}>
              {plan.windows
                .filter((w) => w.end > start && w.start < end)
                .map((w) => {
                  const from = w.start < start ? start : w.start
                  const to = w.end > end ? end : w.end
                  const bad = w.balance < 0
                  return (
                    <button
                      key={w.start}
                      type="button"
                      onClick={() =>
                        setSelected({
                          title: `بازه‌ی ${formatJalali(w.start, { year: false })} تا ${formatJalali(w.end, { year: false })}`,
                          lines: [
                            `درآمد: ${toman(w.incomeTotal)}`,
                            ...(w.carryIn !== 0
                              ? [`${w.carryIn > 0 ? 'باقی‌مانده' : 'کسری'} از قبل: ${toman(Math.abs(w.carryIn))}`]
                              : []),
                            `اقساط: ${toman(w.total)}`,
                            bad ? `کسری: ${toman(-w.balance)}` : `مازاد: ${toman(w.balance)}`,
                          ],
                        })
                      }
                      className={`absolute top-2.5 z-20 flex h-9 items-center justify-center overflow-hidden rounded-xl border px-2 text-[11px] font-bold ${
                        bad ? 'border-bad/50 bg-bad-soft text-bad' : 'border-ok/40 bg-ok-soft text-ok'
                      } ${w.state === 'past' ? 'opacity-60' : ''}`}
                      style={{ right: x(from) + 1, width: Math.max(0, (diffDays(from, to)) * px - 2) }}
                      title={bad ? `کسری ${toman(-w.balance)}` : `مازاد ${toman(w.balance)}`}
                    >
                      <span className="tnum whitespace-nowrap">
                        {bad ? '−' : '+'}
                        {compactToman(Math.abs(w.balance))}
                      </span>
                    </button>
                  )
                })}
            </Row>

            {/* اقساط */}
            {rows.map((r) => (
              <Row key={r.id} label={r.title} height={58}>
                {r.items.map((it) => {
                  const { tone, status } = pill(it)
                  return (
                    <button
                      key={it.key}
                      type="button"
                      onClick={() =>
                        setSelected({
                          title: it.title,
                          lines: [
                            `سررسید: ${formatJalali(it.date)}`,
                            `مبلغ: ${toman(it.amount)}`,
                            ...(it.total > 1 ? [`قسط ${toFaDigits(it.index + 1)} از ${toFaDigits(it.total)}`] : []),
                            `وضعیت: ${status}`,
                          ],
                        })
                      }
                      className="absolute top-2.5 z-20 flex flex-col items-center gap-1"
                      style={{ right: x(it.date), transform: 'translateX(50%)' }}
                      title={`${it.title} · ${toman(it.amount)} · ${status}`}
                    >
                      <span className={`grid size-5 place-items-center rounded-full text-[11px] font-bold ${tone}`}>
                        {it.paid ? '✓' : ''}
                      </span>
                      <span className={`tnum text-[10px] font-semibold ${it.paid ? 'text-muted' : ''}`}>
                        {compactToman(it.amount)}
                      </span>
                    </button>
                  )
                })}
              </Row>
            ))}
            {rows.length === 0 && (
              <div className="border-t border-line px-4 py-6 text-center text-sm text-muted">
                در این بازه‌ی زمانی قسطی سررسید نمی‌شود.
              </div>
            )}
          </div>
        </div>
      </Card>

      {selected && (
        <Card className="anim-rise p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-bold">{selected.title}</div>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {selected.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
            <button className="text-xs text-muted hover:text-text" onClick={() => setSelected(null)}>
              بستن
            </button>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-2 px-1 text-xs text-muted">
        <span className="flex items-center gap-1.5"><i className="size-3 rotate-45 rounded-[3px] bg-ok" />درآمد</span>
        <span className="flex items-center gap-1.5"><i className="size-3 rounded-full bg-brand" />قسط (پوشش داده می‌شود)</span>
        <span className="flex items-center gap-1.5"><i className="size-3 rounded-full bg-warn" />پوشش ناقص</span>
        <span className="flex items-center gap-1.5"><i className="size-3 rounded-full bg-bad" />کسری / عقب‌افتاده</span>
        <span className="flex items-center gap-1.5"><i className="size-3 rounded-full bg-ok" />پرداخت شده</span>
        <span>م = میلیون تومان · ه = هزار تومان</span>
      </div>
    </div>
  )
}
