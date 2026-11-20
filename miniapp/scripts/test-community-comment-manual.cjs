const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const React = require('react')
const { createRoot } = require('react-dom/client')
const { JSDOM } = require('jsdom')
const { act } = React
const dom = new JSDOM('<body></body>')
global.window = dom.window
global.document = dom.window.document
global.IS_REACT_ACT_ENVIRONMENT = true

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function mountDetail(t) {
  const detail = deferred(), meta = deferred(), requests = [], toasts = [], posts = []
  let input
  const none = () => null
  const host = ({ children, id, role, onClick }) => React.createElement('div', { id, role, onClick }, children)
  const taro = {
    useLoad: fn => React.useEffect(() => { fn({ id: '17' }) }, []),
    useShareAppMessage() {},
    showToast: async options => { toasts.push(options.title) },
  }
  const services = {
    COMMUNITY_COPY_KEYS: {}, resolveCommunityCopy: () => '', resolveCommunityFeedback: (_, __, error) => error.message,
    getCommunityMeta: () => meta.promise,
    getCommunityPostDetail: id => { posts.push(id); return detail.promise },
    recordCommunityView: async () => {},
    getCommunityComments: (id, page, size) => {
      assert.deepEqual([id, page, size], [17, 1, 100])
      const pending = deferred(); requests.push(pending); return pending.promise
    },
    createCommunityComment: async (id, content) => {
      assert.deepEqual([id, content], [17, '待人工测试'])
      return { message: '评论已提交，等待人工审核' }
    },
  }
  const deps = {
    '@tarojs/components': { View: host, Text: host, Image: none, ScrollView: host, Input: props => { input = props; return null } },
    '@tarojs/taro': { __esModule: true, default: taro, ...taro },
    '@/services/community': services,
    '@/stores/authStore': { useAuthStore: fn => fn({ userId: 1 }) },
    '@/stores/prd01Store': { usePrd01Store: fn => fn({ optionLabel: () => '' }) },
    '@/hooks/useAccessStatus': { useAccessStatus: () => ({ status: { coreAccessStatus: 'CORE_ALLOWED' } }) },
    '@/domain/communityProfile': { formatCommunityAuthorMeta: () => '' },
    '@/domain/communityCommentThreads': { buildCommunityCommentThreads: records => records.map(root => ({ root, replies: [] })) },
    '@/components/NativeNavigation': { __esModule: true, default: none, getNativeNavigationMetrics: () => ({ navigationHeight: 80 }) },
    '@/components/QianxunCommunityIcons': { QianxunActionStat: none, QianxunGenderIcon: none },
    '@/constants/ossIcons': { miniappOssIcons: {} },
  }
  const source = fs.readFileSync(path.join(__dirname, '../src/pages/qianxun/post-detail.tsx'), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText
  const mod = { exports: {} }
  Function('require', 'module', 'exports', compiled)(name => deps[name] || (name.startsWith('react') ? require(name) : { __esModule: true, default: none }), mod, mod.exports)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  t.after(async () => { await act(async () => root.unmount()); container.remove() })
  return {
    detail, meta, requests, posts, toasts, container,
    render: () => act(async () => root.render(React.createElement(mod.exports.default))),
    send: async () => {
      await act(async () => input.onInput({ detail: { value: ' 待人工测试 ' } }))
      await act(async () => input.onConfirm())
    },
  }
}

const sample = { id: 17, authorId: 2, content: '已经返回的正文', commentCount: 3 }

test('正文先于配置和评论显示，评论失败后可以单独重试', async t => {
  const app = mountDetail(t)
  await app.render()
  assert.equal(app.requests.length, 0)
  await act(async () => app.detail.resolve(sample))
  assert.match(app.container.textContent, /已经返回的正文/)
  assert.match(app.container.textContent, /评论加载中/)
  await act(async () => app.requests[0].reject(new Error('评论连接中断')))
  const retry = [...app.container.querySelectorAll('[role="button"]')].find(el => el.textContent.includes('点击重试'))
  assert.ok(retry)
  await act(async () => retry.click())
  await act(async () => app.requests[1].resolve({ records: [], total: 0 }))
  await act(async () => app.meta.reject(new Error('配置暂不可用')))
  assert.deepEqual(app.posts, [17])
  assert.match(app.container.textContent, /已经返回的正文/)
  assert.doesNotMatch(app.container.textContent, /加载中|点击重试/)
})

test('待审评论只显示回执，较晚返回的旧列表不会覆盖最新公开评论和数量', async t => {
  const app = mountDetail(t)
  await app.render()
  await act(async () => app.detail.resolve(sample))
  await app.send()
  assert.deepEqual(app.toasts, ['评论已提交，等待人工审核'])
  assert.equal(app.requests.length, 2)
  const published = { id: 101, authorId: 2, authorName: '作者', content: '公开评论' }
  await act(async () => app.requests[1].resolve({ records: [published], total: 1 }))
  await act(async () => app.requests[0].resolve({ records: [], total: 0 }))
  assert.match(app.container.textContent, /公开评论/)
  assert.match(app.container.textContent, /全部评论 1/)
  assert.doesNotMatch(app.container.textContent, /待人工测试/)
  assert.deepEqual(app.posts, [17])
})

test('正文不可访问时不加载评论，也不展示正文', async t => {
  const app = mountDetail(t)
  await app.render()
  await act(async () => app.detail.reject(new Error('动态不可访问')))
  assert.match(app.container.textContent, /动态不可访问/)
  assert.equal(app.requests.length, 0)
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
