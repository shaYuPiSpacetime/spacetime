import { View, Text, Input, Image } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro, { useLoad } from '@tarojs/taro'
import { useLogin } from '@/hooks/useLogin'
import { getDemoPageData } from '@/services/lanhuDemo'
import loginMethodPhoneIcon from '@/assets/lanhu/login/login-method-phone.png'
import './phone.scss'

interface PhoneLoginDemo {
  defaultUser: {
    nickname: string
    avatar: string
  }
  phoneLogin: {
    defaultPhone: string
    defaultCode: string
    codeButtonText: string
    countdownText: string
    submitText: string
    errorText: string
    errorHint: string
  }
}

const baseLoginDemo = getDemoPageData('login')
const loginDemo = baseLoginDemo as typeof baseLoginDemo & PhoneLoginDemo
const CODE_COUNTDOWN_SECONDS = 60

function PhoneIcon() {
  return (
    <View
      style={{
        width: '72rpx',
        height: '72rpx',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Image
        src={loginMethodPhoneIcon}
        mode="aspectFit"
        style={{ width: '44rpx', height: '54rpx' }}
      />
    </View>
  )
}

function SmsCodeIcon() {
  return (
    <View
      style={{
        width: '44rpx',
        height: '44rpx',
        borderRadius: '8rpx',
        background: '#DDEEFF',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {[0, 1, 2].map((item) => (
        <View
          key={item}
          style={{
            width: '6rpx',
            height: item === 1 ? '28rpx' : '24rpx',
            borderRadius: '4rpx',
            background: '#64A4FF',
            marginLeft: item === 0 ? '0' : '6rpx',
          }}
        />
      ))}
    </View>
  )
}

export default function PhoneLoginPage() {
  const { updateUserInfo, setStep } = useLogin()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [phoneLoginErrorVisible, setPhoneLoginErrorVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [codeCountdown, setCodeCountdown] = useState(0)

  useEffect(() => {
    if (codeCountdown <= 0) return undefined
    const timer = setInterval(() => {
      setCodeCountdown((value) => Math.max(0, value - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [codeCountdown])

  useLoad((options) => {
    const variant = options?.variant

    if (variant === 'phone' || variant === undefined) {
      setPhoneNumber('')
      setVerificationCode('')
      setPhoneLoginErrorVisible(false)
      setCodeCountdown(0)
    }

    if (variant === 'phone-active') {
      setPhoneNumber(loginDemo.phoneLogin.defaultPhone)
      setVerificationCode(loginDemo.phoneLogin.defaultCode)
      setPhoneLoginErrorVisible(false)
      setCodeCountdown(40)
    }

    if (variant === 'phone-error') {
      setPhoneNumber(loginDemo.phoneLogin.defaultPhone)
      setVerificationCode('000000')
      setPhoneLoginErrorVisible(true)
      setCodeCountdown(0)
    }
  })

  const handleBack = () => {
    Taro.redirectTo({ url: '/pages/login/index?variant=methods' })
  }

  const handleGetCode = () => {
    if (codeCountdown > 0) return
    if (!phoneNumber.trim()) {
      setPhoneNumber(loginDemo.phoneLogin.defaultPhone)
    }
    setVerificationCode(loginDemo.phoneLogin.defaultCode)
    setPhoneLoginErrorVisible(false)
    setCodeCountdown(CODE_COUNTDOWN_SECONDS)
  }

  const enterProfileFlow = async () => {
    if (loading) return
    setLoading(true)
    try {
      updateUserInfo({
        avatar: loginDemo.defaultUser.avatar,
        nickname: loginDemo.defaultUser.nickname,
      })
      setStep('gender')
      await Taro.redirectTo({ url: '/pages/login/gender' })
    } catch {
      Taro.showToast({ title: '页面跳转失败，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneLogin = () => {
    if (!phoneNumber.trim() || !verificationCode.trim()) {
      Taro.showToast({ title: '请填写手机号和验证码', icon: 'none' })
      return
    }
    if (verificationCode !== loginDemo.phoneLogin.defaultCode) {
      setPhoneLoginErrorVisible(true)
      return
    }
    enterProfileFlow()
  }

  const phoneLoginActive = Boolean(phoneNumber.trim() && verificationCode.trim())

  return (
    <View
      className="phone-login-page"
      style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #F6FFFD 0%, #F7F9FF 100%)', position: 'relative', overflow: 'hidden' }}
    >
      <View
        style={{
          position: 'absolute',
          left: '30rpx',
          top: '132rpx',
          width: '58rpx',
          height: '58rpx',
        }}
        onClick={handleBack}
        hoverClass="btn-hover"
      >
        <View
          style={{
            position: 'absolute',
            left: '10rpx',
            top: '8rpx',
            width: '36rpx',
            height: '36rpx',
            borderLeft: '6rpx solid #697E9C',
            borderBottom: '6rpx solid #697E9C',
            transform: 'rotate(45deg)',
          }}
        />
      </View>

      <View style={{ position: 'absolute', left: '0', top: '318rpx', width: '750rpx', alignItems: 'center', display: 'flex', flexDirection: 'column' }}>
        <Text style={{ color: '#0C285A', fontSize: '42rpx', fontWeight: 800, lineHeight: '59rpx' }}>
          你的手机号是
        </Text>
        <Text style={{ color: '#999999', fontSize: '30rpx', fontWeight: 400, lineHeight: '42rpx', marginTop: '48rpx' }}>
          -请输入你要登录的手机号-
        </Text>
      </View>

      {phoneLoginErrorVisible && (
        <View
          style={{
            position: 'absolute',
            left: '145rpx',
            top: '496rpx',
            width: '510rpx',
            height: '124rpx',
            borderRadius: '8rpx',
            background: 'rgba(0,0,0,0.32)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5,
          }}
          onClick={() => setPhoneLoginErrorVisible(false)}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '34rpx', fontWeight: 500, lineHeight: '48rpx' }}>
            你输入的手机号有误
          </Text>
        </View>
      )}

      <View
        style={{
          position: 'absolute',
          left: '80rpx',
          top: '624rpx',
          width: '590rpx',
          height: '124rpx',
          borderRadius: '16rpx',
          background: '#FFFFFF',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          padding: '0 48rpx',
          boxSizing: 'border-box',
        }}
      >
        <PhoneIcon />
        <Input
          type="number"
          value={phoneNumber}
          placeholder="请输入手机号"
          placeholderStyle="color:#A8B2C4;font-size:36rpx"
          onInput={(event) => {
            setPhoneNumber(event.detail.value)
            setPhoneLoginErrorVisible(false)
          }}
          style={{
            flex: 1,
            height: '124rpx',
            color: '#333333',
            fontSize: '38rpx',
            lineHeight: '124rpx',
            marginLeft: '38rpx',
          }}
        />
      </View>

      <View
        style={{
          position: 'absolute',
          left: '80rpx',
          top: '788rpx',
          width: '590rpx',
          height: '124rpx',
          borderRadius: '16rpx',
          background: '#FFFFFF',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          padding: '0 34rpx 0 48rpx',
          boxSizing: 'border-box',
        }}
      >
        <View style={{ width: '72rpx', height: '72rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SmsCodeIcon />
        </View>
        <Input
          type="number"
          value={verificationCode}
          placeholder="请输入验证码"
          placeholderStyle="color:#A8B2C4;font-size:36rpx"
          onInput={(event) => {
            setVerificationCode(event.detail.value)
            setPhoneLoginErrorVisible(false)
          }}
          style={{ flex: 1, height: '124rpx', color: '#333333', fontSize: '38rpx', lineHeight: '124rpx', marginLeft: '38rpx' }}
        />
        <Text
          style={{ color: codeCountdown > 0 ? '#999999' : '#2876FF', fontSize: '32rpx', fontWeight: 400, lineHeight: '45rpx' }}
          onClick={handleGetCode}
        >
          {codeCountdown > 0 ? `${codeCountdown}s重新获取` : loginDemo.phoneLogin.codeButtonText}
        </Text>
      </View>

      <View
        style={{
          position: 'absolute',
          left: '312rpx',
          bottom: '164rpx',
          width: '126rpx',
          height: '126rpx',
          borderRadius: '63rpx',
          background: phoneLoginActive ? '#2876FF' : '#C8DAF2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: phoneLoginActive ? '0 18rpx 36rpx rgba(40,118,255,0.25)' : 'none',
        }}
        onClick={handlePhoneLogin}
        hoverClass="btn-hover"
      >
        <View style={{ position: 'relative', width: '54rpx', height: '40rpx' }}>
          <View style={{ position: 'absolute', left: '4rpx', top: '17rpx', width: '38rpx', height: '7rpx', borderRadius: '4rpx', background: '#FFFFFF' }} />
          <View style={{ position: 'absolute', right: '3rpx', top: '5rpx', width: '27rpx', height: '27rpx', borderTop: '7rpx solid #FFFFFF', borderRight: '7rpx solid #FFFFFF', transform: 'rotate(45deg)' }} />
        </View>
      </View>
    </View>
  )
}
