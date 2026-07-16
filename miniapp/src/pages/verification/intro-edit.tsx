import Taro, { useRouter } from '@tarojs/taro'
import { useEffect } from 'react'
import { usePrd01Store } from '@/stores/prd01Store'

export default function VerificationIntroEditLegacyPage() {
  const router = useRouter()
  const copy = usePrd01Store(state => state.copy)

  useEffect(() => {
    void Taro.redirectTo({ url: appendQuery('/pages/profile-edit/intro', router.params) }).catch(() => {
      const message = copy('common_load_failed_message')
      if (message) void Taro.showToast({ title: message, icon: 'none' })
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
