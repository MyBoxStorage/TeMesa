'use client'

import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-media-query'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const schema = z.object({
  guestName:    z.string().min(2, 'Nome obrigatório'),
  guestPhone:   z.string().min(10, 'Telefone inválido'),
  guestEmail:   z.string().email('E-mail inválido').optional().or(z.literal('')),
  partySize:    z.number().int().min(1).max(50),
  date:         z.string().min(1, 'Data obrigatória'),
  time:         z.string().min(1, 'Horário obrigatório'),
  occasion:     z.string().optional(),
  dietaryNotes: z.string().optional(),
  notes:        z.string().optional(),
  source:       z.enum(['MANUAL','PHONE','WHATSAPP']),
  lgpdConsent:  z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  restaurantId: string
}

function toE164Local(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`
  return `+55${digits}`
}

export function ReservationForm({ open, onClose, restaurantId }: Props) {
  const isMobile = useIsMobile()
  const utils = api.useUtils()
  const [noShowWarning, setNoShowWarning] = useState<{ name: string; count: number } | null>(null)
  const create = api.reservations.create.useMutation({
    onSuccess: () => {
      utils.reservations.list.invalidate()
      toast.success('Reserva criada!')
      onClose()
      form.reset()
    },
    onError: (e) => toast.error(e.message),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      guestName:    '',
      guestPhone:   '',
      guestEmail:   '',
      partySize:    2,
      date:         format(new Date(), 'yyyy-MM-dd'),
      time:         '19:00',
      occasion:     '',
      dietaryNotes: '',
      notes:        '',
      source:       'MANUAL',
      lgpdConsent:  false,
    },
  })

  const watchedPhone = useWatch({ control: form.control, name: 'guestPhone' })
  const phoneE164Preview = watchedPhone ? toE164Local(watchedPhone) : ''

  const checkCustomer = api.customers.findByPhone.useQuery(
    { restaurantId, phone: phoneE164Preview },
    { enabled: !!restaurantId && phoneE164Preview.length >= 13, retry: false }
  )

  useEffect(() => {
    if (checkCustomer.data && checkCustomer.data.noShowCount >= 2) {
      setNoShowWarning({ name: checkCustomer.data.name, count: checkCustomer.data.noShowCount })
    } else {
      setNoShowWarning(null)
    }
  }, [checkCustomer.data])

  const onSubmit = (values: FormValues) => {
    const dateTime = new Date(`${values.date}T${values.time}:00`)
    const digits = values.guestPhone.replace(/\D/g, '')
    const e164 = digits.startsWith('55') && digits.length >= 12
      ? `+${digits}`
      : `+55${digits}`

    create.mutate({
      restaurantId,
      guestName:    values.guestName,
      guestPhone:   e164,
      guestEmail:   values.guestEmail || undefined,
      partySize:    values.partySize,
      date:         dateTime,
      occasion:     values.occasion || undefined,
      dietaryNotes: values.dietaryNotes || undefined,
      notes:        values.notes || undefined,
      source:       values.source,
      lgpdConsent:  values.lgpdConsent,
    })
  }

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn(
          'overflow-y-auto',
          isMobile
            ? 'max-h-[92vh] rounded-t-2xl px-5 pb-[max(1rem,env(safe-area-inset-bottom))]'
            : 'w-[420px] sm:w-[480px]'
        )}
      >
        <SheetHeader className="mb-6">
          <SheetTitle className="text-[16px]">Nova Reserva</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Nome */}
            <FormField control={form.control} name="guestName" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[12px]">Nome completo *</FormLabel>
                <FormControl><Input {...field} placeholder="João Silva" className="h-9 text-[13px]" /></FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )} />

            {/* Phone + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField control={form.control} name="guestPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12px]">WhatsApp *</FormLabel>
                  <FormControl><Input {...field} placeholder="(47) 99999-9999" className="h-9 text-[13px]" /></FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />
              <FormField control={form.control} name="guestEmail" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12px]">E-mail</FormLabel>
                  <FormControl><Input {...field} placeholder="email@exemplo.com" className="h-9 text-[13px]" /></FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />
            </div>

            {/* Date + Time + Party */}
            <div className="grid grid-cols-3 gap-3">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem className="col-span-1">
                  <FormLabel className="text-[12px]">Data *</FormLabel>
                  <FormControl><Input type="date" {...field} className="h-9 text-[12px]" /></FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />
              <FormField control={form.control} name="time" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12px]">Horário *</FormLabel>
                  <FormControl><Input type="time" {...field} className="h-9 text-[12px]" /></FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />
              <FormField control={form.control} name="partySize" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12px]">Pessoas *</FormLabel>
                  <FormControl>
                    <Input
                      type="number" min={1} max={50}
                      value={field.value}
                      onChange={e => field.onChange(parseInt(e.target.value, 10) || 1)}
                      className="h-9 text-[12px]"
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />
            </div>

            {/* Occasion */}
            <FormField control={form.control} name="occasion" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[12px]">Ocasião especial</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-9 text-[12px]">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {['Aniversário','Lua de Mel','Pedido de Casamento','Negócios','Formatura','Outro']
                      .map(o => <SelectItem key={o} value={o} className="text-[12px]">{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />

            {/* Dietary + Notes */}
            <FormField control={form.control} name="dietaryNotes" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[12px]">Restrições alimentares</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Alergias, intolerâncias..." rows={2} className="text-[12px] resize-none" />
                </FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[12px]">Observações</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Notas internas..." rows={2} className="text-[12px] resize-none" />
                </FormControl>
              </FormItem>
            )} />

            {/* Source */}
            <FormField control={form.control} name="source" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[12px]">Canal de origem</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="MANUAL" className="text-[12px]">Manual</SelectItem>
                    <SelectItem value="PHONE" className="text-[12px]">Telefone</SelectItem>
                    <SelectItem value="WHATSAPP" className="text-[12px]">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />

            {/* LGPD */}
            <FormField control={form.control} name="lgpdConsent" render={({ field }) => (
              <FormItem className="flex items-center gap-3 bg-muted/40 rounded-lg px-3 py-3">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-[11px] text-muted-foreground cursor-pointer font-normal leading-relaxed">
                  Cliente autorizou compartilhamento de dados (LGPD / BC Connect)
                </FormLabel>
              </FormItem>
            )} />

            {noShowWarning && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-300">Cliente com histórico de no-show</p>
                  <p className="text-[11px] text-muted-foreground">
                    {noShowWarning.name} já não compareceu {noShowWarning.count} vez(es). Considere exigir confirmação
                    prévia ou sinal Pix.
                  </p>
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1 h-9 text-[13px]" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 h-9 text-[13px]" disabled={create.isPending}>
                {create.isPending ? 'Criando...' : 'Criar Reserva'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
