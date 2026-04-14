import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { UtensilsCrossed, Mail, Building2, Clock, ArrowRight } from 'lucide-react'

export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const invite = await prisma.invitation.findUnique({ where: { token } })

  const isExpired = invite && invite.expiresAt <= new Date()
  const isRevoked = invite?.status === 'REVOKED'
  const isUsed    = invite?.status === 'USED'
  const isValid   = invite && !isExpired && !isRevoked && !isUsed

  const daysLeft = invite
    ? Math.max(0, Math.ceil((invite.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-black" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">TeMesa</span>
        </div>

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">

          {!invite && (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-white font-semibold text-lg">Convite não encontrado</p>
              <p className="text-zinc-400 text-sm">Este link é inválido ou já foi utilizado.</p>
            </div>
          )}

          {invite && (isExpired || isRevoked) && (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-white font-semibold text-lg">Convite expirado</p>
              <p className="text-zinc-400 text-sm">Entre em contato para receber um novo link.</p>
            </div>
          )}

          {isUsed && (
            <div className="p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
                <Building2 className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-white font-semibold text-lg">Convite já utilizado</p>
              <p className="text-zinc-400 text-sm">Faça login para acessar seu painel.</p>
              <Link href="/sign-in"
                className="inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-lg text-sm font-semibold">
                Fazer login <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {isValid && (
            <>
              <div className="p-6 border-b border-zinc-800">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-4">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Você foi convidado para</p>
                <h1 className="text-xl font-bold text-white mb-1">{invite.restaurantName}</h1>
                <p className="text-sm text-zinc-400">{invite.email}</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded-xl">
                  <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
                  <p className="text-sm text-zinc-300">
                    Expira em <strong className="text-white">{daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}</strong>
                  </p>
                </div>

                {invite.notes && (
                  <div className="p-3 bg-zinc-800 rounded-xl">
                    <p className="text-xs text-zinc-500 mb-1">Mensagem</p>
                    <p className="text-sm text-zinc-300">{invite.notes}</p>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <Link href={`/sign-up?invite=${token}`}
                    className="flex items-center justify-center gap-2 w-full bg-white text-black py-3 rounded-xl font-semibold text-sm">
                    Criar conta e começar <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href={`/sign-in?invite=${token}`}
                    className="flex items-center justify-center gap-2 w-full border border-zinc-700 text-zinc-300 py-3 rounded-xl text-sm hover:border-zinc-500 transition-colors">
                    Já tenho conta — fazer login
                  </Link>
                </div>

                <p className="text-xs text-zinc-600 text-center pt-2">
                  O nome do restaurante será pré-preenchido no onboarding.
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-zinc-700 mt-6">
          Powered by TeMesa · Sistema de gestão de reservas
        </p>
      </div>
    </div>
  )
}
