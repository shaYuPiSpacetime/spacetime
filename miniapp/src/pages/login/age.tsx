import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import { getDemoPageData } from '@/services/lanhuDemo'
import LoginProfileShell from './components/LoginProfileShell'
import './age.scss'

const loginDemo = getDemoPageData('login')
const DEFAULT_BIRTHDAY = parseBirthday(loginDemo.ageRange.defaultBirthday)
const YEARS = Array.from(
  { length: loginDemo.ageRange.max - loginDemo.ageRange.min + 1 },
  (_, i) => `${new Date().getFullYear() - loginDemo.ageRange.max + i}年`,
)
const MONTHS = Array.from({ length: 12 }, (_, i) => `${i + 1}月`)
const DAYS = Array.from({ length: 31 }, (_, i) => `${i + 1}日`)
const DEFAULT_VALUE = [
  Math.max(0, YEARS.indexOf(`${DEFAULT_BIRTHDAY.year}年`)),
  DEFAULT_BIRTHDAY.month - 1,
  DEFAULT_BIRTHDAY.day - 1,
]
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
  const [value, setValue] = useState(DEFAULT_VALUE)
  const [touched, setTouched] = useState(false)

  const handleChange = (e: { detail: { value: number[] } }) => {
    setValue(e.detail.value)
    setTouched(true)
  }

  const handleColumnSelect = (columnIndex: number, nextIndex: number) => {
    if (nextIndex < 0) return
    const maxIndex = columnIndex === 0 ? YEARS.length - 1 : columnIndex === 1 ? MONTHS.length - 1 : DAYS.length - 1
    if (nextIndex > maxIndex) return
    const nextValue = [...value]
    nextValue[columnIndex] = nextIndex
    handleChange({ detail: { value: nextValue } })
  }

  const handleNext = () => {
    const year = Number(YEARS[value[0]].replace('年', ''))
    const now = new Date()
    const birthdayPassed =
      now.getMonth() + 1 > value[1] + 1 ||
      (now.getMonth() + 1 === value[1] + 1 && now.getDate() >= value[2] + 1)
    const month = String(value[1] + 1).padStart(2, '0')
    const day = String(value[2] + 1).padStart(2, '0')
    updateUserInfo({ age: now.getFullYear() - year - (birthdayPassed ? 0 : 1), birthday: `${year}/${month}/${day}` })
    setStep('identity')
    Taro.redirectTo({ url: '/pages/login/identity' }).catch(() => {
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
              onClick={() => handleColumnSelect(0, value[0] + row.offset)}
            />
            <AgeColumnText
              color={row.color}
              size={row.size}
              value={getVisibleValue(MONTHS, value[1], row.offset)}
              onClick={() => handleColumnSelect(1, value[1] + row.offset)}
            />
            <AgeColumnText
              color={row.color}
              size={row.size}
              value={getVisibleValue(DAYS, value[2], row.offset)}
              onClick={() => handleColumnSelect(2, value[2] + row.offset)}
            />
          </View>
        ))}
      </View>
    </LoginProfileShell>
  )
}

function getVisibleValue(list: string[], index: number, offset: number) {
  return list[index + offset] || ''
}

function parseBirthday(defaultBirthday: string) {
  const [year, month, day] = defaultBirthday.split('/').map(Number)
  return {
    year,
    month,
    day,
  }
}

function AgeColumnText({ value, color, size, onClick }: { value: string; color: string; size: string; onClick: () => void }) {
  return (
    <View
      style={{
        width: '233rpx',
        height: '66rpx',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClick}
      hoverClass="btn-hover"
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
