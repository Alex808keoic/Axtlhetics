import assert from 'node:assert/strict'
import test from 'node:test'

import { addDays, type DayKey } from '../shared/dates'
import { DELOAD_AFTER_WEEKS, deloadReason, isDeloadWeek, isStalling, LOADED_WEEK_MIN_SESSIONS } from './deload'
import type { WorkoutSession } from './types'

/** Lunes 2026-10-12. */
const MONDAY: DayKey = '2026-10-12'

function session(dayKey: DayKey, partial: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: `s-${dayKey}`,
    dayKey,
    startedAt: `${dayKey}T18:00:00.000Z`,
    completedAt: `${dayKey}T19:00:00.000Z`,
    durationSeconds: 3600,
    focus: 'tren_superior',
    title: 'Fuerza · Tren superior',
    intensity: 'moderada',
    muscleGroups: ['pecho'],
    exercises: [],
    totalVolumeKg: 0,
    status: 'completed',
    perceivedEffort: null,
    proposal: null,
    modifications: [],
    notes: null,
    ...partial,
  }
}

/** `count` sesiones en la semana que empieza `weeksBack` semanas antes de MONDAY. */
function week(weeksBack: number, count = LOADED_WEEK_MIN_SESSIONS, partial: Partial<WorkoutSession> = {}): WorkoutSession[] {
  const monday = addDays(MONDAY, -7 * weeksBack)
  return Array.from({ length: count }, (_, i) => session(addDays(monday, i * 2), partial))
}

const LOADED = Array.from({ length: DELOAD_AFTER_WEEKS }, (_, i) => week(i + 1)).flat()

test('D-031: tras cuatro semanas cargadas seguidas, esta es de descarga, cualquier día', () => {
  assert.equal(isDeloadWeek(LOADED, MONDAY), true)
  assert.equal(isDeloadWeek(LOADED, addDays(MONDAY, 6)), true, 'el domingo, igual que el lunes')
})

test('D-031: una semana floja en medio corta la cuenta', () => {
  const history = [...week(1), ...week(2), ...week(3, 1), ...week(4)]
  assert.equal(isDeloadWeek(history, MONDAY), false)
})

test('D-031: no se encadenan dos descargas: la semana de descarga cuenta como floja', () => {
  const deloadProposal = { proposalId: 'p', type: 'TRAINING', headline: '', reason: '', focus: null, intensity: null, deload: true }
  const history = [...week(1, 2, { proposal: deloadProposal }), ...week(2), ...week(3), ...week(4), ...week(5)]
  assert.equal(isDeloadWeek(history, MONDAY), false)
})

test('D-031: las sesiones abandonadas no cargan la semana', () => {
  const history = [...week(1, 2, { status: 'abandoned' }), ...week(2), ...week(3), ...week(4)]
  assert.equal(isDeloadWeek(history, MONDAY), false)
})

// ---------------------------------------------------------------------------
// D-091: el estancamiento adelanta la descarga
// ---------------------------------------------------------------------------

/** Tres ejercicios por sesión: `missed` de ellos sin completar lo previsto. */
function stalled(missed: number): Partial<WorkoutSession> {
  return {
    exercises: ['flexiones', 'sentadilla', 'remo-unilateral'].map((exerciseId, index) => ({
      exerciseId,
      name: exerciseId,
      targetSets: 3,
      targetReps: 10,
      sets: [10, 10, index < missed ? 6 : 10].map((reps) => ({ reps, weightKg: null, completed: true })),
    })),
  }
}

test('D-091: con tres semanas cargadas y estancamiento en las dos últimas, descarga ya', () => {
  const history = [...week(1, 2, stalled(2)), ...week(2, 2, stalled(1)), ...week(3)]
  assert.equal(deloadReason(history, MONDAY), 'estancamiento')
  assert.equal(isDeloadWeek(history, addDays(MONDAY, 6)), true, 'el domingo, igual que el lunes')
})

test('D-091: progresando bien, tres semanas no bastan', () => {
  const history = [...week(1, 2, stalled(0)), ...week(2, 2, stalled(0)), ...week(3)]
  assert.equal(deloadReason(history, MONDAY), null)
})

test('D-091: el estancamiento solo cuenta desde la tercera semana cargada', () => {
  const history = [...week(1, 2, stalled(3)), ...week(2, 2, stalled(3))]
  assert.equal(deloadReason(history, MONDAY), null)
})

test('D-091: las cuatro semanas siguen siendo descarga por calendario', () => {
  assert.equal(deloadReason(LOADED, MONDAY), 'calendario')
})

test('D-091: con pocos ejercicios no se juzga el estancamiento', () => {
  assert.equal(isStalling(week(1, 1, stalled(3)), addDays(MONDAY, -7), MONDAY), false)
})
