import { Text, Textarea, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { getDemoPageData } from '@/services/lanhuDemo'
import VerificationShell from './components/VerificationShell'

type VoiceVariant = 'voice' | 'recording' | 'exit' | 'play' | 'complete'

const verificationBaseDemo = getDemoPageData('verification')
const verificationDemo = verificationBaseDemo as typeof verificationBaseDemo & {
  voiceIntro: {
    title: string
    subtitle: string
    recordButtonText: string
    exitTitle: string
    exitContent: string
    states: Record<VoiceVariant, {
      title: string
      desc: string
      timer?: string
      duration?: string
    }>
  }
}

const VOICE_STATUS_LABELS = {
  recording: '录制中',
  exit: '退出录音',
  complete: '录制完成',
}

function resolveVoiceVariant(value?: string): VoiceVariant | null {
  if (value === 'voice' || value === 'recording' || value === 'exit' || value === 'play' || value === 'complete') {
    return value
  }
  return null
}

export default function VerificationIntroPage() {
  const router = useRouter()
  const variant = resolveVoiceVariant(String(router.params.variant || ''))

  if (variant) {
    return (
      <VerificationShell
        stage="intro"
        primaryText="下一步"
        primaryActive={variant === 'complete'}
        onPrimary={() => Taro.redirectTo({ url: '/pages/verification/triple' })}
        onBack={() => Taro.redirectTo({ url: '/pages/verification/avatar-review' })}
      >
        <VoiceIntroDemo variant={variant} />
      </VerificationShell>
    )
  }

  return (
    <VerificationShell
      stage="intro"
      primaryText="下一步"
      primaryActive={false}
      onPrimary={() => Taro.redirectTo({ url: '/pages/verification/intro-edit' })}
      onBack={() => Taro.redirectTo({ url: '/pages/verification/avatar-review' })}
    >
      <View
        style={{
          position: 'absolute',
          left: '25rpx',
          top: '558rpx',
          width: '700rpx',
          height: '974rpx',
          borderRadius: '18rpx',
          background: '#FFFFFF',
          padding: '52rpx 30rpx',
          boxSizing: 'border-box',
        }}
        onClick={() => Taro.redirectTo({ url: '/pages/verification/intro-edit' })}
        hoverClass="btn-hover"
      >
        <Text style={{ display: 'block', color: '#0C285A', fontSize: '30rpx', fontWeight: 800, lineHeight: '42rpx' }}>
          自我描述
        </Text>
        <View
          style={{
            width: '640rpx',
            height: '408rpx',
            borderRadius: '12rpx',
            border: '4rpx solid #2876FF',
            marginTop: '44rpx',
            padding: '28rpx',
            boxSizing: 'border-box',
          }}
        >
          <Textarea
            disabled
            value=""
            placeholder="简单描述下自己是怎么一个人，性格、习惯、爱好、有点、缺点等，不少于20字"
            placeholderStyle="color:#999999;font-size:28rpx;line-height:48rpx"
            style={{ width: '584rpx', height: '320rpx', color: '#333333', fontSize: '28rpx', lineHeight: '48rpx' }}
          />
          <Text style={{ display: 'block', color: '#999999', fontSize: '22rpx', lineHeight: '32rpx', textAlign: 'right' }}>最少20字</Text>
        </View>
      </View>
    </VerificationShell>
  )
}

function VoiceIntroDemo({ variant }: { variant: VoiceVariant }) {
  const state = verificationDemo.voiceIntro.states[variant]
  const isVoice = variant === 'voice'
  const showWave = !isVoice && (variant === 'recording' || variant === 'play' || variant === 'complete')
  const buttonText = variant === 'recording'
    ? VOICE_STATUS_LABELS.recording
    : variant === 'complete'
      ? VOICE_STATUS_LABELS.complete
      : verificationDemo.voiceIntro.recordButtonText

  return (
    <>
      <View
        style={{
          position: 'absolute',
          left: '25rpx',
          top: '558rpx',
          width: '700rpx',
          minHeight: '702rpx',
          borderRadius: '64rpx',
          background: '#FFFFFF',
          padding: '46rpx 34rpx',
          boxSizing: 'border-box',
        }}
      >
        <Text style={{ display: 'block', color: '#0C285A', fontSize: '36rpx', fontWeight: 800, lineHeight: '50rpx', textAlign: 'center' }}>
          {verificationDemo.voiceIntro.title}
        </Text>
        <Text style={{ display: 'block', color: '#697E9C', fontSize: '26rpx', lineHeight: '40rpx', textAlign: 'center', marginTop: '12rpx' }}>
          {verificationDemo.voiceIntro.subtitle}
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
          <Text style={{ display: 'block', color: '#0C285A', fontSize: '30rpx', fontWeight: 800, lineHeight: '42rpx' }}>{state.title}</Text>
          <Text style={{ display: 'block', color: '#697E9C', fontSize: '24rpx', lineHeight: '36rpx', marginTop: '10rpx' }}>{state.desc}</Text>
          {showWave && (
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', height: '74rpx', marginTop: '22rpx' }}>
              {[24, 48, 34, 62, 40, 68, 32, 52, 28, 58, 38, 46].map((height, index) => (
                <View
                  key={`${height}-${index}`}
                  style={{
                    width: '10rpx',
                    height: `${height}rpx`,
                    borderRadius: '6rpx',
                    background: variant === 'recording' ? '#FF5A47' : '#2876FF',
                    marginRight: '14rpx',
                  }}
                />
              ))}
              <Text style={{ color: '#8792A6', fontSize: '24rpx', lineHeight: '34rpx', marginLeft: '8rpx' }}>
                {state.timer || state.duration}
              </Text>
            </View>
          )}
        </View>

        <View
          style={{
            height: '98rpx',
            borderRadius: '98rpx',
            background: variant === 'recording' ? '#FF5A47' : '#2876FF',
            marginTop: '46rpx',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12rpx 28rpx rgba(40,118,255,0.22)',
          }}
          hoverClass="btn-hover"
        >
          <Text style={{ color: '#FFFFFF', fontSize: '32rpx', fontWeight: 800, lineHeight: '45rpx' }}>{buttonText}</Text>
        </View>

        <View
          style={{
            height: '78rpx',
            borderRadius: '98rpx',
            marginTop: '18rpx',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => Taro.redirectTo({ url: '/pages/verification/intro-edit' })}
          hoverClass="btn-hover"
        >
          <Text style={{ color: '#8792A6', fontSize: '28rpx', fontWeight: 700, lineHeight: '40rpx' }}>改用文字介绍</Text>
        </View>
      </View>

      {variant === 'exit' && (
        <View
          style={{
            position: 'fixed',
            left: '0',
            right: '0',
            top: '0',
            bottom: '0',
            zIndex: 60,
            background: 'rgba(4, 16, 42, 0.42)',
          }}
        >
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
            <Text style={{ display: 'block', color: '#0C285A', fontSize: '36rpx', fontWeight: 800, lineHeight: '50rpx', textAlign: 'center' }}>
              {verificationDemo.voiceIntro.exitTitle}
            </Text>
            <Text style={{ display: 'block', color: '#697E9C', fontSize: '26rpx', lineHeight: '40rpx', textAlign: 'center', marginTop: '18rpx' }}>
              {verificationDemo.voiceIntro.exitContent}
            </Text>
            <View
              style={{
                height: '98rpx',
                borderRadius: '98rpx',
                background: '#2876FF',
                marginTop: '36rpx',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: '32rpx', fontWeight: 800 }}>{VOICE_STATUS_LABELS.exit}</Text>
            </View>
          </View>
        </View>
      )}
    </>
  )
}
