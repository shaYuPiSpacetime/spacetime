const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

const compose = read('src/pages/qianxun/compose.tsx')
const family = read('src/features/qianxun/QianxunFamilyPage.tsx')
const preview = read('src/pages/profile/components/ProfilePreviewPage.tsx')
const visibility = read('src/domain/profilePreviewVisibility.ts')
const edit = read('src/pages/profile/edit.tsx')
const basicInfo = read('src/pages/verification/components/BasicInfoCard.tsx')
const profile = read('src/pages/profile/index.tsx')
const workflow = read('../.github/workflows/deploy-backend-prod.yml')

assert.match(compose, /const MAX_COMMUNITY_IMAGES = 9/, '发布动态必须以产品上限 9 张为客户端安全边界')
assert.match(compose, /Math\.min\(MAX_COMMUNITY_IMAGES/, '服务端图片配置异常时不得突破或错误缩小 9 张产品上限')
assert.match(compose, /miniappOssIcons\.qianxunComposePhoto/, '照片工具图标必须使用蓝湖切图的 OSS 资源')
assert.match(compose, /miniappOssIcons\.qianxunComposeVideo/, '视频工具图标必须使用蓝湖切图的 OSS 资源')
assert.match(compose, /miniappOssIcons\.qianxunComposeSmile/, '表情工具图标必须使用蓝湖切图的 OSS 资源')

assert.match(family, /useAuthStore\(state => state\.userId\)/, '同城动态必须取得当前用户 ID')
assert.match(family, /isSelf=\{post\.authorId === currentUserId\}/, '动态卡片必须显式标记本人内容')
assert.doesNotMatch(family, /pages\/message\/whisper-detail/, '动态流发起悄悄话不得跳转独立页面')
assert.match(family, /CommunityWhisperSheet/, '动态流必须在当前页展示悄悄话扣费弹窗')

assert.match(visibility, /aboutMe:/, '主页预览可见性模型必须包含关于我')
assert.match(preview, /ProfilePreviewAboutMe/, '主页预览必须渲染关于我内容')
assert.match(preview, /data-role="profile-preview-scroll-content"/, '主页预览导航与滚动内容必须分层')
assert.match(edit, /data-role="profile-edit-scroll-content"/, '资料编辑导航与滚动内容必须分层')

for (const field of ['industry', 'occupation', 'company', 'annualIncome']) {
  assert.match(basicInfo, new RegExp(`WORKER_PROFILE_ROW_IDS[\\s\\S]*['\"]${field}['\"]`), `职场字段集合必须包含 ${field}`)
}
assert.match(basicInfo, /industry: '', occupation: '', company: '', annualIncome: ''/, '切换为在校生时必须清空全部职场字段')

assert.match(profile, /showCertification/, '我的页必须维护三重认证弹窗状态')
assert.match(profile, /onCertification/, '认证徽标必须有独立点击回调')
assert.match(profile, /CertificationSheet/, '点击我的页认证徽标必须展示认证详情弹窗')

assert.match(workflow, /078_fix_community_post_max_images\.sql/, '生产发布工作流必须执行图片上限纠正迁移')

console.log('08.27 问题回归门禁通过')
