import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseRange } from './app'

test('parseRangeが終端省略とサフィックス指定の範囲を処理する', () => {
  assert.deepEqual(parseRange('bytes=10-', 100), { start: 10, end: 99 })
  assert.deepEqual(parseRange('bytes=-15', 100), { start: 85, end: 99 })
})

test('parseRangeが不正な入力を拒否する', () => {
  assert.equal(parseRange('', 100), null)
  assert.equal(parseRange('bytes=-0', 100), null)
  assert.equal(parseRange('bytes=abc-def', 100), null)
  assert.equal(parseRange('bytes=10-5', 100), null)
  assert.equal(parseRange('bytes=200-300', 100), null)
})