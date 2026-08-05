import { ScrollView, View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import { toTwoLevelRegionErrorMessage } from '@/domain/basicProfileRegion'
import { useLogin } from '@/hooks/useLogin'
import type { RegionOption, RegionTreeOption } from '@/types/prd01'
import { getWindowMetrics } from '@/utils/system'
import LoginProfileShell from './components/LoginProfileShell'
import './address.scss'

const ADDRESS_ROW_HEIGHT_RPX = 78
const ADDRESS_PROVINCE_TOP_SPACER_RPX = 78
const ADDRESS_WHEEL_BOTTOM_SPACER_RPX = 144
const USER_LOCATION_SCOPE = 'scope.userLocation'

/**
 * 登录-地址 — 1:1 还原蓝湖「登录-地址」设计稿
 */
export default function LoginAddressPage() {
  const {
    userInfo,
    bootstrap,
    loadLocations,
    loadProvinceCities,
    saveInitStep,
    runtimeLoading,
    runtimeError,
    retryRuntime,
  } = useLogin()
  const [provinces, setProvinces] = useState<RegionTreeOption[]>([])
  const [selectedProvince, setSelectedProvince] = useState<RegionTreeOption>()
  const [selectedCity, setSelectedCity] = useState<RegionTreeOption>()
  const [selectedDistrict, setSelectedDistrict] = useState<RegionOption>()
  const [districtResolved, setDistrictResolved] = useState(false)
  const [selected, setSelected] = useState<string>('')
  const [cityValue, setCityValue] = useState([0, 0, 0])
  const [showManualSheet, setShowManualSheet] = useState(false)
  const [showLocationSheet, setShowLocationSheet] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [loadError, setLoadError] = useState<string>()
  const variantRef = useRef('default')

  const hasCompleteAddress = Boolean(selectedProvince && selectedCity && districtResolved)
  const locationColor = hasCompleteAddress ? '#2876FF' : '#A6A6A6'

  useLoad(options => {
    const variant = options?.variant ?? 'default'
    variantRef.current = variant
    if (variant === 'empty') {
      setSelectedProvince(undefined)
      setSelectedCity(undefined)
      setSelectedDistrict(undefined)
      setDistrictResolved(false)
      setSelected('')
      setShowManualSheet(false)
      setShowLocationSheet(false)
      return
    }

    if (variant === 'manual') {
      setShowManualSheet(true)
      return
    }

    if (variant === 'selected' && provinces.length > 0) {
      void restoreSelection(
        provinces,
        userInfo.locationProvince,
        userInfo.locationCity,
        userInfo.locationDistrict,
        true
      )
    }
  })

  const restoreSelection = async (
    tree: RegionTreeOption[],
    provinceCode?: string,
    cityCode?: string,
    districtCode?: string,
    useFirst = false
  ) => {
    const provinceIndex = tree.findIndex(item => item.code === provinceCode)
    const nextProvinceIndex = provinceIndex >= 0 ? provinceIndex : useFirst ? 0 : -1
    const province = tree[nextProvinceIndex]
    if (!province) return
    const cityIndex = province.children.findIndex(item => item.code === cityCode)
    const nextCityIndex = cityIndex >= 0 ? cityIndex : useFirst ? 0 : -1
    const city = province.children[nextCityIndex]
    if (!city) return
    setDistrictResolved(false)
    const districts = await loadLocations(city.code)
    const districtIndex = districts.findIndex(item => item.code === districtCode)
    const nextDistrictIndex = districtIndex >= 0 ? districtIndex : districts.length > 0 ? 0 : -1
    const district = districts[nextDistrictIndex]
    setSelectedProvince(province)
    setSelectedCity(city)
    setSelectedDistrict(district)
    setDistrictResolved(true)
    setCityValue([nextProvinceIndex, nextCityIndex, Math.max(0, nextDistrictIndex)])
    setSelected(formatAddressLabel(province.name, city.name, district?.label))
  }

  const loadPageData = async (force = false) => {
    setPageLoading(true)
    setLoadError(undefined)
    try {
      if (force) await retryRuntime()
      else await bootstrap()
      const tree = await loadProvinceCities(force)
      setProvinces(tree)
      if (variantRef.current !== 'empty') {
        await restoreSelection(
          tree,
          userInfo.locationProvince,
          userInfo.locationCity,
          userInfo.locationDistrict,
          variantRef.current === 'selected'
        )
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error))
    } finally {
      setPageLoading(false)
    }
  }

  useEffect(() => {
    void loadPageData()
  }, [])

  const handleNext = async () => {
    if (!selectedProvince || !selectedCity) {
      await Taro.showToast({ title: '请选择居住地', icon: 'none' })
      return
    }
    if (!districtResolved) {
      await Taro.showToast({ title: '请选择区县', icon: 'none' })
      return
    }
    try {
      await saveInitStep(5, {
        locationProvince: selectedProvince.code,
        locationCity: selectedCity.code,
        locationDistrict: selectedDistrict?.code,
      })
    } catch (error) {
      await showError(error)
    }
  }

  const handleLocationFail = (message = '定位失败，请手动选择') => {
    setShowLocationSheet(false)
    setShowManualSheet(true)
    Taro.showToast({ title: message, icon: 'none' })
  }

  const handleLocation = async () => {
    if (locationLoading) return
    setLocationLoading(true)
    try {
      const authorized = await ensureUserLocationAuthorized()
      if (!authorized) {
        handleLocationFail('未授权定位，请手动选择')
        return
      }

      const location = await Taro.getLocation({ type: 'gcj02' })
      if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
        throw new Error('INVALID_LOCATION')
      }
      setShowLocationSheet(false)
      setShowManualSheet(true)
      await Taro.showToast({ title: '定位成功，请选择所在城市', icon: 'none' })
    } catch {
      handleLocationFail()
    } finally {
      setLocationLoading(false)
    }
  }

  const handleManualConfirm = (
    province: RegionTreeOption,
    city: RegionTreeOption,
    district: RegionOption | undefined,
    districtIndex: number
  ) => {
    const provinceIndex = Math.max(
      0,
      provinces.findIndex(item => item.code === province.code)
    )
    const cityIndex = Math.max(
      0,
      province.children.findIndex(item => item.code === city.code)
    )
    setCityValue([provinceIndex, cityIndex, districtIndex])
    setSelectedProvince(province)
    setSelectedCity(city)
    setSelectedDistrict(district)
    setDistrictResolved(true)
    setSelected(formatAddressLabel(province.name, city.name, district?.label))
    setShowManualSheet(false)
    setShowLocationSheet(false)
  }

  return (
    <LoginProfileShell
      description="—你的居住地（为你推荐匹配的异性）—"
      nextActive={hasCompleteAddress}
      loading={pageLoading || runtimeLoading}
      error={runtimeError || loadError}
      onRetry={() => loadPageData(true)}
      onNext={handleNext}
    >
      <View
        style={{
          position: 'absolute',
          left: '25rpx',
          top: '518rpx',
          width: '700rpx',
          height: '98rpx',
          borderRadius: '8rpx',
          background: '#FFFFFF',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View
          style={{ flex: 1, height: '98rpx' }}
          onClick={() => setShowManualSheet(true)}
          hoverClass="btn-hover"
        >
          <View
            style={{
              height: '98rpx',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
            }}
            hoverClass="btn-hover"
          >
            <View
              style={{
                position: 'relative',
                width: '40rpx',
                height: '48rpx',
                marginLeft: '30rpx',
                marginRight: '20rpx',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  left: '4rpx',
                  top: '0',
                  width: '32rpx',
                  height: '32rpx',
                  borderRadius: '18rpx',
                  border: `6rpx solid ${locationColor}`,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  left: '15rpx',
                  top: '13rpx',
                  width: '10rpx',
                  height: '10rpx',
                  borderRadius: '5rpx',
                  background: locationColor,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  left: '15rpx',
                  top: '30rpx',
                  width: '16rpx',
                  height: '16rpx',
                  borderRight: `6rpx solid ${locationColor}`,
                  borderBottom: `6rpx solid ${locationColor}`,
                  transform: 'rotate(45deg)',
                }}
              />
            </View>
            <Text
              style={{
                color: hasCompleteAddress ? '#333333' : '#999999',
                fontSize: '28rpx',
                fontWeight: 500,
                lineHeight: '40rpx',
              }}
            >
              {selected || '选择城市'}
            </Text>
          </View>
        </View>
        <View
          style={{
            width: '170rpx',
            height: '98rpx',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowLocationSheet(true)}
          hoverClass="btn-hover"
        >
          <Text
            style={{
              color: '#4E8FFE',
              fontSize: '28rpx',
              fontWeight: 500,
              lineHeight: '40rpx',
            }}
          >
            获取定位
          </Text>
        </View>
      </View>

      {showManualSheet && (
        <ManualAddressSheet
          provinces={provinces}
          cityValue={cityValue}
          loadDistricts={loadLocations}
          onConfirm={handleManualConfirm}
          onClose={() => setShowManualSheet(false)}
        />
      )}

      {showLocationSheet && (
        <LocationConfirmSheet
          onConfirm={handleLocation}
          loading={locationLoading}
          onManual={() => {
            setShowLocationSheet(false)
            setShowManualSheet(true)
          }}
          onClose={() => setShowLocationSheet(false)}
        />
      )}
    </LoginProfileShell>
  )
}

function formatAddressLabel(province: string, city: string, district?: string) {
  const provinceLabel = province.replace(/[省市区]$/u, '')
  const cityLabel = city.replace(/[市区县]$/u, '')
  const districtLabel = (district || '').replace(/[市区县]$/u, '')
  const cityAddress = provinceLabel === cityLabel ? cityLabel : `${provinceLabel}${cityLabel}`
  return districtLabel ? `${cityAddress}${districtLabel}` : cityAddress
}

function ManualAddressSheet({
  provinces,
  cityValue,
  loadDistricts,
  onConfirm,
  onClose,
}: {
  provinces: RegionTreeOption[]
  cityValue: number[]
  loadDistricts: (cityCode: string) => Promise<RegionOption[]>
  onConfirm: (
    province: RegionTreeOption,
    city: RegionTreeOption,
    district: RegionOption | undefined,
    districtIndex: number
  ) => void
  onClose: () => void
}) {
  const initialProvinceIndex = clampAddressIndex(cityValue[0] || 0, provinces.length)
  const initialProvince = provinces[initialProvinceIndex] || provinces[0]
  const initialCityIndex = clampAddressIndex(
    cityValue[1] || 0,
    initialProvince?.children.length || 0
  )
  const [provinceIndex, setProvinceIndex] = useState(initialProvinceIndex)
  const [cityIndex, setCityIndex] = useState(initialCityIndex)
  const [districts, setDistricts] = useState<RegionOption[]>([])
  const [districtIndex, setDistrictIndex] = useState(cityValue[2] || 0)
  const [districtLoading, setDistrictLoading] = useState(false)
  const [districtError, setDistrictError] = useState(false)
  const [districtResolved, setDistrictResolved] = useState(false)
  const [provinceScrollTop, setProvinceScrollTop] = useState<number | undefined>(() =>
    getAddressScrollTop(initialProvinceIndex)
  )
  const [cityScrollTop, setCityScrollTop] = useState<number | undefined>(() =>
    getAddressScrollTop(initialCityIndex)
  )
  const [districtScrollTop, setDistrictScrollTop] = useState<number | undefined>(() =>
    getAddressScrollTop(cityValue[2] || 0)
  )
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const districtRequestRef = useRef(0)
  const province = provinces[provinceIndex] || provinces[0]
  const cities = province?.children || []
  const city = cities[clampAddressIndex(cityIndex, cities.length)] || cities[0]
  const district = districts[clampAddressIndex(districtIndex, districts.length)] || districts[0]

  const releaseControlledAddressScroll = () => {
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current)
    releaseTimerRef.current = setTimeout(() => {
      setProvinceScrollTop(undefined)
      setCityScrollTop(undefined)
      setDistrictScrollTop(undefined)
    }, 240)
  }

  useEffect(() => {
    releaseControlledAddressScroll()
    return () => {
      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const requestId = districtRequestRef.current + 1
    districtRequestRef.current = requestId
    if (!city?.code) {
      setDistricts([])
      setDistrictIndex(0)
      setDistrictLoading(false)
      setDistrictError(false)
      setDistrictResolved(false)
      return
    }

    setDistricts([])
    setDistrictIndex(0)
    setDistrictLoading(true)
    setDistrictError(false)
    setDistrictResolved(false)
    void loadDistricts(city.code)
      .then(options => {
        if (requestId !== districtRequestRef.current) return
        const nextIndex = clampAddressIndex(
          city.code === initialProvince?.children[initialCityIndex]?.code ? cityValue[2] || 0 : 0,
          options.length
        )
        setDistricts(options)
        setDistrictIndex(nextIndex)
        setDistrictScrollTop(getAddressScrollTop(nextIndex))
        setDistrictLoading(false)
        setDistrictResolved(true)
        releaseControlledAddressScroll()
      })
      .catch(() => {
        if (requestId !== districtRequestRef.current) return
        setDistricts([])
        setDistrictIndex(0)
        setDistrictLoading(false)
        setDistrictError(true)
        setDistrictResolved(false)
      })
  }, [city?.code, loadDistricts])

  const selectProvince = (nextIndex: number) => {
    const nextProvinceIndex = clampAddressIndex(nextIndex, provinces.length)
    setProvinceIndex(nextProvinceIndex)
    setCityIndex(0)
    setDistricts([])
    setDistrictIndex(0)
    setDistrictResolved(false)
    setProvinceScrollTop(getAddressScrollTop(nextProvinceIndex))
    setCityScrollTop(getAddressScrollTop(0))
    setDistrictScrollTop(getAddressScrollTop(0))
    releaseControlledAddressScroll()
  }

  const selectCity = (nextIndex: number) => {
    const nextCityIndex = clampAddressIndex(nextIndex, cities.length)
    setCityIndex(nextCityIndex)
    setDistricts([])
    setDistrictIndex(0)
    setDistrictResolved(false)
    setCityScrollTop(getAddressScrollTop(nextCityIndex))
    setDistrictScrollTop(getAddressScrollTop(0))
    releaseControlledAddressScroll()
  }

  const selectDistrict = (nextIndex: number) => {
    const normalized = clampAddressIndex(nextIndex, districts.length)
    setDistrictIndex(normalized)
    setDistrictScrollTop(getAddressScrollTop(normalized))
    releaseControlledAddressScroll()
  }

  const handleProvinceScroll = (event: { detail: { scrollTop: number } }) => {
    const nextProvinceIndex = getAddressIndexFromScrollTop(event.detail.scrollTop, provinces.length)
    if (nextProvinceIndex === provinceIndex) return
    setProvinceIndex(nextProvinceIndex)
    setCityIndex(0)
    setDistricts([])
    setDistrictIndex(0)
    setDistrictResolved(false)
    setCityScrollTop(getAddressScrollTop(0))
    setDistrictScrollTop(getAddressScrollTop(0))
    releaseControlledAddressScroll()
  }

  const handleCityScroll = (event: { detail: { scrollTop: number } }) => {
    const nextCityIndex = getAddressIndexFromScrollTop(event.detail.scrollTop, cities.length)
    if (nextCityIndex === cityIndex) return
    setCityIndex(nextCityIndex)
  }

  const handleDistrictScroll = (event: { detail: { scrollTop: number } }) => {
    const nextDistrictIndex = getAddressIndexFromScrollTop(event.detail.scrollTop, districts.length)
    if (nextDistrictIndex === districtIndex) return
    setDistrictIndex(nextDistrictIndex)
  }

  return (
    <View
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        background: 'rgba(51,51,51,0.30)',
        zIndex: 80,
      }}
      onClick={onClose}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '756rpx',
          borderRadius: '64rpx 64rpx 0 0',
          background: '#FFFFFF',
          padding: '42rpx 42rpx calc(36rpx + env(safe-area-inset-bottom)) 44rpx',
          boxSizing: 'border-box',
        }}
        onClick={event => event.stopPropagation()}
      >
        <View
          style={{
            width: '100%',
            height: '40rpx',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: '#333333',
              fontSize: '28rpx',
              fontWeight: 500,
              lineHeight: '40rpx',
              textAlign: 'center',
            }}
          >
            地址
          </Text>
        </View>

        <View
          style={{
            width: '512rpx',
            margin: '65rpx auto 0',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          <View
            style={{
              width: '256rpx',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: '#0C285A',
                fontSize: '28rpx',
                fontWeight: 500,
                lineHeight: '40rpx',
                textAlign: 'center',
              }}
            >
              中国
            </Text>
          </View>
          <View
            style={{
              width: '256rpx',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: '#999999',
                fontSize: '26rpx',
                fontWeight: 400,
                lineHeight: '37rpx',
                marginTop: '2rpx',
                textAlign: 'center',
              }}
            >
              海外地区国家
            </Text>
          </View>
        </View>
        <View style={{ width: '512rpx', margin: '0 auto', display: 'flex', flexDirection: 'row' }}>
          <View style={{ width: '256rpx', display: 'flex', justifyContent: 'center' }}>
            <View
              style={{
                width: '51rpx',
                height: '6rpx',
                borderRadius: '9rpx',
                background: '#2876FF',
              }}
            />
          </View>
          <View style={{ width: '256rpx' }} />
        </View>

        <View
          style={{
            position: 'relative',
            width: '656rpx',
            height: '300rpx',
            margin: '80rpx auto 0',
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
            onScroll={handleProvinceScroll}
            style={{
              position: 'absolute',
              left: '8rpx',
              top: 0,
              width: '200rpx',
              height: '300rpx',
            }}
            showScrollbar={false}
          >
            <View style={{ height: `${ADDRESS_PROVINCE_TOP_SPACER_RPX}rpx` }} />
            {provinces.map((item, index) => {
              const isActive = index === provinceIndex
              return (
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
                      color: isActive ? '#0C285A' : index < provinceIndex ? '#D7D7D7' : '#999999',
                      fontSize: '28rpx',
                      fontWeight: 500,
                      lineHeight: '40rpx',
                      textAlign: 'center',
                    }}
                  >
                    {item.name.replace(/[省市区]$/u, '')}
                  </Text>
                </View>
              )
            })}
            <View style={{ height: `${ADDRESS_WHEEL_BOTTOM_SPACER_RPX}rpx` }} />
          </ScrollView>
          <ScrollView
            scrollY
            scrollTop={cityScrollTop}
            scrollWithAnimation
            onScroll={handleCityScroll}
            style={{
              position: 'absolute',
              left: '228rpx',
              top: '78rpx',
              width: '200rpx',
              height: '222rpx',
            }}
            showScrollbar={false}
          >
            {cities.map((item, index) => {
              const isActive = index === cityIndex
              return (
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
                      color: isActive ? '#0C285A' : index < cityIndex ? '#D7D7D7' : '#999999',
                      fontSize: '28rpx',
                      fontWeight: 500,
                      lineHeight: '40rpx',
                      textAlign: 'center',
                    }}
                  >
                    {item.name.replace(/[市区县]$/u, '')}
                  </Text>
                </View>
              )
            })}
            <View style={{ height: `${ADDRESS_WHEEL_BOTTOM_SPACER_RPX}rpx` }} />
          </ScrollView>

          {districtLoading || districtError || districts.length === 0 ? (
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
              onScroll={handleDistrictScroll}
              style={{
                position: 'absolute',
                left: '448rpx',
                top: '78rpx',
                width: '200rpx',
                height: '222rpx',
              }}
              showScrollbar={false}
            >
              {districts.map((item, index) => {
                const isActive = index === districtIndex
                return (
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
                        color: isActive ? '#0C285A' : index < districtIndex ? '#D7D7D7' : '#999999',
                        fontSize: '28rpx',
                        fontWeight: 500,
                        lineHeight: '40rpx',
                        textAlign: 'center',
                      }}
                    >
                      {(item.label || item.name || '').replace(/[市区县]$/u, '')}
                    </Text>
                  </View>
                )
              })}
              <View style={{ height: `${ADDRESS_WHEEL_BOTTOM_SPACER_RPX}rpx` }} />
            </ScrollView>
          )}
        </View>

        <View
          style={{
            height: '98rpx',
            borderRadius: '40rpx',
            background: '#2876FF',
            marginTop: '43rpx',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => {
            if (districtLoading) {
              void Taro.showToast({ title: '区县加载中，请稍候', icon: 'none' })
              return
            }
            if (districtError) {
              void Taro.showToast({ title: '区县加载失败，请重新选择城市', icon: 'none' })
              return
            }
            if (province && city && districtResolved) {
              onConfirm(province, city, district, districtIndex)
            }
          }}
          hoverClass="btn-hover"
        >
          <Text
            style={{ color: '#FFFFFF', fontSize: '36rpx', fontWeight: 500, lineHeight: '50rpx' }}
          >
            确定
          </Text>
        </View>
      </View>
    </View>
  )
}

function getAddressScrollTop(index: number) {
  return Math.max(0, rpxToPx(index * ADDRESS_ROW_HEIGHT_RPX))
}

function getAddressIndexFromScrollTop(scrollTop: number, length: number) {
  if (length <= 0) return 0
  const rowHeight = rpxToPx(ADDRESS_ROW_HEIGHT_RPX)
  return clampAddressIndex(Math.round(scrollTop / rowHeight), length)
}

function clampAddressIndex(index: number, length: number) {
  if (length <= 0) return 0
  return Math.min(Math.max(0, index), length - 1)
}

function rpxToPx(value: number) {
  return (value * getWindowMetrics().windowWidth) / 750
}

async function ensureUserLocationAuthorized() {
  const setting = await Taro.getSetting()
  const authSetting = (setting.authSetting || {}) as Record<string, boolean | undefined>
  const current = authSetting[USER_LOCATION_SCOPE]

  if (current === true) return true

  if (current === false) {
    const modal = await Taro.showModal({
      title: '需要定位权限',
      content: '请在设置中允许定位，用于自动完善居住地。',
      confirmText: '去设置',
      cancelText: '手动选择',
    })
    if (!modal.confirm) return false

    const nextSetting = await Taro.openSetting()
    const nextAuthSetting = (nextSetting.authSetting || {}) as Record<string, boolean | undefined>
    return nextAuthSetting[USER_LOCATION_SCOPE] === true
  }

  try {
    await Taro.authorize({ scope: USER_LOCATION_SCOPE })
    return true
  } catch {
    return false
  }
}

function LocationConfirmSheet({
  onConfirm,
  loading,
  onManual,
  onClose,
}: {
  onConfirm: () => void | Promise<void>
  loading: boolean
  onManual: () => void
  onClose: () => void
}) {
  return (
    <View
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.42)',
        zIndex: 80,
      }}
      onClick={onClose}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          minHeight: '438rpx',
          borderRadius: '64rpx 64rpx 0 0',
          background: '#FFFFFF',
          padding: '48rpx 50rpx calc(58rpx + env(safe-area-inset-bottom))',
          boxSizing: 'border-box',
        }}
        onClick={event => event.stopPropagation()}
      >
        <Text
          style={{
            display: 'block',
            color: '#0C285A',
            fontSize: '36rpx',
            fontWeight: 700,
            lineHeight: '50rpx',
            textAlign: 'center',
          }}
        >
          获取当前位置
        </Text>
        <Text
          style={{
            display: 'block',
            color: '#6E7890',
            fontSize: '26rpx',
            lineHeight: '40rpx',
            textAlign: 'center',
            marginTop: '22rpx',
          }}
        >
          我们将仅用于完善居住地资料，帮助推荐更合适的人。
        </Text>
        <View
          style={{
            height: '96rpx',
            borderRadius: '24rpx',
            background: '#2876FF',
            marginTop: '48rpx',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => {
            if (!loading) onConfirm()
          }}
          hoverClass="btn-hover"
        >
          <Text
            style={{ color: '#FFFFFF', fontSize: '32rpx', fontWeight: 700, lineHeight: '45rpx' }}
          >
            {loading ? '定位中...' : '允许并获取定位'}
          </Text>
        </View>
        <View
          style={{
            height: '76rpx',
            marginTop: '16rpx',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={onManual}
          hoverClass="btn-hover"
        >
          <Text
            style={{ color: '#8792A6', fontSize: '28rpx', fontWeight: 700, lineHeight: '40rpx' }}
          >
            手动选择城市
          </Text>
        </View>
      </View>
    </View>
  )
}

async function showError(error: unknown) {
  const title = toTwoLevelRegionErrorMessage(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
