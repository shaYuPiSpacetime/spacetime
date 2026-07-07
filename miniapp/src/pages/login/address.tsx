import { ScrollView, View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import { getDemoPageData } from '@/services/lanhuDemo'
import LoginProfileShell from './components/LoginProfileShell'
import './address.scss'

const loginDemo = getDemoPageData('login')

/**
 * 登录-地址 — 1:1 还原蓝湖「登录-地址」设计稿
 */
export default function LoginAddressPage() {
  const { provinces, getCities, updateUserInfo, submit } = useLogin()
  const [selected, setSelected] = useState<string>('')
  const [cityValue, setCityValue] = useState([0, 0])
  const [showManualSheet, setShowManualSheet] = useState(false)
  const [showLocationSheet, setShowLocationSheet] = useState(false)

  const locationColor = selected ? '#2876FF' : '#A6A6A6'

  useLoad((options) => {
    const variant = options?.variant ?? 'empty'
    if (variant === 'empty') {
      setSelected('')
      setShowManualSheet(false)
      setShowLocationSheet(false)
      return
    }

    if (variant === 'manual') {
      setShowManualSheet(true)
      return
    }

    if (variant !== 'selected') return

    const provinceIndex = Math.max(0, provinces.indexOf(loginDemo.defaultAddress.province))
    const cityIndex = Math.max(0, getCities(loginDemo.defaultAddress.province).indexOf(loginDemo.defaultAddress.city))
    setCityValue([provinceIndex, cityIndex])
    setSelected(formatAddressLabel(loginDemo.defaultAddress.province, loginDemo.defaultAddress.city))
    setShowManualSheet(false)
    setShowLocationSheet(false)
    updateUserInfo(loginDemo.defaultAddress)
  })

  const handleNext = async () => {
    if (!selected) return Taro.showToast({ title: '请选择居住地', icon: 'none' })
    await submit()
  }

  const handleLocationFail = () => {
    setShowLocationSheet(false)
    setShowManualSheet(true)
    Taro.showToast({ title: '定位失败，请手动选择', icon: 'none' })
  }

  const handleLocation = async () => {
    try {
      await Taro.getLocation({ type: 'gcj02' })
      setSelected('当前位置')
      setShowManualSheet(false)
      setShowLocationSheet(false)
      updateUserInfo({ city: '当前位置' })
    } catch {
      handleLocationFail()
    }
  }

  const handleManualConfirm = (province: string, city: string) => {
    const provinceIndex = Math.max(0, provinces.indexOf(province))
    const cityIndex = Math.max(0, getCities(province).indexOf(city))
    setCityValue([provinceIndex, cityIndex])
    setSelected(formatAddressLabel(province, city))
    setShowManualSheet(false)
    setShowLocationSheet(false)
    updateUserInfo({ province, city })
  }

  return (
    <LoginProfileShell
      description="—你的居住地（为你推荐匹配的异性）—"
      nextActive={Boolean(selected)}
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
                color: selected ? '#333333' : '#999999',
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
          selected={selected}
          getCities={getCities}
          onConfirm={handleManualConfirm}
          onClose={() => setShowManualSheet(false)}
        />
      )}

      {showLocationSheet && (
        <LocationConfirmSheet
          onConfirm={handleLocation}
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

function formatAddressLabel(province: string, city: string) {
  return `${province.replace(/[省市区]$/u, '')}${city.replace(/[市区县]$/u, '')}`
}

function ManualAddressSheet({
  provinces,
  cityValue,
  selected,
  getCities,
  onConfirm,
  onClose,
}: {
  provinces: string[]
  cityValue: number[]
  selected: string
  getCities: (province: string) => string[]
  onConfirm: (province: string, city: string) => void
  onClose: () => void
}) {
  const [provinceIndex, setProvinceIndex] = useState(cityValue[0] || 0)
  const [cityIndex, setCityIndex] = useState(cityValue[1] || 0)
  const province = provinces[provinceIndex] || provinces[0]
  const cities = getCities(province)
  const city = cities[cityIndex] || cities[0] || ''
  const provinceScrollTop = Math.max(0, provinceIndex * 59 - 78)
  const cityScrollTop = Math.max(0, cityIndex * 59)

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
        onClick={(event) => event.stopPropagation()}
      >
        <Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx', textAlign: 'center' }}>
          地址
        </Text>

        <View
          style={{
            width: '418rpx',
            margin: '65rpx 94rpx 0 152rpx',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <Text style={{ color: '#0C285A', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>
            中国
          </Text>
          <Text style={{ color: '#999999', fontSize: '26rpx', fontWeight: 400, lineHeight: '37rpx', marginTop: '2rpx' }}>
            海外地区国家
          </Text>
        </View>
        <View
          style={{
            width: '51rpx',
            height: '6rpx',
            borderRadius: '9rpx',
            background: '#2876FF',
            margin: '0 0 0 155rpx',
          }}
        />

        <View
          style={{
            position: 'relative',
            width: '657rpx',
            height: '300rpx',
            margin: '37rpx 0 0 7rpx',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: '78rpx',
              width: '657rpx',
              height: '78rpx',
              borderRadius: '24rpx',
              background: '#E3F1FE',
            }}
          />
          <ScrollView scrollY scrollTop={provinceScrollTop} style={{ position: 'absolute', left: '100rpx', top: 0, width: '160rpx', height: '246rpx' }} showScrollbar={false}>
            {provinces.map((item, index) => {
              const isActive = index === provinceIndex
              return (
                <View
                  key={item}
                  style={{
                    height: isActive ? '78rpx' : '59rpx',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                  }}
                  onClick={() => {
                    setProvinceIndex(index)
                    setCityIndex(0)
                  }}
                  hoverClass="btn-hover"
                >
                  <Text
                    style={{
                      color: isActive ? '#0C285A' : index < provinceIndex ? '#D7D7D7' : '#999999',
                      fontSize: '28rpx',
                      fontWeight: 500,
                      lineHeight: '40rpx',
                    }}
                  >
                    {item.replace(/[省市区]$/u, '')}
                  </Text>
                </View>
              )
            })}
          </ScrollView>
          <ScrollView scrollY scrollTop={cityScrollTop} style={{ position: 'absolute', left: '356rpx', top: '78rpx', width: '160rpx', height: '168rpx' }} showScrollbar={false}>
            {cities.map((item, index) => {
              const isActive = index === cityIndex
              return (
                <View
                  key={item}
                  style={{
                    height: isActive ? '78rpx' : '59rpx',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onClick={() => setCityIndex(index)}
                  hoverClass="btn-hover"
                >
                  <Text
                    style={{
                      color: isActive ? '#0C285A' : index < cityIndex ? '#D7D7D7' : '#999999',
                      fontSize: '28rpx',
                      fontWeight: 500,
                      lineHeight: '40rpx',
                    }}
                  >
                    {item.replace(/[市区县]$/u, '')}
                  </Text>
                </View>
              )
            })}
          </ScrollView>
        </View>

        <View
          style={{
            height: '98rpx',
            borderRadius: '40rpx',
            background: '#2876FF',
            marginTop: '73rpx',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => {
            if (city) onConfirm(province, city)
          }}
          hoverClass="btn-hover"
        >
          <Text style={{ color: '#FFFFFF', fontSize: '36rpx', fontWeight: 500, lineHeight: '50rpx' }}>
            确定
          </Text>
        </View>
      </View>
    </View>
  )
}

function LocationConfirmSheet({
  onConfirm,
  onManual,
  onClose,
}: {
  onConfirm: () => void | Promise<void>
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
        onClick={(event) => event.stopPropagation()}
      >
        <Text style={{ display: 'block', color: '#0C285A', fontSize: '36rpx', fontWeight: 700, lineHeight: '50rpx', textAlign: 'center' }}>
          获取当前位置
        </Text>
        <Text style={{ display: 'block', color: '#6E7890', fontSize: '26rpx', lineHeight: '40rpx', textAlign: 'center', marginTop: '22rpx' }}>
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
          onClick={onConfirm}
          hoverClass="btn-hover"
        >
          <Text style={{ color: '#FFFFFF', fontSize: '32rpx', fontWeight: 700, lineHeight: '45rpx' }}>
            允许并获取定位
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
          <Text style={{ color: '#8792A6', fontSize: '28rpx', fontWeight: 700, lineHeight: '40rpx' }}>
            手动选择城市
          </Text>
        </View>
      </View>
    </View>
  )
}
