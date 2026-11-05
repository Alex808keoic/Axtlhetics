import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PerformedExercise, WorkoutSession } from '../workouts/types'
import { plannedLine, recordsAtTheTime, setRows } from './session-detail'

function bench(weightKg: number): PerformedExercise {
  return { exerciseId: 'press', name: 'Press', sets: [{ reps: 10, weightKg, completed: true }] }
}

function session(id: string, day: string, exercise: PerformedExercise): WorkoutSession {
  return {
    id,
    dayKey: day,
    startedAt: `${day}T10:00:00.000Z`,
    completedAt: `${day}T11:00:00.000Z`,
    durationSeconds: 3600,
    focus: 'tren_superior',
    title: 'Fuerza',
    intensity: 'normal',
    muscleGroups: [],
    exercises: [exercise],
    totalVolumeKg: 0,
    status: 'completed',
    perceivedEffort: null,
    proposal: null,
    modifications: [],
    notes: null,
  } as unknown as WorkoutSession
}

test('un récord sigue siéndolo aunque después se superara', () => {
  const first = session('a', '2026-10-01', bench(40))
  const record = session('b', '2026-10-08', bench(50))
  const later = session('c', '2026-10-15', bench(60))
  const records = recordsAtTheTime(record, [later, record, first])
  assert.equal(records.length, 1)
  assert.equal(records[0].value, 50)
  assert.equal(records[0].previous, 40)
})

test('la primera sesión no tiene con qué compararse', () => {
  const first = session('a', '2026-10-01', bench(40))
  const later = session('b', '2026-10-08', bench(60))
  assert.deepEqual(recordsAtTheTime(first, [later, first]), [])
})

test('cada serie con su trabajo, su carga y su margen', () => {
  const rows = setRows(
    {
      exerciseId: 'press',
      name: 'Press',
      sets: [
        { reps: 10, weightKg: 42.5, completed: true, reserve: 'una_dos' },
        { reps: 1, weightKg: null, completed: false },
      ],
    },
    false,
  )
  assert.deepEqual(rows[0], { number: 1, work: '10 reps', weight: '42,5 kg', reserve: 'margen 1–2', completed: true })
  assert.deepEqual(rows[1], { number: 2, work: '1 rep', weight: null, reserve: null, completed: false })
})

test('los ejercicios por tiempo van en segundos', () => {
  const exercise: PerformedExercise = { exerciseId: 'plancha', name: 'Plancha', sets: [{ reps: 30, weightKg: null, completed: true }], targetSets: 3, targetReps: 30 }
  assert.equal(setRows(exercise, true)[0].work, '30 s')
  assert.equal(plannedLine(exercise, true), '3 × 30 s')
})

test('el margen antiguo, guardado en el ejercicio, es el de la última serie', () => {
  const rows = setRows(
    {
      exerciseId: 'press',
      name: 'Press',
      reserve: 'ninguna',
      sets: [
        { reps: 10, weightKg: 40, completed: true },
        { reps: 8, weightKg: 40, completed: true },
      ],
    },
    false,
  )
  assert.equal(rows[0].reserve, null)
  assert.equal(rows[1].reserve, 'margen 0')
})

test('una sesión antigua sin objetivo no inventa lo previsto', () => {
  assert.equal(plannedLine(bench(40), false), null)
})
