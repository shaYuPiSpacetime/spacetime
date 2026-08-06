const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

const edit = read('src/pages/profile/edit.tsx')
const preview = read('src/pages/profile/components/ProfilePreviewPage.tsx')
const previewVisibility = read('src/domain/profilePreviewVisibility.ts')
const intro = read('src/pages/verification/intro.tsx')
const introEdit = read('src/pages/verification/intro-edit.tsx')
const avatarAlbum = read('src/pages/verification/avatar-album.tsx')

assert.match(preview, /export type ProfilePreviewModel\s*=\s*\{/, '主页预览必须声明真实资料模型')
for (const field of [
  'avatarUrl',
  'heroImageUrl',
  'nickname',
  'genderAgeHeight',
  'location',
  'tags',
  'introduction',
  'photos',
  'certifications',
  'voice',
  'datingGoal',
]) {
  assert.match(preview, new RegExp(`\\b${field}\\??:`), `真实资料模型缺少 ${field}`)
}
assert.doesNotMatch(preview, /getDemoPageData|profileDemo/, '主页预览不得读取蓝湖演示业务数据')
assert.doesNotMatch(preview, /女丨97年|浙江杭州|河南人|深夜电台|告白气球|ENFJ 主人公|92%/, '主页预览不得保留演示用户资料')
for (const geometry of [
  /minHeight: '100vh'/,
  /height: '828rpx'/,
  /height: '896rpx'/,
  /flexWrap: 'wrap'/,
  /<ProfileTagChip item=\{item\}/,
  /textIndent: '54rpx'/,
  /padding: '0 25rpx 0 8rpx'/,
  /height: '44rpx'/,
  /top: '4rpx'/,
]) {
  assert.match(preview, geometry, `主页预览蓝湖几何基线缺失：${geometry}`)
}
assert.doesNotMatch(preview, /previewTagWidths/, '标签宽度不得按演示数据写死')
assert.match(previewVisibility, /filter\(Boolean\)\.slice\(0, 4\)/, '相册必须最多保留四张真实图片')
assert.match(preview, /visibleContent\.photos\[0\] \? <ProfilePreviewPhoto/, '空相册不得生成第一个蓝湖大图卡位')
assert.match(preview, /visibleContent\.photos\.slice\(2\)\.map/, '剩余蓝湖大图必须按真实相册遍历')
assert.doesNotMatch(preview, /暂未添加标签|暂未填写自我介绍|暂未添加照片|暂未添加喜欢的歌曲/, '主页预览空内容不得显示占位模块')
assert.match(edit, /<ProfilePreviewPage\s+model=\{previewModel\}/, '编辑页必须将完整真实资料模型传给预览页')
assert.match(edit, /profile\.profileBgImage/, '主页预览背景必须读取 home-detail 的 profileBgImage')
assert.match(edit, /heroImageUrl:\s*profileBackground/, '主页预览必须优先展示真实资料背景图')
assert.doesNotMatch(edit + preview, /MbtiSection|ProfilePreviewMbti|MBTI类型/, '产品要求隐藏编辑资料与预览 MBTI 模块')
assert.match(edit, /prd01Api\.replaceAlbum[\s\S]*fileSizeBytes:\s*uploaded\.fileSizeBytes/, '替换相册必须透传 OSS 返回的文件大小')
assert.match(edit, /prd01Api\.addAlbum[\s\S]*fileSizeBytes:\s*uploaded\.fileSizeBytes/, '新增相册必须透传 OSS 返回的文件大小')

assert.match(intro, /\/pages\/profile\/edit/, '历史语音深链必须重定向到编辑资料页')
assert.match(intro, /VOICE_VARIANTS/, '历史语音 variant 必须映射到 voice query')
assert.match(intro, /VerificationShell[\s\S]*stage="intro"/, '正式认证自我介绍页必须保留四步进度外壳')
assert.match(intro, /prd01Api\.getIntroduction[\s\S]*prd01Api\.submitIntroduction/, '正式认证自我介绍页必须完成接口读写闭环')
assert.doesNotMatch(intro, /getDemoPageData/, '正式认证自我介绍页不得读取演示数据')
assert.match(introEdit, /\/pages\/profile-edit\/intro/, '历史文字介绍编辑页必须重定向到正式介绍页')
assert.doesNotMatch(introEdit, /getDemoPageData|VerificationShell|Textarea/, '历史文字介绍编辑页只能保留薄重定向')
assert.match(avatarAlbum, /\/pages\/verification\/avatar/, '历史头像相册页必须重定向到正式头像页')
assert.doesNotMatch(avatarAlbum, /chooseAndCropAvatar|VerificationShell|AvatarGuide/, '历史头像相册页只能保留薄重定向')
for (const [name, source] of [['intro', intro], ['intro-edit', introEdit], ['avatar-album', avatarAlbum]]) {
  assert.match(source, /encodeURIComponent/, `${name} 历史深链必须安全透传 query`)
}

console.log('用户资料预览与历史深链闭环契约通过')
