/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const automator = require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator')

const projectPath = path.resolve(__dirname, '..')
const outputDir = path.resolve(projectPath, '../docs/验收报告/截图证据/2026-08-05-学历认证在校学生-闭环')
const automationPort = Number(process.env.WX_AUTO_PORT || 9451)
const authToken = String(process.env.WX_AUTH_TOKEN || '').trim()

function timeout(promise, label, ms = 30000) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}超时`)), ms))])
}

async function waitForSelector(page, selector, label) {
  for (let index = 0; index < 100; index += 1) {
    const element = await page.$(selector)
    if (element) return element
    await page.waitFor(100)
  }
  throw new Error(`未找到${label}：${selector}`)
}

function assertRpxStyle(style, property, expectedRpx, scale, message) {
  const matched = String(style).match(new RegExp(`${property}:\\s*(-?\\d+(?:\\.\\d+)?)px`))
  assert.ok(matched, `${message}：缺少 ${property}`)
  const expectedPx = expectedRpx * scale
  assert.ok(Math.abs(Number(matched[1]) - expectedPx) <= 1.5, `${message}：期望 ${expectedPx}px，实际 ${matched[1]}px`)
}

;(async () => {
  assert.ok(authToken, '缺少 WX_AUTH_TOKEN，无法验证生产接口驱动的学历认证页')
  fs.mkdirSync(outputDir, { recursive: true })
  const miniProgram = await timeout(
    automator.connect({ wsEndpoint: `ws://127.0.0.1:${automationPort}` }),
    '连接微信自动化端口',
    5000,
  )
  const exceptions = []
  miniProgram.on('exception', error => exceptions.push(String(error?.message || error)))
  await miniProgram.callWxMethod('setStorageSync', 'token', authToken)
  const page = await timeout(miniProgram.reLaunch('/pages/verification/education-student'), '进入在校学生学历认证页')

  const form = await waitForSelector(page, '#education-student-form', '在校学生资料卡')
  const upload = await page.$('#education-student-upload')
  const materialGrid = upload ? null : await waitForSelector(page, '#education-student-material-grid', '已上传证明材料区')
  const submit = await waitForSelector(page, '#education-submit-button', '提交按钮')
  const agreement = await waitForSelector(page, '#education-agreement-row', '学历协议')
  const customerService = await waitForSelector(page, '#education-customer-service', '联系客服')
  const systemInfo = await miniProgram.systemInfo()
  const rpxScale = systemInfo.windowWidth / 750
  const pageWxml = await form.outerWxml()
  const materialGridWxml = materialGrid ? await materialGrid.outerWxml() : ''
  const submitWxml = await submit.outerWxml()
  const agreementWxml = await agreement.outerWxml()
  const customerServiceWxml = await customerService.outerWxml()
  const formStyle = await form.attribute('style')
  const uploadStyle = upload ? await upload.attribute('style') : ''
  const submitStyle = await submit.attribute('style')
  const agreementStyle = await agreement.attribute('style')
  const customerServiceStyle = await customerService.attribute('style')

  assertRpxStyle(formStyle, 'min-height', 725, rpxScale, '资料卡高度必须形成与底部操作区清晰的背景分割')
  if (upload) {
    assertRpxStyle(uploadStyle, 'height', 306, rpxScale, '空材料态必须使用蓝湖大上传区')
  } else {
    assert.match(materialGridWxml, /<image/, '已有材料态必须按蓝湖缩略图网格展示')
  }
  assertRpxStyle(submitStyle, 'top', 1258, rpxScale, '提交按钮纵坐标必须对齐蓝湖')
  assertRpxStyle(agreementStyle, 'top', 1382, rpxScale, '协议行必须位于提交按钮下方')
  assert.ok(Number(submitStyle.match(/top:\s*(\d+)px/)?.[1]) < Number(agreementStyle.match(/top:\s*(\d+)px/)?.[1]), '提交按钮必须位于协议上方')
  assert.match(String(customerServiceStyle), /top:\s*calc\(/, '联系客服必须使用协议后的独立纵向间距')
  assert.ok(pageWxml && submitWxml && agreementWxml && customerServiceWxml, '学历认证关键组件必须完整渲染')
  assert.equal(exceptions.length, 0, `微信运行异常：${exceptions.join('；')}`)

  try {
    await timeout(
      miniProgram.screenshot({ path: path.join(outputDir, '01-在校学生学历认证.png') }),
      '学历认证截图',
      45000,
    )
    console.log(`学历认证在校学生微信运行态通过，截图：${outputDir}`)
  } catch (error) {
    fs.writeFileSync(
      path.join(outputDir, '截图限制说明.txt'),
      `微信开发者工具截图接口不可用；页面结构、坐标和异常监听均已通过运行态断言。原因：${error?.message || error}\n`,
      'utf8',
    )
    console.log(`学历认证在校学生微信运行态通过；截图接口受限，说明：${path.join(outputDir, '截图限制说明.txt')}`)
  } finally {
    miniProgram.disconnect()
  }
  process.exit(0)
})().catch(error => {
  console.error(error?.stack || error)
  process.exit(1)
})
