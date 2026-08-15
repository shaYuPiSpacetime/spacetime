import { Image, Input, ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useMemo, useState } from 'react'
import NativeNavigation, { getNativeNavigationMetrics } from '@/components/NativeNavigation'
import { QianxunActionStat, QianxunGenderIcon } from '@/components/QianxunCommunityIcons'
import { miniappOssIcons } from '@/constants/ossIcons'
import {
  buildCommunityCommentThreads,
  resolveCommentThreadRootId,
  type CommunityCommentSort,
  type CommunityCommentThread,
} from '@/domain/communityCommentThreads'
import {
  COMMUNITY_COPY_KEYS,
  createCommunityComment,
  deleteCommunityComment,
  getCommunityComments,
  getCommunityMeta,
  getCommunityPostDetail,
  hideCommunityAuthor,
  recordCommunityView,
  reportCommunityTarget,
  resolveCommunityCopy,
  resolveCommunityFeedback,
  toggleCommunityCommentLike,
  toggleCommunityFollow,
  toggleCommunityLike,
  unhideCommunityAuthor,
  type CommunityCommentVO,
  type CommunityConfig,
  type CommunityPostVO,
} from '@/services/community'
import {
  createWhisper,
  precheckWhisper,
  type RealWhisperPrecheckResult,
} from '@/services/message'
import { useAuthStore } from '@/stores/authStore'
import { usePrd01Store } from '@/stores/prd01Store'

const BLUE = '#2876FF'
const NAVY = '#0C285A'

interface ReplyTarget {
  commentId: number
  userId: number
  name: string
}

export default function QianxunPostDetailPage() {
  const currentUserId = useAuthStore(state => state.userId)
  const optionLabel = usePrd01Store(state => state.optionLabel)
  const [post, setPost] = useState<CommunityPostVO>()
  const [comments, setComments] = useState<CommunityCommentVO[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [comment, setComment] = useState('')
  const [commentFocused, setCommentFocused] = useState(false)
  const [replyTarget, setReplyTarget] = useState<ReplyTarget>()
  const [sendingComment, setSendingComment] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [selectedComment, setSelectedComment] = useState<CommunityCommentVO>()
  const [commentSort, setCommentSort] = useState<CommunityCommentSort>('latest')
  const [config, setConfig] = useState<CommunityConfig>()
  const [showWhisper, setShowWhisper] = useState(false)
  const [whisperContent, setWhisperContent] = useState('')
  const [whisperPrecheck, setWhisperPrecheck] = useState<RealWhisperPrecheckResult>()
  const [whisperLoading, setWhisperLoading] = useState(false)
  const [whisperSubmitting, setWhisperSubmitting] = useState(false)
  const [whisperIdempotencyKey, setWhisperIdempotencyKey] = useState('')
  const navigationMetrics = getNativeNavigationMetrics()
  const commentThreads = useMemo(
    () => buildCommunityCommentThreads(comments, commentSort),
    [comments, commentSort]
  )

  const loadPost = async (postId: number) => {
    setLoading(true)
    setLoadError('')
    try {
      const [runtime, current] = await Promise.all([getCommunityMeta(), getCommunityPostDetail(postId)])
      setConfig(runtime)
      setPost(current)
      void recordCommunityView(current.id).catch(() => undefined)
      try {
        const page = await getCommunityComments(postId, 1, 100)
        setComments(page.records || [])
      } catch {
        setComments([])
      }
    } catch (error) {
      setLoadError(resolveCommunityFeedback(config, COMMUNITY_COPY_KEYS.loadFailed, error))
    } finally {
      setLoading(false)
    }
  }

  useLoad(options => {
    const postId = Number(options.id)
    if (!Number.isFinite(postId) || postId <= 0) {
      setLoading(false)
      setLoadError(resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.postUnavailable))
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
      await showError(config, error)
    }
  }

  const submitComment = async () => {
    const content = comment.trim()
    if (!post || !content || sendingComment) return
    setSendingComment(true)
    try {
      const result = await createCommunityComment(post.id, content, replyTarget?.commentId, replyTarget?.userId)
      setComment('')
      setReplyTarget(undefined)
      setCommentFocused(false)
      const [detail, page] = await Promise.all([getCommunityPostDetail(post.id), getCommunityComments(post.id, 1, 100)])
      setPost(detail)
      setComments(page.records || [])
      if (result.message || result.statusName) await Taro.showToast({ title: result.message || result.statusName, icon: 'none' })
    } catch (error) {
      await showError(config, error)
    } finally {
      setSendingComment(false)
    }
  }

  const beginReply = (target?: ReplyTarget) => {
    setShowActions(false)
    setReplyTarget(target)
    setCommentFocused(false)
    setTimeout(() => setCommentFocused(true), 20)
  }

  const toggleFollow = async () => {
    if (!post) return
    try {
      const result = await toggleCommunityFollow(post.authorId)
      setPost(current => current ? { ...current, followingAuthor: result.following } : current)
      setShowActions(false)
    } catch (error) {
      await showError(config, error)
    }
  }

  const toggleAuthorPreference = async () => {
    if (!post) return
    try {
      const result = post.hiddenAuthor
        ? await unhideCommunityAuthor(post.authorUserNo || post.authorId)
        : await hideCommunityAuthor(post.authorUserNo || post.authorId)
      setPost(current => current ? { ...current, hiddenAuthor: result.hidden } : current)
      setShowActions(false)
      if (result.message) await Taro.showToast({ title: result.message, icon: 'none' })
    } catch (error) {
      await showError(config, error)
    }
  }

  const reportTarget = async (targetType: 'post' | 'comment', targetId: number | string) => {
    try {
      const runtime = config || await getCommunityMeta()
      setConfig(runtime)
      const reasons = runtime.reportReasons || []
      if (!reasons.length) {
        await Taro.showToast({ title: resolveCommunityCopy(runtime, COMMUNITY_COPY_KEYS.reportReasonUnavailable), icon: 'none' })
        return
      }
      const result = await Taro.showActionSheet({ itemList: reasons.map(item => item.label) })
      const reason = reasons[result.tapIndex]
      if (!reason) return
      const reportResult = await reportCommunityTarget(targetType, targetId, reason.code)
      setShowActions(false)
      setSelectedComment(undefined)
      await Taro.showToast({ title: resolveCommunityFeedback(runtime, COMMUNITY_COPY_KEYS.reportSubmitted, reportResult), icon: 'none' })
    } catch (error) {
      if (!String((error as { errMsg?: string })?.errMsg || error).includes('cancel')) await showError(config, error)
    }
  }

  const reportPost = async () => {
    if (post) await reportTarget('post', post.postNo || post.id)
  }

  const reportComment = async (target: CommunityCommentVO) => {
    await reportTarget('comment', target.commentNo || target.id)
  }

  const likeComment = async (target: CommunityCommentVO) => {
    try {
      const result = await toggleCommunityCommentLike(target.id)
      setComments(current => current.map(item => item.id === target.id ? { ...item, liked: result.liked, likeCount: result.likeCount } : item))
    } catch (error) {
      await showError(config, error)
    }
  }

  const deleteSelectedComment = async (target: CommunityCommentVO) => {
    if (!post || target.authorId !== currentUserId) return
    const confirmation = await Taro.showModal({
      title: '温馨提示',
      content: '确定删除这条评论吗？',
      cancelText: '取消',
      confirmText: '删除',
      confirmColor: '#E62828',
    })
    if (!confirmation.confirm) return
    try {
      await deleteCommunityComment(target.commentNo || target.id)
      const [detail, page] = await Promise.all([getCommunityPostDetail(post.id), getCommunityComments(post.id, 1, 100)])
      setPost(detail)
      setComments(page.records || [])
      setSelectedComment(undefined)
    } catch (error) {
      await showError(config, error)
    }
  }

  const openWhisper = async () => {
    if (!post || whisperLoading) return
    if (post.authorId === currentUserId) {
      await Taro.showToast({ title: '不能给自己发送悄悄话', icon: 'none' })
      return
    }
    const targetUserNo = resolveAuthorUserNo(post)
    if (!targetUserNo || !post.postNo) {
      await Taro.showToast({ title: '当前用户暂时无法申请认识', icon: 'none' })
      return
    }
    setShowWhisper(true)
    setWhisperLoading(true)
    setWhisperPrecheck(undefined)
    setWhisperIdempotencyKey(createWhisperIdempotencyKey())
    try {
      const result = await precheckWhisper({
        targetUserNo,
        sourcePostNo: post.postNo,
        scene: 'community_post',
      })
      setWhisperPrecheck(result)
    } catch (error) {
      setShowWhisper(false)
      await Taro.showToast({
        title: error instanceof Error ? error.message : '悄悄话预检查失败，请稍后重试',
        icon: 'none',
      })
    } finally {
      setWhisperLoading(false)
    }
  }

  const submitWhisper = async () => {
    const content = whisperContent.trim()
    if (!post || !whisperPrecheck || whisperSubmitting) return
    if (!whisperPrecheck.allowed) {
      await Taro.showToast({ title: whisperPrecheck.reasonText || '当前暂时无法发送悄悄话', icon: 'none' })
      return
    }
    if (!content || Array.from(content).length > whisperPrecheck.contentMaxLength) {
      await Taro.showToast({ title: `请输入1-${whisperPrecheck.contentMaxLength}个字`, icon: 'none' })
      return
    }
    setWhisperSubmitting(true)
    try {
      const result = await createWhisper({
        targetUserNo: resolveAuthorUserNo(post),
        sourcePostNo: post.postNo,
        scene: 'community_post',
        content,
        quoteToken: whisperPrecheck.quoteToken,
      }, whisperIdempotencyKey)
      setShowWhisper(false)
      setWhisperContent('')
      setWhisperPrecheck(undefined)
      await Taro.showToast({
        title: result.payType === 'free' || result.paymentMethod === 'free_quota'
          ? '悄悄话已发送，本次使用免费权益'
          : `悄悄话已发送，消耗${result.coinAmount ?? result.coinCost ?? 0}千寻币`,
        icon: 'success',
      })
    } catch (error) {
      await Taro.showToast({
        title: error instanceof Error ? error.message : '发送失败，请稍后重试',
        icon: 'none',
      })
    } finally {
      setWhisperSubmitting(false)
    }
  }

  return (
    <View id="qianxun-post-detail-page" style={{ height: '100vh', background: '#F8F9FB', overflow: 'hidden', color: '#333333' }}>
      <NativeNavigation title="动态详情" />
      {loading ? <DetailLoading top={navigationMetrics.navigationHeight} /> : loadError || !post ? <LoadFailure text={loadError} top={navigationMetrics.navigationHeight} /> : (
        <ScrollView scrollY style={{ position: 'absolute', left: 0, right: 0, top: `${navigationMetrics.navigationHeight}rpx`, bottom: '104rpx' }} showScrollbar={false}>
          <View style={{ padding: '18rpx 25rpx 40rpx' }}>
            <View style={{ borderRadius: '16rpx', background: '#FFFFFF', padding: '24rpx 24rpx 0', overflow: 'hidden' }}>
              <AuthorRow post={post} onMore={() => setShowActions(true)} onApply={() => void openWhisper()} />
              {post.title ? <Text style={{ display: 'block', color: '#222F45', fontSize: '29rpx', lineHeight: '44rpx', fontWeight: 600, marginTop: '24rpx' }}>{post.title}</Text> : null}
              <Text style={{ display: 'block', color: '#333333', fontSize: '27rpx', lineHeight: '47rpx', marginTop: '22rpx' }}>{post.content}</Text>
              <ImageGrid images={post.imageUrls || []} />
              <View style={{ display: 'flex', alignItems: 'center', marginTop: '25rpx' }}>
                <Text style={{ color: '#999999', fontSize: '24rpx', lineHeight: '34rpx' }}>{relativeTime(post.createTime)}活跃</Text>
              </View>
              {post.topicName ? (
                <View id="qianxun-post-topic" onClick={() => void Taro.navigateTo({ url: `/pages/qianxun/topic?topicId=${post.topicId || ''}&topicName=${encodeURIComponent(post.topicName || '')}` })} style={{ width: 'fit-content', maxWidth: '480rpx', height: '50rpx', borderRadius: '25rpx', background: '#F0F5FC', padding: '0 20rpx', marginTop: '23rpx', display: 'flex', alignItems: 'center' }}>
                  <Text style={{ color: '#5C6572', fontSize: '24rpx' }}><Text style={{ color: '#258BFA' }}># </Text>{post.topicName}</Text>
                </View>
              ) : null}
              <View style={{ height: '92rpx', borderTop: '1rpx solid #EEF1F5', marginTop: '24rpx', display: 'flex', alignItems: 'center' }}>
                <View onClick={() => void openWhisper()} style={{ height: '88rpx', display: 'flex', alignItems: 'center' }}><Image src={miniappOssIcons.qianxunWhisper} mode="aspectFit" style={{ width: '42rpx', height: '42rpx' }} /><Text style={{ color: '#448BEE', fontSize: '24rpx', marginLeft: '10rpx' }}>悄悄话</Text></View>
                <View style={{ flex: 1 }} />
                <QianxunActionStat kind="comment" count={post.commentCount || 0} onClick={() => void Taro.navigateTo({ url: `/pages/qianxun/interactions?postId=${post.id}&interactionType=commented` })} fontSize="25rpx" />
                <QianxunActionStat kind="like" count={post.likeCount || 0} active={post.liked} onClick={() => void likePost()} fontSize="25rpx" />
              </View>
            </View>

            <View style={{ marginTop: '18rpx', borderRadius: '16rpx', background: '#FFFFFF', minHeight: comments.length ? '490rpx' : '816rpx', padding: '24rpx 27rpx', boxSizing: 'border-box' }}>
              <View style={{ height: '48rpx', display: 'flex', alignItems: 'center' }}>
                <Text style={{ color: NAVY, fontSize: '28rpx', fontWeight: 600 }}>全部评论 {post.commentCount || 0}</Text>
                <View style={{ flex: 1 }} />
                <Text onClick={() => setCommentSort('latest')} style={{ color: commentSort === 'latest' ? NAVY : '#A5A9B1', fontSize: '23rpx', fontWeight: commentSort === 'latest' ? 500 : 400 }}>最新</Text>
                <View style={{ width: '1rpx', height: '28rpx', background: '#E6E9EF', margin: '0 14rpx' }} />
                <Text onClick={() => setCommentSort('earliest')} style={{ color: commentSort === 'earliest' ? NAVY : '#A5A9B1', fontSize: '23rpx', fontWeight: commentSort === 'earliest' ? 500 : 400 }}>最早</Text>
              </View>
              {commentThreads.length ? commentThreads.map(thread => (
                <CommentThread
                  key={thread.root.id}
                  thread={thread}
                  postAuthorId={post.authorId}
                  optionLabel={optionLabel}
                  onReply={(target, rootId) => beginReply({ commentId: rootId, userId: target.authorId, name: target.authorName || resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.profileUnknownUser) })}
                  onLike={target => void likeComment(target)}
                  onMore={target => setSelectedComment(target)}
                />
              )) : <CommentEmpty hasRemoteCount={post.commentCount > 0} config={config} />}
            </View>
          </View>
        </ScrollView>
      )}

      <View style={{ position: 'fixed', left: 0, right: 0, bottom: 0, minHeight: '104rpx', background: '#FFFFFF', borderTop: '1rpx solid #EDF0F4', padding: '14rpx 24rpx calc(14rpx + env(safe-area-inset-bottom))', display: 'flex', alignItems: 'center', boxSizing: 'border-box', zIndex: 20 }}>
        <Input id="qianxun-comment-input" value={comment} focus={commentFocused} confirmType="send" onFocus={() => setCommentFocused(true)} onBlur={() => setCommentFocused(false)} onConfirm={() => void submitComment()} onInput={event => setComment(event.detail.value)} placeholder={replyTarget ? `回复 ${replyTarget.name}…` : '我来说几句…'} placeholderStyle="color:#A5A9B1;font-size:24rpx" style={{ flex: 1, height: '68rpx', borderRadius: '8rpx', background: '#F7F8FA', padding: '0 20rpx', fontSize: '25rpx', boxSizing: 'border-box' }} />
        <View onClick={() => void submitComment()} style={{ width: '68rpx', height: '68rpx', marginLeft: '14rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: comment.trim() && !sendingComment ? BLUE : '#B7BBC3', fontSize: '25rpx', fontWeight: 500 }}>{sendingComment ? resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.commentSending) : '发送'}</Text></View>
        <View onClick={() => void likePost()} style={{ width: '88rpx', height: '68rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Image src={post?.liked ? miniappOssIcons.qianxunLikeActive : miniappOssIcons.qianxunLike} mode="aspectFit" style={{ width: '36rpx', height: '36rpx' }} /></View>
      </View>
      {showActions && post ? <ActionSheet post={post} onClose={() => setShowActions(false)} onFollow={() => void toggleFollow()} onHide={() => void toggleAuthorPreference()} onReport={() => void reportPost()} /> : null}
      {selectedComment ? <CommentActionSheet comment={selectedComment} onClose={() => setSelectedComment(undefined)} onReply={() => beginReply({ commentId: resolveCommentThreadRootId(comments, selectedComment.id), userId: selectedComment.authorId, name: selectedComment.authorName || resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.profileUnknownUser) })} onDelete={selectedComment.authorId === currentUserId ? () => void deleteSelectedComment(selectedComment) : undefined} onReport={() => void reportComment(selectedComment)} /> : null}
      {showWhisper && post ? (
        <WhisperComposeSheet
          post={post}
          content={whisperContent}
          precheck={whisperPrecheck}
          loading={whisperLoading}
          submitting={whisperSubmitting}
          onContentChange={setWhisperContent}
          onClose={() => {
            if (whisperSubmitting) return
            setShowWhisper(false)
            setWhisperPrecheck(undefined)
          }}
          onSubmit={() => void submitWhisper()}
        />
      ) : null}
    </View>
  )
}

function AuthorRow({ post, onMore, onApply }: { post: CommunityPostVO; onMore: () => void; onApply: () => void }) {
  const meta = [post.authorBirthYear ? `${String(post.authorBirthYear).slice(-2)}年` : post.authorAge ? `${post.authorAge}岁` : '', post.authorCity || '', post.authorProfession || post.authorZodiac || ''].filter(Boolean).join('·')
  return <View style={{ display: 'flex', alignItems: 'center' }}>
    <Image src={post.authorAvatar || miniappOssIcons.qianxunTopicAvatar} mode="aspectFill" style={{ width: '72rpx', height: '72rpx', borderRadius: '36rpx', background: '#EFF3F7', flexShrink: 0 }} />
    <View style={{ flex: 1, minWidth: 0, marginLeft: '16rpx' }}><View style={{ display: 'flex', alignItems: 'center' }}><Text style={{ color: '#26354A', fontSize: '26rpx', lineHeight: '36rpx', fontWeight: 600 }}>{post.authorName || '用户'}</Text><View style={{ marginLeft: '12rpx', display: 'flex' }}><QianxunGenderIcon gender={post.authorGender} /></View></View><Text style={{ display: 'block', color: BLUE, fontSize: '21rpx', lineHeight: '30rpx', marginTop: '4rpx' }}>{meta || '资料待完善'}</Text></View>
    <View id="qianxun-post-apply-whisper" onClick={onApply} style={{ width: '106rpx', height: '44rpx', borderRadius: '22rpx', background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '21rpx' }}>申请认识</Text></View>
    <View onClick={onMore} style={{ width: '45rpx', height: '52rpx', marginLeft: '7rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#A5A9B1', fontSize: '34rpx' }}>⋮</Text></View>
  </View>
}

function WhisperComposeSheet({
  post,
  content,
  precheck,
  loading,
  submitting,
  onContentChange,
  onClose,
  onSubmit,
}: {
  post: CommunityPostVO
  content: string
  precheck?: RealWhisperPrecheckResult
  loading: boolean
  submitting: boolean
  onContentChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  const maxLength = precheck?.contentMaxLength || 60
  const length = Array.from(content).length
  const disabled = loading || submitting || !precheck?.allowed || length < 1 || length > maxLength
  const meta = [
    post.authorAge ? `${post.authorAge}岁` : '',
    post.authorZodiac || '',
    post.authorProfession || '',
  ].filter(Boolean).join('  ')
  const costText = loading
    ? '查询中…'
    : precheck?.free
      ? '今日免费'
      : `${precheck?.coinAmount ?? '--'}`

  return (
    <View
      id="qianxun-whisper-compose-sheet"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 30000, background: 'rgba(21,29,38,.34)' }}
    >
      <View
        onClick={event => event.stopPropagation()}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: '844rpx', borderRadius: '32rpx 32rpx 0 0', background: 'linear-gradient(180deg,#F1FAFF 0%,#FFFFFF 30%)', padding: '54rpx 25rpx calc(36rpx + env(safe-area-inset-bottom))', boxSizing: 'border-box' }}
      >
        <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#333333', fontSize: '34rpx', lineHeight: '48rpx', fontWeight: 600 }}>悄悄话</Text>
          <View style={{ width: '48rpx', height: '48rpx', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '8rpx' }}>
            <Text style={{ color: '#9AA1AB', fontSize: '28rpx' }}>?</Text>
          </View>
        </View>
        <Text style={{ display: 'block', color: '#333333', fontSize: '26rpx', lineHeight: '40rpx', textAlign: 'center', marginTop: '14rpx' }}>—第一时间抓住ta的目光—</Text>

        <View style={{ display: 'flex', alignItems: 'center', marginTop: '50rpx', padding: '0 4rpx' }}>
          <Image src={post.authorAvatar || miniappOssIcons.qianxunTopicAvatar} mode="aspectFill" style={{ width: '84rpx', height: '84rpx', borderRadius: '42rpx', background: '#EEF2F6', flexShrink: 0 }} />
          <View style={{ minWidth: 0, marginLeft: '22rpx' }}>
            <Text style={{ display: 'block', color: '#333333', fontSize: '30rpx', lineHeight: '42rpx', fontWeight: 600 }}>{post.authorName || '用户'}</Text>
            <Text style={{ display: 'block', color: '#666666', fontSize: '25rpx', lineHeight: '36rpx', marginTop: '8rpx' }}>{meta || '资料待完善'}</Text>
          </View>
        </View>

        <View style={{ position: 'relative', height: '238rpx', border: `4rpx solid ${BLUE}`, borderRadius: '16rpx', marginTop: '38rpx', background: '#FFFFFF', boxSizing: 'border-box' }}>
          <Textarea
            value={content}
            maxlength={maxLength}
            disabled={loading || submitting}
            placeholder="写点什么···"
            placeholderStyle="color:#999999"
            onInput={event => onContentChange(event.detail.value)}
            style={{ width: '100%', height: '184rpx', padding: '30rpx 34rpx 8rpx', color: '#333333', fontSize: '27rpx', lineHeight: '42rpx', boxSizing: 'border-box' }}
          />
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
        {!precheck?.allowed && precheck?.reasonText ? <Text style={{ display: 'block', color: '#E35C5C', fontSize: '22rpx', textAlign: 'center', marginTop: '14rpx' }}>{precheck.reasonText}</Text> : null}
        <View style={{ marginTop: '45rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: '72rpx', height: '38rpx', borderRadius: '20rpx', background: '#333333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#D9A942', fontSize: '22rpx' }}>◇</Text></View>
          <Text style={{ color: '#333333', fontSize: '26rpx', marginLeft: '12rpx' }}>开通<Text style={{ color: '#E7B64E' }}>时空邂逅会员</Text>每天一个悄悄话</Text>
        </View>
      </View>
    </View>
  )
}

function ImageGrid({ images }: { images: string[] }) {
  if (!images.length) return null
  const visible = images.slice(0, 9)
  return <View style={{ display: 'flex', flexWrap: 'wrap', gap: '8rpx', marginTop: '24rpx' }}>{visible.map((url, index) => <Image key={`${url}-${index}`} src={url} mode="aspectFill" onClick={() => void Taro.previewImage({ current: url, urls: visible })} style={{ width: visible.length === 1 ? '654rpx' : '212rpx', height: visible.length === 1 ? '500rpx' : '212rpx', borderRadius: '6rpx', background: '#EDF1F5' }} />)}</View>
}

function CommentEmpty({ hasRemoteCount, config }: { hasRemoteCount: boolean; config?: CommunityConfig }) {
  return <View style={{ paddingTop: '55rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <Image src={miniappOssIcons.qianxunEmptyMessage} mode="aspectFit" style={{ width: '230rpx', height: '180rpx' }} />
    <Text style={{ color: '#9DA3AE', fontSize: '24rpx', lineHeight: '36rpx', marginTop: '18rpx', textAlign: 'center' }}>{resolveCommunityCopy(config, hasRemoteCount ? COMMUNITY_COPY_KEYS.postCommentsUnavailable : COMMUNITY_COPY_KEYS.postCommentsEmpty)}</Text>
  </View>
}

function CommentThread({ thread, postAuthorId, optionLabel, onReply, onLike, onMore }: { thread: CommunityCommentThread<CommunityCommentVO>; postAuthorId: number; optionLabel: (type: 'occupation', code?: string) => string; onReply: (target: CommunityCommentVO, rootId: number) => void; onLike: (target: CommunityCommentVO) => void; onMore: (target: CommunityCommentVO) => void }) {
  const root = thread.root
  const meta = formatCommentAuthorMeta(root, optionLabel)
  return <View className="qianxun-comment-thread" style={{ padding: '24rpx 0', borderBottom: '1rpx solid #EFF4FC' }}>
    <View style={{ display: 'flex', alignItems: 'flex-start' }}>
      <Image src={root.authorAvatar || miniappOssIcons.qianxunTopicAvatar} mode="aspectFill" style={{ width: '80rpx', height: '80rpx', borderRadius: '40rpx', background: '#EEF2F6', flexShrink: 0 }} />
      <View onClick={() => onReply(root, root.id)} onLongPress={() => onMore(root)} style={{ flex: 1, minWidth: 0, marginLeft: '20rpx' }}>
        <View style={{ display: 'flex', alignItems: 'center', minHeight: '37rpx' }}><Text style={{ color: '#333333', fontSize: '26rpx', lineHeight: '37rpx', fontWeight: 500 }}>{root.authorName || '用户'}</Text><View style={{ marginLeft: '10rpx', display: 'flex' }}><QianxunGenderIcon gender={root.authorGender} size="28rpx" /></View></View>
        {meta ? <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '34rpx', marginTop: '5rpx' }}>{meta}</Text> : null}
        <Text style={{ display: 'block', color: '#333333', fontSize: '26rpx', lineHeight: '40rpx', marginTop: '24rpx' }}>{root.content}</Text>
        <CommentMetaRow comment={root} onLike={() => onLike(root)} />
      </View>
    </View>
    {thread.replies.map(reply => (
      <View key={reply.id} className="qianxun-comment-child" style={{ display: 'flex', alignItems: 'flex-start', marginLeft: '100rpx', marginTop: '26rpx' }}>
        <Image src={reply.authorAvatar || miniappOssIcons.qianxunTopicAvatar} mode="aspectFill" style={{ width: '48rpx', height: '48rpx', borderRadius: '24rpx', background: '#EEF2F6', flexShrink: 0 }} />
        <View onClick={() => onReply(reply, root.id)} onLongPress={() => onMore(reply)} style={{ flex: 1, minWidth: 0, marginLeft: '20rpx' }}>
          <View style={{ display: 'flex', alignItems: 'center', minHeight: '34rpx' }}><Text style={{ color: '#333333', fontSize: '24rpx', lineHeight: '34rpx', fontWeight: 500 }}>{reply.authorName || '用户'}</Text>{reply.authorId === postAuthorId ? <View style={{ height: '30rpx', borderRadius: '8rpx', background: '#E3F1FE', padding: '0 9rpx', marginLeft: '10rpx', display: 'flex', alignItems: 'center' }}><Text style={{ color: BLUE, fontSize: '20rpx', lineHeight: '28rpx' }}>楼主</Text></View> : null}</View>
          <Text style={{ display: 'block', color: '#333333', fontSize: '24rpx', lineHeight: '38rpx', marginTop: '15rpx' }}>{reply.replyUserName ? <Text style={{ color: '#999999' }}>回复 {reply.replyUserName}： </Text> : null}{reply.content}</Text>
          <CommentMetaRow comment={reply} onLike={() => onLike(reply)} />
        </View>
      </View>
    ))}
  </View>
}

function CommentMetaRow({ comment, onLike }: { comment: CommunityCommentVO; onLike: () => void }) {
  return <View className="qianxun-comment-meta-row" style={{ height: '34rpx', marginTop: '20rpx', display: 'flex', alignItems: 'center' }}>
    <Text style={{ color: '#999999', fontSize: '24rpx', lineHeight: '34rpx' }}>{relativeTime(comment.createTime)}</Text>
    <View style={{ flex: 1 }} />
    <View onClick={event => { event.stopPropagation(); onLike() }} style={{ minWidth: '80rpx', height: '44rpx', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}><Image src={comment.liked ? miniappOssIcons.qianxunLikeActive : miniappOssIcons.qianxunLike} mode="aspectFit" style={{ width: '28rpx', height: '26rpx' }} /><Text style={{ color: comment.liked ? '#FF7078' : '#999999', fontSize: '24rpx', lineHeight: '34rpx', marginLeft: '10rpx' }}>{Math.max(0, Number(comment.likeCount) || 0)}</Text></View>
  </View>
}

function formatCommentAuthorMeta(comment: CommunityCommentVO, optionLabel: (type: 'occupation', code?: string) => string) {
  const year = comment.authorBirthYear ? `${String(comment.authorBirthYear).slice(-2)}年` : ''
  const city = comment.authorCity || ''
  const profession = comment.authorProfession ? optionLabel('occupation', comment.authorProfession) || comment.authorProfession : ''
  return [year, city, profession].filter(Boolean).join('·')
}

function DetailLoading({ top }: { top: number }) {
  return <View style={{ position: 'absolute', left: 0, right: 0, top: `${top + 26}rpx`, padding: '0 24rpx' }}><View style={{ height: '580rpx', borderRadius: '16rpx', background: '#FFFFFF' }} /></View>
}

function LoadFailure({ text, top }: { text: string; top: number }) {
  return <View style={{ position: 'absolute', left: 0, right: 0, top: `${top + 132}rpx`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Image src={miniappOssIcons.qianxunEmptyMessage} mode="aspectFit" style={{ width: '240rpx', height: '190rpx' }} /><Text style={{ color: '#999999', fontSize: '26rpx', marginTop: '20rpx' }}>{text}</Text></View>
}

function ActionSheet({ post, onClose, onFollow, onHide, onReport }: { post: CommunityPostVO; onClose: () => void; onFollow: () => void; onHide: () => void; onReport: () => void }) {
  const share = () => {
    void Taro.showShareMenu({ withShareTicket: true })
    onClose()
  }
  return <View onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,18,32,0.45)', zIndex: 100 }}><View onClick={event => event.stopPropagation()} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: '24rpx 24rpx 0 0', background: '#FFFFFF', paddingBottom: 'env(safe-area-inset-bottom)', overflow: 'hidden' }}>
    {[{ label: '分享', action: share }, { label: post.followingAuthor ? '取消关注' : '关注', action: onFollow }, { label: post.hiddenAuthor ? '取消不看 TA 动态' : '不看 TA 动态', action: onHide }, { label: '举报', action: onReport }].map(item => <View key={item.label} onClick={item.action} style={{ height: '92rpx', borderBottom: '1rpx solid #EFF1F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#333333', fontSize: '27rpx' }}>{item.label}</Text></View>)}
    <View onClick={onClose} style={{ height: '94rpx', background: '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#7B818B', fontSize: '27rpx' }}>取消</Text></View>
  </View></View>
}

function CommentActionSheet({ comment, onClose, onReply, onDelete, onReport }: { comment: CommunityCommentVO; onClose: () => void; onReply: () => void; onDelete?: () => void; onReport: () => void }) {
  const copy = async () => {
    await Taro.setClipboardData({ data: comment.content })
    onClose()
  }
  const reply = () => {
    onClose()
    onReply()
  }
  const actions = [{ label: '回复', action: reply }, { label: '复制', action: () => void copy() }, ...(onDelete ? [{ label: '删除', action: onDelete }] : []), { label: '举报', action: onReport }]
  return <View onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,18,32,0.45)', zIndex: 100 }}><View onClick={event => event.stopPropagation()} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: '24rpx 24rpx 0 0', background: '#FFFFFF', paddingBottom: 'env(safe-area-inset-bottom)', overflow: 'hidden' }}>{actions.map(item => <View key={item.label} onClick={item.action} style={{ height: '92rpx', borderBottom: '1rpx solid #EFF1F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: item.label === '删除' ? '#E62828' : '#333333', fontSize: '27rpx' }}>{item.label}</Text></View>)}<View onClick={onClose} style={{ height: '94rpx', background: '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#7B818B', fontSize: '27rpx' }}>取消</Text></View></View></View>
}

function resolveAuthorUserNo(post: CommunityPostVO) {
  if (post.authorUserNo) return post.authorUserNo
  return `USR-${String(post.authorId).padStart(12, '0')}`
}

function createWhisperIdempotencyKey() {
  return `whisper-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
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

async function showError(config: CommunityConfig | undefined, error: unknown) {
  await Taro.showToast({ title: resolveCommunityFeedback(config, COMMUNITY_COPY_KEYS.genericError, error), icon: 'none' })
}
