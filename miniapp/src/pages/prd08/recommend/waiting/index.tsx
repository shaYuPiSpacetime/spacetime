import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidHide, useDidShow } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import AppTabBar, { getCapsuleLeftActionsLayout } from '@/components/AppTabBar'
import { miniappOssIcons } from '@/constants/ossIcons'
import { shouldShowRecommendWaiting } from '@/domain/recommendBrowseCycle'
import { getNativeNavigationMetrics } from '@/components/NativeNavigation'
import { getCommunityPosts, type CommunityPostVO } from '@/services/community'
import { getRecommendCandidates, getRecommendPreferences } from '@/services/recommend'
import { normalizeAvatarUrl } from '@/utils/avatar'
import { openCommunityAuthorProfile } from '@/domain/communityAuthorProfile'
import { useAuthStore } from '@/stores/authStore'

const background =
  'linear-gradient(90deg,rgba(233,253,251,.72),rgba(234,238,249,.68) 49%,rgba(248,250,239,.68))'
const RECOMMEND_TAB_STORAGE_KEY = 'prd08RecommendTab'
const RECOMMEND_REFRESH_STORAGE_KEY = 'recommendRefreshRequired'
const RECOMMEND_EXHAUSTED_CYCLE_STORAGE_KEY = 'recommendExhaustedCycle'

export default function RecommendWaitingPage() {
  const metrics = getNativeNavigationMetrics()
  const [post, setPost] = useState<CommunityPostVO | null>(null)
  const [vipEffective, setVipEffective] = useState<boolean | null>(null)
  const [, setNextResetAt] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState('')
  const refreshGeneration = useRef(0)
  useEffect(() => {
    void getCommunityPosts('HOT', 1, 1)
      .then(result => setPost(result.records?.[0] || null))
      .catch(() => setPost(null))
  }, [])
  const refreshRecommendation = async () => {
    const generation = ++refreshGeneration.current
    setRefreshing(true)
    setRefreshError('')
    setNextResetAt(null)
    setVipEffective(null)
    try {
      const [preference, candidates] = await Promise.all([
        getRecommendPreferences(),
        getRecommendCandidates(),
      ])
      if (generation !== refreshGeneration.current) return
      setVipEffective(preference.vipEffective)
      if (!shouldShowRecommendWaiting(
        candidates,
        Taro.getStorageSync(RECOMMEND_EXHAUSTED_CYCLE_STORAGE_KEY)
      )) {
        Taro.removeStorageSync(RECOMMEND_EXHAUSTED_CYCLE_STORAGE_KEY)
        Taro.setStorageSync(RECOMMEND_REFRESH_STORAGE_KEY, true)
        await Taro.switchTab({ url: '/pages/recommend/index' })
        return
      }
      if (!candidates.nextResetAt) {
        setRefreshError('更新时间获取失败，点击重试')
        return
      }
      setNextResetAt(candidates.nextResetAt)
    } catch {
      if (generation === refreshGeneration.current) {
        setRefreshError('推荐状态获取失败，点击重试')
      }
    } finally {
      if (generation === refreshGeneration.current) setRefreshing(false)
    }
  }
  useDidShow(() => {
    void refreshRecommendation()
  })
  useDidHide(() => {
    refreshGeneration.current += 1
  })
  const openIdeal = () => {
    Taro.setStorageSync(RECOMMEND_TAB_STORAGE_KEY, 'ideal')
    void Taro.switchTab({ url: '/pages/recommend/index' })
  }
  return (
    <View style={{ minHeight: '100vh', background, fontFamily: 'PingFang SC, sans-serif' }}>
      <WaitingHeader onIdeal={openIdeal} />
      <ScrollView scrollY showScrollbar={false} style={{ height: '100vh' }}>
        <View
          style={{
            width: '700rpx',
            margin: '0 auto',
            paddingTop: `${metrics.navigationHeight + 10}rpx`,
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
              onClick={() => void Taro.navigateTo({ url: '/pages/prd08/recommend/replay/index' })}
              style={{ position: 'relative', zIndex: 1, color: '#4B8BFF', fontSize: '28rpx', marginTop: '28rpx' }}
            >
              查看往日推荐
            </Text>
            {refreshError ? (
              <Text
                onClick={() => { if (!refreshing) void refreshRecommendation() }}
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
                  fontSize: '23rpx',
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
              <Text style={{ color: '#252525', fontSize: '22rpx' }}>立即开通</Text>
            </View>
          </View>
          ) : null}
          <CommunityPreview post={post} />
        </View>
      </ScrollView>
      <AppTabBar active="recommend" />
    </View>
  )
}

function WaitingHeader({ onIdeal }: { onIdeal: () => void }) {
  const metrics = getNativeNavigationMetrics()
  const top = metrics.menuTop + (metrics.menuHeight - 54) / 2
  const actionsLayout = getCapsuleLeftActionsLayout({
    menuLeft: metrics.menuLeft,
    menuTop: metrics.menuTop,
    menuHeight: metrics.menuHeight,
    actionCount: 2,
    actionSize: 70,
  })
  return (
    <View
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        zIndex: 20,
        height: `${metrics.navigationHeight + 18}rpx`,
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: '32rpx',
          top: `${top}rpx`,
          display: 'flex',
          alignItems: 'center',
          gap: '28rpx',
        }}
      >
        <View style={{ position: 'relative', height: '62rpx' }}>
          <Text
            style={{ color: '#0C285A', fontSize: '34rpx', fontWeight: 700, lineHeight: '50rpx' }}
          >
            推荐
          </Text>
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: '2rpx',
              height: '7rpx',
              borderRadius: '5rpx',
              background: '#2876FF',
            }}
          />
        </View>
        <Text onClick={onIdeal} style={{ color: '#7F8494', fontSize: '30rpx' }}>
          理想型
        </Text>
      </View>
      <View
        style={{
          position: 'absolute',
          left: `${actionsLayout.left}rpx`,
          top: `${actionsLayout.top}rpx`,
          width: `${actionsLayout.width}rpx`,
          height: `${actionsLayout.actionSize}rpx`,
          display: 'flex',
          alignItems: 'center',
          gap: `${actionsLayout.actionGap}rpx`,
        }}
      >
        <View
          onClick={() => void Taro.navigateTo({ url: '/pages/prd08/recommend/replay/index' })}
          style={{
            width: `${actionsLayout.actionSize}rpx`,
            height: `${actionsLayout.actionSize}rpx`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image
            src={miniappOssIcons.recommendReplay}
            mode="aspectFit"
            style={{ width: '36rpx', height: '36rpx' }}
          />
        </View>
        <View
          onClick={() => void Taro.navigateTo({ url: '/pages/prd08/recommend/preference/index' })}
          style={{
            width: `${actionsLayout.actionSize}rpx`,
            height: `${actionsLayout.actionSize}rpx`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image
            src={miniappOssIcons.recommendPreference}
            mode="aspectFit"
            style={{ width: '36rpx', height: '36rpx' }}
          />
        </View>
      </View>
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
