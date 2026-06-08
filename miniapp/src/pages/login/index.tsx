import { View, Text, Image } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro, { useLoad } from '@tarojs/taro'
import { useLogin } from '@/hooks/useLogin'
import { useAuthStore } from '@/stores/authStore'
import loginBg from '@/assets/login/login-bg.png'

/**
 * 登录-授权页 — 1:1 还原蓝湖「登录」设计稿
 *
 * 蓝湖设计规格（750px ÷ 2 → 375 CSS px = rpx）：
 * - 全屏背景插画（login-bg.png），Image mode="widthFix" 自适应宽度
 * - 底部白色胶囊按钮「立即使用」，蓝色文字 #2876FF
 * - 按钮区域：左右 114rpx，距底部 215rpx
 * - 按钮：圆角 10px，上下内边距 12px
 * - 协议弹窗：白色卡片 + 双按钮（不同意/同意）
 */
export default function LoginAuthPage() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const { updateUserInfo, setStep } = useLogin()
  const [agreed, setAgreed] = useState(false)
  const [showDialog, setShowDialog] = useState(true)
  const [loading, setLoading] = useState(false)

  useLoad(() => {
    setShowDialog(true)
  })

  useEffect(() => {
    if (isLoggedIn) {
      Taro.switchTab({ url: '/pages/index/index' })
    }
  }, [isLoggedIn])

  const handleAgree = () => {
    setAgreed(true)
    setShowDialog(false)
  }

  const handleDisagree = () => {
    Taro.showModal({
      title: '提示',
      content: '不同意协议将无法使用应用',
      showCancel: false,
    })
  }

  const handleUse = async () => {
    if (!agreed) {
      setShowDialog(true)
      return
    }
    if (loading) return
    setLoading(true)
    try {
      updateUserInfo({ avatar: '', nickname: '微信用户' })
      setStep('gender')
      await Taro.redirectTo({ url: '/pages/login/gender' })
    } catch {
      Taro.showToast({ title: '启动失败，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  if (isLoggedIn) {
    return null
  }

  return (
    <View className="relative w-full h-screen overflow-hidden bg-white">
      {/* ── 全屏背景插画 — 蓝湖「登录」设计稿主体 ── */}
      <Image
        className="absolute top-0 left-0 w-full"
        src={loginBg}
        mode="widthFix"
      />

      {/* ── 底部交互热区 — 透明覆盖层，视觉由背景图提供 ── */}
      <View
        className="absolute left-0 right-0"
        style={{ bottom: '107rpx', height: '160rpx' }}
      >
        {/* 按钮热区 — 对齐背景图中「立即使用」胶囊按钮 */}
        <View
          className="absolute top-0"
          style={{
            left: '57rpx',
            right: '57rpx',
            height: '98rpx',
          }}
          hoverClass="btn-hover"
          onClick={handleUse}
        />

        {/* 协议文字热区 — 点击弹出协议弹窗 */}
        <View
          className="absolute left-0 right-0 flex justify-center"
          style={{ top: '110rpx', height: '44rpx' }}
          onClick={() => setShowDialog(true)}
        />
      </View>

      {/* ── 温馨提示弹窗 — 蓝湖「登录-授权」设计稿 ── */}
      {showDialog && (
        <View
          className="absolute inset-0 flex items-center justify-center z-50"
          style={{
            background: 'rgba(0,0,0,0.55)',
            paddingLeft: '80rpx',
            paddingRight: '80rpx',
          }}
        >
          <View
            className="w-full flex flex-col items-center"
            style={{
              background: '#FFFFFF',
              borderRadius: '32rpx',
              paddingLeft: '56rpx',
              paddingRight: '56rpx',
              paddingTop: '64rpx',
              paddingBottom: '48rpx',
            }}
          >
            {/* 弹窗标题 */}
            <Text
              style={{
                fontSize: '36rpx',
                fontWeight: 600,
                color: '#1A1A1A',
                marginBottom: '32rpx',
              }}
            >
              温馨提示
            </Text>

            {/* 弹窗内容 */}
            <Text
              style={{
                fontSize: '28rpx',
                color: '#666666',
                textAlign: 'center',
                lineHeight: '44rpx',
                marginBottom: '48rpx',
              }}
            >
              为了向你提供更好的体验，请阅读并同意
              <Text style={{ color: '#2876FF' }}>《用户协议》</Text>
              、
              <Text style={{ color: '#2876FF' }}>《隐私协议》</Text>
              ，点击同意后才可以使用相关功能哦
            </Text>

            {/* 弹窗按钮组 — 不同意 + 同意 */}
            <View className="flex flex-row w-full">
              <View
                className="flex-1 flex items-center justify-center"
                style={{
                  height: '88rpx',
                  borderRadius: '44rpx',
                  border: '2rpx solid #E0E0E0',
                }}
                onClick={handleDisagree}
              >
                <Text style={{ fontSize: '30rpx', color: '#999999' }}>不同意</Text>
              </View>
              <View style={{ width: '24rpx' }} />
              <View
                className="flex-1 flex items-center justify-center"
                style={{
                  height: '88rpx',
                  borderRadius: '44rpx',
                  background: '#2876FF',
                }}
                onClick={handleAgree}
              >
                <Text style={{ fontSize: '30rpx', fontWeight: 600, color: '#FFFFFF' }}>
                  同意
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
