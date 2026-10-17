import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../lib/data'
import { addJalaliMonths, formatJalali, todayIso } from '../lib/dates'
import { errorMessage, toman } from '../lib/format'
import type { Card, CardDraft, TransferDraft, Income, IncomeDraft, Installment, InstallmentDraft, Recurrence } from '../lib/types'
import { AmountInput, Button, Field, JalaliDateInput, Modal, Segmented, Select, Switch, TextInput } from './ui'

const REC_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'یک‌بار' },
  { value: 'monthly', label: 'هر ماه' },
]

const toDigits = (s: string) => s.replace(/\D/g, '')

/* ----------------------------- درآمد ----------------------------- */

export function IncomeModal({
  initial,
  onClose,
  onSave,
}: {
  initial: Income | null
  onClose: () => void
  onSave: (d: IncomeDraft) => Promise<void>
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [amount, setAmount] = useState(initial?.amount ?? 0)
  const [date, setDate] = useState(initial?.date ?? todayIso())
  const { cards } = useData()
  const [cardId, setCardId] = useState(initial?.card_id ?? '')
  const [expected, setExpected] = useState(initial?.is_expected ?? false)
  const [rec, setRec] = useState<Recurrence>(initial?.recurrence ?? 'none')
  const [count, setCount] = useState(initial?.repeat_count ? String(initial.repeat_count) : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!title.trim()) return setError('یک عنوان برای درآمد بنویس')
    if (amount <= 0) return setError('مبلغ را وارد کن')
    setBusy(true)
    setError(null)
    try {
      await onSave({
        id: initial?.id,
        title,
        amount,
        date,
        is_expected: expected,
        recurrence: rec,
        repeat_count: rec === 'monthly' && count ? Math.max(1, Number(count)) : null,
        card_id: cardId || null,
      })
      onClose()
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? 'ویرایش درآمد' : 'درآمد جدید'}
      footer={
        <>
          <Button className="flex-1" onClick={() => void submit()} disabled={busy}>
            {busy ? 'در حال ذخیره…' : 'ذخیره'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
        </>
      }
    >
      <Field label="عنوان">
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً حقوق، پروژه‌ی طراحی" />
      </Field>
      <Field label="مبلغ">
        <AmountInput value={amount} onChange={setAmount} />
      </Field>
      <Field label={rec === 'monthly' ? 'تاریخ اولین دریافت' : 'تاریخ دریافت'}>
        <JalaliDateInput value={date} onChange={setDate} />
      </Field>
      <Field label="تکرار">
        <Segmented value={rec} onChange={setRec} options={REC_OPTIONS} />
      </Field>
      {rec === 'monthly' && (
        <Field label="تعداد ماه‌ها" hint="خالی بگذار تا هر ماه بدون پایان تکرار شود (مثل حقوق ثابت).">
          <TextInput
            inputMode="numeric"
            value={count}
            onChange={(e) => setCount(toDigits(e.target.value).slice(0, 3))}
            placeholder="بدون پایان"
          />
        </Field>
      )}
      {cards.length > 0 ? (
        <Field label="واریز به کارت" hint="هر بار که این درآمد برسد، موجودی همین کارت زیاد می‌شود.">
          <Select value={cardId} onChange={setCardId}>
            <option value="">بدون کارت</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.bank ? ` · ${c.bank}` : ''}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <p className="rounded-2xl bg-surface-2 px-4 py-3 text-xs leading-6 text-muted">
          برای ثبت اینکه درآمد به کدام کارت واریز می‌شود، اول در صفحه‌ی{' '}
          <Link to="/cards" className="font-semibold text-brand" onClick={onClose}>
            کارت‌ها
          </Link>{' '}
          یک کارت بساز.
        </p>
      )}
      <Switch
        checked={expected}
        onChange={setExpected}
        label="درآمد تخمینی"
        hint="هنوز مطمئن نیستم؛ فقط برای پیش‌بینی. روی موجودی کارت اثر نمی‌گذارد تا تیک «تخمینی» را برداری."
      />
      {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
    </Modal>
  )
}

/* ------------------------------ قسط ------------------------------ */

export function InstallmentModal({
  initial,
  onClose,
  onSave,
}: {
  initial: Installment | null
  onClose: () => void
  onSave: (d: InstallmentDraft) => Promise<void>
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [amount, setAmount] = useState(initial?.amount ?? 0)
  const [date, setDate] = useState(initial?.start_date ?? todayIso())
  const [rec, setRec] = useState<Recurrence>(initial?.recurrence ?? 'monthly')
  const [count, setCount] = useState(String(initial?.repeat_count ?? 12))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const n = rec === 'monthly' ? Math.max(1, Number(count) || 1) : 1
  const lastDate = n > 1 ? addJalaliMonths(date, n - 1) : date

  async function submit() {
    if (!title.trim()) return setError('یک عنوان برای قسط بنویس')
    if (amount <= 0) return setError('مبلغ هر قسط را وارد کن')
    if (rec === 'monthly' && !(Number(count) >= 1)) return setError('تعداد اقساط را وارد کن')
    setBusy(true)
    setError(null)
    try {
      await onSave({
        id: initial?.id,
        title,
        amount,
        start_date: date,
        recurrence: rec,
        repeat_count: n,
      })
      onClose()
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? 'ویرایش قسط' : 'قسط جدید'}
      footer={
        <>
          <Button className="flex-1" onClick={() => void submit()} disabled={busy}>
            {busy ? 'در حال ذخیره…' : 'ذخیره'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
        </>
      }
    >
      <Field label="عنوان">
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً وام مسکن، قسط خودرو" />
      </Field>
      <Field label="مبلغ هر قسط">
        <AmountInput value={amount} onChange={setAmount} />
      </Field>
      <Field label={rec === 'monthly' ? 'سررسید اولین قسط' : 'تاریخ سررسید'}>
        <JalaliDateInput value={date} onChange={setDate} />
      </Field>
      <Field label="تکرار">
        <Segmented value={rec} onChange={setRec} options={REC_OPTIONS} />
      </Field>
      {rec === 'monthly' && (
        <Field
          label="تعداد کل اقساط"
          hint={
            amount > 0 && n > 1
              ? `جمع کل ${toman(amount * n)} · آخرین قسط ${formatJalali(lastDate)}`
              : 'هر ماه در همین روز سررسید می‌شود.'
          }
        >
          <TextInput
            inputMode="numeric"
            value={count}
            onChange={(e) => setCount(toDigits(e.target.value).slice(0, 3))}
            placeholder="مثلاً ۱۲"
          />
        </Field>
      )}
      {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
    </Modal>
  )
}

/* ------------------------ باقی‌مانده‌ی اولیه ------------------------ */

export function OpeningBalanceModal({
  initial,
  onClose,
  onSave,
}: {
  initial: number
  onClose: () => void
  onSave: (amount: number) => Promise<void>
}) {
  const [amount, setAmount] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await onSave(amount)
      onClose()
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="باقی‌مانده‌ی اولیه"
      footer={
        <>
          <Button className="flex-1" onClick={() => void submit()} disabled={busy}>
            {busy ? 'در حال ذخیره…' : 'ذخیره'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
        </>
      }
    >
      <p className="text-sm leading-7 text-muted">
        پولی که الان از درآمدهای قبلی برای اقساط کنار گذاشته‌ای و هنوز خرج نکرده‌ای. این مبلغ به اولین بازه اضافه
        می‌شود تا از مبلغ لازم کم شود. اگر چیزی نداری، صفر بگذار.
      </p>
      <Field label="مبلغ باقی‌مانده">
        <AmountInput value={amount} onChange={setAmount} />
      </Field>
      {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
    </Modal>
  )
}

/* ------------------------------ کارت ------------------------------ */

export const CARD_COLORS = ['#5b5bf0', '#0f9d74', '#e5484d', '#d97706', '#0ea5e9', '#9333ea', '#334155']

export function CardModal({
  initial,
  onClose,
  onSave,
}: {
  initial: Card | null
  onClose: () => void
  onSave: (d: CardDraft) => Promise<void>
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [bank, setBank] = useState(initial?.bank ?? '')
  const [color, setColor] = useState(initial?.color ?? CARD_COLORS[0])
  const [balance, setBalance] = useState(initial?.initial_balance ?? 0)
  const [date, setDate] = useState(initial?.start_date ?? todayIso())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!name.trim()) return setError('یک نام برای کارت بنویس')
    setBusy(true)
    setError(null)
    try {
      await onSave({ id: initial?.id, name, bank, color, initial_balance: balance, start_date: date })
      onClose()
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? 'ویرایش کارت' : 'کارت جدید'}
      footer={
        <>
          <Button className="flex-1" onClick={() => void submit()} disabled={busy}>
            {busy ? 'در حال ذخیره…' : 'ذخیره'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
        </>
      }
    >
      <Field label="نام کارت">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً کارت حقوق، پس‌انداز" />
      </Field>
      <Field label="بانک (اختیاری)">
        <TextInput value={bank} onChange={(e) => setBank(e.target.value)} placeholder="مثلاً ملی، ملت، سامان" />
      </Field>
      <Field label="رنگ">
        <div className="flex flex-wrap gap-2.5">
          {CARD_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={`size-9 rounded-full transition ${color === c ? 'ring-2 ring-text ring-offset-2 ring-offset-surface' : ''}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </Field>
      <Field label="موجودی اولیه">
        <AmountInput value={balance} onChange={setBalance} />
      </Field>
      <Field
        label="موجودی مربوط به تاریخ"
        hint="فقط واریزها و پرداخت‌های بعد از این تاریخ به موجودی اضافه یا کم می‌شوند."
      >
        <JalaliDateInput value={date} onChange={setDate} />
      </Field>
      {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
    </Modal>
  )
}

/* --------------------------- انتقال بین کارت‌ها --------------------------- */

export function TransferModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (d: TransferDraft) => Promise<void>
}) {
  const { cardSummaries } = useData()
  const [from, setFrom] = useState(cardSummaries[0]?.card.id ?? '')
  const [to, setTo] = useState(cardSummaries[1]?.card.id ?? '')
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState(todayIso())
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fromS = cardSummaries.find((s) => s.card.id === from)
  const short = fromS ? fromS.balance < amount : false

  async function submit() {
    if (!from || !to) return setError('هر دو کارت را انتخاب کن')
    if (from === to) return setError('مبدأ و مقصد باید دو کارت متفاوت باشند')
    if (amount <= 0) return setError('مبلغ انتقال را وارد کن')
    setBusy(true)
    setError(null)
    try {
      await onSave({ from_card_id: from, to_card_id: to, amount, date, note })
      onClose()
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="انتقال بین کارت‌ها"
      footer={
        <>
          <Button className="flex-1" onClick={() => void submit()} disabled={busy}>
            {busy ? 'در حال ثبت…' : 'ثبت انتقال'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
        </>
      }
    >
      <Field label="از کارت" hint={fromS ? `موجودی: ${toman(fromS.balance)}` : undefined}>
        <Select value={from} onChange={setFrom}>
          {cardSummaries.map((s) => (
            <option key={s.card.id} value={s.card.id}>
              {s.card.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="به کارت">
        <Select value={to} onChange={setTo}>
          {cardSummaries.map((s) => (
            <option key={s.card.id} value={s.card.id}>
              {s.card.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="مبلغ">
        <AmountInput value={amount} onChange={setAmount} />
      </Field>
      {short && (
        <p className="rounded-2xl bg-warn-soft px-4 py-3 text-xs leading-6 text-warn">
          موجودی کارت مبدأ از این مبلغ کمتر است؛ بعد از ثبت، موجودی آن منفی می‌شود.
        </p>
      )}
      <Field label="تاریخ انتقال" hint="اگر تاریخ آینده بگذاری، از همان روز روی موجودی‌ها اعمال می‌شود.">
        <JalaliDateInput value={date} onChange={setDate} />
      </Field>
      <Field label="یادداشت (اختیاری)">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً برای اقساط آبان" />
      </Field>
      {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
    </Modal>
  )
}
