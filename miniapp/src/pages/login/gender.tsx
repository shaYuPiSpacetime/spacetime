import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import { miniappOssIcons } from '@/constants/ossIcons'
import type { DictOption } from '@/types/prd01'
import LoginProfileShell from './components/LoginProfileShell'
import './gender.scss'

export default function LoginGenderPage() {
  const { genderOptions, userInfo, initField, bootstrap, saveInitStep } = useLogin()
  const [selectedCode, setSelectedCode] = useState(userInfo.gender || '')
  const field = initField(1)

  useEffect(() => {
    void bootstrap().catch(showError)
  }, [])

  const handleNext = async () => {
    if (field?.required && !selectedCode) {
      await Taro.showToast({ title: '请选择性别', icon: 'none' })
      return
    }
    try {
      await saveInitStep(1, { gender: selectedCode || undefined })
    } catch (error) {
      await showError(error)
    }
  }

  return (
    <LoginProfileShell
      description="你的性别"
      nextActive={Boolean(selectedCode) || field?.required === false}
      onNext={handleNext}
    >
      {genderOptions.map((option, index) => (
        <GenderCard
          key={option.code}
          option={option}
          active={selectedCode === option.code}
          top={`${448 + index * 245}rpx`}
          onClick={() => setSelectedCode(option.code)}
        />
      ))}
    </LoginProfileShell>
  )
}

function GenderCard({
  option,
  active,
  top,
  onClick,
}: {
  option: DictOption
  active: boolean
  top: string
  onClick: () => void
}) {
  const isFemale = option.code === 'FEMALE'
  const activeBorder = isFemale ? '#FF7F8C' : '#2876FF'
  const icon = isFemale ? miniappOssIcons.genderFemale : miniappOssIcons.genderMale

  return (
    <View
      style={{
        position: 'absolute', left: '25rpx', top, width: '700rpx', height: '196rpx',
        borderRadius: '32rpx',
        background: active
          ? isFemale ? 'linear-gradient(180deg, #FFF2F3 0%, #FFE0E4 100%)' : 'linear-gradient(180deg, #F1F7FF 0%, #E1EEFF 100%)'
          : 'rgba(255,255,255,0.76)',
        border: active ? `4rpx solid ${activeBorder}` : '4rpx solid transparent',
      }}
      onClick={onClick}
      hoverClass="btn-hover"
    >
      <Text style={{ position: 'absolute', left: '66rpx', top: '72rpx', color: active ? '#333333' : '#999999', fontSize: '40rpx', fontWeight: 500, lineHeight: '56rpx' }}>
        {option.label}
      </Text>
      <Image src={icon} mode="aspectFit" style={{ position: 'absolute', right: '69rpx', top: '34rpx', width: '120rpx', height: '120rpx', opacity: active ? 1 : 0.72 }} />
    </View>
  )
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
