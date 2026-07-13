import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useState } from 'react'
import HeartMessageHeader, { getLanhuNavigationMetrics } from '@/components/HeartMessageHeader'
import personImage from '@/assets/lanhu/heart-message/heart-person.webp'
import blurredPersonImage from '@/assets/lanhu/heart-message/heart-person-blur.webp'

type HeartTab = 'likes' | 'visitors'
type UnlockStage = 'closed' | 'confirm' | 'success'

const background =
  'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48.5%, rgba(248,250,239,0.6) 100%)'

export default function CommunityPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<HeartTab>(router.params.tab === 'visitors' ? 'visitors' : 'likes')
  const initialUnlockStage: UnlockStage = router.params.unlock === 'success'
    ? 'success'
    : router.params.unlock === 'confirm'
      ? 'confirm'
      : 'closed'
  const [unlockStage, setUnlockStage] = useState<UnlockStage>(initialUnlockStage)
  const isMember = router.params.member === '1' || router.params.member === 'true'

  return (
    <View style={{ height: '100vh', overflow: 'hidden', background, fontFamily: 'PingFang SC, sans-serif' }}>
      <ScrollView scrollY style={{ width: '750rpx', height: '100vh' }} showScrollbar={false}>
        <View style={{ minHeight: '1624rpx', paddingBottom: isMember ? '180rpx' : '310rpx', boxSizing: 'border-box' }}>
          <HeartTabsHeader active={activeTab} onChange={setActiveTab} />
          {activeTab === 'likes'
            ? <LikesPanel isMember={isMember} onLockedCard={() => setUnlockStage('confirm')} />
            : <VisitorsPanel isMember={isMember} onLockedCard={() => setUnlockStage('confirm')} />}
        </View>
      </ScrollView>

      {!isMember ? (
        <View
          onClick={() => Taro.navigateTo({ url: '/pages/membership/index' })}
          style={{
            position: 'fixed',
            left: '25rpx',
            bottom: '184rpx',
            zIndex: 80,
            width: '700rpx',
            height: '98rpx',
            borderRadius: '49rpx',
            background: '#211F20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#EAD8B6', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>
            解锁全部访客
          </Text>
        </View>
      ) : null}

      {unlockStage !== 'closed' ? (
        <UnlockSheet
          stage={unlockStage}
          onClose={() => setUnlockStage('closed')}
          onUnlock={() => setUnlockStage('success')}
        />
      ) : null}
    </View>
  )
}

function HeartTabsHeader({ active, onChange }: { active: HeartTab; onChange: (tab: HeartTab) => void }) {
  const { menuTop, menuHeight } = getLanhuNavigationMetrics()
  const top = menuTop + (menuHeight - 45) / 2

  return (
    <HeartMessageHeader rightIcon="folder">
      <View style={{ position: 'absolute', left: '24rpx', top: `${top}rpx`, height: '56rpx', display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
        <HeartTabButton label="对我心动" count={55} active={active === 'likes'} onClick={() => onChange('likes')} />
        <View style={{ width: '36rpx' }} />
        <HeartTabButton label="访客" count={45} active={active === 'visitors'} onClick={() => onChange('visitors')} />
      </View>
    </HeartMessageHeader>
  )
}

function HeartTabButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  const width = label.length > 2 ? 128 : 80
  return (
    <View onClick={onClick} style={{ position: 'relative', width: `${width}rpx`, height: '56rpx', display: 'flex', justifyContent: 'center' }}>
      {active ? (
        <View style={{ position: 'absolute', left: '0', bottom: '3rpx', width: `${width}rpx`, height: '8rpx', borderRadius: '6rpx', background: 'rgba(40,118,255,0.8)' }} />
      ) : null}
      <Text style={{ position: 'relative', zIndex: 1, color: active ? '#0C285A' : '#7F8494', fontSize: active ? '32rpx' : '28rpx', fontWeight: active ? 500 : 400, lineHeight: '45rpx', whiteSpace: 'nowrap' }}>
        {label}
      </Text>
      <View style={{ position: 'absolute', right: '-8rpx', top: '-13rpx', minWidth: '28rpx', height: '28rpx', padding: '0 5rpx', borderRadius: '14rpx', background: '#EE2525', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
        <Text style={{ color: '#FFFFFF', fontSize: '16rpx', lineHeight: '22rpx' }}>{count}</Text>
      </View>
    </View>
  )
}

function LikesPanel({ isMember, onLockedCard }: { isMember: boolean; onLockedCard: () => void }) {
  return (
    <View style={{ width: '700rpx', margin: '0 auto' }}>
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', height: '45rpx' }}>
        <Text style={{ color: '#2876FF', fontSize: '32rpx', fontWeight: 500, lineHeight: '45rpx' }}>59</Text>
        <Text style={{ color: '#0C285A', fontSize: '28rpx', fontWeight: 500, lineHeight: '45rpx' }}> 新喜欢</Text>
      </View>
      <View style={{ width: '670rpx', height: '134rpx', marginTop: '10rpx', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
        {[0, 1, 2, 3, 4].map((item) => (
          <View key={item} style={{ position: 'relative', width: '134rpx', height: '134rpx' }}>
            <Image src={isMember ? personImage : blurredPersonImage} mode="aspectFill" style={{ width: '120rpx', height: '120rpx', margin: '7rpx', borderRadius: '50%' }} />
            {item === 0 ? (
              <View style={{ position: 'absolute', left: '0', top: '0', width: '42rpx', height: '26rpx', borderRadius: '13rpx', background: '#35C36B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontSize: '16rpx', lineHeight: '22rpx' }}>新!</Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', height: '45rpx', marginTop: '16rpx' }}>
        <Text style={{ color: '#2876FF', fontSize: '32rpx', fontWeight: 500, lineHeight: '45rpx' }}>315</Text>
        <Text style={{ color: '#0C285A', fontSize: '28rpx', fontWeight: 500, lineHeight: '45rpx' }}> 人新喜欢了我</Text>
      </View>
      <HeartGrid kind="likes" isMember={isMember} onLockedCard={onLockedCard} />
    </View>
  )
}

function VisitorsPanel({ isMember, onLockedCard }: { isMember: boolean; onLockedCard: () => void }) {
  return (
    <View style={{ width: '700rpx', margin: '0 auto' }}>
      <View style={{ width: '700rpx', height: '130rpx', borderRadius: '12rpx', background: 'rgba(255,255,255,0.88)', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
        <VisitorMetric value="1171" label="总浏览量" />
        <VisitorMetric value="71" label="今日访客" />
        <VisitorMetric value="0" label="今日浏览量" />
      </View>
      <View style={{ width: '700rpx', height: '74rpx', marginTop: '20rpx', borderRadius: '8rpx', background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#7F8494', fontSize: '24rpx', lineHeight: '33rpx' }}>担心被认识的人看到？</Text>
        <Text onClick={() => Taro.navigateTo({ url: '/pages/membership/index' })} style={{ color: '#2876FF', fontSize: '24rpx', lineHeight: '33rpx' }}>开通会员</Text>
        <Text style={{ color: '#7F8494', fontSize: '24rpx', lineHeight: '33rpx' }}>只让你喜欢的人看到你</Text>
      </View>
      <View style={{ height: '40rpx', marginTop: '22rpx', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: '8rpx', height: '28rpx', marginRight: '10rpx', borderRadius: '5rpx', background: '#2876FF' }} />
        <Text style={{ color: '#333333', fontSize: '28rpx', fontWeight: 600, lineHeight: '40rpx' }}>昨日来访</Text>
      </View>
      <HeartGrid kind="visitors" isMember={isMember} onLockedCard={onLockedCard} />
    </View>
  )
}

function VisitorMetric({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ width: '150rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Text style={{ color: '#0C285A', fontSize: '48rpx', fontWeight: 500, lineHeight: '60rpx' }}>{value}</Text>
      <Text style={{ color: '#7F8494', fontSize: '26rpx', lineHeight: '37rpx', whiteSpace: 'nowrap' }}>{label}</Text>
    </View>
  )
}

function HeartGrid({ kind, isMember, onLockedCard }: { kind: 'likes' | 'visitors'; isMember: boolean; onLockedCard: () => void }) {
  return (
    <View style={{ width: '700rpx', marginTop: kind === 'likes' ? '28rpx' : '20rpx', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '18rpx 20rpx' }}>
      {Array.from({ length: 8 }).map((_, index) => (
        <HeartPersonCard key={index} index={index} kind={kind} isMember={isMember} onClick={isMember ? () => Taro.navigateTo({ url: '/pages/heart/user' }) : onLockedCard} />
      ))}
    </View>
  )
}

function HeartPersonCard({ index, kind, isMember, onClick }: { index: number; kind: 'likes' | 'visitors'; isMember: boolean; onClick: () => void }) {
  const even = index % 2 === 0
  return (
    <View onClick={onClick} style={{ position: 'relative', width: '340rpx', height: '378rpx', overflow: 'hidden', borderRadius: '8rpx', background: '#D8D8D8' }}>
      <Image src={isMember ? personImage : blurredPersonImage} mode="aspectFill" style={{ width: '340rpx', height: '378rpx' }} />
      <View style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 52%,rgba(0,0,0,0.48) 100%)' }} />
      {kind === 'likes' ? (
        <>
          <View style={{ position: 'absolute', left: '14rpx', top: '226rpx', height: '38rpx', padding: '0 14rpx', borderRadius: '19rpx', background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
            <Text style={{ color: '#FFFFFF', fontSize: '20rpx', lineHeight: '28rpx' }}>{even ? '在线' : '1小时前在线'}</Text>
          </View>
          {!even ? (
            <View style={{ position: 'absolute', left: '14rpx', top: '272rpx', height: '38rpx', padding: '0 13rpx', borderRadius: '19rpx', background: 'rgba(255,225,170,0.92)', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
              <Text style={{ color: '#242122', fontSize: '20rpx', lineHeight: '28rpx' }}>对你一见钟情，秒送喜欢</Text>
            </View>
          ) : null}
          <Text style={{ position: 'absolute', left: '14rpx', bottom: '20rpx', color: '#FFFFFF', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>
            {even ? '985·年薪30W+' : '有房有车·体制内'}
          </Text>
        </>
      ) : (
        <View style={{ position: 'absolute', left: '14rpx', bottom: '18rpx' }}>
          <Text style={{ display: 'block', color: '#FFFFFF', fontSize: '20rpx', lineHeight: '28rpx' }}>{even ? '10分钟前在线' : '2小时前在线'}</Text>
          <Text style={{ display: 'block', marginTop: '2rpx', color: '#FFFFFF', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>{even ? '28岁' : '公务员'}</Text>
        </View>
      )}
    </View>
  )
}

function UnlockSheet({ stage, onClose, onUnlock }: { stage: Exclude<UnlockStage, 'closed'>; onClose: () => void; onUnlock: () => void }) {
  const success = stage === 'success'
  return (
    <View onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 20000, background: 'rgba(0,0,0,0.42)' }}>
      <View onClick={(event) => event.stopPropagation()} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: '454rpx', overflow: 'hidden', borderRadius: '32rpx 32rpx 0 0', background: '#FFFFFF' }}>
        <View style={{ position: 'relative', height: '170rpx', padding: '44rpx 28rpx 0', background: success ? 'linear-gradient(105deg,#FFF3F3,#FFE9F1)' : 'linear-gradient(105deg,#E7F5FF,#EDF4FF)', boxSizing: 'border-box' }}>
          <Text style={{ display: 'block', color: '#333333', fontSize: '32rpx', fontWeight: 600, lineHeight: '45rpx' }}>{success ? '解锁成功' : '解锁Ta是谁'}</Text>
          <Text style={{ display: 'block', marginTop: '8rpx', color: '#7F8494', fontSize: '24rpx', lineHeight: '33rpx' }}>送出喜欢，即刻开聊</Text>
          <View style={{ position: 'absolute', right: '-18rpx', top: '34rpx', width: '170rpx', height: '120rpx', borderRadius: '80rpx', background: success ? 'rgba(255,143,165,0.18)' : 'rgba(96,165,250,0.12)' }}>
            <Text style={{ position: 'absolute', left: '48rpx', top: '24rpx', color: success ? '#FF8CA6' : '#7EB4F4', fontSize: '62rpx', lineHeight: '70rpx' }}>{success ? '♥' : '▣'}</Text>
          </View>
        </View>
        <View
          style={{
            height: '128rpx',
            margin: '10rpx 28rpx 0',
            padding: '0 20rpx',
            border: success ? '1rpx solid #F4F4F4' : '0',
            borderRadius: '12rpx',
            background: success ? '#FFFFFF' : '#E3F1FE',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            boxSizing: 'border-box',
          }}
        >
          <Image src={success ? personImage : blurredPersonImage} mode="aspectFill" style={{ width: '92rpx', height: '92rpx', borderRadius: '50%' }} />
          <View style={{ flex: 1, minWidth: 0, marginLeft: '20rpx' }}>
            <Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>{success ? '一只筱脑虎' : '同城·金牛座'}</Text>
            <Text style={{ display: 'block', marginTop: '8rpx', color: '#999999', fontSize: '20rpx', lineHeight: '28rpx', whiteSpace: 'nowrap' }}>{success ? '现居浙江杭州·河南人' : '一看到你，立刻点了喜欢'}</Text>
          </View>
        </View>
        {success ? (
          <View onClick={() => Taro.navigateTo({ url: '/pages/heart/user' })} style={{ height: '98rpx', margin: '18rpx 28rpx 28rpx', borderRadius: '49rpx', background: '#FFF0F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#F06C83', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>查看主页</Text>
          </View>
        ) : (
          <View style={{ margin: '18rpx 28rpx 28rpx', display: 'flex', flexDirection: 'row', gap: '20rpx' }}>
            <View onClick={onUnlock} style={{ flex: 1, height: '98rpx', borderRadius: '49rpx', background: '#E3F1FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#2876FF', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>只看ta(100</Text>
              <View style={{ width: '30rpx', height: '30rpx', margin: '0 5rpx', borderRadius: '50%', background: '#F4B331', border: '3rpx solid #FFE08A', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontSize: '16rpx', lineHeight: '20rpx' }}>Q</Text>
              </View>
              <Text style={{ color: '#2876FF', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>)</Text>
            </View>
            <View onClick={() => Taro.navigateTo({ url: '/pages/membership/index' })} style={{ flex: 1, height: '98rpx', borderRadius: '49rpx', background: '#211F20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#EAD8B6', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>解锁全部</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}
