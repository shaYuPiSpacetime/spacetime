import { ScrollView, Text, View } from '@tarojs/components'
import { MessageNav } from './shared'
import './message.scss'

const sections = [
  ['真诚交流', '请使用真实、友善的表达，不冒充他人，不发布虚假身份、虚假经历或误导性内容。'],
  ['尊重他人', '禁止侮辱、诽谤、歧视、威胁、骚扰、恶意纠缠或未经允许传播他人隐私。'],
  ['安全交友', '请在建立充分信任后再交换联系方式；不要轻信转账、投资、博彩、刷单等要求。'],
  ['内容规范', '禁止发布违法违规、色情低俗、暴力恐怖、诈骗引流、垃圾广告及其他破坏社区秩序的内容。'],
  ['保护隐私', '请勿公开身份证、银行卡、家庭住址等敏感信息，也不要索取或泄露他人的敏感信息。'],
  ['违规处理', '遇到不友善或可疑行为，请使用举报、拉黑功能。平台会依据证据进行审核，并按规则采取限制、冻结等措施。'],
] as const

export default function CommunityRulesPage() {
  return (
    <View className="message-page message-page--gray">
      <MessageNav title="社区规则" center />
      <ScrollView scrollY style={{ flex: 1 }} showScrollbar={false}>
        <View style={{ margin: '24rpx', padding: '32rpx', borderRadius: '20rpx', background: '#FFFFFF' }}>
          <Text style={{ display: 'block', color: '#0C285A', fontSize: '32rpx', fontWeight: 600, lineHeight: '48rpx' }}>社区交流规范</Text>
          <Text style={{ display: 'block', color: '#666666', fontSize: '26rpx', lineHeight: '42rpx', marginTop: '18rpx' }}>请真诚、友善、安全地交流，共同维护可信赖的交友环境。</Text>
          {sections.map(([title, content], index) => (
            <View key={title} style={{ marginTop: '32rpx' }}>
              <Text style={{ display: 'block', color: '#26354A', fontSize: '28rpx', fontWeight: 600, lineHeight: '42rpx' }}>{index + 1}. {title}</Text>
              <Text style={{ display: 'block', color: '#666666', fontSize: '26rpx', lineHeight: '42rpx', marginTop: '8rpx' }}>{content}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}
