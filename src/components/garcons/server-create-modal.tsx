'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/field'
import { api } from '@/trpc/react'

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
})

type Values = z.infer<typeof schema>

export function ServerCreateModal(props: {
  restaurantId: string
  open: boolean
  onClose: () => void
}) {
  const utils = api.useUtils()
  const create = api.servers.create.useMutation({
    onSuccess: async () => {
      await utils.servers.list.invalidate()
      toast.success('Garçom criado!')
      props.onClose()
    },
    onError: (e) => toast.error(e.message),
  })

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  })

  useEffect(() => {
    if (props.open) form.reset({ name: '' })
  }, [props.open, form])

  const onSubmit = (values: Values) => {
    create.mutate({ restaurantId: props.restaurantId, name: values.name })
  }

  if (!props.open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={props.onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold">Novo garçom</h2>
          <button
            onClick={props.onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12px]">Nome *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="h-9 text-[13px]"
                      placeholder="Ex: João"
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-9 text-[13px]"
                onClick={props.onClose}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 h-9 text-[13px]"
                disabled={create.isPending}
              >
                {create.isPending ? 'Criando...' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}

