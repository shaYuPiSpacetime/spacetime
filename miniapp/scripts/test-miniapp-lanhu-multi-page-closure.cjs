const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const community = read('src/pages/community/index.tsx')
const verification = read('src/features/verification/VerificationEntryView.tsx')
const recommend = read('src/pages/recommend/index.tsx')
const idealResults = read('src/pages/prd08/ideal/results/index.tsx')
const tabBar = read('src/components/AppTabBar/index.tsx')
const profileEdit = read('src/pages/profile/edit.tsx')
const profilePreview = read('src/pages/profile/components/ProfilePreviewPage.tsx')
const profileTagChip = read('src/components/ProfileTagChip.tsx')
const postDetail = read('src/pages/qianxun/post-detail.tsx')
const messageService = read('src/services/message.ts')
const prd08Runtime = read('scripts/verify-prd08-recommend-ideal-runtime.cjs')

assert(
  /activeTab === 'likes'[\s\S]{0,260}likesRecords\.length/.test(community),
  '对我心动会员入口必须要求当前列表存在真实记录',
)
assert(
  /state === 'empty'[\s\S]{0,180}illustration=\{miniappOssIcons\.qianxunEmptyFollowing\}/.test(community),
  '对我心动空态必须与同城空态复用同一人物插画',
)
assert(
  /paddingTop:\s*state === 'empty' \? '128rpx' : '0'/.test(community) &&
    /justifyContent:\s*state === 'empty' \? 'flex-start' : 'center'/.test(community),
  '对我心动空态必须保留 128rpx 顶部留白，不能继续垂直居中',
)
assert(
  verification.includes('id="verification-entry-actions"') &&
    !/id="verification-entry-actions"[\s\S]{0,240}position:\s*'absolute'/.test(verification),
  '未认证页主操作区必须位于稳定文档流，不能绝对定位到页面顶部',
)

assert(
  recommend.includes('getCapsuleLeftActionsLayout') && recommend.includes('metrics.menuLeft'),
  '推荐与理想型顶部按钮必须根据微信胶囊左边界计算',
)
assert(
  !/left:\s*'(470|520|535)rpx'/.test(recommend),
  '推荐与理想型顶部按钮不能使用会被胶囊遮挡的固定横坐标',
)
assert(
  idealResults.includes('id="ideal-results-empty-state"') &&
    idealResults.includes('miniappOssIcons.qianxunEmptyFollowing') &&
    idealResults.includes('id="ideal-results-empty-filter"'),
  '理想型结果空态必须按第024画板展示插画和浮动筛选按钮',
)
assert(
  prd08Runtime.includes("idealResults: 'ready'") &&
    prd08Runtime.includes("state.idealResults = 'empty'") &&
    prd08Runtime.includes('024-理想型条件选择后暂无数据.png'),
  '理想型条件选择后暂无数据必须纳入微信运行截图闭环',
)
assert(
  !tabBar.includes('boxShadow'),
  '底部导航整体不得保留发光阴影',
)

assert(
  /id="profile-edit-avatar"[\s\S]{0,220}mode="aspectFill"/.test(profileEdit),
  '编辑资料圆头像必须使用 aspectFill',
)
assert(
  /id="profile-preview-avatar"[\s\S]{0,220}mode="aspectFill"/.test(profilePreview),
  '主页预览圆头像必须使用 aspectFill',
)
assert(
  !profileEdit.includes('97年丨杭州丨双鱼座'),
  '编辑资料头像右侧只能回显昵称，不得显示硬编码资料',
)
assert(
  profileEdit.includes('id="profile-dating-goal-value"') &&
    profileEdit.includes('id="profile-dating-goal-empty"'),
  '脱单目标必须区分已填写灰色箭头态和未填写蓝色加号态',
)
assert(
  profilePreview.includes("minHeight: '182rpx'") && !profilePreview.includes("height: '182rpx'"),
  '主页预览标签卡片必须由内容撑高，不能固定高度裁切',
)
assert(
  profileTagChip.includes("width: 'fit-content'") && profileTagChip.includes("boxSizing: 'border-box'"),
  '主页预览标签背景必须随文本和内边距自然撑开',
)
assert(
  profileEdit.includes('ABOUT_ROW_GAP_RPX') && profileEdit.includes('ABOUT_LINE_HEIGHT_RPX'),
  '关于我必须使用明确的蓝湖行距与组间距 Token',
)
assert(
  /<ProfileSection[\s\S]{0,100}title="我的标签"[\s\S]{0,100}action="编辑"/.test(profileEdit),
  '我的标签必须在右上角始终展示编辑入口，空态同时保留蓝湖添加框',
)
assert(
  /data-role="about-detail-list"[\s\S]{0,180}marginTop:\s*'28rpx'/.test(profileEdit),
  '关于我标题与第一项见面偏好之间必须保留 28rpx 垂直距离',
)

assert(
  postDetail.includes('WhisperComposeSheet') &&
    postDetail.includes('precheckWhisper') &&
    postDetail.includes('createWhisper') &&
    postDetail.includes('id="qianxun-post-apply-whisper"'),
  '动态详情申请认识必须打开真实悄悄话弹层并调用预检查和创建接口',
)
assert(
  messageService.includes("'/miniapp/message/whispers/precheck'") &&
    messageService.includes("'/miniapp/message/whispers'"),
  '真实消息服务必须接入悄悄话预检查与创建接口',
)
assert(
  !/costCoins:\s*100/.test(postDetail),
  '动态详情悄悄话费用不得在客户端写死',
)
assert(
  prd08Runtime.includes("onlyWhisper") &&
    prd08Runtime.includes('025-动态详情-申请认识悄悄话.png'),
  '申请认识悄悄话弹层必须纳入微信运行截图闭环',
)

console.log('miniapp Lanhu multi-page closure tests passed')
