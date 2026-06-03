import { View, Text } from '@tarojs/components'
import { useState } from 'react'
import Taro, { useLoad } from '@tarojs/taro'
import { useLogin } from '@/hooks/useLogin'

/**
 * 登录-授权页 — 1:1 还原蓝湖「登录-授权」设计稿
 * 夜空背景 + 品牌 Logo + 温馨提示协议弹窗 + 立即使用按钮
 */
export default function LoginAuthPage() {
  const { updateUserInfo, setStep } = useLogin()
  const [agreed, setAgreed] = useState(false)
  const [showDialog, setShowDialog] = useState(true)

  useLoad(() => {
    setShowDialog(true)
  })

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

  return (
    <View
      className="min-h-screen flex flex-col items-center justify-between"
      style={{ background: 'linear-gradient(180deg,#0A1628 0%,#122B4A 40%,#1C3F5E 70%,#2C5F7A 100%)' }}
    >
      {/* ── 顶部品牌区 ── */}
      <View className="flex-1 flex flex-col items-center justify-center w-full pt-[60px]">
        {/* Logo 图标区域 */}
        <View className="flex flex-row items-center mb-[16px]">
          {/* Logo 图标 (设计稿中为带星星的方形图标) */}
          <View
            className="w-[56px] h-[56px] rounded-[12px] flex items-center justify-center mr-[12px]"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <Text className="text-2xl text-white">✦</Text>
          </View>
          {/* 品牌名称 */}
          <Text
            className="text-[28px] font-bold text-white"
            style={{ letterSpacing: '2px' }}
          >
            时空邂逅
          </Text>
        </View>
      </View>

      {/* ── 温馨提示弹窗 ── */}
      {showDialog && (
        <View
          className="absolute inset-0 flex items-center justify-center px-[28px]"
          style={{ background: 'rgba(0,0,0,0.4)' }}
        >
          <View
            className="w-full rounded-[16px] px-[24px] py-[28px] bg-white"
            style={{ maxWidth: '320px' }}
          >
            <Text className="text-lg font-semibold text-[#333] text-center block mb-[12px]">
              温馨提示
            </Text>
            <Text className="text-base text-[#666] leading-relaxed text-center block">
              {'为了向你提供更好的体验，请阅读并同意'}
              <Text className="text-[#2876FF]">《用户协议》</Text>
              {'、'}
              <Text className="text-[#2876FF]">《隐私协议》</Text>
              {'，点击同意后才可以使用相关功能哦'}
            </Text>
            <View className="flex flex-row mt-[20px] gap-[12px]">
              <View
                className="flex-1 py-[12px] rounded-[8px] border border-[#E0E0E0] flex items-center justify-center"
                onClick={handleDisagree}
              >
                <Text className="text-base text-[#666]">不同意</Text>
              </View>
              <View
                className="flex-1 py-[12px] rounded-[8px] flex items-center justify-center bg-[#2876FF]"
                onClick={handleAgree}
              >
                <Text className="text-base font-semibold text-white">同意</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ── 底部「立即使用」按钮 ── */}
      <View className="w-full px-[16px] pb-[40px]">
        <View
          className="rounded-[32px] py-[16px] flex items-center justify-center"
          style={{ background: agreed ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.3)' }}
          onClick={handleUse}
        >
          <Text className="text-lg font-semibold" style={{ color: agreed ? '#2876FF' : '#999' }}>
            立即使用
          </Text>
        </View>
      </View>
    </View>
  )
}
