/* eslint-env node */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const miniappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(miniappRoot, '..')
const sourceFile = path.join(
  repoRoot,
  'docs/验收报告/截图证据/2026-07-22-千寻66稿/蓝湖基线/178.png'
)
const outputDir = path.join(miniappRoot, 'src/assets/lanhu/qianxun-community')
const expectedSourceSha256 = '616775894c5361de638b3b943ae643f0e2c701d9bfaeae16c76924853fafdeed'

// 蓝湖原图为 4× 设计图；裁切结果保持原始像素，不缩放、不转换格式。
const slices = Object.freeze([
  { fileName: 'gender-female.png', x: 497, y: 606, width: 64, height: 64 },
  { fileName: 'gender-male.png', x: 495, y: 2296, width: 64, height: 64 },
  { fileName: 'whisper.png', x: 98, y: 2030, width: 104, height: 104 },
  { fileName: 'comment.png', x: 1074, y: 2048, width: 64, height: 64 },
  { fileName: 'like-active.png', x: 1264, y: 2050, width: 64, height: 64 },
  { fileName: 'like.png', x: 1264, y: 4040, width: 64, height: 64 },
])

if (!fs.existsSync(sourceFile)) throw new Error(`缺少蓝湖基线原图：${sourceFile}`)

const sourceSha256 = crypto.createHash('sha256').update(fs.readFileSync(sourceFile)).digest('hex')
if (sourceSha256 !== expectedSourceSha256) {
  throw new Error(`蓝湖基线原图校验失败：${sourceSha256}`)
}

fs.mkdirSync(outputDir, { recursive: true })

for (const slice of slices) {
  const targetFile = path.join(outputDir, slice.fileName)
  const result = spawnSync('/usr/bin/sips', [
    '-c', String(slice.height), String(slice.width),
    '--cropOffset', String(slice.y), String(slice.x),
    sourceFile,
    '--out', targetFile,
  ], { encoding: 'utf8' })
  if (result.status !== 0) {
    throw new Error(result.stderr || `${slice.fileName} 无损裁切失败`)
  }
}

console.log(`已从蓝湖 4× 原图无损提取 ${slices.length} 张千寻动态卡图标。`)

