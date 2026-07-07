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
const imageDir = path.join(refDir, 'images')

function assertFile(filePath, label) {
  assert.ok(fs.existsSync(filePath), `缺少${label}: ${path.relative(rootDir, filePath)}`)
}

assertFile(manifestPath, '蓝湖全量 manifest')
assertFile(reportPath, '蓝湖下载报告')
assertFile(missingSlicesPath, '蓝湖缺失切片清单')
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
assert.ok(indexes.has(1) && indexes.has(93), '设计稿 index 应覆盖 1 到 93')

const imageFiles = fs
  .readdirSync(imageDir)
  .filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
assert.equal(imageFiles.length, 93, '本地参考图文件数量必须为 93')

const report = fs.readFileSync(reportPath, 'utf8')
assert.ok(report.includes('总设计稿: 93'), '下载报告缺少总设计稿数量')
assert.ok(report.includes('下载成功: 93'), '下载报告必须记录 93 张下载成功')

console.log('蓝湖全量参考图校验通过')
