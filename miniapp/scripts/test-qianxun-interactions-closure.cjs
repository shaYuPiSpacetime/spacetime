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

test('互动记录按真实互动日期稳定分组并显示蓝湖日期文本', () => {
  const domainPath = 'src/domain/qianxunInteractionPresentation.ts'
  assert.ok(fs.existsSync(path.join(root, domainPath)), '缺少千寻互动日期展示领域模型')

  const {
    formatInteractionCardDate,
    formatInteractionGroupDate,
    groupCommunityInteractions,
    shouldDisplayMyCommunityPost,
  } = loadTypeScriptModule(domainPath)

  const records = [
    { id: '1', interactionTime: '2026-07-15 18:20:00' },
    { id: '2', interactionTime: '2026-07-15T08:00:00' },
    { id: '3', interactionTime: '2026-07-14 23:59:00' },
    { id: '4' },
  ]
  const groups = groupCommunityInteractions(records)

  assert.deepEqual(groups.map(group => group.label), ['2026年07月15日', '2026年07月14日', '日期未知'])
  assert.deepEqual(groups[0].items.map(item => item.id), ['1', '2'])
  assert.equal(formatInteractionGroupDate('2026-07-05 12:00:00'), '2026年07月05日')
  assert.equal(formatInteractionCardDate('2026-07-05 12:00:00'), '07-05')
  assert.equal(formatInteractionCardDate(''), '')
  assert.equal(shouldDisplayMyCommunityPost('published'), true)
  assert.equal(shouldDisplayMyCommunityPost('pending_manual'), true)
  assert.equal(shouldDisplayMyCommunityPost('deleted'), false)
  assert.equal(shouldDisplayMyCommunityPost('BLOCKED'), false)
})

test('互动页消费真实 viewed 互动接口并保留关联动态和互动时间', () => {
  const source = read('src/pages/qianxun/interactions.tsx')
  const communityService = read('src/services/community.ts')

  assert.match(source, /getCommunityInteractions\('viewed',\s*1,\s*50\)/, '浏览记录必须读取包含 viewedAt 的真实互动接口')
  assert.doesNotMatch(source, /getCommunityViewHistory/, '互动页禁止继续使用缺少浏览时间的旧列表接口')
  assert.match(source, /interactionTime:\s*item\.interactionTime/, '互动映射必须保留服务端 interactionTime')
  assert.match(source, /post:\s*item\.post/, '互动映射必须保留服务端关联动态')
  assert.match(source, /groupCommunityInteractions\(/, '浏览记录和动态互动必须按真实日期分组')
  assert.match(source, /data-section-panel="history"/, '浏览记录面板必须继续保持挂载')
  assert.match(source, /toggleCommunityFollow\(user\.userId\)/, '关注接口必须提交数字用户 ID')
  assert.doesNotMatch(source, /toggleCommunityFollow\(user\.userNo\s*\|\|\s*user\.userId\)/, '展示编号 userNo 禁止作为关注接口路径参数')
  assert.match(communityService, /toggleCommunityFollow\s*=\s*\(targetUserId:\s*number\)/, '关注接口类型必须限制为数字用户 ID')
})

test('我的动态审核与失败状态按蓝湖统一展示并通过弹窗反馈原因', () => {
  const communityService = read('src/services/community.ts')
  const interactions = read('src/pages/qianxun/interactions.tsx')
  const myPosts = read('src/pages/qianxun/my-posts.tsx')
  const statusBadge = read('src/components/QianxunPostStatusBadge.tsx')

  assert.match(
    communityService,
    /if \(status === 'pending_manual'\) return '审核中'[\s\S]*if \(status === 'rejected'\) return '发布失败'[\s\S]*const serverLabel/,
    'pending_manual 必须优先覆盖服务端“待人工复核”文案',
  )
  assert.doesNotMatch(communityService, /return '待审核'/, '前端不得继续展示旧文案“待审核”')
  assert.match(interactions, /<QianxunPostStatusBadge config=\{config\} status=\{item\.status\}/, '互动内我的动态必须使用统一状态标签')
  assert.match(myPosts, /<QianxunPostStatusBadge config=\{config\} status=\{receipt\.status\}/, '独立我的动态必须使用统一状态标签')
  assert.match(statusBadge, /width: '88rpx'/, '审核与失败标签宽度必须按蓝湖画板还原')
  assert.match(statusBadge, /height: '48rpx'/, '审核与失败标签高度必须按蓝湖画板还原')
  assert.match(statusBadge, /background: rejected \? '#EF0000' : '#F8F9FB'/, '审核与失败标签底色必须按蓝湖画板还原')
  assert.match(statusBadge, /color: rejected \? '#FFFFFF' : '#2876FF'/, '待审标签文字颜色必须按蓝湖画板还原')
  assert.match(statusBadge, /fontSize: '20rpx'/, '状态标签字号必须按蓝湖画板还原')
  assert.match(statusBadge, /event\.stopPropagation\(\)/, '点击发布失败必须阻止卡片点击冒泡')
  assert.match(interactions, /data-role="qianxun-my-post-date"[\s\S]*data-role="qianxun-my-post-status-slot" style=\{\{ marginTop: '20rpx' \}\}/, '互动内状态标签必须位于日期下方 10px')
  assert.match(myPosts, /data-role="qianxun-my-post-date"[\s\S]*data-role="qianxun-my-post-status-slot" style=\{\{ marginTop: '20rpx' \}\}/, '独立我的动态状态标签必须位于日期下方 10px')
  assert.match(interactions, /data-role="qianxun-my-post-content-column"[\s\S]*data-role="qianxun-my-post-more"[\s\S]*<View style=\{\{ flex: 1 \}\} \/>/, '互动内三个点必须从正文左边缘开始，弹性占位只能放在其后')
  assert.match(myPosts, /data-role="qianxun-my-post-content-column"[\s\S]*data-role="qianxun-my-post-more"[\s\S]*<View style=\{\{ flex: 1 \}\} \/>/, '独立我的动态三个点必须从正文左边缘开始')
  const failureDialog = read('src/components/QianxunPublishFailureDialog.tsx')
  assert.match(failureDialog, /width: '620rpx'[\s\S]*height: '538rpx'/, '发布失败弹窗尺寸必须按蓝湖画板还原')
  assert.match(failureDialog, /id="qianxun-publish-failure-reason"/, '发布失败弹窗必须展示服务端失败原因')
  assert.match(failureDialog, /miniappOssIcons\.qianxunPublishFailure/, '发布失败弹窗必须使用蓝湖书本失败插画')
  assert.doesNotMatch(failureDialog, /qianxunEmptyChart/, '发布失败弹窗禁止复用饼图空态素材')
  assert.match(interactions, /onFailure=\{setFailurePost\}/, '互动内我的动态必须能打开发布失败弹窗')
  assert.match(interactions, /<QianxunPublishFailureDialog[^>]*failureMessage=\{failurePost\?\.failureMessage\}/, '互动页必须使用共享失败弹窗')
  assert.match(myPosts, /<QianxunPublishFailureDialog[^>]*failureMessage=\{failureReceipt\?\.failureMessage\}/, '独立我的动态页必须使用共享失败弹窗')
  assert.doesNotMatch(interactions, /item\.status === 'rejected' && item\.failureMessage/, '互动内我的动态不得内联展示大段失败原因')
  assert.doesNotMatch(myPosts, /receipt\.status === 'rejected' && receipt\.failureMessage/, '独立我的动态不得内联展示大段失败原因')
  assert.match(
    interactions,
    /showToast\(\{ title: resolveCommunityStatusLabel\(config, item\.status, item\.statusName\)/,
    '点击审核中动态后的提示也必须使用统一状态文案',
  )
})

test('千寻互动五类视图头像均进入用户主页且不误触卡片详情', () => {
  const source = read('src/pages/qianxun/interactions.tsx')
  const myPosts = read('src/pages/qianxun/my-posts.tsx')

  assert.match(source, /<InteractionPostGroups groups=\{visiblePostGroups\} scope="interaction"/, '评论过和点赞过必须复用支持头像跳转的互动动态卡片')
  assert.match(source, /<InteractionPostGroups groups=\{historyGroups\} scope="history"/, '浏览记录必须复用支持头像跳转的互动动态卡片')
  assert.match(source, /data-role="qianxun-interaction-author-avatar"[^\n]*openInteractionUserProfile\(post\.authorId, event\)/, '评论过、点赞过和浏览记录的作者头像必须绑定主页导航')
  assert.match(source, /data-role="qianxun-interaction-unlocked-avatar"[^\n]*openInteractionUserProfile\(item\.userId, event\)/, '解锁过的用户头像必须绑定主页导航')
  assert.match(source, /data-role="qianxun-interaction-own-avatar"[^\n]*openInteractionUserProfile\(useAuthStore\.getState\(\)\.userId\)/, '我的动态顶部本人头像必须绑定主页导航')
  assert.match(myPosts, /data-role="qianxun-my-posts-own-avatar"[^>]*onClick=\{openOwnProfile\}/, '独立我的动态页本人头像必须绑定主页导航')
  assert.match(
    source,
    /function openInteractionUserProfile[^]*?event\?\.stopPropagation\(\)[^]*?openCommunityAuthorProfile\(targetUserId, useAuthStore\.getState\(\)\.userId, Taro\.navigateTo\)/,
    '头像点击必须阻止卡片事件冒泡，并按作者身份打开本人预览或他人主页',
  )
})

test('千寻动态卡统一使用 OSS 性别评论点赞图标', () => {
  const sources = [
    'src/pages/qianxun/interactions.tsx',
    'src/pages/qianxun/my-posts.tsx',
    'src/pages/qianxun/post-detail.tsx',
    'src/pages/qianxun/topic.tsx',
    'src/features/qianxun/QianxunZhiyinTab.tsx',
  ].map(relativePath => [relativePath, read(relativePath)])

  for (const [relativePath, source] of sources) {
    assert.doesNotMatch(source, /[◯♡♥♀♂]/, `${relativePath} 禁止继续使用字体字符冒充性别、评论或点赞图标`)
  }

  const shared = read('src/components/QianxunCommunityIcons.tsx')
  for (const icon of ['qianxunGenderFemale', 'qianxunGenderMale', 'qianxunComment', 'qianxunLike', 'qianxunLikeActive']) {
    assert.match(shared, new RegExp(`miniappOssIcons\\.${icon}`), `共享组件缺少 ${icon} OSS 图标`)
  }
  assert.match(shared, /gender === 'female'|normalized === 'female'/, '女性图标必须按真实字段映射')
  assert.match(shared, /gender === 'male'|normalized === 'male'/, '男性图标必须按真实字段映射')
  assert.match(shared, /return null/, '未知性别必须不渲染，禁止默认男性')
})

test('互动首页关键纵向基线与单一导航符合蓝湖稿', () => {
  const source = read('src/pages/qianxun/interactions.tsx')

  assert.equal((source.match(/<SimpleHeader title="千寻互动"/g) || []).length, 1, '千寻互动只能有一个返回导航，禁止双箭头')
  assert.match(source, /top:\s*'430rpx'/, '白色主面板顶部必须回到蓝湖 430rpx 基线')
  assert.match(source, /top:\s*'226rpx'/, '用户资料行顶部必须回到蓝湖 226rpx 基线')
  assert.match(source, /top:\s*'356rpx'/, '统计行顶部必须回到蓝湖 356rpx 基线')
  assert.doesNotMatch(source, />\s*清空\s*</, '浏览记录禁止用额外清空行破坏上下间距')
})

test('千寻互动共享字号和筛选色值符合点赞暂无数据蓝湖基线', () => {
  const source = read('src/pages/qianxun/interactions.tsx')
  const typography = read('src/constants/qianxunTypography.ts')

  assert.match(source, /fontSize:\s*'32rpx'.*profile\.nickname/, '资料姓名必须使用蓝湖 32rpx 字号')
  assert.match(source, /fontSize:\s*'24rpx'.*profile\.description/, '资料简介必须使用蓝湖 24rpx 字号')
  assert.match(source, /fontSize:\s*'24rpx',\s*lineHeight:\s*'34rpx'.*item\.label/, '资料统计标签必须使用蓝湖 24rpx 字号')
  assert.match(source, /fontSize:\s*'38rpx',\s*lineHeight:\s*'48rpx'.*item\.value/, '资料统计数字必须使用确认后的 38rpx 字号')
  assert.match(source, /background:\s*selected \? BLUE : '#F8F9FB'/, '未选筛选胶囊必须使用蓝湖 #F8F9FB')
  assert.match(source, /fontSize:\s*'26rpx',\s*lineHeight:\s*'36rpx'.*item\.label/, '筛选胶囊必须使用蓝湖 26rpx 字号')
  assert.match(source, /fontSize:\s*'28rpx',\s*lineHeight:\s*'40rpx'.*model\.subtitle/, '空态说明必须使用蓝湖 28rpx 字号')
  assert.match(source, /fontSize:\s*'32rpx',\s*lineHeight:\s*'44rpx'.*>去千寻同城看看</, '空态主按钮必须使用蓝湖 32rpx 字号')
  assert.match(
    source,
    /qianxun-interaction-date-group[^\n]*color: '#333333', fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 600/,
    '互动和浏览记录的日期分组必须统一为 28rpx 加粗深色文字',
  )
  assert.match(typography, /QIANXUN_BODY_FONT_SIZE = '28rpx'/, '千寻互动正文必须统一为 28rpx')
  assert.match(typography, /QIANXUN_BODY_LINE_HEIGHT = '54rpx'/, '千寻互动正文行高必须统一为 54rpx')
  assert.match(source, /fontSize: QIANXUN_BODY_FONT_SIZE, lineHeight: QIANXUN_BODY_LINE_HEIGHT/, '互动、浏览记录和我的动态必须消费统一正文排版')
  assert.match(source, /<InteractionPostExcerpt[\s\S]{0,180}content=\{item\.content\}/, '我的动态必须复用统一正文组件')
  assert.match(source, /<InteractionPostExcerpt content=\{post\.content\}/, '互动和浏览记录必须复用统一正文组件')
  assert.match(typography, /QIANXUN_BODY_PREVIEW_LINES = 4/, '千寻互动正文最多展示四行')
  assert.match(source, /rect\.height > maxHeightPx \+ 1/, '查看全部必须以真实渲染高度判断，不得仅按字数猜测')
  assert.match(source, /WebkitLineClamp: QIANXUN_BODY_PREVIEW_LINES/, '超长正文必须应用四行截断')
  assert.match(source, />查看全部<\/Text>/, '超长正文必须显示查看全部入口')
  assert.match(source, /event\.stopPropagation\(\)[\s\S]{0,120}post-detail\?id=\$\{postId\}/, '查看全部必须阻止卡片冒泡并进入动态详情')
})

test('千寻互动所有动态正文入口必须复用 28rpx/54rpx 排版 token', () => {
  const sources = [
    ['推荐信息流', 'src/features/qianxun/QianxunFamilyPage.tsx', /qianxun-family-body/],
    ['知音信息流', 'src/features/qianxun/QianxunZhiyinTab.tsx', /qianxun-zhiyin-body/],
    ['互动与浏览记录', 'src/pages/qianxun/interactions.tsx', /qianxun-interaction-body/],
    ['独立我的动态', 'src/pages/qianxun/my-posts.tsx', /qianxun-my-posts-body/],
    ['动态详情', 'src/pages/qianxun/post-detail.tsx', /qianxun-detail-body/],
    ['话题动态', 'src/pages/qianxun/topic.tsx', /qianxun-topic-body/],
    ['发布动态', 'src/pages/qianxun/compose.tsx', /qianxun-compose-body/],
  ]

  for (const [label, relativePath, rolePattern] of sources) {
    const source = read(relativePath)
    assert.match(source, /QIANXUN_BODY_FONT_SIZE/, `${label}缺少统一正文字号 token`)
    assert.match(source, /QIANXUN_BODY_LINE_HEIGHT/, `${label}缺少统一正文行高 token`)
    assert.match(source, rolePattern, `${label}缺少正文运行态验收标识`)
  }

  assert.match(read('src/features/qianxun/QianxunFamilyPage.tsx'), /maxHeight: canExpand \? QIANXUN_BODY_PREVIEW_MAX_HEIGHT/, '推荐信息流四行截断高度必须随 54rpx 行高同步')
  assert.match(read('src/features/qianxun/QianxunZhiyinTab.tsx'), /maxHeight: canExpand \? QIANXUN_BODY_PREVIEW_MAX_HEIGHT/, '知音信息流四行截断高度必须随 54rpx 行高同步')
  assert.match(read('src/pages/qianxun/interactions.tsx'), /maxHeight: QIANXUN_BODY_PREVIEW_MAX_HEIGHT/, '互动页四行截断高度必须随 54rpx 行高同步')
  assert.match(read('src/pages/qianxun/compose.tsx'), /placeholderStyle="color:#999999;font-size:28rpx;line-height:54rpx"/, '发布页正文占位样式必须与输入正文一致')
})

test('驳回动态编辑必须带入原图文并重新提交审核', () => {
  const interactions = read('src/pages/qianxun/interactions.tsx')
  const myPosts = read('src/pages/qianxun/my-posts.tsx')
  const compose = read('src/pages/qianxun/compose.tsx')
  const communityService = read('src/services/community.ts')

  assert.match(interactions, /deleteCommunityPost/, '主入口“我的动态”必须接入删除接口')
  assert.match(interactions, /editPostId=/, '主入口的驳回动态编辑必须携带帖子标识')
  assert.match(myPosts, /editPostId=/, '独立“我的动态”页的驳回动态编辑必须携带帖子标识')
  assert.match(compose, /getCommunityPostDetail\(/, '编辑页必须读取原动态详情')
  assert.match(compose, /setContent\(.*\.content/, '编辑页必须回填原正文')
  assert.match(compose, /setImages\(/, '编辑页必须回填原图片')
  assert.match(compose, /resubmitCommunityPost\(/, '编辑完成必须调用重新审核接口')
  assert.match(compose, /重新提交审核/, '编辑页必须明确告知用户会重新提交审核')
  assert.match(communityService, /put<CommunityPublishResultVO>\(`\/miniapp\/community\/posts\/\$\{postId\}`/, '重新提交接口必须使用 PUT 更新语义')
})

test('同城动态支持上拉分页且本人动态可删除', () => {
  const family = read('src/features/qianxun/QianxunFamilyPage.tsx')
  const actionSheet = read('src/components/CommunityPostActionSheet.tsx')

  assert.match(family, /onScrollToLower=/, '同城动态必须监听滚动到底部')
  assert.match(family, /getCommunityPosts\(targetScene,\s*nextPage/, '加载更多必须请求下一页')
  assert.match(family, /deleteCommunityPost\(/, '首页本人动态必须接入删除接口')
  assert.match(family, /resetFeedPagination\(\)[\s\S]{0,400}loadScene\(activeTab\)/, '本地删除成功后必须重置并刷新 offset 分页，避免跳过动态')
  assert.match(family, /onDelete=/, '首页本人动态操作面板必须暴露删除动作')
  assert.match(actionSheet, /onDelete\?/, '共享动态操作面板必须支持可选删除动作')
  assert.match(actionSheet, /label:\s*['"]删除['"]/, '本人动态操作面板必须展示删除文案')
})
