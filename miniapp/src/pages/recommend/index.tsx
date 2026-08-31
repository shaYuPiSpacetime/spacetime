import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh, useRouter } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import AppTabBar, { getCapsuleLeftActionsLayout } from '@/components/AppTabBar'
import { getNativeNavigationMetrics } from '@/components/NativeNavigation'
import UnverifiedCertificationModal from '@/components/UnverifiedCertificationModal'
import { miniappOssIcons } from '@/constants/ossIcons'
import { omitSeenRecommendCandidates } from '@/domain/recommendCandidateQueue'
import { navigateToPendingVerification } from '@/features/verification/navigateToVerification'
import { useAccessStatus } from '@/hooks/useAccessStatus'
import { getIdealSearchRecords } from '@/services/ideal'
import {
  getRecommendCandidates,
  recordRecommendLike,
  recordRecommendSkip,
  recordRecommendView,
  type RecommendCandidatePageVO,
  type RecommendCandidateVO,
} from '@/services/recommend'
import { findConversationByPeerUserId } from '@/services/message'
import { cancelRelationLike, sendRelationLike } from '@/services/relation'

type RecommendTab = 'recommend' | 'ideal'
type LoadState = 'loading' | 'ready' | 'empty' | 'limit' | 'error'

const PAGE_BACKGROUND =
  'linear-gradient(90deg, rgba(233,253,251,0.72), rgba(234,238,249,0.72) 49%, rgba(248,250,239,0.72))'
const BLUE = '#2876FF'
const RECOMMEND_TAB_STORAGE_KEY = 'prd08RecommendTab'

function createRequestId(prefix: string, candidateNo: string) {
  return `${prefix}-${candidateNo}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

export default function RecommendPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<RecommendTab>(
    router.params.tab === 'ideal' ? 'ideal' : 'recommend'
  )
  const [page, setPage] = useState<RecommendCandidatePageVO | null>(null)
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [state, setState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [actionSubmitting, setActionSubmitting] = useState(false)
  const [showIpDialog, setShowIpDialog] = useState(false)
  const [showCertification, setShowCertification] = useState(false)
  const [showUnverifiedModal, setShowUnverifiedModal] = useState(false)
  const viewedCandidates = useRef(new Set<string>())
  const idealTabSubmitting = useRef(false)
  const initialIdealTabHandled = useRef(false)
  const access = useAccessStatus('canBrowseCards')

  const candidates = page?.items || []
  const candidate = candidates[candidateIndex] || null

  const runCertifiedAction = (action: () => void) => {
    if (access.status?.coreAccessStatus === 'CORE_ALLOWED') {
      action()
      return
    }
    setShowUnverifiedModal(true)
  }

  const loadCandidates = async () => {
    setState('loading')
    setErrorMessage('')
    try {
      const data = await getRecommendCandidates()
      setPage(data)
      setCandidateIndex(0)
      if (data.items?.length) {
        setState('ready')
      } else if (data.waitingReason === 'browse_limit') {
        setState('limit')
      } else if (data.waitingReason === 'no_candidate' || !data.items?.length) {
        setState('empty')
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '推荐加载失败，请稍后再试')
      setState('error')
    }
  }

  useEffect(() => {
    void loadCandidates()
  }, [])

  const openIdealTab = async () => {
    if (idealTabSubmitting.current) return
    idealTabSubmitting.current = true
    try {
      const data = await getIdealSearchRecords()
      const activeRecord = (data.items || []).find(item => item.status === 'active')
      if (activeRecord?.snapshotNo) {
        await Taro.navigateTo({
          url: `/pages/prd08/ideal/results/index?snapshotNo=${encodeURIComponent(activeRecord.snapshotNo)}`,
        })
        return
      }
      setActiveTab('ideal')
    } catch (error) {
      await Taro.showToast({
        title: error instanceof Error ? error.message : '筛选记录加载失败，请稍后重试',
        icon: 'none',
      })
    } finally {
      idealTabSubmitting.current = false
    }
  }

  const handleTabChange = (tab: RecommendTab) => {
    if (tab === 'ideal') {
      void openIdealTab()
      return
    }
    setActiveTab(tab)
  }

  useDidShow(() => {
    const targetTab = Taro.getStorageSync(RECOMMEND_TAB_STORAGE_KEY)
    const requestedByRoute =
      !initialIdealTabHandled.current && router.params.tab === 'ideal'
    if (targetTab !== 'ideal' && !requestedByRoute) return
    initialIdealTabHandled.current = true
    if (targetTab === 'ideal') Taro.removeStorageSync(RECOMMEND_TAB_STORAGE_KEY)
    void openIdealTab()
  })

  usePullDownRefresh(() => {
    void loadCandidates().finally(() => Taro.stopPullDownRefresh())
  })

  useEffect(() => {
    if (!candidate || viewedCandidates.current.has(candidate.candidateNo)) return
    viewedCandidates.current.add(candidate.candidateNo)
    const requestId = createRequestId('recommend-view', candidate.candidateNo)
    void new Promise<void>(resolve => Taro.nextTick(resolve))
      .then(() =>
        recordRecommendView(candidate.candidateNo, {
          requestId,
          filterVersion: page?.preferenceVersion,
          position: candidateIndex + 1,
        })
      )
      .catch(() => {
        viewedCandidates.current.delete(candidate.candidateNo)
      })
  }, [candidate?.candidateNo, candidateIndex, page?.preferenceVersion])

  const showNextCandidate = async () => {
    if (candidateIndex + 1 < candidates.length) {
      setCandidateIndex(current => current + 1)
      return
    }
    const response = page?.nextCursor
      ? await getRecommendCandidates(page.nextCursor)
      : await getRecommendCandidates()
    const next = omitSeenRecommendCandidates(
      response,
      viewedCandidates.current,
      candidate?.candidateNo
    )
    setPage(next)
    setCandidateIndex(0)
    if (next.items?.length) setState('ready')
    else if (next.waitingReason === 'browse_limit') setState('limit')
    else setState('empty')
  }

  const advanceCandidate = async () => {
    if (!candidate || actionSubmitting) return
    setActionSubmitting(true)
    try {
      await recordRecommendSkip(candidate.candidateNo, {
        requestId: createRequestId('recommend-skip', candidate.candidateNo),
        filterVersion: page?.preferenceVersion,
        position: candidateIndex + 1,
      })
      await showNextCandidate()
    } catch (error) {
      await Taro.showToast({
        title: error instanceof Error ? error.message : '跳过失败，请稍后重试',
        icon: 'none',
      })
    } finally {
      setActionSubmitting(false)
    }
  }

  const toggleLike = async () => {
    if (!candidate || actionSubmitting) return
    const wasLiked = candidate.liked
    const filterVersion = page?.preferenceVersion
    const position = candidateIndex + 1
    setActionSubmitting(true)
    try {
      const relation = wasLiked
        ? await cancelRelationLike(candidate.userId)
        : await sendRelationLike(
            candidate.userId,
            'fate',
            createRequestId('recommend-like', candidate.candidateNo)
          )
      updateCandidate({
        ...candidate,
        liked: !wasLiked,
        communicationMode: relation.canEnterConversation ? 'PRIVATE_MESSAGE' : 'WHISPER',
        profile: {
          ...candidate.profile,
          liked: !wasLiked,
          matched: Boolean(relation.matched),
          matchNo: relation.matchNo || candidate.profile.matchNo,
          canEnterConversation: Boolean(relation.canEnterConversation),
          communicationMode: relation.canEnterConversation ? 'PRIVATE_MESSAGE' : 'WHISPER',
        },
      })
      if (wasLiked) {
        await Taro.showToast({ title: '已取消心动', icon: 'none' })
        return
      }
      let recommendLikeSyncFailed = false
      try {
        const requestId = createRequestId('recommend-action-like', candidate.candidateNo)
        await recordRecommendLike(candidate.candidateNo, { requestId, filterVersion, position })
      } catch {
        recommendLikeSyncFailed = true
      }
      let nextCandidateFailed = false
      try {
        await showNextCandidate()
      } catch {
        nextCandidateFailed = true
      }
      await Taro.showToast({
        title: recommendLikeSyncFailed
          ? '已心动，推荐记录同步稍有延迟'
          : nextCandidateFailed
            ? '已心动，下一位加载失败，请稍后重试'
            : relation.matched
              ? '匹配成功'
              : '已心动',
        icon: recommendLikeSyncFailed || nextCandidateFailed ? 'none' : 'success',
      })
    } catch (error) {
      await Taro.showToast({
        title: error instanceof Error ? error.message : '操作失败，请稍后重试',
        icon: 'none',
      })
    } finally {
      setActionSubmitting(false)
    }
  }

  const updateCandidate = (nextCandidate: RecommendCandidateVO) => {
    setPage(current =>
      current
        ? {
            ...current,
            items: current.items.map(item =>
              item.candidateNo === nextCandidate.candidateNo ? nextCandidate : item
            ),
          }
        : current
    )
  }

  const openConversation = async () => {
    if (!candidate) return
    const profile = candidate.profile
    if (candidate.communicationMode === 'PRIVATE_MESSAGE') {
      const conversation = await findConversationByPeerUserId(candidate.userId)
      if (!conversation) {
        await Taro.showToast({ title: '私信会话暂不可用，请刷新后重试', icon: 'none' })
        return
      }
      await Taro.navigateTo({
        url: `/pages/message/private-chat?conversationNo=${encodeURIComponent(conversation.conversationNo)}`,
      })
      return
    }
    await Taro.navigateTo({
      url: `/pages/message/whisper-detail?receiverUserNo=${profile.userNo}&sourceScene=recommendation&nickname=${encodeURIComponent(profile.nickname || '用户')}&avatar=${encodeURIComponent(profile.avatar || '')}&compose=1`,
    })
  }

  return (
    <View
      id="prd08-recommend-page"
      style={{
        minHeight: '100vh',
        background: activeTab === 'ideal' ? '#071D43' : PAGE_BACKGROUND,
        fontFamily: 'PingFang SC, sans-serif',
      }}
    >
      {activeTab === 'ideal' ? (
        <IdealLanding
          onTabChange={handleTabChange}
          onHistory={() => runCertifiedAction(() => {
            void Taro.navigateTo({ url: '/pages/prd08/ideal/unlocks/index' })
          })}
          onChoose={() => runCertifiedAction(() => {
            void Taro.navigateTo({ url: '/pages/prd08/ideal/filter/index' })
          })}
        />
      ) : (
        <>
          <RecommendHeader
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onHistory={() => void Taro.navigateTo({ url: '/pages/prd08/recommend/replay/index' })}
            onPreference={() =>
              void Taro.navigateTo({ url: '/pages/prd08/recommend/preference/index' })
            }
          />
          {state === 'loading' ? <CenteredText text="正在为你寻找合适的人…" /> : null}
          {state === 'error' ? (
            <CenteredText text={errorMessage || '推荐加载失败，请下拉刷新'} />
          ) : null}
          {state === 'empty' ? <RecommendEmpty /> : null}
          {state === 'limit' ? (
            <RecommendLimit
              onOpen={() => void Taro.navigateTo({ url: '/pages/prd08/recommend/waiting/index' })}
            />
          ) : null}
          {state === 'ready' && candidate ? (
            <RecommendCandidateCard
              candidate={candidate}
              onOpen={() =>
                void Taro.navigateTo({
                  url: `/pages/heart/user?targetUserId=${candidate.userId}&sourceScene=fate`,
                })
              }
              onShare={() => void Taro.showShareMenu({ withShareTicket: true })}
              onIp={() => setShowIpDialog(true)}
              onCertification={() => setShowCertification(true)}
            />
          ) : null}
          {state === 'ready' && candidate ? (
            <RecommendActions
              communicationMode={candidate.communicationMode}
              liked={candidate.liked}
              disabled={actionSubmitting}
              onSkip={() => void advanceCandidate()}
              onConversation={() => runCertifiedAction(() => void openConversation())}
              onLike={() => runCertifiedAction(() => void toggleLike())}
            />
          ) : null}
        </>
      )}
      <AppTabBar active="recommend" />
      {showIpDialog ? (
        <IpLocationDialog
          onClose={() => setShowIpDialog(false)}
        />
      ) : null}
      {showCertification ? (
        <CertificationSheet
          profile={candidate?.profile || null}
          onClose={() => setShowCertification(false)}
        />
      ) : null}
      {showUnverifiedModal ? (
        <UnverifiedCertificationModal
          onClose={() => setShowUnverifiedModal(false)}
          onConfirm={() => {
            setShowUnverifiedModal(false)
            void navigateToPendingVerification()
          }}
        />
      ) : null}
    </View>
  )
}

function RecommendHeader({
  activeTab,
  onTabChange,
  onHistory,
  onPreference,
}: {
  activeTab: RecommendTab
  onTabChange: (tab: RecommendTab) => void
  onHistory: () => void
  onPreference: () => void
}) {
  const metrics = getNativeNavigationMetrics()
  const top = metrics.menuTop + (metrics.menuHeight - 54) / 2
  const actionsLayout = getCapsuleLeftActionsLayout({
    menuLeft: metrics.menuLeft,
    menuTop: metrics.menuTop,
    menuHeight: metrics.menuHeight,
    actionCount: 2,
    actionSize: 70,
  })
  return (
    <View
      style={{ position: 'relative', zIndex: 20, height: `${metrics.navigationHeight + 18}rpx` }}
    >
      <View
        style={{
          position: 'absolute',
          left: '32rpx',
          top: `${top}rpx`,
          display: 'flex',
          alignItems: 'center',
          gap: '28rpx',
        }}
      >
        {(['recommend', 'ideal'] as const).map(tab => {
          const active = tab === activeTab
          return (
            <View
              key={tab}
              onClick={() => onTabChange(tab)}
              style={{ position: 'relative', height: '62rpx' }}
            >
              <Text
                style={{
                  color: active ? '#0C285A' : '#7F8494',
                  fontSize: active ? '34rpx' : '30rpx',
                  fontWeight: active ? 700 : 500,
                  lineHeight: '50rpx',
                }}
              >
                {tab === 'recommend' ? '推荐' : '理想型'}
              </Text>
              {active ? (
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: '2rpx',
                    height: '7rpx',
                    borderRadius: '5rpx',
                    background: BLUE,
                  }}
                />
              ) : null}
            </View>
          )
        })}
      </View>
      <View
        style={{
          position: 'absolute',
          left: `${actionsLayout.left}rpx`,
          top: `${actionsLayout.top}rpx`,
          width: `${actionsLayout.width}rpx`,
          height: `${actionsLayout.actionSize}rpx`,
          display: 'flex',
          alignItems: 'center',
          gap: `${actionsLayout.actionGap}rpx`,
        }}
      >
        <View
          onClick={onHistory}
          style={{
            width: `${actionsLayout.actionSize}rpx`,
            height: `${actionsLayout.actionSize}rpx`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image
            src={miniappOssIcons.recommendReplay}
            mode="aspectFit"
            style={{ width: '36rpx', height: '36rpx' }}
          />
        </View>
        <View
          onClick={onPreference}
          style={{
            width: `${actionsLayout.actionSize}rpx`,
            height: `${actionsLayout.actionSize}rpx`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image
            src={miniappOssIcons.recommendPreference}
            mode="aspectFit"
            style={{ width: '36rpx', height: '36rpx' }}
          />
        </View>
      </View>
    </View>
  )
}

function RecommendCandidateCard({
  candidate,
  onOpen,
  onShare,
  onIp,
  onCertification,
}: {
  candidate: RecommendCandidateVO
  onOpen: () => void
  onShare: () => void
  onIp: () => void
  onCertification: () => void
}) {
  const profile = candidate.profile
  const hero = profile.heroPhoto || profile.photos?.[0] || profile.avatar || ''
  const basic = [
    genderLabel(profile.gender),
    profile.age ? `${profile.age}岁` : '',
    profile.height ? `${profile.height}cm` : '',
    profile.zodiac || '',
  ]
    .filter(Boolean)
    .join('丨')
  const location = [
    profile.currentCity ? `现居${profile.currentCity}` : '',
    profile.hometownCity ? `${profile.hometownCity}人` : '',
  ]
    .filter(Boolean)
    .join('丨')
  const tags = profile.tags || []
  return (
    <ScrollView
      scrollY
      showScrollbar={false}
      style={{ width: '750rpx', height: 'calc(100vh - 164rpx)' }}
    >
      <View
        style={{
          width: '700rpx',
          minHeight: '1650rpx',
          margin: '0 auto',
          paddingBottom: '330rpx',
          boxSizing: 'border-box',
        }}
      >
        <View
          onClick={onOpen}
          style={{
            position: 'relative',
            width: '700rpx',
            height: '828rpx',
            overflow: 'hidden',
            borderRadius: '32rpx',
            background: '#DDE8F4',
          }}
        >
          {hero ? (
            <Image src={hero} mode="aspectFill" style={{ width: '700rpx', height: '828rpx' }} />
          ) : (
            <View
              style={{
                width: '700rpx',
                height: '828rpx',
                background: 'linear-gradient(145deg,#D9E8F7,#EEF7F4)',
              }}
            />
          )}
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '290rpx',
              background: 'linear-gradient(transparent,rgba(0,0,0,0.48))',
            }}
          />
          <View
            onClick={event => {
              event.stopPropagation()
              onShare()
            }}
            style={{
              position: 'absolute',
              right: '28rpx',
              top: '28rpx',
              width: '58rpx',
              height: '58rpx',
            }}
          >
            <Image
              src={miniappOssIcons.profilePreviewShare}
              mode="aspectFit"
              style={{ width: '58rpx', height: '58rpx' }}
            />
          </View>
          {profile.avatar ? (
            <Image
              src={profile.avatar}
              mode="aspectFill"
              style={{
                position: 'absolute',
                left: '34rpx',
                bottom: '20rpx',
                zIndex: 3,
                width: '184rpx',
                height: '184rpx',
                borderRadius: '92rpx',
                border: '8rpx solid #FFFFFF',
                boxSizing: 'border-box',
              }}
            />
          ) : null}
          <View
            style={{
              position: 'absolute',
              left: '240rpx',
              bottom: '102rpx',
              right: '26rpx',
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
              gap: '16rpx',
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: '38rpx',
                fontWeight: 600,
                textShadow: '0 2rpx 8rpx rgba(0,0,0,.45)',
              }}
            >
              {profile.nickname || '用户'}
            </Text>
            <View
              id="recommend-certification-entry"
              onClick={event => {
                event.stopPropagation()
                onCertification()
              }}
              style={{
                height: '52rpx',
                padding: '0 20rpx',
                borderRadius: '26rpx',
                background: 'rgba(232,244,255,.92)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#4285E7', fontSize: '23rpx' }}>✓ 三重认证</Text>
            </View>
          </View>
          {profile.emotionalStatus ? (
            <View
              data-role="recommend-relationship-status"
              style={{
                position: 'absolute',
                left: '240rpx',
                bottom: '42rpx',
                zIndex: 3,
                height: '48rpx',
                padding: '0 24rpx',
                borderRadius: '24rpx',
                background: 'rgba(50,55,62,.48)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: '23rpx' }}>♥ {profile.emotionalStatus}</Text>
            </View>
          ) : null}
        </View>
        {basic || location || profile.datingGoal ? (
          <View
            style={{
              width: '700rpx',
              minHeight: '198rpx',
              marginTop: '-8rpx',
              padding: '70rpx 32rpx 32rpx',
              borderRadius: '0 0 32rpx 32rpx',
              background: '#FFFFFF',
              boxSizing: 'border-box',
            }}
          >
            {basic ? (
              <ProfileInfoLine icon={miniappOssIcons.profilePreviewGender} text={basic} />
            ) : null}
            {location ? (
              <View
                id="recommend-ip-entry"
                onClick={onIp}
                style={{ marginTop: basic ? '22rpx' : 0 }}
              >
                <ProfileInfoLine icon={miniappOssIcons.profilePreviewLocation} text={location} />
              </View>
            ) : null}
            {profile.datingGoal ? (
              <>
                <View
                  data-role="recommend-basic-divider"
                  style={{ height: '1rpx', marginTop: '25rpx', background: '#EEF1F5' }}
                />
                <Text
                  data-role="recommend-dating-goal"
                  style={{ display: 'block', marginTop: '20rpx', color: '#333333', fontSize: '26rpx', lineHeight: '37rpx', whiteSpace: 'nowrap' }}
                >
                  脱单目标：{profile.datingGoal}
                </Text>
              </>
            ) : null}
          </View>
        ) : null}
        {tags.length ? (
          <View
            style={{
              width: '700rpx',
              marginTop: '20rpx',
              padding: '34rpx 30rpx 40rpx',
              borderRadius: '32rpx',
              background: '#FFFFFF',
              boxSizing: 'border-box',
            }}
          >
            <Text style={{ color: '#333333', fontSize: '30rpx', fontWeight: 600 }}>我的标签</Text>
            <View style={{ display: 'flex', flexWrap: 'wrap', gap: '12rpx', marginTop: '24rpx' }}>
              {tags.map((tag, index) => (
                <View
                  key={`${tag}-${index}`}
                  style={{
                    height: '50rpx',
                    padding: '0 24rpx',
                    borderRadius: '25rpx',
                    background: ['#EAF5E8', '#E8F2FE', '#FFF2E2', '#F5E6F6'][index % 4],
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: ['#42AC52', '#3C9AF2', '#FF9108', '#A62CB7'][index % 4],
                      fontSize: '23rpx',
                    }}
                  >
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        {profile.introduction ? (
          <View
            style={{
              width: '700rpx',
              marginTop: '20rpx',
              padding: '34rpx 30rpx 44rpx',
              borderRadius: '32rpx',
              background: '#FFFFFF',
              boxSizing: 'border-box',
            }}
          >
            <Text style={{ color: '#333333', fontSize: '30rpx', fontWeight: 600 }}>自我介绍</Text>
            <Text
              style={{
                display: 'block',
                marginTop: '22rpx',
                color: '#7F8494',
                fontSize: '24rpx',
                lineHeight: '40rpx',
              }}
            >
              {profile.introduction}
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  )
}

function ProfileInfoLine({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ display: 'flex', alignItems: 'center' }}>
      <Image
        src={icon}
        mode="aspectFit"
        style={{ width: '30rpx', height: '34rpx', marginRight: '16rpx' }}
      />
      <Text style={{ color: '#333333', fontSize: '25rpx' }}>{text}</Text>
    </View>
  )
}

function RecommendActions({
  communicationMode,
  liked,
  disabled,
  onSkip,
  onConversation,
  onLike,
}: {
  communicationMode: 'WHISPER' | 'PRIVATE_MESSAGE'
  liked: boolean
  disabled: boolean
  onSkip: () => void
  onConversation: () => void
  onLike: () => void
}) {
  return (
    <View
      id="recommend-actions"
      style={{
        position: 'fixed',
        left: '94rpx',
        width: '562rpx',
        bottom: '132rpx',
        zIndex: 10000,
        height: '166rpx',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '38rpx',
        background: 'transparent',
        opacity: disabled ? 0.62 : 1,
      }}
    >
      <Image
        onClick={onSkip}
        src={miniappOssIcons.recommendSkip}
        mode="aspectFit"
        style={{ width: '98rpx', height: '98rpx' }}
      />
      <View
        id="recommend-conversation-action"
        onClick={onConversation}
        style={{
          width: '290rpx',
          height: '92rpx',
          borderRadius: '46rpx',
          background: BLUE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '30rpx', fontWeight: 500 }}>
          {communicationMode === 'PRIVATE_MESSAGE' ? '私信' : '悄悄话'}
        </Text>
      </View>
      <Image
        onClick={onLike}
        src={miniappOssIcons.recommendLike}
        mode="aspectFit"
        style={{ width: '98rpx', height: '98rpx', filter: liked ? 'saturate(1.15)' : undefined }}
      />
    </View>
  )
}

function RecommendEmpty() {
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: '390rpx',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Image
        src={miniappOssIcons.qianxunEmptyFollowing}
        mode="aspectFit"
        style={{ width: '334rpx', height: '254rpx' }}
      />
      <Text style={{ color: '#999999', fontSize: '28rpx', marginTop: '24rpx' }}>
        暂时还没有推荐
      </Text>
    </View>
  )
}

function RecommendLimit({ onOpen }: { onOpen: () => void }) {
  return (
    <View
      onClick={onOpen}
      style={{
        position: 'absolute',
        left: '50rpx',
        right: '50rpx',
        top: '330rpx',
        padding: '48rpx 36rpx',
        borderRadius: '32rpx',
        background: '#FFFFFF',
        boxShadow: '0 12rpx 40rpx rgba(57,83,119,.08)',
        textAlign: 'center',
      }}
    >
      <Text style={{ display: 'block', color: '#0C285A', fontSize: '34rpx', fontWeight: 600 }}>
        今日推荐已看完
      </Text>
      <Text
        style={{
          display: 'block',
          color: '#8D96A6',
          fontSize: '24rpx',
          lineHeight: '38rpx',
          marginTop: '16rpx',
        }}
      >
        点击查看往日推荐和更多邂逅方式
      </Text>
    </View>
  )
}

function CenteredText({ text }: { text: string }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: '60rpx',
        right: '60rpx',
        top: '520rpx',
        textAlign: 'center',
      }}
    >
      <Text style={{ color: '#8D96A6', fontSize: '26rpx', lineHeight: '40rpx' }}>{text}</Text>
    </View>
  )
}

function IdealLanding({ onTabChange, onHistory, onChoose }: { onTabChange: (tab: RecommendTab) => void; onHistory: () => void; onChoose: () => void }) {
  const metrics = getNativeNavigationMetrics()
  const top = metrics.menuTop + (metrics.menuHeight - 54) / 2
  const actionsLayout = getCapsuleLeftActionsLayout({
    menuLeft: metrics.menuLeft,
    menuTop: metrics.menuTop,
    menuHeight: metrics.menuHeight,
    actionCount: 1,
    actionSize: 72,
  })
  return (
    <View
      style={{
        position: 'relative',
        width: '750rpx',
        minHeight: 'calc(100vh - 144rpx)',
        overflow: 'hidden',
      }}
    >
      <Image
        src={miniappOssIcons.idealHeroBackground}
        mode="aspectFill"
        style={{ position: 'absolute', inset: 0, width: '750rpx', height: '100%' }}
      />
      <View
        style={{
          position: 'absolute',
          left: '32rpx',
          top: `${top}rpx`,
          zIndex: 2,
          display: 'flex',
          gap: '32rpx',
        }}
      >
        <Text
          onClick={() => onTabChange('recommend')}
          style={{ color: '#FFFFFF', fontSize: '30rpx', lineHeight: '54rpx' }}
        >
          推荐
        </Text>
        <View style={{ position: 'relative', height: '62rpx' }}>
          <Text
            style={{ color: '#FFFFFF', fontSize: '34rpx', fontWeight: 700, lineHeight: '54rpx' }}
          >
            理想型
          </Text>
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '7rpx',
              borderRadius: '4rpx',
              background: '#FFFFFF',
            }}
          />
        </View>
      </View>
      <View
        onClick={onHistory}
        style={{
          position: 'absolute',
          left: `${actionsLayout.left}rpx`,
          top: `${actionsLayout.top}rpx`,
          zIndex: 3,
          width: `${actionsLayout.actionSize}rpx`,
          height: `${actionsLayout.actionSize}rpx`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          src={miniappOssIcons.idealHistory}
          mode="aspectFit"
          style={{ width: '36rpx', height: '36rpx' }}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '270rpx',
          zIndex: 2,
          textAlign: 'center',
        }}
      >
        <Text
          style={{
            display: 'block',
            color: '#FFFFFF',
            fontSize: '62rpx',
            fontWeight: 700,
            textShadow: '0 4rpx 8rpx rgba(0,0,0,.45)',
          }}
        >
          精准筛选理想型
        </Text>
        <Text
          style={{
            display: 'block',
            marginTop: '16rpx',
            color: '#FFFFFF',
            fontSize: '34rpx',
            textShadow: '0 3rpx 7rpx rgba(0,0,0,.5)',
          }}
        >
          —— 只邂逅你想要的人 ——
        </Text>
      </View>
      <View
        id="ideal-choose-button"
        data-role="ideal-choose-button"
        onClick={onChoose}
        style={{
          position: 'fixed',
          left: '44rpx',
          right: '44rpx',
          bottom: 'calc(190rpx + env(safe-area-inset-bottom))',
          zIndex: 9998,
          height: '98rpx',
          borderRadius: '49rpx',
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: BLUE, fontSize: '34rpx', fontWeight: 600 }}>选择理想型</Text>
      </View>
    </View>
  )
}

function IpLocationDialog({ onClose }: { onClose: () => void }) {
  return (
    <View
      id="recommend-ip-dialog"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20000,
        background: 'rgba(0,0,0,.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: '520rpx',
          padding: '52rpx 52rpx 42rpx',
          borderRadius: '32rpx',
          background: '#FFFFFF',
          boxSizing: 'border-box',
          textAlign: 'center',
        }}
      >
        <Text style={{ display: 'block', color: '#0C285A', fontSize: '32rpx', fontWeight: 600 }}>
          IP所属地说明
        </Text>
        <Text
          style={{
            display: 'block',
            marginTop: '28rpx',
            color: '#7F8494',
            fontSize: '24rpx',
            lineHeight: '40rpx',
          }}
        >
          为维护网络安全、保障良好生态，根据网络运营数据，依法展示用户IP属地信息。
        </Text>
        <View
          onClick={onClose}
          style={{
            height: '82rpx',
            marginTop: '38rpx',
            borderRadius: '41rpx',
            background: BLUE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '28rpx' }}>知道了</Text>
        </View>
      </View>
    </View>
  )
}

function CertificationSheet({
  profile,
  onClose,
}: {
  profile: RecommendCandidateVO['profile'] | null
  onClose: () => void
}) {
  const certifications = profile?.certifications || []
  const rows = [
    {
      code: 'AVATAR',
      title: '头像已认证',
      subtitle: '平台认证方式',
      score: '99%',
      icon: miniappOssIcons.recommendCertAvatar,
    },
    {
      code: 'REAL_NAME',
      title: '实名已认证',
      subtitle: '居民身份证方式认证',
      score: '80%',
      icon: miniappOssIcons.recommendCertRealName,
    },
    {
      code: 'EDUCATION',
      title: '学历已认证',
      subtitle: profile?.school ? `学历认证 | ${profile.school}` : '学信网学历认证',
      score: '99%',
      icon: miniappOssIcons.recommendCertEducation,
    },
  ]
  const passedCount = rows.filter(row => certifications.includes(row.code)).length
  const totalScore = passedCount === 3 ? '92%' : `${Math.round((passedCount / 3) * 92)}%`
  return (
    <View
      id="recommend-certification-sheet"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20000,
        background: 'rgba(0,0,0,.58)',
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      <View
        style={{
          width: '750rpx',
          padding: '36rpx 30rpx calc(38rpx + env(safe-area-inset-bottom))',
          borderRadius: '32rpx 32rpx 0 0',
          background: '#FFFFFF',
          boxSizing: 'border-box',
        }}
      >
        <View
          style={{
            position: 'relative',
            minHeight: '116rpx',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {profile?.avatar ? (
            <Image
              src={profile.avatar}
              mode="aspectFill"
              style={{
                width: '88rpx',
                height: '88rpx',
                borderRadius: '44rpx',
                border: '6rpx solid #FFFFFF',
                boxSizing: 'border-box',
              }}
            />
          ) : null}
          <View style={{ marginLeft: '18rpx' }}>
            <Text style={{ display: 'block', color: '#999999', fontSize: '25rpx' }}>
              {profile?.nickname || '用户'}
            </Text>
            <Text
              style={{
                display: 'block',
                marginTop: '4rpx',
                color: '#333333',
                fontSize: '30rpx',
                fontWeight: 600,
              }}
            >
              已通过{passedCount}项认证
            </Text>
          </View>
          <Image
            src={miniappOssIcons.recommendCertScoreShield}
            mode="aspectFit"
            style={{
              position: 'absolute',
              right: '-12rpx',
              top: '-16rpx',
              width: '184rpx',
              height: '184rpx',
              opacity: 0.22,
            }}
          />
          <Text
            style={{
              position: 'absolute',
              right: '6rpx',
              top: '8rpx',
              color: BLUE,
              fontSize: '66rpx',
              fontWeight: 600,
            }}
          >
            {totalScore}
          </Text>
        </View>
        <View style={{ marginTop: '8rpx' }}>
          {rows.map(row => (
            <View
              key={row.code}
              style={{
                height: '158rpx',
                borderBottom: '1rpx solid #EEF1F5',
                display: 'flex',
                alignItems: 'center',
                opacity: certifications.includes(row.code) ? 1 : 0.45,
              }}
            >
              <Image
                src={row.icon}
                mode="aspectFit"
                style={{ width: '100rpx', height: '100rpx', marginRight: '30rpx' }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ display: 'block', color: '#333333', fontSize: '29rpx', fontWeight: 600 }}
                >
                  {row.title}
                </Text>
                <Text
                  style={{
                    display: 'block',
                    marginTop: '14rpx',
                    color: '#777777',
                    fontSize: '23rpx',
                  }}
                >
                  {row.subtitle}
                </Text>
              </View>
              <View style={{ textAlign: 'right' }}>
                <Text style={{ display: 'block', color: BLUE, fontSize: '36rpx', fontWeight: 600 }}>
                  {row.score}
                </Text>
                <Text
                  style={{
                    display: 'block',
                    marginTop: '10rpx',
                    color: '#777777',
                    fontSize: '22rpx',
                  }}
                >
                  可信度
                </Text>
              </View>
            </View>
          ))}
        </View>
        <Text
          style={{
            display: 'block',
            marginTop: '28rpx',
            color: '#777777',
            fontSize: '22rpx',
            textAlign: 'center',
          }}
        >
          认证信息以外的资料为用户自主填写，平台不保证真实性
        </Text>
        <View
          onClick={onClose}
          style={{
            height: '88rpx',
            margin: '34rpx 14rpx 0',
            borderRadius: '12rpx',
            background: BLUE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '28rpx' }}>我知道了</Text>
        </View>
      </View>
    </View>
  )
}

function genderLabel(gender?: string | null) {
  if (gender === 'FEMALE') return '女'
  if (gender === 'MALE') return '男'
  return gender || ''
}
