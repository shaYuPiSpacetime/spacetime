/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const automator = require('/tmp/spacetime-wx-automator/node_modules/miniprogram-automator')

const projectPath = path.resolve(__dirname, '..')
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const automationPort = Number(process.env.WX_AUTO_PORT || 9475)
const idePort = Number(process.env.WX_IDE_PORT || 57814)
const outputDir = path.resolve(projectPath, '../docs/验收报告/截图证据/2026-08-11-千寻币空态与出生日期滚轮')

function timeout(promise, label, ms = 30000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}超时`)), ms)),
  ])
}

async function waitForElement(page, selector, label) {
  for (let index = 0; index < 80; index += 1) {
    const element = await page.$(selector)
    if (element) return element
    await page.waitFor(100)
  }
  assert.fail(`缺少运行态元素：${label}`)
}

async function capture(miniProgram, name) {
  await timeout(miniProgram.screenshot({ path: path.join(outputDir, name) }), `${name}截图`, 45000)
}

async function elementTexts(elements) {
  return Promise.all(elements.map(element => element.text()))
}

;(async () => {
  fs.mkdirSync(outputDir, { recursive: true })
  let miniProgram
  try {
    miniProgram = await timeout(
      automator.connect({ wsEndpoint: `ws://127.0.0.1:${automationPort}` }),
      '连接微信自动化端口',
      5000,
    )
  } catch (_) {
    miniProgram = await automator.launch({
      cliPath,
      projectPath,
      port: automationPort,
      args: ['--port', String(idePort)],
      trustProject: true,
    })
  }

  try {
    const exceptions = []
    miniProgram.on('exception', error => exceptions.push(String(error?.message || error)))
    await miniProgram.callWxMethod('setStorageSync', 'token', 'dev-fixed-token-17366629764')

    console.log('[runtime] 进入千寻币空态')
    let page = await timeout(miniProgram.reLaunch('/pages/coins/detail?variant=empty'), '进入千寻币明细空态')
    await page.waitFor(2200)
    const emptyImage = await waitForElement(page, '#coin-empty-illustration', '千寻币暂无数据切图')
    const emptyWxml = await emptyImage.outerWxml()
    const systemInfo = await miniProgram.systemInfo()
    const rpxScale = Number(systemInfo.windowWidth) / 750
    const imageStyle = await emptyImage.attribute('style')
    const widthMatch = imageStyle.match(/width:\s*([\d.]+)px/)
    const heightMatch = imageStyle.match(/height:\s*([\d.]+)px/)
    assert.match(emptyWxml, /ccf5a46a04e6015d\/empty-chart\.png/, '运行态没有使用蓝湖暂无任何数据 OSS 原图')
    assert.ok(widthMatch && heightMatch, '运行态切图缺少像素尺寸')
    assert.ok(Math.abs(Number(widthMatch[1]) - 334 * rpxScale) < 1.5, '切图运行宽度必须为 334rpx')
    assert.ok(Math.abs(Number(heightMatch[1]) - 251 * rpxScale) < 1.5, '切图运行高度必须为 251rpx')
    await capture(miniProgram, '01-千寻币明细暂无数据切图.png')

    console.log('[runtime] 进入出生日期选择页')
    page = await timeout(miniProgram.reLaunch('/pages/login/age'), '进入出生日期选择页')
    await page.waitFor(2600)
    const picker = await waitForElement(page, '.login-age-picker--year', '出生日期年份滚轮')
    const monthPicker = await waitForElement(page, '.login-age-picker--month', '出生日期月份滚轮')
    const dayPicker = await waitForElement(page, '.login-age-picker--day', '出生日期日期滚轮')
    const pickers = await page.$$('.login-age-picker')
    const columns = await page.$$('.login-age-picker__column')
    assert.equal(pickers.length, 3, '出生日期必须使用三个物理隔离的原生单列滚轮')
    assert.equal(columns.length, 3, '出生日期必须保持年、月、日三列')
    const initialWxml = (await Promise.all(pickers.map(item => item.outerWxml()))).join('\n')
    const monthTexts = await elementTexts(await columns[1].$$('.login-age-picker__item'))
    const dayTexts = await elementTexts(await columns[2].$$('.login-age-picker__item'))
    assert.match(initialWxml, /item--outer/, '静止态必须保留蓝湖五行视觉')
    assert.doesNotMatch(initialWxml, /column--picking/, '静止态不得展开任何一列')
    assert.deepEqual(monthTexts.filter(Boolean), ['1月', '2月', '3月'], '静止态月份列必须保留蓝湖可见行')
    assert.equal(dayTexts[0], '1日', '日期列必须从 1 日开始')
    await capture(miniProgram, '02-出生日期连续滚轮-初始态.png')

    const firstYearOuter = await columns[0].$('.login-age-picker__item--outer')
    const firstMonthOuter = await columns[1].$('.login-age-picker__item--outer')
    assert.equal(await firstYearOuter.style('visibility'), 'hidden', '静止态年列必须只显示蓝湖五行')
    assert.equal(await firstMonthOuter.style('visibility'), 'hidden', '静止态月列必须只显示蓝湖五行')

    console.log('[runtime] 验证月份列 pickstart')
    await monthPicker.trigger('pickstart')
    await page.waitFor(150)
    const pickingColumns = await page.$$('.login-age-picker__column--picking')
    assert.equal(pickingColumns.length, 1, '滑动时只能展开当前触摸列')
    assert.match(await pickingColumns[0].attribute('class'), /login-age-picker__column--picking/)
    const pickingMonthOuter = await pickingColumns[0].$('.login-age-picker__item--outer')
    assert.equal(await pickingMonthOuter.style('visibility'), 'visible', '当前滑动列必须显示后续全部数值')
    assert.deepEqual(
      await elementTexts(await pickingColumns[0].$$('.login-age-picker__item')),
      MONTHS_FOR_ASSERTION,
      '滑动月份列时必须完整显示 1—12 月'
    )
    const idleYearOuter = await (await page.$$('.login-age-picker__column'))[0].$('.login-age-picker__item--outer')
    assert.equal(await idleYearOuter.style('visibility'), 'hidden', '滑动月列时年列样式不得变化')
    await capture(miniProgram, '02a-出生日期当前列滑动数值全可见.png')
    await monthPicker.trigger('pickend')
    await page.waitFor(150)
    assert.equal((await page.$$('.login-age-picker__column--picking')).length, 0, '滑动结束后必须恢复蓝湖静止态')

    console.log('[runtime] 验证日期列 pickstart')
    await dayPicker.trigger('pickstart')
    await page.waitFor(150)
    const pickingDayColumns = await page.$$('.login-age-picker__column--picking')
    const pickingDayTexts = await elementTexts(await pickingDayColumns[0].$$('.login-age-picker__item'))
    assert.equal(pickingDayTexts[0], '1日', '滑动日期列时必须从 1 日开始')
    assert.ok(pickingDayTexts.includes('31日'), '滑动日期列时必须显示到 31 日')
    await dayPicker.trigger('pickend')
    await page.waitFor(150)

    console.log('[runtime] 验证年份列 pickstart')
    await picker.trigger('pickstart')
    await page.waitFor(150)
    const pickingYearColumns = await page.$$('.login-age-picker__column--picking')
    const pickingYearTexts = await elementTexts(await pickingYearColumns[0].$$('.login-age-picker__item'))
    assert.ok(pickingYearTexts.filter(Boolean).length > 5, '滑动年份列时必须显示后续年份')
    await picker.trigger('pickend')
    await page.waitFor(150)

    const yearItems = await columns[0].$$('.login-age-picker__item')
    const targetYearIndex = Math.min(5, Math.max(0, yearItems.length - 1))
    await picker.trigger('change', { value: [targetYearIndex] })
    await page.waitFor(500)
    const activeYearAfterYearChange = await waitForElement(page, '.login-age-picker__item--year.login-age-picker__item--active', '年份选中项')
    const activeMonthAfterYearChange = await waitForElement(page, '.login-age-picker__item--month.login-age-picker__item--active', '月份选中项')
    const activeDayAfterYearChange = await waitForElement(page, '.login-age-picker__item--day.login-age-picker__item--active', '日期选中项')
    assert.equal(await activeMonthAfterYearChange.text(), '1月', '只滑动年份时月份不得联动')
    assert.equal(await activeDayAfterYearChange.text(), '1日', '只滑动年份时日期不得联动')
    const selectedYear = await activeYearAfterYearChange.text()

    await monthPicker.trigger('change', { value: [5] })
    await page.waitFor(500)
    const activeYearAfterMonthChange = await waitForElement(page, '.login-age-picker__item--year.login-age-picker__item--active', '年份选中项')
    const activeMonthAfterMonthChange = await waitForElement(page, '.login-age-picker__item--month.login-age-picker__item--active', '月份选中项')
    const activeDayAfterMonthChange = await waitForElement(page, '.login-age-picker__item--day.login-age-picker__item--active', '日期选中项')
    assert.equal(await activeYearAfterMonthChange.text(), selectedYear, '只滑动月份时年份不得联动')
    assert.equal(await activeMonthAfterMonthChange.text(), '6月', '月份滚动后必须选中目标值')
    assert.equal(await activeDayAfterMonthChange.text(), '1日', '只滑动月份时日期不得联动')

    await dayPicker.trigger('change', { value: [15] })
    await page.waitFor(500)
    const changedWxml = await picker.outerWxml()
    const activeYear = await waitForElement(page, '.login-age-picker__item--year.login-age-picker__item--active', '年份选中项')
    const activeMonth = await waitForElement(page, '.login-age-picker__item--month.login-age-picker__item--active', '月份选中项')
    const activeDay = await waitForElement(page, '.login-age-picker__item--day.login-age-picker__item--active', '日期选中项')
    assert.equal(await activeYear.text(), selectedYear, '只滑动日期时年份不得联动')
    assert.equal(await activeMonth.text(), '6月', '月份滚动后必须选中目标值')
    assert.equal(await activeDay.text(), '16日', '日期滚动后必须选中目标值')
    assert.match(changedWxml, /item--outer/, '值变更后必须恢复蓝湖五行静止样式')
    await capture(miniProgram, '03-出生日期连续滚轮-变更态.png')

    console.log('[runtime] 进入现居地选择页')
    page = await timeout(miniProgram.reLaunch('/pages/login/address?variant=empty'), '进入现居地选择页')
    await page.waitFor(2600)
    const cityIcon = await waitForElement(page, '#login-city-location-icon', '选择城市定位切图')
    const cityIconWxml = await cityIcon.outerWxml()
    const cityIconStyle = await cityIcon.attribute('style')
    const cityWidthMatch = cityIconStyle.match(/width:\s*([\d.]+)px/)
    const cityHeightMatch = cityIconStyle.match(/height:\s*([\d.]+)px/)
    assert.match(cityIconWxml, /34daa393244a6db9\/city-location\.png/, '选择城市没有使用用户指定 OSS 切图')
    assert.ok(cityWidthMatch && cityHeightMatch, '选择城市切图缺少运行尺寸')
    assert.ok(Math.abs(Number(cityWidthMatch[1]) - 38 * rpxScale) < 1.5, '选择城市切图宽度必须为 38rpx')
    assert.ok(Math.abs(Number(cityHeightMatch[1]) - 46 * rpxScale) < 1.5, '选择城市切图高度必须为 46rpx')
    await capture(miniProgram, '04-选择城市指定定位切图.png')

    assert.equal(exceptions.length, 0, `微信运行异常：${exceptions.join('；')}`)
    console.log(`选择城市切图与出生日期五行滚轮微信运行态通过，截图：${outputDir}`)
  } finally {
    miniProgram.disconnect()
  }
})().catch(error => {
  console.error(error?.stack || error)
  process.exit(1)
})

const MONTHS_FOR_ASSERTION = Array.from({ length: 12 }, (_, index) => `${index + 1}月`)
