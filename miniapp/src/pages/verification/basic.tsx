import Taro from '@tarojs/taro'
import { useLogin } from '@/hooks/useLogin'
import VerificationShell from './components/VerificationShell'
import BasicInfoCard from './components/BasicInfoCard'

export default function VerificationBasicPage() {
  const { userInfo, submit } = useLogin()

  const handleBack = () => {
    Taro.showModal({
      title: '暂不认证',
      content: '可以稍后再完善认证资料，是否先进入首页？',
      confirmText: '进入首页',
      cancelText: '继续认证',
      success: (res) => {
        if (res.confirm) submit()
      },
    })
  }

  return (
    <VerificationShell
      stage="basic"
      primaryText="继续认证"
      onPrimary={() => Taro.navigateTo({ url: '/pages/verification/avatar' })}
      onBack={handleBack}
      scroll
    >
      <BasicInfoCard userInfo={userInfo} />
    </VerificationShell>
  )
}
