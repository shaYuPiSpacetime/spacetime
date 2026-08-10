import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const miniappRoot = path.resolve(__dirname, '..')

function read(relativePath) {
  return fs.readFileSync(path.join(miniappRoot, relativePath), 'utf8')
}

const profilePage = read('src/pages/profile/index.tsx')
const membershipPage = read('src/pages/membership/index.tsx')

assert.match(
  profilePage,
  /id="profile-header-edit-area"[\s\S]{0,260}height: '124rpx'/,
  '我的头像资料区必须覆盖完整头像和资料进度标识'
)
assert.match(
  profilePage,
  /id="profile-nickname-row"[\s\S]{0,180}left: '124rpx'[\s\S]{0,80}top: '2rpx'/,
  '昵称必须落在蓝湖 149rpx 横坐标和 188rpx 纵坐标'
)
assert.match(
  profilePage,
  /id="profile-sub-info"[\s\S]{0,180}left: '124rpx'[\s\S]{0,80}top: '58rpx'/,
  '地区年龄信息必须落在蓝湖 149rpx 横坐标和 244rpx 纵坐标'
)
assert.match(
  profilePage,
  /id="profile-avatar-frame"[\s\S]{0,240}width: '110rpx'[\s\S]{0,80}height: '110rpx'[\s\S]{0,80}borderRadius: '55rpx'/,
  '头像底座必须按蓝湖可视直径收窄，避免挤压右侧文字'
)
assert.match(
  profilePage,
  /id="profile-avatar-image"[\s\S]{0,160}width: '98rpx'[\s\S]{0,80}height: '98rpx'[\s\S]{0,80}borderRadius: '49rpx'/,
  '头像图片必须保持蓝湖 49px 可视直径'
)

assert.match(
  membershipPage,
  /function splitDurationLabel\(/,
  '会员时长必须拆分数字与单位，不能整段使用大号粗体'
)
assert.match(
  membershipPage,
  /data-ui="membership-plan-duration-count"[\s\S]{0,180}fontSize: '42rpx'[\s\S]{0,100}fontWeight: 500/,
  '套餐时长数字必须使用蓝湖 21px 中等字重'
)
assert.match(
  membershipPage,
  /data-ui="membership-plan-duration-unit"[\s\S]{0,180}fontSize: '26rpx'[\s\S]{0,100}fontWeight: 500/,
  '套餐时长单位必须使用蓝湖 13px 中等字重'
)
assert.match(
  membershipPage,
  /data-ui="membership-plan-monthly-price"[\s\S]{0,180}fontSize: '26rpx'[\s\S]{0,100}fontWeight: 500/,
  '月均价必须使用蓝湖 13px 中等字重'
)
assert.match(
  membershipPage,
  /data-ui="membership-plan-original-price"[\s\S]{0,180}fontSize: '18rpx'/,
  '原价必须使用蓝湖 9px 常规字号'
)
assert.match(
  membershipPage,
  /id="membership-pay-price"[\s\S]{0,180}fontSize: '24rpx'[\s\S]{0,100}fontWeight: 500/,
  '底部实付金额必须使用蓝湖 12px 中等字重'
)
assert.match(
  membershipPage,
  /id="membership-agreement-row"[\s\S]{0,260}flexWrap: 'nowrap'/,
  '会员协议必须锁定单行布局'
)
assert.match(
  membershipPage,
  /id="membership-agreement-line"[\s\S]{0,220}fontSize: '22rpx'[\s\S]{0,160}whiteSpace: 'nowrap'/,
  '会员协议必须使用蓝湖 11px 字号且不可折行'
)
assert.doesNotMatch(
  membershipPage,
  /连续订阅会员服务协议|享568订阅优惠价/,
  '一次性会员购买不得混入连续订阅文案'
)

console.log('腾讯表格“我的/会员中心”蓝湖细节闭环门禁通过')
