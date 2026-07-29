/* global console */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = relativePath => readFileSync(resolve(root, relativePath), 'utf8')

const appConfig = read('src/app.config.ts')
const profileHook = read('src/hooks/useProfile.ts')
const service = read('src/services/promotion.ts')
const attributionService = read('src/services/promotionAttribution.ts')
const authService = read('src/services/auth.ts')
const prd01Service = read('src/services/prd01.ts')
const app = read('src/app.tsx')
const home = read('src/pages/promotion/invite-home.tsx')
const homeStyle = read('src/pages/promotion/invite-home.scss')
const records = read('src/pages/promotion/invite-records.tsx')
const recordsStyle = read('src/pages/promotion/invite-records.scss')
const rules = read('src/pages/promotion/invite-rules.tsx')
const rulesStyle = read('src/pages/promotion/invite-rules.scss')
const nativeNavigation = read('src/components/NativeNavigation.tsx')

const checks = [
  ['promotion 分包已注册', () => {
    assert.match(appConfig, /root:\s*['"]pages\/promotion['"]/)
    assert.match(appConfig, /pages:\s*\[['"]invite-home['"],\s*['"]invite-records['"],\s*['"]invite-rules['"]\]/)
  }],
  ['我的页入口真实跳转', () => {
    assert.match(profileHook, /navigateTo\(\{\s*url:\s*['"]\/pages\/promotion\/invite-home['"]/)
    assert.doesNotMatch(profileHook, /邀请好友功能即将开放/)
  }],
  ['小程序接口使用新版聚合契约', () => {
    assert.match(service, /\/miniapp\/promotion\/invite\/home/)
    assert.match(service, /\/miniapp\/promotion\/invite\/records/)
    assert.match(service, /\/miniapp\/app\/h5-content\/invite_rules/)
  }],
  ['启动和页面入口接入匿名推广归因', () => {
    assert.match(app, /captureEntryPromotionSource\(options\.query/)
    assert.match(app, /captureEntryPromotionSource\(options\?\.query/)
    assert.match(home, /capturePromotionSource\(/)
    assert.match(attributionService, /createInviteSourceTrace\(/)
    assert.match(attributionService, /getOrCreateVisitorKey\(/)
    assert.match(attributionService, /PENDING_TRACE_NOS_STORAGE/)
    assert.match(attributionService, /PENDING_SOURCES_STORAGE/)
    assert.match(attributionService, /pendingSources\.map\(source => capturePromotionSource\(source,\s*true\)\)/)
  }],
  ['登录请求一次性携带并成功后清理推广 traceNo', () => {
    assert.match(authService, /waitForPromotionAttributionCapture\(\)/)
    assert.match(authService, /getPendingPromotionTraceNos\(\)/)
    assert.match(authService, /clearPendingPromotionTraceNos\(\)/)
    assert.match(prd01Service, /promotionTraceNos/)
  }],
  ['首页包含蓝湖五个固定区块', () => {
    for (const text of ['好友同行·奖励加倍', '邀请注册得千寻币', '邀请进度', '邀请记录', '邀请规则']) {
      assert.match(home, new RegExp(text))
    }
  }],
  ['首页覆盖蓝湖有记录、空记录和完成阶段三态', () => {
    assert.match(home, /\.ladders\.map|ladders\.map/)
    assert.match(home, /\.recentRecords\.slice\(0,\s*3\)|recentRecords\.slice\(0,\s*3\)/)
    assert.match(home, /recentRecords\.length/)
    assert.match(home, /promotion-records-card--empty/)
    assert.match(home, /promotion-records-empty__art/)
    assert.match(home, /progressCurrent|successCount/)
    assert.match(homeStyle, /\.promotion-records-card--empty/)
    assert.match(homeStyle, /\.promotion-records-empty__art/)
  }],
  ['首页使用蓝湖独立插画与代码图标，不使用整页截图', () => {
    assert.match(home, /inviteHero/)
    assert.match(home, /inviteEmpty/)
    for (const iconClass of [
      'promotion-equation__glyph--share',
      'promotion-equation__glyph--person',
      'promotion-equation__glyph--coin',
    ]) {
      assert.match(home, new RegExp(iconClass))
      assert.match(homeStyle, new RegExp(iconClass))
    }
    assert.doesNotMatch(home, /蓝湖基线|SketchCover|design\\.png/)
  }],
  ['首页支持分享降级', () => {
    assert.match(home, /useShareAppMessage/)
    assert.match(home, /resolveInviteShareTarget/)
    assert.match(home, /nativeShareReady/)
    assert.match(home, /setClipboardData/)
    assert.match(home, /邀请链接已复制，请发送给好友/)
  }],
  ['首页不存在普通二维码与截图伪交互', () => {
    for (const forbidden of ['保存二维码', '我的邀请码', '千寻币能做什么', 'PRD-07-01-移动端邀请首页-UI基线.png']) {
      assert.doesNotMatch(home, new RegExp(forbidden))
    }
    assert.doesNotMatch(homeStyle, /opacity:\s*0(?:[;}]|$)/)
  }],
  ['推广 H5 使用可缩放 px 源值且统一导航区分平台单位', () => {
    for (const [name, source] of [
      ['邀请首页', homeStyle],
      ['邀请记录', recordsStyle],
      ['邀请规则', rulesStyle],
    ]) {
      assert.doesNotMatch(source, /-?\d+(?:\.\d+)?rpx/, `${name} 不得直接使用 rpx，否则 H5 会按像素放大两倍`)
    }
    assert.match(nativeNavigation, /const styleUnit = isWeapp \? 'rpx' : 'px'/)
    assert.match(nativeNavigation, /const styleMetric = \(value: number\) => \(isWeapp \? value : value \/ 2\)/)
    assert.equal(
      (nativeNavigation.match(/width:\s*isWeapp \? metricValue\(750\) : '100%'/g) || []).length,
      2,
      'H5 导航容器和标题必须随 375/414 视口铺满，不能固定为 375px',
    )
  }],
  ['邀请记录页按蓝湖展示汇总和扁平奖励流', () => {
    assert.match(records, /getInviteHome/)
    assert.match(records, /promotion-records-summary/)
    assert.match(records, /flatMap|toTimelineItems/)
    assert.match(records, /ladder_bonus/)
    assert.match(records, /promotion-record-item__gift/)
    assert.match(recordsStyle, /promotion-record-item__gift/)
    assert.doesNotMatch(records, /promotion-record-tabs/)
    assert.doesNotMatch(records, /toggleExpanded/)
    for (const forbidden of ['冻结', '无效', '风险']) {
      assert.doesNotMatch(records, new RegExp(forbidden))
    }
  }],
  ['活动说明页匹配蓝湖标题并覆盖当前、缓存和不可用三态', () => {
    assert.match(rules, /title="活动说明"/)
    assert.match(rules, /活动规则说明/)
    assert.match(rules, /className="promotion-rules-document"/)
    for (const text of ['当前内容加载失败，正在展示最近成功版本', '内容暂不可查看', '重新加载', '返回邀请首页']) {
      assert.match(rules, new RegExp(text))
    }
    assert.match(rules, /sanitizeRichTextSnapshot/)
    assert.doesNotMatch(rules, /dangerouslySetInnerHTML|eval\(/)
  }],
]

let passed = 0
for (const [name, check] of checks) {
  try {
    check()
    passed += 1
    console.log(`PASS ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}`)
    throw error
  }
}

console.log(`PRD-07 小程序静态门禁通过：${passed}/${checks.length}`)
