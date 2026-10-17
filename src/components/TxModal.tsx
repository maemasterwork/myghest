import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../lib/data'
import { errorMessage } from '../lib/format'
import { CARD_COLORS } from './Forms'
import type { TxCategory, TxKind } from '../lib/types'
import { AmountInput, Button, Field, JalaliDateInput, Modal, Segmented, Select, TextInput } from './ui'

const LAST_CARD = 'qestyar-last-card'
const readLastCard = () => {
  try {
    return localStorage.getItem(LAST_CARD) ?? ''
  } catch {
    return ''
  }
}

function TxForm() {
  const { txEditor, closeTx, categories, cards, saveTransaction, seedCategories, today } = useData()
  const init = txEditor!.initial
  const [kind, setKind] = useState<TxKind>(init?.kind ?? txEditor!.kind ?? 'out')
  const [categoryId, setCategoryId] = useState(init?.category_id ?? '')
  const [amount, setAmount] = useState(init?.amount ?? 0)
  const [date, setDate] = useState(init?.date ?? txEditor!.date ?? today)
  const [cardId, setCardId] = useState(
    init ? (init.card_id ?? '') : cards.some((c) => c.id === readLastCard()) ? readLastCard() : '',
  )
  const [note, setNote] = useState(init?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<{ category?: string; amount?: string; date?: string; form?: string }>({})
  const [savedCount, setSavedCount] = useState(0)

  const cats: TxCategory[] = categories.filter(
    (c) => c.kind === kind && (!c.archived || c.id === init?.category_id),
  )
  const noCats = categories.filter((c) => !c.archived).length === 0

  function validate() {
    const e: typeof errors = {}
    if (!categoryId || !cats.some((c) => c.id === categoryId)) e.category = 'دسته را انتخاب کن'
    if (!(amount > 0)) e.amount = 'مبلغ را وارد کن'
    if (!date) e.date = 'تاریخ را انتخاب کن'
    else if (date > today) e.date = 'تاریخ نمی‌تواند در آینده باشد'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submit(again: boolean) {
    if (!validate()) return
    setBusy(true)
    try {
      await saveTransaction({
        id: init?.id,
        kind,
        category_id: categoryId,
        amount,
        date,
        card_id: cardId || null,
        note: note.trim() || null,
      })
      try {
        if (cardId) localStorage.setItem(LAST_CARD, cardId)
      } catch {
        /* ignore */
      }
      if (again) {
        setAmount(0)
        setNote('')
        setCategoryId('')
        setSavedCount((n) => n + 1)
        setBusy(false)
        setResetKey((k) => k + 1)
      } else closeTx()
    } catch (e) {
      setErrors({ form: errorMessage(e) })
      setBusy(false)
    }
  }
  const [resetKey, setResetKey] = useState(0)

  return (
    <Modal
      open
      onClose={closeTx}
      title={init ? 'ویرایش تراکنش' : 'تراکنش جدید'}
      footer={
        <>
          <Button className="flex-1" disabled={busy} onClick={() => void submit(false)}>
            {busy ? 'در حال ذخیره…' : 'ثبت'}
          </Button>
          {!init && (
            <Button variant="soft" disabled={busy} onClick={() => void submit(true)}>
              ثبت و بعدی
            </Button>
          )}
        </>
      }
    >
      {savedCount > 0 && (
        <p className="rounded-2xl bg-ok-soft px-4 py-2.5 text-sm text-ok">
          ✓ ثبت شد ({savedCount.toLocaleString('fa-IR')}). تراکنش بعدی را وارد کن.
        </p>
      )}
      <Segmented
        value={kind}
        onChange={(k) => {
          setKind(k)
          setCategoryId('')
        }}
        options={[
          { value: 'out', label: 'برداشت' },
          { value: 'in', label: 'واریز' },
        ]}
      />

      <Field label="دسته *" error={errors.category}>
        {noCats ? (
          <div className="rounded-2xl bg-warn-soft px-4 py-3 text-sm leading-7 text-warn">
            هنوز دسته‌ای تعریف نکرده‌ای.{' '}
            <button type="button" className="font-bold underline" onClick={() => void seedCategories()}>
              ساخت دسته‌های پیشنهادی
            </button>{' '}
            یا از{' '}
            <Link to="/categories" onClick={closeTx} className="font-bold underline">
              صفحه‌ی دسته‌ها
            </Link>{' '}
            خودت بساز.
          </div>
        ) : cats.length === 0 ? (
          <p className="text-sm text-muted">
            برای این نوع دسته‌ای نداری.{' '}
            <Link to="/categories" onClick={closeTx} className="font-bold text-brand">
              دسته بساز
            </Link>
          </p>
        ) : (
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {cats.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={categoryId === c.id}
                onClick={() => setCategoryId(c.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                  categoryId === c.id ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface hover:bg-surface-2'
                }`}
              >
                <span className="size-2.5 rounded-full" style={{ background: c.color || CARD_COLORS[0] }} />
                {c.name}
              </button>
            ))}
          </div>
        )}
      </Field>

      <Field label="مبلغ (تومان) *" error={errors.amount}>
        <AmountInput key={resetKey} value={amount} onChange={setAmount} />
      </Field>

      <Field label="تاریخ *" error={errors.date}>
        <JalaliDateInput value={date} onChange={setDate} />
      </Field>

      {cards.length > 0 && (
        <Field label="کارت (اختیاری)" hint="اگر کارت را انتخاب کنی، روی موجودی همان کارت اثر می‌گذارد.">
          <Select value={cardId} onChange={setCardId}>
            <option value="">بدون کارت</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="توضیح (اختیاری)">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً ناهار با دوستان" />
      </Field>
      {errors.form && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{errors.form}</p>}
    </Modal>
  )
}

export function TxHost() {
  const { txEditor } = useData()
  if (!txEditor) return null
  return <TxForm key={`${txEditor.initial?.id ?? 'new'}|${txEditor.date ?? ''}|${txEditor.kind ?? ''}`} />
}
