'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Calendar, Clock, ChevronLeft, ChevronRight, CheckCircle2, Loader2, AlertCircle, Copy, Check } from 'lucide-react'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Step = 'config' | 'slots' | 'form' | 'pix' | 'success'

interface Restaurant {
  id: string; name: string; slug: string
  logoUrl?: string | null; coverUrl?: string | null
  themeConfig?: any
}

const GUEST_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8]

const TRANSLATIONS = {
  PT: {
    onlineReservations: 'Reservas online',
    guests: 'Quantas pessoas?',
    date: 'Qual data?',
    today: 'Hoje',
    tomorrow: 'Amanhã',
    seeSlots: 'Ver horários disponíveis →',
    chooseTime: 'Escolha um horário',
    noAvailability: 'Sem disponibilidade',
    tryOther: 'Tente outra data ou número de pessoas',
    changeConfig: 'Alterar data ou pessoas',
    yourData: 'Seus dados',
    namePlaceholder: 'Seu nome completo *',
    phonePlaceholder: 'WhatsApp: (00) 00000-0000 *',
    emailPlaceholder: 'E-mail (opcional)',
    occasionPlaceholder: 'Ocasião especial? (opcional)',
    dietaryPlaceholder: 'Restrições alimentares (opcional)',
    confirm: 'Confirmar reserva',
    confirming: 'Confirmando...',
    success: 'Reserva confirmada! 🎉',
    lgpd: 'Li e aceito os Termos de Uso e a Política de Privacidade de',
    required: '*',
    enterName: 'Informe seu nome',
    enterPhone: 'Informe seu WhatsApp',
    acceptTerms: 'Aceite os termos para continuar',
    payDeposit: 'Pague o sinal para confirmar',
    pixExpiresAt: 'Pix • Expira às',
    pixCopyAndPaste: 'Pix copia e cola',
    copied: 'Copiado!',
    copyPix: 'Copiar código Pix',
    waitingPayment: 'Aguardando confirmação do pagamento...',
    youWillReceiveWhatsApp: 'Você receberá uma confirmação no WhatsApp.',
    makeAnother: 'Fazer outra reserva',
    contactForLargerGroups: 'Para grupos maiores, entre em contato diretamente.',
    otherDate: 'Outra data:',
    poweredBy: 'Powered by TeMesa',
  },
  EN: {
    onlineReservations: 'Online reservations',
    guests: 'How many guests?',
    date: 'Which date?',
    today: 'Today',
    tomorrow: 'Tomorrow',
    seeSlots: 'See available times →',
    chooseTime: 'Choose a time',
    noAvailability: 'No availability',
    tryOther: 'Try a different date or party size',
    changeConfig: 'Change date or guests',
    yourData: 'Your details',
    namePlaceholder: 'Your full name *',
    phonePlaceholder: 'WhatsApp: (00) 00000-0000 *',
    emailPlaceholder: 'Email (optional)',
    occasionPlaceholder: 'Special occasion? (optional)',
    dietaryPlaceholder: 'Dietary restrictions (optional)',
    confirm: 'Confirm reservation',
    confirming: 'Confirming...',
    success: 'Reservation confirmed! 🎉',
    lgpd: 'I have read and accept the Terms of Use and Privacy Policy of',
    required: '*',
    enterName: 'Please enter your name',
    enterPhone: 'Please enter your WhatsApp',
    acceptTerms: 'Accept the terms to continue',
    payDeposit: 'Pay the deposit to confirm',
    pixExpiresAt: 'Pix • Expires at',
    pixCopyAndPaste: 'Pix copy and paste',
    copied: 'Copied!',
    copyPix: 'Copy Pix code',
    waitingPayment: 'Waiting for payment confirmation...',
    youWillReceiveWhatsApp: 'You will receive a confirmation on WhatsApp.',
    makeAnother: 'Make another reservation',
    contactForLargerGroups: 'For larger groups, please contact us directly.',
    otherDate: 'Other date:',
    poweredBy: 'Powered by TeMesa',
  },
  ES: {
    onlineReservations: 'Reservas online',
    guests: '¿Cuántas personas?',
    date: '¿Qué fecha?',
    today: 'Hoy',
    tomorrow: 'Mañana',
    seeSlots: 'Ver horarios disponibles →',
    chooseTime: 'Elige un horario',
    noAvailability: 'Sin disponibilidad',
    tryOther: 'Prueba otra fecha o número de personas',
    changeConfig: 'Cambiar fecha o personas',
    yourData: 'Tus datos',
    namePlaceholder: 'Tu nombre completo *',
    phonePlaceholder: 'WhatsApp: (00) 00000-0000 *',
    emailPlaceholder: 'Correo electrónico (opcional)',
    occasionPlaceholder: '¿Ocasión especial? (opcional)',
    dietaryPlaceholder: 'Restricciones alimentarias (opcional)',
    confirm: 'Confirmar reserva',
    confirming: 'Confirmando...',
    success: '¡Reserva confirmada! 🎉',
    lgpd: 'He leído y acepto los Términos de Uso y la Política de Privacidad de',
    required: '*',
    enterName: 'Ingresa tu nombre',
    enterPhone: 'Ingresa tu WhatsApp',
    acceptTerms: 'Acepta los términos para continuar',
    payDeposit: 'Paga el depósito para confirmar',
    pixExpiresAt: 'Pix • Expira a las',
    pixCopyAndPaste: 'Pix copia y pega',
    copied: '¡Copiado!',
    copyPix: 'Copiar código Pix',
    waitingPayment: 'Esperando confirmación del pago...',
    youWillReceiveWhatsApp: 'Recibirás una confirmación por WhatsApp.',
    makeAnother: 'Hacer otra reserva',
    contactForLargerGroups: 'Para grupos más grandes, contáctanos directamente.',
    otherDate: 'Otra fecha:',
    poweredBy: 'Powered by TeMesa',
  },
} as const

type Lang = keyof typeof TRANSLATIONS

export function BookingWidget({ restaurant }: { restaurant: Restaurant }) {
  const [lang, setLang]               = useState<Lang>('PT')
  const [step, setStep]               = useState<Step>('config')
  const [guests, setGuests]           = useState(2)
  const [date, setDate]               = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [lgpd, setLgpd]               = useState(false)
  const [form, setForm]               = useState({ name: '', phone: '', email: '', occasion: '', dietaryNotes: '' })
  const [pixData, setPixData]         = useState<{ pixCode: string; pixQrCodeUrl: string; amountCents: number; expiresAt: Date; prepaymentRecordId: string } | null>(null)
  const [copied, setCopied]           = useState(false)
  const t = TRANSLATIONS[lang]

  const primary = restaurant.themeConfig?.primaryColor ?? '#000000'
  const radius  = restaurant.themeConfig?.borderRadius  ?? '0.75rem'

  const { data: slots, isLoading: slotsLoading } = api.widget.getAvailableSlots.useQuery(
    { slug: restaurant.slug, date, partySize: guests },
    { enabled: step === 'slots' }
  )

  const create = api.widget.createReservation.useMutation({
    onSuccess: (data) => {
      if (data.prepayment) {
        setPixData({ ...data.prepayment })
        setStep('pix')
      } else {
        setStep('success')
      }
    },
    onError: (e) => toast.error(e.message),
  })

  // Poll payment status when on pix step
  const { data: paymentStatus } = api.widget.getPaymentStatus.useQuery(
    { prepaymentRecordId: pixData?.prepaymentRecordId ?? '' },
    {
      enabled: step === 'pix' && !!pixData?.prepaymentRecordId,
      refetchInterval: 5000,
    }
  )
  useEffect(() => {
    if (paymentStatus?.status === 'PAID') setStep('success')
  }, [paymentStatus])

  const copyPix = useCallback(() => {
    if (!pixData) return
    navigator.clipboard.writeText(pixData.pixCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [pixData])

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error(t.enterName)
    if (!form.phone.trim()) return toast.error(t.enterPhone)
    if (!lgpd) return toast.error(t.acceptTerms)
    const normalizeToE164 = (raw: string): string => {
      const digits = raw.replace(/\D/g, '')
      if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`
      return `+55${digits}`
    }
    const e164 = normalizeToE164(form.phone)
    create.mutate({
      slug: restaurant.slug,
      guestName: form.name,
      guestPhone: e164,
      guestEmail: form.email || undefined,
      partySize: guests,
      date: new Date(`${date}T${selectedSlot.startTime}:00`),
      shiftId: selectedSlot.shiftId,
      occasion: form.occasion || undefined,
      dietaryNotes: form.dietaryNotes || undefined,
      lgpdConsent: lgpd,
    })
  }

  // Quick date buttons
  const today     = format(new Date(), 'yyyy-MM-dd')
  const tomorrow  = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const after     = format(addDays(new Date(), 2), 'yyyy-MM-dd')
  const quickDates = [
    { value: today,    label: t.today,     sub: format(new Date(), 'EEE', { locale: ptBR }) },
    { value: tomorrow, label: t.tomorrow,  sub: format(addDays(new Date(), 1), 'EEE', { locale: ptBR }) },
    { value: after,    label: format(addDays(new Date(), 2), 'dd MMM', { locale: ptBR }), sub: format(addDays(new Date(), 2), 'EEE', { locale: ptBR }) },
  ]

  return (
    <div className="min-h-screen flex items-start justify-center py-8 px-4" style={{ background: '#0a0a0a' }}>
      <div className="w-full max-w-md">

        {/* Restaurant Header */}
        <div className="text-center mb-6">
          {restaurant.logoUrl
            ? <img src={restaurant.logoUrl} alt={restaurant.name} className="w-14 h-14 rounded-full mx-auto mb-3 object-cover ring-2 ring-white/10" />
            : (
              <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center text-xl font-bold text-white ring-2 ring-white/10"
                style={{ backgroundColor: primary }}>
                {restaurant.name[0]}
              </div>
            )
          }
          <h1 className="text-base font-semibold text-white tracking-widest uppercase">{restaurant.name}</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{t.onlineReservations}</p>
        </div>

        <AnimatePresence mode="wait">

          {/* ── STEP 1: CONFIG ── */}
          {step === 'config' && (
            <motion.div key="config" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">

                {/* Pessoas */}
                <div className="p-5 border-b border-zinc-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-medium text-white">{t.guests}</span>
                  </div>
                  <div className="grid grid-cols-8 gap-1.5">
                    {GUEST_OPTIONS.map(n => (
                      <button
                        key={n}
                        onClick={() => setGuests(n)}
                        className={cn(
                          'h-9 rounded-lg text-sm font-semibold transition-all',
                          guests === n
                            ? 'text-white scale-105 shadow-lg'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                        )}
                        style={guests === n ? { backgroundColor: primary } : {}}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  {guests === 8 && (
                    <p className="text-xs text-zinc-500 mt-2 text-center">{t.contactForLargerGroups}</p>
                  )}
                </div>

                {/* Data */}
                <div className="p-5 border-b border-zinc-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-medium text-white">{t.date}</span>
                  </div>
                  {/* Quick select */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {quickDates.map(d => (
                      <button
                        key={d.value}
                        onClick={() => setDate(d.value)}
                        className={cn(
                          'py-2.5 px-3 rounded-xl text-center transition-all',
                          date === d.value
                            ? 'text-white scale-[1.02]'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        )}
                        style={date === d.value ? { backgroundColor: primary } : {}}
                      >
                        <p className="text-sm font-semibold">{d.label}</p>
                        <p className="text-[10px] opacity-70 capitalize">{d.sub}</p>
                      </button>
                    ))}
                  </div>
                  {/* Other date */}
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors whitespace-nowrap">{t.otherDate}</span>
                    <input
                      type="date"
                      value={date}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      onChange={e => setDate(e.target.value)}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-zinc-500 transition-colors"
                    />
                  </label>
                </div>

                {/* CTA */}
                <div className="p-5">
                  <button
                    onClick={() => setStep('slots')}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-lg"
                    style={{ backgroundColor: primary, borderRadius: radius }}
                  >
                    {t.seeSlots}
                  </button>
                  <p className="text-center text-[11px] text-zinc-600 mt-3">
                    {guests} pessoa{guests > 1 ? 's' : ''} · {date === today ? t.today : date === tomorrow ? t.tomorrow : format(new Date(date + 'T12:00'), "dd 'de' MMM", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: SLOTS ── */}
          {step === 'slots' && (
            <motion.div key="slots" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
                  <button onClick={() => setStep('config')} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex-1 text-center">
                    <p className="text-sm font-semibold text-white">
                      {date === today ? t.today : date === tomorrow ? t.tomorrow : format(new Date(date + 'T12:00'), "EEE, dd 'de' MMM", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-zinc-500">{guests} pessoa{guests > 1 ? 's' : ''}</p>
                  </div>
                  <div className="w-8" />
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-medium text-white">{t.chooseTime}</span>
                  </div>

                  {slotsLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                    </div>
                  ) : !slots?.length ? (
                    <div className="text-center py-10 space-y-3">
                      <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto" />
                      <div>
                        <p className="text-sm text-zinc-400 font-medium">Sem disponibilidade</p>
                        <p className="text-xs text-zinc-600 mt-1">{t.tryOther}</p>
                      </div>
                      <button
                        onClick={() => setStep('config')}
                        className="text-xs underline text-zinc-500 hover:text-zinc-300"
                      >
                        {t.changeConfig}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {slots.map(slot => (
                        <button
                          key={slot.shiftId}
                          onClick={() => { setSelectedSlot(slot); setStep('form') }}
                          className="group relative py-4 px-3 rounded-xl border border-zinc-700 hover:border-transparent text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                          style={{ '--hover-bg': primary } as any}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = primary)}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                        >
                          <p className="text-lg font-bold text-white">{slot.startTime}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{slot.shiftName}</p>
                          {slot.availableSeats > 0 && (
                            <p className="text-[10px] text-zinc-600 mt-1">{slot.availableSeats} lugares</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: FORM ── */}
          {step === 'form' && (
            <motion.div key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                {/* Header com resumo */}
                <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
                  <button onClick={() => setStep('slots')} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: primary }}>
                        {selectedSlot?.startTime}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {guests} pessoa{guests > 1 ? 's' : ''} · {date === today ? 'Hoje' : date === tomorrow ? 'Amanhã' : format(new Date(date + 'T12:00'), "dd/MM", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <p className="text-sm font-semibold text-white mb-1">{t.yourData}</p>

                  <input
                    type="text"
                    placeholder={t.namePlaceholder}
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-zinc-500 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
                  />
                  <input
                    type="tel"
                    placeholder={t.phonePlaceholder}
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-zinc-500 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
                  />
                  <input
                    type="email"
                    placeholder={t.emailPlaceholder}
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-zinc-500 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
                  />

                  {/* Ocasião */}
                  <select
                    value={form.occasion}
                    onChange={e => setForm(p => ({ ...p, occasion: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-zinc-500 rounded-xl px-4 py-3 text-sm text-zinc-300 outline-none transition-colors appearance-none"
                  >
                    <option value="">{t.occasionPlaceholder}</option>
                    {['Aniversário 🎂', 'Lua de Mel 💍', 'Pedido de Casamento 💎', 'Formatura 🎓', 'Negócios 💼', 'Outro'].map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder={t.dietaryPlaceholder}
                    value={form.dietaryNotes}
                    onChange={e => setForm(p => ({ ...p, dietaryNotes: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-zinc-500 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
                  />

                  {/* LGPD */}
                  <div className="space-y-2.5 pt-1">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <div
                        onClick={() => setLgpd(p => !p)}
                        className={cn(
                          'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
                          lgpd ? 'border-transparent' : 'border-zinc-600 bg-transparent'
                        )}
                        style={lgpd ? { backgroundColor: primary } : {}}
                      >
                        {lgpd && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                      <span className="text-xs text-zinc-400 leading-relaxed">
                        {t.lgpd}{' '}{restaurant.name}. <span className="text-red-400">{t.required}</span>
                      </span>
                    </label>

                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={create.isPending || !lgpd}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white mt-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: primary, borderRadius: radius }}
                  >
                    {create.isPending
                      ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {t.confirming}</span>
                      : t.confirm}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP PIX ── */}
          {step === 'pix' && pixData && (
            <motion.div key="pix" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                <div className="p-5 border-b border-zinc-800 text-center">
                  <p className="text-sm font-semibold text-white mb-0.5">{t.payDeposit}</p>
                  <p className="text-2xl font-bold" style={{ color: primary }}>
                    {(pixData.amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">{t.pixExpiresAt} {format(new Date(pixData.expiresAt), 'HH:mm')}</p>
                </div>

                <div className="p-5 space-y-4">
                  {pixData.pixQrCodeUrl && (
                    <div className="flex justify-center">
                      <img src={pixData.pixQrCodeUrl} alt="QR Code Pix" className="w-44 h-44 rounded-xl bg-white p-2" />
                    </div>
                  )}

                  <div className="bg-zinc-800 rounded-xl p-3">
                    <p className="text-[10px] text-zinc-500 mb-1.5 uppercase tracking-wider">{t.pixCopyAndPaste}</p>
                    <p className="text-[11px] text-zinc-300 font-mono break-all leading-relaxed line-clamp-3">{pixData.pixCode}</p>
                  </div>

                  <button
                    onClick={copyPix}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
                    style={{ backgroundColor: primary }}
                  >
                    {copied ? <><Check className="w-4 h-4" /> {t.copied}</> : <><Copy className="w-4 h-4" /> {t.copyPix}</>}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {t.waitingPayment}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: SUCCESS ── */}
          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                  style={{ backgroundColor: `${primary}33`, border: `2px solid ${primary}` }}
                >
                  <CheckCircle2 className="w-8 h-8" style={{ color: primary }} />
                </motion.div>
                <div>
                  <p className="text-lg font-bold text-white mb-1">{t.success}</p>
                  <p className="text-sm text-zinc-400">
                    Olá {form.name.split(' ')[0]}! Sua reserva no <strong className="text-white">{restaurant.name}</strong> está confirmada.
                  </p>
                  <div className="mt-4 p-3 bg-zinc-800 rounded-xl space-y-1.5 text-left">
                    <p className="text-xs text-zinc-300">📅 {date === today ? 'Hoje' : date === tomorrow ? 'Amanhã' : format(new Date(date + 'T12:00'), "dd 'de' MMMM", { locale: ptBR })}</p>
                    <p className="text-xs text-zinc-300">⏰ {selectedSlot?.startTime} (± 2h)</p>
                    <p className="text-xs text-zinc-300">👥 {guests} pessoa{guests > 1 ? 's' : ''}</p>
                  </div>
                  <p className="text-xs text-zinc-500 mt-3">{t.youWillReceiveWhatsApp}</p>
                </div>
                <button
                  onClick={() => { setStep('config'); setSelectedSlot(null); setForm({ name: '', phone: '', email: '', occasion: '', dietaryNotes: '' }); setLgpd(false); setPixData(null) }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 underline transition-colors"
                >
                  {t.makeAnother}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Language + Footer */}
        <div className="flex items-center justify-center gap-4 mt-5">
          {(['PT', 'EN', 'ES'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLang(l as Lang)}
              className={cn('text-[10px] font-medium transition-colors', l === lang ? 'text-zinc-400' : 'text-zinc-600 hover:text-zinc-400')}
              title={l === 'PT' ? 'Português' : l === 'EN' ? 'English' : 'Español'}
            >
              {l}
            </button>
          ))}
        </div>
        <p className="text-center text-[10px] text-zinc-700 mt-2">{t.poweredBy}</p>
      </div>
    </div>
  )
}
