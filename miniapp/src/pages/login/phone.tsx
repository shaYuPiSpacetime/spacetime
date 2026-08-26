import { Image, Input, Text, View } from '@tarojs/components'
import { useEffect, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { useLogin } from '@/hooks/useLogin'
import { loginByPhone, sendPhoneSmsCode } from '@/services/auth'
import { miniappOssIcons } from '@/constants/ossIcons'
import { useAuthStore } from '@/stores/authStore'
import { usePrd01Store } from '@/stores/prd01Store'
import { resolveSmsCountdown } from '@/domain/prd01Runtime'
import { isValidLoginPhone, resolvePhoneLoginError } from '@/domain/loginRuntime'
import { normalizeAvatarUrl } from '@/utils/avatar'
import loginSceneBg from '@/assets/login/login-scene-bg.jpg'
import defaultAvatar from '@/assets/profile/default-avatar.webp'
import { getNativeNavigationMetrics, MiniappBackIcon } from '@/components/NativeNavigation'
import './phone.scss'

const SMS_CODE_LENGTH = 4

export default function PhoneLoginPage() {
  const { bootstrap, resumeAfterLogin } = useLogin()
  const smsSecurity = usePrd01Store(state => state.config?.smsSecurity)
  const setLogin = useAuthStore(state => state.setLogin)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [agreementAccepted, setAgreementAccepted] = useState(false)
  const [showAgreement, setShowAgreement] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [codeCountdown, setCodeCountdown] = useState(0)
  const [errorText, setErrorText] = useState('')
  const loginPendingRef = useRef(false)

  useEffect(() => {
    void bootstrap().catch(error => setErrorText(error instanceof Error ? error.message : String(error)))
  }, [])

  useEffect(() => {
    if (codeCountdown <= 0) return undefined
    const timer = setInterval(() => setCodeCountdown(value => Math.max(0, value - 1)), 1000)
    return () => clearInterval(timer)
  }, [codeCountdown])

  const showError = (fallback: string, error?: unknown) => {
    const message = resolvePhoneLoginError(fallback, error)
    setErrorText(message)
  }

  const sendCodeAndOpenVerify = async () => {
    if (loading || codeCountdown > 0) return
    if (!isValidLoginPhone(phoneNumber)) {
      showError('你输入的手机号有误')
      return
    }
    setLoading(true)
    try {
      const result = await sendPhoneSmsCode(phoneNumber.trim())
      setCodeCountdown(resolveSmsCountdown(result, smsSecurity))
      setVerificationCode('')
      setErrorText('')
      setCodeSent(true)
    } catch (error) {
      showError('验证码发送失败，请稍后重试', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGetCode = async () => {
    if (!isValidLoginPhone(phoneNumber)) {
      showError('你输入的手机号有误')
      return
    }
    if (!agreementAccepted) {
      setShowAgreement(true)
      return
    }
    await sendCodeAndOpenVerify()
  }

  const handleAgreeAndContinue = async () => {
    setAgreementAccepted(true)
    setShowAgreement(false)
    await sendCodeAndOpenVerify()
  }

  const completeLogin = async (code: string) => {
    if (loginPendingRef.current || loading || code.length !== SMS_CODE_LENGTH) return
    loginPendingRef.current = true
    setLoading(true)
    try {
      const loginData = await loginByPhone(phoneNumber.trim(), code, true)
      setLogin(loginData.token, loginData.userId, loginData.nickname || '', normalizeAvatarUrl(loginData.avatar, defaultAvatar), {
        openid: loginData.openid,
        phone: loginData.phone,
        maskedPhone: loginData.maskedPhone,
        accessStatus: loginData.accessStatus,
      })
      await resumeAfterLogin(loginData)
    } catch (error) {
      setVerificationCode('')
      showError('登录失败，请稍后重试', error)
    } finally {
      loginPendingRef.current = false
      setLoading(false)
    }
  }

  const handleCodeInput = (value: string) => {
    const nextCode = value.replace(/\D/g, '').slice(0, SMS_CODE_LENGTH)
    setVerificationCode(nextCode)
    setErrorText('')
    if (nextCode.length === SMS_CODE_LENGTH) void completeLogin(nextCode)
  }

  const { menuTop, menuHeight } = getNativeNavigationMetrics()
  const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP
  const unit = isWeapp ? 'rpx' : 'px'
  const metric = (value: number) => (isWeapp ? value : value / 2)

  if (codeSent) {
    return (
      <View className="sms-verify-page">
        <View className="sms-verify-back" style={{ top: `${metric(Math.max(0, menuTop - 20))}${unit}`, height: `${metric(menuHeight + 40)}${unit}` }} onClick={() => setCodeSent(false)}>
          <MiniappBackIcon color="#607086" />
        </View>
        <View className="sms-verify-content">
          <Text className="sms-verify-title">输入验证码</Text>
          <Text className="sms-verify-tip">验证码已发送至 {phoneNumber}</Text>
          <View className="sms-code-boxes">
            {Array.from({ length: SMS_CODE_LENGTH }).map((_, index) => (
              <View key={index} className={`sms-code-box ${verificationCode.length === index ? 'is-active' : ''}`}><Text>{verificationCode[index] || ''}</Text></View>
            ))}
            <Input className="sms-code-native-input" type="number" maxlength={SMS_CODE_LENGTH} focus value={verificationCode} onInput={event => handleCodeInput(event.detail.value)} />
          </View>
          <View className={`sms-resend ${codeCountdown > 0 ? 'is-disabled' : ''}`} onClick={() => codeCountdown <= 0 && void sendCodeAndOpenVerify()}>
            <Text>{codeCountdown > 0 ? `重新发送 ${codeCountdown}s` : '重新发送'}</Text>
          </View>
          {loading ? <Text className="sms-login-pending">登录中...</Text> : null}
        </View>
      </View>
    )
  }

  return (
    <View className="phone-login-page">
      <Image className="phone-login-bg" src={loginSceneBg} mode="aspectFill" />
      <View className="phone-login-panel">
        <View className="phone-login-line">
          <Image className="phone-login-icon" src={miniappOssIcons.loginPhoneField} mode="aspectFit" />
          <Input className="phone-login-input" type="number" maxlength={11} value={phoneNumber} placeholder="请输入手机号" placeholderClass="phone-login-placeholder" onInput={event => { setPhoneNumber(event.detail.value.replace(/\D/g, '').slice(0, 11)); setErrorText('') }} />
        </View>
        <View className={`phone-login-code-button ${isValidLoginPhone(phoneNumber) ? 'is-active' : ''}`} onClick={() => void handleGetCode()}><Text>{loading ? '获取中...' : '获取验证码'}</Text></View>
        <View className="phone-login-agreement" onClick={() => setAgreementAccepted(value => !value)}>
          {agreementAccepted
            ? <Image className="phone-login-check-image" src={miniappOssIcons.loginAgreementChecked} mode="aspectFit" />
            : <Image className="phone-login-check-image" src={miniappOssIcons.loginAgreementUnchecked} mode="aspectFit" />}
          <Text>阅读并同意</Text><Text className="phone-login-link">《用户服务协议》</Text><Text>和</Text><Text className="phone-login-link">《隐私保护政策》</Text>
        </View>
        <View className="phone-login-wechat" onClick={() => Taro.redirectTo({ url: '/pages/login/index?variant=methods' })}><Image src={miniappOssIcons.loginMethodWechat} mode="aspectFit" /></View>
      </View>
      {errorText ? <View className="phone-login-error" onClick={() => setErrorText('')}><Text>{errorText}</Text></View> : null}
      {showAgreement ? (
        <View className="phone-agreement-mask" onClick={() => setShowAgreement(false)}>
          <View className="phone-agreement-sheet" onClick={event => event.stopPropagation()}>
            <Text className="phone-agreement-title">请同意一下条款</Text>
            <View className="phone-agreement-copy"><Text className="phone-login-link">《用户协议》</Text><Text> 和 </Text><Text className="phone-login-link">《隐私政策》</Text></View>
            <View className="phone-agreement-confirm" onClick={() => void handleAgreeAndContinue()}><Text>{loading ? '获取中...' : '同意并继续'}</Text></View>
          </View>
        </View>
      ) : null}
    </View>
  )
}
