
'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function Preloader() {
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Simulate loading delay for demonstration and smooth transition
    const timer = setTimeout(() => {
      setLoading(false)
    }, 800) // Adjust time as needed

    return () => clearTimeout(timer)
  }, [pathname, searchParams])

  if (!loading) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-50 dark:bg-zinc-900 transition-colors duration-300">
      <div className="relative flex flex-col items-center gap-4">
        <div className="relative">
            <div className="w-16 h-16 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            </div>
        </div>
        <p className="text-yellow-500 font-medium text-sm animate-pulse">Loading StarHub...</p>
      </div>
    </div>
  )
}
