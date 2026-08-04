import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useRef, useState } from 'react'
import HeartMessageHeader from '@/components/HeartMessageHeader'
import { miniappOssIcons } from '@/constants/ossIcons'
import {
  cancelRelationLike,
  reportRelationVisit,
  sendRelationLike,
  type RelationSourceScene,
} from '@/services/relation'
import {
  COMMUNITY_COPY_KEYS,
  getCommunityMeta,
  getUserCommunityPosts,
  reportCommunityTarget,
  resolveCommunityCopy,
  resolveCommunityFeedback,
  type CommunityConfig,
  type CommunityPostVO,
} from '@/services/community'

const background =
  'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48.5%, rgba(248,250,239,0.6) 100%)'

const tagRows = [
  ['IT女神', '户外发烧友', '热爱旅行', '电子竞技'],
  ['真诚沟通', '喜欢读书', '周末徒步', '认真恋爱'],
  ['情绪稳定', '有边界感', '会做饭', '喜欢电影'],
]

const tagStyles = [
  { color: '#4CAF51', background: '#EBF5EA' },
  { color: '#3D9FF5', background: '#E7F2FE' },
  { color: '#FF9A0F', background: '#FFF3E6' },
  { color: '#9F2CB2', background: '#F4E6F6' },
]

function createRequestId(prefix: string, targetUserId: number): string {
  return `${prefix}-${targetUserId}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function createEventNo(targetUserId: number, sourceScene: string): string {
  return `visit-${targetUserId}-${sourceScene}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

export default function HeartUserPage() {
  const router = useRouter()
  const targetUserId = Number(router.params.targetUserId || router.params.userId || 0)
  const sourceScene = ((router.params.sourceScene as RelationSourceScene | undefined) || 'profile') as RelationSourceScene
  const [liked, setLiked] = useState(router.params.liked === '1')
  const [matched, setMatched] = useState(router.params.matched === '1' || router.params.matched === 'true')
  const [communityPosts, setCommunityPosts] = useState<CommunityPostVO[]>([])
  const [communityPostsLoading, setCommunityPostsLoading] = useState(true)
  const [communityPostsError, setCommunityPostsError] = useState('')
  const [communityConfig, setCommunityConfig] = useState<CommunityConfig>()
  const eventNo = useMemo(() => createEventNo(targetUserId || 0, sourceScene), [targetUserId, sourceScene])
  const visitReported = useRef(false)

  useEffect(() => {
    if (!targetUserId || visitReported.current) return
    visitReported.current = true
    reportRelationVisit(targetUserId, sourceScene, eventNo).catch(() => undefined)
  }, [targetUserId, sourceScene, eventNo])

  useEffect(() => {
    setCommunityPostsLoading(true)
    setCommunityPostsError('')
    void getCommunityMeta().then(async runtime => {
      setCommunityConfig(runtime)
      if (!targetUserId) {
        setCommunityPostsError(resolveCommunityCopy(runtime, COMMUNITY_COPY_KEYS.profileUnavailable))
        return
      }
      const page = await getUserCommunityPosts(String(targetUserId), 1, 20)
      setCommunityPosts(page.records || [])
    }).catch(error => {
      setCommunityPosts([])
      setCommunityPostsError(resolveCommunityFeedback(communityConfig, COMMUNITY_COPY_KEYS.loadFailed, error))
    }).finally(() => setCommunityPostsLoading(false))
  }, [targetUserId])

  const toggleLike = () => {
    if (!targetUserId) {
      Taro.showToast({ title: '缺少用户信息', icon: 'none' })
      return
    }
    if (liked) {
      Taro.showModal({
        title: '取消喜欢',
        content: '取消后仅撤销爱心来源；若仍有其他匹配来源，聊天关系继续有效。',
        success: result => {
          if (!result.confirm) return
          cancelRelationLike(targetUserId)
            .then(data => {
              setLiked(false)
              setMatched(Boolean(data.matched))
              Taro.showToast({ title: '已取消喜欢', icon: 'none' })
            })
            .catch(error => Taro.showToast({ title: error instanceof Error ? error.message : '取消失败', icon: 'none' }))
        },
      })
      return
    }
    sendRelationLike(targetUserId, sourceScene, createRequestId('like', targetUserId))
      .then(data => {
        setLiked(true)
        setMatched(Boolean(data.matched))
        Taro.showToast({ title: data.matched ? '匹配成功' : '已喜欢', icon: 'success' })
      })
      .catch(error => {
        const message = error instanceof Error ? error.message : '喜欢失败'
        if (/20004|已存在/.test(message)) setLiked(true)
        Taro.showToast({ title: message, icon: 'none' })
      })
  }

  const reportUser = async () => {
    if (!targetUserId) {
      await Taro.showToast({ title: resolveCommunityCopy(communityConfig, COMMUNITY_COPY_KEYS.profileUnavailable), icon: 'none' })
      return
    }
    const meta = communityConfig || await getCommunityMeta()
    setCommunityConfig(meta)
    if (!meta.reportReasons.length) {
      await Taro.showToast({ title: resolveCommunityCopy(meta, COMMUNITY_COPY_KEYS.reportReasonUnavailable), icon: 'none' })
      return
    }
    const selection = await Taro.showActionSheet({ itemList: meta.reportReasons.map(item => item.label) })
    const reason = meta.reportReasons[selection.tapIndex]
    if (!reason) return
    const result = await reportCommunityTarget('user', targetUserId, reason.code)
    await Taro.showModal({
      title: result.statusName || resolveCommunityCopy(meta, COMMUNITY_COPY_KEYS.reportSubmitted),
      content: [result.message, result.reportNo ? resolveCommunityCopy(meta, COMMUNITY_COPY_KEYS.reportNumberFormat).replace('{reportNo}', result.reportNo) : ''].filter(Boolean).join('\n'),
      showCancel: false,
      confirmText: '知道了',
    })
  }

  const openSafetyActions = async () => {
    try {
      const selection = await Taro.showActionSheet({ itemList: ['举报该用户', '拉黑该用户'] })
      if (selection.tapIndex === 0) {
        await reportUser()
      } else {
        await Taro.showToast({ title: resolveCommunityCopy(communityConfig, COMMUNITY_COPY_KEYS.blockUnavailable), icon: 'none' })
      }
    } catch (error) {
      if (!String((error as { errMsg?: string })?.errMsg || error).includes('cancel')) {
        await Taro.showToast({ title: resolveCommunityFeedback(communityConfig, COMMUNITY_COPY_KEYS.reportSubmitFailed, error), icon: 'none' })
      }
    }
  }
  return (
    <View style={{ height: '100vh', overflow: 'hidden', background, fontFamily: 'PingFang SC, sans-serif' }}>
      <ScrollView scrollY style={{ width: '750rpx', height: '100vh' }} showScrollbar={false}>
        <View style={{ minHeight: '1850rpx', paddingBottom: '150rpx', boxSizing: 'border-box' }}>
          <HeartMessageHeader title="用户主页" align="center" showBack />
          <View style={{ width: '700rpx', margin: '0 auto' }}>
            <View style={{ position: 'relative', width: '700rpx', height: '828rpx', overflow: 'hidden', borderRadius: '32rpx', background: '#D8E7E6' }}>
              <Image src={miniappOssIcons.profilePreviewHero} mode="scaleToFill" style={{ width: '700rpx', height: '828rpx' }} />
              <Image
                src={miniappOssIcons.profilePreviewShare}
                mode="scaleToFill"
                onClick={() => Taro.showShareMenu({ withShareTicket: true })}
                style={{ position: 'absolute', right: '30rpx', top: '28rpx', width: '48rpx', height: '48rpx', borderRadius: '50%' }}
              />
              <View onClick={() => void openSafetyActions()} style={{ position: 'absolute', left: '30rpx', top: '28rpx', zIndex: 4, padding: '10rpx 18rpx', borderRadius: '24rpx', background: 'rgba(0,0,0,0.28)' }}>
                <Text style={{ color: '#FFFFFF', fontSize: '22rpx' }}>举报 · 拉黑</Text>
              </View>
              <Image src={miniappOssIcons.profilePreviewAvatar} mode="scaleToFill" style={{ position: 'absolute', left: '30rpx', bottom: '57rpx', zIndex: 3, width: '188rpx', height: '188rpx', borderRadius: '50%', background: '#FFFFFF' }} />
              <View style={{ position: 'absolute', left: '208rpx', bottom: '101rpx', zIndex: 3 }}>
                <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: '38rpx', fontWeight: 500, lineHeight: '53rpx', textShadow: '0 3rpx 4rpx rgba(0,0,0,0.5)' }}>筱脑虎</Text>
                  <View style={{ width: '168rpx', height: '48rpx', marginLeft: '10rpx', borderRadius: '24rpx', background: '#E3F1FE', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Image src={miniappOssIcons.profileCertification} mode="aspectFit" style={{ width: '30rpx', height: '30rpx', marginRight: '8rpx' }} />
                    <Text style={{ color: '#5D89DD', fontSize: '20rpx', fontWeight: 500, lineHeight: '28rpx' }}>三重认证</Text>
                  </View>
                </View>
                <View style={{ width: '148rpx', height: '48rpx', marginTop: '10rpx', borderRadius: '24rpx', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#FE918E', fontSize: '27rpx', lineHeight: '28rpx', marginRight: '10rpx' }}>♥</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: '20rpx', fontWeight: 500, lineHeight: '28rpx' }}>佛系交友</Text>
                </View>
              </View>
            </View>

            <View style={{ position: 'relative', zIndex: 4, width: '700rpx', height: '198rpx', marginTop: '-105rpx', padding: '60rpx 30rpx 34rpx', borderRadius: '32rpx', background: '#FFFFFF', boxSizing: 'border-box' }}>
              <InfoLine icon={miniappOssIcons.profilePreviewGender} text="女丨97年丨163cm丨双鱼座" />
              <View style={{ height: '18rpx' }} />
              <InfoLine icon={miniappOssIcons.profilePreviewLocation} text="现居浙江杭州丨河南人" />
            </View>

            <View style={{ width: '700rpx', marginTop: '20rpx', padding: '32rpx 34rpx 38rpx', borderRadius: '32rpx', background: '#FFFFFF', boxSizing: 'border-box' }}>
              <View style={{ position: 'relative', height: '40rpx' }}>
                <View style={{ position: 'absolute', left: 0, top: '4rpx', width: '120rpx', height: '30rpx', borderRadius: '50%', background: 'rgba(211,240,255,0.7)' }} />
                <Text style={{ position: 'relative', zIndex: 1, color: '#333333', fontSize: '28rpx', fontWeight: 600, lineHeight: '40rpx' }}>我的标签</Text>
              </View>
              <View style={{ marginTop: '20rpx' }}>
                {tagRows.map((row, rowIndex) => (
                  <View key={rowIndex} style={{ height: '48rpx', marginTop: rowIndex ? '10rpx' : '0', display: 'flex', flexDirection: 'row', gap: '10rpx' }}>
                    {row.map((tag, tagIndex) => {
                      const style = tagStyles[(tagIndex + rowIndex) % tagStyles.length]
                      return (
                        <View key={`${rowIndex}-${tag}`} style={{ height: '48rpx', padding: '0 24rpx', borderRadius: '29rpx', background: style.background, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                          <Text style={{ color: style.color, fontSize: '24rpx', lineHeight: '33rpx', whiteSpace: 'nowrap' }}>{tag}</Text>
                        </View>
                      )
                    })}
                  </View>
                ))}
              </View>
            </View>

            <View style={{ width: '700rpx', height: '260rpx', marginTop: '20rpx', padding: '32rpx', borderRadius: '32rpx', background: '#FFFFFF', boxSizing: 'border-box' }}>
              <Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', fontWeight: 600, lineHeight: '40rpx' }}>自我介绍</Text>
              <Text style={{ display: 'block', marginTop: '20rpx', color: '#7F8494', fontSize: '24rpx', lineHeight: '38rpx' }}>喜欢旅行和摄影，也享受安静的周末。希望遇见认真、真诚且有趣的你。</Text>
            </View>
            <View style={{ width: '700rpx', marginTop: '20rpx', padding: '32rpx', borderRadius: '32rpx', background: '#FFFFFF', boxSizing: 'border-box' }}>
              <Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', fontWeight: 600 }}>个人动态</Text>
              {communityPostsLoading ? <CommunityPostLoading /> : communityPostsError ? <CommunityPostEmpty text={communityPostsError} /> : communityPosts.length ? communityPosts.map(post => <CommunityPostCard key={post.postNo || post.id} post={post} />) : <CommunityPostEmpty text={resolveCommunityCopy(communityConfig, COMMUNITY_COPY_KEYS.emptyUserPosts)} />}
            </View>
          </View>
        </View>
      </ScrollView>
      <View style={{ position: 'fixed', left: '55rpx', right: '55rpx', bottom: '30rpx', zIndex: 50, display: 'flex', flexDirection: 'row', gap: '20rpx' }}>
        <View onClick={toggleLike} style={{ width: '210rpx', height: '98rpx', borderRadius: '49rpx', background: liked ? '#FFF0F2' : '#FFFFFF', border: '2rpx solid #FF5E6E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#FF5E6E', fontSize: '28rpx', fontWeight: 500 }}>{liked ? '取消喜欢' : '喜欢'}</Text>
        </View>
        <View onClick={() => Taro.showToast({ title: matched ? '正在打开聊天' : '匹配后才能聊天', icon: 'none' })} style={{ flex: 1, height: '98rpx', borderRadius: '49rpx', background: '#FF5E6E', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8rpx 22rpx rgba(255,94,110,0.25)' }}>
          <Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 500 }}>{matched ? '聊天' : '打招呼'}</Text>
        </View>
      </View>
    </View>
  )
}

function InfoLine({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ height: '36rpx', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
      <Image src={icon} mode="aspectFit" style={{ width: '30rpx', height: '34rpx', marginRight: '14rpx' }} />
      <Text style={{ color: '#333333', fontSize: '24rpx', lineHeight: '34rpx' }}>{text}</Text>
    </View>
  )
}

function CommunityPostCard({ post }: { post: CommunityPostVO }) {
  return (
    <View onClick={() => void Taro.navigateTo({ url: `/pages/qianxun/post-detail?id=${post.id}` })} style={{ padding: '24rpx 0 20rpx', borderBottom: '1rpx solid #EEF1F5' }}>
      <Text style={{ display: 'block', color: '#596273', fontSize: '24rpx', lineHeight: '38rpx' }}>{post.content}</Text>
      {post.imageUrls?.length ? <View style={{ display: 'flex', flexWrap: 'wrap', gap: '8rpx', marginTop: '16rpx' }}>{post.imageUrls.slice(0, 3).map((url, index) => <Image key={`${post.id}-${index}`} src={url} mode="aspectFill" style={{ width: '202rpx', height: '202rpx', borderRadius: '8rpx', background: '#F0F3F7' }} />)}</View> : null}
      {post.topicName ? <Text style={{ display: 'block', marginTop: '12rpx', color: '#2876FF', fontSize: '21rpx' }}># {post.topicName}</Text> : null}
      <View style={{ display: 'flex', alignItems: 'center', marginTop: '12rpx' }}><Text style={{ color: '#A0A6B2', fontSize: '20rpx' }}>{relativeTime(post.createTime)} · 公开动态</Text><View style={{ flex: 1 }} /><Text style={{ color: '#A0A6B2', fontSize: '20rpx' }}>◯ {post.commentCount || 0}</Text><Text style={{ color: '#F06E78', fontSize: '20rpx', marginLeft: '20rpx' }}>♥ {post.likeCount || 0}</Text></View>
    </View>
  )
}

function CommunityPostLoading() {
  return <View style={{ padding: '26rpx 0 12rpx' }}><View style={{ width: '88%', height: '24rpx', borderRadius: '12rpx', background: '#F0F2F5' }} /><View style={{ width: '62%', height: '24rpx', borderRadius: '12rpx', background: '#F0F2F5', marginTop: '16rpx' }} /></View>
}

function CommunityPostEmpty({ text }: { text: string }) {
  return <View style={{ minHeight: '120rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#A0A6B2', fontSize: '23rpx' }}>{text}</Text></View>
}

function relativeTime(value: string) {
  if (!value) return ''
  const time = new Date(value.replace(' ', 'T')).getTime()
  if (!Number.isFinite(time)) return value
  const minutes = Math.max(1, Math.floor((Date.now() - time) / 60000))
  if (minutes < 60) return `${minutes}分钟前`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`
  return `${Math.floor(minutes / 1440)}天前`
}
