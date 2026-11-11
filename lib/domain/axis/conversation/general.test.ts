/**
 * Preguntas generales (D-097).
 *
 * Regresión del fallo visto en producción: «mira he comido esto: 2100 kcal,
 * 95 g de proteína… ¿qué debería mejorar?» recibía «Tu recuperación de hoy
 * está en 86». El motor no sabe de alimentación ni de conocimiento general y
 * no debe contestar otra cosa: lo contesta la IA, y sin ella se dice.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import type { UserProfile } from '../../profile/types'
import type { RecoveryInputs } from '../../recovery/types'
import type { WorkoutSession } from '../../workouts/types'
import type { AxisDay } from '../action-engine'
import { buildBriefing } from '../briefing'
import { buildAxisContext } from '../context'
import { decide } from '../engine'
import type { AxisAiTransport, AxisAiTransportRequest } from './ai'
import { answerFromBriefing } from './deterministic'
import { createAxisConversation } from './index'
import { detectGeneral, GENERAL_FALLBACK_TEXT } from './general'

const MONDAY = new Date(2026, 8, 7, 10, 0)

function profile(): UserProfile {
  return {
    id: 'primary',
    name: 'Alex',
    age: 15,
    heightCm: 175,
    weightKg: 68,
    goals: ['hipertrofia'],
    experience: 'intermedio',
    availableWeekdays: [0, 1, 2, 3, 4, 5, 6],
    typicalSessionMinutes: 60,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
  }
}

function recovery(): RecoveryInputs {
  return {
    dayKey: '2026-09-07',
    sleepHours: 9,
    energy: 4,
    muscleFatigue: 2,
    stress: 2,
    hydrationGlasses: 6,
    updatedAt: '2026-09-07T08:00:00.000Z',
  }
}

/** Tren superior hace dos días: hoy toca tren inferior. */
function session(): WorkoutSession {
  return {
    id: 'upper',
    dayKey: '2026-09-05',
    startedAt: '2026-09-05T18:00:00.000Z',
    completedAt: '2026-09-05T19:00:00.000Z',
    durationSeconds: 3600,
    focus: 'tren_superior',
    title: 'Fuerza · Tren superior',
    intensity: 'moderada',
    muscleGroups: ['pecho', 'espalda', 'hombros', 'brazos'],
    exercises: [],
    totalVolumeKg: 0,
    status: 'completed',
    perceivedEffort: 3,
    proposal: null,
    modifications: [],
    notes: null,
  }
}

function setup() {
  const context = buildAxisContext({
    profile: profile(),
    recoveryInputs: recovery(),
    recentSessions: [session()],
    activities: [],
    now: MONDAY,
  })
  const decision = decide(context)
  const briefing = buildBriefing(context, decision, [session()], decision.primary, null, [])
  const day: AxisDay = { context, decision, selected: decision.primary }
  return { context, decision, briefing, day }
}


const FOOD_LOG =
  'mira he comido esto hoy: 2100 kcal, 95 g de proteina, 260 g de carbohidratos, 70 g de grasa. que deberia mejorar para comer?'

const GENERAL = [
  FOOD_LOG,
  'hoy comí: desayuno tostadas con aceite, comida macarrones con atún, cena pollo con arroz. está bien?',
  '¿Cuánta proteína tengo que comer al día?',
  '¿Qué como antes de entrenar?',
  '¿Es malo entrenar con agujetas?',
  '¿Cuánto tengo que dormir para crecer?',
  '¿Cómo hago para ganar masa muscular?',
  '¿Puedo tomar creatina con 15 años?',
  '¿Cuántas calorías quemo jugando un partido de fútbol?',
  '¿Qué estiramientos hago después de correr?',
  '¿Cómo mejoro mi salto?',
]

/** Lo que el motor sí sabe: no cambia. */
const ENGINE = [
  ['¿Qué tal voy esta semana?', 'week'],
  ['¿Por qué hoy toca piernas?', 'why_not'],
  ['¿Qué entreno hoy?', 'today'],
  ['¿Cómo estoy recuperando?', 'recovery'],
  ['Estoy muy cansado', 'tired'],
  ['Quiero una sesión más corta', 'change'],
  ['¿Para qué sirven las flexiones?', 'exercise'],
] as const

test('las preguntas generales se reconocen antes que cualquier intención', () => {
  const { briefing } = setup()
  for (const question of GENERAL) {
    const answer = answerFromBriefing(question, briefing)
    assert.equal(answer.intent, 'general', question)
    assert.equal(answer.text, GENERAL_FALLBACK_TEXT, question)
    assert.equal(answer.proposedTarget ?? null, null, question)
  }
})

test('también con «Habla con AXIS» abierto', () => {
  const { briefing } = setup()
  const answer = answerFromBriefing('¿Qué como antes de entrenar?', briefing, { lastIntent: 'change', changeMode: true })
  assert.equal(answer.intent, 'general')
})

test('lo que sabe el motor sigue siendo del motor', () => {
  const { briefing } = setup()
  for (const [question, intent] of ENGINE) {
    assert.equal(answerFromBriefing(question, briefing).intent, intent, question)
  }
})

test('lo médico sigue en el determinista aunque hable de comida o de correr', () => {
  const { briefing } = setup()
  for (const question of ['me duele un poco la rodilla al correr, que hago?', 'me duele la tripa después de comer']) {
    assert.equal(answerFromBriefing(question, briefing).intent, 'medical', question)
  }
})

test('las preguntas de su plan no son generales', () => {
  assert.equal(detectGeneral('¿Cómo mejoro la sesión de hoy?'), null)
  assert.equal(detectGeneral('¿Es mejor entrenar mañana?'), null)
  assert.equal(detectGeneral(FOOD_LOG), 'nutrition')
  assert.equal(detectGeneral('¿Es malo entrenar con agujetas?'), 'knowledge')
})

function recording(reply: string) {
  const sent: AxisAiTransportRequest[] = []
  const transport: AxisAiTransport = {
    isConfigured: () => true,
    async send(request) {
      sent.push(request)
      return { text: reply, followUps: [] }
    },
  }
  return { sent, transport }
}

test('la IA contesta lo que ha comido con su prompt, sin la respuesta del motor y con sus cifras', async () => {
  const { briefing } = setup()
  const reply =
    'Con 95 g de proteína te quedas algo corto para ganar músculo: yo metería una fuente de proteína en el desayuno y en la merienda, como yogur, huevos o leche.\n\nLas 2100 kcal y los 260 g de hidratos están bien para entrenar; con la grasa no tocaría nada.'
  const { sent, transport } = recording(reply)
  const result = await createAxisConversation({ transport }).ask(FOOD_LOG, briefing)

  assert.equal(sent.length, 1)
  const request = sent[0] as Extract<AxisAiTransportRequest, { history?: unknown }>
  assert.equal(request.domain.intent, 'general')
  assert.equal(request.domain.text, '', 'no se manda la respuesta del motor')
  assert.match(request.system, /AHORA TE HACE UNA PREGUNTA GENERAL/)
  assert.equal(result.usedFallback, false)
  assert.equal(result.text, reply)
})

test('una cifra que no ha dado él ni está en sus datos se descarta, y se dice que no se puede contestar', async () => {
  const { briefing } = setup()
  const { transport } = recording('Te faltan unos 37 g de proteína al día.')
  const result = await createAxisConversation({ transport }).ask(FOOD_LOG, briefing)
  assert.equal(result.usedFallback, true)
  assert.equal(result.rejectedReason, 'invented_number')
  assert.equal(result.text, GENERAL_FALLBACK_TEXT)
})

test('sin IA no se contesta otra cosa: se dice', async () => {
  const { briefing } = setup()
  const result = await createAxisConversation({ aiEndpoint: null }).ask(FOOD_LOG, briefing)
  assert.equal(result.text, GENERAL_FALLBACK_TEXT)
  assert.doesNotMatch(result.text, /recuperación de hoy está/)
})
