/**
 * Preguntas generales (D-097): lo que el motor no sabe y no debe fingir que sabe.
 *
 * El motor reconoce intenciones por palabras sueltas. Con una pregunta de
 * alimentación o de conocimiento general eso falla de la peor manera: no dice
 * «no lo sé», sino que contesta otra cosa. «He comido 2100 kcal, 95 g de
 * proteína… ¿qué debería mejorar?» llevaba «proteína» y «hoy» y acababa en
 * «tu recuperación está en 86». «¿Es malo entrenar con agujetas?» llevaba
 * «entrenar» y acababa en la sesión de hoy.
 *
 * Aquí se reconocen antes que cualquier intención y van a la IA, que contesta
 * con libertad y con los datos del usuario (sus objetivos, su alimentación de
 * hoy y sus objetivos de comida). Lo médico se mira antes y sigue en el
 * determinista. Sin IA, se dice con honestidad que no se puede contestar bien.
 *
 * Este módulo es puro: solo lee el mensaje.
 */

import { normalizeQuestion } from './intents'

export type GeneralTopic = 'nutrition' | 'knowledge'

/**
 * Alimentación: el motor no tiene nada que decir de ella, así que cualquier
 * mención va a la IA. El agua no está: la hidratación es de Recuperación.
 */
const NUTRITION_PATTERNS: readonly RegExp[] = [
  /\b(comer|comido|comi|comiendo|comida|comidas|comes)\b/,
  /\bque (como|ceno|desayuno|almuerzo|meriendo|tomo|bebo)\b/,
  /\b(desayuno|desayunar|almuerzo|merienda|cena|cenar|cenado|picoteo|snack)\b/,
  /\b(kcal|calorias?|proteinas?|carbohidratos?|hidratos|grasas?|macros?|fibra|azucar(es)?)\b/,
  /\b(dieta|alimentacion|nutricion|nutriente|suplementos?|creatina|batidos?|whey|vitaminas?|cafeina|bebida energetica)\b/,
  /\b(fruta|verdura|legumbres|bolleria|comida basura|ultraprocesad)/,
]

/**
 * Lo que es del plan del usuario y sí sabe el motor: si aparece, una pregunta
 * de conocimiento se deja a las intenciones de siempre («¿cómo mejoro la
 * sesión de hoy?» es un cambio, no una charla).
 */
const PLAN_WORDS = /\b(hoy|manana|ayer|sesion|semana|toca|tocaba|propones|propuesta|plan|planning|test|escaner)\b/

/** Conocimiento general de entrenamiento, recuperación o deporte. */
const KNOWLEDGE_PATTERNS: readonly RegExp[] = [
  /\b(es|son|seria) (malo|mala|malos|bueno|buena|buenos|normal|recomendable|mejor|peor|sano|sana|necesario|peligroso)\b/,
  /\bcomo (puedo |podria |hago (para )?|se )?(mejor\w*|gan\w*|aument\w*|perd\w*|baj\w*|sub\w*|crec\w*|consig\w*|evit\w*|preven\w*|ser mas|tener mas|correr mas|saltar mas)/,
  /\b(masa muscular|ganar musculo|ganar peso|perder peso|perder grasa|definir|crecer mas)\b/,
  /\b(cuant[oa]s?|que) (tengo que|debo|deberia|hay que|necesito|se debe|conviene)\b/,
  /\b(antes|despues) de (entrenar|correr|jugar|un partido|competir|nadar|dormir|un entreno)\b/,
  /\bestiramientos\b/,
  /\b(vale la pena|sirve de algo|que opinas de|que piensas de|que me recomiendas para)\b/,
]

/**
 * El tema general del mensaje, o `null` si es algo que el motor sabe responder.
 *
 * Quien llama comprueba antes lo médico y lo ajeno: esto no los ve.
 */
export function detectGeneral(message: string): GeneralTopic | null {
  const text = normalizeQuestion(message)
  if (NUTRITION_PATTERNS.some((pattern) => pattern.test(text))) return 'nutrition'
  if (PLAN_WORDS.test(text)) return null
  if (KNOWLEDGE_PATTERNS.some((pattern) => pattern.test(text))) return 'knowledge'
  return null
}

/** Sin IA, la respuesta honesta: mejor eso que contestar otra cosa. */
export const GENERAL_FALLBACK_TEXT =
  'Esa es una buena pregunta, pero ahora mismo no puedo contestarla bien: para eso necesito estar conectado y no lo estoy. Pruébalo de nuevo en un momento. Mientras, puedo contarte tu sesión de hoy, cómo vas de recuperación o tu semana.'

/** Vocabulario para la corrección de faltas (D-026). */
export const GENERAL_VOCABULARY: readonly string[] = [
  'comer',
  'comido',
  'comida',
  'desayuno',
  'merienda',
  'cena',
  'calorias',
  'proteina',
  'proteinas',
  'carbohidratos',
  'hidratos',
  'grasas',
  'macros',
  'dieta',
  'alimentacion',
  'nutricion',
  'suplementos',
  'creatina',
  'batido',
  'vitaminas',
  'verdura',
  'fruta',
  'estiramientos',
  'masa muscular',
]
