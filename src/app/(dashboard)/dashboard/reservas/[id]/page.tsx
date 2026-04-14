export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Reserva</h1>
      <p className="text-sm text-zinc-600">ID: {id}</p>
    </div>
  )
}
