'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useEffect } from 'react'

export function InviteRedirectButtons({ token }: { token: string }) {
  useEffect(() => {
    sessionStorage.setItem('pendingInviteToken', token)
  }, [token])

  return (
    <div className="space-y-2">
      <Link
        href="/sign-up"
        className="flex items-center justify-center gap-2 w-full bg-white text-black py-3 rounded-xl font-semibold text-sm"
      >
        Criar conta e começar <ArrowRight className="w-4 h-4" />
      </Link>
      <Link
        href="/sign-in"
        className="flex items-center justify-center gap-2 w-full border border-zinc-700 text-zinc-300 py-3 rounded-xl text-sm hover:border-zinc-500 transition-colors"
      >
        Já tenho conta — fazer login
      </Link>
    </div>
  )
}
