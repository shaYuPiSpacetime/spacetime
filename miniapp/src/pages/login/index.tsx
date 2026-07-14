import { Button, View, Text, Image } from '@tarojs/components'
import { useState } from 'react'
import Taro, { useLoad } from '@tarojs/taro'
import { useLogin } from '@/hooks/useLogin'
import { useAuthStore } from '@/stores/authStore'
import { loginByWechatPhone } from '@/services/auth'
import { miniappOssIcons } from '@/constants/ossIcons'
import { resolvePostLoginRoute } from '@/domain/prd01Runtime'
import { usePrd01Store } from '@/stores/prd01Store'
import { normalizeAvatarUrl } from '@/utils/avatar'
import loginSceneBg from '@/assets/login/login-scene-bg.jpg'
import defaultAvatar from '@/assets/profile/default-avatar.webp'
import './index.scss'

type LoginMethod = 'wechat' | 'phone'

const LOGIN_METHODS: LoginMethod[] = ['wechat', 'phone']

function getWechatAuthErrorText(error: unknown, copy: (copyKey: string) => string) {
  const errMsg = (
    error && typeof error === 'object'
      ? String((error as { errMsg?: string; message?: string }).errMsg || (error as { message?: string }).message || '')
      : String(error || '')
  ).trim()
  const lowerErrMsg = errMsg.toLowerCase()

  if (lowerErrMsg.includes('timeout')) {
    return copy('login_wechat_timeout')
  }

  if (lowerErrMsg.includes('deny') || lowerErrMsg.includes('cancel')) {
    return copy('login_wechat_cancelled')
  }

  if (errMsg) {
    return errMsg.slice(0, 80)
  }

  return copy('login_wechat_cancelled')
}

interface AgreementSheetProps {
  selectedMethod: LoginMethod | null
  loading: boolean
  onAgree: () => void | Promise<void>
  onDisagree: () => void
}

function AgreementDialog({ selectedMethod, loading, onAgree, onDisagree }: AgreementSheetProps) {
  const copy = usePrd01Store(state => state.copy)
  const agreeText = selectedMethod === 'wechat' && loading
    ? copy('login_authorizing_action')
    : copy('login_agree_action')

  return (
    <View
      className="absolute inset-0 z-50"
      style={{ background: 'rgba(0,0,0,0.55)' }}
    >
      <View
        style={{
          position: 'absolute',
          left: '65rpx',
          top: '50%',
          width: '620rpx',
          minHeight: '842rpx',
          transform: 'translateY(-50%)',
          background: '#FFFFFF',
          borderRadius: '64rpx',
          padding: '52rpx 46rpx 42rpx',
          boxSizing: 'border-box',
          boxShadow: '0 24rpx 80rpx rgba(4, 16, 42, 0.24)',
        }}
      >
        <Text
          style={{
            display: 'block',
            color: '#333333',
            fontSize: '38rpx',
            fontWeight: 800,
            lineHeight: '54rpx',
            textAlign: 'center',
          }}
        >
          {copy('login_agreement_title')}
        </Text>

        <Text
          style={{
            display: 'block',
            color: '#333333',
            fontSize: '28rpx',
            lineHeight: '52rpx',
            marginTop: '42rpx',
          }}
        >
          {copy('login_agreement_notice')}
        </Text>

        <Text
          style={{
            display: 'block',
            color: '#333333',
            fontSize: '28rpx',
            lineHeight: '48rpx',
            marginTop: '18rpx',
          }}
        >
          {copy('agreement_user')}
        </Text>

        <Text
          style={{
            display: 'block',
            color: '#333333',
            fontSize: '28rpx',
            lineHeight: '48rpx',
            marginTop: '12rpx',
          }}
        >
          {copy('agreement_privacy')}
        </Text>

        <Text
          style={{
            display: 'block',
            color: '#333333',
            fontSize: '28rpx',
            lineHeight: '52rpx',
            marginTop: '12rpx',
          }}
        >
          {copy('login_agreement_detail')}
        </Text>

        <View style={{ display: 'flex', flexDirection: 'row', marginTop: '36rpx' }}>
          <View
            style={{
              width: '258rpx',
              height: '86rpx',
              borderRadius: '16rpx',
              background: '#F7F7F7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={onDisagree}
            hoverClass="btn-hover"
          >
            <Text style={{ color: '#333333', fontSize: '30rpx', fontWeight: 700, lineHeight: '42rpx' }}>
              {copy('login_disagree_action')}
            </Text>
          </View>
          <View
          style={{
              width: '258rpx',
              height: '86rpx',
              borderRadius: '16rpx',
            background: '#2876FF',
              marginLeft: '22rpx',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={onAgree}
          hoverClass="btn-hover"
        >
            <Text style={{ color: '#FFFFFF', fontSize: '30rpx', fontWeight: 700, lineHeight: '42rpx' }}>
            {agreeText}
          </Text>
          </View>
        </View>
      </View>
    </View>
  )
}

interface LoginMethodSheetProps {
  agreementAccepted: boolean
  loading: boolean
  onToggleAgreement: () => void
  onSelectMethod: (method: LoginMethod) => void | Promise<void>
  onWechatPhoneLogin: (event: { detail?: { code?: string; errMsg?: string } }) => void | Promise<void>
  onClose: () => void
}

function MethodIcon({ type }: { type: LoginMethod }) {
  const isWechat = type === 'wechat'
  const iconSize = isWechat
    ? { width: '48rpx', height: '48rpx' }
    : { width: '44rpx', height: '54rpx' }

  return (
    <View
      style={{
        width: '96rpx',
        height: '72rpx',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Image
        src={isWechat ? miniappOssIcons.loginMethodWechat : miniappOssIcons.loginMethodPhone}
        mode="aspectFit"
        style={iconSize}
      />
    </View>
  )
}

function LoginMethodRow({
  method,
  agreementAccepted,
  loading,
  onSelectMethod,
  onWechatPhoneLogin,
}: {
  method: { key: LoginMethod; title: string }
  agreementAccepted: boolean
  loading: boolean
  onSelectMethod: (method: LoginMethod) => void | Promise<void>
  onWechatPhoneLogin: (event: { detail?: { code?: string; errMsg?: string } }) => void | Promise<void>
}) {
  const content = (
    <View
      style={{
        height: '124rpx',
        borderRadius: '16rpx',
        background: '#FFFFFF',
        padding: '0 30rpx',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <MethodIcon type={method.key} />
      <Text style={{ color: '#333333', fontSize: '34rpx', fontWeight: 500, lineHeight: '48rpx' }}>
        {method.title}
      </Text>
    </View>
  )

  if (method.key === 'wechat' && agreementAccepted) {
    return (
      <Button
        className="login-wechat-custom-button"
        openType="getPhoneNumber"
        onGetPhoneNumber={onWechatPhoneLogin}
        disabled={loading}
        style={{
          display: 'block',
          width: '100%',
          margin: 0,
          padding: 0,
          background: 'transparent',
          border: 0,
          borderRadius: 0,
          lineHeight: 'normal',
          textAlign: 'left',
        }}
        hoverClass="btn-hover"
      >
        {content}
      </Button>
    )
  }

  return (
    <View onClick={() => onSelectMethod(method.key)} hoverClass="btn-hover">
      {content}
    </View>
  )
}

function LoginMethodSheet({
  agreementAccepted,
  loading,
  onToggleAgreement,
  onSelectMethod,
  onWechatPhoneLogin,
  onClose,
}: LoginMethodSheetProps) {
  const copy = usePrd01Store(state => state.copy)
  return (
    <View
      className="absolute inset-0 z-50"
      style={{ background: 'rgba(0,0,0,0.42)' }}
      onClick={onClose}
    >
      <View
        style={{
          position: 'absolute',
          left: '0',
          right: '0',
          bottom: '0',
          minHeight: '596rpx',
          borderRadius: '64rpx 64rpx 0 0',
          background: '#F5F6FA',
          padding: '54rpx 25rpx calc(40rpx + env(safe-area-inset-bottom))',
          boxSizing: 'border-box',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <Text style={{ display: 'block', color: '#333333', fontSize: '34rpx', fontWeight: 800, lineHeight: '48rpx', textAlign: 'center' }}>
          {copy('login_method_title')}
        </Text>
        <View style={{ marginTop: '64rpx' }}>
          {LOGIN_METHODS.map((methodKey, index) => (
            <View key={methodKey} style={{ marginTop: index === 0 ? '0' : '36rpx' }}>
              <LoginMethodRow
                method={{
                  key: methodKey,
                  title: copy(methodKey === 'wechat' ? 'login_wechat_action' : 'login_phone_action'),
                }}
                agreementAccepted={agreementAccepted}
                loading={loading}
                onSelectMethod={onSelectMethod}
                onWechatPhoneLogin={onWechatPhoneLogin}
              />
            </View>
          ))}
        </View>
        <View
          style={{
            height: '52rpx',
            marginTop: '72rpx',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
          }}
          onClick={onToggleAgreement}
          hoverClass="btn-hover"
        >
          <View
            style={{
              width: '42rpx',
              height: '42rpx',
              borderRadius: '21rpx',
              border: `3rpx solid ${agreementAccepted ? '#2876FF' : '#2876FF'}`,
              background: agreementAccepted ? '#2876FF' : 'transparent',
              boxSizing: 'border-box',
              marginLeft: '20rpx',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {agreementAccepted && <Text style={{ color: '#FFFFFF', fontSize: '24rpx', fontWeight: 900 }}>✓</Text>}
          </View>
          <Text style={{ color: '#333333', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx', marginLeft: '22rpx' }}>
            {copy('login_agreement_check_prefix')}
          </Text>
          <Text style={{ color: '#2876FF', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx', marginLeft: '12rpx' }}>
            {copy('agreement_user')}
          </Text>
          <Text style={{ color: '#333333', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx', marginLeft: '12rpx' }}>
            {copy('login_agreement_joiner')}
          </Text>
          <Text style={{ color: '#2876FF', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx', marginLeft: '12rpx' }}>
            {copy('agreement_privacy')}
          </Text>
        </View>
      </View>
    </View>
  )
}

/**
 * 登录入口页：先选择登录方式，再确认协议，最后进入对应登录方式。
 */
export default function LoginAuthPage() {
  const { copy, bootstrap, resumeInit } = useLogin()
  const { setLogin } = useAuthStore()
  const [agreementAccepted, setAgreementAccepted] = useState(false)
  const [showMethodSheet, setShowMethodSheet] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [loading, setLoading] = useState(false)
  const [wechatAuthPending, setWechatAuthPending] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<LoginMethod | null>(null)

  useLoad((options) => {
    void bootstrap().catch(error => {
      setErrorText(error instanceof Error ? error.message : String(error))
      setShowError(true)
    })
    const variant = options?.variant
    const isPhoneLoginVariant = variant === 'phone' || variant === 'phone-active' || variant === 'phone-error'
    const isDialogVariant = variant === 'auth' || variant === 'dialog'
    const isWechatAuthVariant = variant === 'wechat-auth'

    if (isPhoneLoginVariant) {
      Taro.redirectTo({ url: `/pages/login/phone?variant=${variant}` })
      return
    }

    setShowMethodSheet(variant === 'methods' || isWechatAuthVariant)
    setShowDialog(isDialogVariant)
    setShowError(variant === 'error')
    setAgreementAccepted(isWechatAuthVariant)

    if (variant === 'auth' || isWechatAuthVariant) {
      setSelectedMethod('wechat')
    }

  })

  const handleUse = () => {
    setShowMethodSheet(true)
    setShowDialog(false)
    setShowError(false)
    setErrorText('')
  }

  const proceedWithMethod = async (method: LoginMethod) => {
    setSelectedMethod(method)
    setShowMethodSheet(false)
    setShowDialog(false)
    setShowError(false)
    if (method === 'wechat') {
      setShowMethodSheet(true)
      return
    }
    await Taro.redirectTo({ url: '/pages/login/phone?agreed=1' })
  }

  const handleSelectMethod = async (method: LoginMethod) => {
    setSelectedMethod(method)
    setShowError(false)
    setErrorText('')
    if (!agreementAccepted) {
      setShowMethodSheet(false)
      setShowDialog(true)
      return
    }
    await proceedWithMethod(method)
  }

  const handleToggleAgreement = () => {
    setAgreementAccepted((checked) => !checked)
    setShowError(false)
  }

  const handleWechatPhoneLogin = async (event: { detail?: { code?: string; errMsg?: string } }) => {
    if (wechatAuthPending || loading) return
    const phoneCode = event.detail?.code
    if (!phoneCode) {
      const nextErrorText = getWechatAuthErrorText({ errMsg: event.detail?.errMsg }, copy)
      setErrorText(nextErrorText)
      setShowError(true)
      Taro.showToast({ title: nextErrorText, icon: 'none' })
      return
    }

    setWechatAuthPending(true)
    setLoading(true)
    setShowError(false)

    try {
      const { code: loginCode } = await Taro.login()
      if (!loginCode) {
        throw new Error(copy('login_wechat_code_failed'))
      }
      const loginData = await loginByWechatPhone({ loginCode, phoneCode, agreeProtocol: agreementAccepted })
      const nickname = loginData.nickname || ''
      const avatar = normalizeAvatarUrl(loginData.avatar, defaultAvatar)

      setLogin(loginData.token, loginData.userId, nickname, avatar, {
        openid: loginData.openid,
        phone: loginData.phone,
        maskedPhone: loginData.maskedPhone,
        accessStatus: loginData.accessStatus,
      })
      const route = resolvePostLoginRoute({
        firstLoginCompleted: Boolean(loginData.firstLoginCompleted),
        nextStep: loginData.nextStep,
      })
      if (loginData.firstLoginCompleted) await Taro.switchTab({ url: route })
      else if (route) await Taro.redirectTo({ url: route })
      else await resumeInit()
    } catch (error) {
      const nextErrorText = getWechatAuthErrorText(error, copy)
      setErrorText(nextErrorText)
      setShowError(true)
      Taro.showToast({ title: nextErrorText, icon: 'none' })
    } finally {
      setWechatAuthPending(false)
      setLoading(false)
    }
  }

  const handleAgreeAgreement = async () => {
    setAgreementAccepted(true)
    setShowDialog(false)
    setShowError(false)
    setErrorText('')
    if (selectedMethod) {
      if (selectedMethod === 'wechat') {
        setShowMethodSheet(true)
        return
      }
      await proceedWithMethod(selectedMethod)
    } else {
      setShowMethodSheet(true)
    }
  }

  const handleDisagree = () => {
    setShowDialog(false)
    setShowError(true)
    setErrorText(copy('login_agreement_notice'))
  }

  return (
    <View className="relative w-full h-screen overflow-hidden" style={{ background: '#061329' }}>
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: '88rpx',
          width: '100%',
          height: 'calc(100% - 88rpx)',
          overflow: 'hidden',
          zIndex: 0,
        }}
      >
        {/* 原图含参考状态栏；只做运行时裁切，不修改或重新编码源文件。 */}
        <Image
          src={loginSceneBg}
          mode="widthFix"
          style={{
            position: 'absolute',
            left: 0,
            top: '-88rpx',
            width: '100%',
          }}
        />
      </View>

      <View
        className="absolute flex items-center justify-center"
        style={{
          left: '114rpx',
          right: '114rpx',
          bottom: '214rpx',
          height: '98rpx',
          borderRadius: '28rpx',
          background: '#FFFFFF',
          boxShadow: '0 18rpx 42rpx rgba(11, 48, 96, 0.16)',
          zIndex: 10,
        }}
        hoverClass="btn-hover"
        onClick={handleUse}
      >
        <Text style={{ color: '#2876FF', fontSize: '34rpx', fontWeight: 600, lineHeight: '48rpx' }}>
          {copy('login_use_action')}
        </Text>
      </View>

      {showMethodSheet && (
        <LoginMethodSheet
          agreementAccepted={agreementAccepted}
          loading={wechatAuthPending}
          onToggleAgreement={handleToggleAgreement}
          onSelectMethod={handleSelectMethod}
          onWechatPhoneLogin={handleWechatPhoneLogin}
          onClose={() => setShowMethodSheet(false)}
        />
      )}

      {showDialog && (
        <AgreementDialog
          selectedMethod={selectedMethod}
          loading={wechatAuthPending}
          onAgree={handleAgreeAgreement}
          onDisagree={handleDisagree}
        />
      )}

      {showError && (
        <View
          style={{
            position: 'absolute',
            left: '126rpx',
            bottom: '337rpx',
            width: '498rpx',
            minHeight: '72rpx',
            borderRadius: '16rpx',
            background: 'rgba(0, 0, 0, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 26rpx',
            boxSizing: 'border-box',
            zIndex: 40,
          }}
          onClick={() => setShowError(false)}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '26rpx', lineHeight: '38rpx', textAlign: 'center' }}>
            {errorText}
          </Text>
        </View>
      )}
    </View>
  )
}
