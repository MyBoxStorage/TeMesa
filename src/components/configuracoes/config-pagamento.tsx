'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import { AlertTriangle, Zap, ZapOff, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

const schema = z.object({
  prepayment_type: z.enum(['POR_PESSOA', 'VALOR_FIXO', 'PERCENTUAL']),
  prepayment_amount: z.number().min(0),
  prepayment_applies_to: z.enum(['TODAS_RESERVAS', 'FERIADOS', 'FINAIS_DE_SEMANA', 'MANUAL']),
  no_show_policy: z.enum(['COBRAR_TOTAL', 'COBRAR_PARCIAL', 'REEMBOLSAR', 'CREDITO']),
  cancellation_deadline_hours: z.number().int().min(0),
  prepayment_expiry_minutes: z.number().int().min(5),
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

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      prepayment_type: 'POR_PESSOA',
      prepayment_amount: 50,
      prepayment_applies_to: 'TODAS_RESERVAS',
      no_show_policy: 'REEMBOLSAR',
      cancellation_deadline_hours: 24,
      prepayment_expiry_minutes: 30,
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
      })
    }
  }, [cfg, form])

  const handleToggle = (next: boolean) => {
    if (!planOk) return
    // Ao ativar, mantém config existente; ao desativar, apenas muda o flag
    toggle.mutate({
      restaurantId,
      prepayment_enabled: next,
      ...(next ? { ...form.getValues() } : {}),
    })
  }

  const handleSaveConfig = (v: FormValues) => {
    save.mutate({ restaurantId, prepayment_enabled: true, ...v })
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
