import { Image, View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import LoginProfileShell from './components/LoginProfileShell'
import { miniappOssIcons } from '@/constants/ossIcons'
import './gender.scss'

/**
 * 登录-性别选择 — 1:1 还原蓝湖「登录-性别选择」设计稿
 */
export default function LoginGenderPage() {
  const { goalOptions, setStep, updateUserInfo } = useLogin()
  const [selected, setSelected] = useState<'female' | 'male' | null>(null)
  const [selectedGoal, setSelectedGoal] = useState(goalOptions[0] ?? '见面便好')
  const [isGoalMode, setIsGoalMode] = useState(false)

  useLoad((options) => {
    const variant = options?.variant ?? 'none'
    if (variant === 'goal') {
      setIsGoalMode(true)
      setSelectedGoal(goalOptions[0] ?? '见面便好')
      return
    }

    setIsGoalMode(false)
    if (variant === 'none') {
      setSelected(null)
      return
    }

    if (variant === 'female' || variant === 'male') {
      setSelected(variant)
      return
    }
  })

  const handleNext = async () => {
    if (isGoalMode) {
      if (!selectedGoal) return Taro.showToast({ title: '请选择脱单目标', icon: 'none' })
      updateUserInfo({ datingGoal: selectedGoal })
      setStep('education')
      await Taro.redirectTo({ url: '/pages/login/education' })
      return
    }

    if (!selected) return Taro.showToast({ title: '请选择性别', icon: 'none' })
    updateUserInfo({ gender: selected })
    setStep('age')
    await Taro.redirectTo({ url: '/pages/login/age' })
  }

  return (
    <LoginProfileShell
      description={isGoalMode ? '—你的脱单目标（让推荐更贴合期待）—' : '—你的性别（注册后性别不可更改）—'}
      nextActive={isGoalMode ? Boolean(selectedGoal) : Boolean(selected)}
      onNext={handleNext}
    >
      {isGoalMode ? (
        <GoalChoicePanel
          options={goalOptions}
          selected={selectedGoal}
          onSelect={setSelectedGoal}
        />
      ) : (
        <>
          <GenderCard
            active={selected === 'female'}
            gender="female"
            label="我是女生"
            top="448rpx"
            onClick={() => setSelected('female')}
          />
          <GenderCard
            active={selected === 'male'}
            gender="male"
            label="我是男生"
            top="693rpx"
            onClick={() => setSelected('male')}
          />
        </>
      )}
    </LoginProfileShell>
  )
}

interface GenderCardProps {
  active: boolean
  gender: 'female' | 'male'
  label: string
  top: string
  onClick: () => void
}

function GenderCard({ active, gender, label, top, onClick }: GenderCardProps) {
  const isFemale = gender === 'female'
  const activeBorder = isFemale ? '#FF7F8C' : '#2876FF'
  const icon = isFemale ? miniappOssIcons.genderFemale : miniappOssIcons.genderMale

  return (
    <View
      style={{
        position: 'absolute',
        left: '25rpx',
        top,
        width: '700rpx',
        height: '196rpx',
        borderRadius: '32rpx',
        background: active
          ? isFemale
            ? 'linear-gradient(180deg, #FFF2F3 0%, #FFE0E4 100%)'
            : 'linear-gradient(180deg, #F1F7FF 0%, #E1EEFF 100%)'
          : 'rgba(255,255,255,0.76)',
        border: active ? `4rpx solid ${activeBorder}` : '4rpx solid rgba(255,255,255,0)',
      }}
      onClick={onClick}
      hoverClass="btn-hover"
    >
      <Text
        style={{
          position: 'absolute',
          left: '66rpx',
          top: '72rpx',
          color: active ? '#333333' : '#999999',
          fontSize: '40rpx',
          fontWeight: 500,
          lineHeight: '56rpx',
        }}
      >
        {label}
      </Text>
      <Image
        src={icon}
        mode="aspectFit"
        style={{
          position: 'absolute',
          right: '69rpx',
          top: '34rpx',
          width: '120rpx',
          height: '120rpx',
          opacity: active ? 1 : 0.72,
        }}
      />
    </View>
  )
}

function GoalChoicePanel({
  options,
  selected,
  onSelect,
}: {
  options: string[]
  selected: string
  onSelect: (value: string) => void
}) {
  const featuredGoal = '见面便好'
  return (
    <View
      style={{
        position: 'absolute',
        left: '25rpx',
        top: '420rpx',
        width: '700rpx',
      }}
    >
      {options.map((option) => {
        const active = option === selected
        return (
          <View
            key={option}
            style={{
              width: '700rpx',
              height: '108rpx',
              borderRadius: '48rpx',
              background: active ? '#E3F1FE' : 'rgba(255,255,255,0.84)',
              border: active ? '2rpx solid #2876FF' : '2rpx solid rgba(255,255,255,0)',
              marginBottom: '18rpx',
              padding: '0 34rpx',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: active ? '0 12rpx 28rpx rgba(40,118,255,0.10)' : '0 8rpx 24rpx rgba(11,38,90,0.05)',
            }}
            onClick={() => onSelect(option)}
            hoverClass="btn-hover"
          >
            <Text
              style={{
                color: active ? '#2876FF' : '#333333',
                fontSize: '34rpx',
                fontWeight: active ? 700 : 500,
                lineHeight: '48rpx',
              }}
            >
              {option}
            </Text>
            {active && (
              <View
                style={{
                  height: '48rpx',
                  borderRadius: '98rpx',
                  background: '#FFFFFF',
                  padding: '0 20rpx',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#2876FF', fontSize: '22rpx', fontWeight: 800, lineHeight: '31rpx' }}>
                  {option === featuredGoal ? '推荐' : '已选择'}
                </Text>
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}
