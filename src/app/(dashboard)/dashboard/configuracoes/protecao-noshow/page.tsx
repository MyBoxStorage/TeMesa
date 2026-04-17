'use client'

import { Shield, Zap, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/trpc/react'
import { useDashboard } from '../../layout'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function ProtecaoNoShowPage() {
  const { restaurantId } = useDashboard()
  const utils = api.useUtils()

  const { data: restaurant } = api.restaurant.getById.useQuery(
    { restaurantId: restaurantId! },
    { enabled: !!restaurantId }
  )

  const toggleAddon = api.restaurant.toggleNoShowProtection.useMutation({
    onSuccess: () => {
      void utils.restaurant.getById.invalidate()
      toast.success('Configuração salva!')
    },
    onError: (e) => toast.error(e.message),
  })

  const isActive = restaurant?.noShowProtectionAddon ?? false
  const prepaymentEnabled =
    (restaurant?.prepaymentConfig as { prepayment_enabled?: boolean } | null)?.prepayment_enabled === true

  if (!restaurantId) return null

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Shield className="w-5 h-5" /> Proteção No-Show
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cobre um sinal via Pix para reduzir não-comparecimentos. Add-on: R$49/mês.
        </p>
      </div>

      <div
        className={cn(
          'border rounded-xl p-6 space-y-4',
          isActive ? 'border-green-500/30 bg-green-500/5' : 'border-border'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                isActive ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'
              )}
            >
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">{isActive ? 'Add-on ativo' : 'Add-on desativado'}</p>
              <p className="text-xs text-muted-foreground">R$49/mês • Cobrança de sinal Pix em reservas</p>
            </div>
          </div>
          <Button
            variant={isActive ? 'destructive' : 'default'}
            size="sm"
            onClick={() => toggleAddon.mutate({ restaurantId, enabled: !isActive })}
            disabled={toggleAddon.isPending}
          >
            {isActive ? 'Desativar' : 'Ativar add-on'}
          </Button>
        </div>

        {isActive && !prepaymentEnabled && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-300">
              O add-on está ativo, mas o pagamento antecipado ainda não está configurado. Vá em{' '}
              <strong>Configurações → Pagamento</strong> para definir valor do sinal e política de no-show.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Como funciona</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Cliente faz reserva pelo widget → recebe QR Code Pix</li>
          <li>• Reserva fica como &quot;Pendente Pagamento&quot; até confirmação</li>
          <li>• Pagamento confirmado via webhook → status atualiza automaticamente</li>
          <li>• Em caso de no-show: cobrança ou reembolso conforme sua política</li>
        </ul>
      </div>
    </div>
  )
}
