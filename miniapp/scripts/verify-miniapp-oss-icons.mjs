/* eslint-env node */

import crypto from 'node:crypto'
import fs from 'node:fs'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const miniappRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestFile = path.join(miniappRoot, 'src', 'constants', 'ossIcons.ts')
const assetsRoot = path.join(miniappRoot, 'src', 'assets')

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const filePath = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(filePath) : [filePath]
  })
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex')
}

function readManifest() {
  if (!fs.existsSync(manifestFile)) throw new Error(`OSS 图标清单不存在：${manifestFile}`)
  const source = fs.readFileSync(manifestFile, 'utf8')
  return [...source.matchAll(/([A-Za-z0-9_]+):\s*['"](https:\/\/[^'"]+)['"]/g)].map(match => ({
    key: match[1],
    url: match[2],
  }))
}

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, response => {
        const chunks = []
        response.on('data', chunk => chunks.push(chunk))
        response.on('end', () => {
          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`HTTP ${response.statusCode ?? 'unknown'}`))
            return
          }
          resolve(Buffer.concat(chunks))
        })
      })
      .on('error', reject)
  })
}

const localByName = new Map(walk(assetsRoot).map(filePath => [path.basename(filePath), filePath]))
const entries = readManifest()
let failed = 0

for (const entry of entries) {
  const localPath = localByName.get(path.basename(new URL(entry.url).pathname))
  if (!localPath) {
    console.error(`${entry.key}: 本地源文件不存在`)
    failed += 1
    continue
  }
  let remoteBody
  try {
    remoteBody = await download(entry.url)
  } catch (error) {
    console.error(
      `${entry.key}: OSS 下载失败（${error instanceof Error ? error.message : String(error)}）`
    )
    failed += 1
    continue
  }
  const remoteHash = sha256(remoteBody)
  const localHash = sha256(fs.readFileSync(localPath))
  if (remoteHash !== localHash) {
    console.error(`${entry.key}: OSS 字节校验不一致`)
    failed += 1
  }
}

if (failed > 0) {
  throw new Error(`OSS 图标校验失败：${failed}/${entries.length}`)
}

console.log(`OSS 图标字节校验通过：${entries.length}/${entries.length}`)
