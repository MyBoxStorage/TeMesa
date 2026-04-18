'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/field'
import { api } from '@/trpc/react'
import { toast } from 'sonner'

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  cnpj: z.string().optional(),
  googlePlaceId: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function ConfigGeral({ restaurantId }: { restaurantId: string }) {
  const { data: restaurant } = api.restaurant.getMyRestaurant.useQuery()
  const update = api.restaurant.update.useMutation({
    onSuccess: () => toast.success('Salvo!'),
    onError: (e) => toast.error(e.message),
  })
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      phone: '',
      cnpj: '',
      googlePlaceId: '',
    },
  })

  useEffect(() => {
    if (!restaurant) return
    form.reset({
      name: restaurant.name,
      phone: restaurant.phone,
      cnpj: restaurant.cnpj ?? '',
      googlePlaceId: restaurant.googlePlaceId ?? '',
    })
  }, [restaurant, form])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[15px] font-semibold mb-0.5">Informações do restaurante</h2>
        <p className="text-[12px] text-muted-foreground">Dados básicos exibidos no widget público.</p>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) =>
            update.mutate({
              restaurantId,
              name: v.name,
              phone: v.phone,
              cnpj: v.cnpj,
              googlePlaceId: v.googlePlaceId?.trim() ? v.googlePlaceId.trim() : null,
            })
          )}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[12px]">Nome do restaurante</FormLabel>
                <FormControl>
                  <Input {...field} className="h-9 text-[13px] max-w-sm" />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[12px]">Telefone (WhatsApp)</FormLabel>
                <FormControl>
                  <Input {...field} className="h-9 text-[13px] max-w-sm" />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cnpj"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[12px]">CNPJ (opcional)</FormLabel>
                <FormControl>
                  <Input {...field} className="h-9 text-[13px] max-w-sm" />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="googlePlaceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[12px]">Google Place ID (para avaliações)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="ChIJ..." className="h-10 max-w-sm" />
                </FormControl>
                <p className="text-[11px] text-muted-foreground">
                  Encontre em Google Maps → seu restaurante → &quot;Compartilhar&quot; → Place ID. Documentação:{' '}
                  <a
                    href="https://developers.google.com/maps/documentation/places/web-service/place-id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Place ID (Google)
                  </a>
                  .
                </p>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />
          <Button type="submit" size="sm" className="h-8 text-[12px]" disabled={update.isPending}>
            {update.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
