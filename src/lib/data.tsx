import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { buildPlan, planHorizon, type Plan } from './allocation'
import { useAuth } from './auth'
import { summarizeCards, type CardSummary } from './cards'
import { pendingDays } from './daily'
import { todayIso } from './dates'
import { buildDemoDrafts } from './demo'
import { errorMessage } from './format'
import { expandIncomes, expandInstallments } from './recurrence'
import { emptyDb, localRepo, supabaseRepo, type Db, type PayOptions, type Repo } from './repo'
import { demoMode, supabase } from './supabase'
import type {
  Card,
  CardDraft,
  Income,
  IncomeDraft,
  IncomeOccurrence,
  Installment,
  InstallmentDraft,
  InstallmentOccurrence,
  Payment,
  Settings,
  Transaction,
  TransactionDraft,
  Transfer,
  TransferDraft,
  TxCategory,
  TxCategoryDraft,
  TxKind,
} from './types'

export interface TxEditorState {
  initial: Transaction | null
  date?: string
  kind?: TxKind
}

export const DEFAULT_CATEGORIES: { name: string; kind: TxKind; color: string }[] = [
  { name: 'خوراک و رستوران', kind: 'out', color: '#8a5a00' },
  { name: 'حمل‌ونقل', kind: 'out', color: '#475569' },
  { name: 'قبض و شارژ', kind: 'out', color: '#142d4e' },
  { name: 'سلامت و درمان', kind: 'out', color: '#b91c1c' },
  { name: 'خرید', kind: 'out', color: '#334155' },
  { name: 'تفریح', kind: 'out', color: '#0f766e' },
  { name: 'سایر هزینه‌ها', kind: 'out', color: '#64748b' },
  { name: 'حقوق و پروژه', kind: 'in', color: '#15803d' },
  { name: 'هدیه', kind: 'in', color: '#8a5a00' },
  { name: 'سایر درآمدها', kind: 'in', color: '#334155' },
]

interface DataCtx {
  loading: boolean
  error: string | null
  today: string
  incomes: Income[]
  installments: Installment[]
  payments: Payment[]
  cards: Card[]
  transfers: Transfer[]
  categories: TxCategory[]
  transactions: Transaction[]
  checkins: string[]
  /** روزهای بسته‌نشده‌ی تراکنش روزانه؛ جدیدترین اول */
  pendingDays: string[]
  cardSummaries: CardSummary[]
  settings: Settings
  incomeOccurrences: IncomeOccurrence[]
  installmentOccurrences: InstallmentOccurrence[]
  plan: Plan
  reload(): Promise<void>
  saveIncome(d: IncomeDraft): Promise<void>
  deleteIncome(id: string): Promise<void>
  saveInstallment(d: InstallmentDraft): Promise<void>
  deleteInstallment(id: string): Promise<void>
  setPaid(installmentId: string, dueDate: string, paid: boolean, opts?: PayOptions): Promise<void>
  saveSettings(s: Settings): Promise<void>
  saveCard(d: CardDraft): Promise<void>
  deleteCard(id: string): Promise<void>
  saveTransfer(d: TransferDraft): Promise<void>
  deleteTransfer(id: string): Promise<void>
  saveCategory(d: TxCategoryDraft): Promise<void>
  deleteCategory(id: string): Promise<void>
  seedCategories(): Promise<void>
  saveTransaction(d: TransactionDraft): Promise<void>
  deleteTransaction(id: string): Promise<void>
  setCheckin(date: string, on: boolean): Promise<void>
  /** ویرایشگر تراکنش (سراسری) */
  txEditor: TxEditorState | null
  openTx(opts?: Partial<TxEditorState>): void
  closeTx(): void
  /** پنجره‌ی یادآوری روزانه */
  promptOpen: boolean
  setPromptOpen(v: boolean): void
  /** تیک پرداخت: اگر کارتی وجود داشته باشد، اول می‌پرسد از کدام کارت */
  togglePaid(o: InstallmentOccurrence, paid: boolean): Promise<void>
  pendingPay: InstallmentOccurrence | null
  cancelPay(): void
  confirmPay(opts: PayOptions): Promise<void>
  seedDemo(): Promise<void>
}

const Ctx = createContext<DataCtx | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id

  const repo: Repo = useMemo(
    () => (supabase && userId ? supabaseRepo(supabase, userId) : localRepo()),
    [userId],
  )

  const [db, setDb] = useState<Db>(emptyDb)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [today, setToday] = useState(() => todayIso())
  const [pendingPay, setPendingPay] = useState<InstallmentOccurrence | null>(null)
  const [txEditor, setTxEditor] = useState<TxEditorState | null>(null)
  const [promptOpen, setPromptOpen] = useState(false)

  const reload = useCallback(async () => {
    try {
      setError(null)
      setDb(await repo.load())
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [repo])

  useEffect(() => {
    setLoading(true)
    void reload()
  }, [reload])

  // اگر اپ از شب تا صبح باز مانده باشد، «امروز» را به‌روز می‌کنیم
  useEffect(() => {
    const refresh = () => setToday(todayIso())
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  const incomeOccurrences = useMemo(
    () => expandIncomes(db.incomes, planHorizon(today)),
    [db.incomes, today],
  )
  const installmentOccurrences = useMemo(
    () => expandInstallments(db.installments, db.payments),
    [db.installments, db.payments],
  )
  const plan = useMemo(
    () => buildPlan(incomeOccurrences, installmentOccurrences, today, db.settings.opening_balance),
    [incomeOccurrences, installmentOccurrences, today, db.settings.opening_balance],
  )
  const cardSummaries = useMemo(
    () =>
      summarizeCards(
        db.cards,
        incomeOccurrences,
        installmentOccurrences,
        db.payments,
        today,
        db.transfers,
        db.transactions,
        db.categories,
      ),
    [db.cards, incomeOccurrences, installmentOccurrences, db.payments, today, db.transfers, db.transactions, db.categories],
  )
  const pending = useMemo(
    () => pendingDays(today, db.transactions, db.checkins),
    [today, db.transactions, db.checkins],
  )

  const mutate = useCallback(
    async (fn: () => Promise<void>) => {
      await fn()
      await reload()
    },
    [reload],
  )

  const setPaid = useCallback(
    async (installmentId: string, dueDate: string, paid: boolean, opts?: PayOptions) => {
      // به‌روزرسانی خوش‌بینانه تا تیک‌زدن فوری حس شود
      setDb((s) => ({
        ...s,
        payments: paid
          ? [
              ...s.payments.filter(
                (p) => !(p.installment_id === installmentId && p.due_date === dueDate),
              ),
              {
                id: `tmp-${installmentId}-${dueDate}`,
                installment_id: installmentId,
                due_date: dueDate,
                card_id: opts?.cardId ?? null,
                paid_on: opts?.paidOn ?? null,
              },
            ]
          : s.payments.filter((p) => !(p.installment_id === installmentId && p.due_date === dueDate)),
      }))
      try {
        await repo.setPaid(installmentId, dueDate, paid, opts)
        await reload()
      } catch (e) {
        setError(errorMessage(e))
        await reload()
      }
    },
    [repo, reload],
  )

  const togglePaid = useCallback(
    async (o: InstallmentOccurrence, paid: boolean) => {
      if (!paid) return setPaid(o.installmentId, o.date, false)
      if (db.cards.length === 0) return setPaid(o.installmentId, o.date, true, { cardId: null, paidOn: today })
      setPendingPay(o)
    },
    [db.cards.length, setPaid, today],
  )

  const value = useMemo<DataCtx>(
    () => ({
      loading,
      error,
      today,
      incomes: db.incomes,
      installments: db.installments,
      payments: db.payments,
      cards: db.cards,
      transfers: db.transfers,
      categories: db.categories,
      transactions: db.transactions,
      checkins: db.checkins,
      pendingDays: pending,
      cardSummaries,
      settings: db.settings,
      incomeOccurrences,
      installmentOccurrences,
      plan,
      reload,
      saveIncome: (d) => mutate(() => repo.saveIncome(d)),
      deleteIncome: (id) => mutate(() => repo.deleteIncome(id)),
      saveInstallment: (d) => mutate(() => repo.saveInstallment(d)),
      deleteInstallment: (id) => mutate(() => repo.deleteInstallment(id)),
      saveSettings: (s) => mutate(() => repo.saveSettings(s)),
      saveCard: (d) => mutate(() => repo.saveCard(d)),
      deleteCard: (id) => mutate(() => repo.deleteCard(id)),
      saveTransfer: (d) => mutate(() => repo.saveTransfer(d)),
      deleteTransfer: (id) => mutate(() => repo.deleteTransfer(id)),
      saveCategory: (d) => mutate(() => repo.saveCategory(d)),
      deleteCategory: (id) => mutate(() => repo.deleteCategory(id)),
      async seedCategories() {
        const have = new Set(db.categories.map((c) => `${c.kind}|${c.name}`))
        try {
          await mutate(async () => {
            for (const c of DEFAULT_CATEGORIES) {
              const key = `${c.kind}|${c.name}`
              if (!have.has(key)) {
                await repo.saveCategory(c)
                have.add(key)
              }
            }
          })
        } catch (e) {
          await reload()
          throw e
        }
      },
      saveTransaction: (d) => mutate(() => repo.saveTransaction(d)),
      deleteTransaction: (id) => mutate(() => repo.deleteTransaction(id)),
      setCheckin: (date, on) => mutate(() => repo.setCheckin(date, on)),
      txEditor,
      openTx: (opts) => setTxEditor({ initial: null, ...opts }),
      closeTx: () => setTxEditor(null),
      promptOpen,
      setPromptOpen,
      setPaid,
      togglePaid,
      pendingPay,
      cancelPay: () => setPendingPay(null),
      async confirmPay(opts) {
        const o = pendingPay
        if (!o) return
        setPendingPay(null)
        await setPaid(o.installmentId, o.date, true, opts)
      },
      async seedDemo() {
        if (!demoMode) return
        const { incomes, installments } = buildDemoDrafts(today)
        await mutate(async () => {
          for (const i of incomes) await repo.saveIncome(i)
          for (const i of installments) await repo.saveInstallment(i)
        })
      },
    }),
    [
      loading, error, today, db, pending, cardSummaries, incomeOccurrences, installmentOccurrences, plan,
      reload, mutate, repo, setPaid, togglePaid, pendingPay, txEditor, promptOpen,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useData(): DataCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useData must be used inside <DataProvider>')
  return v
}
