/**
 * D-093: los deportes que conoce AXIS.
 */
import assert from 'node:assert/strict'
import test from 'node:test'

import { withSportKnowledge } from '../../profile/sport-knowledge'
import type { ScheduledActivity } from '../../profile/types'
import { addDays, startOfWeek, weekdayOfKey } from '../../shared/dates'
import { EXERCISE_CATALOG } from '../../workouts/catalog'
import { practicesJumpSport, sportWarmupFor } from '../engine'
import { sportSetsThisWeek } from '../facts'
import { isMuscleGroup } from './muscles'
import { describeActivity, muscleGroupsToAvoid } from '../rules'
import { describeSportMuscles, SPORT_PROFILES, sportProfileFor } from './sport-profiles'

function activity(name: string, partial: Partial<ScheduledActivity> = {}): ScheduledActivity {
  return {
    id: `a-${name}`,
    name,
    weekday: 0,
    startMinute: null,
    endMinute: null,
    intensity: 'alta',
    loadsMuscleGroups: [],
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    ...partial,
  }
}

test('D-093: reconoce el deporte como lo escribe la gente', () => {
  const cases: [string, string][] = [
    ['Baloncesto', 'baloncesto'],
    ['básquet', 'baloncesto'],
    ['Partido de baloncesto', 'baloncesto'],
    ['Fútbol sala', 'futbol'],
    ['Pádel', 'padel'],
    ['Natación los martes', 'natacion'],
    ['Salir a correr', 'correr'],
    ['Spinning', 'ciclismo'],
    ['Jiu-jitsu', 'lucha'],
    ['Muay thai', 'boxeo'],
    ['Rocódromo', 'escalada'],
    ['Hip hop', 'baile'],
  ]
  for (const [name, id] of cases) assert.equal(sportProfileFor(name)?.id, id, name)
  assert.equal(sportProfileFor('Clase de cerámica'), null)
  assert.equal(sportProfileFor('Trabajo'), null)
})

test('D-093: cada ficha es coherente: grupos reales, movilidad del catálogo y sin términos repetidos', () => {
  const ids = new Set<string>()
  const terms = new Set<string>()
  for (const sport of SPORT_PROFILES) {
    assert.ok(!ids.has(sport.id), sport.id)
    ids.add(sport.id)
    assert.ok(sport.muscleGroups.length > 0 && sport.muscleGroups.every(isMuscleGroup), sport.id)
    for (const id of sport.warmup) {
      const exercise = EXERCISE_CATALOG.find((item) => item.id === id)
      assert.equal(exercise?.category, 'movilidad', `${sport.id}: ${id}`)
    }
    for (const term of sport.terms) {
      assert.equal(term, term.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''), `${sport.id}: «${term}» con tildes`)
      assert.ok(!terms.has(term), `«${term}» repetido`)
      terms.add(term)
    }
    assert.ok(sport.summary.length > 0 && sport.gymFocus.length > 0, sport.id)
  }
})

test('D-093: una actividad anterior se pone al día una sola vez, sin quitar lo que tenía', () => {
  const old = activity('Natación', { loadsMuscleGroups: ['piernas'] })
  const known = withSportKnowledge(old)
  assert.equal(known.sportId, 'natacion')
  assert.deepEqual(known.loadsMuscleGroups, ['piernas', 'espalda', 'hombros', 'core'])
  // Con el deporte ya apuntado, lo que el usuario deje manda.
  const edited = { ...known, loadsMuscleGroups: ['espalda'] }
  assert.equal(withSportKnowledge(edited), edited)
  // Lo que no conoce queda igual.
  const unknown = activity('Cerámica', { loadsMuscleGroups: ['brazos'] })
  assert.equal(withSportKnowledge(unknown), unknown)
})

test('D-093: los saltos los dice la ficha; la lista de antes sigue para lo que no conoce', () => {
  assert.equal(practicesJumpSport([activity('Voley playa')]), true)
  assert.equal(practicesJumpSport([activity('Natación')]), false)
  assert.equal(practicesJumpSport([activity('Rugby')]), true)
})

test('D-093: el calentamiento lleva la movilidad del deporte más exigente', () => {
  assert.deepEqual(sportWarmupFor([activity('Natación', { intensity: 'media' }), activity('Baloncesto', { intensity: 'alta' })]), ['tobillo-pared'])
  assert.deepEqual(sportWarmupFor([activity('Cerámica')]), [])
  assert.deepEqual(sportWarmupFor([activity('Yoga')]), [])
})

test('D-093: el deporte de esta semana cuenta como series de lo que carga, según su exigencia', () => {
  const today = '2026-11-05' // jueves
  const monday = startOfWeek(today)
  const hard = activity('Baloncesto', { weekday: weekdayOfKey(monday), loadsMuscleGroups: ['piernas', 'gluteos'] })
  const medium = activity('Natación', { id: 'n', weekday: weekdayOfKey(addDays(monday, 1)), intensity: 'media', loadsMuscleGroups: ['espalda'] })
  const todaySport = activity('Fútbol', { id: 'f', weekday: weekdayOfKey(today), loadsMuscleGroups: ['piernas'] })
  const sets = sportSetsThisWeek([hard, medium, todaySport], today)
  assert.equal(sets.piernas, 3, 'lo de hoy aún no ha pasado')
  assert.equal(sets.gluteos, 3)
  assert.equal(sets.espalda, 2)
  // Lo que ayer no se jugó no cuenta.
  const yesterday = activity('Baloncesto', { weekday: weekdayOfKey(addDays(today, -1)), loadsMuscleGroups: ['piernas'] })
  assert.equal(sportSetsThisWeek([yesterday], today, new Set(['baloncesto'])).piernas, undefined)
})

test('D-093: antes de un entreno de exigencia media tampoco se cargan sus músculos', () => {
  const base = {
    minutesUntilActivity: null,
    todayActivities: [],
  } as unknown as Parameters<typeof muscleGroupsToAvoid>[0]
  const medium = { ...base, tomorrowActivities: [activity('Fútbol', { intensity: 'media', loadsMuscleGroups: ['piernas'] })] }
  assert.deepEqual(muscleGroupsToAvoid(medium), ['piernas'])
  const low = { ...base, tomorrowActivities: [activity('Yoga', { intensity: 'baja', loadsMuscleGroups: ['core'] })] }
  assert.deepEqual(muscleGroupsToAvoid(low), [])
})

test('D-093: los músculos se dicen en minúsculas y en lista', () => {
  assert.equal(describeSportMuscles(['piernas', 'gluteos', 'core']), 'piernas, glúteos y core')
})

test('D-093: AXIS dice qué carga el deporte de hoy', () => {
  assert.equal(
    describeActivity(activity('Baloncesto', { loadsMuscleGroups: ['piernas', 'gluteos', 'core'] })),
    'Hoy tienes baloncesto, que carga piernas, glúteos y core.',
  )
  assert.equal(describeActivity(activity('Cerámica')), 'Hoy tienes cerámica.')
})
