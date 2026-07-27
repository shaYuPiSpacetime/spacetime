import NativeNavigation from '@/components/NativeNavigation'

export interface CustomNavBarProps {
  /** 标题文字，不传则无标题 */
  title?: string
  /** 背景色，默认白色 */
  bgColor?: string
  /** 是否显示返回按钮，默认 false */
  showBack?: boolean
  /** 标题文字颜色，默认黑色 */
  titleColor?: string
}

/**
 * 自定义导航栏 — 配合 navigationStyle: 'custom' 使用
 *
 * 消除默认导航栏的底部横线，背景可延伸到状态栏区域。
 * 高度 = 状态栏高度 + 导航内容区高度 (44px)，适配所有机型。
 */
export default function CustomNavBar({
  title,
  bgColor = '#FFFFFF',
  showBack = false,
  titleColor = '#000000',
}: CustomNavBarProps) {
  return <NativeNavigation title={title} background={bgColor} showBack={showBack} titleColor={titleColor} />
}
