/* eslint-env node */

const { chromium } = require('../../frontend/node_modules/playwright')

const baseUrl = process.env.MESSAGE_H5_BASE_URL || 'http://127.0.0.1:10087/#'

async function expectVisible(locator, message) {
  try {
    await locator.waitFor({ state: 'visible', timeout: 10000 })
  } catch (error) {
    throw new Error(`${message}：${error.message}`)
  }
}

;(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  })
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))

  const open = async route => {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' })
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(250)
  }

  // 消息首页 -> 私信列表 -> 私信详情 -> 文本发送。
  await open('/pages/chat/index?mockScene=home')
  await expectVisible(page.getByText('悄悄话', { exact: true }), '消息首页未展示悄悄话入口')
  await expectVisible(page.getByText('私信', { exact: true }).first(), '消息首页未展示私信入口')
  await page.locator('#message-home-private-entry').click()
  await expectVisible(page.locator('.private-list-row').first(), '私信入口未进入会话列表')
  const firstEnterAt = Date.now()
  await page.locator('.private-list-row').first().click()
  await expectVisible(page.locator('.private-chat-page'), '私信列表未进入会话详情')
  const firstEnterDuration = Date.now() - firstEnterAt
  if (firstEnterDuration > 1500) {
    throw new Error(`私信首次可操作首屏耗时过长：${firstEnterDuration}ms`)
  }
  await page.locator('.chat-input input').fill('返回交互不能被连接阻塞')
  await page.locator('.message-nav-back').last().click()
  await expectVisible(page.locator('.private-list-row').first(), '私信初始化期间返回按钮不可用')
  await page.locator('.private-list-row').first().click()
  await expectVisible(page.locator('.private-chat-page'), '返回后无法再次进入私信会话')
  await page.locator('.chat-input input').fill('消息闭环自动化测试')
  await page.getByText('发送', { exact: true }).click()
  await expectVisible(page.getByText('消息闭环自动化测试', { exact: true }), '普通文本私信发送后未回显')

  // 拉黑必须先成功，再进入带稳定 clientReportId 的举报页。
  await page.locator('.message-dots-button').click()
  await page.getByText('拉黑并举报', { exact: true }).click()
  await page.waitForURL(/pages\/message\/report/)
  if (!page.url().includes('blocked=1') || !page.url().includes('clientReportId=')) {
    throw new Error(`拉黑并举报参数不完整：${page.url()}`)
  }
  await page.getByText('提交', { exact: true }).click()
  await expectVisible(page.getByText('已拉黑并提交举报', { exact: true }), '拉黑并举报成功态文案不正确')

  // H5 直接验证指定消息举报表单；小程序长按入口由静态门禁检查 onLongPress 与参数组装。
  await open('/pages/message/report?sourceType=private_chat&targetId=conversation-lin&conversationNo=conversation-lin&messageNo=MSG-120&timMessageId=TIM-120&clientReportId=report-e2e-message-120&mockScene=report-form')
  await expectVisible(page.getByText('请选择你要举报的事项类型', { exact: true }), '指定消息举报表单未加载')

  // 收到的悄悄话必须独立呈现待回复和已处理；发出的仅呈现等待回复。
  await open('/pages/message/whisper-list?mockScene=whisper-received')
  await expectVisible(page.getByText('待回复(1)', { exact: true }), '收到的悄悄话待回复分组未加载')
  await expectVisible(page.getByText('已处理(1)', { exact: true }), '收到的悄悄话已处理分组未加载')
  const pendingCard = page.locator('.whisper-card').first()
  const pendingCardBox = await pendingCard.boundingBox()
  if (!pendingCardBox) throw new Error('待回复悄悄话卡片无法获取触摸区域')
  const swipeY = pendingCardBox.y + pendingCardBox.height / 2
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: pendingCardBox.x + pendingCardBox.width - 20, y: swipeY }],
  })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: pendingCardBox.x + 80, y: swipeY }],
  })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expectVisible(page.locator('.whisper-card--swiped'), '收到的悄悄话左滑未展示删除动作')
  await page.locator('.whisper-delete-button').first().click()
  await expectVisible(page.getByText('删除后该申请将不再显示，确定删除吗？', { exact: true }), '单条删除未二次确认')
  await page.getByText('删除', { exact: true }).last().click()
  await expectVisible(page.getByText('待回复(0)', { exact: true }), '单条删除后待回复数量未更新')
  await page.getByText('我申请的', { exact: true }).click()
  await expectVisible(page.getByText('等待回复(1)', { exact: true }), '发出的悄悄话等待回复分组未加载')
  if (await page.getByText('已处理(1)', { exact: true }).count()) {
    throw new Error('发出的悄悄话不应展示已处理分组')
  }

  // 收到的悄悄话回复后必须开启私信会话。
  await open('/pages/message/whisper-detail?whisperNo=whisper-received-pending&mockScene=whisper-compose')
  await expectVisible(page.getByText('确认回复', { exact: true }), '收到的悄悄话未展示回复动作')
  await page.locator('.whisper-textarea textarea').fill('愿意认识，很高兴收到你的申请')
  await page.getByText('确认回复', { exact: true }).click()
  await page.waitForURL(/pages\/message\/private-chat/)
  await expectVisible(page.locator('.private-chat-page'), '悄悄话回复后未进入私信会话')

  // 主动发起悄悄话必须先报价再提交，提交后关闭编辑器。
  await open('/pages/message/whisper-detail?compose=1&receiverUserNo=USR-000000000002&mockScene=whisper-compose')
  await expectVisible(page.getByText('立即申请', { exact: true }), '主动悄悄话未展示申请动作')
  await page.locator('.whisper-textarea textarea').fill('认真看过你的资料，希望认识你')
  await page.getByText('立即申请', { exact: true }).click()
  await page.locator('.whisper-composer').waitFor({ state: 'detached', timeout: 10000 })

  // 官方小助手与系统消息均以完整内容列表呈现。
  await open('/pages/message/channel?channel=assistant&mockScene=channel-assistant')
  await expectVisible(page.getByText('官方小助手', { exact: true }), '官方小助手频道未加载')
  await expectVisible(page.locator('.channel-card').first(), '官方小助手消息内容为空')
  await open('/pages/message/channel?channel=system&mockScene=channel-system')
  await expectVisible(page.getByText('系统消息', { exact: true }), '系统消息频道未加载')
  await expectVisible(page.locator('.channel-card').first(), '系统消息内容为空')

  await browser.close()
  if (pageErrors.length) {
    throw new Error(`页面运行异常：${[...new Set(pageErrors)].join('；')}`)
  }
  console.log('消息、私信与通知中心 H5 端到端闭环验证通过')
})().catch(error => {
  console.error(error && error.stack ? error.stack : error)
  process.exit(1)
})
