import Taro from '@tarojs/taro'

const BLOCKED_REMOTE_AVATAR_HOSTS = new Set(['img.zcool.cn'])

/** 判断头像地址是否来自已知会拦截热链的远程域名。 */
export function isBlockedRemoteAvatar(avatar?: string | null) {
  const nextAvatar = avatar?.trim()
  if (!nextAvatar) return false

  const hostMatch = nextAvatar.match(/^https?:\/\/([^/?#:]+)/i)
  const hostname = hostMatch?.[1]?.toLowerCase()
  return Boolean(hostname && BLOCKED_REMOTE_AVATAR_HOSTS.has(hostname))
}

/** 将空头像或失效热链头像归一化为稳定兜底图。 */
export function normalizeAvatarUrl(avatar: string | undefined | null, fallbackAvatar: string) {
  const nextAvatar = avatar?.trim()
  if (!nextAvatar || isBlockedRemoteAvatar(nextAvatar)) {
    return fallbackAvatar
  }
  return nextAvatar
}

export async function chooseAndCropAvatar(source: string) {
  const res = await Taro.chooseImage({
    count: 1,
    sizeType: ['original'],
    sourceType: source === 'CAMERA' ? ['camera'] : ['album'],
  })
  const sourcePath = res.tempFilePaths[0]
  return sourcePath || ''
}
