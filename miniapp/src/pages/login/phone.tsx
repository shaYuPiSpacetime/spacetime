import { Image, Input, Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { useLogin } from '@/hooks/useLogin'
import { loginByPhone, sendPhoneSmsCode } from '@/services/auth'
import { miniappOssIcons } from '@/constants/ossIcons'
import { useAuthStore } from '@/stores/authStore'
import { usePrd01Store } from '@/stores/prd01Store'
import { resolvePostLoginRoute, resolveSmsCountdown } from '@/domain/prd01Runtime'
import { normalizeAvatarUrl } from '@/utils/avatar'
import defaultAvatar from '@/assets/profile/default-avatar.webp'
import './phone.scss'

function PhoneIcon() {
  return (
    <View className="phone-login-method-icon">
      <Image
        src={miniappOssIcons.loginMethodPhone}
        mode="aspectFit"
        style={{ width: '44rpx', height: '54rpx' }}
      />
    </View>
  )
}

function SmsCodeIcon() {
  return (
    <View className="phone-login-sms-icon">
      {[0, 1, 2].map(item => (
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
  const router = useRouter()
  const { copy, bootstrap, resumeInit } = useLogin()
  const smsSecurity = usePrd01Store(state => state.config?.smsSecurity)
  const setLogin = useAuthStore(state => state.setLogin)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [errorText, setErrorText] = useState('')
  const [loading, setLoading] = useState(false)
  const [codeCountdown, setCodeCountdown] = useState(0)
  const agreed = router.params.agreed === '1'

  useEffect(() => {
    void bootstrap().catch(error => {
      setErrorText(error instanceof Error ? error.message : String(error))
    })
  }, [])

  useEffect(() => {
    if (codeCountdown <= 0) return undefined
    const timer = setInterval(() => {
      setCodeCountdown(value => Math.max(0, value - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [codeCountdown])

  const showDynamicError = (copyKey: string, error?: unknown) => {
    const message = error instanceof Error ? error.message : copy(copyKey)
    setErrorText(message)
    if (message) void Taro.showToast({ title: message, icon: 'none' })
  }

  const handleGetCode = async () => {
    if (codeCountdown > 0 || loading) return
    if (!phoneNumber.trim()) {
      showDynamicError('phone_login_required')
      return
    }
    setLoading(true)
    try {
      const result = await sendPhoneSmsCode(phoneNumber.trim())
      setErrorText('')
      setCodeCountdown(resolveSmsCountdown(result, smsSecurity))
    } catch (error) {
      showDynamicError('error_provider_unavailable', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneLogin = async () => {
    if (!phoneNumber.trim() || !verificationCode.trim()) {
      showDynamicError('phone_login_required')
      return
    }
    if (!agreed) {
      showDynamicError('login_agreement_notice')
      await Taro.redirectTo({ url: '/pages/login/index?variant=dialog' })
      return
    }
    if (loading) return
    setLoading(true)
    try {
      const loginData = await loginByPhone(
        phoneNumber.trim(),
        verificationCode.trim(),
        agreed
      )
      setLogin(
        loginData.token,
        loginData.userId,
        loginData.nickname || '',
        normalizeAvatarUrl(loginData.avatar, defaultAvatar),
        {
          openid: loginData.openid,
          phone: loginData.phone,
          maskedPhone: loginData.maskedPhone,
          accessStatus: loginData.accessStatus,
        }
      )
      const route = resolvePostLoginRoute({
        firstLoginCompleted: Boolean(loginData.firstLoginCompleted),
        nextStep: loginData.nextStep,
      })
      if (loginData.firstLoginCompleted) {
        await Taro.switchTab({ url: route })
      } else if (route) {
        await Taro.redirectTo({ url: route })
      } else {
        await resumeInit()
      }
    } catch (error) {
      showDynamicError('error_provider_unavailable', error)
    } finally {
      setLoading(false)
    }
  }

  const phoneLoginActive = Boolean(phoneNumber.trim() && verificationCode.trim())

  return (
    <View className="phone-login-page">
      <View
        className="phone-login-back"
        onClick={() => Taro.redirectTo({ url: '/pages/login/index?variant=methods' })}
        hoverClass="btn-hover"
      >
        <View className="phone-login-back-chevron" />
      </View>

      <View className="phone-login-heading">
        <Text className="phone-login-title">{copy('phone_login_title')}</Text>
        <Text className="phone-login-notice">{copy('phone_login_notice')}</Text>
      </View>

      {errorText ? (
        <View className="phone-login-error" onClick={() => setErrorText('')}>
          <Text className="phone-login-error-copy">{errorText}</Text>
        </View>
      ) : null}

      <View className="phone-login-field phone-login-field--phone">
        <PhoneIcon />
        <Input
          type="number"
          value={phoneNumber}
          placeholder={copy('phone_login_placeholder')}
          placeholderStyle="color:#A8B2C4;font-size:36rpx"
          onInput={event => {
            setPhoneNumber(event.detail.value)
            setErrorText('')
          }}
          className="phone-login-input"
        />
      </View>

      <View className="phone-login-field phone-login-field--sms">
        <View className="phone-login-method-icon">
          <SmsCodeIcon />
        </View>
        <Input
          type="number"
          value={verificationCode}
          placeholder={copy('phone_sms_placeholder')}
          placeholderStyle="color:#A8B2C4;font-size:36rpx"
          onInput={event => {
            setVerificationCode(event.detail.value)
            setErrorText('')
          }}
          className="phone-login-input"
        />
        <Text
          className={codeCountdown > 0 ? 'phone-login-code phone-login-code--counting' : 'phone-login-code'}
          onClick={() => void handleGetCode()}
        >
          {codeCountdown > 0 ? `${codeCountdown}s` : copy('phone_sms_send_action')}
        </Text>
      </View>

      <View
        className={phoneLoginActive ? 'phone-login-next phone-login-next--active' : 'phone-login-next'}
        onClick={() => void handlePhoneLogin()}
        hoverClass="btn-hover"
      >
        <View className="phone-login-next-arrow">
          <View className="phone-login-next-line" />
          <View className="phone-login-next-chevron" />
        </View>
      </View>
    </View>
  )
}
