import assert from 'node:assert/strict'
import test from 'node:test'

import { bmiForAgeZ, bodyBuild, bodyMassIndex, bodyStartFactor, isLean, isYouth, lmsZ, referenceMonth } from './build'
import { WHO_BMI_LMS, WHO_FIRST_MONTH, WHO_LAST_MONTH } from './who-bmi-for-age'

test('D-096: IMC con una décima', () => {
  assert.equal(bodyMassIndex(40.5, 161), 15.6)
  assert.equal(bodyMassIndex(0, 161), null)
  assert.equal(bodyMassIndex(70, 0), null)
})

test('D-096: la tabla de la OMS reproduce sus propias desviaciones (168 meses, chicos)', () => {
  // Del Excel oficial bmi-boys-z-who-2007-exp: a los 168 meses, −2 DE = 15,475 y −1 DE = 17,004.
  const row = WHO_BMI_LMS.hombre[168 - WHO_FIRST_MONTH]
  assert.ok(Math.abs(lmsZ(15.475, row) + 2) < 0.005)
  assert.ok(Math.abs(lmsZ(17.004, row) + 1) < 0.005)
  assert.ok(Math.abs(lmsZ(row[1], row)) < 1e-9, 'la mediana es z = 0')
})

test('D-096: de 5 a 19 años se compara con la OMS por edad en meses y sexo', () => {
  // Alex: 14 años (174 meses), 40,5 kg, 161 cm → IMC 15,6, z −2,09: bajo de peso.
  assert.deepEqual(bodyBuild({ age: 14, weightKg: 40.5, heightCm: 161, sex: 'hombre' }), { bmi: 15.6, band: 'delgadez', reference: 'oms_edad', z: -2.09 })
  assert.equal(bodyBuild({ age: 14, weightKg: 43, heightCm: 161, sex: 'hombre' })?.band, 'justo')
  assert.equal(bodyBuild({ age: 14, weightKg: 50, heightCm: 161, sex: 'hombre' })?.band, 'normal')
  assert.equal(bodyBuild({ age: 14, weightKg: 60, heightCm: 161, sex: 'hombre' })?.band, 'sobrepeso')
  assert.equal(bodyBuild({ age: 14, weightKg: 70, heightCm: 161, sex: 'hombre' })?.band, 'obesidad')
  // Sin sexo, la media de las dos puntuaciones.
  const mean = (bmiForAgeZ(15.6, 14, 'hombre') + bmiForAgeZ(15.6, 14, 'mujer')) / 2
  assert.equal(bmiForAgeZ(15.6, 14, null), mean)
})

test('D-096: la edad en meses es la mitad del año cumplido, dentro de la tabla', () => {
  assert.equal(referenceMonth(14), 174)
  assert.equal(referenceMonth(5), 66)
  assert.equal(referenceMonth(19), WHO_LAST_MONTH)
  for (const sex of ['hombre', 'mujer'] as const) assert.equal(WHO_BMI_LMS[sex].length, WHO_LAST_MONTH - WHO_FIRST_MONTH + 1)
})

test('D-096: desde los 20, los cortes de adulto; por debajo de 5, nada', () => {
  assert.equal(bodyBuild({ age: 30, weightKg: 70, heightCm: 175 })?.band, 'normal')
  assert.equal(bodyBuild({ age: 30, weightKg: 55, heightCm: 180 })?.band, 'justo')
  assert.equal(bodyBuild({ age: 30, weightKg: 50, heightCm: 180 })?.band, 'delgadez')
  assert.equal(bodyBuild({ age: 30, weightKg: 80, heightCm: 175 })?.band, 'sobrepeso')
  assert.equal(bodyBuild({ age: 30, weightKg: 95, heightCm: 175 })?.band, 'obesidad')
  assert.equal(bodyBuild({ age: 30, weightKg: 70, heightCm: 175 })?.reference, 'adulto')
  assert.equal(bodyBuild({ age: 4, weightKg: 17, heightCm: 105 }), null)
  assert.equal(bodyBuild({ age: null, weightKg: 70, heightCm: 175 }), null)
})

test('D-096: justo de peso o por debajo es «lean»; edad y peso de partida', () => {
  assert.equal(isLean(bodyBuild({ age: 14, weightKg: 40.5, heightCm: 161, sex: 'hombre' })), true)
  assert.equal(isLean(bodyBuild({ age: 14, weightKg: 43, heightCm: 161, sex: 'hombre' })), true)
  assert.equal(isLean(bodyBuild({ age: 30, weightKg: 70, heightCm: 175 })), false)
  assert.equal(isLean(null), false)
  assert.equal(isYouth(15), true)
  assert.equal(isYouth(16), false)
  assert.equal(isYouth(null), false)
  assert.equal(bodyStartFactor(14, 40.5), 0.6)
  assert.equal(bodyStartFactor(16, 56), 0.8)
  assert.equal(bodyStartFactor(17, 80), 1)
  assert.equal(bodyStartFactor(30, 40), 1, 'un adulto, como antes')
})
