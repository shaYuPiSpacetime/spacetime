import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import { deleteCommunityPost, getFollowingCount } from '@/services/community'
import { prd01Api } from '@/services/prd01'
import { useAuthStore } from '@/stores/authStore'
import { normalizeAvatarUrl } from '@/utils/avatar'
import defaultAvatar from '@/assets/profile/default-avatar.webp'

const BLUE = '#2876FF'
const NAVY = '#0C285A'
const MY_POST_RECEIPTS_KEY = 'qianxun_my_post_receipts'

type ReceiptStatus = 'publishing' | 'failed' | 'published'

interface MyPostReceipt {
  id: string
  postId?: number
  status: ReceiptStatus
  content: string
  imageUrls: string[]
  topicName?: string
  createdAt: string
  commentCount: number
  likeCount: number
  failureMessage?: string
}

interface ProfileSummary {
  nickname: string
  avatar: string
  description: string
  postCount: number
  followingCount: number
  followerCount: number
  receivedLikeCount: number
}

const emptyProfile: ProfileSummary = {
  nickname: '待完善昵称',
  avatar: defaultAvatar,
  description: '完善资料，让更多人认识你',
  postCount: 0,
  followingCount: 0,
  followerCount: 0,
  receivedLikeCount: 0,
}

export default function QianxunMyPostsPage() {
  const [profile, setProfile] = useState<ProfileSummary>(emptyProfile)
  const [receipts, setReceipts] = useState<MyPostReceipt[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<MyPostReceipt>()
  const [sheetVisible, setSheetVisible] = useState(false)
  const [failureReceipt, setFailureReceipt] = useState<MyPostReceipt>()
  const [deleteReceipt, setDeleteReceipt] = useState<MyPostReceipt>()

  useDidShow(() => {
    void loadPage()
  })

  const loadPage = async () => {
    setLoading(true)
    const localReceipts = readReceipts()
    setReceipts(localReceipts)
    try {
      const [home, followingCount] = await Promise.all([
        prd01Api.getHomeDetail(),
        getFollowingCount(),
      ])
      const auth = useAuthStore.getState()
      const source = home.profile || {}
      setProfile({
        nickname: String(source.nickname || auth.nickname || emptyProfile.nickname),
        avatar: normalizeAvatarUrl(String(source.avatar || auth.avatar || ''), defaultAvatar),
        description: buildProfileDescription(source),
        postCount: Math.max(readNonNegativeNumber(source.postCount ?? source.dynamicCount), localReceipts.length),
        followingCount: readNonNegativeNumber(followingCount),
        followerCount: readNonNegativeNumber(source.followerCount ?? source.fansCount),
        receivedLikeCount: readNonNegativeNumber(source.beLikedCount ?? source.receivedLikeCount),
      })
    } catch (error) {
      await showError(error)
    } finally {
      setLoading(false)
    }
  }

  const openActions = (receipt: MyPostReceipt) => {
    setSelected(receipt)
    setSheetVisible(true)
  }

  const editSelected = async () => {
    if (!selected) return
    setSheetVisible(false)
    if (selected.status === 'published') {
      await Taro.showToast({ title: '已发布动态暂不支持编辑', icon: 'none' })
      return
    }
    await Taro.navigateTo({ url: '/pages/qianxun/compose' })
  }

  const requestDeleteSelected = () => {
    if (!selected) return
    setSheetVisible(false)
    setDeleteReceipt(selected)
  }

  const confirmDelete = async () => {
    if (!deleteReceipt) return
    try {
      if (deleteReceipt.status === 'published' && deleteReceipt.postId) {
        await deleteCommunityPost(deleteReceipt.postId)
      }
      const next = receipts.filter(item => item.id !== deleteReceipt.id)
      setReceipts(next)
      Taro.setStorageSync(MY_POST_RECEIPTS_KEY, next)
      setSelected(undefined)
      setDeleteReceipt(undefined)
      await Taro.showToast({ title: '已删除', icon: 'success' })
    } catch (error) {
      await showError(error)
    }
  }

  return (
    <View id="qianxun-my-posts-page" style={{ height: '100vh', background: 'linear-gradient(105deg, #EEFFFC 0%, #F2F6FF 55%, #FEFFF4 100%)', overflow: 'hidden' }}>
      <ProfileHeader profile={profile} />
      <View style={{ position: 'absolute', left: '25rpx', right: '25rpx', top: '544rpx', bottom: 0, borderRadius: '32rpx 32rpx 0 0', background: '#FFFFFF', overflow: 'hidden' }}>
        <MainTabs />
        <ScrollView scrollY style={{ height: 'calc(100% - 104rpx)' }} showScrollbar={false}>
          <View style={{ padding: '0 25rpx 60rpx' }}>
            <PublishBanner />
            {loading ? <MyPostsLoading /> : receipts.length ? receipts.map(receipt => (
              <MyPostCard key={receipt.id} receipt={receipt} onMore={() => openActions(receipt)} onFailure={() => setFailureReceipt(receipt)} />
            )) : <MyPostsEmpty />}
            {receipts.length ? <Text style={{ display: 'block', color: '#B1B1B1', fontSize: '22rpx', lineHeight: '32rpx', textAlign: 'center', marginTop: '42rpx' }}>— 到底啦 —</Text> : null}
          </View>
        </ScrollView>
      </View>
      {sheetVisible && selected ? <PostActionSheet onEdit={() => void editSelected()} onDelete={requestDeleteSelected} onClose={() => setSheetVisible(false)} /> : null}
      {deleteReceipt ? <DeleteConfirmDialog onCancel={() => setDeleteReceipt(undefined)} onConfirm={() => void confirmDelete()} /> : null}
      {failureReceipt ? <PublishFailureDialog receipt={failureReceipt} onClose={() => setFailureReceipt(undefined)} /> : null}
    </View>
  )
}

function ProfileHeader({ profile }: { profile: ProfileSummary }) {
  const stats = [
    { label: '动态', value: profile.postCount, onClick: undefined },
    { label: '关注', value: profile.followingCount, onClick: () => void Taro.navigateTo({ url: '/pages/qianxun/interactions' }) },
    { label: '粉丝', value: profile.followerCount, onClick: () => void Taro.navigateTo({ url: '/pages/qianxun/interactions' }) },
    { label: '获赞', value: profile.receivedLikeCount, onClick: () => void Taro.navigateTo({ url: '/pages/qianxun/interactions' }) },
  ]
  return (
    <View style={{ height: '544rpx', position: 'relative' }}>
      <View style={{ width: '750rpx', height: '168rpx', paddingTop: '94rpx', boxSizing: 'border-box', position: 'relative' }}>
        <View onClick={() => void Taro.navigateBack()} style={{ position: 'absolute', left: '18rpx', top: '88rpx', width: '86rpx', height: '74rpx', display: 'flex', alignItems: 'center' }}><Text style={{ color: '#667B9A', fontSize: '58rpx', lineHeight: '64rpx', fontWeight: 300 }}>‹</Text></View>
        <Text style={{ display: 'block', color: NAVY, fontSize: '32rpx', fontWeight: 600, lineHeight: '45rpx', textAlign: 'center' }}>千寻互动</Text>
      </View>
      <View style={{ position: 'absolute', left: '33rpx', top: '294rpx', right: '30rpx', height: '100rpx', display: 'flex', alignItems: 'center' }}>
        <Image src={profile.avatar} mode="aspectFill" style={{ width: '80rpx', height: '80rpx', borderRadius: '40rpx', border: '5rpx solid #FFFFFF', boxSizing: 'border-box', background: '#EDF1F6' }} />
        <View style={{ marginLeft: '20rpx', minWidth: 0 }}>
          <Text style={{ display: 'block', color: '#222222', fontSize: '31rpx', lineHeight: '44rpx', fontWeight: 600 }}>{profile.nickname}</Text>
          <Text style={{ display: 'block', color: '#999999', fontSize: '23rpx', lineHeight: '34rpx', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.description}</Text>
        </View>
      </View>
      <View style={{ position: 'absolute', left: '28rpx', top: '442rpx', width: '510rpx', height: '62rpx', display: 'flex', alignItems: 'center' }}>
        {stats.map(item => <View key={item.label} onClick={item.onClick} style={{ minWidth: '116rpx', height: '62rpx', marginRight: '5rpx', display: 'flex', alignItems: 'center' }}><Text style={{ color: '#9A9FA8', fontSize: '22rpx', marginRight: '10rpx' }}>{item.label}</Text><Text style={{ color: NAVY, fontSize: '30rpx', fontWeight: 600 }}>{item.value}</Text></View>)}
      </View>
    </View>
  )
}

function MainTabs() {
  const tabs = [
    { label: '互动', onClick: () => void Taro.redirectTo({ url: '/pages/qianxun/interactions' }) },
    { label: '浏览记录', onClick: () => void Taro.redirectTo({ url: '/pages/qianxun/interactions' }) },
    { label: '我的动态', onClick: undefined },
  ]
  return (
    <View style={{ height: '104rpx', padding: '0 26rpx', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' }}>
      {tabs.map(item => {
        const selected = item.label === '我的动态'
        return <View key={item.label} onClick={item.onClick} style={{ position: 'relative', width: '190rpx', height: '86rpx', display: 'flex', alignItems: 'center', justifyContent: item.label === '互动' ? 'flex-start' : item.label === '我的动态' ? 'flex-end' : 'center' }}><Text style={{ color: selected ? NAVY : '#999999', fontSize: '28rpx', fontWeight: selected ? 600 : 400 }}>{item.label}</Text>{selected ? <View style={{ position: 'absolute', right: 0, bottom: '8rpx', width: '112rpx', height: '8rpx', borderRadius: '4rpx', background: '#6095FF' }} /> : null}</View>
      })}
    </View>
  )
}

function PublishBanner() {
  return (
    <View style={{ position: 'relative', height: '184rpx', borderRadius: '12rpx', background: '#F7F8FA', marginTop: '6rpx', overflow: 'hidden' }}>
      <Text style={{ position: 'absolute', left: '45rpx', top: '42rpx', color: '#999999', fontSize: '27rpx', lineHeight: '40rpx' }}>记录美好生活 遇上另一半</Text>
      <View onClick={() => void Taro.navigateTo({ url: '/pages/qianxun/compose' })} style={{ position: 'absolute', left: '45rpx', top: '102rpx', width: '130rpx', height: '50rpx', borderRadius: '7rpx', background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '25rpx', fontWeight: 500 }}>发动态</Text></View>
      <Image src={miniappOssIcons.qianxunEmptyChart} mode="aspectFit" style={{ position: 'absolute', right: '30rpx', top: '22rpx', width: '205rpx', height: '142rpx' }} />
    </View>
  )
}

function MyPostCard({ receipt, onMore, onFailure }: { receipt: MyPostReceipt; onMore: () => void; onFailure: () => void }) {
  const status = receipt.status === 'publishing'
    ? { label: '发布中', background: '#E7F0FF', color: BLUE }
    : receipt.status === 'failed'
      ? { label: '发布失败', background: '#E83333', color: '#FFFFFF' }
      : undefined
  return (
    <View style={{ padding: '38rpx 0 28rpx', borderBottom: '2rpx solid #EEF3F8' }}>
      <View style={{ display: 'flex', alignItems: 'baseline' }}>
        <Text style={{ color: '#333333', fontSize: '36rpx', lineHeight: '48rpx', fontWeight: 600 }}>{dayOfMonth(receipt.createdAt)}</Text>
        <Text style={{ color: '#8F8F8F', fontSize: '24rpx', marginLeft: '10rpx' }}>{monthLabel(receipt.createdAt)}</Text>
        <Text style={{ color: '#333333', fontSize: '27rpx', lineHeight: '42rpx', marginLeft: '28rpx', flex: 1 }}>{receipt.content}</Text>
      </View>
      <View style={{ display: 'flex', alignItems: 'flex-start', marginTop: '18rpx' }}>
        <View style={{ width: '130rpx', flexShrink: 0 }}>
          {status ? <View onClick={receipt.status === 'failed' ? onFailure : undefined} style={{ minWidth: '96rpx', height: '50rpx', borderRadius: '8rpx', padding: '0 11rpx', background: status.background, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}><Text style={{ color: status.color, fontSize: '23rpx' }}>{status.label}</Text></View> : null}
        </View>
        <View style={{ width: '452rpx' }}>
          <PostImages urls={receipt.imageUrls} />
          {receipt.topicName ? <View style={{ height: '48rpx', borderRadius: '24rpx', background: '#F6F7F9', padding: '0 20rpx', marginTop: '18rpx', display: 'inline-flex', alignItems: 'center' }}><Text style={{ color: BLUE, fontSize: '23rpx', marginRight: '8rpx' }}>#</Text><Text style={{ color: '#777777', fontSize: '23rpx' }}>{receipt.topicName}</Text></View> : null}
          <View style={{ height: '54rpx', display: 'flex', alignItems: 'flex-end' }}>
            <View onClick={onMore} style={{ width: '74rpx', height: '52rpx', display: 'flex', alignItems: 'center' }}><Text style={{ color: '#999999', fontSize: '31rpx', letterSpacing: '8rpx' }}>···</Text></View>
            <View style={{ flex: 1 }} />
            <Text style={{ color: '#999999', fontSize: '22rpx' }}>◯ {receipt.commentCount}</Text>
            <Text style={{ color: '#FF6C79', fontSize: '22rpx', marginLeft: '28rpx' }}>♥ {receipt.likeCount}</Text>
          </View>
          {receipt.status === 'failed' ? <View onClick={onFailure} style={{ minHeight: '52rpx', paddingTop: '12rpx' }}><Text style={{ color: '#D44747', fontSize: '22rpx' }}>查看失败原因</Text></View> : null}
        </View>
      </View>
    </View>
  )
}

function PostImages({ urls }: { urls: string[] }) {
  if (!urls.length) return null
  const shown = urls.slice(0, 9)
  const size = shown.length === 1 ? 390 : 142
  return (
    <View style={{ display: 'flex', flexWrap: 'wrap', gap: '8rpx' }}>
      {shown.map((url, index) => <Image key={`${url}-${index}`} src={url} mode="aspectFill" style={{ width: `${size}rpx`, height: `${size}rpx`, borderRadius: '9rpx', background: '#F1F3F6' }} />)}
    </View>
  )
}

function MyPostsEmpty() {
  return (
    <View style={{ paddingTop: '102rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Image src={miniappOssIcons.qianxunEmptyChart} mode="aspectFit" style={{ width: '320rpx', height: '218rpx' }} />
      <Text style={{ color: '#A3A3A3', fontSize: '27rpx', marginTop: '16rpx' }}>还没有发布动态</Text>
    </View>
  )
}

function MyPostsLoading() {
  return (
    <View style={{ paddingTop: '38rpx' }}>
      {[0, 1].map(index => <View key={index} style={{ height: '260rpx', borderBottom: '2rpx solid #EFF3F7', padding: '20rpx 0', boxSizing: 'border-box', display: 'flex' }}><View style={{ width: '110rpx', height: '34rpx', borderRadius: '17rpx', background: '#EEF2F7' }} /><View style={{ marginLeft: '22rpx' }}><View style={{ width: '356rpx', height: '27rpx', borderRadius: '14rpx', background: '#EEF2F7' }} /><View style={{ width: '280rpx', height: '160rpx', borderRadius: '10rpx', background: '#F3F5F8', marginTop: '22rpx' }} /></View></View>)}
    </View>
  )
}

function PostActionSheet({ onEdit, onDelete, onClose }: { onEdit: () => void; onDelete: () => void; onClose: () => void }) {
  return (
    <View onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,38,.34)', zIndex: 30, display: 'flex', alignItems: 'flex-end' }}>
      <View onClick={event => event.stopPropagation()} style={{ width: '750rpx', background: '#FFFFFF', borderRadius: '30rpx 30rpx 0 0', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <View onClick={onEdit} style={{ height: '100rpx', borderBottom: '2rpx solid #EEF3F8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#333333', fontSize: '28rpx' }}>编辑</Text></View>
        <View onClick={onDelete} style={{ height: '100rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#E62828', fontSize: '28rpx' }}>删除</Text></View>
        <View style={{ height: '16rpx', background: '#EFF4FC' }} />
        <View onClick={onClose} style={{ height: '100rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#999999', fontSize: '28rpx' }}>取消</Text></View>
      </View>
    </View>
  )
}

function DeleteConfirmDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <View style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,38,.34)', zIndex: 31, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: '520rpx', borderRadius: '32rpx', background: '#FFFFFF', padding: '48rpx 50rpx 54rpx', boxSizing: 'border-box' }}>
        <Text style={{ display: 'block', color: '#222222', fontSize: '32rpx', lineHeight: '45rpx', fontWeight: 600 }}>温馨提示</Text>
        <Text style={{ display: 'block', color: '#333333', fontSize: '27rpx', lineHeight: '40rpx', marginTop: '30rpx' }}>是否确认删除？</Text>
        <View style={{ display: 'flex', marginTop: '48rpx' }}>
          <View onClick={onCancel} style={{ width: '196rpx', height: '70rpx', borderRadius: '8rpx', background: '#FAFAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: NAVY, fontSize: '27rpx', fontWeight: 600 }}>取消</Text></View>
          <View onClick={onConfirm} style={{ width: '196rpx', height: '70rpx', borderRadius: '8rpx', background: BLUE, marginLeft: '28rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '27rpx', fontWeight: 600 }}>确定</Text></View>
        </View>
      </View>
    </View>
  )
}

function PublishFailureDialog({ receipt, onClose }: { receipt: MyPostReceipt; onClose: () => void }) {
  return (
    <View onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,38,.34)', zIndex: 31, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <View onClick={event => event.stopPropagation()} style={{ width: '620rpx', borderRadius: '32rpx', background: '#FFFFFF', padding: '46rpx 50rpx 28rpx', boxSizing: 'border-box' }}>
        <View style={{ position: 'relative', height: '126rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Image src={miniappOssIcons.qianxunEmptyChart} mode="aspectFit" style={{ width: '180rpx', height: '126rpx', filter: 'grayscale(1)' }} /><View style={{ position: 'absolute', right: '176rpx', bottom: '17rpx', width: '42rpx', height: '42rpx', borderRadius: '21rpx', background: '#E60012', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '29rpx', fontWeight: 700 }}>!</Text></View></View>
        <Text style={{ display: 'block', color: '#222222', fontSize: '31rpx', fontWeight: 600, textAlign: 'center', marginTop: '18rpx' }}>发布失败</Text>
        <Text style={{ display: 'block', color: '#999999', fontSize: '25rpx', lineHeight: '39rpx', marginTop: '18rpx' }}>{receipt.failureMessage || '动态未通过审核，可修改后重新提交。'}</Text>
        <View onClick={onClose} style={{ height: '70rpx', borderRadius: '7rpx', background: BLUE, marginTop: '38rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '27rpx' }}>我知道了</Text></View>
      </View>
    </View>
  )
}

function readReceipts(): MyPostReceipt[] {
  const raw = Taro.getStorageSync(MY_POST_RECEIPTS_KEY)
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return []
    const source = item as Partial<MyPostReceipt>
    if (!['publishing', 'failed', 'published'].includes(String(source.status))) return []
    return [{
      id: String(source.id || index),
      postId: readOptionalNumber(source.postId),
      status: source.status as ReceiptStatus,
      content: String(source.content || ''),
      imageUrls: Array.isArray(source.imageUrls) ? source.imageUrls.filter(url => typeof url === 'string') : [],
      topicName: source.topicName ? String(source.topicName) : undefined,
      createdAt: String(source.createdAt || ''),
      commentCount: readNonNegativeNumber(source.commentCount),
      likeCount: readNonNegativeNumber(source.likeCount),
      failureMessage: source.failureMessage ? String(source.failureMessage) : undefined,
    }]
  })
}

function buildProfileDescription(source: Record<string, unknown>) {
  const birthYear = source.birthYear || (typeof source.birthday === 'string' ? source.birthday.slice(0, 4) : '')
  return [birthYear ? `${birthYear}年` : '', source.locationCityName || source.locationCity, source.occupationLabel || source.occupation].filter(Boolean).join(' · ') || emptyProfile.description
}

function readNonNegativeNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, number) : 0
}

function readOptionalNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

function dayOfMonth(value: string) {
  const match = String(value).match(/\d{4}[-/]\d{2}[-/](\d{2})/)
  return match ? String(Number(match[1])) : '--'
}

function monthLabel(value: string) {
  const match = String(value).match(/\d{4}[-/](\d{2})/)
  return match ? `${Number(match[1])}月` : ''
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error || '加载失败，请稍后重试')
  await Taro.showToast({ title, icon: 'none' })
}
