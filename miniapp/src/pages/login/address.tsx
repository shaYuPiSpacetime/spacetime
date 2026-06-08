import { Picker, View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import LoginProfileShell from './components/LoginProfileShell'

/**
 * 登录-地址 — 1:1 还原蓝湖「登录-地址」设计稿
 */
export default function LoginAddressPage() {
  const { provinces, getCities, updateUserInfo, setStep } = useLogin()
  const [selected, setSelected] = useState<string>('')
  const [cityValue, setCityValue] = useState([0, 0])

  const currentProvince = provinces[cityValue[0]] || provinces[0]
  const currentCities = getCities(currentProvince)
  const cityRange = [provinces, currentCities]

  const handleNext = () => {
    if (!selected) return Taro.showToast({ title: '请选择居住地', icon: 'none' })
    setStep('verification')
    Taro.redirectTo({ url: '/pages/verification/basic' }).catch(() => {
      Taro.showToast({ title: '跳转失败，请重试', icon: 'none' })
    })
  }

  const handleCityColumnChange = (e: { detail: { column: number; value: number } }) => {
    if (e.detail.column === 0) {
      setCityValue([e.detail.value, 0])
      return
    }
    setCityValue([cityValue[0], e.detail.value])
  }

  const handleChooseCity = (e: { detail: { value: number[] } }) => {
    const provinceIndex = e.detail.value[0] || 0
    const cityIndex = e.detail.value[1] || 0
    const province = provinces[provinceIndex]
    const city = getCities(province)[cityIndex]
    if (!province || !city) return
    setCityValue([provinceIndex, cityIndex])
    setSelected(city)
    updateUserInfo({ province, city })
  }

  const handleLocation = async () => {
    try {
      const location = await Taro.chooseLocation()
      const city = location.name || location.address || '当前位置'
      setSelected(city)
      updateUserInfo({ city })
    } catch {
      try {
        await Taro.getLocation({ type: 'gcj02' })
        setSelected('当前位置')
        updateUserInfo({ city: '当前位置' })
      } catch {
        Taro.showToast({ title: '定位失败，请手动选择', icon: 'none' })
      }
    }
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
        <Picker
          mode="multiSelector"
          range={cityRange}
          value={cityValue}
          onChange={handleChooseCity}
          onColumnChange={handleCityColumnChange}
          style={{ flex: 1, height: '98rpx' }}
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
                  border: '6rpx solid #A6A6A6',
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
                  background: '#A6A6A6',
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  left: '15rpx',
                  top: '30rpx',
                  width: '16rpx',
                  height: '16rpx',
                  borderRight: '6rpx solid #A6A6A6',
                  borderBottom: '6rpx solid #A6A6A6',
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
        </Picker>
        <View
          style={{
            width: '170rpx',
            height: '98rpx',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={handleLocation}
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
    </LoginProfileShell>
  )
}
