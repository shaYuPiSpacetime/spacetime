import Taro from '@tarojs/taro'
import { post } from './request'
import type { FileUploadResult, OssUploadTicket } from '@/types/prd01'

export class OssDirectUploadError extends Error {}

/** 获取受限短时凭证后由小程序直接上传 OSS，长期密钥不会进入客户端。 */
export async function uploadDirectToOss(ticketPath: string, filePath: string): Promise<FileUploadResult> {
  const fileInfo = await Taro.getFileInfo({ filePath })
  const fileSizeBytes = 'size' in fileInfo ? fileInfo.size : 0
  if (fileSizeBytes <= 0) throw new OssDirectUploadError('invalid_file_size')
  const fileName = decodeURIComponent(filePath.split('/').pop()?.split('?')[0] || '')
  const ticket = await post<OssUploadTicket>(ticketPath, {
    fileName,
    fileSizeBytes,
  })
  const result = await Taro.uploadFile({
    url: ticket.uploadUrl,
    filePath,
    name: 'file',
    formData: ticket.formData,
  })
  if (result.statusCode !== 200 && result.statusCode !== 204) {
    throw new OssDirectUploadError(String(result.statusCode))
  }
  return {
    key: ticket.key,
    url: ticket.fileUrl,
    protectedFile: ticket.protectedFile,
    fileSizeBytes,
  }
}
