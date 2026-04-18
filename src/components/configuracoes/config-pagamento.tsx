'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import { AlertTriangle, Zap, ZapOff, ChevronDown, ChevronUp, Info, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

const OCCASION_OPTIONS = [
  { value: 'BIRTHDAY', label: 'Aniversário' },
  { value: 'ROMANTIC', label: 'Romântico' },
  { value: 'CORPORATE', label: 'Corporativo' },
  { value: 'FAMILY', label: 'Família' },
  { value: 'SHOW', label: 'Show / Evento' },
  { value: 'HAPPY_HOUR', label: 'Happy Hour' },
  { value: 'JUST', label: 'Casual' },
  { value: 'OTHER', label: 'Outro' },
] as const

const schema = z.object({
  prepayment_type: z.enum(['POR_PESSOA', 'VALOR_FIXO', 'PERCENTUAL']),
  prepayment_amount: z.number().min(0),
  prepayment_applies_to: z.enum(['TODAS_RESERVAS', 'FERIADOS', 'FINAIS_DE_SEMANA', 'MANUAL']),
  no_show_policy: z.enum(['COBRAR_TOTAL', 'COBRAR_PARCIAL', 'REEMBOLSAR', 'CREDITO']),
  cancellation_deadline_hours: z.number().int().min(0),
  prepayment_expiry_minutes: z.number().int().min(5),
  upsell_occasions: z.array(z.string()).optional(),
  upsell_message: z.string().optional(),
  upsell_package_name: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const TYPE_LABELS: Record<string, string> = {
  POR_PESSOA: 'Por pessoa', VALOR_FIXO: 'Valor fixo (R$)', PERCENTUAL: 'Percentual do total',
}
const APPLIES_LABELS: Record<string, string> = {
  TODAS_RESERVAS: 'Todas as reservas',
  FERIADOS: 'Apenas feriados',
  FINAIS_DE_SEMANA: 'Apenas fins de semana',
  MANUAL: 'Seleção manual por reserva',
}
const NOSHOW_LABELS: Record<string, string> = {
  COBRAR_TOTAL: 'Reter valor total pago',
  COBRAR_PARCIAL: 'Reter parcialmente',
  REEMBOLSAR: 'Devolver integral',
  CREDITO: 'Converter em crédito',
}

export function ConfigPagamento({ restaurantId }: { restaurantId: string }) {
  const { data, isLoading, refetch } = api.restaurant.getPrepaymentConfig.useQuery({ restaurantId })
  const [showConfig, setShowConfig] = useState(false)

  const cfg = data?.config as Record<string, unknown> | null
  const enabled = cfg?.prepayment_enabled === true
  const planOk  = data?.plan !== 'GRATUITO'
  const addonActive = data?.noShowProtectionAddon === true

  // Mutation separada só para ligar/desligar — salva instantaneamente
  const toggle = api.restaurant.updatePrepaymentConfig.useMutation({
    onSuccess: (_, vars) => {
      refetch()
      if (vars.prepayment_enabled) {
        toast.success('Sinal Pix ativado — clientes pagarão antes de confirmar')
        setShowConfig(true)
      } else {
        toast.success('Sinal Pix desativado — reservas gratuitas como padrão')
        setShowConfig(false)
      }
    },
    onError: (e) => toast.error(e.message),
  })

  // Mutation para salvar os detalhes de configuração
  const save = api.restaurant.updatePrepaymentConfig.useMutation({
    onSuccess: () => { refetch(); toast.success('Configurações salvas!') },
    onError: (e) => toast.error(e.message),
  })

  const toggleAddon = api.restaurant.toggleNoShowProtection.useMutation({
    onSuccess: () => {
      void refetch()
      toast.success('Add-on atualizado')
    },
    onError: (e) => toast.error(e.message),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      prepayment_type: 'POR_PESSOA',
      prepayment_amount: 50,
      prepayment_applies_to: 'TODAS_RESERVAS',
      no_show_policy: 'REEMBOLSAR',
      cancellation_deadline_hours: 24,
      prepayment_expiry_minutes: 30,
      upsell_occasions: [],
      upsell_message: '',
      upsell_package_name: '',
    },
  })

  useEffect(() => {
    if (cfg) {
      form.reset({
        prepayment_type: (cfg.prepayment_type as FormValues['prepayment_type']) ?? 'POR_PESSOA',
        prepayment_amount: Number(cfg.prepayment_amount ?? 50),
        prepayment_applies_to: (cfg.prepayment_applies_to as FormValues['prepayment_applies_to']) ?? 'TODAS_RESERVAS',
        no_show_policy: (cfg.no_show_policy as FormValues['no_show_policy']) ?? 'REEMBOLSAR',
        cancellation_deadline_hours: Number(cfg.cancellation_deadline_hours ?? 24),
        prepayment_expiry_minutes: Number(cfg.prepayment_expiry_minutes ?? 30),
        upsell_occasions: (cfg.upsell_occasions as string[] | undefined) ?? [],
        upsell_message: (cfg.upsell_message as string | undefined) ?? '',
        upsell_package_name: (cfg.upsell_package_name as string | undefined) ?? '',
      })
    }
  }, [cfg, form])

  const handleToggle = (next: boolean) => {
    if (!planOk) return
    if (next && !addonActive) {
      toast.error('Ative o add-on Proteção No-Show antes de cobrar sinal Pix.')
      return
    }
    toggle.mutate({
      restaurantId,
      prepayment_enabled: next,
      ...(next ? { ...form.getValues() } : {}),
    })
  }

  const handleSaveConfig = (v: FormValues) => {
    save.mutate({
      restaurantId,
      prepayment_enabled: true,
      ...v,
      upsell_occasions: v.upsell_occasions ?? [],
      upsell_message: v.upsell_message ?? '',
      upsell_package_name: v.upsell_package_name ?? '',
    })
  }

  const toggleOccasion = (code: string) => {
    const cur = form.getValues('upsell_occasions') ?? []
    if (cur.includes(code)) {
      form.setValue(
        'upsell_occasions',
        cur.filter((c) => c !== code),
        { shouldDirty: true },
      )
    } else {
      form.setValue('upsell_occasions', [...cur, code], { shouldDirty: true })
    }
  }

  if (isLoading) return <div className="h-48 animate-pulse bg-muted/30 rounded-xl" />

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[15px] font-semibold">Sinal antecipado via Pix</h2>
        <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
          Recurso <strong>100% opcional</strong>. Quando desativado, reservas são confirmadas sem
          nenhuma cobrança — o fluxo padrão. Ative apenas nos períodos em que faz sentido para o
          seu negócio, como alta temporada ou datas especiais.
        </p>
      </div>

      {/* Aviso de plano */}
      {!planOk && (
        <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[12px] text-amber-300">
            Disponível a partir do plano <strong>Essencial</strong>. Faça upgrade para habilitar.
          </p>
        </div>
      )}

      {planOk && (
        <div className="rounded-xl border border-border bg-muted/15 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[13px] font-semibold">Proteção No-Show (add-on)</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                Obrigatório para habilitar o sinal Pix. Configure cobrança e políticas na página dedicada.
              </p>
              <Link
                href="/dashboard/configuracoes/protecao-noshow"
                className="text-[11px] text-primary underline-offset-2 hover:underline mt-1 inline-block"
              >
                Abrir Proteção No-Show
              </Link>
            </div>
          </div>
          <Switch
            checked={addonActive}
            onCheckedChange={(v) => toggleAddon.mutate({ restaurantId, enabled: v })}
            disabled={toggleAddon.isPending}
          />
        </div>
      )}

      {/* Card de status — toggle principal */}
      <div className={cn(
        'rounded-xl border p-5 transition-all duration-200',
        enabled
          ? 'border-green-500/40 bg-green-500/8'
          : 'border-border bg-muted/20'
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
              enabled ? 'bg-green-500/20' : 'bg-muted'
            )}>
              {enabled
                ? <Zap className="w-4 h-4 text-green-400" />
                : <ZapOff className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div>
              <p className="text-[13px] font-semibold">
                {enabled ? 'Sinal Pix ativo' : 'Sinal Pix inativo'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {enabled
                  ? 'Clientes pagam antes de confirmar a reserva'
                  : 'Reservas confirmadas sem cobrança — modo padrão'}
              </p>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={!planOk || toggle.isPending}
            className="data-[state=checked]:bg-green-500"
          />
        </div>

        {/* Dica sazonal */}
        {!enabled && planOk && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-background/60 rounded-lg border border-border/50">
            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Dica para alta temporada:</strong> ative o sinal Pix
              para reduzir no-shows. Configure o valor, a política e desative quando quiser — sem
              nenhum impacto nas reservas já existentes.
            </p>
          </div>
        )}
      </div>

      {/* Configuração detalhada — colapsável */}
      {planOk && (
        <div>
          <button
            type="button"
            onClick={() => setShowConfig(s => !s)}
            className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {showConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showConfig ? 'Ocultar configurações' : 'Configurar regras do sinal'}
          </button>

          {showConfig && (
            <form onSubmit={form.handleSubmit(handleSaveConfig)} className="mt-4 space-y-4 p-4 border border-border rounded-xl">
              <p className="text-[11px] text-muted-foreground">
                As configurações abaixo são salvas e aplicadas automaticamente quando o sinal estiver ativo.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Tipo de cobrança</Label>
                  <Select value={form.watch('prepayment_type')} onValueChange={v => form.setValue('prepayment_type', v as any)}>
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-[12px]">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px]">
                    {form.watch('prepayment_type') === 'POR_PESSOA' ? 'Valor por pessoa (R$)' :
                     form.watch('prepayment_type') === 'PERCENTUAL' ? 'Percentual (%)' : 'Valor fixo (R$)'}
                  </Label>
                  <Input type="number" min={0} step={0.01} className="h-9 text-[12px]"
                    {...form.register('prepayment_amount', { valueAsNumber: true })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Cobrar quando</Label>
                  <Select value={form.watch('prepayment_applies_to')} onValueChange={v => form.setValue('prepayment_applies_to', v as any)}>
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(APPLIES_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-[12px]">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px]">No-show — o que fazer com o sinal</Label>
                  <Select value={form.watch('no_show_policy')} onValueChange={v => form.setValue('no_show_policy', v as any)}>
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(NOSHOW_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-[12px]">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Cancelamento isento até (horas antes)</Label>
                  <Input type="number" min={0} step={1} className="h-9 text-[12px]"
                    {...form.register('cancellation_deadline_hours', { valueAsNumber: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Pix expira em (minutos)</Label>
                  <Input type="number" min={5} step={5} className="h-9 text-[12px]"
                    {...form.register('prepayment_expiry_minutes', { valueAsNumber: true })} />
                </div>
              </div>

              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-[12px] font-semibold">Upsell no widget (após reserva)</p>
                <p className="text-[11px] text-muted-foreground">
                  Para visitas com o motivo selecionado, mostramos um cartão com pacote e texto (ex.: bolo, flores).
                </p>
                <div className="flex flex-wrap gap-2">
                  {OCCASION_OPTIONS.map((o) => {
                    const sel = (form.watch('upsell_occasions') ?? []).includes(o.value)
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => toggleOccasion(o.value)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg border text-[11px] transition-colors',
                          sel ? 'border-primary/50 bg-primary/15 text-foreground' : 'border-border text-muted-foreground',
                        )}
                      >
                        {o.label}
                      </button>
                    )
                  })}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Nome do pacote / produto</Label>
                  <Input className="h-9 text-[12px]" placeholder="Ex.: Bolo surpresa" {...form.register('upsell_package_name')} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Mensagem</Label>
                  <Textarea
                    className="text-[12px] min-h-[72px]"
                    placeholder="Texto exibido no widget após confirmar a reserva."
                    {...form.register('upsell_message')}
                  />
                </div>
              </div>

              <Button type="submit" size="sm" className="h-8 text-[12px]" disabled={save.isPending}>
                {save.isPending ? 'Salvando...' : 'Salvar configurações'}
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
