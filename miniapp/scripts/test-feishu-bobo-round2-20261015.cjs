const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const read = file => fs.readFileSync(path.join(__dirname, '../src', file), 'utf8')
const compile = source => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText

function handler(file, start, end, deps, name) {
  const source = read(file)
  const begin = source.indexOf(start)
  const finish = source.indexOf(end, begin)
  assert.ok(begin >= 0 && finish > begin)
  return Function(...Object.keys(deps), `${compile(source.slice(begin, finish))}; return ${name}`)(...Object.values(deps))
}

for (const mode of ['正常', '无凭证', '失败']) {
  test(`评论提交使用当前微信会话，${mode}时仍由后端决定审核状态`, async () => {
    const calls = []
    const events = []
    const stubs = {
      '@tarojs/taro': { default: { login: async () => {
        if (mode === '失败') throw Error('微信暂不可用')
        return mode === '正常' ? { code: 'current-wechat-code' } : {}
      } } },
      './request': { post: async (url, body) => { calls.push([url, body]); return { status: 'pending' } } },
      '@/domain/communityPersonalEvents': { withCommunityPersonalRefresh: (promise, event) => { events.push(event); return promise } },
    }
    const mod = { exports: {} }
    Function('module', 'exports', 'require', compile(read('services/community.ts')))(mod, mod.exports, name => stubs[name] || {})
    const result = await mod.exports.createCommunityComment(23, '测试评论', 4, 5)
    assert.equal(result.status, 'pending')
    assert.deepEqual(calls, [['/miniapp/community/comments', {
      postId: 23, content: '测试评论', parentCommentId: 4, replyUserId: 5,
      wechatLoginCode: mode === '正常' ? 'current-wechat-code' : undefined,
    }]])
    assert.deepEqual(events, [{ kind: 'interaction' }])
  })
}

test('仍有聊天来源但已取消喜欢时，可以重新发送喜欢', async () => {
  const calls = []
  let profile = { liked: false, matched: true, canEnterConversation: true }
  let liked = false
  const deps = {
    profile, liked, likeSubmitting: false, targetUserId: 8, sourceScene: 'profile',
    likeRequestId: { current: null }, returnAfterUnlike: false,
    createRequestId: () => 'like-request', setLikeSubmitting() {},
    setLiked: value => { liked = value }, setProfile: update => { profile = update(profile) },
    sendRelationLike: async (...args) => { calls.push(args); return { matched: true, canEnterConversation: true, matchNo: 'MATCH-1' } },
    cancelRelationLike: () => assert.fail('未喜欢不能执行取消'),
    Taro: { showToast: async () => {} }, getApiErrorCode: () => undefined,
  }
  await handler('pages/heart/user.tsx', '  const toggleLike =', '  const openConversation =', deps, 'toggleLike')()
  assert.deepEqual(calls, [[8, 'profile', 'like-request']])
  assert.equal(liked, true)
  assert.equal(profile.matched, true)
  assert.equal(profile.communicationMode, 'PRIVATE_MESSAGE')
})

for (const mode of ['确认', '取消', '失败']) {
  test(`待审语音撤回重录：${mode}`, async () => {
    const events = []
    const deps = {
      voiceDetail: { canSubmit: false }, voiceSaving: false, voiceTempPath: '',
      Taro: { showModal: async () => ({ confirm: mode !== '取消' }) },
      setVoiceSaving: value => events.push(['saving', value]),
      setVoiceDetail: value => events.push(['detail', value]),
      resetVoiceDraft: () => events.push(['reset']),
      setVoiceSheet: value => events.push(['sheet', value]),
      showError: async () => events.push(['error']),
      prd01Api: {
        deleteVoiceIntro: async () => { events.push(['withdraw']); if (mode === '失败') throw Error('撤回失败') },
        getVoiceIntro: async () => ({ canSubmit: true }),
      },
    }
    await handler('pages/profile/edit.tsx', '  const openVoiceRecorder =', '  const cancelVoiceConfirm =', deps, 'openVoiceRecorder')()
    if (mode === '取消') assert.deepEqual(events, [])
    else if (mode === '失败') assert.deepEqual(events, [['saving', true], ['withdraw'], ['error'], ['saving', false]])
    else assert.deepEqual(events, [['saving', true], ['withdraw'], ['detail', { canSubmit: true }], ['reset'], ['sheet', 'voice'], ['saving', false]])
  })
}
