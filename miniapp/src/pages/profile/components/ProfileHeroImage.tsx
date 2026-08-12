import { Image, View } from '@tarojs/components'
import type { ReactNode } from 'react'

export const PROFILE_HERO_WIDTH = '700rpx'
export const PROFILE_HERO_HEIGHT = '828rpx'
export const PROFILE_HERO_RADIUS = '32rpx'

type ProfileHeroImageProps = {
  src: string
  children?: ReactNode
  dataRole?: string
  onClick?: () => void
}

/** 编辑资料与主页预览共用同一主图几何和裁切规则。 */
export default function ProfileHeroImage({
  src,
  children,
  dataRole,
  onClick,
}: ProfileHeroImageProps) {
  return (
    <View
      data-role={dataRole}
      onClick={onClick}
      style={{
        position: 'relative',
        width: PROFILE_HERO_WIDTH,
        height: PROFILE_HERO_HEIGHT,
        borderRadius: PROFILE_HERO_RADIUS,
        background: '#D8E7E6',
        overflow: 'visible',
      }}
    >
      <View
        style={{
          position: 'absolute',
          inset: '0',
          borderRadius: PROFILE_HERO_RADIUS,
          overflow: 'hidden',
        }}
      >
        <Image
          src={src}
          mode="aspectFill"
          style={{ width: PROFILE_HERO_WIDTH, height: PROFILE_HERO_HEIGHT }}
        />
      </View>
      {children}
    </View>
  )
}
