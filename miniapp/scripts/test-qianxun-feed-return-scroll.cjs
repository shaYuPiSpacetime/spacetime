const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')
const { act } = React

const sourceRoot = path.resolve(__dirname, '../src')
const dom = new JSDOM('<!doctype html><html><body></body></html>')
global.window = dom.window
global.document = dom.window.document
global.IS_REACT_ACT_ENVIRONMENT = true

function post(id) {
  return {
    id, postNo: `POST-${id}`, authorId: id + 100, authorName: `作者${id}`,
    content: `第${id}条图片动态`, imageUrls: [`image-${id}.jpg`],
    createTime: '2026-09-30 12:00:00', followingAuthor: true,
    likeCount: 0, commentCount: 0,
  }
}

function mount(t) {
  const lifecycle = { show: new Set(), hide: new Set() }
  const navigation = []
  const requests = []
  const detailRequests = []
  const storage = new Map([['qianxun_requested_scene', 'FOLLOWING']])
  let feedScrollProps
  let nextFirstPage = false
  let nextSincerePage = false
  let hiddenAuthorId
  const taro = {
    getStorageSync: key => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: key => storage.delete(key),
    navigateTo: async options => { navigation.push(options) },
    showToast: async () => {},
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
  const shareHandlers = new Set()
  taro.useShareAppMessage = callback => {
    const latest = React.useRef(callback)
    latest.current = callback
    React.useEffect(() => {
      const handler = event => latest.current(event)
      shareHandlers.add(handler)
      return () => shareHandlers.delete(handler)
    }, [])
  }
  const host = tag => props => {
    if (tag === 'div' && props.lowerThreshold === 120) feedScrollProps = props
    const attributes = {
      id: props.id,
      className: props.className,
      'data-post-id': props['data-post-id'],
      onClick: props.onClick,
      src: tag === 'img' ? props.src : undefined,
    }
    return React.createElement(tag, attributes, tag === 'img' ? undefined : props.children)
  }
  const View = host('div')
  const Text = host('span')
  const Image = host('img')
  const ScrollView = host('div')
  const config = {
    homeTabs: [{ entryKey: 'following', entryName: '关注' }],
    reportReasons: [],
  }
  const community = {
    COMMUNITY_COPY_KEYS: {},
    getCommunityMeta: async () => config,
    getFollowingCount: async () => 5,
    getCommunityTopicHome: async () => undefined,
    getCommunityPosts: async (scene, page) => {
      requests.push({ scene, page })
      const records = page === 2 ? [post(2), post(1)] : nextFirstPage
        ? [post(6), post(5), post(4)] : [post(5), post(4), post(3)]
      return { records, current: page, pages: 2 }
    },
    getSoulmatePosts: async () => ({ records: [post(51)] }),
    getSincerePosts: async () => ({ records: nextSincerePage ? [post(62), post(61)] : [post(61), post(60)] }),
    getCommunityPostDetail: async id => {
      detailRequests.push(id)
      return { ...post(id), likeCount: nextFirstPage || nextSincerePage ? 7 : 0, hiddenAuthor: hiddenAuthorId === id + 100 }
    },
    resolveCommunityCopy: () => '',
    resolveCommunityFeedback: () => '',
  }
  const store = selector => selector({ optionLabel: (_, code) => code, userId: 1 })
  const stubs = {
    '@tarojs/components': { View, Text, Image, ScrollView, Button: host('button') },
    '@tarojs/taro': { ...taro, default: taro, __esModule: true },
    '@/constants/ossIcons': { miniappOssIcons: new Proxy({}, { get: () => 'icon.png' }) },
    '@/services/community': community,
    '@/services/prd01': { prd01Api: { getHomeDetail: async () => ({ profile: {} }) } },
    '@/services/message': { findConversationByPeerUserId: async () => null },
    '@/stores/prd01Store': { usePrd01Store: store },
    '@/stores/authStore': { useAuthStore: store },
    '@/hooks/useAccessStatus': { useAccessStatus: () => ({ status: { coreAccessStatus: 'CORE_ALLOWED' } }) },
    '@/features/verification/navigateToVerification': { navigateToPendingVerification: async () => {} },
    '@/domain/whisperRuntime': { resolveStableWhisperTargetUserNo: () => 'U1' },
    '@/domain/communityAuthorProfile': { openCommunityAuthorProfile: async () => {} },
    '@/utils/avatar': { normalizeAvatarUrl: (_, fallback) => fallback },
    '@/components/WhisperComposeSheet': { __esModule: true, default: () => null },
    '@/components/UnverifiedCertificationModal': { __esModule: true, default: () => null },
    '@/components/QianxunCommunityIcons': {
      QianxunActionStat: props => React.createElement('span', { 'data-stat-kind': props.kind }, String(props.count)),
      QianxunGenderIcon: () => null,
    },
  }
  const cache = new Map()
  function load(relative) {
    if (cache.has(relative)) return cache.get(relative).exports
    const filename = path.join(sourceRoot, relative)
    const module = { exports: {} }
    cache.set(relative, module)
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      fileName: filename,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText
    const localRequire = name => {
      if (name in stubs) return stubs[name]
      if (name === 'react' || name === 'react/jsx-runtime') return require(name)
      if (name.endsWith('.scss')) return {}
      if (/\.(webp|png|jpg)$/.test(name)) return 'asset.png'
      if (name === './QianxunHeader') return {
        QIANXUN_BLUE: '#2876FF',
        getQianxunHeaderMetrics: () => ({ secondaryTop: 0, contentTop: 100 }),
        QianxunHeader: props => React.createElement('div', null,
          React.createElement('button', { id: 'open-kindred', onClick: () => props.onChange('KINDRED') }, '知音'),
          React.createElement('button', { id: 'open-family', onClick: () => props.onChange('FAMILY') }, '家人')),
      }
      if (name === './QianxunTopicSpotlight') return { __esModule: true, default: () => null }
      if (name === './QianxunZhiyinTab') return load('features/qianxun/QianxunZhiyinTab.tsx')
      if (name === '@/components/CommunityPostActionSheet') return load('components/CommunityPostActionSheet.tsx')
      if (name === '@/utils/shareMessage') return { shareMessage: value => value }
      if (name === '@/constants/qianxunTypography') return load('constants/qianxunTypography.ts')
      if (name === '@/domain/sharePresentation') return load('domain/sharePresentation.ts')
      throw new Error(`未模拟依赖：${name}`)
    }
    Function('module', 'exports', 'require', compiled)(module, module.exports, localRequire)
    return module.exports
  }
  const Component = load('features/qianxun/QianxunFamilyPage.tsx').default
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  t.after(async () => {
    await act(async () => root.unmount())
    container.remove()
  })
  const run = async key => act(async () => { for (const callback of lifecycle[key]) callback() })
  return {
    container, navigation, requests, detailRequests, shareHandlers,
    render: () => act(async () => root.render(React.createElement(Component))),
    loadMore: () => act(async () => { feedScrollProps.onScrollToLower() }),
    hide: () => run('hide'), show: () => run('show'),
    changeFirstPage: () => { nextFirstPage = true },
    changeSincerePage: () => { nextSincerePage = true },
    hideAuthor: id => { hiddenAuthorId = id + 100 },
  }
}

test('关注信息流进入图片动态详情再返回时，保留已翻页的动态及原滚动位置', async t => {
  const app = mount(t)
  await app.render()
  await app.loadMore()
  const feed = app.container.querySelector('.qianxun-community-card').parentElement.parentElement.parentElement
  feed.scrollTop = 900
  const ids = () => [...app.container.querySelectorAll('.qianxun-community-card')].map(item => Number(item.getAttribute('data-post-id')))
  assert.deepEqual(ids(), [5, 4, 3, 2, 1])
  await act(async () => app.container.querySelector('[data-post-id="2"] img').click())
  assert.match(app.navigation.at(-1).url, /post-detail\?id=2$/)
  await app.hide()
  app.changeFirstPage()
  await app.show()
  assert.deepEqual(ids(), [5, 4, 3, 2, 1])
  assert.equal(feed.isConnected, true)
  assert.equal(app.container.querySelector('.qianxun-community-card').parentElement.parentElement.parentElement, feed)
  assert.equal(feed.scrollTop, 900)
  assert.deepEqual(app.detailRequests, [2])
  assert.match(app.container.querySelector('[data-post-id="2"]').parentElement.textContent, /7/)
})

test('未进入动态详情的页面返回仍刷新关注信息流', async t => {
  const app = mount(t)
  await app.render()
  await app.hide()
  app.changeFirstPage()
  await app.show()
  const ids = [...app.container.querySelectorAll('.qianxun-community-card')].map(item => Number(item.getAttribute('data-post-id')))
  assert.deepEqual(ids, [6, 5, 4])
})

test('时空站台三点面板关闭后，复用原滚动容器且不刷新动态', async t => {
  const app = mount(t)
  await app.render()
  await act(async () => app.container.querySelector('#open-kindred').click())
  await act(async () => app.container.querySelector('#qianxun-zhiyin-sincere').click())
  const card = app.container.querySelector('.qianxun-zhiyin-post-card')
  const scroll = card.parentElement.parentElement
  scroll.scrollTop = 650
  const requestCount = app.requests.length
  const more = [...card.querySelectorAll('span')].find(node => node.textContent === '⋮')
  await act(async () => more.parentElement.click())
  const cancel = [...app.container.querySelectorAll('span')].find(node => node.textContent === '取消')
  await act(async () => cancel.parentElement.click())
  assert.equal(card.isConnected, true)
  assert.equal(scroll.isConnected, true)
  assert.equal(app.container.querySelector('.qianxun-zhiyin-post-card').parentElement.parentElement, scroll)
  assert.equal(scroll.scrollTop, 650)
  assert.equal(app.requests.length, requestCount)
})

test('时空站台进入动态详情再返回时，保留原动态顺序', async t => {
  const app = mount(t)
  await app.render()
  await act(async () => app.container.querySelector('#open-kindred').click())
  await act(async () => app.container.querySelector('#qianxun-zhiyin-sincere').click())
  const ids = () => [...app.container.querySelectorAll('.qianxun-zhiyin-post-card')].map(item => Number(item.getAttribute('data-post-id')))
  assert.deepEqual(ids(), [61, 60])
  const scroll = app.container.querySelector('.qianxun-zhiyin-post-card').parentElement.parentElement
  scroll.scrollTop = 700
  await act(async () => app.container.querySelector('[data-post-id="60"]').children[1].click())
  assert.match(app.navigation.at(-1).url, /post-detail\?id=60$/)
  await app.hide()
  app.changeSincerePage()
  await app.show()
  assert.deepEqual(ids(), [61, 60])
  assert.equal(scroll.isConnected, true)
  assert.equal(app.container.querySelector('.qianxun-zhiyin-post-card').parentElement.parentElement, scroll)
  assert.equal(scroll.scrollTop, 700)
  assert.deepEqual(app.detailRequests, [60])
  assert.match(app.container.querySelector('[data-post-id="60"]').textContent, /7/)
})

test('详情中隐藏作者后，返回信息流时移除该作者动态', async t => {
  const app = mount(t)
  await app.render()
  await act(async () => app.container.querySelector('[data-post-id="3"] img').click())
  await app.hide()
  app.hideAuthor(3)
  await app.show()
  const ids = [...app.container.querySelectorAll('.qianxun-community-card')].map(item => Number(item.getAttribute('data-post-id')))
  assert.deepEqual(ids, [5, 4])
})

test('S-04: 知音动态分享随面板开关和栏目切换同步，始终只有一个回调', async t => {
  const app = mount(t)
  await app.render()
  const share = from => [...app.shareHandlers][0]({ from })
  assert.equal(app.shareHandlers.size, 1)
  await act(async () => app.container.querySelector('#open-kindred').click())
  await act(async () => app.container.querySelector('#qianxun-zhiyin-sincere').click())
  const card = app.container.querySelector('.qianxun-zhiyin-post-card')
  const more = [...card.querySelectorAll('span')].find(node => node.textContent === '⋮')
  await act(async () => more.parentElement.click())
  assert.equal(app.shareHandlers.size, 1)
  assert.match(share('button').path, /^\/pages\/qianxun\/post-detail\?id=\d+$/)
  assert.equal(share('menu').path, '/pages/index/index')
  const cancel = [...app.container.querySelectorAll('span')].find(node => node.textContent === '取消')
  await act(async () => cancel.parentElement.click())
  assert.equal(share('button').path, '/pages/index/index')
  await act(async () => app.container.querySelector('#open-family').click())
  assert.equal(app.shareHandlers.size, 1)
  assert.equal(share('menu').path, '/pages/index/index')
})
