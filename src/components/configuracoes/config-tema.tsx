'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const FONTS = ['Figtree', 'Inter', 'Playfair Display', 'Montserrat', 'Lato', 'Poppins', 'Cormorant Garamond']

interface ThemeConfig {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fontFamily: string
  borderRadius: string
}

export function ConfigTema({ restaurantId }: { restaurantId: string }) {
  const { data: restaurant } = api.restaurant.getMyRestaurant.useQuery()
  const update = api.restaurant.updateTheme.useMutation({
    onSuccess: () => toast.success('Tema salvo!'),
    onError: (e) => toast.error(e.message),
  })

  const defaultTheme: ThemeConfig = {
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    accentColor: '#f59e0b',
    fontFamily: 'Figtree',
    borderRadius: '0.5rem',
  }

  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme)

  useEffect(() => {
    if (restaurant?.themeConfig) {
      setTheme({ ...defaultTheme, ...(restaurant.themeConfig as any) })
    }
  }, [restaurant])

  const update_ = (key: keyof ThemeConfig, value: string) =>
    setTheme(t => ({ ...t, [key]: value }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[15px] font-semibold mb-0.5">Tema do widget</h2>
        <p className="text-[12px] text-muted-foreground">Personaliza as cores e fontes do widget público.</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Cor primária</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={theme.primaryColor}
                onChange={e => update_('primaryColor', e.target.value)}
                className="w-9 h-9 rounded-md border border-border cursor-pointer bg-transparent"
              />
              <Input value={theme.primaryColor}
                onChange={e => update_('primaryColor', e.target.value)}
                className="h-9 text-[12px] font-mono w-28" placeholder="#000000"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px]">Cor de destaque</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={theme.accentColor}
                onChange={e => update_('accentColor', e.target.value)}
                className="w-9 h-9 rounded-md border border-border cursor-pointer bg-transparent"
              />
              <Input value={theme.accentColor}
                onChange={e => update_('accentColor', e.target.value)}
                className="h-9 text-[12px] font-mono w-28"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px]">Fonte</Label>
            <Select value={theme.fontFamily} onValueChange={v => update_('fontFamily', v)}>
              <SelectTrigger className="h-9 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONTS.map(f => (
                  <SelectItem key={f} value={f} className="text-[12px]" style={{ fontFamily: f }}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px]">Arredondamento</Label>
            <Select value={theme.borderRadius} onValueChange={v => update_('borderRadius', v)}>
              <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0rem"    className="text-[12px]">Nenhum (0px)</SelectItem>
                <SelectItem value="0.25rem" className="text-[12px]">Suave (4px)</SelectItem>
                <SelectItem value="0.5rem"  className="text-[12px]">Médio (8px)</SelectItem>
                <SelectItem value="0.75rem" className="text-[12px]">Arredondado (12px)</SelectItem>
                <SelectItem value="1.5rem"  className="text-[12px]">Muito arredondado (24px)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            size="sm" className="h-8 text-[12px]"
            onClick={() => update.mutate({ restaurantId, ...theme })}
            disabled={update.isPending}
          >
            {update.isPending ? 'Salvando...' : 'Salvar tema'}
          </Button>
        </div>

        {/* Live Preview */}
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-3">
            Preview ao vivo
          </p>
          <div
            className="rounded-xl border border-border overflow-hidden shadow-lg"
            style={{ fontFamily: theme.fontFamily, '--preview-primary': theme.primaryColor } as any}
          >
            {/* Widget mini preview */}
            <div className="bg-zinc-900 p-4 space-y-3">
              <div className="text-center">
                <div className="w-8 h-8 rounded-full mx-auto mb-1.5"
                  style={{ backgroundColor: theme.primaryColor }} />
                <p className="text-[11px] font-semibold text-white">Restaurante Demo</p>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {['2 Pessoas', '20:00', 'Hoje'].map(l => (
                  <div key={l} className="bg-zinc-800 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-zinc-300 font-medium">{l}</p>
                  </div>
                ))}
              </div>
              <button
                className="w-full py-2 rounded-lg text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: theme.primaryColor,
                  borderRadius: theme.borderRadius,
                }}
              >
                Reservar Agora
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                {['19:00 · Interno', '19:30 · Varanda', '20:00 · Interno', '20:30 · Bar'].map(s => (
                  <div
                    key={s}
                    className="py-2 px-3 text-center text-[10px] text-white font-medium"
                    style={{
                      backgroundColor: theme.accentColor,
                      borderRadius: theme.borderRadius,
                    }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
