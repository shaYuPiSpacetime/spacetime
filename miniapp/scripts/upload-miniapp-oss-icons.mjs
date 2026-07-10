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
const clientManifestFile = path.join(miniappRoot, 'src', 'constants', 'ossIcons.ts')

class OssUploadError extends Error {
  constructor(statusCode, code, suggestedEndpoint) {
    super(`OSS 上传失败：HTTP ${statusCode ?? 'unknown'}${code ? ` (${code})` : ''}`)
    this.name = 'OssUploadError'
    this.suggestedEndpoint = suggestedEndpoint
  }
}

// 不包含底部 Tab 图标；这些资源必须按源文件字节上传，不会转换、缩放或压缩图像。
const ICON_ASSETS = Object.freeze({
  coinGold: 'src/assets/lanhu/pages/coin-gold.png',
  coinUsageWhisper: 'src/assets/lanhu/pages/coin-usage/whisper.png',
  coinUsageHeartbeat: 'src/assets/lanhu/pages/coin-usage/heartbeat.png',
  coinUsageIdealUnlock: 'src/assets/lanhu/pages/coin-usage/ideal-unlock.png',
  coinUsageBoost: 'src/assets/lanhu/pages/coin-usage/boost.png',
  coinUsageCuratedUnlock: 'src/assets/lanhu/pages/coin-usage/curated-unlock.png',
  coinUsageRecommend: 'src/assets/lanhu/pages/coin-usage/recommend.png',
  coinUsageAnonymousUnlock: 'src/assets/lanhu/pages/coin-usage/anonymous-unlock.png',
  coinUsageLimitedActivity: 'src/assets/lanhu/pages/coin-usage/limited-activity.png',
  memberDividerLeft: 'src/assets/lanhu/pages/member-benefits/member-slice-group-5-a.png',
  memberDividerRight: 'src/assets/lanhu/pages/member-benefits/member-slice-group-5-b.png',
  memberBenefitMatch: 'src/assets/lanhu/pages/member-benefits/member-slice-match.png',
  memberBenefitEyeOpen: 'src/assets/lanhu/pages/member-benefits/member-slice-eye-open.png',
  memberBenefitGreeting: 'src/assets/lanhu/pages/member-benefits/member-slice-greeting-a.png',
  memberBenefitRecommend: 'src/assets/lanhu/pages/member-benefits/member-slice-recommend.png',
  memberBenefitFilter: 'src/assets/lanhu/pages/member-benefits/member-slice-filter.png',
  memberBenefitExposure: 'src/assets/lanhu/pages/member-benefits/member-slice-exposure.png',
  memberBenefitStealth: 'src/assets/lanhu/pages/member-benefits/member-slice-stealth.png',
  memberBenefitReplay: 'src/assets/lanhu/pages/member-benefits/member-slice-greeting-b.png',
  memberBenefitDailyHeart: 'src/assets/lanhu/pages/member-benefits/member-slice-my-2.png',
  loginMethodWechat: 'src/assets/lanhu/login/login-method-wechat.png',
  loginMethodPhone: 'src/assets/lanhu/login/login-method-phone.png',
  genderFemale: 'src/assets/lanhu/login/gender-female.webp',
  genderMale: 'src/assets/lanhu/login/gender-male.webp',
  verificationCertAvatar: 'src/assets/lanhu/verification/slices/cert-avatar.webp',
  verificationCertRealName: 'src/assets/lanhu/verification/slices/cert-realname.webp',
  verificationCertEducation: 'src/assets/lanhu/verification/slices/cert-education.webp',
  verificationUploadCamera: 'src/assets/lanhu/verification/slices/upload-camera.webp',
  profilePost: 'src/assets/profile/icon-post.png',
  profileService: 'src/assets/profile/icon-service.png',
  profileSettings: 'src/assets/profile/icon-settings.png',
  profileCertification: 'src/assets/profile/icon-cert.png',
  profileBoostButton: 'src/assets/profile/boost-button.png',
  profileVipBanner: 'src/assets/profile/vip-banner.webp',
})

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

function contentType(fileName) {
  if (fileName.endsWith('.png')) return 'image/png'
  if (fileName.endsWith('.webp')) return 'image/webp'
  throw new Error(`不支持的图标格式：${fileName}`)
}

function publicUrl(cdnDomain, bucketName, endpoint, objectKey) {
  const domain = cdnDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const host = domain || `${bucketName}.${endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
  return `https://${host}/${objectKey}`
}

function uploadOriginalBytes({ endpoint, bucketName, accessKeyId, accessKeySecret, objectKey, body, mimeType }) {
  const endpointHost = endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const host = `${bucketName}.${endpointHost}`
  const date = new Date().toUTCString()
  const canonicalResource = `/${bucketName}/${objectKey}`
  const stringToSign = `PUT\n\n${mimeType}\n${date}\n${canonicalResource}`
  const signature = createHmac('sha1', accessKeySecret).update(stringToSign).digest('base64')

  return new Promise((resolve, reject) => {
    const request = https.request({
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
    }, (response) => {
      const chunks = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => {
        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
          resolve()
          return
        }
        const bodyText = Buffer.concat(chunks).toString('utf8')
        const errorCode = bodyText.match(/<Code>([^<]+)<\/Code>/)?.[1]
        const endpointHeader = response.headers['x-oss-endpoint']
        const bucketLocation = response.headers['x-oss-bucket-location']
        const suggestedEndpoint = (
          typeof endpointHeader === 'string' ? endpointHeader : undefined
        ) ?? bodyText.match(/<Endpoint>([^<]+)<\/Endpoint>/)?.[1]
          ?? (typeof bucketLocation === 'string' ? `oss-${bucketLocation}.aliyuncs.com` : undefined)
        reject(new OssUploadError(response.statusCode, errorCode, suggestedEndpoint))
      })
    })
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
      error instanceof OssUploadError
      && error.suggestedEndpoint
      && error.suggestedEndpoint !== options.endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '')
    ) {
      const endpoint = `https://${error.suggestedEndpoint}`
      await uploadOriginalBytes({ ...options, endpoint })
      return endpoint
    }
    throw error
  }
}

function writeClientManifest(entries) {
  const source = [
    '/** 由 scripts/upload-miniapp-oss-icons.mjs 生成；禁止手写密钥或本地回退路径。 */',
    'export const miniappOssIcons = Object.freeze({',
    ...entries.map(({ key, url }) => `  ${key}: '${url}',`),
    "} as const)",
    '',
    'export type MiniappOssIconKey = keyof typeof miniappOssIcons',
    '',
  ].join('\n')
  fs.mkdirSync(path.dirname(clientManifestFile), { recursive: true })
  fs.writeFileSync(clientManifestFile, source, 'utf8')
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const env = readEnvFile(envFile)
  const configuredEndpoint = requiredEnv(env, 'DEV_OSS_ENDPOINT')
  const bucketName = requiredEnv(env, 'DEV_OSS_BUCKET_NAME')
  const accessKeyId = requiredEnv(env, 'DEV_OSS_ACCESS_KEY_ID')
  const accessKeySecret = requiredEnv(env, 'DEV_OSS_ACCESS_KEY_SECRET')
  const cdnDomain = env.DEV_OSS_CDN_DOMAIN || ''
  const entries = []
  let endpoint = configuredEndpoint

  for (const [key, relativePath] of Object.entries(ICON_ASSETS)) {
    const filePath = path.join(miniappRoot, relativePath)
    if (!fs.existsSync(filePath)) throw new Error(`图标源文件不存在：${relativePath}`)
    const body = Buffer.from(fs.readFileSync(filePath))
    const sha256 = createHash('sha256').update(body).digest('hex')
    const objectKey = `miniapp/ui-icons/${sha256.slice(0, 16)}/${path.basename(relativePath)}`
    const mimeType = contentType(relativePath)

    if (!dryRun) {
      // 当本地 endpoint 与 bucket 地域不一致时，按 OSS 响应自动识别并重试一次。
      endpoint = await uploadWithEndpointRetry({ endpoint, bucketName, accessKeyId, accessKeySecret, objectKey, body, mimeType })
    }
    entries.push({ key, url: publicUrl(cdnDomain, bucketName, endpoint, objectKey) })
  }

  if (!dryRun) writeClientManifest(entries)
  console.log(dryRun ? `已校验 ${entries.length} 个非底部图标源文件。` : `已原样上传 ${entries.length} 个非底部图标并更新客户端清单。`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
