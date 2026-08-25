import { ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import type { RegionOption, RegionTreeOption } from '@/types/prd01'
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
  districtCode: string
  includeDistrict?: boolean
  loadDistricts: (cityCode: string) => Promise<RegionOption[]>
  onConfirm: (provinceCode: string, cityCode: string, districtCode: string) => void
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
        <OptionColumn options={options} value={selected} onChange={setSelected} />
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
 * 组合地区选择器：基本资料的现居地和家乡均以 includeDistrict=false 使用省市两级。
 */
export function LanhuRegionSheet({
  title,
  regions,
  provinceCode,
  cityCode,
  districtCode,
  includeDistrict = false,
  loadDistricts,
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
  const [districts, setDistricts] = useState<RegionOption[]>([])
  const [districtIndex, setDistrictIndex] = useState(0)
  const [districtLoading, setDistrictLoading] = useState(false)
  const [districtError, setDistrictError] = useState(false)
  const [provinceScrollTop, setProvinceScrollTop] = useState<number | undefined>(() =>
    regionScrollTop(initialProvinceIndex)
  )
  const [cityScrollTop, setCityScrollTop] = useState<number | undefined>(() =>
    regionScrollTop(initialCityIndex)
  )
  const [districtScrollTop, setDistrictScrollTop] = useState<number | undefined>(0)
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const districtRequestRef = useRef(0)
  const selectedProvince = regions[provinceIndex] || regions[0]
  const cities = selectedProvince?.children || []
  const selectedCity = cities[clampRegionIndex(cityIndex, cities.length)] || cities[0]
  const selectedDistrict =
    districts[clampRegionIndex(districtIndex, districts.length)] || districts[0]

  const releaseControlledScroll = () => {
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current)
    releaseTimerRef.current = setTimeout(() => {
      setProvinceScrollTop(undefined)
      setCityScrollTop(undefined)
      setDistrictScrollTop(undefined)
    }, 240)
  }

  useEffect(() => {
    releaseControlledScroll()
    return () => {
      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const requestId = districtRequestRef.current + 1
    districtRequestRef.current = requestId
    if (!includeDistrict || !selectedCity?.code) {
      setDistricts([])
      setDistrictIndex(0)
      setDistrictLoading(false)
      setDistrictError(false)
      return
    }

    setDistricts([])
    setDistrictIndex(0)
    setDistrictLoading(true)
    setDistrictError(false)
    void loadDistricts(selectedCity.code)
      .then(options => {
        if (requestId !== districtRequestRef.current) return
        const preferredCode = selectedCity.code === cityCode ? districtCode : ''
        const nextIndex = clampRegionIndex(
          options.findIndex(item => item.code === preferredCode),
          options.length
        )
        setDistricts(options)
        setDistrictIndex(nextIndex)
        setDistrictScrollTop(regionScrollTop(nextIndex))
        setDistrictLoading(false)
        releaseControlledScroll()
      })
      .catch(() => {
        if (requestId !== districtRequestRef.current) return
        setDistricts([])
        setDistrictIndex(0)
        setDistrictLoading(false)
        setDistrictError(true)
      })
  }, [selectedCity?.code, cityCode, districtCode, includeDistrict, loadDistricts])

  const selectProvince = (nextIndex: number) => {
    const normalized = clampRegionIndex(nextIndex, regions.length)
    setProvinceIndex(normalized)
    setCityIndex(0)
    setDistricts([])
    setDistrictIndex(0)
    setProvinceScrollTop(regionScrollTop(normalized))
    setCityScrollTop(regionScrollTop(0))
    setDistrictScrollTop(regionScrollTop(0))
    releaseControlledScroll()
  }

  const selectCity = (nextIndex: number) => {
    const normalized = clampRegionIndex(nextIndex, cities.length)
    setCityIndex(normalized)
    setDistricts([])
    setDistrictIndex(0)
    setCityScrollTop(regionScrollTop(normalized))
    setDistrictScrollTop(regionScrollTop(0))
    releaseControlledScroll()
  }

  const selectDistrict = (nextIndex: number) => {
    const normalized = clampRegionIndex(nextIndex, districts.length)
    setDistrictIndex(normalized)
    setDistrictScrollTop(regionScrollTop(normalized))
    releaseControlledScroll()
  }

  return (
    <BottomPicker
      title={title}
      onConfirm={() => {
        if (includeDistrict && districtLoading) {
          void Taro.showToast({ title: '区县加载中，请稍候', icon: 'none' })
          return
        }
        if (includeDistrict && districtError) {
          void Taro.showToast({ title: '区县加载失败，请重新选择城市', icon: 'none' })
          return
        }
        if (selectedProvince && selectedCity) {
          onConfirm(
            selectedProvince.code,
            selectedCity.code,
            includeDistrict ? selectedDistrict?.code || '' : ''
          )
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
              setDistricts([])
              setDistrictIndex(0)
              setCityScrollTop(regionScrollTop(0))
              setDistrictScrollTop(regionScrollTop(0))
              releaseControlledScroll()
            }
          }}
          style={{
            position: 'absolute',
            left: includeDistrict ? '8rpx' : '78rpx',
            top: 0,
            width: includeDistrict ? '200rpx' : '220rpx',
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
            left: includeDistrict ? '228rpx' : '358rpx',
            top: '78rpx',
            width: includeDistrict ? '200rpx' : '220rpx',
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

        {includeDistrict &&
          (districtLoading || districtError || districts.length === 0 ? (
            <View
              style={{
                position: 'absolute',
                left: '448rpx',
                top: '78rpx',
                width: '200rpx',
                height: '78rpx',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: districtError ? '#E35A5A' : '#999999',
                  fontSize: '26rpx',
                  lineHeight: '40rpx',
                }}
              >
                {districtLoading ? '加载中' : districtError ? '加载失败' : '无区县'}
              </Text>
            </View>
          ) : (
            <ScrollView
              scrollY
              scrollTop={districtScrollTop}
              scrollWithAnimation
              enhanced
              showScrollbar={false}
              onScroll={event =>
                setDistrictIndex(regionIndexFromScrollTop(event.detail.scrollTop, districts.length))
              }
              style={{
                position: 'absolute',
                left: '448rpx',
                top: '78rpx',
                width: '200rpx',
                height: '222rpx',
              }}
            >
              {districts.map((item, index) => (
                <View
                  key={item.code}
                  style={{
                    height: '78rpx',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={() => selectDistrict(index)}
                  hoverClass="btn-hover"
                >
                  <Text
                    style={{
                      color:
                        index === districtIndex
                          ? '#0C285A'
                          : index < districtIndex
                            ? '#D7D7D7'
                            : '#999999',
                      fontSize: '28rpx',
                      fontWeight: 500,
                      lineHeight: '40rpx',
                    }}
                  >
                    {trimRegionName(item.label || item.name || '')}
                  </Text>
                </View>
              ))}
              <View style={{ height: `${REGION_WHEEL_BOTTOM_SPACER_RPX}rpx` }} />
            </ScrollView>
          ))}
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
  label?: string
  options: string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      {label ? (
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
      ) : null}
      <ScrollView
        scrollY
        showScrollbar={false}
        style={{
          height: '318rpx',
          borderRadius: '18rpx',
          background: 'transparent',
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
