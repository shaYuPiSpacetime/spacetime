/* eslint-env node */

import crypto from 'node:crypto'
import fs from 'node:fs'
import https from 'node:https'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const miniappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const iconDir = path.join(miniappRoot, 'src/assets/icons')
const sourceFile = path.join(iconDir, '.tab-work-active-lanhu-source.png')
const targetFile = path.join(iconDir, 'tab-work-active.png')
const sourceUrl = 'https://alipic.lanhuapp.com/SketchCover9c4b24f339620cfcababa2d6ab3788d7e8154d3936488c6b710919cda0114a3f'
const expectedSha256 = 'd9c8c24e2aed2d40f9314b314e366f997eb26754b4f6764ae96d8b4f7c9825a5'

function download(url, filePath) {
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume()
        download(response.headers.location, filePath).then(resolve, reject)
        return
      }
      if (response.statusCode !== 200) {
        response.resume()
        reject(new Error(`蓝湖原图下载失败：HTTP ${response.statusCode ?? 'unknown'}`))
        return
      }
      const stream = fs.createWriteStream(filePath)
      response.pipe(stream)
      stream.on('finish', () => stream.close(resolve))
      stream.on('error', reject)
    }).on('error', reject)
  })
}

fs.mkdirSync(iconDir, { recursive: true })
await download(sourceUrl, sourceFile)

try {
  const result = spawnSync('/usr/bin/sips', [
    '-c', '70', '80',
    '--cropOffset', '3054', '396',
    sourceFile,
    '--out', targetFile,
  ], { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || '蓝湖心动点亮图标无损裁切失败')

  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(targetFile)).digest('hex')
  if (sha256 !== expectedSha256) {
    throw new Error(`蓝湖心动点亮图标校验失败：${sha256}`)
  }
} finally {
  fs.rmSync(sourceFile, { force: true })
}

console.log('已从蓝湖 4x 原图无损提取 80×70 心动点亮态图标。')
