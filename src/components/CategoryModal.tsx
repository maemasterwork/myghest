import { useState } from 'react'
import { Icon } from './Icon'
import { errorMessage } from '../lib/format'
import { CATEGORY_ICON_OPTIONS, categoryIconFor, defaultCategoryIcon } from '../lib/categoryIcons'
import type { CategoryIcon, TxCategory, TxCategoryDraft, TxKind } from '../lib/types'
import { CARD_COLORS } from './Forms'
import { Button, Field, Modal, Segmented, TextInput } from './ui'

export function CategoryModal({
  initial,
  defaultKind,
  onClose,
  onSave,
}: {
  initial: TxCategory | null
  defaultKind: TxKind
  onClose: () => void
  onSave: (d: TxCategoryDraft) => Promise<void>
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [kind, setKind] = useState<TxKind>(initial?.kind ?? defaultKind)
  const [color, setColor] = useState(initial?.color ?? CARD_COLORS[0])
  const [icon, setIcon] = useState<CategoryIcon>(
    initial ? categoryIconFor(initial) : defaultCategoryIcon(defaultKind),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!name.trim()) return setError('نام دسته را بنویس')
    setBusy(true)
    try {
      await onSave({ id: initial?.id, name: name.trim(), kind, color, icon, archived: initial?.archived })
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
      title={initial ? 'ویرایش دسته' : 'دسته‌ی جدید'}
      footer={
        <>
          <Button className="flex-1" disabled={busy} onClick={() => void submit()}>
            ذخیره
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
        </>
      }
    >
      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          { value: 'out', label: 'برداشت' },
          { value: 'in', label: 'واریز' },
        ]}
      />
      <Field label="نام دسته">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً خوراک، حمل‌ونقل" />
      </Field>
      <Field label="آیکن">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {CATEGORY_ICON_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-label={option.label}
              aria-pressed={icon === option.value}
              onClick={() => setIcon(option.value)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border text-xs font-semibold transition ${
                icon === option.value
                  ? 'border-brand bg-brand-soft text-brand'
                  : 'border-line bg-surface text-muted hover:bg-surface-2 hover:text-text'
              }`}
            >
              <Icon name={option.value} size={19} />
              {option.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="رنگ">
        <div className="flex flex-wrap gap-2.5">
          {CARD_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`انتخاب رنگ ${c}`}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={`size-9 rounded-full transition ${color === c ? 'ring-2 ring-text ring-offset-2 ring-offset-surface' : ''}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </Field>
      {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
    </Modal>
  )
}
