import { Image, Text, Textarea, View } from '@tarojs/components'
import { miniappOssIcons } from '@/constants/ossIcons'
import type { RealWhisperPrecheckResult } from '@/services/message'

const BLUE = '#2876FF'

type CommunityWhisperSheetProps = {
  avatar?: string
  nickname: string
  meta: string
  content: string
  precheck?: RealWhisperPrecheckResult
  loading: boolean
  submitting: boolean
  onContentChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}

/** 社区来源页内的悄悄话扣费弹窗，不创建独立路由。 */
export default function CommunityWhisperSheet({
  avatar,
  nickname,
  meta,
  content,
  precheck,
  loading,
  submitting,
  onContentChange,
  onClose,
  onSubmit,
}: CommunityWhisperSheetProps) {
  const maxLength = precheck?.contentMaxLength || 60
  const length = Array.from(content).length
  const disabled = loading || submitting || !precheck?.canSend || length < 1 || length > maxLength
  const costText = loading
    ? '查询中…'
    : precheck?.free
      ? '今日免费'
      : `${precheck?.coinAmount ?? '--'}`

  return (
    <View id="qianxun-family-whisper-sheet" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 30000, background: 'rgba(21,29,38,.34)' }}>
      <View onClick={event => event.stopPropagation()} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: '844rpx', borderRadius: '32rpx 32rpx 0 0', background: 'linear-gradient(180deg,#F1FAFF 0%,#FFFFFF 30%)', padding: '54rpx 25rpx calc(36rpx + env(safe-area-inset-bottom))', boxSizing: 'border-box' }}>
        <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#333333', fontSize: '34rpx', lineHeight: '48rpx', fontWeight: 600 }}>悄悄话</Text>
          <View style={{ width: '48rpx', height: '48rpx', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '8rpx' }}><Text style={{ color: '#9AA1AB', fontSize: '28rpx' }}>?</Text></View>
        </View>
        <Text style={{ display: 'block', color: '#333333', fontSize: '26rpx', lineHeight: '40rpx', textAlign: 'center', marginTop: '14rpx' }}>—第一时间抓住ta的目光—</Text>
        <View style={{ display: 'flex', alignItems: 'center', marginTop: '50rpx', padding: '0 4rpx' }}>
          <Image src={avatar || miniappOssIcons.qianxunTopicAvatar} mode="aspectFill" style={{ width: '84rpx', height: '84rpx', borderRadius: '42rpx', background: '#EEF2F6', flexShrink: 0 }} />
          <View style={{ minWidth: 0, marginLeft: '22rpx' }}>
            <Text style={{ display: 'block', color: '#333333', fontSize: '30rpx', lineHeight: '42rpx', fontWeight: 600 }}>{nickname || '用户'}</Text>
            <Text style={{ display: 'block', color: '#666666', fontSize: '25rpx', lineHeight: '36rpx', marginTop: '8rpx' }}>{meta || '资料待完善'}</Text>
          </View>
        </View>
        <View style={{ position: 'relative', height: '238rpx', border: `4rpx solid ${BLUE}`, borderRadius: '16rpx', marginTop: '38rpx', background: '#FFFFFF', boxSizing: 'border-box' }}>
          <Textarea value={content} maxlength={maxLength} disabled={loading || submitting} placeholder="写点什么···" placeholderStyle="color:#999999" onInput={event => onContentChange(event.detail.value)} style={{ width: '100%', height: '184rpx', padding: '30rpx 34rpx 8rpx', color: '#333333', fontSize: '27rpx', lineHeight: '42rpx', boxSizing: 'border-box' }} />
          <Text style={{ position: 'absolute', right: '30rpx', bottom: '18rpx', color: length > maxLength ? '#E62828' : '#999999', fontSize: '24rpx' }}>{length}/{maxLength}</Text>
        </View>
        <View style={{ height: '128rpx', borderRadius: '16rpx', background: '#E7F4FF', marginTop: '34rpx', padding: '0 20rpx 0 28rpx', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ display: 'block', color: BLUE, fontSize: precheck?.free ? '26rpx' : '34rpx', lineHeight: '44rpx' }}>{costText}</Text>
            <Text style={{ display: 'block', color: '#999999', fontSize: '23rpx', lineHeight: '34rpx', marginTop: '4rpx' }}>悄悄话直达，配对率翻倍</Text>
          </View>
          <View onClick={() => { if (!disabled) onSubmit() }} style={{ width: '252rpx', height: '82rpx', borderRadius: '41rpx', background: disabled ? '#A8C8FA' : BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 500 }}>{submitting ? '发送中…' : '发送悄悄话'}</Text>
          </View>
        </View>
        {precheck && !precheck.canSend && precheck.reasonText ? <Text style={{ display: 'block', color: '#E35C5C', fontSize: '22rpx', textAlign: 'center', marginTop: '14rpx' }}>{precheck.reasonText}</Text> : null}
      </View>
    </View>
  )
}
