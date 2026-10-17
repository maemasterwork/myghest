import { useState, type FormEvent } from 'react'
import { Logo } from '../components/Shell'
import { Button, Card, Field, TextInput } from '../components/ui'
import { useAuth } from '../lib/auth'
import { errorMessage } from '../lib/format'

type Mode = 'signin' | 'signup' | 'magic'

export default function AuthPage() {
  const { signIn, signUp, magicLink } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      if (mode === 'signin') await signIn(email.trim(), password)
      else if (mode === 'signup') {
        const { needsConfirm } = await signUp(email.trim(), password)
        if (needsConfirm) setInfo('لینک تأیید به ایمیلت ارسال شد. بعد از تأیید وارد شو.')
      } else {
        await magicLink(email.trim())
        setInfo('لینک ورود به ایمیلت ارسال شد.')
      }
    } catch (err) {
      const msg = errorMessage(err)
      setError(
        /invalid login/i.test(msg)
          ? 'ایمیل یا رمز عبور درست نیست.'
          : /already registered/i.test(msg)
            ? 'این ایمیل قبلاً ثبت‌نام کرده است.'
            : /at least/i.test(msg)
              ? 'رمز عبور باید حداقل ۶ کاراکتر باشد.'
              : msg,
      )
    } finally {
      setBusy(false)
    }
  }

  const title = mode === 'signin' ? 'ورود' : mode === 'signup' ? 'ساخت حساب' : 'ورود با لینک ایمیل'

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="anim-rise w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={56} />
          <h1 className="mt-4 text-2xl font-extrabold">IGhest</h1>
          <p className="mt-2 text-sm leading-7 text-muted">
            ببین از هر درآمد چقدر باید برای اقساط تا درآمد بعدی کنار بگذاری.
          </p>
        </div>

        <Card className="p-6">
          <h2 className="mb-5 text-lg font-bold">{title}</h2>
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <Field label="ایمیل">
              <TextInput
                type="email"
                required
                dir="ltr"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="text-start"
              />
            </Field>
            {mode !== 'magic' && (
              <Field label="رمز عبور">
                <TextInput
                  type="password"
                  required
                  minLength={6}
                  dir="ltr"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-start"
                />
              </Field>
            )}
            {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
            {info && <p className="rounded-2xl bg-ok-soft px-4 py-3 text-sm text-ok">{info}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'لطفاً صبر کن…' : mode === 'signin' ? 'ورود' : mode === 'signup' ? 'ساخت حساب' : 'ارسال لینک ورود'}
            </Button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-2 text-sm">
            {mode !== 'signin' && (
              <button className="font-semibold text-brand" onClick={() => setMode('signin')}>
                حساب دارم؛ ورود با رمز
              </button>
            )}
            {mode !== 'signup' && (
              <button className="font-semibold text-brand" onClick={() => setMode('signup')}>
                حساب ندارم؛ ثبت‌نام
              </button>
            )}
            {mode !== 'magic' && (
              <button className="text-muted hover:text-text" onClick={() => setMode('magic')}>
                ورود بدون رمز با لینک ایمیل
              </button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
