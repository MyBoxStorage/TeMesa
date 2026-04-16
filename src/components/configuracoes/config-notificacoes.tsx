'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { NotificationTrigger } from '@prisma/client'
import { DEFAULT_TEMPLATES } from '@/lib/notification-templates'

const TRIGGER_LABELS: Record<NotificationTrigger, string> = {
  RESERVATION_CREATED: 'Reserva criada',
  REMINDER_24H:        'Lembrete 24h antes',
  REMINDER_2H:         'Lembrete 2h antes',
  PAYMENT_CONFIRMED:   'Pagamento confirmado',
  WAITLIST_AVAILABLE:  'Mesa disponível (fila)',
  POST_VISIT:          'Pós-visita (2h depois)',
  CANCELLED:           'Cancelamento',
}

const VARS = ['{{guestName}}','{{restaurantName}}','{{date}}','{{time}}','{{partySize}}','{{confirmUrl}}','{{cancelUrl}}']

export function ConfigNotificacoes({ restaurantId }: { restaurantId: string }) {
  const [open, setOpen] = useState<string | null>('RESERVATION_CREATED')

  const { data: templates } = api.notifications.listTemplates.useQuery({ restaurantId })
  const utils = api.useUtils()
  const updateTemplate = api.notifications.updateTemplate.useMutation({
    onSuccess: () => { utils.notifications.listTemplates.invalidate(); toast.success('Template salvo!') },
    onError: (e) => toast.error(e.message),
  })

  const toggleActive = api.notifications.updateTemplate.useMutation({
    onSuccess: () => utils.notifications.listTemplates.invalidate(),
    onError: (e) => toast.error(e.message),
  })

  const sendTest = api.notifications.sendTest.useMutation({
    onSuccess: () => toast.success('Mensagem de teste enviada!'),
    onError: (e) => toast.error(e.message),
  })

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[15px] font-semibold">Notificações</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Configure as mensagens enviadas automaticamente para os clientes.
        </p>
      </div>

      {/* Variables reference */}
      <div className="p-3 bg-muted/30 rounded-lg border border-border">
        <p className="text-[11px] font-medium text-muted-foreground mb-2">Variáveis disponíveis:</p>
        <div className="flex flex-wrap gap-1.5">
          {VARS.map(v => (
            <code key={v} className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono text-primary">
              {v}
            </code>
          ))}
        </div>
      </div>

      {/* Accordion per trigger */}
      <div className="space-y-2">
        {(Object.keys(TRIGGER_LABELS) as NotificationTrigger[]).map(trigger => {
          const isOpen = open === trigger
          const template = templates?.find(t => t.trigger === trigger && t.channel === 'WHATSAPP')

          return (
            <div key={trigger} className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : trigger)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={template?.isActive ?? true}
                    onCheckedChange={(checked) => {
                      const defaultTemplate = DEFAULT_TEMPLATES[trigger]?.WHATSAPP ?? ''
                      toggleActive.mutate({
                        restaurantId,
                        trigger,
                        channel: 'WHATSAPP',
                        templatePtBr: template?.templatePtBr ?? defaultTemplate,
                        isActive: checked,
                      })
                    }}
                    className="data-[state=checked]:bg-green-500"
                    onClick={e => e.stopPropagation()}
                  />
                  <span className="text-[13px] font-medium">{TRIGGER_LABELS[trigger]}</span>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-border">
                  <Tabs defaultValue="whatsapp" className="mt-3">
                    <TabsList className="h-7 text-[11px]">
                      <TabsTrigger value="whatsapp" className="text-[11px] h-6">WhatsApp</TabsTrigger>
                      <TabsTrigger value="email"    className="text-[11px] h-6">E-mail</TabsTrigger>
                    </TabsList>
                    {(['whatsapp', 'email'] as const).map(ch => {
                      const channel = ch === 'whatsapp' ? 'WHATSAPP' : 'EMAIL'
                      const tmpl = templates?.find(t => t.trigger === trigger && t.channel === channel)
                      return (
                        <TabsContent key={ch} value={ch} className="mt-3">
                          <TemplateEditor
                            value={tmpl?.templatePtBr ?? ''}
                            onSave={(text) => updateTemplate.mutate({
                              restaurantId, trigger, channel,
                              templatePtBr: text,
                              isActive: tmpl?.isActive ?? true,
                            })}
                            isSaving={updateTemplate.isPending}
                            onTest={() => sendTest.mutate({ restaurantId, trigger, channel })}
                            isTesting={sendTest.isPending}
                          />
                        </TabsContent>
                      )
                    })}
                  </Tabs>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TemplateEditor({ value, onSave, isSaving, onTest, isTesting }: {
  value: string
  onSave: (v: string) => void
  isSaving: boolean
  onTest: () => void
  isTesting: boolean
}) {
  const [text, setText] = useState(value)
  return (
    <div className="space-y-2">
      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={5}
        className="text-[12px] resize-none font-mono"
      />
      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-[11px]" onClick={() => onSave(text)} disabled={isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[11px] gap-1.5"
          onClick={onTest}
          disabled={isTesting}
        >
          <Send className="w-3 h-3" />
          {isTesting ? 'Enviando...' : 'Testar'}
        </Button>
      </div>
    </div>
  )
}
