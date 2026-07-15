import { ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import type { RegionOption } from '@/types/prd01'
import LoginProfileShell from './components/LoginProfileShell'
import './address.scss'

type RegionStage = 'province' | 'city' | 'district' | null

/** 登录居住地：保留蓝湖入口与底部弹层，提交值始终为行政区 code。 */
export default function LoginAddressPage() {
  const {
    userInfo, initField, bootstrap, loadLocations, saveInitStep,
    runtimeLoading, runtimeError, retryRuntime,
  } = useLogin()
  const [provinces, setProvinces] = useState<RegionOption[]>([])
  const [cities, setCities] = useState<RegionOption[]>([])
  const [districts, setDistricts] = useState<RegionOption[]>([])
  const [province, setProvince] = useState<RegionOption>()
  const [city, setCity] = useState<RegionOption>()
  const [district, setDistrict] = useState<RegionOption>()
  const [stage, setStage] = useState<RegionStage>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [loadError, setLoadError] = useState<string>()
  const field = initField(5)

  const loadPageData = async (force = false) => {
    setPageLoading(true)
    setLoadError(undefined)
    try {
      if (force) await retryRuntime()
      else await bootstrap()
      const root = await loadLocations(undefined, force)
      setProvinces(root)
      const savedProvince = root.find(item => item.code === userInfo.locationProvince)
      if (!savedProvince) return
      setProvince(savedProvince)
      const nextCities = savedProvince.leaf ? [] : await loadLocations(savedProvince.code, force)
      setCities(nextCities)
      const savedCity = nextCities.find(item => item.code === userInfo.locationCity)
      if (!savedCity) return
      setCity(savedCity)
      const nextDistricts = savedCity.leaf ? [] : await loadLocations(savedCity.code, force)
      setDistricts(nextDistricts)
      setDistrict(nextDistricts.find(item => item.code === userInfo.locationDistrict))
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error))
    } finally {
      setPageLoading(false)
    }
  }

  useEffect(() => {
    void loadPageData()
  }, [])

  const selectProvince = async (label: string) => {
    const selected = provinces.find(item => item.label === label)
    if (!selected) return
    setProvince(selected)
    setCity(undefined)
    setDistrict(undefined)
    setDistricts([])
    try {
      const nextCities = selected.leaf ? [] : await loadLocations(selected.code)
      setCities(nextCities)
      setStage(nextCities.length ? 'city' : null)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error))
    }
  }

  const selectCity = async (label: string) => {
    const selected = cities.find(item => item.label === label)
    if (!selected) return
    setCity(selected)
    setDistrict(undefined)
    try {
      const nextDistricts = selected.leaf ? [] : await loadLocations(selected.code)
      setDistricts(nextDistricts)
      setStage(nextDistricts.length ? 'district' : null)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error))
    }
  }

  const selectDistrict = (label: string) => {
    const selected = districts.find(item => item.label === label)
    if (selected) setDistrict(selected)
    setStage(null)
  }

  const handleNext = async () => {
    if (field?.required && !city) {
      await Taro.showToast({ title: '请选择居住地', icon: 'none' })
      return
    }
    try {
      await saveInitStep(5, {
        locationProvince: province?.code,
        locationCity: city?.code,
        locationDistrict: district?.code,
      })
    } catch (error) {
      await showError(error)
    }
  }

  const selectedLabel = [province?.label, city?.label, district?.label]
    .filter(Boolean)
    .map(item => String(item).replace(/[省市区县]$/u, ''))
    .join(' ')

  return (
    <LoginProfileShell
      description="—你的居住地（为你推荐匹配的异性）—"
      nextActive={Boolean(city) || field?.required === false}
      loading={pageLoading || runtimeLoading || (!runtimeError && !loadError && provinces.length === 0)}
      error={runtimeError || loadError}
      onRetry={() => loadPageData(true)}
      onNext={handleNext}
    >
      <View style={{ position: 'absolute', left: '25rpx', top: '518rpx', width: '700rpx', height: '98rpx', borderRadius: '8rpx', background: '#FFFFFF', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, height: '98rpx', display: 'flex', alignItems: 'center' }} onClick={() => setStage('province')} hoverClass="btn-hover">
          <LocationIcon active={Boolean(selectedLabel)} />
          <Text style={{ color: selectedLabel ? '#333333' : '#999999', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>{selectedLabel || '选择城市'}</Text>
        </View>
        <View style={{ width: '170rpx', height: '98rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => {
          void Taro.showToast({ title: '请选择行政区完成定位', icon: 'none' })
          setStage('province')
        }} hoverClass="btn-hover">
          <Text style={{ color: '#4E8FFE', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>获取定位</Text>
        </View>
      </View>

      {stage === 'province' ? (
        <AddressOptionSheet title="选择省份" options={provinces.map(item => item.label)} value={province?.label || ''} onConfirm={label => void selectProvince(label)} onClose={() => setStage(null)} />
      ) : null}
      {stage === 'city' ? (
        <AddressOptionSheet title="选择城市" options={cities.map(item => item.label)} value={city?.label || ''} onConfirm={label => void selectCity(label)} onClose={() => setStage(null)} />
      ) : null}
      {stage === 'district' ? (
        <AddressOptionSheet title="选择区县" options={districts.map(item => item.label)} value={district?.label || ''} onConfirm={selectDistrict} onClose={() => setStage(null)} />
      ) : null}
    </LoginProfileShell>
  )
}

function LocationIcon({ active }: { active: boolean }) {
  const color = active ? '#2876FF' : '#A6A6A6'
  return (
    <View style={{ position: 'relative', width: '40rpx', height: '48rpx', marginLeft: '30rpx', marginRight: '20rpx' }}>
      <View style={{ position: 'absolute', left: '4rpx', top: '0', width: '32rpx', height: '32rpx', borderRadius: '18rpx', border: `6rpx solid ${color}` }} />
      <View style={{ position: 'absolute', left: '15rpx', top: '13rpx', width: '10rpx', height: '10rpx', borderRadius: '5rpx', background: color }} />
      <View style={{ position: 'absolute', left: '15rpx', top: '30rpx', width: '16rpx', height: '16rpx', borderRight: `6rpx solid ${color}`, borderBottom: `6rpx solid ${color}`, transform: 'rotate(45deg)' }} />
    </View>
  )
}

function AddressOptionSheet({ title, options, value, onConfirm, onClose }: { title: string; options: string[]; value: string; onConfirm: (value: string) => void; onClose: () => void }) {
  const [selected, setSelected] = useState(value || options[0] || '')
  return (
    <View style={{ position: 'fixed', left: 0, right: 0, top: 0, bottom: 0, background: 'rgba(51,51,51,0.30)', zIndex: 80 }} onClick={onClose}>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '756rpx', borderRadius: '64rpx 64rpx 0 0', background: '#FFFFFF', padding: '42rpx 44rpx calc(36rpx + env(safe-area-inset-bottom))', boxSizing: 'border-box' }} onClick={event => event.stopPropagation()}>
        <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: '#8A93A5', fontSize: '28rpx' }} onClick={onClose}>取消</Text>
          <Text style={{ color: '#333333', fontSize: '30rpx', fontWeight: 700 }}>{title}</Text>
          <Text style={{ color: '#2876FF', fontSize: '28rpx', fontWeight: 700 }} onClick={() => selected && onConfirm(selected)}>确定</Text>
        </View>
        <ScrollView scrollY showScrollbar={false} style={{ height: '520rpx', marginTop: '42rpx', borderRadius: '24rpx', background: '#F7FAFF', padding: '12rpx', boxSizing: 'border-box' }}>
          {options.map(option => {
            const active = option === selected
            return <View key={option} style={{ height: '78rpx', borderRadius: '20rpx', background: active ? '#E3F1FE' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8rpx' }} onClick={() => setSelected(option)}><Text style={{ color: active ? '#2876FF' : '#333333', fontSize: active ? '32rpx' : '28rpx', fontWeight: active ? 700 : 400 }}>{option}</Text></View>
          })}
        </ScrollView>
      </View>
    </View>
  )
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
