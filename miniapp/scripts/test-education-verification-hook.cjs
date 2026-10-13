/* eslint-env node */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const test = require('node:test')
const ts = require('typescript')
const root = path.resolve(__dirname, '../src')

const options = {
  educationMethod: ['CHSI', 'DIPLOMA_NO', 'MATERIAL_UPLOAD', 'STUDENT_CARD'].map(code => ({ code, label: code })),
  educationUserType: ['STUDENT', 'MAINLAND_GRADUATE'].map(code => ({ code, label: code })),
  educationLevel: [{ code: 'BACHELOR', label: '本科' }],
}
const detail = (overrides = {}) => ({
  auditStatus: 'REJECTED', canSubmit: true, educationMethod: 'CHSI',
  schoolName: '已选学校', schoolCode: 'SCHOOL-1', educationLevel: 'BACHELOR',
  educationUserType: 'MAINLAND_GRADUATE', chsiCode: 'ABCD12345678', ...overrides,
})
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }

// 只替换框架调度与外部 I/O；校验、草稿和 Hook 业务函数运行真实生产源码。
function harness(method = 'CHSI', overrides = {}) {
  const slots = [], effects = [], effectDeps = []
  let cursor = 0, didShow, current, mounted = true
  const toasts = [], posts = [], redirects = [], updates = []
  let server = detail({ educationMethod: method })
  const api = {
    getEducation: async () => server,
    submitEducation: async value => { posts.push(value); server = detail({ educationMethod: method, auditStatus: 'PENDING', canSubmit: false }); return { educationStatus: 'PENDING' } },
    uploadEducation: async file => ({ url: `/miniapp/file/credential/${file}.jpg` }),
    ...overrides.api,
  }
  const store = { profileOptions: options, config: { uploadLimits: { education: { maxCount: 4 } } }, copy: key => key, ...overrides.store }
  const taro = {
    showToast: async value => toasts.push(value.title),
    redirectTo: async value => redirects.push(value.url),
    chooseImage: async () => ({ tempFilePaths: ['new-proof'] }),
    ...overrides.taro,
  }
  const react = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value }] },
    useRef(initial) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index] },
    useEffect(callback, deps) { const index = cursor++; if (!effectDeps[index] || deps.some((value, i) => value !== effectDeps[index][i])) { effectDeps[index] = deps; effects.push(callback) } },
  }
  const cache = new Map()
  function load(file) {
    if (cache.has(file)) return cache.get(file)
    assert.ok(fs.existsSync(file), `缺少学历重填 Hook/规则实现：${file}`)
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
    const module = { exports: {} }
    const requireMock = name => {
      if (name === 'react') return react
      if (name === '@tarojs/taro') return { ...taro, useDidShow: callback => { didShow = callback } }
      if (name === '@/services/prd01') return { prd01Api: api }
      if (name === '@/stores/prd01Store') return { usePrd01Store: selector => selector(store) }
      if (name === '@/services/protectedFile') return { resolveProtectedFilePreview: overrides.preview || (async url => `preview:${url}`) }
      if (name === '@/utils/profileEditEvents') return { emitProfileUpdated: value => updates.push(value) }
      if (name.startsWith('@/')) return load(path.join(root, `${name.slice(2)}.ts`))
      throw new Error(`未声明外部依赖 ${name}`)
    }
    vm.runInNewContext(output, { module, exports: module.exports, require: requireMock, console, setTimeout, clearTimeout, Promise, Error }, { filename: file })
    cache.set(file, module.exports)
    return module.exports
  }
  const { useEducationVerification } = load(path.join(root, 'hooks/useEducationVerification.ts'))
  const cleanups = []
  function render() {
    assert.ok(mounted)
    cursor = 0
    current = useEducationVerification(method, method === 'STUDENT_CARD' ? 'STUDENT' : 'MAINLAND_GRADUATE')
    for (const callback of effects.splice(0)) { const cleanup = callback(); if (cleanup) cleanups.push(cleanup) }
    return current
  }
  render()
  return {
    render, get current() { return render() }, toasts, posts, redirects, updates, api,
    async load() { await render().loadDetail(); return render() },
    async show() { didShow(); await new Promise(resolve => setImmediate(resolve)); return render() },
    setServer(value) { server = value },
    unmount() { mounted = false; cleanups.forEach(cleanup => cleanup()) },
  }
}

test('E01：旧学校缺编码，点击显示学校错误而不是静默退出，且不发请求', async () => {
  const h = harness('CHSI', { api: { getEducation: async () => detail({ schoolCode: undefined }) } })
  await h.load(); h.current.setField('educationAgreementChecked', true)
  const issue = await h.current.submit()
  assert.equal(issue.field, 'school'); assert.equal(issue.copyKey, 'education_school_selection_required')
  assert.equal(h.posts.length, 0); assert.ok(h.toasts.includes(issue.copyKey))
})

test('E09：合法表单同一帧双击只提交一次，成功刷新状态并跳转', async () => {
  const pending = deferred(), posts = []
  const h = harness('CHSI', { api: { submitEducation: value => { posts.push(value); return pending.promise } } })
  await h.load(); h.current.setField('educationAgreementChecked', true)
  const form = h.current, first = form.submit(), second = form.submit()
  assert.equal(posts.length, 1)
  pending.resolve({ educationStatus: 'PENDING' }); await Promise.all([first, second])
  assert.equal(h.redirects.length, 1); assert.equal(h.updates[0].status.educationStatus, 'PENDING')
})

test('E11：返回时刷新资格不覆盖学校和协议草稿，晚返回详情也不回填', async () => {
  const h = harness(); await h.load()
  h.current.setField('schoolName', '新学校'); h.current.setField('schoolCode', 'NEW'); h.current.setField('educationAgreementChecked', true)
  h.setServer(detail({ schoolName: '旧学校', auditStatus: 'PENDING', canSubmit: false }))
  await h.show()
  assert.equal(h.current.draft.schoolName, '新学校'); assert.equal(h.current.draft.schoolCode, 'NEW')
  assert.equal(h.current.draft.educationAgreementChecked, true); assert.equal(h.current.canEdit, false)
})

test('E07：满4张替换失败保留旧材料，不截断历史材料', async () => {
  const urls = ['a', 'b', 'c', 'd']
  const h = harness('MATERIAL_UPLOAD', { api: { getEducation: async () => detail({ educationMethod: 'MATERIAL_UPLOAD', materialUrls: urls }), uploadEducation: async () => { throw new Error('upload failed') } } })
  await h.load(); const id = h.current.materials[0].id
  await h.current.upload(id)
  assert.deepEqual(Array.from(h.current.materials, item => item.serverUrl), urls)
  assert.equal(h.current.materials[0].id, id)
})

test('E08：预览失败不阻断表单，删除后晚返回不能复活', async () => {
  const preview = deferred()
  const h = harness('MATERIAL_UPLOAD', { api: { getEducation: async () => detail({ educationMethod: 'MATERIAL_UPLOAD', materialUrls: ['a'] }) }, preview: () => preview.promise })
  await h.load(); const id = h.current.materials[0].id
  h.current.removeMaterial(id); preview.resolve('preview:a')
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(h.current.materials.length, 0); assert.equal(h.current.detail.canSubmit, true)
})

test('E08：单张下载失败只标记该条错误，其他材料成功', async () => {
  const h = harness('MATERIAL_UPLOAD', { api: { getEducation: async () => detail({ educationMethod: 'MATERIAL_UPLOAD', materialUrls: ['bad', 'good'] }) }, preview: async url => { if (url === 'bad') throw new Error('404'); return 'ready' } })
  await h.load(); await new Promise(resolve => setImmediate(resolve))
  assert.equal(h.current.materials[0].previewStatus, 'error'); assert.equal(h.current.materials[1].previewStatus, 'ready')
  assert.equal(h.current.canEdit, true)
})

test('E12：提交失败后服务端已待审核，刷新资格阻止再次提交并保留草稿', async () => {
  let calls = 0
  const h = harness('CHSI', { api: { submitEducation: async () => { calls++; h.setServer(detail({ canSubmit: false, auditStatus: 'PENDING' })); throw new Error('timeout') } } })
  await h.load(); h.current.setField('educationAgreementChecked', true)
  await h.current.submit(); await h.current.submit()
  assert.equal(calls, 1); assert.equal(h.current.canEdit, false); assert.equal(h.current.draft.chsiCode, 'ABCD12345678')
})

test('E14：资格未知不允许提交，避免首屏加载前默认放行', async () => {
  const h = harness(); await h.current.submit()
  assert.equal(h.posts.length, 0); assert.equal(h.current.canEdit, false)
})

test('E12：已收单且导航失败，旧刷新返回不能重新开放提审', async () => {
  const oldRead = deferred(); let reads = 0
  const h = harness('CHSI', {
    api: { getEducation: () => ++reads === 1 ? Promise.resolve(detail()) : oldRead.promise },
    taro: { redirectTo: async () => { throw new Error('navigation failed') } },
  })
  await h.load(); h.current.setField('educationAgreementChecked', true)
  const refresh = h.current.refreshStatus()
  await h.current.submit()
  oldRead.resolve(detail({ canSubmit: true, auditStatus: 'REJECTED' })); await refresh
  await h.current.submit()
  assert.equal(h.posts.length, 1)
  assert.equal(h.current.canEdit, false)
})

test('E11：旧请求失败不得覆盖较新成功刷新状态', async () => {
  const oldRead = deferred(); let reads = 0
  const h = harness('CHSI', { api: { getEducation: () => {
    reads++
    if (reads === 1) return Promise.resolve(detail())
    if (reads === 2) return oldRead.promise
    return Promise.resolve(detail({ auditStatus: 'PENDING', canSubmit: false }))
  } } })
  await h.load(); const oldRefresh = h.current.refreshStatus()
  await h.current.refreshStatus()
  oldRead.reject(new Error('obsolete request failed')); await oldRefresh
  assert.equal(h.current.statusError, '')
  assert.equal(h.current.detail.auditStatus, 'PENDING')
})
