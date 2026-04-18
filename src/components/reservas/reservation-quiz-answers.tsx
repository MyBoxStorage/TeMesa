'use client'

import { Flag, AlertTriangle, MessageSquare } from 'lucide-react'
import type { Reservation } from '@prisma/client'
import {
  CONSUMPTION_LABELS,
  DIETARY_LABELS,
  FREQUENCY_LABELS,
  OCCASION_LABELS,
  ORIGIN_LABELS,
  REFERRAL_LABELS,
} from '@/lib/reservation-quiz-labels'

export type ReservationQuizFields = Pick<
  Reservation,
  'originType' | 'visitFrequency' | 'consumptionPreferences' | 'referralSource' | 'occasion' | 'dietaryNotes' | 'notes'
>

function hasProfileBlock(r: ReservationQuizFields): boolean {
  const prefs = (r.consumptionPreferences as string[]) ?? []
  return Boolean(
    r.originType
    || r.visitFrequency
    || prefs.length > 0
    || r.referralSource,
  )
}

function hasNotesBlock(r: ReservationQuizFields): boolean {
  return Boolean(r.occasion || r.dietaryNotes || r.notes)
}

export function reservationQuizHasData(r: ReservationQuizFields): boolean {
  return hasProfileBlock(r) || hasNotesBlock(r)
}

interface ReservationQuizAnswersProps {
  reservation: ReservationQuizFields
  /** hide: igual à ficha da reserva (não renderiza nada). message: texto quando não há dados. */
  whenEmpty?: 'hide' | 'message'
}

export function ReservationQuizAnswers({ reservation: r, whenEmpty = 'hide' }: ReservationQuizAnswersProps) {
  const profile = hasProfileBlock(r)
  const notesBlock = hasNotesBlock(r)

  if (!profile && !notesBlock) {
    if (whenEmpty === 'hide') return null
    return (
      <p className="text-[11px] text-muted-foreground px-1 py-2">
        Nenhuma resposta ao questionário nesta reserva.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {profile && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide font-semibold">
            Perfil do visitante
          </p>
          <div className="bg-muted/30 rounded-lg divide-y divide-border/40">
            {r.originType && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-[11px] text-muted-foreground">Origem</span>
                <span className="text-[11px] font-medium">{ORIGIN_LABELS[r.originType] ?? r.originType}</span>
              </div>
            )}
            {r.visitFrequency && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-[11px] text-muted-foreground">Frequência</span>
                <span className="text-[11px] font-medium">
                  {FREQUENCY_LABELS[r.visitFrequency] ?? r.visitFrequency}
                </span>
              </div>
            )}
            {((r.consumptionPreferences as string[]) ?? []).filter(p => p !== 'NONE').length > 0 && (
              <div className="px-3 py-2">
                <span className="text-[11px] text-muted-foreground block mb-1.5">Costuma pedir</span>
                <div className="flex flex-wrap gap-1">
                  {((r.consumptionPreferences as string[]) ?? []).filter(p => p !== 'NONE').map(p => (
                    <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
                      {CONSUMPTION_LABELS[p] ?? p}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {r.referralSource && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-[11px] text-muted-foreground">Como conheceu</span>
                <span className="text-[11px] font-medium">
                  {REFERRAL_LABELS[r.referralSource] ?? r.referralSource}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {notesBlock && (
        <div className="space-y-2">
          {r.occasion && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <Flag className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-amber-400/70 uppercase tracking-wide mb-0.5">Ocasião especial</p>
                <p className="text-[12px] text-amber-300">
                  {OCCASION_LABELS[r.occasion] ?? r.occasion}
                </p>
              </div>
            </div>
          )}
          {r.dietaryNotes && (
            <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wide mb-0.5">
                  Restrição alimentar
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {DIETARY_LABELS[r.dietaryNotes] ?? r.dietaryNotes}
                </p>
              </div>
            </div>
          )}
          {r.notes && (
            <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-lg">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wide mb-0.5">Observações</p>
                <p className="text-[12px] text-muted-foreground">{r.notes}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
