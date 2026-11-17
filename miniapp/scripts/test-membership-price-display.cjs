/* eslint-env node */
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const source = readFileSync(path.join(__dirname, '../src/domain/membershipPriceDisplay.ts'), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const loaded = { exports: {} }
Function('module', 'exports', compiled)(loaded, loaded.exports)
const { formatMembershipDuration, formatMembershipAveragePrice } = loaded.exports

for (const [days, price, duration, average] of [
  [30, 38, '1个月', '¥38.00/月'],
  [90, 100, '3个月', '¥33.33/月'],
  [150, 148, '5个月', '¥29.60/月'],
  [180, 200, '6个月', '¥33.33/月'],
  [365, 298, '12个月', '¥24.83/月'],
  [730, 500, '24个月', '¥20.83/月'],
  [15, 10, '15天', '¥10.00/15天'],
  [91, 100, '91天', '¥100.00/91天'],
  [undefined, 38, '1个月', '¥38.00/月'],
]) {
  test(`${days ?? '默认'}天套餐按实际周期展示时长与均价`, () => {
    assert.equal(formatMembershipDuration(days), duration)
    assert.equal(formatMembershipAveragePrice(price, days), average)
  })
}
