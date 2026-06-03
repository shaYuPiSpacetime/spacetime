import { View, Text } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro, { useLoad } from '@tarojs/taro'
import { useLogin } from '@/hooks/useLogin'
import { useAuthStore } from '@/stores/authStore'

/**
 * 登录-授权页 — 1:1 还原蓝湖「登录-授权」设计稿
 *
 * 设计规格（750px ÷ 2）：
 * - 背景：深空蓝渐变 #0B1A2E → #162D4A → #1B3355，散布星光装饰
 * - 品牌区：方形圆角图标 + "时空邂逅" 白色大字
 * - 中间引导文案：大号白色文字 + 副标题
 * - 底部：白色胶囊按钮 "立即使用"，蓝色文字
 * - 弹窗：白色圆角卡片，协议文案 + 同意/不同意双按钮
 */
export default function LoginAuthPage() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const { updateUserInfo, setStep } = useLogin()
  const [agreed, setAgreed] = useState(false)
  const [showDialog, setShowDialog] = useState(true)

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
    try {
      updateUserInfo({ avatar: '', nickname: '微信用户' })
      setStep('gender')
      Taro.navigateTo({ url: '/pages/login/gender' })
    } catch {
      Taro.showToast({ title: '启动失败，请重试', icon: 'none' })
    }
  }

  if (isLoggedIn) {
    return null
  }

  // 星光装饰点位（相对于 375px 宽屏幕的 CSS 像素坐标）
  const stars = [
    { top: '72px',  left: '28px',  size: '6px',  opacity: 0.9 },
    { top: '120px', left: '310px', size: '5px',  opacity: 0.7 },
    { top: '180px', left: '54px',  size: '4px',  opacity: 0.5 },
    { top: '240px', left: '290px', size: '6px',  opacity: 0.8 },
    { top: '300px', left: '40px',  size: '5px',  opacity: 0.6 },
    { top: '350px', left: '320px', size: '3px',  opacity: 0.5 },
    { top: '400px', left: '80px',  size: '5px',  opacity: 0.7 },
    { top: '160px', left: '200px', size: '3px',  opacity: 0.4 },
  ]

  return (
    <View
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(180deg, #0B1A2E 0%, #12273F 35%, #162D4A 65%, #1B3355 100%)',
        position: 'relative',
        overflow: 'hidden',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* ── 星光装饰 ── */}
      {stars.map((s, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            background: '#FFFFFF',
            opacity: s.opacity,
            boxShadow: `0 0 ${parseInt(s.size) * 2}px rgba(255,255,255,${s.opacity})`,
          }}
        />
      ))}

      {/* ── 顶部品牌区 ── */}
      <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '100px' }}>
        {/* Logo 图标 — 方形圆角底 + 星光图标 */}
        <View
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
            border: '1px solid rgba(255,255,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
          }}
        >
          {/* 四角星/菱形图标 */}
          <View style={{ position: 'relative', width: '32px', height: '32px' }}>
            <View
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '28px',
                height: '28px',
                marginLeft: '-14px',
                marginTop: '-14px',
                background: '#FFFFFF',
                transform: 'rotate(45deg)',
                borderRadius: '3px',
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '10px',
                height: '10px',
                marginLeft: '-5px',
                marginTop: '-5px',
                background: 'rgba(40,118,255,0.6)',
                transform: 'rotate(45deg)',
                borderRadius: '1.5px',
              }}
            />
          </View>
        </View>

        {/* 品牌名称 */}
        <Text
          style={{
            fontSize: '30px',
            fontWeight: '700',
            color: '#FFFFFF',
            letterSpacing: '4px',
          }}
        >
          时空邂逅
        </Text>

        {/* 品牌副标题 */}
        <Text
          style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '8px',
            marginTop: '10px',
          }}
        >
          成家立业
        </Text>
      </View>

      {/* ── 中间引导文案区 ── */}
      <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingLeft: '40px', paddingRight: '40px' }}>
        <Text
          style={{
            fontSize: '22px',
            fontWeight: '600',
            color: '#FFFFFF',
            textAlign: 'center',
            lineHeight: '32px',
            marginBottom: '12px',
          }}
        >
          你想在这个时空
        </Text>
        <Text
          style={{
            fontSize: '22px',
            fontWeight: '600',
            color: '#FFFFFF',
            textAlign: 'center',
            lineHeight: '32px',
          }}
        >
          遇见谁？
        </Text>
        <Text
          style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.45)',
            textAlign: 'center',
            marginTop: '16px',
            lineHeight: '20px',
          }}
        >
          真实身份认证，遇见靠谱的 TA
        </Text>
      </View>

      {/* ── 底部按钮区 ── */}
      <View style={{ width: '100%', paddingLeft: '32px', paddingRight: '32px', paddingBottom: '40px' }}>
        {/* 立即使用按钮 — 白色胶囊 */}
        <View
          style={{
            width: '100%',
            height: '52px',
            borderRadius: '26px',
            background: agreed ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: agreed ? '0 4px 20px rgba(0,0,0,0.2)' : 'none',
          }}
          onClick={handleUse}
        >
          <Text
            style={{
              fontSize: '17px',
              fontWeight: '600',
              color: agreed ? '#2876FF' : 'rgba(255,255,255,0.5)',
              letterSpacing: '2px',
            }}
          >
            立即使用
          </Text>
        </View>

        {/* 底部协议提示 */}
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: '16px',
          }}
        >
          <Text
            style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}
            onClick={() => setShowDialog(true)}
          >
            点击即表示同意
          </Text>
          <Text style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>《用户协议》</Text>
          <Text style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>和</Text>
          <Text style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>《隐私政策》</Text>
        </View>
      </View>

      {/* ── 温馨提示弹窗 ── */}
      {showDialog && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingLeft: '40px',
            paddingRight: '40px',
            background: 'rgba(0,0,0,0.55)',
            zIndex: 100,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: '300px',
              background: '#FFFFFF',
              borderRadius: '16px',
              paddingLeft: '28px',
              paddingRight: '28px',
              paddingTop: '32px',
              paddingBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* 弹窗标题 */}
            <Text
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1A1A1A',
                marginBottom: '16px',
              }}
            >
              温馨提示
            </Text>

            {/* 弹窗内容 */}
            <Text
              style={{
                fontSize: '14px',
                color: '#666666',
                textAlign: 'center',
                lineHeight: '22px',
                marginBottom: '24px',
              }}
            >
              为了向你提供更好的体验，请阅读并同意
              <Text style={{ color: '#2876FF' }}>《用户协议》</Text>
              、
              <Text style={{ color: '#2876FF' }}>《隐私协议》</Text>
              ，点击同意后才可以使用相关功能哦
            </Text>

            {/* 弹窗按钮 */}
            <View style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
              <View
                style={{
                  flex: 1,
                  height: '44px',
                  borderRadius: '22px',
                  border: '1px solid #E0E0E0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={handleDisagree}
              >
                <Text style={{ fontSize: '15px', color: '#999999' }}>不同意</Text>
              </View>
              <View style={{ width: '12px' }} />
              <View
                style={{
                  flex: 1,
                  height: '44px',
                  borderRadius: '22px',
                  background: '#2876FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={handleAgree}
              >
                <Text style={{ fontSize: '15px', fontWeight: '600', color: '#FFFFFF' }}>同意</Text>
              </View>
            </View>
          </View>
        </View>
      )}

    </View>
  )
}
