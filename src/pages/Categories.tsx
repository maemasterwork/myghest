import { useState } from 'react'
import { CategoryModal } from '../components/CategoryModal'
import { Icon, type IconName } from '../components/Icon'
import { Badge, Button, Card, EmptyState } from '../components/ui'
import { useData } from '../lib/data'
import { errorMessage } from '../lib/format'
import type { TxCategory, TxKind } from '../lib/types'

function categoryIcon(category: TxCategory): IconName {
  const name = category.name.toLocaleLowerCase('fa-IR')
  if (['خوراک', 'رستوران', 'غذا', 'کافه'].some((word) => name.includes(word))) return 'food'
  if (['حمل', 'رفت‌وآمد', 'رفت و آمد', 'تاکسی', 'سوخت', 'خودرو'].some((word) => name.includes(word))) {
    return 'transport'
  }
  if (['قبض', 'شارژ', 'آب', 'برق', 'گاز', 'اینترنت'].some((word) => name.includes(word))) return 'receipt'
  if (['سلامت', 'درمان', 'دارو', 'پزشک'].some((word) => name.includes(word))) return 'health'
  if (['خرید', 'پوشاک', 'فروشگاه'].some((word) => name.includes(word))) return 'shopping'
  if (['حقوق', 'دستمزد', 'پروژه'].some((word) => name.includes(word))) return 'work'
  if (['تفریح', 'سرگرمی', 'سفر'].some((word) => name.includes(word))) return 'spark'
  return category.kind === 'in' ? 'income' : 'tag'
}

export default function Categories() {
  const { categories, transactions, saveCategory, deleteCategory, seedCategories } = useData()
  const [editing, setEditing] = useState<{ cat: TxCategory | null; kind: TxKind } | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const used = (id: string) => transactions.filter((t) => t.category_id === id).length

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
    const list = categories.filter((c) => c.kind === kind)
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
          <p className="text-sm text-muted">دسته‌ای نیست.</p>
        ) : (
          <Card className="divide-y divide-line">
            {list.map((c) => (
              <div key={c.id} className={`flex items-center gap-3 px-4 py-3 ${c.archived ? 'opacity-60' : ''}`}>
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-xl"
                  style={{ color: c.color, backgroundColor: `${c.color}1a` }}
                >
                  <Icon name={categoryIcon(c)} size={18} />
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{c.name}</span>
                {c.archived && <Badge>بایگانی</Badge>}
                <span className="text-xs text-muted">{used(c.id).toLocaleString('fa-IR')} تراکنش</span>
                {c.archived ? (
                  <Button variant="ghost" className="h-9 px-3" onClick={() => void saveCategory({ ...c, archived: false })}>
                    بازیابی
                  </Button>
                ) : (
                  <>
                    <button aria-label="ویرایش دسته" className="p-2 text-muted hover:text-text" onClick={() => setEditing({ cat: c, kind })}>
                      <Icon name="edit" size={18} />
                    </button>
                    <button aria-label="حذف دسته" className="p-2 text-muted hover:text-bad" onClick={() => void remove(c)}>
                      <Icon name="trash" size={18} />
                    </button>
                  </>
                )}
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
      {categories.length === 0 && (
        <EmptyState title="دسته‌های تراکنش" text="دسته‌هایی مثل خوراک، حمل‌ونقل یا حقوق بساز تا هر تراکنش روزانه یک دسته داشته باشد.">
          <Button onClick={() => void seedCategories()}>ساخت دسته‌های پیشنهادی</Button>
        </EmptyState>
      )}
      {err && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{err}</p>}
      {section('out', 'دسته‌های برداشت')}
      {section('in', 'دسته‌های واریز')}
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
