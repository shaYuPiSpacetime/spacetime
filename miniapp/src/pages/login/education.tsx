import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import LoginProfileShell from './components/LoginProfileShell'
import './education.scss'

export default function LoginEducationPage() {
  const {
    educationOptions, userInfo, initField, bootstrap, saveInitStep,
    runtimeLoading, runtimeError, retryRuntime,
  } = useLogin()
  const [selectedCode, setSelectedCode] = useState(userInfo.educationLevel || '')
  const field = initField(4)

  useEffect(() => { void bootstrap().catch(showError) }, [])

  const handleNext = async () => {
    if (field?.required && !selectedCode) {
      await Taro.showToast({ title: '请选择学历', icon: 'none' })
      return
    }
    try {
      await saveInitStep(4, { educationLevel: selectedCode || undefined })
    } catch (error) {
      await showError(error)
    }
  }

  return (
    <LoginProfileShell
      description="你的最高学历"
      nextActive={Boolean(selectedCode) || field?.required === false}
      loading={runtimeLoading || (!runtimeError && educationOptions.length === 0)}
      error={runtimeError}
      onRetry={retryRuntime}
      onNext={handleNext}
    >
      <View style={{ position: 'absolute', left: '25rpx', top: '442rpx', width: '700rpx' }}>
        {educationOptions.map(option => {
          const isActive = selectedCode === option.code
          return (
            <View key={option.code} style={{ width: '700rpx', height: '128rpx', borderRadius: '24rpx', background: isActive ? '#E3F1FE' : '#FFFFFF', border: isActive ? '2rpx solid #2876FF' : '2rpx solid #FFFFFF', marginBottom: '29rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedCode(option.code)} hoverClass="btn-hover">
              <Text style={{ color: isActive ? '#2876FF' : '#333333', fontSize: '38rpx', fontWeight: 500 }}>{option.label}</Text>
            </View>
          )
        })}
      </View>
    </LoginProfileShell>
  )
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
