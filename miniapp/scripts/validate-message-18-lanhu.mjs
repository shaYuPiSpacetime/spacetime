/* eslint-env node */

import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const read = relativePath => fs.readFileSync(path.join(rootDir, relativePath), 'utf8')

const requiredPages = [
  'src/pages/chat/index.tsx',
  'src/pages/message/whisper-list.tsx',
  'src/pages/message/whisper-detail.tsx',
  'src/pages/message/private-list.tsx',
  'src/pages/message/private-chat.tsx',
  'src/pages/message/channel.tsx',
  'src/pages/message/report.tsx',
]

for (const page of requiredPages) {
  assert.equal(fs.existsSync(path.join(rootDir, page)), true, `消息 18 稿业务路由缺失：${page}`)
}

const appConfig = read('src/app.config.ts')
const runtime = requiredPages.map(read).join('\n')
const sceneRegistry = read('src/mocks/message/designScenes.ts')
const chat = read('src/pages/chat/index.tsx')
const report = read('src/pages/message/report.tsx')
const messageService = read('src/services/message.ts')
const ossIcons = read('src/constants/ossIcons.ts')
const ossUploader = read('scripts/upload-miniapp-oss-icons.mjs')

for (const route of ['whisper-list', 'whisper-detail', 'private-list', 'private-chat', 'channel', 'report']) {
  assert.match(appConfig, new RegExp(`['"]${route}['"]`), `消息分包必须注册 ${route}`)
}

const designIds = [
  '626cd513-005e-4df8-8456-b5280872ba23',
  '4eefc2dd-05c7-4a0c-b095-f252741f3781',
  '955469c9-c067-4f6f-97c8-57fcb7fb6ee4',
  '57f51864-59c3-4deb-b990-0d946ed5275c',
  '797ff271-e45a-4262-bd99-9ddb58bfad56',
  '60f5f2a4-ed1b-4a73-8291-ce65dca97a21',
  '5cff0169-1e9c-4f1d-8021-cf19da353ece',
  'da4cd120-0250-4b6c-9d10-7704106317a2',
  '4ee98b8d-72b5-4c2b-b02e-3567afaf2600',
  'a3c5e11a-0c8f-4adb-b1f9-e507925d6b74',
  'fa13c6d0-7d00-4373-80d2-59821eeb6cc4',
  'aabf0ea4-b22c-4a5c-afc5-f48f291a4046',
  '798b68f9-fda4-4b5d-aca4-b363c29407e3',
  'e3ab4fcf-8f3a-44da-b997-e86d13a295fc',
  '4a0eaf37-162c-409a-ba83-a62eed00e9c4',
  '5e8feaf3-cd84-4ea5-93ba-b4e181b92a17',
  '38ecd723-33cd-4961-9b50-59d8c601a1ad',
  'ff867af1-fc44-45b9-b2bc-0f81e51187f9',
]

for (const designId of designIds) {
  assert.match(sceneRegistry, new RegExp(designId), `18 稿场景注册表缺少 ${designId}`)
}
assert.doesNotMatch(sceneRegistry, /0a48d19f-b05f-40d0-8f14-f34bd131a50d/, '旧解除截图场景已退出 18 稿清单')

for (const copy of [
  '发起申请',
  '请选择你要举报的事项类型',
  '具体描述',
  '提交成功',
  '平台违规行为处罚细则',
  '知道啦',
]) {
  assert.match(runtime, new RegExp(copy), `消息 18 稿运行页面缺少文案：${copy}`)
}

assert.match(runtime, /<Textarea\b/, '举报描述必须使用真实 Textarea')
assert.match(runtime, /maxlength=\{400\}/, '举报描述必须限制 400 字')
assert.match(report, /getCommunityReportConfig/, '举报原因必须从社区配置动态下发')
assert.match(report, /chooseMedia/, '举报页必须支持用户主动补充凭证图片')
assert.match(report, /evidenceImageUrls/, '举报凭证必须随正式举报契约提交')
assert.doesNotMatch(report, /const\s+REPORT_REASONS/, '正式举报页不得硬编码举报原因')
assert.match(messageService, /头像非本人或无法看清正脸/, 'Mock 视觉基线必须保留蓝湖首项举报原因')
assert.match(runtime, /onClick=|onInput=/, '交互控件必须绑定真实事件')
assert.doesNotMatch(runtime, /lanhuapp\.com|alipic\.lanhuapp|\.lanhu-ref/, '运行代码禁止引用蓝湖参考图')
assert.doesNotMatch(runtime, /opacity\s*:\s*0(?:[;,}]|\b)/, '禁止透明点击热区')
assert.doesNotMatch(runtime, /backgroundImage[^\n]*(?:reference|screenshot|design|lanhu)/i, '禁止整页设计图背景')
assert.match(
  read('src/pages/chat/index.tsx'),
  /height: designRpx\(158\),[\s\S]{0,100}margin: `\$\{designRpx\(6\)\} auto 0`/,
  '消息入口卡片必须位于蓝湖 y=182rpx，不能整体下移 8rpx'
)

const privateCardBackgroundPath = path.join(rootDir, 'src/assets/lanhu/message/home-private-card-bg.png')
assert.equal(fs.existsSync(privateCardBackgroundPath), true, '消息首页缺少用户指定的私信卡片背景源文件')
if (fs.existsSync(privateCardBackgroundPath)) {
  const backgroundBytes = fs.readFileSync(privateCardBackgroundPath)
  assert.equal(backgroundBytes.readUInt32BE(16), 680, '私信卡片背景源文件宽度必须保持 680px（2x）')
  assert.equal(backgroundBytes.readUInt32BE(20), 316, '私信卡片背景源文件高度必须保持 316px（2x）')
}
assert.match(ossUploader, /messageHomePrivateCardBackground:\s*'src\/assets\/lanhu\/message\/home-private-card-bg\.png'/, '私信卡片背景必须接入无损 OSS 上传清单')
assert.match(ossIcons, /messageHomePrivateCardBackground:\s*'https:\/\//, '私信卡片背景必须使用上传后的 OSS 公网地址')
assert.match(
  chat,
  /data-role="message-home-private-background"[\s\S]{0,160}src=\{miniappOssIcons\.messageHomePrivateCardBackground\}[\s\S]{0,100}mode="aspectFill"[\s\S]{0,220}width: designRpx\(340\)[\s\S]{0,100}height: designRpx\(158\)/,
  '消息首页私信入口必须以 340×158rpx 真实背景图承载用户指定素材'
)
assert.match(chat, /id="message-home-private-entry"[\s\S]{0,120}onClick=/, '私信卡片必须保留独立真实点击入口')
assert.match(
  chat,
  /data-role="message-home-private-background"[\s\S]{0,340}pointerEvents: 'none'/,
  '私信背景仅承载视觉，不得拦截整卡点击事件'
)
assert.doesNotMatch(chat, /src=\{miniappOssIcons\.messageHomePrivateBubbleArt\}/, '私信入口不得继续叠加旧气泡插画')

const whisperCardBackgroundPath = path.join(rootDir, 'src/assets/lanhu/message/home-whisper-card-bg.png')
assert.equal(fs.existsSync(whisperCardBackgroundPath), true, '消息首页缺少用户指定的悄悄话卡片背景源文件')
if (fs.existsSync(whisperCardBackgroundPath)) {
  const backgroundBytes = fs.readFileSync(whisperCardBackgroundPath)
  assert.equal(backgroundBytes.readUInt32BE(16), 680, '悄悄话卡片背景源文件宽度必须保持 680px（2x）')
  assert.equal(backgroundBytes.readUInt32BE(20), 316, '悄悄话卡片背景源文件高度必须保持 316px（2x）')
  assert.equal(
    crypto.createHash('sha256').update(backgroundBytes).digest('hex'),
    '1e609a1f5efb8e8e514d254f04533a05aa072cda3680088093e99f7d4ffa484c',
    '悄悄话卡片背景必须与用户提供的原始 PNG 字节一致'
  )
}
assert.match(ossUploader, /messageHomeWhisperCardBackground:\s*'src\/assets\/lanhu\/message\/home-whisper-card-bg\.png'/, '悄悄话卡片背景必须接入无损 OSS 上传清单')
assert.match(ossIcons, /messageHomeWhisperCardBackground:\s*'https:\/\//, '悄悄话卡片背景必须使用上传后的 OSS 公网地址')
assert.match(
  chat,
  /data-role="message-home-whisper-background"[\s\S]{0,180}src=\{miniappOssIcons\.messageHomeWhisperCardBackground\}[\s\S]{0,100}mode="aspectFill"[\s\S]{0,220}width: designRpx\(340\)[\s\S]{0,100}height: designRpx\(158\)/,
  '消息首页悄悄话入口必须以 340×158rpx 真实背景图承载用户指定素材'
)
assert.match(chat, /id="message-home-whisper-entry"[\s\S]{0,120}onClick=/, '悄悄话卡片必须保留独立真实点击入口')
assert.match(
  chat,
  /data-role="message-home-whisper-background"[\s\S]{0,340}pointerEvents: 'none'/,
  '悄悄话背景仅承载视觉，不得拦截整卡点击事件'
)
assert.doesNotMatch(chat, /src=\{miniappOssIcons\.messageHomeYoArt\}/, '悄悄话入口不得继续叠加旧 YO 插画')

console.log('消息 18 稿路由、状态、举报链路与静态安全门禁通过')
