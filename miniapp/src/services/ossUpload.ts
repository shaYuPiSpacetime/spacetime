import Taro from '@tarojs/taro'
import { post } from './request'
import {
  prepareCommunityImageForUpload,
  runCommunityImageUploadWithRetry,
  type PreparedCommunityImage,
} from '@/domain/communityImageUpload'
import type { FileUploadResult, OssUploadTicket } from '@/types/prd01'

export class OssDirectUploadError extends Error {}

/** 获取受限短时凭证后由小程序直接上传 OSS，长期密钥不会进入客户端。 */
export async function uploadDirectToOss(ticketPath: string, filePath: string): Promise<FileUploadResult> {
  const fileInfo = await Taro.getFileInfo({ filePath })
  const fileSizeBytes = 'size' in fileInfo ? fileInfo.size : 0
  if (fileSizeBytes <= 0) throw new OssDirectUploadError('invalid_file_size')
  const fileName = safeFileName(filePath)
  return uploadPreparedFile(ticketPath, { filePath, fileName, fileSizeBytes, compressed: false })
}

/** 发布动态和资料相册统一先压缩、归一化，再申请 OSS 直传票据。 */
export async function uploadCommunityImageDirectToOss(
  ticketPath: string,
  filePath: string,
): Promise<FileUploadResult> {
  const prepared = await prepareCommunityImageForUpload(filePath, {
    getFileSize: async currentPath => {
      const fileInfo = await Taro.getFileInfo({ filePath: currentPath })
      return 'size' in fileInfo ? fileInfo.size : 0
    },
    compress: async options => {
      const result = await Taro.compressImage(options)
      return result.tempFilePath
    },
  })
  return uploadPreparedFile(ticketPath, prepared)
}

async function uploadPreparedFile(
  ticketPath: string,
  prepared: PreparedCommunityImage,
): Promise<FileUploadResult> {
  const { filePath, fileName, fileSizeBytes } = prepared
  return runCommunityImageUploadWithRetry(async () => {
    // 每次重试都重新签票，避免继续复用已过期或网络切换前的短时凭证。
    const ticket = await post<OssUploadTicket>(ticketPath, {
      fileName,
      fileSizeBytes,
    })
    const result = await Taro.uploadFile({
      url: ticket.uploadUrl,
      filePath,
      name: 'file',
      formData: ticket.formData,
      timeout: 20000,
    })
    if (result.statusCode !== 200 && result.statusCode !== 204) {
      const ossCode = typeof result.data === 'string'
        ? result.data.match(/<Code>([^<]+)<\/Code>/)?.[1]
        : undefined
      throw new OssDirectUploadError([result.statusCode, ossCode].filter(Boolean).join(':'))
    }
    return {
      key: ticket.key,
      url: ticket.fileUrl,
      protectedFile: ticket.protectedFile,
      fileSizeBytes,
    }
  })
}

function safeFileName(filePath: string): string {
  const raw = filePath.split('/').pop()?.split('?')[0] || 'file.jpg'
  try {
    return decodeURIComponent(raw)
  } catch {
    return 'file.jpg'
  }
}
