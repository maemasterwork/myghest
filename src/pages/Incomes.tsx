import { useState } from 'react'
import { IncomeModal, OpeningBalanceModal } from '../components/Forms'
import { Icon } from '../components/Icon'
import { Badge, Button, Card, EmptyState, IconButton } from '../components/ui'
import { formatJalali, toFaDigits } from '../lib/dates'
import { useData } from '../lib/data'
import { shortToman, toman } from '../lib/format'
import type { Income } from '../lib/types'

export default function Incomes() {
  const { incomes, saveIncome, deleteIncome, settings, saveSettings, cards, loading } = useData()
  const [editing, setEditing] = useState<Income | null | 'new'>(null)
  const [editingOpening, setEditingOpening] = useState(false)

  const sorted = [...incomes].sort((a, b) => b.date.localeCompare(a.date))

  async function remove(i: Income) {
    if (window.confirm(`درآمد «${i.title}» حذف شود؟`)) await deleteIncome(i.id)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">درآمدها</h1>
        <Button onClick={() => setEditing('new')}>
          <Icon name="plus" size={18} />
          درآمد جدید
        </Button>
      </div>

      <Card className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="font-bold">باقی‌مانده‌ی اولیه</div>
          <p className="mt-1 text-xs leading-6 text-muted">
            پولی که قبل از اولین درآمد ثبت‌شده برای اقساط کنار داری؛ به اولین بازه اضافه می‌شود.
          </p>
        </div>
        <div className="tnum font-bold">{toman(settings.opening_balance)}</div>
        <IconButton label="ویرایش باقی‌مانده‌ی اولیه" onClick={() => setEditingOpening(true)}>
          <Icon name="edit" size={18} />
        </IconButton>
      </Card>

      {!loading && sorted.length === 0 ? (
        <EmptyState
          title="درآمدی ثبت نشده"
          text="حقوق ثابت را یک‌بار با «هر ماه» ثبت کن؛ درآمدهای پروژه‌ای و نامنظم را هم تک‌به‌تک اضافه کن."
        >
          <Button onClick={() => setEditing('new')}>ثبت اولین درآمد</Button>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {sorted.map((i) => (
            <Card key={i.id} className="anim-rise flex items-center gap-3 p-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-ok-soft text-ok">
                <Icon name="income" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{i.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  <span>{formatJalali(i.date)}</span>
                  {i.recurrence === 'monthly' && (
                    <Badge tone="brand">
                      <Icon name="repeat" size={12} />
                      هر ماه{i.repeat_count ? ` · ${toFaDigits(i.repeat_count)} ماه` : ''}
                    </Badge>
                  )}
                  {i.is_expected && <Badge tone="warn">تخمینی</Badge>}
                  {i.card_id && cards.find((c) => c.id === i.card_id) && (
                    <Badge tone="neutral">
                      <Icon name="card" size={12} />
                      {cards.find((c) => c.id === i.card_id)?.name}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-end">
                <div className="tnum font-bold">{toman(i.amount)}</div>
                <div className="text-[11px] text-muted">{shortToman(i.amount)}</div>
              </div>
              <div className="flex">
                <IconButton label="ویرایش" onClick={() => setEditing(i)}>
                  <Icon name="edit" size={18} />
                </IconButton>
                <IconButton label="حذف" onClick={() => void remove(i)} className="hover:text-bad">
                  <Icon name="trash" size={18} />
                </IconButton>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editingOpening && (
        <OpeningBalanceModal
          initial={settings.opening_balance}
          onClose={() => setEditingOpening(false)}
          onSave={(n) => saveSettings({ opening_balance: n })}
        />
      )}

      {editing && (
        <IncomeModal
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={saveIncome}
        />
      )}
    </div>
  )
}
