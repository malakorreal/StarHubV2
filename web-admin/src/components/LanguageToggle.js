
'use client'

import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Languages } from 'lucide-react'

export function LanguageToggle() {
  const router = useRouter()
  const locale = useLocale()
  const [isPending, startTransition] = useTransition()

  const toggleLanguage = () => {
    const nextLocale = locale === 'en' ? 'th' : 'en'
    startTransition(() => {
      // Typically you replace the URL segment
      // But since we are using next-intl middleware, we can just push the new path
      // However, we need to preserve the current path
      // A simple way is to use window.location.pathname replace
      const currentPath = window.location.pathname
      const segments = currentPath.split('/')
      segments[1] = nextLocale
      router.replace(segments.join('/'))
    })
  }

  return (
    <button
      onClick={toggleLanguage}
      disabled={isPending}
      className="p-2 rounded-lg bg-gray-200 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 font-medium"
      title="Switch Language"
    >
      <Languages size={20} />
      <span className="text-sm">{locale.toUpperCase()}</span>
    </button>
  )
}
