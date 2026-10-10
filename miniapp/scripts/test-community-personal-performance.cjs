const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')
const React = require('react')
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')
const { act } = React

const dom = new JSDOM('<html><body></body></html>')
global.window = dom.window
global.document = dom.window.document
global.IS_REACT_ACT_ENVIRONMENT = true
const rootPath = path.resolve(__dirname, '..')
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const counts = value => ({ nickname: '本人', avatar: '', description: '简介',
  stats: { postCount: value, followingCount: value + 1, followerCount: value + 2, receivedLikeCount: value + 3 } })

async function mount(t, pageName, options = {}) {
  const lifecycle = { show: new Set(), hide: new Set() }, calls = [], pending = []
  const intervals = new Set(), modules = new Map()
  let owner = 1
  const taro = { showToast: async () => {}, navigateTo: async () => {},
    nextTick: callback => callback(), getWindowInfo: () => ({ windowWidth: 375 }),
    createSelectorQuery: () => ({ select: () => ({ boundingClientRect: callback => ({ exec: () => callback({ height: 27 }) }) }) }),
    navigateBack: async () => { calls.push('back') },
    getCurrentPages: () => [{ route: 'pages/qianxun/interactions' }, { route: 'pages/qianxun/compose' }],
    redirectTo: async () => {}, showModal: async value => { calls.push(value); return { confirm: true } },
    showActionSheet: async () => ({ tapIndex: 0 }) }
  for (const [hook, event] of [['useDidShow', 'show'], ['useDidHide', 'hide']]) {
    taro[hook] = callback => {
      const latest = React.useRef(callback); latest.current = callback
      React.useEffect(() => {
        const run = () => latest.current(); lifecycle[event].add(run)
        return () => { lifecycle[event].delete(run) }
      }, [])
    }
  }
  taro.useLoad = callback => { React.useEffect(() => { callback(options.route || {}) }, []) }
  const auth = selector => selector({ userId: owner })
  auth.getState = () => ({ userId: owner, nickname: '本人', avatar: '' })
  const api = {
    getCommunityProfileSummary: () => { calls.push('summary'); const d = deferred(); pending.push(d); return d.promise },
    getCommunityMeta: () => { calls.push('meta'); return options.meta || Promise.resolve({}) },
    getCommunityPostDetail: async () => ({ status: 'rejected', content: '修改后的正文', imageUrls: [] }),
    resubmitCommunityPost: async () => options.publishResult,
    getMyCommunityPosts: async () => { calls.push('mine'); return typeof options.posts === 'function' ? options.posts() : options.posts || { records: [] } },
    getCommunityInteractions: async type => {
      calls.push(type); return options.lists?.[type] || { records: [] }
    },
    resolveCommunityCopy: (_, key) => key || '暂无数据',
    resolveCommunityFeedback: (_, __, source) => typeof source === 'string' ? source : '失败',
    resolveCommunityStatusLabel: (_, status) => status === 'rejected' ? '发布失败' : status === 'pending_manual' ? '审核中' : '已发布',
    COMMUNITY_COPY_KEYS: {},
  }
  function native(tag) {
    return ({ children, id, onClick, ...props }) => React.createElement(tag, {
      id, onClick, 'data-role': props['data-role'], 'data-section-panel': props['data-section-panel'],
    }, children)
  }
  const components = { View: native('div'), Text: native('span'), Image: native('img'), ScrollView: native('div'),
    Textarea: native('textarea'), MovableArea: native('div'), MovableView: native('div') }
  function load(relative) {
    if (modules.has(relative)) return modules.get(relative)
    const output = ts.transpileModule(fs.readFileSync(path.join(rootPath, relative), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
    }).outputText
    const module = { exports: {} }
    const req = name => {
      if (name === '@tarojs/taro') return { ...taro, default: taro }
      if (name === '@tarojs/components') return components
      if (name === '@/services/community') return api
      if (name === '@/services/prd01') return { prd01Api: {} }
      if (name === '@/stores/authStore') return { useAuthStore: auth }
      if (name === '@/utils/avatar') return { normalizeAvatarUrl: (value, fallback) => value || fallback }
      if (name === '@/constants/ossIcons') return { miniappOssIcons: {} }
      if (name === '@/components/QianxunPostStatusBadge') return load('src/components/QianxunPostStatusBadge.tsx')
      if (name === '@/components/QianxunPublishFailureDialog') return load('src/components/QianxunPublishFailureDialog.tsx')
      if (name.includes('/components/')) return { default: () => null, getNativeNavigationMetrics: () => ({ navigationHeight: 88 }), QianxunActionStat: () => null, QianxunGenderIcon: () => null }
      if (name.endsWith('.webp')) return ''
      if (name.startsWith('@/')) {
        const file = `src/${name.slice(2)}`
        return load(fs.existsSync(path.join(rootPath, `${file}.ts`)) ? `${file}.ts` : `${file}.js`)
      }
      return require(name)
    }
    Function('require', 'module', 'exports', 'setInterval', 'clearInterval', output)(req, module, module.exports,
      fn => { intervals.add(fn); return fn }, fn => { intervals.delete(fn) })
    modules.set(relative, module.exports)
    return module.exports
  }
  const hook = load('src/hooks/useCommunityPersonalSummary.ts').useCommunityPersonalSummary
  let state
  const HookPage = () => { state = hook(); return React.createElement('div', null, state.summary?.stats.postCount ?? '—') }
  const Page = pageName ? load(`src/pages/qianxun/${pageName}.tsx`).default : HookPage
  const element = document.createElement('div'); document.body.append(element)
  const root = createRoot(element)
  await act(async () => { root.render(React.createElement(Page)) })
  t.after(async () => { await act(async () => { root.unmount() }); element.remove(); assert.equal(intervals.size, 0) })
  const fire = async event => { await act(async () => { lifecycle[event].forEach(fn => fn()) }) }
  const click = async label => {
    const node = [...element.querySelectorAll('span')].find(item => item.textContent === label)
    assert.ok(node, `missing label ${label}`)
    await act(async () => { node.dispatchEvent(new window.MouseEvent('click', { bubbles: true })) })
  }
  const resolveSummary = async value => { await act(async () => { pending.shift().resolve(counts(value)) }) }
  return { calls, pending, element, intervals, fire, click, resolveSummary, state: () => state,
    resubmit: async replacement => { await act(async () => {
      load('src/domain/communityPostResubmitted.ts').notifyCommunityPostResubmitted(replacement)
    }) },
    tick: async () => { await act(async () => { intervals.forEach(fn => fn()) }) },
    notify: async () => { await act(async () => {
      await load('src/domain/communityPersonalEvents.ts').withCommunityPersonalRefresh(Promise.resolve({}))
    }) },
    changeOwner: async value => { owner = value; await act(async () => { root.render(React.createElement(Page)) }) },
  }
}

test('编辑页重提再次被拒时先明确显示本次审核原因，再返回列表', async t => {
  const h = await mount(t, 'compose', { route: { editPostId: 'POST-OLD' }, publishResult: {
    postId: 101, postNo: 'POST-NEW', status: 'rejected', message: '本次内容未通过安全审核',
  } })
  await h.fire('show')
  await h.click('重新提交审核')
  const modalIndex = h.calls.findIndex(call => call.title === '重新审核未通过')
  assert.ok(modalIndex >= 0)
  assert.equal(h.calls[modalIndex].content, '本次内容未通过安全审核')
  assert.equal(h.calls[modalIndex].showCancel, false)
  assert.ok(h.calls.indexOf('back') > modalIndex)
})

for (const page of ['my-posts', 'interactions']) {
  test(`${page} 点击发布失败显示真实审核原因并可关闭`, async t => {
    const h = await mount(t, page, { route: { section: 'mine' }, posts: { records: [{
      id: 100, postNo: 'POST-OLD', status: 'rejected', content: '正文', auditRemark: '审核原因测试',
      createTime: '2026-10-10 08:00:00', imageUrls: [],
    }] } })
    await h.fire('show')
    await h.click('发布失败')
    assert.equal(h.element.querySelector('#qianxun-publish-failure-reason')?.textContent, '审核原因测试')
    await h.click('我知道了')
    assert.equal(h.element.querySelector('#qianxun-publish-failure-dialog'), null)
  })
  test(`${page} 重提回执立即替换旧失败卡片，慢旧请求和刷新失败不恢复旧状态`, async t => {
    const old = { id: 100, postNo: 'POST-OLD', status: 'rejected', content: '旧正文',
      auditRemark: '旧失败原因', createTime: '2026-10-10 08:00:00', imageUrls: [] }
    const slow = deferred()
    let count = 0
    const h = await mount(t, page, { route: { section: 'mine' }, posts: () => {
      count++
      if (count === 1) return { records: [old] }
      if (count === 2) return slow.promise
      if (count === 3) return Promise.reject(new Error('列表暂不可用'))
      return { records: [{ ...old, id: 101, postNo: 'POST-NEW', content: '新正文', status: 'published' }] }
    } })
    await h.fire('show')
    assert.ok(h.element.textContent.includes('发布失败'))
    await h.fire('show')
    await h.resubmit({ previousPostRef: 'POST-OLD', postId: 101, postNo: 'POST-NEW',
      status: 'pending_manual', statusName: '审核中', content: '新正文', imageUrls: [] })
    assert.ok(h.element.textContent.includes('审核中'))
    assert.ok(h.element.textContent.includes('新正文'))
    assert.ok(!h.element.textContent.includes('发布失败'))
    await act(async () => { slow.resolve({ records: [old] }) })
    await h.fire('show')
    assert.ok(h.element.textContent.includes('审核中'))
    assert.ok(!h.element.textContent.includes('旧正文'))
    await h.fire('show')
    assert.ok(h.element.textContent.includes('新正文'))
    assert.ok(!h.element.textContent.includes('审核中'))
  })
}

test('重提服务使用真实接口回执，重新驳回不伪装成待审，失败不通知列表替换', async () => {
  const modules = new Map(), requests = [], events = []
  let status = 'pending_manual', failed = false
  function load(relative) {
    if (modules.has(relative)) return modules.get(relative)
    const code = ts.transpileModule(fs.readFileSync(path.join(rootPath, relative), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText
    const module = { exports: {} }
    Function('require', 'module', 'exports', code)(name => {
      if (name === './request') return { put: async (url, body) => {
        requests.push({ url, body })
        if (failed) throw new Error('网络失败')
        return { postId: 101, postNo: 'POST-NEW', status, statusName: status, message: '本次审核结果' }
      } }
      if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`)
      throw new Error(`Unexpected import ${name}`)
    }, module, module.exports)
    modules.set(relative, module.exports)
    return module.exports
  }
  const domain = load('src/domain/communityPostResubmitted.ts')
  const unsubscribe = domain.subscribeCommunityPostResubmitted(value => events.push(value))
  const api = load('src/services/community.ts')
  await api.resubmitCommunityPost('POST-OLD', '修改后的正文', [])
  assert.equal(events[0].status, 'pending_manual')
  assert.equal(events[0].failureMessage, undefined)
  assert.equal(requests[0].url, '/miniapp/community/posts/POST-OLD')
  assert.equal(requests[0].body.content, '修改后的正文')
  status = 'rejected'
  await api.resubmitCommunityPost('POST-OLD', '仍需修改', [])
  const updated = domain.replaceResubmittedPost([{ id: 'POST-OLD', postNo: 'POST-OLD',
    postId: 100, failureMessage: '旧原因', likeCount: 8 }], events[1])[0]
  assert.equal(updated.status, 'rejected')
  assert.equal(updated.id, 'POST-NEW')
  assert.equal(updated.postId, 101)
  assert.equal(updated.failureMessage, '本次审核结果')
  assert.equal(updated.likeCount, 0)
  failed = true
  await assert.rejects(api.resubmitCommunityPost('POST-OLD', '重试', []), /网络失败/)
  assert.equal(events.length, 2)
  unsubscribe()
})

test('首次进入我的动态，meta 和动态慢请求不阻塞统计，未加载数字为占位', async t => {
  const h = await mount(t, 'my-posts', { meta: deferred().promise, posts: deferred().promise })
  await h.fire('show')
  assert.ok(h.element.textContent.includes('—'))
  await h.resolveSummary(31)
  assert.ok(h.element.textContent.includes('31'))
  assert.ok(h.element.textContent.includes('34'))
})

test('互动只请求当前栏目，慢浏览不会阻塞切换到点赞', async t => {
  const viewed = deferred()
  const h = await mount(t, 'interactions', { lists: { viewed: viewed.promise } })
  await h.fire('show')
  assert.deepEqual(h.calls.filter(x => !['meta', 'summary'].includes(x)), ['commented'])
  await h.click('浏览记录')
  await h.click('互动')
  await h.click('点赞过')
  assert.ok(h.calls.includes('liked'))
  await act(async () => { viewed.resolve({ records: [] }) })
  await h.resolveSummary(41)
  assert.ok(h.element.textContent.includes('41'))
  assert.equal(h.calls.includes('unlocked'), false)
  assert.equal(h.calls.includes('mine'), false)
})

test('写操作后的统计覆盖迟到请求，页面隐藏后停止定时查询', async t => {
  const h = await mount(t)
  await h.fire('show')
  await h.notify()
  await h.resolveSummary(1)
  assert.equal(h.state().summary, undefined)
  assert.equal(h.pending.length, 1)
  await h.resolveSummary(8)
  assert.equal(h.state().summary.stats.postCount, 8)
  await h.tick()
  assert.equal(h.pending.length, 1)
  await h.fire('hide')
  assert.equal(h.intervals.size, 0)
  await h.resolveSummary(9)
  assert.equal(h.state().summary.stats.postCount, 8)
  await h.fire('show')
  await h.resolveSummary(10)
  assert.equal(h.state().summary.stats.postCount, 10)
})

test('缓存与迟到响应不跨账号回显，轮询不饿死慢请求', async t => {
  const h = await mount(t)
  await h.fire('show')
  await h.tick(); await h.tick()
  await h.resolveSummary(11)
  assert.equal(h.state().summary.stats.postCount, 11)
  await h.changeOwner(2)
  assert.equal(h.state().summary, undefined)
  await h.changeOwner(3)
  await h.resolveSummary(22)
  assert.equal(h.state().summary, undefined)
  await h.resolveSummary(33)
  assert.equal(h.state().summary.stats.postCount, 33)
})

test('失败的写操作不触发刷新，成功的写操作保留结果并触发一次', async () => {
  const source = fs.readFileSync(path.join(rootPath, 'src/domain/communityPersonalEvents.ts'), 'utf8')
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const module = { exports: {} }; Function('module', 'exports', output)(module, module.exports)
  let changes = 0
  const unsubscribe = module.exports.subscribeCommunityPersonalChanged(() => { changes++ })
  await assert.rejects(module.exports.withCommunityPersonalRefresh(Promise.reject(new Error('failed'))))
  assert.equal(changes, 0)
  assert.deepEqual(await module.exports.withCommunityPersonalRefresh(Promise.resolve({ liked: true })), { liked: true })
  assert.equal(changes, 1)
  unsubscribe()
})
