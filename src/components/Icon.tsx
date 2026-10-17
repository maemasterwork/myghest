const PATHS = {
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3',
  edit: 'M4 20h4l10.5-10.5a2.1 2.1 0 00-3-3L5 17v3z',
  sun: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z',
  moon: 'M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z',
  home: 'M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1v-8z',
  income: 'M12 4v13M6 12l6 6 6-6',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  timeline: 'M6 4v16M6 7h8M6 12h12M6 17h6',
  out: 'M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 16l-4-4 4-4M6 12h11',
  alert: 'M12 4l9 16H3L12 4zM12 10v4M12 17h.01',
  chev: 'M6 9l6 6 6-6',
  close: 'M6 6l12 12M18 6L6 18',
  repeat: 'M17 2l3 3-3 3M4 11V9a4 4 0 014-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 01-4 4H4',
  card: 'M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM3 10h18M7 15h3',
  swap: 'M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  tag: 'M20 12l-8 8-9-9V3h8l9 9zM7.5 7.5h.01',
  chart: 'M5 20V11M12 20V5M19 20v-7',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z',
  food: 'M7 3v7M4 3v4a3 3 0 006 0V3M7 10v11M17 3v18M17 3a4 4 0 00-4 4v3h4',
  transport: 'M5 3h14a2 2 0 012 2v13H3V5a2 2 0 012-2zM3 12h18M7 18v3M17 18v3M7 7h.01M17 7h.01',
  receipt: 'M5 3h14v18l-3-2-4 2-4-2-3 2V3zM8 8h8M8 12h8M8 16h4',
  health: 'M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7V3z',
  shopping: 'M5 8h14l-1 13H6L5 8zM9 8V6a3 3 0 016 0v2',
  work: 'M3 8h18v13H3zM8 8V5h8v3M3 13h18M10 13v2h4v-2',
  bank: 'M3 9h18L12 4 3 9zM5 10v8M9 10v8M15 10v8M19 10v8M3 20h18M2 22h20',
  wallet: 'M4 6h15a2 2 0 012 2v12H4a2 2 0 01-2-2V6a2 2 0 012-2h14M16 13h5M17 13h.01',
  savings: 'M12 3v18M17 7H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H7',
  car: 'M5 17h14l1-7-2-5H6l-2 5 1 7zM4 10h16M7 17v3M17 17v3M7 13h.01M17 13h.01',
  education: 'M2 10l10-6 10 6-10 6-10-6zM6 12v5c3.5 3 8.5 3 12 0v-5M22 10v7',
  travel: 'M3 12l18-8-6 17-3-7-9-2zM12 14l4-4',
  phone: 'M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zM10 17h4',
  gift: 'M3 10h18v11H3zM2 6h20v4H2zM12 6v15M12 6H8a2 2 0 110-4c3 0 4 4 4 4zM12 6h4a2 2 0 100-4c-3 0-4 4-4 4z',
  pet: 'M8 11a2 2 0 100-4 2 2 0 000 4zM16 11a2 2 0 100-4 2 2 0 000 4zM5 17a2 2 0 100-4 2 2 0 000 4zM19 17a2 2 0 100-4 2 2 0 000 4zM12 13c-3 0-5 4-3 6 1 1 2-1 3-1s2 2 3 1c2-2 0-6-3-6z',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
