/* eslint-env node */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const projectRoot = path.resolve(__dirname, '..')

test('我的页面编辑资料文字使用 26rpx', () => {
  const profileSource = fs.readFileSync(path.join(projectRoot, 'src/pages/profile/index.tsx'), 'utf8')

  assert.match(
    profileSource,
    /data-role="profile-edit-copy"[\s\S]{0,160}fontSize: '26rpx'/,
    '我的页面编辑资料文字必须为 26rpx',
  )
})
