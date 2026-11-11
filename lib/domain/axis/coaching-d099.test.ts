/**
 * D-099: días ligeros sin bajar de lo que ya se hace, zonas a cuidar sin aviso
 * diario y el plan de la semana (la que viene o lo que queda de esta).
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import type { ScheduledActivity, UserProfile } from '../profile/types'
import type { WorkoutSession } from '../workouts/types'
import { findExercise } from '../workouts/catalog'
import { buildBriefing } from './briefing'
import { buildAxisContext } from './context'
import { answerFromBriefing } from './conversation/deterministic'
import { decide } from './engine'
import { adaptDifficulty } from './session-builder'

const WEDNESDAY = new Date(2026, 10, 11, 9, 0)

function profile(partial: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'primary',
    name: 'Alex',
    age: 15,
    sex: 'hombre',
    heightCm: 175,
    weightKg: 68,
    goals: ['hipertrofia'],
    experience: 'intermedio',
    availableWeekdays: [0, 1, 2, 3, 4, 5, 6],
    typicalSessionMinutes: 60,
    equipment: { items: ['barra_dominadas'], weights: [{ kind: 'mancuerna', kg: 10, pair: true }] },
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    ...partial,
  }
}

function football(weekday: number): ScheduledActivity {
  return {
    id: `futbol-${weekday}`,
    name: 'Fútbol',
    weekday: weekday as ScheduledActivity['weekday'],
    date: null,
    startMinute: 1080,
    endMinute: 1200,
    intensity: 'alta',
    loadsMuscleGroups: ['piernas'],
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
  }
}

function pushUps(dayKey: string, completed: boolean): WorkoutSession {
  return {
    id: `s-${dayKey}`,
    dayKey,
    startedAt: `${dayKey}T18:00:00.000Z`,
    completedAt: `${dayKey}T19:00:00.000Z`,
    durationSeconds: 3600,
    focus: 'tren_superior',
    title: 'Hipertrofia · Tren superior',
    intensity: 'moderada',
    muscleGroups: ['pecho'],
    exercises: [
      {
        exerciseId: 'flexiones',
        name: 'Flexiones',
        sets: [1, 2, 3].map((n) => ({ reps: 10, weightKg: null, completed: completed || n < 3 })),
        targetSets: 3,
        targetReps: 10,
      },
    ],
    totalVolumeKg: 0,
    status: 'completed',
    perceivedEffort: null,
    effort: 3,
    proposal: null,
    modifications: [],
    notes: null,
  }
}

test('un día ligero no baja de lo que ya se hace entero', () => {
  const flexiones = findExercise('flexiones')!
  // Ya las hace enteras: hoy, flexiones, con menos series y más reserva.
  assert.equal(adaptDifficulty(flexiones, 1, { history: [pushUps('2026-11-06', true)], mode: 'light' }).id, 'flexiones')
  // Sin hacerlas aún, o a medias, el día ligero sigue bajando a la accesible (D-008).
  assert.equal(adaptDifficulty(flexiones, 1, { history: [], mode: 'light' }).id, 'flexiones-inclinadas')
  assert.equal(adaptDifficulty(flexiones, 1, { history: [pushUps('2026-11-06', false)], mode: 'light' }).id, 'flexiones-inclinadas')
})

test('la zona a cuidar no repite cada día «si la molestia sigue» ni abre el motivo', () => {
  const context = buildAxisContext({ profile: profile({ careZones: ['rodilla'] }), recoveryInputs: null, recentSessions: [], activities: [], now: WEDNESDAY })
  const { primary } = decide(context)
  const factor = primary.factors.find((item) => item.key === 'care_zones')
  assert.ok(factor)
  assert.equal(factor.detail, 'Cuido tu rodilla: dejo fuera los ejercicios que la cargan.')
  assert.doesNotMatch(primary.reason, /molestia sigue/)
})

function briefing() {
  const context = buildAxisContext({ profile: profile(), recoveryInputs: null, recentSessions: [], activities: [football(1), football(3)], now: WEDNESDAY })
  const decision = decide(context)
  return buildBriefing(context, decision, [], decision.primary)
}

test('«plan para la semana que viene» responde con la semana que viene, día a día', () => {
  const answer = answerFromBriefing('me ayudas a hacer un plan para la semana que viene?', briefing())
  assert.equal(answer.intent, 'week_plan')
  assert.match(answer.text, /^La semana que viene, si todo va como hasta ahora: lunes, /)
  assert.match(answer.text, /martes, fútbol/)
  assert.match(answer.text, /domingo, /)
  assert.match(answer.text, /Es una previsión/)
  assert.doesNotMatch(answer.text, /no hay nada que resumir/)
})

test('«qué me queda esta semana» responde con lo que queda; «qué tal voy» sigue siendo el resumen', () => {
  const b = briefing()
  const rest = answerFromBriefing('¿qué me queda esta semana?', b)
  assert.equal(rest.intent, 'week_plan')
  assert.match(rest.text, /^Lo que queda de semana, si todo va como hasta ahora: miércoles, /)
  assert.ok(!/lunes|martes,/.test(rest.text), 'sin los días ya pasados')
  assert.equal(answerFromBriefing('¿qué tal voy esta semana?', b).intent, 'week')
})

test('la semana que viene prevista lleva entrenos y respeta el deporte', () => {
  const { nextWeek } = briefing().weekPlan
  assert.equal(nextWeek.length, 7)
  assert.ok(nextWeek.some((day) => day.plan !== null))
  // Los días de fútbol no suman otra sesión (D-096).
  assert.ok(nextWeek.filter((day) => day.activities.includes('Fútbol')).every((day) => day.plan === null))
})
