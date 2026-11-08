import assert from 'node:assert/strict'
import test from 'node:test'

import { ageSessionCap, plannedSessionsPerWeek, sportDaysInWeek, weeklySessionCap } from './weekly-cap'

const base = { availableDays: 7, experience: 'intermedio' as const, age: 30, sportDays: 0 }

test('D-096: las sesiones salen de la experiencia, no de los días marcados', () => {
  assert.equal(weeklySessionCap({ ...base, experience: 'principiante' }), 3)
  assert.equal(weeklySessionCap(base), 4)
  assert.equal(weeklySessionCap({ ...base, experience: 'avanzado' }), 5)
  // Nunca más que los días disponibles.
  assert.equal(weeklySessionCap({ ...base, availableDays: 2 }), 2)
  assert.equal(weeklySessionCap({ ...base, availableDays: 0 }), 0)
})

test('D-096: la edad limita: menos de 16, 3; de 16 a 17 y desde 65, 4', () => {
  assert.equal(ageSessionCap(14), 3)
  assert.equal(ageSessionCap(16), 4)
  assert.equal(ageSessionCap(17), 4)
  assert.equal(ageSessionCap(18), null)
  assert.equal(ageSessionCap(65), 4)
  assert.equal(ageSessionCap(null), null)
  assert.equal(weeklySessionCap({ ...base, experience: 'avanzado', age: 15 }), 3)
  assert.equal(weeklySessionCap({ ...base, experience: 'avanzado', age: 70 }), 4)
})

test('D-096: entre entrenos y deporte, como mucho 6 días; nunca menos de 2 sesiones', () => {
  assert.equal(weeklySessionCap({ ...base, sportDays: 2 }), 4)
  assert.equal(weeklySessionCap({ ...base, sportDays: 3 }), 3)
  assert.equal(weeklySessionCap({ ...base, sportDays: 5 }), 2)
  assert.equal(weeklySessionCap({ ...base, sportDays: 7 }), 2)
  // Con un tope ya bajo, el deporte no lo sube.
  assert.equal(weeklySessionCap({ ...base, experience: 'principiante', age: 14, sportDays: 1 }), 3)
})

test('D-096: los días con deporte de la semana cuentan una vez, con los partidos de esa semana', () => {
  const activities = [
    { weekday: 0 as const, date: null },
    { weekday: 0 as const, date: null },
    { weekday: 2 as const, date: null },
    { weekday: 5 as const, date: '2026-11-07' },
    { weekday: 5 as const, date: '2026-11-14' },
  ]
  assert.deepEqual(sportDaysInWeek(activities, '2026-11-08'), ['2026-11-02', '2026-11-04', '2026-11-07'])
  assert.equal(sportDaysInWeek(activities, '2026-11-10').length, 3, 'la semana siguiente tiene su propio partido')
})

test('D-096: la semana de Alex — principiante de 14 años con 4 días de baloncesto: 2 sesiones', () => {
  const profile = { availableWeekdays: [0, 1, 3, 4, 5, 6], experience: 'principiante' as const, age: 14 }
  const recurring = [0, 2, 3].map((weekday) => ({ weekday: weekday as 0 | 2 | 3, date: null }))
  assert.equal(plannedSessionsPerWeek(profile, recurring, '2026-11-04'), 3)
  assert.equal(plannedSessionsPerWeek(profile, [...recurring, { weekday: 5 as const, date: '2026-11-07' }], '2026-11-08'), 2)
  assert.equal(plannedSessionsPerWeek(null, [], '2026-11-08'), 3)
})
