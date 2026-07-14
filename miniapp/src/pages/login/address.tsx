import { Picker, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import type { RegionOption } from '@/types/prd01'
import LoginProfileShell from './components/LoginProfileShell'
import './address.scss'

export default function LoginAddressPage() {
  const { userInfo, initField, copy, bootstrap, loadLocations, saveInitStep } = useLogin()
  const [provinces, setProvinces] = useState<RegionOption[]>([])
  const [cities, setCities] = useState<RegionOption[]>([])
  const [districts, setDistricts] = useState<RegionOption[]>([])
  const [province, setProvince] = useState<RegionOption>()
  const [city, setCity] = useState<RegionOption>()
  const [district, setDistrict] = useState<RegionOption>()
  const field = initField(5)

  useEffect(() => {
    void (async () => {
      try {
        await bootstrap()
        const root = await loadLocations()
        setProvinces(root)
        if (userInfo.locationProvince) {
          const savedProvince = root.find(item => item.code === userInfo.locationProvince)
          if (savedProvince) await selectProvince(savedProvince, userInfo.locationCity, userInfo.locationDistrict)
        }
      } catch (error) {
        await showError(error)
      }
    })()
  }, [])

  const selectProvince = async (next: RegionOption, savedCityCode?: string, savedDistrictCode?: string) => {
    setProvince(next)
    setCity(undefined)
    setDistrict(undefined)
    setDistricts([])
    const nextCities = next.leaf ? [] : await loadLocations(next.code)
    setCities(nextCities)
    const savedCity = nextCities.find(item => item.code === savedCityCode)
    if (savedCity) await selectCity(savedCity, savedDistrictCode)
  }

  const selectCity = async (next: RegionOption, savedDistrictCode?: string) => {
    setCity(next)
    setDistrict(undefined)
    const nextDistricts = next.leaf ? [] : await loadLocations(next.code)
    setDistricts(nextDistricts)
    const savedDistrict = nextDistricts.find(item => item.code === savedDistrictCode)
    if (savedDistrict) setDistrict(savedDistrict)
  }

  const handleNext = async () => {
    if (field?.required && !city) {
      await Taro.showToast({ title: copy('init_location_required'), icon: 'none' })
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

  return (
    <LoginProfileShell description={copy('init_location_notice')} nextActive={Boolean(city) || field?.required === false} onNext={handleNext}>
      <View style={{ position: 'absolute', left: '25rpx', top: '440rpx', width: '700rpx' }}>
        <RegionPicker label={copy('init_location_province_placeholder')} options={provinces} selected={province} onSelect={next => void selectProvince(next)} />
        <RegionPicker label={copy('init_location_city_placeholder')} options={cities} selected={city} disabled={!province} onSelect={next => void selectCity(next)} />
        <RegionPicker label={copy('init_location_district_placeholder')} options={districts} selected={district} disabled={!city || city.leaf} onSelect={setDistrict} />
      </View>
    </LoginProfileShell>
  )
}

function RegionPicker({ label, options, selected, disabled = false, onSelect }: { label: string; options: RegionOption[]; selected?: RegionOption; disabled?: boolean; onSelect: (option: RegionOption) => void }) {
  return (
    <Picker mode="selector" disabled={disabled || options.length === 0} range={options.map(item => item.label)} onChange={event => {
      const option = options[Number(event.detail.value)]
      if (option) onSelect(option)
    }}>
      <View style={{ width: '700rpx', height: '112rpx', borderRadius: '20rpx', background: '#FFFFFF', marginBottom: '24rpx', padding: '0 36rpx', boxSizing: 'border-box', display: 'flex', alignItems: 'center', opacity: disabled ? 0.55 : 1 }}>
        <Text style={{ color: selected ? '#333333' : '#999999', fontSize: '32rpx' }}>{selected?.label || label}</Text>
      </View>
    </Picker>
  )
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
