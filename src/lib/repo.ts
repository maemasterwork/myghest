import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Card,
  CardDraft,
  Income,
  IncomeDraft,
  Installment,
  InstallmentDraft,
  Payment,
  Settings,
  Transaction,
  TransactionDraft,
  Transfer,
  TransferDraft,
  TxCategory,
  TxCategoryDraft,
} from './types'

export interface Db {
  incomes: Income[]
  installments: Installment[]
  payments: Payment[]
  cards: Card[]
  transfers: Transfer[]
  categories: TxCategory[]
  transactions: Transaction[]
  /** روزهایی که «تراکنشی نداشتم» ثبت شده */
  checkins: string[]
  settings: Settings
}

export interface PayOptions {
  cardId: string | null
  /** تاریخ پرداخت (ISO) */
  paidOn: string
}

export interface Repo {
  load(): Promise<Db>
  saveIncome(draft: IncomeDraft): Promise<void>
  deleteIncome(id: string): Promise<void>
  saveInstallment(draft: InstallmentDraft): Promise<void>
  deleteInstallment(id: string): Promise<void>
  setPaid(installmentId: string, dueDate: string, paid: boolean, opts?: PayOptions): Promise<void>
  saveSettings(s: Settings): Promise<void>
  saveCard(draft: CardDraft): Promise<void>
  deleteCard(id: string): Promise<void>
  saveTransfer(draft: TransferDraft): Promise<void>
  deleteTransfer(id: string): Promise<void>
  saveCategory(draft: TxCategoryDraft): Promise<void>
  deleteCategory(id: string): Promise<void>
  saveTransaction(draft: TransactionDraft): Promise<void>
  deleteTransaction(id: string): Promise<void>
  setCheckin(date: string, on: boolean): Promise<void>
}

export const emptyDb: Db = {
  incomes: [],
  installments: [],
  payments: [],
  cards: [],
  transfers: [],
  categories: [],
  transactions: [],
  checkins: [],
  settings: { opening_balance: 0 },
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

const incomeFields = (d: IncomeDraft) => ({
  title: d.title.trim(),
  amount: d.amount,
  date: d.date,
  is_expected: d.is_expected,
  recurrence: d.recurrence,
  repeat_count: d.recurrence === 'monthly' ? d.repeat_count : null,
  card_id: d.card_id ?? null,
})

const installmentFields = (d: InstallmentDraft) => ({
  title: d.title.trim(),
  amount: d.amount,
  start_date: d.start_date,
  recurrence: d.recurrence,
  repeat_count: d.recurrence === 'monthly' ? Math.max(1, d.repeat_count) : 1,
})

const transferFields = (d: TransferDraft) => ({
  from_card_id: d.from_card_id,
  to_card_id: d.to_card_id,
  amount: d.amount,
  date: d.date,
  note: d.note?.trim() ? d.note.trim() : null,
})

const categoryFields = (d: TxCategoryDraft) => ({
  name: d.name.trim(),
  kind: d.kind,
  color: d.color,
  archived: d.archived ?? false,
})

const transactionFields = (d: TransactionDraft) => ({
  kind: d.kind,
  category_id: d.category_id,
  amount: d.amount,
  date: d.date,
  card_id: d.card_id ?? null,
  note: d.note?.trim() ? d.note.trim() : null,
})

const cardFields = (d: CardDraft) => ({
  name: d.name.trim(),
  bank: d.bank?.trim() ? d.bank.trim() : null,
  color: d.color,
  initial_balance: d.initial_balance,
  start_date: d.start_date,
})

/** داده‌های قدیمی (بدون فیلدهای کارت) را کامل می‌کند */
const normalize = (db: Partial<Db>): Db => ({
  incomes: (db.incomes ?? []).map((i) => ({ ...i, card_id: i.card_id ?? null })),
  installments: db.installments ?? [],
  payments: (db.payments ?? []).map((p) => ({ ...p, card_id: p.card_id ?? null, paid_on: p.paid_on ?? null })),
  cards: db.cards ?? [],
  transfers: (db.transfers ?? []).map((t) => ({ ...t, note: t.note ?? null })),
  categories: db.categories ?? [],
  transactions: (db.transactions ?? []).map((t) => ({ ...t, card_id: t.card_id ?? null, note: t.note ?? null })),
  checkins: db.checkins ?? [],
  settings: db.settings ?? { opening_balance: 0 },
})

/* ------------------------------------------------------------------ */
/*  Supabase                                                           */
/* ------------------------------------------------------------------ */

export function supabaseRepo(sb: SupabaseClient, userId: string): Repo {
  return {
    async load() {
      const [inc, ins, pay, set, crd, trf, cat, trx, chk] = await Promise.all([
        sb.from('incomes').select('*').order('date', { ascending: true }),
        sb.from('installments').select('*').order('start_date', { ascending: true }),
        sb.from('installment_payments').select('*'),
        sb.from('user_settings').select('opening_balance').maybeSingle(),
        sb.from('cards').select('*').order('created_at', { ascending: true }),
        sb.from('card_transfers').select('*').order('date', { ascending: true }),
        sb.from('tx_categories').select('*').order('created_at', { ascending: true }),
        sb.from('transactions').select('*').order('date', { ascending: false }),
        sb.from('daily_checkins').select('date'),
      ])
      if (inc.error) throw inc.error
      if (ins.error) throw ins.error
      if (pay.error) throw pay.error
      // اگر جدول‌های جدید هنوز ساخته نشده باشند، بقیه‌ی اپ کار می‌کند
      return normalize({
        incomes: (inc.data ?? []) as Income[],
        installments: (ins.data ?? []) as Installment[],
        payments: (pay.data ?? []) as Payment[],
        cards: (crd.data ?? []) as Card[],
        transfers: (trf.data ?? []) as Transfer[],
        categories: (cat.data ?? []) as TxCategory[],
        transactions: (trx.data ?? []) as Transaction[],
        checkins: ((chk.data ?? []) as { date: string }[]).map((r) => r.date),
        settings: { opening_balance: Number(set.data?.opening_balance ?? 0) },
      })
    },

    async saveIncome(d) {
      const row = incomeFields(d)
      const res = d.id
        ? await sb.from('incomes').update(row).eq('id', d.id)
        : await sb.from('incomes').insert({ ...row, user_id: userId })
      if (res.error) throw res.error
    },

    async deleteIncome(id) {
      const res = await sb.from('incomes').delete().eq('id', id)
      if (res.error) throw res.error
    },

    async saveInstallment(d) {
      const row = installmentFields(d)
      const res = d.id
        ? await sb.from('installments').update(row).eq('id', d.id)
        : await sb.from('installments').insert({ ...row, user_id: userId })
      if (res.error) throw res.error
    },

    async deleteInstallment(id) {
      const res = await sb.from('installments').delete().eq('id', id)
      if (res.error) throw res.error
    },

    async setPaid(installmentId, dueDate, paid, opts) {
      const res = paid
        ? await sb.from('installment_payments').upsert(
            {
              installment_id: installmentId,
              due_date: dueDate,
              user_id: userId,
              card_id: opts?.cardId ?? null,
              paid_on: opts?.paidOn ?? null,
            },
            { onConflict: 'installment_id,due_date' },
          )
        : await sb
            .from('installment_payments')
            .delete()
            .eq('installment_id', installmentId)
            .eq('due_date', dueDate)
      if (res.error) throw res.error
    },

    async saveSettings(s) {
      const res = await sb
        .from('user_settings')
        .upsert(
          { user_id: userId, opening_balance: s.opening_balance, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        )
      if (res.error) throw res.error
    },

    async saveCard(d) {
      const row = cardFields(d)
      const res = d.id
        ? await sb.from('cards').update(row).eq('id', d.id)
        : await sb.from('cards').insert({ ...row, user_id: userId })
      if (res.error) throw res.error
    },

    async deleteCard(id) {
      const res = await sb.from('cards').delete().eq('id', id)
      if (res.error) throw res.error
    },

    async saveTransfer(d) {
      const row = transferFields(d)
      const res = d.id
        ? await sb.from('card_transfers').update(row).eq('id', d.id)
        : await sb.from('card_transfers').insert({ ...row, user_id: userId })
      if (res.error) throw res.error
    },

    async deleteTransfer(id) {
      const res = await sb.from('card_transfers').delete().eq('id', id)
      if (res.error) throw res.error
    },

    async saveCategory(d) {
      const row = categoryFields(d)
      const res = d.id
        ? await sb.from('tx_categories').update(row).eq('id', d.id)
        : await sb.from('tx_categories').insert({ ...row, user_id: userId })
      if (res.error) throw res.error
    },

    async deleteCategory(id) {
      const res = await sb.from('tx_categories').delete().eq('id', id)
      if (res.error) throw res.error
    },

    async saveTransaction(d) {
      const row = transactionFields(d)
      const res = d.id
        ? await sb.from('transactions').update(row).eq('id', d.id)
        : await sb.from('transactions').insert({ ...row, user_id: userId })
      if (res.error) throw res.error
    },

    async deleteTransaction(id) {
      const res = await sb.from('transactions').delete().eq('id', id)
      if (res.error) throw res.error
    },

    async setCheckin(date, on) {
      const res = on
        ? await sb.from('daily_checkins').upsert({ user_id: userId, date }, { onConflict: 'user_id,date' })
        : await sb.from('daily_checkins').delete().eq('date', date)
      if (res.error) throw res.error
    },
  }
}

/* ------------------------------------------------------------------ */
/*  حالت نمایشی (localStorage)                                         */
/* ------------------------------------------------------------------ */

const KEY = 'qestyar-demo-v1'

function readLocal(): Db {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return normalize(JSON.parse(raw) as Partial<Db>)
  } catch {
    /* ignore */
  }
  return normalize({})
}

function writeLocal(db: Db) {
  localStorage.setItem(KEY, JSON.stringify(db))
}

export function localRepo(): Repo {
  return {
    async load() {
      return readLocal()
    },
    async saveIncome(d) {
      const db = readLocal()
      const row = incomeFields(d)
      if (d.id) db.incomes = db.incomes.map((x) => (x.id === d.id ? { ...x, ...row } : x))
      else db.incomes.push({ id: uid(), ...row })
      writeLocal(db)
    },
    async deleteIncome(id) {
      const db = readLocal()
      db.incomes = db.incomes.filter((x) => x.id !== id)
      writeLocal(db)
    },
    async saveInstallment(d) {
      const db = readLocal()
      const row = installmentFields(d)
      if (d.id) db.installments = db.installments.map((x) => (x.id === d.id ? { ...x, ...row } : x))
      else db.installments.push({ id: uid(), ...row })
      writeLocal(db)
    },
    async deleteInstallment(id) {
      const db = readLocal()
      db.installments = db.installments.filter((x) => x.id !== id)
      db.payments = db.payments.filter((p) => p.installment_id !== id)
      writeLocal(db)
    },
    async setPaid(installmentId, dueDate, paid, opts) {
      const db = readLocal()
      db.payments = db.payments.filter(
        (p) => !(p.installment_id === installmentId && p.due_date === dueDate),
      )
      if (paid) {
        db.payments.push({
          id: uid(),
          installment_id: installmentId,
          due_date: dueDate,
          card_id: opts?.cardId ?? null,
          paid_on: opts?.paidOn ?? null,
        })
      }
      writeLocal(db)
    },
    async saveSettings(s) {
      const db = readLocal()
      db.settings = s
      writeLocal(db)
    },
    async saveCard(d) {
      const db = readLocal()
      const row = cardFields(d)
      if (d.id) db.cards = db.cards.map((x) => (x.id === d.id ? { ...x, ...row } : x))
      else db.cards.push({ id: uid(), ...row })
      writeLocal(db)
    },
    async deleteCard(id) {
      const db = readLocal()
      db.cards = db.cards.filter((c) => c.id !== id)
      // مثل on delete set null در دیتابیس
      db.incomes = db.incomes.map((i) => (i.card_id === id ? { ...i, card_id: null } : i))
      db.payments = db.payments.map((p) => (p.card_id === id ? { ...p, card_id: null } : p))
      db.transfers = db.transfers.filter((t) => t.from_card_id !== id && t.to_card_id !== id)
      db.transactions = db.transactions.map((t) => (t.card_id === id ? { ...t, card_id: null } : t))
      writeLocal(db)
    },
    async saveTransfer(d) {
      const db = readLocal()
      const row = transferFields(d)
      if (d.id) db.transfers = db.transfers.map((x) => (x.id === d.id ? { ...x, ...row } : x))
      else db.transfers.push({ id: uid(), ...row })
      writeLocal(db)
    },
    async deleteTransfer(id) {
      const db = readLocal()
      db.transfers = db.transfers.filter((t) => t.id !== id)
      writeLocal(db)
    },
    async saveCategory(d) {
      const db = readLocal()
      const row = categoryFields(d)
      if (d.id) db.categories = db.categories.map((x) => (x.id === d.id ? { ...x, ...row } : x))
      else db.categories.push({ id: uid(), ...row })
      writeLocal(db)
    },
    async deleteCategory(id) {
      const db = readLocal()
      if (db.transactions.some((t) => t.category_id === id)) {
        throw new Error('این دسته تراکنش دارد و قابل حذف نیست')
      }
      db.categories = db.categories.filter((c) => c.id !== id)
      writeLocal(db)
    },
    async saveTransaction(d) {
      const db = readLocal()
      const row = transactionFields(d)
      if (d.id) db.transactions = db.transactions.map((x) => (x.id === d.id ? { ...x, ...row } : x))
      else db.transactions.push({ id: uid(), ...row })
      writeLocal(db)
    },
    async deleteTransaction(id) {
      const db = readLocal()
      db.transactions = db.transactions.filter((t) => t.id !== id)
      writeLocal(db)
    },
    async setCheckin(date, on) {
      const db = readLocal()
      db.checkins = db.checkins.filter((d) => d !== date)
      if (on) db.checkins.push(date)
      writeLocal(db)
    },
  }
}
