import { personalRecords, formatKg, type PersonalRecord } from '../workouts/history'
import { REPS_IN_RESERVE_LABELS, type PerformedExercise, type WorkoutSession } from '../workouts/types'

/**
 * Los récords que batió una sesión cuando se hizo. Solo cuenta lo anterior a ella: si
 * después se superó esa marca, el récord de aquel día sigue siéndolo.
 */
export function recordsAtTheTime(session: WorkoutSession, sessions: readonly WorkoutSession[]): PersonalRecord[] {
  return personalRecords(
    session,
    sessions.filter((other) => other.startedAt < session.startedAt),
  )
}

export type SetRow = {
  number: number
  /** `10 reps` o `30 s`. */
  work: string
  /** `40 kg`, o `null` sin carga. */
  weight: string | null
  /** `margen 1–2`, o `null` si no se contestó. */
  reserve: string | null
  completed: boolean
}

/** Cada serie de un ejercicio, una a una. */
export function setRows(exercise: PerformedExercise, isTimed: boolean): SetRow[] {
  const lastIndex = exercise.sets.length - 1
  return exercise.sets.map((set, index) => {
    // Antes de D-055 solo se guardaba el margen de la última serie, en el ejercicio.
    const reserve = set.reserve ?? (index === lastIndex ? exercise.reserve : undefined)
    return {
      number: index + 1,
      work: isTimed ? `${set.reps} s` : `${set.reps} ${set.reps === 1 ? 'rep' : 'reps'}`,
      weight: set.weightKg === null ? null : `${formatKg(set.weightKg)} kg`,
      reserve: reserve ? `margen ${REPS_IN_RESERVE_LABELS[reserve]}` : null,
      completed: set.completed,
    }
  })
}

/** Lo previsto: `3 × 10` o `3 × 30 s`. `null` en las sesiones anteriores a D-019, que no lo guardaban. */
export function plannedLine(exercise: PerformedExercise, isTimed: boolean): string | null {
  if (exercise.targetSets === undefined || exercise.targetReps === undefined) return null
  return `${exercise.targetSets} × ${exercise.targetReps}${isTimed ? ' s' : ''}`
}
