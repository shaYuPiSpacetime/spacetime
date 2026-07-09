import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const refDir = path.join(rootDir, '.lanhu-ref/lanhu-full-2026-07-07')
const manifestPath = path.join(refDir, 'manifest.json')
const reportPath = path.join(refDir, 'download-report.md')
const missingSlicesPath = path.join(refDir, 'missing-slices.md')
const trackedMissingSliceLedgerPath = path.resolve(rootDir, '../docs/验收报告/2026-07-08-商业化蓝湖缺失切图台账.md')
const imageDir = path.join(refDir, 'images')
const requiredMissingSliceNotes = [
  '## 商业化页面缺失切图复查',
  '禁止从整页参考图热区硬裁为运行切图',
  '千寻币用途：已使用 MCP 整卡切片，未获得 8 个独立 icon 切片',
  '千寻币明细-暂无数据：totalSlices=0，缺空态插画独立切图',
  '会员记录：totalSlices=0，缺会员菱形图标和退款章切图',
  '会员记录详情：仅返回纯色矩形 shape，不接入业务切图',
  '会员中心状态页 60/61/62/63：totalSlices=0，缺无文案会员卡背景切图',
  '订阅管理：totalSlices=0，缺会员卡背景和 STEP1/STEP2 微信流程截图切图',
  '微信支付态 65/71：totalSlices=0，微信支付键盘为微信原生 UI',
  '底部协议弹层 76/79：totalSlices=0，按整页参考图采样手写',
  '会员套餐第 4 张卡片完整展开：蓝湖首屏只露出右缘，缺完整展开标注',
]

const requiredPlaceholderAnchorNotes = [
  '## 当前结构化占位锚点',
  '千寻币明细空态：浅灰插画整体 `left:226rpx/top:526rpx/298rpx*254rpx`',
  '会员记录占位：会员菱形金色主体 `left:51rpx/top:229rpx/48rpx*38rpx`',
  '会员卡头像金边：60/61/62/78 为 `left:52rpx/top:241rpx/92rpx*92rpx`，63 为 `left:51rpx/top:241rpx/92rpx*92rpx`',
  '订阅管理 STEP 图：STEP1 白底图 `left:51rpx/top:1136rpx/340.5rpx*230rpx`，STEP2 白底图 `left:51rpx/top:1496rpx/341.5rpx*390rpx`',
  '微信支付键盘：微信原生系统 UI，不绘制数字键盘；demo fallback 只保留支付成功/取消动作',
]

const requiredIndexContinuityNote =
  '蓝湖全量设计稿 index 连续性：manifest.index 已按 1..93 严格连续校验'

function assertFile(filePath, label) {
  assert.ok(fs.existsSync(filePath), `缺少${label}: ${path.relative(rootDir, filePath)}`)
}

assertFile(manifestPath, '蓝湖全量 manifest')
assertFile(reportPath, '蓝湖下载报告')
assertFile(missingSlicesPath, '蓝湖缺失切片清单')
assertFile(trackedMissingSliceLedgerPath, '仓库内商业化缺失切图台账')
assert.ok(fs.existsSync(imageDir), '缺少蓝湖全量图片目录: .lanhu-ref/lanhu-full-2026-07-07/images')

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
assert.equal(manifest.projectName, '时空邂逅0625', '蓝湖项目名不匹配')
assert.equal(manifest.totalDesigns, 93, '蓝湖全量稿数量必须为 93')
assert.ok(Array.isArray(manifest.designs), 'manifest.designs 必须是数组')
assert.equal(manifest.designs.length, 93, 'manifest.designs 必须包含 93 张稿')

const indexes = new Set()
for (const design of manifest.designs) {
  assert.equal(typeof design.index, 'number', '设计稿缺少 index')
  assert.equal(typeof design.id, 'string', `第 ${design.index} 张设计稿缺少 id`)
  assert.equal(typeof design.name, 'string', `第 ${design.index} 张设计稿缺少 name`)
  assert.equal(typeof design.sourceUrl, 'string', `${design.name} 缺少 sourceUrl`)
  assert.equal(typeof design.localPath, 'string', `${design.name} 缺少 localPath`)
  indexes.add(design.index)
  assertFile(path.join(rootDir, design.localPath), `${design.name} 本地参考图`)
}

assert.equal(indexes.size, 93, '设计稿 index 不应重复')
assert.deepEqual(
  [...indexes].sort((a, b) => a - b),
  Array.from({ length: manifest.totalDesigns }, (_, index) => index + 1),
  '设计稿 index 必须严格连续覆盖 1 到 93',
)

const imageFiles = fs
  .readdirSync(imageDir)
  .filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
assert.equal(imageFiles.length, 93, '本地参考图文件数量必须为 93')

const report = fs.readFileSync(reportPath, 'utf8')
assert.ok(report.includes('总设计稿: 93'), '下载报告缺少总设计稿数量')
assert.ok(report.includes('下载成功: 93'), '下载报告必须记录 93 张下载成功')
assert.ok(report.includes(requiredIndexContinuityNote), '下载报告必须记录蓝湖全量 index 连续性校验依据')

const missingSlices = fs.readFileSync(missingSlicesPath, 'utf8')
const trackedMissingSliceLedger = fs.readFileSync(trackedMissingSliceLedgerPath, 'utf8')
assert.ok(
  trackedMissingSliceLedger.includes(requiredIndexContinuityNote),
  '仓库内缺失切图台账必须记录蓝湖全量 index 连续性校验依据',
)
for (const note of requiredMissingSliceNotes) {
  assert.ok(missingSlices.includes(note), `缺失切片清单必须登记商业化缺口和禁止硬裁边界: ${note}`)
  assert.ok(trackedMissingSliceLedger.includes(note), `仓库内缺失切图台账必须登记商业化缺口和禁止硬裁边界: ${note}`)
}

for (const note of requiredPlaceholderAnchorNotes) {
  assert.ok(missingSlices.includes(note), `缺失切片清单必须登记当前结构化占位锚点: ${note}`)
  assert.ok(trackedMissingSliceLedger.includes(note), `仓库内缺失切图台账必须登记当前结构化占位锚点: ${note}`)
}

console.log('蓝湖全量参考图校验通过')
