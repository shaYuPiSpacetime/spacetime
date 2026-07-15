import { ScrollView, View } from '@tarojs/components'
import type { ReactNode } from 'react'
import LanhuSubNav from '@/components/LanhuSubNav'
import { navigateBackOrRedirect } from '@/utils/navigation'
import '../settings.scss'

interface SettingsShellProps {
  title: string
  children: ReactNode
  scroll?: boolean
  onBack?: () => void
  className?: string
}

export default function SettingsShell({
  title,
  children,
  scroll = false,
  onBack = navigateBackOrRedirect,
  className = '',
}: SettingsShellProps) {
  const content = <View className={`settings-content ${className}`}>{children}</View>
  return (
    <View className="settings-page">
      <LanhuSubNav title={title} onBack={onBack} />
      {scroll ? <ScrollView scrollY className="settings-scroll">{content}</ScrollView> : content}
    </View>
  )
}
