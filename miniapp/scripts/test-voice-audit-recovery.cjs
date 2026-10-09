const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

function createSubmitHandler(saved, calls) {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/pages/profile/edit.tsx'), 'utf8')
  const start = source.indexOf('  const confirmVoiceRecording = async () => {')
  const end = source.indexOf('\n  const openVoiceRecorder', start)
  assert.ok(start >= 0 && end > start, '应找到真实录音提交函数')
  const handler = source.slice(start, end).replace('const confirmVoiceRecording =', '').trim()
  const dependencies = {
    voiceSaving: false,
    voiceTempPath: 'local-recording',
    voiceTempDuration: 20,
    closeVoiceSheet: () => calls.push('close'),
    setVoiceSaving: value => calls.push(['saving', value]),
    prd01Api: {
      uploadVoice: async () => ({ url: 'uploaded-recording' }),
      submitVoiceIntro: async () => saved,
    },
    setVoiceDetail: value => calls.push(['detail', value]),
    setVoiceSheet: value => calls.push(['sheet', value]),
    Taro: { showToast: options => calls.push(['toast', options.title]) },
    refreshProfileScore: () => calls.push('score'),
    resetVoiceDraft: () => calls.push('reset'),
    showError: () => calls.push('error'),
  }
  return Function(...Object.keys(dependencies), `return (${handler})`)(...Object.values(dependencies))
}

test('语音审核调用失败时保留录音并提示重新提交', async () => {
  const calls = []
  await createSubmitHandler({ voiceIntroAuditStatus: 'EXPIRED', canSubmit: true, voiceIntroRejectReason: '请重新提交' }, calls)()
  assert.ok(calls.some(item => Array.isArray(item) && item[0] === 'sheet' && item[1] === 'complete'))
  assert.ok(calls.some(item => Array.isArray(item) && item[0] === 'toast' && item[1] === '请重新提交'))
  assert.ok(!calls.includes('reset'), '失败时不能清空录音草稿')
  assert.ok(!calls.includes('score'), '失败时不刷新完成度')
  assert.deepEqual(calls.at(-1), ['saving', false])
})

test('真实异步受理后仍关闭录音弹窗并清理草稿', async () => {
  const calls = []
  await createSubmitHandler({ voiceIntroAuditStatus: 'REVIEWING', canSubmit: false }, calls)()
  assert.ok(calls.includes('reset'))
  assert.ok(calls.includes('score'))
  assert.ok(calls.some(item => Array.isArray(item) && item[0] === 'sheet' && item[1] === null))
})
