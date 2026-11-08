/**
 * Cambiar el ejercicio en curso (D-095): el usuario dice por qué y AXIS le da
 * alternativas que encajan con ese motivo.
 *
 * El nivel (D-065) cambia entre variantes de la misma familia. Esto va más
 * allá: cualquier ejercicio del mismo patrón de movimiento (D-073), para que el
 * hueco de la sesión siga cumpliendo su papel. Un press con pesas pasa a unas
 * flexiones, no a un curl.
 */

import type { CareZone } from '../profile/types'
import { EXERCISE_CATALOG, isAvailable } from './catalog'
import { jointsOf, loadsCareZone } from './joints'
import { isPatternFallback, patternOf, warmupFamilyOf } from './patterns'
import type { Equipment, Exercise } from './types'

export type SwapReason = 'sin_material' | 'molestia' | 'muy_dificil' | 'muy_facil' | 'no_me_gusta' | 'otro'

export const SWAP_REASONS: readonly { id: SwapReason; label: string }[] = [
  { id: 'sin_material', label: 'No tengo el material' },
  { id: 'molestia', label: 'Me molesta o me duele' },
  { id: 'muy_dificil', label: 'Es demasiado difícil' },
  { id: 'muy_facil', label: 'Es demasiado fácil' },
  { id: 'no_me_gusta', label: 'No me gusta' },
  { id: 'otro', label: 'Otro motivo' },
]

/** Cómo queda el motivo en el registro de la sesión: «Press → Flexiones (sin material).» */
export const SWAP_REASON_NOTES: Record<SwapReason, string> = {
  sin_material: 'sin material',
  molestia: 'por molestias',
  muy_dificil: 'más fácil',
  muy_facil: 'más exigente',
  no_me_gusta: 'no le gusta',
  otro: 'cambio pedido',
}

/** Lo que no es material de verdad: el suelo y una silla los tiene todo el mundo. */
const ALWAYS_AT_HAND: readonly Equipment[] = ['ninguno', 'superficie_elevada']

const MAX_OPTIONS = 6

export type SwapFilter = {
  catalog?: readonly Exercise[]
  /** El material de hoy (`availableEquipment(gearToday(...))`). */
  equipment: readonly Equipment[]
  careZones?: readonly CareZone[]
  /** Los ejercicios que ya están en la sesión: no se repiten. */
  inSession?: readonly string[]
  disliked?: readonly string[]
}

/**
 * Del mismo papel en la sesión: el mismo patrón o, sin patrón, la misma
 * categoría y un músculo en común. `wide` acepta además el patrón hermano
 * (sentadilla ↔ zancada, empuje horizontal ↔ vertical), para cuando el patrón
 * no da más de sí.
 */
function samePurpose(candidate: Exercise, exercise: Exercise, wide: boolean): boolean {
  const pattern = patternOf(exercise)
  if (pattern) {
    if (patternOf(candidate) === pattern) return true
    const family = warmupFamilyOf(exercise)
    return wide && family !== null && warmupFamilyOf(candidate) === family
  }
  return (
    candidate.category === exercise.category &&
    candidate.primaryMuscles.some((muscle) => exercise.primaryMuscles.includes(muscle))
  )
}

/** Cuántas de las articulaciones que carga el ejercicio carga también el candidato. */
function sharedJoints(candidate: Exercise, exercise: Exercise): number {
  const joints = jointsOf(exercise.id)
  return jointsOf(candidate.id).filter((joint) => joints.includes(joint)).length
}

function fitsReason(candidate: Exercise, exercise: Exercise, reason: SwapReason): boolean {
  const sameFamily = exercise.family !== undefined && candidate.family === exercise.family
  switch (reason) {
    case 'sin_material': {
      // Nada de lo que pedía el ejercicio: si falta la pesa, falta para todos.
      // Si no pedía nada (o solo una silla), solo lo que se hace con el cuerpo.
      const missing = exercise.equipment.filter((item) => !ALWAYS_AT_HAND.includes(item))
      if (missing.length === 0) return candidate.equipment.every((item) => item === 'ninguno')
      return !candidate.equipment.some((item) => missing.includes(item))
    }
    case 'molestia':
      // Otra variante del mismo movimiento suele molestar igual. El resto, si
      // carga menos las mismas articulaciones o es más suave.
      return (
        !sameFamily &&
        (sharedJoints(candidate, exercise) < jointsOf(exercise.id).length || candidate.difficulty < exercise.difficulty)
      )
    case 'muy_dificil':
      return candidate.difficulty < exercise.difficulty
    case 'muy_facil':
      return candidate.difficulty > exercise.difficulty
    case 'no_me_gusta':
      return !sameFamily
    case 'otro':
      return true
  }
}

/**
 * Las alternativas al ejercicio para ese motivo, las mejores primero: las que
 * se pueden hacer hoy, sin cargar una zona a cuidar y que no están ya en la
 * sesión. Para la dificultad van antes las de su familia (es cambiar de nivel);
 * los sustitutos de patrón (D-073) van al final; y entre el resto, las más
 * parecidas en dificultad. Vacío si no hay ninguna.
 */
export function swapOptions(exercise: Exercise, reason: SwapReason, filter: SwapFilter): Exercise[] {
  const catalog = filter.catalog ?? EXERCISE_CATALOG
  const inSession = filter.inSession ?? []
  const careZones = filter.careZones ?? []
  const disliked = filter.disliked ?? []
  const byLevel = reason === 'muy_dificil' || reason === 'muy_facil'

  const pick = (wide: boolean) =>
    catalog.filter(
      (candidate) =>
        candidate.id !== exercise.id &&
        !candidate.warmupOnly &&
        !inSession.includes(candidate.id) &&
        isAvailable(candidate, filter.equipment) &&
        !loadsCareZone(candidate.id, careZones) &&
        samePurpose(candidate, exercise, wide) &&
        fitsReason(candidate, exercise, reason),
    )
  // Primero el mismo patrón; si no da nada, el patrón hermano. Por molestias no
  // se amplía: el hermano suele cargar lo mismo (una zancada, la rodilla de la sentadilla).
  let candidates = pick(false)
  if (candidates.length === 0 && reason !== 'molestia') candidates = pick(true)

  const rank = (candidate: Exercise): number[] => [
    byLevel && candidate.family === exercise.family ? 0 : 1,
    reason === 'molestia' ? sharedJoints(candidate, exercise) : 0,
    disliked.includes(candidate.id) ? 1 : 0,
    isPatternFallback(candidate) ? 1 : 0,
    reason === 'molestia' ? candidate.difficulty : Math.abs(candidate.difficulty - exercise.difficulty),
  ]

  return candidates
    .sort((a, b) => {
      const [ra, rb] = [rank(a), rank(b)]
      for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i]
      return a.name.localeCompare(b.name, 'es')
    })
    .slice(0, MAX_OPTIONS)
}

const EQUIPMENT_SHORT: Record<Equipment, string | null> = {
  ninguno: null,
  superficie_elevada: 'una silla',
  pesa: 'una pesa',
  par_pesas: 'dos pesas',
  kettlebell: 'kettlebell',
  barra_dominadas: 'barra',
  gomas: 'goma',
  banco: 'banco',
}

/** «Sin material», «Con dos pesas y banco». */
export function describeEquipmentNeeded(exercise: Pick<Exercise, 'equipment'>): string {
  const items = exercise.equipment.map((item) => EQUIPMENT_SHORT[item]).filter((item): item is string => item !== null)
  if (items.length === 0) return 'Sin material'
  const list = items.length === 1 ? items[0] : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
  return `Con ${list}`
}
