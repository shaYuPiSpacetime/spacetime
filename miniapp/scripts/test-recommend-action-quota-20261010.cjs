const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')
const source = fs.readFileSync(path.join(__dirname, '../src/pages/recommend/index.tsx'), 'utf8')

function actionHarness() {
  let resolveView
  const view = new Promise(resolve => { resolveView = resolve })
  const model = { skip: 0, like: 0, next: 0, reload: 0, view: 0 }
  const deps = {
    candidate: { candidateNo: '100', userId: 100, liked: false, profile: {} },
    candidateIndex: 0, page: { preferenceVersion: 1 }, refreshing: false,
    actionSubmitting: false, actionSubmittingRef: { current: false },
    candidateRequestGenerationRef: { current: 1 },
    setActionSubmitting: () => {},
    awaitCurrentCandidateView: () => { model.view++; return view },
    loadCandidates: async () => { model.reload++ },
    recordRecommendSkip: async () => { model.skip++ },
    sendRelationLike: async () => { model.like++; return {} },
    cancelRelationLike: async () => assert.fail('not cancelling'),
    recordRecommendLike: async () => {},
    updateCandidate: () => {},
    showNextCandidate: async () => { model.next++ },
    createRequestId: () => 'request',
    Taro: { showToast: async () => {} },
  }
  const snippet = ts.transpileModule(source.slice(source.indexOf('  const advanceCandidate ='), source.indexOf('  const updateCandidate =')), {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText
  const handlers = Function(...Object.keys(deps), snippet + ';return {advanceCandidate,toggleLike}')(...Object.values(deps))
  return { ...handlers, deps, model, resolveView }
}

for (const action of ['advanceCandidate', 'toggleLike']) {
  test(`${action}: 40次快速连点只扣一次曝光、提交一次动作并推进一次`, async () => {
    const h = actionHarness()
    const pending = Array.from({ length: 40 }, () => h[action]())
    assert.equal(h.model.view, 1)
    assert.equal(h.model.skip + h.model.like, 0, '曝光确认前不得写动作')
    h.resolveView(true)
    await Promise.all(pending)
    assert.equal(h.model.skip + h.model.like, 1)
    assert.equal(h.model.next, 1)
    assert.equal(h.deps.actionSubmittingRef.current, false)
  })
  test(`${action}: 曝光失败不写动作、不推进，刷新服务端额度`, async () => {
    const h = actionHarness()
    const pending = h[action]()
    h.resolveView(false)
    await pending
    assert.equal(h.model.skip + h.model.like, 0)
    assert.equal(h.model.next, 0)
    assert.equal(h.model.reload, 1)
    assert.equal(h.deps.actionSubmittingRef.current, false)
  })
  test(`${action}: 等待曝光时刷新队列，旧请求不能提交动作或推进`, async () => {
    const h = actionHarness()
    const pending = h[action]()
    h.deps.candidateRequestGenerationRef.current++
    h.resolveView(true)
    await pending
    assert.equal(h.model.skip + h.model.like, 0)
    assert.equal(h.model.next, 0)
  })
}

test('等待曝光时刷新队列，旧showNextCandidate不能跳过新队列第一位', async () => {
  let resolveView
  const pendingView = new Promise(resolve => { resolveView = resolve })
  let advances = 0
  const deps = {
    candidateRequestGenerationRef: { current: 1 }, page: {}, hasRecommendCycleExpired: () => false,
    awaitCurrentCandidateView: () => pendingView, candidateIndex: 0, candidates: [{}, {}],
    setCandidateIndex: () => { advances++ }, loadCandidates: async () => {},
  }
  const snippet = ts.transpileModule(source.slice(source.indexOf('  const showNextCandidate ='), source.indexOf('  const advanceCandidate =')), {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText
  const next = Function(...Object.keys(deps), snippet + ';return showNextCandidate')(...Object.values(deps))
  const pending = next()
  deps.candidateRequestGenerationRef.current++
  resolveView(true)
  await pending
  assert.equal(advances, 0)
})
