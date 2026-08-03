import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import LoginProfileShell from './components/LoginProfileShell'
import './age.scss'

const MONTHS = Array.from({ length: 12 }, (_, index) => `${index + 1}月`)
const DAYS = Array.from({ length: 31 }, (_, index) => `${index + 1}日`)
const ROWS = [
  { offset: -2, top: '0rpx', color: '#D7D7D7', size: '32rpx' },
  { offset: -1, top: '65rpx', color: '#999999', size: '32rpx' },
  { offset: 0, top: '158rpx', color: '#333333', size: '38rpx' },
  { offset: 1, top: '279rpx', color: '#999999', size: '32rpx' },
  { offset: 2, top: '344rpx', color: '#D7D7D7', size: '32rpx' },
]

/** 登录出生日期选择：蓝湖三列滚轮外观，年龄范围由接口配置。 */
export default function LoginAgePage() {
  const {
    userInfo, ageRange, initField, bootstrap, saveInitStep,
    runtimeLoading, runtimeError, retryRuntime,
  } = useLogin()
  const field = initField(2)
  const years = useMemo(() => buildYears(ageRange.min, ageRange.max), [ageRange.min, ageRange.max])
  const initial = useMemo(() => resolveInitialValue(userInfo.birthday, years), [userInfo.birthday, years])
  const [value, setValue] = useState(initial)

  useEffect(() => {
    void bootstrap().catch(showError)
  }, [])

  useEffect(() => {
    setValue(initial)
  }, [initial[0], initial[1], initial[2]])

  const handleColumnSelect = (columnIndex: number, nextIndex: number) => {
    const limits = [years.length, MONTHS.length, DAYS.length]
    if (nextIndex < 0 || nextIndex >= limits[columnIndex]) return
    setValue(current => current.map((item, index) => index === columnIndex ? nextIndex : item))
  }

  const hasValidDate = Boolean(
    years[value[0]] && MONTHS[value[1]] && DAYS[value[2]]
  )

  const handleNext = async () => {
    if (field?.required && !hasValidDate) {
      await Taro.showToast({ title: '请选择出生日期', icon: 'none' })
      return
    }
    const year = Number(years[value[0]]?.replace('年', ''))
    if (!year) return
    const birthday = `${year}-${String(value[1] + 1).padStart(2, '0')}-${String(value[2] + 1).padStart(2, '0')}`
    try {
      await saveInitStep(2, { birthday })
    } catch (error) {
      await showError(error)
    }
  }

  return (
    <LoginProfileShell
      description="—你是哪一年出生（为你推荐匹配的异性）—"
      nextActive={hasValidDate || field?.required === false}
      loading={runtimeLoading || (!runtimeError && years.length === 0)}
      error={runtimeError}
      onRetry={retryRuntime}
      onNext={handleNext}
    >
      <View style={{ position: 'absolute', left: '25rpx', top: '493rpx', width: '700rpx', height: '410rpx' }}>
        <View style={{ position: 'absolute', left: '0', top: '124rpx', width: '700rpx', height: '128rpx', borderRadius: '24rpx', background: '#E3F1FE', border: '2rpx solid #2876FF' }} />
        {ROWS.map(row => (
          <View key={row.offset} style={{ position: 'absolute', left: '0', top: row.top, width: '700rpx', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <AgeColumnText color={row.color} size={row.size} value={visible(years, value[0], row.offset)} onClick={() => handleColumnSelect(0, value[0] + row.offset)} />
            <AgeColumnText color={row.color} size={row.size} value={visible(MONTHS, value[1], row.offset)} onClick={() => handleColumnSelect(1, value[1] + row.offset)} />
            <AgeColumnText color={row.color} size={row.size} value={visible(DAYS, value[2], row.offset)} onClick={() => handleColumnSelect(2, value[2] + row.offset)} />
          </View>
        ))}
      </View>
    </LoginProfileShell>
  )
}

function buildYears(minAge?: number, maxAge?: number) {
  if (!Number.isFinite(minAge) || !Number.isFinite(maxAge) || !minAge || !maxAge || maxAge < minAge) {
    return []
  }
  const currentYear = new Date().getFullYear()
  return Array.from(
    { length: maxAge - minAge + 1 },
    (_, index) => `${currentYear - maxAge + index}年`
  )
}

function resolveInitialValue(birthday: string | undefined, years: string[]) {
  const normalized = birthday?.replace(/\//g, '-')
  const [year, month, day] = normalized?.split('-').map(Number) || []
  const yearIndex = years.indexOf(`${year}年`)
  return [yearIndex >= 0 ? yearIndex : Math.floor(Math.max(years.length - 1, 0) / 2), Math.max((month || 1) - 1, 0), Math.max((day || 1) - 1, 0)]
}

function visible(list: string[], index: number, offset: number) {
  return list[index + offset] || ''
}

function AgeColumnText({ value, color, size, onClick }: { value: string; color: string; size: string; onClick: () => void }) {
  return (
    <View style={{ width: '233rpx', height: '66rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClick} hoverClass="btn-hover">
      <Text style={{ color, fontSize: size, fontWeight: 500, lineHeight: '53rpx' }}>{value}</Text>
    </View>
  )
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
