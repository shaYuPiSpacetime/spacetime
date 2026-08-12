import { PickerView, PickerViewColumn, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import {
  formatBirthDate,
  getDaysInMonth,
  resolveBirthDateInitialValue,
  updateBirthDatePickerColumn,
  type BirthDateSelection,
} from '@/domain/birthDateWheel'
import { useLogin } from '@/hooks/useLogin'
import LoginProfileShell from './components/LoginProfileShell'
import './age.scss'

const MONTHS = Array.from({ length: 12 }, (_, index) => `${index + 1}月`)
type PickerColumn = 'year' | 'month' | 'day'

/** 登录出生日期选择：蓝湖三列滚轮外观，年龄范围由接口配置。 */
export default function LoginAgePage() {
  const {
    userInfo,
    ageRange,
    initField,
    bootstrap,
    saveInitStep,
    runtimeLoading,
    runtimeError,
    retryRuntime,
  } = useLogin()
  const field = initField(2)
  const years = useMemo(() => buildYears(ageRange.min, ageRange.max), [ageRange.min, ageRange.max])
  const initial = useMemo(
    () => resolveBirthDateInitialValue(userInfo.birthday, years),
    [userInfo.birthday, years]
  )
  const [value, setValue] = useState<BirthDateSelection>(initial)
  const [pickingColumn, setPickingColumn] = useState<PickerColumn>()
  const days = useMemo(() => {
    const year = Number(years[value[0]]?.replace('年', ''))
    if (!Number.isInteger(year) || year <= 0) return []
    return Array.from({ length: getDaysInMonth(year, value[1]) }, (_, index) => `${index + 1}日`)
  }, [value[0], value[1], years])

  useEffect(() => {
    void bootstrap().catch(showError)
  }, [])

  useEffect(() => {
    setValue(initial)
  }, [initial[0], initial[1], initial[2]])

  const handlePickerChange = (
    column: PickerColumn,
    event: { detail: { value: number[] } }
  ) => {
    const nextIndex = event.detail.value[0]
    setValue(current => updateBirthDatePickerColumn(years, current, column, nextIndex))
  }

  const handlePickerStart = (column: PickerColumn) => setPickingColumn(column)
  const handlePickerEnd = () => setPickingColumn(undefined)

  const hasValidDate = Boolean(formatBirthDate(years, value))

  const handleNext = async () => {
    if (field?.required && !hasValidDate) {
      await Taro.showToast({ title: '请选择出生日期', icon: 'none' })
      return
    }
    const birthday = formatBirthDate(years, value)
    if (!birthday) return
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
      <View className="login-age-picker-wrap">
        <View className="login-age-picker__selection" />
        <View className="login-age-picker-row">
          <PickerView
            className="login-age-picker login-age-picker--year"
            indicatorStyle="height: 128rpx; border: 0; background: transparent;"
            maskStyle="background: transparent;"
            value={[value[0]]}
            onChange={event => handlePickerChange('year', event)}
            onPickStart={() => handlePickerStart('year')}
            onPickEnd={handlePickerEnd}
          >
            <PickerViewColumn
              className={`login-age-picker__column${pickingColumn === 'year' ? ' login-age-picker__column--picking' : ''}`}
            >
              {renderPickerItems(years, value[0], 'year')}
            </PickerViewColumn>
          </PickerView>
          <PickerView
            className="login-age-picker login-age-picker--month"
            indicatorStyle="height: 128rpx; border: 0; background: transparent;"
            maskStyle="background: transparent;"
            value={[value[1]]}
            onChange={event => handlePickerChange('month', event)}
            onPickStart={() => handlePickerStart('month')}
            onPickEnd={handlePickerEnd}
          >
            <PickerViewColumn
              className={`login-age-picker__column${pickingColumn === 'month' ? ' login-age-picker__column--picking' : ''}`}
            >
              {renderPickerItems(MONTHS, value[1], 'month')}
            </PickerViewColumn>
          </PickerView>
          <PickerView
            className="login-age-picker login-age-picker--day"
            indicatorStyle="height: 128rpx; border: 0; background: transparent;"
            maskStyle="background: transparent;"
            value={[value[2]]}
            onChange={event => handlePickerChange('day', event)}
            onPickStart={() => handlePickerStart('day')}
            onPickEnd={handlePickerEnd}
          >
            <PickerViewColumn
              className={`login-age-picker__column${pickingColumn === 'day' ? ' login-age-picker__column--picking' : ''}`}
            >
              {renderPickerItems(days, value[2], 'day')}
            </PickerViewColumn>
          </PickerView>
        </View>
        <View className="login-age-picker__indicator-cover login-age-picker__indicator-cover--top" />
        <View className="login-age-picker__indicator-cover login-age-picker__indicator-cover--bottom" />
      </View>
    </LoginProfileShell>
  )
}

function buildYears(minAge?: number, maxAge?: number) {
  if (
    !Number.isFinite(minAge) ||
    !Number.isFinite(maxAge) ||
    !minAge ||
    !maxAge ||
    maxAge < minAge
  ) {
    return []
  }
  const currentYear = new Date().getFullYear()
  return Array.from(
    { length: maxAge - minAge + 1 },
    (_, index) => `${currentYear - maxAge + index}年`
  )
}

function renderPickerItems(items: string[], selectedIndex: number, prefix: string) {
  return items.map((item, index) => {
    const distance = Math.abs(index - selectedIndex)
    const stateClass =
      distance === 0
        ? ' login-age-picker__item--active'
        : distance === 1
          ? ' login-age-picker__item--near'
          : distance === 2
            ? ' login-age-picker__item--far'
            : ' login-age-picker__item--outer'
    const directionClass =
      index < selectedIndex
        ? ' login-age-picker__item--above'
        : index > selectedIndex
          ? ' login-age-picker__item--below'
          : ''
    return (
      <View
        key={`${prefix}-${item}`}
        className={`login-age-picker__item login-age-picker__item--${prefix}${stateClass}${directionClass}`}
      >
        <Text>{item}</Text>
      </View>
    )
  })
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
