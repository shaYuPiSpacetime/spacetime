import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../src/api.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText
const { api } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const originalFetch = globalThis.fetch

afterEach(() => { globalThis.fetch = originalFetch })

async function submittedStartTime(startTime) {
  let body
  globalThis.fetch = async (_url, options) => {
    body = JSON.parse(options.body)
    return new Response(JSON.stringify({ code: 200, data: {} }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  await api.publish({
    title: '周末骑行', content: '校园骑行', startTime,
    location: '大学城', estimatedCost: 0, imageIds: [1],
  })
  return body.startTime
}

test('活动发布时间将浏览器的分钟精度时间转换为后端格式', async () => {
  assert.equal(await submittedStartTime('2026-09-28T13:15'), '2026-09-28 13:15:00')
})

test('活动发布时间保留浏览器已有的秒数', async () => {
  assert.equal(await submittedStartTime('2026-09-28T13:15:30'), '2026-09-28 13:15:30')
})
