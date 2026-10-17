import { useState } from 'react'
import { CategoryModal } from '../components/CategoryModal'
import { Icon } from '../components/Icon'
import { Badge, Button, Card, EmptyState } from '../components/ui'
import { categoryIconFor } from '../lib/categoryIcons'
import { useData } from '../lib/data'
import { errorMessage } from '../lib/format'
import type { TxCategory, TxKind } from '../lib/types'

export default function Categories() {
  const { categories, transactions, saveCategory, deleteCategory, seedCategories } = useData()
  const [editing, setEditing] = useState<{ cat: TxCategory | null; kind: TxKind } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)

  const used = (id: string) => transactions.filter((t) => t.category_id === id).length
  const activeCategories = categories.filter((c) => !c.archived)
  const archivedCategories = categories.filter((c) => c.archived)
  const count = (value: number) => value.toLocaleString('fa-IR')

  async function addSuggestedCategories() {
    setErr(null)
    setSeeding(true)
    try {
      await seedCategories()
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setSeeding(false)
    }
  }

  async function remove(c: TxCategory) {
    const n = used(c.id)
    setErr(null)
    try {
      if (n === 0) {
        if (confirm(`دسته‌ی «${c.name}» حذف شود؟`)) await deleteCategory(c.id)
      } else if (confirm(`«${c.name}» در ${n.toLocaleString('fa-IR')} تراکنش استفاده شده؛ بایگانی شود؟ (تراکنش‌ها می‌مانند)`)) {
        await saveCategory({ ...c, archived: true })
      }
    } catch (e) {
      setErr(errorMessage(e))
    }
  }

  const section = (kind: TxKind, title: string) => {
    const list = activeCategories.filter((c) => c.kind === kind)
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">{title}</h2>
          <Button variant="soft" className="h-9 px-4" onClick={() => setEditing({ cat: null, kind })}>
            <Icon name="plus" size={16} />
            دسته‌ی جدید
          </Button>
        </div>
        {list.length === 0 ? (
          <p className="text-sm text-muted">دسته‌ی فعالی نیست.</p>
        ) : (
          <Card className="divide-y divide-line">
            {list.map((c) => (
              <div key={c.id} className="group flex min-w-0 items-center gap-3 px-3 py-3 sm:px-4">
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-xl"
                  style={{ color: c.color, backgroundColor: `${c.color}1a` }}
                >
                  <Icon name={categoryIconFor(c)} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.name}</p>
                  <p className="mt-0.5 text-xs text-muted">{count(used(c.id))} تراکنش</p>
                </div>
                <button
                  type="button"
                  aria-label={`ویرایش دسته‌ی ${c.name}`}
                  title={`ویرایش دسته‌ی ${c.name}`}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-text md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                  onClick={() => setEditing({ cat: c, kind })}
                >
                  <Icon name="edit" size={18} />
                </button>
                <button
                  type="button"
                  aria-label={`حذف دسته‌ی ${c.name}`}
                  title={`حذف دسته‌ی ${c.name}`}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-bad-soft hover:text-bad md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                  onClick={() => void remove(c)}
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>
            ))}
          </Card>
        )}
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">دسته‌ها</h1>
      {err && (
        <p role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">
          خطا: {err}
        </p>
      )}
      {categories.length === 0 && (
        <EmptyState title="دسته‌های تراکنش" text="دسته‌هایی مثل خوراک، حمل‌ونقل یا حقوق بساز تا هر تراکنش روزانه یک دسته داشته باشد.">
          <Button disabled={seeding} onClick={() => void addSuggestedCategories()}>
            {seeding ? 'در حال ساخت دسته‌ها…' : 'ساخت دسته‌های پیشنهادی'}
          </Button>
        </EmptyState>
      )}
      {categories.length > 0 && (
        <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">دسته‌های برداشت فعال</span>
            <span className="font-bold tnum">{count(activeCategories.filter((c) => c.kind === 'out').length)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">دسته‌های واریز فعال</span>
            <span className="font-bold tnum">{count(activeCategories.filter((c) => c.kind === 'in').length)}</span>
          </div>
          {archivedCategories.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted">بایگانی‌شده</span>
              <span className="font-bold text-muted tnum">{count(archivedCategories.length)}</span>
            </div>
          )}
        </Card>
      )}
      {section('out', 'دسته‌های برداشت')}
      {section('in', 'دسته‌های واریز')}
      {archivedCategories.length > 0 && (
        <details className="group/archive">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-card [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2 font-bold">
              <Icon name="tag" size={18} />
              دسته‌های بایگانی‌شده
              <Badge>{count(archivedCategories.length)}</Badge>
            </span>
            <Icon name="chev" size={18} className="shrink-0 text-muted transition group-open/archive:rotate-180" />
          </summary>
          <div className="mt-3 space-y-3">
            <Card className="divide-y divide-line">
              {archivedCategories.map((c) => (
                <div key={c.id} className="flex min-w-0 items-center gap-3 px-3 py-3 sm:px-4">
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-xl opacity-70"
                    style={{ color: c.color, backgroundColor: `${c.color}1a` }}
                  >
                    <Icon name={categoryIconFor(c)} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-muted">{c.name}</p>
                    <p className="mt-0.5 text-xs text-muted">{count(used(c.id))} تراکنش</p>
                  </div>
                  <Button
                    variant="ghost"
                    className="h-11 shrink-0 px-3 text-brand"
                    onClick={() => void saveCategory({ ...c, archived: false })}
                  >
                    بازیابی
                  </Button>
                </div>
              ))}
            </Card>
          </div>
        </details>
      )}
      {editing && (
        <CategoryModal
          initial={editing.cat}
          defaultKind={editing.kind}
          onClose={() => setEditing(null)}
          onSave={saveCategory}
        />
      )}
    </div>
  )
}
