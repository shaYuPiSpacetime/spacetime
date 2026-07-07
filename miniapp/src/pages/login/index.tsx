import { View, Text, Image } from '@tarojs/components'
import { useState } from 'react'
import Taro, { useLoad } from '@tarojs/taro'
import { useLogin } from '@/hooks/useLogin'
import { getDemoPageData } from '@/services/lanhuDemo'
import loginBg from '@/assets/login/login-bg.webp'
import loginMethodWechatIcon from '@/assets/lanhu/login/login-method-wechat.png'
import loginMethodPhoneIcon from '@/assets/lanhu/login/login-method-phone.png'
import './index.scss'

type LoginMethod = 'wechat' | 'phone'

interface LoginExtras {
  phoneLogin: {
    defaultPhone: string
    defaultCode: string
    codeButtonText: string
    submitText: string
    errorText: string
    errorHint: string
  }
}

const baseLoginDemo = getDemoPageData('login')
const loginDemo = baseLoginDemo as typeof baseLoginDemo & LoginExtras

function getWechatAuthErrorText(error: unknown) {
  const errMsg =
    error && typeof error === 'object'
      ? String((error as { errMsg?: string; message?: string }).errMsg || (error as { message?: string }).message || '')
      : String(error || '')

  if (errMsg.toLowerCase().includes('timeout')) {
    return '微信授权超时，请重试'
  }

  return '需要完成微信授权后继续'
}

interface AgreementSheetProps {
  selectedMethod: LoginMethod | null
  loading: boolean
  onAgree: () => void | Promise<void>
  onDisagree: () => void
}

function AgreementDialog({ selectedMethod, loading, onAgree, onDisagree }: AgreementSheetProps) {
  const agreeText = selectedMethod === 'wechat' && loading ? '授权中...' : loginDemo.agreement.agreeText

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
          {loginDemo.agreement.title}
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
          未成年人请勿注册使用本产品。感谢您信任并使用时空邂逅，在您使用时空邂逅的过程中，我们可能会对您的部分个人信息进行收集和使用。
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
          1、未经您的同意，我们不会从第三方获取、共享或对外提供您的个人信息；
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
          2、您可以随时访问、更正或删除您的个人信息，也可以通过产品内反馈与我们联系。
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
          更多详细信息，您可以点击查看我们的
          <Text style={{ color: '#2876FF', textDecoration: 'underline' }}>《用户服务协议》</Text>
          和
          <Text style={{ color: '#2876FF', textDecoration: 'underline' }}>《隐私保护政策》</Text>
          。请您务必仔细阅读并充分理解相关条款，如您同意以上协议和政策，请点击“同意”开始使用我们的产品和服务。
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
              {loginDemo.agreement.disagreeText}
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
  onClose: () => void
}

function MethodIcon({ type }: { type: LoginMethod }) {
  const isWechat = type === 'wechat'
  const iconSize = isWechat
    ? { width: '96rpx', height: '96rpx' }
    : { width: '44rpx', height: '54rpx' }

  return (
    <View
      style={{
        width: isWechat ? '116rpx' : '92rpx',
        height: '96rpx',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Image
        src={isWechat ? loginMethodWechatIcon : loginMethodPhoneIcon}
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
}: {
  method: { key: LoginMethod; title: string }
  agreementAccepted: boolean
  loading: boolean
  onSelectMethod: (method: LoginMethod) => void | Promise<void>
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
      <View
        className="login-wechat-custom-button"
        onClick={() => {
          if (!loading) {
            onSelectMethod(method.key)
          }
        }}
        hoverClass="btn-hover"
      >
        {content}
      </View>
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
  onClose,
}: LoginMethodSheetProps) {
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
          选择登录方式
        </Text>
        <View style={{ marginTop: '64rpx' }}>
          {loginDemo.methods.map((method, index) => (
            <View key={method.key} style={{ marginTop: index === 0 ? '0' : '36rpx' }}>
              <LoginMethodRow
                method={method}
                agreementAccepted={agreementAccepted}
                loading={loading}
                onSelectMethod={onSelectMethod}
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
            阅读并同意
          </Text>
          <Text style={{ color: '#2876FF', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx', marginLeft: '12rpx' }}>
            用户服务协议
          </Text>
          <Text style={{ color: '#333333', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx', marginLeft: '12rpx' }}>
            和
          </Text>
          <Text style={{ color: '#2876FF', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx', marginLeft: '12rpx' }}>
            隐私保护政策
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
  const { updateUserInfo, setStep } = useLogin()
  const [agreementAccepted, setAgreementAccepted] = useState(false)
  const [showMethodSheet, setShowMethodSheet] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorText, setErrorText] = useState(loginDemo.agreement.errorText)
  const [loading, setLoading] = useState(false)
  const [wechatAuthPending, setWechatAuthPending] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<LoginMethod | null>(null)

  useLoad((options) => {
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

  const enterProfileFlow = async (nickname: string, avatar = '') => {
    if (loading) return
    setLoading(true)
    try {
      updateUserInfo({ avatar, nickname })
      setStep('gender')
      await Taro.redirectTo({ url: '/pages/login/gender' })
    } catch {
      setErrorText('页面跳转失败，请重试')
      setShowError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleUse = () => {
    setShowMethodSheet(true)
    setShowDialog(false)
    setShowError(false)
    setErrorText(loginDemo.agreement.errorText)
  }

  const proceedWithMethod = async (method: LoginMethod) => {
    setSelectedMethod(method)
    setShowMethodSheet(false)
    setShowDialog(false)
    setShowError(false)
    if (method === 'wechat') {
      await handleWechatProfile()
      return
    }
    await Taro.redirectTo({ url: '/pages/login/phone' })
  }

  const handleSelectMethod = async (method: LoginMethod) => {
    setSelectedMethod(method)
    setShowError(false)
    setErrorText(loginDemo.agreement.errorText)
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

  const handleWechatProfile = async () => {
    if (wechatAuthPending || loading) return
    setWechatAuthPending(true)
    setShowError(false)

    try {
      const profile = await Taro.getUserProfile({
        desc: '用于完善时空邂逅交友资料',
      })
      const nickname = profile.userInfo?.nickName || loginDemo.defaultUser.nickname
      const avatar = profile.userInfo?.avatarUrl || loginDemo.defaultUser.avatar
      await enterProfileFlow(nickname, avatar)
    } catch (error) {
      const nextErrorText = getWechatAuthErrorText(error)
      setErrorText(nextErrorText)
      setShowError(true)
      Taro.showToast({ title: nextErrorText, icon: 'none' })
    } finally {
      setWechatAuthPending(false)
    }
  }

  const handleAgreeAgreement = async () => {
    setAgreementAccepted(true)
    setShowDialog(false)
    setShowError(false)
    setErrorText(loginDemo.agreement.errorText)
    if (selectedMethod) {
      await proceedWithMethod(selectedMethod)
    } else {
      setShowMethodSheet(true)
    }
  }

  const handleDisagree = () => {
    setShowDialog(false)
    setShowError(true)
    setErrorText(loginDemo.agreement.errorText)
  }

  return (
    <View className="relative w-full h-screen overflow-hidden bg-white">
      <Image
        className="absolute top-0 left-0 w-full"
        src={loginBg}
        mode="widthFix"
      />

      <View
        className="absolute flex items-center justify-center"
        style={{
          left: '115rpx',
          right: '115rpx',
          bottom: '168rpx',
          height: '98rpx',
          borderRadius: '28rpx',
          background: showDialog || showMethodSheet ? '#C9C9C9' : '#FFFFFF',
        }}
        hoverClass="btn-hover"
        onClick={handleUse}
      >
        <Text style={{ color: '#2876FF', fontSize: '34rpx', fontWeight: 600, lineHeight: '48rpx' }}>
          立即使用
        </Text>
      </View>

      {showMethodSheet && (
        <LoginMethodSheet
          agreementAccepted={agreementAccepted}
          loading={wechatAuthPending}
          onToggleAgreement={handleToggleAgreement}
          onSelectMethod={handleSelectMethod}
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
