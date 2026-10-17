import { isoToJalali, jalaliToIso } from './dates'
import type { IncomeDraft, InstallmentDraft } from './types'

/** داده‌ی نمونه، نسبت به ماه شمسی جاری */
export function buildDemoDrafts(today: string): {
  incomes: IncomeDraft[]
  installments: InstallmentDraft[]
} {
  const { jy, jm } = isoToJalali(today)
  const day = (d: number) => jalaliToIso(jy, jm, d)

  return {
    incomes: [
      {
        title: 'حقوق ماهانه',
        amount: 28_000_000,
        date: day(1),
        is_expected: false,
        recurrence: 'monthly',
        repeat_count: null,
        card_id: null,
      },
      {
        title: 'پروژه‌ی طراحی',
        amount: 15_000_000,
        date: day(14),
        is_expected: false,
        recurrence: 'none',
        repeat_count: null,
        card_id: null,
      },
    ],
    installments: [
      { title: 'قسط وام مسکن', amount: 6_500_000, start_date: day(5), recurrence: 'monthly', repeat_count: 24 },
      { title: 'قسط خودرو', amount: 9_000_000, start_date: day(20), recurrence: 'monthly', repeat_count: 18 },
      { title: 'قسط لپ‌تاپ', amount: 4_200_000, start_date: day(12), recurrence: 'monthly', repeat_count: 6 },
    ],
  }
}
