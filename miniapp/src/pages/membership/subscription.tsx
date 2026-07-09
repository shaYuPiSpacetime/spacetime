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
        <View style={{ width: '750rpx', padding: '6rpx 25rpx 60rpx', boxSizing: 'border-box' }}>
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
              background: '#242122',
              marginTop: '43rpx',
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
        height: '268rpx',
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
          left: '27rpx',
          top: '59rpx',
          width: '92rpx',
          height: '92rpx',
          borderRadius: '46rpx',
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
    <View style={{ position: 'absolute', left: 0, top: 0, width: '700rpx', height: '268rpx', overflow: 'hidden' }}>
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
        height: '98rpx',
        borderRadius: '8rpx',
        background: '#282828',
        marginTop: first ? '24rpx' : '10rpx',
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
        height: '1007rpx',
        borderRadius: '8rpx',
        background: '#282828',
        border: '1rpx solid #1B3C68',
        marginTop: '23rpx',
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
        isLast
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
  isLast = false,
}: {
  step: string
  text: string
  children: ReactNode
  isLast?: boolean
}) {
  return (
    <View style={{ marginBottom: isLast ? '0' : '48rpx' }}>
      <GuideStepLabel step={step} />
      <Text style={{ display: 'block', color: LANHU_GOLD, fontSize: '28rpx', lineHeight: '42rpx', marginTop: '20rpx' }}>
        {text}
      </Text>
      <View style={{ marginTop: '22rpx' }}>{children}</View>
    </View>
  )
}

function GuideStepLabel({ step }: { step: string }) {
  return (
    <View style={{ height: '34rpx', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: '8rpx', height: '8rpx', borderRadius: '4rpx', background: LANHU_GOLD, marginRight: '10rpx' }} />
      <Text style={{ color: LANHU_GOLD, fontSize: '28rpx', fontWeight: 700, lineHeight: '34rpx' }}>{step}</Text>
    </View>
  )
}

function SearchPlaceholder() {
  return (
    <View style={{ position: 'relative', width: '342rpx', height: '230rpx', background: '#FFFFFF', overflow: 'hidden' }}>
      <View style={{ height: '54rpx', padding: '0 12rpx', display: 'flex', flexDirection: 'row', alignItems: 'center', boxSizing: 'border-box' }}>
        <WechatBackIcon color="#222222" />
        <View style={{ marginLeft: '12rpx', width: '192rpx', height: '34rpx', borderRadius: '17rpx', background: '#F2F2F2', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0 14rpx', boxSizing: 'border-box' }}>
          <Text style={{ color: '#333333', fontSize: '14rpx' }}>自动续费管理</Text>
        </View>
        <View style={{ marginLeft: '16rpx' }}>
          <WechatMicIcon />
        </View>
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
            <WechatPayMiniIcon />
          </View>
          <View style={{ marginLeft: '12rpx', flex: 1 }}>
            <Text style={{ display: 'block', color: '#13B85A', fontSize: '16rpx', fontWeight: 700 }}>微信支付自动续费</Text>
            <Text style={{ display: 'block', color: '#666666', fontSize: '12rpx', lineHeight: '18rpx', marginTop: '4rpx' }}>用户授权商家，定期在账户内扣除相应费用</Text>
          </View>
        </View>
      </View>
      <View style={{ position: 'absolute', right: '8rpx', top: '158rpx', width: '66rpx', height: '43rpx', border: '2rpx solid #F54646', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
        <Text style={{ color: '#333333', fontSize: '15rpx', fontWeight: 700 }}>前往</Text>
      </View>
      <SearchGuideArrow />
    </View>
  )
}

function RenewPlaceholder() {
  return (
    <View style={{ position: 'relative', width: '342rpx', height: '390rpx', background: '#FFFFFF', padding: '26rpx 20rpx', boxSizing: 'border-box' }}>
      <View style={{ position: 'absolute', left: '15rpx', top: '13rpx' }}>
        <WechatBackIcon color="#111111" />
      </View>
      <View style={{ position: 'absolute', right: '16rpx', top: '16rpx' }}>
        <WechatMoreIcon />
      </View>
      <Text style={{ display: 'block', color: '#111111', fontSize: '28rpx', textAlign: 'center', marginTop: '52rpx', fontWeight: 700 }}>自动续费</Text>
      <Text style={{ display: 'block', color: '#333333', fontSize: '18rpx', lineHeight: '28rpx', textAlign: 'center', marginTop: '18rpx' }}>
        你已开通如下服务，商家将按约定的规则自动续费。
      </Text>
      <View style={{ position: 'absolute', left: '22rpx', top: '211rpx', width: '314rpx', height: '96rpx', border: '2rpx solid #F54646', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '12rpx', boxSizing: 'border-box' }}>
        <View style={{ width: '32rpx', height: '32rpx', borderRadius: '16rpx', background: '#2F7BF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MemberAutoRenewMiniIcon />
        </View>
        <View style={{ marginLeft: '12rpx', flex: 1 }}>
          <Text style={{ display: 'block', color: '#222222', fontSize: '18rpx', fontWeight: 700 }}>时空邂逅会员年卡自动续费</Text>
          <Text style={{ display: 'block', color: '#777777', fontSize: '15rpx', marginTop: '5rpx' }}>时空邂逅</Text>
          <Text style={{ display: 'block', color: '#9B9B9B', fontSize: '14rpx', marginTop: '4rpx' }}>2025年7月26日开通服务</Text>
        </View>
        <WechatChevronIcon />
      </View>
      <RenewGuideArrow />
    </View>
  )
}

function WechatBackIcon({ color }: { color: string }) {
  return (
    <View style={{ position: 'relative', width: '18rpx', height: '28rpx' }}>
      <View
        style={{
          position: 'absolute',
          left: '5rpx',
          top: '5rpx',
          width: '16rpx',
          height: '16rpx',
          borderLeft: `3rpx solid ${color}`,
          borderBottom: `3rpx solid ${color}`,
          transform: 'rotate(45deg)',
          boxSizing: 'border-box',
        }}
      />
    </View>
  )
}

function WechatMicIcon() {
  return (
    <View style={{ position: 'relative', width: '14rpx', height: '22rpx' }}>
      <View style={{ position: 'absolute', left: '4rpx', top: '1rpx', width: '6rpx', height: '12rpx', borderRadius: '3rpx', border: '2rpx solid #999999', boxSizing: 'border-box' }} />
      <View style={{ position: 'absolute', left: '2rpx', top: '9rpx', width: '10rpx', height: '8rpx', borderBottom: '2rpx solid #999999', borderLeft: '2rpx solid #999999', borderRight: '2rpx solid #999999', borderRadius: '0 0 6rpx 6rpx', boxSizing: 'border-box' }} />
      <View style={{ position: 'absolute', left: '6rpx', top: '16rpx', width: '2rpx', height: '5rpx', background: '#999999' }} />
      <View style={{ position: 'absolute', left: '3rpx', bottom: '0', width: '8rpx', height: '2rpx', borderRadius: '1rpx', background: '#999999' }} />
    </View>
  )
}

function WechatMoreIcon() {
  return (
    <View style={{ width: '28rpx', height: '12rpx', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      {[0, 1, 2].map((item) => (
        <View key={item} style={{ width: '5rpx', height: '5rpx', borderRadius: '3rpx', background: '#111111' }} />
      ))}
    </View>
  )
}

function WechatChevronIcon() {
  return (
    <View style={{ position: 'relative', width: '16rpx', height: '24rpx' }}>
      <View
        style={{
          position: 'absolute',
          right: '3rpx',
          top: '5rpx',
          width: '12rpx',
          height: '12rpx',
          borderTop: '3rpx solid #B4B4B4',
          borderRight: '3rpx solid #B4B4B4',
          transform: 'rotate(45deg)',
          boxSizing: 'border-box',
        }}
      />
    </View>
  )
}

function WechatPayMiniIcon() {
  return (
    <View style={{ position: 'relative', width: '28rpx', height: '24rpx' }}>
      <View
        style={{
          position: 'absolute',
          left: '2rpx',
          top: '4rpx',
          width: '22rpx',
          height: '16rpx',
          borderRadius: '4rpx',
          border: '3rpx solid #FFFFFF',
          boxSizing: 'border-box',
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: '0',
          top: '9rpx',
          width: '10rpx',
          height: '8rpx',
          borderRadius: '4rpx',
          border: '3rpx solid #FFFFFF',
          borderLeft: '0 solid transparent',
          boxSizing: 'border-box',
        }}
      />
      <View style={{ position: 'absolute', left: '7rpx', top: '9rpx', width: '6rpx', height: '6rpx', borderRadius: '3rpx', background: '#FFFFFF' }} />
    </View>
  )
}

function MemberAutoRenewMiniIcon() {
  return (
    <View style={{ position: 'relative', width: '20rpx', height: '20rpx' }}>
      <View
        style={{
          position: 'absolute',
          left: '1rpx',
          top: '3rpx',
          width: '18rpx',
          height: '14rpx',
          borderRadius: '3rpx',
          border: '2rpx solid #FFFFFF',
          boxSizing: 'border-box',
        }}
      />
      <View style={{ position: 'absolute', left: '5rpx', top: '7rpx', width: '10rpx', height: '2rpx', borderRadius: '1rpx', background: '#FFFFFF' }} />
      <View style={{ position: 'absolute', left: '5rpx', top: '12rpx', width: '7rpx', height: '2rpx', borderRadius: '1rpx', background: '#FFFFFF' }} />
    </View>
  )
}

function SearchGuideArrow() {
  return (
    <View style={{ position: 'absolute', right: '30rpx', top: '110rpx', width: '17rpx', height: '35rpx' }}>
      <View style={{ position: 'absolute', left: '7rpx', top: '0', width: '2rpx', height: '35rpx', background: '#F54646', transform: 'rotate(28deg)', transformOrigin: 'bottom center' }} />
      <View style={{ position: 'absolute', right: '0', bottom: '0', width: '12rpx', height: '2rpx', background: '#F54646', transform: 'rotate(-20deg)' }} />
      <View style={{ position: 'absolute', right: '7rpx', bottom: '0', width: '2rpx', height: '12rpx', background: '#F54646', transform: 'rotate(-20deg)' }} />
    </View>
  )
}

function RenewGuideArrow() {
  return (
    <View style={{ position: 'absolute', right: '43rpx', top: '161rpx', width: '45rpx', height: '42rpx' }}>
      <View style={{ position: 'absolute', right: '18rpx', top: '0', width: '2rpx', height: '42rpx', background: '#F54646', transform: 'rotate(42deg)', transformOrigin: 'bottom center' }} />
      <View style={{ position: 'absolute', right: '2rpx', bottom: '0', width: '16rpx', height: '2rpx', background: '#F54646', transform: 'rotate(-20deg)' }} />
      <View style={{ position: 'absolute', right: '10rpx', bottom: '0', width: '2rpx', height: '16rpx', background: '#F54646', transform: 'rotate(-20deg)' }} />
    </View>
  )
}
