import Taro, { useRouter } from '@tarojs/taro'
import { useEffect } from 'react'

export default function VerificationIntroEditLegacyPage() {
  const router = useRouter()

  useEffect(() => {
    void Taro.redirectTo({ url: appendQuery('/pages/profile-edit/intro', router.params) }).catch(() => {
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
