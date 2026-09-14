const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

async function importSource(relativePath) {
  const sourcePath = path.join(root, relativePath)
  assert.ok(fs.existsSync(sourcePath), `缺少领域实现：${relativePath}`)
  const source = fs.readFileSync(sourcePath, 'utf8')
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
}

test('双端滑块范围换算、命中与交叉边界稳定', async () => {
  const { clampRangeValue, rangeValueFromPointer, selectRangeThumb } =
    await importSource('src/domain/dualRangeSlider.js')

  assert.equal(clampRangeValue(5, 18, 60, 1), 18)
  assert.equal(clampRangeValue(80, 18, 60, 1), 60)
  assert.equal(rangeValueFromPointer(50, 0, 100, 18, 60, 1), 39)
  assert.equal(selectRangeThumb(20, 20, 50), 'low')
  assert.equal(selectRangeThumb(49, 20, 50), 'high')
  assert.equal(selectRangeThumb(20, 20, 20), null, '重合端点上按下时应等待拖动方向')
  assert.equal(selectRangeThumb(21, 20, 20), 'high', '重合端点向右拖动必须展开上限')
  assert.equal(selectRangeThumb(19, 20, 20), 'low', '重合端点向左拖动必须展开下限')
})

test('理想型与推荐偏好复用真实双端滑块，不再叠放两个原生 Slider', () => {
  const ideal = read('src/pages/prd08/ideal/filter/index.tsx')
  const preference = read('src/pages/prd08/recommend/preference/index.tsx')
  const slider = read('src/components/DualRangeSlider.tsx')

  for (const source of [ideal, preference]) {
    assert.match(source, /<DualRangeSlider/, '范围页必须使用双端滑块组件')
    assert.doesNotMatch(source, /<Slider\b/, '范围页不得叠放原生 Slider 抢占触摸事件')
  }
  assert.match(slider, /catchMove=\{!disabled\}/, '禁用态不得拦截父级 ScrollView 的触摸滚动')
  assert.match(slider, /onTouchCancel=\{handleTouchCancel\}/, '触摸被系统中断后必须走独立取消处理')
  assert.match(
    slider,
    /const handleTouchCancel = \(\) => \{[\s\S]{0,220}pendingTouchRef\.current = null[\s\S]{0,120}activeThumbRef\.current = null/,
    '系统取消触摸时必须废弃待处理命中并清理活动端点'
  )
  assert.match(slider, /height:\s*'88rpx'/, '双端滑块触摸热区不足 44px')
  assert.match(slider, /aria-label=/, '自定义滑块缺少读屏可识别说明')
})

test('会员协议可阅读，待支付面板有显式关闭和遮罩关闭路径', () => {
  const membership = read('src/pages/membership/index.tsx')
  const heartMembership = read('src/pages/heart/membership-unlock.tsx')
  const agreementMigration = read('../deploy/sql/prod/087_vip_service_agreement.sql')

  assert.match(membership, /openMembershipAgreement/, '会员中心缺少协议打开动作')
  assert.match(heartMembership, /openMembershipAgreement/, '心动解锁会员页缺少协议打开动作')
  assert.match(membership, /<UnpaidBottomSheet[\s\S]{0,180}onClose=\{onClose\}/, '待支付面板未接入关闭回调')
  assert.match(membership, /id="membership-unpaid-close"/, '待支付面板缺少可见关闭按钮')
  assert.match(membership, /id="membership-payment-mask"[\s\S]{0,220}onClick=\{[^}]*onClose/, '待支付遮罩不能关闭')
  assert.match(agreementMigration, /vip_service_agreement/, '数据库迁移缺少会员服务协议内容')
})

test('关系页重新显示会刷新会员权益和关系数据', () => {
  const community = read('src/pages/community/index.tsx')
  assert.match(community, /useDidShow/, '关系页必须监听页面重新显示')
  assert.match(community, /refreshRelationFeedback/, '关系页缺少统一刷新动作')
  assert.match(community, /useDidShow\(\(\) =>[\s\S]{0,280}refreshRelationFeedback/, '返回关系页后没有刷新列表')
})

test('最近访客徽章按当日已查看快照计算增量', async () => {
  const { resolveVisitorBadge, acknowledgeVisitorCount } =
    await importSource('src/domain/relationVisitorBadge.js')

  assert.equal(resolveVisitorBadge(3, undefined, '2026-09-14'), 3)
  const snapshot = acknowledgeVisitorCount(3, '2026-09-14')
  assert.equal(resolveVisitorBadge(3, snapshot, '2026-09-14'), 0)
  assert.equal(resolveVisitorBadge(5, snapshot, '2026-09-14'), 2)
  assert.equal(resolveVisitorBadge(1, snapshot, '2026-09-15'), 1)
  assert.equal(resolveVisitorBadge(5, snapshot, '2026-09-14', 4), 4)

  const community = read('src/pages/community/index.tsx')
  assert.match(community, /pageData\.unreadCount/, '服务端返回未读数时必须优先使用服务端口径')
  assert.match(community, /markRecentViewersRead\(readCursor\)/, '访客列表展示后必须确认服务端已读')
})

test('社区点击本人头像进入本人预览，不请求自己的公开资料', async () => {
  const { resolveCommunityAuthorProfileRoute } =
    await importSource('src/domain/communityAuthorProfile.js')
  const family = read('src/features/qianxun/QianxunFamilyPage.tsx')
  const topic = read('src/pages/qianxun/topic.tsx')
  const profileEdit = read('src/pages/profile/edit.tsx')

  assert.equal(resolveCommunityAuthorProfileRoute(12, 12), '/pages/profile/edit?variant=preview')
  assert.equal(resolveCommunityAuthorProfileRoute(12, 19), '/pages/heart/user?targetUserId=12&sourceScene=profile')
  assert.match(family, /openCommunityAuthorProfile/, '主信息流缺少本人头像路由分流')
  assert.match(topic, /openCommunityAuthorProfile/, '话题信息流缺少本人头像路由分流')
  assert.match(profileEdit, /router\.params\.variant === 'preview'/, '资料编辑页不能从路由直接打开主页预览')
})

test('三重认证全部通过后有自动完成与可见兜底按钮', async () => {
  const { isTripleVerificationComplete } =
    await importSource('src/domain/verificationOnboardingFlow.ts')
  const center = read('src/pages/verification/components/VerificationCenterPage.tsx')

  assert.equal(isTripleVerificationComplete({ verifyLevel: 3 }), true)
  assert.equal(isTripleVerificationComplete({
    avatarVerifyStatus: 'APPROVED',
    realNameStatus: 'APPROVED',
    educationStatus: 'APPROVED',
  }), true)
  assert.equal(isTripleVerificationComplete({
    avatarVerifyStatus: 'APPROVED',
    realNameStatus: 'PENDING',
    educationStatus: 'APPROVED',
    verifyLevel: 3,
  }), false)
  assert.match(center, /isTripleVerificationComplete/, '认证中心缺少完成态判断')
  assert.match(center, /verification-complete-action/, '认证中心缺少完成按钮兜底')
  assert.match(center, /switchTab\(\{ url: '\/pages\/index\/index' \}\)/, '认证完成后没有进入首页')
})

test('回复悄悄话直接进入私信页，由私信页提交首条回复', () => {
  const detail = read('src/pages/message/whisper-detail.tsx')
  const chat = read('src/pages/message/private-chat.tsx')

  assert.match(detail, /replyWhisperInPrivateChat/, '悄悄话详情缺少私信回复路由')
  assert.doesNotMatch(detail, /record\.actions\.canReply[\s\S]{0,220}<WhisperComposer/, '点击回复仍会弹出第二个悄悄话编辑框')
  assert.match(chat, /pendingWhisperNo/, '私信页未承接待回复悄悄话')
  assert.match(chat, /replyWhisper/, '私信页首条回复没有调用回复接口')
  assert.match(detail, /useState\(directCompose\)/, '收到的 mock 悄悄话仍会误开旧申请编辑器')
  assert.match(chat, /createdConversationNo/, '回复成功后缺少独立的已创建会话状态')
  assert.match(chat, /enterCreatedConversation/, '回复成功后的会话跳转缺少独立重试动作')
  assert.match(chat, /回复已发送，请点击“进入私信”继续/, '跳转失败仍会误报为回复失败')
  assert.match(chat, /placeholder="输入回复内容"/, '首条回复输入框缺少可感知提示')
  assert.match(chat, /role="button"/, '首条回复发送动作缺少按钮语义')
})

test('不看作者后立即移除当前信息流，取消不看后刷新列表', () => {
  const family = read('src/features/qianxun/QianxunFamilyPage.tsx')
  assert.match(family, /removeAuthorPostsFromScene/, '不看作者后没有即时移除列表项')
  assert.match(family, /result\.hidden[\s\S]{0,260}loadScene\(activeTab\)/, '取消不看后没有重新加载服务端列表')
  assert.match(family, /onClick=\{event => \{ event\.stopPropagation\(\); onMore\(\) \}\}[\s\S]{0,180}width: '72rpx'/, '三点菜单热区不足或未阻止冒泡')
})

test('已实现的弹窗居中、微信分享图标和友好错误文案保持回归', () => {
  const actionSheet = read('src/components/CommunityPostActionSheet.tsx')
  const actionStyle = read('src/components/CommunityPostActionSheet.scss')
  const communityCopy = read('src/domain/communityCopy.ts')

  assert.match(actionSheet, /src=\{miniappOssIcons\.loginMethodWechat\}/, '微信分享图标缺失')
  assert.match(actionStyle, /justify-content:\s*center/, '操作项未居中')
  assert.doesNotMatch(communityCopy, /return\s+key\b/, '不得把内部文案 key 原样展示给用户')
})

test('推荐真实无匹配时说明筛选原因并提供调整与重试入口', () => {
  const recommend = read('src/pages/recommend/index.tsx')
  const preference = read('src/pages/prd08/recommend/preference/index.tsx')
  assert.match(recommend, /当前偏好下暂无匹配/, '推荐空态没有说明当前筛选条件无匹配')
  assert.match(recommend, /调整偏好/, '推荐空态缺少放宽筛选入口')
  assert.match(recommend, /重新加载/, '推荐空态缺少即时重试入口')
  assert.match(preference, /setStorageSync\(RECOMMEND_PREFERENCE_REFRESH_STORAGE_KEY/, '保存偏好后没有留下候选刷新信号')
  assert.match(recommend, /getStorageSync\(RECOMMEND_PREFERENCE_REFRESH_STORAGE_KEY\)/, '推荐页恢复显示时没有读取偏好刷新信号')
  assert.match(recommend, /removeStorageSync\(RECOMMEND_PREFERENCE_REFRESH_STORAGE_KEY\)/, '偏好刷新信号消费后没有清理')
  assert.match(recommend, /height:\s*'88rpx'/, '推荐空态按钮触摸高度不足 44px')
  assert.match(recommend, /aria-label="调整推荐偏好"/, '推荐空态调整入口缺少无障碍说明')
})
