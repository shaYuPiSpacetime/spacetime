import { View, Text, PickerView, PickerViewColumn } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import LoginProfileShell from './components/LoginProfileShell'

const YEARS = Array.from({ length: 30 }, (_, i) => `${1985 + i}年`)
const MONTHS = Array.from({ length: 12 }, (_, i) => `${i + 1}月`)
const DAYS = Array.from({ length: 31 }, (_, i) => `${i + 1}日`)
const ROWS = [
  { offset: -2, top: '0rpx', color: '#D7D7D7', size: '32rpx' },
  { offset: -1, top: '65rpx', color: '#999999', size: '32rpx' },
  { offset: 0, top: '158rpx', color: '#333333', size: '38rpx' },
  { offset: 1, top: '279rpx', color: '#999999', size: '32rpx' },
  { offset: 2, top: '344rpx', color: '#D7D7D7', size: '32rpx' },
]

/**
 * 登录-年龄选择 — 1:1 还原蓝湖「登录-年龄选择」设计稿
 * 三列滚动选择器：年 | 月 | 日
 */
export default function LoginAgePage() {
  const { setStep, updateUserInfo } = useLogin()
  const [value, setValue] = useState([12, 9, 0]) // 默认 1997年 10月 1日
  const [touched, setTouched] = useState(false)

  const handleChange = (e: { detail: { value: number[] } }) => {
    setValue(e.detail.value)
    setTouched(true)
  }

  const handleNext = () => {
    const year = 1985 + value[0]
    const now = new Date()
    const birthdayPassed =
      now.getMonth() + 1 > value[1] + 1 ||
      (now.getMonth() + 1 === value[1] + 1 && now.getDate() >= value[2] + 1)
    updateUserInfo({ age: now.getFullYear() - year - (birthdayPassed ? 0 : 1) })
    setStep('education')
    Taro.navigateTo({ url: '/pages/login/education' }).catch(() => {
      Taro.showToast({ title: '跳转失败，请重试', icon: 'none' })
    })
  }

  return (
    <LoginProfileShell
      description="—你是哪一年出生（为你推荐匹配的异性）—"
      nextActive={touched}
      onNext={handleNext}
    >
      <View
        style={{
          position: 'absolute',
          left: '25rpx',
          top: '493rpx',
          width: '700rpx',
          height: '410rpx',
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: '0',
            top: '124rpx',
            width: '700rpx',
            height: '128rpx',
            borderRadius: '24rpx',
            background: '#E3F1FE',
            border: '2rpx solid #2876FF',
          }}
        />
        {ROWS.map((row) => (
          <View
            key={row.offset}
            style={{
              position: 'absolute',
              left: '0',
              top: row.top,
              width: '700rpx',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <AgeColumnText
              color={row.color}
              size={row.size}
              value={getVisibleValue(YEARS, value[0], row.offset)}
            />
            <AgeColumnText
              color={row.color}
              size={row.size}
              value={getVisibleValue(MONTHS, value[1], row.offset)}
            />
            <AgeColumnText
              color={row.color}
              size={row.size}
              value={getVisibleValue(DAYS, value[2], row.offset)}
            />
          </View>
        ))}

        <PickerView
          value={value}
          onChange={handleChange}
          indicatorStyle="height: 128rpx;"
          maskStyle="background: transparent;"
          style={{
            position: 'absolute',
            left: '0',
            top: '0',
            width: '700rpx',
            height: '410rpx',
            opacity: 0,
          }}
        >
          <PickerViewColumn>
            {YEARS.map((year) => (
              <View key={year} style={{ height: '128rpx' }}>
                <Text>{year}</Text>
              </View>
            ))}
          </PickerViewColumn>
          <PickerViewColumn>
            {MONTHS.map((month) => (
              <View key={month} style={{ height: '128rpx' }}>
                <Text>{month}</Text>
              </View>
            ))}
          </PickerViewColumn>
          <PickerViewColumn>
            {DAYS.map((day) => (
              <View key={day} style={{ height: '128rpx' }}>
                <Text>{day}</Text>
              </View>
            ))}
          </PickerViewColumn>
        </PickerView>
      </View>
    </LoginProfileShell>
  )
}

function getVisibleValue(list: string[], index: number, offset: number) {
  return list[index + offset] || ''
}

function AgeColumnText({ value, color, size }: { value: string; color: string; size: string }) {
  return (
    <View
      style={{
        width: '233rpx',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color,
          fontSize: size,
          fontWeight: 500,
          lineHeight: '53rpx',
        }}
      >
        {value}
      </Text>
    </View>
  )
}
