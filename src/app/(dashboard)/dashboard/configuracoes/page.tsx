import Link from 'next/link'

export default function Page() {
  const items = [
    { href: '/dashboard/configuracoes/tema', label: 'Tema' },
    { href: '/dashboard/configuracoes/turnos', label: 'Turnos' },
    { href: '/dashboard/configuracoes/notificacoes', label: 'Notificações' },
    { href: '/dashboard/configuracoes/auto-tags', label: 'Auto tags' },
    { href: '/dashboard/configuracoes/pagamento', label: 'Pagamento' },
  ] as const

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Configurações</h1>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.href}>
            <Link className="block rounded-md border p-4 hover:bg-zinc-50" href={i.href}>
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
