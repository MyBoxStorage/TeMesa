'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronRight, UtensilsCrossed, LayoutGrid, Bell, Clock } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/field'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import confetti from 'canvas-confetti'

const STEPS = [
  { id: 0, icon: UtensilsCrossed, label: 'Restaurante', title: 'Bem-vindo ao TeMesa', sub: 'Comece configurando as informações do seu restaurante.' },
  { id: 1, icon: Clock,           label: 'Turnos',      title: 'Configure seus turnos', sub: 'Defina os horários de atendimento para reservas.' },
  { id: 2, icon: LayoutGrid,      label: 'Mesas',       title: 'Crie seu mapa de mesas', sub: 'Monte o layout visual do seu salão.' },
  { id: 3, icon: Bell,            label: 'Notificações',title: 'Ative as notificações', sub: 'Seus clientes recebem confirmações automáticas via WhatsApp.' },
]

const schema0 = z.object({
  name:  z.string().min(2, 'Mínimo 2 caracteres'),
  phone: z.string().min(10, 'Telefone inválido'),
  slug:  z.string().min(2).regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
})

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)

  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [inviteApplied, setInviteApplied] = useState(false)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('pendingInviteToken') : null
    if (token) setInviteToken(token)
  }, [])

  const { data: pendingInvite } = api.admin.getInviteByToken.useQuery(
    { token: inviteToken! },
    { enabled: !!inviteToken, retry: false }
  )

  const markInviteUsedByToken = api.admin.markInviteUsedByToken.useMutation({
    onSuccess: () => {
      if (typeof window !== 'undefined') sessionStorage.removeItem('pendingInviteToken')
    },
    onError: (e) => console.error('[Onboarding] Falha ao marcar convite como usado:', e.message),
  })

  const createRestaurant = api.restaurant.create.useMutation({
    onSuccess: () => {
      if (inviteToken) markInviteUsedByToken.mutate({ token: inviteToken })
      setStep(1)
      toast.success('Restaurante criado!')
    },
    onError: (e) => toast.error(e.message),
  })

  const form0 = useForm({ resolver: zodResolver(schema0), defaultValues: { name: '', phone: '', slug: '' } })

  const pendingInviteValid = Boolean(
    pendingInvite &&
    pendingInvite.status === 'PENDING' &&
    pendingInvite.expiresAt > new Date()
  )

  useEffect(() => {
    if (!pendingInvite || inviteApplied) return
    if (pendingInvite.status !== 'PENDING' || pendingInvite.expiresAt <= new Date()) return
    const slug = pendingInvite.restaurantName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    form0.setValue('name', pendingInvite.restaurantName)
    form0.setValue('slug', slug)
    setInviteApplied(true)
  }, [pendingInvite, inviteApplied, form0])

  const handleFinish = () => {
    setDone(true)
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#000000', '#ffffff', '#f59e0b'] })
    setTimeout(() => router.push('/dashboard/reservas'), 2000)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold">Tudo pronto!</h2>
          <p className="text-muted-foreground text-sm">Redirecionando para o painel...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center">
            <UtensilsCrossed className="w-4.5 h-4.5 text-background" />
          </div>
          <span className="text-xl font-bold tracking-tight">TeMesa</span>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-all duration-300',
                i < step  ? 'bg-green-500 text-white' :
                i === step ? 'bg-foreground text-background ring-4 ring-foreground/20' :
                             'bg-muted text-muted-foreground'
              )}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('w-8 h-px transition-colors duration-300', i < step ? 'bg-green-500' : 'bg-border')} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="bg-card border border-border rounded-2xl p-8 shadow-sm"
        >
          {/* Header */}
          <div className="mb-6">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">
              Passo {step + 1} de {STEPS.length}
            </p>
            <h1 className="text-[22px] font-bold mb-1">{STEPS[step].title}</h1>
            <p className="text-[13px] text-muted-foreground">{STEPS[step].sub}</p>
          </div>

          {/* Invite banner */}
          {pendingInviteValid && step === 0 && pendingInvite && (
            <div className="mb-4 px-3 py-2.5 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2">
              <span className="text-green-400 text-sm">✅</span>
              <p className="text-[12px] text-green-300">
                Convite detectado — dados pré-preenchidos para <strong>{pendingInvite.restaurantName}</strong>
              </p>
            </div>
          )}

          {/* Step content */}
          {step === 0 && (
            <Form {...form0}>
              <form onSubmit={form0.handleSubmit(v => createRestaurant.mutate({ ...v, address: {} }))} className="space-y-4">
                <FormField control={form0.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[12px]">Nome do restaurante *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Restaurante Bela Vista" className="h-10" />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )} />
                <FormField control={form0.control} name="slug" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[12px]">Slug (URL do widget) *</FormLabel>
                    <FormControl>
                      <div className="flex items-center border border-input rounded-md overflow-hidden h-10">
                        <span className="px-3 text-[12px] text-muted-foreground bg-muted/50 border-r border-input h-full flex items-center">
                          temesa.app/r/
                        </span>
                        <input
                          {...field}
                          className="flex-1 px-3 text-[13px] bg-transparent outline-none"
                          placeholder="meu-restaurante"
                          onChange={e => field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )} />
                <FormField control={form0.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[12px]">Telefone WhatsApp *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+55 47 99999-9999" className="h-10" />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )} />
                <StepFooter
                  onSkip={() => setStep(1)}
                  isSubmit loading={createRestaurant.isPending}
                />
              </form>
            </Form>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-[13px] text-muted-foreground">
                Configure os turnos depois em <strong>Configurações → Turnos</strong>. Por padrão, o sistema usará horários genéricos até você personalizar.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {['Almoço 12h–15h', 'Jantar 19h–23h'].map(s => (
                  <div key={s} className="p-3 border border-border rounded-lg bg-muted/30 text-[12px] text-center font-medium">
                    {s}
                  </div>
                ))}
              </div>
              <StepFooter onSkip={() => setStep(2)} onNext={() => setStep(2)} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-[13px] text-muted-foreground">
                Monte o mapa do seu salão no editor visual. Você pode fazer isso depois também — acesse <strong>Mesas</strong> no menu lateral.
              </p>
              <div className="h-28 bg-muted/30 border border-dashed border-border rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <LayoutGrid className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-[12px] text-muted-foreground">Editor de mesas disponível após criação</p>
                </div>
              </div>
              <StepFooter onSkip={() => setStep(3)} onNext={() => setStep(3)} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-[13px] text-muted-foreground">
                Seus clientes receberão automaticamente:
              </p>
              <ul className="space-y-2">
                {[
                  '✅ Confirmação de reserva (WhatsApp)',
                  '⏰ Lembrete 24h antes',
                  '🍽️ Lembrete 2h antes',
                  '🙏 Agradecimento pós-visita',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2 text-[13px]">
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[12px] text-muted-foreground">
                Configure os templates em <strong>Configurações → Notificações</strong>.
              </p>
              <StepFooter onSkip={handleFinish} onNext={handleFinish} nextLabel="Concluir 🎉" />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

function StepFooter({
  onSkip, onNext, isSubmit, loading, nextLabel = 'Próximo',
}: {
  onSkip: () => void
  onNext?: () => void
  isSubmit?: boolean
  loading?: boolean
  nextLabel?: string
}) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
      <button onClick={onSkip} className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
        Pular por agora
      </button>
      {isSubmit ? (
        <Button type="submit" size="sm" className="h-9 gap-1.5" disabled={loading}>
          {loading ? 'Criando...' : nextLabel}
          {!loading && <ChevronRight className="w-3.5 h-3.5" />}
        </Button>
      ) : (
        <Button size="sm" className="h-9 gap-1.5" onClick={onNext}>
          {nextLabel}
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  )
}
