import Taro, { useRouter } from '@tarojs/taro'
import { useEffect } from 'react'

export default function VerificationAvatarAlbumLegacyPage() {
  const router = useRouter()

  useEffect(() => {
    void Taro.redirectTo({ url: appendQuery('/pages/verification/avatar', router.params) }).catch(() => {
      void Taro.showToast({ title: '页面跳转失败，请重试', icon: 'none' })
    })
  }, [])

  return null
}

function appendQuery(path: string, params: Record<string, string | undefined>) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
  return query ? `${path}?${query}` : path
}
