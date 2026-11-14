'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Recarga los datos del servidor cada `every` ms, hasta `times` veces. */
export function AutoRefresh({ every = 4000, times = 15 }: { every?: number; times?: number }) {
  const router = useRouter()
  useEffect(() => {
    let n = 0
    const id = setInterval(() => {
      n += 1
      router.refresh()
      if (n >= times) clearInterval(id)
    }, every)
    return () => clearInterval(id)
  }, [router, every, times])
  return null
}
