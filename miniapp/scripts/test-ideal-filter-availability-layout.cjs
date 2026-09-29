const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const source = fs.readFileSync(
  path.resolve(__dirname, '../src/pages/prd08/ideal/filter/index.tsx'),
  'utf8'
)

test('理想型仅展示当前资料可用的依赖条件', () => {
  assert.ok(/if \(!condition\.available\) continue/.test(source), '不可用条件应隐藏')
  assert.ok(
    /setSelectedConditionCodes\(\(metaData\.lastConditionCodes \|\| \[\]\)\.filter/.test(source),
    '历史条件回显应过滤不可用项'
  )
})

test('理想型筛选选项与固定操作区分离', () => {
  assert.ok(/height: 'calc\(100vh - 298rpx\)'/.test(source), '选项滚动区应为底部操作区预留空间')
  assert.ok(/id="ideal-filter-action-footer"/.test(source), '应存在独立操作区')
  assert.ok(/bottom: '166rpx'/.test(source), '操作区应在底部导航之上')
})

test('理想型修改共享位置年龄时先保存偏好再查询且允许仅用基础条件', () => {
  assert.ok(/saveRecommendPreferences\(/.test(source), '修改共享基础条件后应先保存偏好')
  assert.ok(source.indexOf('saveRecommendPreferences(') < source.indexOf('createIdealSearch({'), '理想型查询应使用更新后的偏好版本')
  assert.ok(!/!selectedConditionCodes\.length/.test(source), '不应强迫选择额外的理想型标签')
})
