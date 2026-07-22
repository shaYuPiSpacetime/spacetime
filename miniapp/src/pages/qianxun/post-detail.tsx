import { Image, Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import {
  createCommunityComment,
  getCommunityComments,
  getCommunityConfig,
  getCommunityPostDetail,
  reportCommunityPost,
  toggleCommunityFollow,
  toggleCommunityLike,
  type CommunityCommentVO,
  type CommunityPostVO,
} from '@/services/community'

const BLUE = '#2876FF'
const NAVY = '#0C285A'
export default function QianxunPostDetailPage() {
  const [post, setPost] = useState<CommunityPostVO>()
  const [comments, setComments] = useState<CommunityCommentVO[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [comment, setComment] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const loadPost = async (postId: number) => {
    setLoading(true)
    setLoadError('')
    try {
      const current = await getCommunityPostDetail(postId)
      setPost(current)
      try {
        const page = await getCommunityComments(postId, 1, 100)
        setComments(page.records || [])
      } catch {
        setComments([])
      }
    } catch (error) {
      setLoadError(toErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useLoad(options => {
    const postId = Number(options.id)
    if (!Number.isFinite(postId) || postId <= 0) {
      setLoading(false)
      setLoadError('缺少动态信息')
      return
    }
    void loadPost(postId)
  })

  const likePost = async () => {
    if (!post) return
    try {
      const result = await toggleCommunityLike(post.id)
      setPost(current => current ? { ...current, liked: result.liked, likeCount: result.likeCount } : current)
    } catch (error) {
      await showError(error)
    }
  }

  const submitComment = async () => {
    const content = comment.trim()
    if (!post || !content || sendingComment) return
    setSendingComment(true)
    try {
      await createCommunityComment(post.id, content)
      setComment('')
      const [detail, page] = await Promise.all([getCommunityPostDetail(post.id), getCommunityComments(post.id, 1, 100)])
      setPost(detail)
      setComments(page.records || [])
      await Taro.showToast({ title: '评论已发布', icon: 'success' })
    } catch (error) {
      await showError(error)
    } finally {
      setSendingComment(false)
    }
  }

  const toggleFollow = async () => {
    if (!post) return
    try {
      const result = await toggleCommunityFollow(post.authorId)
      setPost(current => current ? { ...current, followingAuthor: result.following } : current)
    } catch (error) {
      await showError(error)
    }
  }

  const reportPost = async () => {
    if (!post) return
    try {
      const config = await getCommunityConfig()
      const reasons = config.reportReasons || []
      if (!reasons.length) {
        await Taro.showToast({ title: '暂无可用举报原因', icon: 'none' })
        return
      }
      const result = await Taro.showActionSheet({ itemList: reasons.map(item => item.label) })
      const reason = reasons[result.tapIndex]
      if (!reason) return
      await reportCommunityPost(post.id, reason.code)
      setShowActions(false)
      await Taro.showToast({ title: '举报已提交', icon: 'success' })
    } catch (error) {
      if (!String((error as { errMsg?: string })?.errMsg || error).includes('cancel')) await showError(error)
    }
  }

  return (
    <View id="qianxun-post-detail-page" style={{ height: '100vh', background: '#F5F7FA', overflow: 'hidden', color: '#333333' }}>
      <DetailNav onMore={() => post && setShowActions(true)} />
      {loading ? <DetailLoading /> : loadError || !post ? <LoadFailure text={loadError} /> : (
        <ScrollView scrollY style={{ position: 'absolute', left: 0, right: 0, top: '168rpx', bottom: '104rpx' }} showScrollbar={false}>
          <View style={{ padding: '18rpx 24rpx 40rpx' }}>
            <View style={{ borderRadius: '16rpx', background: '#FFFFFF', padding: '24rpx 24rpx 0', overflow: 'hidden' }}>
              <AuthorRow post={post} onMore={() => setShowActions(true)} onFollow={() => void toggleFollow()} />
              {post.title ? <Text style={{ display: 'block', color: '#222F45', fontSize: '29rpx', lineHeight: '44rpx', fontWeight: 600, marginTop: '24rpx' }}>{post.title}</Text> : null}
              <Text style={{ display: 'block', color: '#333333', fontSize: '27rpx', lineHeight: '47rpx', marginTop: '22rpx' }}>{post.content}</Text>
              <ImageGrid images={post.imageUrls || []} />
              <View style={{ display: 'flex', alignItems: 'center', marginTop: '25rpx' }}>
                <Text style={{ color: '#999999', fontSize: '24rpx', lineHeight: '34rpx' }}>{relativeTime(post.createTime)}活跃</Text>
              </View>
              {post.topicName ? (
                <View onClick={() => void Taro.navigateTo({ url: `/pages/qianxun/topic?topicId=${post.topicId || ''}&topicName=${encodeURIComponent(post.topicName || '')}` })} style={{ width: 'fit-content', maxWidth: '480rpx', height: '50rpx', borderRadius: '25rpx', background: '#F0F5FC', padding: '0 20rpx', marginTop: '23rpx', display: 'flex', alignItems: 'center' }}>
                  <Text style={{ color: '#5C6572', fontSize: '24rpx' }}><Text style={{ color: '#258BFA' }}># </Text>{post.topicName}</Text>
                </View>
              ) : null}
              <View style={{ height: '84rpx', borderTop: '1rpx solid #EEF1F5', marginTop: '24rpx', display: 'flex', alignItems: 'center' }}>
                <View style={{ display: 'flex', alignItems: 'center' }}><View style={{ width: '42rpx', height: '42rpx', borderRadius: '21rpx', background: '#E6F2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: BLUE, fontSize: '20rpx', fontWeight: 700 }}>YO</Text></View><Text style={{ color: '#448BEE', fontSize: '24rpx', marginLeft: '10rpx' }}>悄悄话</Text></View>
                <View style={{ flex: 1 }} />
                <Text style={{ color: '#A6AAB3', fontSize: '25rpx', marginRight: '26rpx' }}>◯ {post.commentCount || 0}</Text>
                <View onClick={() => void likePost()} style={{ minWidth: '76rpx', height: '60rpx', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}><Text style={{ color: post.liked ? '#F06E78' : '#A6AAB3', fontSize: '27rpx' }}>{post.liked ? '♥' : '♡'} {post.likeCount || 0}</Text></View>
              </View>
            </View>

            <View style={{ marginTop: '18rpx', borderRadius: '16rpx', background: '#FFFFFF', minHeight: '490rpx', padding: '24rpx', boxSizing: 'border-box' }}>
              <View style={{ height: '48rpx', display: 'flex', alignItems: 'center' }}>
                <Text style={{ color: NAVY, fontSize: '28rpx', fontWeight: 600 }}>全部评论 {post.commentCount || 0}</Text>
                <View style={{ flex: 1 }} />
                <Text style={{ color: NAVY, fontSize: '23rpx', fontWeight: 500 }}>最新</Text>
                <Text style={{ color: '#A5A9B1', fontSize: '23rpx', marginLeft: '25rpx' }}>最早</Text>
              </View>
              {comments.length ? comments.map(item => <CommentRow key={item.id} comment={item} onReply={() => setComment(`回复 ${item.authorName || '用户'}：`)} />) : <CommentEmpty hasRemoteCount={post.commentCount > 0} />}
            </View>
          </View>
        </ScrollView>
      )}

      <View style={{ position: 'fixed', left: 0, right: 0, bottom: 0, minHeight: '104rpx', background: '#FFFFFF', borderTop: '1rpx solid #EDF0F4', padding: '14rpx 24rpx calc(14rpx + env(safe-area-inset-bottom))', display: 'flex', alignItems: 'center', boxSizing: 'border-box', zIndex: 20 }}>
        <Input value={comment} onInput={event => setComment(event.detail.value)} placeholder="我来说几句…" placeholderStyle="color:#A5A9B1;font-size:24rpx" style={{ flex: 1, height: '68rpx', borderRadius: '8rpx', background: '#F7F8FA', padding: '0 20rpx', fontSize: '25rpx', boxSizing: 'border-box' }} />
        <View onClick={() => void submitComment()} style={{ width: '68rpx', height: '68rpx', marginLeft: '14rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: comment.trim() && !sendingComment ? BLUE : '#B7BBC3', fontSize: '25rpx', fontWeight: 500 }}>{sendingComment ? '发送中' : '发送'}</Text></View>
        <View onClick={() => void likePost()} style={{ width: '58rpx', height: '68rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: post?.liked ? '#F06E78' : '#A6AAB3', fontSize: '34rpx' }}>{post?.liked ? '♥' : '♡'}</Text></View>
      </View>
      {showActions && post ? <ActionSheet post={post} onClose={() => setShowActions(false)} onReply={() => setShowActions(false)} onReport={() => void reportPost()} /> : null}
    </View>
  )
}

function DetailNav({ onMore }: { onMore: () => void }) {
  return <View style={{ position: 'relative', height: '168rpx', background: '#FFFFFF', boxSizing: 'border-box', zIndex: 10 }}>
    <View onClick={() => void Taro.navigateBack()} style={{ position: 'absolute', left: '18rpx', top: '88rpx', width: '80rpx', height: '68rpx', display: 'flex', alignItems: 'center' }}><Text style={{ color: '#6C7E99', fontSize: '54rpx', lineHeight: '60rpx' }}>‹</Text></View>
    <Text style={{ display: 'block', paddingTop: '97rpx', color: NAVY, fontSize: '28rpx', lineHeight: '42rpx', fontWeight: 600, textAlign: 'center' }}>动态详情</Text>
    <View onClick={onMore} style={{ position: 'absolute', right: '76rpx', top: '88rpx', width: '66rpx', height: '68rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#60738F', fontSize: '34rpx', letterSpacing: '3rpx' }}>•••</Text></View>
  </View>
}

function AuthorRow({ post, onMore, onFollow }: { post: CommunityPostVO; onMore: () => void; onFollow: () => void }) {
  const meta = [post.authorBirthYear ? `${String(post.authorBirthYear).slice(-2)}年` : post.authorAge ? `${post.authorAge}岁` : '', post.authorCity || '', post.authorProfession || post.authorZodiac || ''].filter(Boolean).join('·')
  return <View style={{ display: 'flex', alignItems: 'center' }}>
    <Image src={post.authorAvatar || miniappOssIcons.qianxunTopicAvatar} mode="aspectFill" style={{ width: '72rpx', height: '72rpx', borderRadius: '36rpx', background: '#EFF3F7', flexShrink: 0 }} />
    <View style={{ flex: 1, minWidth: 0, marginLeft: '16rpx' }}><Text style={{ display: 'block', color: '#26354A', fontSize: '26rpx', lineHeight: '36rpx', fontWeight: 600 }}>{post.authorName || '用户'}</Text><Text style={{ display: 'block', color: BLUE, fontSize: '21rpx', lineHeight: '30rpx', marginTop: '4rpx' }}>{meta || '资料待完善'}</Text></View>
    <View onClick={onFollow} style={{ width: '106rpx', height: '44rpx', borderRadius: '22rpx', background: post.followingAuthor ? '#F1F3F6' : BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: post.followingAuthor ? '#999999' : '#FFFFFF', fontSize: '21rpx' }}>{post.followingAuthor ? '已关注' : '申请认识'}</Text></View>
    <View onClick={onMore} style={{ width: '45rpx', height: '52rpx', marginLeft: '7rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#A5A9B1', fontSize: '34rpx' }}>⋮</Text></View>
  </View>
}

function ImageGrid({ images }: { images: string[] }) {
  if (!images.length) return null
  const visible = images.slice(0, 9)
  return <View style={{ display: 'flex', flexWrap: 'wrap', gap: '8rpx', marginTop: '24rpx' }}>{visible.map((url, index) => <Image key={`${url}-${index}`} src={url} mode="aspectFill" onClick={() => void Taro.previewImage({ current: url, urls: visible })} style={{ width: visible.length === 1 ? '654rpx' : '212rpx', height: visible.length === 1 ? '500rpx' : '212rpx', borderRadius: '6rpx', background: '#EDF1F5' }} />)}</View>
}

function CommentEmpty({ hasRemoteCount }: { hasRemoteCount: boolean }) {
  return <View style={{ paddingTop: '55rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <Image src={miniappOssIcons.qianxunEmptyMessage} mode="aspectFit" style={{ width: '230rpx', height: '180rpx' }} />
    <Text style={{ color: '#9DA3AE', fontSize: '24rpx', lineHeight: '36rpx', marginTop: '18rpx', textAlign: 'center' }}>{hasRemoteCount ? '评论列表暂时无法加载，请稍后再试' : '期待你的评论，发表讨论让动态有更多回应'}</Text>
  </View>
}

function CommentRow({ comment, onReply }: { comment: CommunityCommentVO; onReply: () => void }) {
  return <View onLongPress={onReply} style={{ display: 'flex', alignItems: 'flex-start', padding: '24rpx 0', borderBottom: '1rpx solid #F0F2F5' }}>
    <Image src={comment.authorAvatar || miniappOssIcons.qianxunTopicAvatar} mode="aspectFill" style={{ width: '64rpx', height: '64rpx', borderRadius: '32rpx', background: '#EEF2F6', flexShrink: 0 }} />
    <View style={{ flex: 1, minWidth: 0, marginLeft: '16rpx' }}>
      <View style={{ display: 'flex', alignItems: 'center' }}><Text style={{ color: '#43516A', fontSize: '23rpx', fontWeight: 600 }}>{comment.authorName || '用户'}</Text><View style={{ flex: 1 }} /><Text style={{ color: '#A7ACB5', fontSize: '20rpx' }}>{relativeTime(comment.createTime)}</Text></View>
      <Text style={{ display: 'block', color: '#333333', fontSize: '25rpx', lineHeight: '40rpx', marginTop: '10rpx' }}>{comment.replyUserName ? <Text style={{ color: BLUE }}>回复 {comment.replyUserName}：</Text> : null}{comment.content}</Text>
      <View onClick={onReply} style={{ width: '80rpx', height: '46rpx', marginTop: '7rpx', display: 'flex', alignItems: 'center' }}><Text style={{ color: '#8E96A3', fontSize: '21rpx' }}>回复</Text></View>
    </View>
  </View>
}

function DetailLoading() {
  return <View style={{ padding: '194rpx 24rpx 0' }}><View style={{ height: '580rpx', borderRadius: '16rpx', background: '#FFFFFF' }} /></View>
}

function LoadFailure({ text }: { text: string }) {
  return <View style={{ paddingTop: '300rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Image src={miniappOssIcons.qianxunEmptyMessage} mode="aspectFit" style={{ width: '240rpx', height: '190rpx' }} /><Text style={{ color: '#999999', fontSize: '26rpx', marginTop: '20rpx' }}>{text || '动态暂时无法查看'}</Text></View>
}

function ActionSheet({ post, onClose, onReply, onReport }: { post: CommunityPostVO; onClose: () => void; onReply: () => void; onReport: () => void }) {
  const copy = async () => {
    await Taro.setClipboardData({ data: post.content })
    onClose()
  }
  return <View onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,18,32,0.45)', zIndex: 100 }}><View onClick={event => event.stopPropagation()} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: '24rpx 24rpx 0 0', background: '#FFFFFF', paddingBottom: 'env(safe-area-inset-bottom)', overflow: 'hidden' }}>
    {[{ label: '回复', action: onReply }, { label: '复制', action: () => void copy() }, { label: '举报', action: onReport }].map(item => <View key={item.label} onClick={item.action} style={{ height: '92rpx', borderBottom: '1rpx solid #EFF1F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#333333', fontSize: '27rpx' }}>{item.label}</Text></View>)}
    <View onClick={onClose} style={{ height: '94rpx', background: '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#7B818B', fontSize: '27rpx' }}>取消</Text></View>
  </View></View>
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

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || '加载失败')
}

async function showError(error: unknown) {
  await Taro.showToast({ title: toErrorMessage(error), icon: 'none' })
}
