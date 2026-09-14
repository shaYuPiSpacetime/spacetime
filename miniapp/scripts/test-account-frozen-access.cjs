/* eslint-env node */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')

const root = path.resolve(__dirname, '..', 'src')
const frozen = {
  accountStatus: 'FROZEN', coreAccessStatus: 'CORE_BLOCKED',
  canBrowseCards: false, canCommunity: false, canMatch: false, canMessage: false, canBeExposed: false,
  blockReasons: ['账号状态异常，暂无法使用该功能，请联系客服'],
}
const normal = { ...frozen, accountStatus: 'NORMAL', coreAccessStatus: 'CORE_ALLOWED', blockReasons: [] }
const unverified = { ...frozen, accountStatus: 'NORMAL', coreAccessStatus: 'NON_CORE_ONLY' }

// 加载实际 TSX；替换平台与数据边界，并保留同一页面再次渲染时的 Hook 状态。
function harness(initialStatus) {
  let status = initialStatus
  let cursor = 0
  let effects = []
  const state = []
  const navigations = []
  const cache = new Map()
  const runtime = { config: { fieldSettings: [] }, profileOptions: {}, copy: () => '' }
  const usePrd01Store = selector => selector(runtime)
  usePrd01Store.getState = () => runtime
  const stubs = {
    react: {
      useState: initial => {
        const index = cursor++
        if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial
        return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next }]
      },
      useEffect: effect => { effects.push(effect) },
    },
    '@tarojs/components': { View: 'View', Text: 'Text', Image: 'Image' },
    '@tarojs/taro': { __esModule: true, default: { navigateTo: args => navigations.push(args.url) }, useDidShow: () => {} },
    '@/stores/authStore': { useAuthStore: selector => selector({ accessStatus: status, setAccessStatus: next => { status = next } }) },
    '@/stores/messageRuntimeStore': { useMessageRuntimeStore: selector => selector({ unreadSummary: { messageUnreadCount: 0 } }) },
    '@/stores/prd01Store': { usePrd01Store },
    '@/services/prd01': { prd01Api: {} },
    '@/domain/prd01Runtime': { validateVerificationRuntime: () => {} },
    '@/domain/verificationOnboardingFlow': {
      hasPartialBasicProfile: () => false,
      isVerificationStepSubmitted: () => false,
      resolveCertificationChecklist: () => [],
    },
    '@/features/qianxun/QianxunFamilyPage': { __esModule: true, default: 'QianxunFamilyPage' },
    '@/features/verification/VerificationEntryView': { __esModule: true, default: 'VerificationEntryView' },
    '@/hooks/useProfile': { useProfile: () => ({
      data: { accessStatus: status, entryResolved: true }, loading: false, error: '', fetch: async () => {},
    }) },
    '@/constants/ossIcons': { miniappOssIcons: {} },
    '@/utils/avatar': { normalizeAvatarUrl: (_source, fallback) => fallback },
    '@/utils/navigation': { navigateToOrRedirect: url => navigations.push(url) },
  }

  function load(file) {
    const filename = path.join(root, file)
    if (cache.has(filename)) return cache.get(filename)
    const module = { exports: {} }
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      fileName: filename,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText
    const localRequire = id => {
      if (id in stubs) return stubs[id]
      if (id.startsWith('@/assets/')) return id
      if (id.startsWith('@/')) {
        const relative = id.slice(2)
        return load(relative + (fs.existsSync(path.join(root, relative + '.tsx')) ? '.tsx' : '.ts'))
      }
      return require(id)
    }
    vm.runInNewContext('(function(require, module, exports) {' + compiled + '\n})', {}, { filename })(localRequire, module, module.exports)
    cache.set(filename, module.exports)
    return module.exports
  }

  return {
    navigations,
    load,
    setStatus: next => { status = next },
    render: file => {
      cursor = 0
      effects = []
      load(file).default()
      effects.forEach(effect => effect())
      cursor = 0
      effects = []
      return load(file).default()
    },
    blocked: (extra = {}) => load('components/AccessBlockedPage.tsx').default({
      status, loading: false, error: '', blockReasons: status?.blockReasons || [], refresh: async () => {}, ...extra,
    }),
  }
}

function nodes(element) {
  if (element == null || typeof element === 'boolean') return []
  if (Array.isArray(element)) return element.flatMap(nodes)
  if (typeof element !== 'object') return [element]
  return [element, ...nodes(element.props?.children)]
}
const textOf = element => nodes(element).filter(item => typeof item === 'string').join(' ')
const click = (element, label) => {
  const button = nodes(element).find(item => item?.props?.onClick && textOf(item).includes(label))
  assert.ok(button, `找不到操作：${label}`)
  button.props.onClick()
}

test('冻结状态显示账号说明，主操作进入客服而非认证', () => {
  const app = harness(frozen)
  const view = app.blocked()
  assert.match(textOf(view), /账号已冻结/)
  assert.match(textOf(view), /账号状态异常/)
  assert.doesNotMatch(textOf(view), /完善资料|去认证/)
  click(view, '联系客服')
  assert.deepEqual(app.navigations, ['/pages/settings/help'])
})

test('冻结时加载失败仍保留账号说明，可刷新且不进入认证', () => {
  const app = harness(frozen)
  let refreshCount = 0
  const view = app.blocked({ error: '网络异常', refresh: async () => { refreshCount++ } })
  assert.match(textOf(view), /账号已冻结/)
  assert.match(textOf(view), /账号状态异常/)
  assert.match(textOf(view), /网络异常/)
  assert.doesNotMatch(textOf(view), /完善资料/)
  click(view, '重新加载')
  assert.equal(refreshCount, 1)
  assert.deepEqual(app.navigations, [])
})

for (const page of ['pages/index/index.tsx', 'pages/profile/index.tsx']) {
  test(`${page} 冻结且资料未完成时优先展示账号拦截页`, () => {
    const app = harness(frozen)
    const element = app.render(page)
    assert.equal(element.type, app.load('components/AccessBlockedPage.tsx').default)
    assert.equal(element.props.status.accountStatus, 'FROZEN')
    assert.doesNotMatch(textOf(element.type(element.props)), /完善资料/)
  })

  test(`${page} 冻结后收到解冻状态恢复正常页面`, () => {
    const app = harness(frozen)
    app.render(page)
    app.setStatus(normal)
    const recovered = app.render(page)
    assert.notEqual(recovered.type, app.load('components/AccessBlockedPage.tsx').default)
    assert.notEqual(recovered.type, 'VerificationEntryView')
  })
}

test('千寻已有可见内容缓存时，新冻结状态必须覆盖缓存', () => {
  const app = harness(normal)
  assert.equal(app.render('pages/index/index.tsx').type, 'QianxunFamilyPage')
  app.setStatus(frozen)
  assert.equal(app.render('pages/index/index.tsx').type, app.load('components/AccessBlockedPage.tsx').default)
})

test('正常未认证与旧缓存保持原有入口', () => {
  const app = harness(unverified)
  assert.equal(app.render('pages/profile/index.tsx').type, 'VerificationEntryView')
  const legacy = { ...frozen, accountStatus: undefined }
  const view = harness(legacy).blocked()
  assert.match(textOf(view), /去完善资料与认证/)
})
