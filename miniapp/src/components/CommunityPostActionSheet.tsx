import { Button, Image, Text, View } from '@tarojs/components'
import type { ReactNode } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import type { CommunityPostVO } from '@/services/community'
import './CommunityPostActionSheet.scss'

interface CommunityPostActionSheetProps {
  post: CommunityPostVO
  isSelf: boolean
  onClose: () => void
  onFollow?: () => void
  onHide?: () => void
  onReport?: () => void
}

export default function CommunityPostActionSheet({
  post,
  isSelf,
  onClose,
  onFollow,
  onHide,
  onReport,
}: CommunityPostActionSheetProps) {
  const moderationActions = isSelf ? [] : [
    ...(onFollow ? [{ label: post.followingAuthor ? '取消关注' : '关注', onClick: onFollow }] : []),
    ...(onHide ? [{ label: post.hiddenAuthor ? '取消不看 TA 动态' : '不看 TA 动态', onClick: onHide }] : []),
    ...(onReport ? [{ label: '举报', onClick: onReport }] : []),
  ]

  return (
    <Overlay onClose={onClose}>
      <View
        onClick={event => event.stopPropagation()}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: '32rpx 32rpx 0 0',
          background: '#FFFFFF',
          overflow: 'hidden',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <Button
          openType="share"
          className="community-post-action-sheet__share"
        >
          <Image
            src={miniappOssIcons.loginMethodWechat}
            mode="aspectFit"
            style={{ width: '52rpx', height: '52rpx', marginRight: '18rpx', flexShrink: 0 }}
          />
          <Text style={{ color: '#333333', fontSize: '28rpx', lineHeight: '40rpx' }}>微信分享</Text>
        </Button>
        {moderationActions.map(action => (
          <View
            key={action.label}
            onClick={action.onClick}
            style={{
              height: '94rpx',
              borderTop: '1rpx solid #F0F2F5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#333333', fontSize: '28rpx' }}>{action.label}</Text>
          </View>
        ))}
        <View style={{ height: '14rpx', background: '#F4F5F7' }} />
        <View
          onClick={onClose}
          style={{ height: '92rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#777F8B', fontSize: '28rpx' }}>取消</Text>
        </View>
      </View>
    </Overlay>
  )
}

function Overlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <View
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(8,20,43,0.46)', zIndex: 10000 }}
    >
      {children}
    </View>
  )
}
