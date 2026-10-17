import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** اگر متغیرهای محیطی تنظیم نشده باشند، اپ در «حالت نمایشی» با localStorage کار می‌کند. */
export const supabase = url && key ? createClient(url, key) : null
export const demoMode = supabase === null
