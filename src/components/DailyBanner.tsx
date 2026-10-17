import { Link } from 'react-router-dom'
import { useData } from '../lib/data'
import { toFaDigits } from '../lib/dates'
import { Button } from './ui'

export function DailyBanner() {
  const { categories, today, pendingDays, openTx, setCheckin, setPromptOpen } = useData()

  if (categories.length === 0) {
    return (
      <div className="anim-rise flex flex-wrap items-center gap-3 rounded-2xl bg-brand-soft px-4 py-3.5 text-sm text-brand">
        <span className="flex-1 leading-6">برای ثبت تراکنش‌های روزانه اول چند دسته تعریف کن.</span>
        <Link to="/categories">
          <Button className="h-9 px-4">تعریف دسته‌ها</Button>
        </Link>
      </div>
    )
  }
  if (pendingDays.length === 0) return null
  const todayPending = pendingDays.includes(today)
  const older = pendingDays.filter((d) => d !== today).length

  return (
    <div className="anim-rise rounded-2xl bg-brand-soft px-4 py-3.5 text-brand">
      <div className="text-sm font-bold leading-6">
        {todayPending ? 'امروز هنوز تراکنشی ثبت نکرده‌ای' : 'روزهایی هستند که تراکنشی برایشان ثبت نشده'}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {todayPending && (
          <>
            <Button className="h-9 px-4" onClick={() => openTx({ date: today })}>
              ثبت تراکنش
            </Button>
            <Button variant="ghost" className="h-9 px-4 text-brand" onClick={() => void setCheckin(today, true)}>
              تراکنشی نداشتم
            </Button>
          </>
        )}
        {older > 0 && (
          <Button variant="soft" className="h-9 px-4 bg-surface" onClick={() => setPromptOpen(true)}>
            {toFaDigits(older)} روز قبل هم مانده
          </Button>
        )}
      </div>
    </div>
  )
}
