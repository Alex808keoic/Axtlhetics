/**
 * Semana de descarga (D-031, D-091).
 *
 * Tras varias semanas seguidas entrenando con regularidad, una semana más
 * suave deja que el cuerpo asimile lo acumulado: una serie menos por ejercicio
 * y sin subir. Es parte del plan, no un descanso.
 *
 * Toca tras cuatro semanas cargadas, o desde la tercera si las dos últimas
 * muestran estancamiento (D-091): muchos ejercicios sin completar lo previsto.
 * Seguir apretando así acumula fatiga sin progresar.
 *
 * Se decide por semanas naturales (de lunes a domingo) y es determinista: el
 * mismo historial da la misma respuesta cualquier día de la semana, porque
 * solo mira semanas ya cerradas. Una semana de descarga se reconoce porque sus
 * sesiones lo llevan en la instantánea de la propuesta
 * (`ProposalSnapshot.deload`), así que nunca se encadenan dos.
 */

import { addDays, startOfWeek, type DayKey } from '../shared/dates'
import { completedAsPlanned } from './history'
import type { WorkoutSession } from './types'
import { isMainExercise } from './types'

/** Semanas cargadas seguidas tras las que toca descarga. */
export const DELOAD_AFTER_WEEKS = 4

/** Semanas cargadas a partir de las que el estancamiento adelanta la descarga (D-091). */
export const EARLY_DELOAD_MIN_WEEKS = 3

/** Sesiones completadas para que una semana cuente como cargada. */
export const LOADED_WEEK_MIN_SESSIONS = 2

/** Semanas que se miran para decidir si hay estancamiento (D-091). */
export const STALL_WINDOW_WEEKS = 2
/** Ejercicios hechos como mínimo en esas semanas para poder juzgar (D-091). */
export const STALL_MIN_EXERCISES = 6
/** Parte de esos ejercicios sin completar lo previsto que ya es estancamiento (D-091). */
export const STALL_SHARE = 0.4

/** Por qué esta semana es de descarga. */
export type DeloadReason = 'calendario' | 'estancamiento'

/** Por qué la semana que contiene `today` es de descarga, o `null` si no lo es. */
export function deloadReason(history: readonly WorkoutSession[], today: DayKey): DeloadReason | null {
  const monday = startOfWeek(today)
  const loaded = loadedWeeksBefore(history, monday)
  if (loaded >= DELOAD_AFTER_WEEKS) return 'calendario'
  if (loaded >= EARLY_DELOAD_MIN_WEEKS && isStalling(history, addDays(monday, -7 * STALL_WINDOW_WEEKS), monday)) {
    return 'estancamiento'
  }
  return null
}

/** Por qué toca descargar, en una frase sin punto final: «Llevas 4 semanas seguidas…». */
export function describeDeloadReason(reason: DeloadReason): string {
  return reason === 'estancamiento'
    ? `Llevas ${EARLY_DELOAD_MIN_WEEKS} semanas cargadas y en las dos últimas te has quedado corto en muchos ejercicios: es fatiga acumulada`
    : `Llevas ${DELOAD_AFTER_WEEKS} semanas seguidas entrenando con regularidad`
}

/** `true` si la semana que contiene `today` es de descarga. */
export function isDeloadWeek(history: readonly WorkoutSession[], today: DayKey): boolean {
  return deloadReason(history, today) !== null
}

/** Semanas cargadas seguidas justo antes del lunes `monday`, hasta `DELOAD_AFTER_WEEKS`. */
export function loadedWeeksBefore(history: readonly WorkoutSession[], monday: DayKey): number {
  let weeks = 0
  while (weeks < DELOAD_AFTER_WEEKS && isLoadedWeek(history, addDays(monday, -7 * (weeks + 1)))) weeks += 1
  return weeks
}

/**
 * Estancamiento entre `from` (incluido) y `to` (excluido): de los ejercicios
 * de entrenamiento hechos, al menos `STALL_SHARE` sin completar lo previsto.
 * Con pocos ejercicios no se juzga.
 */
export function isStalling(history: readonly WorkoutSession[], from: DayKey, to: DayKey): boolean {
  const performed = history
    .filter((session) => session.status === 'completed' && session.dayKey >= from && session.dayKey < to)
    .flatMap((session) => session.exercises)
    .filter((exercise) => isMainExercise(exercise) && exercise.sets.length > 0)
  if (performed.length < STALL_MIN_EXERCISES) return false
  const missed = performed.filter((exercise) => !completedAsPlanned(exercise)).length
  return missed / performed.length >= STALL_SHARE
}

/**
 * Una semana cargada: al menos `LOADED_WEEK_MIN_SESSIONS` sesiones completadas
 * y ninguna de descarga. Una semana de descarga corta la cuenta.
 */
function isLoadedWeek(history: readonly WorkoutSession[], monday: DayKey): boolean {
  const end = addDays(monday, 7)
  const inWeek = history.filter(
    (session) => session.status === 'completed' && session.dayKey >= monday && session.dayKey < end,
  )
  if (inWeek.some((session) => session.proposal?.deload === true)) return false
  return inWeek.length >= LOADED_WEEK_MIN_SESSIONS
}
