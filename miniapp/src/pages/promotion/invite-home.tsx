import { Button, Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter, useShareAppMessage } from '@tarojs/taro'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import NativeNavigation from '@/components/NativeNavigation'
import { TOKEN_KEY } from '@/constants/config'
import { miniappOssIcons } from '@/constants/ossIcons'
import { resolveInviteShareTarget } from '@/domain/promotionAttribution'
import { displayedLadderStage } from '@/domain/promotionInvitePresentation'
import inviteEmpty from '@/assets/lanhu/promotion/invite-empty.png'
import { getInviteHome } from '@/services/promotion'
import { capturePromotionSource } from '@/services/promotionAttribution'
import { useAuthStore } from '@/stores/authStore'
import type { InviteHomeVO, InviteLadderVO, RecentInviteVO } from '@/types/promotion'
import './invite-home.scss'

const EMPTY_SHARE = {
  title: '邀请好友，一起遇见更好的缘分',
  path: '/pages/promotion/invite-home',
  link: '',
}

function formatRecordTime(value: string) {
  if (!value) return ''
  return value.replace(/^\d{4}-/, '').replace('T', ' ').slice(0, 11)
}

type InviteLadderPresentation = InviteLadderVO & { positionPercent: number }

type InviteLadderStage = {
  ladders: InviteLadderPresentation[]
  stageBase: number
  max: number
  progress: number
}

export default function InviteHomePage() {
  const router = useRouter()
  const [data, setData] = useState<InviteHomeVO>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shareAvailable, setShareAvailable] = useState(Taro.getEnv() === Taro.ENV_TYPE.WEAPP)
  const [navigationScrolled, setNavigationScrolled] = useState(false)

  const shareContext = data?.shareContext || EMPTY_SHARE
  const shareTarget = useMemo(
    () => resolveInviteShareTarget(shareContext),
    [shareContext],
  )
  const nativeShareReady = shareAvailable && shareTarget.attributable

  useShareAppMessage(() => ({
    title: shareTarget.title || EMPTY_SHARE.title,
    path: shareTarget.path,
  }))

  const loadHome = useCallback(async () => {
    const auth = useAuthStore.getState()
    auth.checkLogin()
    if (!useAuthStore.getState().isLoggedIn) {
      await Taro.redirectTo({ url: '/pages/login/index' })
      return
    }

    setLoading(true)
    setError('')
    try {
      setData(await getInviteHome())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '邀请数据加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const persistForRegistration = !Taro.getStorageSync(TOKEN_KEY)
    void capturePromotionSource(
      router.params as Record<string, unknown>,
      persistForRegistration,
    ).catch(() => {
      // 页面仍可继续展示，归因失败由服务端登录链路按无来源处理。
    })
  }, [router.params])

  useEffect(() => {
    void loadHome()
    if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
      setShareAvailable(false)
      return
    }
    void Taro.showShareMenu({ withShareTicket: true }).catch(() => setShareAvailable(false))
  }, [loadHome])

  const copyShareLink = useCallback(async () => {
    if (!shareTarget.attributable || !shareTarget.link) {
      await Taro.showToast({ title: '邀请链接生成中，请稍后重试', icon: 'none' })
      return
    }
    try {
      await Taro.setClipboardData({ data: shareTarget.link })
      await Taro.showToast({ title: '邀请链接已复制，请发送给好友', icon: 'none' })
    } catch {
      await Taro.showToast({ title: '复制失败，请稍后重试', icon: 'none' })
    }
  }, [shareTarget.attributable, shareTarget.link])

  const handleInvite = useCallback(() => {
    if (nativeShareReady && Taro.getEnv() === Taro.ENV_TYPE.WEAPP) return
    void copyShareLink()
  }, [copyShareLink, nativeShareReady])

  const handleHomeScroll = useCallback((event: { detail: { scrollTop: number } }) => {
    const nextScrolled = event.detail.scrollTop > 8
    setNavigationScrolled(current => current === nextScrolled ? current : nextScrolled)
  }, [])

  const recentRecords = data?.recentRecords.slice(0, 3) || []
  const hasRecentRecords = recentRecords.length > 0
  const ladderStage = useMemo<InviteLadderStage>(
    () => displayedLadderStage(
      data?.ladders || [],
      Number(data?.progressCurrent || 0),
    ) as InviteLadderStage,
    [data?.ladders, data?.progressCurrent],
  )
  const showContent = Boolean(data) && !loading && !error

  return (
    <View className="promotion-home">
      <NativeNavigation
        title="邀请好友"
        titleColor="#ffffff"
        background={navigationScrolled ? '#9b72e6' : 'transparent'}
        showBack
        fallbackUrl="/pages/profile/index"
        overlay
      />

      <ScrollView
        className="promotion-home__scroll"
        scrollY
        enhanced
        showScrollbar={false}
        onScroll={handleHomeScroll}
      >
        <View className="promotion-home__canvas">
          <Image
            className="promotion-home__background"
            src={miniappOssIcons.promotionInviteBackground}
            mode="scaleToFill"
          />
          <View className="promotion-hero" />

          <View className="promotion-home__data">
            {loading ? <HomeSkeleton /> : null}
            {!loading && error ? <HomeError message={error} onRetry={loadHome} /> : null}
            {showContent && data ? (
              <View className="promotion-home__content">
                <RewardCard
                  amount={data.registerReward}
                  shareAvailable={nativeShareReady}
                  onInvite={handleInvite}
                  onRules={() => void Taro.navigateTo({ url: '/pages/promotion/invite-rules' })}
                />
                <ProgressCard
                  successCount={data.successCount}
                  paidRewardTotal={data.paidRewardTotal}
                  current={data.progressCurrent}
                  max={ladderStage.max || data.progressMax || 0}
                  progress={ladderStage.progress}
                  ladders={ladderStage.ladders}
                />
                <RecentCard
                  records={recentRecords}
                  empty={!hasRecentRecords}
                  onAll={() => void Taro.navigateTo({ url: '/pages/promotion/invite-records' })}
                />
                <RulesCard
                  onOpen={() => void Taro.navigateTo({ url: '/pages/promotion/invite-rules' })}
                />
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

function CardTitle({
  children,
  onClick,
}: {
  children: string
  onClick?: () => void
}) {
  if (onClick) {
    return (
      <Button className="promotion-card__title promotion-card__title--button" onClick={onClick}>
        {children}
      </Button>
    )
  }
  return (
    <View className="promotion-card__title">
      <Text>{children}</Text>
    </View>
  )
}

function CardShell({
  className,
  children,
}: {
  className: string
  children: ReactNode
}) {
  return (
    <View className={`promotion-card ${className}`}>
      <View className="promotion-card__surface">{children}</View>
    </View>
  )
}

function EquationSprite({
  src,
  position,
}: {
  src: string
  position: 'share' | 'person' | 'coin'
}) {
  return (
    <View className="promotion-equation__sprite-window">
      <Image
        className={`promotion-equation__sprite promotion-equation__sprite--${position}`}
        src={src}
        mode="scaleToFill"
      />
    </View>
  )
}

function RewardCard({
  amount,
  shareAvailable,
  onInvite,
  onRules,
}: {
  amount: number
  shareAvailable: boolean
  onInvite: () => void
  onRules: () => void
}) {
  return (
    <CardShell className="promotion-reward-card">
      <CardTitle>邀请注册得千寻币</CardTitle>
      <View className="promotion-equation">
        <View className="promotion-equation__item">
          <EquationSprite
            src={miniappOssIcons.promotionInviteEquationSprite}
            position="share"
          />
          <Text>邀请好友</Text>
        </View>
        <Text className="promotion-equation__operator">＋</Text>
        <View className="promotion-equation__item">
          <EquationSprite
            src={miniappOssIcons.promotionInviteEquationSprite}
            position="person"
          />
          <Text>好友注册</Text>
        </View>
        <Text className="promotion-equation__operator">＝</Text>
        <View className="promotion-equation__item">
          <EquationSprite
            src={miniappOssIcons.promotionInviteEquationSprite}
            position="coin"
          />
          <Text>获得{amount}千寻币</Text>
        </View>
      </View>
      <Button
        className="promotion-primary-button"
        openType={shareAvailable ? 'share' : undefined}
        onClick={onInvite}
      >
        立即邀请
      </Button>
      <View className="promotion-reward-note">
        <Text>必须是新用户，老用户不计入邀请，无法获得奖励</Text>
        <Button className="promotion-text-button" onClick={onRules}>活动说明</Button>
      </View>
    </CardShell>
  )
}

function ProgressCard({
  successCount,
  paidRewardTotal,
  current,
  max,
  progress,
  ladders,
}: {
  successCount: number
  paidRewardTotal: number
  current: number
  max: number
  progress: number
  ladders: InviteLadderPresentation[]
}) {
  return (
    <CardShell className="promotion-progress-card">
      <CardTitle>邀请进度</CardTitle>
      <View className="promotion-metrics">
        <View className="promotion-metrics__item">
          <Text>累计邀请成功</Text>
          <Text className="promotion-metrics__number">{successCount}</Text>
          <Text>人</Text>
        </View>
        <View className="promotion-metrics__divider" />
        <View className="promotion-metrics__item">
          <Text>累计到账</Text>
          <Text className="promotion-metrics__number promotion-metrics__number--orange">
            {paidRewardTotal}
          </Text>
          <Text>币</Text>
        </View>
      </View>
      {ladders.length ? (
        <View className="promotion-ladder">
          <Text className="promotion-ladder__heading">
            累计邀请额外奖励
            <Text>（已完成{current}/{max}）</Text>
          </Text>
          <View className="promotion-ladder__track">
            <View className="promotion-ladder__rail">
              <View className="promotion-ladder__rail-progress" style={{ width: `${progress}%` }} />
            </View>
            <View
              className="promotion-ladder__steps"
            >
              {ladders.map(ladder => (
                <View
                  key={ladder.threshold}
                  className={`promotion-ladder__step${ladder.achieved ? ' is-achieved' : ''}`}
                  style={{ left: `${ladder.positionPercent}%` }}
                >
                  <View className="promotion-ladder__reward">
                    <Text className="promotion-ladder__coin">¥</Text>
                    <Text>+{ladder.rewardAmount}</Text>
                  </View>
                  <Text className="promotion-ladder__label">
                    {ladder.achieved ? '已获得' : `完成${ladder.threshold}人`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : (
        <View className="promotion-ladder-empty">当前暂无额外阶梯奖励</View>
      )}
    </CardShell>
  )
}

function RecentCard({
  records,
  empty,
  onAll,
}: {
  records: RecentInviteVO[]
  empty: boolean
  onAll: () => void
}) {
  return (
    <CardShell className={`promotion-records-card${empty ? ' promotion-records-card--empty' : ''}`}>
      <CardTitle>邀请记录</CardTitle>
      {empty ? (
        <View className="promotion-records-empty">
          <Image className="promotion-records-empty__art" src={inviteEmpty} mode="scaleToFill" />
          <Text>暂无邀请记录，快去邀请好友得千寻币吧</Text>
        </View>
      ) : (
        <>
          <View className="promotion-recent-list">
            {records.map(record => (
              <View className="promotion-recent-row" key={record.relationNo}>
                {record.invitee.avatarUrl ? (
                  <Image
                    className="promotion-recent-row__avatar"
                    src={record.invitee.avatarUrl}
                    mode="aspectFill"
                  />
                ) : (
                  <View className="promotion-recent-row__avatar promotion-recent-row__avatar--fallback">
                    <View className="promotion-recent-row__head" />
                    <View className="promotion-recent-row__body" />
                  </View>
                )}
                <View className="promotion-recent-row__copy">
                  <Text>{record.invitee.nickname || record.invitee.mobileMasked || '邀请好友'}</Text>
                  <Text>{formatRecordTime(record.registeredAt)}&nbsp;&nbsp;注册成功</Text>
                </View>
                <Text className="promotion-recent-row__amount">+{record.rewardAmount}</Text>
              </View>
            ))}
          </View>
          <Button className="promotion-all-button" onClick={onAll}>查看全部</Button>
        </>
      )}
    </CardShell>
  )
}

function RulesCard({ onOpen }: { onOpen: () => void }) {
  return (
    <CardShell className="promotion-rules-card">
      <CardTitle onClick={onOpen}>邀请规则</CardTitle>
      <Text className="promotion-rules-card__copy">
        1、好友通过你的专属入口完成注册即成功；{'\n'}
        2、邀请关系建立后永久有效，不重复绑定；{'\n'}
        3、命中累计人数档位的当次，可额外获得一笔阶梯奖励。
      </Text>
    </CardShell>
  )
}

function HomeSkeleton() {
  return (
    <View className="promotion-home__content promotion-home__content--state">
      {[249, 214, 289].map(height => (
        <View className="promotion-state-card promotion-state-card--skeleton" style={{ height: `${height}px` }} key={height}>
          <View /><View /><View />
        </View>
      ))}
    </View>
  )
}

function HomeError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => Promise<void>
}) {
  return (
    <View className="promotion-home__content promotion-home__content--state">
      <View className="promotion-state-card promotion-home-error">
        <Text className="promotion-home-error__title">邀请数据加载失败</Text>
        <Text className="promotion-home-error__message">{message}</Text>
        <Button className="promotion-home-error__button" onClick={() => void onRetry()}>
          重新加载
        </Button>
      </View>
    </View>
  )
}
