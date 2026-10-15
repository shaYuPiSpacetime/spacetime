const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

test('待人工评论只显示提交回执，以公开列表为准，不追加待审正文或评论数', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/pages/qianxun/post-detail.tsx'), 'utf8')
  const start = source.indexOf('  const submitComment = async () => {')
  const end = source.indexOf('\n  const beginReply', start)
  assert.ok(start >= 0 && end > start)
  const compiled = ts.transpileModule(`${source.slice(start, end)}; return submitComment`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText
  const seen = { comments: null, post: null, toast: null, sending: [], content: null }
  const detail = { id: 50001, commentCount: 3 }
  const publicComments = [{ id: 70001, content: '公开评论' }]
  const context = {
    comment: ' 待人工测试 ', post: detail, sendingComment: false, replyTarget: undefined, config: {},
    setSendingComment: value => seen.sending.push(value),
    createCommunityComment: async (postId, content) => {
      assert.equal(postId, detail.id)
      assert.equal(content, '待人工测试')
      return { id: 70002, status: 'pending', message: '评论已提交，等待人工审核' }
    },
    setComment: value => { seen.content = value }, setReplyTarget() {}, setCommentFocused() {},
    getCommunityPostDetail: async () => detail,
    getCommunityComments: async () => ({ records: publicComments }),
    setPost: value => { seen.post = value }, setComments: value => { seen.comments = value },
    Taro: { showToast: async value => { seen.toast = value.title } },
    showError: async (_, error) => { throw error },
  }
  await Function(...Object.keys(context), compiled)(...Object.values(context))()
  assert.deepEqual(seen.sending, [true, false])
  assert.equal(seen.content, '')
  assert.equal(seen.toast, '评论已提交，等待人工审核')
  assert.equal(seen.post.commentCount, 3)
  assert.deepEqual(seen.comments, publicComments)
  assert.ok(seen.comments.every(row => row.id !== 70002))
})

test('管理端允许待人工评论审批，明确违规评论仍不能直接转为公开', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../frontend/src/pages/community/CommunityCommentAuditPage.tsx'), 'utf8')
  const start = source.indexOf('function commentActionAllowed(')
  const end = source.indexOf('\nexport default', start)
  assert.ok(start >= 0 && end > start)
  const compiled = ts.transpileModule(`${source.slice(start, end)}; return commentActionAllowed`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText
  const allowed = Function(compiled)()
  for (const action of ['published', 'rejected', 'blocked', 'warn_user', 'mute_user']) {
    assert.equal(allowed('pending', action), true, `pending -> ${action}`)
  }
  assert.equal(allowed('pending_machine', 'published'), true)
  assert.equal(allowed('rejected', 'published'), false)
  assert.equal(allowed('deleted', 'published'), false)
  assert.equal(allowed(undefined, 'published'), false)
  assert.match(source, /机审历史结论/)
})
