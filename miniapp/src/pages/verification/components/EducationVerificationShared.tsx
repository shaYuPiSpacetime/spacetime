import type { ReactNode } from 'react'
import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import uploadCamera from '@/assets/lanhu/verification/slices/upload-camera.png'

export function VerificationStatusTabs({ active }: { active: 'avatar' | 'realName' | 'education' }) {
  const tabs = [
    { key: 'avatar', label: '头像' },
    { key: 'realName', label: '实名' },
    { key: 'education', label: '学历' },
  ] as const

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
            <Text style={{ color: isActive ? '#2876FF' : '#999999', fontSize: '26rpx', lineHeight: '36rpx' }}>
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
                background: isActive ? '#2876FF' : '#9A9A9A',
              }}
            />
          </View>
        )
      })}
    </View>
  )
}

export function EducationHero() {
  return (
    <View style={{ position: 'absolute', left: '25rpx', top: '226rpx', width: '700rpx' }}>
      <Text style={{ display: 'block', color: '#0C285A', fontSize: '48rpx', fontWeight: 600, lineHeight: '67rpx' }}>学历认证</Text>
      <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '33rpx', marginTop: '14rpx' }}>
        完成学历认证，和我们一起打造真实靠谱高质量交友社区
      </Text>
    </View>
  )
}

export function EducationTabs({ active }: { active: 'student' | 'mainland' }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: '25rpx',
        top: '424rpx',
        width: '700rpx',
        height: '144rpx',
        borderRadius: '18rpx 18rpx 0 0',
        background: '#FFFFFF',
        border: '2rpx solid #FFFFFF',
        boxSizing: 'border-box',
      }}
    >
      <TabText left="68rpx" text="在校学生" active={active === 'student'} onClick={() => Taro.redirectTo({ url: '/pages/verification/education-student' })} />
      <TabText left="302rpx" text="中国大陆" active={active === 'mainland'} onClick={() => Taro.redirectTo({ url: '/pages/verification/education-mainland' })} />
    </View>
  )
}

function TabText({ left, text, active, onClick }: { left: string; text: string; active: boolean; onClick: () => void }) {
  return (
    <View style={{ position: 'absolute', left, top: '64rpx', width: '112rpx', height: '48rpx' }} onClick={onClick}>
      {active && <View style={{ position: 'absolute', left: '0', bottom: '0', width: '96rpx', height: '6rpx', borderRadius: '3rpx', background: '#2876FF' }} />}
      <Text style={{ position: 'absolute', left: '0', top: '0', color: active ? '#0C285A' : '#999999', fontSize: '24rpx', fontWeight: active ? 600 : 400, lineHeight: '33rpx', whiteSpace: 'nowrap' }}>
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

export function SubmitButton({ top, active, submitting, onClick }: { top: string; active: boolean; submitting?: boolean; onClick: () => void }) {
  return (
    <View
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
      <Text style={{ color: '#FAFBFC', fontSize: '36rpx', fontWeight: 500, lineHeight: '50rpx' }}>{submitting ? '提交中' : '提交'}</Text>
    </View>
  )
}

export function AgreementRow({
  top,
  checked,
  onToggle,
  agreementName = '学历信息认证服务协议',
}: {
  top: string
  checked: boolean
  onToggle: () => void
  agreementName?: string
}) {
  return (
    <View
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
      <Text style={{ color: '#333333', fontSize: '28rpx', lineHeight: '40rpx' }}>我已查看并同意 </Text>
      <Text style={{ color: '#2876FF', fontSize: '28rpx', lineHeight: '40rpx' }}>《{agreementName}》</Text>
    </View>
  )
}

export function CustomerServiceLink({ top }: { top: string }) {
  return (
    <View
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
      onClick={() => Taro.showToast({ title: '联系客服', icon: 'none' })}
    >
      <View
        style={{
          width: '26rpx',
          height: '26rpx',
          borderRadius: '13rpx',
          border: '3rpx solid #2876FF',
          boxSizing: 'border-box',
          marginRight: '12rpx',
          position: 'relative',
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: '17rpx',
            top: '20rpx',
            width: '10rpx',
            height: '6rpx',
            borderLeft: '3rpx solid #2876FF',
            borderBottom: '3rpx solid #2876FF',
            transform: 'rotate(-25deg)',
          }}
        />
      </View>
      <Text style={{ color: '#2876FF', fontSize: '28rpx', lineHeight: '40rpx' }}>联系客服</Text>
    </View>
  )
}

export function UploadProofBox({
  uploadPath,
  onClick,
  height = '306rpx',
  text = '上传证明材料(0/4)',
}: {
  uploadPath?: string
  onClick: () => void
  height?: string
  text?: string
}) {
  return (
    <View
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
          <Image src={uploadCamera} mode="widthFix" style={{ width: '64rpx' }} />
          <Text style={{ color: '#999999', fontSize: '28rpx', fontWeight: 600, lineHeight: '40rpx', marginTop: '22rpx' }}>
            {text}
          </Text>
        </View>
      )}
    </View>
  )
}
