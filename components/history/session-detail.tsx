'use client'

import { useEffect, type CSSProperties } from 'react'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { ExerciseFigure, hasExerciseFigure } from '@/components/exercise-figure'
import { EmptyNote } from '@/components/section-header'
import { plannedLine, recordsAtTheTime, setRows } from '@/lib/domain/history/session-detail'
import { formatVolume } from '@/lib/domain/history/stats'
import { TRAINING_GOAL_LABELS } from '@/lib/domain/profile/types'
import { formatDayInSentence, formatDuration } from '@/lib/domain/shared/dates'
import { findExercise } from '@/lib/domain/workouts/catalog'
import { formatKg } from '@/lib/domain/workouts/history'
import {
  EFFORT_LABELS,
  isMainExercise,
  metTarget,
  phaseLabel,
  volumeOfExercise,
  type PerformedExercise,
} from '@/lib/domain/workouts/types'
import { useAxtlhetics } from '@/lib/state/store'
import { cn } from '@/lib/utils'

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/**
 * El detalle de un entrenamiento del historial, en lugar del historial, con su vuelta
 * atrás (D-090). Todo lo que se guardó de la sesión, serie a serie y en el orden en que se
 * hizo: la aproximación va justo antes de su ejercicio (D-086), así que no se agrupa por fases.
 */
export function SessionDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { sessions } = useAxtlhetics()
  // Se abre desde abajo del historial: empieza arriba, con su cabecera a la vista.
  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0 })
  }, [])
  const session = sessions.find((item) => item.id === id) ?? null

  const header = (
    <header className="flex items-center pt-2 pb-1">
      <button
        type="button"
        onClick={onBack}
        aria-label="Volver al historial"
        className="ax-press -ml-2 flex h-11 w-11 items-center justify-center"
      >
        <ArrowLeft className="h-[22px] w-[22px] text-foreground" strokeWidth={1.75} />
      </button>
    </header>
  )

  if (!session) {
    return (
      <div className="ax-enter px-5 pb-12">
        {header}
        <EmptyNote className="mt-3">Este entrenamiento ya no está en tu historial.</EmptyNote>
      </div>
    )
  }

  const records = recordsAtTheTime(session, sessions)
  const startedAt = new Date(session.startedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const effort = session.effort ?? null

  return (
    <div className="ax-enter px-5 pb-12">
      {header}
      <h1 className="mt-3 text-title-lg font-extrabold">{session.title}</h1>
      <p className="mt-1.5 text-subhead text-muted-foreground">
        {capital(formatDayInSentence(session.dayKey))} · {startedAt}
      </p>
      {session.goal && (
        <p className="mt-0.5 text-subhead text-muted-foreground">Objetivo: {TRAINING_GOAL_LABELS[session.goal]}</p>
      )}

      <div className="mt-6 grid grid-cols-3 gap-2">
        <Stat index={0} value={formatDuration(session.durationSeconds)} label="Tiempo total" />
        <Stat index={1} value={String(session.exercises.filter(isMainExercise).length)} label="Ejercicios" />
        <Stat index={2} value={formatVolume(session.totalVolumeKg)} label="Volumen total" />
      </div>

      {effort !== null && (
        <p className="mt-3 flex items-baseline justify-between rounded-2xl bg-surface px-4 py-3 shadow-card">
          <span className="text-subhead text-muted-foreground">Cuánto te costó</span>
          <span className="text-subhead font-semibold tabular-nums">
            {effort} de 5 · {EFFORT_LABELS[effort as keyof typeof EFFORT_LABELS]}
          </span>
        </p>
      )}

      {/* Récords: solo frente a lo que había antes de esta sesión, sin insignias. */}
      {records.length > 0 && (
        <>
          <h2 className="mt-10 mb-3 text-body font-semibold">Récords personales</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border px-4">
            {records.map((record) => {
              const unit = findExercise(record.exerciseId)?.work.isTimed ? 's' : 'reps'
              return (
                <li key={`${record.exerciseId}-${record.kind}`} className="flex items-baseline justify-between gap-3 py-3">
                  <span className="text-subhead font-semibold">{record.name}</span>
                  <span className="shrink-0 text-footnote tabular-nums text-muted-foreground">
                    <span className="font-semibold text-primary">
                      {record.kind === 'weight' ? `${formatKg(record.value)} kg` : `${record.value} ${unit}`}
                    </span>{' '}
                    · antes {record.kind === 'weight' ? `${formatKg(record.previous)} kg` : record.previous}
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {session.exercises.length > 0 ? (
        <>
          <h2 className="mt-10 mb-3 text-body font-semibold">Lo que hiciste</h2>
          <ul className="flex flex-col gap-2.5">
            {session.exercises.map((exercise, index) => (
              <ExerciseCard key={`${exercise.exerciseId}-${index}`} exercise={exercise} index={index} />
            ))}
          </ul>
        </>
      ) : (
        <EmptyNote className="mt-10">No llegaste a completar ninguna serie.</EmptyNote>
      )}

      {/* Ejercicios saltados y cambios respecto a la propuesta. */}
      {session.modifications.length > 0 && (
        <>
          <h2 className="mt-10 mb-3 text-body font-semibold">Cambios sobre lo previsto</h2>
          <ul className="space-y-1.5">
            {session.modifications.map((modification, index) => (
              <li key={index} className="text-subhead text-muted-foreground text-pretty">
                {modification.detail}
              </li>
            ))}
          </ul>
        </>
      )}

      {session.notes && (
        <>
          <h2 className="mt-10 mb-3 text-body font-semibold">Notas</h2>
          <p className="text-subhead whitespace-pre-wrap text-muted-foreground">{session.notes}</p>
        </>
      )}
    </div>
  )
}

function ExerciseCard({ exercise, index }: { exercise: PerformedExercise; index: number }) {
  const catalog = findExercise(exercise.exerciseId)
  const isTimed = catalog?.work.isTimed ?? false
  const volume = volumeOfExercise(exercise)
  const phase = phaseLabel(exercise)
  const planned = plannedLine(exercise, isTimed)
  // En texto neutro: quedarse corto no es un error que marcar en rojo (D-021).
  const short = isMainExercise(exercise) && !metTarget(exercise)

  return (
    <li
      className="ax-stagger rounded-2xl border border-border bg-surface p-4 shadow-card"
      style={{ '--ax-index': index } as CSSProperties}
    >
      <div className="flex items-center gap-3.5">
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-fill">
          {hasExerciseFigure(exercise.exerciseId) ? (
            <ExerciseFigure exerciseId={exercise.exerciseId} animate={false} className="h-full w-full" />
          ) : (
            catalog?.imageUrl && (
              <Image src={catalog.imageUrl} alt={exercise.name} width={48} height={48} className="h-full w-full object-cover" />
            )
          )}
        </div>
        <div className="min-w-0 flex-1">
          {phase && <p className="text-overline font-semibold text-muted-foreground">{phase}</p>}
          <p className="text-callout font-semibold">{exercise.name}</p>
          {planned && <p className="text-caption tabular-nums text-muted-foreground">Previsto: {planned}</p>}
        </div>
        {/* Sin carga no hay volumen que enseñar: un «0 kg» no dice nada. */}
        {volume > 0 && (
          <span className="shrink-0 text-footnote font-medium tabular-nums text-muted-foreground">{formatVolume(volume)}</span>
        )}
      </div>

      {exercise.sets.length > 0 ? (
        <ol className="mt-3 divide-y divide-border border-t border-border">
          {setRows(exercise, isTimed).map((row) => (
            <li
              key={row.number}
              className={cn(
                'flex min-h-10 items-center gap-3 py-2 text-subhead tabular-nums',
                !row.completed && 'text-muted-foreground',
              )}
            >
              <span className="w-4 shrink-0 text-footnote text-muted-foreground">{row.number}</span>
              <span className="font-medium">{row.work}</span>
              {row.weight && <span>{row.weight}</span>}
              <span className="ml-auto text-right text-caption text-muted-foreground">
                {row.completed ? row.reserve : 'sin completar'}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-footnote text-muted-foreground">Sin series hechas.</p>
      )}

      {short && exercise.sets.length > 0 && (
        <p className="mt-2 text-caption text-muted-foreground">Por debajo de lo previsto.</p>
      )}
    </li>
  )
}

function Stat({ value, label, index }: { value: string; label: string; index: number }) {
  return (
    <div
      className="ax-stagger rounded-2xl bg-surface px-3 py-4 text-center shadow-card"
      style={{ '--ax-index': index } as CSSProperties}
    >
      <p className="text-headline font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-caption text-muted-foreground">{label}</p>
    </div>
  )
}
