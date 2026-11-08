'use client'

import { useState, type ReactNode } from 'react'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { ExerciseFigure, hasExerciseFigure } from '@/components/exercise-figure'
import { CARE_ZONE_LABELS, type CareZone } from '@/lib/domain/profile/types'
import type { Exercise } from '@/lib/domain/workouts/types'
import { describeEquipmentNeeded, SWAP_REASONS, type SwapReason } from '@/lib/domain/workouts/swap'

/** Lo que AXIS dice al enseñar las alternativas de cada motivo. */
function hintFor(reason: SwapReason, zone: CareZone | null): string {
  switch (reason) {
    case 'sin_material':
      return 'Estas no necesitan lo que pedía el ejercicio y trabajan lo mismo.'
    case 'molestia':
      return zone
        ? `Ninguna carga ${withArticle(zone)}. Si duele al hacerlo, para. Si la molestia sigue, que la vea un profesional.`
        : 'Cargan menos esa zona o son más suaves. Si duele al hacerlo, para. Si la molestia sigue, que la vea un profesional.'
    case 'muy_dificil':
      return 'Más accesibles, para el mismo trabajo.'
    case 'muy_facil':
      return 'Más exigentes, para el mismo trabajo.'
    case 'no_me_gusta':
      return 'Lo apunto: no te lo volveré a proponer mientras tenga alternativas.'
    case 'otro':
      return 'Trabajan lo mismo.'
  }
}

/** «la rodilla», «el hombro». */
function withArticle(zone: CareZone): string {
  const feminine: CareZone[] = ['rodilla', 'cadera', 'espalda_baja', 'muneca']
  return `${feminine.includes(zone) ? 'la' : 'el'} ${CARE_ZONE_LABELS[zone].toLowerCase()}`
}

type Step = { kind: 'reason' } | { kind: 'zone' } | { kind: 'options'; reason: SwapReason; zone: CareZone | null }

/**
 * «Cambiar ejercicio» (D-095): primero el porqué; por molestias, dónde; y
 * luego las alternativas que encajan. Ocupa la pantalla, como las
 * confirmaciones: una pantalla, una pregunta.
 */
export function ExerciseSwap({
  exerciseName,
  doneSets,
  zones,
  optionsFor,
  onSwap,
  onSkip,
  onClose,
}: {
  exerciseName: string
  /** Series ya hechas del ejercicio: se quedan y el resto va con el nuevo. */
  doneSets: number
  /** Las zonas que carga el ejercicio, para preguntar dónde molesta. */
  zones: readonly CareZone[]
  optionsFor: (reason: SwapReason, zone: CareZone | null) => Exercise[]
  onSwap: (exerciseId: string, reason: SwapReason, zone: CareZone | null) => void
  onSkip: () => void
  onClose: () => void
}) {
  const [step, setStep] = useState<Step>({ kind: 'reason' })
  const name = exerciseName.toLowerCase()

  if (step.kind === 'reason') {
    return (
      <Screen back={{ label: 'Volver al ejercicio', onClick: onClose }}>
        <h1 className="mt-4 text-title-lg font-extrabold text-balance">¿Por qué quieres cambiarlo?</h1>
        <p className="mt-3 text-callout text-muted-foreground text-pretty">
          {doneSets > 0
            ? `Las ${doneSets === 1 ? 'serie que llevas se guarda' : `${doneSets} series que llevas se guardan`}; las que faltan, con el nuevo ejercicio.`
            : `Dime qué pasa con ${name} y te propongo otro que trabaje lo mismo.`}
        </p>
        <ChoiceList
          items={SWAP_REASONS.map((item) => ({ id: item.id, label: item.label }))}
          onSelect={(reason) =>
            setStep(reason === 'molestia' && zones.length > 0 ? { kind: 'zone' } : { kind: 'options', reason, zone: null })
          }
        />
      </Screen>
    )
  }

  if (step.kind === 'zone') {
    return (
      <Screen back={{ label: 'Cambiar el motivo', onClick: () => setStep({ kind: 'reason' }) }}>
        <p className="mt-4 text-overline font-semibold tracking-[0.16em] text-primary">ME MOLESTA O ME DUELE</p>
        <h1 className="mt-2 text-title-lg font-extrabold text-balance">¿Dónde te molesta?</h1>
        <p className="mt-3 text-callout text-muted-foreground text-pretty">
          Así busco algo que no cargue esa zona. Mañana te preguntaré cómo va.
        </p>
        <ChoiceList
          items={[
            ...zones.map((zone) => ({ id: zone, label: CARE_ZONE_LABELS[zone] })),
            { id: 'otra' as const, label: 'En otro sitio o no lo sé' },
          ]}
          onSelect={(zone) => setStep({ kind: 'options', reason: 'molestia', zone: zone === 'otra' ? null : zone })}
        />
      </Screen>
    )
  }

  const { reason, zone } = step
  const alternatives = optionsFor(reason, zone)
  const label = SWAP_REASONS.find((item) => item.id === reason)?.label ?? ''
  const back = reason === 'molestia' && zones.length > 0 ? { kind: 'zone' as const } : { kind: 'reason' as const }

  return (
    <Screen back={{ label: 'Volver', onClick: () => setStep(back) }}>
      <p className="mt-4 text-overline font-semibold tracking-[0.16em] text-primary">
        {(zone ? `${label} · ${CARE_ZONE_LABELS[zone]}` : label).toUpperCase()}
      </p>
      {alternatives.length > 0 ? (
        <>
          <h1 className="mt-2 text-title-lg font-extrabold text-balance">Elige el cambio</h1>
          <p className="mt-3 text-callout text-muted-foreground text-pretty">{hintFor(reason, zone)}</p>
          <ul className="mt-8 space-y-2">
            {alternatives.map((exercise) => (
              <li key={exercise.id}>
                <button
                  type="button"
                  onClick={() => onSwap(exercise.id, reason, zone)}
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
              ? `Todo lo que trabaja lo mismo carga ${zone ? withArticle(zone) : 'esa zona'}. Mejor sáltalo hoy y, si la molestia sigue, que la vea un profesional.`
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
            Seguir con {name}
          </button>
        </>
      )}
    </Screen>
  )
}

function Screen({ back, children }: { back: { label: string; onClick: () => void }; children: ReactNode }) {
  return (
    <div className="ax-enter px-5 pt-4 pb-8">
      <button
        type="button"
        onClick={back.onClick}
        aria-label={back.label}
        className="ax-press -ml-2 flex h-11 w-11 items-center justify-center"
      >
        <ArrowLeft className="h-[22px] w-[22px] text-foreground" strokeWidth={1.75} />
      </button>
      {children}
    </div>
  )
}

function ChoiceList<T extends string>({
  items,
  onSelect,
}: {
  items: readonly { id: T; label: string }[]
  onSelect: (id: T) => void
}) {
  return (
    <ul className="mt-8 space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onSelect(item.id)}
            className="ax-press flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl bg-surface px-4 text-left text-callout font-semibold shadow-card"
          >
            {item.label}
            <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
          </button>
        </li>
      ))}
    </ul>
  )
}
