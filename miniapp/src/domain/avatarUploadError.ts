import { getErrorMessage } from '@/utils/errorMessage'

const FALLBACK_MESSAGE = '头像处理失败，请稍后重试'

/** 将头像读取、裁剪和上传阶段的原生错误转换为用户可理解的提示。 */
export function resolveAvatarUploadError(error: unknown): string {
  const detail = extractErrorDetail(error)

  if (/url not in domain list|not in domain list/i.test(detail)) {
    return '头像上传域名未配置，请联系管理员'
  }
  if (/canvas|create bitmap|create image/i.test(detail)) {
    return '头像裁剪失败，请重新选择图片'
  }
  if (/getImageInfo/i.test(detail)) {
    return '头像读取失败，请重新选择图片'
  }
  if (/invalid_file_size|file size.*(?:invalid|empty)|文件为空/i.test(detail)) {
    return '头像文件无效，请重新选择图片'
  }
  if (/AccessDenied|SignatureDoesNotMatch|InvalidAccessKeyId|^(?:401|403)$/i.test(detail)) {
    return '头像上传鉴权失败，请稍后重试'
  }
  if (/uploadFile:fail|timeout/i.test(detail)) {
    return '头像上传失败，请检查网络后重试'
  }
  if (/request:fail|network/i.test(detail)) {
    return '网络连接失败，请稍后重试'
  }

  return getErrorMessage(error, FALLBACK_MESSAGE)
}

function extractErrorDetail(error: unknown): string {
  if (error instanceof Error) return error.message.trim()
  if (typeof error === 'string') return error.trim()
  if (!error || typeof error !== 'object') return ''

  const value = error as {
    message?: unknown
    errMsg?: unknown
    data?: { msg?: unknown }
  }
  if (typeof value.message === 'string') return value.message.trim()
  if (typeof value.errMsg === 'string') return value.errMsg.trim()
  if (typeof value.data?.msg === 'string') return value.data.msg.trim()
  return ''
}
