import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const dataPath = path.join(rootDir, 'src/data/lanhuDemo.json')
const appConfigPath = path.join(rootDir, 'src/app.config.ts')
const acceptanceReportPath = path.resolve(rootDir, '../docs/验收报告/2026-07-07-商业化蓝湖还原-acceptance.md')

const REQUIRED_COMMERCE_DESIGNS = {
  membership: [
    { designName: '会员中心-全', route: '/pages/membership/index', variant: 'default' },
    { designName: '会员中心-会员未开通，支付按钮固定下方', route: '/pages/membership/index?variant=none', variant: 'none' },
    { designName: '会员中心-已开通', route: '/pages/membership/index?variant=active', variant: 'active' },
    { designName: '会员中心-已过期', route: '/pages/membership/index?variant=expired', variant: 'expired' },
    { designName: '会员中心-连续包年', route: '/pages/membership/index?variant=annual', variant: 'annual' },
    { designName: '会员中心-微信支付', route: '/pages/membership/index?payState=wechat-pay', variant: 'wechat-pay' },
    { designName: '会员中心-支付成功', route: '/pages/membership/index?payState=pay-success', variant: 'pay-success' },
    { designName: '会员中心-取消支付', route: '/pages/membership/index?payState=pay-cancel', variant: 'pay-cancel' },
    { designName: '会员中心-未支付出弹窗', route: '/pages/membership/index?payState=unpaid-sheet', variant: 'unpaid-sheet' },
    { designName: '订阅管理', route: '/pages/membership/subscription', variant: 'default' },
    { designName: '会员记录', route: '/pages/membership/records', variant: 'default' },
    { designName: '会员记录-详情（已支付）', route: '/pages/membership/record-detail?status=paid', variant: 'paid' },
    { designName: '会员记录-详情（已退款）', route: '/pages/membership/record-detail?status=refunded', variant: 'refunded' },
  ],
  coins: [
    { designName: '千寻币', route: '/pages/coins/index', variant: 'default' },
    { designName: '千寻币-协议勾选', route: '/pages/coins/index?variant=checked', variant: 'checked' },
    { designName: '千寻币-点支付未勾选协议', route: '/pages/coins/index?variant=unchecked-error', variant: 'unchecked-error' },
    { designName: '千寻币-微信支付', route: '/pages/coins/index?payState=wechat-pay', variant: 'wechat-pay' },
    { designName: '千寻币-支付成功', route: '/pages/coins/index?payState=pay-success', variant: 'pay-success' },
    { designName: '千寻币-取消支付', route: '/pages/coins/index?payState=pay-cancel', variant: 'pay-cancel' },
    { designName: '千寻币-充值须知', route: '/pages/coins/index?variant=recharge-notice', variant: 'recharge-notice' },
    { designName: '千寻币明细', route: '/pages/coins/detail', variant: 'default' },
    { designName: '千寻币明细-暂无数据', route: '/pages/coins/detail?variant=empty', variant: 'empty' },
  ],
}

const LANHU_REF_DIR = path.join(rootDir, '.lanhu-ref/lanhu-full-2026-07-07/images')
const REQUIRED_REFERENCE_IMAGES = [
  '08-会员中心-全.png',
  '09-千寻币.png',
  '58-会员记录.png',
  '59-会员记录-详情（已退款）.png',
  '60-会员中心-已过期.png',
  '61-会员中心-连续包年.png',
  '62-会员中心-已开通.png',
  '63-会员中心-会员未开通，支付按钮固定下方.png',
  '64-会员中心-支付成功.png',
  '65-会员中心-微信支付.png',
  '66-千寻币明细.png',
  '67-千寻币明细-暂无数据.png',
  '68-千寻币-支付成功.png',
  '69-千寻币-取消支付.png',
  '70-千寻币-协议勾选.png',
  '71-千寻币-微信支付.png',
  '72-千寻币-充值须知.png',
  '75-会员中心-取消支付.png',
  '76-会员中心-未支付出弹窗.png',
  '77-会员记录-详情（已支付）.png',
  '78-订阅管理.png',
  '79-千寻币-点支付未勾选协议.png',
]

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
      'WechatMockPayPanel',
      'PayResultModal',
      'UnpaidBottomSheet',
      '用户取消支付',
      '确认开通会员',
      "height: '392rpx'",
      'onSubscription',
      "/pages/membership/subscription",
      'getHeroBottomText(status',
      '尊贵特权已过期，重启会员，精准匹配、自由畅聊',
      'shouldShowRecords',
      "status === 'expired'",
      "const navTitle = variant === 'expired' ? undefined : '会员中心'",
      'title={navTitle}',
      '已过期',
      'getBenefitTitle(variant)',
      'function getBenefitTitle',
      'VIP特权',
      'getAgreementText(variant',
      'formatSubscriptionAmount',
      "replace(/\\.00$/, '')",
      '连续订阅会员服务协议',
      "borderRadius: '98rpx'",
    ],
  },
  {
    label: '会员权益结构化图标占位',
    file: 'src/pages/membership/index.tsx',
    snippets: [
      'CommercePlaceholderIcon',
      "variant=\"member\"",
      'kind={icon}',
    ],
  },
  {
    label: '千寻币 hook 支付状态机',
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
    label: '千寻币页支付和充值须知',
    file: 'src/pages/coins/index.tsx',
    snippets: [
      'resolveCoinPayState',
      'showRechargeNotice',
      'RechargeNoticeModal',
      'CoinsPaymentLayer',
      'WechatPayPanel',
      'WechatMockPayPanel',
      'PayResultModal',
      'AgreementConfirmSheet',
      "variant === 'recharge-notice'",
      "borderRadius: '14rpx'",
      "borderRadius: '8rpx'",
      "borderRadius: '64rpx'",
    ],
  },
  {
    label: '千寻币用途结构化图标占位',
    file: 'src/pages/coins/index.tsx',
    snippets: [
      'CommercePlaceholderIcon',
      "variant=\"coin\"",
      'kind={item.icon}',
      'usages.slice(0, 8).map((item)',
    ],
  },
  {
    label: '订阅管理独立页',
    file: 'src/pages/membership/subscription.tsx',
    snippets: [
      '订阅管理',
      '套餐与扣费说明',
      '取消续费指引',
      '查看会员订单',
      '自动续费管理',
    ],
  },
  {
    label: '会员详情独立页',
    file: 'src/pages/membership/record-detail.tsx',
    snippets: [
      '会员详情',
      '已支付',
      '已退款',
      '订单金额',
      '付款方式',
    ],
  },
]

const VISUAL_TOKEN_EVIDENCE = [
  {
    label: '商业化缺图结构化占位组件',
    file: 'src/components/CommercePlaceholderIcon.tsx',
    snippets: [
      'export type CommerceIconVariant',
      'export default function CommercePlaceholderIcon',
      'renderCoinGlyph',
      'renderMemberGlyph',
      'iconKey',
    ],
  },
  {
    label: '会员已开通状态套餐名',
    file: 'src/data/lanhuDemo.json',
    snippets: [
      '"planName": "连续包年"',
      '"originalAmount": "¥688.00"',
    ],
  },
  {
    label: '订阅管理取消续费指引卡',
    file: 'src/pages/membership/subscription.tsx',
    snippets: [
      '续费周期',
      '会员状态',
      "border: '1rpx solid #1B3C68'",
      "padding: '0 25rpx 60rpx'",
      "minHeight: '1006rpx'",
      "width: '344rpx'",
      "height: '216rpx'",
      "height: '392rpx'",
    ],
  },
  {
    label: '微信 mock 支付键盘尺寸',
    file: 'src/components/WechatMockPayPanel.tsx',
    snippets: [
      "minHeight: '1046rpx'",
      "height: '456rpx'",
      "height: '114rpx'",
      "width: '672rpx'",
      "width: '552rpx'",
      "background: '#EEEEEE', margin: '0 auto 0'",
      "height: '80rpx'",
      "margin: '50rpx auto 0'",
      "const KEYS = ['1', '2', '3'",
      'function DeleteKeyIcon',
      "key === '⌫' ? <DeleteKeyIcon /> : key",
    ],
  },
  {
    label: '千寻币底部协议弹层',
    file: 'src/pages/coins/index.tsx',
    snippets: [
      "height: '388rpx'",
      "padding: '107rpx 44rpx 0'",
      "borderRadius: '40rpx 40rpx 0 0'",
      '继续支付',
      '我已阅读并同意',
    ],
  },
]

const FORBIDDEN_COMMERCIAL_TEXT_FILES = [
  'src/data/lanhuDemo.json',
  'src/pages/coins/index.tsx',
  'src/pages/coins/detail.tsx',
  'src/hooks/useCoins.ts',
  'src/hooks/useProfile.ts',
  'src/pages/profile/index.tsx',
  'src/pages/featured/index.tsx',
  'src/components/UserCard/index.tsx',
  'src/services/mock.ts',
  'src/services/payment.ts',
  'src/types/coin.ts',
]

const FORBIDDEN_NATIVE_PAY_TOAST_FILES = [
  'src/hooks/useCoins.ts',
  'src/hooks/useMembership.ts',
]

const REQUIRED_MISSING_SLICE_NOTES = [
  '千寻币用途 8 个圆形白色图标',
  '千寻币明细暂无记录插画',
  '会员权益 9 个金色图标',
  '会员记录菱形会员图标',
  '会员记录退款圆章星形素材',
  '订阅管理会员卡专用无文案背景',
  '订阅管理「取消续费指引」里的两张微信流程截图',
  '微信支付系统面板非真实系统渲染',
  '会员中心装饰分隔图标',
  '缺失切图处只做占位，不作为 1:1 完成项',
]

const REQUIRED_MEMBERSHIP_PLAN_NAMES = [
  '连续包年',
  '连续包季',
  '连续包月',
  '年卡会员',
]

const REQUIRED_MEMBERSHIP_REGULAR_PLAN_NAMES = [
  '包年',
  '包季',
  '包月',
]

const REQUIRED_COIN_REFERENCE_BY_DESIGN = {
  千寻币: '09-千寻币.png',
  '千寻币明细': '66-千寻币明细.png',
  '千寻币明细-暂无数据': '67-千寻币明细-暂无数据.png',
  '千寻币-支付成功': '68-千寻币-支付成功.png',
  '千寻币-取消支付': '69-千寻币-取消支付.png',
  '千寻币-协议勾选': '70-千寻币-协议勾选.png',
  '千寻币-微信支付': '71-千寻币-微信支付.png',
  '千寻币-充值须知': '72-千寻币-充值须知.png',
  '千寻币-点支付未勾选协议': '79-千寻币-点支付未勾选协议.png',
}

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
  for (const item of [...SOURCE_EVIDENCE, ...VISUAL_TOKEN_EVIDENCE]) {
    const sourcePath = path.join(rootDir, item.file)
    assert.ok(fs.existsSync(sourcePath), `${item.label} 文件不存在: ${item.file}`)
    const source = fs.readFileSync(sourcePath, 'utf8')
    for (const snippet of item.snippets) {
      assert.ok(source.includes(snippet), `${item.label} 缺少源码证据: ${snippet}`)
    }
  }
}

function assertReferenceImages() {
  for (const imageName of REQUIRED_REFERENCE_IMAGES) {
    assert.ok(fs.existsSync(path.join(LANHU_REF_DIR, imageName)), `缺少蓝湖参考截图: ${imageName}`)
  }
}

function assertNoLegacyCoinName() {
  for (const file of FORBIDDEN_COMMERCIAL_TEXT_FILES) {
    const sourcePath = path.join(rootDir, file)
    assert.ok(fs.existsSync(sourcePath), `商业化文案文件不存在: ${file}`)
    const source = fs.readFileSync(sourcePath, 'utf8')
    assert.ok(!source.includes('成家币'), `${file} 不应再出现“成家币”，请统一为“千寻币”`)
  }
}

function assertNoNativePaySuccessToast() {
  for (const file of FORBIDDEN_NATIVE_PAY_TOAST_FILES) {
    const sourcePath = path.join(rootDir, file)
    const source = fs.readFileSync(sourcePath, 'utf8')
    assert.ok(!source.includes("Taro.showToast({ title: '支付成功'"), `${file} 不应使用原生支付成功 toast，应由蓝湖自定义提示承接`)
  }
}

function assertMissingSlicesAreReported() {
  assert.ok(fs.existsSync(acceptanceReportPath), `缺少商业化蓝湖验收报告: ${path.relative(rootDir, acceptanceReportPath)}`)
  const report = fs.readFileSync(acceptanceReportPath, 'utf8')
  for (const note of REQUIRED_MISSING_SLICE_NOTES) {
    assert.ok(report.includes(note), `验收报告必须登记缺失切图或占位边界: ${note}`)
  }
}

function assertMembershipPlanRailMatchesLanhu() {
  const plans = data.membership?.plans
  assert.ok(Array.isArray(plans), 'membership.plans 必须是数组')
  assert.ok(plans.length >= 4, '会员套餐轨道必须至少 4 张卡片，以匹配蓝湖右侧露出的第 4 张卡片')

  const names = plans.map((plan) => plan.name)
  for (const name of REQUIRED_MEMBERSHIP_PLAN_NAMES) {
    assert.ok(names.includes(name), `会员套餐缺少蓝湖轨道卡片: ${name}`)
  }

  const plainAnnual = plans.find((plan) => plan.name === '年卡会员')
  assert.ok(plainAnnual, '缺少普通年卡套餐')
  assert.equal(plainAnnual.durationLabel, '12个月', '普通年卡套餐周期必须是 12个月')

  const regularPlans = data.membership?.regularPlans
  assert.ok(Array.isArray(regularPlans), 'membership.regularPlans 必须存在，用于单独承接 08-会员中心-全 普通套餐')
  const regularNames = regularPlans.map((plan) => plan.name)
  for (const name of REQUIRED_MEMBERSHIP_REGULAR_PLAN_NAMES) {
    assert.ok(regularNames.includes(name), `08-会员中心-全 普通套餐缺少: ${name}`)
  }
  const regularAnnual = regularPlans.find((plan) => plan.name === '包年')
  assert.equal(regularAnnual?.price, 568, '08-会员中心-全 包年底部支付价必须是 568')
  assert.equal(regularAnnual?.originalPrice, 688, '08-会员中心-全 包年原价必须是 688')
  assert.equal(regularAnnual?.monthlyPriceLabel, '¥57.33/月', '08-会员中心-全 包年月均价必须匹配蓝湖')

  const membershipSource = fs.readFileSync(path.join(rootDir, 'src/pages/membership/index.tsx'), 'utf8')
  for (const snippet of [
    "type MembershipPageVariant = 'default' | 'none' | 'active' | 'expired' | 'annual'",
    "return 'default'",
    'monthlyPriceLabel',
    "height: '248rpx'",
    "marginTop: '98rpx'",
    "height: '104rpx'",
    "marginTop: '26rpx'",
  ]) {
    assert.ok(membershipSource.includes(snippet), `会员中心默认态缺少 08 独立普通套餐证据: ${snippet}`)
  }

  const membershipHookSource = fs.readFileSync(path.join(rootDir, 'src/hooks/useMembership.ts'), 'utf8')
  for (const snippet of [
    "type MembershipDemoVariant = 'default' | 'none' | 'active' | 'expired' | 'annual'",
    'plansForVariant',
    'membershipDemo.regularPlans',
  ]) {
    assert.ok(membershipHookSource.includes(snippet), `会员 hook 缺少默认态和连续订阅态套餐拆分证据: ${snippet}`)
  }
}

function assertMembershipSubscriptionPricing() {
  assert.equal(data.membership?.subscription?.renewalAmount, '¥568.00', '连续订阅优惠价必须是 ¥568.00')
  assert.equal(data.membership?.subscription?.originalAmount, '¥688.00', '连续订阅原价必须是 ¥688.00')
}

function assertMembershipPaymentOverlaysMatchLanhu() {
  assert.equal(data.membership?.wechatPayPreviewAmount, '268.00', '会员中心微信支付预览态金额必须匹配 65-会员中心-微信支付.png')

  const membershipSource = fs.readFileSync(path.join(rootDir, 'src/pages/membership/index.tsx'), 'utf8')
  for (const snippet of [
    'const requestedVariant = resolveMembershipVariant',
    "const variant = routePayState === 'idle' ? requestedVariant : 'annual'",
    "const paymentPreviewAmount = routePayState === 'wechat-pay' ? membershipDemo.wechatPayPreviewAmount : undefined",
    'previewAmount={paymentPreviewAmount}',
    'previewAmount ?? plan?.price.toFixed(2) ??',
    'PayResultModal',
    "top: '400rpx'",
    "width: '290rpx'",
    "height: '96rpx'",
    "background: 'rgba(255, 255, 255, 0.32)'",
    "background: 'rgba(0, 0, 0, 0.32)'",
  ]) {
    assert.ok(membershipSource.includes(snippet), `会员支付结果浮层缺少蓝湖结构证据: ${snippet}`)
  }
  assert.ok(
    !membershipSource.includes("background: 'rgba(0, 0, 0, 0.48)'"),
    '会员微信支付遮罩透明度应匹配 65-会员中心-微信支付.png 的约 0.32，不应继续使用 0.48',
  )
}

function assertMembershipRecordPagesMatchLanhu() {
  const records = data.membership?.records
  assert.ok(Array.isArray(records), 'membership.records 必须是数组')
  assert.equal(records.length, 2, '蓝湖会员记录页应展示 2 条记录')
  assert.equal(records[0]?.listTitle, '时空邂逅会员连续包年', '会员记录首条列表标题必须匹配蓝湖')
  assert.equal(records[1]?.listTitle, '时空邂逅会员包年', '会员记录退款列表标题必须匹配蓝湖')
  for (const record of records) {
    assert.equal(record.durationLabel, '12个月', '会员记录卡片右侧周期必须是 12个月')
    assert.equal(record.validityStart, '2026.05.28 15:58', '会员记录列表有效期起始必须匹配蓝湖')
    assert.equal(record.validityEnd, '2027.05.27 15:58', '会员记录列表有效期截止必须匹配蓝湖')
  }

  const recordsSource = fs.readFileSync(path.join(rootDir, 'src/pages/membership/records.tsx'), 'utf8')
  for (const snippet of [
    'recordsLoading && filteredRecords.length === 0',
    "padding: '6rpx 25rpx 60rpx'",
    'record.listTitle',
    'record.durationLabel',
    'record.validityStart',
    'record.validityEnd',
    'function MemberRecordDiamond',
    'function RefundStamp',
    "border: '6rpx solid rgba(150,150,150,0.48)'",
    "transform: 'rotate(-24deg)'",
  ]) {
    assert.ok(recordsSource.includes(snippet), `会员记录页缺少蓝湖结构证据: ${snippet}`)
  }
  assert.ok(!recordsSource.includes('◇'), '会员记录页不能再用纯文本菱形冒充会员图标')

  const membershipSource = fs.readFileSync(path.join(rootDir, 'src/pages/membership/index.tsx'), 'utf8')
  assert.ok(!membershipSource.includes('暂不开通'), '会员未支付弹层不能出现蓝湖参考图之外的次按钮')

  const recordDesign = data.designs.find((item) => item.name === '会员记录')
  assert.ok(
    recordDesign?.assetRefs?.includes('.lanhu-ref/lanhu-full-2026-07-07/images/58-会员记录.png'),
    '会员记录 manifest assetRefs 必须直指 58-会员记录.png 蓝湖参考图',
  )

  const membershipHookSource = fs.readFileSync(path.join(rootDir, 'src/hooks/useMembership.ts'), 'utf8')
  assert.ok(
    membershipHookSource.includes('useState<MembershipRecord[]>(membershipDemo.records)'),
    '会员记录页 mock 数据必须首屏即展示，避免蓝湖默认态截图先出现加载/空态',
  )

  const detailSource = fs.readFileSync(path.join(rootDir, 'src/pages/membership/record-detail.tsx'), 'utf8')
  for (const snippet of [
    "padding: '8rpx 25rpx 0'",
    "height: '168rpx'",
    "marginTop: '20rpx'",
    "minHeight: '528rpx'",
    "borderRadius: '8rpx'",
    "height: '88rpx'",
    "fontSize: '32rpx'",
    "maxWidth: '500rpx'",
  ]) {
    assert.ok(detailSource.includes(snippet), `会员详情页缺少蓝湖信息卡结构证据: ${snippet}`)
  }

  const subscriptionSource = fs.readFileSync(path.join(rootDir, 'src/pages/membership/subscription.tsx'), 'utf8')
  assert.ok(subscriptionSource.includes('function SubscriptionHeroPattern'), '订阅管理会员卡缺少无文案几何纹理占位')
  assert.ok(!subscriptionSource.includes('member-vip-bg'), '订阅管理不能复用带文案的 member-vip-bg.webp')
  for (const snippet of [
    'AI搜索',
    '全部',
    '前往',
    'SearchGuideArrow',
    'RenewGuideArrow',
    '时空邂逅会员年卡自动续费',
    '2025年7月26日开通服务',
    "height: '392rpx'",
  ]) {
    assert.ok(subscriptionSource.includes(snippet), `订阅管理取消续费指引缺少微信流程截图关键占位: ${snippet}`)
  }
  const subscriptionHeroTextAnchors = subscriptionSource.match(/left: '150rpx'/g) ?? []
  assert.ok(
    subscriptionHeroTextAnchors.length >= 2,
    '订阅管理会员卡昵称和连续包年胶囊应按 78-订阅管理.png 对齐到卡片内 left: 150rpx',
  )

  const subscriptionDesign = data.designs.find((item) => item.name === '订阅管理')
  assert.ok(
    subscriptionDesign?.assetRefs?.includes('.lanhu-ref/lanhu-full-2026-07-07/images/78-订阅管理.png'),
    '订阅管理 manifest assetRefs 必须直指 78-订阅管理.png 蓝湖参考图',
  )
}

function assertCoinPagesMatchLanhu() {
  const packages = data.coins?.packages
  assert.ok(Array.isArray(packages), 'coins.packages 必须是数组')
  const hotPackage = packages.find((item) => item.amount === 3000)
  assert.ok(hotPackage, '千寻币套餐缺少 3000 热销套餐')
  assert.equal(hotPackage.originalPrice, '¥301.12', '3000 千寻币套餐原价必须匹配蓝湖')
  assert.equal(hotPackage.discountLabel, '8.9折', '3000 千寻币套餐折扣必须匹配蓝湖')
  const savingPackage = packages.find((item) => item.amount === 6000)
  assert.ok(savingPackage, '千寻币套餐缺少 6000 节省最多套餐')
  assert.equal(savingPackage.originalPrice, '¥602.82', '6000 千寻币套餐原价必须匹配蓝湖')
  assert.equal(savingPackage.discountLabel, '7.1折', '6000 千寻币套餐折扣必须匹配蓝湖')

  for (const [designName, imageName] of Object.entries(REQUIRED_COIN_REFERENCE_BY_DESIGN)) {
    const design = data.designs.find((item) => item.name === designName)
    assert.ok(design, `manifest 缺少千寻币设计稿: ${designName}`)
    assert.ok(
      design.assetRefs?.includes(`.lanhu-ref/lanhu-full-2026-07-07/images/${imageName}`),
      `${designName} manifest assetRefs 必须直指蓝湖参考图 ${imageName}`,
    )
  }

  const coinTypeSource = fs.readFileSync(path.join(rootDir, 'src/types/coin.ts'), 'utf8')
  for (const snippet of ['originalPrice?: string', 'discountLabel?: string']) {
    assert.ok(coinTypeSource.includes(snippet), `千寻币套餐类型缺少蓝湖字段: ${snippet}`)
  }

  const coinsSource = fs.readFileSync(path.join(rootDir, 'src/pages/coins/index.tsx'), 'utf8')
  for (const snippet of [
    'pkg.originalPrice',
    'pkg.discountLabel',
    "textDecorationLine: 'line-through'",
    'CoinAmountLabel',
    'function CoinAmountLabel',
    "left: '231rpx'",
    "top: '393rpx'",
    "width: '288rpx'",
    "height: '98rpx'",
    "background: '#ADADAD'",
    'rechargeNotice.title',
    'rechargeNotice.faqTitle',
    'rechargeNotice.contactText',
    'rechargeNotice.confirmText',
    "justifyContent: 'flex-start'",
    "padding: '386rpx 65rpx 0'",
    "width: '620rpx'",
    "minHeight: '478rpx'",
    "height: '170rpx'",
    "padding: '20rpx 44rpx calc(30rpx + env(safe-area-inset-bottom))'",
    "marginTop: '24rpx'",
    "width: '32rpx',\n            height: '32rpx',\n            borderRadius: '16rpx'",
    "width: '17rpx'",
    "height: '10rpx'",
    "borderLeft: '4rpx solid #FFFFFF'",
  ]) {
    assert.ok(coinsSource.includes(snippet), `千寻币首页缺少蓝湖结构证据: ${snippet}`)
  }
  const coinDarkMaskMatches = coinsSource.match(/background: 'rgba\(0, 0, 0, 0\.48\)'/g) ?? []
  assert.equal(
    coinDarkMaskMatches.length,
    1,
    '千寻币微信支付遮罩透明度应匹配 71-千寻币-微信支付.png 的约 0.32，只允许充值须知保留 0.48 遮罩',
  )

  const coinHookSource = fs.readFileSync(path.join(rootDir, 'src/hooks/useCoins.ts'), 'utf8')
  assert.ok(
    coinHookSource.includes('useState<CoinTransaction[]>(coinsDemo.transactions)'),
    '千寻币明细 mock 数据必须首屏即展示，避免蓝湖默认态截图先出现加载/空态',
  )

  const coinDetailSource = fs.readFileSync(path.join(rootDir, 'src/pages/coins/detail.tsx'), 'utf8')
  for (const snippet of [
    'transactionsLoading && filtered.length === 0',
    "isActive ? LANHU_BLUE : '#999999'",
    "item.amount > 0 ? LANHU_BLUE : '#F32B61'",
    "paddingTop: '262rpx'",
    "width: '298rpx'",
    "marginTop: '52rpx'",
    "width: '662rpx'",
    "height: '98rpx'",
    "borderRadius: '14rpx'",
  ]) {
    assert.ok(coinDetailSource.includes(snippet), `千寻币明细页缺少蓝湖结构证据: ${snippet}`)
  }
}

const data = readJson(dataPath)
const routeSet = readAppRoutes()

assertUiDesign('membership', REQUIRED_COMMERCE_DESIGNS.membership)
assertUiDesign('coins', REQUIRED_COMMERCE_DESIGNS.coins)
assertSourceEvidence()
assertReferenceImages()
assertNoLegacyCoinName()
assertNoNativePaySuccessToast()
assertMissingSlicesAreReported()
assertMembershipPlanRailMatchesLanhu()
assertMembershipSubscriptionPricing()
assertMembershipPaymentOverlaysMatchLanhu()
assertMembershipRecordPagesMatchLanhu()
assertCoinPagesMatchLanhu()

console.log('商业化蓝湖 UI 覆盖校验通过')
