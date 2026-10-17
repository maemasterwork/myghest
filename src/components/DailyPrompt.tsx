import { useEffect } from 'react'
import { useData } from '../lib/data'
import { formatJalali, relativeDays } from '../lib/dates'
import { Button, Modal } from './ui'

const FLAG = 'qestyar-daily-prompt'

/** هر روز یک‌بار (در هر نشست) اگر امروز هنوز بسته نشده باشد، خودکار باز می‌شود */
export function DailyPrompt() {
  const { loading, today, categories, pendingDays, promptOpen, setPromptOpen, openTx, setCheckin } = useData()

  useEffect(() => {
    if (loading || categories.length === 0 || !pendingDays.includes(today)) return
    try {
      if (sessionStorage.getItem(FLAG) === today) return
      sessionStorage.setItem(FLAG, today)
    } catch {
      /* ignore */
    }
    setPromptOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, today, categories.length, pendingDays.length])

  if (!promptOpen) return null
  const close = () => setPromptOpen(false)

  return (
    <Modal open onClose={close} title="تراکنش‌های روزانه">
      {pendingDays.length === 0 ? (
        <div className="py-6 text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-ok-soft text-2xl text-ok">✓</div>
          <p className="font-bold">همه‌ی روزها ثبت شده‌اند</p>
          <Button className="mt-5" onClick={close}>
            بستن
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm leading-7 text-muted">
            برای این روزها هنوز تراکنشی ثبت نکرده‌ای. واریز یا برداشتی داشتی ثبتش کن، وگرنه «تراکنشی نداشتم» را بزن.
          </p>
          <ul className="space-y-3">
            {pendingDays.map((d) => (
              <li key={d} className="rounded-2xl border border-line p-3.5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-bold">{formatJalali(d)}</span>
                  <span className="text-xs text-muted">{relativeDays(d, today)}</span>
                </div>
                <div className="flex gap-2">
                  <Button className="h-10 flex-1" onClick={() => openTx({ date: d })}>
                    ثبت تراکنش
                  </Button>
                  <Button variant="soft" className="h-10" onClick={() => void setCheckin(d, true)}>
                    تراکنشی نداشتم
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  )
}
