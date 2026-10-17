import { useState } from 'react'
import { CardModal, TransferModal } from '../components/Forms'
import { Icon } from '../components/Icon'
import { Badge, Button, Card, EmptyState } from '../components/ui'
import type { CardSummary } from '../lib/cards'
import { formatJalali } from '../lib/dates'
import { useData } from '../lib/data'
import { shortToman, toman } from '../lib/format'
import type { Card as CardT } from '../lib/types'

function BankCard({
  s,
  open,
  onToggle,
  onEdit,
  onDelete,
  onDeleteTransfer,
}: {
  s: CardSummary
  open: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onDeleteTransfer: (id: string) => void
}) {
  const { card, balance } = s
  return (
    <div className="anim-rise">
      <div
        className="relative overflow-hidden rounded-2xl p-4 text-white shadow-card"
        style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}b3)` }}
      >
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-lg font-extrabold">{card.name}</div>
            {card.bank && <div className="mt-0.5 truncate text-sm text-white/80">{card.bank}</div>}
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              aria-label="ویرایش کارت"
              onClick={onEdit}
              className="grid size-9 place-items-center rounded-xl bg-white/15 transition hover:bg-white/25"
            >
              <Icon name="edit" size={17} />
            </button>
            <button
              aria-label="حذف کارت"
              onClick={onDelete}
              className="grid size-9 place-items-center rounded-xl bg-white/15 transition hover:bg-white/25"
            >
              <Icon name="trash" size={17} />
            </button>
          </div>
        </div>

        <div className="relative mt-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="text-xs text-white/75">موجودی فعلی</div>
          <div className="tnum flex items-baseline gap-2">
            <span className="text-2xl font-extrabold">{balance < 0 ? '−' : ''}{toman(Math.abs(balance)).replace(' تومان', '')}</span>
            <span className="text-xs text-white/80">تومان</span>
          </div>
        </div>

        <div className="relative mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/20 pt-3 text-xs">
          <div className="min-w-0">
            <div className="text-[11px] text-white/70">موجودی اولیه</div>
            <div className="tnum mt-0.5 font-bold">{shortToman(card.initial_balance)}</div>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-white/70">واریز درآمد</div>
            <div className="tnum mt-0.5 font-bold">+{shortToman(s.deposits)}</div>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-white/70">پرداخت قسط</div>
            <div className="tnum mt-0.5 font-bold">−{shortToman(s.paid)}</div>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-white/70">تراکنش روزانه (خالص)</div>
            <div className="tnum mt-0.5 font-bold">
              {s.txIn - s.txOut >= 0 ? '+' : '−'}
              {shortToman(Math.abs(s.txIn - s.txOut))}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-white/70">انتقال (خالص)</div>
            <div className="tnum mt-0.5 font-bold">
              {s.transfersIn - s.transfersOut >= 0 ? '+' : '−'}
              {shortToman(Math.abs(s.transfersIn - s.transfersOut))}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onToggle}
        aria-expanded={open}
        className="mt-2 flex w-full items-center justify-between rounded-2xl px-3 py-2 text-xs font-semibold text-muted hover:text-text"
      >
        <span>
          تراکنش‌ها ({new Intl.NumberFormat('fa-IR').format(s.entries.length)}) · موجودی از {formatJalali(card.start_date)}
        </span>
        <Icon name="chev" size={16} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <Card className="mt-1 divide-y divide-line px-4">
          {s.entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">هنوز تراکنشی بعد از تاریخ موجودی اولیه نیست.</p>
          ) : (
            s.entries.map((e) => (
              <div key={e.key} className="flex items-center gap-3 py-3">
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                    e.amount > 0 ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad'
                  }`}
                >
                  {e.kind.startsWith('transfer') ? '⇄' : e.amount > 0 ? '+' : '−'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{e.title}</div>
                  <div className="text-xs text-muted">
                    {{ deposit: 'واریز درآمد', payment: 'پرداخت قسط', transfer_in: 'انتقال ورودی', transfer_out: 'انتقال خروجی', tx_in: 'واریز روزانه', tx_out: 'برداشت روزانه' }[e.kind]}{' '}
                    · {formatJalali(e.date)}
                  </div>
                </div>
                <div className={`tnum text-sm font-bold ${e.amount > 0 ? 'text-ok' : ''}`}>
                  {e.amount > 0 ? '+' : '−'}
                  {toman(Math.abs(e.amount))}
                </div>
                {e.transferId && (
                  <button
                    aria-label="حذف انتقال"
                    title="حذف انتقال"
                    onClick={() => onDeleteTransfer(e.transferId!)}
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-bad-soft hover:text-bad"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                )}
              </div>
            ))
          )}
        </Card>
      )}
    </div>
  )
}

export default function Cards() {
  const { cardSummaries, saveCard, deleteCard, saveTransfer, deleteTransfer, plan, loading } = useData()
  const [editing, setEditing] = useState<CardT | null | 'new'>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [transferring, setTransferring] = useState(false)

  const total = cardSummaries.reduce((s, c) => s + c.balance, 0)
  const need = plan.focus?.unpaid ?? 0
  const enough = total >= need

  async function remove(c: CardT) {
    if (window.confirm(`کارت «${c.name}» حذف شود؟ واریزها و پرداخت‌های ثبت‌شده‌اش بدون کارت می‌شوند و انتقال‌های مربوط به آن پاک می‌شوند.`)) {
      await deleteCard(c.id)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">کارت‌ها</h1>
        <div className="flex gap-2">
          {cardSummaries.length >= 2 && (
            <Button variant="soft" onClick={() => setTransferring(true)}>
              ⇄ انتقال
            </Button>
          )}
          <Button onClick={() => setEditing('new')}>
            <Icon name="plus" size={18} />
            کارت جدید
          </Button>
        </div>
      </div>

      {!loading && cardSummaries.length === 0 ? (
        <EmptyState
          title="کارتی ثبت نشده"
          text="کارت‌هایت را با موجودی اولیه ثبت کن؛ بعد می‌توانی بگویی هر درآمد به کدام کارت واریز می‌شود و هر قسط از کدام کارت پرداخت شده است."
        >
          <Button onClick={() => setEditing('new')}>ثبت اولین کارت</Button>
        </EmptyState>
      ) : (
        <>
          <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-muted">موجودی همه‌ی کارت‌ها</div>
                <div className="tnum mt-1 text-2xl font-extrabold">{toman(total)}</div>
              </div>
              {plan.focus && (
                <Badge tone={enough ? 'ok' : 'bad'}>{enough ? 'برای اقساط کافی است' : 'کمبود موجودی'}</Badge>
              )}
            </div>
            {plan.focus && (
              <p className="mt-3 text-sm leading-7 text-muted">
                اقساط پرداخت‌نشده تا درآمد بعدی: <b className="tnum text-text">{toman(need)}</b>
                {enough ? (
                  <>
                    {' '}
                    ← بعد از پرداخت همه‌شان <b className="tnum text-ok">{toman(total - need)}</b> می‌ماند.
                  </>
                ) : (
                  <>
                    {' '}
                    ← <b className="tnum text-bad">{toman(need - total)}</b> کم داری.
                  </>
                )}
              </p>
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            {cardSummaries.map((s) => (
              <BankCard
                key={s.card.id}
                s={s}
                open={open === s.card.id}
                onToggle={() => setOpen(open === s.card.id ? null : s.card.id)}
                onEdit={() => setEditing(s.card)}
                onDelete={() => void remove(s.card)}
                onDeleteTransfer={(id) => {
                  if (window.confirm('این انتقال حذف شود؟ موجودی هر دو کارت برمی‌گردد.')) void deleteTransfer(id)
                }}
              />
            ))}
          </div>
        </>
      )}

      {transferring && <TransferModal onClose={() => setTransferring(false)} onSave={saveTransfer} />}

      {editing && (
        <CardModal
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={saveCard}
        />
      )}
    </div>
  )
}
