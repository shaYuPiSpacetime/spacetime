import { Picker, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import LoginProfileShell from './components/LoginProfileShell'
import './age.scss'

export default function LoginAgePage() {
  const { userInfo, ageRange, initField, copy, bootstrap, saveInitStep } = useLogin()
  const [birthday, setBirthday] = useState((userInfo.birthday || '').replace(/\//g, '-'))
  const field = initField(2)
  const range = useMemo(() => buildBirthdayRange(ageRange.min, ageRange.max), [ageRange.min, ageRange.max])

  useEffect(() => {
    void bootstrap().catch(showError)
  }, [])

  const handleNext = async () => {
    if (field?.required && !birthday) {
      await Taro.showToast({ title: copy('init_birthday_required'), icon: 'none' })
      return
    }
    try {
      await saveInitStep(2, { birthday: birthday || undefined })
    } catch (error) {
      await showError(error)
    }
  }

  return (
    <LoginProfileShell
      description={copy('init_birthday_notice')}
      nextActive={Boolean(birthday) || field?.required === false}
      onNext={handleNext}
    >
      <Picker
        mode="date"
        value={birthday || range.end}
        start={range.start}
        end={range.end}
        onChange={event => setBirthday(event.detail.value)}
      >
        <View style={{ position: 'absolute', left: '25rpx', top: '520rpx', width: '700rpx', height: '128rpx', borderRadius: '24rpx', background: '#FFFFFF', border: birthday ? '2rpx solid #2876FF' : '2rpx solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: birthday ? '#2876FF' : '#999999', fontSize: '38rpx', fontWeight: 500 }}>
            {birthday || copy('init_birthday_placeholder')}
          </Text>
        </View>
      </Picker>
    </LoginProfileShell>
  )
}

function buildBirthdayRange(minAge?: number, maxAge?: number) {
  const today = new Date()
  const earliest = new Date(today.getFullYear() - (maxAge || 0), today.getMonth(), today.getDate())
  const latest = new Date(today.getFullYear() - (minAge || 0), today.getMonth(), today.getDate())
  return { start: formatDate(earliest), end: formatDate(latest) }
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
