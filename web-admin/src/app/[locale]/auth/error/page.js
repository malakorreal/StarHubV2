'use client'

import { useSearchParams } from "next/navigation"
import { Suspense } from 'react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const message =
    error === "AccessDenied"
      ? "Access denied. You do not have permission to use this dashboard."
      : "Authentication error. Please try again."

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900 p-4">
      <div className="w-full max-w-md space-y-6 bg-white dark:bg-zinc-800 p-8 border border-gray-200 dark:border-zinc-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Authentication Error</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
        <a
          href="/auth/signin"
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          Back to Sign in
        </a>
      </div>
    </div>
  )
}

export default function ErrorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorContent />
    </Suspense>
  )
}

