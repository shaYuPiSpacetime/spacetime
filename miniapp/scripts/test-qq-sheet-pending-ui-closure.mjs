import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(new URL('.', import.meta.url).pathname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const coins = read('src/pages/coins/index.tsx')
const detail = read('src/pages/coins/detail.tsx')
const interactions = read('src/pages/qianxun/interactions.tsx')
const myPosts = read('src/pages/qianxun/my-posts.tsx')
const profile = read('src/pages/profile/index.tsx')
const profileHook = read('src/hooks/useProfile.ts')
const tabbar = read('src/components/AppTabBar/index.tsx')
const uploadScript = read('scripts/upload-miniapp-oss-icons.mjs')

assert.match(coins, /function BalanceWatermarks/, '余额卡必须使用蓝湖几何水印组件')
assert.doesNotMatch(coins, /width: '246rpx',[\s\S]{0,100}borderRadius: '123rpx'/, '余额卡不得保留巨大半透明圆形')
assert.match(coins, /id="recharge-notice-card"[\s\S]{0,220}height: '570rpx'/, '充值须知必须使用刷新稿高度')
assert.match(coins, /id="recharge-notice-body"[\s\S]{0,220}height: '310rpx'[\s\S]{0,180}fontSize: '26rpx'[\s\S]{0,80}lineHeight: '44rpx'/, '充值须知正文尺寸必须匹配刷新稿')
assert.match(coins, /padding: '386rpx 65rpx 0'/, '充值须知顶部锚点必须保持 386rpx')

for (const snippet of [
  "router.params.variant === 'empty'",
  'id="coin-empty-illustration"',
  'EmptyPlusMark left="34rpx" top="4rpx" size="27rpx"',
  'EmptyPlusMark left="16rpx" top="126rpx" size="20rpx"',
  'EmptyPlusMark left="270rpx" top="108rpx" size="20rpx"',
  'EmptyRingMark left="0" top="58rpx" size="28rpx"',
  'EmptyRingMark left="246rpx" top="28rpx" size="30rpx"',
  '>暂无记录</Text>',
]) {
  assert.ok(detail.includes(snippet), `千寻币空态缺少刷新稿证据：${snippet}`)
}

for (const source of [interactions, myPosts]) {
  assert.match(source, /miniappOssIcons\.qianxunPostGuideBg/, '发布引导卡必须使用蓝湖书本切图')
  assert.match(source, /width: '650rpx'[\s\S]{0,80}height: '188rpx'/, '发布引导卡必须匹配 650×188rpx')
}
assert.match(uploadScript, /qianxunPostGuideBg: 'src\/assets\/lanhu\/recommend\/slices\/post-guide-bg\.png'/, '书本切图必须进入 OSS 上传清单')

assert.match(profile, /id="profile-header-edit-area"[\s\S]{0,180}onClick=\{onEdit\}/, '头像资料区整体必须可点击')
assert.match(profile, /<StatsCard stats=\{stats\} boostText="提升人气" onHeart=\{goToHeart\}/, '统计卡必须绑定心动跳转')
assert.match(profile, /id=\{`profile-stat-\$\{index\}`\}[\s\S]{0,180}onClick=\{onHeart\}/, '每个统计项都必须拥有真实点击区')
assert.match(profileHook, /goToHeart: \(\) => void;/, '资料 Hook 必须暴露心动跳转')
assert.match(profileHook, /Taro\.switchTab\(\{ url: '\/pages\/community\/index' \}\)/, '统计项必须通过 switchTab 跳转心动')

assert.match(tabbar, /bottom: '0'/, '底部 Tab 必须固定在页面底部')
assert.match(tabbar, /height: '166rpx'/, '底部 Tab 高度必须保持蓝湖基线')

console.log('腾讯表格 26-31 行待处理 UI 闭环门禁通过')
