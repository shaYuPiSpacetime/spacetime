import { Image, Input, Text, View } from '@tarojs/components'
import { useEffect, useRef, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { useLogin } from '@/hooks/useLogin'
import { loginByPhone, sendPhoneSmsCode } from '@/services/auth'
import { miniappOssIcons } from '@/constants/ossIcons'
import { useAuthStore } from '@/stores/authStore'
import { usePrd01Store } from '@/stores/prd01Store'
import { resolveSmsCountdown } from '@/domain/prd01Runtime'
import { isValidLoginPhone, resolvePhoneLoginError } from '@/domain/loginRuntime'
import { normalizeAvatarUrl } from '@/utils/avatar'
import defaultAvatar from '@/assets/profile/default-avatar.webp'
import { getNativeNavigationMetrics, MiniappBackIcon } from '@/components/NativeNavigation'
import LoginNextButton from './components/LoginNextButton'
import './phone.scss'

function PhoneIcon() {
  return (
    <View className="phone-login-method-icon">
      <Image
        src={miniappOssIcons.loginPhoneField}
        mode="aspectFit"
        style={{ width: '36rpx', height: '48rpx' }}
      />
    </View>
  )
}

function SmsCodeIcon() {
  return (
    <Image
      className="phone-login-sms-icon"
      src={miniappOssIcons.loginSmsCode}
      mode="aspectFit"
      style={{ width: '36rpx', height: '32rpx' }}
    />
  )
}

export default function PhoneLoginPage() {
  const router = useRouter()
  const { bootstrap, resumeAfterLogin } = useLogin()
  const smsSecurity = usePrd01Store(state => state.config?.smsSecurity)
  const setLogin = useAuthStore(state => state.setLogin)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [errorText, setErrorText] = useState('')
  const [loading, setLoading] = useState(false)
  const [codeCountdown, setCodeCountdown] = useState(0)
  const loginPendingRef = useRef(false)
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

  const showError = (fallback: string, error?: unknown) => {
    const message = resolvePhoneLoginError(fallback, error)
    setErrorText(message)
  }

  const handleGetCode = async () => {
    if (codeCountdown > 0 || loading) return
    if (!isValidLoginPhone(phoneNumber)) {
      showError('你输入的手机号有误')
      return
    }
    setLoading(true)
    try {
      const result = await sendPhoneSmsCode(phoneNumber.trim())
      setErrorText('')
      setCodeCountdown(resolveSmsCountdown(result, smsSecurity))
    } catch (error) {
      showError('验证码发送失败，请稍后重试', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneLogin = async () => {
    if (!isValidLoginPhone(phoneNumber)) {
      showError('你输入的手机号有误')
      return
    }
    if (!verificationCode.trim()) {
      showError('请输入验证码')
      return
    }
    if (!agreed) {
      showError('请阅读并同意用户协议与隐私政策后继续使用')
      await Taro.redirectTo({ url: '/pages/login/index?variant=dialog' })
      return
    }
    if (loginPendingRef.current || loading) return
    loginPendingRef.current = true
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
      await resumeAfterLogin(loginData)
    } catch (error) {
      showError('登录失败，请稍后重试', error)
    } finally {
      loginPendingRef.current = false
      setLoading(false)
    }
  }

  const phoneLoginActive = Boolean(phoneNumber.trim() && verificationCode.trim())
  const { menuTop, menuHeight } = getNativeNavigationMetrics()
  const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP
  const navigationUnit = isWeapp ? 'rpx' : 'px'
  const navigationMetric = (value: number) => (isWeapp ? value : value / 2)

  return (
    <View className="phone-login-page">
      <View
        className="phone-login-back"
        onClick={() => Taro.redirectTo({ url: '/pages/login/index?variant=methods' })}
        hoverClass="btn-hover"
        style={{
          top: `${navigationMetric(Math.max(0, menuTop - 20))}${navigationUnit}`,
          width: `${navigationMetric(112)}${navigationUnit}`,
          height: `${navigationMetric(menuHeight + 40)}${navigationUnit}`,
          paddingLeft: `${navigationMetric(28)}${navigationUnit}`,
        }}
      >
        <MiniappBackIcon color="#607086" />
      </View>

      <View className="phone-login-heading">
        <Text className="phone-login-title">你的手机号是</Text>
        <Text className="phone-login-notice">-请输入你要登录的手机号-</Text>
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
          placeholder="请输入手机号"
          placeholderStyle="color:#999999;font-size:32rpx"
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
          placeholder="请输入验证码"
          placeholderStyle="color:#999999;font-size:32rpx"
          onInput={event => {
            setVerificationCode(event.detail.value)
            setErrorText('')
          }}
          className="phone-login-input"
        />
        <View
          className="phone-login-code"
          onClick={() => void handleGetCode()}
        >
          {codeCountdown > 0 ? <><Text className="phone-login-code-countdown">{codeCountdown}s</Text><Text className="phone-login-code-retry">重新获取</Text></> : <Text>获取验证码</Text>}
        </View>
      </View>

      <LoginNextButton
        className="phone-login-next"
        active={phoneLoginActive && !loading}
        onClick={handlePhoneLogin}
      />
    </View>
  )
}
