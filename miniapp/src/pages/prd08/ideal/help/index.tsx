import { ScrollView, Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import NativeNavigation from '@/components/NativeNavigation'
import { getIdealHelp, type IdealHelpVO } from '@/services/ideal'

export default function IdealHelpPage() {
  const [help, setHelp] = useState<IdealHelpVO | null>(null)
  const [message, setMessage] = useState('')
  useEffect(() => {
    void getIdealHelp()
      .then(setHelp)
      .catch(error => setMessage(error instanceof Error ? error.message : '帮助内容加载失败'))
  }, [])
  return (
    <View style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <NativeNavigation title="帮助中心" />
      {!help ? (
        <View style={{ paddingTop: '260rpx', textAlign: 'center' }}>
          <Text style={{ color: '#999999', fontSize: '26rpx' }}>{message || '加载中…'}</Text>
        </View>
      ) : (
        <ScrollView scrollY showScrollbar={false} style={{ height: 'calc(100vh - 154rpx)' }}>
          <View style={{ padding: '46rpx 26rpx 90rpx' }}>
            <Text
              style={{ display: 'block', color: '#0C285A', fontSize: '36rpx', fontWeight: 600 }}
            >
              {help.title || '什么是理想型？'}
            </Text>
            <Paragraph text={help.intro} />
            <Paragraph text={help.resultDescription} />
            <Paragraph text={help.unlockDescription} />
            <Paragraph
              text={`您已解锁的嘉宾可在理想型页面右上角“历史解锁”中查看，保留最近${help.pricing.retentionDays}天内的记录。`}
            />
          </View>
        </ScrollView>
      )}
    </View>
  )
}
function Paragraph({ text }: { text?: string | null }) {
  return text ? (
    <Text
      style={{
        display: 'block',
        color: '#0C285A',
        fontSize: '28rpx',
        lineHeight: '58rpx',
        marginTop: '32rpx',
      }}
    >
      {text}
    </Text>
  ) : null
}
