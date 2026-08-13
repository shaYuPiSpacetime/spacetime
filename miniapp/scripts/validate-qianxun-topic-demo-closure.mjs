/* global console */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')
const exists = relativePath => fs.existsSync(path.join(root, relativePath))

const appConfig = read('src/app.config.ts')
const service = read('src/services/community.ts')
const family = read('src/features/qianxun/QianxunFamilyPage.tsx')
const topicDetail = read('src/pages/qianxun/topic.tsx')
const compose = read('src/pages/qianxun/compose.tsx')
const chat = read('src/pages/chat/index.tsx')
const interactions = read('src/pages/qianxun/interactions.tsx')

assert.ok(exists('src/features/qianxun/QianxunTopicSpotlight.tsx'), '热门页缺少社区话题板块组件')
assert.ok(exists('src/pages/qianxun/topics.tsx'), '缺少社区话题列表页')
assert.match(appConfig, /['"]topics['"]/, '千寻分包必须注册社区话题列表页')

for (const method of ['getCommunityTopicHome', 'getCommunityTopics', 'getCommunityTopicDetail', 'getCommunityTopicPosts']) {
  assert.match(service, new RegExp(`export (?:function|const) ${method}`), `社区话题服务缺少 ${method}`)
}
for (const endpoint of ['/miniapp/community/topics/home', '/miniapp/community/topics', '/miniapp/community/topics/${topicId}', '/miniapp/community/topics/${topicId}/posts']) {
  assert.ok(service.includes(endpoint), `社区话题服务缺少接口：${endpoint}`)
}

const spotlight = read('src/features/qianxun/QianxunTopicSpotlight.tsx')
const topicList = read('src/pages/qianxun/topics.tsx')
assert.match(family, /getCommunityTopicHome/, '热门 Tab 必须加载话题首页接口')
assert.match(family, /activeTab === ['"]HOT['"][\s\S]{0,180}<QianxunTopicSpotlight/, '话题板块只能在热门 Tab 顶部渲染')
assert.match(spotlight, /社区话题/, '热门话题板块必须展示设计标题')
assert.match(spotlight, /全部话题/, '热门话题板块必须提供全部话题入口')
assert.match(spotlight, /pages\/qianxun\/topics/, '全部话题必须跳转社区话题列表')
assert.match(spotlight, /pages\/qianxun\/topic\?topicId=/, '首页话题卡必须跳转话题详情')

assert.match(topicList, /NativeNavigation[^\n]*title="社区话题"/, '社区话题列表标题必须与原生胶囊对齐')
assert.ok(exists('src/pages/qianxun/topics.config.ts'), '社区话题列表必须提供页面级配置，避免继承全局“成家立业”标题')
assert.match(read('src/pages/qianxun/topics.config.ts'), /navigationStyle\s*:\s*['"]custom['"]/, '社区话题列表必须关闭微信原生导航，避免出现两个返回箭头')
assert.match(topicList, /getCommunityTopics/, '社区话题列表必须加载真实接口')
assert.match(topicList, /onScrollToLower/, '社区话题列表必须支持翻页')
assert.match(topicList, /pages\/qianxun\/topic\?topicId=/, '社区话题列表项必须进入详情')

assert.match(topicDetail, /getCommunityTopicDetail/, '话题详情必须加载详情接口')
assert.match(topicDetail, /getCommunityTopicPosts/, '话题详情必须按排序加载话题动态接口')
assert.doesNotMatch(topicDetail, /config\.topics|topics\.find\([\s\S]{0,160}topicId/, '话题详情不得通过配置字典猜测话题信息')
assert.doesNotMatch(topicDetail, /useMemo\([\s\S]{0,220}\.sort\(/, '话题动态排序必须由服务端完成')
assert.match(topicDetail, /sort === ['"]HOT['"]/, '话题详情必须提供热门排序')
assert.match(topicDetail, /sort === ['"]LATEST['"]/, '话题详情必须提供最新排序')
assert.match(topicDetail, /topicName=\$\{encodeURIComponent/, '参与话题必须把话题名称带到发布页')
assert.match(compose, /params\.topicName/, '发布页必须接收话题详情带入的话题名称')
assert.match(compose, /data-role="compose-tool-image"/, '发布动态必须绘制图片工具图标')
assert.match(compose, /data-role="compose-tool-video"/, '发布动态必须绘制视频工具图标')
assert.match(compose, /data-role="compose-tool-smile"/, '发布动态必须绘制表情工具图标')
assert.match(compose, /data-role="compose-add-image-icon"/, '发布动态加图入口必须使用真实图形图标')
assert.match(compose, /data-role="compose-remove-image-icon"/, '发布动态删除图片入口必须使用真实图形图标')
assert.match(compose, /data-role="compose-topic-leading-icon"/, '发布动态话题胶囊必须包含蓝湖 # 圆标')
assert.match(compose, /data-role="compose-topic-trailing-icon"/, '发布动态话题胶囊必须包含箭头或关闭图标')
assert.match(compose, /images\.length\s*>\s*0\s*&&\s*images\.length\s*<\s*maxImages/, '空白发布态不得提前显示加图方块')
assert.doesNotMatch(compose, /\{images\.length\}\s*\/\s*\{maxImages\}/, '蓝湖底部工具栏不显示图片数量计数')
assert.doesNotMatch(compose, /runtime\.topics\?\.\[0\]/, '发布动态默认态必须显示“添加话题”，不得自动选中第一个话题')
assert.doesNotMatch(compose, /['"][▧▻☺＋]['"]|const\s+glyph/, '发布动态禁止使用字符代替图片、视频、表情或加图图标')
assert.doesNotMatch(compose, /COMMUNITY_COPY_KEYS\.uploadRetry/, '图片上传失败不得提供“重新上传”按钮')
assert.match(compose, /const\s+choosingImagesRef\s*=\s*useRef\(false\)/, '图片选择器必须有同步互斥锁，避免连续点击重复拉起')
assert.match(compose, /if\s*\(choosingImagesRef\.current\)\s*return/, '图片选择器互斥锁必须在调用系统能力前生效')
assert.match(compose, /data-role="compose-image-preview"/, '已选图片必须提供独立大图预览层')
assert.match(compose, /<MovableArea[\s\S]{0,1200}<MovableView/, '发布动态大图预览必须使用原生手势容器')
assert.match(compose, /scaleMin=\{1\}/, '发布动态图片预览最小缩放必须为 1 倍')
assert.match(compose, /scaleMax=\{3\}/, '发布动态图片预览最大缩放必须限制为 3 倍')
assert.match(topicDetail, /reportCommunityPost/, '话题动态更多菜单必须接通举报接口')
assert.match(topicDetail, /Taro\.showActionSheet/, '话题动态更多菜单必须提供真实操作反馈')
assert.match(topicDetail, /Taro\.previewImage/, '话题动态图片必须支持原图预览')
assert.match(topicDetail, /qianxun-topic-post-more-/, '话题动态更多入口必须有稳定运行态标识')

assert.match(chat, /data-role="message-home-whisper-background"/, '悄悄话入口背景缺少稳定运行态标识')
assert.match(chat, /data-role="message-home-private-background"/, '私信入口背景缺少稳定运行态标识')
assert.doesNotMatch(chat, /messageHomeWhisperCardBackground[\s\S]{0,120}mode="scaleToFill"/, '悄悄话背景禁止拉伸变形')
assert.doesNotMatch(chat, /messageHomePrivateCardBackground[\s\S]{0,120}mode="scaleToFill"/, '私信背景禁止拉伸变形')
assert.doesNotMatch(interactions, /pages\/heart\/user\?id=/, '千寻互动查看主页必须使用 userId 参数')

for (const source of [family, spotlight, topicList, topicDetail, compose, interactions]) {
  assert.doesNotMatch(source, /opacity\s*:\s*0(?:[;,}]|\b)/, '千寻闭环禁止透明热区')
  assert.doesNotMatch(source, /lanhuapp\.com|alipic\.lanhuapp|\.lanhu-ref/, '运行页面禁止引用蓝湖截图')
}

console.log('千寻话题 Demo 闭环静态门禁通过')
