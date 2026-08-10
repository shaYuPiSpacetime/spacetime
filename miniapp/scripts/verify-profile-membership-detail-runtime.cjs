/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const automator = require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator')

const projectPath = path.resolve(__dirname, '..')
const outputDir = path.resolve(
  projectPath,
  '../docs/验收报告/截图证据/2026-08-10-我的与会员中心细节'
)
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const mockPort = Number(process.env.PROFILE_MEMBERSHIP_MOCK_PORT || 19110)
const automationPort = Number(process.env.WX_AUTO_PORT || 9451)
const idePort = Number(process.env.WX_IDE_PORT || 14672)

function ok(data) {
  return JSON.stringify({ code: 200, msg: 'success', data })
}

function accessStatus() {
  return {
    canBrowseCards: true,
    canMatch: true,
    canMessage: true,
    canCommunity: true,
    canBeExposed: true,
    coreAccessStatus: 'CORE_ALLOWED',
    blockReasons: [],
  }
}

function runtimeConfig() {
  return {
    accessPolicy: { minAge: 18, maxAge: 60, tripleCertificationRequired: false },
    initFields: [1, 2, 3, 4, 5].map(step => ({
      step,
      fieldId: `step-${step}`,
      visible: true,
      required: true,
    })),
    requiredFields: [],
    fieldSettings: [],
    copywriting: {},
    uploadLimits: {
      education: { maxCount: 3, maxMb: 10, formats: ['jpg'] },
      album: { maxCount: 9, maxMb: 10, formats: ['jpg'] },
      profileBg: { maxCount: 1, maxMb: 10, formats: ['jpg'] },
      voice: { maxCount: 1, maxMb: 10, formats: ['mp3'] },
      voiceMinDuration: 1,
      voiceMaxDuration: 60,
    },
    auditPolicy: { educationSlaHours: 24, educationSlaText: '24小时内' },
    smsSecurity: {
      sendCountdownSeconds: 60,
      validMinutes: 5,
      dailySendLimit: 10,
      providerCode: 'mock',
    },
    regionScope: { locationDictPath: '/miniapp/dict/locations', supportsLocation: true },
  }
}

function profileOptions() {
  const option = (code, label) => ({ code, label })
  return {
    gender: [option('FEMALE', '女')],
    identity: [option('WORKER', '职场人士')],
    educationLevel: [option('BACHELOR', '本科')],
    industry: [],
    occupation: [],
    annualIncome: [],
    maritalStatus: [],
    datingGoal: [],
    emotionalStatus: [],
    educationUserType: [],
    educationMethod: [],
    auditStatus: [],
    auditSource: [],
    coreAccessStatus: [],
    avatarSource: [],
    profileTag: [],
    profileTagGroups: [],
  }
}

const benefitRows = [
  ['heart-list', '心动名单一键揭晓：', '123人', '有人对你心动了，立即发现心动的人'],
  ['visitor-eye', '谁来看过你：', '340位访客', '访客全公开，别让在意你的人白等'],
  ['yo-message', '每日专属悄悄话1条', null, '主动问候，开启浪漫邂逅'],
  ['extra-browse', '每日额外浏览10位嘉宾', null, '更多选择，更快遇见心动'],
  ['filter', '精准筛选功能', null, '按条件找到更合适的人'],
  ['exposure', '曝光度拉满', null, '提高被心动的人看见的机会'],
  ['replay', '三天回放功能', null, '错过的推荐还能重新遇见'],
  ['daily-heart', '每日多5次心动机会', null, '表达心动，不留遗憾'],
]

function responseFor(requestUrl) {
  const url = new URL(requestUrl, `http://127.0.0.1:${mockPort}`)
  const pathname = url.pathname.replace(/^\/api/, '')

  if (pathname === '/miniapp/config/prd01') return runtimeConfig()
  if (pathname === '/miniapp/dict/profile-options') return profileOptions()
  if (pathname === '/miniapp/dict/locations') {
    if (url.searchParams.get('parentCode') === '130000')
      return [{ code: '130400', label: '邯郸市', leaf: true }]
    return [{ code: '130000', label: '河北省', leaf: false }]
  }
  if (pathname === '/miniapp/profile/home-detail') {
    return {
      profile: {
        nickname: '筱脑虎',
        avatar: '',
        age: 28,
        locationProvince: '130000',
        locationCity: '130400',
        profileScore: 37,
        likedCount: 12,
        beLikedCount: 8,
        visitorCount: 15,
      },
      fieldSettings: [],
      verificationStatus: { verifyLevel: 3 },
      accessStatus: accessStatus(),
    }
  }
  if (pathname === '/miniapp/profile/basic')
    return { basicProfileCompleted: true, fieldSettings: [] }
  if (pathname === '/miniapp/profile/introduction')
    return { auditStatus: 'APPROVED', aboutMe: '认真生活，期待相遇。' }
  if (pathname === '/miniapp/vip/status') return { vipStatus: 'none' }
  if (pathname === '/miniapp/coin/balance') return { coinBalance: 520 }
  if (pathname === '/miniapp/vip/packages') {
    return [
      {
        id: 1,
        packageName: '包年',
        price: 568,
        originPrice: 568,
        durationDays: 365,
        packageTag: '专属2.4折',
      },
      {
        id: 2,
        packageName: '包季',
        price: 318,
        originPrice: 318,
        durationDays: 90,
        packageTag: '限时优惠',
      },
      {
        id: 3,
        packageName: '包月',
        price: 198,
        originPrice: 198,
        durationDays: 30,
        packageTag: '精选',
      },
    ]
  }
  if (pathname === '/miniapp/vip/benefits') {
    return benefitRows.map(([code, name, value, desc], index) => ({
      id: index + 1,
      benefitCode: code,
      mobileIcon: code,
      benefitName: name,
      benefitValue: value,
      benefitDesc: desc,
      displayOrder: index + 1,
    }))
  }
  return {}
}

function closeTo(actual, expected, tolerance, label) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}应为 ${expected}，实际为 ${actual}`)
}

function timeout(promise, label, ms = 30000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}超时`)), ms)),
  ])
}

async function waitForElement(page, selector, label, attempts = 80) {
  for (let index = 0; index < attempts; index += 1) {
    const element = await page.$(selector)
    if (element) return element
    await page.waitFor(100)
  }
  assert.fail(`缺少运行态元素：${label}`)
}

async function open(miniProgram, route, selector, label) {
  const page = await timeout(miniProgram.reLaunch(route), `${label}跳转`)
  await waitForElement(page, selector, label)
  await page.waitFor(1200)
  return page
}

async function screenshot(miniProgram, filename) {
  if (process.env.SKIP_SCREENSHOTS === 'true') return
  try {
    await timeout(
      miniProgram.screenshot({ path: path.join(outputDir, filename) }),
      `${filename}截图`,
      45000
    )
  } catch (error) {
    const reason = `微信开发者工具截图接口不可用，运行态几何与文案断言继续执行：${error?.message || error}`
    fs.writeFileSync(path.join(outputDir, '截图限制说明.txt'), `${reason}\n`, 'utf8')
    console.warn(reason)
  }
}

;(async () => {
  let miniProgram
  let server
  try {
    server = http.createServer((request, response) => {
      response.writeHead(200, {
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json; charset=utf-8',
      })
      if (request.method === 'OPTIONS') {
        response.end()
        return
      }
      response.end(ok(responseFor(request.url || '/')))
    })
    await new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(mockPort, '127.0.0.1', resolve)
    })

    if (process.env.PROFILE_MEMBERSHIP_SERVER_ONLY === 'true') {
      console.log(`我的与会员中心隔离接口已启动：http://127.0.0.1:${mockPort}/api`)
      await new Promise(() => undefined)
    }

    fs.mkdirSync(outputDir, { recursive: true })
    if (process.env.PROFILE_MEMBERSHIP_SKIP_BUILD !== 'true') {
      execFileSync('npx', ['taro', 'build', '--type', 'weapp'], {
        cwd: projectPath,
        stdio: 'inherit',
        env: {
          ...process.env,
          MINIAPP_E2E_MODE: 'true',
          MINIAPP_E2E_API_BASE_URL: `http://127.0.0.1:${mockPort}/api`,
          MINIAPP_DEV_FIXED_LOGIN: 'false',
        },
      })
      await new Promise(resolve => setTimeout(resolve, 4000))
    }

    try {
      miniProgram = await timeout(
        automator.connect({ wsEndpoint: `ws://127.0.0.1:${automationPort}` }),
        '连接现有微信自动化端口',
        5000
      )
    } catch {
      miniProgram = await automator.launch({
        cliPath,
        projectPath,
        port: automationPort,
        args: ['--port', String(idePort)],
        trustProject: true,
      })
    }

    const exceptions = []
    miniProgram.on('exception', error => exceptions.push(String(error?.message || error)))
    const systemInfo = await miniProgram.systemInfo()
    const rpx = systemInfo.windowWidth / 750
    await miniProgram.callWxMethod('setStorageSync', 'token', 'profile-membership-e2e-token')
    await miniProgram.callWxMethod('setStorageSync', 'userInfo', {
      userId: 91001,
      nickname: '筱脑虎',
      avatar: '',
      phone: '17366629764',
      maskedPhone: '173****9764',
      accessStatus: accessStatus(),
    })

    let page = await open(
      miniProgram,
      '/pages/profile/index',
      '#profile-header-edit-area',
      '我的页面'
    )
    const avatarFrame = await waitForElement(page, '#profile-avatar-frame', '头像底座')
    const avatarImage = await waitForElement(page, '#profile-avatar-image', '头像图片')
    const nicknameRow = await waitForElement(page, '#profile-nickname-row', '昵称行')
    const subInfo = await waitForElement(page, '#profile-sub-info', '地区年龄行')
    const [frameSize, imageSize, imageOffset, nicknameOffset, subInfoOffset] = await Promise.all([
      avatarFrame.size(),
      avatarImage.size(),
      avatarImage.offset(),
      nicknameRow.offset(),
      subInfo.offset(),
    ])
    console.log('我的页面运行态几何：', {
      frameSize,
      imageSize,
      imageOffset,
      nicknameOffset,
      subInfoOffset,
      avatarNicknameGap: nicknameOffset.left - imageOffset.left - imageSize.width,
    })
    closeTo(frameSize.width, 110 * rpx, 1, '头像底座宽度')
    closeTo(frameSize.height, 110 * rpx, 1, '头像底座高度')
    closeTo(imageSize.width, 98 * rpx, 1, '头像可视宽度')
    closeTo(imageSize.height, 98 * rpx, 1, '头像可视高度')
    closeTo(nicknameOffset.left - imageOffset.left - imageSize.width, 20 * rpx, 1, '头像与昵称间距')
    closeTo(subInfoOffset.left, nicknameOffset.left, 1, '昵称和地区信息左边线')
    await screenshot(miniProgram, '01-我的-头像细节修复后.png')

    page = await open(miniProgram, '/pages/membership/index', '#membership-pay-price', '会员中心')
    const durationCount = await waitForElement(
      page,
      '[id^="membership-plan-duration-count-"]',
      '套餐时长数字'
    )
    const durationUnit = await waitForElement(
      page,
      '[id^="membership-plan-duration-unit-"]',
      '套餐时长单位'
    )
    const agreement = await waitForElement(page, '#membership-agreement-line', '会员协议单行')
    const [durationCountText, durationUnitText, agreementText, agreementSize] = await Promise.all([
      durationCount.text(),
      durationUnit.text(),
      agreement.text(),
      agreement.size(),
    ])
    console.log('会员中心运行态排版：', {
      durationCountText,
      durationUnitText,
      agreementText,
      agreementSize,
    })
    assert.equal(durationCountText, '12', '年卡时长数字必须独立展示')
    assert.equal(durationUnitText, '个月', '年卡时长单位必须独立展示')
    assert.equal(agreementText, '阅读并同意《时空邂逅会员服务协议》', '会员协议文案必须与蓝湖一致')
    assert.ok(agreementSize.height <= 17, '会员协议不得折成两行或三行')
    await screenshot(miniProgram, '02-会员中心-金额与协议修复后.png')

    assert.equal(exceptions.length, 0, `运行异常：${exceptions.join('；')}`)
    console.log(`我的与会员中心蓝湖细节运行态验收通过，截图：${outputDir}`)
  } finally {
    miniProgram?.disconnect()
    if (server) {
      server.closeAllConnections?.()
      await new Promise(resolve => server.close(resolve))
    }
  }
})()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error?.stack || error)
    process.exit(1)
  })
