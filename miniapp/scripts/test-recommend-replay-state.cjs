const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

async function loadDomain() {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/domain/recommendReplay.js'), 'utf8')
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
}

test('三天回放无记录时仍展示三个自然日', async () => {
  const { buildReplayGroups } = await loadDomain()
  const groups = buildReplayGroups([], new Date('2026-09-28T16:30:00Z'))
  assert.deepEqual(groups.map(group => group.date), ['2026-09-29', '2026-09-28', '2026-09-27'])
  assert.ok(groups.every(group => group.items.length === 0))
})

test('回放按北京时间自然日分组并保留推荐记录', async () => {
  const { buildReplayGroups } = await loadDomain()
  const groups = buildReplayGroups([
    { viewedAt: '2026-09-29 00:05:00', candidateNo: '1' },
    { viewedAt: '2026-09-28 23:58:00', dateGroup: '今天', candidateNo: '2' },
  ], new Date('2026-09-28T16:30:00Z'))
  assert.deepEqual(groups.map(group => group.items.map(item => item.candidateNo)), [['1'], ['2'], []])
})

test('回放主页仅对会员或服务端已解锁用户直接开放', async () => {
  const { resolveReplayProfileStep } = await loadDomain()
  assert.equal(resolveReplayProfileStep(true), 'open')
  assert.equal(resolveReplayProfileStep(false), 'quote')
  assert.equal(resolveReplayProfileStep(false, { canOpen: true }), 'open')
  assert.equal(resolveReplayProfileStep(false, { canOpen: false, unitPrice: 20, coinBalance: 25 }), 'confirm')
  assert.equal(resolveReplayProfileStep(false, { canOpen: false, unitPrice: 20, coinBalance: 10 }), 'recharge')
  assert.equal(resolveReplayProfileStep(false, { canOpen: false, unitPrice: 0, coinBalance: 10 }), 'unavailable')
})
