import { useMemo, useState } from 'react'
import { InstallmentModal } from '../components/Forms'
import { Icon } from '../components/Icon'
import { InstallmentRow } from '../components/InstallmentRow'
import { Badge, Button, Card, EmptyState, ProgressBar } from '../components/ui'
import { formatJalali, toFaDigits } from '../lib/dates'
import { useData } from '../lib/data'
import { shortToman, toman } from '../lib/format'
import type { Installment } from '../lib/types'

export default function Installments() {
  const { installments, installmentOccurrences, today, saveInstallment, deleteInstallment, togglePaid, loading } =
    useData()
  const [editing, setEditing] = useState<Installment | null | 'new'>(null)
  const [open, setOpen] = useState<string | null>(null)

  const byInstallment = useMemo(() => {
    const m = new Map<string, typeof installmentOccurrences>()
    for (const o of installmentOccurrences) {
      const arr = m.get(o.installmentId)
      if (arr) arr.push(o)
      else m.set(o.installmentId, [o])
    }
    return m
  }, [installmentOccurrences])

  const remaining = installmentOccurrences.filter((o) => !o.paid).reduce((s, o) => s + o.amount, 0)

  async function remove(i: Installment) {
    if (window.confirm(`قسط «${i.title}» با همه‌ی سررسیدهایش حذف شود؟`)) await deleteInstallment(i.id)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">اقساط</h1>
        <Button onClick={() => setEditing('new')}>
          <Icon name="plus" size={18} />
          قسط جدید
        </Button>
      </div>

      {installments.length > 0 && (
        <Card className="flex items-center justify-between px-5 py-4">
          <span className="text-sm text-muted">مجموع باقی‌مانده‌ی همه‌ی اقساط</span>
          <span className="tnum text-lg font-extrabold">{shortToman(remaining)}</span>
        </Card>
      )}

      {!loading && installments.length === 0 ? (
        <EmptyState
          title="قسطی ثبت نشده"
          text="یک قسط ماهانه را فقط یک‌بار تعریف کن (مبلغ، اولین سررسید، تعداد)؛ بقیه‌ی ماه‌ها خودکار ساخته می‌شود."
        >
          <Button onClick={() => setEditing('new')}>ثبت اولین قسط</Button>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {installments.map((ins) => {
            const occ = byInstallment.get(ins.id) ?? []
            const paidCount = occ.filter((o) => o.paid).length
            const nextDue = occ.find((o) => !o.paid)
            const isOpen = open === ins.id
            const done = occ.length > 0 && paidCount === occ.length
            return (
              <Card key={ins.id} className="anim-rise overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <button
                    className="flex min-w-0 flex-1 items-center gap-3 text-start"
                    onClick={() => setOpen(isOpen ? null : ins.id)}
                    aria-expanded={isOpen}
                  >
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
                      <Icon name="list" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-bold">{ins.title}</span>
                        {done && <Badge tone="ok">تسویه شد</Badge>}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {nextDue ? `سررسید بعدی: ${formatJalali(nextDue.date)}` : 'همه پرداخت شده'}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="tnum font-bold">{toman(ins.amount)}</div>
                      <div className="text-[11px] text-muted">
                        {toFaDigits(paidCount)} از {toFaDigits(occ.length)} قسط
                      </div>
                    </div>
                    <Icon
                      name="chev"
                      size={18}
                      className={`shrink-0 text-muted transition ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>
                <div className="px-4 pb-4">
                  <ProgressBar value={occ.length ? paidCount / occ.length : 0} tone={done ? 'ok' : 'brand'} />
                </div>

                {isOpen && (
                  <div className="border-t border-line bg-surface-2/40 px-4">
                    <div className="divide-y divide-line">
                      {occ.map((o) => (
                        <InstallmentRow
                          key={o.key}
                          item={o}
                          today={today}
                          onToggle={(paid) => void togglePaid(o, paid)}
                        />
                      ))}
                    </div>
                    <div className="flex justify-end gap-1 border-t border-line py-2">
                      <Button variant="ghost" className="h-10" onClick={() => setEditing(ins)}>
                        <Icon name="edit" size={16} />
                        ویرایش
                      </Button>
                      <Button variant="danger" className="h-10" onClick={() => void remove(ins)}>
                        <Icon name="trash" size={16} />
                        حذف
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {editing && (
        <InstallmentModal
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={saveInstallment}
        />
      )}
    </div>
  )
}
