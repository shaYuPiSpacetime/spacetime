import { Image, Text, View } from '@tarojs/components'
import { miniappOssIcons } from '@/constants/ossIcons'

interface GenderIconProps {
  gender?: string
  size?: string
}

interface ActionStatProps {
  kind: 'comment' | 'like'
  count: number
  active?: boolean
  onClick?: () => void
  color?: string
  fontSize?: string
}

export function QianxunGenderIcon({ gender, size = '32rpx' }: GenderIconProps) {
  const normalized = String(gender || '').trim().toLowerCase()
  const source = normalized === 'female' || normalized === 'f' || normalized === '女' || normalized === '2'
    ? miniappOssIcons.qianxunGenderFemale
    : normalized === 'male' || normalized === 'm' || normalized === '男' || normalized === '1'
      ? miniappOssIcons.qianxunGenderMale
      : undefined

  if (!source) return null
  return <Image className="qianxun-gender-icon" src={source} mode="aspectFit" style={{ width: size, height: size, flexShrink: 0 }} />
}

export function QianxunActionStat({ kind, count, active = false, onClick, color = '#999999', fontSize = '22rpx' }: ActionStatProps) {
  const source = kind === 'comment'
    ? miniappOssIcons.qianxunComment
    : active ? miniappOssIcons.qianxunLikeActive : miniappOssIcons.qianxunLike
  const content = (
    <>
      <Image className={`qianxun-${kind}-icon`} src={source} mode="aspectFit" style={{ width: '32rpx', height: '32rpx', flexShrink: 0 }} />
      <Text style={{ color: kind === 'like' && active ? '#FF7078' : color, fontSize, lineHeight: '32rpx', marginLeft: '9rpx' }}>{Math.max(0, Number(count) || 0)}</Text>
    </>
  )

  if (!onClick) {
    return <View style={{ height: '32rpx', display: 'flex', alignItems: 'center' }}>{content}</View>
  }
  return (
    <View
      role="button"
      onClick={event => {
        event.stopPropagation()
        onClick()
      }}
      style={{ minWidth: '88rpx', height: '88rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {content}
    </View>
  )
}
