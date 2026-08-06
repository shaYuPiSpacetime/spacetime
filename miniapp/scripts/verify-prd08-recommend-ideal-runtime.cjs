/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const MiniProgram =
  require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator/out/MiniProgram').default

// 新版微信开发者工具的 Tool.getInfo 不再稳定返回 SDKVersion，
// 但 App 自动化协议仍兼容 0.12.1，跳过客户端侧的旧字段版本检查。
MiniProgram.prototype.checkVersion = async () => {}
const automator = require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator')

const projectPath = path.resolve(__dirname, '..')
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const automationPort = Number(process.env.WX_AUTO_PORT || 9478)
const idePort = Number(process.env.WX_IDE_PORT || 14698)
const mockPort = Number(process.env.PRD08_MOCK_PORT || 3938)
const resumeIdeal = process.env.PRD08_RESUME_IDEAL === 'true'
const onlyWaiting = process.env.PRD08_ONLY_WAITING === 'true'
const onlyAddress = process.env.PRD08_ONLY_ADDRESS === 'true'
const outputRoot = path.resolve(
  projectPath,
  '../docs/验收报告/截图证据/2026-08-05-PRD08推荐理想型-蓝湖还原'
)
const avatar =
  'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/miniapp/ui-icons/ce9c1a32157cb601/profile-preview-avatar.png'
const hero =
  'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/miniapp/ui-icons/d8e28e1a0499cecd/profile-preview-hero.png'
const blurred =
  'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/miniapp/ui-icons/7607b8cd85521572/avatar-liked-blurred.png'

const state = {
  recommend: 'ready',
  replay: 'member',
  vip: false,
  unlocks: 'ready',
}

let server
let connectedMiniProgram

function timeout(promise, label, ms = 30000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}超时`)), ms)),
  ])
}

function success(data) {
  return JSON.stringify({ code: 200, msg: 'success', data })
}

function profile(userId = 208) {
  return {
    userId,
    nickname: '林知夏',
    avatar,
    heroPhoto: hero,
    photos: [hero],
    gender: 'FEMALE',
    age: 27,
    height: 166,
    zodiac: '天秤座',
    currentCity: '南京',
    hometownCity: '苏州',
    school: '南京大学',
    educationLevel: 'MASTER',
    identityLabel: '职场人',
    industryLabel: '互联网',
    occupationLabel: '产品经理',
    company: '科技公司',
    annualIncomeLabel: '30W+',
    tags: ['真诚沟通', '喜欢旅行', '周末徒步', '阅读'],
    introduction: '认真生活，也认真期待一段稳定、真诚、彼此尊重的关系。',
    datingGoal: '认真恋爱',
    emotionalStatus: '单身',
    liked: false,
    matched: false,
    canEnterConversation: false,
    communicationMode: 'WHISPER',
    communicationDisabledReason: null,
    certifications: ['AVATAR', 'REAL_NAME', 'EDUCATION'],
  }
}

const conditions = [
  ['M08-IDEAL-height-165', '外在条件', '身高165+'],
  ['M08-IDEAL-school-tier', '教育背景', '985/211'],
  ['M08-IDEAL-doctor', '教育背景', '博士学历'],
  ['M08-IDEAL-overseas', '教育背景', '留学海归'],
  ['M08-IDEAL-alumni', '教育背景', '校友'],
  ['M08-IDEAL-home-owner', '经济实力', '已购房'],
  ['M08-IDEAL-car-owner', '经济实力', '已购车'],
  ['M08-IDEAL-only-child', '家庭背景', '独生子女'],
  ['M08-IDEAL-public-family', '家庭背景', '体制内家庭'],
  ['M08-IDEAL-local', '家庭背景', '本地人'],
  ['M08-IDEAL-sports', '兴趣爱好', '有运动习惯'],
  ['M08-IDEAL-animals', '兴趣爱好', '喜欢小动物'],
  ['M08-IDEAL-food', '兴趣爱好', '喜欢美食'],
  ['M08-IDEAL-travel', '兴趣爱好', '喜欢旅行'],
  ['M08-IDEAL-interest-similar', '兴趣爱好', '兴趣相似'],
  ['M08-IDEAL-view-compatible', '感情与经历', '感情观相合'],
  ['M08-IDEAL-marry-2y', '感情与经历', '想2年内结婚'],
].map(([code, category, name]) => ({ code, category, name, available: true }))

function preference() {
  return {
    version: 2,
    targetCities: [{ code: '320100', name: '南京' }],
    allowNeighborCity: false,
    neighborCityAvailable: false,
    neighborCityDisabledReason: '周边城市关系暂未配置',
    minAge: 24,
    maxAge: 34,
    advanced: {
      minHeight: state.vip ? 160 : null,
      maxHeight: state.vip ? 185 : null,
      minWeight: null,
      maxWeight: null,
      educationCodes: state.vip ? ['MASTER'] : [],
      hometowns: [],
      schoolCodes: [],
      schoolFilterAvailable: false,
      majorNames: [],
    },
    vipEffective: state.vip,
    advancedEffectiveCount: state.vip ? 2 : 0,
    defaulted: false,
  }
}

function resultPage() {
  return {
    snapshotNo: 'IDS-RUNTIME-001',
    status: 'active',
    summary: {
      targetCities: [{ code: '320100', name: '南京' }],
      minAge: 24,
      maxAge: 34,
      conditionNames: ['身高165+', '博士学历', '喜欢旅行'],
    },
    resultCount: 3,
    unlockableCount: 2,
    items: [
      {
        itemNo: 'IDI-LOCKED-1',
        unlocked: false,
        blurAvatarUrl: blurred,
        ageBand: '25-29岁',
        cityName: '南京',
        educationLabel: '硕士',
        schoolSummary: '学校信息解锁后可见',
        matchedConditionNames: ['身高165+', '喜欢旅行', '本地人', '985/211'],
      },
      {
        itemNo: 'IDI-UNLOCKED-1',
        unlocked: true,
        candidateNo: '208',
        profile: profile(208),
        communicationMode: 'PRIVATE_MESSAGE',
        educationLabel: '硕士',
        schoolSummary: '南京大学',
        unlockExpiresAt: '2026-11-03T12:00:00',
        matchedConditionNames: ['博士学历', '喜欢旅行', '本地人', '身高165+'],
      },
    ],
    nextCursor: null,
    pricing: { unitPrice: 100, discountPercent: 10, retentionDays: 90, batchMax: 20 },
  }
}

function responseFor(request) {
  const url = new URL(request.url || '/', `http://127.0.0.1:${mockPort}`)
  const pathname = url.pathname.replace(/^\/api/, '')
  const method = request.method || 'GET'

  if (pathname === '/miniapp/recommend/candidates' && method === 'GET') {
    if (state.recommend === 'empty') {
      return {
        items: [],
        waitingReason: 'no_candidate',
        preferenceVersion: 2,
        remainingBrowseCount: 10,
      }
    }
    if (state.recommend === 'limit') {
      return {
        items: [],
        waitingReason: 'browse_limit',
        preferenceVersion: 2,
        remainingBrowseCount: 0,
      }
    }
    return {
      items: [
        {
          candidateNo: '208',
          userId: 208,
          profile: profile(208),
          liked: false,
          communicationMode: 'WHISPER',
          actualCity: '江苏省南京市',
        },
      ],
      waitingReason: null,
      preferenceVersion: 2,
      remainingBrowseCount: 9,
      nextCursor: null,
    }
  }
  if (/^\/miniapp\/recommend\/candidates\/[^/]+\/(view|skip|like|never)$/.test(pathname)) {
    return null
  }
  if (pathname === '/miniapp/recommend/preferences') return preference()
  if (pathname === '/miniapp/recommend/replay') {
    if (state.replay === 'gate') return { errorCode: 403, errorMessage: '会员权益未开通' }
    return {
      items: [
        {
          candidateNo: '208',
          profile: profile(208),
          viewedAt: '2026-08-05T10:20:00',
          lastAction: 'view',
          dateGroup: '今天',
          liked: false,
        },
        {
          candidateNo: '209',
          profile: { ...profile(209), nickname: '顾清禾' },
          viewedAt: '2026-08-04T18:00:00',
          lastAction: 'skip',
          dateGroup: '昨天',
          liked: true,
        },
      ],
    }
  }
  if (pathname === '/miniapp/recommend/meeting-preference') {
    return {
      meetingPreference: 'NATURAL',
      meetingPreferenceLabel: '轻松自然',
      preferredActivities: ['COFFEE', 'WALK'],
      preferredActivityLabels: ['喝咖啡', '散步'],
      meetingPreferenceOptions: [
        { code: 'NATURAL', label: '轻松自然', enabled: true },
        { code: 'PLANNED', label: '提前计划', enabled: true },
      ],
      preferredActivityOptions: [
        { code: 'COFFEE', label: '喝咖啡', enabled: true },
        { code: 'WALK', label: '散步', enabled: true },
        { code: 'FOOD', label: '品尝美食', enabled: true },
      ],
      maxActivities: 6,
      dictionaryAvailable: true,
    }
  }
  if (pathname === '/miniapp/dict/locations/two-level') {
    return [
      {
        code: '320000',
        name: '江苏省',
        children: [
          { code: '320100', name: '南京市' },
          { code: '320500', name: '苏州市' },
          { code: '320200', name: '无锡市' },
        ],
      },
      {
        code: '330000',
        name: '浙江省',
        children: [
          { code: '330100', name: '杭州市' },
          { code: '330200', name: '宁波市' },
        ],
      },
    ]
  }
  if (pathname === '/miniapp/dict/profile-options') {
    return {
      educationLevel: [
        { code: 'MASTER', label: '硕士' },
        { code: 'BACHELOR', label: '本科' },
      ],
    }
  }
  if (pathname === '/miniapp/ideal/meta') {
    return {
      preferenceVersion: 2,
      targetCities: [{ code: '320100', name: '南京' }],
      minAge: 24,
      maxAge: 34,
      conditions,
      lastConditionCodes: ['M08-IDEAL-height-165', 'M08-IDEAL-travel'],
      historyCount: 2,
      overseasAddressAvailable: false,
      overseasAddressDisabledReason: '海外地区字典暂未配置',
    }
  }
  if (pathname === '/miniapp/ideal/search') {
    return { snapshotNo: 'IDS-RUNTIME-001', resultCount: 3, expiresAt: '2026-11-03T12:00:00' }
  }
  if (/^\/miniapp\/ideal\/snapshots\/[^/]+\/results$/.test(pathname)) return resultPage()
  if (pathname === '/miniapp/ideal/search-records') {
    return {
      items: [
        {
          snapshotNo: 'IDS-RUNTIME-001',
          summary: resultPage().summary,
          resultCount: 3,
          status: 'active',
          createdAt: '2026-08-05T12:00:00',
          expiresAt: '2026-11-03T12:00:00',
        },
      ],
      nextCursor: null,
      total: 1,
    }
  }
  if (pathname === '/miniapp/ideal/unlocks') {
    return state.unlocks === 'empty'
      ? { items: [], nextCursor: null, total: 0 }
      : {
          items: [
            {
              unlockNo: 'UNL-001',
              scene: 'ideal_user_unlock',
              snapshotNo: 'IDS-RUNTIME-001',
              itemNo: 'IDI-UNLOCKED-1',
              unlockedAt: '2026-08-05T12:00:00',
              expiresAt: '2026-11-03T12:00:00',
              status: 'active',
              cost: 100,
              available: true,
              profile: profile(208),
              communicationMode: 'PRIVATE_MESSAGE',
              educationLabel: '硕士',
              schoolSummary: '南京大学',
              matchedConditionNames: ['面向周正', '身高180+', '985/211'],
            },
            {
              unlockNo: 'UNL-002',
              scene: 'ideal_user_unlock',
              snapshotNo: 'IDS-RUNTIME-OLD',
              itemNo: 'IDI-INACTIVE',
              unlockedAt: '2026-07-20T08:00:00',
              status: 'expired',
              cost: 100,
              available: false,
            },
          ],
          nextCursor: null,
          total: 2,
        }
  }
  if (pathname === '/miniapp/ideal/help') {
    return {
      title: '什么是理想型？',
      intro: '旨在帮助您精准找到符合您择偶需求的嘉宾。',
      resultDescription:
        '您可以在理想型选择页内，随心选择您希望对方满足的标签，请您至少选择一个，上不封顶。标签选项可能定期更新，您可以多加关注、定期进入选择页更新筛选。系统将根据您当前所选择的标签，为您智能推荐匹配度高的嘉宾。\n列表内嘉宾卡片上会展示嘉宾的基础信息（包括现居地、年龄、学历背景等）及其优质标签。',
      unlockDescription:
        '您可以挑选感兴趣的嘉宾进行解锁（100千寻币/位），一次性解锁当前列表内全部（可享受9折优惠）。可能不定期推出优惠活动，具体价格请以页面内展示为准。',
      pricing: { unitPrice: 100, discountPercent: 10, retentionDays: 90, batchMax: 20 },
    }
  }
  if (pathname === '/miniapp/coin/balance') return { coinBalance: 30 }
  if (pathname === '/miniapp/coin/packages') {
    return [
      {
        id: 1,
        packageName: '100千寻币',
        amount: 1,
        originAmount: 1,
        coinCount: 100,
        bonusCoinCount: 0,
      },
      {
        id: 2,
        packageName: '3000千寻币',
        amount: 30,
        originAmount: 30,
        coinCount: 3000,
        bonusCoinCount: 300,
        recommendFlag: 1,
        packageTag: '推荐',
        mobileTag: '加赠300',
      },
      {
        id: 3,
        packageName: '6000千寻币',
        amount: 60,
        originAmount: 60,
        coinCount: 6000,
        bonusCoinCount: 800,
        mobileTag: '加赠800',
      },
    ]
  }
  if (pathname === '/miniapp/vip/status') return { vipStatus: state.vip ? 'active' : 'none' }
  if (pathname === '/miniapp/vip/packages') {
    return [
      {
        id: 11,
        packageName: '连续包年',
        price: 568,
        originPrice: 568,
        durationDays: 365,
        recommendFlag: 1,
        packageTag: '专属2.4折',
      },
      { id: 12, packageName: '连续包季', price: 318, originPrice: 318, durationDays: 90 },
      { id: 13, packageName: '连续包月', price: 198, originPrice: 198, durationDays: 30 },
    ]
  }
  if (pathname === '/miniapp/vip/benefits') {
    return [
      {
        id: 1,
        benefitCode: 'heart-list',
        benefitName: '心动名单一键揭晓',
        benefitDesc: '立即查看喜欢你的人',
        mobileIcon: 'heart-list',
      },
      {
        id: 2,
        benefitCode: 'visitor-eye',
        benefitName: '谁来看过你',
        benefitDesc: '访客全公开',
        mobileIcon: 'visitor-eye',
      },
      {
        id: 3,
        benefitCode: 'advanced_filter',
        benefitName: '高级筛选',
        benefitDesc: '筛选更契合的人',
        mobileIcon: 'filter',
      },
      {
        id: 4,
        benefitCode: 'three_day_replay',
        benefitName: '三天回看',
        benefitDesc: '不错过最近的遇见',
        mobileIcon: 'replay',
      },
    ]
  }
  if (/^\/miniapp\/profile\/public\/\d+$/.test(pathname))
    return profile(Number(pathname.split('/').pop()))
  if (pathname === '/miniapp/relation/visits') return { visitNo: 'VIS-1', deduplicated: false }
  if (pathname === '/miniapp/community/meta') {
    return {
      postMaxImages: 9,
      postMaxTextLength: 1000,
      reportEntryEnabled: true,
      reportReasons: [],
      topics: [],
      homeTabs: [],
      copies: {},
    }
  }
  if (pathname === '/miniapp/community/posts') {
    return {
      records: [
        {
          id: 501,
          authorId: 208,
          authorName: '林知夏',
          authorAvatar: avatar,
          authorGender: 'FEMALE',
          authorBirthYear: 1998,
          authorCity: '南京',
          authorProfession: '产品经理',
          postType: 'community_post',
          content: '周末去看了一场日落，认真生活，也认真期待每一次温柔的相遇。',
          imageUrls: [hero, avatar, hero],
          likeCount: 18,
          commentCount: 6,
          liked: false,
          followingAuthor: false,
          createTime: '2026-08-05T18:30:00',
        },
      ],
      current: 1,
      size: 1,
      total: 1,
      pages: 1,
      hasMore: false,
    }
  }
  if (/^\/miniapp\/community\/users\/\d+\/posts$/.test(pathname)) {
    return { records: [], current: 1, size: 20, total: 0, pages: 1, hasMore: false }
  }
  return undefined
}

async function waitForElement(page, selector, label) {
  for (let index = 0; index < 80; index += 1) {
    const element = await page.$(selector)
    if (element) return element
    await page.waitFor(100)
  }
  assert.fail(`缺少运行态元素：${label}`)
}

async function open(miniProgram, route, label, waitMs = 2200) {
  console.log(`[PRD08] 打开：${label} ${route}`)
  const page = await timeout(miniProgram.reLaunch(route), `${label}跳转`, 15000)
  await page.waitFor(waitMs)
  assert.equal(
    (await miniProgram.currentPage()).path,
    route.split('?')[0].slice(1),
    `${label}路由错误`
  )
  console.log(`[PRD08] 页面就绪：${label}`)
  return page
}

async function screenshot(miniProgram, outputDir, filename) {
  const target = path.join(outputDir, filename)
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    console.log(`[PRD08] 截图：${filename}（第 ${attempt} 次）`)
    try {
      await timeout(miniProgram.screenshot({ path: target }), `${filename}截图`, 45000)
      console.log(`[PRD08] 截图完成：${filename}`)
      return
    } catch (error) {
      if (attempt === 3) throw error
      console.warn(`[PRD08] 截图重试：${filename}`)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
}

;(async () => {
  server = http.createServer((request, response) => {
    const data = responseFor(request)
    if (data && data.errorCode) {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      response.end(JSON.stringify({ code: data.errorCode, msg: data.errorMessage, data: null }))
      return
    }
    if (data === undefined) {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      response.end(
        JSON.stringify({
          code: 404,
          msg: `未模拟接口：${request.method} ${request.url}`,
          data: null,
        })
      )
      return
    }
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    response.end(success(data))
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(mockPort, '127.0.0.1', resolve)
  })

  if (process.env.PRD08_SKIP_E2E_BUILD !== 'true') {
    execFileSync('npx', ['taro', 'build', '--type', 'weapp'], {
      cwd: projectPath,
      env: {
        ...process.env,
        MINIAPP_E2E_MODE: 'true',
        MINIAPP_E2E_API_BASE_URL: `http://127.0.0.1:${mockPort}/api`,
      },
      stdio: 'inherit',
    })
    await new Promise(resolve => setTimeout(resolve, 3500))
  }

  try {
    connectedMiniProgram = await timeout(
      automator.connect({ wsEndpoint: `ws://127.0.0.1:${automationPort}` }),
      '连接现有微信自动化端口',
      4000
    )
  } catch {
    connectedMiniProgram = await automator.launch({
      cliPath,
      projectPath,
      port: automationPort,
      args: ['--port', String(idePort), '--disable-gpu'],
      trustProject: true,
    })
  }

  const miniProgram = connectedMiniProgram
  const exceptions = []
  miniProgram.on('exception', error => exceptions.push(String(error?.message || error)))
  await miniProgram.callWxMethod('setStorageSync', 'token', 'prd08-runtime-token')
  const system = await miniProgram.systemInfo()
  const outputDir = path.join(outputRoot, `微信运行-${system.windowWidth}x${system.windowHeight}`)
  fs.mkdirSync(outputDir, { recursive: true })

  if (onlyWaiting) {
    state.recommend = 'limit'
    await open(miniProgram, '/pages/recommend/index', '推荐上限')
    await screenshot(miniProgram, outputDir, '007-推荐上限入口.png')
    await open(miniProgram, '/pages/prd08/recommend/waiting/index', '推荐等待聚合')
    await screenshot(miniProgram, outputDir, '007-推荐上限聚合页.png')
    assert.equal(exceptions.length, 0, `运行异常：${exceptions.join('；')}`)
    console.log(`PRD-08 推荐等待页截图完成：${outputDir}`)
    return
  }

  if (onlyAddress) {
    state.vip = true
    const page = await open(
      miniProgram,
      '/pages/prd08/ideal/filter/index',
      '理想型地址筛选',
      2600
    )
    await (await waitForElement(page, '#ideal-address-entry', '地址筛选入口')).tap()
    await waitForElement(page, '#ideal-address-sheet', '地址选择面板')
    await screenshot(miniProgram, outputDir, '016-理想型地址面板.png')
    assert.equal(exceptions.length, 0, `运行异常：${exceptions.join('；')}`)
    console.log(`PRD-08 理想型地址面板截图完成：${outputDir}`)
    return
  }

  let page
  if (!resumeIdeal) {
    page = await open(miniProgram, '/pages/recommend/index', '推荐候选')
    await screenshot(miniProgram, outputDir, '002-推荐候选首屏.png')
    await (await waitForElement(page, '#recommend-ip-entry', 'IP 所属地入口')).tap()
    await waitForElement(page, '#recommend-ip-dialog', 'IP 所属地弹窗')
    await screenshot(miniProgram, outputDir, '004-IP所属地说明.png')

    page = await open(miniProgram, '/pages/recommend/index', '推荐认证')
    await (await waitForElement(page, '#recommend-certification-entry', '三重认证入口')).tap()
    await waitForElement(page, '#recommend-certification-sheet', '三重认证面板')
    await screenshot(miniProgram, outputDir, '006-三重认证面板.png')

    state.recommend = 'empty'
    await open(miniProgram, '/pages/recommend/index', '推荐空态')
    await screenshot(miniProgram, outputDir, '005-推荐空态.png')
    state.recommend = 'limit'
    await open(miniProgram, '/pages/recommend/index', '推荐上限')
    await screenshot(miniProgram, outputDir, '007-推荐上限入口.png')
    await open(miniProgram, '/pages/prd08/recommend/waiting/index', '推荐等待聚合')
    await screenshot(miniProgram, outputDir, '007-推荐上限聚合页.png')
    state.recommend = 'ready'

    state.vip = false
    await open(
      miniProgram,
      '/pages/membership/index?sourcePage=recommend_waiting',
      '会员中心',
      2800
    )
    await screenshot(miniProgram, outputDir, '008-会员中心未开通.png')

    state.replay = 'gate'
    await open(miniProgram, '/pages/prd08/recommend/replay/index', '三天回看会员门禁')
    await screenshot(miniProgram, outputDir, '009-三天回看会员门禁.png')
    state.replay = 'member'
    await open(miniProgram, '/pages/prd08/recommend/replay/index', '三天回看列表')
    await screenshot(miniProgram, outputDir, '010-三天回看会员列表.png')

    state.vip = false
    await open(miniProgram, '/pages/prd08/recommend/preference/index', '普通偏好')
    await screenshot(miniProgram, outputDir, '011-偏好设置普通用户.png')
    state.vip = true
    await open(miniProgram, '/pages/prd08/recommend/preference/index', '会员偏好')
    await screenshot(miniProgram, outputDir, '012-偏好设置会员.png')
  } else {
    state.recommend = 'ready'
    state.replay = 'member'
    state.vip = true
  }

  // tabBar 页面带 query 的 reLaunch 在部分微信开发者工具版本会一直等待响应。
  // 与生产聚合页一致，先写目标 Tab，再重进 tabBar 页面。
  await miniProgram.callWxMethod('setStorageSync', 'prd08RecommendTab', 'ideal')
  await open(miniProgram, '/pages/recommend/index', '理想型入口')
  await screenshot(miniProgram, outputDir, '013-理想型入口.png')

  page = await open(miniProgram, '/pages/prd08/ideal/filter/index', '理想型筛选', 2600)
  await screenshot(miniProgram, outputDir, '014-理想型筛选首屏.png')
  await screenshot(miniProgram, outputDir, '015-理想型筛选完整条件-首屏证据.png')
  await (await waitForElement(page, '#ideal-address-entry', '地址筛选入口')).tap()
  await waitForElement(page, '#ideal-address-sheet', '地址选择面板')
  await screenshot(miniProgram, outputDir, '016-理想型地址面板.png')

  page = await open(miniProgram, '/pages/prd08/ideal/filter/index', '理想型年龄筛选', 2200)
  await (await waitForElement(page, '#ideal-age-entry', '年龄筛选入口')).tap()
  await waitForElement(page, '#ideal-age-sheet', '年龄选择面板')
  await screenshot(miniProgram, outputDir, '017-理想型年龄面板.png')

  await open(
    miniProgram,
    '/pages/prd08/ideal/results/index?snapshotNo=IDS-RUNTIME-001',
    '理想型结果',
    2600
  )
  await screenshot(miniProgram, outputDir, '018-理想型结果首屏.png')
  await screenshot(miniProgram, outputDir, '019-理想型结果完整-首屏证据.png')

  await open(
    miniProgram,
    '/pages/coins/unlock-recharge?sourceScene=ideal_user_unlock&cost=200&balance=30&snapshotNo=IDS-RUNTIME-001',
    '理想型充值',
    2600
  )
  await screenshot(miniProgram, outputDir, '020-理想型充值.png')

  state.unlocks = 'ready'
  await open(miniProgram, '/pages/prd08/ideal/unlocks/index', '历史解锁')
  await screenshot(miniProgram, outputDir, '021-历史解锁.png')
  state.unlocks = 'empty'
  await open(miniProgram, '/pages/prd08/ideal/unlocks/index', '历史解锁空态')
  await screenshot(miniProgram, outputDir, '022-历史解锁空态.png')
  await open(miniProgram, '/pages/prd08/ideal/help/index', '理想型帮助')
  await screenshot(miniProgram, outputDir, '023-什么是理想型.png')

  await open(
    miniProgram,
    '/pages/heart/user?targetUserId=208&sourceScene=fate',
    '共用公开主页',
    3200
  )
  await screenshot(miniProgram, outputDir, '001-共用公开主页.png')
  await screenshot(miniProgram, outputDir, '003-共用公开主页资料完善态.png')

  assert.equal(exceptions.length, 0, `运行异常：${exceptions.join('；')}`)
  console.log(`PRD-08 微信运行截图完成：${outputDir}`)
})()
  .catch(error => {
    console.error(error?.stack || error)
    process.exitCode = 1
  })
  .finally(async () => {
    connectedMiniProgram?.disconnect()
    if (server) await new Promise(resolve => server.close(resolve))
  })
