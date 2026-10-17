import type { CategoryIcon, TxCategory, TxKind } from './types'

export const CATEGORY_ICON_OPTIONS: { value: CategoryIcon; label: string }[] = [
  { value: 'food', label: 'خوراک' },
  { value: 'transport', label: 'حمل‌ونقل' },
  { value: 'receipt', label: 'قبض' },
  { value: 'health', label: 'سلامت' },
  { value: 'shopping', label: 'خرید' },
  { value: 'work', label: 'کار' },
  { value: 'spark', label: 'تفریح' },
  { value: 'income', label: 'درآمد' },
  { value: 'tag', label: 'سایر' },
]

export function categoryIconFor(category: Pick<TxCategory, 'name' | 'kind' | 'icon'>): CategoryIcon {
  if (category.icon) return category.icon

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

export function defaultCategoryIcon(kind: TxKind): CategoryIcon {
  return kind === 'in' ? 'income' : 'tag'
}