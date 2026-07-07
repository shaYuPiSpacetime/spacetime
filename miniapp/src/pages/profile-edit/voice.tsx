import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { getDemoPageData } from '@/services/lanhuDemo'

type VoiceVariant = 'voice' | 'recording' | 'exit' | 'play' | 'complete' | 'delete' | 'delete-success'

type VoiceState = {
  title: string
  desc: string
  buttonText: string
  timer?: string
  duration?: string
}

type ProfileDemo = {
  editProfile: {
    voiceIntro: {
      title: string
      subtitle: string
      deleteTitle: string
      deleteContent: string
      deleteConfirmText: string
      deleteCancelText: string
      successText: string
      states: Record<VoiceVariant, VoiceState>
    }
  }
}

const profileDemo = getDemoPageData('profile') as ProfileDemo
const mainBlue = '#2876FF'
const titleColor = '#0C285A'
const pageBackground =
  'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48%, rgba(248,250,239,0.6) 100%)'

function resolveVoiceVariant(value?: string): VoiceVariant {
  if (
    value === 'voice' ||
    value === 'recording' ||
    value === 'exit' ||
    value === 'play' ||
    value === 'complete' ||
    value === 'delete' ||
    value === 'delete-success'
  ) {
    return value
  }
  return 'voice'
}

export default function ProfileEditVoicePage() {
  const router = useRouter()
  const variant = resolveVoiceVariant(String(router.params.variant || 'voice'))
  const voiceIntro = profileDemo.editProfile.voiceIntro
  const state = voiceIntro.states[variant] || voiceIntro.states.voice
  const showWave = variant === 'recording' || variant === 'play' || variant === 'complete'
  const isRecording = variant === 'recording'

  const handleBack = () => {
    Taro.navigateBack({ fail: () => Taro.redirectTo({ url: '/pages/profile/edit' }) })
  }

  const handlePrimary = () => {
    if (variant === 'voice') {
      Taro.redirectTo({ url: '/pages/profile-edit/voice?variant=recording' })
      return
    }
    if (variant === 'recording') {
      Taro.redirectTo({ url: '/pages/profile-edit/voice?variant=complete' })
      return
    }
    if (variant === 'play') {
      Taro.redirectTo({ url: '/pages/profile-edit/voice?variant=complete' })
      return
    }
    if (variant === 'delete') {
      Taro.redirectTo({ url: '/pages/profile-edit/voice?variant=delete-success' })
      return
    }
    handleBack()
  }

  return (
    <View style={{ minHeight: '100vh', background: pageBackground }}>
      <ProfileEditSubNav title={voiceIntro.title || '语音介绍'} onBack={handleBack} />
      <ScrollView scrollY style={{ height: 'calc(100vh - 164rpx)', width: '750rpx' }} showScrollbar={false}>
        <View style={{ position: 'relative', width: '750rpx', minHeight: '674rpx', padding: '24rpx 25rpx 160rpx', boxSizing: 'border-box' }}>
          {variant === 'delete-success' ? (
            <View
              style={{
                width: '700rpx',
                height: '86rpx',
                borderRadius: '8rpx',
                background: '#E9F4FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24rpx',
              }}
            >
              <Text style={{ color: mainBlue, fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 700 }}>{voiceIntro.successText}</Text>
            </View>
          ) : null}

          <View
            style={{
              width: '700rpx',
              minHeight: '702rpx',
              borderRadius: '64rpx',
              background: '#FFFFFF',
              padding: '46rpx 34rpx',
              boxSizing: 'border-box',
            }}
          >
            <Text style={{ display: 'block', color: titleColor, fontSize: '36rpx', lineHeight: '50rpx', fontWeight: 800, textAlign: 'center' }}>
              {voiceIntro.title}
            </Text>
            <Text style={{ display: 'block', color: '#697E9C', fontSize: '26rpx', lineHeight: '40rpx', textAlign: 'center', marginTop: '12rpx' }}>
              {voiceIntro.subtitle}
            </Text>

            <View
              style={{
                height: '230rpx',
                borderRadius: '24rpx',
                background: '#F7FAFF',
                marginTop: '42rpx',
                padding: '32rpx 28rpx',
                boxSizing: 'border-box',
              }}
            >
              <Text style={{ display: 'block', color: titleColor, fontSize: '30rpx', lineHeight: '42rpx', fontWeight: 800 }}>{state.title}</Text>
              <Text style={{ display: 'block', color: '#697E9C', fontSize: '24rpx', lineHeight: '36rpx', marginTop: '10rpx' }}>{state.desc}</Text>
              {showWave ? (
                <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', height: '74rpx', marginTop: '22rpx' }}>
                  {[24, 48, 34, 62, 40, 68, 32, 52, 28, 58, 38, 46].map((height, index) => (
                    <View
                      key={`${height}-${index}`}
                      style={{
                        width: '10rpx',
                        height: `${height}rpx`,
                        borderRadius: '6rpx',
                        background: isRecording ? '#FF5A47' : mainBlue,
                        marginRight: '14rpx',
                      }}
                    />
                  ))}
                  <Text style={{ color: '#8792A6', fontSize: '24rpx', lineHeight: '34rpx', marginLeft: '8rpx' }}>
                    {state.timer || state.duration}
                  </Text>
                </View>
              ) : null}
            </View>

            <View
              onClick={handlePrimary}
              style={{
                height: '98rpx',
                borderRadius: '98rpx',
                background: isRecording ? '#FF5A47' : mainBlue,
                marginTop: '46rpx',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isRecording ? '0 12rpx 28rpx rgba(255,90,71,0.22)' : '0 12rpx 28rpx rgba(40,118,255,0.22)',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: '32rpx', lineHeight: '45rpx', fontWeight: 800 }}>{state.buttonText}</Text>
            </View>

            <View
              onClick={() => Taro.redirectTo({ url: '/pages/profile-edit/intro' })}
              style={{
                height: '78rpx',
                borderRadius: '98rpx',
                marginTop: '18rpx',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#8792A6', fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 700 }}>改用文字介绍</Text>
            </View>

            {variant === 'complete' || variant === 'play' || variant === 'delete-success' ? (
              <View
                onClick={() => Taro.redirectTo({ url: '/pages/profile-edit/voice?variant=delete' })}
                style={{
                  height: '58rpx',
                  borderRadius: '58rpx',
                  marginTop: '4rpx',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FF5A47', fontSize: '26rpx', lineHeight: '37rpx', fontWeight: 700 }}>删除语音介绍</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {variant === 'exit' ? (
        <VoiceBottomSheet
          title="退出录音"
          content="退出后本次录音不会保存"
          primary="退出录音"
          secondary="继续录制"
          onPrimary={handleBack}
          onSecondary={() => Taro.redirectTo({ url: '/pages/profile-edit/voice?variant=recording' })}
        />
      ) : null}
      {variant === 'delete' ? (
        <VoiceBottomSheet
          title={voiceIntro.deleteTitle}
          content={voiceIntro.deleteContent}
          primary={voiceIntro.deleteConfirmText}
          secondary={voiceIntro.deleteCancelText}
          onPrimary={handlePrimary}
          onSecondary={handleBack}
          danger
        />
      ) : null}
    </View>
  )
}

function VoiceBottomSheet({
  title,
  content,
  primary,
  secondary,
  onPrimary,
  onSecondary,
  danger,
}: {
  title: string
  content: string
  primary: string
  secondary: string
  onPrimary: () => void
  onSecondary: () => void
  danger?: boolean
}) {
  return (
    <View style={{ position: 'fixed', left: '0', right: '0', top: '0', bottom: '0', zIndex: 60, background: 'rgba(4, 16, 42, 0.42)' }}>
      <View
        style={{
          position: 'absolute',
          left: '0',
          right: '0',
          bottom: '0',
          borderRadius: '64rpx 64rpx 0 0',
          background: '#FFFFFF',
          padding: '48rpx 46rpx calc(58rpx + env(safe-area-inset-bottom))',
          boxSizing: 'border-box',
        }}
      >
        <Text style={{ display: 'block', color: titleColor, fontSize: '36rpx', lineHeight: '50rpx', fontWeight: 800, textAlign: 'center' }}>{title}</Text>
        <Text style={{ display: 'block', color: '#697E9C', fontSize: '26rpx', lineHeight: '40rpx', textAlign: 'center', marginTop: '18rpx' }}>{content}</Text>
        <View onClick={onPrimary} style={{ height: '98rpx', borderRadius: '98rpx', background: danger ? '#FF5A47' : mainBlue, marginTop: '36rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontSize: '32rpx', lineHeight: '45rpx', fontWeight: 800 }}>{primary}</Text>
        </View>
        <View onClick={onSecondary} style={{ height: '86rpx', borderRadius: '98rpx', marginTop: '12rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#8792A6', fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 700 }}>{secondary}</Text>
        </View>
      </View>
    </View>
  )
}

function ProfileEditSubNav({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={{ position: 'relative', width: '750rpx', height: '164rpx' }}>
      <View onClick={onBack} style={{ position: 'absolute', left: '18rpx', top: '82rpx', width: '86rpx', height: '72rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: titleColor, fontSize: '54rpx', lineHeight: '60rpx', fontWeight: 300 }}>‹</Text>
      </View>
      <Text style={{ position: 'absolute', left: '0', top: '98rpx', width: '750rpx', color: titleColor, fontSize: '32rpx', lineHeight: '45rpx', fontWeight: 500, textAlign: 'center' }}>{title}</Text>
    </View>
  )
}
