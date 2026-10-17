import { Link } from 'react-router-dom'
import { DailyBanner } from '../components/DailyBanner'
import { Icon } from '../components/Icon'
import { InstallmentRow } from '../components/InstallmentRow'
import { Badge, Button, Card, EmptyState, ProgressBar } from '../components/ui'
import type { Window } from '../lib/allocation'
import { diffDays, formatJalali, relativeDays, toFaDigits } from '../lib/dates'
import { useData } from '../lib/data'
import { fmt, shortToman, toman } from '../lib/format'
import { demoMode } from '../lib/supabase'

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'bad' }) {
  return (
    <div className="rounded-2xl bg-white/12 px-3 py-3 backdrop-blur-sm">
      <div className="text-[11px] text-white/70">{label}</div>
      <div
        className={`tnum mt-1 text-[15px] font-bold ${tone === 'bad' ? 'text-[#ffd0d3]' : tone === 'ok' ? 'text-[#b9f5de]' : ''}`}
      >
        {value}
      </div>
    </div>
  )
}

function Hero({ w, today }: { w: Window; today: string }) {
  const days = diffDays(today, w.end)
  const paidRatio = w.total > 0 ? w.paid / w.total : 1
  const future = w.state === 'future'

  return (
    <section className="anim-rise relative overflow-hidden rounded-[var(--radius-card)] bg-primary p-6 text-white shadow-card sm:p-8">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-white/80">
          <span>{future ? 'اولین بازه' : 'از درآمد'} {formatJalali(w.start)}</span>
          <span aria-hidden="true">←</span>
          <span>
            {w.endIsEstimated ? 'حدود ' : ''}
            {formatJalali(w.end)}
          </span>
          {w.isExpected && <Badge tone="warn">پیش‌بینی</Badge>}
        </div>

        <p className="mt-5 text-sm text-white/80">
          {future ? 'برای این بازه باید کنار بگذاری' : 'تا درآمد بعدی باید کنار بگذاری'}
        </p>
        {w.setAside > 0 ? (
          <div className="tnum mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tracking-tight sm:text-5xl">{fmt(w.setAside)}</span>
            <span className="text-base text-white/80">تومان</span>
          </div>
        ) : (
          <div className="mt-1 text-3xl font-extrabold sm:text-4xl">چیزی لازم نیست ✓</div>
        )}
        <p className="mt-1.5 text-sm text-white/75">
          {w.endIsEstimated
            ? 'درآمد بعدی هنوز ثبت نشده؛ پایان بازه را یک ماه بعد فرض کردم.'
            : days > 0
              ? `${toFaDigits(days)} روز تا درآمد بعدی`
              : 'درآمد بعدی امروز است'}
        </p>

        {w.total > 0 && (
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs text-white/75">
              <span>پرداخت‌شده: {shortToman(w.paid)}</span>
              <span>از {shortToman(w.total)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${paidRatio * 100}%` }}
              />
            </div>
          </div>
        )}

        {w.carryIn !== 0 && (
          <p className="mt-3 rounded-2xl bg-white/12 px-3.5 py-2.5 text-[13px] leading-6 text-white/90">
            {w.carryIn > 0
              ? `از بازه‌ی قبل ${toman(w.carryIn)} باقی مانده و از مبلغ لازم کم شده است.`
              : `از بازه‌ی قبل ${toman(-w.carryIn)} کسری آمده و به مبلغ لازم اضافه شده است.`}
          </p>
        )}

        <div className={`mt-5 grid gap-2.5 ${w.carryIn !== 0 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          <Stat label="درآمد این بازه" value={shortToman(w.incomeTotal)} />
          {w.carryIn !== 0 && (
            <Stat
              label={w.carryIn > 0 ? 'باقی‌مانده از قبل' : 'کسری از قبل'}
              value={shortToman(Math.abs(w.carryIn))}
              tone={w.carryIn > 0 ? 'ok' : 'bad'}
            />
          )}
          <Stat label="مجموع اقساط" value={shortToman(w.total)} />
          <Stat
            label={w.balance >= 0 ? 'مازاد (به بازه‌ی بعد می‌رود)' : 'کسری'}
            value={shortToman(Math.abs(w.balance))}
            tone={w.balance >= 0 ? 'ok' : 'bad'}
          />
        </div>
      </div>
    </section>
  )
}

export default function Dashboard() {
  const { loading, plan, today, incomes, installments, togglePaid, seedDemo, cardSummaries } = useData()

  if (loading) {
    return <div className="py-24 text-center text-muted">در حال بارگذاری…</div>
  }

  if (incomes.length === 0 && installments.length === 0) {
    return (
      <EmptyState
        title="از اینجا شروع کن"
        text="یک درآمد (با تاریخ دریافت) و چند قسط (با تاریخ سررسید) ثبت کن. IGhest به‌صورت خودکار می‌گوید از هر درآمد چقدر باید تا درآمد بعدی کنار بگذاری."
      >
        <Link to="/incomes">
          <Button>
            <Icon name="plus" size={18} />
            ثبت درآمد
          </Button>
        </Link>
        <Link to="/installments">
          <Button variant="soft">ثبت قسط</Button>
        </Link>
        {demoMode && (
          <Button variant="ghost" onClick={() => void seedDemo()}>
            بارگذاری داده‌ی نمونه
          </Button>
        )}
      </EmptyState>
    )
  }

  const w = plan.focus
  const next = plan.next

  return (
    <div className="space-y-5">
      <DailyBanner />
      {plan.overdue.length > 0 && (
        <div className="anim-rise flex items-start gap-3 rounded-2xl bg-bad-soft px-4 py-3.5 text-bad">
          <Icon name="alert" className="mt-0.5 shrink-0" />
          <div className="text-sm leading-6">
            <b>
              {toFaDigits(plan.overdue.length)} قسط عقب‌افتاده
            </b>{' '}
            به مجموع {toman(plan.overdueTotal)} داری. اگر پرداخت کرده‌ای تیکش را بزن.
          </div>
        </div>
      )}

      {!w ? (
        <EmptyState
          title="هنوز درآمدی ثبت نشده"
          text="اقساطت ثبت شده‌اند، اما بدون تاریخ درآمد نمی‌توانم بازه‌ها را حساب کنم. اولین درآمدت را ثبت کن."
        >
          <Link to="/incomes">
            <Button>
              <Icon name="plus" size={18} />
              ثبت درآمد
            </Button>
          </Link>
        </EmptyState>
      ) : (
        <>
          <Hero w={w} today={today} />

          {w.shortfall > 0 && (
            <div className="anim-rise flex items-start gap-3 rounded-2xl bg-warn-soft px-4 py-3.5 text-warn">
              <Icon name="alert" className="mt-0.5 shrink-0" />
              <div className="text-sm leading-6">
                <b>کسری {toman(w.shortfall)}</b> در این بازه: درآمد برای همه‌ی اقساط کافی نیست. اقساط
                علامت‌خورده را از جای دیگر تأمین کن یا درآمد تکمیلی ثبت کن.
              </div>
            </div>
          )}

          {cardSummaries.length > 0 && (
            <Link to="/cards" className="block">
              <Card className="anim-rise flex items-center gap-4 p-5 transition hover:brightness-[0.99]">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
                  <Icon name="card" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-muted">موجودی کارت‌ها</div>
                  <div className="tnum text-lg font-extrabold">
                    {toman(cardSummaries.reduce((s, c) => s + c.balance, 0))}
                  </div>
                </div>
                {(() => {
                  const total = cardSummaries.reduce((s, c) => s + c.balance, 0)
                  return total >= w.unpaid ? (
                    <Badge tone="ok">برای اقساط کافی است</Badge>
                  ) : (
                    <Badge tone="bad">{shortToman(w.unpaid - total)} کم داری</Badge>
                  )
                })()}
              </Card>
            </Link>
          )}

          <Card className="anim-rise p-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-base font-bold">اقساط این بازه</h2>
              <span className="text-xs text-muted">{toFaDigits(w.items.length)} قسط</span>
            </div>
            {w.items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">در این بازه قسطی سررسید نمی‌شود. 🎉</p>
            ) : (
              <div className="divide-y divide-line">
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
            )}
          </Card>

          {next && (
            <Card className="anim-rise p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold">بازه‌ی بعد</h2>
                  <p className="mt-1 text-sm text-muted">
                    از {formatJalali(next.start)} ({relativeDays(next.start, today)}) ·{' '}
                    {next.isExpected && 'درآمد تخمینی · '}
                    {toFaDigits(next.items.length)} قسط
                  </p>
                </div>
                <Link to="/timeline" className="text-sm font-semibold text-brand">
                  همه‌ی بازه‌ها
                </Link>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-sm text-muted">باید کنار بگذاری</span>
                <span className="tnum text-xl font-extrabold">{toman(next.setAside)}</span>
              </div>
              <div className="mt-3">
                <ProgressBar
                  value={next.available > 0 ? next.total / next.available : 1}
                  tone={next.shortfall > 0 ? 'bad' : 'brand'}
                />
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-muted">
                <span>
                  درآمد: {shortToman(next.incomeTotal)}
                  {next.carryIn !== 0 && ` ${next.carryIn > 0 ? '+' : '−'} ${shortToman(Math.abs(next.carryIn))} از قبل`}
                </span>
                {next.shortfall > 0 ? (
                  <span className="font-semibold text-bad">کسری {shortToman(next.shortfall)}</span>
                ) : (
                  <span className="text-ok">مازاد {shortToman(next.balance)}</span>
                )}
              </div>
            </Card>
          )}

          {plan.beforeFirst.length > 0 && (
            <p className="px-2 text-center text-xs leading-6 text-muted">
              {toFaDigits(plan.beforeFirst.length)} قسط قبل از اولین درآمد ثبت‌شده سررسید می‌شود و در هیچ بازه‌ای
              حساب نشده است.
            </p>
          )}
        </>
      )}
    </div>
  )
}
