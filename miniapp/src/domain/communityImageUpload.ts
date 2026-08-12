export const COMMUNITY_IMAGE_MAX_BYTES = 10 * 1024 * 1024
export const COMMUNITY_IMAGE_TARGET_BYTES = 3 * 1024 * 1024

const SUPPORTED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png'])
const COMPRESSION_PROFILES = [
  { quality: 82, compressedWidth: 2400 },
  { quality: 70, compressedWidth: 1920 },
  { quality: 55, compressedWidth: 1600 },
] as const

export interface CommunityImageCompressionOptions {
  src: string
  quality: number
  compressedWidth: number
}

export interface CommunityImagePreparationAdapter {
  getFileSize: (filePath: string) => Promise<number>
  compress: (options: CommunityImageCompressionOptions) => Promise<string>
}

export interface PreparedCommunityImage {
  filePath: string
  fileName: string
  fileSizeBytes: number
  compressed: boolean
}

export class CommunityImagePreparationError extends Error {}

export interface CommunityImageRetryOptions {
  retryDelays?: number[]
  wait?: (delayMs: number) => Promise<void>
}

/**
 * 将微信临时图片归一化为后端可签票的 JPG/PNG，并优先压缩到 3MB 内。
 * 3MB 是顺畅上传目标，不是硬上限；压缩失败时，合法且不超过 10MB 的原图仍可上传。
 */
export async function prepareCommunityImageForUpload(
  filePath: string,
  adapter: CommunityImagePreparationAdapter,
): Promise<PreparedCommunityImage> {
  const originalSize = await adapter.getFileSize(filePath)
  if (originalSize <= 0) throw new CommunityImagePreparationError('图片文件无效，请重新选择')

  const originalSupported = isSupportedImagePath(filePath)
  if (originalSupported && originalSize <= COMMUNITY_IMAGE_TARGET_BYTES) {
    return prepared(filePath, originalSize, false)
  }

  let bestCompressed: { filePath: string; fileSizeBytes: number } | undefined
  for (const profile of COMPRESSION_PROFILES) {
    try {
      const compressedPath = await adapter.compress({ src: filePath, ...profile })
      const compressedSize = await adapter.getFileSize(compressedPath)
      if (compressedSize <= 0) continue
      if (!bestCompressed || compressedSize < bestCompressed.fileSizeBytes) {
        bestCompressed = { filePath: compressedPath, fileSizeBytes: compressedSize }
      }
      if (compressedSize <= COMMUNITY_IMAGE_TARGET_BYTES) {
        return prepared(compressedPath, compressedSize, true, !originalSupported)
      }
    } catch {
      break
    }
  }

  if (bestCompressed && bestCompressed.fileSizeBytes <= COMMUNITY_IMAGE_MAX_BYTES) {
    return prepared(bestCompressed.filePath, bestCompressed.fileSizeBytes, true, !originalSupported)
  }
  if (originalSupported && originalSize <= COMMUNITY_IMAGE_MAX_BYTES) {
    return prepared(filePath, originalSize, false)
  }
  if (originalSize > COMMUNITY_IMAGE_MAX_BYTES || bestCompressed) {
    throw new CommunityImagePreparationError('图片过大，压缩后仍超过10MB，请更换图片')
  }
  throw new CommunityImagePreparationError('图片格式不支持，请选择 JPG 或 PNG 图片')
}

/** 将底层上传错误转换为发布动态可理解的失败原因。 */
export function resolveCommunityImageUploadError(error: unknown): string {
  const detail = extractErrorDetail(error)
  if (/文件大小不能超过|图片过大/.test(detail)) return detail
  if (/文件格式不支持|图片格式不支持/.test(detail)) return detail
  if (/invalid_file_size|文件内容不能为空|图片文件无效/.test(detail)) {
    return '图片文件无效，请重新选择'
  }
  if (/url not in domain list/i.test(detail)) {
    return '图片上传域名未配置，请联系管理员'
  }
  if (/AccessDenied|SignatureDoesNotMatch|InvalidAccessKeyId|(?:^|:)40[13](?:$|:)/i.test(detail)) {
    return '图片上传鉴权失败，请稍后重试'
  }
  if (/uploadFile:fail|timeout|request:fail|network/i.test(detail)) {
    return '网络不稳定，图片上传失败'
  }
  if (/^[\u4e00-\u9fff]/.test(detail)) return detail
  return '图片上传失败，请稍后重试'
}

/** 对短时网络抖动和 OSS 临时错误自动重试，配置与鉴权错误直接返回。 */
export async function runCommunityImageUploadWithRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: CommunityImageRetryOptions = {},
): Promise<T> {
  const retryDelays = options.retryDelays || [300, 1000]
  const wait = options.wait || (delayMs => new Promise(resolve => setTimeout(resolve, delayMs)))
  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    try {
      return await operation(attempt + 1)
    } catch (error) {
      if (attempt >= retryDelays.length || !isRetryableCommunityImageUploadError(error)) {
        throw error
      }
      await wait(retryDelays[attempt])
    }
  }
  throw new Error('图片上传重试状态异常')
}

export function isRetryableCommunityImageUploadError(error: unknown): boolean {
  const detail = extractErrorDetail(error)
  if (/url not in domain list/i.test(detail)) return false
  if (/RequestExpired|RequestTimeTooSkewed|ExpiredToken/i.test(detail)) return true
  if (/AccessDenied|SignatureDoesNotMatch|InvalidAccessKeyId|(?:^|:)40[13](?:$|:)/i.test(detail)) {
    return false
  }
  if (/文件大小|图片过大|文件格式|图片格式|invalid_file_size/i.test(detail)) return false
  return /uploadFile:fail|timeout|request:fail|network|网络连接|socket|connection reset|(?:^|:)5\d\d(?:$|:)/i.test(detail)
}

function prepared(
  filePath: string,
  fileSizeBytes: number,
  compressed: boolean,
  forceJpg = false,
): PreparedCommunityImage {
  return {
    filePath,
    fileName: forceJpg ? 'community-image.jpg' : safeFileName(filePath),
    fileSizeBytes,
    compressed,
  }
}

function safeFileName(filePath: string): string {
  const raw = filePath.split('/').pop()?.split('?')[0] || ''
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    // 微信临时路径即使包含异常转义，也使用安全兜底文件名继续上传。
  }
  return isSupportedImagePath(decoded) ? decoded : 'community-image.jpg'
}

function isSupportedImagePath(filePath: string): boolean {
  const raw = filePath.split('/').pop()?.split('?')[0] || ''
  const dot = raw.lastIndexOf('.')
  if (dot < 0) return false
  return SUPPORTED_IMAGE_EXTENSIONS.has(raw.slice(dot + 1).toLowerCase())
}

function extractErrorDetail(error: unknown): string {
  if (error instanceof Error) {
    const httpStatus = (error as Error & { httpStatus?: number }).httpStatus
    return [error.message.trim(), httpStatus].filter(Boolean).join(':')
  }
  if (typeof error === 'string') return error.trim()
  if (!error || typeof error !== 'object') return ''
  const value = error as { message?: unknown; errMsg?: unknown; data?: { msg?: unknown } }
  if (typeof value.message === 'string') return value.message.trim()
  if (typeof value.errMsg === 'string') return value.errMsg.trim()
  if (typeof value.data?.msg === 'string') return value.data.msg.trim()
  return ''
}
