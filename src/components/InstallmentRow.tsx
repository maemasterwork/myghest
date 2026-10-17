import type { Coverage } from '../lib/allocation'
import { formatJalali, relativeDays } from '../lib/dates'
import { toman } from '../lib/format'
import type { InstallmentOccurrence } from '../lib/types'
import { Icon } from './Icon'
import { Badge } from './ui'

export function InstallmentRow({
  item,
  today,
  coverage,
  coveredAmount,
  onToggle,
}: {
  item: InstallmentOccurrence
  today: string
  coverage?: Coverage
  coveredAmount?: number
  onToggle: (paid: boolean) => void
}) {
  const overdue = !item.paid && item.date < today
  return (
    <div className="flex items-center gap-3 py-3">
      <button
        type="button"
        role="checkbox"
        aria-checked={item.paid}
        aria-label={item.paid ? 'علامت پرداخت‌شده را بردار' : 'پرداخت شد'}
        onClick={() => onToggle(!item.paid)}
        className={`grid size-7 shrink-0 place-items-center rounded-full border-2 transition ${
          item.paid ? 'border-ok bg-ok text-white dark:text-[#0e1020]' : 'border-line text-transparent hover:border-brand'
        }`}
      >
        <Icon name="check" size={15} />
      </button>

      <div className="min-w-0 flex-1">
        <div className={`truncate text-[15px] font-semibold ${item.paid ? 'text-muted line-through' : ''}`}>
          {item.title}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span>{formatJalali(item.date)}</span>
          {item.total > 1 && (
            <span>
              · قسط {new Intl.NumberFormat('fa-IR').format(item.index + 1)} از{' '}
              {new Intl.NumberFormat('fa-IR').format(item.total)}
            </span>
          )}
          {!item.paid && (
            <span className={overdue ? 'font-semibold text-bad' : ''}>· {relativeDays(item.date, today)}</span>
          )}
        </div>
      </div>

      <div className="shrink-0 text-end">
        <div className={`tnum text-[15px] font-bold ${item.paid ? 'text-muted' : ''}`}>{toman(item.amount)}</div>
        {!item.paid && coverage === 'uncovered' && <Badge tone="bad">پوشش داده نمی‌شود</Badge>}
        {!item.paid && coverage === 'partial' && (
          <Badge tone="warn">{toman(item.amount - (coveredAmount ?? 0))} کسری</Badge>
        )}
        {overdue && coverage === undefined && <Badge tone="bad">عقب‌افتاده</Badge>}
      </div>
    </div>
  )
}
