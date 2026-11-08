/**
 * Peso para la altura y la edad (D-096).
 *
 * Con la edad, el peso y la altura AXIS sabe si alguien va justo de peso, en un
 * rango normal o por encima. **No es un diagnóstico** ni dice nada de estética:
 * solo sirve para no proponer comer menos a quien va justo, cuidar las
 * articulaciones de quien pesa bastante más y explicar por qué.
 *
 * - **De 5 a 19 años**, el IMC se compara con la referencia de la OMS de 2007
 *   para su edad y sexo (`WHO_BMI_FOR_AGE`: −2 DE, −1 DE, mediana, +1 DE y
 *   +2 DE por año cumplido, redondeadas a una décima). Por debajo de −2 DE es
 *   **delgadez**; entre −2 y −1 DE, **justo de peso**; por encima de +1 DE,
 *   **sobrepeso**, y de +2 DE, **obesidad**. Sin sexo, la media de las dos tablas.
 * - **Desde los 20**, los cortes de adulto: 18,5, 25 y 30. Por debajo de 17 es
 *   delgadez; de 17 a 18,5, justo de peso.
 * - Por debajo de 5 años o sin datos, no se dice nada.
 */

/** Mayoría de edad: lo que cambia para un menor (alimentación, carga). */
export const ADULT_AGE = 18
/** Por debajo de esta edad, sin trabajo de repeticiones bajas ni días fuertes. */
export const YOUTH_AGE = 16

export type BodyBuildBand = 'delgadez' | 'justo' | 'normal' | 'sobrepeso' | 'obesidad'

export type BodyBuild = {
  bmi: number
  band: BodyBuildBand
  /** Con qué se ha comparado: la tabla por edad de la OMS o los cortes de adulto. */
  reference: 'oms_edad' | 'adulto'
}

/** [−2 DE, −1 DE, mediana, +1 DE, +2 DE] de IMC por edad (5–19 años), OMS 2007. */
type Row = readonly [number, number, number, number, number]

export const WHO_BMI_FOR_AGE: Record<'hombre' | 'mujer', Readonly<Record<number, Row>>> = {
  hombre: {
    5: [13.0, 14.1, 15.3, 16.6, 18.3],
    6: [13.0, 14.1, 15.3, 16.8, 18.5],
    7: [13.1, 14.2, 15.5, 17.0, 19.0],
    8: [13.3, 14.4, 15.7, 17.4, 19.7],
    9: [13.5, 14.6, 16.0, 17.9, 20.5],
    10: [13.7, 14.9, 16.4, 18.5, 21.4],
    11: [14.1, 15.3, 16.9, 19.2, 22.5],
    12: [14.5, 15.8, 17.5, 19.9, 23.6],
    13: [14.9, 16.4, 18.2, 20.8, 24.8],
    14: [15.5, 17.0, 19.0, 21.8, 25.9],
    15: [16.0, 17.6, 19.8, 22.7, 27.0],
    16: [16.5, 18.2, 20.5, 23.5, 27.9],
    17: [16.9, 18.8, 21.1, 24.3, 28.6],
    18: [17.3, 19.2, 21.7, 24.9, 29.2],
    19: [17.6, 19.6, 22.2, 25.4, 29.7],
  },
  mujer: {
    5: [12.7, 13.9, 15.2, 16.9, 18.9],
    6: [12.7, 13.9, 15.3, 17.0, 19.2],
    7: [12.7, 13.9, 15.4, 17.3, 19.8],
    8: [12.9, 14.1, 15.7, 17.7, 20.6],
    9: [13.1, 14.4, 16.1, 18.3, 21.5],
    10: [13.5, 14.8, 16.6, 19.0, 22.6],
    11: [13.9, 15.3, 17.2, 19.9, 23.7],
    12: [14.4, 16.0, 18.0, 20.8, 25.0],
    13: [14.9, 16.6, 18.8, 21.8, 26.2],
    14: [15.4, 17.2, 19.6, 22.7, 27.3],
    15: [15.9, 17.8, 20.2, 23.5, 28.2],
    16: [16.2, 18.2, 20.7, 24.1, 28.9],
    17: [16.4, 18.5, 21.0, 24.5, 29.3],
    18: [16.4, 18.6, 21.3, 24.8, 29.5],
    19: [16.5, 18.7, 21.4, 25.0, 29.7],
  },
}

const MIN_TABLE_AGE = 5
const MAX_TABLE_AGE = 19

export function bodyMassIndex(weightKg: number, heightCm: number): number | null {
  if (!(weightKg > 0) || !(heightCm > 0)) return null
  const meters = heightCm / 100
  return Math.round((weightKg / (meters * meters)) * 10) / 10
}

function rowFor(age: number, sex: 'hombre' | 'mujer' | null): Row {
  const year = Math.floor(age)
  if (sex) return WHO_BMI_FOR_AGE[sex][year]
  const men = WHO_BMI_FOR_AGE.hombre[year]
  const women = WHO_BMI_FOR_AGE.mujer[year]
  return men.map((value, index) => Math.round(((value + women[index]) / 2) * 10) / 10) as unknown as Row
}

function bandFrom(bmi: number, [minus2, minus1, , plus1, plus2]: Row): BodyBuildBand {
  if (bmi < minus2) return 'delgadez'
  if (bmi < minus1) return 'justo'
  if (bmi > plus2) return 'obesidad'
  if (bmi > plus1) return 'sobrepeso'
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
  const bmi = bodyMassIndex(input.weightKg ?? 0, input.heightCm ?? 0)
  if (bmi === null) return null
  if (age <= MAX_TABLE_AGE) {
    return { bmi, band: bandFrom(bmi, rowFor(age, input.sex ?? null)), reference: 'oms_edad' }
  }
  // Los cortes de adulto son «menor que 25», «menor que 30»: 25 ya es sobrepeso.
  const band: BodyBuildBand = bmi < 17 ? 'delgadez' : bmi < 18.5 ? 'justo' : bmi < 25 ? 'normal' : bmi < 30 ? 'sobrepeso' : 'obesidad'
  return { bmi, band, reference: 'adulto' }
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
