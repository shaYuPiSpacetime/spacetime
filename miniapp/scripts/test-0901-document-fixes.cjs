/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

function loadTypeScriptModule(relativePath) {
  const source = read(relativePath)
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText
  const loaded = { exports: {} }
  Function('module', 'exports', 'require', output)(loaded, loaded.exports, require)
  return loaded.exports
}

function functionSource(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start + startMarker.length)
  assert.ok(start >= 0, `缺少函数：${startMarker}`)
  assert.ok(end > start, `无法确定函数结束位置：${startMarker}`)
  return source.slice(start, end)
}

test('动态作者职业显示中文，话题胶囊按文字宽度自适应', () => {
  const family = read('src/features/qianxun/QianxunFamilyPage.tsx')
  const zhiyin = read('src/features/qianxun/QianxunZhiyinTab.tsx')
  const topic = read('src/pages/qianxun/topic.tsx')

  assert.match(family, /optionLabel\('occupation',\s*post\.authorProfession\)/, '成家动态必须把职业字典 code 转成中文')
  assert.match(zhiyin, /optionLabel\('occupation',\s*post\.authorProfession\)/, '知音动态必须把职业字典 code 转成中文')
  assert.match(topic, /optionLabel\('occupation',\s*post\.authorProfession\)/, '话题动态必须把职业字典 code 转成中文')

  const card = functionSource(family, 'function CommunityCard', 'function formatPostAuthorMeta')
  assert.match(card, /display:\s*'inline-flex'/, '话题容器必须使用内容宽度布局')
  assert.doesNotMatch(card, /width:\s*'auto'/, '块级 width:auto 会把短话题撑满整行')
})

test('长动态保持 28rpx/48rpx 排版，查看全部直接进入详情', () => {
  const targets = [
    {
      name: '成家动态',
      source: read('src/features/qianxun/QianxunFamilyPage.tsx'),
      start: 'function CommunityCard',
      end: 'function formatPostAuthorMeta',
    },
    {
      name: '知音动态',
      source: read('src/features/qianxun/QianxunZhiyinTab.tsx'),
      start: 'function SincereCard',
      end: 'function PostImages',
    },
  ]

  for (const target of targets) {
    const card = functionSource(target.source, target.start, target.end)
    assert.match(card, /fontSize:\s*'28rpx',\s*lineHeight:\s*'48rpx'/, `${target.name}正文排版不符合文档`)
    assert.match(card, />查看全部<\/Text>/, `${target.name}缺少查看全部入口`)
    assert.match(card, /event\.stopPropagation\(\);\s*onOpen\(\)/, `${target.name}查看全部必须直接进入详情`)
    assert.doesNotMatch(card, /setExpanded/, `${target.name}不得在当前页展开全文`)
  }
})

test('我的动态平铺多图并在点赞后刷新图标和数字', () => {
  const source = read('src/pages/qianxun/interactions.tsx')
  const standalone = read('src/pages/qianxun/my-posts.tsx')

  assert.match(source, /toggleCommunityLike,/, '我的动态必须接入真实点赞接口')
  assert.match(source, /liked:\s*boolean/, '我的动态快照必须保留本人点赞状态')
  assert.match(source, /toggleCommunityLike\(item\.postId\)/, '点击点赞必须提交对应动态 ID')
  assert.match(source, /liked:\s*result\.liked,\s*likeCount:\s*result\.likeCount/, '点赞成功后必须同步刷新状态和数字')
  assert.match(source, /<MyPostImages images=\{item\.imageUrls\}/, '我的动态必须把全部图片交给平铺组件')
  assert.match(source, /images(?:\.filter\(Boolean\))?\.slice\(0,\s*9\)/, '平铺组件必须支持最多九张图片')
  assert.doesNotMatch(source, /item\.imageUrls\[0\]/, '我的动态不得只渲染第一张图片')
  assert.match(source, /active=\{item\.liked\}/, '点赞图标必须反映接口返回状态')

  assert.match(standalone, /toggleCommunityLike,/, '从“我的”进入的独立页面也必须接入点赞接口')
  assert.match(standalone, /liked:\s*boolean/, '独立页面必须保留点赞状态')
  assert.match(standalone, /toggleCommunityLike\(receipt\.postId\)/, '独立页面必须提交对应动态 ID')
  assert.match(standalone, /active=\{receipt\.liked\}/, '独立页面点赞图标必须反映接口状态')
  assert.equal((standalone.match(/<PostImages urls=\{receipt\.imageUrls\}/g) || []).length, 1, '独立页面每条动态只能渲染一组图片')
})

test('本人动态菜单只保留带蓝湖微信图标的微信分享和取消', () => {
  const componentPath = 'src/components/CommunityPostActionSheet.tsx'
  assert.equal(fs.existsSync(path.join(root, componentPath)), true, '缺少统一的动态操作弹窗')
  const component = read(componentPath)

  assert.match(component, /const moderationActions = isSelf \? \[\] :/, '本人动态不得生成关注、不看和举报操作')
  assert.match(component, /openType="share"/, '微信分享必须使用小程序原生分享按钮')
  assert.match(component, /miniappOssIcons\.loginMethodWechat/, '微信分享必须使用蓝湖切图对应的 OSS 图标')
  assert.match(component, />微信分享<\/Text>/, '分享文案必须为“微信分享”')
  assert.match(component, />取消<\/Text>/, '弹窗必须保留取消入口')

  const consumers = [
    'src/features/qianxun/QianxunFamilyPage.tsx',
    'src/features/qianxun/QianxunZhiyinTab.tsx',
    'src/pages/qianxun/post-detail.tsx',
    'src/pages/qianxun/topic.tsx',
  ]
  for (const consumer of consumers) {
    const source = read(consumer)
    assert.match(source, /CommunityPostActionSheet/, `${consumer} 必须复用本人动态操作弹窗`)
    assert.match(source, /isSelf=/, `${consumer} 必须按作者身份裁剪操作项`)
  }
})

test('自我介绍命中内容审核时统一展示指定中文提示并停留当前页', () => {
  const verification = read('src/pages/verification/intro.tsx')
  const profileEdit = read('src/pages/profile-edit/intro.tsx')
  const domainPath = 'src/domain/introductionAuditFeedback.ts'

  assert.equal(fs.existsSync(path.join(root, domainPath)), true, '缺少审核提示归一化规则')
  const { resolveIntroductionRejectedMessage } = loadTypeScriptModule(domainPath)
  assert.equal(resolveIntroductionRejectedMessage('provider sensitive result'), '检测到敏感内容，请修改后重新提交')

  for (const [name, source] of [['认证页', verification], ['资料编辑页', profileEdit]]) {
    assert.match(source, /auditResult\.auditStatus\s*===\s*'REJECTED'/, `${name}必须处理同步驳回结果`)
    assert.match(source, /resolveIntroductionRejectedMessage\(auditResult\.rejectReason\)/, `${name}必须使用统一中文提示`)
    const rejectedBranch = source.slice(source.indexOf("auditResult.auditStatus === 'REJECTED'"))
    assert.match(rejectedBranch, /Taro\.showToast/, `${name}必须展示审核提示`)
    assert.match(rejectedBranch, /return/, `${name}被驳回后必须停留当前页`)
  }
})

test('支付能力受限时保留原生错误语义并展示可理解的中文反馈', () => {
  const domainPath = 'src/domain/paymentFailureFeedback.ts'
  assert.equal(fs.existsSync(path.join(root, domainPath)), true, '缺少微信支付失败归一化规则')
  const { resolvePaymentFailureFeedback } = loadTypeScriptModule(domainPath)

  assert.deepEqual(
    resolvePaymentFailureFeedback({ errMsg: 'requestPayment:fail 小程序支付支付能力已被限制' }),
    {
      cancelled: false,
      capabilityRestricted: true,
      message: '当前小程序支付能力受限，请联系客服处理',
    },
  )
  assert.equal(resolvePaymentFailureFeedback({ errMsg: 'requestPayment:fail cancel' }).cancelled, true)
  assert.equal(resolvePaymentFailureFeedback({}).message, '支付失败，请稍后重试')

  const membershipHook = read('src/hooks/useMembership.ts')
  const coinHook = read('src/hooks/useCoins.ts')
  const membershipPage = read('src/pages/membership/index.tsx')
  const coinPage = read('src/pages/coins/index.tsx')
  for (const [name, source] of [['会员支付', membershipHook], ['千寻币支付', coinHook]]) {
    assert.match(source, /resolvePaymentFailureFeedback\(error\)/, `${name}必须解析微信原生失败信息`)
    assert.match(source, /paymentErrorMessage/, `${name}必须把失败原因交给页面展示`)
  }
  assert.match(membershipPage, /failureMessage=\{paymentErrorMessage\}/, '会员页必须展示具体失败原因')
  assert.match(coinPage, /failureMessage=\{paymentErrorMessage\}/, '千寻币页必须展示具体失败原因')
})

test('文档中已有实现的心动、会员和 MBTI 图标规则保持不回退', () => {
  const heartHeader = read('src/components/HeartMessageHeader.tsx')
  const profile = read('src/pages/profile/index.tsx')
  const { toggleProfileTagSelection } = loadTypeScriptModule('src/domain/profileTagSelection.ts')

  assert.match(heartHeader, /miniappOssIcons\.heartMutualLikes/, '对我心动页必须使用文档指定图标')
  assert.match(profile, /function VipBannerMark\(\)/, '我的页面会员入口必须保留菱形勾选图标')
  assert.deepEqual(
    toggleProfileTagSelection(['INTJ', '运动'], 'ENFP', 'MBTI', ['INTJ', 'ENFP'], 16).codes,
    ['运动', 'ENFP'],
    'MBTI 必须保持互斥单选',
  )
})
