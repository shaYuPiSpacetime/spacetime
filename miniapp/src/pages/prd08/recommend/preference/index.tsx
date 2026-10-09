import { Image, ScrollView, Switch, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useMemo, useRef, useState } from 'react'
import DualRangeSlider from '@/components/DualRangeSlider'
import NativeNavigation from '@/components/NativeNavigation'
import { miniappOssIcons } from '@/constants/ossIcons'
import { LanhuRegionSheet } from '@/pages/verification/components/LanhuPickerSheet'
import { prd01Api } from '@/services/prd01'
import {
  getRecommendPreferences,
  saveRecommendPreferences,
  type RecommendCityVO,
  type RecommendPreferenceVO,
} from '@/services/recommend'
import { usePrd01Store } from '@/stores/prd01Store'
import type { DictOption, RegionTreeOption } from '@/types/prd01'

const BLUE = '#2876FF'
const RECOMMEND_PREFERENCE_REFRESH_STORAGE_KEY = 'recommendPreferenceRefreshRequired'
const HEIGHT_MIN = 140
const HEIGHT_MAX = 220
const WEIGHT_MIN = 30
const WEIGHT_MAX = 200

function normalizeOptionalRange(
  low: number | null | undefined,
  high: number | null | undefined,
  min: number,
  max: number
) {
  const clamp = (value: number | null | undefined) => {
    if (value == null || !Number.isFinite(value)) return null
    return Math.min(max, Math.max(min, Math.round(value)))
  }
  let normalizedLow = clamp(low)
  let normalizedHigh = clamp(high)
  if (normalizedLow != null && normalizedHigh != null && normalizedLow > normalizedHigh) {
    ;[normalizedLow, normalizedHigh] = [normalizedHigh, normalizedLow]
  }
  return { low: normalizedLow, high: normalizedHigh }
}

function formatWeightLimit(value: number | null | undefined) {
  return value == null ? '不限' : `${value}kg`
}

export default function RecommendPreferencePage() {
  const [model, setModel] = useState<RecommendPreferenceVO | null>(null)
  const [cities, setCities] = useState<RegionTreeOption[]>([])
  const [citySheetVisible, setCitySheetVisible] = useState(false)
  const [citySheetSelection, setCitySheetSelection] = useState({
    provinceCode: '',
    cityCode: '',
  })
  const [hometownSheetVisible, setHometownSheetVisible] = useState(false)
  const [hometownSheetSelection, setHometownSheetSelection] = useState({
    provinceCode: '',
    cityCode: '',
  })
  const [educationOptions, setEducationOptions] = useState<DictOption[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const bootstrapPrd01 = usePrd01Store(state => state.bootstrap)
  const loadDistricts = usePrd01Store(state => state.locations)
  const hasShownRef = useRef(false)
  const advancedGestureStartRef = useRef<{ x: number; y: number } | null>(null)
  const advancedGestureMovedRef = useRef(false)
  const cityOptions = useMemo(() => cities.flatMap(province => province.children), [cities])
  const load = async () => {
    try {
      const [preference, tree, options] = await Promise.all([
        getRecommendPreferences(),
        prd01Api.getProvinceCities(),
        prd01Api.getProfileOptions(),
        bootstrapPrd01(),
      ])
      setModel(preference)
      setCities(tree)
      setEducationOptions(options.educationLevel || [])
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '偏好加载失败')
    }
  }
  useDidShow(() => {
    if (!hasShownRef.current) {
      hasShownRef.current = true
      void load()
      return
    }
    // 从会员中心返回时只刷新权益，保留当前尚未保存的城市、开关与年龄草稿。
    void getRecommendPreferences()
      .then(preference => setModel(current => current ? {
        ...current,
        vipEffective: preference.vipEffective,
        advancedFilterEffective: preference.advancedFilterEffective,
        advancedEffectiveCount: preference.advancedEffectiveCount,
        advanced: !current.advancedFilterEffective && preference.advancedFilterEffective
          ? preference.advanced
          : current.advanced,
      } : preference))
      .catch(() => void Taro.showToast({ title: '会员权益刷新失败，请稍后重试', icon: 'none' }))
  })
  if (!model)
    return (
      <View style={{ minHeight: '100vh', background: '#FFFFFF' }}>
        <NativeNavigation title="偏好设置" />
        {message ? <PageMessage text={message} /> : <PageMessage text="偏好加载中…" />}
      </View>
    )

  const sourceAdvanced = model.advanced || {
    educationCodes: [],
    hometowns: [],
    schoolCodes: [],
    schoolFilterAvailable: false,
    majorNames: [],
  }
  const heightRange = normalizeOptionalRange(
    sourceAdvanced.minHeight,
    sourceAdvanced.maxHeight,
    HEIGHT_MIN,
    HEIGHT_MAX
  )
  const weightRange = normalizeOptionalRange(
    sourceAdvanced.minWeight,
    sourceAdvanced.maxWeight,
    WEIGHT_MIN,
    WEIGHT_MAX
  )
  const advanced = {
    ...sourceAdvanced,
    minHeight: heightRange.low,
    maxHeight: heightRange.high,
    minWeight: weightRange.low,
    maxWeight: weightRange.high,
  }
  const patch = (value: Partial<RecommendPreferenceVO>) =>
    setModel(current => (current ? { ...current, ...value } : current))
  const patchAdvanced = (value: Partial<typeof advanced>) =>
    patch({ advanced: { ...advanced, ...value } })
  const openCitySheet = () => {
    if (!cities.length) {
      void Taro.showToast({ title: '城市选项加载中，请稍后重试', icon: 'none' })
      return
    }
    const recentCity = model.targetCities[model.targetCities.length - 1]
    const province = cities.find(item =>
      item.children.some(city => city.code === recentCity?.code)
    ) || cities[0]
    const city = province.children.find(item => item.code === recentCity?.code)
      || province.children[0]
    setCitySheetSelection({
      provinceCode: province.code,
      cityCode: city?.code || '',
    })
    setCitySheetVisible(true)
  }
  const confirmTargetCity = (provinceCode: string, cityCode: string) => {
    const province = cities.find(item => item.code === provinceCode)
    const city = province?.children.find(item => item.code === cityCode)
    if (!city) {
      void Taro.showToast({ title: '请选择城市', icon: 'none' })
      return
    }
    if (model.targetCities.some(item => item.code === city.code)) {
      void Taro.showToast({ title: '该城市已添加', icon: 'none' })
      return
    }
    if (model.targetCities.length >= 3) {
      void Taro.showToast({ title: '最多选择3个城市', icon: 'none' })
      setCitySheetVisible(false)
      return
    }
    patch({ targetCities: [...model.targetCities, { code: city.code, name: city.name }] })
    setCitySheetSelection({ provinceCode, cityCode })
    setCitySheetVisible(false)
  }
  const openHometownSheet = () => {
    if (!model.advancedFilterEffective) return
    if (!cities.length) {
      void Taro.showToast({ title: '城市选项加载中，请稍后重试', icon: 'none' })
      return
    }
    const selectedCode = advanced.hometowns[0]
    const province = cities.find(item =>
      item.children.some(city => city.code === selectedCode)
    ) || cities[0]
    const city = province.children.find(item => item.code === selectedCode)
      || province.children[0]
    setHometownSheetSelection({
      provinceCode: province.code,
      cityCode: city?.code || '',
    })
    setHometownSheetVisible(true)
  }
  const confirmHometown = (provinceCode: string, cityCode: string) => {
    const province = cities.find(item => item.code === provinceCode)
    const city = province?.children.find(item => item.code === cityCode)
    if (!city) {
      void Taro.showToast({ title: '请选择城市', icon: 'none' })
      return
    }
    patchAdvanced({ hometowns: [city.code] })
    setHometownSheetSelection({ provinceCode, cityCode })
    setHometownSheetVisible(false)
  }
  const rememberAdvancedGestureStart = (event: any) => {
    const touch = event.touches?.[0]
    advancedGestureStartRef.current = touch
      ? { x: Number(touch.clientX), y: Number(touch.clientY) }
      : null
    advancedGestureMovedRef.current = false
  }
  const markAdvancedGestureMove = (event: any) => {
    const start = advancedGestureStartRef.current
    const touch = event.touches?.[0]
    if (!start || !touch) return
    if (Math.abs(Number(touch.clientX) - start.x) > 8
      || Math.abs(Number(touch.clientY) - start.y) > 8) {
      advancedGestureMovedRef.current = true
    }
  }
  const save = async () => {
    if (saving) return
    if (!model.targetCities.length) {
      await Taro.showToast({ title: '请至少选择一个城市', icon: 'none' })
      return
    }
    setSaving(true)
    try {
      const result = await saveRecommendPreferences({
        version: model.version,
        targetCityCodes: model.targetCities.map(item => item.code),
        allowNeighborCity: model.allowNeighborCity,
        onlyCertifiedUsers: model.onlyCertifiedUsers,
        minAge: model.minAge,
        maxAge: model.maxAge,
        ...(model.advancedFilterEffective ? {
          minHeight: advanced.minHeight ?? undefined,
          maxHeight: advanced.maxHeight ?? undefined,
          minWeight: advanced.minWeight ?? undefined,
          maxWeight: advanced.maxWeight ?? undefined,
          educationCodes: advanced.educationCodes,
          hometowns: advanced.hometowns,
          schoolCodes: advanced.schoolCodes,
          majorNames: advanced.majorNames,
        } : {}),
      })
      setModel(result)
      Taro.setStorageSync(RECOMMEND_PREFERENCE_REFRESH_STORAGE_KEY, true)
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
                removable
                onRemove={() =>
                  patch({
                    targetCities: model.targetCities.filter(item => item.code !== city.code),
                  })
                }
              />
            ))}
            {model.targetCities.length < 3 ? (
              <View
                id="recommend-city-sheet-trigger"
                data-role="recommend-city-sheet-trigger"
                onClick={openCitySheet}
                hoverClass="btn-hover"
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
            ) : null}
          </View>
          <SwitchRow
            title="允许推荐周边城市"
            subtitle={
              model.neighborCityAvailable
                ? '仅推荐tab候选不足时生效'
                : '选择会保存，待配置周边城市后自动生效'
            }
            checked={model.allowNeighborCity}
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
            subtitle="按你的选择保存，推荐嘉宾均须通过平台认证"
            checked={model.onlyCertifiedUsers}
            onChange={checked => patch({ onlyCertifiedUsers: checked })}
          />
          <View style={{ height: '10rpx', margin: '30rpx -24rpx 0', background: '#F7F7F7' }} />
          <View style={{ marginTop: '30rpx', display: 'flex', alignItems: 'center', gap: '16rpx' }}>
            <Text style={{ color: model.advancedFilterEffective ? '#333333' : '#999999', fontSize: '28rpx', fontWeight: 600 }}>高级筛选</Text>
            <View
              style={{
                height: '44rpx',
                padding: '0 18rpx',
                borderRadius: '22rpx',
                background: '#333333',
                display: 'flex',
                alignItems: 'center',
                opacity: model.advancedFilterEffective ? 1 : 0.45,
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
            onTouchStart={rememberAdvancedGestureStart}
            onTouchMove={markAdvancedGestureMove}
            onClick={() => {
              if (advancedGestureMovedRef.current) return
              if (model.advancedFilterEffective) return
              if (model.vipEffective) {
                void Taro.showToast({ title: '高级筛选暂不可用，请稍后重试', icon: 'none' })
                return
              }
              void Taro.navigateTo({
                url: '/pages/membership/index?sourcePage=recommend_preference',
              })
            }}
            style={{ opacity: model.advancedFilterEffective ? 1 : 0.45 }}
          >
            <RangeSection
              title="身高偏好"
              value={`${advanced.minHeight ?? '不限'}-${advanced.maxHeight ?? '不限'}`}
              min={140}
              max={220}
              low={advanced.minHeight ?? 140}
              high={advanced.maxHeight ?? 220}
              disabled={!model.advancedFilterEffective}
              onLow={value => patchAdvanced({ minHeight: value })}
              onHigh={value => patchAdvanced({ maxHeight: value })}
            />
            <RangeSection
              title="体重偏好"
              value={`${formatWeightLimit(advanced.minWeight)}-${formatWeightLimit(advanced.maxWeight)}`}
              min={30}
              max={200}
              low={advanced.minWeight ?? 30}
              high={advanced.maxWeight ?? 200}
              disabled={!model.advancedFilterEffective}
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
                      model.advancedFilterEffective &&
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
            <View
              id="recommend-hometown-sheet-trigger"
              data-role="recommend-hometown-sheet-trigger"
              onClick={openHometownSheet}
              hoverClass={model.advancedFilterEffective ? 'btn-hover' : undefined}
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
      {citySheetVisible ? (
        <LanhuRegionSheet
          title="居住地偏好"
          regions={cities}
          provinceCode={citySheetSelection.provinceCode}
          cityCode={citySheetSelection.cityCode}
          districtCode=""
          includeDistrict={false}
          loadDistricts={loadDistricts}
          onConfirm={(provinceCode, cityCode) => confirmTargetCity(provinceCode, cityCode)}
          onClose={() => setCitySheetVisible(false)}
        />
      ) : null}
      {hometownSheetVisible ? (
        <LanhuRegionSheet
          title="家乡偏好"
          regions={cities}
          provinceCode={hometownSheetSelection.provinceCode}
          cityCode={hometownSheetSelection.cityCode}
          districtCode=""
          includeDistrict={false}
          loadDistricts={loadDistricts}
          onConfirm={(provinceCode, cityCode) => confirmHometown(provinceCode, cityCode)}
          onClose={() => setHometownSheetVisible(false)}
        />
      ) : null}
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
        overflow: 'hidden',
        flexShrink: 0,
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
      <Text style={{ color: '#333333', fontSize: '25rpx', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{city.name}</Text>
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
      <View style={{ height: '70rpx', marginTop: '14rpx' }}>
        <DualRangeSlider
          min={min}
          max={max}
          low={low}
          high={high}
          disabled={disabled}
          activeColor={BLUE}
          backgroundColor="#F1F2F4"
          onLowChange={onLow}
          onHighChange={onHigh}
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
