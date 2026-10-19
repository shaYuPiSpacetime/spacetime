import { PickerView, PickerViewColumn, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import type { RegionOption, RegionTreeOption } from '@/types/prd01'
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
  const storedProvinceIndex = regions.findIndex(item => item.code === provinceCode)
  // Only recover a missing legacy province when the saved city has exactly one owner.
  // A valid but mismatched province is not silently replaced with another province.
  const cityOwners = cityCode
    ? regions
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.children.some(city => city.code === cityCode))
    : []
  const resolvedProvinceIndex =
    storedProvinceIndex >= 0
      ? storedProvinceIndex
      : cityOwners.length === 1
        ? cityOwners[0].index
        : -1
  const initialProvinceIndex = clampRegionIndex(resolvedProvinceIndex, regions.length)
  const initialProvince = regions[initialProvinceIndex]
  const initialCityIndex = clampRegionIndex(
    initialProvince?.children.findIndex(item => item.code === cityCode) ?? 0,
    initialProvince?.children.length || 0
  )
  const staleCitySelection =
    (Boolean(provinceCode) && resolvedProvinceIndex < 0) ||
    (Boolean(cityCode) && !initialProvince?.children.some(item => item.code === cityCode))
  const citySelectedByUser = useRef(false)
  const pickerTouched = useRef(false)
  const pickerScrolling = useRef(false)
  const selectionRef = useRef([initialProvinceIndex, initialCityIndex, 0])
  const [provinceIndex, setProvinceIndex] = useState(initialProvinceIndex)
  const [cityIndex, setCityIndex] = useState(initialCityIndex)
  const [districts, setDistricts] = useState<RegionOption[]>([])
  const [districtIndex, setDistrictIndex] = useState(0)
  const [districtLoading, setDistrictLoading] = useState(false)
  const [districtError, setDistrictError] = useState(false)
  const districtRequestRef = useRef(0)
  const selectedProvince = regions[provinceIndex] || regions[0]
  const cities = selectedProvince?.children || []
  const selectedCity = cities[clampRegionIndex(cityIndex, cities.length)] || cities[0]

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
        selectionRef.current[2] = nextIndex
        setDistrictLoading(false)
      })
      .catch(() => {
        if (requestId !== districtRequestRef.current) return
        setDistricts([])
        setDistrictIndex(0)
        setDistrictLoading(false)
        setDistrictError(true)
      })
  }, [selectedCity?.code, cityCode, districtCode, includeDistrict, loadDistricts])

  const resetDistrictsForCity = (nextCityCode: string | undefined) => {
    const [currentProvince, currentCity] = selectionRef.current
    if (nextCityCode === regions[currentProvince]?.children[currentCity]?.code) return
    districtRequestRef.current += 1
    setDistricts([])
    setDistrictIndex(0)
    setDistrictLoading(includeDistrict && Boolean(nextCityCode))
    setDistrictError(false)
  }

  const updateSelection = (next: number[]) => {
    selectionRef.current = next
    setProvinceIndex(next[0])
    setCityIndex(next[1])
    setDistrictIndex(next[2])
    citySelectedByUser.current = true
  }

  const selectProvince = (nextIndex: number) => {
    const normalized = clampRegionIndex(nextIndex, regions.length)
    resetDistrictsForCity(regions[normalized]?.children[0]?.code)
    updateSelection([
      normalized,
      0,
      selectionRef.current[0] === normalized && selectionRef.current[1] === 0
        ? selectionRef.current[2]
        : 0,
    ])
  }

  const selectCity = (nextIndex: number) => {
    const current = selectionRef.current
    const currentCities = regions[current[0]]?.children || []
    const normalized = clampRegionIndex(nextIndex, currentCities.length)
    resetDistrictsForCity(currentCities[normalized]?.code)
    updateSelection([current[0], normalized, normalized === current[1] ? current[2] : 0])
  }

  const handleRegionChange = (value: number[]) => {
    if (!pickerTouched.current) return
    // 原生滚轮一次返回整组索引；跨省时旧城市索引不能套用到新省份。
    // 用 ref 消费连续事件，避免同一批 React 更新中的旧闭包覆盖最新省市。
    const current = selectionRef.current
    const nextProvince = clampRegionIndex(value[0], regions.length)
    const nextCities = regions[nextProvince]?.children || []
    const provinceChanged = nextProvince !== current[0]
    const nextCity = provinceChanged ? 0 : clampRegionIndex(value[1], nextCities.length)
    const cityChanged = provinceChanged || nextCity !== current[1]
    const nextDistrict = cityChanged
      ? 0
      : clampRegionIndex(value[2] ?? current[2], districts.length)
    if (!cityChanged && nextDistrict === current[2]) return
    resetDistrictsForCity(nextCities[nextCity]?.code)
    updateSelection([nextProvince, nextCity, nextDistrict])
  }

  return (
    <BottomPicker
      title={title}
      onConfirm={() => {
        if (pickerScrolling.current) {
          void Taro.showToast({ title: '请等待地区滚动结束', icon: 'none' })
          return
        }
        if (staleCitySelection && !citySelectedByUser.current) {
          void Taro.showToast({ title: '地区选项已更新，请重新选择省市', icon: 'none' })
          return
        }
        if (includeDistrict && districtLoading) {
          void Taro.showToast({ title: '区县加载中，请稍候', icon: 'none' })
          return
        }
        if (includeDistrict && districtError) {
          void Taro.showToast({ title: '区县加载失败，请重新选择城市', icon: 'none' })
          return
        }
        const [nextProvinceIndex, nextCityIndex, nextDistrictIndex] = selectionRef.current
        const province = regions[nextProvinceIndex]
        const city = province?.children[nextCityIndex]
        if (province && city) {
          onConfirm(
            province.code,
            city.code,
            includeDistrict ? districts[nextDistrictIndex]?.code || '' : ''
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
        style={{ position: 'relative', width: '656rpx', height: '300rpx', margin: '66rpx auto 0' }}
      >
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: '111rpx',
            width: '656rpx',
            height: '78rpx',
            borderRadius: '24rpx',
            background: '#E3F1FE',
          }}
        />
        <PickerView
          data-role="region-wheel"
          value={
            includeDistrict ? [provinceIndex, cityIndex, districtIndex] : [provinceIndex, cityIndex]
          }
          indicatorStyle={`height: ${REGION_ROW_HEIGHT_RPX}rpx; border: none;`}
          onPickStart={() => {
            pickerTouched.current = true
            pickerScrolling.current = true
          }}
          onPickEnd={() => {
            pickerScrolling.current = false
          }}
          onChange={event => handleRegionChange(event.detail.value)}
          style={{ width: '656rpx', height: '300rpx' }}
        >
          <PickerViewColumn>
            {regions.map((item, index) => (
              <View
                key={item.code}
                onClick={() => selectProvince(index)}
                style={{
                  height: '78rpx',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: index === provinceIndex ? '#0C285A' : '#999999',
                    fontSize: item.name.length > 7 ? '24rpx' : '28rpx',
                    fontWeight: 500,
                    lineHeight: '40rpx',
                  }}
                >
                  {trimRegionName(item.name)}
                </Text>
              </View>
            ))}
          </PickerViewColumn>
          <PickerViewColumn key={selectedProvince?.code || 'empty-province'}>
            {cities.map((item, index) => (
              <View
                key={item.code}
                onClick={() => selectCity(index)}
                style={{
                  height: '78rpx',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: index === cityIndex ? '#0C285A' : '#999999',
                    fontSize: '28rpx',
                    fontWeight: 500,
                    lineHeight: '40rpx',
                  }}
                >
                  {trimRegionName(item.name)}
                </Text>
              </View>
            ))}
          </PickerViewColumn>
          {includeDistrict ? (
            <PickerViewColumn key={selectedCity?.code || 'empty-city'}>
              {districtLoading || districtError || districts.length === 0 ? (
                <View
                  style={{
                    height: '78rpx',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: districtError ? '#E35A5A' : '#999999', fontSize: '26rpx' }}>
                    {districtLoading ? '加载中' : districtError ? '加载失败' : '无区县'}
                  </Text>
                </View>
              ) : (
                districts.map((item, index) => (
                  <View
                    key={item.code}
                    onClick={() => updateSelection([provinceIndex, cityIndex, index])}
                    style={{
                      height: '78rpx',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: index === districtIndex ? '#0C285A' : '#999999',
                        fontSize: '28rpx',
                        fontWeight: 500,
                        lineHeight: '40rpx',
                      }}
                    >
                      {trimRegionName(item.label || item.name || '')}
                    </Text>
                  </View>
                ))
              )}
            </PickerViewColumn>
          ) : null}
        </PickerView>
      </View>
    </BottomPicker>
  )
}

function clampRegionIndex(index: number, length: number) {
  if (length <= 0 || !Number.isFinite(index)) return 0
  return Math.min(Math.max(Math.trunc(index), 0), length - 1)
}

function trimRegionName(value: string) {
  if (value.endsWith('自治区') || value.endsWith('特别行政区')) return value
  return value.replace(/[省市区]$/u, '')
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
