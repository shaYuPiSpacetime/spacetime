import type { ReactNode } from 'react'
import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { miniappOssIcons } from '@/constants/ossIcons'

type VerificationStatusKey = 'avatar' | 'realName' | 'education'

export function VerificationStatusTabs({
  active,
  completedKeys,
  copy,
}: {
  active: VerificationStatusKey
  completedKeys?: VerificationStatusKey[]
  copy: (key: string) => string
}) {
  const tabs = [
    { key: 'avatar', label: copy('verification_status_avatar') },
    { key: 'realName', label: copy('verification_status_real_name') },
    { key: 'education', label: copy('verification_status_education') },
  ] as const
  const autoCompletedKeys: VerificationStatusKey[] =
    active === 'education' ? ['avatar', 'realName'] : active === 'realName' ? ['avatar'] : []
  const completedSet = new Set(completedKeys ?? autoCompletedKeys)

  return (
    <View
      style={{
        position: 'absolute',
        right: '25rpx',
        top: '239rpx',
        height: '38rpx',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active
        const isLit = isActive || completedSet.has(tab.key)
        return (
          <View
            key={tab.key}
            style={{
              position: 'relative',
              width: '52rpx',
              height: '38rpx',
              marginLeft: '20rpx',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: isLit ? '#2876FF' : '#999999', fontSize: '26rpx', fontWeight: isLit ? 600 : 400, lineHeight: '36rpx' }}>
              {tab.label}
            </Text>
            <View
              style={{
                position: 'absolute',
                left: '2rpx',
                bottom: '0',
                width: '48rpx',
                height: '4rpx',
                borderRadius: '2rpx',
                background: isLit ? '#2876FF' : '#9A9A9A',
              }}
            />
          </View>
        )
      })}
    </View>
  )
}

export function EducationHero({ copy }: { copy: (key: string) => string }) {
  return (
    <View style={{ position: 'absolute', left: '25rpx', top: '226rpx', width: '700rpx' }}>
      <Text style={{ display: 'block', color: '#0C285A', fontSize: '48rpx', fontWeight: 600, lineHeight: '67rpx' }}>{copy('education_title')}</Text>
      <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '33rpx', marginTop: '14rpx' }}>
        {copy('education_notice')}
      </Text>
    </View>
  )
}

export function EducationTabs({ active, copy }: { active: 'student' | 'mainland'; copy: (key: string) => string }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: '25rpx',
        top: '382rpx',
        width: '700rpx',
        height: '120rpx',
        borderRadius: '18rpx',
        background: '#FFFFFF',
        border: '2rpx solid #FFFFFF',
        boxSizing: 'border-box',
      }}
    >
      <TabText left="68rpx" text={copy('education_tab_student')} active={active === 'student'} onClick={() => Taro.redirectTo({ url: '/pages/verification/education-student' })} />
      <TabText left="302rpx" text={copy('education_tab_mainland')} active={active === 'mainland'} onClick={() => Taro.redirectTo({ url: '/pages/verification/education-mainland' })} />
    </View>
  )
}

function TabText({ left, text, active, onClick }: { left: string; text: string; active: boolean; onClick: () => void }) {
  return (
    <View style={{ position: 'absolute', left, top: '40rpx', width: '130rpx', height: '48rpx' }} onClick={onClick}>
      <Text style={{ position: 'absolute', left: '0', top: '0', color: active ? '#0C285A' : '#999999', fontSize: '28rpx', fontWeight: active ? 600 : 400, lineHeight: '40rpx', whiteSpace: 'nowrap', textShadow: active ? '0 10rpx 16rpx rgba(40,118,255,0.30)' : 'none' }}>
        {text}
      </Text>
    </View>
  )
}

export function FormRow({ label, children, top = '0' }: { label: string; children: ReactNode; top?: string }) {
  return (
    <View
      style={{
        width: '640rpx',
        height: '88rpx',
        borderRadius: '12rpx',
        background: '#FCFCFC',
        marginTop: top,
        padding: '0 30rpx',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Text style={{ color: '#0C285A', fontSize: '26rpx', fontWeight: 600, lineHeight: '37rpx' }}>{label}</Text>
      {children}
    </View>
  )
}

export function SubmitButton({ id, top, active, submitting, text, submittingText, onClick }: { id?: string; top: string; active: boolean; submitting?: boolean; text: string; submittingText: string; onClick: () => void }) {
  return (
    <View
      id={id}
      style={{
        position: 'absolute',
        left: '25rpx',
        top,
        width: '700rpx',
        height: '98rpx',
        borderRadius: '20rpx',
        background: active ? '#2876FF' : '#CEE0F8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClick}
    >
      <Text style={{ color: '#FAFBFC', fontSize: '36rpx', fontWeight: 500, lineHeight: '50rpx' }}>{submitting ? submittingText : text}</Text>
    </View>
  )
}

export function AgreementRow({
  id,
  top,
  checked,
  onToggle,
  prefix,
  agreementName,
}: {
  id?: string
  top: string
  checked: boolean
  onToggle: () => void
  prefix: string
  agreementName: string
}) {
  return (
    <View
      id={id}
      style={{
        position: 'absolute',
        left: '32rpx',
        top,
        height: '48rpx',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        maxWidth: '690rpx',
      }}
      onClick={onToggle}
    >
      <View
        style={{
          width: '32rpx',
          height: '32rpx',
          borderRadius: '16rpx',
          border: checked ? '0' : '2rpx solid #2876FF',
          background: checked ? '#2876FF' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          marginRight: '16rpx',
        }}
      >
        {checked && (
          <View
            style={{
              width: '15rpx',
              height: '9rpx',
              borderLeft: '4rpx solid #FFFFFF',
              borderBottom: '4rpx solid #FFFFFF',
              transform: 'rotate(-45deg)',
              marginTop: '-4rpx',
            }}
          />
        )}
      </View>
      <Text style={{ color: '#333333', fontSize: '28rpx', lineHeight: '40rpx' }}>{prefix}</Text>
      <Text style={{ color: '#2876FF', fontSize: '28rpx', lineHeight: '40rpx' }}>《{agreementName}》</Text>
    </View>
  )
}

export function CustomerServiceLink({ id, top, text }: { id?: string; top: string; text: string }) {
  return (
    <View
      id={id}
      style={{
        position: 'absolute',
        left: '0',
        top,
        width: '750rpx',
        height: '48rpx',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={() => Taro.showToast({ title: text, icon: 'none' })}
    >
      <Image src={miniappOssIcons.verificationCustomerService} mode="widthFix" style={{ width: '30rpx', marginRight: '12rpx' }} />
      <Text style={{ color: '#2876FF', fontSize: '28rpx', lineHeight: '40rpx' }}>{text}</Text>
    </View>
  )
}

export function UploadProofBox({
  id,
  uploadPath,
  onClick,
  height = '306rpx',
  text,
}: {
  id?: string
  uploadPath?: string
  onClick: () => void
  height?: string
  text: string
}) {
  return (
    <View
      id={id}
      style={{
        width: '640rpx',
        height,
        borderRadius: '12rpx',
        background: '#FFFFFF',
        border: '2rpx dashed #D9D9D9',
        marginTop: '20rpx',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
      onClick={onClick}
    >
      {uploadPath ? (
        <Image src={uploadPath} mode="aspectFill" style={{ width: '100%', height: '100%' }} />
      ) : (
        <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Image src={miniappOssIcons.verificationUploadCamera} mode="widthFix" style={{ width: '64rpx' }} />
          <Text style={{ color: '#999999', fontSize: '28rpx', fontWeight: 600, lineHeight: '40rpx', marginTop: '22rpx' }}>
            {text}
          </Text>
        </View>
      )}
    </View>
  )
}
