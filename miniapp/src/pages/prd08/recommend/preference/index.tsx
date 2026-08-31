import { Image, Picker, ScrollView, Slider, Switch, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import NativeNavigation from '@/components/NativeNavigation'
import { miniappOssIcons } from '@/constants/ossIcons'
import {
  normalizeTwoLevelRegionSelection,
  type TwoLevelRegionSelection,
} from '@/domain/twoLevelRegionWheel'
import { prd01Api } from '@/services/prd01'
import {
  getRecommendPreferences,
  saveRecommendPreferences,
  type RecommendCityVO,
  type RecommendPreferenceVO,
} from '@/services/recommend'
import type { DictOption, RegionTreeOption } from '@/types/prd01'

const BLUE = '#2876FF'

export default function RecommendPreferencePage() {
  const [model, setModel] = useState<RecommendPreferenceVO | null>(null)
  const [cities, setCities] = useState<RegionTreeOption[]>([])
  const [cityPickerValue, setCityPickerValue] = useState<TwoLevelRegionSelection>([0, 0])
  const [educationOptions, setEducationOptions] = useState<DictOption[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const cityOptions = useMemo(() => cities.flatMap(province => province.children), [cities])
  const normalizedCityPickerValue = normalizeTwoLevelRegionSelection(cities, cityPickerValue)
  const cityPickerRange = [cities, cities[normalizedCityPickerValue[0]]?.children || []]
  const load = async () => {
    try {
      const [preference, tree, options] = await Promise.all([
        getRecommendPreferences(),
        prd01Api.getProvinceCities(),
        prd01Api.getProfileOptions(),
      ])
      setModel(preference)
      setCities(tree)
      setEducationOptions(options.educationLevel || [])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '偏好加载失败')
    }
  }
  useEffect(() => {
    void load()
  }, [])
  if (!model)
    return (
      <View style={{ minHeight: '100vh', background: '#FFFFFF' }}>
        <NativeNavigation title="偏好设置" />
        {message ? <PageMessage text={message} /> : <PageMessage text="偏好加载中…" />}
      </View>
    )

  const advanced = model.advanced || {
    educationCodes: [],
    hometowns: [],
    schoolCodes: [],
    schoolFilterAvailable: false,
    majorNames: [],
  }
  const patch = (value: Partial<RecommendPreferenceVO>) =>
    setModel(current => (current ? { ...current, ...value } : current))
  const patchAdvanced = (value: Partial<typeof advanced>) =>
    patch({ advanced: { ...advanced, ...value } })
  const addCity = (index: number) => {
    const selected = cityOptions[index]
    if (!selected || model.targetCities.some(item => item.code === selected.code)) return
    if (!model.vipEffective && model.targetCities.length >= 2) {
      void Taro.navigateTo({ url: '/pages/membership/index?sourcePage=recommend_preference' })
      return
    }
    patch({ targetCities: [...model.targetCities, { code: selected.code, name: selected.name }] })
  }
  const updateCityPickerColumn = (column: number, value: number) => {
    if (column === 0) {
      setCityPickerValue(normalizeTwoLevelRegionSelection(cities, [value, 0]))
      return
    }
    setCityPickerValue(current => {
      const [provinceIndex] = normalizeTwoLevelRegionSelection(cities, current)
      return normalizeTwoLevelRegionSelection(cities, [provinceIndex, value])
    })
  }
  const confirmCityPicker = (value: number[]) => {
    const selection = normalizeTwoLevelRegionSelection(cities, value)
    setCityPickerValue(selection)
    const [provinceIndex, cityIndex] = selection
    const selected = cities[provinceIndex]?.children[cityIndex]
    if (!selected) return
    const selectedIndex = cityOptions.findIndex(city => city.code === selected.code)
    if (selectedIndex >= 0) addCity(selectedIndex)
  }
  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      const result = await saveRecommendPreferences({
        version: model.version,
        targetCityCodes: model.targetCities.map(item => item.code),
        allowNeighborCity: model.allowNeighborCity,
        minAge: model.minAge,
        maxAge: model.maxAge,
        minHeight: advanced.minHeight || undefined,
        maxHeight: advanced.maxHeight || undefined,
        minWeight: advanced.minWeight || undefined,
        maxWeight: advanced.maxWeight || undefined,
        educationCodes: advanced.educationCodes,
        hometowns: advanced.hometowns,
        schoolCodes: advanced.schoolCodes,
        majorNames: advanced.majorNames,
      })
      setModel(result)
      await Taro.showToast({ title: '偏好已保存', icon: 'success' })
      await Taro.navigateBack()
    } catch (error) {
      await Taro.showToast({
        title: error instanceof Error ? error.message : '保存失败',
        icon: 'none',
      })
    } finally {
      setSaving(false)
    }
  }
  return (
    <View
      style={{
        height: '100vh',
        overflow: 'hidden',
        background: '#FFFFFF',
        fontFamily: 'PingFang SC, sans-serif',
      }}
    >
      <NativeNavigation title="偏好设置" />
      <ScrollView scrollY showScrollbar={false} style={{ height: 'calc(100vh - 150rpx)' }}>
        <View style={{ padding: '20rpx 24rpx 180rpx' }}>
          <SectionTitle
            title="居住地偏好"
            subtitle="默认优先推荐现居地城市用户，支持选择第3个目标城市"
          />
          <View style={{ display: 'flex', gap: '12rpx', marginTop: '24rpx' }}>
            {model.targetCities.map((city, index) => (
              <CityChip
                key={city.code}
                city={city}
                location={index === 0}
                removable={index > 0}
                onRemove={() =>
                  patch({
                    targetCities: model.targetCities.filter(item => item.code !== city.code),
                  })
                }
              />
            ))}
            {model.targetCities.length < 3 ? (
              <Picker
                mode="multiSelector"
                range={cityPickerRange}
                rangeKey="name"
                value={normalizedCityPickerValue}
                onColumnChange={event =>
                  updateCityPickerColumn(event.detail.column, event.detail.value)
                }
                onChange={event => confirmCityPicker(event.detail.value)}
              >
                <View
                  style={{
                    width: '190rpx',
                    height: '68rpx',
                    borderRadius: '34rpx',
                    background: '#F7F8FA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#999999', fontSize: '34rpx' }}>＋</Text>
                </View>
              </Picker>
            ) : null}
          </View>
          <SwitchRow
            title="允许推荐周边城市"
            subtitle={
              model.neighborCityAvailable
                ? '仅推荐tab候选不足时生效'
                : model.neighborCityDisabledReason || '周边城市关系暂未配置'
            }
            checked={model.allowNeighborCity}
            disabled={!model.neighborCityAvailable}
            onChange={checked => patch({ allowNeighborCity: checked })}
          />
          <RangeSection
            title="年龄偏好"
            value={`${model.minAge}-${model.maxAge}`}
            min={18}
            max={60}
            low={model.minAge}
            high={model.maxAge}
            onLow={value => patch({ minAge: Math.min(value, model.maxAge) })}
            onHigh={value => patch({ maxAge: Math.max(value, model.minAge) })}
          />
          <SwitchRow
            title="仅认证用户可与我交友"
            subtitle="完善资料和认证的用户才能心动和认识我"
            checked={false}
            disabled
          />
          <View style={{ height: '10rpx', margin: '30rpx -24rpx 0', background: '#F7F7F7' }} />
          <View style={{ marginTop: '30rpx', display: 'flex', alignItems: 'center', gap: '16rpx' }}>
            <Text style={{ color: '#333333', fontSize: '28rpx', fontWeight: 600 }}>高级筛选</Text>
            <View
              style={{
                height: '44rpx',
                padding: '0 18rpx',
                borderRadius: '22rpx',
                background: '#333333',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Image
                src={miniappOssIcons.recommendVipBadge}
                mode="aspectFit"
                style={{ width: '24rpx', height: '24rpx', marginRight: '8rpx' }}
              />
              <Text style={{ color: '#E6B54D', fontSize: '20rpx' }}>会员</Text>
            </View>
          </View>
          <Text
            style={{ display: 'block', color: '#A0A0A0', fontSize: '23rpx', marginTop: '14rpx' }}
          >
            时空邂逅会员专属权益，优先看到更加符合你的偏好用户
          </Text>
          <View
            onClick={() =>
              !model.vipEffective &&
              void Taro.navigateTo({
                url: '/pages/membership/index?sourcePage=recommend_preference',
              })
            }
            style={{ opacity: 1 }}
          >
            <RangeSection
              title="身高偏好"
              value={`${advanced.minHeight || '不限'}-${advanced.maxHeight || '不限'}`}
              min={140}
              max={210}
              low={advanced.minHeight || 140}
              high={advanced.maxHeight || 210}
              disabled={!model.vipEffective}
              onLow={value => patchAdvanced({ minHeight: value })}
              onHigh={value => patchAdvanced({ maxHeight: value })}
            />
            <RangeSection
              title="体重偏好"
              value={`${advanced.minWeight || '不限'}-${advanced.maxWeight || '不限'}`}
              min={35}
              max={120}
              low={advanced.minWeight || 35}
              high={advanced.maxWeight || 120}
              disabled={!model.vipEffective}
              onLow={value => patchAdvanced({ minWeight: value })}
              onHigh={value => patchAdvanced({ maxWeight: value })}
            />
            <Text
              style={{
                display: 'block',
                color: '#333333',
                fontSize: '28rpx',
                fontWeight: 600,
                marginTop: '36rpx',
              }}
            >
              学历偏好
            </Text>
            <View style={{ display: 'flex', flexWrap: 'wrap', gap: '12rpx', marginTop: '24rpx' }}>
              {educationOptions.map(option => {
                const selected = advanced.educationCodes.includes(option.code)
                return (
                  <View
                    key={option.code}
                    onClick={() =>
                      model.vipEffective &&
                      patchAdvanced({
                        educationCodes: selected
                          ? advanced.educationCodes.filter(code => code !== option.code)
                          : [...advanced.educationCodes, option.code],
                      })
                    }
                    style={{
                      width: '340rpx',
                      height: '68rpx',
                      borderRadius: '34rpx',
                      background: selected ? BLUE : '#F7F8FA',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: selected ? '#FFFFFF' : '#333333', fontSize: '25rpx' }}>
                      {option.label}
                    </Text>
                  </View>
                )
              })}
            </View>
            <Text
              style={{
                display: 'block',
                color: '#333333',
                fontSize: '28rpx',
                fontWeight: 600,
                marginTop: '36rpx',
              }}
            >
              家乡偏好
            </Text>
            <Picker
              mode="selector"
              range={cityOptions}
              rangeKey="name"
              onChange={event => {
                if (!model.vipEffective) return
                const city = cityOptions[Number(event.detail.value)]
                if (city) patchAdvanced({ hometowns: [city.code] })
              }}
            >
              <View
                style={{
                  height: '68rpx',
                  padding: '0 22rpx',
                  marginTop: '22rpx',
                  borderRadius: '34rpx',
                  background: '#F7F8FA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={{
                    color: advanced.hometowns.length ? '#333333' : '#A0A0A0',
                    fontSize: '24rpx',
                  }}
                >
                  {advanced.hometowns.length
                    ? cityOptions.find(item => item.code === advanced.hometowns[0])?.name ||
                      advanced.hometowns[0]
                    : '请选择推荐对象家乡偏好'}
                </Text>
                <Text style={{ color: '#999999', fontSize: '26rpx' }}>›</Text>
              </View>
            </Picker>
          </View>
          <View
            onClick={() => void save()}
            style={{
              height: '92rpx',
              marginTop: '84rpx',
              borderRadius: '14rpx',
              background: BLUE,
              opacity: saving ? 0.65 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: '32rpx', fontWeight: 600 }}>
              {saving ? '保存中…' : '保存偏好设置'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View>
      <Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', fontWeight: 600 }}>
        {title}
      </Text>
      <Text style={{ display: 'block', color: '#A0A0A0', fontSize: '23rpx', marginTop: '14rpx' }}>
        {subtitle}
      </Text>
    </View>
  )
}
function CityChip({
  city,
  location,
  removable,
  onRemove,
}: {
  city: RecommendCityVO
  location: boolean
  removable: boolean
  onRemove: () => void
}) {
  return (
    <View
      style={{
        width: '190rpx',
        height: '68rpx',
        borderRadius: '34rpx',
        background: '#F7F8FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {location ? (
        <Image
          src={miniappOssIcons.recommendLocationDark}
          mode="aspectFit"
          style={{ width: '24rpx', height: '24rpx', marginRight: '8rpx', opacity: 0.48 }}
        />
      ) : null}
      <Text style={{ color: '#333333', fontSize: '25rpx' }}>{city.name}</Text>
      {removable ? (
        <Text
          onClick={onRemove}
          style={{ color: '#999999', fontSize: '28rpx', marginLeft: '10rpx' }}
        >
          ×
        </Text>
      ) : null}
    </View>
  )
}
function SwitchRow({
  title,
  subtitle,
  checked,
  disabled = false,
  onChange,
}: {
  title: string
  subtitle: string
  checked: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
}) {
  return (
    <View style={{ position: 'relative', marginTop: '34rpx', minHeight: '84rpx' }}>
      <Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', fontWeight: 600 }}>
        {title}
      </Text>
      <Text style={{ display: 'block', color: '#A0A0A0', fontSize: '23rpx', marginTop: '12rpx' }}>
        {subtitle}
      </Text>
      <Switch
        checked={checked}
        disabled={disabled}
        color={BLUE}
        onChange={event => onChange?.(event.detail.value)}
        style={{ position: 'absolute', right: 0, top: '6rpx', transform: 'scale(.82)' }}
      />
    </View>
  )
}
function RangeSection({
  title,
  value,
  min,
  max,
  low,
  high,
  disabled = false,
  onLow,
  onHigh,
}: {
  title: string
  value: string
  min: number
  max: number
  low: number
  high: number
  disabled?: boolean
  onLow: (value: number) => void
  onHigh: (value: number) => void
}) {
  return (
    <View style={{ marginTop: '34rpx' }}>
      <Text style={{ color: '#333333', fontSize: '28rpx', fontWeight: 600 }}>
        {title} {value}
      </Text>
      <View style={{ position: 'relative', height: '70rpx', marginTop: '14rpx' }}>
        <Slider
          min={min}
          max={max}
          value={low}
          disabled={disabled}
          activeColor={BLUE}
          backgroundColor="#F1F2F4"
          blockColor="#FFFFFF"
          blockSize={24}
          onChanging={event => onLow(Number(event.detail.value))}
          style={{ position: 'absolute', left: 0, right: 0, top: 0 }}
        />
        <Slider
          min={min}
          max={max}
          value={high}
          disabled={disabled}
          activeColor="transparent"
          backgroundColor="transparent"
          blockColor="#FFFFFF"
          blockSize={24}
          onChanging={event => onHigh(Number(event.detail.value))}
          style={{ position: 'absolute', left: 0, right: 0, top: 0 }}
        />
      </View>
    </View>
  )
}
function PageMessage({ text }: { text: string }) {
  return (
    <View style={{ paddingTop: '260rpx', textAlign: 'center' }}>
      <Text style={{ color: '#999999', fontSize: '26rpx' }}>{text}</Text>
    </View>
  )
}
