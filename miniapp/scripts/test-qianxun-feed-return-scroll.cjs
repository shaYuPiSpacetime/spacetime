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

function mount(t, scene = 'FOLLOWING', pageFile = 'features/qianxun/QianxunFamilyPage.tsx') {
  const lifecycle = { show: new Set(), hide: new Set() }
  const navigation = []
  const requests = []
  const detailRequests = []
  const storage = new Map([['qianxun_requested_scene', scene]])
  let feedScrollProps
  let nextFirstPage = false
  let nextSincerePage = false
  let hiddenAuthorId
  let detailFails = false
  let navigationFails = false
  let instanceKey = 0
  let authUserId = 1
  const taro = {
    useRouter: () => ({ params: {} }),
    useLoad: callback => React.useEffect(() => { callback({ topicId: '8' }) }, []),
    getStorageSync: key => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: key => storage.delete(key),
    navigateTo: async options => { navigation.push(options); if (navigationFails) throw new Error('navigateTo:fail webview count limit exceed') },
    showToast: async () => {},
    nextTick: callback => callback(),
    eventCenter: { on: () => {}, off: () => {} },
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
    if (tag === 'div' && props.scrollY) feedScrollProps = props
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
    homeTabs: [{ entryKey: 'following', entryName: '关注' }, { entryKey: 'hot', entryName: '热门' }],
    reportReasons: [],
  }
  const community = {
    COMMUNITY_COPY_KEYS: {},
    getCommunityMeta: async () => config,
    getFollowingCount: async () => 5,
    getCommunityTopicHome: async () => undefined,
    getCommunityTopicDetail: async () => ({ id: 8, name: '测试话题' }),
    getCommunityTopicPosts: async () => ({ records: nextFirstPage ? [post(6), post(5), post(4)] : [post(5), post(4), post(3)] }),
    getCommunityPosts: async (scene, page) => {
      requests.push({ scene, page })
      const records = page === 2 ? [post(2), post(1)] : nextFirstPage
        ? [post(6), post(5), post(4)] : [post(5), post(4), post(3)]
      return { records, current: page, pages: 3 }
    },
    getSoulmatePosts: async () => ({ records: [post(51)] }),
    getSincerePosts: async () => ({ records: nextSincerePage ? [post(62), post(61)] : [post(61), post(60)] }),
    getCommunityPostDetail: async id => {
      detailRequests.push(id)
      if (detailFails) throw new Error('网络暂不可用')
      return { ...post(id), likeCount: nextFirstPage || nextSincerePage ? 7 : 0, hiddenAuthor: hiddenAuthorId === id + 100 }
    },
    resolveCommunityCopy: () => '',
    resolveCommunityFeedback: () => '',
  }
  const store = selector => selector({ optionLabel: (_, code) => code, userId: authUserId })
  const stubs = {
    '@/components/MatchPopupHost': { __esModule: true, default: () => null },
    '@tarojs/components': { View, Text, Image, ScrollView, Button: host('button') },
    '@tarojs/taro': { ...taro, default: taro, __esModule: true },
    '@/constants/ossIcons': { miniappOssIcons: new Proxy({}, { get: () => 'icon.png' }) },
    '@/services/community': community,
    '@/services/prd01': { prd01Api: { getHomeDetail: async () => ({ profile: {} }) } },
    '@/services/message': { findConversationByPeerUserId: async () => null },
    '@/stores/prd01Store': { usePrd01Store: store },
    '@/stores/authStore': { useAuthStore: store },
    '@/hooks/useAccessStatus': { useAccessStatus: () => ({ allowed: true, status: { coreAccessStatus: 'CORE_ALLOWED' } }) },
    '@/features/verification/navigateToVerification': { navigateToPendingVerification: async () => {} },
    '@/domain/whisperRuntime': { resolveStableWhisperTargetUserNo: () => 'U1' },
    '@/domain/communityAuthorProfile': { openCommunityAuthorProfile: async id => taro.navigateTo({ url: `/pages/heart/user?targetUserId=${id}` }) },
    '@/utils/avatar': { normalizeAvatarUrl: (_, fallback) => fallback },
    '@/components/NativeNavigation': { __esModule: true, default: () => null, getNativeNavigationMetrics: () => ({ navigationHeight: 88 }) },
    '@/components/HeartMessageHeader': { __esModule: true, default: () => null, getLanhuNavigationMetrics: () => ({ navigationHeight: 88 }) },
    '@/components/AccessBlockedPage': { __esModule: true, default: () => null },
    '@/components/AppTabBar': { __esModule: true, default: () => null, getCapsuleLeftActionsLayout: () => ({}) },
    '@/components/CommunityReportReasonSheet': { __esModule: true, default: () => null },
    '@/components/NotificationBadge': { __esModule: true, default: () => null },
    './shared': { MessageNav: () => null, MESSAGE_AVATAR: 'avatar.png' },
    '@/services/ideal': {
      getIdealResults: async (snapshotNo, cursor) => {
        requests.push({ cursor })
        return { snapshotNo, pricing: {}, nextCursor: cursor ? 'next-3' : 'next-2', items:
          (cursor === 'next-3' ? [7, 8] : cursor ? [3, 4] : nextFirstPage ? [5, 6] : [1, 2]).map(id => ({ itemNo: `item-${id}`, cityName: `城市${id}`, ageBand: '28岁', matchedConditionNames: [] })) }
      },
    },
    '@/utils/navigation': { navigateToOrRedirect: async url => taro.navigateTo({ url }) },
    '@/services/profile': { getPublicProfile: async () => ({ liked: false }) },
    '@/services/request': { getApiErrorCode: () => undefined },
    '@/services/messagePlatformRuntime': { messagePlatformRuntime: { onForeground: async () => {} } },
    '@/services/relation': {
      getPendingMatchPopup: async () => null,
      markLikesMeRead: async () => {},
      markRecentViewersRead: async () => ({}),
      ...Object.fromEntries(['getLikesMePage', 'getRecentViewersPage'].map(method => [method, async (page, size, cursor) => {
        requests.push({ method, page, cursor })
        return { current: page, total: 6, hasMore: true, accessMode: 'VIP_ALL_CLEAR', newCount: 0, todayVisitorUv: 0,
          readCursor: 'snapshot-1', records: (page === 3 ? [5, 6] : page === 2 ? [3, 4] : [1, 2]).map(id => ({ recordNo: `record-${id}`, userId: id, nickname: `关系${id}`, displayStatus: 'clear', likedTime: '2026-10-10', groupKey: 'today' })) }
      }])),
      getGivenLikes: async page => {
      requests.push({ page })
      return { current: page, total: 6, hasMore: true, records: (page === 2 ? [3, 4] : nextFirstPage ? [5, 1] : [1, 2]).map(id => ({ userId: id, likeNo: `like-${id}`, nickname: `嘉宾${id}` })) }
    } },
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
      if (name === '@/hooks/useRetainedScroll') return load('hooks/useRetainedScroll.ts')
      if (name.startsWith('@/')) {
        const base = name.slice(2)
        for (const extension of ['.ts', '.tsx', '.js']) {
          if (fs.existsSync(path.join(sourceRoot, base + extension))) return load(base + extension)
        }
      }
      throw new Error(`未模拟依赖：${name}`)
    }
    Function('module', 'exports', 'require', compiled)(module, module.exports, localRequire)
    return module.exports
  }
  if (pageFile === 'pages/message/private-list.tsx') stubs['@/services/message'] = { messageService: {
    listConversations: async cursor => {
      requests.push({ cursor })
      return { hasMore: true, nextCursor: cursor ? 'next-3' : 'next-2', list: (cursor === 'next-3' ? [7, 8] : cursor ? [3, 4] : nextFirstPage ? [5, 1] : [1, 2])
        .map(id => ({ conversationNo: `CV-${id}`, peerUser: { nickname: `私信${id}` }, unreadCount: 1 })) }
    } }, mockMessageService: {} }
  if (pageFile === 'pages/message/whisper-list.tsx') stubs['@/services/message'] = { messageService: {
    listWhispers: async (direction, bucket, cursor) => {
      requests.push({ direction, bucket, cursor })
      const ids = bucket === 'processed' ? [10] : cursor === 'next-3' ? [5, 6] : cursor ? [3, 4] : [1, 2]
      return { totalCount: 10, nextCursor: cursor ? 'next-3' : 'next-2', hasMore: true, list: ids.map(id => ({ whisperNo: `W-${id}`, direction, status: 'pending', peerUser: { nickname: `申请${id}` }, canReply: true })) }
    },
    getWhisper: async whisperNo => ({ whisperNo, status: 'replied', displayStatus: '已回复', peerUser: { nickname: '申请3' }, actions: { canReply: false } }),
  } }
  const Component = load(pageFile).default
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
    render: () => act(async () => root.render(React.createElement(Component, { snapshotNo: 'SNAPSHOT-1' }))),
    remount: () => act(async () => root.render(React.createElement(Component, { key: `rebuilt-${++instanceKey}`, snapshotNo: 'SNAPSHOT-1' }))),
    changeUser: value => { authUserId = value },
    rerender: () => act(async () => root.render(React.createElement(Component, { key: `rebuilt-${instanceKey}`, snapshotNo: 'SNAPSHOT-1' }))),
    loadMore: () => act(async () => { feedScrollProps.onScrollToLower() }),
    scroll: top => act(async () => { feedScrollProps.onScroll?.({ detail: { scrollTop: top } }) }),
    scrollTop: () => feedScrollProps.scrollTop,
    hide: () => run('hide'), show: () => run('show'),
    changeFirstPage: () => { nextFirstPage = true },
    changeSincerePage: () => { nextSincerePage = true },
    hideAuthor: id => { hiddenAuthorId = id + 100 },
    failDetail: () => { detailFails = true },
    failNavigation: () => { navigationFails = true },
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
  await app.scroll(0)
  app.changeFirstPage()
  await app.show()
  assert.deepEqual(ids(), [5, 4, 3, 2, 1])
  assert.equal(feed.isConnected, true)
  assert.equal(app.container.querySelector('.qianxun-community-card').parentElement.parentElement.parentElement, feed)
  assert.equal(feed.scrollTop, 900)
  assert.deepEqual(app.detailRequests, [2])
  assert.match(app.container.querySelector('[data-post-id="2"]').parentElement.textContent, /7/)
})

test('从其他页面返回也保留关注信息流，不覆盖已加载记录', async t => {
  const app = mount(t)
  await app.render()
  await app.hide()
  app.changeFirstPage()
  await app.show()
  const ids = [...app.container.querySelectorAll('.qianxun-community-card')].map(item => Number(item.getAttribute('data-post-id')))
  assert.deepEqual(ids, [5, 4, 3])
})

test('热门第二页点击头像返回，保留记录、像素偏移和第三页进度', async t => {
  const app = mount(t, 'HOT')
  await app.render()
  await app.loadMore()
  await app.scroll(1320)
  await act(async () => app.container.querySelector('#qianxun-post-2 img').click())
  assert.match(app.navigation.at(-1).url, /heart\/user\?targetUserId=102/)
  await app.hide()
  app.changeFirstPage()
  await app.show()
  const ids = [...app.container.querySelectorAll('.qianxun-community-card')].map(item => Number(item.getAttribute('data-post-id')))
  assert.deepEqual(ids, [5, 4, 3, 2, 1])
  assert.equal(app.scrollTop(), 1320)
  assert.deepEqual(app.requests.map(request => request.page), [1, 2])
  await app.loadMore()
  assert.equal(app.requests.at(-1).page, 3)
})

test('返回同步失败仍保留数据和位置，新页面实例从第一页开始', async t => {
  const app = mount(t, 'HOT')
  await app.render()
  await app.loadMore()
  await app.scroll(910)
  await act(async () => app.container.querySelector('#qianxun-post-2 img').click())
  await app.hide()
  app.failDetail()
  await app.show()
  assert.equal(app.container.querySelectorAll('.qianxun-community-card').length, 5)
  assert.equal(app.scrollTop(), 910)
  const fresh = mount(t, 'HOT')
  await fresh.render()
  assert.equal(fresh.container.querySelectorAll('.qianxun-community-card').length, 3)
  assert.equal(fresh.scrollTop(), 0)
})

test('关注与热门切换保存各自滚动位置和已加载列表', async t => {
  const app = mount(t)
  await app.render()
  await app.loadMore()
  await app.scroll(900)
  const clickTab = async label => act(async () => [...app.container.querySelectorAll('span')].find(node => node.textContent === label).click())
  await clickTab('热门')
  assert.equal(app.scrollTop(), 0)
  await app.scroll(600)
  await clickTab('关注')
  assert.equal(app.scrollTop(), 900)
  assert.equal(app.container.querySelectorAll('.qianxun-community-card').length, 5)
  await clickTab('热门')
  assert.equal(app.scrollTop(), 600)
  assert.equal(app.requests.length, 3)
})

test('话题返回同步数据但不重排卡片或清空滚动偏移', async t => {
  const app = mount(t, 'HOT', 'pages/qianxun/topic.tsx')
  await app.render()
  await app.scroll(450)
  await app.hide()
  app.changeFirstPage()
  await app.show()
  assert.deepEqual([...app.container.querySelectorAll('.qianxun-topic-body')].map(node => node.textContent), [5, 4, 3].map(id => `第${id}条图片动态`))
  assert.equal(app.scrollTop(), 450)
})

for (const [name, file, label] of [
  ['理想型', 'components/IdealResultsContent/index.tsx', '城市'],
  ['私信', 'pages/message/private-list.tsx', '私信'],
]) {
  test(`${name} 返回不丢第二页且下一次加载使用第三页游标`, async t => {
    const app = mount(t, 'HOT', file)
    await app.render()
    await app.show()
    await app.loadMore()
    await app.scroll(800)
    await app.hide()
    app.changeFirstPage()
    await app.show()
    for (const id of [1, 2, 3, 4]) assert.ok(app.container.textContent.includes(`${label}${id}`))
    assert.equal(app.scrollTop(), 800)
    await app.loadMore()
    assert.equal(app.requests.at(-1).cursor, 'next-3')
  })
}

test('我喜欢的第二页返回保留位置，主页取消喜欢后仅移除目标', async t => {
  const app = mount(t, 'HOT', 'pages/heart/my-likes.tsx')
  await app.render()
  await app.show()
  await act(async () => app.container.querySelector('#my-likes-load-more').click())
  await app.scroll(720)
  await act(async () => [...app.container.querySelectorAll('span')].filter(node => node.textContent === '查看主页')[2].click())
  await app.hide()
  await app.scroll(0)
  app.changeFirstPage()
  await app.show()
  for (const id of [1, 2, 4]) assert.ok(app.container.textContent.includes(`嘉宾${id}`))
  assert.ok(!app.container.textContent.includes('嘉宾3'))
  assert.equal(app.scrollTop(), 720)
  assert.deepEqual(app.requests.map(item => item.page), [1, 2], '返回不能重新拉第一页')
  await act(async () => app.container.querySelector('#my-likes-load-more').click())
  assert.equal(app.requests.at(-1).page, 3)
})

test('我喜欢的详情往返重建页面实例仍恢复第二页和原位置', async t => {
  const app = mount(t, 'HOT', 'pages/heart/my-likes.tsx')
  await app.render()
  await app.show()
  await act(async () => app.container.querySelector('#my-likes-load-more').click())
  await app.scroll(760)
  await act(async () => [...app.container.querySelectorAll('span')].filter(node => node.textContent === '查看主页')[2].click())
  await app.hide()
  await app.remount()
  await app.show()
  assert.ok(app.container.textContent.includes('嘉宾4'))
  assert.equal(app.scrollTop(), 760)
  await app.remount()
  await app.show()
  assert.ok(app.container.textContent.includes('嘉宾4'), '返回已读过快照后再次重建也不能丢第二页')
  assert.equal(app.scrollTop(), 760)
  await act(async () => app.container.querySelector('#my-likes-load-more').click())
  assert.equal(app.requests.at(-1).page, 3)
})

test('我喜欢的打开主页失败不销毁列表或改成 redirectTo', async t => {
  const app = mount(t, 'HOT', 'pages/heart/my-likes.tsx')
  await app.render()
  await app.show()
  await act(async () => app.container.querySelector('#my-likes-load-more').click())
  await app.scroll(760)
  app.failNavigation()
  await act(async () => [...app.container.querySelectorAll('span')].filter(node => node.textContent === '查看主页')[2].click())
  await app.show()
  assert.ok(app.container.textContent.includes('嘉宾4'))
  assert.equal(app.scrollTop(), 760)
  assert.deepEqual(app.requests.map(item => item.page), [1, 2])
})

test('我喜欢的重建时账号稍后就绪，恢复完整分页而非重新请求第一页', async t => {
  const app = mount(t, 'HOT', 'pages/heart/my-likes.tsx')
  await app.render()
  await app.show()
  await act(async () => app.container.querySelector('#my-likes-load-more').click())
  await app.scroll(760)
  await app.hide()
  app.changeUser(null)
  await app.remount()
  await app.show()
  app.changeUser(1)
  await app.rerender()
  assert.ok(app.container.textContent.includes('嘉宾4'))
  assert.equal(app.scrollTop(), 760)
  assert.deepEqual(app.requests.map(item => item.page), [1, 2])
})

test('我喜欢的快照持续保留，脚本重建可从本地恢复，登录未就绪不能清除', () => {
  const source = fs.readFileSync(path.join(sourceRoot, 'domain/givenLikesReturn.ts'), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const storage = new Map()
  const taro = { getStorageSync: key => storage.get(key), setStorageSync: (key, value) => storage.set(key, JSON.parse(JSON.stringify(value))), removeStorageSync: key => storage.delete(key) }
  const loadSnapshot = () => {
    const exports = {}
    Function('exports', 'require', compiled)(exports, () => ({ default: taro }))
    return exports
  }
  const cache = loadSnapshot()
  const snapshot = { userId: 1052, records: [{ likeNo: 'LIK-21', userId: 21 }], page: { current: 2, hasMore: true }, scrollTop: 760, openedUserId: 23 }
  cache.saveGivenLikesReturn(snapshot)
  assert.equal(cache.readGivenLikesReturn(null), undefined)
  assert.equal(cache.readGivenLikesReturn(1052).page.current, 2)
  assert.equal(cache.readGivenLikesReturn(1052).scrollTop, 760)
  const rebuilt = loadSnapshot()
  assert.equal(rebuilt.readGivenLikesReturn(1052).records[0].likeNo, 'LIK-21')
  assert.equal(rebuilt.readGivenLikesReturn(1053), undefined)
  assert.equal(loadSnapshot().readGivenLikesReturn(1052), undefined, '切账号清掉旧缓存')
  cache.saveGivenLikesReturn(snapshot)
  cache.clearGivenLikesReturn()
  assert.equal(loadSnapshot().readGivenLikesReturn(1052), undefined, '主动新进入必须重新加载')
})

test('悄悄话第二页详情处理后返回只迁移目标，不丢分页和位置', async t => {
  const app = mount(t, 'HOT', 'pages/message/whisper-list.tsx')
  await app.render()
  await app.show()
  await app.loadMore()
  await app.scroll(680)
  await act(async () => [...app.container.querySelectorAll('.whisper-card')].find(node => node.textContent.includes('申请3')).click())
  await app.hide()
  await app.show()
  assert.equal(app.scrollTop(), 680)
  for (const id of [1, 2, 4]) assert.ok(app.container.querySelector('.whisper-card-list').textContent.includes(`申请${id}`))
  assert.ok(!app.container.querySelector('.whisper-card-list').textContent.includes('申请3'))
  assert.ok(app.container.querySelector('.whisper-card-list--handled').textContent.includes('申请3已回复'))
  await app.loadMore()
  assert.equal(app.requests.filter(item => item.bucket === 'pending').at(-1).cursor, 'next-3')
})

test('关系列表后台同步保留第二页和快照游标', async t => {
  const app = mount(t, 'HOT', 'pages/community/index.tsx')
  await app.render()
  await app.show()
  const more = () => [...app.container.querySelectorAll('span')].find(node => node.textContent === '加载更多')
  await act(async () => more().click())
  await app.scroll(830)
  await app.hide()
  await app.show()
  for (const id of [1, 2, 3, 4]) assert.ok(app.container.textContent.includes(`关系${id}`))
  assert.equal(app.scrollTop(), 830)
  await act(async () => more().click())
  assert.equal(app.requests.filter(item => item.method === 'getLikesMePage').at(-1).page, 3)
  assert.equal(app.requests.filter(item => item.method === 'getLikesMePage').at(-1).cursor, 'snapshot-1')
})

test('话题详情隐藏作者后返回移除对应动态', async t => {
  const app = mount(t, 'HOT', 'pages/qianxun/topic.tsx')
  await app.render()
  await act(async () => app.container.querySelector('.qianxun-topic-body').click())
  await app.hide()
  app.hideAuthor(5)
  await app.show()
  assert.deepEqual([...app.container.querySelectorAll('.qianxun-topic-body')].map(node => node.textContent), [4, 3].map(id => `第${id}条图片动态`))
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
