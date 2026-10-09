const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')
const source = fs.readFileSync(path.resolve(__dirname, '../src/pages/profile/edit.tsx'), 'utf8')
const compile = snippet => ts.transpileModule(snippet, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
}).outputText

function renderSheet(variant) {
  const snippet = source.slice(source.indexOf('function VoiceIntroSheet('), source.indexOf('function VoiceWave('))
  const deps = { React: { createElement: (type, props, ...children) => ({ type, props, children }) } }
  for (const name of ['View', 'Text', 'VoiceToast', 'VoiceWave', 'VoiceActionButton', 'VoiceRoundButton', 'VoiceConfirmDialog']) deps[name] = name
  const render = Function(...Object.keys(deps), `${compile(snippet)};return VoiceIntroSheet`)(...Object.values(deps))
  return render({ variant, voiceIntro: { states: { voice: {}, complete: {} } }, onCancelConfirm: () => {} })
}

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return []
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  return [tree, ...(tree.children || []).flatMap(nodes)]
}

test('语音删除只渲染确认弹窗，不渲染管理面板', () => {
  const tree = nodes(renderSheet('delete'))
  assert.equal(tree.filter(node => node.type === 'VoiceConfirmDialog').length, 1)
  assert.equal(tree.some(node => node.props?.id === 'voice-complete-actions'), false)
  assert.equal(tree.some(node => node.props?.style?.height === 'calc(548rpx + env(safe-area-inset-bottom))'), false)
})

test('非删除状态仍保留录音管理功能', () => {
  assert.equal(nodes(renderSheet('complete')).some(node => node.props?.id === 'voice-complete-actions'), true)
})

test('取消删除返回资料页，取消退出仍返回录音中', () => {
  const snippet = source.slice(source.indexOf('  const cancelVoiceConfirm ='), source.indexOf('  const confirmDiscardRecording ='))
  for (const initial of ['delete', 'exit']) {
    let state = initial
    const cancel = Function('setVoiceSheet', 'voiceSheet', 'stopVoicePlayback', `${compile(snippet)};return cancelVoiceConfirm`)(
      value => { state = typeof value === 'function' ? value(state) : value }, initial, () => {},
    )
    cancel()
    assert.equal(state, initial === 'delete' ? null : 'recording')
  }
})

test('服务端删除成功关闭弹窗，不再进入语音管理页', async () => {
  const snippet = source.slice(source.indexOf('  const confirmDeleteVoice ='), source.indexOf('  const handleVoiceSheetChange ='))
  let sheet = 'delete'
  let deletes = 0
  const deps = {
    stopVoicePlayback: () => {}, voiceTempPath: '', resetVoiceDraft: () => {},
    setVoiceSheet: value => { sheet = value }, voiceDetail: { voiceIntroUrl: 'saved-voice' }, voiceSaving: false,
    setVoiceSaving: () => {}, prd01Api: { deleteVoiceIntro: async () => { deletes++ } },
    setVoiceDetail: () => {}, refreshProfileScore: () => {}, showError: () => {},
    Taro: { showToast: () => {} },
  }
  Function(...Object.keys(deps), `${compile(snippet)};return confirmDeleteVoice`)(...Object.values(deps))()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(deletes, 1)
  assert.equal(sheet, null)
})
