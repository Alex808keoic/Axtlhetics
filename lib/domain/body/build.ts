/**
 * Peso para la altura y la edad (D-096).
 *
 * Con la edad, el peso y la altura AXIS sabe si alguien va justo de peso, en un
 * rango normal o por encima. **No es un diagnóstico** ni dice nada de estética:
 * solo sirve para no proponer comer menos a quien va justo, cuidar las
 * articulaciones de quien pesa bastante más y explicar por qué.
 *
 * - **De 5 a 19 años**, la puntuación z del IMC frente a la referencia oficial
 *   de la OMS de 2007 para su edad en meses y su sexo (`WHO_BMI_LMS`, método
 *   LMS). El perfil guarda años cumplidos, así que se toma la mitad del año
 *   (años × 12 + 6). Por debajo de −2 es **delgadez**; de −2 a −1, **justo de
 *   peso**; por encima de +1, **sobrepeso**, y de +2, **obesidad** (los cortes
 *   de la OMS). Sin sexo, la media de las dos puntuaciones.
 * - **Desde los 20**, los cortes de adulto: 18,5, 25 y 30. Por debajo de 17 es
 *   delgadez; de 17 a 18,5, justo de peso.
 * - Por debajo de 5 años o sin datos, no se dice nada.
 */

import { WHO_BMI_LMS, WHO_FIRST_MONTH, WHO_LAST_MONTH, type Lms } from './who-bmi-for-age'

/** Mayoría de edad: lo que cambia para un menor (alimentación, carga). */
export const ADULT_AGE = 18
/** Por debajo de esta edad, sin trabajo de repeticiones bajas con carga. */
export const YOUTH_AGE = 16

export type BodyBuildBand = 'delgadez' | 'justo' | 'normal' | 'sobrepeso' | 'obesidad'

export type BodyBuild = {
  bmi: number
  band: BodyBuildBand
  /** Con qué se ha comparado: la referencia por edad de la OMS o los cortes de adulto. */
  reference: 'oms_edad' | 'adulto'
  /** Puntuación z frente a la OMS (dos decimales); `null` con los cortes de adulto. */
  z: number | null
}

const MIN_TABLE_AGE = 5
const MAX_TABLE_AGE = 19

function exactBmi(weightKg: number, heightCm: number): number | null {
  if (!(weightKg > 0) || !(heightCm > 0)) return null
  const meters = heightCm / 100
  return weightKg / (meters * meters)
}

export function bodyMassIndex(weightKg: number, heightCm: number): number | null {
  const bmi = exactBmi(weightKg, heightCm)
  return bmi === null ? null : Math.round(bmi * 10) / 10
}

/** La edad en meses que se usa con la tabla: la mitad del año cumplido, dentro de la tabla. */
export function referenceMonth(age: number): number {
  return Math.min(WHO_LAST_MONTH, Math.max(WHO_FIRST_MONTH, Math.round(Math.floor(age) * 12 + 6)))
}

/** Puntuación z LMS: ((IMC / M)^L − 1) / (L · S). */
export function lmsZ(bmi: number, [l, m, s]: Lms): number {
  return l === 0 ? Math.log(bmi / m) / s : (Math.pow(bmi / m, l) - 1) / (l * s)
}

/** La puntuación z del IMC para la edad (en años) y el sexo. Sin sexo, la media de las dos. */
export function bmiForAgeZ(bmi: number, age: number, sex: 'hombre' | 'mujer' | null): number {
  const row = referenceMonth(age) - WHO_FIRST_MONTH
  if (sex) return lmsZ(bmi, WHO_BMI_LMS[sex][row])
  return (lmsZ(bmi, WHO_BMI_LMS.hombre[row]) + lmsZ(bmi, WHO_BMI_LMS.mujer[row])) / 2
}

function bandFromZ(z: number): BodyBuildBand {
  if (z < -2) return 'delgadez'
  if (z < -1) return 'justo'
  if (z > 2) return 'obesidad'
  if (z > 1) return 'sobrepeso'
  return 'normal'
}

export function bodyBuild(input: {
  age: number | null | undefined
  weightKg: number | null | undefined
  heightCm: number | null | undefined
  sex?: 'hombre' | 'mujer' | null
}): BodyBuild | null {
  const { age } = input
  if (age === null || age === undefined || !Number.isFinite(age) || age < MIN_TABLE_AGE) return null
  const exact = exactBmi(input.weightKg ?? 0, input.heightCm ?? 0)
  if (exact === null) return null
  const bmi = Math.round(exact * 10) / 10
  if (age <= MAX_TABLE_AGE) {
    const z = bmiForAgeZ(exact, age, input.sex ?? null)
    return { bmi, band: bandFromZ(z), reference: 'oms_edad', z: Math.round(z * 100) / 100 }
  }
  // Los cortes de adulto son «menor que 25», «menor que 30»: 25 ya es sobrepeso.
  const band: BodyBuildBand = bmi < 17 ? 'delgadez' : bmi < 18.5 ? 'justo' : bmi < 25 ? 'normal' : bmi < 30 ? 'sobrepeso' : 'obesidad'
  return { bmi, band, reference: 'adulto', z: null }
}

/** Va justo de peso o por debajo: nunca se le propone comer menos. */
export function isLean(build: BodyBuild | null): boolean {
  return build?.band === 'delgadez' || build?.band === 'justo'
}

/** Cómo lo dice AXIS, sin estética ni diagnóstico. */
export const BODY_BUILD_TEXT: Record<BodyBuildBand, string> = {
  delgadez: 'Para tu edad y altura vas bajo de peso',
  justo: 'Para tu edad y altura vas justo de peso',
  normal: 'Para tu edad y altura tu peso está en un rango normal',
  sobrepeso: 'Para tu edad y altura tu peso está algo por encima de lo habitual',
  obesidad: 'Para tu edad y altura tu peso está bastante por encima de lo habitual',
}

/** Menor de 16 años (D-096): sin repeticiones bajas con carga. */
export function isYouth(age: number | null | undefined): boolean {
  return age !== null && age !== undefined && Number.isFinite(age) && age < YOUTH_AGE
}

/** Peso de referencia del catálogo para el peso de partida (un adulto medio). */
export const REFERENCE_BODY_KG = 70
/** Lo menos que baja el peso de partida por el peso corporal. */
export const MIN_BODY_START_FACTOR = 0.6

/**
 * Un menor que pesa menos que el adulto de referencia empieza con menos peso
 * (D-096): las referencias del catálogo son de adulto. Un adulto, igual que antes.
 */
export function bodyStartFactor(age: number | null | undefined, weightKg: number | null | undefined): number {
  if (age === null || age === undefined || age >= ADULT_AGE || !weightKg || weightKg <= 0) return 1
  return Math.max(MIN_BODY_START_FACTOR, Math.min(1, weightKg / REFERENCE_BODY_KG))
}
