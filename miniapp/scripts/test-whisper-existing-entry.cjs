const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')

const compose = read('src/components/WhisperComposeSheet.tsx')
const types = read('src/types/message.ts')
const backendResponse = fs.readFileSync(
  path.resolve(root, '../backend/src/main/java/com/spacetime/miniapp/dto/response/WhisperPrecheckVO.java'),
  'utf8',
)
const backendService = fs.readFileSync(
  path.resolve(root, '../backend/src/main/java/com/spacetime/miniapp/service/impl/WhisperServiceImpl.java'),
  'utf8',
)

assert.match(types, /interface WhisperPrecheckResponse[\s\S]*existingWhisperNo:/,
  '预检查响应必须携带已有悄悄话编号')
assert.match(backendResponse, /private String existingWhisperNo;/,
  '后端预检查响应必须返回已有悄悄话编号')
assert.match(backendService, /EXISTING_PENDING/,
  '后端必须把已有待处理悄悄话作为可分流状态返回')
assert.match(compose, /existingWhisperNo/,
  '前端必须识别已有悄悄话编号')
assert.match(compose, /pages\/message\/whisper-detail\?whisperNo=/,
  '已有悄悄话必须进入详情页而不是继续新建')
assert.match(compose, /MATCHED_PRIVATE_CHAT|resolveConversationByPeerUserId/,
  '已匹配入口必须分流到私信会话')

console.log('whisper existing-entry regression contract passed')
