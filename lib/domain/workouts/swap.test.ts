/**
 * Cambiar el ejercicio en curso con un motivo (D-095).
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import { findExercise } from './catalog'
import { availableEquipment, NO_EQUIPMENT } from './equipment'
import { jointsOf } from './joints'
import { patternOf } from './patterns'
import type { AxisProposal } from '../axis/types'
import { canChangeLevel, canSwapExercise, completeSet, startWorkout, swapExercise, toWorkoutSession } from './active-workout'
import { describeEquipmentNeeded, discomfortZonesOf, SWAP_REASONS, swapOptions } from './swap'
import type { Equipment, Exercise } from './types'

const exercise = (id: string) => findExercise(id) as Exercise
const BODYWEIGHT = availableEquipment(NO_EQUIPMENT)
const FULL: Equipment[] = ['ninguno', 'superficie_elevada', 'pesa', 'par_pesas', 'kettlebell', 'barra_dominadas', 'gomas', 'banco']

test('sin material: nada que pida lo que pedía el ejercicio, y el mismo patrón', () => {
  const press = exercise('press-suelo-mancuernas')
  const options = swapOptions(press, 'sin_material', { equipment: FULL })
  assert.ok(options.length > 0)
  for (const option of options) {
    assert.equal(patternOf(option), 'empuje_horizontal')
    assert.ok(!option.equipment.includes('par_pesas'), option.id)
  }
  assert.ok(options.some((option) => option.id.startsWith('flexiones')))
})

test('nunca propone lo que ya está en la sesión, ni el propio ejercicio, ni lo que no se puede hacer hoy', () => {
  const options = swapOptions(exercise('flexiones'), 'otro', { equipment: BODYWEIGHT, inSession: ['flexiones', 'flexiones-rodillas'] })
  const ids = options.map((option) => option.id)
  assert.ok(!ids.includes('flexiones') && !ids.includes('flexiones-rodillas'))
  for (const option of options) assert.ok(option.equipment.every((item) => BODYWEIGHT.includes(item)), option.id)
})

test('por molestias: ni su familia, y solo lo que carga menos la zona o es más suave', () => {
  const press = exercise('press-suelo-mancuernas')
  const joints = jointsOf(press.id)
  const options = swapOptions(press, 'molestia', { equipment: FULL })
  assert.ok(options.length > 0)
  for (const option of options) {
    assert.notEqual(option.family, press.family)
    const shared = jointsOf(option.id).filter((joint) => joints.includes(joint)).length
    assert.ok(shared < joints.length || option.difficulty < press.difficulty, option.id)
  }
})

test('si el patrón no da más de sí, se busca en el hermano; por molestias, no', () => {
  const squat = exercise('sentadilla')
  const disliked = swapOptions(squat, 'no_me_gusta', { equipment: BODYWEIGHT })
  assert.ok(disliked.length > 0)
  assert.ok(disliked.every((option) => patternOf(option) === 'zancada' || patternOf(option) === 'sentadilla'))
  assert.ok(swapOptions(squat, 'molestia', { equipment: BODYWEIGHT }).every((option) => patternOf(option) === 'sentadilla'))
})

test('sin material en un ejercicio que no pide nada: solo con el cuerpo', () => {
  for (const option of swapOptions(exercise('sentadilla'), 'sin_material', { equipment: FULL })) {
    assert.deepEqual(option.equipment, ['ninguno'], option.id)
  }
})

test('demasiado difícil: más accesibles, primero las de su familia', () => {
  const pushups = exercise('flexiones')
  const options = swapOptions(pushups, 'muy_dificil', { equipment: FULL })
  assert.ok(options.length > 0)
  assert.equal(options[0].family, pushups.family)
  for (const option of options) assert.ok(option.difficulty < pushups.difficulty)
})

test('demasiado fácil: más exigentes', () => {
  const easy = exercise('flexiones-inclinadas')
  for (const option of swapOptions(easy, 'muy_facil', { equipment: FULL })) assert.ok(option.difficulty > easy.difficulty)
})

test('no me gusta: fuera su familia; lo que no gusta, al final', () => {
  const pushups = exercise('flexiones')
  const options = swapOptions(pushups, 'no_me_gusta', { equipment: FULL, disliked: ['press-suelo-mancuernas'] })
  assert.ok(options.every((option) => option.family !== pushups.family))
  const disliked = options.findIndex((option) => option.id === 'press-suelo-mancuernas')
  if (disliked !== -1) assert.equal(disliked, options.length - 1)
})

test('cada motivo tiene su texto y el material se describe', () => {
  assert.equal(SWAP_REASONS.length, 6)
  assert.equal(describeEquipmentNeeded(exercise('flexiones')), 'Sin material')
  assert.equal(describeEquipmentNeeded(exercise('press-banca-mancuernas')), 'Con banco y dos pesas')
})

test('por molestias con la zona dicha: nada que la cargue, y puede buscar en el patrón hermano', () => {
  const squat = exercise('sentadilla')
  assert.ok(discomfortZonesOf(squat).includes('rodilla'))
  const options = swapOptions(exercise('press-suelo-mancuernas'), 'molestia', { equipment: FULL, zone: 'muneca' })
  for (const option of options) assert.ok(!jointsOf(option.id).includes('muneca'), option.id)
  for (const option of swapOptions(squat, 'molestia', { equipment: FULL, zone: 'rodilla' })) {
    assert.ok(!jointsOf(option.id).includes('rodilla'), option.id)
  }
})

function proposalWith(exerciseId: string): AxisProposal {
  const item = exercise(exerciseId)
  return {
    id: 'p1',
    type: 'TRAINING',
    headline: 'Fuerza',
    reason: '',
    factors: [],
    session: {
      focus: 'tren_superior',
      title: 'Fuerza · Tren superior',
      intensity: 'moderada',
      estimatedMinutes: 30,
      muscleGroups: ['pecho'],
      exercises: [
        { exerciseId: item.id, name: item.name, sets: 4, reps: 10, isTimed: false, suggestedWeightKg: null, restSeconds: 75, unilateral: false, tempo: null, imageUrl: null },
        { exerciseId: 'plancha', name: 'Plancha', sets: 3, reps: 30, isTimed: true, suggestedWeightKg: null, restSeconds: 45, unilateral: false, tempo: null, imageUrl: null },
      ],
    },
  } as unknown as AxisProposal
}

test('sin series hechas, cambiar sustituye el ejercicio y apunta el motivo', () => {
  const workout = startWorkout(proposalWith('flexiones'))!
  const changed = swapExercise(workout, { exercise: exercise('flexiones-rodillas'), sets: 3, reps: 8, weightKg: null, loads: [], note: 'más fácil' })
  assert.equal(changed.entries.length, 2)
  assert.equal(changed.entries[0].exerciseId, 'flexiones-rodillas')
  assert.equal(changed.modifications.at(-1)?.detail, 'Flexiones → Flexiones con rodillas (más fácil).')
})

test('a mitad de ejercicio: lo hecho se queda, y el nuevo entra detrás con las series que faltan', () => {
  const started = completeSet(completeSet(startWorkout(proposalWith('flexiones'))!))
  assert.equal(canSwapExercise(started), true)
  assert.equal(canChangeLevel(started), false)

  const changed = swapExercise(started, { exercise: exercise('flexiones-rodillas'), sets: 3, reps: 8, weightKg: null, loads: [], note: 'por molestias' })
  assert.deepEqual(changed.entries.map((entry) => entry.exerciseId), ['flexiones', 'flexiones-rodillas', 'plancha'])
  assert.equal(changed.exerciseIndex, 1)
  assert.equal(changed.entries[0].sets.length, 2)
  assert.equal(changed.entries[0].targetSets, 4, 'el objetivo no cambia: no cuenta como completo')
  assert.equal(changed.entries[1].targetSets, 2)
  assert.equal(changed.entries[1].reps, 8)
  assert.ok(changed.rest, 'el descanso sigue')
  assert.equal(changed.modifications.at(-1)?.detail, 'Flexiones → Flexiones con rodillas tras 2 series, por molestias.')

  const session = toWorkoutSession(completeSet(completeSet({ ...changed, rest: null })), { status: 'completed' })
  assert.deepEqual(session.exercises.map((item) => [item.exerciseId, item.sets.length]), [['flexiones', 2], ['flexiones-rodillas', 2]])
})
