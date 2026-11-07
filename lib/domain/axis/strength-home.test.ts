/**
 * D-091: fuerza en casa. Lo que un entrenador de fuerza corrigió de AXIS.
 */
import assert from 'node:assert/strict'
import test from 'node:test'

import { EXERCISE_CATALOG, findExercise, variantOf } from '../workouts/catalog'
import type { UserEquipment } from '../workouts/equipment'
import { availableEquipment } from '../workouts/equipment'
import { patternOf } from '../workouts/patterns'
import type { Exercise } from '../workouts/types'
import { isMainExercise } from '../workouts/types'
import { baseRepsFor, buildSession, restFor, suggestWorkFor, tooHeavyToStart } from './session-builder'

function exercise(id: string): Exercise {
  const found = findExercise(id)
  assert.ok(found, id)
  return found!
}

const FULL: UserEquipment = {
  items: ['barra_dominadas', 'banco', 'gomas'],
  weights: [{ kind: 'mancuerna', kg: 10, pair: true }, { kind: 'mancuerna', kg: 15, pair: true }],
}

test('D-091: lo que era final de cadena tiene continuación', () => {
  const equipment = availableEquipment(FULL)
  const next: Record<string, string> = {
    'flexiones-diamante': 'flexiones-arquero',
    'flexiones-declinadas': 'flexiones-arquero',
    'flexion-pica': 'flexion-pino-pared',
    dominadas: 'dominadas-lastre',
    'zancada-bulgara': 'zancada-bulgara-mancuernas',
    'puente-talones-silla': 'curl-nordico',
    sentadilla: 'sentadilla-con-pesa',
    'sentadilla-caja-una-pierna': 'sentadilla-pistol',
    'remo-invertido': 'remo-invertido-pies-elevados',
  }
  for (const [from, to] of Object.entries(next)) {
    assert.equal(variantOf(exercise(from), 'harder', EXERCISE_CATALOG, equipment).id, to, from)
  }
})

test('D-091: el remo invertido y el nórdico cubren lo que no tenía sustituto sin máquinas', () => {
  assert.equal(patternOf(exercise('remo-invertido')), 'tiron_horizontal')
  assert.deepEqual(exercise('remo-invertido').equipment, ['superficie_elevada'])
  assert.equal(patternOf(exercise('curl-nordico')), 'bisagra')
  assert.deepEqual(exercise('curl-nordico').equipment, ['ninguno'])
})

test('D-091: en fuerza, lo de peso corporal no recorta repeticiones; lo que lleva carga, sí', () => {
  assert.equal(baseRepsFor(exercise('flexiones-diamante'), 'fuerza'), exercise('flexiones-diamante').work.reps)
  assert.equal(baseRepsFor(exercise('dominadas'), 'fuerza'), exercise('dominadas').work.reps)
  assert.ok(baseRepsFor(exercise('remo-inclinado-mancuernas'), 'fuerza') < exercise('remo-inclinado-mancuernas').work.reps)
  // Los saltos de potencia sí van a menos repeticiones.
  assert.ok(baseRepsFor(exercise('sentadilla-salto'), 'rendimiento_deportivo') < exercise('sentadilla-salto').work.reps)
})

test('D-091: unas laterales con 10 kg no son un punto de partida; si ya las hizo, siguen', () => {
  const laterals = exercise('elevaciones-laterales')
  assert.equal(tooHeavyToStart(laterals, { gear: FULL, experience: 'intermedio' }), true)
  const light: UserEquipment = { items: [], weights: [{ kind: 'mancuerna', kg: 3, pair: true }, ...FULL.weights] }
  assert.equal(tooHeavyToStart(laterals, { gear: light, experience: 'intermedio' }), false)
  // Un compuesto con una pesa pesada se hace a menos repeticiones: no se aparta.
  assert.equal(tooHeavyToStart(exercise('press-hombro-mancuernas'), { gear: FULL, experience: 'principiante' }), false)

  for (const focus of ['tren_superior', 'cuerpo_completo'] as const) {
    const session = buildSession({ focus, intensity: 'moderada', availableMinutes: 60, goals: ['fuerza'], experience: 'intermedio', gear: FULL })
    const ids = session.exercises.filter(isMainExercise).map((item) => item.exerciseId)
    assert.ok(!ids.includes('elevaciones-laterales'), ids.join(', '))
  }
})

test('D-091: un compuesto de fuerza descansa al menos 2 min 30 s', () => {
  assert.ok(restFor(exercise('dominadas'), 'fuerza') >= 150)
  assert.ok(restFor(exercise('remo-inclinado-mancuernas'), 'fuerza') >= 150)
})

test('D-091: la sesión de piernas lleva core si hay hueco', () => {
  const session = buildSession({ focus: 'tren_inferior', intensity: 'moderada', availableMinutes: 60, goals: ['hipertrofia'], experience: 'intermedio', gear: FULL })
  const patterns = session.exercises.filter(isMainExercise).map((item) => patternOf(exercise(item.exerciseId)))
  assert.ok(patterns.includes('core'), patterns.join(', '))
})

test('D-091: las dominadas con lastre suben de peso con las pesas del usuario', () => {
  const work = suggestWorkFor(exercise('dominadas-lastre'), { intensity: 'moderada', goal: 'fuerza', experience: 'intermedio', gear: FULL })
  assert.equal(work.weightKg, 10)
})

// ---------------------------------------------------------------------------
// D-092: brazos y hombros en fuerza, si se piden
// ---------------------------------------------------------------------------

const STRENGTH_UPPER = { focus: 'tren_superior' as const, intensity: 'moderada' as const, availableMinutes: 60, goals: ['fuerza' as const], experience: 'intermedio' as const, gear: FULL }

function mainIds(session: ReturnType<typeof buildSession>): string[] {
  return session.exercises.filter(isMainExercise).map((item) => item.exerciseId)
}

test('D-092: pedidos en el perfil, la sesión de fuerza de tren superior termina con brazos u hombros', () => {
  const ids = mainIds(buildSession({ ...STRENGTH_UPPER, strengthAccessories: true }))
  const accessories = ids.filter((id) => ['biceps', 'triceps', 'hombro'].includes(patternOf(exercise(id)) ?? ''))
  assert.ok(accessories.length >= 1, ids.join(', '))
  // Detrás de los compuestos.
  const firstAccessory = ids.findIndex((id) => accessories.includes(id))
  assert.ok(ids.slice(firstAccessory).every((id) => accessories.includes(id)), ids.join(', '))
})

test('D-092: sin pedirlos, la fuerza va solo con compuestos, como en D-091', () => {
  const ids = mainIds(buildSession(STRENGTH_UPPER))
  assert.ok(!ids.some((id) => ['biceps', 'triceps', 'hombro'].includes(patternOf(exercise(id)) ?? '')), ids.join(', '))
})

test('D-092: en una sesión de hipertrofia la opción no cambia nada', () => {
  const base = { ...STRENGTH_UPPER, goals: ['hipertrofia' as const] }
  assert.deepEqual(mainIds(buildSession({ ...base, strengthAccessories: true })), mainIds(buildSession(base)))
})
