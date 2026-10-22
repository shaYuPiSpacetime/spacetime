const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const read = relative => fs.readFileSync(path.join(__dirname, '..', relative), 'utf8')

const types = read('src/types/message.ts')
const sheet = read('src/components/CommunityWhisperSheet.tsx')
const compose = read('src/components/WhisperComposeSheet.tsx')
const detail = read('src/pages/message/whisper-detail.tsx')

assert.match(types, /'school_free'\s*\|\s*'vip_free'\s*\|\s*'coin'/,
  '创建结果必须声明 school_free 费用类型')
assert.match(sheet, /precheck\?\.payType === 'school_free'/,
  '统一悄悄话弹层必须按 payType 识别同校免费')
assert.match(sheet, /同校用户本次免费，不消耗会员次数/,
  '同校免费不能误展示为会员免费次数')
assert.match(compose, /result\.payType === 'school_free'/,
  '发送成功提示必须区分同校免费')
assert.match(compose, /getApiErrorCode\(error\) === 30021[\s\S]*precheckWhisper/,
  '统一悄悄话弹层报价变化后必须清理旧报价并重新预检')
assert.match(detail, /payType=\{quote\?\.payType\}/,
  '悄悄话详情发起入口必须透传费用类型')

console.log('same-school free whisper miniapp contract passed')
