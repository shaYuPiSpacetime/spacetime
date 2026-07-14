/* eslint-env node */

import assert from 'node:assert/strict'
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
]

for (const page of requiredPages) {
  assert.equal(fs.existsSync(path.join(rootDir, page)), true, `消息业务路由缺失：${page}`)
}

const appConfig = read('src/app.config.ts')
const config = read('config/index.ts')
const runtime = requiredPages.map(read).join('\n')

for (const route of ['whisper-list', 'whisper-detail', 'private-list', 'private-chat', 'channel']) {
  assert.match(appConfig, new RegExp(`['"]${route}['"]`), `消息分包必须注册 ${route}`)
}
assert.match(config, /MINIAPP_MESSAGE_PROVIDER/, '编译配置必须暴露 MINIAPP_MESSAGE_PROVIDER')
assert.match(config, /mock/, '消息 Provider 默认必须为 mock')

const designIds = [
  '626cd513-005e-4df8-8456-b5280872ba23',
  '4eefc2dd-05c7-4a0c-b095-f252741f3781',
  '955469c9-c067-4f6f-97c8-57fcb7fb6ee4',
  '57f51864-59c3-4deb-b990-0d946ed5275c',
  '797ff271-e45a-4262-bd99-9ddb58bfad56',
  '60f5f2a4-ed1b-4a73-8291-ce65dca97a21',
  '0a48d19f-b05f-40d0-8f14-f34bd131a50d',
  'da4cd120-0250-4b6c-9d10-7704106317a2',
  'aabf0ea4-b22c-4a5c-afc5-f48f291a4046',
  '798b68f9-fda4-4b5d-aca4-b363c29407e3',
  'e3ab4fcf-8f3a-44da-b997-e86d13a295fc',
  '4a0eaf37-162c-409a-ba83-a62eed00e9c4',
  '5e8feaf3-cd84-4ea5-93ba-b4e181b92a17',
  '38ecd723-33cd-4961-9b50-59d8c601a1ad',
  'ff867af1-fc44-45b9-b2bc-0f81e51187f9',
]
const sceneRegistryPath = 'src/mocks/message/designScenes.ts'
assert.equal(
  fs.existsSync(path.join(rootDir, sceneRegistryPath)),
  true,
  '必须存在 15 稿设计状态注册表'
)
const sceneRegistry = read(sceneRegistryPath)
for (const designId of designIds) {
  assert.match(sceneRegistry, new RegExp(designId), `设计状态注册表缺少 ${designId}`)
}

for (const copy of [
  '悄悄话',
  '私信',
  '申请我的',
  '我申请的',
  '全部删除',
  '官方小助手',
  '系统消息',
  '配对成功开启聊天',
  '重新发送',
  '立即申请',
  '联系客服',
  '社区规则',
]) {
  assert.match(runtime, new RegExp(copy), `消息 15 稿运行页面缺少文案：${copy}`)
}

assert.match(runtime, /<Input\b/, '私信输入态必须使用真实 Input')
assert.match(runtime, /onClick=|onConfirm=|onInput=/, '交互控件必须绑定真实事件')
assert.doesNotMatch(
  runtime,
  /lanhuapp\.com|alipic\.lanhuapp|\.lanhu-ref/,
  '运行代码禁止引用蓝湖 CDN 或参考图目录'
)
assert.doesNotMatch(runtime, /opacity\s*:\s*0(?:[;,}]|\b)/, '禁止透明点击热区')
assert.doesNotMatch(
  runtime,
  /backgroundImage[^\n]*(?:reference|screenshot|design|lanhu)/i,
  '禁止用整页设计截图充当页面背景'
)
assert.doesNotMatch(
  runtime,
  /position\s*:\s*['"]absolute['"][^\n]{0,240}onClick/,
  '禁止用绝对定位空白层覆盖截图冒充控件'
)

console.log('消息 15 稿路由、状态、交互与静态安全门禁通过')
