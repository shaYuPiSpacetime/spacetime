/* global console */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const miniappRoot = path.resolve(__dirname, '..')

function read(relativePath) {
  return fs.readFileSync(path.join(miniappRoot, relativePath), 'utf8')
}

const affectedPages = [
  'src/features/qianxun/QianxunFamilyPage.tsx',
  'src/features/qianxun/QianxunZhiyinTab.tsx',
  'src/pages/coins/detail.tsx',
  'src/pages/community/index.tsx',
  'src/pages/heart/mutual.tsx',
  'src/pages/membership/records.tsx',
  'src/pages/promotion/invite-records.tsx',
  'src/pages/qianxun/interactions.tsx',
  'src/pages/qianxun/my-posts.tsx',
  'src/pages/qianxun/post-detail.tsx',
  'src/pages/qianxun/topic.tsx',
  'src/pages/qianxun/topics.tsx',
  'src/pages/search/result.tsx',
  'src/pages/settings/announcements.tsx',
]

test('全局空态不得再被统一强制垂直居中', () => {
  assert.equal(
    fs.existsSync(path.join(miniappRoot, 'src/components/CenteredEmptyState.tsx')),
    false,
    '应移除错误引入的全局垂直居中空态组件',
  )

  for (const relativePath of affectedPages) {
    assert.doesNotMatch(read(relativePath), /CenteredEmptyState/, `${relativePath} 不得继续接入全局垂直居中容器`)
  }
})

test('诚意贴与同城恢复改动前的顶部留白节奏', () => {
  assert.match(
    read('src/features/qianxun/QianxunFamilyPage.tsx'),
    /width:\s*'700rpx',\s*paddingTop:\s*'128rpx'/,
    '成家关注/同城空态应恢复 128rpx 顶部留白',
  )
  assert.match(
    read('src/features/qianxun/QianxunZhiyinTab.tsx'),
    /paddingTop:\s*'120rpx',\s*display:\s*'flex',\s*flexDirection:\s*'column',\s*alignItems:\s*'center'/,
    '知音诚意贴/悦目空态应恢复 120rpx 顶部留白',
  )
})

test('其余受影响空态恢复各页面原有定位，不再使用整屏高度计算', () => {
  const expectedOffsets = [
    ['src/pages/coins/detail.tsx', /paddingTop:\s*'262rpx'/],
    ['src/pages/community/index.tsx', /minHeight:\s*'520rpx'[\s\S]{0,180}paddingTop:\s*state === 'empty' \? '128rpx'/],
    ['src/pages/heart/mutual.tsx', /minHeight:\s*'520rpx'[\s\S]{0,180}justifyContent:\s*'center'/],
    ['src/pages/membership/records.tsx', /marginTop:\s*'220rpx'/],
    ['src/pages/qianxun/interactions.tsx', /paddingTop:\s*'126rpx'/],
    ['src/pages/qianxun/my-posts.tsx', /paddingTop:\s*'102rpx'/],
    ['src/pages/qianxun/post-detail.tsx', /paddingTop:\s*'55rpx'/],
    ['src/pages/qianxun/topic.tsx', /paddingTop:\s*'84rpx'/],
    ['src/pages/settings/announcements.tsx', /<Text className="settings-empty">暂无公告<\/Text>/],
  ]

  for (const [relativePath, pattern] of expectedOffsets) {
    assert.match(read(relativePath), pattern, `${relativePath} 应恢复改动前的局部空态定位`)
  }

  assert.match(
    read('package.json'),
    /"validate:empty-state-centering":\s*"node --test scripts\/test-empty-state-layout-regression\.cjs"/,
    '发布构建中的原命令入口应已改为执行原布局回归测试',
  )
})

test('心动与访客空态复用同城插画并保持靠上布局', () => {
  const source = read('src/pages/community/index.tsx')
  assert.equal((source.match(/illustration=\{miniappOssIcons\.qianxunEmptyFollowing\}/g) || []).length, 2)
  assert.doesNotMatch(source, /flex:\s*state === 'empty' \? 1 : undefined/)
  assert.match(source, /width:\s*'334rpx',\s*height:\s*'254rpx'/)
  assert.match(source, /marginTop:\s*illustration \? '30rpx'/)
})

console.log('空态原布局回归测试完成')
