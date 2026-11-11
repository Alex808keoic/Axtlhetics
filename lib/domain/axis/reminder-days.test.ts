/**
 * D-100: los avisos de entreno siguen los días en que AXIS prevé entreno.
 *
 * Caso real: disponible lunes, miércoles, viernes y domingo, con baloncesto
 * lunes, miércoles, jueves y sábado. Los avisos iban a lunes y miércoles, días
 * en que AXIS pone descanso por el baloncesto (D-096).
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import type { ScheduledActivity, UserProfile } from '../profile/types'
import { buildAxisContext } from './context'
import { decide } from './engine'
import { projectNextWeek, trainingWeekdays } from './week-view'

const WEDNESDAY = new Date(2026, 10, 11, 9, 0)
const AVAILABLE: UserProfile['availableWeekdays'] = [0, 2, 4, 6]

function basket(weekday: number): ScheduledActivity {
  return {
    id: `basket-${weekday}`,
    name: 'Baloncesto',
    weekday: weekday as ScheduledActivity['weekday'],
    date: null,
    startMinute: null,
    endMinute: null,
    intensity: 'media',
    loadsMuscleGroups: ['piernas', 'gluteos', 'core'],
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
  }
}

test('con baloncesto los días disponibles, los avisos van a los días en que AXIS prevé entreno', () => {
  const profile: UserProfile = {
    id: 'primary',
    name: 'Alex',
    age: 15,
    sex: 'hombre',
    heightCm: 161,
    weightKg: 42,
    goals: ['fuerza', 'rendimiento_deportivo'],
    experience: 'principiante',
    availableWeekdays: AVAILABLE,
    typicalSessionMinutes: 45,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
  }
  const context = buildAxisContext({ profile, recoveryInputs: null, recentSessions: [], activities: [0, 2, 3, 5].map(basket), now: WEDNESDAY })
  const days = trainingWeekdays(projectNextWeek(context, decide(context).primary), AVAILABLE)
  // Viernes y domingo: lunes y miércoles hay baloncesto y AXIS descansa.
  assert.deepEqual(days, [4, 6])
})

test('sin ningún entreno previsto, los días disponibles', () => {
  assert.deepEqual(trainingWeekdays([], [1, 3]), [1, 3])
})
