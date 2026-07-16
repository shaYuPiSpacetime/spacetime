const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('主页预览无未定义组件且隐藏 MBTI 模块', () => {
  const edit = read('src/pages/profile/edit.tsx')
  const preview = read('src/pages/profile/components/ProfilePreviewPage.tsx')

  assert.doesNotMatch(preview, /<EmptyText\b/, '主页预览禁止引用未定义的 EmptyText')
  assert.doesNotMatch(edit, /<MbtiSection\b/, '编辑资料页必须隐藏 MBTI 模块')
  assert.doesNotMatch(preview, /<ProfilePreviewMbti\b/, '主页预览必须隐藏 MBTI 模块')
})

test('编辑资料返回按钮具备足够点击区域且单页栈回到我的页面', () => {
  const edit = read('src/pages/profile/edit.tsx')
  const nav = read('src/components/ProfilePreviewTopNav.tsx')

  assert.match(edit, /Taro\.switchTab\(\{ url: '\/pages\/profile\/index' \}\)/, '编辑资料单页直达时必须回到“我的”Tab')
  assert.match(nav, /data-role="profile-edit-back"/, '返回按钮必须提供稳定的运行态点击标识')
  assert.match(nav, /width: '112rpx'/, '返回按钮点击宽度不得只等于箭头宽度')
  assert.match(nav, /zIndex: 10/, '返回按钮必须高于页面标题和滚动内容')
})

test('相册严格按 sortOrder 回显到六个固定槽位', () => {
  const edit = read('src/pages/profile/edit.tsx')
  const sql = read('../deploy/sql/prod/054_prd01_profile_album_six_slots.sql')
  assert.match(edit, /const preferredIndex = normalizeAlbumSlot\(media\.sortOrder/, '相册必须按接口 sortOrder 定位槽位')
  assert.doesNotMatch(edit, /\)\[index\]/, '相册禁止按返回数组下标压缩到第一行')
  assert.match(edit, /findIndex\(slot => !slot\.mediaId\)/, '重复或非法 sortOrder 必须稳定回填第一个空槽')
  assert.match(edit, /isChooseImageCancelled/, '用户取消选图和接口保存失败必须分别处理')
  assert.match(edit, /await showError\(error\)/, '相册上传或保存失败必须展示真实接口错误')
  assert.match(sql, /"key":"album"[\s\S]*?"maxCount":"6"/, '运行时相册上限必须由数据库配置为六张')
  assert.doesNotMatch(sql, /UPDATE\s+app_config[\s\S]*config_value\s*=\s*'\{"rows"/i, '迁移不得整段覆盖其他上传规则')
})

test('子页面保存后通过事件回传局部数据且不整页刷新', () => {
  const edit = read('src/pages/profile/edit.tsx')
  assert.match(edit, /events:\s*\{[\s\S]{0,80}\[PROFILE_UPDATED_EVENT\]:/, '编辑资料页需要监听子页局部更新事件')
  assert.match(edit, /onScroll=/, '编辑资料页需要记录滚动位置')

  for (const file of ['tags.tsx', 'about.tsx', 'songs.tsx', 'intro.tsx']) {
    const source = read(`src/pages/profile-edit/${file}`)
    assert.match(source, /emitProfileUpdated\(/, `${file} 保存后必须回传最新数据`)
    assert.doesNotMatch(source, /redirectTo\(\{ url: '\/pages\/profile\/edit/, `${file} 禁止通过重定向刷新父页`)
  }

  const certification = read('src/pages/verification/my-certification.tsx')
  assert.match(certification, /useDidShow\(/, '我的认证返回深层页面后必须重新读取局部认证状态')
  assert.match(certification, /emitProfileUpdated\(\{ type: 'verification'/, '我的认证必须向编辑资料页回传最新状态')
})

test('头像来源浮层完整遮盖底部主按钮', () => {
  const avatar = read('src/pages/verification/avatar.tsx')
  assert.match(avatar, /onPrimary=\{sourceSheetVisible \? undefined :/, '来源浮层打开时必须隐藏底部主按钮')
  assert.match(avatar, /zIndex: 40/, '来源浮层层级必须高于认证底部按钮')
})

test('基本资料输入型字段不复用“请选择”占位', () => {
  const card = read('src/pages/verification/components/BasicInfoCard.tsx')
  assert.match(card, /common_input_placeholder/, '输入型字段占位必须读取独立动态文案')
  assert.match(card, /resolveFieldPlaceholder/, '展示值必须按字段类型选择占位文案')
})

test('四个蓝湖二级页具备独立结构和首屏数据', () => {
  const certification = read('src/pages/verification/my-certification.tsx')
  const tags = read('src/pages/profile-edit/tags.tsx')
  const about = read('src/pages/profile-edit/about.tsx')
  const songs = read('src/pages/profile-edit/songs.tsx')

  assert.match(certification, /copy\('verification_detail_heading'\)/, '我的认证页缺少接口动态主标题')
  assert.match(certification, /data-role="certification-detail-card"/, '我的认证页缺少独立详情卡片')
  assert.match(tags, /data-role="selected-tag-drawer"/, '我的标签页缺少底部已选区')
  assert.match(tags, /width: '206rpx'/, '我的标签页必须为三列布局')
  assert.match(about, /const aboutTabs/, '关于我页面缺少顶部分类')
  assert.match(about, /question\.placeholder/, '关于我卡片必须展示接口副标题')
  assert.match(songs, /void searchSongs\(''\)/, '歌曲页首屏必须主动加载推荐数据')
  assert.match(songs, /function SongRecord/, '歌曲列表必须按蓝湖独立组件还原')
})

test('标签在编辑页、选择页和主页预览按完整色块换行', () => {
  const edit = read('src/pages/profile/edit.tsx')
  const tags = read('src/pages/profile-edit/tags.tsx')
  const preview = read('src/pages/profile/components/ProfilePreviewPage.tsx')
  const chip = read('src/components/ProfileTagChip.tsx')
  const tagDomain = read('src/utils/profileTags.ts')

  assert.match(edit, /ProfileTagChip/, '编辑资料必须按标签块回显')
  assert.match(edit, /useState<ProfileTagItem\[\]>/, '编辑资料必须保留标签 code 和 label')
  assert.doesNotMatch(edit, /selectedTags\.join\('、'\)/, '编辑资料禁止把标签拼成普通文案')
  assert.match(preview, /flexWrap: 'wrap'/, '主页预览必须按完整标签块换行')
  assert.doesNotMatch(preview, /previewTagWidths/, '主页预览禁止按位置写死标签宽度')
  assert.match(tags, /categoryCode !== 'ALL'/, '接口已有 ALL 分组时必须过滤重复“全部”')
  assert.match(tags, /ProfileTagChip/, '标签页必须复用统一标签色块')
  assert.match(chip, /whiteSpace: 'nowrap'/, '标签文字禁止在色块内部换行')
  assert.match(chip, /flexShrink: 0/, '标签块必须整体换行')
  assert.match(tagDomain, /stableTagHash\(item\.code\)/, '颜色必须按标签 code 稳定映射')
})
