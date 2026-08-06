import {
  Image,
  PickerView,
  PickerViewColumn,
  ScrollView,
  Slider,
  Text,
  View,
} from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import AppTabBar from '@/components/AppTabBar'
import NativeNavigation from '@/components/NativeNavigation'
import { miniappOssIcons } from '@/constants/ossIcons'
import { createIdealSearch, getIdealMeta, type IdealMetaVO } from '@/services/ideal'
import { prd01Api } from '@/services/prd01'
import type { RegionTreeOption } from '@/types/prd01'

const BLUE = '#2876FF'

export default function IdealFilterPage() {
  const [meta, setMeta] = useState<IdealMetaVO | null>(null)
  const [cities, setCities] = useState<RegionTreeOption[]>([])
  const [selectedConditionCodes, setSelectedConditionCodes] = useState<string[]>([])
  const [targetCities, setTargetCities] = useState<Array<{ code: string; name: string }>>([])
  const [minAge, setMinAge] = useState(18)
  const [maxAge, setMaxAge] = useState(60)
  const [showAddress, setShowAddress] = useState(false)
  const [showAge, setShowAge] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const load = async () => {
    try {
      const [metaData, cityTree] = await Promise.all([getIdealMeta(), prd01Api.getProvinceCities()])
      setMeta(metaData)
      setCities(cityTree)
      setTargetCities(metaData.targetCities || [])
      setMinAge(metaData.minAge)
      setMaxAge(metaData.maxAge)
      setSelectedConditionCodes(metaData.lastConditionCodes || [])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '理想型条件加载失败')
    }
  }
  useEffect(() => {
    void load()
  }, [])
  const groups = useMemo(() => {
    const result = new Map<string, NonNullable<IdealMetaVO['conditions']>>()
    for (const condition of meta?.conditions || [])
      result.set(condition.category, [...(result.get(condition.category) || []), condition])
    return [...result.entries()]
  }, [meta])
  const submit = async () => {
    if (!meta || !selectedConditionCodes.length || !targetCities.length || submitting) return
    setSubmitting(true)
    try {
      const result = await createIdealSearch({
        requestId: `ideal-search-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
        preferenceVersion: meta.preferenceVersion,
        targetCityCodes: targetCities.map(item => item.code),
        minAge,
        maxAge,
        conditionCodes: selectedConditionCodes,
      })
      await Taro.redirectTo({
        url: `/pages/prd08/ideal/results/index?snapshotNo=${encodeURIComponent(result.snapshotNo)}`,
      })
    } catch (error) {
      await Taro.showToast({
        title: error instanceof Error ? error.message : '筛选失败，请稍后重试',
        icon: 'none',
      })
    } finally {
      setSubmitting(false)
    }
  }
  if (!meta)
    return (
      <View style={{ minHeight: '100vh', background: '#FFFFFF' }}>
        <NativeNavigation title="选择你的理想型" />
        {message ? <CenterMessage text={message} /> : <CenterMessage text="条件加载中…" />}
      </View>
    )
  return (
    <View
      id="ideal-filter-page"
      style={{
        height: '100vh',
        overflow: 'hidden',
        background: '#FFFFFF',
        fontFamily: 'PingFang SC, sans-serif',
      }}
    >
      <ScrollView scrollY showScrollbar={false} style={{ height: '100vh' }}>
        <View style={{ paddingBottom: '310rpx' }}>
          <IdealFilterHero />
          <View style={{ padding: '50rpx 24rpx 0' }}>
            <Text style={{ color: '#AAAAAA', fontSize: '30rpx' }}>基础筛选</Text>
            <View style={{ display: 'flex', gap: '12rpx', marginTop: '34rpx' }}>
              <BaseFilter
                id="ideal-address-entry"
                text={`${targetCities.map(item => item.name).join('、') || '选择地址'} ›`}
                icon={miniappOssIcons.recommendLocationDark}
                onClick={() => setShowAddress(true)}
              />
              <BaseFilter
                id="ideal-age-entry"
                text={`${minAge}岁-${maxAge}岁 ›`}
                onClick={() => setShowAge(true)}
              />
            </View>
            {groups.map(([category, conditions]) => (
              <View key={category} style={{ marginTop: '54rpx' }}>
                <Text style={{ color: '#AAAAAA', fontSize: '30rpx' }}>{category}</Text>
                <View
                  style={{ display: 'flex', flexWrap: 'wrap', gap: '12rpx', marginTop: '28rpx' }}
                >
                  {conditions.map(condition => {
                    const selected = selectedConditionCodes.includes(condition.code)
                    return (
                      <View
                        key={condition.code}
                        onClick={() => {
                          if (!condition.available) {
                            void Taro.showToast({
                              title: condition.disabledReason || '完善资料后可选择',
                              icon: 'none',
                            })
                            return
                          }
                          setSelectedConditionCodes(current =>
                            selected
                              ? current.filter(code => code !== condition.code)
                              : [...current, condition.code]
                          )
                        }}
                        style={{
                          minWidth: '190rpx',
                          height: '68rpx',
                          padding: '0 24rpx',
                          borderRadius: '34rpx',
                          background: selected ? BLUE : '#F7F8FA',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: condition.available ? 1 : 0.42,
                          boxSizing: 'border-box',
                        }}
                      >
                        <Text
                          style={{ color: selected ? '#FFFFFF' : '#0C285A', fontSize: '25rpx' }}
                        >
                          {condition.name}
                        </Text>
                      </View>
                    )
                  })}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      <View
        onClick={() => void submit()}
        style={{
          position: 'fixed',
          left: '44rpx',
          right: '44rpx',
          bottom: '168rpx',
          zIndex: 50,
          height: '96rpx',
          borderRadius: '48rpx',
          background: BLUE,
          opacity: selectedConditionCodes.length && !submitting ? 1 : 0.45,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '34rpx', fontWeight: 600 }}>
          {submitting ? '筛选中…' : '选好了'}
        </Text>
      </View>
      <AppTabBar active="recommend" />
      {showAddress ? (
        <AddressSheet
          cities={cities}
          selectedCode={targetCities[0]?.code}
          overseasAvailable={meta.overseasAddressAvailable}
          overseasDisabledReason={meta.overseasAddressDisabledReason}
          onCancel={() => setShowAddress(false)}
          onConfirm={city => {
            setTargetCities([city])
            setShowAddress(false)
          }}
        />
      ) : null}
      {showAge ? (
        <AgeSheet
          minAge={minAge}
          maxAge={maxAge}
          onCancel={() => setShowAge(false)}
          onConfirm={(low, high) => {
            setMinAge(low)
            setMaxAge(high)
            setShowAge(false)
          }}
        />
      ) : null}
    </View>
  )
}

function IdealFilterHero() {
  return (
    <View style={{ position: 'relative', width: '750rpx', height: '378rpx' }}>
      <Image
        src={miniappOssIcons.idealHeaderBackground}
        mode="aspectFill"
        style={{ position: 'absolute', inset: 0, width: '750rpx', height: '378rpx' }}
      />
      <NativeNavigation titleColor="#FFFFFF" background="transparent" overlay />
      <Text
        style={{
          position: 'absolute',
          left: '26rpx',
          bottom: '100rpx',
          color: '#FFFFFF',
          fontSize: '42rpx',
          fontWeight: 600,
        }}
      >
        选择你的理想型
      </Text>
    </View>
  )
}
function BaseFilter({
  id,
  text,
  icon,
  onClick,
}: {
  id?: string
  text: string
  icon?: string
  onClick: () => void
}) {
  return (
    <View
      id={id}
      onClick={onClick}
      style={{
        minWidth: '200rpx',
        height: '68rpx',
        padding: '0 30rpx',
        border: `2rpx solid ${BLUE}`,
        borderRadius: '34rpx',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}
    >
      {icon ? (
        <Image
          src={icon}
          mode="aspectFit"
          style={{ width: '27rpx', height: '27rpx', marginRight: '8rpx' }}
        />
      ) : null}
      <Text style={{ color: '#0C285A', fontSize: '26rpx' }}>{text}</Text>
    </View>
  )
}

function AddressSheet({
  cities,
  selectedCode,
  overseasAvailable,
  overseasDisabledReason,
  onCancel,
  onConfirm,
}: {
  cities: RegionTreeOption[]
  selectedCode?: string
  overseasAvailable: boolean
  overseasDisabledReason?: string | null
  onCancel: () => void
  onConfirm: (city: { code: string; name: string }) => void
}) {
  const firstProvinceIndex = Math.max(
    0,
    cities.findIndex(province => province.children.some(city => city.code === selectedCode))
  )
  const firstCityIndex = Math.max(
    0,
    cities[firstProvinceIndex]?.children.findIndex(city => city.code === selectedCode) ?? 0
  )
  const [countryMode, setCountryMode] = useState<'china' | 'overseas'>('china')
  const [value, setValue] = useState([firstProvinceIndex, firstCityIndex])
  const province = cities[value[0]] || cities[0]
  const city = province?.children[value[1]] || province?.children[0]
  return (
    <SheetMask onCancel={onCancel}>
      <View
        id="ideal-address-sheet"
        onClick={event => event.stopPropagation()}
        style={{
          width: '750rpx',
          height: '756rpx',
          padding: '42rpx 44rpx 28rpx',
          borderRadius: '32rpx 32rpx 0 0',
          background: '#FFFFFF',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Text
          style={{
            display: 'block',
            color: '#333333',
            fontSize: '32rpx',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          地址
        </Text>
        <View
          id="ideal-address-country-tabs"
          style={{
            height: '62rpx',
            marginTop: '30rpx',
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'center',
            gap: '126rpx',
            flexShrink: 0,
          }}
        >
          <View
            id="ideal-address-country-china"
            onClick={() => setCountryMode('china')}
            style={{
              position: 'relative',
              minWidth: '100rpx',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: countryMode === 'china' ? '#0C285A' : '#999999',
                fontSize: '28rpx',
                fontWeight: countryMode === 'china' ? 600 : 400,
              }}
            >
              中国
            </Text>
            {countryMode === 'china' ? (
              <View
                style={{
                  position: 'absolute',
                  left: '22rpx',
                  right: '22rpx',
                  bottom: 0,
                  height: '6rpx',
                  borderRadius: '3rpx',
                  background: BLUE,
                }}
              />
            ) : null}
          </View>
          <View
            id="ideal-address-country-overseas"
            onClick={() => {
              if (!overseasAvailable) {
                void Taro.showToast({
                  title: overseasDisabledReason || '海外地区字典暂未配置',
                  icon: 'none',
                })
                return
              }
              setCountryMode('overseas')
            }}
            style={{
              position: 'relative',
              minWidth: '196rpx',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color:
                  countryMode === 'overseas'
                    ? '#0C285A'
                    : overseasAvailable
                      ? '#999999'
                      : '#C7C7C7',
                fontSize: '28rpx',
                fontWeight: countryMode === 'overseas' ? 600 : 400,
              }}
            >
              海外地区国家
            </Text>
            {countryMode === 'overseas' ? (
              <View
                style={{
                  position: 'absolute',
                  left: '48rpx',
                  right: '48rpx',
                  bottom: 0,
                  height: '6rpx',
                  borderRadius: '3rpx',
                  background: BLUE,
                }}
              />
            ) : null}
          </View>
        </View>
        <View
          style={{
            position: 'relative',
            height: '356rpx',
            marginTop: '10rpx',
            flexShrink: 0,
          }}
        >
          <View
            id="ideal-address-picker-selection"
            style={{
              position: 'absolute',
              zIndex: 0,
              left: 0,
              right: 0,
              top: '139rpx',
              height: '78rpx',
              background: '#E4F1FF',
            }}
          />
          <PickerView
            value={value}
            indicatorStyle="height: 78rpx; background: transparent;"
            maskStyle="background: transparent;"
            onChange={event => {
              const next = event.detail.value as number[]
              const provinceChanged = next[0] !== value[0]
              setValue([next[0], provinceChanged ? 0 : next[1]])
            }}
            style={{ position: 'relative', zIndex: 1, width: '100%', height: '356rpx' }}
          >
            <PickerViewColumn>
              {(countryMode === 'china' ? cities : []).map(item => (
                <View
                  key={item.code}
                  style={{
                    height: '78rpx',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#0C285A', fontSize: '27rpx' }}>{item.name}</Text>
                </View>
              ))}
            </PickerViewColumn>
            <PickerViewColumn>
              {(countryMode === 'china' ? province?.children || [] : []).map(item => (
                <View
                  key={item.code}
                  style={{
                    height: '78rpx',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#0C285A', fontSize: '27rpx' }}>{item.name}</Text>
                </View>
              ))}
            </PickerViewColumn>
          </PickerView>
        </View>
        <View
          onClick={() => {
            if (countryMode === 'overseas') {
              void Taro.showToast({
                title: overseasDisabledReason || '海外地区字典暂未配置',
                icon: 'none',
              })
              return
            }
            if (city) onConfirm({ code: city.code, name: city.name })
          }}
          style={{
            height: '92rpx',
            marginTop: 'auto',
            borderRadius: '14rpx',
            background: BLUE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '32rpx', fontWeight: 600 }}>确定</Text>
        </View>
      </View>
    </SheetMask>
  )
}

function AgeSheet({
  minAge: initialMin,
  maxAge: initialMax,
  onCancel,
  onConfirm,
}: {
  minAge: number
  maxAge: number
  onCancel: () => void
  onConfirm: (min: number, max: number) => void
}) {
  const [low, setLow] = useState(initialMin)
  const [high, setHigh] = useState(initialMax)
  return (
    <SheetMask onCancel={onCancel}>
      <View
        id="ideal-age-sheet"
        onClick={event => event.stopPropagation()}
        style={{
          width: '750rpx',
          height: '496rpx',
          padding: '42rpx 44rpx 28rpx',
          borderRadius: '32rpx 32rpx 0 0',
          background: '#FFFFFF',
          boxSizing: 'border-box',
        }}
      >
        <Text
          style={{
            display: 'block',
            color: '#333333',
            fontSize: '32rpx',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          选择年龄
        </Text>
        <View style={{ display: 'flex', justifyContent: 'space-between', marginTop: '74rpx' }}>
          <Text style={{ color: '#333333', fontSize: '29rpx', fontWeight: 600 }}>年龄</Text>
          <Text style={{ color: '#333333', fontSize: '29rpx', fontWeight: 600 }}>
            {low} - {high}
          </Text>
        </View>
        <View style={{ position: 'relative', height: '80rpx', marginTop: '18rpx' }}>
          <Slider
            min={18}
            max={60}
            value={low}
            activeColor={BLUE}
            backgroundColor="#F2F3F5"
            blockColor="#FFFFFF"
            blockSize={26}
            onChanging={event => setLow(Math.min(Number(event.detail.value), high))}
            style={{ position: 'absolute', left: 0, right: 0, top: 0 }}
          />
          <Slider
            min={18}
            max={60}
            value={high}
            activeColor="transparent"
            backgroundColor="transparent"
            blockColor="#FFFFFF"
            blockSize={26}
            onChanging={event => setHigh(Math.max(Number(event.detail.value), low))}
            style={{ position: 'absolute', left: 0, right: 0, top: 0 }}
          />
        </View>
        <View
          onClick={() => onConfirm(low, high)}
          style={{
            height: '92rpx',
            marginTop: '61rpx',
            borderRadius: '14rpx',
            background: BLUE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '32rpx', fontWeight: 600 }}>确定</Text>
        </View>
      </View>
    </SheetMask>
  )
}
function SheetMask({ children, onCancel }: { children: React.ReactNode; onCancel: () => void }) {
  return (
    <View
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,.42)',
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      {children}
    </View>
  )
}
function CenterMessage({ text }: { text: string }) {
  return (
    <View style={{ paddingTop: '260rpx', textAlign: 'center' }}>
      <Text style={{ color: '#999999', fontSize: '26rpx' }}>{text}</Text>
    </View>
  )
}
