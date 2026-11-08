/**
 * Cuántas sesiones tocan a la semana (D-096).
 *
 * Los días disponibles del perfil dicen **cuándo puede** entrenar el usuario,
 * no cuántas veces **debe**. El número de sesiones sale de:
 *
 * - **La experiencia**: principiante 3, intermedio 4, avanzado 5.
 * - **La edad**: por debajo de 16 años, como mucho 3; de 16 a 17 y desde los
 *   65, como mucho 4. Quien crece o quien recupera más despacio necesita más
 *   días sin carga.
 * - **El deporte**: entre entrenos y deporte, como mucho 6 días activos a la
 *   semana. Cada día con deporte resta un hueco, sin bajar de 2 sesiones.
 * - **Los días disponibles**: nunca más sesiones que días marcados.
 */

import { activityOccursOn, type ExperienceLevel, type ScheduledActivity } from '../profile/types'
import { addDays, startOfWeek, type DayKey } from '../shared/dates'
import { ADULT_AGE, YOUTH_AGE } from '../body/build'

export const SESSIONS_BY_EXPERIENCE: Record<ExperienceLevel, number> = {
  principiante: 3,
  intermedio: 4,
  avanzado: 5,
}

/** Días activos (entrenos + deporte) como mucho en una semana. Uno, al menos, libre. */
export const MAX_ACTIVE_DAYS_PER_WEEK = 6

/** Sesiones mínimas por semana cuando el deporte llena la semana: con menos no se progresa. */
export const MIN_SESSIONS_WITH_SPORT = 2

/** Desde esta edad, como mucho 4. */
export const SENIOR_AGE = 65

/** El tope por edad, o `null` si la edad no limita. */
export function ageSessionCap(age: number | null | undefined): number | null {
  if (age === null || age === undefined || !Number.isFinite(age)) return null
  if (age < YOUTH_AGE) return 3
  if (age < ADULT_AGE || age >= SENIOR_AGE) return 4
  return null
}

/** Los días de la semana de `today` (lunes a domingo) con algún deporte, sin repetir. */
export function sportDaysInWeek(activities: readonly Pick<ScheduledActivity, 'weekday' | 'date'>[], today: DayKey): DayKey[] {
  const monday = startOfWeek(today)
  const days: DayKey[] = []
  for (let offset = 0; offset < 7; offset++) {
    const day = addDays(monday, offset)
    if (activities.some((activity) => activityOccursOn(activity, day))) days.push(day)
  }
  return days
}

export type WeeklyCapInput = {
  availableDays: number
  experience: ExperienceLevel | null | undefined
  age: number | null | undefined
  /** Días de esta semana con deporte. */
  sportDays: number
}

/** Las sesiones de la semana. 0 solo si no hay ningún día disponible. */
export function weeklySessionCap(input: WeeklyCapInput): number {
  const available = Math.max(0, Math.min(7, Math.round(input.availableDays)))
  if (available === 0) return 0
  let cap = SESSIONS_BY_EXPERIENCE[input.experience ?? 'intermedio'] ?? SESSIONS_BY_EXPERIENCE.intermedio
  const byAge = ageSessionCap(input.age)
  if (byAge !== null) cap = Math.min(cap, byAge)
  const room = MAX_ACTIVE_DAYS_PER_WEEK - Math.max(0, input.sportDays)
  if (room < cap) cap = Math.max(Math.min(cap, MIN_SESSIONS_WITH_SPORT), room)
  return Math.min(cap, available)
}

/** Las sesiones de la semana de `today` para este perfil y su calendario. */
export function plannedSessionsPerWeek(
  profile: { availableWeekdays: readonly number[]; experience?: ExperienceLevel | null; age?: number | null } | null | undefined,
  activities: readonly Pick<ScheduledActivity, 'weekday' | 'date'>[],
  today: DayKey,
): number {
  if (!profile) return 3
  return weeklySessionCap({
    availableDays: profile.availableWeekdays.length,
    experience: profile.experience,
    age: profile.age,
    sportDays: sportDaysInWeek(activities, today).length,
  })
}
