const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

test('官方小助手统一接入微信原生客服且只使用正式动作值', () => {
  const channel = read('src/pages/message/channel.tsx')
  const types = read('src/types/message.ts')
  const fixtures = read('src/mocks/message/fixtures.ts')

  assert.equal((channel.match(/openType="contact"/g) || []).length, 2)
  assert.match(channel, /actionType === 'wechat_service'/)
  assert.doesNotMatch(channel, /customer_service/)
  assert.doesNotMatch(channel, /客服工作时间/)
  assert.match(types, /actionType\?: 'wechat_service' \| 'community_rules' \| 'navigate'/)
  assert.doesNotMatch(types, /customer_service/)
  assert.match(fixtures, /actionType: 'wechat_service'/)
})
