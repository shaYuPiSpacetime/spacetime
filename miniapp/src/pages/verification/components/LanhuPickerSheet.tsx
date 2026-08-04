import { ScrollView, Text, View } from '@tarojs/components'
import { useEffect, useRef, useState } from 'react'
import type { RegionTreeOption } from '@/types/prd01'
import { getWindowMetrics } from '@/utils/system'
import { BottomPicker } from './VerificationShell'

interface LanhuOptionSheetProps {
  title: string
  options: string[]
  value: string
  onConfirm: (value: string) => void
  onClose: () => void
}

interface LanhuDualColumnSheetProps {
  title: string
  leftLabel: string
  leftOptions: string[]
  leftValue: string
  rightLabel: string
  rightOptions: string[]
  rightValue: string
  onConfirm: (leftValue: string, rightValue: string) => void
  onClose: () => void
}

interface LanhuDateSheetProps {
  title: string
  value: string
  onConfirm: (value: string) => void
  onClose: () => void
}

interface LanhuRegionSheetProps {
  title: string
  regions: RegionTreeOption[]
  provinceCode: string
  cityCode: string
  onConfirm: (provinceCode: string, cityCode: string) => void
  onClose: () => void
}

const YEARS = Array.from({ length: 39 }, (_, index) => `${1970 + index}年`)
const MONTHS = Array.from({ length: 12 }, (_, index) => `${index + 1}月`)
const DAYS = Array.from({ length: 31 }, (_, index) => `${index + 1}日`)
const REGION_ROW_HEIGHT_RPX = 78
const REGION_PROVINCE_TOP_SPACER_RPX = 78
const REGION_WHEEL_BOTTOM_SPACER_RPX = 144

export function LanhuOptionSheet({
  title,
  options,
  value,
  onConfirm,
  onClose,
}: LanhuOptionSheetProps) {
  const [selected, setSelected] = useState(value || options[0])

  return (
    <BottomPicker title={title} onConfirm={() => onConfirm(selected)} onClose={onClose}>
      <View style={{ marginTop: '34rpx' }}>
        <OptionColumn label={title} options={options} value={selected} onChange={setSelected} />
      </View>
    </BottomPicker>
  )
}

export function LanhuDualColumnSheet({
  title,
  leftLabel,
  leftOptions,
  leftValue,
  rightLabel,
  rightOptions,
  rightValue,
  onConfirm,
  onClose,
}: LanhuDualColumnSheetProps) {
  const [leftSelected, setLeftSelected] = useState(leftValue || leftOptions[0])
  const [rightSelected, setRightSelected] = useState(rightValue || rightOptions[0])

  return (
    <BottomPicker
      title={title}
      onConfirm={() => onConfirm(leftSelected, rightSelected)}
      onClose={onClose}
    >
      <View style={{ marginTop: '34rpx', display: 'flex', flexDirection: 'row' }}>
        <OptionColumn
          label={leftLabel}
          options={leftOptions}
          value={leftSelected}
          onChange={setLeftSelected}
        />
        <View style={{ width: '20rpx' }} />
        <OptionColumn
          label={rightLabel}
          options={rightOptions}
          value={rightSelected}
          onChange={setRightSelected}
        />
      </View>
    </BottomPicker>
  )
}

export function LanhuDateSheet({ title, value, onConfirm, onClose }: LanhuDateSheetProps) {
  const parsed = parseDate(value)
  const [year, setYear] = useState(`${parsed.year}年`)
  const [month, setMonth] = useState(`${parsed.month}月`)
  const [day, setDay] = useState(`${parsed.day}日`)

  const handleConfirm = () => {
    const normalizedMonth = String(Number(month.replace('月', ''))).padStart(2, '0')
    const normalizedDay = String(Number(day.replace('日', ''))).padStart(2, '0')
    onConfirm(`${year.replace('年', '')}/${normalizedMonth}/${normalizedDay}`)
  }

  return (
    <BottomPicker title={title} onConfirm={handleConfirm} onClose={onClose}>
      <View style={{ marginTop: '34rpx', display: 'flex', flexDirection: 'row' }}>
        <OptionColumn label="年" options={YEARS} value={year} onChange={setYear} />
        <View style={{ width: '16rpx' }} />
        <OptionColumn label="月" options={MONTHS} value={month} onChange={setMonth} />
        <View style={{ width: '16rpx' }} />
        <OptionColumn label="日" options={DAYS} value={day} onChange={setDay} />
      </View>
    </BottomPicker>
  )
}

/**
 * 省市两级组合选择器。现居地和家乡统一不采集区县。
 */
export function LanhuRegionSheet({
  title,
  regions,
  provinceCode,
  cityCode,
  onConfirm,
  onClose,
}: LanhuRegionSheetProps) {
  const initialProvinceIndex = clampRegionIndex(
    regions.findIndex(item => item.code === provinceCode),
    regions.length
  )
  const initialProvince = regions[initialProvinceIndex]
  const initialCityIndex = clampRegionIndex(
    initialProvince?.children.findIndex(item => item.code === cityCode) ?? 0,
    initialProvince?.children.length || 0
  )
  const [provinceIndex, setProvinceIndex] = useState(initialProvinceIndex)
  const [cityIndex, setCityIndex] = useState(initialCityIndex)
  const [provinceScrollTop, setProvinceScrollTop] = useState<number | undefined>(() =>
    regionScrollTop(initialProvinceIndex)
  )
  const [cityScrollTop, setCityScrollTop] = useState<number | undefined>(() =>
    regionScrollTop(initialCityIndex)
  )
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedProvince = regions[provinceIndex] || regions[0]
  const cities = selectedProvince?.children || []
  const selectedCity = cities[clampRegionIndex(cityIndex, cities.length)] || cities[0]

  const releaseControlledScroll = () => {
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current)
    releaseTimerRef.current = setTimeout(() => {
      setProvinceScrollTop(undefined)
      setCityScrollTop(undefined)
    }, 240)
  }

  useEffect(() => {
    releaseControlledScroll()
    return () => {
      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current)
    }
  }, [])

  const selectProvince = (nextIndex: number) => {
    const normalized = clampRegionIndex(nextIndex, regions.length)
    setProvinceIndex(normalized)
    setCityIndex(0)
    setProvinceScrollTop(regionScrollTop(normalized))
    setCityScrollTop(regionScrollTop(0))
    releaseControlledScroll()
  }

  const selectCity = (nextIndex: number) => {
    const normalized = clampRegionIndex(nextIndex, cities.length)
    setCityIndex(normalized)
    setCityScrollTop(regionScrollTop(normalized))
    releaseControlledScroll()
  }

  return (
    <BottomPicker
      title={title}
      onConfirm={() => {
        if (selectedProvince && selectedCity) {
          onConfirm(selectedProvince.code, selectedCity.code)
        }
      }}
      onClose={onClose}
    >
      <View
        style={{ width: '512rpx', margin: '50rpx auto 0', display: 'flex', flexDirection: 'row' }}
      >
        <View style={{ width: '256rpx', textAlign: 'center' }}>
          <Text
            style={{ color: '#0C285A', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}
          >
            中国
          </Text>
        </View>
        <View style={{ width: '256rpx', textAlign: 'center' }}>
          <Text style={{ color: '#999999', fontSize: '26rpx', lineHeight: '40rpx' }}>
            海外地区国家
          </Text>
        </View>
      </View>
      <View style={{ width: '512rpx', margin: '0 auto', display: 'flex', flexDirection: 'row' }}>
        <View style={{ width: '256rpx', display: 'flex', justifyContent: 'center' }}>
          <View
            style={{ width: '51rpx', height: '6rpx', borderRadius: '9rpx', background: '#2876FF' }}
          />
        </View>
        <View style={{ width: '256rpx' }} />
      </View>

      <View
        style={{
          position: 'relative',
          width: '656rpx',
          height: '300rpx',
          margin: '66rpx auto 0',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: '78rpx',
            width: '656rpx',
            height: '78rpx',
            borderRadius: '24rpx',
            background: '#E3F1FE',
          }}
        />
        <ScrollView
          scrollY
          scrollTop={provinceScrollTop}
          scrollWithAnimation
          enhanced
          showScrollbar={false}
          onScroll={event => {
            const nextIndex = regionIndexFromScrollTop(event.detail.scrollTop, regions.length)
            if (nextIndex !== provinceIndex) {
              setProvinceIndex(nextIndex)
              setCityIndex(0)
              setCityScrollTop(regionScrollTop(0))
              releaseControlledScroll()
            }
          }}
          style={{
            position: 'absolute',
            left: '78rpx',
            top: 0,
            width: '220rpx',
            height: '300rpx',
          }}
        >
          <View style={{ height: `${REGION_PROVINCE_TOP_SPACER_RPX}rpx` }} />
          {regions.map((item, index) => (
            <View
              key={item.code}
              style={{
                height: '78rpx',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={() => selectProvince(index)}
              hoverClass="btn-hover"
            >
              <Text
                style={{
                  color:
                    index === provinceIndex
                      ? '#0C285A'
                      : index < provinceIndex
                        ? '#D7D7D7'
                        : '#999999',
                  fontSize: '28rpx',
                  fontWeight: 500,
                  lineHeight: '40rpx',
                }}
              >
                {trimRegionName(item.name)}
              </Text>
            </View>
          ))}
          <View style={{ height: `${REGION_WHEEL_BOTTOM_SPACER_RPX}rpx` }} />
        </ScrollView>

        <ScrollView
          scrollY
          scrollTop={cityScrollTop}
          scrollWithAnimation
          enhanced
          showScrollbar={false}
          onScroll={event =>
            setCityIndex(regionIndexFromScrollTop(event.detail.scrollTop, cities.length))
          }
          style={{
            position: 'absolute',
            left: '358rpx',
            top: '78rpx',
            width: '220rpx',
            height: '222rpx',
          }}
        >
          {cities.map((item, index) => (
            <View
              key={item.code}
              style={{
                height: '78rpx',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={() => selectCity(index)}
              hoverClass="btn-hover"
            >
              <Text
                style={{
                  color:
                    index === cityIndex ? '#0C285A' : index < cityIndex ? '#D7D7D7' : '#999999',
                  fontSize: '28rpx',
                  fontWeight: 500,
                  lineHeight: '40rpx',
                }}
              >
                {trimRegionName(item.name)}
              </Text>
            </View>
          ))}
          <View style={{ height: `${REGION_WHEEL_BOTTOM_SPACER_RPX}rpx` }} />
        </ScrollView>
      </View>
    </BottomPicker>
  )
}

function regionScrollTop(index: number) {
  return Math.max(0, regionRpxToPx(index * REGION_ROW_HEIGHT_RPX))
}

function regionIndexFromScrollTop(scrollTop: number, length: number) {
  if (length <= 0) return 0
  return clampRegionIndex(Math.round(scrollTop / regionRpxToPx(REGION_ROW_HEIGHT_RPX)), length)
}

function clampRegionIndex(index: number, length: number) {
  if (length <= 0 || index < 0) return 0
  return Math.min(index, length - 1)
}

function regionRpxToPx(value: number) {
  return (value * getWindowMetrics().windowWidth) / 750
}

function trimRegionName(value: string) {
  return value.replace(/[省市区县]$/u, '')
}

function OptionColumn({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text
        style={{
          display: 'block',
          color: '#697E9C',
          fontSize: '24rpx',
          lineHeight: '34rpx',
          textAlign: 'center',
          marginBottom: '14rpx',
        }}
      >
        {label}
      </Text>
      <ScrollView
        scrollY
        showScrollbar={false}
        style={{
          height: '318rpx',
          borderRadius: '18rpx',
          background: '#F7FAFF',
          padding: '8rpx',
          boxSizing: 'border-box',
        }}
      >
        {options.map(option => {
          const active = option === value
          return (
            <View
              key={option}
              style={{
                height: '74rpx',
                borderRadius: '12rpx',
                background: active ? '#E3F1FE' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '6rpx',
              }}
              onClick={() => onChange(option)}
              hoverClass="btn-hover"
            >
              <Text
                style={{
                  color: active ? '#2876FF' : '#333333',
                  fontSize: active ? '30rpx' : '28rpx',
                  fontWeight: active ? 800 : 500,
                  lineHeight: '42rpx',
                }}
              >
                {option}
              </Text>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

function parseDate(value: string) {
  const [yearValue, monthValue, dayValue] = value.replace(/-/g, '/').split('/').map(Number)
  return {
    year: yearValue || 1997,
    month: monthValue || 3,
    day: dayValue || 6,
  }
}
