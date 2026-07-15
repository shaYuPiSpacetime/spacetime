/* eslint-env node */

import fs from 'node:fs'
import https from 'node:https'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const miniappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = path.join(miniappRoot, 'src/assets/lanhu/settings')
const sourceFile = path.join(outputDir, 'about-design-source.png')
const targetFile = path.join(outputDir, 'about-logo.png')
const sourceUrl = 'https://alipic.lanhuapp.com/SketchCover12dd35e71fa5fc2c5aa6bbaeebfefd37d6b5ba8d78a910027fb7f22f2aca35a9'

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

fs.mkdirSync(outputDir, { recursive: true })
await download(sourceUrl, sourceFile)

const result = spawnSync('/usr/bin/sips', [
  '-c', '256', '256',
  '--cropOffset', '626', '622',
  sourceFile,
  '--out', targetFile,
], { encoding: 'utf8' })

fs.rmSync(sourceFile, { force: true })
if (result.status !== 0) {
  throw new Error(result.stderr || '蓝湖 Logo 无损裁切失败')
}

console.log('已从蓝湖 2x 原图提取 256×256 设置页 Logo。')
