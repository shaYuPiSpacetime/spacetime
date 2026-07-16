import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import goodAvatar from '@/assets/lanhu/verification/avatar-good.webp'
import { miniappOssIcons } from '@/constants/ossIcons'
import { usePrd01Store } from '@/stores/prd01Store'
import { chooseAndCropAvatar } from '@/utils/avatar'
import { navigateBackOrRedirect } from '@/utils/navigation'
import VerificationRuntimeBoundary from './components/VerificationRuntimeBoundary'
import VerificationShell from './components/VerificationShell'

export default function VerificationAvatarPage() {
  const copy = usePrd01Store(state => state.copy)
  const profileOptions = usePrd01Store(state => state.profileOptions)
  const [sourceSheetVisible, setSourceSheetVisible] = useState(false)
  const [choosing, setChoosing] = useState(false)

  const chooseSource = async (source: string) => {
    const sourceOption = profileOptions?.avatarSource?.find(option => option.code === source)
    if (!sourceOption || choosing) return
    setChoosing(true)
    try {
      const avatarPath = await chooseAndCropAvatar(sourceOption.code)
      if (!avatarPath) return
      await Taro.redirectTo({
        url: `/pages/verification/avatar-crop?source=${encodeURIComponent(sourceOption.code)}&path=${encodeURIComponent(avatarPath)}`,
      })
    } catch (error) {
      await showError(error)
    } finally {
      setChoosing(false)
      setSourceSheetVisible(false)
    }
  }

  return (
    <VerificationRuntimeBoundary>
      <VerificationShell
        stage="avatar"
        primaryText={choosing ? copy('avatar_choosing_action') : copy('avatar_choose_action')}
        onPrimary={sourceSheetVisible ? undefined : () => setSourceSheetVisible(true)}
        onBack={() => navigateBackOrRedirect('/pages/index/index')}
      >
        <AvatarGuide copy={copy} />
        {sourceSheetVisible ? (
          <AvatarSourceSheet
            options={profileOptions?.avatarSource || []}
            cancelText={copy('common_cancel_action')}
            onSelect={option => void chooseSource(option.code)}
            onCancel={() => setSourceSheetVisible(false)}
          />
        ) : null}
      </VerificationShell>
    </VerificationRuntimeBoundary>
  )
}

function AvatarGuide({ copy }: { copy: (key: string) => string }) {
  const invalidExamples = [
    { label: copy('avatar_invalid_non_person'), image: miniappOssIcons.verificationAvatarInvalidNonPerson },
    { label: copy('avatar_invalid_landscape'), image: miniappOssIcons.verificationAvatarInvalidLandscape },
    { label: copy('avatar_invalid_blurred'), image: miniappOssIcons.verificationAvatarInvalidBlurred },
    { label: copy('avatar_invalid_no_face'), image: miniappOssIcons.verificationAvatarInvalidNoFace },
  ]

  return (
    <View style={{ position: 'absolute', left: '25rpx', top: '558rpx', width: '700rpx', height: '838rpx', borderRadius: '18rpx', background: '#FFFFFF', padding: '52rpx 30rpx', boxSizing: 'border-box' }}>
      <Text style={{ display: 'block', color: '#0C285A', fontSize: '29rpx', fontWeight: 800, lineHeight: '42rpx' }}>{copy('avatar_guide_title')}</Text>
      <AvatarExampleCard copy={copy} />
      <Text style={{ display: 'block', color: '#333333', fontSize: '26rpx', lineHeight: '38rpx', marginTop: '72rpx' }}>{copy('avatar_invalid_title')}</Text>
      <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: '22rpx' }}>
        {invalidExamples.map(item => (
          <View key={item.label} style={{ width: '140rpx' }}>
            <Image src={item.image} mode="aspectFill" style={{ width: '140rpx', height: '140rpx', borderRadius: '10rpx' }} />
            <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '34rpx', textAlign: 'center', marginTop: '20rpx' }}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function AvatarExampleCard({ copy }: { copy: (key: string) => string }) {
  const rules = [
    { icon: '😉', text: copy('avatar_rule_self'), left: '346rpx', top: '90rpx' },
    { icon: '😁', text: copy('avatar_rule_clear'), left: '441rpx', top: '185rpx' },
    { icon: '😊', text: copy('avatar_rule_best'), left: '389rpx', top: '280rpx' },
  ]
  return (
    <View style={{ position: 'relative', marginTop: '54rpx', height: '336rpx' }}>
      <Image src={goodAvatar} mode="aspectFill" style={{ width: '326rpx', height: '336rpx', borderRadius: '12rpx' }} />
      <View style={{ position: 'absolute', left: '238rpx', bottom: '-18rpx', width: '114rpx', height: '114rpx', borderRadius: '57rpx', background: '#2876FF', border: '8rpx solid #FFFFFF', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: '48rpx', height: '28rpx', borderLeft: '10rpx solid #FFFFFF', borderBottom: '10rpx solid #FFFFFF', transform: 'rotate(-45deg)', marginTop: '-10rpx' }} />
      </View>
      {rules.map(rule => (
        <View key={rule.text} style={{ position: 'absolute', left: rule.left, top: rule.top, height: '68rpx', borderRadius: '34rpx', background: '#E3F1FE', padding: '0 22rpx', display: 'flex', flexDirection: 'row', alignItems: 'center', zIndex: 3, whiteSpace: 'nowrap' }}>
          <Text style={{ fontSize: '28rpx', lineHeight: '34rpx', marginRight: '12rpx' }}>{rule.icon}</Text>
          <Text style={{ color: '#333333', fontSize: '24rpx', lineHeight: '34rpx', whiteSpace: 'nowrap' }}>{rule.text}</Text>
        </View>
      ))}
    </View>
  )
}

function AvatarSourceSheet({
  options,
  cancelText,
  onSelect,
  onCancel,
}: {
  options: Array<{ code: string; label: string }>
  cancelText: string
  onSelect: (option: { code: string; label: string }) => void
  onCancel: () => void
}) {
  return (
    <View style={{ position: 'fixed', left: 0, right: 0, top: 0, bottom: 0, background: 'rgba(0,0,0,0.32)', zIndex: 40 }} onClick={onCancel}>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: '32rpx 32rpx 0 0', background: '#FFFFFF', overflow: 'hidden', paddingBottom: 'env(safe-area-inset-bottom)' }} onClick={event => event.stopPropagation()}>
        {options.map(option => (
          <View key={option.code} style={{ height: '100rpx', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1rpx solid #EDF2F8' }} onClick={() => onSelect(option)} hoverClass="btn-hover">
            <Text style={{ color: '#333333', fontSize: '30rpx', lineHeight: '42rpx' }}>{option.label}</Text>
          </View>
        ))}
        <View style={{ height: '16rpx', background: '#F0F4FA' }} />
        <View style={{ height: '100rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onCancel} hoverClass="btn-hover">
          <Text style={{ color: '#999999', fontSize: '30rpx', lineHeight: '42rpx' }}>{cancelText}</Text>
        </View>
      </View>
    </View>
  )
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
