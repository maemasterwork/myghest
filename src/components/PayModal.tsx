import { useState } from 'react'
import { formatJalali, todayIso } from '../lib/dates'
import { useData } from '../lib/data'
import { toman } from '../lib/format'
import type { InstallmentOccurrence } from '../lib/types'
import { Button, Field, JalaliDateInput, Modal } from './ui'

function PayForm({ o }: { o: InstallmentOccurrence }) {
  const { cardSummaries, cancelPay, confirmPay, today } = useData()

  // پیش‌فرض: اولین کارتی که موجودی‌اش برای این قسط کافی است
  const [cardId, setCardId] = useState<string>(
    () => (cardSummaries.find((s) => s.balance >= o.amount) ?? cardSummaries[0])?.card.id ?? '',
  )
  const [paidOn, setPaidOn] = useState(todayIso())
  const selected = cardSummaries.find((s) => s.card.id === cardId)
  const future = paidOn > today
  const beforeStart = selected ? paidOn <= selected.card.start_date : false
  const short = selected ? selected.balance < o.amount : false

  return (
    <Modal
      open
      onClose={cancelPay}
      title="پرداخت قسط"
      footer={
        <>
          <Button
            className="flex-1"
            disabled={future}
            onClick={() => void confirmPay({ cardId: cardId || null, paidOn })}
          >
            ثبت پرداخت
          </Button>
          <Button variant="ghost" onClick={cancelPay}>
            انصراف
          </Button>
        </>
      }
    >
      <div className="rounded-2xl bg-surface-2 px-4 py-3">
        <div className="font-bold">{o.title}</div>
        <div className="mt-1 flex items-center justify-between text-sm text-muted">
          <span>سررسید {formatJalali(o.date)}</span>
          <span className="tnum font-bold text-text">{toman(o.amount)}</span>
        </div>
      </div>

      <Field label="از کدام کارت پرداخت شد؟">
        <div className="space-y-2" role="radiogroup">
          {cardSummaries.map(({ card, balance }) => (
            <button
              key={card.id}
              type="button"
              role="radio"
              aria-checked={cardId === card.id}
              onClick={() => setCardId(card.id)}
              className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-start transition ${
                cardId === card.id ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:bg-surface-2'
              }`}
            >
              <span className="size-4 shrink-0 rounded-full" style={{ background: card.color }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{card.name}</span>
                {card.bank && <span className="block truncate text-xs text-muted">{card.bank}</span>}
              </span>
              <span className={`tnum text-sm font-bold ${balance < o.amount ? 'text-bad' : ''}`}>{toman(balance)}</span>
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={cardId === ''}
            onClick={() => setCardId('')}
            className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-start text-sm font-semibold transition ${
              cardId === '' ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:bg-surface-2'
            }`}
          >
            <span className="size-4 shrink-0 rounded-full border-2 border-dashed border-muted" />
            بدون کارت (نقدی / پرداخت قبلی)
          </button>
        </div>
      </Field>

      {short && (
        <p className="rounded-2xl bg-warn-soft px-4 py-3 text-xs leading-6 text-warn">
          موجودی این کارت ({toman(selected?.balance ?? 0)}) از مبلغ قسط کمتر است؛ بعد از ثبت، موجودی منفی می‌شود.
        </p>
      )}

      <Field label="تاریخ پرداخت" error={future ? 'تاریخ پرداخت نمی‌تواند در آینده باشد' : null}>
        <JalaliDateInput value={paidOn} onChange={setPaidOn} />
      </Field>

      {beforeStart && selected && (
        <p className="rounded-2xl bg-surface-2 px-4 py-3 text-xs leading-6 text-muted">
          این تاریخ قبل از (یا برابر با) تاریخ موجودی اولیه‌ی کارت است؛ پس روی موجودی کارت اثر نمی‌گذارد.
        </p>
      )}
    </Modal>
  )
}

export function PayModal() {
  const { pendingPay } = useData()
  return pendingPay ? <PayForm key={pendingPay.key} o={pendingPay} /> : null
}
