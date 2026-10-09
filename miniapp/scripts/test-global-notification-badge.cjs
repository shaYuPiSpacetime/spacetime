const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')

test('global numeric notification badges share the 22rpx on 32rpx specification', () => {
  const badge = read('src/components/NotificationBadge/index.tsx')

  assert.match(badge, /minWidth: designUnit\(32\)/)
  assert.match(badge, /height: designUnit\(32\)/)
  assert.match(badge, /borderRadius: designUnit\(16\)/)
  assert.match(badge, /background: '#EE2525'/)
  assert.match(badge, /fontSize: designUnit\(22\)/)
  assert.match(badge, /lineHeight: designUnit\(32\)/)
  assert.match(badge, /Taro\.ENV_TYPE\.WEAPP \? `\$\{value\}rpx` : `\$\{value \/ 2\}px`/)
  assert.match(badge, /value > 99 \? '99\+' : String\(Math\.floor\(value\)\)/)
})

test('all numeric notification badge surfaces use the shared component', () => {
  const consumers = [
    'src/components/AppTabBar/index.tsx',
    'src/features/verification/VerificationEntryView.tsx',
    'src/pages/chat/index.tsx',
    'src/pages/community/index.tsx',
    'src/pages/message/private-list.tsx',
    'src/pages/message/shared.tsx',
  ]

  for (const consumer of consumers) {
    assert.match(read(consumer), /NotificationBadge/, `${consumer} 未使用全局数字角标组件`)
  }

  const legacyStyles = read('src/pages/message/message.scss')
  assert.doesNotMatch(legacyStyles, /\.message-unread\s*\{/, '消息分包仍保留旧的 13px 数字角标')
  assert.doesNotMatch(read('src/pages/chat/index.tsx'), /minWidth: designRpx\((20|28)\)/, '消息首页仍保留旧尺寸数字角标')
  assert.doesNotMatch(read('src/components/AppTabBar/index.tsx'), /minWidth: '(26|30)rpx'/, '底部栏仍保留旧尺寸数字角标')
})
