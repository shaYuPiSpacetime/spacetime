import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { ReactNode } from 'react'
import { getDemoPageData } from '@/services/lanhuDemo'
import { LANHU_DARK, LANHU_GOLD, LanhuNav } from '@/pages/lanhu/LanhuShell'

import defaultAvatar from '@/assets/profile/default-avatar.webp'

const profileDemo = getDemoPageData('profile')
const membershipDemo = getDemoPageData('membership')

export default function SubscriptionPage() {
  const plan = membershipDemo.plans[0]
  const subscription = membershipDemo.subscription

  return (
    <View style={{ minHeight: '100vh', background: LANHU_DARK }}>
      <LanhuNav title="订阅管理" tone="dark" showBack />
      <ScrollView scrollY style={{ height: 'calc(100vh - 176rpx)' }} showScrollbar={false}>
        <View style={{ width: '750rpx', padding: '0 25rpx 60rpx', boxSizing: 'border-box' }}>
          <SubscriptionHero expireTime={subscription.nextRenewTime} />
          <SectionTitle title="套餐与扣费说明" />
          <InfoRow label="续费金额" value={subscription.renewalAmount || `¥${plan.price.toFixed(2)}`} first />
          <InfoRow label="续费周期" value={subscription.renewalCycle} />
          <InfoRow label="会员状态" value={subscription.statusLabel} />
          <SectionTitle title="取消续费指引" />
          <CancelGuide />
          <View
            style={{
              height: '98rpx',
              borderRadius: '98rpx',
              background: '#211D1E',
              marginTop: '44rpx',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => Taro.navigateTo({ url: '/pages/membership/records' })}
          >
            <Text style={{ color: '#F8D99A', fontSize: '34rpx', fontWeight: 700 }}>查看会员订单</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

function SubscriptionHero({ expireTime }: { expireTime: string }) {
  return (
    <View
      style={{
        position: 'relative',
        width: '700rpx',
        height: '248rpx',
        borderRadius: '12rpx',
        overflow: 'hidden',
        background: '#2B2928',
      }}
    >
      <SubscriptionHeroPattern />
      <Image
        src={defaultAvatar}
        mode="aspectFill"
        style={{
          position: 'absolute',
          left: '28rpx',
          top: '60rpx',
          width: '76rpx',
          height: '76rpx',
          borderRadius: '38rpx',
          border: `2rpx solid ${LANHU_GOLD}`,
        }}
      />
      <Text style={{ position: 'absolute', left: '150rpx', top: '58rpx', color: LANHU_GOLD, fontSize: '28rpx', fontWeight: 700 }}>
        {profileDemo.nickname}
      </Text>
      <View
        style={{
          position: 'absolute',
          left: '150rpx',
          top: '102rpx',
          height: '42rpx',
          borderRadius: '21rpx',
          background: '#3E2F08',
          padding: '0 22rpx',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: LANHU_GOLD, fontSize: '24rpx' }}>连续包年</Text>
      </View>
      <Text
        style={{ position: 'absolute', right: '30rpx', top: '72rpx', color: '#FFFFFF', fontSize: '28rpx' }}
        onClick={() => Taro.navigateTo({ url: '/pages/membership/records' })}
      >
        查看记录
      </Text>
      <Text style={{ position: 'absolute', left: '28rpx', bottom: '44rpx', color: '#FFFFFF', fontSize: '30rpx' }}>
        下次续费时间： {expireTime}
      </Text>
    </View>
  )
}

function SubscriptionHeroPattern() {
  const border = '12rpx solid rgba(133,125,102,0.22)'
  return (
    <View style={{ position: 'absolute', left: 0, top: 0, width: '700rpx', height: '248rpx', overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          right: '-72rpx',
          top: '-112rpx',
          width: '238rpx',
          height: '238rpx',
          borderRadius: '20rpx',
          border,
          transform: 'rotate(45deg)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: '-70rpx',
          top: '82rpx',
          width: '218rpx',
          height: '218rpx',
          borderRadius: '20rpx',
          border,
          transform: 'rotate(45deg)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: '138rpx',
          top: '154rpx',
          width: '152rpx',
          height: '152rpx',
          borderRadius: '18rpx',
          border,
          transform: 'rotate(45deg)',
        }}
      />
    </View>
  )
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text style={{ display: 'block', color: LANHU_GOLD, fontSize: '30rpx', fontWeight: 700, lineHeight: '42rpx', marginTop: '54rpx' }}>
      {title}
    </Text>
  )
}

function InfoRow({ label, value, first = false }: { label: string; value: string; first?: boolean }) {
  return (
    <View
      style={{
        width: '700rpx',
        height: '96rpx',
        borderRadius: '8rpx',
        background: '#282828',
        marginTop: first ? '30rpx' : '12rpx',
        padding: '0 30rpx',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Text style={{ color: '#A98752', fontSize: '28rpx', fontWeight: 700 }}>{label}</Text>
      <Text style={{ color: LANHU_GOLD, fontSize: '30rpx', fontWeight: 700 }}>{value}</Text>
    </View>
  )
}

function CancelGuide() {
  return (
    <View
      style={{
        width: '700rpx',
        minHeight: '1006rpx',
        borderRadius: '8rpx',
        background: '#282828',
        border: '1rpx solid #1B3C68',
        marginTop: '30rpx',
        padding: '30rpx 26rpx',
        boxSizing: 'border-box',
      }}
    >
      <GuideStep
        step="STEP1"
        text="打开微信搜索“自动续费管理”，点击前往"
      >
        <SearchPlaceholder />
      </GuideStep>
      <GuideStep
        step="STEP2"
        text="选择时空邂逅会员连续订阅，按照微信提示取消续费"
      >
        <RenewPlaceholder />
      </GuideStep>
    </View>
  )
}

function GuideStep({
  step,
  text,
  children,
}: {
  step: string
  text: string
  children: ReactNode
}) {
  return (
    <View style={{ marginBottom: '50rpx' }}>
      <Text style={{ display: 'block', color: LANHU_GOLD, fontSize: '28rpx', fontWeight: 700 }}>• {step}</Text>
      <Text style={{ display: 'block', color: LANHU_GOLD, fontSize: '28rpx', lineHeight: '42rpx', marginTop: '20rpx' }}>
        {text}
      </Text>
      <View style={{ marginTop: '22rpx' }}>{children}</View>
    </View>
  )
}

function SearchPlaceholder() {
  return (
    <View style={{ position: 'relative', width: '344rpx', height: '216rpx', background: '#FFFFFF', overflow: 'hidden' }}>
      <View style={{ height: '54rpx', padding: '0 12rpx', display: 'flex', flexDirection: 'row', alignItems: 'center', boxSizing: 'border-box' }}>
        <Text style={{ color: '#222222', fontSize: '28rpx', lineHeight: '54rpx' }}>‹</Text>
        <View style={{ marginLeft: '12rpx', width: '192rpx', height: '34rpx', borderRadius: '17rpx', background: '#F2F2F2', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0 14rpx', boxSizing: 'border-box' }}>
          <Text style={{ color: '#333333', fontSize: '14rpx' }}>自动续费管理</Text>
        </View>
        <Text style={{ color: '#999999', fontSize: '18rpx', marginLeft: '16rpx' }}>◦</Text>
        <View style={{ width: '48rpx', height: '28rpx', borderRadius: '8rpx', background: '#13C35A', marginLeft: '10rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontSize: '14rpx', fontWeight: 700 }}>搜索</Text>
        </View>
      </View>
      <View style={{ height: '36rpx', display: 'flex', flexDirection: 'row', alignItems: 'center', paddingLeft: '22rpx', boxSizing: 'border-box' }}>
        {['AI搜索', '全部', '文章', '视频', '评论'].map((item, index) => (
          <View key={item} style={{ marginRight: '25rpx', height: '36rpx', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: index === 1 ? '3rpx solid #222222' : '0 solid transparent' }}>
            <Text style={{ color: index === 1 ? '#222222' : '#666666', fontSize: '14rpx', fontWeight: index === 1 ? 700 : 400 }}>{item}</Text>
          </View>
        ))}
      </View>
      <View style={{ margin: '10rpx 20rpx 0', height: '100rpx', borderRadius: '8rpx', background: '#FFFFFF', boxShadow: '0 4rpx 18rpx rgba(0,0,0,0.12)', padding: '12rpx 10rpx', boxSizing: 'border-box' }}>
        <Text style={{ color: '#13B85A', fontSize: '16rpx', fontWeight: 700 }}>自动续费管理 - 功能</Text>
        <View style={{ marginTop: '12rpx', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: '46rpx', height: '46rpx', borderRadius: '23rpx', background: '#16C35B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 700 }}>□</Text>
          </View>
          <View style={{ marginLeft: '12rpx', flex: 1 }}>
            <Text style={{ display: 'block', color: '#13B85A', fontSize: '16rpx', fontWeight: 700 }}>微信支付自动续费</Text>
            <Text style={{ display: 'block', color: '#666666', fontSize: '12rpx', lineHeight: '18rpx', marginTop: '4rpx' }}>用户授权商家，定期在账户内扣除相应费用</Text>
          </View>
          <View style={{ width: '50rpx', height: '34rpx', border: '2rpx solid #F54646', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#333333', fontSize: '14rpx', fontWeight: 700 }}>前往</Text>
          </View>
        </View>
      </View>
      <SearchGuideArrow />
    </View>
  )
}

function RenewPlaceholder() {
  return (
    <View style={{ position: 'relative', width: '344rpx', height: '392rpx', background: '#FFFFFF', padding: '26rpx 20rpx', boxSizing: 'border-box' }}>
      <View style={{ position: 'absolute', left: '15rpx', top: '13rpx' }}>
        <Text style={{ color: '#111111', fontSize: '28rpx' }}>‹</Text>
      </View>
      <View style={{ position: 'absolute', right: '16rpx', top: '16rpx' }}>
        <Text style={{ color: '#111111', fontSize: '22rpx' }}>•••</Text>
      </View>
      <Text style={{ display: 'block', color: '#111111', fontSize: '28rpx', textAlign: 'center', marginTop: '52rpx', fontWeight: 700 }}>自动续费</Text>
      <Text style={{ display: 'block', color: '#333333', fontSize: '18rpx', lineHeight: '28rpx', textAlign: 'center', marginTop: '18rpx' }}>
        你已开通如下服务，商家将按约定的规则自动续费。
      </Text>
      <View style={{ marginTop: '36rpx', height: '88rpx', border: '2rpx solid #F54646', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '12rpx', boxSizing: 'border-box' }}>
        <View style={{ width: '32rpx', height: '32rpx', borderRadius: '16rpx', background: '#2F7BF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontSize: '18rpx', fontWeight: 700 }}>卡</Text>
        </View>
        <View style={{ marginLeft: '12rpx', flex: 1 }}>
          <Text style={{ display: 'block', color: '#222222', fontSize: '18rpx', fontWeight: 700 }}>时空邂逅会员年卡自动续费</Text>
          <Text style={{ display: 'block', color: '#777777', fontSize: '15rpx', marginTop: '5rpx' }}>时空邂逅</Text>
          <Text style={{ display: 'block', color: '#9B9B9B', fontSize: '14rpx', marginTop: '4rpx' }}>2025年7月26日开通服务</Text>
        </View>
        <Text style={{ color: '#B4B4B4', fontSize: '30rpx' }}>›</Text>
      </View>
      <RenewGuideArrow />
    </View>
  )
}

function SearchGuideArrow() {
  return (
    <View style={{ position: 'absolute', right: '28rpx', bottom: '52rpx', width: '44rpx', height: '46rpx' }}>
      <View style={{ position: 'absolute', right: '10rpx', top: '0', width: '2rpx', height: '46rpx', background: '#F54646', transform: 'rotate(28deg)', transformOrigin: 'bottom center' }} />
      <View style={{ position: 'absolute', right: '2rpx', bottom: '0', width: '16rpx', height: '2rpx', background: '#F54646', transform: 'rotate(-20deg)' }} />
      <View style={{ position: 'absolute', right: '10rpx', bottom: '0', width: '2rpx', height: '16rpx', background: '#F54646', transform: 'rotate(-20deg)' }} />
    </View>
  )
}

function RenewGuideArrow() {
  return (
    <View style={{ position: 'absolute', right: '72rpx', top: '172rpx', width: '48rpx', height: '58rpx' }}>
      <View style={{ position: 'absolute', right: '10rpx', top: '0', width: '2rpx', height: '58rpx', background: '#F54646', transform: 'rotate(42deg)', transformOrigin: 'bottom center' }} />
      <View style={{ position: 'absolute', right: '2rpx', bottom: '0', width: '16rpx', height: '2rpx', background: '#F54646', transform: 'rotate(-20deg)' }} />
      <View style={{ position: 'absolute', right: '10rpx', bottom: '0', width: '2rpx', height: '16rpx', background: '#F54646', transform: 'rotate(-20deg)' }} />
    </View>
  )
}
