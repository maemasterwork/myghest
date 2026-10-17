import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useData } from '../lib/data'
import { demoMode } from '../lib/supabase'
import { useTheme } from '../lib/theme'
import { Icon, type IconName } from './Icon'
import { DailyPrompt } from './DailyPrompt'
import { PayModal } from './PayModal'
import { TxHost } from './TxModal'
import { IconButton } from './ui'

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[28%] bg-accent shadow-md"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="var(--primary)" aria-hidden="true">
        <rect x="2" y="4" width="20" height="4" rx="2" />
        <rect x="6" y="10" width="16" height="4" rx="2" opacity=".85" />
        <rect x="10" y="16" width="12" height="4" rx="2" opacity=".7" />
      </svg>
    </span>
  )
}

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'خانه', icon: 'home', end: true },
  { to: '/incomes', label: 'درآمدها', icon: 'income' },
  { to: '/installments', label: 'اقساط', icon: 'list' },
  { to: '/daily', label: 'روزانه', icon: 'swap' },
  { to: '/cards', label: 'کارت‌ها', icon: 'card' },
  { to: '/chart', label: 'نمودار', icon: 'chart' },
  { to: '/timeline', label: 'بازه‌ها', icon: 'timeline' },
  { to: '/categories', label: 'دسته‌ها', icon: 'tag' },
]
const MOBILE_MAIN = NAV.slice(0, 4)
const MOBILE_MORE = NAV.slice(4)

export default function Shell() {
  const { user, signOut } = useAuth()
  const { dark, toggle } = useTheme()
  const { error } = useData()
  const [more, setMore] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-dvh pb-28 md:pb-12">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-primary text-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4 md:max-w-none md:px-6">
          <Logo />
          <span className="text-lg font-extrabold tracking-tight">IGhest</span>

          <div className="ms-auto flex items-center gap-1">
            <IconButton
              label={dark ? 'حالت روشن' : 'حالت تیره'}
              onClick={toggle}
              className="text-white/80 hover:bg-white/10 hover:text-white"
            >
              <Icon name={dark ? 'sun' : 'moon'} />
            </IconButton>
            {!demoMode && (
              <IconButton
                label="خروج"
                onClick={() => void signOut()}
                className="text-white/80 hover:bg-white/10 hover:text-white"
              >
                <Icon name="out" />
              </IconButton>
            )}
          </div>
        </div>
      </header>

      <div
        className={`md:grid md:transition-[grid-template-columns] ${
          sidebarCollapsed
            ? 'md:grid-cols-[5rem_minmax(0,1fr)]'
            : 'md:grid-cols-[14rem_minmax(0,1fr)]'
        }`}
      >
        <aside className="hidden border-e border-white/10 bg-primary px-3 py-4 text-white md:flex md:min-h-[calc(100dvh-4rem)] md:flex-col">
          <div className={`mb-4 flex ${sidebarCollapsed ? 'justify-center' : 'justify-start'}`}>
            <IconButton
              label={sidebarCollapsed ? 'گسترش منو' : 'جمع کردن منو'}
              aria-expanded={!sidebarCollapsed}
              aria-controls="desktop-navigation"
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            >
              <Icon name="chev" className={sidebarCollapsed ? '-rotate-90' : 'rotate-90'} />
            </IconButton>
          </div>
          <nav id="desktop-navigation" aria-label="منوی اصلی" className="flex flex-col gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                title={n.label}
                className={({ isActive }) =>
                  `flex min-h-11 items-center rounded-xl text-sm font-semibold transition ${
                    sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
                  } ${isActive ? 'bg-accent font-bold text-primary' : 'text-white/75 hover:bg-white/10 hover:text-white'}`
                }
              >
                <Icon name={n.icon} />
                <span className={sidebarCollapsed ? 'sr-only' : ''}>{n.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="mx-auto w-full max-w-3xl px-4 pt-6 md:max-w-none md:px-6">
          {demoMode && (
            <div className="mb-5 rounded-2xl bg-warn-soft px-4 py-3 text-[13px] leading-6 text-warn">
              حالت نمایشی: Supabase هنوز وصل نشده و داده‌ها فقط در همین مرورگر ذخیره می‌شوند. برای استفاده‌ی واقعی،
              فایل <span dir="ltr">.env</span> را طبق راهنما تنظیم کن.
            </div>
          )}
          {error && (
            <div className="mb-5 rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">
              خطا در ارتباط با دیتابیس: {error}
            </div>
          )}
          <Outlet />
          <PayModal />
          <TxHost />
          <DailyPrompt />
          {!demoMode && user?.email && (
            <p className="mt-10 text-center text-xs text-muted" dir="ltr">
              {user.email}
            </p>
          )}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        aria-label="منوی اصلی"
      >
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {MOBILE_MAIN.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={() => setMore(false)}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition ${
                  isActive ? 'text-brand' : 'text-muted'
                }`
              }
            >
              <Icon name={n.icon} size={22} />
              {n.label}
            </NavLink>
          ))}
          <button
            onClick={() => setMore((v) => !v)}
            aria-expanded={more}
            className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${more ? 'text-brand' : 'text-muted'}`}
          >
            <Icon name="dots" size={22} />
            بیشتر
          </button>
        </div>
        {more && (
          <div className="grid grid-cols-3 border-t border-line">
            {MOBILE_MORE.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                onClick={() => setMore(false)}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-3 text-[11px] font-semibold ${isActive ? 'text-brand' : 'text-muted'}`
                }
              >
                <Icon name={n.icon} size={22} />
                {n.label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>
    </div>
  )
}
