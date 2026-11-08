'use client'

import { useState } from 'react'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { ExerciseFigure, hasExerciseFigure } from '@/components/exercise-figure'
import type { Exercise } from '@/lib/domain/workouts/types'
import { describeEquipmentNeeded, SWAP_REASONS, type SwapReason } from '@/lib/domain/workouts/swap'

/** Lo que AXIS dice al enseñar las alternativas de cada motivo. */
const REASON_HINTS: Record<SwapReason, string> = {
  sin_material: 'Estas no necesitan lo que pedía el ejercicio y trabajan lo mismo.',
  molestia: 'Cargan menos esa zona o son más suaves. Si duele al hacerlo, para. Si la molestia sigue, que la vea un profesional.',
  muy_dificil: 'Más accesibles, para el mismo trabajo.',
  muy_facil: 'Más exigentes, para el mismo trabajo.',
  no_me_gusta: 'Lo apunto: no te lo volveré a proponer mientras tenga alternativas.',
  otro: 'Trabajan lo mismo.',
}

/**
 * «Cambiar ejercicio» (D-095): primero el porqué, luego las alternativas que
 * encajan con ese motivo. Ocupa la pantalla, como las confirmaciones: una
 * pantalla, una pregunta.
 */
export function ExerciseSwap({
  exerciseName,
  options,
  onSwap,
  onSkip,
  onClose,
}: {
  exerciseName: string
  options: Record<SwapReason, Exercise[]>
  onSwap: (exerciseId: string, reason: SwapReason) => void
  onSkip: () => void
  onClose: () => void
}) {
  const [reason, setReason] = useState<SwapReason | null>(null)

  if (!reason) {
    return (
      <div className="ax-enter px-5 pt-4 pb-8">
        <BackButton label="Volver al ejercicio" onClick={onClose} />
        <h1 className="mt-4 text-title-lg font-extrabold text-balance">¿Por qué quieres cambiarlo?</h1>
        <p className="mt-3 text-callout text-muted-foreground text-pretty">
          Dime qué pasa con {exerciseName.toLowerCase()} y te propongo otro que trabaje lo mismo.
        </p>
        <ul className="mt-8 space-y-2">
          {SWAP_REASONS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setReason(item.id)}
                className="ax-press flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl bg-surface px-4 text-left text-callout font-semibold shadow-card"
              >
                {item.label}
                <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const alternatives = options[reason]
  const label = SWAP_REASONS.find((item) => item.id === reason)?.label ?? ''

  return (
    <div className="ax-enter px-5 pt-4 pb-8">
      <BackButton label="Cambiar el motivo" onClick={() => setReason(null)} />
      <p className="mt-4 text-overline font-semibold tracking-[0.16em] text-primary">{label.toUpperCase()}</p>
      {alternatives.length > 0 ? (
        <>
          <h1 className="mt-2 text-title-lg font-extrabold text-balance">Elige el cambio</h1>
          <p className="mt-3 text-callout text-muted-foreground text-pretty">{REASON_HINTS[reason]}</p>
          <ul className="mt-8 space-y-2">
            {alternatives.map((exercise) => (
              <li key={exercise.id}>
                <button
                  type="button"
                  onClick={() => onSwap(exercise.id, reason)}
                  className="ax-press flex w-full items-center gap-3.5 rounded-2xl bg-surface p-3 text-left shadow-card"
                >
                  {hasExerciseFigure(exercise.id) ? (
                    <ExerciseFigure
                      exerciseId={exercise.id}
                      animate={false}
                      className="h-12 w-12 shrink-0 rounded-xl bg-background"
                    />
                  ) : (
                    <div className="h-12 w-12 shrink-0 rounded-xl bg-background" aria-hidden="true" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-callout font-semibold">{exercise.name}</span>
                    <span className="block text-caption text-muted-foreground">{describeEquipmentNeeded(exercise)}</span>
                  </span>
                  <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <h1 className="mt-2 text-title-lg font-extrabold text-balance">No encuentro un buen cambio</h1>
          <p className="mt-3 text-callout text-muted-foreground text-pretty">
            {reason === 'molestia'
              ? 'Todo lo que trabaja lo mismo carga esa zona. Mejor sáltalo hoy y, si la molestia sigue, que la vea un profesional.'
              : 'Con tu material de hoy no hay otro ejercicio que haga el mismo trabajo. Puedes saltarlo o probar otro motivo.'}
          </p>
          <button
            type="button"
            onClick={onSkip}
            className="ax-press mt-10 h-[52px] w-full rounded-full bg-primary text-callout font-bold text-primary-foreground shadow-action"
          >
            Saltar este ejercicio
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ax-press mt-2 min-h-11 w-full text-footnote font-semibold text-muted-foreground"
          >
            Seguir con {exerciseName.toLowerCase()}
          </button>
        </>
      )}
    </div>
  )
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="ax-press -ml-2 flex h-11 w-11 items-center justify-center"
    >
      <ArrowLeft className="h-[22px] w-[22px] text-foreground" strokeWidth={1.75} />
    </button>
  )
}
