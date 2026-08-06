import { Image, Text, View } from '@tarojs/components'
import { miniappOssIcons } from '@/constants/ossIcons'
import { getQianxunHeaderMetrics } from '@/features/qianxun/QianxunHeader'

export interface VerificationEntryViewProps {
  role: 'index-unverified' | 'profile-unverified'
  unreadCount: number
  loading: boolean
  error: string
  hasPartialProfile: boolean
  checklist: { basic: boolean; avatarIntro: boolean; triple: boolean }
  copy: (key: string) => string
  onContinue: () => void
  onLater: () => void
  onRetry: () => void
}

/**
 * 千寻入口与“我的”未认证态共用同一份蓝湖结构，避免两个 Tab 的认证引导发生视觉漂移。
 */
export default function VerificationEntryView({
  role,
  unreadCount,
  loading,
  error,
  hasPartialProfile,
  checklist,
  copy,
  onContinue,
  onLater,
  onRetry,
}: VerificationEntryViewProps) {
  return (
    <View
      id={role}
      data-role={role}
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48%, rgba(248,250,239,0.6) 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <TopTabs unreadCount={unreadCount} />
      {error ? (
        <EntryLoadError error={error} loading={loading} onRetry={onRetry} />
      ) : loading ? (
        <EntryLoadingSkeleton />
      ) : (
        <>
          {hasPartialProfile ? (
            <PartialCertificationPanel copy={copy} checklist={checklist} />
          ) : (
            <InitialCertificationPanel copy={copy} />
          )}
          <View
            id={`${role}-continue`}
            data-role={`${role}-continue`}
            style={{ position: 'absolute', left: '44rpx', top: '1098rpx', width: '664rpx', height: '98rpx', borderRadius: '27rpx', background: '#2876FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={onContinue}
            hoverClass="btn-hover"
          >
            <Text style={{ color: '#FAFBFC', fontSize: '36rpx', fontWeight: 500, lineHeight: '50rpx' }}>
              {copy('verification_home_primary_action')}
            </Text>
          </View>
          <View
            id={`${role}-later`}
            data-role={`${role}-later`}
            style={{ position: 'absolute', left: '0', top: '1208rpx', width: '750rpx', height: '50rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={onLater}
            hoverClass="btn-hover"
          >
            <Text style={{ color: '#999999', fontSize: '30rpx', fontWeight: 500, lineHeight: '42rpx' }}>
              {copy('verification_home_later_action')}
            </Text>
          </View>
        </>
      )}
    </View>
  )
}

function EntryLoadError({ error, loading, onRetry }: { error: string; loading: boolean; onRetry: () => void }) {
  return (
    <View style={{ position: 'absolute', left: '75rpx', right: '75rpx', top: '390rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Image src={miniappOssIcons.qianxunEmptyMessage} mode="aspectFit" style={{ width: '300rpx', height: '220rpx' }} />
      <Text style={{ color: '#0C285A', fontSize: '32rpx', lineHeight: '45rpx', fontWeight: 600, marginTop: '20rpx' }}>页面暂时没加载出来</Text>
      <Text style={{ color: '#8994A5', fontSize: '24rpx', lineHeight: '36rpx', textAlign: 'center', marginTop: '14rpx' }}>{error || '请稍后重试'}</Text>
      <View
        data-role="verification-entry-retry"
        onClick={() => { if (!loading) onRetry() }}
        style={{ width: '300rpx', height: '82rpx', borderRadius: '41rpx', background: loading ? '#9DBFFB' : '#2876FF', marginTop: '42rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 600 }}>{loading ? '加载中…' : '重新加载'}</Text>
      </View>
    </View>
  )
}

function EntryLoadingSkeleton() {
  return (
    <>
      <View style={{ position: 'absolute', left: '25rpx', top: '246rpx', width: '700rpx', height: '168rpx', borderRadius: '24rpx', background: 'rgba(255,255,255,0.72)' }} />
      <View style={{ position: 'absolute', left: '25rpx', top: '434rpx', width: '700rpx', height: '168rpx', borderRadius: '24rpx', background: 'rgba(255,255,255,0.56)' }} />
      <View style={{ position: 'absolute', left: '25rpx', top: '622rpx', width: '700rpx', height: '168rpx', borderRadius: '24rpx', background: 'rgba(255,255,255,0.42)' }} />
    </>
  )
}

function InitialCertificationPanel({ copy }: { copy: (key: string) => string }) {
  return (
    <>
      <CertificationArtwork />
      <View style={{ position: 'absolute', left: '70rpx', right: '70rpx', top: '245rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Text style={headingStyle}>{copy('verification_onboarding_heading')}</Text>
        <Text style={headingStyle}>{copy('verification_home_initial_heading_line2')}</Text>
        <Text style={{ color: '#999999', fontSize: '24rpx', lineHeight: '33rpx', marginTop: '26rpx', textAlign: 'center' }}>{copy('verification_home_initial_notice')}</Text>
      </View>
    </>
  )
}

function PartialCertificationPanel({
  copy,
  checklist,
}: {
  copy: (key: string) => string
  checklist: { basic: boolean; avatarIntro: boolean; triple: boolean }
}) {
  const items = [
    { key: 'basic', icon: miniappOssIcons.verificationProfileBasic, title: copy('verification_home_basic_title'), desc: copy('verification_home_basic_desc'), completed: checklist.basic },
    { key: 'avatarIntro', icon: miniappOssIcons.verificationProfileAvatarIntro, title: copy('verification_home_avatar_intro_title'), desc: copy('verification_home_avatar_intro_desc'), completed: checklist.avatarIntro },
    { key: 'triple', icon: miniappOssIcons.verificationProfileTriple, title: copy('verification_home_triple_title'), desc: copy('verification_home_triple_desc'), completed: checklist.triple },
  ] as const

  return (
    <>
      <View style={{ position: 'absolute', left: '25rpx', top: '246rpx', width: '700rpx', textAlign: 'center' }}>
        <Text style={{ ...headingStyle, display: 'block' }}>{copy('verification_onboarding_heading')}</Text>
        <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '38rpx', marginTop: '24rpx' }}>{copy('verification_home_partial_notice')}</Text>
      </View>
      <View id="verification-entry-checklist" style={{ position: 'absolute', left: '25rpx', top: '458rpx', width: '700rpx' }}>
        {items.map((item, index) => (
          <View key={item.key} style={{ position: 'relative', width: '700rpx', height: '168rpx', borderRadius: '16rpx', background: '#FFFFFF', marginBottom: index === items.length - 1 ? '0' : '20rpx' }}>
            <Image src={item.icon} mode="aspectFit" style={{ position: 'absolute', left: '40rpx', top: '34rpx', width: '72rpx', height: '84rpx' }} />
            <Text style={{ position: 'absolute', left: '140rpx', top: '42rpx', color: '#0C285A', fontSize: '30rpx', fontWeight: 600, lineHeight: '42rpx' }}>{item.title}</Text>
            <Text style={{ position: 'absolute', left: '140rpx', top: '96rpx', color: '#999999', fontSize: '24rpx', lineHeight: '34rpx' }}>{item.desc}</Text>
            {item.completed ? <Image src={miniappOssIcons.verificationRoundCheck} mode="aspectFit" style={{ position: 'absolute', right: '38rpx', top: '60rpx', width: '48rpx', height: '48rpx' }} /> : null}
          </View>
        ))}
      </View>
    </>
  )
}

function CertificationArtwork() {
  return (
    <View id="verification-entry-artwork" style={{ position: 'absolute', left: '0', top: '453rpx', width: '750rpx', height: '390rpx' }}>
      <Image src={miniappOssIcons.qianxunCenter} mode="aspectFit" style={{ position: 'absolute', left: '90rpx', top: '-44rpx', width: '570rpx', height: '640rpx' }} />
    </View>
  )
}

function TopTabs({ unreadCount }: { unreadCount: number }) {
  const metrics = getQianxunHeaderMetrics()
  return (
    <View style={{ position: 'absolute', left: '0', top: `${metrics.primaryTop - 22}rpx`, width: '750rpx', height: '88rpx' }}>
      <Text style={{ position: 'absolute', left: '32rpx', top: '22rpx', color: '#0C285A', fontSize: '32rpx', fontWeight: 500, lineHeight: '45rpx' }}>成家</Text>
      <View style={{ position: 'absolute', left: '32rpx', top: '67rpx', width: '64rpx', height: '8rpx', borderRadius: '6rpx', background: 'rgba(40,118,255,0.8)' }} />
      {unreadCount > 0 ? (
        <View style={{ position: 'absolute', left: '76rpx', top: '11rpx', minWidth: '28rpx', height: '28rpx', borderRadius: '14rpx', border: '2rpx solid #FFFFFF', background: '#EE2525', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4rpx', boxSizing: 'border-box' }}>
          <Text style={{ color: '#FFFFFF', fontSize: '18rpx', fontWeight: 500, lineHeight: '25rpx' }}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      ) : null}
      <Text style={{ position: 'absolute', left: '123rpx', top: '31rpx', color: '#7F8494', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>知音</Text>
      <Text style={{ position: 'absolute', left: '199rpx', top: '31rpx', color: '#7F8494', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>立业</Text>
    </View>
  )
}

const headingStyle = { color: '#0C285A', fontSize: '48rpx', fontWeight: 600, lineHeight: '67rpx', textAlign: 'center' } as const
