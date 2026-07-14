import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import LoginProfileShell from './components/LoginProfileShell'
import './identity.scss'

export default function LoginIdentityPage() {
  const { identityOptions, userInfo, initField, copy, bootstrap, saveInitStep } = useLogin()
  const [selectedCode, setSelectedCode] = useState(userInfo.identity || '')
  const field = initField(3)

  useEffect(() => { void bootstrap().catch(showError) }, [])

  const handleNext = async () => {
    if (field?.required && !selectedCode) {
      await Taro.showToast({ title: copy('init_identity_required'), icon: 'none' })
      return
    }
    try {
      await saveInitStep(3, { identity: selectedCode || undefined })
    } catch (error) {
      await showError(error)
    }
  }

  return (
    <View className="login-identity-page">
      <LoginProfileShell description={copy('init_identity_notice')} nextActive={Boolean(selectedCode) || field?.required === false} onNext={handleNext}>
        <View style={{ position: 'absolute', left: '25rpx', top: '442rpx', width: '700rpx' }}>
          {identityOptions.map(option => {
            const isActive = selectedCode === option.code
            return (
              <View key={option.code} style={{ width: '700rpx', height: '128rpx', borderRadius: '48rpx', background: isActive ? '#E3F1FE' : '#FFFFFF', border: isActive ? '2rpx solid #2876FF' : '2rpx solid transparent', marginBottom: '29rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedCode(option.code)} hoverClass="btn-hover">
                <Text style={{ color: isActive ? '#2876FF' : '#333333', fontSize: '38rpx', fontWeight: 500 }}>{option.label}</Text>
              </View>
            )
          })}
        </View>
      </LoginProfileShell>
    </View>
  )
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
