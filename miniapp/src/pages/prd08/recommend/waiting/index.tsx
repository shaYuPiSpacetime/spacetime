import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import AppTabBar from '@/components/AppTabBar'
import { miniappOssIcons } from '@/constants/ossIcons'
import { getNativeNavigationMetrics } from '@/components/NativeNavigation'
import { getCommunityPosts, type CommunityPostVO } from '@/services/community'

const background =
  'linear-gradient(90deg,rgba(233,253,251,.72),rgba(234,238,249,.68) 49%,rgba(248,250,239,.68))'
const RECOMMEND_TAB_STORAGE_KEY = 'prd08RecommendTab'

export default function RecommendWaitingPage() {
  const metrics = getNativeNavigationMetrics()
  const [post, setPost] = useState<CommunityPostVO | null>(null)
  useEffect(() => {
    void getCommunityPosts('HOT', 1, 1)
      .then(result => setPost(result.records?.[0] || null))
      .catch(() => setPost(null))
  }, [])
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
              height: '226rpx',
              borderRadius: '12rpx',
              background: '#FFFFFF',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#0C285A', fontSize: '36rpx', fontWeight: 600 }}>
              每日12点准时推荐
            </Text>
            <Text
              onClick={() => void Taro.navigateTo({ url: '/pages/prd08/recommend/replay/index' })}
              style={{ color: '#4B8BFF', fontSize: '28rpx', marginTop: '22rpx' }}
            >
              查看往日推荐
            </Text>
            <View
              style={{
                alignSelf: 'stretch',
                height: '48rpx',
                marginTop: '26rpx',
                background: 'linear-gradient(165deg,#F4F8FE 45%,#EEF5FD 46%)',
              }}
            />
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
            <SearchIcon />
          </View>
          <View style={{ display: 'flex', gap: '18rpx', marginTop: '20rpx' }}>
            <EntryCard
              title="悄悄话"
              subtitle="即刻开聊"
              color="#DDEEFF"
              textColor="#0D63B5"
              icon="whisper"
              onClick={() => void Taro.navigateTo({ url: '/pages/message/whisper-list' })}
            />
            <EntryCard
              title="同城推荐"
              subtitle="附近有谁在活跃"
              color="#FDE8D6"
              textColor="#B56B13"
              icon="city"
              onClick={() => void Taro.switchTab({ url: '/pages/index/index' })}
            />
          </View>
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
              src={miniappOssIcons.recommendVipBanner}
              mode="aspectFill"
              style={{ position: 'absolute', inset: 0, width: '700rpx', height: '168rpx' }}
            />
            <Image
              src={miniappOssIcons.recommendVipBadge}
              mode="aspectFit"
              style={{
                position: 'absolute',
                zIndex: 2,
                left: '30rpx',
                top: '47rpx',
                width: '88rpx',
                height: '74rpx',
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
        onClick={() => void Taro.navigateTo({ url: '/pages/prd08/recommend/replay/index' })}
        style={{
          position: 'absolute',
          left: '470rpx',
          top: `${top - 4}rpx`,
          width: '70rpx',
          height: '70rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          src={miniappOssIcons.recommendReplay}
          mode="aspectFit"
          style={{ width: '48rpx', height: '48rpx' }}
        />
      </View>
      <View
        onClick={() => void Taro.navigateTo({ url: '/pages/prd08/recommend/preference/index' })}
        style={{
          position: 'absolute',
          left: '535rpx',
          top: `${top - 4}rpx`,
          width: '70rpx',
          height: '70rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          src={miniappOssIcons.recommendPreference}
          mode="aspectFit"
          style={{ width: '48rpx', height: '48rpx' }}
        />
      </View>
    </View>
  )
}

function CommunityPreview({ post }: { post: CommunityPostVO | null }) {
  const open = () =>
    post
      ? void Taro.navigateTo({ url: `/pages/qianxun/post-detail?postId=${post.id}` })
      : void Taro.switchTab({ url: '/pages/index/index' })
  return (
    <View
      onClick={open}
      style={{ marginTop: '20rpx', padding: '30rpx', borderRadius: '12rpx', background: '#FFFFFF' }}
    >
      <Text style={{ color: '#999999', fontSize: '28rpx' }}>千寻动态</Text>
      <Text style={{ float: 'right', color: '#999999', fontSize: '24rpx' }}>查看更多 ＞</Text>
      {post ? (
        <>
          <View style={{ display: 'flex', alignItems: 'center', marginTop: '28rpx' }}>
            {post.authorAvatar ? (
              <Image
                src={post.authorAvatar}
                mode="aspectFill"
                style={{ width: '72rpx', height: '72rpx', borderRadius: '36rpx' }}
              />
            ) : null}
            <View style={{ marginLeft: '18rpx' }}>
              <Text
                style={{ display: 'block', color: '#333333', fontSize: '27rpx', fontWeight: 600 }}
              >
                {post.authorName}
              </Text>
              <Text
                style={{ display: 'block', color: '#2876FF', fontSize: '22rpx', marginTop: '6rpx' }}
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
              fontSize: '24rpx',
              lineHeight: '40rpx',
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

function SearchIcon() {
  return (
    <View style={{ position: 'relative', width: '44rpx', height: '44rpx' }}>
      <View
        style={{
          width: '27rpx',
          height: '27rpx',
          border: '4rpx solid #9AA0AA',
          borderRadius: '50%',
          boxSizing: 'border-box',
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: '4rpx',
          bottom: '7rpx',
          width: '18rpx',
          height: '4rpx',
          borderRadius: '2rpx',
          background: '#9AA0AA',
          transform: 'rotate(45deg)',
          transformOrigin: 'right center',
        }}
      />
    </View>
  )
}

function EntryCard({
  title,
  subtitle,
  color,
  textColor,
  icon,
  onClick,
}: {
  title: string
  subtitle: string
  color: string
  textColor: string
  icon: 'whisper' | 'city'
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
        background: color,
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Text style={{ display: 'block', color: textColor, fontSize: '30rpx', fontWeight: 600 }}>
        {title}
      </Text>
      <Text style={{ display: 'block', color: textColor, fontSize: '25rpx', marginTop: '18rpx' }}>
        {subtitle}
      </Text>
      <View
        style={{
          position: 'absolute',
          right: '-22rpx',
          bottom: '-40rpx',
          width: '166rpx',
          height: '166rpx',
          borderRadius: '83rpx',
          background: icon === 'whisper' ? 'rgba(88,145,255,.14)' : 'rgba(255,171,81,.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: '112rpx',
            height: '112rpx',
            borderRadius: '56rpx',
            background: icon === 'whisper' ? 'rgba(70,133,255,.30)' : 'rgba(255,155,53,.32)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon === 'whisper' ? (
            <Image
              src={miniappOssIcons.recommendWhisper}
              mode="aspectFit"
              style={{ width: '78rpx', height: '78rpx' }}
            />
          ) : (
            <SameCityIcon />
          )}
        </View>
      </View>
    </View>
  )
}

function SameCityIcon() {
  return (
    <View style={{ position: 'relative', width: '68rpx', height: '58rpx' }}>
      <View
        style={{
          position: 'absolute',
          left: '5rpx',
          top: '7rpx',
          width: '38rpx',
          height: '48rpx',
          border: '4rpx solid #FFFFFF',
          borderRadius: '6rpx',
          transform: 'rotate(-26deg)',
          boxSizing: 'border-box',
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: '4rpx',
          top: '4rpx',
          width: '38rpx',
          height: '48rpx',
          border: '4rpx solid #FFFFFF',
          borderRadius: '6rpx',
          transform: 'rotate(-5deg)',
          boxSizing: 'border-box',
        }}
      />
    </View>
  )
}
