import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const dataPath = path.join(rootDir, 'src/data/lanhuDemo.json')
const appConfigPath = path.join(rootDir, 'src/app.config.ts')

const REQUIRED_COMMERCE_DESIGNS = {
  membership: [
    { designName: '会员中心-微信支付', route: '/pages/membership/index?payState=wechat-pay', variant: 'wechat-pay' },
    { designName: '会员中心-支付成功', route: '/pages/membership/index?payState=pay-success', variant: 'pay-success' },
    { designName: '会员中心-取消支付', route: '/pages/membership/index?payState=pay-cancel', variant: 'pay-cancel' },
    { designName: '会员中心-未支付出弹窗', route: '/pages/membership/index?payState=unpaid-sheet', variant: 'unpaid-sheet' },
    { designName: '订阅管理', route: '/pages/membership/index?variant=subscription', variant: 'subscription' },
  ],
  coins: [
    { designName: '千寻币-微信支付', route: '/pages/coins/index?payState=wechat-pay', variant: 'wechat-pay' },
    { designName: '千寻币-支付成功', route: '/pages/coins/index?payState=pay-success', variant: 'pay-success' },
    { designName: '千寻币-取消支付', route: '/pages/coins/index?payState=pay-cancel', variant: 'pay-cancel' },
    { designName: '千寻币-充值须知', route: '/pages/coins/index?variant=recharge-notice', variant: 'recharge-notice' },
  ],
}

const SOURCE_EVIDENCE = [
  {
    label: '会员 hook 支付状态机',
    file: 'src/hooks/useMembership.ts',
    snippets: [
      'MembershipPayState',
      "type MembershipPayState = 'idle' | 'wechat-pay' | 'pay-success' | 'pay-cancel' | 'unpaid-sheet'",
      'payState',
      'openWechatPay',
      'simulatePaySuccess',
      'simulatePayCancel',
      'showUnpaidSheet',
      'hidePaymentLayer',
    ],
  },
  {
    label: '会员页 payState 路由和支付面板',
    file: 'src/pages/membership/index.tsx',
    snippets: [
      'resolveMembershipPayState',
      'MembershipPaymentLayer',
      'WechatPayPanel',
      'PayResultModal',
      'UnpaidBottomSheet',
      'SubscriptionPanel',
      "variant === 'subscription'",
      "borderRadius: '24rpx'",
      "borderRadius: '16rpx'",
      "borderRadius: '98rpx'",
      "borderRadius: '24rpx 24rpx 0 0'",
      "borderRadius: '64rpx 64rpx 0 0'",
    ],
  },
  {
    label: '成家币 hook 支付状态机',
    file: 'src/hooks/useCoins.ts',
    snippets: [
      'CoinPayState',
      "type CoinPayState = 'idle' | 'wechat-pay' | 'pay-success' | 'pay-cancel'",
      'payState',
      'openWechatPay',
      'simulatePaySuccess',
      'simulatePayCancel',
      'hidePaymentLayer',
    ],
  },
  {
    label: '成家币页支付和充值须知',
    file: 'src/pages/coins/index.tsx',
    snippets: [
      'resolveCoinPayState',
      'showRechargeNotice',
      'RechargeNoticeModal',
      'CoinsPaymentLayer',
      'WechatPayPanel',
      'PayResultModal',
      "variant === 'recharge-notice'",
      "borderRadius: '98rpx'",
      "borderRadius: '24rpx'",
      "borderRadius: '16rpx'",
      "borderRadius: '8rpx'",
      "borderRadius: '64rpx'",
    ],
  },
]

function readJson(filePath) {
  assert.ok(fs.existsSync(filePath), `缺少数据文件: ${path.relative(rootDir, filePath)}`)
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function readAppRoutes() {
  const content = fs.readFileSync(appConfigPath, 'utf8')
  const routeSet = new Set()
  const pageMatches = [...content.matchAll(/'([^']+)'/g)].map((match) => match[1])
  const topLevelPages = pageMatches.filter((value) => value.startsWith('pages/'))
  for (const page of topLevelPages) {
    routeSet.add(`/${page}`)
  }

  const subPackageBlocks = [...content.matchAll(/root:\s*'([^']+)'[\s\S]*?pages:\s*\[([\s\S]*?)\]/g)]
  for (const [, root, pageBlock] of subPackageBlocks) {
    const pages = [...pageBlock.matchAll(/'([^']+)'/g)].map((match) => match[1])
    for (const page of pages) {
      routeSet.add(`/${root}/${page}`)
    }
  }

  return routeSet
}

function cleanRoute(route) {
  return route.split('?')[0]
}

function assertRoute(routeSet, route, label) {
  assert.equal(typeof route, 'string', `${label} 缺少 route`)
  assert.ok(routeSet.has(cleanRoute(route)), `${label} 路由未注册: ${route}`)
}

function assertUiDesign(section, expected) {
  const uiDesigns = data[section]?.uiDesigns
  assert.ok(Array.isArray(uiDesigns), `${section}.uiDesigns 必须是数组`)

  for (const expectedItem of expected) {
    const uiDesign = uiDesigns.find((item) => item.designName === expectedItem.designName)
    assert.ok(uiDesign, `${section}.uiDesigns 缺少设计稿: ${expectedItem.designName}`)
    assert.equal(uiDesign.route, expectedItem.route, `${expectedItem.designName} route 必须指向指定状态`)
    assert.equal(uiDesign.variant, expectedItem.variant, `${expectedItem.designName} variant 必须指向指定状态`)
    assertRoute(routeSet, uiDesign.route, expectedItem.designName)

    const design = data.designs.find((candidate) => candidate.name === expectedItem.designName)
    assert.ok(design, `manifest 缺少设计稿: ${expectedItem.designName}`)
    assert.equal(design.status, 'implemented', `${expectedItem.designName} 必须标记为 implemented`)
    assert.equal(design.route, expectedItem.route, `${expectedItem.designName} manifest route 必须和 uiDesigns 一致`)
    assert.ok(Array.isArray(design.assetRefs), `${expectedItem.designName} assetRefs 必须是数组`)
    assert.ok(design.assetRefs.length > 0, `${expectedItem.designName} 必须关联至少 1 个切图或蓝湖参考资产`)
  }
}

function assertSourceEvidence() {
  for (const item of SOURCE_EVIDENCE) {
    const sourcePath = path.join(rootDir, item.file)
    assert.ok(fs.existsSync(sourcePath), `${item.label} 文件不存在: ${item.file}`)
    const source = fs.readFileSync(sourcePath, 'utf8')
    for (const snippet of item.snippets) {
      assert.ok(source.includes(snippet), `${item.label} 缺少源码证据: ${snippet}`)
    }
  }
}

const data = readJson(dataPath)
const routeSet = readAppRoutes()

assertUiDesign('membership', REQUIRED_COMMERCE_DESIGNS.membership)
assertUiDesign('coins', REQUIRED_COMMERCE_DESIGNS.coins)
assertSourceEvidence()

console.log('商业支付 UI 覆盖校验通过')
