'use client'

import { ConfigPagamento } from '@/components/configuracoes/config-pagamento'
import { useDashboard } from '../../dashboard-ctx'

export default function PagamentoSettingsPage() {
  const { restaurantId } = useDashboard()
  if (!restaurantId) return null
  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Pagamento</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sinal antecipado (Pix), upsell pós-reserva e regras de no-show.
        </p>
      </div>
      <ConfigPagamento restaurantId={restaurantId} />
    </div>
  )
}
