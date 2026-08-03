/* eslint-env node */

import { createHash, createHmac } from 'node:crypto'
import fs from 'node:fs'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const miniappRoot = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(miniappRoot, '..')
const envFile = path.join(repoRoot, 'backend', '.env.local')

class OssUploadError extends Error {
  constructor(statusCode, code, suggestedEndpoint) {
    super(`OSS 上传失败：HTTP ${statusCode ?? 'unknown'}${code ? ` (${code})` : ''}`)
    this.name = 'OssUploadError'
    this.suggestedEndpoint = suggestedEndpoint
  }
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`缺少 OSS 本地配置文件：${filePath}`)
  }

  const values = {}
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const normalized = line.trim()
    if (!normalized || normalized.startsWith('#')) continue
    const match = normalized.match(/^(?:export\s+)?([A-Z0-9_]+)=(.*)$/)
    if (!match) continue
    const [, key, rawValue] = match
    values[key] = rawValue.trim().replace(/^(["'])(.*)\1$/, '$2')
  }
  return values
}

function requiredEnv(env, key) {
  const value = env[key]
  if (!value) throw new Error(`backend/.env.local 缺少 ${key}`)
  return value
}

function buildPublicUrl(cdnDomain, bucketName, endpoint, objectKey) {
  const domain = cdnDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const endpointHost = endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const host = domain || `${bucketName}.${endpointHost}`
  return `https://${host}/${objectKey}`
}

function uploadOriginalBytes({
  endpoint,
  bucketName,
  accessKeyId,
  accessKeySecret,
  objectKey,
  body,
}) {
  const endpointHost = endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const host = `${bucketName}.${endpointHost}`
  const date = new Date().toUTCString()
  const mimeType = 'video/mp4'
  const canonicalResource = `/${bucketName}/${objectKey}`
  const stringToSign = `PUT\n\n${mimeType}\n${date}\n${canonicalResource}`
  const signature = createHmac('sha1', accessKeySecret).update(stringToSign).digest('base64')

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: host,
        method: 'PUT',
        path: `/${objectKey.split('/').map(encodeURIComponent).join('/')}`,
        headers: {
          Authorization: `OSS ${accessKeyId}:${signature}`,
          Date: date,
          'Content-Type': mimeType,
          'Content-Length': body.length,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      },
      response => {
        const chunks = []
        response.on('data', chunk => chunks.push(chunk))
        response.on('end', () => {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            resolve()
            return
          }

          const responseBody = Buffer.concat(chunks).toString('utf8')
          const errorCode = responseBody.match(/<Code>([^<]+)<\/Code>/)?.[1]
          const endpointHeader = response.headers['x-oss-endpoint']
          const bucketLocation = response.headers['x-oss-bucket-location']
          const suggestedEndpoint =
            (typeof endpointHeader === 'string' ? endpointHeader : undefined) ??
            responseBody.match(/<Endpoint>([^<]+)<\/Endpoint>/)?.[1] ??
            (typeof bucketLocation === 'string'
              ? `oss-${bucketLocation}.aliyuncs.com`
              : undefined)
          reject(new OssUploadError(response.statusCode, errorCode, suggestedEndpoint))
        })
      }
    )
    request.on('error', reject)
    request.end(body)
  })
}

async function uploadWithEndpointRetry(options) {
  try {
    await uploadOriginalBytes(options)
    return options.endpoint
  } catch (error) {
    if (
      error instanceof OssUploadError &&
      error.suggestedEndpoint &&
      error.suggestedEndpoint !== options.endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '')
    ) {
      const endpoint = `https://${error.suggestedEndpoint}`
      await uploadOriginalBytes({ ...options, endpoint })
      return endpoint
    }
    throw error
  }
}

async function main() {
  const inputPath = process.argv[2]
  if (!inputPath) {
    throw new Error('请传入登录背景 MP4 的绝对路径')
  }

  const videoPath = path.resolve(inputPath)
  if (!fs.existsSync(videoPath)) {
    throw new Error(`登录背景视频不存在：${videoPath}`)
  }
  if (path.extname(videoPath).toLowerCase() !== '.mp4') {
    throw new Error('登录背景视频必须是 MP4 文件')
  }

  const body = Buffer.from(fs.readFileSync(videoPath))
  if (!body.includes(Buffer.from('ftyp'))) {
    throw new Error('登录背景文件不是有效的 MP4 容器')
  }

  const env = readEnvFile(envFile)
  const configuredEndpoint = requiredEnv(env, 'DEV_OSS_ENDPOINT')
  const bucketName = requiredEnv(env, 'DEV_OSS_BUCKET_NAME')
  const accessKeyId = requiredEnv(env, 'DEV_OSS_ACCESS_KEY_ID')
  const accessKeySecret = requiredEnv(env, 'DEV_OSS_ACCESS_KEY_SECRET')
  const cdnDomain = env.DEV_OSS_CDN_DOMAIN || ''
  const sha256 = createHash('sha256').update(body).digest('hex')
  const objectKey = `miniapp/media/${sha256.slice(0, 16)}/login-background.mp4`

  const endpoint = await uploadWithEndpointRetry({
    endpoint: configuredEndpoint,
    bucketName,
    accessKeyId,
    accessKeySecret,
    objectKey,
    body,
  })
  const url = buildPublicUrl(cdnDomain, bucketName, endpoint, objectKey)

  console.log(`登录背景视频已原样上传：${body.length} 字节`)
  console.log(url)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
