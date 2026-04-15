'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const schema = z.object({
  name:        z.string().min(2, 'Nome obrigatório'),
  startTime:   z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  endTime:     z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  daysOfWeek:  z.array(z.number()).min(1, 'Selecione ao menos um dia'),
  maxCapacity: z.number().int().positive('Capacidade deve ser positiva'),
  turnDuration:z.number().int().positive('Duração deve ser positiva'),
  isActive:    z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface ShiftFormProps {
  open:         boolean
  onClose:      () => void
  restaurantId: string
  /** Se fornecido, o formulário entra em modo edição */
  editShift?: {
    id:          string
    name:        string
    startTime:   string
    endTime:     string
    daysOfWeek:  number[]
    maxCapacity: number | null
    turnDuration:number | null
    isActive:    boolean
  } | null
}

export function ShiftForm({ open, onClose, restaurantId, editShift }: ShiftFormProps) {
  const utils    = api.useUtils()
  const isEdit   = !!editShift

  const create = api.shifts.create.useMutation({
    onSuccess: () => {
      utils.shifts.list.invalidate()
      toast.success('Turno criado!')
      onClose()
    },
    onError: (e) => toast.error(e.message),
  })

  const update = api.shifts.update.useMutation({
    onSuccess: () => {
      utils.shifts.list.invalidate()
      toast.success('Turno atualizado!')
      onClose()
    },
    onError: (e) => toast.error(e.message),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: editShift
      ? {
          name:         editShift.name,
          startTime:    editShift.startTime,
          endTime:      editShift.endTime,
          daysOfWeek:   editShift.daysOfWeek,
          maxCapacity:  editShift.maxCapacity ?? 80,
          turnDuration: editShift.turnDuration ?? 90,
          isActive:     editShift.isActive,
        }
      : {
          name:         '',
          startTime:    '12:00',
          endTime:      '15:00',
          daysOfWeek:   [0, 1, 2, 3, 4, 5, 6],
          maxCapacity:  80,
          turnDuration: 90,
          isActive:     true,
        },
  })

  const toggleDay = (day: number) => {
    const current = form.getValues('daysOfWeek')
    if (current.includes(day)) {
      form.setValue('daysOfWeek', current.filter((d) => d !== day), { shouldValidate: true })
    } else {
      form.setValue('daysOfWeek', [...current, day].sort(), { shouldValidate: true })
    }
  }

  const onSubmit = (values: FormValues) => {
    if (isEdit && editShift) {
      update.mutate({
        restaurantId,
        shiftId:      editShift.id,
        name:         values.name,
        startTime:    values.startTime,
        endTime:      values.endTime,
        daysOfWeek:   values.daysOfWeek,
        maxCapacity:  values.maxCapacity,
        turnDuration: values.turnDuration,
        isActive:     values.isActive,
      })
    } else {
      create.mutate({
        restaurantId,
        name:         values.name,
        startTime:    values.startTime,
        endTime:      values.endTime,
        daysOfWeek:   values.daysOfWeek,
        maxCapacity:  values.maxCapacity,
        turnDuration: values.turnDuration,
        isActive:     values.isActive,
      })
    }
  }

  const isPending = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-[16px]">
            {isEdit ? 'Editar turno' : 'Novo turno'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">

            {/* Nome */}
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[12px]">Nome do turno *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="ex: Jantar, Almoço, Happy Hour" className="h-9 text-[13px]" />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )} />

            {/* Horários */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="startTime" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12px]">Início *</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} className="h-9 text-[12px]" />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />
              <FormField control={form.control} name="endTime" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12px]">Fim *</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} className="h-9 text-[12px]" />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />
            </div>

            {/* Dias da semana */}
            <FormField control={form.control} name="daysOfWeek" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[12px]">Dias da semana *</FormLabel>
                <div className="flex gap-1.5 flex-wrap">
                  {DAYS.map((label, idx) => {
                    const active = field.value.includes(idx)
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleDay(idx)}
                        className={cn(
                          'px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors',
                          active
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted text-muted-foreground border-border hover:text-foreground'
                        )}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )} />

            {/* Capacidade e duração */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="maxCapacity" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12px]">Capacidade máx. (pessoas) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number" min={1}
                      value={field.value}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                      className="h-9 text-[12px]"
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />
              <FormField control={form.control} name="turnDuration" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12px]">Duração por mesa (min) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number" min={15} step={15}
                      value={field.value}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 90)}
                      className="h-9 text-[12px]"
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />
            </div>

            {/* Ativo */}
            <FormField control={form.control} name="isActive" render={({ field }) => (
              <FormItem className="flex items-center gap-3 bg-muted/40 rounded-lg px-3 py-3">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-[12px] font-normal text-muted-foreground cursor-pointer">
                  Turno ativo (aceita reservas)
                </FormLabel>
              </FormItem>
            )} />

            {/* Botões */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button" variant="outline"
                className="flex-1 h-9 text-[13px]"
                onClick={onClose}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 h-9 text-[13px]"
                disabled={isPending}
              >
                {isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar turno'}
              </Button>
            </div>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
