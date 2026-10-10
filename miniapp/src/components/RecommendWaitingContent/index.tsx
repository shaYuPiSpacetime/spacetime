import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import { getNativeNavigationMetrics } from '@/components/NativeNavigation'
import { getCommunityPosts, type CommunityPostVO } from '@/services/community'
import { getRecommendPreferences } from '@/services/recommend'
import { normalizeAvatarUrl } from '@/utils/avatar'
import { openCommunityAuthorProfile } from '@/domain/communityAuthorProfile'
import { useAuthStore } from '@/stores/authStore'
import { navigateToOrRedirect } from '@/utils/navigation'

const background = 'linear-gradient(90deg,rgba(233,253,251,.72),rgba(234,238,249,.68) 49%,rgba(248,250,239,.68))'

/** 推荐主页面内的等待内容，切换理想型只更新父页面状态。 */
export default function RecommendWaitingContent({ active, openIdeal, onRetry, refreshing }: {
  active: boolean
  openIdeal: () => void
  onRetry: () => void
  refreshing: boolean
}) {
  const metrics = getNativeNavigationMetrics()
  const [post, setPost] = useState<CommunityPostVO | null>(null)
  const [vipEffective, setVipEffective] = useState<boolean | null>(null)
  const [refreshError, setRefreshError] = useState('')
  useEffect(() => {
    if (!active) return
    let cancelled = false
    void getCommunityPosts('HOT', 1, 1).then(result => {
      if (!cancelled) setPost(result.records?.[0] || null)
    }).catch(() => {})
    void getRecommendPreferences().then(preference => {
      if (!cancelled) { setVipEffective(preference.vipEffective); setRefreshError('') }
    }).catch(() => { if (!cancelled) setRefreshError('会员状态获取失败，点击重试') })
    return () => { cancelled = true }
  }, [active, refreshing])

  return (
    <View style={{ background, fontFamily: 'PingFang SC, sans-serif' }}>
      <ScrollView scrollY showScrollbar={false} style={{ height: `calc(100vh - ${metrics.navigationHeight + 18}rpx)` }}>
        <View
          style={{
            width: '700rpx',
            margin: '0 auto',
            paddingTop: '10rpx',
            paddingBottom: '220rpx',
          }}
        >
          <View
            style={{
              position: 'relative',
              height: '225rpx',
              borderRadius: '12rpx',
              background: '#FFFFFF',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image
              src={miniappOssIcons.recommendDailyLimitHero}
              mode="scaleToFill"
              style={{ position: 'absolute', inset: 0, width: '700rpx', height: '225rpx' }}
            />
            <Text style={{ position: 'relative', zIndex: 1, color: '#0C285A', fontSize: '36rpx', fontWeight: 600 }}>
              每日12点准时推荐
            </Text>
            <Text
              onClick={() => void navigateToOrRedirect('/pages/prd08/recommend/replay/index')}
              style={{ position: 'relative', zIndex: 1, color: '#4B8BFF', fontSize: '28rpx', marginTop: '28rpx' }}
            >
              查看往日推荐
            </Text>
            {refreshError ? (
              <Text
                onClick={() => { if (!refreshing) onRetry() }}
                style={{ position: 'relative', zIndex: 1, color: '#4B8BFF', fontSize: '22rpx', marginTop: '14rpx' }}
              >
                {refreshing ? '正在重试…' : refreshError}
              </Text>
            ) : null}
          </View>
          <View
            onClick={openIdeal}
            style={{
              height: '88rpx',
              marginTop: '20rpx',
              padding: '0 30rpx',
              borderRadius: '10rpx',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: '#999999', fontSize: '26rpx' }}>按条件搜索 找到你的理想型</Text>
            <Image
              src={miniappOssIcons.recommendDailyLimitSearch}
              mode="aspectFit"
              style={{ width: '36rpx', height: '36rpx' }}
            />
          </View>
          <View style={{ display: 'flex', gap: '18rpx', marginTop: '20rpx' }}>
            <EntryCard
              title="悄悄话"
              subtitle="即刻开聊"
              backgroundImage={miniappOssIcons.recommendDailyLimitWhisperCard}
              textColor="#0D63B5"
              onClick={() => void Taro.navigateTo({ url: '/pages/message/whisper-list' })}
            />
            <EntryCard
              title="同城推荐"
              subtitle="附近有谁在活跃"
              backgroundImage={miniappOssIcons.recommendDailyLimitCityCard}
              textColor="#B56B13"
              onClick={() => void Taro.switchTab({ url: '/pages/index/index' })}
            />
          </View>
          {vipEffective === false ? (
          <View
            onClick={() =>
              void Taro.navigateTo({ url: '/pages/membership/index?sourcePage=recommend_waiting' })
            }
            style={{
              position: 'relative',
              height: '168rpx',
              marginTop: '20rpx',
              overflow: 'hidden',
              borderRadius: '12rpx',
              background: '#202020',
            }}
          >
            <Image
              src={miniappOssIcons.recommendDailyLimitVipBackground}
              mode="scaleToFill"
              style={{ position: 'absolute', inset: 0, width: '700rpx', height: '168rpx' }}
            />
            <Image
              src={miniappOssIcons.recommendDailyLimitVipBadge}
              mode="aspectFit"
              style={{
                position: 'absolute',
                zIndex: 2,
                left: '30rpx',
                top: '47rpx',
                width: '88rpx',
                height: '70rpx',
              }}
            />
            <View
              style={{
                position: 'relative',
                zIndex: 2,
                padding: '36rpx 150rpx 36rpx 138rpx',
              }}
            >
              <Text style={{ display: 'block', color: '#FFFFFF', fontSize: '28rpx' }}>
                开通时空邂逅会员享尊享特权
              </Text>
              <Text
                style={{
                  display: 'block',
                  color: '#FFFFFF',
                  fontSize: '26rpx',
                  marginTop: '12rpx',
                }}
              >
                免费查看心动、访客
              </Text>
            </View>
            <View
              style={{
                position: 'absolute',
                right: '28rpx',
                top: '62rpx',
                zIndex: 3,
                padding: '12rpx 24rpx',
                borderRadius: '30rpx',
                background: '#FFC965',
              }}
            >
              <Text style={{ color: '#252525', fontSize: '26rpx' }}>立即开通</Text>
            </View>
          </View>
          ) : null}
          <CommunityPreview post={post} />
        </View>
      </ScrollView>
    </View>
  )
}

function CommunityPreview({ post }: { post: CommunityPostVO | null }) {
  const currentUserId = useAuthStore(state => state.userId)
  const open = () =>
    post
      ? void Taro.navigateTo({ url: `/pages/qianxun/post-detail?id=${post.id}` })
      : void Taro.switchTab({ url: '/pages/index/index' })
  const openAuthor = (event: { stopPropagation: () => void }) => {
    event.stopPropagation()
    if (post) void openCommunityAuthorProfile(post.authorId, currentUserId, Taro.navigateTo)
  }
  return (
    <View
      onClick={open}
      style={{ marginTop: '20rpx', padding: '30rpx', borderRadius: '12rpx', background: '#FFFFFF' }}
    >
      <Text style={{ color: '#999999', fontSize: '30rpx' }}>千寻动态</Text>
      <Text onClick={(event) => { event.stopPropagation(); void Taro.switchTab({ url: '/pages/index/index' }) }} style={{ float: 'right', color: '#999999', fontSize: '26rpx' }}>查看更多 ＞</Text>
      {post ? (
        <>
          <View style={{ display: 'flex', alignItems: 'center', marginTop: '28rpx' }}>
            <Image
              onClick={openAuthor}
              src={normalizeAvatarUrl(post.authorAvatar, miniappOssIcons.qianxunTopicAvatar)}
              mode="aspectFill"
              style={{ width: '72rpx', height: '72rpx', borderRadius: '36rpx', background: '#EFF3F7', flexShrink: 0 }}
            />
            <View style={{ marginLeft: '18rpx' }}>
              <Text
                style={{ display: 'block', color: '#333333', fontSize: '28rpx', fontWeight: 600 }}
              >
                {post.authorName}
              </Text>
              <Text
                style={{ display: 'block', color: '#2876FF', fontSize: '24rpx', marginTop: '6rpx' }}
              >
                {[
                  post.authorBirthYear ? `${post.authorBirthYear}年` : '',
                  post.authorCity,
                  post.authorProfession,
                ]
                  .filter(Boolean)
                  .join('·')}
              </Text>
            </View>
          </View>
          <Text
            style={{
              display: 'block',
              color: '#333333',
              fontSize: '28rpx',
              lineHeight: '48rpx',
              marginTop: '22rpx',
            }}
          >
            {post.content}
          </Text>
          {post.imageUrls?.length ? (
            <View style={{ display: 'flex', gap: '12rpx', marginTop: '20rpx' }}>
              {post.imageUrls.slice(0, 3).map(url => (
                <Image
                  key={url}
                  src={url}
                  mode="aspectFill"
                  style={{ width: '200rpx', height: '150rpx', borderRadius: '8rpx' }}
                />
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <Text
          style={{
            display: 'block',
            color: '#7F8494',
            fontSize: '24rpx',
            lineHeight: '38rpx',
            marginTop: '30rpx',
          }}
        >
          去千寻看看真实动态，在兴趣和生活方式里遇见更契合的人。
        </Text>
      )}
    </View>
  )
}

function EntryCard({
  title,
  subtitle,
  backgroundImage,
  textColor,
  onClick,
}: {
  title: string
  subtitle: string
  backgroundImage: string
  textColor: string
  onClick: () => void
}) {
  return (
    <View
      onClick={onClick}
      style={{
        flex: 1,
        height: '198rpx',
        padding: '42rpx 30rpx',
        borderRadius: '12rpx',
        background: textColor === '#0D63B5' ? '#DDEEFF' : '#FDE8D6',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Image
        src={backgroundImage}
        mode="scaleToFill"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '198rpx' }}
      />
      <Text style={{ position: 'relative', zIndex: 1, display: 'block', color: textColor, fontSize: '30rpx', fontWeight: 600 }}>
        {title}
      </Text>
      <Text style={{ position: 'relative', zIndex: 1, display: 'block', color: textColor, fontSize: '25rpx', marginTop: '18rpx' }}>
        {subtitle}
      </Text>
    </View>
  )
}
