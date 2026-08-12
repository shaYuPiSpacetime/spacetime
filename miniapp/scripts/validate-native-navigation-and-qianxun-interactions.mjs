import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const miniappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relativePath => fs.readFileSync(path.join(miniappRoot, relativePath), 'utf8')
const exists = relativePath => fs.existsSync(path.join(miniappRoot, relativePath))

const nativeNavigationPath = 'src/components/NativeNavigation.tsx'
assert.ok(exists(nativeNavigationPath), '缺少统一的原生胶囊对齐导航组件')

const nativeNavigation = read(nativeNavigationPath)
const header = read('src/features/qianxun/QianxunHeader.tsx')
const detail = read('src/pages/qianxun/post-detail.tsx')
const interactions = read('src/pages/qianxun/interactions.tsx')
const family = read('src/features/qianxun/QianxunFamilyPage.tsx')
const myPosts = read('src/pages/qianxun/my-posts.tsx')
const customNav = read('src/components/CustomNavBar/index.tsx')
const messageNavigation = read('src/pages/message/shared.tsx')
const messageStyles = read('src/pages/message/message.scss')
const whisperList = read('src/pages/message/whisper-list.tsx')
const phoneLogin = read('src/pages/login/phone.tsx')
const phoneLoginStyles = read('src/pages/login/phone.scss')

assert.match(nativeNavigation, /getMenuButtonBoundingClientRect/, '导航组件必须读取微信原生胶囊位置')
assert.match(nativeNavigation, /MiniappBackIcon/, '导航组件必须提供统一返回箭头')
assert.match(nativeNavigation, /iconUnit\s*=\s*isWeapp\s*\?\s*['"]rpx['"]\s*:\s*['"]px['"]/, '统一返回箭头必须兼容微信与 H5 的尺寸单位')
assert.match(nativeNavigation, /iconMetric\(size\)/, '统一返回箭头尺寸必须经过双端单位换算')
assert.doesNotMatch(nativeNavigation, /•••|胶囊/, '导航组件不得绘制微信原生胶囊')

assert.match(header, /QIANXUN_SECONDARY_TAB_OFFSET/, '千寻主副 Tab 间距必须使用明确设计常量')
assert.doesNotMatch(header, /Math\.max\(176,\s*primaryTop/, '千寻二级 Tab 不得再被固定最小高度拉远')

for (const page of ['compose', 'interactions', 'my-posts', 'post-detail', 'topic']) {
  const source = read(`src/pages/qianxun/${page}.tsx`)
  assert.match(source, /NativeNavigation|MiniappBackIcon/, `${page} 必须使用原生胶囊对齐导航或统一返回箭头`)
  assert.doesNotMatch(source, />\s*‹\s*</, `${page} 不得继续使用字体返回符号`)
}

assert.doesNotMatch(detail, /•••/, '动态详情顶部不得重复绘制系统胶囊或三点按钮')
assert.match(detail, /focus=\{commentFocused\}/, '点击回复后必须聚焦评论输入框')
assert.match(detail, /replyTarget\?\.commentId/, '回复评论必须携带父评论 ID')
assert.match(detail, /replyTarget\?\.userId/, '回复评论必须携带被回复用户 ID')
assert.match(detail, /buildCommunityCommentThreads/, '动态详情必须按父评论构建评论线程')
assert.match(detail, /resolveCommentThreadRootId/, '回复子评论时必须归入同一个一级评论线程')
assert.match(detail, /className="qianxun-comment-thread"/, '一级评论必须使用独立线程容器')
assert.match(detail, /className="qianxun-comment-child"/, '回复评论必须渲染在父评论下一层级')
assert.match(detail, /width: '80rpx', height: '80rpx'/, '一级评论头像必须按蓝湖使用 80rpx')
assert.match(detail, /width: '48rpx', height: '48rpx'/, '回复头像必须按蓝湖使用 48rpx')
assert.match(detail, /className="qianxun-comment-meta-row"/, '评论时间与点赞必须位于正文下方同一元信息行')
assert.doesNotMatch(detail, /qianxun-comment-reply-[^\n]*width: '80rpx', height: '88rpx'/, '蓝湖评论行不得保留独立的 88rpx 回复操作栏')

assert.match(interactions, /data-section-panel=/, '互动页各 Tab 内容必须保持挂载，避免切换闪屏')
assert.doesNotMatch(interactions, /next === ['"]mine['"][\s\S]{0,160}redirectTo/, '我的动态 Tab 不得通过页面跳转造成闪屏')
assert.doesNotMatch(interactions, /去千寻同城看看[\s\S]{0,180}pages\/recommend\/index|pages\/recommend\/index[\s\S]{0,180}去千寻同城看看/, '去千寻同城 CTA 不得错误跳转底部推荐页')
assert.match(interactions, /qianxun_requested_scene/, '跨页进入千寻同城必须写入待切换场景')
assert.match(family, /qianxun_requested_scene/, '千寻首页必须消费跨页待切换场景')
assert.match(myPosts, /interactions\?section=history/, '旧我的动态页“浏览记录”必须进入对应互动 Tab')
assert.match(myPosts, /interactions\?roster=following/, '旧我的动态页“关注”必须进入关注列表态')
assert.match(myPosts, /interactions\?roster=followers/, '旧我的动态页“粉丝”必须进入粉丝列表态')
assert.match(myPosts, /interactions\?likes=1/, '旧我的动态页“获赞”必须进入获赞说明态')

assert.match(customNav, /NativeNavigation/, '通用自定义导航必须复用统一导航和返回箭头')
assert.doesNotMatch(customNav, />\s*‹\s*</, '通用自定义导航不得使用字体返回符号')

assert.match(messageNavigation, /getNativeNavigationMetrics/, '消息导航必须直接读取微信原生胶囊位置')
assert.match(messageNavigation, /MiniappBackIcon/, '消息导航必须使用统一返回箭头')
assert.match(messageNavigation, /navigationHeight/, '消息导航高度必须跟随原生胶囊指标')
assert.match(messageNavigation, /data-role="message-navigation-slot"[\s\S]{0,360}titleTop/, '悄悄话双页签必须跟随胶囊中心线')
assert.doesNotMatch(messageNavigation, /message-nav-chevron/, '消息导航不得继续绘制过大的独立返回箭头')
assert.doesNotMatch(messageStyles, /\.message-nav-chevron/, '消息样式不得保留过大的独立返回箭头')
assert.doesNotMatch(messageStyles, /\.whisper-tabs\s*\{[\s\S]{0,180}top:\s*55px/, '申请我的/我申请的页签不得写死顶部位置')
assert.match(whisperList, /<MessageNav>[\s\S]{0,220}<View\s+className="whisper-tabs"/, '申请我的/我申请的必须由统一消息导航托管')

assert.match(phoneLogin, /getNativeNavigationMetrics/, '手机号登录返回按钮必须读取微信原生胶囊位置')
assert.match(phoneLogin, /MiniappBackIcon/, '手机号登录必须使用统一返回箭头')
assert.doesNotMatch(phoneLogin, /phone-login-back-chevron/, '手机号登录不得继续绘制过大的独立返回箭头')
assert.doesNotMatch(phoneLoginStyles, /\.phone-login-back-chevron/, '手机号登录样式不得保留过大的独立返回箭头')
assert.doesNotMatch(phoneLoginStyles, /\.phone-login-back\s*\{[\s\S]{0,160}top:\s*66px/, '手机号登录返回按钮不得写死顶部位置')

const messagePages = ['whisper-list', 'whisper-detail', 'private-list', 'private-chat', 'channel', 'report']
for (const page of messagePages) {
  assert.match(read(`src/pages/message/${page}.tsx`), /MessageNav/, `${page} 必须复用统一胶囊对齐消息导航`)
}

console.log('原生胶囊对齐、统一返回箭头、回复与互动无闪屏门禁通过：已覆盖 7 个自绘返回导航页面')
