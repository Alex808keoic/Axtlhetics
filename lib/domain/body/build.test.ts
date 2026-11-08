import assert from 'node:assert/strict'
import test from 'node:test'

import { bodyBuild, bodyMassIndex, bodyStartFactor, isLean, isYouth, WHO_BMI_FOR_AGE } from './build'

test('D-096: IMC con una décima', () => {
  assert.equal(bodyMassIndex(40.5, 161), 15.6)
  assert.equal(bodyMassIndex(0, 161), null)
  assert.equal(bodyMassIndex(70, 0), null)
})

test('D-096: de 5 a 19 años se compara con la OMS por edad y sexo', () => {
  // Alex: 14 años, 40,5 kg, 161 cm → 15,6, entre −2 DE (15,5) y −1 DE (17,0).
  assert.deepEqual(bodyBuild({ age: 14, weightKg: 40.5, heightCm: 161, sex: 'hombre' }), { bmi: 15.6, band: 'justo', reference: 'oms_edad' })
  assert.equal(bodyBuild({ age: 14, weightKg: 38, heightCm: 161, sex: 'hombre' })?.band, 'delgadez')
  assert.equal(bodyBuild({ age: 14, weightKg: 50, heightCm: 161, sex: 'hombre' })?.band, 'normal')
  assert.equal(bodyBuild({ age: 14, weightKg: 60, heightCm: 161, sex: 'hombre' })?.band, 'sobrepeso')
  assert.equal(bodyBuild({ age: 14, weightKg: 70, heightCm: 161, sex: 'hombre' })?.band, 'obesidad')
  // Sin sexo, la media de las dos tablas.
  assert.equal(bodyBuild({ age: 14, weightKg: 40.5, heightCm: 161, sex: null })?.band, 'justo')
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

test('D-096: la tabla cubre de 5 a 19 años y cada fila va de menor a mayor', () => {
  for (const sex of ['hombre', 'mujer'] as const) {
    for (let age = 5; age <= 19; age++) {
      const row = WHO_BMI_FOR_AGE[sex][age]
      assert.ok(row, `${sex} ${age}`)
      for (let i = 1; i < row.length; i++) assert.ok(row[i] > row[i - 1], `${sex} ${age}`)
    }
  }
})

test('D-096: justo de peso o por debajo es «lean»; edad y peso de partida', () => {
  assert.equal(isLean(bodyBuild({ age: 14, weightKg: 40.5, heightCm: 161, sex: 'hombre' })), true)
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
