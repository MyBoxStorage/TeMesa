'use client'

import dynamic from 'next/dynamic'
import { useDashboard } from '../layout'

// Konva não funciona no SSR — importar apenas no client
const FloorPlanEditor = dynamic(
  () => import('@/components/mesas/floor-plan-editor').then(m => m.FloorPlanEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-[13px]">
        Carregando editor...
      </div>
    ),
  }
)

export default function MesasPage() {
  const { restaurantId } = useDashboard()
  if (!restaurantId) return null
  return <FloorPlanEditor restaurantId={restaurantId} />
}
