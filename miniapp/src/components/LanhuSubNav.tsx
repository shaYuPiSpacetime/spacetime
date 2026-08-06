import NativeNavigation from '@/components/NativeNavigation'

interface LanhuSubNavProps {
  title: string
  onBack: () => void
  titleColor?: string
}

export default function LanhuSubNav({ title, onBack, titleColor = '#0C285A' }: LanhuSubNavProps) {
  return <NativeNavigation title={title} onBack={onBack} titleColor={titleColor} titleFontWeight={700} background="transparent" />
}
