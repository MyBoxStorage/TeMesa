'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Link2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/trpc/react'
import { toast } from 'sonner'

export function ConfigIntegracao({ restaurantId }: { restaurantId: string }) {
  const [showKey, setShowKey] = useState(false)
  const [partnerId, setPartnerId] = useState('')
  const [apiKey, setApiKey] = useState('')

  const connect = api.restaurant.connectBcConnect.useMutation({
    onSuccess: () => toast.success('BC Connect conectado com sucesso!'),
    onError: (e) => toast.error(e.message),
  })

  const { data: restaurant } = api.restaurant.getMyRestaurant.useQuery()
  const isConnected = !!restaurant?.bcConnectPartnerId

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[15px] font-semibold">Integração BC Connect</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Conecte ao ecossistema BC Connect para enviar leads qualificados.
        </p>
      </div>

      {isConnected ? (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/25 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
          <div>
            <p className="text-[13px] font-medium text-green-300">BC Connect conectado</p>
            <p className="text-[11px] text-green-400/70">Partner ID: {restaurant?.bcConnectPartnerId}</p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="w-4 h-4 text-muted-foreground" />
            <p className="text-[13px] font-medium">Conectar ao BC Connect</p>
          </div>

          <div className="space-y-3 max-w-sm">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Partner ID</Label>
              <Input
                value={partnerId}
                onChange={e => setPartnerId(e.target.value)}
                placeholder="seu-partner-id"
                className="h-9 text-[12px] font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">API Key</Label>
              <div className="relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="ak_..."
                  className="h-9 text-[12px] font-mono pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(s => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <Button
              size="sm" className="h-8 text-[12px]"
              onClick={() => connect.mutate({ restaurantId, partnerId, apiKey })}
              disabled={!partnerId || !apiKey || connect.isPending}
            >
              {connect.isPending ? 'Conectando...' : 'Conectar'}
            </Button>
          </div>
        </div>
      )}

      {/* Widget embed code */}
      <div className="space-y-2">
        <h3 className="text-[13px] font-medium">Código do widget</h3>
        <p className="text-[12px] text-muted-foreground">
          Cole este código no HTML do seu site para exibir o formulário de reservas.
        </p>
        <pre className="bg-muted/40 border border-border rounded-lg p-3 text-[11px] font-mono text-muted-foreground overflow-x-auto whitespace-pre">
{`<iframe
  src="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://temesa.app'}/r/${restaurant?.slug ?? 'SEU-SLUG'}"
  width="100%"
  height="700"
  frameborder="0"
  style="border-radius:12px;max-width:480px;margin:0 auto;display:block"
></iframe>`}
        </pre>
        <Button
          size="sm" variant="outline" className="h-7 text-[11px]"
          onClick={() => {
            navigator.clipboard.writeText(`<iframe src="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://temesa.app'}/r/${restaurant?.slug}" ...></iframe>`)
            toast.success('Copiado!')
          }}
        >
          Copiar código
        </Button>
      </div>
    </div>
  )
}
