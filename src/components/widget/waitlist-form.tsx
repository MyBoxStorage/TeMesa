'use client'

import { useState } from 'react'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function maskPhoneBr(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function toE164(raw: string): string | null {
  const d = raw.replace(/\D/g, '')
  if (d.length < 10 || d.length > 13) return null
  if (d.startsWith('55')) return `+${d}`
  return `+55${d}`
}

interface Props {
  slug: string
  date: string
  partySize: number
  shiftId?: string
  onSuccess: () => void
}

export function WaitlistForm({ slug, date, partySize, shiftId, onSuccess }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [lgpd, setLgpd] = useState(false)

  const add = api.waitlist.add.useMutation({
    onSuccess: () => {
      toast.success('Você está na fila! Te avisamos pelo WhatsApp se uma mesa abrir.')
      onSuccess()
    },
    onError: (e) => toast.error(e.message),
  })

  const submit = () => {
    const n = name.trim()
    if (n.length < 2) return toast.error('Informe seu nome')
    const e164 = toE164(phone)
    if (!e164) return toast.error('Informe um WhatsApp válido com DDD')
    if (!lgpd) return toast.error('Aceite os termos para entrar na fila')
    add.mutate({
      slug,
      guestName: n,
      guestPhone: e164,
      guestEmail: email.trim() ? email.trim() : undefined,
      partySize,
      date: new Date(`${date}T12:00:00`),
      shiftId,
      lgpdConsent: lgpd,
    })
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-900/80 p-4">
      <div className="space-y-1.5">
        <Label className="text-[11px] text-zinc-400">Nome</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 bg-zinc-800 border-zinc-600 text-sm text-white"
          placeholder="Seu nome"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px] text-zinc-400">WhatsApp</Label>
        <Input
          value={phone}
          onChange={(e) => setPhone(maskPhoneBr(e.target.value))}
          className="h-10 bg-zinc-800 border-zinc-600 text-sm text-white"
          placeholder="(47) 99999-9999"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px] text-zinc-400">E-mail (opcional)</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-10 bg-zinc-800 border-zinc-600 text-sm text-white"
          placeholder="voce@email.com"
        />
      </div>
      <label className="flex items-start gap-2 text-[11px] text-zinc-400 cursor-pointer">
        <input
          type="checkbox"
          checked={lgpd}
          onChange={(e) => setLgpd(e.target.checked)}
          className="mt-0.5 rounded border-zinc-600"
        />
        <span>Autorizo o uso dos meus dados para contato sobre a fila de espera (LGPD).</span>
      </label>
      <Button
        type="button"
        className="w-full h-10 text-sm font-semibold"
        disabled={add.isPending}
        onClick={submit}
      >
        {add.isPending ? 'Enviando…' : 'Entrar na fila'}
      </Button>
    </div>
  )
}
