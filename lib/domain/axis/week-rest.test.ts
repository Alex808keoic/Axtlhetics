/**
 * D-096: la semana como un todo. Entrenos y deporte suman; las sesiones que
 * tocan salen de la experiencia, la edad y el deporte; y hay días libres.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import type { ScheduledActivity, UserProfile } from '../profile/types'
import type { RecoveryInputs } from '../recovery/types'
import type { WorkoutSession } from '../workouts/types'
import { buildAxisContext } from './context'
import { deriveFacts } from './facts'
import { decide } from './engine'

// La semana real que motivó D-096: 2026-11-02 es lunes; hoy, domingo 8.
const SUNDAY = new Date(2026, 10, 8, 12, 0)

function profile(partial: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'primary',
    name: 'Alex',
    age: 14,
    sex: 'hombre',
    heightCm: 161,
    weightKg: 40.5,
    goals: ['fuerza', 'hipertrofia', 'rendimiento_deportivo'],
    experience: 'principiante',
    availableWeekdays: [0, 1, 3, 4, 5, 6],
    typicalSessionMinutes: 45,
    createdAt: '2026-11-03T06:31:07.792Z',
    updatedAt: '2026-11-03T06:31:07.792Z',
    ...partial,
  }
}

function recovery(dayKey: string, partial: Partial<RecoveryInputs> = {}): RecoveryInputs {
  return {
    dayKey,
    sleepHours: 9,
    energy: 4,
    muscleFatigue: 2,
    stress: 2,
    hydrationGlasses: 6,
    updatedAt: `${dayKey}T08:00:00.000Z`,
    ...partial,
  }
}

function session(dayKey: string, partial: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: `session-${dayKey}`,
    dayKey,
    startedAt: `${dayKey}T18:00:00.000Z`,
    completedAt: `${dayKey}T18:40:00.000Z`,
    durationSeconds: 2400,
    focus: 'tren_superior',
    title: 'Fuerza · Tren superior',
    intensity: 'moderada',
    muscleGroups: ['pecho', 'espalda', 'hombros', 'brazos'],
    exercises: [],
    totalVolumeKg: 300,
    status: 'completed',
    perceivedEffort: 2,
    proposal: null,
    modifications: [],
    notes: null,
    ...partial,
  }
}

function basket(partial: Partial<ScheduledActivity>): ScheduledActivity {
  return {
    id: `basket-${partial.weekday ?? partial.date}`,
    name: 'Baloncesto',
    weekday: 0,
    date: null,
    startMinute: null,
    endMinute: null,
    intensity: 'media',
    loadsMuscleGroups: ['piernas', 'gluteos', 'core'],
    createdAt: '2026-11-03T06:33:01.411Z',
    updatedAt: '2026-11-03T06:33:01.411Z',
    ...partial,
  }
}

/** Baloncesto lunes (baja), miércoles (alta) y jueves (media), y el partido del sábado 7. */
const ALEX_SPORT = [
  basket({ weekday: 0, intensity: 'baja' }),
  basket({ weekday: 2, intensity: 'alta' }),
  basket({ weekday: 3, intensity: 'media' }),
  basket({ weekday: 5, date: '2026-11-07', intensity: 'alta' }),
]

/** Entrenó martes, jueves, viernes y sábado. */
const ALEX_SESSIONS = ['2026-11-07', '2026-11-06', '2026-11-05', '2026-11-03'].map((day) => session(day))

function context(overrides: Partial<Parameters<typeof buildAxisContext>[0]> = {}) {
  return buildAxisContext({
    profile: profile(),
    recoveryInputs: recovery('2026-11-08', { muscleFatigue: 4, energy: 2, sleepHours: 10, hydrationGlasses: 2 }),
    recentSessions: ALEX_SESSIONS,
    activities: ALEX_SPORT,
    now: SUNDAY,
    ...overrides,
  })
}

test('D-096: la semana de Alex — 7 días seguidos activos, el domingo no se entrena', () => {
  const ctx = context()
  const facts = deriveFacts(ctx)
  assert.equal(facts.activeStreak, 6, 'lunes a sábado, todos con entreno o deporte')
  assert.equal(facts.sessionsThisWeek, 4)
  // Principiante de 14 años con 4 días de baloncesto esta semana: 6 − 4 = 2 sesiones.
  assert.equal(facts.weeklySessionCap, 2)

  const { primary, alternatives } = decide(ctx)
  assert.equal(primary.type, 'REST')
  assert.equal(primary.rule, 'active_streak')
  assert.match(primary.reason, /6 días seguidos/)
  // Si aun así quiere moverse, hay sesión corta y movilidad.
  assert.ok(alternatives.some((item) => item.rule === 'alternative_mobility'))
})

test('D-096: las sesiones de la semana hechas → descanso, aunque el día esté disponible', () => {
  // Sin racha: el viernes y el sábado no hubo nada.
  const ctx = context({
    activities: [basket({ weekday: 0 }), basket({ weekday: 2 })],
    recentSessions: [session('2026-11-03'), session('2026-11-05'), session('2026-11-02')],
    recoveryInputs: recovery('2026-11-08'),
  })
  const facts = deriveFacts(ctx)
  assert.equal(facts.weeklySessionCap, 3)
  assert.equal(facts.sessionsThisWeek, 3)
  const { primary } = decide(ctx)
  assert.equal(primary.type, 'REST')
  assert.equal(primary.rule, 'weekly_cap_reached')
  assert.match(primary.reason, /ya llevas 3 entrenamientos/)
})

test('D-096: un día con deporte no suma entreno si quedan días libres para las sesiones', () => {
  // Miércoles 4, baloncesto fuerte; quedan jueves a domingo libres para 3 sesiones.
  const ctx = context({
    profile: profile({ availableWeekdays: [0, 1, 2, 3, 4, 5, 6] }),
    activities: [basket({ weekday: 2, intensity: 'alta' })],
    recentSessions: [],
    recoveryInputs: recovery('2026-11-04'),
    now: new Date(2026, 10, 4, 10, 0),
  })
  const { primary } = decide(ctx)
  assert.equal(primary.type, 'REST')
  assert.equal(primary.rule, 'sport_day_with_room')
  assert.match(primary.reason, /baloncesto/)
})

test('D-096: sin días libres por delante, el día con deporte sigue adaptando la sesión', () => {
  // Domingo con partido fuerte y ninguna sesión hecha: no queda otro día.
  const ctx = context({
    activities: [basket({ weekday: 6, intensity: 'alta' })],
    recentSessions: [],
    recoveryInputs: recovery('2026-11-08'),
  })
  const { primary } = decide(ctx)
  assert.equal(primary.rule, 'demanding_activity_today')
})

test('D-096: un deporte suave no cuenta como día doble', () => {
  const ctx = context({
    profile: profile({ availableWeekdays: [0, 1, 2, 3, 4, 5, 6] }),
    activities: [basket({ weekday: 2, intensity: 'baja' })],
    recentSessions: [],
    recoveryInputs: recovery('2026-11-04'),
    now: new Date(2026, 10, 4, 10, 0),
  })
  assert.notEqual(decide(ctx).primary.rule, 'sport_day_with_room')
})

test('D-096: tras un partido exigente con la fatiga alta, hoy se recupera', () => {
  const ctx = context({
    activities: [basket({ weekday: 4, intensity: 'alta' })],
    recentSessions: [session('2026-11-03')],
    recoveryInputs: recovery('2026-11-07', { muscleFatigue: 4 }),
    now: new Date(2026, 10, 7, 10, 0),
  })
  const { primary } = decide(ctx)
  assert.equal(primary.type, 'RECOVERY')
  assert.equal(primary.rule, 'after_demanding_sport')
  assert.match(primary.reason, /fatiga muscular alta/)
})

test('D-096: tras un día doble (partido exigente y entreno), hoy se recupera', () => {
  const ctx = context({
    activities: [basket({ weekday: 4, intensity: 'alta' })],
    recentSessions: [session('2026-11-06')],
    recoveryInputs: recovery('2026-11-07'),
    now: new Date(2026, 10, 7, 10, 0),
  })
  const { primary } = decide(ctx)
  assert.equal(primary.rule, 'after_demanding_sport')
  assert.match(primary.reason, /día doble/)
})

test('D-096: tras un partido exigente, bien recuperado y sin entreno ayer, se entrena', () => {
  const ctx = context({
    activities: [basket({ weekday: 4, intensity: 'alta' })],
    recentSessions: [session('2026-11-03')],
    recoveryInputs: recovery('2026-11-07'),
    now: new Date(2026, 10, 7, 10, 0),
  })
  assert.notEqual(decide(ctx).primary.rule, 'after_demanding_sport')
})

test('D-096: el deporte de ayer que no se jugó no cuenta para la racha', () => {
  const sport = ([0, 1, 2, 3, 4, 5] as const).map((weekday) => basket({ weekday, intensity: 'baja' }))
  const played = deriveFacts(context({ activities: sport, recentSessions: [] }))
  assert.equal(played.activeStreak, 6)
  const cancelled = deriveFacts(context({ activities: sport, recentSessions: [], cancelledYesterday: ['Baloncesto'] }))
  assert.equal(cancelled.activeStreak, 0)
})

test('D-096: la complexión y la edad llegan al motor y se explican', () => {
  // Martes 3, sin nada cerca: un día normal de entreno.
  const ctx = context({
    activities: [],
    recentSessions: [],
    recoveryInputs: recovery('2026-11-03'),
    now: new Date(2026, 10, 3, 10, 0),
  })
  const facts = deriveFacts(ctx)
  assert.equal(facts.bodyBuild?.band, 'delgadez', 'IMC 15,6 a los 14 (174 meses): z −2,09 frente a la OMS')
  const { primary } = decide(ctx)
  const keys = primary.factors.map((factor) => factor.key)
  assert.ok(keys.includes('body_build'), keys.join(', '))
  assert.doesNotMatch(primary.factors.find((f) => f.key === 'body_build')!.detail, /delgad|flaco|estétic/i)
})

test('D-096: el peso apuntado manda sobre el del perfil para la complexión', () => {
  const ctx = context({ weightKg: 52, recentSessions: [] })
  assert.equal(deriveFacts(ctx).bodyBuild?.band, 'normal')
})
