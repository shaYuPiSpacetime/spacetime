const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('九项举报原因使用可滚动弹窗，详情、话题和用户举报不再超出原生菜单上限', () => {
  const reasons = read('../deploy/sql/prod/055_community_lanhu_dictionary.sql')
  const seededReasons = reasons.match(/'community_report_reason'\s*,/g) || []
  assert.ok(seededReasons.length > 6, '回归场景需要覆盖超过六项的举报原因')

  for (const file of [
    'src/pages/qianxun/post-detail.tsx',
    'src/pages/qianxun/topic.tsx',
    'src/pages/heart/user.tsx',
  ]) {
    const source = read(file)
    assert.match(source, /<CommunityReportReasonSheet\b/, `${file} 必须使用可滚动举报原因弹窗`)
    assert.doesNotMatch(source, /showActionSheet\(\{\s*itemList:\s*(?:meta\.)?reasons\.map\(/, `${file} 不得把全部原因交给原生菜单`)
    assert.doesNotMatch(source, /showActionSheet\(\{\s*itemList:\s*meta\.reportReasons\.map\(/, `${file} 不得把全部原因交给原生菜单`)
  }

  const sheet = read('src/components/CommunityReportReasonSheet.tsx')
  assert.match(sheet, /<ScrollView\s+scrollY/, '举报原因必须可滚动')
  assert.match(sheet, /reasons\.map\(/, '不能截断后台配置的举报原因')
  assert.match(sheet, /onReport\(reason\.code\)/, '必须提交所选原因的真实 code')
})

test('同城与动态详情共享的微信分享弹窗使文本本身居中', () => {
  const source = read('src/components/CommunityPostActionSheet.tsx')
  const style = read('src/components/CommunityPostActionSheet.scss')

  assert.match(source, /community-post-action-sheet__share-icon/, '分享图标必须独立于文字布局')
  assert.match(source, /community-post-action-sheet__share-label/, '分享文案必须独立居中')
  assert.match(style, /\.community-post-action-sheet__share-icon\s*\{[^}]*position:\s*absolute/s, '图标不得参与文字居中宽度计算')
  assert.match(style, /\.community-post-action-sheet__share-label\s*\{[^}]*text-align:\s*center/s, '分享文字须以整行宽度居中')
})
