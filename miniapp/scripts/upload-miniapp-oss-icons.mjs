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
  promotionInviteBackground: '../docs/验收报告/截图证据/2026-08-19-邀请首页蓝湖切图修正/设计基线/切图原始/01-84BC9B17-63B9-41C0-98BB-54DC17EF3FE2-编组13.png',
  promotionInviteEquationSprite: '../docs/验收报告/截图证据/2026-08-19-邀请首页蓝湖切图修正/设计基线/切图原始/02-19A13B3F-F032-4E6E-A1EB-BABB3A928557-编组14.png',
  heartMutualLikes: 'src/assets/lanhu/heart-message/heart-mutual-likes.png',
  messageAvatarXiaoming: 'src/assets/lanhu/message/avatar-xiaoming.png',
  messageAvatarLikedBlurred: 'src/assets/lanhu/message/avatar-liked-blurred.png',
  messageAvatarWhisperGroup: 'src/assets/lanhu/message/avatar-whisper-group.png',
  messageHomeYoArt: 'src/assets/lanhu/message/home-yo-art.png',
  messageHomeWhisperCardBackground: 'src/assets/lanhu/message/home-whisper-card-bg.png',
  messageHomePrivateCardBackground: 'src/assets/lanhu/message/home-private-card-bg.png',
  messageHomePrivateBubbleArt: 'src/assets/lanhu/message/home-private-bubble-art.png',
  messageAssistant: 'src/assets/lanhu/message/icon-assistant.png',
  messageSystem: 'src/assets/lanhu/message/icon-system.png',
  messageTimelineExpired: 'src/assets/lanhu/message/timeline-expired.png',
  messageTimelineYo: 'src/assets/lanhu/message/timeline-yo.png',
  messageTimelineMatched: 'src/assets/lanhu/message/timeline-matched.png',
  messageTimelineView: 'src/assets/lanhu/message/timeline-view.png',
  messageChatSafetyDecoLeft: 'src/assets/lanhu/message/chat-safety-deco-left.png',
  messageChatSafetyDecoRight: 'src/assets/lanhu/message/chat-safety-deco-right.png',
  messageQianxunCoin: 'src/assets/lanhu/message/icon-qianxun-coin.png',
  messageReport: 'src/assets/lanhu/message/icon-report.png',
  messageMemberBadge: 'src/assets/lanhu/message/badge-member.png',
  coinBalanceBackground: 'src/assets/lanhu/pages/coin-balance-bg.png',
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
  loginPhoneField: 'src/assets/lanhu/login/login-phone-field.png',
  loginSmsCode: 'src/assets/lanhu/login/login-sms-code.png',
  loginBrand: 'src/assets/lanhu/login/login-brand.png',
  loginCityLocation: 'src/assets/lanhu/login/city-location.png',
  loginNextArrow: 'src/assets/lanhu/login/login-next-arrow.png',
  genderFemale: 'src/assets/lanhu/login/gender-female.webp',
  genderMale: 'src/assets/lanhu/login/gender-male.webp',
  verificationCertAvatar: 'src/assets/lanhu/verification/slices/cert-avatar.png',
  verificationCertRealName: 'src/assets/lanhu/verification/slices/cert-realname.png',
  verificationCertEducation: 'src/assets/lanhu/verification/slices/cert-education.png',
  verificationUploadCamera: 'src/assets/lanhu/verification/slices/upload-camera.png',
  verificationCustomerService: 'src/assets/lanhu/verification/slices/customer-service.png',
  verificationProfileBasic: 'src/assets/lanhu/verification/slices/profile-basic.png',
  verificationProfileAvatarIntro: 'src/assets/lanhu/verification/slices/profile-avatar-intro.png',
  verificationProfileTriple: 'src/assets/lanhu/verification/slices/profile-triple.png',
  verificationRoundCheck: 'src/assets/lanhu/verification/slices/round-check.png',
  verificationAvatarInvalidNonPerson: 'src/assets/lanhu/verification/slices/avatar-invalid-non-person.png',
  verificationAvatarInvalidLandscape: 'src/assets/lanhu/verification/slices/avatar-invalid-landscape.png',
  verificationAvatarInvalidBlurred: 'src/assets/lanhu/verification/slices/avatar-invalid-blurred.png',
  verificationAvatarInvalidNoFace: 'src/assets/lanhu/verification/slices/avatar-invalid-no-face.png',
  verificationChsiStep1: 'src/assets/lanhu/verification/slices/chsi-step-1.png',
  verificationChsiStep2: 'src/assets/lanhu/verification/slices/chsi-step-2.png',
  verificationChsiStep3: 'src/assets/lanhu/verification/slices/chsi-step-3.png',
  verificationChsiStep4: 'src/assets/lanhu/verification/slices/chsi-step-4.png',
  qianxunEmptyHeart: 'src/assets/lanhu/recommend/slices/empty-heart.png',
  qianxunEmptyChart: 'src/assets/lanhu/recommend/slices/empty-chart.png',
  qianxunEmptyMessage: 'src/assets/lanhu/recommend/slices/empty-message.png',
  qianxunEmptyFollowing: 'src/assets/lanhu/recommend/slices/empty-following.png',
  qianxunPostGuideBg: 'src/assets/lanhu/recommend/slices/post-guide-bg.png',
  qianxunVerifyNote: 'src/assets/lanhu/recommend/slices/verify-note.webp',
  qianxunTopicCover: 'src/assets/lanhu/recommend/slices/city-night.webp',
  qianxunTopicHero: 'src/assets/lanhu/recommend/slices/topic-forest-rainbow-v2.png',
  qianxunTopicThumb: 'src/assets/lanhu/recommend/slices/topic-pinky-promise-v2.png',
  qianxunTopicAvatar: 'src/assets/lanhu/recommend/slices/avatar-xiaolaohu.webp',
  qianxunGenderFemale: 'src/assets/lanhu/qianxun-community/gender-female.png',
  qianxunGenderMale: 'src/assets/lanhu/qianxun-community/gender-male.png',
  qianxunWhisper: 'src/assets/lanhu/qianxun-community/whisper.png',
  qianxunComment: 'src/assets/lanhu/qianxun-community/comment.png',
  qianxunLike: 'src/assets/lanhu/qianxun-community/like.png',
  qianxunLikeActive: 'src/assets/lanhu/qianxun-community/like-active.png',
  qianxunYuemuHeart: 'src/assets/lanhu/qianxun-community/yuemu-heart.png',
  qianxunCenter: 'src/assets/lanhu/pages/qianxun-center.png',
  profilePost: 'src/assets/profile/icon-post.png',
  profileService: 'src/assets/profile/icon-service.png',
  profileSettings: 'src/assets/profile/icon-settings.png',
  profileCertification: 'src/assets/profile/icon-cert.png',
  profileBoostButton: 'src/assets/profile/boost-button.png',
  profileVipBanner: 'src/assets/profile/vip-banner.webp',
  profilePreviewShare: 'src/assets/lanhu/profile/profile-preview-share.png',
  profilePreviewHero: 'src/assets/lanhu/profile/profile-preview-hero.png',
  profilePreviewAvatar: 'src/assets/lanhu/profile/profile-preview-avatar.png',
  profilePreviewCertAvatar: 'src/assets/lanhu/profile/profile-preview-cert-avatar.png',
  profilePreviewCertRealname: 'src/assets/lanhu/profile/profile-preview-cert-realname.png',
  profilePreviewCertEducation: 'src/assets/lanhu/profile/profile-preview-cert-education.png',
  profileEditCertAvatar: 'src/assets/lanhu/profile/profile-edit-cert-avatar.png',
  profileEditCertRealName: 'src/assets/lanhu/profile/profile-edit-cert-realname.png',
  profileEditCertEducation: 'src/assets/lanhu/profile/profile-edit-cert-education.png',
  profilePreviewGender: 'src/assets/lanhu/profile/profile-preview-gender.png',
  profilePreviewLocation: 'src/assets/lanhu/profile/profile-preview-location.png',
  profilePreviewSong: 'src/assets/lanhu/profile/profile-preview-song.png',
  profilePreviewPhoto: 'src/assets/lanhu/profile/profile-preview-photo.png',
  showcaseProfileHero: 'src/assets/lanhu/profile/edit-hero-photo.jpg',
  showcaseProfileAvatar: 'src/assets/lanhu/heart-message/heart-avatar.webp',
  showcaseProfilePortrait: 'src/assets/lanhu/heart-message/heart-person.webp',
  showcaseProfileAlternate: 'src/assets/lanhu/pages/match-photo.webp',
  recommendSkip: '../docs/验收报告/截图证据/2026-08-05-PRD08推荐理想型-蓝湖还原/设计基线/切图原始/01-A15D81F1-D8E9-41D7-B909-FEC2B1BACA88.png',
  recommendLike: '../docs/验收报告/截图证据/2026-08-05-PRD08推荐理想型-蓝湖还原/设计基线/切图原始/02-C5EBE5E6-F9E2-41A1-AEAB-AFEE38E606F6.png',
  recommendWhisper: '../docs/验收报告/截图证据/2026-08-05-PRD08推荐理想型-蓝湖还原/设计基线/切图原始/03-69CA943B-E604-4A4D-BB5C-8FCD8BCBD246.png',
  recommendVipBadge: '../docs/验收报告/截图证据/2026-08-05-PRD08推荐理想型-蓝湖还原/设计基线/切图原始/04-EEC2CE06-E66C-40EA-A3EA-4CE9E43E65A6.png',
  recommendVipBanner: '../docs/验收报告/截图证据/2026-08-05-PRD08推荐理想型-蓝湖还原/设计基线/切图原始/05-B6EED00E-C27A-4379-B817-1551F6364D8A.png',
  idealHeroBackground: '../docs/验收报告/截图证据/2026-08-05-PRD08推荐理想型-蓝湖还原/设计基线/切图原始/06-CCB79BB1-2CC1-4E81-93BD-0F3A78E67AEA.png',
  idealHeaderBackground: '../docs/验收报告/截图证据/2026-08-05-PRD08推荐理想型-蓝湖还原/设计基线/切图原始/07-EC4EEE88-4299-453E-AA08-2F9D67EB7892.png',
  idealFilter: '../docs/验收报告/截图证据/2026-08-05-PRD08推荐理想型-蓝湖还原/设计基线/切图原始/08-F89439BF-5F8A-43DE-AD7D-21A95B4DE76D.png',
  recommendReplay: '../docs/验收报告/截图证据/2026-08-05-PRD08推荐理想型-蓝湖还原/设计基线/切图原始/09-777FA126-7EDB-4F1A-85B1-CD5843033228.png',
  recommendPreference: '../docs/验收报告/截图证据/2026-08-05-PRD08推荐理想型-蓝湖还原/设计基线/切图原始/10-B0C26FC5-75A5-4EF1-9718-E928D2F4F073.png',
  idealHistory: '../docs/验收报告/截图证据/2026-08-05-PRD08推荐理想型-蓝湖还原/设计基线/切图原始/11-777B829F-214B-4472-B09C-953DADFF3AD0.png',
  recommendMemberReplay: '../docs/验收报告/截图证据/2026-08-05-PRD08推荐理想型-蓝湖还原/设计基线/切图原始/12-BFE475F4-16CC-4CA5-9ED1-D930DEDF5967.png',
  recommendLocationDark: '../docs/验收报告/截图证据/2026-08-05-PRD08推荐理想型-蓝湖还原/设计基线/切图原始/13-1EC0A5AC-4C65-4C88-9AA3-68957F9DEEB3.png',
  recommendLocationLight: '../docs/验收报告/截图证据/2026-08-05-PRD08推荐理想型-蓝湖还原/设计基线/切图原始/14-B8CC4D90-5F07-4CED-832C-7F15F89CB519.png',
  settingsAboutLogo: 'src/assets/lanhu/settings/about-logo.png',
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

function requiredEnv(env, ...keys) {
  for (const key of keys) {
    if (env[key]) return env[key]
  }
  throw new Error(`backend/.env.local 缺少 ${keys.join(' 或 ')}`)
}

function contentType(fileName) {
  if (fileName.endsWith('.png')) return 'image/png'
  if (fileName.endsWith('.webp')) return 'image/webp'
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image/jpeg'
  throw new Error(`不支持的图标格式：${fileName}`)
}

function publicUrl(cdnDomain, bucketName, endpoint, objectKey) {
  const domain = cdnDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const host = domain || `${bucketName}.${endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
  return `https://${host}/${objectKey}`
}

function uploadOriginalBytes({
  endpoint,
  bucketName,
  accessKeyId,
  accessKeySecret,
  objectKey,
  body,
  mimeType,
}) {
  const endpointHost = endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const host = `${bucketName}.${endpointHost}`
  const date = new Date().toUTCString()
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
          const bodyText = Buffer.concat(chunks).toString('utf8')
          const errorCode = bodyText.match(/<Code>([^<]+)<\/Code>/)?.[1]
          const endpointHeader = response.headers['x-oss-endpoint']
          const bucketLocation = response.headers['x-oss-bucket-location']
          const suggestedEndpoint =
            (typeof endpointHeader === 'string' ? endpointHeader : undefined) ??
            bodyText.match(/<Endpoint>([^<]+)<\/Endpoint>/)?.[1] ??
            (typeof bucketLocation === 'string' ? `oss-${bucketLocation}.aliyuncs.com` : undefined)
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

function writeClientManifest(entries) {
  const source = [
    '/** 由 scripts/upload-miniapp-oss-icons.mjs 生成；禁止手写密钥或本地回退路径。 */',
    'export const miniappOssIcons = Object.freeze({',
    ...entries.map(({ key, url }) => `  ${key}: '${url}',`),
    '} as const)',
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
  const configuredEndpoint = requiredEnv(env, 'DEV_OSS_ENDPOINT', 'OSS_ENDPOINT')
  const bucketName = requiredEnv(env, 'DEV_OSS_BUCKET_NAME', 'OSS_BUCKET_NAME')
  const accessKeyId = requiredEnv(env, 'DEV_OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_ID')
  const accessKeySecret = requiredEnv(env, 'DEV_OSS_ACCESS_KEY_SECRET', 'OSS_ACCESS_KEY_SECRET')
  const cdnDomain = env.DEV_OSS_CDN_DOMAIN || env.OSS_CDN_DOMAIN || ''
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
      endpoint = await uploadWithEndpointRetry({
        endpoint,
        bucketName,
        accessKeyId,
        accessKeySecret,
        objectKey,
        body,
        mimeType,
      })
    }
    entries.push({ key, url: publicUrl(cdnDomain, bucketName, endpoint, objectKey) })
  }

  if (!dryRun) writeClientManifest(entries)
  console.log(
    dryRun
      ? `已校验 ${entries.length} 个非底部图标源文件。`
      : `已原样上传 ${entries.length} 个非底部图标并更新客户端清单。`
  )
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
