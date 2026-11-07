/**
 * Las actividades del calendario con lo que AXIS sabe de su deporte (D-093).
 */

import { sportProfileFor } from '../axis/knowledge/sport-profiles'

type WithSport = { name: string; loadsMuscleGroups: string[]; sportId?: string }

/**
 * La actividad con su deporte reconocido: suma los grupos que carga y apunta
 * cuál es (`sportId`). Solo la primera vez: con `sportId` ya puesto, los grupos
 * son los que el usuario dejó y no se tocan. Si AXIS no conoce el deporte,
 * queda igual.
 *
 * Es lo que pone al día las actividades anteriores a D-093, que solo sabían si
 * cargaban piernas.
 */
export function withSportKnowledge<T extends WithSport>(activity: T): T {
  if (activity.sportId !== undefined) return activity
  const sport = sportProfileFor(activity.name)
  if (!sport) return activity
  const groups = [...new Set([...activity.loadsMuscleGroups, ...sport.muscleGroups])]
  return { ...activity, loadsMuscleGroups: groups, sportId: sport.id }
}
