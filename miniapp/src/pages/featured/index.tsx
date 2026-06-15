import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useFeatured } from '@/hooks/useFeatured'
import { mockCoinBalance, mockCoinPackages } from '@/services/mock'
import type { CoinPackage } from '@/types/coin'
import type { FeaturedGuest } from '@/types/featured'
import {
  LANHU_BLUE,
  LANHU_NAVY,
  LANHU_SOFT_BG,
  LanhuBottomModal,
  LanhuTabBar,
  LanhuTopTabs,
} from '@/pages/lanhu/LanhuShell'

import featuredPerson from '@/assets/lanhu/pages/featured-person.webp'

export default function FeaturedPage() {
  const {
    guests,
    authModalVisible,
    showAuthModal,
    hideAuthModal,
    coinModalVisible,
    showCoinModal,
    hideCoinModal,
    unlockModalVisible,
    showUnlockModal,
    hideUnlockModal,
    selectedGuest,
  } = useFeatured()

  const unlockCost = selectedGuest?.unlockCost ?? 0
  const balanceInsufficient = mockCoinBalance < unlockCost

  const handleCardClick = (guest: FeaturedGuest) => {
    if (guest.isLocked) {
      showUnlockModal(guest)
      return
    }
    Taro.showToast({ title: '已为你保留心动', icon: 'none' })
  }

  const handleUnlockConfirm = () => {
    if (balanceInsufficient) {
      hideUnlockModal()
      showCoinModal()
    } else {
      hideUnlockModal()
      Taro.showToast({ title: '解锁成功', icon: 'success' })
    }
  }

  const handleBuyPackage = () => {
    hideCoinModal()
    Taro.showToast({ title: '支付功能建设中', icon: 'none' })
  }

  const handleTopTabClick = (tab: '觅缘' | '心印测试' | '精选' | '理想型') => {
    if (tab === '觅缘') {
      Taro.navigateBack({
        delta: 1,
        fail: () => {
          Taro.switchTab({ url: '/pages/index/index' })
        },
      })
      return
    }
    if (tab !== '精选') {
      Taro.showToast({ title: '功能建设中', icon: 'none' })
    }
  }

  return (
    <View style={{ minHeight: '100vh', background: LANHU_SOFT_BG }}>
      <ScrollView scrollY style={{ height: '100vh' }} showScrollbar={false}>
        <LanhuTopTabs active="精选" onTabClick={handleTopTabClick} />
        <View style={{ width: '750rpx', padding: '0 25rpx 176rpx', boxSizing: 'border-box' }}>
          {guests.slice(0, 2).map((guest, index) => (
            <FeaturedCard
              key={guest.id}
              guest={guest}
              index={index}
              locked={index > 0 || guest.isLocked}
              onClick={() => handleCardClick(index > 0 ? { ...guest, isLocked: true } : guest)}
            />
          ))}

          <UnlockBanner onClick={showAuthModal} />
        </View>
      </ScrollView>
      <LanhuTabBar active="index" />

      {authModalVisible && <AuthModal onClose={hideAuthModal} />}
      {unlockModalVisible && selectedGuest && (
        <UnlockModal
          guest={selectedGuest}
          balanceInsufficient={balanceInsufficient}
          onClose={hideUnlockModal}
          onConfirm={handleUnlockConfirm}
        />
      )}
      {coinModalVisible && (
        <CoinModal onClose={hideCoinModal} onBuy={handleBuyPackage} />
      )}
    </View>
  )
}

function FeaturedCard({
  guest,
  index,
  locked,
  onClick,
}: {
  guest: FeaturedGuest
  index: number
  locked: boolean
  onClick: () => void
}) {
  return (
    <View
      style={{
        position: 'relative',
        width: '700rpx',
        height: '985rpx',
        borderRadius: '8rpx 8rpx 32rpx 32rpx',
        overflow: 'hidden',
        background: '#D8E6F0',
        marginTop: index === 0 ? '0' : '22rpx',
      }}
      onClick={onClick}
    >
      <Image src={featuredPerson} mode="aspectFill" style={{ width: '700rpx', height: '985rpx' }} />
      {locked && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.08)',
          }}
        />
      )}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '260rpx',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.18) 62%, rgba(0,0,0,0) 100%)',
        }}
      />
      <View style={{ position: 'absolute', left: '31rpx', bottom: '31rpx' }}>
        <Text style={{ color: '#FFFFFF', fontSize: '32rpx', fontWeight: 700, lineHeight: '45rpx' }}>筱脑虎</Text>
        <Text style={{ display: 'block', color: '#FFFFFF', fontSize: '26rpx', lineHeight: '37rpx', marginTop: '3rpx' }}>
          28岁 双鱼座 本科
        </Text>
      </View>
      <View
        style={{
          position: 'absolute',
          right: '29rpx',
          bottom: '27rpx',
          width: '92rpx',
          height: '92rpx',
          borderRadius: '46rpx',
          background: '#FF637E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '44rpx', lineHeight: '46rpx' }}>♥</Text>
      </View>
    </View>
  )
}

function UnlockBanner({ onClick }: { onClick: () => void }) {
  return (
    <View
      style={{
        position: 'relative',
        width: '700rpx',
        height: '164rpx',
        marginTop: '24rpx',
        borderRadius: '8rpx',
        background: 'linear-gradient(180deg, #7DA8FF 0%, #6594FA 100%)',
        overflow: 'hidden',
        padding: '30rpx 24rpx',
        boxSizing: 'border-box',
      }}
    >
      <View style={{ position: 'absolute', left: '-28rpx', top: '-26rpx', width: '86rpx', height: '86rpx', borderRadius: '43rpx', background: 'rgba(255,255,255,0.18)' }} />
      <View style={{ position: 'absolute', right: '-8rpx', bottom: '-28rpx', width: '96rpx', height: '96rpx', borderRadius: '48rpx', background: 'rgba(255,255,255,0.16)' }} />
      <Text style={{ color: '#FFFFFF', fontSize: '34rpx', fontWeight: 700, lineHeight: '48rpx' }}>
        解锁更多精选嘉宾
      </Text>
      <Text style={{ display: 'block', color: '#FFFFFF', fontSize: '28rpx', lineHeight: '40rpx', marginTop: '3rpx' }}>
        从这一刻起，遇见你的小确幸
      </Text>
      <View
        style={{
          position: 'absolute',
          right: '48rpx',
          top: '52rpx',
          width: '158rpx',
          height: '70rpx',
          borderRadius: '8rpx',
          background: LANHU_BLUE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onClick}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 700 }}>立即解锁</Text>
      </View>
    </View>
  )
}

function AuthModal({ onClose }: { onClose: () => void }) {
  return (
    <View
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.52)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <View
        style={{
          width: '620rpx',
          borderRadius: '32rpx',
          background: '#FFFFFF',
          padding: '62rpx 54rpx 48rpx',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <View
          style={{
            width: '118rpx',
            height: '118rpx',
            borderRadius: '28rpx',
            background: LANHU_BLUE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '32rpx',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '58rpx' }}>✎</Text>
        </View>
        <Text style={{ color: LANHU_NAVY, fontSize: '32rpx', fontWeight: 700, lineHeight: '48rpx', textAlign: 'center' }}>
          完善资料并完成认证{'\n'}解锁更多专属权益
        </Text>
        <View
          style={{
            width: '510rpx',
            height: '88rpx',
            borderRadius: '16rpx',
            background: LANHU_BLUE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '38rpx',
          }}
          onClick={onClose}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '30rpx', fontWeight: 700 }}>立即完善</Text>
        </View>
      </View>
    </View>
  )
}

function UnlockModal({
  guest,
  balanceInsufficient,
  onClose,
  onConfirm,
}: {
  guest: FeaturedGuest
  balanceInsufficient: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <LanhuBottomModal onClose={onClose}>
      <Text style={{ display: 'block', textAlign: 'center', color: LANHU_NAVY, fontSize: '34rpx', fontWeight: 700 }}>
        解锁嘉宾
      </Text>
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: '30rpx', padding: '24rpx', borderRadius: '20rpx', background: '#F6F9FF' }}>
        <Image src={featuredPerson} mode="aspectFill" style={{ width: '88rpx', height: '88rpx', borderRadius: '44rpx', marginRight: '22rpx' }} />
        <View>
          <Text style={{ color: '#333333', fontSize: '30rpx', fontWeight: 700 }}>{guest.nickname}</Text>
          <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', marginTop: '8rpx' }}>{guest.age}岁 · {guest.education}</Text>
        </View>
      </View>
      <Text style={{ display: 'block', color: balanceInsufficient ? '#E54D42' : '#666666', fontSize: '26rpx', textAlign: 'center', marginTop: '26rpx' }}>
        本次消耗 {guest.unlockCost} 成家币，当前余额 {mockCoinBalance}
      </Text>
      <View style={{ display: 'flex', flexDirection: 'row', gap: '18rpx', marginTop: '30rpx' }}>
        <View style={{ flex: 1, height: '88rpx', borderRadius: '44rpx', border: '1rpx solid #E1E4EA', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
          <Text style={{ color: '#666666', fontSize: '30rpx' }}>取消</Text>
        </View>
        <View style={{ flex: 1, height: '88rpx', borderRadius: '44rpx', background: LANHU_BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onConfirm}>
          <Text style={{ color: '#FFFFFF', fontSize: '30rpx', fontWeight: 700 }}>{balanceInsufficient ? '去购买' : '确认解锁'}</Text>
        </View>
      </View>
    </LanhuBottomModal>
  )
}

function CoinModal({ onClose, onBuy }: { onClose: () => void; onBuy: (pkg: CoinPackage) => void }) {
  return (
    <LanhuBottomModal onClose={onClose}>
      <Text style={{ display: 'block', textAlign: 'center', color: LANHU_NAVY, fontSize: '34rpx', fontWeight: 700 }}>
        充值成家币
      </Text>
      <ScrollView scrollX showScrollbar={false} style={{ marginTop: '28rpx', width: '690rpx' }}>
        <View style={{ display: 'flex', flexDirection: 'row' }}>
          {mockCoinPackages.map((pkg) => (
            <View
              key={pkg.id}
              style={{
                width: '170rpx',
                height: '190rpx',
                borderRadius: '20rpx',
                border: `3rpx solid ${pkg.id === 2 ? LANHU_BLUE : '#E4E8F0'}`,
                background: pkg.id === 2 ? '#EEF6FF' : '#FFFFFF',
                marginRight: '18rpx',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={() => onBuy(pkg)}
            >
              <Text style={{ color: LANHU_BLUE, fontSize: '30rpx', fontWeight: 700 }}>{pkg.amount}</Text>
              <Text style={{ color: '#666666', fontSize: '22rpx', marginTop: '7rpx' }}>{pkg.label}</Text>
              <Text style={{ color: LANHU_NAVY, fontSize: '32rpx', fontWeight: 700, marginTop: '12rpx' }}>¥{pkg.price}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={{ height: '88rpx', borderRadius: '44rpx', background: LANHU_BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '30rpx' }} onClick={() => onBuy(mockCoinPackages[1])}>
        <Text style={{ color: '#FFFFFF', fontSize: '30rpx', fontWeight: 700 }}>立即获取成家币</Text>
      </View>
    </LanhuBottomModal>
  )
}
