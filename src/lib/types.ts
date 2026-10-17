export type Recurrence = 'none' | 'monthly'

export interface Income {
  id: string
  title: string
  amount: number
  /** ISO میلادی: YYYY-MM-DD */
  date: string
  is_expected: boolean
  recurrence: Recurrence
  /** null = بی‌پایان (فقط برای درآمد ماهانه) */
  repeat_count: number | null
  /** کارتی که درآمد به آن واریز می‌شود */
  card_id: string | null
}

export interface Installment {
  id: string
  title: string
  amount: number
  start_date: string
  recurrence: Recurrence
  /** تعداد کل اقساط (برای غیرتکرارشونده همیشه ۱) */
  repeat_count: number
}

export interface Payment {
  id: string
  installment_id: string
  due_date: string
  /** کارتی که قسط از آن پرداخت شده (یا null: بدون کارت) */
  card_id: string | null
  /** تاریخ واقعی پرداخت (ISO) */
  paid_on: string | null
}

export interface Card {
  id: string
  name: string
  bank: string | null
  color: string
  initial_balance: number
  /** موجودی اولیه مربوط به این تاریخ است؛ فقط تراکنش‌های بعد از آن حساب می‌شوند */
  start_date: string
}

export interface Transfer {
  id: string
  from_card_id: string
  to_card_id: string
  amount: number
  date: string
  note: string | null
}

export type TransferDraft = Omit<Transfer, 'id'> & { id?: string }

export type CardDraft = Omit<Card, 'id'> & { id?: string }

export type IncomeDraft = Omit<Income, 'id'> & { id?: string }
export type InstallmentDraft = Omit<Installment, 'id'> & { id?: string }

/** یک نوبت دریافت درآمد (پس از باز کردن تکرارها) */
export interface IncomeOccurrence {
  key: string
  incomeId: string
  title: string
  amount: number
  date: string
  isExpected: boolean
  cardId: string | null
  recurring: boolean
  index: number
}

/** یک سررسید قسط (پس از باز کردن تکرارها) */
export interface InstallmentOccurrence {
  key: string
  installmentId: string
  title: string
  amount: number
  date: string
  index: number
  total: number
  paid: boolean
}

export interface Settings {
  /** باقی‌مانده‌ی اولیه: پول کنار گذاشته‌شده پیش از اولین درآمد ثبت‌شده */
  opening_balance: number
}

/** in = واریز، out = برداشت */
export type TxKind = 'in' | 'out'

export interface TxCategory {
  id: string
  name: string
  kind: TxKind
  color: string
  archived: boolean
}

export type TxCategoryDraft = Omit<TxCategory, 'id' | 'archived'> & { id?: string; archived?: boolean }

export interface Transaction {
  id: string
  kind: TxKind
  category_id: string
  amount: number
  date: string
  card_id: string | null
  note: string | null
}

export type TransactionDraft = Omit<Transaction, 'id'> & { id?: string }
