import Taro from '@tarojs/taro'
import { API_BASE_URL, TOKEN_HEADER, TOKEN_KEY } from '@/constants/config'

const CREDENTIAL_PATH_PREFIX = '/miniapp/file/credential/'

/** 受保护材料不能由 Image 直连，必须携带登录 token 下载到小程序临时目录。 */
export async function resolveProtectedFilePreview(fileUrl: string): Promise<string> {
  if (!fileUrl.startsWith(CREDENTIAL_PATH_PREFIX)) return fileUrl

  const token = Taro.getStorageSync(TOKEN_KEY) || ''
  const result = await Taro.downloadFile({
    url: `${API_BASE_URL}${fileUrl}`,
    header: { [TOKEN_HEADER]: token },
  })
  if (result.statusCode !== 200 || !result.tempFilePath) {
    throw new Error(`学历材料预览下载失败：${String(result.statusCode)}`)
  }
  return result.tempFilePath
}

export function resolveProtectedFilePreviews(fileUrls: string[]): Promise<string[]> {
  return Promise.all(fileUrls.map(resolveProtectedFilePreview))
}
