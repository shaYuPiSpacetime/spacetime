/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('node:fs')
const path = require('node:path')
const automator = require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator')

const projectPath = path.resolve(__dirname, '..')
const outputBaseDir = path.resolve(projectPath, '../docs/验收报告/截图证据/2026-07-15-设置模块七稿/微信运行')
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const automationPort = Number(process.env.WX_AUTO_PORT || 9420)

function withTimeout(promise, label, timeout = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}超时`)), timeout)),
  ])
}

async function screenshot(miniProgram, outputDir, name) {
  await withTimeout(miniProgram.screenshot({ path: path.join(outputDir, name) }), `${name}截图`, 30000)
  console.log('已截图', name)
}

async function requireElement(page, selector) {
  const element = await page.$(selector)
  if (!element) throw new Error(`未找到元素：${selector}`)
  return element
}

;(async () => {
  let miniProgram
  try {
    miniProgram = await withTimeout(
      automator.connect({ wsEndpoint: `ws://127.0.0.1:${automationPort}` }),
      '连接微信自动化端口',
      5000,
    )
  } catch (_) {
    miniProgram = await automator.launch({
      cliPath,
      projectPath,
      port: automationPort,
      args: ['--port', '9527'],
    })
  }

  const exceptions = []
  miniProgram.on('exception', error => exceptions.push(String(error?.message || error)))
  miniProgram.on('console', message => console.log('小程序控制台', JSON.stringify(message)))

  // 截图验收使用本地可控响应，避免为制造“提交成功”状态真实写入注销申请。
  await miniProgram.mockWxMethod('request', function requestMock(options) {
    const url = String(options && options.url || '')
    let data = {}
    if (url.includes('/miniapp/settings/home')) {
      data = {
        phoneBindStatus: 'BOUND',
        maskedPhone: '138****8888',
        wechatBindStatus: 'BOUND',
        entries: [
          { entryKey: 'third_party_list', entryName: '第三方信息共享清单', jumpType: 'H5', jumpTarget: 'https://example.com/third-party' },
          { entryKey: 'personal_info_list', entryName: '个人信息收集清单', jumpType: 'H5', jumpTarget: 'https://example.com/personal-info' },
          { entryKey: 'privacy_policy', entryName: '隐私政策', jumpType: 'H5', jumpTarget: 'https://example.com/privacy' },
        ],
        currentVersion: '1.1.0',
      }
    } else if (url.includes('/miniapp/account/cancel-status')) {
      data = { status: 'NONE', coolingDays: 15 }
    } else if (url.includes('/miniapp/content/config')) {
      data = {
        'account_cancel.reasons': '["暂时不想使用","隐私顾虑","其他"]',
        'account_cancel.cooling_days': '15',
        'agreement.account_cancellation': 'https://example.com/cancellation',
        'agreement.user_agreement': 'https://example.com/agreement',
        'agreement.privacy_policy': 'https://example.com/privacy',
        'about.icp_number': 'ICP备案号',
      }
    } else if (url.includes('/miniapp/content/announcements')) {
      data = { records: [], total: 0, size: 20, current: 1, pages: 0 }
    } else if (url.includes('/miniapp/account/cancel')) {
      data = 1
    }
    const response = { statusCode: 200, header: {}, data: { code: 200, msg: '成功', data } }
    if (options && typeof options.success === 'function') options.success(response)
    if (options && typeof options.complete === 'function') options.complete(response)
    return response
  })

  const systemInfo = await miniProgram.systemInfo()
  const outputDir = `${outputBaseDir}-${systemInfo.windowWidth}x${systemInfo.windowHeight}`
  fs.mkdirSync(outputDir, { recursive: true })
  console.log('模拟器信息', JSON.stringify(systemInfo))

  let page = await miniProgram.reLaunch('/pages/settings/index')
  await page.waitFor(1000)
  await screenshot(miniProgram, outputDir, '01-设置.png')

  const settingRows = await page.$$('.settings-row')
  if (settingRows.length < 6) throw new Error(`设置行数量异常：${settingRows.length}`)
  await settingRows[settingRows.length - 1].tap()
  await page.waitFor(250)
  await screenshot(miniProgram, outputDir, '02-设置-退出登录.png')

  page = await miniProgram.reLaunch('/pages/settings/account-cancel')
  await page.waitFor(1000)
  await screenshot(miniProgram, outputDir, '03-设置-注销账号.png')

  const reasons = await page.$$('.cancel-reason')
  if (reasons.length < 3) throw new Error(`注销原因数量异常：${reasons.length}`)
  await reasons[2].tap()
  const detail = await requireElement(page, '.cancel-detail')
  await detail.input('不想用了')
  await page.waitFor(250)
  await screenshot(miniProgram, outputDir, '04-设置-注销账号-点亮.png')

  const primaryButton = await requireElement(page, '.cancel-bottom-button--primary')
  await primaryButton.tap()
  await page.waitFor(250)
  await screenshot(miniProgram, outputDir, '05-设置-注销账号-注销提醒.png')

  const agreement = await requireElement(page, '.cancel-dialog-agreement')
  await agreement.tap()
  const confirm = await requireElement(page, '.settings-dialog__button--confirm')
  await confirm.tap()
  await page.waitFor(200)
  await screenshot(miniProgram, outputDir, '06-设置-注销账号-提示.png')

  page = await miniProgram.reLaunch('/pages/settings/about')
  await page.waitFor(1400)
  await screenshot(miniProgram, outputDir, '07-关于我们.png')

  await miniProgram.restoreWxMethod('request')
  miniProgram.disconnect()
  if (exceptions.length) throw new Error(`运行异常：${exceptions.join('；')}`)
  console.log(`设置七稿微信运行截图完成：${outputDir}`)
  process.exit(0)
})().catch(error => {
  console.error(error?.stack || error)
  process.exit(1)
})
