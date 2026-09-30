const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const src = path.resolve(__dirname, '../src')
const read = file => fs.readFileSync(path.join(src, file), 'utf8')

test('本人主页预览的可见分享按钮直接调用微信原生分享', () => {
  const preview = read('pages/profile/components/ProfilePreviewPage.tsx')
  const edit = read('pages/profile/edit.tsx')
  assert.match(preview, /<Button openType="share" aria-label="分享用户主页"/)
  assert.doesNotMatch(preview, /<Image[^>]*onClick=\{onShare\}/)
  assert.match(edit, /useShareAppMessage\(\(\) => \(\{/)
})

test('会员页每次展示都读取审核通过的有效头像', () => {
  const membership = read('pages/membership/index.tsx')
  assert.match(membership, /prd01Api\.getAvatar\(\)/)
  assert.match(membership, /effectiveAvatarUrl/)
  assert.match(membership, /heroAvatar = approvedAvatar\.trim\(\) \|\| authAvatar/)
})

test('语音提交待审核时展示已提交状态，不伪装成未录音', () => {
  const edit = read('pages/profile/edit.tsx')
  assert.match(edit, /voiceIntroAuditStatus === 'PENDING' \|\| voice\?\.voiceIntroAuditStatus === 'REVIEWING'/)
  assert.match(edit, /语音已提交，审核通过后展示/)
  assert.match(edit, /voiceDetail\?\.canSubmit === false/)
})

test('三天回看跳过人数读取当天成功跳过标记，不由最后动作推断', () => {
  const replay = read('pages/prd08/recommend/replay/index.tsx')
  assert.match(replay, /items\.filter\(item => item\.skipped === true\)\.length/)
  assert.doesNotMatch(replay, /item\.lastAction === 'skip'/)
})
