'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Calendar, Clock, ChevronLeft, CheckCircle2, Loader2,
  AlertCircle, Copy, Check,
  Cake, Heart, Briefcase, UsersRound, Music, Beer, Smile, Pencil,
  MapPin, Waves, Umbrella, Key,
  Flame, CalendarDays, History, Star,
  GlassWater, Wine, Sandwich, Utensils, Gift,
  Share2, Globe, Phone, Tv,
  Leaf, Sprout, Wheat, Fish,
} from 'lucide-react'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ── Tipos de step ─────────────────────────────────────────────────────────────

type Step =
  | 'welcome'
  | 'occasion'
  | 'config'
  | 'slots'
  | 'identity'
  | 'profile'
  | 'preferences'
  | 'referral'
  | 'pix'
  | 'success'

const STEPS_ORDERED: Step[] = [
  'welcome', 'occasion', 'config', 'slots',
  'identity', 'profile', 'preferences', 'referral',
]

// ── Tipos de form ─────────────────────────────────────────────────────────────

interface FormData {
  occasionType: string
  partySize: number
  date: string
  selectedSlot: { shiftId: string; shiftName: string; startTime: string; availableSeats: number } | null
  name: string
  phone: string
  email: string
  originType: string
  visitFrequency: string
  consumptionPreferences: string[]
  dietaryRestrictions: string[]
  referralSource: string
  lgpd: boolean
  optinMarketing: boolean
}

const DEFAULT_FORM: FormData = {
  occasionType: '',
  partySize: 2,
  date: format(new Date(), 'yyyy-MM-dd'),
  selectedSlot: null,
  name: '',
  phone: '',
  email: '',
  originType: '',
  visitFrequency: '',
  consumptionPreferences: [],
  dietaryRestrictions: [],
  referralSource: '',
  lgpd: false,
  optinMarketing: false,
}

// ── Traduções ─────────────────────────────────────────────────────────────────

const T = {
  PT: {
    onlineReservations: 'Reservas online',
    welcome_title: 'Reserve sua mesa',
    welcome_sub: 'Leva menos de 2 minutos. Algumas perguntas para personalizar sua experiência.',
    welcome_cta: 'Começar',
    step_occasion: 'Qual o motivo da visita?',
    occ_birthday: 'Aniversário', occ_romantic: 'Romântico', occ_corporate: 'Corporativo',
    occ_family: 'Família', occ_show: 'Show / Evento', occ_happyhour: 'Happy Hour',
    occ_just: 'Curtindo mesmo', occ_other: 'Outro motivo',
    step_config: 'Quantas pessoas e qual data?',
    guests: 'Pessoas',
    date: 'Data',
    today: 'Hoje', tomorrow: 'Amanhã', otherDate: 'Outra data:',
    seeSlots: 'Ver horários →',
    step_slots: 'Escolha um horário',
    noAvailability: 'Sem disponibilidade', tryOther: 'Tente outra data ou número de pessoas',
    changeConfig: 'Alterar',
    step_identity: 'Seus dados de contato',
    namePlaceholder: 'Seu nome completo *',
    phonePlaceholder: 'WhatsApp: (00) 00000-0000 *',
    emailPlaceholder: 'E-mail (opcional)',
    step_profile: 'Nos conte um pouco sobre você',
    origin_title: 'Você é de Balneário?',
    org_local: 'Morador local', org_tourist: 'Turista', org_season: 'Temporada', org_second: 'Casa de veraneio',
    freq_title: 'Com que frequência nos visita?',
    frq_weekly: 'Toda semana', frq_biweekly: 'Quinzenal', frq_monthly: 'Mensal',
    frq_rarely: 'Raramente', frq_first: 'Primeira vez',
    step_preferences: 'Preferências & restrições',
    pref_title: 'O que costuma pedir?',
    pref_sub: 'Selecione quantos quiser',
    pref_chopp: 'Chopp', pref_longneck: 'Long Neck', pref_drinks: 'Drinks',
    pref_whisky: 'Whisky', pref_wine: 'Vinho', pref_snacks: 'Petiscos',
    pref_food: 'Pratos', pref_combo: 'Combo completo',
    diet_title: 'Restrições alimentares',
    diet_none: 'Nenhuma', diet_veg: 'Vegetariano', diet_vegan: 'Vegano',
    diet_gf: 'Sem glúten', diet_sea: 'Alergia frutos do mar',
    step_referral: 'Última pergunta!',
    ref_title: 'Como nos conheceu?',
    ref_instagram: 'Instagram', ref_google: 'Google', ref_referral: 'Indicação',
    ref_walk: 'Passei na frente', ref_social: 'Outra rede social',
    terms: 'Li e aceito os Termos de Uso e a Política de Privacidade de',
    required: '*',
    optin: '🎁 Quero receber ofertas e novidades',
    optin_sub: 'Promoções, eventos e dicas exclusivas via WhatsApp.',
    confirm: 'Confirmar reserva',
    confirming: 'Confirmando...',
    success: 'Reserva confirmada! 🎉',
    payDeposit: 'Pague o sinal para confirmar',
    pixExpiresAt: 'Pix • Expira às',
    pixCopyAndPaste: 'Pix copia e cola',
    copied: 'Copiado!', copyPix: 'Copiar código Pix',
    waitingPayment: 'Aguardando confirmação do pagamento...',
    youWillReceiveWhatsApp: 'Você receberá uma confirmação no WhatsApp.',
    makeAnother: 'Fazer outra reserva',
    contactForLargerGroups: 'Para grupos maiores, entre em contato diretamente.',
    poweredBy: 'Powered by TeMesa',
    back: '← Voltar', next: 'Continuar →',
    enterName: 'Informe seu nome', enterPhone: 'Informe seu WhatsApp',
    acceptTerms: 'Aceite os termos para continuar',
    seats: 'lugares',
  },
  EN: {
    onlineReservations: 'Online reservations',
    welcome_title: 'Reserve your table',
    welcome_sub: 'Takes less than 2 minutes. A few questions to personalize your experience.',
    welcome_cta: 'Get started',
    step_occasion: 'What brings you in?',
    occ_birthday: 'Birthday', occ_romantic: 'Romantic', occ_corporate: 'Corporate',
    occ_family: 'Family', occ_show: 'Show / Event', occ_happyhour: 'Happy Hour',
    occ_just: 'Just hanging out', occ_other: 'Other',
    step_config: 'How many guests and which date?',
    guests: 'Guests', date: 'Date',
    today: 'Today', tomorrow: 'Tomorrow', otherDate: 'Other date:',
    seeSlots: 'See times →',
    step_slots: 'Choose a time',
    noAvailability: 'No availability', tryOther: 'Try a different date or party size',
    changeConfig: 'Change',
    step_identity: 'Your contact details',
    namePlaceholder: 'Your full name *',
    phonePlaceholder: 'WhatsApp: (00) 00000-0000 *',
    emailPlaceholder: 'Email (optional)',
    step_profile: 'Tell us about yourself',
    origin_title: 'Are you local?',
    org_local: 'Local resident', org_tourist: 'Tourist', org_season: 'Summer stay', org_second: 'Vacation home',
    freq_title: 'How often do you visit us?',
    frq_weekly: 'Every week', frq_biweekly: 'Biweekly', frq_monthly: 'Monthly',
    frq_rarely: 'Rarely', frq_first: 'First time',
    step_preferences: 'Preferences & restrictions',
    pref_title: 'What do you usually order?',
    pref_sub: 'Select all that apply',
    pref_chopp: 'Draft beer', pref_longneck: 'Long neck', pref_drinks: 'Cocktails',
    pref_whisky: 'Whisky', pref_wine: 'Wine', pref_snacks: 'Snacks',
    pref_food: 'Dishes', pref_combo: 'Full combo',
    diet_title: 'Dietary restrictions',
    diet_none: 'None', diet_veg: 'Vegetarian', diet_vegan: 'Vegan',
    diet_gf: 'Gluten-free', diet_sea: 'Seafood allergy',
    step_referral: 'Last question!',
    ref_title: 'How did you find us?',
    ref_instagram: 'Instagram', ref_google: 'Google', ref_referral: 'Referral',
    ref_walk: 'Walked by', ref_social: 'Other social media',
    terms: 'I have read and accept the Terms of Use and Privacy Policy of',
    required: '*', optin: '🎁 I want to receive offers and news',
    optin_sub: 'Promotions, events and exclusive tips via WhatsApp.',
    confirm: 'Confirm reservation', confirming: 'Confirming...',
    success: 'Reservation confirmed! 🎉',
    payDeposit: 'Pay the deposit to confirm',
    pixExpiresAt: 'Pix • Expires at',
    pixCopyAndPaste: 'Pix copy and paste',
    copied: 'Copied!', copyPix: 'Copy Pix code',
    waitingPayment: 'Waiting for payment confirmation...',
    youWillReceiveWhatsApp: 'You will receive a WhatsApp confirmation.',
    makeAnother: 'Make another reservation',
    contactForLargerGroups: 'For larger groups, contact us directly.',
    poweredBy: 'Powered by TeMesa',
    back: '← Back', next: 'Continue →',
    enterName: 'Please enter your name', enterPhone: 'Please enter your WhatsApp',
    acceptTerms: 'Accept the terms to continue',
    seats: 'seats',
  },
  ES: {
    onlineReservations: 'Reservas online',
    welcome_title: 'Reserva tu mesa',
    welcome_sub: 'Menos de 2 minutos. Algunas preguntas para personalizar tu experiencia.',
    welcome_cta: 'Comenzar',
    step_occasion: '¿Cuál es el motivo de tu visita?',
    occ_birthday: 'Cumpleaños', occ_romantic: 'Romántico', occ_corporate: 'Corporativo',
    occ_family: 'Familia', occ_show: 'Show / Evento', occ_happyhour: 'Happy Hour',
    occ_just: 'Solo a disfrutar', occ_other: 'Otro motivo',
    step_config: '¿Cuántas personas y qué fecha?',
    guests: 'Personas', date: 'Fecha',
    today: 'Hoy', tomorrow: 'Mañana', otherDate: 'Otra fecha:',
    seeSlots: 'Ver horarios →',
    step_slots: 'Elige un horario',
    noAvailability: 'Sin disponibilidad', tryOther: 'Intenta otra fecha o número de personas',
    changeConfig: 'Cambiar',
    step_identity: 'Tus datos de contacto',
    namePlaceholder: 'Tu nombre completo *',
    phonePlaceholder: 'WhatsApp: (00) 00000-0000 *',
    emailPlaceholder: 'Correo electrónico (opcional)',
    step_profile: 'Cuéntanos sobre ti',
    origin_title: '¿Eres local?',
    org_local: 'Residente local', org_tourist: 'Turista', org_season: 'Temporada', org_second: 'Casa de verano',
    freq_title: '¿Con qué frecuencia nos visitas?',
    frq_weekly: 'Cada semana', frq_biweekly: 'Quincenal', frq_monthly: 'Mensual',
    frq_rarely: 'Raramente', frq_first: 'Primera vez',
    step_preferences: 'Preferencias & restricciones',
    pref_title: '¿Qué sueles pedir?',
    pref_sub: 'Selecciona todo lo que aplique',
    pref_chopp: 'Cerveza de barril', pref_longneck: 'Long neck', pref_drinks: 'Cócteles',
    pref_whisky: 'Whisky', pref_wine: 'Vino', pref_snacks: 'Picadas',
    pref_food: 'Platos', pref_combo: 'Combo completo',
    diet_title: 'Restricciones alimentarias',
    diet_none: 'Ninguna', diet_veg: 'Vegetariano', diet_vegan: 'Vegano',
    diet_gf: 'Sin gluten', diet_sea: 'Alergia mariscos',
    step_referral: '¡Última pregunta!',
    ref_title: '¿Cómo nos conociste?',
    ref_instagram: 'Instagram', ref_google: 'Google', ref_referral: 'Recomendación',
    ref_walk: 'Pasé por aquí', ref_social: 'Otra red social',
    terms: 'He leído y acepto los Términos de Uso y la Política de Privacidad de',
    required: '*', optin: '🎁 Quiero recibir ofertas y novedades',
    optin_sub: 'Promociones, eventos y tips exclusivos por WhatsApp.',
    confirm: 'Confirmar reserva', confirming: 'Confirmando...',
    success: '¡Reserva confirmada! 🎉',
    payDeposit: 'Paga el depósito para confirmar',
    pixExpiresAt: 'Pix • Expira a las',
    pixCopyAndPaste: 'Pix copia y pega',
    copied: '¡Copiado!', copyPix: 'Copiar código Pix',
    waitingPayment: 'Esperando confirmación del pago...',
    youWillReceiveWhatsApp: 'Recibirás una confirmación por WhatsApp.',
    makeAnother: 'Hacer otra reserva',
    contactForLargerGroups: 'Para grupos más grandes, contáctanos directamente.',
    poweredBy: 'Powered by TeMesa',
    back: '← Volver', next: 'Continuar →',
    enterName: 'Ingresa tu nombre', enterPhone: 'Ingresa tu WhatsApp',
    acceptTerms: 'Acepta los términos para continuar',
    seats: 'lugares',
  },
} as const

type Lang = keyof typeof T

// ── Componente SelectCard inline ─────────────────────────────────────────────
// (sem dependência externa — ícone + label + seleção)

function SelectCard({
  icon, label, selected, onClick, primary,
}: {
  icon: ReactNode
  label: string
  selected: boolean
  onClick: () => void
  primary: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 text-center transition-all',
        'hover:scale-[1.03] active:scale-[0.97]',
        selected
          ? 'text-white scale-[1.03] shadow-lg'
          : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500',
      )}
      style={selected ? { backgroundColor: primary, borderColor: primary } : {}}
    >
      <span className="opacity-90">{icon}</span>
      <span className="text-[11px] font-semibold leading-tight">{label}</span>
    </button>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ step, primary }: { step: Step; primary: string }) {
  const idx = STEPS_ORDERED.indexOf(step)
  const total = STEPS_ORDERED.length
  const pct = idx < 0 ? 100 : Math.round(((idx + 1) / total) * 100)
  return (
    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: primary }}
      />
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Restaurant {
  id: string; name: string; slug: string
  logoUrl?: string | null; coverUrl?: string | null
  themeConfig?: Record<string, unknown> | null
}

const GUEST_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8]
const ICON_SIZE = 22

export function BookingWidget({ restaurant }: { restaurant: Restaurant }) {
  const [lang, setLang] = useState<Lang>('PT')
  const [step, setStep] = useState<Step>('welcome')
  const [form, setForm] = useState<FormData>(DEFAULT_FORM)
  const [pixData, setPixData] = useState<{
    pixCode: string; pixQrCodeUrl: string; amountCents: number; expiresAt: Date; prepaymentRecordId: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const t = T[lang]
  const primary = (restaurant.themeConfig?.primaryColor as string) ?? '#C8A96E'
  const radius  = (restaurant.themeConfig?.borderRadius  as string) ?? '0.75rem'

  // ── tRPC ─────────────────────────────────────────────────────────────────

  const { data: slots, isLoading: slotsLoading } = api.widget.getAvailableSlots.useQuery(
    { slug: restaurant.slug, date: form.date, partySize: form.partySize },
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

  const { data: paymentStatus } = api.widget.getPaymentStatus.useQuery(
    { prepaymentRecordId: pixData?.prepaymentRecordId ?? '' },
    { enabled: step === 'pix' && !!pixData?.prepaymentRecordId, refetchInterval: 5000 }
  )
  useEffect(() => {
    if (paymentStatus?.status === 'PAID') setStep('success')
  }, [paymentStatus])

  // ── Helpers ───────────────────────────────────────────────────────────────

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const toggleArr = (key: 'consumptionPreferences' | 'dietaryRestrictions', val: string) => {
    const cur = form[key] as string[]
    set(key, cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val])
  }

  const today    = format(new Date(), 'yyyy-MM-dd')
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  const normalizeToE164 = (raw: string): string => {
    const digits = raw.replace(/\D/g, '')
    if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`
    return `+55${digits}`
  }

  // Disparar OPTIN_ACCEPTED para o BC Connect (fire-and-forget no cliente)
  const fireOptinEvent = useCallback((checked: boolean) => {
    if (!checked) return
    fetch('/api/bc-connect/optin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantSlug: restaurant.slug,
        guestPhone: form.phone.trim() || null,
        guestEmail: form.email.trim() || null,
        guestName: form.name.trim() || null,
      }),
    }).catch(() => { /* silencioso */ })
  }, [restaurant.slug, form.phone, form.email, form.name])

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error(t.enterName)
    if (!form.phone.trim()) return toast.error(t.enterPhone)
    if (!form.lgpd) return toast.error(t.acceptTerms)
    if (!form.selectedSlot) return

    create.mutate({
      slug: restaurant.slug,
      guestName: form.name,
      guestPhone: normalizeToE164(form.phone),
      guestEmail: form.email || undefined,
      partySize: form.partySize,
      date: new Date(`${form.date}T${form.selectedSlot.startTime}:00`),
      shiftId: form.selectedSlot.shiftId,
      occasion: form.occasionType || undefined,
      dietaryNotes: form.dietaryRestrictions.join(', ') || undefined,
      lgpdConsent: form.lgpd,
      originType: form.originType || undefined,
      visitFrequency: form.visitFrequency || undefined,
      consumptionPreferences: form.consumptionPreferences.length ? form.consumptionPreferences : undefined,
      referralSource: form.referralSource || undefined,
      optinMarketing: form.optinMarketing,
    })
  }

  const copyPix = useCallback(() => {
    if (!pixData) return
    navigator.clipboard.writeText(pixData.pixCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [pixData])

  const resetAndStart = () => {
    setStep('welcome')
    setForm(DEFAULT_FORM)
    setPixData(null)
    setCopied(false)
  }

  // ── Animação ──────────────────────────────────────────────────────────────

  const anim = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
    transition: { duration: 0.25 },
  }

  // Datas rápidas
  const quickDates = [
    { value: today,                         label: t.today,    sub: format(new Date(), 'EEE', { locale: ptBR }) },
    { value: tomorrow,                      label: t.tomorrow, sub: format(addDays(new Date(), 1), 'EEE', { locale: ptBR }) },
    { value: format(addDays(new Date(), 2), 'yyyy-MM-dd'), label: format(addDays(new Date(), 2), 'dd MMM', { locale: ptBR }), sub: format(addDays(new Date(), 2), 'EEE', { locale: ptBR }) },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-start justify-center py-8 px-4" style={{ background: '#0a0a0a' }}>
      <div className="w-full max-w-md">

        {/* Cabeçalho do restaurante */}
        <div className="text-center mb-5">
          {restaurant.logoUrl ? (
            <img src={restaurant.logoUrl} alt={restaurant.name}
              className="w-14 h-14 rounded-full mx-auto mb-3 object-cover ring-2 ring-white/10" />
          ) : (
            <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center text-xl font-bold text-white ring-2 ring-white/10"
              style={{ backgroundColor: primary }}>
              {restaurant.name[0]}
            </div>
          )}
          <h1 className="text-base font-semibold text-white tracking-widest uppercase">{restaurant.name}</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{t.onlineReservations}</p>
        </div>

        {/* Barra de progresso — apenas nos steps de coleta */}
        {step !== 'welcome' && step !== 'pix' && step !== 'success' && (
          <div className="mb-4">
            <ProgressBar step={step} primary={primary} />
          </div>
        )}

        <AnimatePresence mode="wait">

          {/* ── WELCOME ─────────────────────────────────────────────────── */}
          {step === 'welcome' && (
            <motion.div key="welcome" {...anim}>
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 text-center space-y-5">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                  style={{ backgroundColor: `${primary}22`, border: `2px solid ${primary}44` }}>
                  <Calendar className="w-8 h-8" style={{ color: primary }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">{t.welcome_title}</h2>
                  <p className="text-sm text-zinc-400 leading-relaxed">{t.welcome_sub}</p>
                </div>
                <button
                  onClick={() => setStep('occasion')}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: primary, borderRadius: radius }}
                >
                  {t.welcome_cta}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── OCCASION ────────────────────────────────────────────────── */}
          {step === 'occasion' && (
            <motion.div key="occasion" {...anim}>
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
                  <button onClick={() => setStep('welcome')} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <p className="text-sm font-semibold text-white flex-1 text-center pr-8">{t.step_occasion}</p>
                </div>
                <div className="p-4 grid grid-cols-2 gap-2">
                  {([
                    { icon: <Cake size={ICON_SIZE} />,        label: t.occ_birthday,  value: 'BIRTHDAY'   },
                    { icon: <Heart size={ICON_SIZE} />,       label: t.occ_romantic,  value: 'ROMANTIC'   },
                    { icon: <Briefcase size={ICON_SIZE} />,   label: t.occ_corporate, value: 'CORPORATE'  },
                    { icon: <UsersRound size={ICON_SIZE} />,  label: t.occ_family,    value: 'FAMILY'     },
                    { icon: <Music size={ICON_SIZE} />,       label: t.occ_show,      value: 'SHOW'       },
                    { icon: <Beer size={ICON_SIZE} />,        label: t.occ_happyhour, value: 'HAPPY_HOUR' },
                    { icon: <Smile size={ICON_SIZE} />,       label: t.occ_just,      value: 'JUST'       },
                    { icon: <Pencil size={ICON_SIZE} />,      label: t.occ_other,     value: 'OTHER'      },
                  ] as const).map((o) => (
                    <SelectCard key={o.value} icon={o.icon} label={o.label} primary={primary}
                      selected={form.occasionType === o.value}
                      onClick={() => { set('occasionType', o.value); setStep('config') }} />
                  ))}
                </div>
                <div className="px-4 pb-4">
                  <button onClick={() => setStep('config')} className="w-full text-xs text-zinc-600 hover:text-zinc-400 underline transition-colors">
                    Pular →
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── CONFIG (grupo + data) ────────────────────────────────────── */}
          {step === 'config' && (
            <motion.div key="config" {...anim}>
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
                  <button onClick={() => setStep('occasion')} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <p className="text-sm font-semibold text-white flex-1 text-center pr-8">{t.step_config}</p>
                </div>

                {/* Pessoas */}
                <div className="p-5 border-b border-zinc-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-medium text-white">{t.guests}</span>
                  </div>
                  <div className="grid grid-cols-8 gap-1.5">
                    {GUEST_OPTIONS.map((n) => (
                      <button key={n} onClick={() => set('partySize', n)}
                        className={cn('h-9 rounded-lg text-sm font-semibold transition-all',
                          form.partySize === n ? 'text-white scale-105 shadow-lg' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white')}
                        style={form.partySize === n ? { backgroundColor: primary } : {}}>
                        {n}
                      </button>
                    ))}
                  </div>
                  {form.partySize === 8 && (
                    <p className="text-xs text-zinc-500 mt-2 text-center">{t.contactForLargerGroups}</p>
                  )}
                </div>

                {/* Data */}
                <div className="p-5 border-b border-zinc-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-medium text-white">{t.date}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {quickDates.map((d) => (
                      <button key={d.value} onClick={() => set('date', d.value)}
                        className={cn('py-2.5 px-3 rounded-xl text-center transition-all',
                          form.date === d.value ? 'text-white scale-[1.02]' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700')}
                        style={form.date === d.value ? { backgroundColor: primary } : {}}>
                        <p className="text-sm font-semibold">{d.label}</p>
                        <p className="text-[10px] opacity-70 capitalize">{d.sub}</p>
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors whitespace-nowrap">{t.otherDate}</span>
                    <input type="date" value={form.date} min={today}
                      onChange={(e) => set('date', e.target.value)}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-zinc-500 transition-colors" />
                  </label>
                </div>

                <div className="p-5">
                  <button onClick={() => setStep('slots')}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                    style={{ backgroundColor: primary, borderRadius: radius }}>
                    {t.seeSlots}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── SLOTS ───────────────────────────────────────────────────── */}
          {step === 'slots' && (
            <motion.div key="slots" {...anim}>
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
                  <button onClick={() => setStep('config')} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex-1 text-center">
                    <p className="text-sm font-semibold text-white">
                      {form.date === today ? t.today : form.date === tomorrow ? t.tomorrow
                        : format(new Date(form.date + 'T12:00'), "EEE, dd 'de' MMM", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-zinc-500">{form.partySize} pessoa{form.partySize > 1 ? 's' : ''}</p>
                  </div>
                  <div className="w-8" />
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-medium text-white">{t.step_slots}</span>
                  </div>

                  {slotsLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                    </div>
                  ) : !slots?.length ? (
                    <div className="text-center py-10 space-y-3">
                      <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto" />
                      <div>
                        <p className="text-sm text-zinc-400 font-medium">{t.noAvailability}</p>
                        <p className="text-xs text-zinc-600 mt-1">{t.tryOther}</p>
                      </div>
                      <button onClick={() => setStep('config')} className="text-xs underline text-zinc-500 hover:text-zinc-300">
                        {t.changeConfig}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {slots.map((slot) => (
                        <button key={slot.shiftId}
                          onClick={() => {
                            set('selectedSlot', {
                              shiftId: slot.shiftId,
                              shiftName: slot.shiftName,
                              startTime: slot.startTime,
                              availableSeats: slot.availableSeats,
                            })
                            setStep('identity')
                          }}
                          className="group relative py-4 px-3 rounded-xl border border-zinc-700 hover:border-transparent text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = primary)}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                          <p className="text-lg font-bold text-white">{slot.startTime}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{slot.shiftName}</p>
                          {slot.availableSeats > 0 && (
                            <p className="text-[10px] text-zinc-600 mt-1">{slot.availableSeats} {t.seats}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── IDENTITY (dados pessoais) ────────────────────────────────── */}
          {step === 'identity' && (
            <motion.div key="identity" {...anim}>
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
                  <button onClick={() => setStep('slots')} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex-1 text-center">
                    <div className="flex items-center gap-2 justify-center flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: primary }}>
                        {form.selectedSlot?.startTime}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {form.partySize} pessoa{form.partySize > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <p className="text-sm font-semibold text-white mb-1">{t.step_identity}</p>
                  <input type="text" placeholder={t.namePlaceholder} value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-zinc-500 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors" />
                  <input type="tel" placeholder={t.phonePlaceholder} value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-zinc-500 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors" />
                  <input type="email" placeholder={t.emailPlaceholder} value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-zinc-500 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors" />

                  <button
                    onClick={() => {
                      if (!form.name.trim()) return toast.error(t.enterName)
                      if (!form.phone.trim()) return toast.error(t.enterPhone)
                      setStep('profile')
                    }}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white mt-1 transition-all hover:opacity-90 active:scale-[0.98]"
                    style={{ backgroundColor: primary, borderRadius: radius }}>
                    {t.next}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PROFILE (origem + frequência) ────────────────────────────── */}
          {step === 'profile' && (
            <motion.div key="profile" {...anim}>
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
                  <button onClick={() => setStep('identity')} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <p className="text-sm font-semibold text-white flex-1 text-center pr-8">{t.step_profile}</p>
                </div>

                <div className="p-4 space-y-5">
                  {/* Origem */}
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">{t.origin_title}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { icon: <MapPin size={ICON_SIZE} />,    label: t.org_local,   value: 'LOCAL'       },
                        { icon: <Waves size={ICON_SIZE} />,     label: t.org_tourist, value: 'TOURIST'     },
                        { icon: <Umbrella size={ICON_SIZE} />,  label: t.org_season,  value: 'SEASON'      },
                        { icon: <Key size={ICON_SIZE} />,       label: t.org_second,  value: 'SECOND_HOME' },
                      ] as const).map((o) => (
                        <SelectCard key={o.value} icon={o.icon} label={o.label} primary={primary}
                          selected={form.originType === o.value}
                          onClick={() => set('originType', o.value)} />
                      ))}
                    </div>
                  </div>

                  {/* Frequência */}
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">{t.freq_title}</p>
                    <div className="grid grid-cols-1 gap-2">
                      {([
                        { icon: <Flame size={ICON_SIZE} />,        label: t.frq_weekly,   value: 'WEEKLY'     },
                        { icon: <Calendar size={ICON_SIZE} />,     label: t.frq_biweekly, value: 'BIWEEKLY'   },
                        { icon: <CalendarDays size={ICON_SIZE} />, label: t.frq_monthly,  value: 'MONTHLY'    },
                        { icon: <History size={ICON_SIZE} />,      label: t.frq_rarely,   value: 'RARELY'     },
                        { icon: <Star size={ICON_SIZE} />,         label: t.frq_first,    value: 'FIRST_TIME' },
                      ] as const).map((o) => (
                        <button key={o.value} type="button"
                          onClick={() => set('visitFrequency', o.value)}
                          className={cn(
                            'flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all hover:scale-[1.01]',
                            form.visitFrequency === o.value
                              ? 'text-white'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500',
                          )}
                          style={form.visitFrequency === o.value ? { backgroundColor: primary, borderColor: primary } : {}}>
                          <span className="opacity-80 shrink-0">{o.icon}</span>
                          <span className="text-sm font-medium">{o.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setStep('preferences')}
                      className="flex-1 py-3 rounded-xl text-xs text-zinc-500 hover:text-zinc-300 underline transition-colors">
                      Pular
                    </button>
                    <button
                      onClick={() => setStep('preferences')}
                      className="flex-[3] py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                      style={{ backgroundColor: primary, borderRadius: radius }}>
                      {t.next}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PREFERENCES ─────────────────────────────────────────────── */}
          {step === 'preferences' && (
            <motion.div key="preferences" {...anim}>
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
                  <button onClick={() => setStep('profile')} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <p className="text-sm font-semibold text-white flex-1 text-center pr-8">{t.step_preferences}</p>
                </div>

                <div className="p-4 space-y-5">
                  {/* Preferências de consumo */}
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">{t.pref_title}</p>
                    <p className="text-[11px] text-zinc-600 mb-3">{t.pref_sub}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { icon: <Beer size={ICON_SIZE} />,       label: t.pref_chopp,    value: 'CHOPP'    },
                        { icon: <Beer size={ICON_SIZE} />,       label: t.pref_longneck, value: 'LONGNECK' },
                        { icon: <GlassWater size={ICON_SIZE} />, label: t.pref_drinks,   value: 'DRINKS'   },
                        { icon: <GlassWater size={ICON_SIZE} />, label: t.pref_whisky,   value: 'WHISKY'   },
                        { icon: <Wine size={ICON_SIZE} />,       label: t.pref_wine,     value: 'VINHO'    },
                        { icon: <Sandwich size={ICON_SIZE} />,   label: t.pref_snacks,   value: 'PETISCOS' },
                        { icon: <Utensils size={ICON_SIZE} />,   label: t.pref_food,     value: 'PRATOS'   },
                        { icon: <Gift size={ICON_SIZE} />,       label: t.pref_combo,    value: 'COMBO'    },
                      ] as const).map((o) => (
                        <SelectCard key={o.value} icon={o.icon} label={o.label} primary={primary}
                          selected={form.consumptionPreferences.includes(o.value)}
                          onClick={() => toggleArr('consumptionPreferences', o.value)} />
                      ))}
                    </div>
                  </div>

                  {/* Restrições dietéticas */}
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">{t.diet_title}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { icon: <CheckCircle2 size={ICON_SIZE} />, label: t.diet_none, value: 'NONE'        },
                        { icon: <Leaf size={ICON_SIZE} />,         label: t.diet_veg,  value: 'VEGETARIAN'  },
                        { icon: <Sprout size={ICON_SIZE} />,       label: t.diet_vegan,value: 'VEGAN'       },
                        { icon: <Wheat size={ICON_SIZE} />,        label: t.diet_gf,   value: 'GLUTEN_FREE' },
                        { icon: <Fish size={ICON_SIZE} />,         label: t.diet_sea,  value: 'SEAFOOD'     },
                      ] as const).map((o) => (
                        <SelectCard key={o.value} icon={o.icon} label={o.label} primary={primary}
                          selected={form.dietaryRestrictions.includes(o.value)}
                          onClick={() => toggleArr('dietaryRestrictions', o.value)} />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setStep('referral')}
                      className="flex-1 py-3 rounded-xl text-xs text-zinc-500 hover:text-zinc-300 underline transition-colors">
                      Pular
                    </button>
                    <button onClick={() => setStep('referral')}
                      className="flex-[3] py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                      style={{ backgroundColor: primary, borderRadius: radius }}>
                      {t.next}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── REFERRAL + LGPD ─────────────────────────────────────────── */}
          {step === 'referral' && (
            <motion.div key="referral" {...anim}>
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
                  <button onClick={() => setStep('preferences')} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <p className="text-sm font-semibold text-white flex-1 text-center pr-8">{t.step_referral}</p>
                </div>

                <div className="p-4 space-y-5">
                  {/* Como conheceu */}
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">{t.ref_title}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { icon: <Share2 size={ICON_SIZE} />, label: t.ref_instagram, value: 'INSTAGRAM' },
                        { icon: <Globe size={ICON_SIZE} />,     label: t.ref_google,    value: 'GOOGLE'    },
                        { icon: <Users size={ICON_SIZE} />,     label: t.ref_referral,  value: 'REFERRAL'  },
                        { icon: <MapPin size={ICON_SIZE} />,    label: t.ref_walk,      value: 'WALK_BY'   },
                        { icon: <Tv size={ICON_SIZE} />,        label: t.ref_social,    value: 'SOCIAL'    },
                        { icon: <Phone size={ICON_SIZE} />,     label: 'Outro',         value: 'OTHER'     },
                      ] as const).map((o) => (
                        <SelectCard key={o.value} icon={o.icon} label={o.label} primary={primary}
                          selected={form.referralSource === o.value}
                          onClick={() => set('referralSource', o.value)} />
                      ))}
                    </div>
                  </div>

                  {/* Checkboxes LGPD + optin */}
                  <div className="space-y-3 pt-1 border-t border-zinc-800">
                    {/* LGPD — obrigatório */}
                    <label className="flex items-start gap-3 cursor-pointer">
                      <div
                        onClick={() => set('lgpd', !form.lgpd)}
                        className={cn(
                          'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
                          form.lgpd ? 'border-transparent' : 'border-zinc-600 bg-transparent',
                        )}
                        style={form.lgpd ? { backgroundColor: primary } : {}}>
                        {form.lgpd && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                      <div>
                        <span className="text-xs text-zinc-400 leading-relaxed">
                          {t.terms} {restaurant.name}. <span className="text-red-400">{t.required}</span>
                        </span>
                      </div>
                    </label>

                    {/* Opt-in marketing — opcional */}
                    <label className="flex items-start gap-3 cursor-pointer">
                      <div
                        onClick={() => {
                          const newVal = !form.optinMarketing
                          set('optinMarketing', newVal)
                          if (newVal) fireOptinEvent(true)
                        }}
                        className={cn(
                          'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
                          form.optinMarketing ? 'border-transparent' : 'border-zinc-600 bg-transparent',
                        )}
                        style={form.optinMarketing ? { backgroundColor: primary } : {}}>
                        {form.optinMarketing && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-200">{t.optin}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{t.optin_sub}</p>
                      </div>
                    </label>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={create.isPending || !form.lgpd}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: primary, borderRadius: radius }}>
                    {create.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> {t.confirming}
                      </span>
                    ) : t.confirm}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PIX ─────────────────────────────────────────────────────── */}
          {step === 'pix' && pixData && (
            <motion.div key="pix" {...anim}>
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
                  <button onClick={copyPix}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
                    style={{ backgroundColor: primary }}>
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

          {/* ── SUCCESS ─────────────────────────────────────────────────── */}
          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 text-center space-y-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                  style={{ backgroundColor: `${primary}33`, border: `2px solid ${primary}` }}>
                  <CheckCircle2 className="w-8 h-8" style={{ color: primary }} />
                </motion.div>
                <div>
                  <p className="text-lg font-bold text-white mb-1">{t.success}</p>
                  <p className="text-sm text-zinc-400">
                    Olá {form.name.split(' ')[0]}! Sua reserva no{' '}
                    <strong className="text-white">{restaurant.name}</strong> está confirmada.
                  </p>
                  <div className="mt-4 p-3 bg-zinc-800 rounded-xl space-y-1.5 text-left">
                    <p className="text-xs text-zinc-300">
                      📅 {form.date === today ? 'Hoje' : form.date === tomorrow ? 'Amanhã'
                        : format(new Date(form.date + 'T12:00'), "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-zinc-300">⏰ {form.selectedSlot?.startTime}</p>
                    <p className="text-xs text-zinc-300">👥 {form.partySize} pessoa{form.partySize > 1 ? 's' : ''}</p>
                    {form.occasionType && form.occasionType !== 'JUST' && (
                      <p className="text-xs text-zinc-300">🎉 {form.occasionType}</p>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-3">{t.youWillReceiveWhatsApp}</p>
                </div>
                <button onClick={resetAndStart}
                  className="text-xs text-zinc-500 hover:text-zinc-300 underline transition-colors">
                  {t.makeAnother}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Idioma + footer */}
        <div className="flex items-center justify-center gap-4 mt-5">
          {(['PT', 'EN', 'ES'] as const).map((l) => (
            <button key={l} onClick={() => setLang(l)}
              className={cn('text-[10px] font-medium transition-colors',
                l === lang ? 'text-zinc-400' : 'text-zinc-600 hover:text-zinc-400')}>
              {l}
            </button>
          ))}
        </div>
        <p className="text-center text-[10px] text-zinc-700 mt-2">{t.poweredBy}</p>
      </div>
    </div>
  )
}
