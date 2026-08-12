import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const read = relativePath => fs.readFileSync(path.join(rootDir, relativePath), 'utf8')

const preview = read('src/pages/profile/components/ProfilePreviewPage.tsx')
const visibility = read('src/domain/profilePreviewVisibility.ts')
const topNav = read('src/components/ProfilePreviewTopNav.tsx')
const nativeNavigation = read('src/components/NativeNavigation.tsx')
const packageJson = read('package.json')

assert.doesNotMatch(preview, /import profilePreviewPhoto from/, '蓝湖人物大图禁止打进小程序主包')
assert.equal(
  fs.existsSync(path.join(rootDir, 'src/assets/lanhu/profile/profile-preview-photo.png')),
  true,
  '蓝湖人物相册切图必须存在'
)
assert.equal(
  fs.existsSync(path.join(rootDir, 'src/assets/lanhu/profile/profile-preview-hero.png')),
  true,
  '主页预览首图必须存在独立的蓝湖 2x 切图'
)
assert.equal(
  fs.existsSync(path.join(rootDir, 'src/assets/lanhu/profile/profile-preview-avatar.png')),
  true,
  '主页预览头像必须存在独立的蓝湖 2x 切图'
)
for (const certIcon of ['avatar', 'realname', 'education']) {
  assert.equal(
    fs.existsSync(path.join(rootDir, `src/assets/lanhu/profile/profile-preview-cert-${certIcon}.png`)),
    true,
    `主页预览认证图标 ${certIcon} 必须存在蓝湖 2x 切图`
  )
}
assert.match(preview, /minHeight: '100vh'/, '空模块隐藏后页面高度必须跟随真实内容收口')
assert.doesNotMatch(preview, /minHeight: '5900rpx'/, '主页预览禁止保留固定超长页面高度')
assert.match(preview, /height: '828rpx'/, '首屏主图高度必须为 828rpx')
assert.doesNotMatch(preview, /editHeroPhoto/, '主页预览禁止复用缺少竖向像素的编辑页横图')
assert.match(
  preview,
  /src=\{model\.heroImageUrl \|\| miniappOssIcons\.profilePreviewHero\}\s+mode="aspectFill"/,
  '首屏主图必须优先使用真实背景、保留蓝湖 OSS 2x 缺省切图并按比例裁切'
)
assert.match(
  preview,
  /id="profile-preview-avatar"[\s\S]{0,180}src=\{model\.avatarUrl \|\| miniappOssIcons\.profilePreviewAvatar\}[\s\S]{0,80}mode="aspectFill"/,
  '首屏圆头像必须优先使用真实头像、保留蓝湖 OSS 2x 缺省切图并按比例裁切'
)
assert.match(preview, /height: '896rpx'/, '相册图片高度必须为 896rpx')
assert.doesNotMatch(preview, /height: '920rpx'/, '禁止保留错误的 920rpx 主图高度')
assert.doesNotMatch(preview, /height: '700rpx'/, '禁止保留错误的 700rpx 相册图片高度')
assert.match(preview, /borderRadius: '32rpx'/, '蓝湖卡片和图片圆角必须为 32rpx')
assert.match(preview, /text=\{model\.genderAgeHeight/, '基础资料必须由真实资料模型驱动')
assert.match(preview, /text=\{model\.location/, '地区资料必须由真实资料模型驱动')
assert.doesNotMatch(preview, /女丨97年|浙江杭州|河南人/, '主页预览不得保留蓝湖演示用户文案')
assert.match(preview, /flexWrap: 'wrap'/, '真实标签长度变化时必须按完整色块换行')
assert.doesNotMatch(preview, /previewTagWidths/, '禁止按演示标签序号写死宽度导致文案块内换行')
assert.match(read('src/components/ProfileTagChip.tsx'), /whiteSpace: 'nowrap'/, '标签色块内部文字禁止换行')
assert.match(preview, /textIndent: '54rpx'/, '有内容时自我介绍首行必须按蓝湖缩进 54rpx')
assert.match(preview, /introduction=\{visibleContent\.introduction\}/, '自我介绍必须使用清理后的真实内容')
assert.match(preview, /visibleContent\.introduction \? <ProfilePreviewIntroduction/, '空自我介绍必须隐藏整个模块')
assert.match(preview, /height: '44rpx'/, '卡片标题占位高度必须为 44rpx')
assert.match(preview, /top: '4rpx'/, '卡片标题文字必须下移 4rpx 对齐蓝湖基线')
assert.doesNotMatch(preview, /ProfilePreviewMbti|MBTI类型/, '产品要求隐藏主页预览 MBTI 模块')
assert.doesNotMatch(preview, /<EmptyText\b/, '主页预览禁止引用未定义组件')
assert.match(preview, /padding: '0 25rpx 0 8rpx'/, '认证按钮文字间距必须匹配蓝湖右内边距')
assert.match(preview, /src=\{miniappOssIcons\.profilePreviewSong\}[\s\S]*marginLeft: '11rpx'/, '歌曲文案与图标间距必须为蓝湖 11rpx')
assert.match(visibility, /photos: input\.photos\.map\(normalizeText\)\.filter\(Boolean\)\.slice\(0, 4\)/, '主页预览最多展示四张真实相册图片')
assert.match(preview, /visibleContent\.photos\[0\] \? <ProfilePreviewPhoto/, '第一张相册为空时不得生成图片卡位')
assert.match(preview, /visibleContent\.photos\[1\] \? <ProfilePreviewPhoto/, '第二张相册为空时不得生成图片卡位')
assert.match(preview, /visibleContent\.photos\.slice\(2\)\.map/, '剩余相册必须只遍历真实图片')
assert.doesNotMatch(preview, /暂未添加标签|暂未填写自我介绍|暂未添加照片|暂未添加喜欢的歌曲/, '空内容禁止显示占位模块或占位文案')
assert.match(preview, /visibleContent\.tags\.length \? <ProfilePreviewTagSection/, '空标签必须隐藏整个模块')
assert.match(preview, /visibleContent\.showCertification \? <ProfilePreviewCertification/, '未通过任何认证时必须隐藏认证模块')
assert.match(preview, /visibleContent\.favoriteSong \? <ProfilePreviewSong/, '空歌曲必须隐藏整个模块')
assert.doesNotMatch(preview, /function ProfilePreviewPhoto\(\{ label \}/, '蓝湖相册图片没有叠加标签文案')
assert.match(preview, /miniappOssIcons\.profilePreviewCertAvatar/, '头像认证必须使用主页预览蓝湖切图')
assert.match(preview, /miniappOssIcons\.profilePreviewCertRealname/, '实名认证必须使用主页预览蓝湖切图')
assert.match(preview, /miniappOssIcons\.profilePreviewCertEducation/, '学历认证必须使用主页预览蓝湖切图')
assert.match(preview, /miniappOssIcons\.profilePreviewShare/, '分享按钮必须使用蓝湖 OSS 切图')
assert.match(
  preview,
  /model\.gender === 'MALE'[\s\S]{0,180}miniappOssIcons\.qianxunGenderMale[\s\S]{0,180}miniappOssIcons\.profilePreviewGender/,
  '性别图标必须按真实性别切换：男性蓝色、女性红色蓝湖切图'
)
assert.match(preview, /miniappOssIcons\.profilePreviewLocation/, '所在地图标必须使用蓝湖 OSS 切图')
assert.match(preview, /miniappOssIcons\.profilePreviewSong/, '歌曲图标必须使用蓝湖 OSS 切图')
assert.match(topNav, /fontSize: active \? '32rpx' : '28rpx'/, '顶部 Tab 必须映射蓝湖激活和未激活字号')
assert.match(topNav, /lineHeight: active \? '45rpx' : '40rpx'/, '顶部 Tab 必须映射蓝湖激活和未激活行高')
assert.match(topNav, /width: '128rpx'/, '主页预览激活下划线宽度必须为 128rpx')
assert.match(topNav, /height: '8rpx'/, '主页预览激活下划线高度必须为 8rpx')
assert.match(topNav, /getNativeNavigationMetrics/, '主页预览顶部必须复用统一导航度量')
assert.match(nativeNavigation, /Taro\.getEnv\(\) === Taro\.ENV_TYPE\.WEAPP/, '微信胶囊 API 只能在微信环境调用')
assert.doesNotMatch(preview + topNav, /letterSpacing:\s*['"]-/, '蓝湖还原禁止负字距')
assert.match(
  preview,
  /data-role="profile-preview-identity"[\s\S]{0,300}left: '238rpx'[\s\S]{0,220}alignItems: 'flex-start'/,
  '头像右侧昵称和感情状态必须同左边缘，并保留蓝湖 20rpx 间距'
)
assert.match(packageJson, /validate-profile-preview-lanhu\.mjs/, '微信开发和构建前必须执行蓝湖视觉门禁')

console.log('主页预览蓝湖视觉门禁通过')
