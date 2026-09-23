const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')
const React = require('react')
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')
const { act } = React

const root = path.resolve(__dirname, '..')
const dom = new JSDOM('<!doctype html><html><body></body></html>')
global.window = dom.window
global.document = dom.window.document
global.IS_REACT_ACT_ENVIRONMENT = true

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

async function mount(t, { page = false, apiOverrides = {}, bootstrapError = false } = {}) {
  const requests = [], saves = [], toasts = [], navigation = []
  const lifecycle = { show: new Set(), hide: new Set() }
  const recorderEvents = {}
  const recorder = new Proxy({}, { get: (_, key) => key.startsWith('on')
    ? callback => { recorderEvents[key] = callback }
    : () => {} })
  const taro = {
    useRouter: () => ({ params: { profileScore: '87' } }),
    getRecorderManager: () => recorder,
    nextTick: callback => callback(),
    showToast: async options => { toasts.push(options) },
    navigateTo: async options => { navigation.push(options) },
    chooseImage: async () => ({ tempFilePaths: ['test-image.jpg'] }),
  }
  for (const [name, key] of [['useDidShow', 'show'], ['useDidHide', 'hide']]) {
    taro[name] = callback => {
      const latest = React.useRef(callback)
      latest.current = callback
      React.useEffect(() => {
        const run = () => latest.current()
        lifecycle[key].add(run)
        return () => lifecycle[key].delete(run)
      }, [])
    }
  }
  const api = {
    getBasicProfile: () => { const request = deferred(); requests.push(request); return request.promise },
    getHomeDetail: async () => ({ profile: { profileScore: 87 }, verificationStatus: {} }),
    getAlbums: async () => [], getWechatId: async () => '', getIntroduction: async () => ({}),
    getAboutMe: async () => ({ questions: [] }), getTags: async () => '',
    getVoiceIntro: async () => ({ voiceIntroUrl: 'voice.mp3', voiceIntroDuration: 20 }),
    getAvatar: async () => ({}), getBackground: async () => ({}),
  }
  for (const name of ['saveDatingGoal', 'saveEmotionalStatus', 'uploadAvatar', 'submitAvatar',
    'uploadBackground', 'saveBackground', 'uploadAlbum', 'addAlbum', 'replaceAlbum',
    'uploadVoice', 'submitVoiceIntro', 'deleteVoiceIntro']) {
    api[name] = async (...args) => { saves.push({ name, args }); return {
      url: 'uploaded.jpg', mediaUrl: 'uploaded.jpg', mediaId: 1, fileSizeBytes: 20,
      voiceIntroUrl: 'uploaded.mp3', voiceIntroDuration: 20,
    } }
  }
  Object.assign(api, apiOverrides)
  const state = {
    bootstrap: async () => { if (bootstrapError) throw new Error('config unavailable') },
    provinceCities: async () => [], optionLabel: (_, code) => code || '',
    config: { uploadLimits: { voiceMinDuration: 10, voiceMaxDuration: 60, voice: { formats: ['mp3'] } } },
    profileOptions: {
      datingGoal: [{ code: 'MARRY', label: '认真结婚' }],
      emotionalStatus: [{ code: 'SINGLE', label: '单身' }], profileTag: [], avatarSource: [{ code: 'ALBUM' }],
    },
  }
  const store = selector => selector(state)
  store.getState = () => state
  const componentProps = {}
  // Render production components and preserve their event handlers; omit native Taro-only DOM props.
  const host = tag => props => React.createElement(tag, {
    id: props.id, onClick: props.onClick, 'data-role': props['data-role'],
  }, tag === 'img' || tag === 'input' ? undefined : props.children)
  const cache = new Map()
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports
    const module = { exports: {} }; cache.set(file, module)
    const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText
    const localRequire = name => {
      if (name === '@tarojs/taro') return { ...taro, default: taro, __esModule: true }
      if (name === '@tarojs/components') return { View: host('div'), Text: host('span'), Image: host('img'), Input: host('input'), ScrollView: host('div') }
      if (name === '@/services/prd01') return { prd01Api: api }
      if (name === '@/services/community') return { getMyCommunityPosts: async () => ({ records: [] }) }
      if (name === '@/stores/prd01Store') return { usePrd01Store: store }
      if (/\.(webp|jpg|png)$/.test(name)) return 'test-asset.jpg'
      if (name.startsWith('@/components/') || name.startsWith('./components/')) return {
        default: props => { componentProps[name] = props; return React.createElement('div', { onClick: props.onClick }, props.children) }, __esModule: true,
      }
      if (name.startsWith('@/') || name.startsWith('.')) {
        const base = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(file), name)
        const resolved = [base, `${base}.ts`, `${base}.tsx`].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
        if (!resolved) throw new Error(`Cannot load ${name}`)
        return load(resolved)
      }
      return require(name)
    }
    Function('module', 'exports', 'require', compiled)(module, module.exports, localRequire)
    return module.exports
  }
  let latest
  let Component
  if (page) Component = load(path.join(root, 'src/pages/profile/edit.tsx')).default
  else {
    const { useProfileScore } = load(path.join(root, 'src/hooks/useProfileScore.ts'))
    Component = () => { latest = useProfileScore('87'); return React.createElement('span', null, latest.profileScore) }
  }
  const container = document.createElement('div'); document.body.appendChild(container)
  const reactRoot = createRoot(container)
  let unmounted = false
  async function unmount() {
    if (unmounted) return
    unmounted = true
    await act(async () => reactRoot.unmount())
    container.remove()
  }
  t.after(unmount)
  await act(async () => reactRoot.render(React.createElement(Component)))
  const fire = async key => act(async () => { for (const callback of lifecycle[key]) callback() })
  return {
    requests, saves, toasts, navigation, componentProps, recorderEvents, container,
    get latest() { return latest },
    score: () => page ? Number(container.textContent.match(/评分：(\d+)/)?.[1]) : Number(container.textContent),
    show: () => fire('show'), hide: () => fire('hide'), unmount,
    resolve: async (index, profileScore) => act(async () => requests[index].resolve({ profileScore })),
    refresh: async () => act(async () => { void latest.refreshProfileScore() }),
    click: async selector => act(async () => {
      const target = container.querySelector(selector); assert.ok(target, selector)
      target.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    }),
    clickText: async text => act(async () => {
      const target = [...container.querySelectorAll('span,div')].find(el => el.textContent === text && el.children.length === 0)
      assert.ok(target, `Missing clickable text: ${text}`)
      target.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    }),
  }
}

test('SCORE-01: first show uses server score and shares the pending basic profile read', async t => {
  const h = await mount(t)
  await h.show()
  let profile
  await act(async () => { void h.latest.loadBasicProfile().then(value => { profile = value }) })
  assert.equal(h.requests.length, 1)
  assert.equal(h.score(), 87)
  await h.resolve(0, 92)
  assert.equal(h.score(), 92)
  assert.equal(profile.profileScore, 92)
})

test('SCORE-02/06: returning refreshes and does not reuse a pre-hide pending request', async t => {
  const h = await mount(t)
  await h.show(); await h.hide(); await h.resolve(0, 92)
  assert.equal(h.score(), 87)
  await h.show(); assert.equal(h.requests.length, 2)
  await h.resolve(1, 94); assert.equal(h.score(), 94)
})

test('SCORE-03: a save forces a new read and late older response cannot overwrite it', async t => {
  const h = await mount(t)
  await h.show(); await h.refresh(); await h.show()
  assert.equal(h.requests.length, 2)
  await h.resolve(1, 94); await h.resolve(0, 87)
  assert.equal(h.score(), 94)
})

test('SCORE-04: failed refresh preserves score and later refresh recovers', async t => {
  const h = await mount(t)
  await h.show(); await h.resolve(0, 92); await h.refresh()
  await act(async () => h.requests[1].reject(new Error('offline')))
  assert.equal(h.score(), 92)
  await h.refresh(); await h.resolve(2, 94); assert.equal(h.score(), 94)
})

test('SCORE-05: zero is authoritative, empty/invalid values preserve last known score', async t => {
  const h = await mount(t)
  for (const value of [undefined, null, '', ' ', 'bad', NaN, true, {}]) {
    await h.refresh(); await h.resolve(h.requests.length - 1, value)
    assert.equal(h.score(), 87)
  }
  await h.refresh(); await h.resolve(h.requests.length - 1, 0); assert.equal(h.score(), 0)
  await h.refresh(); await h.resolve(h.requests.length - 1, '92'); assert.equal(h.score(), 92)
})

test('SCORE-06: pending request can complete safely after unmount', async t => {
  const h = await mount(t)
  await h.show(); await h.unmount(); await h.resolve(0, 92)
  assert.equal(h.latest.profileScore, 87)
})

for (const failure of ['album', 'bootstrap']) {
  test(`SCORE-07: real edit page refreshes even if ${failure} fails`, async t => {
    const h = await mount(t, { page: true, bootstrapError: failure === 'bootstrap', apiOverrides: failure === 'album'
      ? { getAlbums: async () => { throw new Error('album unavailable') } } : {} })
    await h.show()
    assert.equal(h.requests.length, 1)
    await h.resolve(0, 92)
    assert.equal(h.score(), 92)
  })
}

test('SCORE-08: real subpage update event fetches new score and ignores stale home score', async t => {
  const h = await mount(t, { page: true })
  await h.resolve(0, 92)
  assert.equal(h.score(), 92)
  await h.click('#profile-tags-edit')
  assert.equal(h.navigation.length, 1)
  await h.hide()
  await act(async () => h.navigation[0].events.profileUpdated({ type: 'intro', value: '更新后的自我介绍' }))
  await h.show()
  assert.equal(h.requests.length, 2)
  await h.resolve(1, 94)
  assert.equal(h.score(), 94)
  assert.ok(h.container.textContent.includes('更新后的自我介绍'))
})

for (const [label, option, save] of [
  ['脱单目标', '认真结婚', 'saveDatingGoal'], ['感情状态', '单身', 'saveEmotionalStatus'],
]) {
  for (const success of [true, false]) {
    test(`SCORE-09: ${label} ${success ? 'success refreshes' : 'failure preserves score'}`, async t => {
      const h = await mount(t, { page: true, apiOverrides: success ? {} : {
        [save]: async () => { throw new Error('save rejected') },
      } })
      await h.resolve(0, 92)
      if (save === 'saveDatingGoal') await h.click('#profile-dating-goal-empty')
      else await h.clickText(label)
      await h.clickText(option); await h.clickText('确定')
      assert.equal(h.requests.length, success ? 2 : 1)
      if (success) {
        assert.ok(h.saves.some(item => item.name === save))
        await h.resolve(1, 94); assert.equal(h.score(), 94)
      } else assert.equal(h.score(), 92)
    })
  }
}

for (const type of ['avatar', 'background', 'addAlbum', 'replaceAlbum', 'deleteVoice', 'submitVoice']) {
  test(`SCORE-10: ${type} successful save refreshes score`, async t => {
    const apiOverrides = type === 'replaceAlbum'
      ? { getAlbums: async () => [{ mediaId: 7, mediaUrl: 'existing.jpg', sortOrder: 0, auditStatus: 'APPROVED' }] }
      : type === 'submitVoice' ? { getVoiceIntro: async () => ({}) } : {}
    const h = await mount(t, { page: true, apiOverrides })
    await h.resolve(0, 92)
    const expectedSave = { avatar: 'submitAvatar', background: 'saveBackground', addAlbum: 'addAlbum',
      replaceAlbum: 'replaceAlbum', deleteVoice: 'deleteVoiceIntro', submitVoice: 'submitVoiceIntro' }[type]
    if (type === 'avatar') await h.click('#profile-edit-avatar')
    if (type === 'background') await act(async () => h.componentProps['./components/ProfileHeroImage'].onClick())
    if (type === 'addAlbum' || type === 'replaceAlbum') await h.click('[data-role="photo-upload-card"]')
    if (type === 'deleteVoice') {
      await h.click('#voice-intro-delete'); await h.click('#voice-confirm-right')
    }
    if (type === 'submitVoice') {
      await h.click('#voice-intro-manage'); await h.click('#voice-round-button')
      await act(async () => h.recorderEvents.onStop({ tempFilePath: 'recording.mp3', duration: 20000 }))
      await h.clickText('完成')
    }
    assert.ok(h.saves.some(item => item.name === expectedSave), expectedSave)
    assert.equal(h.requests.length, 2)
    await h.resolve(1, type === 'deleteVoice' ? 88 : 94)
    assert.equal(h.score(), type === 'deleteVoice' ? 88 : 94)
  })
}
