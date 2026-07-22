import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect } from 'react'
import { messageService } from '@/services/message'
import type { OfficialChannelType } from '@/types/message'
import { ChannelBadge, MessageNav } from './shared'
import './message.scss'

const ASSISTANT_RULES = `欢迎来到单身青年自救平台，期待你在这里能遇见喜欢的人，找到一生的幸福，以下是一些主要规则介绍，方便你快速熟悉平台：

1、本平台是实名交友平台，必须认证身份才能使用；

2、你只能认识跟你资料真实度等级一样的人，你认证的信息越多，你认识的人就越真实；

3、交友中请遵守平台交友规则，文明、友善交友；违规者将会受到禁言、暂时封禁乃至永久封禁等处罚，具体处罚规则请到【我的->处罚规则】中查看；

4、遇见任何违反交友规则的人，你都可以举报；

5、匹配成功后，保护期内男方需要等待女方先发送真实消息。`

export default function MessageChannelPage() {
  const router = useRouter()
  const channel: OfficialChannelType =
    router.params.mockScene === 'channel-system' ? 'system' : 'assistant'
  useEffect(() => {
    void messageService.markChannelRead(channel)
  }, [channel])

  return (
    <View className="message-page message-page--gray channel-page">
      <MessageNav title={channel === 'assistant' ? '官方小助手' : '系统消息'} center />
      <ScrollView scrollY className="channel-scroll" showScrollbar={false}>
        {channel === 'assistant' ? <AssistantContent /> : <SystemContent />}
      </ScrollView>
      <View className="channel-footer">
        <View
          onClick={() =>
            void Taro.showModal({
              title: '联系客服',
              content: '客服工作时间：每日 09:00-21:00',
              showCancel: false,
            })
          }
        >
          <Text>联系客服</Text>
        </View>
        <View className="channel-footer-divider" />
        <View
          onClick={() =>
            void Taro.showModal({
              title: '社区规则',
              content: '请真诚、友善、安全地交流，共同维护社区环境。',
              showCancel: false,
            })
          }
        >
          <Text>社区规则</Text>
        </View>
      </View>
    </View>
  )
}

function ChannelDate({ children }: { children: string }) {
  return <Text className="channel-date">{children}</Text>
}

function ChannelCard({ type, children }: { type: OfficialChannelType; children: React.ReactNode }) {
  const h5Class = Taro.getEnv() === Taro.ENV_TYPE.WEB ? ' channel-card--h5' : ''
  return (
    <View className="channel-message-row">
      <ChannelBadge type={type} />
      <View className={`channel-card${h5Class}`}>{children}</View>
    </View>
  )
}

function AssistantContent() {
  return (
    <View className="channel-content">
      <ChannelDate>2026年05月12日 23:04</ChannelDate>
      <ChannelCard type="assistant">
        <Text className="channel-long-copy">{ASSISTANT_RULES}</Text>
      </ChannelCard>
      <ChannelCard type="assistant">
        <Text className="channel-card-title">关注服务号</Text>
        <Text className="channel-card-copy">
          关注服务号，第一时间收到好友聊天/点赞/评论消息通知
        </Text>
        <View
          className="channel-card-action"
          onClick={() => void Taro.showToast({ title: '请在微信中搜索服务号', icon: 'none' })}
        >
          <Text>点此关注</Text>
          <Text>〉</Text>
        </View>
      </ChannelCard>
    </View>
  )
}

function SystemContent() {
  return (
    <View className="channel-content">
      <ChannelDate>2026年05月12日 23:04</ChannelDate>
      <ChannelCard type="system">
        <Text className="channel-card-body">
          有多人对你感兴趣访问了你的主页，快去发布动态丰富下自己的主页吧，还能提升喜欢哦
        </Text>
        <View
          className="channel-card-action"
          onClick={() => void Taro.navigateTo({ url: '/pages/qianxun/compose' })}
        >
          <Text>立即分享</Text>
          <Text>〉</Text>
        </View>
      </ChannelCard>
      <ChannelDate>2026年05月06日 23:04</ChannelDate>
      <ChannelCard type="system">
        <Text className="channel-card-title">【这可能是最适合约会的暑期】</Text>
        <Text className="channel-card-body channel-card-body--spaced">
          今年暑期档，杀疯啦!!!请务必约上喜欢的人，去看电影!{`\n\n`}
          不仅有周星驰时隔7年的新作《功夫足球》、电影大师诺兰执导的R级电影《奥德赛》，还有全球恐怖片票房黑马《后室》、备受期待的国产云画电影《三国第一部:争洛阳》、战争历史题材大片《澎湖海战》等...完全神仙打架!
          {`\n`}
          附上你的票根、影评 或观后感，分享到社区，让更多品味相同人看到你!
          优秀内容有机会获得官方流量扶持哦!
        </Text>
        <View
          className="channel-card-action"
          onClick={() => void Taro.navigateTo({ url: '/pages/qianxun/compose' })}
        >
          <Text>立即分享</Text>
          <Text>〉</Text>
        </View>
      </ChannelCard>
    </View>
  )
}
