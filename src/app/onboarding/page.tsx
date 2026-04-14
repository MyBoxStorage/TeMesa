import Link from 'next/link'

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-2xl p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Onboarding</h1>
      <p className="text-zinc-600">
        Wizard guiado (skippable). No MVP, você pode pular e ir direto para o painel.
      </p>
      <div className="flex gap-3">
        <Link className="rounded-md bg-black px-4 py-2 text-white" href="/dashboard/reservas">
          Ir para o painel
        </Link>
      </div>
    </div>
  )
}
