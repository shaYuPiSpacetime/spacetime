/* eslint-env node */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '../src/pages')
const read = name => fs.readFileSync(path.join(root, name), 'utf8')
const contains = (source, pattern, message) => assert.ok(pattern.test(source), message)

test('公开资料直进与我的喜欢的人入口，均由服务端未解锁错误触发报价确认', () => {
  const source = read('heart/user.tsx')
  contains(source, /getApiErrorCode\(error\) !== 20003/, '按服务端业务错误码识别受限资料')
  contains(source, /quoteRecommendReplayProfile\(targetUserId\)/, '应获取实时服务端报价')
  contains(source, /resolveReplayProfileStep\(quote\.memberAccess, quote\)/, '按会员、已解锁、余额判断下一步')
  contains(source, /if \(!modal\.confirm\) return false[\s\S]*?unlockRecommendReplayProfile\(targetUserId/, '用户确认前不得扣费')
  contains(source, /getPublicProfile\(targetUserId\)[\s\S]*?requestProfileAccess\(\)[\s\S]*?getPublicProfile\(targetUserId\)/, '解锁后重新取服务端公开资料')
  assert.doesNotMatch(source, /sourceScene\s*===\s*'fate'\s*&&\s*getApiErrorCode/, '资料访问不能信任路由参数')
})

test('推荐卡点击主页前等待浏览记录落库，记录失败不放行', () => {
  const source = read('recommend/index.tsx')
  contains(source, /const openCandidateProfile = async \(\) =>/, '须使用受控入口')
  contains(source, /if \(!await awaitCurrentCandidateView\(\)\) \{[\s\S]*?return[\s\S]*?Taro\.navigateTo/, '浏览记录落库失败不能打开主页')
  contains(source, /onOpen=\{\(\) => void openCandidateProfile\(\)\}/, '推荐卡入口须调用受控入口')
})
