import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { CommunityPostVO } from '@/services/community'

export default function ProfileCommunityPostsSection({
  posts,
}: {
  posts: CommunityPostVO[]
}) {
  if (!posts.length) return null

  return (
    <View
      data-role="profile-community-posts"
      style={{
        width: '700rpx',
        marginTop: '20rpx',
        padding: '32rpx 34rpx 38rpx',
        borderRadius: '32rpx',
        background: '#FFFFFF',
        boxSizing: 'border-box',
      }}
    >
      <Text
        style={{
          display: 'block',
          color: '#333333',
          fontSize: '28rpx',
          fontWeight: 600,
        }}
      >
        个人动态
      </Text>
      {posts.map(post => (
        <View
          key={post.postNo || post.id}
          onClick={() =>
            void Taro.navigateTo({
              url: `/pages/qianxun/post-detail?id=${encodeURIComponent(String(post.id))}`,
            })
          }
          style={{ padding: '24rpx 0 20rpx', borderBottom: '1rpx solid #EEF1F5' }}
        >
          {post.content ? (
            <Text
              style={{
                display: 'block',
                color: '#596273',
                fontSize: '24rpx',
                lineHeight: '38rpx',
              }}
            >
              {post.content}
            </Text>
          ) : null}
          {post.imageUrls?.length ? (
            <View
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8rpx',
                marginTop: post.content ? '16rpx' : '0',
              }}
            >
              {post.imageUrls.slice(0, 3).map((url, index) => (
                <Image
                  key={`${post.id}-${index}`}
                  src={url}
                  mode="aspectFill"
                  style={{ width: '202rpx', height: '202rpx', borderRadius: '8rpx' }}
                />
              ))}
            </View>
          ) : null}
          <Text
            style={{
              display: 'block',
              marginTop: '12rpx',
              color: '#A0A6B2',
              fontSize: '20rpx',
            }}
          >
            {formatRelativeTime(post.createTime)}
          </Text>
        </View>
      ))}
    </View>
  )
}

function formatRelativeTime(value: string) {
  if (!value) return ''
  const time = new Date(value.replace(' ', 'T')).getTime()
  if (!Number.isFinite(time)) return value
  const minutes = Math.max(1, Math.floor((Date.now() - time) / 60000))
  if (minutes < 60) return `${minutes}分钟前`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`
  return `${Math.floor(minutes / 1440)}天前`
}
